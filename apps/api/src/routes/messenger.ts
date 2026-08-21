import crypto from "node:crypto";
import {
	agents,
	and,
	chatMessages,
	conversations,
	eq,
	getDb,
	messengerChannelSettings,
	messengerPages,
	messengerThreads,
} from "@ansa/db";
import type { AIQuality } from "@ansa/types";
import { getPersonaSystemPrompt } from "@ansa/utils";
import { Hono } from "hono";
import { streamChat } from "../lib/llm";
import { resolveTierToModel } from "../lib/models";
import { requireParam } from "../lib/params";
import { getEffectivePlanLimits, getUserPlan } from "../lib/plans";
import { LocalUsageProvider } from "../lib/usage";
import { vectorClient } from "../lib/vector";
import { authMiddleware, requireAuth } from "../middleware/auth";

const messengerRoute = new Hono();

// Helper to get user from context (set by authMiddleware)
function getUser(c: { get: (key: string) => unknown }): { id: string } {
	const user = c.get("user") as { id: string } | null;
	if (!user) throw new Error("User not authenticated");
	return user;
}

// Facebook Graph API base URL
const GRAPH_API_URL = "https://graph.facebook.com/v18.0";

// Facebook App credentials (set in environment)
const FB_APP_ID = process.env.FACEBOOK_APP_ID;
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const DASHBOARD_URL = process.env.DASHBOARD_URL || "http://localhost:3000";
const API_URL = process.env.API_URL || "http://localhost:3001";

// Verify Facebook webhook signature
function verifyFacebookSignature(body: string, signature: string): boolean {
	if (!FB_APP_SECRET || !signature) return false;

	const expectedSignature = crypto.createHmac("sha256", FB_APP_SECRET).update(body).digest("hex");

	const providedSignature = signature.replace("sha256=", "");

	try {
		return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
	} catch {
		return false;
	}
}

// Generate a random webhook verify token
function generateVerifyToken(): string {
	return crypto.randomBytes(32).toString("hex");
}

// Build system prompt with context
function buildSystemPrompt(basePrompt: string, contextDocs: string[]): string {
	let prompt = basePrompt;

	if (contextDocs.length > 0) {
		prompt += `\n\n## Relevant Knowledge Base Context\n\nUse the following information to help answer questions:\n\n${contextDocs.join("\n\n---\n\n")}`;
	}

	prompt += `\n\n## Important Guidelines
- Be helpful, accurate, and concise
- If you don't know something, say so honestly
- Keep responses conversational and friendly for chat
- Avoid using markdown formatting as this is a messaging app`;

	return prompt;
}

