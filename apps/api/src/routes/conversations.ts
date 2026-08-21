import {
	agentEscalationSettings,
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	count,
	desc,
	emailChannelSettings,
	emailThreads,
	eq,
	escalations,
	formSubmissions,
	getDb,
	inArray,
	isNotNull,
	isNull,
	lt,
	messageFeedback,
	ne,
	or,
	questionClusters,
	shopifyCustomers,
	shopifyOrders,
	shopifyShopAgents,
	sql,
	teamMembers,
	turnEvents,
	turns,
	users,
} from "@ansa/db";
import { getConfidenceLevel } from "@ansa/utils";
import { Hono } from "hono";
import { marked } from "marked";
import { Resend } from "resend";
import { CONVERSATION_RATE_LIMITS } from "../lib/plans";
import { emitToConversation } from "../lib/socket-emitter";

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

const conversationsRoute = new Hono();

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Helper to verify agent belongs to user
async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
	return !!agent;
}

// Get conversation counts for sidebar badge (optionally filtered by agent)
conversationsRoute.get("/count", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const clusterId = c.req.query("cluster"); // optional cluster filter
	const agentIdParam = c.req.query("agentId"); // optional agent filter

	const db = getDb();

	let agentIds: string[] = [];

	// If agentId is provided, verify ownership and use only that agent
	if (agentIdParam) {
		// Check if user has access to this agent (owned or team member)
		const [agentAccess] = await db
			.select({ id: agents.id })
			.from(agents)
			.leftJoin(teamMembers, eq(teamMembers.ownerId, agents.userId))
			.where(
				and(
					eq(agents.id, agentIdParam),
					sql`${agents.userId} = ${userId} OR ${teamMembers.memberId} = ${userId}`,
				),
			);

		if (!agentAccess) {
			return c.json({ error: "Agent not found or unauthorized" }, 404);
		}
		agentIds = [agentIdParam];
	} else {
		// Get agent IDs the user has access to (owned or team member)
		const userAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.leftJoin(teamMembers, eq(teamMembers.ownerId, agents.userId))
			.where(sql`${agents.userId} = ${userId} OR ${teamMembers.memberId} = ${userId}`);
		agentIds = userAgents.map((a) => a.id);
	}

	if (agentIds.length === 0) {
		return c.json({ escalated: 0, lowConfidence: 0 });
	}

	// Fetch cluster member message IDs if cluster filter is provided
	let clusterMemberMessageIds: string[] = [];
	if (clusterId) {
		const [cluster] = await db
			.select({ memberQuestionIds: questionClusters.memberQuestionIds })
			.from(questionClusters)
			.where(eq(questionClusters.id, clusterId));

		if (cluster?.memberQuestionIds) {
			clusterMemberMessageIds = cluster.memberQuestionIds as string[];
		}
		// If cluster doesn't exist or has no members, return empty results
		if (clusterMemberMessageIds.length === 0) {
			return c.json({ escalated: 0, lowConfidence: 0 });
		}
	}

	// Count escalated conversations (all escalation sources with active status, excluding closed conversations)
	let escalatedResult;
	if (clusterId && clusterMemberMessageIds.length > 0) {
		// Filter escalations by cluster - only count if conversation has a user message in the cluster
		const distinctConversations = await db
			.selectDistinct({ conversationId: escalations.conversationId })
			.from(escalations)
			.innerJoin(conversations, eq(escalations.conversationId, conversations.id))
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					inArray(conversations.agentId, agentIds),
					inArray(escalations.status, ["open", "assigned", "in_progress"]),
					ne(conversations.status, "closed"),
					ne(conversations.status, "resolved"),
					eq(chatMessages.role, "user"),
					inArray(chatMessages.id, clusterMemberMessageIds),
				),
			);
		escalatedResult = { count: distinctConversations.length };
	} else {
		const distinctConversations = await db
			.selectDistinct({ conversationId: escalations.conversationId })
			.from(escalations)
			.innerJoin(conversations, eq(escalations.conversationId, conversations.id))
			.where(
				and(
					inArray(conversations.agentId, agentIds),
					inArray(escalations.status, ["open", "assigned", "in_progress"]),
					ne(conversations.status, "closed"),
					ne(conversations.status, "resolved"),
				),
			);
		escalatedResult = { count: distinctConversations.length };
	}

	// Get confidence threshold from escalation settings (use first agent's settings, or default to 70)
	const [escSettings] = await db
		.select({ confidenceThreshold: agentEscalationSettings.confidenceThreshold })
		.from(agentEscalationSettings)
		.where(inArray(agentEscalationSettings.agentId, agentIds))
		.limit(1);
	const confidenceThreshold = escSettings?.confidenceThreshold ?? 70;

	// Count conversations with low confidence (assistant messages below threshold)
	let lowConfidenceResult;
	if (clusterId && clusterMemberMessageIds.length > 0) {
		// Filter low confidence by cluster - only count if conversation has a user message in the cluster
		const lowConfConvos = await db
			.selectDistinct({ conversationId: conversations.id })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					inArray(conversations.agentId, agentIds),
					eq(chatMessages.role, "assistant"),
					lt(chatMessages.confidenceScore, confidenceThreshold),
					isNotNull(chatMessages.confidenceScore),
				),
			);
		// Further filter to only include conversations with user messages in the cluster
		let filteredCount = 0;
		for (const convo of lowConfConvos) {
			const [hasClusterMessage] = await db
				.select({ id: chatMessages.id })
				.from(chatMessages)
				.where(
					and(
						eq(chatMessages.conversationId, convo.conversationId),
						eq(chatMessages.role, "user"),
						inArray(chatMessages.id, clusterMemberMessageIds),
					),
				)
				.limit(1);
			if (hasClusterMessage) filteredCount++;
		}
		lowConfidenceResult = { count: filteredCount };
	} else {
		const lowConfConvos = await db
			.selectDistinct({ conversationId: conversations.id })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					inArray(conversations.agentId, agentIds),
					eq(chatMessages.role, "assistant"),
					lt(chatMessages.confidenceScore, confidenceThreshold),
					isNotNull(chatMessages.confidenceScore),
				),
			);
		lowConfidenceResult = { count: lowConfConvos.length };
	}

	return c.json({
		escalated: Number(escalatedResult?.count ?? 0),
		lowConfidence: Number(lowConfidenceResult?.count ?? 0),
	});
});

// Get high-volume conversations (aiResponseCount > threshold)
conversationsRoute.get("/high-volume", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	// Get conversations with AI response count > threshold
	const highVolumeConvos = await db
		.select({
			id: conversations.id,
			title: conversations.title,
			aiResponseCount: conversations.aiResponseCount,
			status: conversations.status,
			lastActivityAt: conversations.lastActivityAt,
			createdAt: conversations.createdAt,
			visitorId: conversations.visitorId,
			userMetadata: conversations.userMetadata,
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				sql`${conversations.aiResponseCount} > ${CONVERSATION_RATE_LIMITS.ADMIN_MONITOR_THRESHOLD}`,
			),
		)
		.orderBy(desc(conversations.aiResponseCount))
		.limit(50);

	return c.json({ conversations: highVolumeConvos });
});

