import {
	agentEscalationSettings,
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	count,
	eq,
	escalations,
	formSubmissions,
	getDb,
	gte,
	inArray,
	isNotNull,
	lt,
	lte,
	messageFeedback,
	ne,
	questionClusters,
	sql,
	toolExecutions,
	triggerEvents,
	userPreferences,
	users,
} from "@ansa/db";
import { calculateAIHealthStatus, getHealthReason } from "@ansa/utils";
import { render } from "@react-email/components";
import cron from "node-cron";
import { createElement } from "react";
import { Resend } from "resend";
import { type AgentStats, RecapEmail } from "../../emails/recap-email";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/**
 * Get the current hour in a given timezone
 */
function getCurrentHourInTimezone(timezone: string): number {
	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			hour: "numeric",
			hour12: false,
			timeZone: timezone,
		});
		const hourStr = formatter.format(new Date());
		return Number.parseInt(hourStr, 10);
	} catch {
		// Fallback to UTC if timezone is invalid
		return new Date().getUTCHours();
	}
}

/**
 * Check if today is the start of the week (Monday) in the given timezone
 */
function isStartOfWeekInTimezone(timezone: string): boolean {
	try {
		const formatter = new Intl.DateTimeFormat("en-US", {
			weekday: "short",
			timeZone: timezone,
		});
		const dayStr = formatter.format(new Date());
		return dayStr === "Mon";
	} catch {
		// Fallback to UTC
		const day = new Date().getUTCDay();
		return day === 1; // Monday
	}
}

/**
 * Get date range for recap period (current and previous for comparison)
 */
function getDateRange(
	period: "daily" | "weekly",
	timezone: string,
): { start: Date; end: Date; previousStart: Date; previousEnd: Date; label: string } {
	const now = new Date();

	// Get the current date in the user's timezone
	const formatter = new Intl.DateTimeFormat("en-CA", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		timeZone: timezone,
	});
	const todayStr = formatter.format(now);
	const today = new Date(`${todayStr}T00:00:00Z`);

	if (period === "daily") {
		const yesterday = new Date(today);
		yesterday.setUTCDate(yesterday.getUTCDate() - 1);
		const dayBeforeYesterday = new Date(today);
		dayBeforeYesterday.setUTCDate(dayBeforeYesterday.getUTCDate() - 2);
		return {
			start: yesterday,
			end: today,
			previousStart: dayBeforeYesterday,
			previousEnd: yesterday,
			label: "Yesterday",
		};
	}

	// Weekly - last 7 days
	const weekAgo = new Date(today);
	weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
	const twoWeeksAgo = new Date(today);
	twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);
	return {
		start: weekAgo,
		end: today,
		previousStart: twoWeeksAgo,
		previousEnd: weekAgo,
		label: "Last 7 days",
	};
}

/**
 * Fetch stats for a specific agent over a date range
 */