// Send message via Facebook Graph API
async function sendMessengerMessage(
	pageAccessToken: string,
	recipientPsid: string,
	messageText: string,
): Promise<boolean> {
	try {
		const response = await fetch(`${GRAPH_API_URL}/me/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				recipient: { id: recipientPsid },
				message: { text: messageText },
				access_token: pageAccessToken,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.error("[messenger] Failed to send message:", error);
			return false;
		}

		return true;
	} catch (error) {
		console.error("[messenger] Error sending message:", error);
		return false;
	}
}

// =============================================================================
// Webhook Verification (GET) - Facebook sends this to verify webhook URL
// =============================================================================
messengerRoute.get("/webhook", async (c) => {
	const mode = c.req.query("hub.mode");
	const token = c.req.query("hub.verify_token");
	const challenge = c.req.query("hub.challenge");

	console.log("[messenger/webhook] Verification request:", {
		mode,
		token: `${token?.slice(0, 10)}...`,
	});

	if (mode !== "subscribe" || !token || !challenge) {
		return c.text("Missing parameters", 400);
	}

	const db = getDb();

	// Find the page with this verify token
	const [page] = await db
		.select()
		.from(messengerPages)
		.where(eq(messengerPages.webhookVerifyToken, token))
		.limit(1);

	if (!page) {
		console.error("[messenger/webhook] Invalid verify token");
		return c.text("Invalid verify token", 403);
	}

	console.log("[messenger/webhook] Verified for page:", page.pageName);
	return c.text(challenge);
});

// =============================================================================
// Webhook Handler (POST) - Receives incoming messages from Facebook
// =============================================================================
messengerRoute.post("/webhook", async (c) => {
	const signature = c.req.header("x-hub-signature-256");
	const rawBody = await c.req.text();

	// Verify signature
	if (!verifyFacebookSignature(rawBody, signature || "")) {
		console.error("[messenger/webhook] Invalid signature");
		return c.text("Invalid signature", 403);
	}

	const payload = JSON.parse(rawBody);

	// Facebook sends a test event on webhook setup
	if (payload.object !== "page") {
		return c.text("OK", 200);
	}

	const db = getDb();

	// Process each entry (batch of events)
	for (const entry of payload.entry || []) {
		const pageId = entry.id;

		// Find the connected page
		const [page] = await db
			.select()
			.from(messengerPages)
			.where(and(eq(messengerPages.facebookPageId, pageId), eq(messengerPages.enabled, true)))
			.limit(1);

		if (!page) {
			console.log("[messenger/webhook] Message for unconnected page:", pageId);
			continue;
		}

		// Get agent and settings
		const [agent] = await db.select().from(agents).where(eq(agents.id, page.agentId)).limit(1);

		if (!agent) {
			console.error("[messenger/webhook] Agent not found for page:", page.id);
			continue;
		}

		// Get messenger settings
		const [settings] = await db
			.select()
			.from(messengerChannelSettings)
			.where(eq(messengerChannelSettings.agentId, agent.id))
			.limit(1);

		if (!settings?.enabled) {
			console.log("[messenger/webhook] Messenger disabled for agent:", agent.id);
			continue;
		}

		// Process messaging events
		for (const messagingEvent of entry.messaging || []) {
			if (!messagingEvent.message || messagingEvent.message.is_echo) {
				continue; // Skip non-message events and echo messages
			}

			const senderPsid = messagingEvent.sender.id;
			const messageText = messagingEvent.message.text;

			if (!messageText) {
				continue; // Skip non-text messages for now
			}

			console.log("[messenger/webhook] Received message from:", senderPsid);

			// Find or create conversation thread
			const [thread] = await db
				.select()
				.from(messengerThreads)
				.where(
					and(
						eq(messengerThreads.messengerPageId, page.id),
						eq(messengerThreads.senderPsid, senderPsid),
					),
				)
				.limit(1);

			let conversationId: string;

			if (thread) {
				conversationId = thread.conversationId;
				// Update thread timestamp
				await db
					.update(messengerThreads)
					.set({ updatedAt: new Date() })
					.where(eq(messengerThreads.id, thread.id));
			} else {
				// Create new conversation
				const [newConvo] = await db
					.insert(conversations)
					.values({
						agentId: agent.id,
						title: `Messenger conversation`,
						channel: "messenger",
					})
					.returning();

				conversationId = newConvo.id;

				// Create thread mapping
				await db.insert(messengerThreads).values({
					messengerPageId: page.id,
					senderPsid: senderPsid,
					conversationId: conversationId,
				});
			}

			// Save user message
			await db.insert(chatMessages).values({
				conversationId,
				role: "user",
				content: messageText,
			});

			// Check if AI is enabled
			if (!agent.aiEnabled) {
				console.log("[messenger/webhook] AI disabled, skipping response");
				continue;
			}

			// Generate AI response
			try {
				// Get conversation history
				const history = await db
					.select()
					.from(chatMessages)
					.where(eq(chatMessages.conversationId, conversationId))
					.orderBy(chatMessages.createdAt);

				// Get relevant context from knowledge base
				const { results: searchResults } = await vectorClient.search(messageText, agent.id);
				const contextDocs = searchResults.map((r) => r.content);

				// Calculate confidence score from search results
				const confidenceScore =
					searchResults.length > 0
						? Math.round(Math.max(...searchResults.map((r) => r.score)) * 100)
						: null;

				// Build system prompt
				const personaPrompt = getPersonaSystemPrompt(agent.persona);
				const basePrompt = personaPrompt
					? `${agent.systemPrompt}\n\n${personaPrompt}`
					: agent.systemPrompt;
				const systemPrompt = buildSystemPrompt(basePrompt, contextDocs);

				// Build messages for LLM
				const llmMessages = history.slice(-20).map((m) => ({
					role: m.role as "user" | "assistant",
					content: m.content,
				}));

				// Determine model
				const aiQuality = (agent.aiQuality || "balanced") as AIQuality;
				const model = resolveTierToModel(aiQuality);

				// Generate response using streamChat
				let responseText = "";
				await streamChat(
					{
						model,
						system: systemPrompt,
						messages: llmMessages,
						temperature: (agent.temperature || 50) / 100,
						maxTokens: 2048,
					},
					async (event) => {
						if (event.type === "text_delta" && event.text) {
							responseText += event.text;
						}
					},
				);

				// Check confidence threshold
				const threshold = settings.confidenceThreshold || 70;
				const isLowConfidence = confidenceScore !== null && confidenceScore < threshold;
				const lowConfidenceAction = settings.lowConfidenceAction ?? "nothing";

				// Determine if we should skip sending the AI response
				const shouldSkipReply =
					isLowConfidence &&
					(lowConfidenceAction === "nothing" || lowConfidenceAction === "escalate");

				// Save assistant message
				await db.insert(chatMessages).values({
					conversationId,
					role: "assistant",
					content: responseText,
					confidenceScore,
					isSent: !shouldSkipReply,
				});

				// Send response via Messenger (unless low confidence)
				if (!shouldSkipReply) {
					await sendMessengerMessage(page.pageAccessToken, senderPsid, responseText);
				}

				// Track usage
				const usageProvider = new LocalUsageProvider();
				await usageProvider.trackMessage(agent.userId, {
					conversationId,
					model,
					channel: "messenger",
				});
			} catch (error) {
				console.error("[messenger/webhook] Error generating response:", error);
			}
		}
	}

	return c.text("OK", 200);
});

// =============================================================================
// OAuth Flow - Initiate Facebook Login
// =============================================================================
messengerRoute.get("/install", async (c) => {
	const agentId = c.req.query("agentId");

	if (!agentId) {
		return c.json({ error: "Missing agentId" }, 400);
	}

	if (!FB_APP_ID) {
		return c.json({ error: "Facebook App not configured" }, 500);
	}

	// Store agentId in state parameter for callback
	const state = Buffer.from(JSON.stringify({ agentId })).toString("base64url");

	const scopes = ["pages_messaging", "pages_manage_metadata", "pages_show_list"].join(",");

	const redirectUri = `${API_URL}/messenger/callback`;

	const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scopes}`;

	return c.redirect(authUrl);
});

// =============================================================================
// OAuth Callback - Exchange code for token and get pages
// =============================================================================
messengerRoute.get("/callback", async (c) => {
	const code = c.req.query("code");
	const state = c.req.query("state");
	const error = c.req.query("error");

	if (error) {
		console.error("[messenger/callback] OAuth error:", error);
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=${error}`);
	}

	if (!code || !state) {
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=missing_params`);
	}

	// Decode state
	let agentId: string;
	try {
		const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
		agentId = decoded.agentId;
	} catch {
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=invalid_state`);
	}

	if (!FB_APP_ID || !FB_APP_SECRET) {
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=app_not_configured`);
	}

	const redirectUri = `${API_URL}/messenger/callback`;

	try {
		// Exchange code for access token
		const tokenResponse = await fetch(
			`${GRAPH_API_URL}/oauth/access_token?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FB_APP_SECRET}&code=${code}`,
		);

		if (!tokenResponse.ok) {
			const err = await tokenResponse.json();
			console.error("[messenger/callback] Token exchange error:", err);
			return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=token_exchange_failed`);
		}

		const tokenData = (await tokenResponse.json()) as { access_token: string };
		const userAccessToken = tokenData.access_token;

		// Get long-lived token
		const longLivedResponse = await fetch(
			`${GRAPH_API_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userAccessToken}`,
		);

		if (!longLivedResponse.ok) {
			console.error("[messenger/callback] Long-lived token error");
			return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=long_lived_token_failed`);
		}

		const longLivedData = (await longLivedResponse.json()) as { access_token: string };
		const longLivedToken = longLivedData.access_token;

		// Get user's pages
		const pagesResponse = await fetch(
			`${GRAPH_API_URL}/me/accounts?access_token=${longLivedToken}&fields=id,name,access_token`,
		);

		if (!pagesResponse.ok) {
			console.error("[messenger/callback] Pages fetch error");
			return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=pages_fetch_failed`);
		}

		const pagesData = (await pagesResponse.json()) as {
			data?: Array<{ id: string; name: string; access_token: string }>;
		};

		// Store pages temporarily for selection (using query params for simplicity)
		const pages = (pagesData.data || []).map(
			(p: { id: string; name: string; access_token: string }) => ({
				id: p.id,
				name: p.name,
				accessToken: p.access_token, // Page access tokens are already long-lived
			}),
		);

		// Redirect to dashboard with pages data for multi-select
		const pagesParam = Buffer.from(JSON.stringify(pages)).toString("base64url");
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?agentId=${agentId}&pages=${pagesParam}`);
	} catch (err) {
		console.error("[messenger/callback] Error:", err);
		return c.redirect(`${DASHBOARD_URL}/channels/messenger?error=unknown`);
	}
});

