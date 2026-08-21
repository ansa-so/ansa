import {
	agentEscalationSettings,
	agents,
	and,
	chatMessages,
	conversations,
	desc,
	emailChannelSettings,
	emailThreads,
	eq,
	escalations,
	getDb,
	inArray,
	interfaceSettings,
	isNotNull,
	isNull,
	lt,
	sql,
	teamMembers,
	users,
} from "@ansa/db";
import { Hono } from "hono";
import { marked } from "marked";
import { Resend } from "resend";
import { z } from "zod";
import { renderEmail } from "../lib/email";
import { emitToConversation } from "../lib/socket-emitter";

// Lazy-load socket namespaces to avoid circular dependencies
let socketNamespaces: { conversationsNamespace: any; dashboardNamespace: any } | null = null;
async function getSocketNamespaces() {
	if (!socketNamespaces) {
		const { conversationsNamespace, dashboardNamespace } = await import("../index");
		socketNamespaces = { conversationsNamespace, dashboardNamespace };
	}
	return socketNamespaces;
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Convert markdown to email-safe HTML
function markdownToEmailHtml(markdown: string): string {
	const html = marked.parse(markdown, { async: false, gfm: true, breaks: true }) as string;
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
	return markdown
		.replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, "").trim())
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/\*([^*]+)\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/_([^_]+)_/g, "$1")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/\n{3,}/g, "\n\n");
}

const escalationsRoute = new Hono();

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Helper to require authentication
function requireAuth(c: { get: (key: string) => unknown }): string {
	const userId = getUserId(c);
	if (!userId) {
		throw new Error("Unauthorized");
	}
	return userId;
}

// Calculate SLA deadline based on priority and settings
function calculateSlaDeadline(
	priority: string,
	slaConfig: {
		low?: number;
		medium?: number;
		high?: number;
		urgent?: number;
	} | null,
): Date | null {
	if (!slaConfig) return null;

	const minutes = slaConfig[priority as keyof typeof slaConfig];
	if (!minutes) return null;

	const deadline = new Date();
	deadline.setMinutes(deadline.getMinutes() + minutes);
	return deadline;
}

// Send Slack notification
async function sendSlackNotification(
	webhookUrl: string,
	message: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ text: message }),
		});

		if (!response.ok) {
			return { success: false, error: `Slack webhook failed: HTTP ${response.status}` };
		}
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Send webhook notification
async function sendWebhookNotification(
	url: string,
	headers: Record<string, string> | undefined,
	payload: Record<string, unknown>,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json", ...headers },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return { success: false, error: `Webhook failed: HTTP ${response.status}` };
		}
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Send email notification for escalation
async function sendEmailNotification(
	recipientIds: string[],
	escalationData: {
		conversationId: string;
		agentName: string;
		priority: string;
		source: string;
		escalatedAt: string;
		conversationPreview?: string;
	},
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		return { success: false, error: "Email service not configured" };
	}

	const db = getDb();

	const recipients = await db
		.select({ id: users.id, email: users.email, name: users.name })
		.from(users)
		.where(inArray(users.id, recipientIds));

	if (recipients.length === 0) {
		return { success: false, error: "No valid recipients found" };
	}

	const dashboardUrl = `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/escalations`;

	try {
		const html = await renderEmail("escalation-notification", {
			agentName: escalationData.agentName,
			priority: escalationData.priority,
			source: escalationData.source,
			conversationPreview: escalationData.conversationPreview,
			dashboardUrl,
			conversationUrl: `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/inbox/${escalationData.conversationId}`,
		});

		const sendPromises = recipients.map((recipient) =>
			resend.emails.send({
				from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
				to: recipient.email,
				subject: `🚨 New escalation request - ${escalationData.agentName}`,
				html,
			}),
		);

		await Promise.all(sendPromises);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error sending email",
		};
	}
}

