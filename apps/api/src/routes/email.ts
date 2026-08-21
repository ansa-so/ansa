import crypto from "node:crypto";
import {
	agentEscalationSettings,
	agents,
	and,
	chatMessages,
	conversations,
	emailChannelSettings,
	emailThreads,
	eq,
	escalations,
	getDb,
	inArray,
	qaSourceChunks,
	qaSources,
	sql,
	users,
} from "@ansa/db";
import { AI_QUALITY_TIERS, type AIQuality } from "@ansa/types";
import { getPersonaSystemPrompt } from "@ansa/utils";
import { type Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { marked } from "marked";
import { Resend } from "resend";
import { renderEmail } from "../lib/email";
import { extractPlainText, stripQuotedText } from "../lib/email-utils";
import { createEmbeddings } from "../lib/embeddings";
import { streamChat } from "../lib/llm";
import { resolveTierToModel } from "../lib/models";
import { requireOwnedEmailDomain } from "../lib/ownership";
import { LocalUsageProvider } from "../lib/usage";
import { vectorClient } from "../lib/vector";

const emailRoute = new Hono();

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Inbound email domain (configure in environment)
const INBOUND_DOMAIN = process.env.EMAIL_INBOUND_DOMAIN || "mail.ansa.so";

// Convert markdown to email-safe HTML
function markdownToEmailHtml(markdown: string): string {
	// Configure marked for email-safe output
	const html = marked.parse(markdown, { async: false, gfm: true, breaks: true }) as string;

	// Wrap in a simple email-friendly HTML template
	return `<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
		p { margin: 0 0 1em 0; }
		ul, ol { margin: 0 0 1em 0; padding-left: 2em; }
		li { margin-bottom: 0.5em; }
		a { color: #0066cc; }
		code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
		pre { background: #f4f4f4; padding: 12px; border-radius: 6px; overflow-x: auto; }
		pre code { background: none; padding: 0; }
		blockquote { border-left: 3px solid #ddd; margin: 0 0 1em 0; padding-left: 1em; color: #666; }
		hr { border: none; border-top: 1px solid #ddd; margin: 1.5em 0; }
	</style>
</head>
<body>
${html}
</body>
</html>`;
}

// Strip markdown formatting for plain text version
function stripMarkdown(markdown: string): string {
	return (
		markdown
			// Remove code blocks
			.replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
			// Remove inline code
			.replace(/`([^`]+)`/g, "$1")
			// Remove bold/italic
			.replace(/\*\*([^*]+)\*\*/g, "$1")
			.replace(/\*([^*]+)\*/g, "$1")
			.replace(/__([^_]+)__/g, "$1")
			.replace(/_([^_]+)_/g, "$1")
			// Convert links to text with URL
			.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
			// Remove headers formatting but keep text
			.replace(/^#{1,6}\s+/gm, "")
			// Clean up extra whitespace
			.replace(/\n{3,}/g, "\n\n")
	);
}

// Generate a unique inbound address for an agent
function generateInboundAddress(agentId: string): string {
	const shortId = agentId.replace(/-/g, "").slice(0, 12);
	return `agent-${shortId}@${INBOUND_DOMAIN}`;
}

// Verify Resend webhook signature
function verifyResendWebhook(body: string, signature: string, secret: string): boolean {
	const hmac = crypto.createHmac("sha256", secret);
	hmac.update(body);
	const expectedSignature = hmac.digest("hex");
	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Build system prompt with context (simplified version from chat.ts)
function buildSystemPrompt(basePrompt: string, contextDocs: string[]): string {
	let prompt = basePrompt;

	// Add current date/time so the AI can handle relative dates
	const now = new Date();
	prompt += `\n\n## Current Date & Time\nToday is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. The current time is ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this to calculate any relative dates (e.g., "in a week", "tomorrow", "next Monday").`;

	if (contextDocs.length > 0) {
		prompt += `\n\n## Relevant Knowledge Base Context\n\nUse the following information to help answer questions:\n\n${contextDocs.join("\n\n---\n\n")}`;
	}

	prompt += `\n\n## Important Guidelines
- Be helpful, accurate, and concise
- If you don't know something, say so honestly
- You may use markdown formatting (bold, lists, links) as it will be converted to HTML for email`;

	return prompt;
}

// Normalize email subject by removing Re:, Fwd:, etc. prefixes for thread matching
function normalizeSubject(subject: string | undefined): string {
	if (!subject) return "";
	// Remove common reply/forward prefixes (case-insensitive, handles multiple like "Re: Re: Fwd:")
	// Also handles localized versions: RE, Re, re, FW, Fw, fw, FWD, Fwd, fwd
	return subject.replace(/^(\s*(re|fw|fwd)\s*:\s*)+/gi, "").trim();
}

// Handle learn emails (human replies to forwarded low-confidence emails)
// This function is deprecated - human responses are now submitted through the Escalations dashboard
async function handleLearnEmail(
	c: Context,
	payload: {
		from: string;
		to: string[];
		subject: string | undefined;
		text: string | undefined;
		html: string | undefined;
	},
) {
	console.log("[email/learn] Received learn email but feature is deprecated:", {
		from: payload.from,
		to: payload.to,
		subject: payload.subject,
	});

	// The learn-* email address functionality has been replaced with the Escalations dashboard.
	// Human responses should now be submitted through the dashboard UI at /escalations
	return c.json({
		received: true,
		deprecated: true,
		message:
			"Email-based learning has been replaced with the Escalations dashboard. Please respond to escalations through the dashboard UI.",
	});
}

// Inbound email webhook from Resend
emailRoute.post("/inbound", async (c) => {
	const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

	// Verify webhook signature if secret is configured
	if (webhookSecret) {
		const signature = c.req.header("resend-signature") || c.req.header("svix-signature") || "";
		const body = await c.req.text();

		if (!verifyResendWebhook(body, signature, webhookSecret)) {
			console.error("[email] Invalid webhook signature");
			return c.json({ error: "Invalid signature" }, 401);
		}

		// Parse the body since we already consumed it
		const payload = JSON.parse(body);
		return processInboundEmail(c, payload);
	}

	// If no secret configured, parse JSON directly
	const payload = await c.req.json();
	return processInboundEmail(c, payload);
});

async function processInboundEmail(
	c: Context,
	payload: {
		type: string;
		data: {
			from: string;
			to: string[];
			cc?: string[];
			subject: string;
			text?: string;
			html?: string;
			message_id?: string;
			email_id?: string;
			headers?: Record<string, string>;
		};
	},
) {
	const db = getDb();

	// Log the full payload for debugging
	console.log("[email] Received payload:", JSON.stringify(payload, null, 2));

	// Resend inbound email format
	const { type, data } = payload;

	if (type !== "email.received") {
		return c.json({ received: true, skipped: "not an inbound email event" });
	}

	let { from, to, subject, text, html, message_id: messageId } = data;
	const emailId = data.email_id;

	// Resend webhooks don't include email body - must fetch via API
	// See: https://resend.com/docs/dashboard/receiving/introduction
	if (emailId && resend) {
		console.log("[email] Fetching email content via Resend API:", emailId);
		try {
			// Use the receiving API to get full email content
			const emailData = await resend.emails.receiving.get(emailId);
			if (emailData?.data) {
				text = emailData.data.text || text;
				html = emailData.data.html || html;
			}
		} catch (fetchError) {
			console.error("[email] Failed to fetch email content:", fetchError);
		}
	}

	// Extract sender email from "Name <email@domain.com>" format
	const senderMatch = from.match(/<([^>]+)>/) || [null, from];
	const senderEmail = senderMatch[1]?.toLowerCase() || from.toLowerCase();

	// Find the inbound address from the "to" or "cc" fields
	const allRecipients = [...to, ...(data.cc || [])];
	const inboundAddress = allRecipients
		.find((addr) => addr.toLowerCase().includes(INBOUND_DOMAIN))
		?.toLowerCase();

	if (!inboundAddress) {
		console.error("[email] No matching inbound address found in:", allRecipients);
		return c.json({ error: "Invalid recipient" }, 400);
	}

	// Extract just the email part if it includes a name
	const addressMatch = inboundAddress.match(/<([^>]+)>/) || [null, inboundAddress];
	const cleanInboundAddress = addressMatch[1] || inboundAddress;

	// Check if this is a learn address (learn-{agentId}@domain)
	const learnMatch = cleanInboundAddress.match(/^learn-([a-z0-9-]+)@/i);
	if (learnMatch) {
		console.log("[email] Routing to learn handler for address:", cleanInboundAddress);
		return handleLearnEmail(c, {
			from,
			to,
			subject,
			text,
			html,
		});
	}

	// Find email settings by inbound address
	const [emailSettings] = await db
		.select()
		.from(emailChannelSettings)
		.where(eq(emailChannelSettings.inboundAddress, cleanInboundAddress))
		.limit(1);

	if (!emailSettings) {
		console.error("[email] No agent found for inbound address:", cleanInboundAddress);
		return c.json({ error: "Agent not found" }, 404);
	}

	if (!emailSettings.enabled) {
		console.log("[email] Email channel disabled for agent:", emailSettings.agentId);
		return c.json({ received: true, skipped: "email channel disabled" });
	}

	// Check allowed domains
	const allowedDomains = emailSettings.allowedDomains || [];
	if (allowedDomains.length > 0) {
		const senderDomain = senderEmail.split("@")[1];
		if (!allowedDomains.some((d) => senderDomain?.endsWith(d))) {
			console.log("[email] Sender domain not allowed:", senderDomain);
			return c.json({ received: true, skipped: "sender domain not allowed" });
		}
	}

	// Check blocked senders
	const blockedSenders = emailSettings.blockedSenders || [];
	if (blockedSenders.some((b) => senderEmail.includes(b.toLowerCase()))) {
		console.log("[email] Sender blocked:", senderEmail);
		return c.json({ received: true, skipped: "sender blocked" });
	}

	// Check rate limits (use agent's security settings)
	// TODO: Implement rate limiting for email channel using senderEmail as identifier
	// const [security] = await db
	// 	.select()
	// 	.from(securitySettings)
	// 	.where(eq(securitySettings.agentId, emailSettings.agentId))
	// 	.limit(1);

	// Get agent details
	const [agent] = await db
		.select()
		.from(agents)
		.where(eq(agents.id, emailSettings.agentId))
		.limit(1);

	if (!agent) {
		console.error("[email] Agent not found:", emailSettings.agentId);
		return c.json({ error: "Agent not found" }, 404);
	}

	// Find or create conversation thread based on threadCreationMode setting
	const threadCreationMode = emailSettings.threadCreationMode ?? "always";
	let existingThread: typeof emailThreads.$inferSelect | null = null;
	let conversationId: string;

	// Look up existing thread based on mode
	if (threadCreationMode === "sender") {
		// Match by sender email only (original behavior)
		[existingThread] = await db
			.select()
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.agentId, emailSettings.agentId),
					eq(emailThreads.senderEmail, senderEmail),
				),
			)
			.limit(1);
	} else if (threadCreationMode === "subject") {
		// Match by sender email + normalized subject (strip Re:, Fwd: etc.)
		const normalizedSubject = normalizeSubject(subject);
		[existingThread] = await db
			.select()
			.from(emailThreads)
			.where(
				and(
					eq(emailThreads.agentId, emailSettings.agentId),
					eq(emailThreads.senderEmail, senderEmail),
					eq(emailThreads.subject, normalizedSubject),
				),
			)
			.limit(1);
	}
	// For "always" mode, existingThread stays null - always create new

	if (existingThread) {
		conversationId = existingThread.conversationId;
	} else {
		// Create new conversation
		const [newConversation] = await db
			.insert(conversations)
			.values({
				agentId: emailSettings.agentId,
				title: subject?.slice(0, 100) || "Email conversation",
				channel: "email",
			})
			.returning();

		conversationId = newConversation.id;

		// Create email thread record
		// Store normalized subject when using subject-based matching for consistent lookups
		const threadSubject = threadCreationMode === "subject" ? normalizeSubject(subject) : subject;
		[existingThread] = await db
			.insert(emailThreads)
			.values({
				agentId: emailSettings.agentId,
				senderEmail,
				conversationId,
				lastMessageId: messageId,
				subject: threadSubject,
			})
			.returning();
	}

	// Extract message content and strip quoted text from replies
	const rawContent = text || extractPlainText(html || "") || "No content";
	const messageContent = stripQuotedText(rawContent);

	console.log("[email] Extracted content:", {
		hasText: !!text,
		textLength: text?.length,
		hasHtml: !!html,
		htmlLength: html?.length,
		messageContent: messageContent.slice(0, 200),
	});

	// Save user message
	await db.insert(chatMessages).values({
		conversationId,
		role: "user",
		content: messageContent,
	});

	// Update lastActivityAt and status for auto-close timing
	// When customer sends a message, change status from "pending", "resolved", or "closed" to "open"
	await db
		.update(conversations)
		.set({
			lastActivityAt: new Date(),
			status: sql`CASE WHEN ${conversations.status} IN ('pending', 'resolved', 'closed') THEN 'open' ELSE ${conversations.status} END`,
		})
		.where(eq(conversations.id, conversationId));

	// Check if conversation has an active escalation - skip AI if so
	const [activeEscalation] = await db
		.select({ id: escalations.id, status: escalations.status })
		.from(escalations)
		.where(
			and(
				eq(escalations.conversationId, conversationId),
				inArray(escalations.status, ["open", "assigned", "in_progress", "waiting_on_customer"]),
			),
		)
		.limit(1);

	// If escalation was waiting on customer, transition back to in_progress
	if (activeEscalation && activeEscalation.status === "waiting_on_customer") {
		await db
			.update(escalations)
			.set({
				status: "in_progress",
				updatedAt: new Date(),
			})
			.where(eq(escalations.id, activeEscalation.id));
	}

	if (activeEscalation) {
		console.log("[email] Conversation is escalated, skipping AI response");
		return c.json({
			received: true,
			conversationId,
			replied: false,
			escalated: true,
			message: "Message received. Awaiting human response.",
		});
	}

	// Get previous messages for context
	const previousMessages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, conversationId))
		.orderBy(chatMessages.createdAt)
		.limit(20);

	// Search vector DB for relevant context
	const { results: searchResults } = await vectorClient.search(
		messageContent,
		emailSettings.agentId,
	);
	const contextDocs = searchResults.map((r) => r.content);

	// Calculate confidence score from search results
	const confidenceScore =
		searchResults.length > 0
			? Math.round(Math.max(...searchResults.map((r) => r.score)) * 100)
			: null;

	const systemPrompt = buildSystemPrompt(
		getPersonaSystemPrompt(agent.persona, agent.systemPrompt),
		contextDocs,
	);

	// Generate AI response
	let aiResponse = "";

	const messages = previousMessages.map((m) => ({
		role: m.role as "user" | "assistant",
		content: m.content,
	}));

	// Resolve AI quality tier to actual model
	const selectedTier = (agent.aiQuality as AIQuality) || AI_QUALITY_TIERS.BALANCED;
	const agentModel = resolveTierToModel(selectedTier);

	try {
		await streamChat(
			{
				model: agentModel,
				maxTokens: 2048,
				temperature: agent.temperature / 100,
				system: systemPrompt,
				messages,
			},
			async (event) => {
				if (event.type === "text_delta" && event.text) {
					aiResponse += event.text;
				}
			},
		);

		// Track usage for billing (agent owner pays for email channel usage)
		const usageProvider = new LocalUsageProvider();
		await usageProvider.trackMessage(agent.userId, {
			conversationId,
			model: agentModel,
			channel: "email",
		});
	} catch (error) {
		console.error("[email] LLM error:", error);
		return c.json({ error: "Failed to generate response" }, 500);
	}

	// Check if confidence is below threshold and determine action using escalation settings
	const [escSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agent.id));

	const threshold = emailSettings.confidenceThreshold ?? escSettings?.confidenceThreshold ?? 70;
	const isLowConfidence = confidenceScore !== null && confidenceScore < threshold;

	// Determine low confidence action from email settings (primary) or escalation settings (fallback)
	const lowConfidenceAction =
		emailSettings.lowConfidenceAction ??
		(escSettings?.autoEscalateOnLowConfidence ? "escalate" : "nothing");

	// Should we escalate? (create escalation record and notify)
	const shouldEscalate = isLowConfidence && lowConfidenceAction === "escalate";

	// Should we skip sending the AI response?
	const shouldSkipReply =
		isLowConfidence && (lowConfidenceAction === "do_nothing" || lowConfidenceAction === "escalate");

	// Should we forward to human instead?
	const shouldForward = isLowConfidence && lowConfidenceAction === "forward";

	// Save assistant message (with confidence score)
	const [savedMessage] = await db
		.insert(chatMessages)
		.values({
			conversationId,
			role: "assistant",
			content: aiResponse,
			confidenceScore,
			isSent: !shouldSkipReply, // Mark as unsent if skipping due to low confidence
		})
		.returning();

	// Update thread with new message ID for threading
	await db
		.update(emailThreads)
		.set({
			lastMessageId: savedMessage.id,
			updatedAt: new Date(),
		})
		.where(eq(emailThreads.id, existingThread!.id));

	// Update conversation with attention state based on confidence
	await db
		.update(conversations)
		.set({
			updatedAt: new Date(),
			lastActivityAt: new Date(),
			needsAttention: false,
			resolution: isLowConfidence ? null : "ai_handled",
		})
		.where(eq(conversations.id, conversationId));

	// Send reply via Resend
	if (!resend) {
		console.error("[email] Resend not configured");
		return c.json({ error: "Email sending not configured" }, 500);
	}

	if (!emailSettings.replyAddress) {
		console.error("[email] No reply address configured for agent:", emailSettings.agentId);
		return c.json({ error: "Reply address not configured" }, 500);
	}

	// If low confidence and escalation is enabled, create escalation and notify team
	if (shouldEscalate) {
		try {
			console.log(
				`[email] Low confidence (${confidenceScore}% < ${threshold}%), creating escalation`,
			);

			// Calculate SLA deadline
			let slaDeadline: Date | null = null;
			const priority = escSettings?.defaultPriority || "medium";
			if (escSettings?.slaConfig) {
				const slaConfig = escSettings.slaConfig as {
					low?: number;
					medium?: number;
					high?: number;
					urgent?: number;
				};
				const slaMinutes = slaConfig[priority as keyof typeof slaConfig];
				if (slaMinutes) {
					slaDeadline = new Date();
					slaDeadline.setMinutes(slaDeadline.getMinutes() + slaMinutes);
				}
			}

			// Create escalation record
			const [escalation] = await db
				.insert(escalations)
				.values({
					conversationId,
					agentId: agent.id,
					status: escSettings?.defaultAssigneeId ? "assigned" : "open",
					priority,
					escalationSource: "low_confidence",
					assignedToId: escSettings?.defaultAssigneeId || null,
					assignedAt: escSettings?.defaultAssigneeId ? new Date() : null,
					slaDeadline,
					escalatedAt: new Date(),
					notificationSentAt: new Date(),
				})
				.returning();

			// Send notifications based on escalation settings
			const notificationConfig = escSettings?.notificationConfig as {
				webhookUrl?: string;
				webhookHeaders?: Record<string, string>;
				slackWebhookUrl?: string;
				emailRecipientIds?: string[];
			} | null;

			if (notificationConfig) {
				const escalationData = {
					escalationId: escalation.id,
					conversationId,
					agentName: agent.name,
					priority,
					source: "low_confidence",
					escalatedAt: new Date().toISOString(),
					conversationPreview: messageContent.substring(0, 200),
					confidenceScore,
				};

				// Slack notification
				if (
					(escSettings?.notificationMethod === "slack" ||
						escSettings?.notificationMethod === "all") &&
					notificationConfig.slackWebhookUrl
				) {
					const slackMessage = `🚨 *Low Confidence Email Escalation*
• Agent: ${agent.name}
• Priority: ${priority.toUpperCase()}
• Confidence: ${confidenceScore}% (threshold: ${threshold}%)
• From: ${senderEmail}
• Subject: ${subject || "(no subject)"}

<${process.env.DASHBOARD_URL || "https://app.ansa.so"}/escalations|View in Dashboard>`;

					fetch(notificationConfig.slackWebhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ text: slackMessage }),
					}).catch(console.error);
				}

				// Webhook notification
				if (
					(escSettings?.notificationMethod === "webhook" ||
						escSettings?.notificationMethod === "all") &&
					notificationConfig.webhookUrl
				) {
					fetch(notificationConfig.webhookUrl, {
						method: "POST",
						headers: { "Content-Type": "application/json", ...notificationConfig.webhookHeaders },
						body: JSON.stringify({ event: "escalation.created", data: escalationData }),
					}).catch(console.error);
				}

				// Email notification
				if (
					(escSettings?.notificationMethod === "email" ||
						escSettings?.notificationMethod === "all") &&
					notificationConfig.emailRecipientIds?.length
				) {
					const recipients = await db
						.select({ email: users.email, name: users.name })
						.from(users)
						.where(inArray(users.id, notificationConfig.emailRecipientIds));

					if (recipients.length > 0 && resend) {
						const html = await renderEmail("escalation-notification", {
							agentName: agent.name,
							priority,
							source: "low_confidence",
							conversationPreview: messageContent.substring(0, 200),
							dashboardUrl: `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/escalations`,
							conversationUrl: `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/inbox/${conversationId}`,
						});

						for (const recipient of recipients) {
							resend.emails
								.send({
									from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
									to: recipient.email,
									subject: `🚨 Low confidence escalation - ${agent.name}`,
									html,
								})
								.catch(console.error);
						}
					}
				}
			}

			// Don't send the AI response for escalated emails
			console.log("[email] Escalation created:", escalation.id);
		} catch (error) {
			console.error("[email] Failed to create escalation:", error);
			// If escalation fails, we should still not send the AI response
		}
	}

	// Handle "forward" action - forward email to human for review
	if (shouldForward && emailSettings.forwardToEmail && resend) {
		try {
			console.log(
				`[email] Low confidence (${confidenceScore}% < ${threshold}%), forwarding to human`,
			);

			await resend.emails.send({
				from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
				to: [emailSettings.forwardToEmail],
				subject: `[Review Needed] ${subject || "Customer inquiry"}`,
				text: `This email was forwarded for human review due to low AI confidence (${confidenceScore}%).\n\n---\nFrom: ${senderEmail}\nSubject: ${subject || "(no subject)"}\n\n${messageContent}\n\n---\nAI's suggested response (not sent):\n${aiResponse}`,
				html: markdownToEmailHtml(
					`**This email was forwarded for human review due to low AI confidence (${confidenceScore}%).**\n\n---\n\n**From:** ${senderEmail}\n**Subject:** ${subject || "(no subject)"}\n\n${messageContent}\n\n---\n\n**AI's suggested response (not sent):**\n\n${aiResponse}`,
				),
			});

			console.log("[email] Forwarded to human for review:", emailSettings.forwardToEmail);
		} catch (error) {
			console.error("[email] Failed to forward email:", error);
		}
	}

	// Skip sending AI response if configured to do so on low confidence
	if (shouldSkipReply) {
		console.log(
			`[email] Low confidence (${confidenceScore}% < ${threshold}%), skipping AI reply (action: ${lowConfidenceAction})`,
		);
		return c.json({
			received: true,
			conversationId,
			replied: false,
			confidenceScore,
			action: lowConfidenceAction,
			escalated: shouldEscalate,
			forwarded: shouldForward,
		});
	}

	// Build email reply
	let replyBody = aiResponse;

	// Add AI disclaimer if enabled
	if (emailSettings.disclaimerEnabled && emailSettings.disclaimerText) {
		replyBody += `\n\n---\n${emailSettings.disclaimerText}`;
	}

	// Add signature if configured
	if (emailSettings.signature) {
		replyBody += `\n\n${emailSettings.signature}`;
	}

	// Include original message if configured
	if (emailSettings.includeOriginal) {
		replyBody += `\n\n---\nOn ${new Date().toLocaleDateString()}, ${senderEmail} wrote:\n> ${messageContent.split("\n").join("\n> ")}`;
	}

	// Build reply subject
	let replySubject = subject?.startsWith("Re:") ? subject : `Re: ${subject || "Your inquiry"}`;
	if (emailSettings.subjectPrefix) {
		replySubject = `${emailSettings.subjectPrefix} ${replySubject}`;
	}

	try {
		const sendResult = await resend.emails.send({
			from: `${emailSettings.displayName} <${emailSettings.replyAddress}>`,
			to: [senderEmail],
			cc: emailSettings.ccAddress ? [emailSettings.ccAddress] : undefined,
			subject: replySubject,
			text: stripMarkdown(replyBody),
			html: markdownToEmailHtml(replyBody),
			headers: {
				"In-Reply-To": messageId || "",
				References: messageId || "",
			},
		});

		console.log("[email] Reply sent:", sendResult);
	} catch (error) {
		console.error("[email] Failed to send reply:", error);

		// Send alert if configured
		if (emailSettings.alertContact && resend) {
			await resend.emails
				.send({
					from: process.env.EMAIL_FROM || "Ansa <noreply@ansa.so>",
					to: [emailSettings.alertContact],
					subject: "[Ansa] Email delivery failure",
					text: `Failed to send email reply to ${senderEmail}.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`,
				})
				.catch((e) => console.error("[email] Failed to send alert:", e));
		}

		return c.json({ error: "Failed to send reply" }, 500);
	}

	return c.json({ received: true, conversationId, replied: true, confidenceScore });
}