async function getAgentStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	agentName: string,
	start: Date,
	end: Date,
	previousStart?: Date,
	previousEnd?: Date,
): Promise<AgentStats> {
	// Count conversations
	const [convoResult] = await db
		.select({ count: count() })
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, end),
			),
		);

	// Count messages and get average confidence score
	const [msgResult] = await db
		.select({
			count: count(),
			avgConfidence: sql<number>`AVG(${chatMessages.confidenceScore})`,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
				eq(chatMessages.role, "assistant"),
			),
		);

	// Calculate average response time (time between user message and assistant response)
	const [responseTimeResult] = await db.execute<{ avg_response_seconds: number }>(sql`
		WITH message_pairs AS (
			SELECT
				m.conversation_id,
				m.role,
				m.created_at,
				LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) as prev_created_at,
				LAG(m.role) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at) as prev_role
			FROM chat_messages m
			INNER JOIN conversations c ON m.conversation_id = c.id
			WHERE c.agent_id = ${agentId}
				AND m.created_at >= ${start.toISOString()}
				AND m.created_at <= ${end.toISOString()}
		)
		SELECT AVG(EXTRACT(EPOCH FROM (created_at - prev_created_at)))::float as avg_response_seconds
		FROM message_pairs
		WHERE role = 'assistant' AND prev_role = 'user'
	`);

	// Get feedback score (positive/negative counts)
	const [feedbackResult] = await db
		.select({
			positive: sql<number>`SUM(CASE WHEN ${messageFeedback.feedback} = 'up' THEN 1 ELSE 0 END)`,
			negative: sql<number>`SUM(CASE WHEN ${messageFeedback.feedback} = 'down' THEN 1 ELSE 0 END)`,
		})
		.from(messageFeedback)
		.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(messageFeedback.createdAt, start),
				lte(messageFeedback.createdAt, end),
			),
		);

	// Get top pages
	const topPagesResult = await db
		.select({
			path: conversations.pagePath,
			visits: count(),
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, end),
				isNotNull(conversations.pagePath),
			),
		)
		.groupBy(conversations.pagePath)
		.orderBy(sql`count(*) desc`)
		.limit(5);

	// Get trigger stats
	const triggerStatsResult = await db
		.select({
			triggerName: triggerEvents.triggerName,
			eventType: triggerEvents.eventType,
			count: count(),
		})
		.from(triggerEvents)
		.where(
			and(
				eq(triggerEvents.agentId, agentId),
				gte(triggerEvents.createdAt, start),
				lte(triggerEvents.createdAt, end),
			),
		)
		.groupBy(triggerEvents.triggerName, triggerEvents.eventType);

	// Aggregate trigger stats by trigger name
	const triggerMap = new Map<string, { firedCount: number; convertedCount: number }>();
	for (const row of triggerStatsResult) {
		const existing = triggerMap.get(row.triggerName) || { firedCount: 0, convertedCount: 0 };
		if (row.eventType === "fired") {
			existing.firedCount = Number(row.count);
		} else if (row.eventType === "converted") {
			existing.convertedCount = Number(row.count);
		}
		triggerMap.set(row.triggerName, existing);
	}
	const triggerStats = Array.from(triggerMap.entries())
		.map(([triggerName, stats]) => ({
			triggerName,
			firedCount: stats.firedCount,
			convertedCount: stats.convertedCount,
		}))
		.sort((a, b) => b.firedCount - a.firedCount)
		.slice(0, 5);

	// Parse feedback results
	const positiveCount = Number(feedbackResult?.positive) || 0;
	const negativeCount = Number(feedbackResult?.negative) || 0;
	const hasFeedback = positiveCount > 0 || negativeCount > 0;

	// Parse confidence score
	const avgConfidenceScore = msgResult?.avgConfidence ? Number(msgResult.avgConfidence) : undefined;

	// Query previous period confidence score for comparison
	let previousAvgConfidenceScore: number | undefined;
	if (previousStart && previousEnd) {
		const [prevMsgResult] = await db
			.select({
				avgConfidence: sql<number>`AVG(${chatMessages.confidenceScore})`,
			})
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(chatMessages.createdAt, previousStart),
					lte(chatMessages.createdAt, previousEnd),
					eq(chatMessages.role, "assistant"),
				),
			);
		previousAvgConfidenceScore = prevMsgResult?.avgConfidence
			? Number(prevMsgResult.avgConfidence)
			: undefined;
	}

	// Parse response time (convert from query result)
	const avgResponseTime = responseTimeResult?.avg_response_seconds
		? Number(responseTimeResult.avg_response_seconds)
		: undefined;

	// NEW: Count low-confidence messages (< 50%)
	const [lowConfidenceResult] = await db
		.select({ count: count() })
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
				eq(chatMessages.role, "assistant"),
				lt(chatMessages.confidenceScore, 50),
			),
		);
	const lowConfidenceCount = Number(lowConfidenceResult?.count) || 0;

	// NEW: Count escalations
	const [escalationResult] = await db
		.select({ count: count() })
		.from(escalations)
		.where(
			and(
				eq(escalations.agentId, agentId),
				gte(escalations.escalatedAt, start),
				lte(escalations.escalatedAt, end),
			),
		);
	const escalationCount = Number(escalationResult?.count) || 0;

	// NEW: Get top unanswered question from questionClusters (ordered by conversationCount desc, low confidence)
	const topUnansweredResult = await db
		.select({
			representativeQuestionId: questionClusters.representativeQuestionId,
		})
		.from(questionClusters)
		.where(and(eq(questionClusters.agentId, agentId), lt(questionClusters.avgConfidenceScore, 50)))
		.orderBy(sql`${questionClusters.conversationCount} DESC`)
		.limit(1);

	// Fetch the actual question text if we found a cluster
	let topUnansweredQuestion: string | null = null;
	if (topUnansweredResult[0]?.representativeQuestionId) {
		const [questionResult] = await db
			.select({ content: chatMessages.content })
			.from(chatMessages)
			.where(eq(chatMessages.id, topUnansweredResult[0].representativeQuestionId))
			.limit(1);
		topUnansweredQuestion = questionResult?.content || null;
	}

	// NEW: Count resolutions
	const resolutionResult = await db
		.select({ count: count() })
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, end),
				isNotNull(conversations.resolution),
			),
		);
	const resolutionCount = Number(resolutionResult[0]?.count) || 0;

	// NEW: Count form submissions
	const submissionResult = await db
		.select({ count: count() })
		.from(conversations)
		.innerJoin(formSubmissions, eq(formSubmissions.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(formSubmissions.formSubmittedAt, start),
				lte(formSubmissions.formSubmittedAt, end),
			),
		);
	const submissionCount = Number(submissionResult[0]?.count) || 0;

	// Filter trigger stats to only show triggers fired more than once
	const filteredTriggerStats = triggerStats.filter((t) => t.firedCount > 1);

	// NEW: Get action stats (tool executions with conversions)
	const actionStatsResult = await db
		.select({
			toolName: toolExecutions.toolName,
			executionCount: count(),
			successCount: sql<number>`SUM(CASE WHEN ${toolExecutions.success} THEN 1 ELSE 0 END)`,
			failureCount: sql<number>`SUM(CASE WHEN NOT ${toolExecutions.success} THEN 1 ELSE 0 END)`,
			conversionCount: sql<number>`SUM(CASE WHEN ${toolExecutions.success} AND ${agentTools.countsAsConversion} THEN 1 ELSE 0 END)`,
		})
		.from(toolExecutions)
		.leftJoin(agentTools, eq(toolExecutions.toolId, agentTools.id))
		.where(
			and(
				eq(toolExecutions.agentId, agentId),
				gte(toolExecutions.createdAt, start),
				lte(toolExecutions.createdAt, end),
			),
		)
		.groupBy(toolExecutions.toolName);

	const actionStats =
		actionStatsResult.length > 0
			? actionStatsResult.map((a) => ({
					toolName: a.toolName,
					executionCount: Number(a.executionCount),
					successCount: Number(a.successCount),
					failureCount: Number(a.failureCount),
					conversionCount: Number(a.conversionCount),
				}))
			: undefined;

	// NEW: Calculate unanswered count (using low confidence as proxy)
	const unansweredCount = lowConfidenceCount;

	// NEW: Calculate health status
	const healthStats = {
		avgConfidence: avgConfidenceScore ?? 0,
		unansweredCount,
		escalationCount,
	};
	const healthStatus = calculateAIHealthStatus(healthStats);
	const healthReason = getHealthReason(healthStats, healthStatus);

	return {
		agentId,
		agentName,
		totalConversations: Number(convoResult?.count) || 0,
		messagesReceived: Number(msgResult?.count) || 0,
		avgResponseTime,
		avgConfidenceScore,
		previousAvgConfidenceScore,
		feedbackScore: hasFeedback ? { positive: positiveCount, negative: negativeCount } : undefined,
		topPages: topPagesResult.map((p) => ({
			path: p.path as string,
			visits: Number(p.visits),
		})),
		triggerStats: filteredTriggerStats.length > 0 ? filteredTriggerStats : undefined,
		actionStats,
		// New fields
		healthStatus,
		healthReason,
		unansweredCount,
		lowConfidenceCount,
		escalationCount,
		topUnansweredQuestion,
		resolutionCount,
		submissionCount,
	};
}