// List all conversations for an agent with optional filtering and pagination
conversationsRoute.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const filter = c.req.query("filter") as "escalated" | "low-confidence" | undefined;
	const feedback = c.req.query("feedback") as "thumbs-up" | "thumbs-down" | undefined;
	const assigneeId = c.req.query("assigneeId");
	const actionStatus = c.req.query("actionStatus") as
		| "has_action"
		| "succeeded"
		| "failed"
		| "none"
		| undefined;
	const resolved = c.req.query("resolved") as "true" | "false" | undefined;
	const hasMeaningfulQuestion = c.req.query("has_meaningful_question") as "true" | undefined;
	const hasConversion = c.req.query("has_conversion") as "true" | undefined;
	const channelsParam = c.req.query("channels"); // comma-separated list: widget,iframe,email
	const channels = channelsParam
		? channelsParam
				.split(",")
				.map((c) => c.trim())
				.filter(Boolean)
		: [];
	const confidenceLevelsParam = c.req.query("confidenceLevels"); // comma-separated: high,medium,low
	const confidenceLevels = confidenceLevelsParam
		? confidenceLevelsParam
				.split(",")
				.map((c) => c.trim())
				.filter(Boolean)
		: [];
	const statusParam = c.req.query("status"); // comma-separated: open,pending,resolved,closed
	const statuses = statusParam
		? statusParam
				.split(",")
				.map((s) => s.trim())
				.filter(Boolean)
		: [];
	const clusterId = c.req.query("cluster"); // cluster UUID
	const limit = Math.min(Number.parseInt(c.req.query("limit") || "50", 10), 100);
	const offset = Number.parseInt(c.req.query("offset") || "0", 10);

	const db = getDb();

	// Fetch cluster member message IDs if cluster filter is provided
	let clusterMemberMessageIds: string[] = [];
	if (clusterId) {
		const [cluster] = await db
			.select({ memberQuestionIds: questionClusters.memberQuestionIds })
			.from(questionClusters)
			.where(eq(questionClusters.id, clusterId));

		if (cluster?.memberQuestionIds) {
			clusterMemberMessageIds = cluster.memberQuestionIds as string[];
		}
		// If cluster doesn't exist or has no members, return empty results
		if (clusterMemberMessageIds.length === 0) {
			return c.json({
				conversations: [],
				total: 0,
				hasMore: false,
				filterCounts: {
					thumbsUp: 0,
					thumbsDown: 0,
					escalated: 0,
					lowConfidence: 0,
				},
			});
		}
	}

	// Get filter counts (always include these for the UI badges)
	const thumbsUpCountResult = await db
		.select({ count: count() })
		.from(conversations)
		.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
		.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id))
		.where(and(eq(conversations.agentId, agentId), eq(messageFeedback.feedback, "up")));

	const thumbsDownCountResult = await db
		.select({ count: count() })
		.from(conversations)
		.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
		.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id))
		.where(and(eq(conversations.agentId, agentId), eq(messageFeedback.feedback, "down")));

	const filterCounts = {
		thumbsUp: thumbsUpCountResult[0]?.count || 0,
		thumbsDown: thumbsDownCountResult[0]?.count || 0,
	};

	// Get escalation count (all escalation sources with active status, excluding closed conversations)
	const escalationCountResult = await db
		.select({ count: sql<number>`count(distinct ${escalations.conversationId})` })
		.from(escalations)
		.innerJoin(conversations, eq(escalations.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
				ne(conversations.status, "closed"),
			),
		);

	const escalationCount = escalationCountResult[0]?.count || 0;

	// Note: needsAttention count will be computed after baseConditions are built

	// Build the query based on filter
	let convos: {
		id: string;
		agentId: string;
		userId: string | null;
		title: string | null;
		createdAt: Date;
		updatedAt: Date;
		channel: string;
		minConfidence: number | null;
	}[] = [];
	let total = 0;

	// Get escalated conversation IDs for this agent (all escalation sources with active status, excluding closed conversations)
	const escalatedConvos = await db
		.select({ conversationId: escalations.conversationId })
		.from(escalations)
		.innerJoin(conversations, eq(escalations.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
				ne(conversations.status, "closed"),
			),
		);

	const escalatedConvoIds = new Set(escalatedConvos.map((e) => e.conversationId));

	// Build base where conditions
	const conditions: ReturnType<typeof eq>[] = [eq(conversations.agentId, agentId)];
	if (channels.length > 0) {
		conditions.push(inArray(conversations.channel, channels));
	}
	if (statuses.length > 0) {
		conditions.push(inArray(conversations.status, statuses));
	}
	if (assigneeId) {
		if (assigneeId === "me") {
			conditions.push(eq(conversations.assignedToId, userId));
		} else if (assigneeId === "unassigned") {
			conditions.push(isNull(conversations.assignedToId));
		} else {
			conditions.push(eq(conversations.assignedToId, assigneeId));
		}
	}
	// Handle resolved filter
	if (resolved === "true") {
		conditions.push(eq(conversations.status, "resolved"));
	} else if (resolved === "false") {
		conditions.push(ne(conversations.status, "resolved"));
	}

	// Pre-compute conversation IDs for action status filter
	let actionFilteredConvoIds: string[] | null = null;
	if (actionStatus) {
		if (actionStatus === "has_action") {
			// Conversations with any form submission
			const withActions = await db
				.selectDistinct({ conversationId: formSubmissions.conversationId })
				.from(formSubmissions)
				.where(
					and(eq(formSubmissions.agentId, agentId), isNotNull(formSubmissions.conversationId)),
				);
			actionFilteredConvoIds = withActions
				.map((r) => r.conversationId)
				.filter((id): id is string => id !== null);
		} else if (actionStatus === "succeeded") {
			// Conversations with successful form submissions
			const succeeded = await db
				.selectDistinct({ conversationId: formSubmissions.conversationId })
				.from(formSubmissions)
				.where(
					and(
						eq(formSubmissions.agentId, agentId),
						isNotNull(formSubmissions.conversationId),
						inArray(formSubmissions.status, ["submitted", "webhook_success", "client_success"]),
					),
				);
			actionFilteredConvoIds = succeeded
				.map((r) => r.conversationId)
				.filter((id): id is string => id !== null);
		} else if (actionStatus === "failed") {
			// Conversations with failed form submissions
			const failed = await db
				.selectDistinct({ conversationId: formSubmissions.conversationId })
				.from(formSubmissions)
				.where(
					and(
						eq(formSubmissions.agentId, agentId),
						isNotNull(formSubmissions.conversationId),
						inArray(formSubmissions.status, ["webhook_failed", "client_failed"]),
					),
				);
			actionFilteredConvoIds = failed
				.map((r) => r.conversationId)
				.filter((id): id is string => id !== null);
		} else if (actionStatus === "none") {
			// Conversations without any form submissions
			const withActions = await db
				.selectDistinct({ conversationId: formSubmissions.conversationId })
				.from(formSubmissions)
				.where(
					and(eq(formSubmissions.agentId, agentId), isNotNull(formSubmissions.conversationId)),
				);
			const withActionIds = new Set(
				withActions.map((r) => r.conversationId).filter((id): id is string => id !== null),
			);
			const allConvos = await db
				.select({ id: conversations.id })
				.from(conversations)
				.where(eq(conversations.agentId, agentId));
			actionFilteredConvoIds = allConvos.filter((c) => !withActionIds.has(c.id)).map((c) => c.id);
		}

		if (actionFilteredConvoIds && actionFilteredConvoIds.length > 0) {
			conditions.push(inArray(conversations.id, actionFilteredConvoIds));
		} else if (actionFilteredConvoIds !== null) {
			// No conversations match the action filter - return empty result
			return c.json({
				conversations: [],
				total: 0,
				hasMore: false,
				filterCounts: {
					thumbsUp: filterCounts.thumbsUp,
					thumbsDown: filterCounts.thumbsDown,
					escalated: escalationCount,
					lowConfidence: 0,
				},
			});
		}
	}

	// Pre-compute conversation IDs for meaningful question filter
	let meaningfulQuestionConvoIds: string[] | null = null;
	if (hasMeaningfulQuestion === "true") {
		const meaningful = await db
			.selectDistinct({ conversationId: turns.conversationId })
			.from(turns)
			.where(and(eq(turns.agentId, agentId), eq(turns.hasKbContext, true)));
		meaningfulQuestionConvoIds = meaningful.map((r) => r.conversationId);

		if (meaningfulQuestionConvoIds.length > 0) {
			conditions.push(inArray(conversations.id, meaningfulQuestionConvoIds));
		} else {
			// No conversations with meaningful questions
			return c.json({
				conversations: [],
				total: 0,
				hasMore: false,
				filterCounts: {
					thumbsUp: filterCounts.thumbsUp,
					thumbsDown: filterCounts.thumbsDown,
					escalated: escalationCount,
					lowConfidence: 0,
				},
			});
		}
	}

	// Pre-compute conversation IDs for has_conversion filter
	let conversionConvoIds: string[] | null = null;
	if (hasConversion === "true") {
		// Conversations with turn_events that have eventType in ['tool_call', 'form_submit', 'cta_click']
		const conversionsResult = await db
			.selectDistinct({ conversationId: turns.conversationId })
			.from(turnEvents)
			.innerJoin(turns, eq(turnEvents.turnId, turns.id))
			.where(
				and(
					eq(turns.agentId, agentId),
					inArray(turnEvents.eventType, ["tool_call", "form_submit", "cta_click"]),
				),
			);
		conversionConvoIds = conversionsResult.map((r) => r.conversationId);

		if (conversionConvoIds.length > 0) {
			conditions.push(inArray(conversations.id, conversionConvoIds));
		} else {
			// No conversations with conversions
			return c.json({
				conversations: [],
				total: 0,
				hasMore: false,
				filterCounts: {
					thumbsUp: filterCounts.thumbsUp,
					thumbsDown: filterCounts.thumbsDown,
					escalated: escalationCount,
					lowConfidence: 0,
				},
			});
		}
	}

	const baseConditions = and(...conditions);

	// Get confidence threshold from escalation settings
	const [escSettings] = await db
		.select({ confidenceThreshold: agentEscalationSettings.confidenceThreshold })
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escSettings?.confidenceThreshold ?? 70;

	// Get low confidence count (conversations with assistant messages below threshold)
	let lowConfidenceCount = 0;
	const lowConfidenceBaseConditions: ReturnType<typeof eq>[] = [eq(conversations.agentId, agentId)];
	if (channels.length > 0) {
		lowConfidenceBaseConditions.push(inArray(conversations.channel, channels));
	}
	const lowConfConvos = await db
		.selectDistinct({ conversationId: conversations.id })
		.from(conversations)
		.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				...lowConfidenceBaseConditions,
				eq(chatMessages.role, "assistant"),
				lt(chatMessages.confidenceScore, confidenceThreshold),
				isNotNull(chatMessages.confidenceScore),
			),
		);
	lowConfidenceCount = lowConfConvos.length;

	if (feedback && !filter) {
		// Feedback filter only (no escalated or low-confidence)
		const feedbackValue = feedback === "thumbs-up" ? "up" : "down";

		// Build where conditions for cluster filtering
		const feedbackConditions = [baseConditions, eq(messageFeedback.feedback, feedbackValue)];
		if (clusterId && clusterMemberMessageIds.length > 0) {
			feedbackConditions.push(
				eq(chatMessages.role, "user"),
				inArray(chatMessages.id, clusterMemberMessageIds),
			);
		}

		// Get distinct conversations with the specified feedback, including min confidence
		const result = await db
			.select({
				id: conversations.id,
				agentId: conversations.agentId,
				userId: conversations.userId,
				title: conversations.title,
				createdAt: conversations.createdAt,
				updatedAt: conversations.updatedAt,
				channel: conversations.channel,
				status: conversations.status,
				needsAttention: conversations.needsAttention,
				resolution: conversations.resolution,
				minConfidence: sql<
					number | null
				>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
			})
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id))
			.where(and(...feedbackConditions))
			.groupBy(
				conversations.id,
				conversations.agentId,
				conversations.userId,
				conversations.title,
				conversations.createdAt,
				conversations.updatedAt,
				conversations.channel,
				conversations.status,
				conversations.needsAttention,
				conversations.resolution,
			)
			.orderBy(desc(conversations.updatedAt))
			.limit(limit)
			.offset(offset);

		convos = result;

		// Get total count for pagination
		const totalResult = await db
			.select({ count: sql<number>`count(distinct ${conversations.id})` })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id))
			.where(and(...feedbackConditions));

		total = totalResult[0]?.count || 0;
	} else if (filter === "escalated") {
		// Get escalated conversations (all escalation sources with active status)
		// Optionally combined with feedback filter
		const escalatedConditions: ReturnType<typeof eq>[] = [
			baseConditions!,
			inArray(escalations.status, ["open", "assigned", "in_progress"]),
		];

		// Add feedback filter if provided
		if (feedback) {
			const feedbackValue = feedback === "thumbs-up" ? "up" : "down";
			escalatedConditions.push(eq(messageFeedback.feedback, feedbackValue));
		}

		// For cluster filtering, we need to ensure at least one user message in the conversation matches
		let clusterFilteredConvoIds: string[] = [];
		if (clusterId && clusterMemberMessageIds.length > 0) {
			const clusterConvos = await db
				.select({ conversationId: chatMessages.conversationId })
				.from(chatMessages)
				.where(
					and(eq(chatMessages.role, "user"), inArray(chatMessages.id, clusterMemberMessageIds)),
				)
				.groupBy(chatMessages.conversationId);
			clusterFilteredConvoIds = clusterConvos.map((c) => c.conversationId);

			// If no conversations match the cluster, return empty
			if (clusterFilteredConvoIds.length === 0) {
				convos = [];
				total = 0;
			}
		}

		if (!clusterId || clusterFilteredConvoIds.length > 0) {
			// Add cluster filter if needed
			if (clusterId && clusterFilteredConvoIds.length > 0) {
				escalatedConditions.push(inArray(conversations.id, clusterFilteredConvoIds));
			}

			// Build query - conditionally join messageFeedback if filtering by feedback
			let query = db
				.select({
					id: conversations.id,
					agentId: conversations.agentId,
					userId: conversations.userId,
					title: conversations.title,
					createdAt: conversations.createdAt,
					updatedAt: conversations.updatedAt,
					channel: conversations.channel,
					status: conversations.status,
					needsAttention: conversations.needsAttention,
					resolution: conversations.resolution,
					minConfidence: sql<
						number | null
					>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
				})
				.from(conversations)
				.innerJoin(escalations, eq(escalations.conversationId, conversations.id))
				.leftJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
				.$dynamic();

			// Add messageFeedback join if filtering by feedback
			if (feedback) {
				query = query.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id));
			}

			const result = await query
				.where(and(...escalatedConditions))
				.groupBy(
					conversations.id,
					conversations.agentId,
					conversations.userId,
					conversations.title,
					conversations.createdAt,
					conversations.updatedAt,
					conversations.channel,
					conversations.status,
					conversations.needsAttention,
					conversations.resolution,
				)
				.orderBy(desc(conversations.updatedAt))
				.limit(limit)
				.offset(offset);

			convos = result;

			// Get total count for pagination
			let totalQuery = db
				.select({ count: sql<number>`count(distinct ${conversations.id})` })
				.from(conversations)
				.innerJoin(escalations, eq(escalations.conversationId, conversations.id))
				.$dynamic();

			if (feedback) {
				totalQuery = totalQuery
					.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
					.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id));
			}

			const totalResult = await totalQuery.where(and(...escalatedConditions));

			total = totalResult[0]?.count || 0;
		}
	} else if (filter === "low-confidence") {
		// Get conversations with low confidence AI responses (confidenceScore < threshold)
		// First, get distinct conversation IDs that have at least one low-confidence assistant message
		const lowConfConvoIdsQuery = db
			.selectDistinct({ conversationId: conversations.id })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					baseConditions!,
					eq(chatMessages.role, "assistant"),
					lt(chatMessages.confidenceScore, confidenceThreshold),
					isNotNull(chatMessages.confidenceScore),
				),
			);

		let lowConfConvoIds = (await lowConfConvoIdsQuery).map((r) => r.conversationId);

		// For cluster filtering, we need to ensure at least one user message in the conversation matches
		if (clusterId && clusterMemberMessageIds.length > 0) {
			const clusterConvos = await db
				.select({ conversationId: chatMessages.conversationId })
				.from(chatMessages)
				.where(
					and(eq(chatMessages.role, "user"), inArray(chatMessages.id, clusterMemberMessageIds)),
				)
				.groupBy(chatMessages.conversationId);
			const clusterFilteredConvoIds = clusterConvos.map((c) => c.conversationId);

			// Intersect with low confidence conversation IDs
			lowConfConvoIds = lowConfConvoIds.filter((id) => clusterFilteredConvoIds.includes(id));
		}

		// If no conversations match, return empty
		if (lowConfConvoIds.length === 0) {
			convos = [];
			total = 0;
		} else {
			// Build the main query conditions
			const lowConfidenceConditions: ReturnType<typeof eq>[] = [
				inArray(conversations.id, lowConfConvoIds),
			];

			// Add feedback filter if provided
			if (feedback) {
				const feedbackValue = feedback === "thumbs-up" ? "up" : "down";
				lowConfidenceConditions.push(eq(messageFeedback.feedback, feedbackValue));
			}

			// Build query - conditionally join messageFeedback if filtering by feedback
			let query = db
				.select({
					id: conversations.id,
					agentId: conversations.agentId,
					userId: conversations.userId,
					title: conversations.title,
					createdAt: conversations.createdAt,
					updatedAt: conversations.updatedAt,
					channel: conversations.channel,
					status: conversations.status,
					needsAttention: conversations.needsAttention,
					resolution: conversations.resolution,
					minConfidence: sql<
						number | null
					>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
				})
				.from(conversations)
				.leftJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
				.$dynamic();

			// Add messageFeedback join if filtering by feedback
			if (feedback) {
				query = query.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id));
			}

			const result = await query
				.where(and(...lowConfidenceConditions))
				.groupBy(
					conversations.id,
					conversations.agentId,
					conversations.userId,
					conversations.title,
					conversations.createdAt,
					conversations.updatedAt,
					conversations.channel,
					conversations.status,
					conversations.needsAttention,
					conversations.resolution,
				)
				.orderBy(desc(conversations.updatedAt))
				.limit(limit)
				.offset(offset);

			convos = result;

			// Get total count for pagination
			let totalQuery = db
				.select({ count: sql<number>`count(distinct ${conversations.id})` })
				.from(conversations)
				.$dynamic();

			if (feedback) {
				totalQuery = totalQuery
					.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
					.innerJoin(messageFeedback, eq(messageFeedback.messageId, chatMessages.id));
			}

			const totalResult = await totalQuery.where(and(...lowConfidenceConditions));

			total = totalResult[0]?.count || 0;
		}
	} else {
		// No feedback filter - get all conversations with min confidence
		// Build where conditions for cluster filtering
		let defaultConditions = baseConditions;

		// For cluster filtering, we need to ensure at least one user message in the conversation matches
		let clusterFilteredConvoIds: string[] = [];
		if (clusterId && clusterMemberMessageIds.length > 0) {
			const clusterConvos = await db
				.select({ conversationId: chatMessages.conversationId })
				.from(chatMessages)
				.where(
					and(eq(chatMessages.role, "user"), inArray(chatMessages.id, clusterMemberMessageIds)),
				)
				.groupBy(chatMessages.conversationId);
			clusterFilteredConvoIds = clusterConvos.map((c) => c.conversationId);

			// If no conversations match the cluster, return empty
			if (clusterFilteredConvoIds.length === 0) {
				convos = [];
				total = 0;
			} else {
				defaultConditions = and(baseConditions, inArray(conversations.id, clusterFilteredConvoIds));
			}
		}

		if (!clusterId || clusterFilteredConvoIds.length > 0) {
			const result = await db
				.select({
					id: conversations.id,
					agentId: conversations.agentId,
					userId: conversations.userId,
					title: conversations.title,
					createdAt: conversations.createdAt,
					updatedAt: conversations.updatedAt,
					channel: conversations.channel,
					status: conversations.status,
					needsAttention: conversations.needsAttention,
					resolution: conversations.resolution,
					minConfidence: sql<
						number | null
					>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
				})
				.from(conversations)
				.leftJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
				.where(defaultConditions)
				.groupBy(
					conversations.id,
					conversations.agentId,
					conversations.userId,
					conversations.title,
					conversations.createdAt,
					conversations.updatedAt,
					conversations.channel,
					conversations.status,
					conversations.needsAttention,
					conversations.resolution,
				)
				.orderBy(desc(conversations.updatedAt))
				.limit(limit)
				.offset(offset);

			convos = result;

			// Get total count
			const totalResult = await db
				.select({ count: count() })
				.from(conversations)
				.where(defaultConditions);

			total = totalResult[0]?.count || 0;
		}
	}

	// Apply confidence level filtering if specified (post-query filter for simplicity)
	let filteredConvos = convos;
	if (confidenceLevels.length > 0) {
		filteredConvos = convos.filter((c) => {
			const level = getConfidenceLevel(c.minConfidence);
			// Include conversations with no confidence if not specifically filtering
			if (level === null) return confidenceLevels.includes("unknown");
			return confidenceLevels.includes(level);
		});
	}

	// Fetch assignee data for all conversations
	const conversationIds = filteredConvos.map((c) => c.id);
	const assigneeData =
		conversationIds.length > 0
			? await db
					.select({
						conversationId: conversations.id,
						assigneeId: users.id,
						assigneeName: users.name,
						assigneeEmail: users.email,
					})
					.from(conversations)
					.leftJoin(users, eq(conversations.assignedToId, users.id))
					.where(
						and(inArray(conversations.id, conversationIds), isNotNull(conversations.assignedToId)),
					)
			: [];

	// Create a map of conversationId -> assignee
	const assigneeMap = new Map(
		assigneeData.map((a) => [
			a.conversationId,
			a.assigneeId && a.assigneeEmail
				? { id: a.assigneeId, name: a.assigneeName, email: a.assigneeEmail }
				: null,
		]),
	);

	return c.json({
		conversations: filteredConvos.map((c) => ({
			...c,
			confidenceLevel: getConfidenceLevel(c.minConfidence),
			hasEscalation: escalatedConvoIds.has(c.id),
			assignee: assigneeMap.get(c.id) || null,
		})),
		total,
		hasMore: offset + convos.length < total,
		filterCounts: {
			...filterCounts,
			escalated: escalationCount,
			lowConfidence: lowConfidenceCount,
		},
	});
});