// Send notifications based on escalation settings
async function sendEscalationNotifications(
	settings: {
		notificationMethod: string;
		notificationConfig: {
			webhookUrl?: string;
			webhookHeaders?: Record<string, string>;
			slackWebhookUrl?: string;
			emailRecipientIds?: string[];
		} | null;
	},
	escalationData: {
		escalationId: string;
		conversationId: string;
		agentName: string;
		priority: string;
		source: string;
		escalatedAt: string;
		conversationPreview?: string;
	},
): Promise<void> {
	const config = settings.notificationConfig || {};
	const method = settings.notificationMethod;

	const slackMessage = `🚨 *New Escalation Request*
• Agent: ${escalationData.agentName}
• Priority: ${escalationData.priority.toUpperCase()}
• Source: ${escalationData.source}
• Time: ${escalationData.escalatedAt}
${escalationData.conversationPreview ? `• Preview: "${escalationData.conversationPreview.substring(0, 100)}..."` : ""}

<${process.env.DASHBOARD_URL || "https://app.ansa.so"}/escalations|View in Dashboard>`;

	const webhookPayload = {
		event: "escalation.created",
		data: escalationData,
	};

	const promises: Promise<unknown>[] = [];

	if ((method === "slack" || method === "all") && config.slackWebhookUrl) {
		promises.push(sendSlackNotification(config.slackWebhookUrl, slackMessage));
	}

	if ((method === "webhook" || method === "all") && config.webhookUrl) {
		promises.push(
			sendWebhookNotification(config.webhookUrl, config.webhookHeaders, webhookPayload),
		);
	}

	if ((method === "email" || method === "all") && config.emailRecipientIds?.length) {
		promises.push(sendEmailNotification(config.emailRecipientIds, escalationData));
	}

	await Promise.allSettled(promises);
}

// ============ PUBLIC ROUTES (Widget) ============

// Create escalation from widget
const createEscalationSchema = z.object({
	conversationId: z.string().uuid(),
	source: z.enum(["user_request", "low_confidence", "form"]).default("user_request"),
});

escalationsRoute.post("/", async (c) => {
	const body = await c.req.json();
	const parsed = createEscalationSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { conversationId, source } = parsed.data;
	const db = getDb();

	// Get conversation and agent info
	const [conversation] = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
			title: conversations.title,
		})
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!conversation) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Check if already escalated
	const [existingEscalation] = await db
		.select({ id: escalations.id })
		.from(escalations)
		.where(
			and(
				eq(escalations.conversationId, conversationId),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
			),
		);

	if (existingEscalation) {
		return c.json(
			{ error: "Conversation is already escalated", escalationId: existingEscalation.id },
			409,
		);
	}

	// Get agent and escalation settings
	const [agent] = await db
		.select({
			id: agents.id,
			name: agents.name,
		})
		.from(agents)
		.where(eq(agents.id, conversation.agentId));

	const [settings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, conversation.agentId));

	if (!settings?.enabled) {
		return c.json({ error: "Escalation is not enabled for this agent" }, 400);
	}

	// Get last message for preview
	const [lastMessage] = await db
		.select({ content: chatMessages.content })
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, conversationId))
		.orderBy(desc(chatMessages.createdAt))
		.limit(1);

	const priority = settings.defaultPriority || "medium";
	const slaDeadline = calculateSlaDeadline(priority, settings.slaConfig);

	// Get authenticated user ID if available (dashboard escalations)
	const escalatedBy = getUserId(c);

	// Create escalation
	const [escalation] = await db
		.insert(escalations)
		.values({
			conversationId,
			agentId: conversation.agentId,
			status: settings.defaultAssigneeId ? "assigned" : "open",
			priority,
			escalationSource: source,
			assignedToId: settings.defaultAssigneeId,
			assignedAt: settings.defaultAssigneeId ? new Date() : null,
			slaDeadline,
			escalatedAt: new Date(),
			escalatedBy, // Track who escalated (null for widget/auto escalations)
		})
		.returning();

	// Insert user escalation message if source is user_request
	if (source === "user_request") {
		const [settings] = await db
			.select({ userEscalationMessage: interfaceSettings.userEscalationMessage })
			.from(interfaceSettings)
			.where(eq(interfaceSettings.agentId, conversation.agentId));

		const message =
			settings?.userEscalationMessage ||
			"The conversation has been escalated. A human will respond soon.";

		await db.insert(chatMessages).values({
			conversationId,
			role: "assistant",
			content: message,
			metadata: { messageType: "user_escalation_notice" },
		});
	}

	// Send notifications
	await sendEscalationNotifications(settings, {
		escalationId: escalation.id,
		conversationId,
		agentName: agent?.name || "Unknown Agent",
		priority,
		source,
		escalatedAt: new Date().toISOString(),
		conversationPreview: lastMessage?.content,
	});

	// Update notification sent timestamp
	await db
		.update(escalations)
		.set({ notificationSentAt: new Date() })
		.where(eq(escalations.id, escalation.id));

	// Emit socket event to notify connected clients
	try {
		const { conversationsNamespace, dashboardNamespace } = await getSocketNamespaces();
		const eventData = { conversationId, reason: source };
		conversationsNamespace.to(conversationId).emit("escalation-requested", eventData);
		dashboardNamespace.emit("escalation-requested", eventData);
	} catch (error) {
		console.error("Failed to emit escalation-requested event:", error);
	}

	return c.json({
		success: true,
		escalationId: escalation.id,
		status: escalation.status,
	});
});