/**
 * Send recap email for a user
 */
async function sendRecapEmail(
	email: string,
	userName: string | null,
	period: "daily" | "weekly",
	agentStats: AgentStats[],
): Promise<boolean> {
	if (!resend) {
		console.warn("[cron] Resend not configured, skipping email send");
		return false;
	}

	const { label } = getDateRange(period, "UTC");
	const dashboardUrl = process.env.DASHBOARD_URL || "https://app.ansa.so";

	try {
		const html = await render(
			createElement(RecapEmail, {
				userName: userName || undefined,
				period,
				periodLabel: label,
				agents: agentStats,
				dashboardUrl,
			}),
		);

		const totalConversations = agentStats.reduce((sum, a) => sum + a.totalConversations, 0);

		await resend.emails.send({
			from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
			to: email,
			subject:
				totalConversations > 0
					? `Your ${period} recap: ${totalConversations} conversations`
					: `Your ${period} recap`,
			html,
		});

		console.log(`[cron] Sent ${period} recap email to ${email}`);
		return true;
	} catch (err) {
		console.error(`[cron] Failed to send recap email to ${email}:`, err);
		return false;
	}
}

/**
 * Main cron job function - runs hourly
 */
export async function processRecapEmails(): Promise<void> {
	console.log("[cron] Starting recap email processing...");

	const db = getDb();

	// Find all users with recap enabled
	const usersWithPrefs = await db
		.select({
			userId: userPreferences.userId,
			email: users.email,
			name: users.name,
			timezone: users.timezone,
			recapFrequency: userPreferences.recapFrequency,
			recapHour: userPreferences.recapHour,
			recapDigestMode: userPreferences.recapDigestMode,
		})
		.from(userPreferences)
		.innerJoin(users, eq(userPreferences.userId, users.id))
		.where(ne(userPreferences.recapFrequency, "none"));

	console.log(`[cron] Found ${usersWithPrefs.length} users with recap enabled`);

	let emailsSent = 0;

	for (const user of usersWithPrefs) {
		const timezone = user.timezone || "UTC";
		const currentHour = getCurrentHourInTimezone(timezone);
		const frequency = user.recapFrequency as "daily" | "weekly";

		// Check if it's the right hour for this user
		if (currentHour !== user.recapHour) {
			console.log(
				`[cron] Skipping user ${user.email}: current hour ${currentHour} !== recap hour ${user.recapHour} (timezone: ${timezone})`,
			);
			continue;
		}

		// For weekly, check if it's Monday
		if (frequency === "weekly" && !isStartOfWeekInTimezone(timezone)) {
			continue;
		}

		console.log(`[cron] Processing ${frequency} recap for user ${user.userId} (${user.email})`);

		// Get all agents for this user
		const userAgents = await db
			.select({ id: agents.id, name: agents.name })
			.from(agents)
			.where(eq(agents.userId, user.userId));

		if (userAgents.length === 0) {
			console.log(`[cron] User ${user.userId} has no agents, skipping`);
			continue;
		}

		const { start, end, previousStart, previousEnd } = getDateRange(frequency, timezone);

		// Get stats for all agents
		const allStats: AgentStats[] = [];
		for (const agent of userAgents) {
			const stats = await getAgentStats(
				db,
				agent.id,
				agent.name,
				start,
				end,
				previousStart,
				previousEnd,
			);
			allStats.push(stats);
		}

		if (user.recapDigestMode) {
			// Batch mode disabled - always send separate emails per agent
			// Keeping this code path for future re-enablement
			// const sent = await sendRecapEmail(user.email, user.name, frequency, allStats);
			// if (sent) emailsSent++;
		}

		// Send separate email per agent (always use this path)
		for (const stats of allStats) {
			// Only send if there's activity, or at least once per recap period
			const sent = await sendRecapEmail(user.email, user.name, frequency, [stats]);
			if (sent) emailsSent++;
		}
	}

	console.log(`[cron] Finished recap email processing. Sent ${emailsSent} emails.`);
}