// Get single conversation with messages
conversationsRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [convo] = await db.select().from(conversations).where(eq(conversations.id, id));

	if (!convo) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Filter out isSent: false messages from history - those are AI suggestions only visible in compose area
	const messages = await db
		.select()
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.conversationId, id),
				or(eq(chatMessages.isSent, true), isNull(chatMessages.isSent)),
			),
		)
		.orderBy(chatMessages.createdAt);

	// Get the latest suggested message (isSent: false) for the compose area
	const [latestSuggestedMessage] = await db
		.select()
		.from(chatMessages)
		.where(and(eq(chatMessages.conversationId, id), eq(chatMessages.isSent, false)))
		.orderBy(desc(chatMessages.createdAt))
		.limit(1);

	// Hide suggested message if any sent message exists after it (means human already responded)
	const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
	const suggestedMessage =
		latestSuggestedMessage &&
		(!lastMessage || new Date(latestSuggestedMessage.createdAt) > new Date(lastMessage.createdAt))
			? latestSuggestedMessage
			: null;

	// Get feedback for all messages in this conversation
	const messageIds = messages.map((m) => m.id);
	const feedback =
		messageIds.length > 0
			? await db
					.select({
						messageId: messageFeedback.messageId,
						feedback: messageFeedback.feedback,
					})
					.from(messageFeedback)
					.where(sql`${messageFeedback.messageId} IN ${messageIds}`)
			: [];

	// Create a map of messageId -> feedback
	const feedbackMap = new Map(feedback.map((f) => [f.messageId, f.feedback]));

	// Add feedback to each message
	const messagesWithFeedback = messages.map((msg) => ({
		...msg,
		feedback: feedbackMap.get(msg.id) || null,
		confidenceScore: msg.confidenceScore,
	}));

	// Get form submissions for this conversation
	const submissions = await db
		.select({
			id: formSubmissions.id,
			toolId: formSubmissions.toolId,
			toolName: agentTools.name,
			formData: formSubmissions.formData,
			status: formSubmissions.status,
			createdAt: formSubmissions.createdAt,
		})
		.from(formSubmissions)
		.leftJoin(agentTools, eq(formSubmissions.toolId, agentTools.id))
		.where(eq(formSubmissions.conversationId, id))
		.orderBy(formSubmissions.createdAt);

	// Get email channel settings for confidence threshold
	const [emailSettings] = await db
		.select({ confidenceThreshold: emailChannelSettings.confidenceThreshold })
		.from(emailChannelSettings)
		.where(eq(emailChannelSettings.agentId, convo.agentId));

	const confidenceThreshold = emailSettings?.confidenceThreshold ?? 70;

	// Get the most recent escalation data if this conversation has one
	const [escalationData] = await db
		.select({
			id: escalations.id,
			status: escalations.status,
			priority: escalations.priority,
			slaDeadline: escalations.slaDeadline,
			slaBrokenAt: escalations.slaBrokenAt,
			firstResponseAt: escalations.firstResponseAt,
			escalatedAt: escalations.escalatedAt,
			escalationSource: escalations.escalationSource,
		})
		.from(escalations)
		.where(eq(escalations.conversationId, id))
		.orderBy(desc(escalations.createdAt))
		.limit(1);

	// Only consider escalation active if status is not "resolved"
	const hasEscalation = escalationData
		? ["open", "assigned", "in_progress", "waiting_on_customer"].includes(escalationData.status)
		: false;

	// Compute confidence level from minimum confidence score of assistant messages
	const assistantMessages = messagesWithFeedback.filter(
		(m) => m.role === "assistant" && m.confidenceScore !== null,
	);
	const minConfidence =
		assistantMessages.length > 0
			? Math.min(...assistantMessages.map((m) => m.confidenceScore as number))
			: null;

	return c.json({
		...convo,
		messages: messagesWithFeedback,
		suggestedMessage: suggestedMessage || null,
		formSubmissions: submissions,
		confidenceThreshold,
		confidenceLevel: getConfidenceLevel(minConfidence),
		hasEscalation,
		escalation: escalationData || null,
	});
});