// =============================================================================
// Connect Pages - Save selected pages after OAuth
// =============================================================================
messengerRoute.post("/pages", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const body = await c.req.json();
	const { agentId, pages } = body as {
		agentId: string;
		pages: Array<{ id: string; name: string; accessToken: string }>;
	};

	if (!agentId || !pages || !Array.isArray(pages)) {
		return c.json({ error: "Missing agentId or pages" }, 400);
	}

	const db = getDb();

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Check plan allows messenger
	const { planId } = await getUserPlan(user.id);
	const limits = getEffectivePlanLimits(planId);
	if (!limits.hasMessengerChannel) {
		return c.json({ error: "Messenger not available on your plan" }, 403);
	}

	// Create messenger settings if not exists
	const [existingSettings] = await db
		.select()
		.from(messengerChannelSettings)
		.where(eq(messengerChannelSettings.agentId, agentId))
		.limit(1);

	if (!existingSettings) {
		await db.insert(messengerChannelSettings).values({
			agentId,
			enabled: true,
		});
	}

	// Save selected pages
	const savedPages = [];
	for (const page of pages) {
		// Check if page already connected
		const [existing] = await db
			.select()
			.from(messengerPages)
			.where(eq(messengerPages.facebookPageId, page.id))
			.limit(1);

		if (existing) {
			// Update existing page
			await db
				.update(messengerPages)
				.set({
					agentId,
					pageName: page.name,
					pageAccessToken: page.accessToken,
					enabled: true,
					updatedAt: new Date(),
				})
				.where(eq(messengerPages.id, existing.id));
			savedPages.push({ ...existing, pageName: page.name });
		} else {
			// Create new page
			const [newPage] = await db
				.insert(messengerPages)
				.values({
					agentId,
					facebookPageId: page.id,
					pageName: page.name,
					pageAccessToken: page.accessToken,
					webhookVerifyToken: generateVerifyToken(),
					enabled: true,
				})
				.returning();
			savedPages.push(newPage);
		}
	}

	return c.json({
		success: true,
		pages: savedPages.map((p) => ({
			id: p.id,
			name: p.pageName,
			facebookPageId: p.facebookPageId,
		})),
	});
});