/**
 * Initialize the cron job
 * Runs every hour at minute 0 for recap emails
 * Runs every minute for form webhook retries
 */
export function initRecapCron(): void {
	// Dynamically import to avoid circular dependencies
	const loadFormSubmissions = async () => {
		const { processWebhookRetries } = await import("../routes/form-submissions");
		return processWebhookRetries;
	};

	// Run every hour at minute 0 for recap emails
	cron.schedule("0 * * * *", async () => {
		try {
			await processRecapEmails();
		} catch (err) {
			console.error("[cron] Recap email processing failed:", err);
		}
	});

	// Run every minute for webhook retries
	cron.schedule("* * * * *", async () => {
		try {
			const processWebhookRetries = await loadFormSubmissions();
			const processed = await processWebhookRetries();
			if (processed > 0) {
				console.log(`[cron] Processed ${processed} webhook retries`);
			}
		} catch (err) {
			console.error("[cron] Webhook retry processing failed:", err);
		}
	});

	// Run every 5 minutes for auto-closing inactive conversations
	cron.schedule("*/5 * * * *", async () => {
		try {
			const closed = await processAutoCloseConversations();
			if (closed > 0) {
				console.log(`[cron] Auto-closed ${closed} inactive conversations`);
			}
		} catch (err) {
			console.error("[cron] Auto-close processing failed:", err);
		}
	});

	// Run daily at 2 AM for question clustering
	cron.schedule("0 2 * * *", async () => {
		try {
			const { main: runClustering } = await import("../../scripts/cluster-questions");
			await runClustering();
		} catch (err) {
			console.error("[cron] Question clustering failed:", err);
		}
	});

	console.log(
		"[cron] Cron jobs initialized (recap: hourly, webhook retries: every minute, auto-close: every 5 min, clustering: daily at 2am)",
	);
}