// Delete conversation
conversationsRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [convo] = await db
		.select({ agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, id));

	if (!convo) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "conversation not found" }, 404);
	}

	await db.delete(conversations).where(eq(conversations.id, id));

	return c.json({ deleted: true });
});

// Get user/customer info for a conversation (includes Shopify data if available)
conversationsRoute.get("/:id/user-info", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Get conversation with all its data
	const [convo] = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
			channel: conversations.channel,
			countryCode: conversations.countryCode,
			language: conversations.language,
			pageUrl: conversations.pageUrl,
			pageDomain: conversations.pageDomain,
			pagePath: conversations.pagePath,
			visitorId: conversations.visitorId,
			userMetadata: conversations.userMetadata,
			status: conversations.status,
			assignedToId: conversations.assignedToId,
			internalNote: conversations.internalNote,
			firstHumanResponseAt: conversations.firstHumanResponseAt,
			createdAt: conversations.createdAt,
			needsAttention: conversations.needsAttention,
			resolution: conversations.resolution,
		})
		.from(conversations)
		.where(eq(conversations.id, id));

	if (!convo) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Verify ownership via agent
	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "conversation not found" }, 404);
	}

	// Get message count (only count sent messages)
	const [messageCountResult] = await db
		.select({ count: count() })
		.from(chatMessages)
		.where(and(eq(chatMessages.conversationId, id), eq(chatMessages.isSent, true)));
	const messageCount = messageCountResult?.count || 0;

	// Get assignee info if assigned
	let assignee: { id: string; name: string | null; email: string } | null = null;
	if (convo.assignedToId) {
		const [assigneeUser] = await db
			.select({ id: users.id, name: users.name, email: users.email })
			.from(users)
			.where(eq(users.id, convo.assignedToId));
		if (assigneeUser) {
			assignee = assigneeUser;
		}
	}

	// Try to find email from userMetadata or form submissions
	let email: string | null = null;

	// Check userMetadata for email
	if (convo.userMetadata && typeof convo.userMetadata === "object") {
		const metadata = convo.userMetadata as Record<string, unknown>;
		if (typeof metadata.email === "string") {
			email = metadata.email;
		}
	}

	// If no email in metadata, check form submissions
	if (!email) {
		const submissions = await db
			.select({ formData: formSubmissions.formData })
			.from(formSubmissions)
			.where(eq(formSubmissions.conversationId, id))
			.orderBy(formSubmissions.createdAt);

		for (const sub of submissions) {
			if (sub.formData && typeof sub.formData === "object") {
				const data = sub.formData as Record<string, unknown>;
				if (typeof data.email === "string") {
					email = data.email;
					break;
				}
			}
		}
	}

	// If still no email, check email thread (for email channel conversations)
	if (!email) {
		const [thread] = await db
			.select({ senderEmail: emailThreads.senderEmail })
			.from(emailThreads)
			.where(eq(emailThreads.conversationId, id))
			.limit(1);
		if (thread?.senderEmail) {
			email = thread.senderEmail;
		}
	}

	// Get other conversations from the same email (if we have an email)
	let otherConversations: Array<{
		id: string;
		title: string | null;
		status: string;
		createdAt: Date;
	}> = [];

	if (email) {
		// Find conversations with the same email in userMetadata or email threads
		const fromMetadata = await db
			.select({
				id: conversations.id,
				title: conversations.title,
				status: conversations.status,
				createdAt: conversations.createdAt,
			})
			.from(conversations)
			.where(
				and(
					eq(conversations.agentId, convo.agentId),
					ne(conversations.id, id),
					sql`${conversations.userMetadata}->>'email' = ${email}`,
				),
			)
			.orderBy(desc(conversations.createdAt))
			.limit(5);

		const fromEmailThreads = await db
			.select({
				id: conversations.id,
				title: conversations.title,
				status: conversations.status,
				createdAt: conversations.createdAt,
			})
			.from(conversations)
			.innerJoin(emailThreads, eq(emailThreads.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, convo.agentId),
					ne(conversations.id, id),
					eq(emailThreads.senderEmail, email),
				),
			)
			.orderBy(desc(conversations.createdAt))
			.limit(5);

		// Merge and dedupe by id, sort by date, limit to 5
		const allConvos = [...fromMetadata, ...fromEmailThreads];
		const seen = new Set<string>();
		otherConversations = allConvos
			.filter((c) => {
				if (seen.has(c.id)) return false;
				seen.add(c.id);
				return true;
			})
			.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
			.slice(0, 5);
	}

	// Try to get Shopify customer data if we have an email
	let shopifyCustomer = null;
	let shopifyOrdersList: Array<{
		id: string;
		orderNumber: string;
		financialStatus: string | null;
		fulfillmentStatus: string | null;
		totalPrice: string | null;
		currency: string | null;
		createdAt: Date;
		trackingNumber: string | null;
		trackingUrl: string | null;
	}> = [];

	if (email) {
		// Check if this agent has a Shopify connection
		const [shopAgent] = await db
			.select({ shopId: shopifyShopAgents.shopId })
			.from(shopifyShopAgents)
			.where(eq(shopifyShopAgents.agentId, convo.agentId))
			.limit(1);

		if (shopAgent) {
			// Find customer by email in this shop
			const [customer] = await db
				.select()
				.from(shopifyCustomers)
				.where(
					and(eq(shopifyCustomers.shopId, shopAgent.shopId), eq(shopifyCustomers.email, email)),
				)
				.limit(1);

			if (customer) {
				shopifyCustomer = {
					id: customer.id,
					email: customer.email,
					firstName: customer.firstName,
					lastName: customer.lastName,
					phone: customer.phone,
					ordersCount: customer.ordersCount,
					totalSpent: customer.totalSpent,
					currency: customer.currency,
					tags: customer.tags,
					note: customer.note,
					createdAt: customer.shopifyCreatedAt,
				};

				// Get recent orders for this customer
				const orders = await db
					.select({
						id: shopifyOrders.id,
						orderNumber: shopifyOrders.orderNumber,
						financialStatus: shopifyOrders.financialStatus,
						fulfillmentStatus: shopifyOrders.fulfillmentStatus,
						totalPrice: shopifyOrders.totalPrice,
						currency: shopifyOrders.currency,
						createdAt: shopifyOrders.shopifyCreatedAt,
						trackingNumber: shopifyOrders.trackingNumber,
						trackingUrl: shopifyOrders.trackingUrl,
					})
					.from(shopifyOrders)
					.where(eq(shopifyOrders.customerId, customer.id))
					.orderBy(desc(shopifyOrders.shopifyCreatedAt))
					.limit(10);

				shopifyOrdersList = orders;
			}
		}
	}

	// Get min confidence from messages in this conversation (excluding tool responses)
	const [confidenceResult] = await db
		.select({
			minConfidence: sql<number>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
		})
		.from(chatMessages)
		.where(
			and(
				eq(chatMessages.conversationId, id),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
			),
		);

	const minConfidence = confidenceResult?.minConfidence ?? null;

	// Determine confidence level from minConfidence
	const confidenceLevel = getConfidenceLevel(minConfidence);

	return c.json({
		conversation: {
			id: convo.id,
			channel: convo.channel,
			countryCode: convo.countryCode,
			language: convo.language,
			pageUrl: convo.pageUrl,
			pageDomain: convo.pageDomain,
			pagePath: convo.pagePath,
			createdAt: convo.createdAt,
			firstHumanResponseAt: convo.firstHumanResponseAt,
			messageCount,
			status: convo.status,
			internalNote: convo.internalNote,
			assignee,
			needsAttention: convo.needsAttention,
			resolution: convo.resolution,
			minConfidence,
			confidenceLevel,
		},
		user: {
			visitorId: convo.visitorId,
			metadata: convo.userMetadata,
			email,
		},
		otherConversations,
		shopify: shopifyCustomer
			? {
					customer: shopifyCustomer,
					orders: shopifyOrdersList,
				}
			: null,
	});
});