// =============================================================================
// Get Connected Pages
// =============================================================================
messengerRoute.get("/pages", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "Missing agentId" }, 400);
	}

	const db = getDb();

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const pages = await db
		.select({
			id: messengerPages.id,
			facebookPageId: messengerPages.facebookPageId,
			pageName: messengerPages.pageName,
			enabled: messengerPages.enabled,
			webhookVerifyToken: messengerPages.webhookVerifyToken,
			createdAt: messengerPages.createdAt,
		})
		.from(messengerPages)
		.where(eq(messengerPages.agentId, agentId));

	return c.json({ pages });
});

// =============================================================================
// Delete Connected Page
// =============================================================================
messengerRoute.delete("/pages/:pageId", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const pageId = requireParam(c, "pageId");
	const db = getDb();

	// Get the page
	const [page] = await db
		.select()
		.from(messengerPages)
		.where(eq(messengerPages.id, pageId))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, page.agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Delete the page (cascade will delete threads)
	await db.delete(messengerPages).where(eq(messengerPages.id, pageId));

	return c.json({ success: true });
});

// =============================================================================
// Get Messenger Settings
// =============================================================================
messengerRoute.get("/settings", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "Missing agentId" }, 400);
	}

	const db = getDb();

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Get or create settings
	let [settings] = await db
		.select()
		.from(messengerChannelSettings)
		.where(eq(messengerChannelSettings.agentId, agentId))
		.limit(1);

	if (!settings) {
		[settings] = await db
			.insert(messengerChannelSettings)
			.values({
				agentId,
				enabled: false, // Default to disabled until pages are connected
			})
			.returning();
	}

	return c.json({
		id: settings.id,
		agentId: settings.agentId,
		enabled: settings.enabled,
		confidenceThreshold: settings.confidenceThreshold,
		lowConfidenceAction: settings.lowConfidenceAction,
		forwardToEmail: settings.forwardToEmail,
	});
});