// Get email settings for an agent
emailRoute.get("/settings/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const db = getDb();

	// Check if user owns the agent
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

	if (!agent || agent.userId !== user.id) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Get or create email settings
	let [settings] = await db
		.select()
		.from(emailChannelSettings)
		.where(eq(emailChannelSettings.agentId, agentId))
		.limit(1);

	if (!settings) {
		// Create default settings with generated inbound address
		const inboundAddress = generateInboundAddress(agentId);
		[settings] = await db
			.insert(emailChannelSettings)
			.values({
				agentId,
				inboundAddress,
				replyAddress: inboundAddress,
				displayName: agent.name,
			})
			.returning();
	}

	return c.json(settings);
});

// Update email settings for an agent
emailRoute.post("/settings/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const db = getDb();

	// Check if user owns the agent
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

	if (!agent || agent.userId !== user.id) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const body = await c.req.json<{
		replyAddress?: string;
		displayName?: string;
		alertContact?: string;
		disclaimerEnabled?: boolean;
		disclaimerText?: string;
		signature?: string;
		subjectPrefix?: string;
		includeOriginal?: boolean;
		ccAddress?: string;
		allowedDomains?: string[];
		blockedSenders?: string[];
		enabled?: boolean;
		confidenceThreshold?: number;
		lowConfidenceAction?: "escalate" | "nothing" | "do_nothing" | "forward";
		forwardToEmail?: string;
		autoLearnEnabled?: boolean;
		threadCreationMode?: "always" | "subject" | "sender";
	}>();

	// Ensure settings exist
	let [settings] = await db
		.select()
		.from(emailChannelSettings)
		.where(eq(emailChannelSettings.agentId, agentId))
		.limit(1);

	if (!settings) {
		const inboundAddress = generateInboundAddress(agentId);
		[settings] = await db
			.insert(emailChannelSettings)
			.values({
				agentId,
				inboundAddress,
				replyAddress: inboundAddress,
				displayName: agent.name,
			})
			.returning();
	}

	// If enabling email channel, verify domain is verified
	const replyAddress = body.replyAddress ?? settings.replyAddress;
	const isEnabling = body.enabled === true;

	if (isEnabling && resend) {
		if (!replyAddress) {
			return c.json({ error: "Reply address is required to enable email channel" }, 400);
		}

		// Extract domain from reply address
		const emailDomain = replyAddress.split("@")[1];
		if (!emailDomain) {
			return c.json({ error: "Invalid reply address" }, 400);
		}

		// Check if domain is verified in Resend
		try {
			const result = await resend.domains.list();
			type DomainInfo = { id: string; name: string; status: string };
			const domains = (result.data as unknown as { data: DomainInfo[] } | null)?.data;
			const domainInfo = domains?.find((d) => d.name === emailDomain);

			if (!domainInfo) {
				return c.json(
					{
						error: `Domain "${emailDomain}" is not registered. Please verify your domain first.`,
						code: "DOMAIN_NOT_FOUND",
					},
					400,
				);
			}

			if (domainInfo.status !== "verified") {
				return c.json(
					{
						error: `Domain "${emailDomain}" is not verified. Please complete DNS verification first.`,
						code: "DOMAIN_NOT_VERIFIED",
					},
					400,
				);
			}
		} catch (error) {
			console.error("[email] Domain verification check error:", error);
			return c.json({ error: "Failed to verify domain status" }, 500);
		}
	}

	// Update settings - filter out undefined values
	const updates: Record<string, any> = {
		updatedAt: new Date(),
	};

	if (body.replyAddress !== undefined) updates.replyAddress = body.replyAddress;
	if (body.displayName !== undefined) updates.displayName = body.displayName;
	if (body.alertContact !== undefined) updates.alertContact = body.alertContact;
	if (body.disclaimerEnabled !== undefined) updates.disclaimerEnabled = body.disclaimerEnabled;
	if (body.disclaimerText !== undefined) updates.disclaimerText = body.disclaimerText;
	if (body.signature !== undefined) updates.signature = body.signature;
	if (body.subjectPrefix !== undefined) updates.subjectPrefix = body.subjectPrefix;
	if (body.includeOriginal !== undefined) updates.includeOriginal = body.includeOriginal;
	if (body.ccAddress !== undefined) updates.ccAddress = body.ccAddress;
	if (body.allowedDomains !== undefined) updates.allowedDomains = body.allowedDomains;
	if (body.blockedSenders !== undefined) updates.blockedSenders = body.blockedSenders;
	if (body.enabled !== undefined) updates.enabled = body.enabled;
	if (body.confidenceThreshold !== undefined)
		updates.confidenceThreshold = body.confidenceThreshold;
	if (body.lowConfidenceAction !== undefined)
		updates.lowConfidenceAction = body.lowConfidenceAction;
	if (body.forwardToEmail !== undefined) updates.forwardToEmail = body.forwardToEmail;
	if (body.autoLearnEnabled !== undefined) updates.autoLearnEnabled = body.autoLearnEnabled;
	if (body.threadCreationMode !== undefined) updates.threadCreationMode = body.threadCreationMode;

	const [updated] = await db
		.update(emailChannelSettings)
		.set(updates)
		.where(eq(emailChannelSettings.id, settings.id))
		.returning();

	return c.json(updated);
});