// Update conversation status
conversationsRoute.patch("/:id/status", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json<{ status: string }>();
	const { status } = body;

	if (!status || !["open", "pending", "resolved", "closed"].includes(status)) {
		return c.json(
			{ error: "Invalid status. Must be 'open', 'pending', 'resolved', or 'closed'" },
			400,
		);
	}

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
			resolution: conversations.resolution,
			firstHumanResponseAt: conversations.firstHumanResponseAt,
		})
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Update status
	const updateData: {
		status: string;
		resolvedAt?: Date | null;
		needsAttention?: boolean;
		resolution?: string;
	} = {
		status,
	};
	if (status === "resolved" || status === "closed") {
		updateData.resolvedAt = new Date();
		updateData.needsAttention = false; // Clear attention flag when closing

		// Auto-set resolution if not already set
		if (!convo.resolution) {
			// If human has responded, mark as human_handled, otherwise ai_handled
			updateData.resolution = convo.firstHumanResponseAt ? "human_handled" : "ai_handled";
		}
	} else {
		updateData.resolvedAt = null;
	}

	const [updated] = await db
		.update(conversations)
		.set(updateData)
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			status: conversations.status,
			resolvedAt: conversations.resolvedAt,
		});

	// If conversation is being closed or resolved, resolve any active escalations
	if (status === "closed" || status === "resolved") {
		await db
			.update(escalations)
			.set({
				status: "resolved",
				resolvedAt: new Date(),
				resolvedById: userId,
				updatedAt: new Date(),
			})
			.where(
				and(eq(escalations.conversationId, conversationId), ne(escalations.status, "resolved")),
			);
	}

	return c.json(updated);
});