// =============================================================================
// Update Messenger Settings
// =============================================================================
messengerRoute.put("/settings", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const body = await c.req.json();
	const { agentId, enabled, confidenceThreshold, lowConfidenceAction, forwardToEmail } = body;

	if (!agentId) {
		return c.json({ error: "Missing agentId" }, 400);
	}

	const db = getDb();

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Get or create settings
	const [settings] = await db
		.select()
		.from(messengerChannelSettings)
		.where(eq(messengerChannelSettings.agentId, agentId))
		.limit(1);

	const updateData: Partial<{
		enabled: boolean;
		confidenceThreshold: number;
		lowConfidenceAction: string;
		forwardToEmail: string | null;
		updatedAt: Date;
	}> = {
		updatedAt: new Date(),
	};

	if (typeof enabled === "boolean") updateData.enabled = enabled;
	if (typeof confidenceThreshold === "number") updateData.confidenceThreshold = confidenceThreshold;
	if (typeof lowConfidenceAction === "string") updateData.lowConfidenceAction = lowConfidenceAction;
	if (forwardToEmail !== undefined) updateData.forwardToEmail = forwardToEmail || null;

	if (settings) {
		await db
			.update(messengerChannelSettings)
			.set(updateData)
			.where(eq(messengerChannelSettings.id, settings.id));
	} else {
		await db.insert(messengerChannelSettings).values({
			agentId,
			...updateData,
		});
	}

	return c.json({ success: true });
});

// =============================================================================
// Get Webhook URL for a page (for manual setup)
// =============================================================================
messengerRoute.get("/webhook-info/:pageId", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);

	const pageId = requireParam(c, "pageId");
	const db = getDb();

	// Get the page
	const [page] = await db
		.select()
		.from(messengerPages)
		.where(eq(messengerPages.id, pageId))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Verify user owns the agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, page.agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	return c.json({
		webhookUrl: `${API_URL}/messenger/webhook`,
		verifyToken: page.webhookVerifyToken,
	});
});

export { messengerRoute };