// Verify a domain with Resend
emailRoute.post("/verify-domain", async (c) => {
	if (!resend) {
		return c.json({ error: "Resend not configured" }, 500);
	}

	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { domain } = await c.req.json<{ domain: string }>();

	if (!domain) {
		return c.json({ error: "Domain required" }, 400);
	}

	try {
		const result = await resend.domains.create({ name: domain });
		// Resend returns { data: {...domain info with records} }
		const domainData = result.data;
		if (!domainData) {
			console.error("[email] Domain creation returned no data:", result);
			return c.json({ error: "Failed to create domain" }, 500);
		}
		return c.json(domainData);
	} catch (error) {
		console.error("[email] Domain verification error:", error);
		return c.json({ error: "Failed to initiate domain verification" }, 500);
	}
});

// Check domain verification status
emailRoute.get("/verify-status/:domain", async (c) => {
	if (!resend) {
		console.error("[email] Resend API key not configured");
		return c.json({ error: "Email service not configured. Please set RESEND_API_KEY." }, 500);
	}

	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const domain = c.req.param("domain");

	await requireOwnedEmailDomain(domain, user.id);

	try {
		const result = await resend.domains.list();
		console.log("[email] Domains list result:", JSON.stringify(result, null, 2));

		// Handle different Resend API response formats
		let domains: Array<{
			id: string;
			name: string;
			status: string;
			records?: unknown[];
		}> | null = null;

		if (Array.isArray(result.data)) {
			domains = result.data;
		} else if (
			result.data &&
			typeof result.data === "object" &&
			"data" in result.data &&
			Array.isArray((result.data as { data: unknown[] }).data)
		) {
			domains = (
				result.data as {
					data: Array<{ id: string; name: string; status: string; records?: unknown[] }>;
				}
			).data;
		}

		if (!domains || domains.length === 0) {
			console.log("[email] No domains returned from Resend");
			return c.json({ error: "Domain not found" }, 404);
		}

		const domainInfo = domains.find((d) => d.name === domain);

		if (!domainInfo) {
			console.log("[email] Domain not found in list:", domain);
			return c.json({ error: "Domain not found" }, 404);
		}

		return c.json(domainInfo);
	} catch (error) {
		console.error("[email] Domain status check error:", error);
		const message = error instanceof Error ? error.message : "Unknown error";
		return c.json({ error: `Failed to check domain status: ${message}` }, 500);
	}
});