// Mark conversation as improved (when user teaches AI a better response)
conversationsRoute.patch("/:id/improved", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json();
	const messageId = body.messageId as string | undefined;

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({ id: conversations.id, agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Update resolution to improved and clear needsAttention
	const [updated] = await db
		.update(conversations)
		.set({
			resolution: "improved",
			needsAttention: false,
			updatedAt: new Date(),
		})
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			resolution: conversations.resolution,
			needsAttention: conversations.needsAttention,
		});

	// If messageId provided, update that message's confidence score to 100
	if (messageId) {
		await db
			.update(chatMessages)
			.set({ confidenceScore: 100 })
			.where(and(eq(chatMessages.id, messageId), eq(chatMessages.conversationId, conversationId)));
	}

	return c.json(updated);
});

// Update conversation internal note
conversationsRoute.patch("/:id/note", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json<{ note: string | null }>();
	const { note } = body;

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({ id: conversations.id, agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Update internal note
	const [updated] = await db
		.update(conversations)
		.set({ internalNote: note, updatedAt: new Date() })
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			internalNote: conversations.internalNote,
		});

	return c.json(updated);
});

// Assign conversation to a team member
conversationsRoute.patch("/:id/assign", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json<{ assigneeId: string | null }>();
	const { assigneeId } = body;

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({ id: conversations.id, agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Update assignment
	const updateData: { assignedToId: string | null; assignedAt: Date | null } = {
		assignedToId: assigneeId,
		assignedAt: assigneeId ? new Date() : null,
	};

	const [updated] = await db
		.update(conversations)
		.set(updateData)
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			assignedToId: conversations.assignedToId,
			assignedAt: conversations.assignedAt,
		});

	return c.json(updated);
});