/**
 * Auto-close inactive conversations based on channel-specific timeouts
 * Closes conversations that:
 * 1. Have status "resolved" or "open"
 * 2. Are not already closed
 * 3. Have been inactive for longer than the configured threshold
 */
async function processAutoCloseConversations(): Promise<number> {
	const db = getDb();
	const now = new Date();
	let closedCount = 0;

	// Default TTL values (in minutes)
	const DEFAULT_WIDGET_TTL = 3600; // 60 hours
	const DEFAULT_EMAIL_TTL = 2880; // 48 hours

	// Get all agents with their escalation settings (if they exist)
	const allAgents = await db
		.select({
			agentId: agents.id,
			widgetAutoCloseMinutes: agentEscalationSettings.widgetAutoCloseMinutes,
			emailAutoCloseMinutes: agentEscalationSettings.emailAutoCloseMinutes,
		})
		.from(agents)
		.leftJoin(agentEscalationSettings, eq(agents.id, agentEscalationSettings.agentId));

	for (const agent of allAgents) {
		const widgetThreshold = agent.widgetAutoCloseMinutes ?? DEFAULT_WIDGET_TTL;
		const emailThreshold = agent.emailAutoCloseMinutes ?? DEFAULT_EMAIL_TTL;

		// Calculate cutoff times
		const widgetCutoff = new Date(now.getTime() - widgetThreshold * 60 * 1000);
		const emailCutoff = new Date(now.getTime() - emailThreshold * 60 * 1000);

		// Close widget/iframe conversations (if status is "resolved" or "open")
		const widgetResult = await db
			.update(conversations)
			.set({
				status: "closed",
				resolvedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(conversations.agentId, agent.agentId),
					inArray(conversations.status, ["resolved", "open"]),
					inArray(conversations.channel, ["widget", "iframe"]),
					lt(conversations.lastActivityAt, widgetCutoff),
				),
			)
			.returning({ id: conversations.id });

		closedCount += widgetResult.length;

		// Close email conversations (if status is "resolved" or "open")
		const emailResult = await db
			.update(conversations)
			.set({
				status: "closed",
				resolvedAt: now,
				updatedAt: now,
			})
			.where(
				and(
					eq(conversations.agentId, agent.agentId),
					inArray(conversations.status, ["resolved", "open"]),
					eq(conversations.channel, "email"),
					lt(conversations.lastActivityAt, emailCutoff),
				),
			)
			.returning({ id: conversations.id });

		closedCount += emailResult.length;
	}

	return closedCount;
}

// Export for testing
export { processAutoCloseConversations };