// Trigger domain verification
emailRoute.post("/verify-domain/:domainId", async (c) => {
	if (!resend) {
		return c.json({ error: "Resend not configured" }, 500);
	}

	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const domainId = c.req.param("domainId");

	// domainId is a Resend identifier rather than a domain name, so resolve it
	// before checking ownership. Every tenant shares one Resend account.
	try {
		const listed = await resend.domains.list();
		const entries = (Array.isArray(listed.data) ? listed.data : listed.data?.data) as
			| Array<{ id: string; name: string }>
			| undefined;
		const match = entries?.find((d) => d.id === domainId);
		if (!match) {
			return c.json({ error: "Domain not found" }, 404);
		}
		await requireOwnedEmailDomain(match.name, user.id);
	} catch (error) {
		if (error instanceof HTTPException) throw error;
		console.error("[email] Failed to resolve domain for ownership check:", error);
		return c.json({ error: "Failed to verify domain" }, 500);
	}

	try {
		const result = await resend.domains.verify(domainId);
		// Return the domain data, not the wrapper
		return c.json(result.data || result);
	} catch (error) {
		console.error("[email] Domain verification error:", error);
		return c.json({ error: "Failed to verify domain" }, 500);
	}
});

// Learning webhook - receives human replies to forwarded emails
// Called when emails are sent to learn-{slug}@mail.ansa.so
// Note: This endpoint is kept for backwards compatibility and direct API calls.
// The /inbound webhook now routes learn-* addresses to handleLearnEmail automatically.
emailRoute.post("/learn", async (c) => {
	let rawBody: string;

	try {
		rawBody = await c.req.text();
	} catch {
		return c.json({ error: "Invalid request body" }, 400);
	}

	// Parse the webhook payload
	let payload: {
		from: string;
		to: string[];
		cc?: string[];
		subject: string;
		text?: string;
		html?: string;
	};

	try {
		payload = JSON.parse(rawBody);
	} catch {
		return c.json({ error: "Invalid JSON" }, 400);
	}

	return handleLearnEmail(c, {
		from: payload.from,
		to: payload.to,
		subject: payload.subject,
		text: payload.text,
		html: payload.html,
	});
});

export { emailRoute };