// Reset AI response count and resolve conversation
conversationsRoute.post("/:id/reset-rate-limit", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({ id: conversations.id, agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get user's name for system message
	const [user] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
	const userName = user?.name || "Admin";

	// Add system message about reset
	await db.insert(chatMessages).values({
		conversationId,
		role: "assistant",
		content: `Conversation resolved and reset by ${userName}`,
		metadata: { messageType: "system", reason: "rate_limit_reset" },
	});

	// Reset AI response count and update status
	const [updated] = await db
		.update(conversations)
		.set({
			aiResponseCount: 0,
			status: "resolved",
			resolution: "human_handled",
			resolvedAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			aiResponseCount: conversations.aiResponseCount,
			status: conversations.status,
		});

	return c.json(updated);
});

// Assign conversation to self (quick action)
conversationsRoute.post("/:id/claim", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({ id: conversations.id, agentId: conversations.agentId })
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Assign to current user
	const [updated] = await db
		.update(conversations)
		.set({
			assignedToId: userId,
			assignedAt: new Date(),
			status: "pending", // Auto-set to pending when claimed
		})
		.where(eq(conversations.id, conversationId))
		.returning({
			id: conversations.id,
			assignedToId: conversations.assignedToId,
			assignedAt: conversations.assignedAt,
			status: conversations.status,
		});

	return c.json(updated);
});