// ============ AUTHENTICATED ROUTES (Dashboard) ============

// List escalations with filters
escalationsRoute.get("/", async (c) => {
	const userId = requireAuth(c);
	const db = getDb();

	const status = c.req.query("status");
	const assigneeId = c.req.query("assigneeId");
	const agentId = c.req.query("agentId");
	const priority = c.req.query("priority");
	const slaBreached = c.req.query("slaBreached");
	const limit = Number.parseInt(c.req.query("limit") || "50", 10);
	const offset = Number.parseInt(c.req.query("offset") || "0", 10);

	// Build conditions
	const conditions = [];

	// Only show escalations for agents the user owns or is a team member of
	const userAgents = await db
		.select({ id: agents.id })
		.from(agents)
		.leftJoin(teamMembers, eq(teamMembers.ownerId, agents.userId))
		.where(sql`${agents.userId} = ${userId} OR ${teamMembers.memberId} = ${userId}`);

	const agentIds = userAgents.map((a) => a.id);
	if (agentIds.length === 0) {
		return c.json({ escalations: [], total: 0 });
	}
	conditions.push(inArray(escalations.agentId, agentIds));

	if (status) {
		conditions.push(eq(escalations.status, status));
	}
	if (assigneeId) {
		if (assigneeId === "me") {
			conditions.push(eq(escalations.assignedToId, userId));
		} else if (assigneeId === "unassigned") {
			conditions.push(isNull(escalations.assignedToId));
		} else {
			conditions.push(eq(escalations.assignedToId, assigneeId));
		}
	}
	if (agentId) {
		conditions.push(eq(escalations.agentId, agentId));
	}
	if (priority) {
		conditions.push(eq(escalations.priority, priority));
	}
	if (slaBreached === "true") {
		conditions.push(isNotNull(escalations.slaBrokenAt));
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	// Get escalations with related data
	const results = await db
		.select({
			escalation: escalations,
			conversation: {
				id: conversations.id,
				title: conversations.title,
				channel: conversations.channel,
			},
			agent: {
				id: agents.id,
				name: agents.name,
			},
			assignee: {
				id: users.id,
				name: users.name,
				email: users.email,
			},
		})
		.from(escalations)
		.leftJoin(conversations, eq(escalations.conversationId, conversations.id))
		.leftJoin(agents, eq(escalations.agentId, agents.id))
		.leftJoin(users, eq(escalations.assignedToId, users.id))
		.where(whereClause)
		.orderBy(desc(escalations.escalatedAt))
		.limit(limit)
		.offset(offset);

	// Get total count
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)` })
		.from(escalations)
		.where(whereClause);

	// Get last message for each escalation
	const escalationIds = results.map((r) => r.escalation.id);
	const lastMessages =
		escalationIds.length > 0
			? await db
					.select({
						conversationId: chatMessages.conversationId,
						content: chatMessages.content,
						role: chatMessages.role,
						createdAt: chatMessages.createdAt,
					})
					.from(chatMessages)
					.where(
						inArray(
							chatMessages.conversationId,
							results.map((r) => r.conversation?.id).filter(Boolean) as string[],
						),
					)
					.orderBy(desc(chatMessages.createdAt))
			: [];

	// Group messages by conversation
	const messagesByConversation = lastMessages.reduce(
		(acc, msg) => {
			if (!acc[msg.conversationId]) {
				acc[msg.conversationId] = msg;
			}
			return acc;
		},
		{} as Record<string, (typeof lastMessages)[0]>,
	);

	const escalationsWithMessages = results.map((r) => ({
		...r.escalation,
		conversation: r.conversation,
		agent: r.agent,
		assignee: r.assignee?.id ? r.assignee : null,
		lastMessage: r.conversation?.id ? messagesByConversation[r.conversation.id] : null,
	}));

	return c.json({
		escalations: escalationsWithMessages,
		total: Number(count),
	});
});

// Get escalation counts for dashboard badge
escalationsRoute.get("/count", async (c) => {
	const userId = requireAuth(c);
	const db = getDb();

	// Get agent IDs the user has access to
	const userAgents = await db
		.select({ id: agents.id })
		.from(agents)
		.leftJoin(teamMembers, eq(teamMembers.ownerId, agents.userId))
		.where(sql`${agents.userId} = ${userId} OR ${teamMembers.memberId} = ${userId}`);

	const agentIds = userAgents.map((a) => a.id);
	if (agentIds.length === 0) {
		return c.json({ open: 0, assignedToMe: 0, slaBreached: 0 });
	}

	const baseCondition = inArray(escalations.agentId, agentIds);

	// Get counts
	const [openCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(escalations)
		.where(and(baseCondition, eq(escalations.status, "open")));

	const [assignedToMeCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(escalations)
		.where(
			and(
				baseCondition,
				eq(escalations.assignedToId, userId),
				inArray(escalations.status, ["assigned", "in_progress"]),
			),
		);

	const [slaBreachedCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(escalations)
		.where(
			and(
				baseCondition,
				isNotNull(escalations.slaBrokenAt),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
			),
		);

	// Get total active escalations (open + assigned + in_progress)
	const [totalActiveCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(escalations)
		.where(and(baseCondition, inArray(escalations.status, ["open", "assigned", "in_progress"])));

	return c.json({
		open: Number(openCount.count),
		assignedToMe: Number(assignedToMeCount.count),
		slaBreached: Number(slaBreachedCount.count),
		totalActive: Number(totalActiveCount.count),
	});
});

// Get single escalation with full conversation
escalationsRoute.get("/:id", async (c) => {
	const userId = requireAuth(c);
	const escalationId = c.req.param("id");
	const db = getDb();

	const [result] = await db
		.select({
			escalation: escalations,
			conversation: conversations,
			agent: {
				id: agents.id,
				name: agents.name,
				userId: agents.userId,
			},
			assignee: {
				id: users.id,
				name: users.name,
				email: users.email,
			},
		})
		.from(escalations)
		.leftJoin(conversations, eq(escalations.conversationId, conversations.id))
		.leftJoin(agents, eq(escalations.agentId, agents.id))
		.leftJoin(users, eq(escalations.assignedToId, users.id))
		.where(eq(escalations.id, escalationId));

	if (!result) {
		return c.json({ error: "Escalation not found" }, 404);
	}

	// Verify user has access
	const hasAccess =
		result.agent?.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(
				and(eq(teamMembers.ownerId, result.agent?.userId || ""), eq(teamMembers.memberId, userId)),
			)
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get conversation messages
	const messages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, result.conversation?.id || ""))
		.orderBy(chatMessages.createdAt);

	return c.json({
		...result.escalation,
		conversation: result.conversation,
		agent: result.agent,
		assignee: result.assignee?.id ? result.assignee : null,
		messages,
	});
});

// Assign escalation to team member
const assignSchema = z.object({
	assigneeId: z.string().nullable(),
});

escalationsRoute.patch("/:id/assign", async (c) => {
	const userId = requireAuth(c);
	const escalationId = c.req.param("id");
	const body = await c.req.json();
	const parsed = assignSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get escalation and verify access
	const [escalation] = await db
		.select({
			id: escalations.id,
			agentId: escalations.agentId,
			status: escalations.status,
		})
		.from(escalations)
		.where(eq(escalations.id, escalationId));

	if (!escalation) {
		return c.json({ error: "Escalation not found" }, 404);
	}

	// Verify user has access to this agent
	const [agent] = await db.select().from(agents).where(eq(agents.id, escalation.agentId));

	const hasAccess =
		agent?.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent?.userId || ""), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const { assigneeId } = parsed.data;

	await db
		.update(escalations)
		.set({
			assignedToId: assigneeId,
			assignedAt: assigneeId ? new Date() : null,
			assignedById: assigneeId ? userId : null,
			status: assigneeId ? "assigned" : "open",
			updatedAt: new Date(),
		})
		.where(eq(escalations.id, escalationId));

	return c.json({ success: true });
});

// Update escalation status
const updateStatusSchema = z.object({
	status: z.enum(["open", "assigned", "in_progress", "waiting_on_customer", "resolved"]),
	resolutionNote: z.string().optional(), // Optional note when de-escalating
});

escalationsRoute.patch("/:id/status", async (c) => {
	const userId = requireAuth(c);
	const escalationId = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateStatusSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get escalation and verify access
	const [escalation] = await db
		.select({
			id: escalations.id,
			agentId: escalations.agentId,
			firstResponseAt: escalations.firstResponseAt,
		})
		.from(escalations)
		.where(eq(escalations.id, escalationId));

	if (!escalation) {
		return c.json({ error: "Escalation not found" }, 404);
	}

	const [agent] = await db.select().from(agents).where(eq(agents.id, escalation.agentId));

	const hasAccess =
		agent?.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent?.userId || ""), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const { status, resolutionNote } = parsed.data;
	const updates: Record<string, unknown> = {
		status,
		updatedAt: new Date(),
	};

	// Store who resolved it and the resolution note when de-escalating
	if (status === "resolved") {
		updates.resolvedBy = userId;
		if (resolutionNote) {
			updates.resolutionNote = resolutionNote;
		}
	}

	// Only set resolvedAt for statuses that actually resolve the escalation
	// For de-escalation (resolved status), we DON'T set resolvedAt because we want to keep it active
	// We just insert the message and clear assignment
	if (status === "resolved") {
		// Insert de-escalation message
		const [conv] = await db
			.select({ id: conversations.id, assignedToId: conversations.assignedToId })
			.from(conversations)
			.innerJoin(escalations, eq(escalations.conversationId, conversations.id))
			.where(eq(escalations.id, escalationId));

		if (conv) {
			const [settings] = await db
				.select({ deescalationMessage: interfaceSettings.deescalationMessage })
				.from(interfaceSettings)
				.where(eq(interfaceSettings.agentId, escalation.agentId));

			const message =
				settings?.deescalationMessage || "The conversation has been transferred to an AI.";

			await db.insert(chatMessages).values({
				conversationId: conv.id,
				role: "assistant",
				content: message,
				metadata: { messageType: "deescalation_notice" },
			});

			// Clear assignment from conversation but keep it open
			await db
				.update(conversations)
				.set({
					assignedToId: null,
					assignedAt: null,
					status: "open",
				})
				.where(eq(conversations.id, conv.id));
		}
	}

	await db.update(escalations).set(updates).where(eq(escalations.id, escalationId));

	return c.json({ success: true });
});

// Update escalation priority
const updatePrioritySchema = z.object({
	priority: z.enum(["low", "medium", "high", "urgent"]),
});

escalationsRoute.patch("/:id/priority", async (c) => {
	const userId = requireAuth(c);
	const escalationId = c.req.param("id");
	const body = await c.req.json();
	const parsed = updatePrioritySchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get escalation and verify access
	const [escalation] = await db
		.select({
			id: escalations.id,
			agentId: escalations.agentId,
		})
		.from(escalations)
		.where(eq(escalations.id, escalationId));

	if (!escalation) {
		return c.json({ error: "Escalation not found" }, 404);
	}

	const [agent] = await db.select().from(agents).where(eq(agents.id, escalation.agentId));

	const hasAccess =
		agent?.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent?.userId || ""), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get escalation settings to recalculate SLA
	const [settings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, escalation.agentId));

	const { priority } = parsed.data;
	const slaDeadline = calculateSlaDeadline(priority, settings?.slaConfig || null);

	await db
		.update(escalations)
		.set({
			priority,
			slaDeadline,
			updatedAt: new Date(),
		})
		.where(eq(escalations.id, escalationId));

	return c.json({ success: true });
});

// Post a human response to an escalation
const respondSchema = z.object({
	content: z.string().min(1),
	metadata: z
		.object({
			originalContent: z.string().optional(),
			translatedFrom: z.string().optional(),
			translatedTo: z.string().optional(),
		})
		.optional(),
});

escalationsRoute.post("/:id/respond", async (c) => {
	const userId = requireAuth(c);
	const escalationId = c.req.param("id");
	const body = await c.req.json();
	const parsed = respondSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get escalation and verify access
	const [escalation] = await db
		.select({
			id: escalations.id,
			conversationId: escalations.conversationId,
			agentId: escalations.agentId,
			firstResponseAt: escalations.firstResponseAt,
		})
		.from(escalations)
		.where(eq(escalations.id, escalationId));

	if (!escalation) {
		return c.json({ error: "Escalation not found" }, 404);
	}

	const [agent] = await db.select().from(agents).where(eq(agents.id, escalation.agentId));

	const hasAccess =
		agent?.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent?.userId || ""), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const { content, metadata } = parsed.data;

	// Get conversation to check the channel
	const [conversation] = await db
		.select({
			id: conversations.id,
			channel: conversations.channel,
			assignedToId: conversations.assignedToId,
		})
		.from(conversations)
		.where(eq(conversations.id, escalation.conversationId));

	// Create the human response message
	const [message] = await db
		.insert(chatMessages)
		.values({
			conversationId: escalation.conversationId,
			role: "assistant",
			content,
			isHumanResponse: true,
			metadata: metadata || null,
		})
		.returning();

	// Emit WebSocket event to notify widget of new message (use message_complete for human replies)
	emitToConversation(escalation.conversationId, "message_complete", {
		type: "message_complete",
		message: {
			id: message.id,
			role: "assistant",
			content,
			isHumanResponse: true,
			createdAt: message.createdAt,
			metadata: message.metadata,
		},
	});

	// Update escalation status and first response time
	const updates: Record<string, unknown> = {
		status: "in_progress",
		updatedAt: new Date(),
	};

	if (!escalation.firstResponseAt) {
		updates.firstResponseAt = new Date();
	}

	await db.update(escalations).set(updates).where(eq(escalations.id, escalationId));

	// Update conversation status to "pending" (waiting on customer) and clear needsAttention
	// Only auto-assign if conversation is currently unassigned
	const conversationUpdates: Record<string, unknown> = {
		status: "pending",
		resolution: "human_handled",
		needsAttention: false,
		lastActivityAt: new Date(),
	};

	if (!conversation?.assignedToId) {
		conversationUpdates.assignedToId = userId;
		conversationUpdates.assignedAt = new Date();
	}

	await db
		.update(conversations)
		.set(conversationUpdates)
		.where(eq(conversations.id, escalation.conversationId));

	// If email channel, send email reply
	let emailSent = false;
	if (conversation?.channel === "email" && resend) {
		try {
			// Get email thread info
			const [emailThread] = await db
				.select()
				.from(emailThreads)
				.where(eq(emailThreads.conversationId, escalation.conversationId));

			// Get email settings for the agent
			const [emailSettings] = await db
				.select()
				.from(emailChannelSettings)
				.where(eq(emailChannelSettings.agentId, escalation.agentId));

			if (emailThread && emailSettings?.replyAddress) {
				// Build email reply body
				let replyBody = content;

				// Add signature if configured
				if (emailSettings.signature) {
					replyBody += `\n\n${emailSettings.signature}`;
				}

				// Build reply subject
				let replySubject = emailThread.subject?.startsWith("Re:")
					? emailThread.subject
					: `Re: ${emailThread.subject || "Your inquiry"}`;
				if (emailSettings.subjectPrefix) {
					replySubject = `${emailSettings.subjectPrefix} ${replySubject}`;
				}

				await resend.emails.send({
					from: `${emailSettings.displayName} <${emailSettings.replyAddress}>`,
					to: [emailThread.senderEmail],
					cc: emailSettings.ccAddress ? [emailSettings.ccAddress] : undefined,
					subject: replySubject,
					text: stripMarkdown(replyBody),
					html: markdownToEmailHtml(replyBody),
					headers: {
						"In-Reply-To": emailThread.lastMessageId || "",
						References: emailThread.lastMessageId || "",
					},
				});

				// Update thread with new message for threading
				await db
					.update(emailThreads)
					.set({
						lastMessageId: message.id,
						updatedAt: new Date(),
					})
					.where(eq(emailThreads.id, emailThread.id));

				emailSent = true;
				console.log("[escalations] Email reply sent to:", emailThread.senderEmail);
			}
		} catch (error) {
			console.error("[escalations] Failed to send email reply:", error);
			// Don't fail the whole request, the message was still saved
		}
	}

	return c.json({
		success: true,
		message,
		emailSent,
	});
});

// Check and update SLA breaches (can be called by cron or on-demand)
escalationsRoute.post("/check-sla", async (c) => {
	const userId = getUserId(c);
	// This can be called by cron without auth, or by admin
	if (!userId && !c.req.header("X-Cron-Secret")) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Find escalations with passed SLA deadlines that haven't been marked as breached
	const breachedEscalations = await db
		.select({ id: escalations.id })
		.from(escalations)
		.where(
			and(
				isNull(escalations.slaBrokenAt),
				isNotNull(escalations.slaDeadline),
				lt(escalations.slaDeadline, new Date()),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
			),
		);

	if (breachedEscalations.length > 0) {
		await db
			.update(escalations)
			.set({ slaBrokenAt: new Date(), updatedAt: new Date() })
			.where(
				inArray(
					escalations.id,
					breachedEscalations.map((e) => e.id),
				),
			);
	}

	return c.json({
		updated: breachedEscalations.length,
	});
});

// Get escalation settings for an agent
escalationsRoute.get("/settings/:agentId", async (c) => {
	const userId = requireAuth(c);
	const agentId = c.req.param("agentId");

	const db = getDb();

	// Verify agent ownership
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const hasAccess =
		agent.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent.userId), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get settings (or return defaults)
	const [settings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId));

	if (!settings) {
		// Return default settings
		return c.json({
			agentId,
			enabled: false,
			showButtonsAfter: "first_ai_response",
			notificationMethod: "none",
			notificationConfig: {},
			defaultPriority: "medium",
			defaultAssigneeId: null,
			slaConfig: { low: 480, medium: 240, high: 60, urgent: 30 },
			widgetConfidenceThreshold: 50,
			widgetLowConfidenceAction: "respond",
		});
	}

	return c.json(settings);
});

// Update escalation settings schema
const updateSettingsSchema = z.object({
	enabled: z.boolean().optional(),
	showButtonsAfter: z
		.enum([
			"first_ai_response",
			"every_ai_response",
			"never",
			"on_human_request",
			"on_low_confidence",
			"on_help_request",
			"on_human_or_negative_feedback",
			"on_any_signal",
		])
		.optional(),
	notificationMethod: z.enum(["none", "email", "slack", "webhook"]).optional(),
	notificationConfig: z
		.object({
			emailAddresses: z.array(z.string().email()).optional(),
			slackWebhookUrl: z.string().url().optional(),
			webhookUrl: z.string().url().optional(),
		})
		.optional(),
	defaultPriority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	defaultAssigneeId: z.string().uuid().nullable().optional(),
	slaConfig: z
		.object({
			low: z.number().int().min(1).optional(),
			medium: z.number().int().min(1).optional(),
			high: z.number().int().min(1).optional(),
			urgent: z.number().int().min(1).optional(),
		})
		.optional(),
	// Auto-close settings (in minutes)
	widgetAutoCloseMinutes: z.number().int().min(1).optional(),
	emailAutoCloseMinutes: z.number().int().min(1).optional(),
	// Widget AI confidence settings
	widgetConfidenceThreshold: z.number().int().min(0).max(100).optional(),
	widgetLowConfidenceAction: z.enum(["respond", "escalate"]).optional(),
});

escalationsRoute.put("/settings/:agentId", async (c) => {
	const userId = requireAuth(c);
	const agentId = c.req.param("agentId");
	const body = await c.req.json();
	const parsed = updateSettingsSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Verify agent ownership
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const hasAccess =
		agent.userId === userId ||
		(await db
			.select({ id: teamMembers.id })
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, agent.userId), eq(teamMembers.memberId, userId)))
			.then((r) => r.length > 0));

	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Check if settings exist
	const [existing] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId));

	const data = parsed.data;

	if (existing) {
		// Update existing settings
		await db
			.update(agentEscalationSettings)
			.set({
				...data,
				updatedAt: new Date(),
			})
			.where(eq(agentEscalationSettings.agentId, agentId));
	} else {
		// Create new settings
		await db.insert(agentEscalationSettings).values({
			agentId,
			enabled: data.enabled ?? false,
			showButtonsAfter: data.showButtonsAfter ?? "first_ai_response",
			notificationMethod: data.notificationMethod ?? "none",
			notificationConfig: data.notificationConfig ?? {},
			defaultPriority: data.defaultPriority ?? "medium",
			defaultAssigneeId: data.defaultAssigneeId ?? null,
			slaConfig: data.slaConfig ?? { low: 480, medium: 240, high: 60, urgent: 30 },
		});
	}

	// Return updated settings
	const [updated] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId));

	return c.json(updated);
});

// Get escalation history for a conversation
escalationsRoute.get("/history/:conversationId", async (c) => {
	const userId = getUserId(c);
	const conversationId = c.req.param("conversationId");
	const db = getDb();

	// Get conversation to verify access
	const [conversation] = await db
		.select({ agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!conversation) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Verify user has access to this conversation
	const [agent] = await db
		.select({ userId: agents.userId })
		.from(agents)
		.where(eq(agents.id, conversation.agentId));

	const hasAccess =
		agent?.userId === userId ||
		(userId &&
			(await db
				.select({ id: teamMembers.id })
				.from(teamMembers)
				.where(and(eq(teamMembers.ownerId, agent?.userId || ""), eq(teamMembers.memberId, userId)))
				.then((r) => r.length > 0)));

	if (!hasAccess && userId) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get all escalations for this conversation with user details
	const history = await db
		.select({
			id: escalations.id,
			status: escalations.status,
			priority: escalations.priority,
			escalationSource: escalations.escalationSource,
			escalatedAt: escalations.escalatedAt,
			resolvedAt: escalations.resolvedAt,
			resolutionNote: escalations.resolutionNote,
			slaDeadline: escalations.slaDeadline,
			slaBrokenAt: escalations.slaBrokenAt,
			firstResponseAt: escalations.firstResponseAt,
			createdAt: escalations.createdAt,
			escalatedBy: {
				id: users.id,
				name: users.name,
				email: users.email,
			},
			resolvedBy: {
				id: sql<string>`resolved_by_user.id`,
				name: sql<string>`resolved_by_user.name`,
				email: sql<string>`resolved_by_user.email`,
			},
			assignedTo: {
				id: sql<string>`assigned_user.id`,
				name: sql<string>`assigned_user.name`,
				email: sql<string>`assigned_user.email`,
			},
		})
		.from(escalations)
		.leftJoin(users, eq(escalations.escalatedBy, users.id))
		.leftJoin(sql`users as resolved_by_user`, sql`${escalations.resolvedBy} = resolved_by_user.id`)
		.leftJoin(sql`users as assigned_user`, sql`${escalations.assignedToId} = assigned_user.id`)
		.where(eq(escalations.conversationId, conversationId))
		.orderBy(desc(escalations.createdAt));

	return c.json({ history });
});

// Get escalation status for a conversation (public - used by widget)
escalationsRoute.get("/status/:conversationId", async (c) => {
	const db = getDb();
	const conversationId = c.req.param("conversationId");

	// Check conversation status first
	const [conversation] = await db
		.select({ status: conversations.status })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	// If conversation is closed/resolved, it's resolved regardless of escalation status
	const isConversationClosed =
		conversation?.status === "closed" || conversation?.status === "resolved";

	// Find the most recent escalation for this conversation
	const [escalation] = await db
		.select({
			id: escalations.id,
			status: escalations.status,
			resolvedAt: escalations.resolvedAt,
			createdAt: escalations.createdAt,
		})
		.from(escalations)
		.where(eq(escalations.conversationId, conversationId))
		.orderBy(desc(escalations.createdAt))
		.limit(1);

	if (!escalation) {
		return c.json({
			isEscalated: false,
			status: null,
			isResolved: isConversationClosed,
		});
	}

	const activeStatuses = ["open", "assigned", "in_progress"];
	const isActive = activeStatuses.includes(escalation.status || "");
	// Only consider it resolved if status is "resolved" AND resolvedAt is set
	// This allows de-escalation (status=resolved, resolvedAt=null) to not mark conversation as closed
	const isResolved = escalation.status === "resolved" && escalation.resolvedAt !== null;

	return c.json({
		isEscalated: isActive,
		status: escalation.status,
		isResolved: isResolved || isConversationClosed,
		escalationId: escalation.id,
	});
});

export { escalationsRoute };