// Send a human message to a conversation
conversationsRoute.post("/:id/reply", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json<{
		content: string;
		metadata?: {
			originalContent?: string;
			translatedFrom?: string;
			translatedTo?: string;
		};
	}>();
	const { content, metadata } = body;

	if (!content?.trim()) {
		return c.json({ error: "Content is required" }, 400);
	}

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
			channel: conversations.channel,
			firstHumanResponseAt: conversations.firstHumanResponseAt,
		})
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	if (!(await verifyAgentOwnership(convo.agentId, userId))) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get the current user's info to store with the message
	const [currentUser] = await db
		.select({ name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, userId));

	// Create the human response message with sender info
	const [message] = await db
		.insert(chatMessages)
		.values({
			conversationId,
			role: "assistant",
			content: content.trim(),
			isHumanResponse: true,
			metadata: {
				...metadata,
				sentByName: currentUser?.name ?? undefined,
				sentByEmail: currentUser?.email ?? undefined,
			},
		})
		.returning({
			id: chatMessages.id,
			role: chatMessages.role,
			content: chatMessages.content,
			isHumanResponse: chatMessages.isHumanResponse,
			createdAt: chatMessages.createdAt,
			metadata: chatMessages.metadata,
		});

	// Emit WebSocket event to notify widget of new message (use message_complete for human replies)
	emitToConversation(conversationId, "message_complete", {
		type: "message_complete",
		message: {
			id: message.id,
			role: "assistant",
			content: message.content,
			isHumanResponse: true,
			createdAt: message.createdAt,
			metadata: message.metadata,
		},
	});

	// Update conversation status to pending if it was open
	// Also set firstHumanResponseAt if this is the first human reply
	// Set resolution to human_handled and clear needsAttention
	await db
		.update(conversations)
		.set({
			status: "pending",
			assignedToId: userId,
			assignedAt: new Date(),
			resolution: "human_handled",
			needsAttention: false,
			lastActivityAt: new Date(),
			...(convo.firstHumanResponseAt === null && {
				firstHumanResponseAt: new Date(),
			}),
		})
		.where(eq(conversations.id, conversationId));

	// Update any active escalations to "waiting_on_customer" status
	const [activeEscalations] = await db
		.select({ id: escalations.id, firstResponseAt: escalations.firstResponseAt })
		.from(escalations)
		.where(
			and(
				eq(escalations.conversationId, conversationId),
				inArray(escalations.status, ["open", "assigned", "in_progress"]),
			),
		);

	if (activeEscalations) {
		await db
			.update(escalations)
			.set({
				status: "waiting_on_customer",
				updatedAt: new Date(),
				...(activeEscalations.firstResponseAt === null && {
					firstResponseAt: new Date(),
				}),
			})
			.where(eq(escalations.id, activeEscalations.id));
	}

	// If email channel, send email reply to the customer
	let emailSent = false;
	if (convo.channel === "email" && resend) {
		try {
			// Get email thread info
			const [emailThread] = await db
				.select()
				.from(emailThreads)
				.where(eq(emailThreads.conversationId, conversationId));

			// Get email settings for the agent
			const [emailSettings] = await db
				.select()
				.from(emailChannelSettings)
				.where(eq(emailChannelSettings.agentId, convo.agentId));

			if (emailThread && emailSettings?.replyAddress) {
				// Build email reply body
				let replyBody = content.trim();

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
				console.log("[conversations] Email reply sent to:", emailThread.senderEmail);
			}
		} catch (error) {
			console.error("[conversations] Failed to send email reply:", error);
			// Don't fail the whole request, the message was still saved
		}
	}

	return c.json({
		message,
		conversationId,
		emailSent,
	});
});

// Translate text for a conversation (used for auto-translate feature)
conversationsRoute.post("/:id/translate", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const conversationId = c.req.param("id");
	const body = await c.req.json<{ text: string; targetLanguage: string }>();
	const { text, targetLanguage } = body;

	if (!text?.trim()) {
		return c.json({ error: "Text is required" }, 400);
	}

	if (!targetLanguage?.trim()) {
		return c.json({ error: "Target language is required" }, 400);
	}

	const db = getDb();

	// Get conversation and verify ownership
	const [convo] = await db
		.select({
			id: conversations.id,
			agentId: conversations.agentId,
		})
		.from(conversations)
		.where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Get agent and verify ownership
	const [agent] = await db
		.select({
			id: agents.id,
			userId: agents.userId,
		})
		.from(agents)
		.where(eq(agents.id, convo.agentId));

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Check ownership or team membership
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

	// Import needed modules for translation
	const { streamChat } = await import("../lib/llm");
	const { resolveTierToModel } = await import("../lib/models");
	const { calculateLLMCostCents } = await import("../lib/cost-tracking");
	const { getLanguageName } = await import("../lib/language-detection");
	const { llmUsage, userSubscriptions } = await import("@ansa/db");

	// Use fast tier (cheapest) for translation
	const model = resolveTierToModel("fast");
	const targetLanguageName = getLanguageName(targetLanguage);

	// Build translation prompt
	const systemPrompt = `You are a professional translator. Translate the following text to ${targetLanguageName}.
Only output the translated text, nothing else. Preserve the original formatting (markdown, line breaks, etc.).
Do not add any explanations, notes, or commentary.`;

	let translatedText = "";
	let inputTokens = 0;
	let outputTokens = 0;

	try {
		await streamChat(
			{
				model,
				system: systemPrompt,
				messages: [{ role: "user", content: text }],
				maxTokens: 2048,
				temperature: 0.3, // Lower temperature for more accurate translations
			},
			async (event) => {
				if (event.type === "text_delta" && event.text) {
					translatedText += event.text;
				} else if (event.type === "done" && event.usage) {
					inputTokens = event.usage.inputTokens;
					outputTokens = event.usage.outputTokens;
				} else if (event.type === "error") {
					throw new Error(event.error || "Translation failed");
				}
			},
		);
	} catch (error) {
		console.error("[conversations] Translation failed:", error);
		return c.json({ error: "Translation failed" }, 500);
	}

	// Track LLM usage for translation
	try {
		const totalCost = calculateLLMCostCents(model, inputTokens, outputTokens);
		const inputCost = calculateLLMCostCents(model, inputTokens, 0);
		const outputCost = calculateLLMCostCents(model, 0, outputTokens);

		// Get user's subscription for billing period
		const [subscription] = await db
			.select({ billingPeriodStart: userSubscriptions.billingPeriodStart })
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, agent.userId));

		await db.insert(llmUsage).values({
			userId: agent.userId,
			agentId: agent.id,
			conversationId: conversationId,
			model,
			tier: "fast",
			inputTokens,
			outputTokens,
			costCents: totalCost.toString(),
			costInputCents: inputCost.toString(),
			costOutputCents: outputCost.toString(),
			channel: "dashboard",
			billingPeriodStart:
				subscription?.billingPeriodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
		});
	} catch (usageError) {
		console.error("[conversations] Failed to track translation usage:", usageError);
		// Don't fail the request, translation was successful
	}

	return c.json({
		translatedText: translatedText.trim(),
		originalText: text,
		targetLanguage,
		model,
		usage: { inputTokens, outputTokens },
	});
});

export { conversationsRoute };
