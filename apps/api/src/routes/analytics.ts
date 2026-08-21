import {
	agentEscalationSettings,
	agents,
	agentTools,
	analyticsCountryDaily,
	analyticsDaily,
	analyticsPageDaily,
	analyticsToolDaily,
	and,
	chatMessages,
	conversations,
	count,
	desc,
	eq,
	escalations,
	formSubmissions,
	getDb,
	gte,
	inArray,
	isNotNull,
	kbRetrievalSources,
	lt,
	lte,
	messageFeedback,
	ne,
	questionClusters,
	retrievalTraces,
	sql,
	sum,
	toolExecutions,
	triggerEvents,
	triggers,
	turnEvents,
	turns,
} from "@ansa/db";
import { CONFIDENCE_THRESHOLDS, getConfidenceLevel } from "@ansa/utils";
import { Hono } from "hono";
import type { AuthVariables } from "../middleware/auth";

const analytics = new Hono<{ Variables: AuthVariables }>();

// Helper to get start of day in UTC
function startOfDayUTC(date: Date): Date {
	const d = new Date(date);
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

// Helper to verify agent ownership
async function verifyAgentOwnership(
	db: ReturnType<typeof getDb>,
	agentId: string,
	userId: string | undefined,
): Promise<boolean> {
	if (!userId) return false;
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
		.limit(1);
	return !!agent;
}

// Compute daily stats from raw tables
async function computeDailyStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	date: Date,
): Promise<{
	conversationCount: number;
	messageCount: number;
	thumbsUpCount: number;
	thumbsDownCount: number;
}> {
	const dayStart = startOfDayUTC(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	// Count conversations created on this day for this agent
	const [convoResult] = await db
		.select({ count: count() })
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, dayStart),
				lte(conversations.createdAt, dayEnd),
			),
		);

	// Count messages for conversations belonging to this agent on this day
	const [msgResult] = await db
		.select({ count: count() })
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(chatMessages.createdAt, dayStart),
				lte(chatMessages.createdAt, dayEnd),
			),
		);

	// Count feedback for messages belonging to this agent on this day
	const feedbackResults = await db
		.select({
			feedback: messageFeedback.feedback,
			count: count(),
		})
		.from(messageFeedback)
		.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(messageFeedback.createdAt, dayStart),
				lte(messageFeedback.createdAt, dayEnd),
			),
		)
		.groupBy(messageFeedback.feedback);

	const thumbsUp = Number(feedbackResults.find((r) => r.feedback === "up")?.count) || 0;
	const thumbsDown = Number(feedbackResults.find((r) => r.feedback === "down")?.count) || 0;

	return {
		conversationCount: Number(convoResult?.count) || 0,
		messageCount: Number(msgResult?.count) || 0,
		thumbsUpCount: thumbsUp,
		thumbsDownCount: thumbsDown,
	};
}

// Compute country stats from raw tables
async function computeCountryStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	date: Date,
): Promise<Array<{ countryCode: string; conversationCount: number }>> {
	const dayStart = startOfDayUTC(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	const results = await db
		.select({
			countryCode: conversations.countryCode,
			count: count(),
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, dayStart),
				lte(conversations.createdAt, dayEnd),
				sql`${conversations.countryCode} IS NOT NULL`,
			),
		)
		.groupBy(conversations.countryCode);

	return results.map((r) => ({
		countryCode: r.countryCode as string,
		conversationCount: r.count,
	}));
}

// Compute page stats from raw tables
async function computePageStats(
	db: ReturnType<typeof getDb>,
	agentId: string,
	date: Date,
): Promise<Array<{ pageDomain: string; pagePath: string; conversationCount: number }>> {
	const dayStart = startOfDayUTC(date);
	const dayEnd = new Date(dayStart);
	dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

	const results = await db
		.select({
			pageDomain: conversations.pageDomain,
			pagePath: conversations.pagePath,
			count: count(),
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, dayStart),
				lte(conversations.createdAt, dayEnd),
				sql`${conversations.pageDomain} IS NOT NULL`,
			),
		)
		.groupBy(conversations.pageDomain, conversations.pagePath);

	return results.map((r) => ({
		pageDomain: r.pageDomain as string,
		pagePath: (r.pagePath as string) || "/",
		conversationCount: r.count,
	}));
}

// GET /analytics/summary - aggregated metrics for date range
analytics.get("/summary", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1); // Include end date

	// Get from rollup table
	const dailyStats = await db
		.select()
		.from(analyticsDaily)
		.where(
			and(
				eq(analyticsDaily.agentId, agentId),
				gte(analyticsDaily.date, start),
				lte(analyticsDaily.date, end),
			),
		);

	// If no rollup data, compute from raw tables for the entire date range
	if (dailyStats.length === 0) {
		// Count conversations in date range
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

		// Count messages in date range
		const [msgResult] = await db
			.select({ count: count() })
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(chatMessages.createdAt, start),
					lte(chatMessages.createdAt, end),
				),
			);

		// Count feedback in date range
		const feedbackResults = await db
			.select({
				feedback: messageFeedback.feedback,
				count: count(),
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
			)
			.groupBy(messageFeedback.feedback);

		const totalConversations = Number(convoResult?.count) || 0;
		const totalMessages = Number(msgResult?.count) || 0;
		const thumbsUp = Number(feedbackResults.find((r) => r.feedback === "up")?.count) || 0;
		const thumbsDown = Number(feedbackResults.find((r) => r.feedback === "down")?.count) || 0;

		return c.json({
			totalConversations,
			totalMessages,
			avgMessagesPerConversation:
				totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0,
			thumbsUp,
			thumbsDown,
			feedbackRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
		});
	}

	// Aggregate rollup data
	let totalConversations = dailyStats.reduce((sum, d) => sum + d.conversationCount, 0);
	let totalMessages = dailyStats.reduce((sum, d) => sum + d.messageCount, 0);
	let thumbsUp = dailyStats.reduce((sum, d) => sum + d.thumbsUpCount, 0);
	let thumbsDown = dailyStats.reduce((sum, d) => sum + d.thumbsDownCount, 0);

	// Also compute today's stats (not in rollup yet) and add them
	const today = new Date();
	const todayKey = today.toISOString().split("T")[0];
	const hasToday = dailyStats.some((d) => d.date.toISOString().split("T")[0] === todayKey);

	if (!hasToday && end >= today) {
		const todayStats = await computeDailyStats(db, agentId, today);
		totalConversations += todayStats.conversationCount;
		totalMessages += todayStats.messageCount;
		thumbsUp += todayStats.thumbsUpCount;
		thumbsDown += todayStats.thumbsDownCount;
	}

	return c.json({
		totalConversations,
		totalMessages,
		avgMessagesPerConversation:
			totalConversations > 0 ? Math.round((totalMessages / totalConversations) * 10) / 10 : 0,
		thumbsUp,
		thumbsDown,
		feedbackRatio: thumbsUp + thumbsDown > 0 ? thumbsUp / (thumbsUp + thumbsDown) : 0,
	});
});

// GET /analytics/daily - time series data for charts
analytics.get("/daily", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();

	// Generate list of days in range
	const days: Date[] = [];
	const current = new Date(start);
	while (current <= end) {
		days.push(new Date(current));
		current.setUTCDate(current.getUTCDate() + 1);
	}

	// Get existing rollup data
	const existingStats = await db
		.select()
		.from(analyticsDaily)
		.where(
			and(
				eq(analyticsDaily.agentId, agentId),
				gte(analyticsDaily.date, start),
				lte(analyticsDaily.date, end),
			),
		);

	const existingByDate = new Map(existingStats.map((s) => [s.date.toISOString().split("T")[0], s]));

	// For each day, use rollup or compute
	const result = await Promise.all(
		days.map(async (day) => {
			const dateKey = day.toISOString().split("T")[0];
			const existing = existingByDate.get(dateKey);

			if (existing) {
				return {
					date: dateKey,
					conversations: existing.conversationCount,
					messages: existing.messageCount,
					thumbsUp: existing.thumbsUpCount,
					thumbsDown: existing.thumbsDownCount,
				};
			}

			// Compute and cache for past days (not today)
			const isToday = dateKey === new Date().toISOString().split("T")[0];
			const stats = await computeDailyStats(db, agentId, day);

			if (!isToday && (stats.conversationCount > 0 || stats.messageCount > 0)) {
				// Cache the result
				await db
					.insert(analyticsDaily)
					.values({
						agentId,
						date: startOfDayUTC(day),
						...stats,
					})
					.onConflictDoNothing();
			}

			return {
				date: dateKey,
				conversations: stats.conversationCount,
				messages: stats.messageCount,
				thumbsUp: stats.thumbsUpCount,
				thumbsDown: stats.thumbsDownCount,
			};
		}),
	);

	return c.json(result);
});

// GET /analytics/countries - country breakdown
analytics.get("/countries", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Get from rollup table
	const countryStats = await db
		.select({
			countryCode: analyticsCountryDaily.countryCode,
			total: sql<number>`SUM(${analyticsCountryDaily.conversationCount})`,
		})
		.from(analyticsCountryDaily)
		.where(
			and(
				eq(analyticsCountryDaily.agentId, agentId),
				gte(analyticsCountryDaily.date, start),
				lte(analyticsCountryDaily.date, end),
			),
		)
		.groupBy(analyticsCountryDaily.countryCode)
		.orderBy(sql`SUM(${analyticsCountryDaily.conversationCount}) DESC`);

	// If no rollup data, compute from raw
	if (countryStats.length === 0) {
		const rawStats = await db
			.select({
				countryCode: conversations.countryCode,
				count: count(),
			})
			.from(conversations)
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, endPlusOne),
					sql`${conversations.countryCode} IS NOT NULL`,
				),
			)
			.groupBy(conversations.countryCode)
			.orderBy(sql`COUNT(*) DESC`);

		return c.json(
			rawStats.map((r) => ({
				countryCode: r.countryCode,
				conversationCount: r.count,
			})),
		);
	}

	return c.json(
		countryStats.map((r) => ({
			countryCode: r.countryCode,
			conversationCount: Number(r.total),
		})),
	);
});

// GET /analytics/channels - conversations by channel (widget, email, sms, etc.)
analytics.get("/channels", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Query channel stats from raw conversations table
	const channelStats = await db
		.select({
			channel: conversations.channel,
			count: count(),
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, endPlusOne),
			),
		)
		.groupBy(conversations.channel)
		.orderBy(sql`COUNT(*) DESC`);

	return c.json(
		channelStats.map((r) => ({
			channel: r.channel,
			conversationCount: r.count,
		})),
	);
});

// GET /analytics/pages - page breakdown (conversations by page URL)
analytics.get("/pages", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Get from rollup table
	const pageStats = await db
		.select({
			pageDomain: analyticsPageDaily.pageDomain,
			pagePath: analyticsPageDaily.pagePath,
			total: sql<number>`SUM(${analyticsPageDaily.conversationCount})`,
		})
		.from(analyticsPageDaily)
		.where(
			and(
				eq(analyticsPageDaily.agentId, agentId),
				gte(analyticsPageDaily.date, start),
				lte(analyticsPageDaily.date, end),
			),
		)
		.groupBy(analyticsPageDaily.pageDomain, analyticsPageDaily.pagePath)
		.orderBy(sql`SUM(${analyticsPageDaily.conversationCount}) DESC`);

	// If no rollup data, compute from raw
	if (pageStats.length === 0) {
		const rawStats = await db
			.select({
				pageDomain: conversations.pageDomain,
				pagePath: conversations.pagePath,
				count: count(),
			})
			.from(conversations)
			.where(
				and(
					eq(conversations.agentId, agentId),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, endPlusOne),
					sql`${conversations.pageDomain} IS NOT NULL`,
				),
			)
			.groupBy(conversations.pageDomain, conversations.pagePath)
			.orderBy(sql`COUNT(*) DESC`);

		return c.json(
			rawStats.map((r) => ({
				pageDomain: r.pageDomain,
				pagePath: r.pagePath || "/",
				pageUrl: r.pageDomain && r.pagePath ? `${r.pageDomain}${r.pagePath}` : r.pageDomain,
				conversationCount: r.count,
			})),
		);
	}

	return c.json(
		pageStats.map((r) => ({
			pageDomain: r.pageDomain,
			pagePath: r.pagePath,
			pageUrl: `${r.pageDomain}${r.pagePath}`,
			conversationCount: Number(r.total),
		})),
	);
});

// GET /analytics/tools - tool usage analytics
analytics.get("/tools", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	const endPlusOne = new Date(end);
	endPlusOne.setUTCDate(endPlusOne.getUTCDate() + 1);

	// Try rollup table first
	const rollupStats = await db
		.select({
			toolName: analyticsToolDaily.toolName,
			executionCount: sql<number>`SUM(${analyticsToolDaily.executionCount})`,
			successCount: sql<number>`SUM(${analyticsToolDaily.successCount})`,
			failureCount: sql<number>`SUM(${analyticsToolDaily.failureCount})`,
			totalExecutionTimeMs: sql<number>`SUM(${analyticsToolDaily.totalExecutionTimeMs})`,
		})
		.from(analyticsToolDaily)
		.where(
			and(
				eq(analyticsToolDaily.agentId, agentId),
				gte(analyticsToolDaily.date, start),
				lte(analyticsToolDaily.date, end),
			),
		)
		.groupBy(analyticsToolDaily.toolName);

	// Compute from raw events if no rollup data
	if (rollupStats.length === 0) {
		const rawStats = await db
			.select({
				toolName: toolExecutions.toolName,
				executionCount: count(),
				successCount: sql<number>`SUM(CASE WHEN ${toolExecutions.success} THEN 1 ELSE 0 END)`,
				failureCount: sql<number>`SUM(CASE WHEN NOT ${toolExecutions.success} THEN 1 ELSE 0 END)`,
				totalExecutionTimeMs: sum(toolExecutions.executionTimeMs),
			})
			.from(toolExecutions)
			.where(
				and(
					eq(toolExecutions.agentId, agentId),
					gte(toolExecutions.createdAt, start),
					lte(toolExecutions.createdAt, endPlusOne),
				),
			)
			.groupBy(toolExecutions.toolName);

		return c.json(
			rawStats.map((r) => ({
				toolName: r.toolName,
				executionCount: Number(r.executionCount),
				successCount: Number(r.successCount),
				failureCount: Number(r.failureCount),
				successRate: r.executionCount > 0 ? Number(r.successCount) / Number(r.executionCount) : 0,
				avgExecutionTimeMs:
					r.executionCount > 0
						? Math.round(Number(r.totalExecutionTimeMs) / Number(r.executionCount))
						: 0,
			})),
		);
	}

	return c.json(
		rollupStats.map((r) => ({
			toolName: r.toolName,
			executionCount: Number(r.executionCount),
			successCount: Number(r.successCount),
			failureCount: Number(r.failureCount),
			successRate: r.executionCount > 0 ? Number(r.successCount) / Number(r.executionCount) : 0,
			avgExecutionTimeMs:
				r.executionCount > 0
					? Math.round(Number(r.totalExecutionTimeMs) / Number(r.executionCount))
					: 0,
		})),
	);
});

// GET /analytics/confidence - confidence score summary
analytics.get("/confidence", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get confidence stats for assistant messages in date range (excluding tool responses)
	const [stats] = await db
		.select({
			avgConfidence: sql<number>`AVG(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
			minConfidence: sql<number>`MIN(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
			maxConfidence: sql<number>`MAX(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
			totalWithConfidence: sql<number>`COUNT(CASE WHEN ${chatMessages.toolBlocks} IS NULL THEN ${chatMessages.confidenceScore} END)`,
			totalWithoutConfidence: sql<number>`SUM(CASE WHEN ${chatMessages.confidenceScore} IS NULL AND ${chatMessages.toolBlocks} IS NULL THEN 1 ELSE 0 END)`,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		);

	return c.json({
		avgConfidence: stats?.avgConfidence ? Math.round(stats.avgConfidence) : null,
		minConfidence: stats?.minConfidence ?? null,
		maxConfidence: stats?.maxConfidence ?? null,
		totalWithConfidence: Number(stats?.totalWithConfidence) || 0,
		totalWithoutConfidence: Number(stats?.totalWithoutConfidence) || 0,
	});
});

// GET /analytics/confidence-distribution - confidence score distribution for histogram
analytics.get("/confidence-distribution", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get distribution in buckets of 10 (0-9, 10-19, ..., 90-100)
	const bucketExpression = sql<number>`FLOOR(${chatMessages.confidenceScore} / 10) * 10`;
	const distribution = await db
		.select({
			bucket: bucketExpression,
			count: count(),
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		)
		.groupBy(bucketExpression)
		.orderBy(bucketExpression);

	// Fill in missing buckets with 0
	const buckets = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];
	const result = buckets.map((bucket) => ({
		range: `${bucket}-${bucket + 9}`,
		bucket,
		count: distribution.find((d) => d.bucket === bucket)?.count || 0,
	}));

	return c.json(result);
});

// GET /analytics/confidence-over-time - confidence scores over time for line chart
analytics.get("/confidence-over-time", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get daily average confidence
	const dailyConfidence = await db
		.select({
			date: sql<string>`DATE(${chatMessages.createdAt})`,
			avgConfidence: sql<number>`AVG(${chatMessages.confidenceScore})`,
			messageCount: count(),
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		)
		.groupBy(sql`DATE(${chatMessages.createdAt})`)
		.orderBy(sql`DATE(${chatMessages.createdAt})`);

	return c.json(
		dailyConfidence.map((d) => ({
			date: d.date,
			avgConfidence: Math.round(d.avgConfidence),
			messageCount: d.messageCount,
		})),
	);
});

// GET /analytics/triggers - trigger analytics with date filtering
analytics.get("/triggers", async (c) => {
	const user = c.get("user" as never) as { id: string } | undefined;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get trigger stats with trigger details
	const stats = await db
		.select({
			triggerId: triggerEvents.triggerId,
			triggerName: triggerEvents.triggerName,
			triggerType: triggerEvents.triggerType,
			firedCount: sql<number>`SUM(CASE WHEN ${triggerEvents.eventType} = 'fired' THEN 1 ELSE 0 END)::int`,
			convertedCount: sql<number>`SUM(CASE WHEN ${triggerEvents.eventType} = 'converted' THEN 1 ELSE 0 END)::int`,
		})
		.from(triggerEvents)
		.where(
			and(
				eq(triggerEvents.agentId, agentId),
				gte(triggerEvents.createdAt, start),
				lte(triggerEvents.createdAt, end),
			),
		)
		.groupBy(triggerEvents.triggerId, triggerEvents.triggerName, triggerEvents.triggerType);

	// Get trigger names from triggers table for active triggers
	const triggerDetails = await db
		.select({
			id: triggers.id,
			name: triggers.name,
			isEnabled: triggers.isEnabled,
		})
		.from(triggers)
		.where(eq(triggers.agentId, agentId));

	const triggerMap = new Map(triggerDetails.map((t) => [t.id, t]));

	return c.json(
		stats.map((s) => {
			const trigger = s.triggerId ? triggerMap.get(s.triggerId) : null;
			const conversionRate = s.firedCount > 0 ? s.convertedCount / s.firedCount : 0;
			return {
				triggerId: s.triggerId,
				triggerName: trigger?.name || s.triggerName,
				triggerType: s.triggerType,
				isEnabled: trigger?.isEnabled ?? false,
				firedCount: s.firedCount || 0,
				convertedCount: s.convertedCount || 0,
				conversionRate: Math.round(conversionRate * 100),
			};
		}),
	);
});

// Response time analytics - calculate avg time between user message and AI response
analytics.get("/response-time", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const isOwner = await verifyAgentOwnership(db, agentId, user.id);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Convert to ISO strings for the query
	const startIso = start.toISOString();
	const endIso = end.toISOString();

	// Calculate response times by finding pairs of user->assistant messages
	// Using a window function to get the next message after each user message
	const responseTimeQuery = await db.execute(sql`
		WITH message_pairs AS (
			SELECT
				m1.id as user_msg_id,
				m1.created_at as user_msg_time,
				m1.conversation_id,
				(
					SELECT MIN(m2.created_at)
					FROM chat_messages m2
					WHERE m2.conversation_id = m1.conversation_id
					AND m2.role = 'assistant'
					AND m2.created_at > m1.created_at
				) as assistant_msg_time
			FROM chat_messages m1
			INNER JOIN conversations c ON m1.conversation_id = c.id
			WHERE m1.role = 'user'
			AND c.agent_id = ${agentId}
			AND m1.created_at >= ${startIso}
			AND m1.created_at <= ${endIso}
		)
		SELECT
			COUNT(*) as total_pairs,
			AVG(EXTRACT(EPOCH FROM (assistant_msg_time - user_msg_time)) * 1000)::int as avg_response_time_ms,
			MIN(EXTRACT(EPOCH FROM (assistant_msg_time - user_msg_time)) * 1000)::int as min_response_time_ms,
			MAX(EXTRACT(EPOCH FROM (assistant_msg_time - user_msg_time)) * 1000)::int as max_response_time_ms,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (assistant_msg_time - user_msg_time)) * 1000)::int as median_response_time_ms
		FROM message_pairs
		WHERE assistant_msg_time IS NOT NULL
	`);

	// Handle case where query returns no rows or rows is undefined
	if (!responseTimeQuery || responseTimeQuery.length === 0) {
		return c.json({
			totalPairs: 0,
			avgResponseTimeMs: 0,
			minResponseTimeMs: 0,
			maxResponseTimeMs: 0,
			medianResponseTimeMs: 0,
		});
	}

	const result = responseTimeQuery[0] as {
		total_pairs: string;
		avg_response_time_ms: number | null;
		min_response_time_ms: number | null;
		max_response_time_ms: number | null;
		median_response_time_ms: number | null;
	};

	return c.json({
		totalPairs: Number.parseInt(result.total_pairs, 10) || 0,
		avgResponseTimeMs: result.avg_response_time_ms || 0,
		minResponseTimeMs: result.min_response_time_ms || 0,
		maxResponseTimeMs: result.max_response_time_ms || 0,
		medianResponseTimeMs: result.median_response_time_ms || 0,
	});
});

// Get human response time analytics
// This tracks time from conversation start to first human response
// Includes SLA compliance for escalations
analytics.get("/human-response-time", async (c) => {
	const user = c.get("user");
	if (!user?.id) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!agentId || !startDate || !endDate) {
		return c.json({ error: "agentId, startDate, and endDate are required" }, 400);
	}

	const db = getDb();

	// Verify agent ownership
	const isOwner = await verifyAgentOwnership(db, agentId, user.id);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = new Date(startDate);
	const end = new Date(endDate);
	end.setUTCHours(23, 59, 59, 999);
	const startIso = start.toISOString();
	const endIso = end.toISOString();

	// Query for all conversations with human responses in the date range
	const responseTimeQuery = await db.execute(sql`
		SELECT
			COUNT(*) as total_conversations,
			AVG(EXTRACT(EPOCH FROM (first_human_response_at - created_at)) * 1000)::int as avg_response_time_ms,
			MIN(EXTRACT(EPOCH FROM (first_human_response_at - created_at)) * 1000)::int as min_response_time_ms,
			MAX(EXTRACT(EPOCH FROM (first_human_response_at - created_at)) * 1000)::int as max_response_time_ms,
			PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_human_response_at - created_at)) * 1000)::int as median_response_time_ms
		FROM conversations
		WHERE agent_id = ${agentId}
		AND first_human_response_at IS NOT NULL
		AND created_at >= ${startIso}
		AND created_at <= ${endIso}
	`);

	// Query for SLA compliance (escalations only)
	const slaComplianceQuery = await db.execute(sql`
		SELECT
			COUNT(*) as total_escalations,
			COUNT(CASE WHEN first_response_at IS NOT NULL THEN 1 END) as responded_count,
			COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at <= sla_deadline THEN 1 END) as within_sla_count,
			COUNT(CASE WHEN first_response_at IS NOT NULL AND first_response_at > sla_deadline THEN 1 END) as breached_count,
			COUNT(CASE WHEN first_response_at IS NULL AND sla_broken_at IS NOT NULL THEN 1 END) as unresponded_breached_count
		FROM escalations e
		INNER JOIN conversations c ON e.conversation_id = c.id
		WHERE c.agent_id = ${agentId}
		AND e.sla_deadline IS NOT NULL
		AND e.escalated_at >= ${startIso}
		AND e.escalated_at <= ${endIso}
	`);

	// Query for SLA compliance over time (for chart)
	const slaTimeSeriesQuery = await db.execute(sql`
		SELECT
			DATE(e.escalated_at) as date,
			COUNT(CASE WHEN e.first_response_at IS NOT NULL AND e.first_response_at <= e.sla_deadline THEN 1 END) as within_sla,
			COUNT(CASE WHEN e.first_response_at IS NOT NULL THEN 1 END) as responded
		FROM escalations e
		INNER JOIN conversations c ON e.conversation_id = c.id
		WHERE c.agent_id = ${agentId}
		AND e.sla_deadline IS NOT NULL
		AND e.escalated_at >= ${startIso}
		AND e.escalated_at <= ${endIso}
		GROUP BY DATE(e.escalated_at)
		ORDER BY DATE(e.escalated_at)
	`);

	// Query for response time distribution (buckets)
	const distributionQuery = await db.execute(sql`
		WITH bucketed_data AS (
			SELECT
				CASE
					WHEN EXTRACT(EPOCH FROM (first_human_response_at - created_at)) / 60 < 5 THEN '< 5 min'
					WHEN EXTRACT(EPOCH FROM (first_human_response_at - created_at)) / 60 < 15 THEN '5-15 min'
					WHEN EXTRACT(EPOCH FROM (first_human_response_at - created_at)) / 60 < 30 THEN '15-30 min'
					WHEN EXTRACT(EPOCH FROM (first_human_response_at - created_at)) / 60 < 60 THEN '30-60 min'
					WHEN EXTRACT(EPOCH FROM (first_human_response_at - created_at)) / 60 < 240 THEN '1-4 hours'
					ELSE '> 4 hours'
				END as bucket
			FROM conversations
			WHERE agent_id = ${agentId}
			AND first_human_response_at IS NOT NULL
			AND created_at >= ${startIso}
			AND created_at <= ${endIso}
		)
		SELECT
			bucket,
			COUNT(*) as count
		FROM bucketed_data
		GROUP BY bucket
		ORDER BY
			CASE bucket
				WHEN '< 5 min' THEN 1
				WHEN '5-15 min' THEN 2
				WHEN '15-30 min' THEN 3
				WHEN '30-60 min' THEN 4
				WHEN '1-4 hours' THEN 5
				ELSE 6
			END
	`);

	// Parse results
	const responseTimeResult = ((responseTimeQuery as unknown as { rows?: unknown[] }).rows?.[0] ||
		{}) as {
		total_conversations?: string;
		avg_response_time_ms?: number | null;
		min_response_time_ms?: number | null;
		max_response_time_ms?: number | null;
		median_response_time_ms?: number | null;
	};

	const slaResult = ((slaComplianceQuery as unknown as { rows?: unknown[] }).rows?.[0] || {}) as {
		total_escalations?: string;
		responded_count?: string;
		within_sla_count?: string;
		breached_count?: string;
		unresponded_breached_count?: string;
	};

	const totalEscalations = Number.parseInt(slaResult.total_escalations || "0", 10);
	const respondedCount = Number.parseInt(slaResult.responded_count || "0", 10);
	const withinSlaCount = Number.parseInt(slaResult.within_sla_count || "0", 10);
	const slaComplianceRate = respondedCount > 0 ? (withinSlaCount / respondedCount) * 100 : 0;

	const slaTimeSeriesRows = (slaTimeSeriesQuery as unknown as { rows?: unknown[] }).rows || [];
	const timeSeries = slaTimeSeriesRows.map((row: unknown) => {
		const r = row as { date: string; within_sla: string; responded: string };
		const responded = Number.parseInt(r.responded || "0", 10);
		const withinSla = Number.parseInt(r.within_sla || "0", 10);
		return {
			date: r.date,
			complianceRate: responded > 0 ? Math.round((withinSla / responded) * 100) : 0,
			responded,
			withinSla,
		};
	});

	const distributionRows = (distributionQuery as unknown as { rows?: unknown[] }).rows || [];
	const distribution = distributionRows.map((row: unknown) => {
		const r = row as { bucket: string; count: string };
		return {
			bucket: r.bucket,
			count: Number.parseInt(r.count || "0", 10),
		};
	});

	return c.json({
		// Overall human response time stats (all conversations)
		responseTime: {
			totalConversations: Number.parseInt(responseTimeResult.total_conversations || "0", 10),
			avgResponseTimeMs: responseTimeResult.avg_response_time_ms || 0,
			minResponseTimeMs: responseTimeResult.min_response_time_ms || 0,
			maxResponseTimeMs: responseTimeResult.max_response_time_ms || 0,
			medianResponseTimeMs: responseTimeResult.median_response_time_ms || 0,
		},
		// SLA compliance (escalations only)
		slaCompliance: {
			totalEscalations,
			respondedCount,
			withinSlaCount,
			breachedCount: Number.parseInt(slaResult.breached_count || "0", 10),
			unrespondedBreachedCount: Number.parseInt(slaResult.unresponded_breached_count || "0", 10),
			complianceRate: Math.round(slaComplianceRate * 10) / 10, // Round to 1 decimal
		},
		// Time series for compliance chart
		complianceTimeSeries: timeSeries,
		// Distribution buckets for bar chart
		responseTimeDistribution: distribution,
	});
});

// GET /analytics/outcomes - Calculate outcomes (resolution + actions + feedback)
analytics.get("/outcomes", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get agent confidence threshold from escalation settings
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold || 70;

	// Count conversations with outcomes
	// Outcome = resolution OR action OR positive feedback

	// Get all conversations in the time range
	const allConversations = await db
		.select({ id: conversations.id })
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, end),
			),
		);

	// Filter for outcomes
	let outcomeCount = 0;
	const conversationIds = new Set<string>();

	for (const conv of allConversations) {
		// Check if this conversation has an outcome
		// 1. Resolution: no follow-up + confidence >= threshold
		// 2. Feedback: has positive feedback
		// Note: toolExecutions table doesn't have conversationId, so we can't check for actions

		// Get conversation messages to check confidence and follow-up
		const messages = await db
			.select()
			.from(chatMessages)
			.where(eq(chatMessages.conversationId, conv.id))
			.orderBy(chatMessages.createdAt);

		const hasPositiveFeedback = await db
			.select({ count: count() })
			.from(messageFeedback)
			.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
			.where(and(eq(chatMessages.conversationId, conv.id), eq(messageFeedback.feedback, "up")));

		// Check for resolution (last assistant message has high confidence, no user follow-up)
		const lastAssistantMessage = messages.filter((m) => m.role === "assistant").pop();
		const lastUserMessage = messages.filter((m) => m.role === "user").pop();

		let hasResolution = false;
		if (lastAssistantMessage && lastUserMessage) {
			const assistantAfterUser = lastAssistantMessage.createdAt > lastUserMessage.createdAt;
			const highConfidence =
				!!lastAssistantMessage.confidenceScore &&
				lastAssistantMessage.confidenceScore >= confidenceThreshold;
			hasResolution = assistantAfterUser && highConfidence;
		}

		const hasFeedback = Number(hasPositiveFeedback[0]?.count || 0) > 0;

		if (hasResolution || hasFeedback) {
			conversationIds.add(conv.id);
			outcomeCount++;
		}
	}

	return c.json({
		outcomeCount,
		conversationIds: Array.from(conversationIds),
	});
});

// GET /analytics/resolved-questions - Questions resolved after knowledge updates
analytics.get("/resolved-questions", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get agent confidence threshold from escalation settings
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold || 60;

	// This is a simplified implementation
	// A full implementation would track:
	// 1. Questions that were escalated (unanswered)
	// 2. Knowledge updates (new/edited sources)
	// 3. Same/similar questions answered with high confidence after update

	// For now, return a count of escalated conversations that later had high-confidence answers
	const resolvedCount = await db
		.select({ count: count() })
		.from(escalations)
		.innerJoin(conversations, eq(escalations.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				gte(escalations.createdAt, start),
				lte(escalations.createdAt, end),
			),
		);

	return c.json({
		resolvedCount: Number(resolvedCount[0]?.count || 0),
	});
});

// GET /analytics/top-questions - Most frequently asked questions
analytics.get("/top-questions", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate, limit = "5", clusterId } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

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
				questions: [],
			});
		}
	}

	// Get user messages (questions) grouped by content similarity
	// For simplicity, we'll just get the most common user messages
	let topQuestions;
	if (clusterId && clusterMemberMessageIds.length > 0) {
		// Filter by cluster - only include messages in the cluster
		topQuestions = await db
			.select({
				content: chatMessages.content,
				count: count(),
			})
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					eq(chatMessages.role, "user"),
					ne(conversations.channel, "playground"),
					inArray(chatMessages.id, clusterMemberMessageIds),
					gte(chatMessages.createdAt, start),
					lte(chatMessages.createdAt, end),
				),
			)
			.groupBy(chatMessages.content)
			.orderBy(sql`count(*) DESC`)
			.limit(Number.parseInt(limit, 10));
	} else {
		topQuestions = await db
			.select({
				content: chatMessages.content,
				count: count(),
			})
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					eq(chatMessages.role, "user"),
					ne(conversations.channel, "playground"),
					gte(chatMessages.createdAt, start),
					lte(chatMessages.createdAt, end),
				),
			)
			.groupBy(chatMessages.content)
			.orderBy(sql`count(*) DESC`)
			.limit(Number.parseInt(limit, 10));
	}

	return c.json({
		questions: topQuestions.map((q) => ({
			content: q.content,
			count: Number(q.count),
		})),
	});
});

// GET /analytics/low-confidence - Count of low confidence conversations
analytics.get("/low-confidence", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate, clusterId } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get agent confidence threshold from escalation settings
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold || 70;

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
				lowConfidenceCount: 0,
				conversationIds: [],
			});
		}
	}

	// Count distinct conversations with at least one low-confidence message
	let lowConfidenceConvos;
	if (clusterId && clusterMemberMessageIds.length > 0) {
		// Filter by cluster - only include conversations with user messages in the cluster
		lowConfidenceConvos = await db
			.selectDistinct({ conversationId: conversations.id })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					eq(chatMessages.role, "assistant"),
					lt(chatMessages.confidenceScore, confidenceThreshold),
					isNotNull(chatMessages.confidenceScore),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, end),
				),
			)
			.then(async (convos) => {
				// Further filter to only include conversations with user messages in the cluster
				const filteredConvos = [];
				for (const convo of convos) {
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

					if (hasClusterMessage) {
						filteredConvos.push(convo);
					}
				}
				return filteredConvos;
			});
	} else {
		lowConfidenceConvos = await db
			.selectDistinct({ conversationId: conversations.id })
			.from(conversations)
			.innerJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					eq(conversations.agentId, agentId),
					eq(chatMessages.role, "assistant"),
					lt(chatMessages.confidenceScore, confidenceThreshold),
					isNotNull(chatMessages.confidenceScore),
					gte(conversations.createdAt, start),
					lte(conversations.createdAt, end),
				),
			);
	}

	return c.json({
		lowConfidenceCount: lowConfidenceConvos.length,
		conversationIds: lowConfidenceConvos.map((row) => row.conversationId),
	});
});

// ============ CONVERSIONS ANALYTICS ============

// GET /analytics/conversions/summary - Aggregate conversion metrics
analytics.get("/conversions/summary", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Count completed turns (total conversations with meaningful questions)
	const [totalTurnsResult] = await db
		.select({ count: count() })
		.from(turns)
		.where(
			and(
				eq(turns.agentId, agentId),
				eq(turns.status, "completed"),
				eq(turns.hasKbContext, true),
				gte(turns.startedAt, start),
				lte(turns.startedAt, end),
			),
		);

	const totalConversations = totalTurnsResult?.count || 0;

	// Count turns with conversions (any turn that has associated turn_events)
	const turnsWithConversions = await db
		.selectDistinct({ turnId: turnEvents.turnId })
		.from(turnEvents)
		.innerJoin(turns, eq(turnEvents.turnId, turns.id))
		.where(
			and(
				eq(turns.agentId, agentId),
				eq(turns.status, "completed"),
				gte(turns.startedAt, start),
				lte(turns.startedAt, end),
			),
		);

	const conversationsWithOutcome = turnsWithConversions.length;

	// Count by type
	const [formSubmissionsResult] = await db
		.select({ count: count() })
		.from(formSubmissions)
		.where(
			and(
				eq(formSubmissions.agentId, agentId),
				gte(formSubmissions.createdAt, start),
				lte(formSubmissions.createdAt, end),
			),
		);

	const [triggerConversionsResult] = await db
		.select({ count: count() })
		.from(triggerEvents)
		.where(
			and(
				eq(triggerEvents.agentId, agentId),
				eq(triggerEvents.eventType, "converted"),
				gte(triggerEvents.createdAt, start),
				lte(triggerEvents.createdAt, end),
			),
		);

	const [toolExecutionsResult] = await db
		.select({ count: count() })
		.from(toolExecutions)
		.where(
			and(
				eq(toolExecutions.agentId, agentId),
				eq(toolExecutions.success, true),
				gte(toolExecutions.createdAt, start),
				lte(toolExecutions.createdAt, end),
			),
		);

	// Calculate average time to outcome
	const turnsWithTimes = await db
		.select({
			turnId: turns.id,
			startedAt: turns.startedAt,
			eventCreatedAt: turnEvents.createdAt,
		})
		.from(turns)
		.innerJoin(turnEvents, eq(turnEvents.turnId, turns.id))
		.where(
			and(
				eq(turns.agentId, agentId),
				eq(turns.status, "completed"),
				gte(turns.startedAt, start),
				lte(turns.startedAt, end),
			),
		);

	let avgTimeToOutcomeSeconds: number | null = null;
	if (turnsWithTimes.length > 0) {
		const totalSeconds = turnsWithTimes.reduce((sum, t) => {
			const diff = new Date(t.eventCreatedAt).getTime() - new Date(t.startedAt).getTime();
			return sum + diff / 1000;
		}, 0);
		avgTimeToOutcomeSeconds = totalSeconds / turnsWithTimes.length;
	}

	const conversionRate =
		totalConversations > 0 ? (conversationsWithOutcome / totalConversations) * 100 : 0;

	return c.json({
		conversationsWithOutcome,
		totalConversations,
		conversionRate,
		avgTimeToOutcomeSeconds,
		formSubmissions: formSubmissionsResult?.count || 0,
		triggerConversions: triggerConversionsResult?.count || 0,
		toolExecutions: toolExecutionsResult?.count || 0,
	});
});

// GET /analytics/conversions/daily - Daily conversion time series
analytics.get("/conversions/daily", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();

	const dailyData: Array<{
		date: string;
		conversions: number;
		forms: number;
		triggers: number;
		tools: number;
		conversations: number;
		conversionRate: number;
	}> = [];

	const currentDate = new Date(start);
	while (currentDate <= end) {
		const dayStart = new Date(currentDate);
		const dayEnd = new Date(currentDate);
		dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

		// Count conversions (turns with events)
		const turnsWithConversions = await db
			.selectDistinct({ turnId: turnEvents.turnId })
			.from(turnEvents)
			.innerJoin(turns, eq(turnEvents.turnId, turns.id))
			.where(
				and(
					eq(turns.agentId, agentId),
					gte(turnEvents.createdAt, dayStart),
					lte(turnEvents.createdAt, dayEnd),
				),
			);

		const [totalTurnsResult] = await db
			.select({ count: count() })
			.from(turns)
			.where(
				and(
					eq(turns.agentId, agentId),
					eq(turns.status, "completed"),
					gte(turns.startedAt, dayStart),
					lte(turns.startedAt, dayEnd),
				),
			);

		const [formsResult] = await db
			.select({ count: count() })
			.from(formSubmissions)
			.where(
				and(
					eq(formSubmissions.agentId, agentId),
					gte(formSubmissions.createdAt, dayStart),
					lte(formSubmissions.createdAt, dayEnd),
				),
			);

		const [triggersResult] = await db
			.select({ count: count() })
			.from(triggerEvents)
			.where(
				and(
					eq(triggerEvents.agentId, agentId),
					eq(triggerEvents.eventType, "converted"),
					gte(triggerEvents.createdAt, dayStart),
					lte(triggerEvents.createdAt, dayEnd),
				),
			);

		const [toolsResult] = await db
			.select({ count: count() })
			.from(toolExecutions)
			.where(
				and(
					eq(toolExecutions.agentId, agentId),
					eq(toolExecutions.success, true),
					gte(toolExecutions.createdAt, dayStart),
					lte(toolExecutions.createdAt, dayEnd),
				),
			);

		const totalConversations = totalTurnsResult?.count || 0;
		const conversions = turnsWithConversions.length;
		const conversionRate = totalConversations > 0 ? (conversions / totalConversations) * 100 : 0;

		dailyData.push({
			date: currentDate.toISOString().split("T")[0],
			conversions,
			forms: formsResult?.count || 0,
			triggers: triggersResult?.count || 0,
			tools: toolsResult?.count || 0,
			conversations: totalConversations,
			conversionRate,
		});

		currentDate.setUTCDate(currentDate.getUTCDate() + 1);
	}

	return c.json(dailyData);
});

// GET /analytics/conversions/questions - Clustered questions with conversion rates
analytics.get("/conversions/questions", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get most recent cached clusters for this agent
	const clusters = await db
		.select()
		.from(questionClusters)
		.where(
			and(
				eq(questionClusters.agentId, agentId),
				gte(questionClusters.clusterDate, start),
				lte(questionClusters.clusterDate, end),
			),
		)
		.orderBy(sql`${questionClusters.clusterDate} DESC`)
		.limit(20);

	const results = await Promise.all(
		clusters.map(async (cluster) => {
			// Get representative question text
			const [repQuestion] = await db
				.select({ content: chatMessages.content })
				.from(chatMessages)
				.where(eq(chatMessages.id, cluster.representativeQuestionId))
				.limit(1);

			// Get most recent question text
			let mostRecentQuestion: string | undefined;
			if (cluster.mostRecentQuestionId) {
				const [recent] = await db
					.select({ content: chatMessages.content })
					.from(chatMessages)
					.where(eq(chatMessages.id, cluster.mostRecentQuestionId))
					.limit(1);
				mostRecentQuestion = recent?.content;
			}

			// Get highest converting question text
			let highestConvertingQuestion: string | undefined;
			if (cluster.highestConvertingQuestionId) {
				const [highest] = await db
					.select({ content: chatMessages.content })
					.from(chatMessages)
					.where(eq(chatMessages.id, cluster.highestConvertingQuestionId))
					.limit(1);
				highestConvertingQuestion = highest?.content;
			}

			return {
				clusterId: cluster.id,
				representativeQuestion: repQuestion?.content || "Unknown question",
				conversationCount: cluster.conversationCount,
				conversionCount: cluster.conversionCount,
				conversionRate: cluster.conversionRate / 100, // Convert back from stored * 100
				avgConfidenceScore: cluster.avgConfidenceScore,
				mostRecentQuestion,
				highestConvertingQuestion,
			};
		}),
	);

	return c.json(results);
});

// GET /analytics/conversions/recommendations - Smart recommendations for improvement
analytics.get("/conversions/recommendations", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get recent clusters
	const clusters = await db
		.select()
		.from(questionClusters)
		.where(
			and(
				eq(questionClusters.agentId, agentId),
				gte(questionClusters.clusterDate, start),
				lte(questionClusters.clusterDate, end),
			),
		)
		.orderBy(sql`${questionClusters.clusterDate} DESC`)
		.limit(20);

	const recommendations: Array<{
		id: string;
		priority: "high" | "medium" | "low";
		title: string;
		description: string;
		actionLabel: string;
		actionUrl: string;
		impact: {
			volume: number;
			conversionRateGap: number;
			confidenceGap: number;
		};
	}> = [];

	// Analyze clusters for improvement opportunities
	for (const cluster of clusters) {
		const volume = cluster.conversationCount;
		// Cap conversion rate at 100% to handle any data anomalies
		const conversionRate = Math.min(cluster.conversionRate / 100, 1);
		const avgConfidence = cluster.avgConfidenceScore || CONFIDENCE_THRESHOLDS.MEDIUM;

		// Fetch the representative question text
		let representativeQuestionText = "these questions";
		if (cluster.representativeQuestionId) {
			const [repQuestion] = await db
				.select({ content: chatMessages.content })
				.from(chatMessages)
				.where(eq(chatMessages.id, cluster.representativeQuestionId))
				.limit(1);
			if (repQuestion?.content) {
				representativeQuestionText = repQuestion.content;
			}
		}

		// High conversion rate + low confidence = improve answers
		if (conversionRate > 0.3 && avgConfidence < 60) {
			const impact = volume * (100 - avgConfidence) * conversionRate;
			recommendations.push({
				id: `improve-${cluster.id}`,
				priority: impact > 1000 ? "high" : impact > 500 ? "medium" : "low",
				title: "Strengthen high-converting answers",
				description: `Questions about "${representativeQuestionText}" drive ${Math.round(conversionRate * 100)}% conversion but have low confidence. Improving these answers could significantly boost outcomes.`,
				actionLabel: "Improve answers",
				actionUrl: `/ai-knowledge`,
				impact: {
					volume,
					conversionRateGap: 100 - conversionRate * 100,
					confidenceGap: 100 - avgConfidence,
				},
			});
		}

		// High volume + low conversion = add CTAs
		if (volume > 10 && conversionRate < 0.15) {
			const impact = volume * (0.3 - conversionRate) * 100;
			recommendations.push({
				id: `cta-${cluster.id}`,
				priority: impact > 1000 ? "high" : impact > 500 ? "medium" : "low",
				title: "Add conversion opportunities",
				description: `Many users ask about "${representativeQuestionText}" but only ${Math.round(conversionRate * 100)}% convert. Consider adding forms or CTAs to capture interest.`,
				actionLabel: "Configure tools",
				actionUrl: `/tools`,
				impact: {
					volume,
					conversionRateGap: 30 - conversionRate * 100,
					confidenceGap: 0,
				},
			});
		}

		// Low confidence + high volume = add knowledge
		if (avgConfidence < CONFIDENCE_THRESHOLDS.MEDIUM && volume > 10) {
			const impact = volume * (100 - avgConfidence);
			recommendations.push({
				id: `knowledge-${cluster.id}`,
				priority: impact > 1000 ? "high" : impact > 500 ? "medium" : "low",
				title: "Expand knowledge base",
				description: `Users frequently ask about "${representativeQuestionText}" but confidence is only ${avgConfidence}%. Adding relevant documentation could help.`,
				actionLabel: "Add knowledge",
				actionUrl: `/ai-knowledge`,
				impact: {
					volume,
					conversionRateGap: 0,
					confidenceGap: 100 - avgConfidence,
				},
			});
		}
	}

	// Sort by calculated impact and rotate display
	recommendations.sort((a, b) => {
		const impactA = a.impact.volume * (a.impact.conversionRateGap + a.impact.confidenceGap);
		const impactB = b.impact.volume * (b.impact.conversionRateGap + b.impact.confidenceGap);
		return impactB - impactA;
	});

	// Return top 3, rotate based on day of month
	const dayOfMonth = new Date().getDate();
	const rotateBy = dayOfMonth % Math.min(3, recommendations.length);
	const rotated = recommendations.slice(rotateBy).concat(recommendations.slice(0, rotateBy));

	return c.json(rotated.slice(0, 3));
});

// GET /analytics/conversions/confidence - Conversion rates by confidence level
analytics.get("/conversions/confidence", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate ? startOfDayUTC(new Date(startDate)) : new Date(0);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Get all completed turns with KB context and their confidence scores
	// Use selectDistinctOn to avoid counting duplicate rows from multiple joins
	const turnsWithConfidence = await db
		.selectDistinctOn([turns.id], {
			turnId: turns.id,
			confidenceScore: retrievalTraces.confidenceScore,
			hasConversion: sql<boolean>`CASE WHEN ${turnEvents.id} IS NOT NULL THEN true ELSE false END`,
		})
		.from(turns)
		.leftJoin(retrievalTraces, eq(turns.id, retrievalTraces.turnId))
		.leftJoin(turnEvents, eq(turns.id, turnEvents.turnId))
		.where(
			and(
				eq(turns.agentId, agentId),
				eq(turns.status, "completed"),
				eq(turns.hasKbContext, true),
				gte(turns.startedAt, start),
				lte(turns.startedAt, end),
				isNotNull(retrievalTraces.confidenceScore),
			),
		);

	// Group by confidence level
	const buckets = {
		high: { count: 0, conversions: 0 },
		medium: { count: 0, conversions: 0 },
		low: { count: 0, conversions: 0 },
	};

	for (const turn of turnsWithConfidence) {
		const score = turn.confidenceScore;
		if (score === null) continue;

		let bucket: "high" | "medium" | "low";
		if (score >= CONFIDENCE_THRESHOLDS.HIGH) {
			bucket = "high";
		} else if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) {
			bucket = "medium";
		} else {
			bucket = "low";
		}

		buckets[bucket].count++;
		if (turn.hasConversion) {
			buckets[bucket].conversions++;
		}
	}

	// Calculate conversion rates
	const result = {
		high: {
			count: buckets.high.count,
			conversions: buckets.high.conversions,
			conversionRate:
				buckets.high.count > 0 ? (buckets.high.conversions / buckets.high.count) * 100 : 0,
		},
		medium: {
			count: buckets.medium.count,
			conversions: buckets.medium.conversions,
			conversionRate:
				buckets.medium.count > 0 ? (buckets.medium.conversions / buckets.medium.count) * 100 : 0,
		},
		low: {
			count: buckets.low.count,
			conversions: buckets.low.conversions,
			conversionRate:
				buckets.low.count > 0 ? (buckets.low.conversions / buckets.low.count) * 100 : 0,
		},
	};

	return c.json(result);
});

// GET /analytics/resolutions - Resolution analytics
analytics.get("/resolutions", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { agentId, startDate, endDate, followUpWindowMinutes: followUpParam } = c.req.query();
	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	// Verify ownership
	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Calculate previous period for comparison
	const periodLength = end.getTime() - start.getTime();
	const previousStart = new Date(start.getTime() - periodLength);
	const previousEnd = new Date(start);

	// Follow-up window in milliseconds (default 10 minutes, admin can override)
	const followUpWindowMinutes = followUpParam ? Number.parseInt(followUpParam, 10) : 10;
	const followUpWindowMs = followUpWindowMinutes * 60 * 1000;

	// Get agent confidence threshold from escalation settings
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold || 60;

	// Helper function to calculate resolutions for a period
	const calculateResolutions = async (periodStart: Date, periodEnd: Date) => {
		// 1. Get all turns with meaningful questions (has KB context)
		const meaningfulTurns = await db
			.select({
				turnId: turns.id,
				conversationId: turns.conversationId,
				startedAt: turns.startedAt,
				completedAt: turns.completedAt,
				userMessageId: turns.userMessageId,
			})
			.from(turns)
			.where(
				and(
					eq(turns.agentId, agentId),
					eq(turns.hasKbContext, true),
					gte(turns.startedAt, periodStart),
					lte(turns.startedAt, periodEnd),
				),
			);

		const meaningfulQuestions = meaningfulTurns.length;
		let actionAttempted = 0;
		let actionSucceeded = 0;
		let resolved = 0;
		const resolvedConversations: Array<{
			conversationId: string;
			turnId: string;
			questionText: string;
			actionName: string | null;
			timeToResolution: number;
			confidenceScore: number | null;
			timestamp: string;
		}> = [];

		for (const turn of meaningfulTurns) {
			// Get turn events to find tool calls
			const events = await db
				.select({
					eventType: turnEvents.eventType,
					eventId: turnEvents.eventId,
					createdAt: turnEvents.createdAt,
				})
				.from(turnEvents)
				.where(eq(turnEvents.turnId, turn.turnId))
				.orderBy(turnEvents.createdAt);

			const toolCallEvents = events.filter((e) => e.eventType === "tool_call");

			if (toolCallEvents.length > 0) {
				actionAttempted++;

				// Check if any tool execution was successful and counts as resolution
				for (const toolEvent of toolCallEvents) {
					const [submission] = await db
						.select({
							id: formSubmissions.id,
							toolId: formSubmissions.toolId,
							status: formSubmissions.status,
							createdAt: formSubmissions.createdAt,
						})
						.from(formSubmissions)
						.where(eq(formSubmissions.id, toolEvent.eventId))
						.limit(1);

					if (submission) {
						const successStatuses = ["client_success", "webhook_success", "submitted"];
						if (successStatuses.includes(submission.status)) {
							actionSucceeded++;

							// Check if this action counts as resolution
							const [action] = await db
								.select({
									countsAsResolution: agentTools.countsAsResolution,
									name: agentTools.name,
								})
								.from(agentTools)
								.where(eq(agentTools.id, submission.toolId))
								.limit(1);

							if (action?.countsAsResolution) {
								// Check for user follow-up within window
								const submissionTime = new Date(submission.createdAt).getTime();
								const windowEnd = submissionTime + followUpWindowMs;

								const [followUp] = await db
									.select({ id: chatMessages.id })
									.from(chatMessages)
									.where(
										and(
											eq(chatMessages.conversationId, turn.conversationId),
											eq(chatMessages.role, "user"),
											gte(chatMessages.createdAt, new Date(submissionTime)),
											lte(chatMessages.createdAt, new Date(windowEnd)),
										),
									)
									.limit(1);

								// Also check for escalation
								const [hasEscalation] = await db
									.select({ id: escalations.id })
									.from(escalations)
									.where(
										and(
											eq(escalations.conversationId, turn.conversationId),
											gte(escalations.createdAt, new Date(submissionTime)),
										),
									)
									.limit(1);

								if (!followUp && !hasEscalation) {
									resolved++;

									// Get question text and confidence
									const [userMsg] = await db
										.select({
											content: chatMessages.content,
										})
										.from(chatMessages)
										.where(eq(chatMessages.id, turn.userMessageId))
										.limit(1);

									const [trace] = await db
										.select({ confidenceScore: retrievalTraces.confidenceScore })
										.from(retrievalTraces)
										.where(eq(retrievalTraces.turnId, turn.turnId))
										.limit(1);

									const timeToResolution = Math.floor(
										(submissionTime - new Date(turn.startedAt).getTime()) / 1000,
									);

									resolvedConversations.push({
										conversationId: turn.conversationId,
										turnId: turn.turnId,
										questionText: userMsg?.content || "Unknown question",
										actionName: action.name,
										timeToResolution,
										confidenceScore: trace?.confidenceScore || null,
										timestamp: submission.createdAt.toISOString(),
									});
								}
							}
						}
					}
				}
			} else {
				// Check for high-confidence resolution (no action needed)
				const [trace] = await db
					.select({ confidenceScore: retrievalTraces.confidenceScore })
					.from(retrievalTraces)
					.where(eq(retrievalTraces.turnId, turn.turnId))
					.limit(1);

				if (trace?.confidenceScore && trace.confidenceScore >= confidenceThreshold * 100) {
					// Check for user follow-up
					const turnCompletedTime = turn.completedAt || turn.startedAt;
					const windowEnd = new Date(turnCompletedTime).getTime() + followUpWindowMs;

					const [followUp] = await db
						.select({ id: chatMessages.id })
						.from(chatMessages)
						.where(
							and(
								eq(chatMessages.conversationId, turn.conversationId),
								eq(chatMessages.role, "user"),
								gte(chatMessages.createdAt, turnCompletedTime),
								lte(chatMessages.createdAt, new Date(windowEnd)),
							),
						)
						.limit(1);

					const [hasEscalation] = await db
						.select({ id: escalations.id })
						.from(escalations)
						.where(
							and(
								eq(escalations.conversationId, turn.conversationId),
								gte(escalations.createdAt, turnCompletedTime),
							),
						)
						.limit(1);

					if (!followUp && !hasEscalation) {
						resolved++;
						actionSucceeded++; // Count as implicit success

						const [userMsg] = await db
							.select({ content: chatMessages.content })
							.from(chatMessages)
							.innerJoin(turns, eq(chatMessages.id, turns.userMessageId))
							.where(eq(turns.id, turn.turnId))
							.limit(1);

						const timeToResolution = Math.floor(
							(new Date(turnCompletedTime).getTime() - new Date(turn.startedAt).getTime()) / 1000,
						);

						resolvedConversations.push({
							conversationId: turn.conversationId,
							turnId: turn.turnId,
							questionText: userMsg?.content || "Unknown question",
							actionName: null,
							timeToResolution,
							confidenceScore: trace.confidenceScore,
							timestamp: turnCompletedTime.toISOString(),
						});
					}
				}
			}
		}

		const avgTimeToResolution =
			resolvedConversations.length > 0
				? resolvedConversations.reduce((sum, r) => sum + r.timeToResolution, 0) /
					resolvedConversations.length
				: 0;

		return {
			meaningfulQuestions,
			actionAttempted,
			actionSucceeded,
			resolved,
			resolvedConversations,
			avgTimeToResolution,
		};
	};

	// Calculate current period
	const current = await calculateResolutions(start, end);

	// Calculate previous period
	const previous = await calculateResolutions(previousStart, previousEnd);

	// Calculate KPIs
	const resolutionRate =
		current.meaningfulQuestions > 0 ? (current.resolved / current.meaningfulQuestions) * 100 : 0;
	const previousResolutionRate =
		previous.meaningfulQuestions > 0 ? (previous.resolved / previous.meaningfulQuestions) * 100 : 0;

	// Get cluster breakdown (simplified - group by first question)
	const clusterMap = new Map<
		string,
		{
			label: string;
			volume: number;
			resolved: number;
			actions: Map<
				string,
				{ actionId: string; actionName: string; count: number; success: number }
			>;
		}
	>();

	for (const conv of current.resolvedConversations) {
		const key = conv.questionText.substring(0, 100);
		if (!clusterMap.has(key)) {
			clusterMap.set(key, {
				label: conv.questionText,
				volume: 0,
				resolved: 0,
				actions: new Map(),
			});
		}
		const cluster = clusterMap.get(key)!;
		cluster.volume++;
		cluster.resolved++;

		if (conv.actionName) {
			if (!cluster.actions.has(conv.actionName)) {
				cluster.actions.set(conv.actionName, {
					actionId: "unknown",
					actionName: conv.actionName,
					count: 0,
					success: 0,
				});
			}
			const actionStat = cluster.actions.get(conv.actionName)!;
			actionStat.count++;
			actionStat.success++;
		}
	}

	const clusterBreakdown = Array.from(clusterMap.entries())
		.map(([key, data]) => {
			const rate = data.volume > 0 ? (data.resolved / data.volume) * 100 : 0;
			return {
				clusterId: null,
				label: data.label,
				volume: data.volume,
				resolutionRate: rate,
				status: (rate >= 60 ? "healthy" : rate >= 30 ? "ok" : "at-risk") as
					| "healthy"
					| "ok"
					| "at-risk",
				actions: Array.from(data.actions.values()).map((a) => ({
					actionId: a.actionId,
					actionName: a.actionName,
					executionCount: a.count,
					successRate: a.count > 0 ? (a.success / a.count) * 100 : 0,
				})),
			};
		})
		.sort((a, b) => b.volume - a.volume)
		.slice(0, 20);

	// Calculate unresolved reasons
	const totalTurns = current.meaningfulQuestions;
	const unresolvedReasons = {
		lowConfidence: 0,
		noActionSucceeded: 0,
		userFollowUp: 0,
		escalated: 0,
	};

	// This is simplified - would need more detailed tracking
	unresolvedReasons.noActionSucceeded = current.actionAttempted - current.actionSucceeded;
	unresolvedReasons.userFollowUp = Math.max(
		0,
		current.meaningfulQuestions - current.resolved - unresolvedReasons.noActionSucceeded,
	);

	// Confidence breakdown
	const confidenceBreakdown = [
		{
			range: "high" as const,
			label: "High (≥70%)",
			resolutionRate: 0,
			count: 0,
		},
		{
			range: "medium" as const,
			label: "Medium (40-69%)",
			resolutionRate: 0,
			count: 0,
		},
		{
			range: "low" as const,
			label: "Low (<40%)",
			resolutionRate: 0,
			count: 0,
		},
	];

	// Generate top recommendation
	let topRecommendation = null;
	if (clusterBreakdown.length > 0) {
		// Find cluster with highest impact (volume × (1 - resolutionRate))
		const impacts = clusterBreakdown.map((c) => ({
			cluster: c,
			impact: (c.volume * (100 - c.resolutionRate)) / 100,
		}));
		impacts.sort((a, b) => b.impact - a.impact);

		const topCluster = impacts[0]?.cluster;
		if (topCluster && topCluster.resolutionRate < 60) {
			const avgConfidence = current.resolvedConversations
				.filter((r) => r.questionText === topCluster.label && r.confidenceScore)
				.reduce((sum, r, _, arr) => sum + (r.confidenceScore || 0) / arr.length, 0);

			if (avgConfidence < 50) {
				topRecommendation = {
					type: "add_knowledge" as const,
					title: "Expand knowledge base coverage",
					description: `"${topCluster.label.substring(0, 80)}..." has low confidence (${Math.round(avgConfidence)}%). Adding relevant documentation could help.`,
					ctaText: "Add knowledge",
					ctaHref: `/ai-knowledge`,
					clusterId: topCluster.clusterId,
				};
			} else if (topCluster.actions.length === 0) {
				topRecommendation = {
					type: "fix_actions" as const,
					title: "Configure resolution actions",
					description: `"${topCluster.label.substring(0, 80)}..." isn't resolving. Consider adding an action to help close these conversations.`,
					ctaText: "Configure tools",
					ctaHref: `/tools`,
					clusterId: topCluster.clusterId,
				};
			} else {
				topRecommendation = {
					type: "improve_answers" as const,
					title: "Improve AI responses",
					description: `"${topCluster.label.substring(0, 80)}..." has moderate confidence but low resolution rate. Refining answers could help.`,
					ctaText: "View performance",
					ctaHref: `/needs-attention`,
					clusterId: topCluster.clusterId,
				};
			}
		}
	}

	return c.json({
		kpis: {
			resolvedCount: current.resolved,
			previousResolvedCount: previous.resolved,
			resolutionRate,
			previousResolutionRate,
			avgTimeToResolution: current.avgTimeToResolution,
			previousAvgTimeToResolution: previous.avgTimeToResolution,
		},
		funnelSteps: {
			meaningfulQuestions: current.meaningfulQuestions,
			actionAttempted: current.actionAttempted,
			actionSucceeded: current.actionSucceeded,
			resolved: current.resolved,
		},
		clusterBreakdown,
		unresolvedReasons,
		confidenceBreakdown,
		recentlyResolved: current.resolvedConversations.slice(0, 20),
		topRecommendation,
	});
});

// GET /analytics/answer-quality/summary - Summary metrics for answer quality
analytics.get("/answer-quality/summary", async (c) => {
	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	const hasAccess = await verifyAgentOwnership(db, agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? new Date(endDate) : new Date();

	// Calculate previous period for comparison
	const periodLength = end.getTime() - start.getTime();
	const previousStart = new Date(start.getTime() - periodLength);
	const previousEnd = new Date(start.getTime());

	// Current period metrics
	const currentMessages = await db
		.select({
			confidenceScore: chatMessages.confidenceScore,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		);

	// Previous period metrics
	const previousMessages = await db
		.select({
			confidenceScore: chatMessages.confidenceScore,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				gte(chatMessages.createdAt, previousStart),
				lte(chatMessages.createdAt, previousEnd),
			),
		);

	// Calculate current metrics
	const currentTotal = currentMessages.length;
	const currentAvg =
		currentTotal > 0
			? currentMessages.reduce((sum, m) => sum + (m.confidenceScore || 0), 0) / currentTotal
			: 0;
	const currentHigh = currentMessages.filter(
		(m) => (m.confidenceScore || 0) >= CONFIDENCE_THRESHOLDS.HIGH,
	).length;
	const currentLow = currentMessages.filter(
		(m) => (m.confidenceScore || 0) < CONFIDENCE_THRESHOLDS.MEDIUM,
	).length;

	// Calculate previous metrics
	const previousTotal = previousMessages.length;
	const previousAvg =
		previousTotal > 0
			? previousMessages.reduce((sum, m) => sum + (m.confidenceScore || 0), 0) / previousTotal
			: 0;
	const previousHigh = previousMessages.filter(
		(m) => (m.confidenceScore || 0) >= CONFIDENCE_THRESHOLDS.HIGH,
	).length;
	const previousLow = previousMessages.filter(
		(m) => (m.confidenceScore || 0) < CONFIDENCE_THRESHOLDS.MEDIUM,
	).length;

	// Calculate percentages
	const highPercentage = currentTotal > 0 ? (currentHigh / currentTotal) * 100 : 0;
	const lowPercentage = currentTotal > 0 ? (currentLow / currentTotal) * 100 : 0;
	const previousHighPercentage = previousTotal > 0 ? (previousHigh / previousTotal) * 100 : 0;
	const previousLowPercentage = previousTotal > 0 ? (previousLow / previousTotal) * 100 : 0;

	return c.json({
		avgConfidence: Math.round(currentAvg),
		previousAvgConfidence: Math.round(previousAvg),
		highConfidencePercentage: Math.round(highPercentage * 10) / 10,
		previousHighConfidencePercentage: Math.round(previousHighPercentage * 10) / 10,
		lowConfidencePercentage: Math.round(lowPercentage * 10) / 10,
		previousLowConfidencePercentage: Math.round(previousLowPercentage * 10) / 10,
		meaningfulQuestions: currentTotal,
		previousMeaningfulQuestions: previousTotal,
	});
});

// GET /analytics/answer-quality/distribution - Confidence distribution by buckets
analytics.get("/answer-quality/distribution", async (c) => {
	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	const hasAccess = await verifyAgentOwnership(db, agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? new Date(endDate) : new Date();

	const messages = await db
		.select({
			confidenceScore: chatMessages.confidenceScore,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		);

	// Bucket into ranges
	const high = messages.filter(
		(m) => (m.confidenceScore || 0) >= CONFIDENCE_THRESHOLDS.HIGH,
	).length;
	const medium = messages.filter(
		(m) =>
			(m.confidenceScore || 0) >= CONFIDENCE_THRESHOLDS.MEDIUM &&
			(m.confidenceScore || 0) < CONFIDENCE_THRESHOLDS.HIGH,
	).length;
	const low = messages.filter(
		(m) => (m.confidenceScore || 0) < CONFIDENCE_THRESHOLDS.MEDIUM,
	).length;

	return c.json({
		distribution: [
			{ bucket: "high", range: `≥${CONFIDENCE_THRESHOLDS.HIGH}%`, count: high },
			{
				bucket: "medium",
				range: `${CONFIDENCE_THRESHOLDS.MEDIUM}-${CONFIDENCE_THRESHOLDS.HIGH - 1}%`,
				count: medium,
			},
			{ bucket: "low", range: `<${CONFIDENCE_THRESHOLDS.MEDIUM}%`, count: low },
		],
	});
});

// GET /analytics/answer-quality/clusters - Question clusters with confidence breakdown
analytics.get("/answer-quality/clusters", async (c) => {
	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	const hasAccess = await verifyAgentOwnership(db, agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? new Date(endDate) : new Date();

	// Get recent clusters for this agent
	const clusters = await db
		.select()
		.from(questionClusters)
		.where(eq(questionClusters.agentId, agentId))
		.orderBy(sql`${questionClusters.clusterDate} DESC`)
		.limit(50);

	if (clusters.length === 0) {
		return c.json({ clusters: [] });
	}

	// Get representative questions and confidence stats
	const clusterResults = await Promise.all(
		clusters.map(async (cluster) => {
			// Get representative question text
			if (!cluster.representativeQuestionId) return null;

			const [repQuestion] = await db
				.select({ content: chatMessages.content })
				.from(chatMessages)
				.where(eq(chatMessages.id, cluster.representativeQuestionId))
				.limit(1);

			if (!repQuestion) return null;

			// Get all messages from this cluster within date range
			const memberIds = (cluster.memberQuestionIds as string[]).filter((id) => id != null);
			if (memberIds.length === 0) return null;

			// Get confidence scores for cluster members
			// We need to get assistant messages that responded to user questions in this cluster
			const turnsInCluster = await db
				.select({ turnId: turns.id })
				.from(turns)
				.where(and(isNotNull(turns.userMessageId), inArray(turns.userMessageId, memberIds)));

			if (turnsInCluster.length === 0) return null;

			const turnIds = turnsInCluster.map((t) => t.turnId);
			const traces = await db
				.select({ assistantMessageId: retrievalTraces.assistantMessageId })
				.from(retrievalTraces)
				.where(inArray(retrievalTraces.turnId, turnIds));

			if (traces.length === 0) return null;

			const assistantMessageIds = traces.map((t) => t.assistantMessageId);
			const confidenceScores = await db
				.select({
					confidenceScore: chatMessages.confidenceScore,
				})
				.from(chatMessages)
				.where(
					and(
						inArray(chatMessages.id, assistantMessageIds),
						eq(chatMessages.role, "assistant"),
						isNotNull(chatMessages.confidenceScore),
						gte(chatMessages.createdAt, start),
						lte(chatMessages.createdAt, end),
					),
				);

			if (confidenceScores.length === 0) return null;

			const avgConfidence =
				confidenceScores.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) /
				confidenceScores.length;

			const lowConfidenceCount = confidenceScores.filter(
				(s) => (s.confidenceScore || 0) < CONFIDENCE_THRESHOLDS.HIGH,
			).length;
			const lowConfidencePercentage = (lowConfidenceCount / confidenceScores.length) * 100;

			let status: "healthy" | "at-risk" | "poor";
			if (avgConfidence >= CONFIDENCE_THRESHOLDS.HIGH) {
				status = "healthy";
			} else if (avgConfidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
				status = "at-risk";
			} else {
				status = "poor";
			}

			return {
				clusterId: cluster.id,
				representativeQuestion: repQuestion.content,
				volume: confidenceScores.length,
				avgConfidence: Math.round(avgConfidence),
				lowConfidencePercentage: Math.round(lowConfidencePercentage * 10) / 10,
				status,
			};
		}),
	);

	// Filter out null results and sort by volume
	const validClusters = clusterResults.filter((c) => c !== null);
	validClusters.sort((a, b) => b.volume - a.volume);

	return c.json({ clusters: validClusters });
});

// GET /analytics/answer-quality/hotspots - Top worst-performing clusters
analytics.get("/answer-quality/hotspots", async (c) => {
	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const user = c.get("user");

	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	const db = getDb();

	const hasAccess = await verifyAgentOwnership(db, agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? new Date(endDate) : new Date();

	// Get recent clusters
	const clusters = await db
		.select()
		.from(questionClusters)
		.where(eq(questionClusters.agentId, agentId))
		.orderBy(sql`${questionClusters.clusterDate} DESC`)
		.limit(50);

	if (clusters.length === 0) {
		return c.json({ hotspots: [] });
	}

	// Calculate impact scores for each cluster
	const clusterScores = await Promise.all(
		clusters.map(async (cluster) => {
			if (!cluster.representativeQuestionId) return null;

			const [repQuestion] = await db
				.select({ content: chatMessages.content })
				.from(chatMessages)
				.where(eq(chatMessages.id, cluster.representativeQuestionId))
				.limit(1);

			if (!repQuestion) return null;

			const memberIds = (cluster.memberQuestionIds as string[]).filter((id) => id != null);
			if (memberIds.length === 0) return null;

			// Get confidence scores
			const turnsInCluster = await db
				.select({ turnId: turns.id })
				.from(turns)
				.where(and(isNotNull(turns.userMessageId), inArray(turns.userMessageId, memberIds)));

			if (turnsInCluster.length === 0) return null;

			const turnIds = turnsInCluster.map((t) => t.turnId);
			const traces = await db
				.select({ assistantMessageId: retrievalTraces.assistantMessageId })
				.from(retrievalTraces)
				.where(inArray(retrievalTraces.turnId, turnIds));

			if (traces.length === 0) return null;

			const assistantMessageIds = traces.map((t) => t.assistantMessageId);
			const confidenceScores = await db
				.select({
					confidenceScore: chatMessages.confidenceScore,
				})
				.from(chatMessages)
				.where(
					and(
						inArray(chatMessages.id, assistantMessageIds),
						eq(chatMessages.role, "assistant"),
						isNotNull(chatMessages.confidenceScore),
						gte(chatMessages.createdAt, start),
						lte(chatMessages.createdAt, end),
					),
				);

			if (confidenceScores.length === 0) return null;

			const avgConfidence =
				confidenceScores.reduce((sum, s) => sum + (s.confidenceScore || 0), 0) /
				confidenceScores.length;

			// Impact score: volume × (100 - confidence) / 100
			// Higher impact = more volume with lower confidence
			const impactScore = (confidenceScores.length * (100 - avgConfidence)) / 100;

			return {
				clusterId: cluster.id,
				representativeQuestion: repQuestion.content,
				volume: confidenceScores.length,
				avgConfidence: Math.round(avgConfidence),
				impactScore,
			};
		}),
	);

	// Filter, sort by impact, and return top 10
	const validHotspots = clusterScores
		.filter((c): c is NonNullable<typeof c> => c !== null && c.avgConfidence < 70) // Only include non-healthy clusters
		.sort((a, b) => b.impactScore - a.impactScore)
		.slice(0, 10);

	return c.json({ hotspots: validHotspots });
});

// GET /analytics/unanswered-questions - Get unanswered questions analytics
analytics.get("/unanswered-questions", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const clusterId = c.req.query("clusterId");

	if (!agentId) {
		return c.json({ error: "Agent ID is required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	end.setUTCDate(end.getUTCDate() + 1);

	// Calculate previous period for comparison
	const periodLength = end.getTime() - start.getTime();
	const previousStart = new Date(start.getTime() - periodLength);
	const previousEnd = new Date(start);

	// Get agent confidence threshold from escalation settings
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold ?? 70;

	// Helper to calculate metrics for a period
	const calculatePeriodMetrics = async (periodStart: Date, periodEnd: Date) => {
		// Get all assistant messages with confidence scores (meaningful questions)
		const meaningfulMessages = await db
			.select({
				confidenceScore: chatMessages.confidenceScore,
			})
			.from(chatMessages)
			.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
			.where(
				and(
					isNotNull(chatMessages.conversationId),
					eq(conversations.agentId, agentId),
					eq(chatMessages.role, "assistant"),
					isNotNull(chatMessages.confidenceScore),
					gte(chatMessages.createdAt, periodStart),
					lte(chatMessages.createdAt, periodEnd),
				),
			);

		const totalMeaningfulQuestions = meaningfulMessages.length;

		// Count unanswered (low confidence) messages
		const unansweredCount = meaningfulMessages.filter(
			(m) => (m.confidenceScore || 0) < confidenceThreshold,
		).length;

		const unansweredPercentage =
			totalMeaningfulQuestions > 0
				? Math.round((unansweredCount / totalMeaningfulQuestions) * 100)
				: 0;

		return {
			totalMeaningfulQuestions,
			unansweredCount,
			unansweredPercentage,
		};
	};

	// Calculate current and previous period metrics
	const [currentMetrics, previousMetrics] = await Promise.all([
		calculatePeriodMetrics(start, end),
		calculatePeriodMetrics(previousStart, previousEnd),
	]);

	// Get question clusters and filter for unanswered questions
	// If clusterId is provided, only fetch that specific cluster
	const clusters = await db
		.select()
		.from(questionClusters)
		.where(
			clusterId
				? and(eq(questionClusters.agentId, agentId), eq(questionClusters.id, clusterId))
				: eq(questionClusters.agentId, agentId),
		)
		.orderBy(sql`${questionClusters.clusterDate} DESC`)
		.limit(clusterId ? 1 : 100);

	const clusterResults = await Promise.all(
		clusters.map(async (cluster, idx) => {
			try {
				// Handle null or invalid memberQuestionIds
				if (!cluster.memberQuestionIds || !Array.isArray(cluster.memberQuestionIds)) {
					return null;
				}

				const memberIds = (cluster.memberQuestionIds as string[]).filter(
					(id) => id != null && id !== "",
				);

				// Skip if no member IDs
				if (memberIds.length === 0) return null;

				console.log(`[cluster ${idx}] Processing with ${memberIds.length} members`);

				// Get confidence scores for cluster members in date range
				// First get the assistant message IDs from turns matching our user messages
				const turnsWithMembers = await db
					.select({
						turnId: turns.id,
						userMessageId: turns.userMessageId,
					})
					.from(turns)
					.where(and(isNotNull(turns.userMessageId), inArray(turns.userMessageId, memberIds)));

				if (turnsWithMembers.length === 0) return null;

				// Get assistant message IDs from retrieval traces for these turns
				const turnIds = turnsWithMembers.map((t) => t.turnId);
				const traces = await db
					.select({
						assistantMessageId: retrievalTraces.assistantMessageId,
					})
					.from(retrievalTraces)
					.where(inArray(retrievalTraces.turnId, turnIds));

				if (traces.length === 0) return null;

				const assistantMessageIds = traces.map((t) => t.assistantMessageId);

				// Now get the confidence scores for these assistant messages
				const confidenceScores = await db
					.select({
						confidenceScore: chatMessages.confidenceScore,
						messageId: chatMessages.id,
						createdAt: chatMessages.createdAt,
					})
					.from(chatMessages)
					.where(
						and(
							inArray(chatMessages.id, assistantMessageIds),
							eq(chatMessages.role, "assistant"),
							isNotNull(chatMessages.confidenceScore),
							gte(chatMessages.createdAt, start),
							lte(chatMessages.createdAt, end),
						),
					);

				if (confidenceScores.length === 0) return null;

				// Filter for unanswered questions (low confidence)
				const unansweredInCluster = confidenceScores.filter(
					(m) => (m.confidenceScore || 0) < confidenceThreshold,
				);

				const unansweredCount = unansweredInCluster.length;
				const unansweredPercentage = Math.round((unansweredCount / confidenceScores.length) * 100);

				// Filter out clusters with zero unanswered questions
				if (unansweredCount === 0) return null;

				// Get representative question
				let repQuestion: { content: string } | undefined;
				if (cluster.representativeQuestionId) {
					[repQuestion] = await db
						.select({ content: chatMessages.content })
						.from(chatMessages)
						.where(eq(chatMessages.id, cluster.representativeQuestionId))
						.limit(1);
				}

				// Get most recent unanswered question timestamp
				const mostRecentUnanswered = unansweredInCluster.reduce((latest, current) => {
					return current.createdAt > latest.createdAt ? current : latest;
				}, unansweredInCluster[0]);

				// Determine priority based on % unanswered threshold
				let priority: "high" | "medium" | "low";
				if (unansweredPercentage > 50) {
					priority = "high";
				} else if (unansweredPercentage >= 25) {
					priority = "medium";
				} else {
					priority = "low";
				}

				return {
					clusterId: cluster.id,
					representativeQuestion: repQuestion?.content || "Unknown question",
					volume: unansweredCount,
					totalVolume: confidenceScores.length,
					unansweredPercentage,
					lastSeen: mostRecentUnanswered.createdAt,
					priority,
				};
			} catch (error) {
				console.error(`[cluster ${idx}] Error processing cluster ${cluster.id}:`, error);
				return null;
			}
		}),
	);

	// Filter out nulls and sort by volume
	const validClusters = clusterResults
		.filter((c) => c !== null)
		.sort((a, b) => b.volume - a.volume);

	// Get top cluster
	const topCluster = validClusters[0] || null;

	// Select specific columns we need (chatMessages doesn't have turnId)
	const recentUnanswered = await db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			confidenceScore: chatMessages.confidenceScore,
			createdAt: chatMessages.createdAt,
			conversationId: chatMessages.conversationId,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
				lt(chatMessages.confidenceScore, confidenceThreshold),
				gte(chatMessages.createdAt, start),
				lte(chatMessages.createdAt, end),
			),
		)
		.orderBy(desc(chatMessages.createdAt))
		.limit(20);

	// Get the user message for each recent unanswered and group by question
	const questionsMap = new Map<
		string,
		{
			questionText: string;
			cluster: string;
			count: number;
			lastAskedAt: Date;
			conversationIds: string[];
		}
	>();

	for (const msg of recentUnanswered) {
		// Find the turn through retrieval traces
		const [trace] = await db
			.select({
				turnId: retrievalTraces.turnId,
			})
			.from(retrievalTraces)
			.where(eq(retrievalTraces.assistantMessageId, msg.id))
			.limit(1);

		let turn: { id: string; userMessageId: string } | undefined;
		if (trace?.turnId) {
			[turn] = await db
				.select({
					id: turns.id,
					userMessageId: turns.userMessageId,
				})
				.from(turns)
				.where(eq(turns.id, trace.turnId))
				.limit(1);
		}

		let userMsg: { content: string; id?: string } | undefined;
		let questionText = "Unknown question";
		let userMessageId: string | undefined = turn?.userMessageId;

		if (turn?.userMessageId) {
			[userMsg] = await db
				.select({
					content: chatMessages.content,
					id: chatMessages.id,
				})
				.from(chatMessages)
				.where(eq(chatMessages.id, turn.userMessageId))
				.limit(1);

			if (userMsg?.content) {
				questionText = userMsg.content;
			}
		}

		// If we still don't have the question, try to find the user message before this assistant message
		if (questionText === "Unknown question" && msg.conversationId) {
			const [previousUserMsg] = await db
				.select({
					content: chatMessages.content,
					id: chatMessages.id,
				})
				.from(chatMessages)
				.where(
					and(
						eq(chatMessages.conversationId, msg.conversationId),
						eq(chatMessages.role, "user"),
						lt(chatMessages.createdAt, msg.createdAt),
					),
				)
				.orderBy(desc(chatMessages.createdAt))
				.limit(1);

			if (previousUserMsg?.content) {
				questionText = previousUserMsg.content;
				userMessageId = previousUserMsg.id;
			}
		}

		// Find which cluster this belongs to
		let clusterName = "Unclustered";
		if (userMessageId) {
			for (const cluster of validClusters) {
				const clusterObj = clusters.find((c) => c.id === cluster.clusterId);
				if (
					clusterObj &&
					clusterObj.memberQuestionIds &&
					Array.isArray(clusterObj.memberQuestionIds)
				) {
					const memberIds = (clusterObj.memberQuestionIds as string[]).filter(
						(id) => id != null && id !== "",
					);
					if (memberIds.includes(userMessageId)) {
						clusterName = cluster.representativeQuestion;
						break;
					}
				}
			}
		}

		// Group by question text
		const existing = questionsMap.get(questionText);
		if (existing) {
			existing.count++;
			existing.conversationIds.push(msg.conversationId);
			if (msg.createdAt > existing.lastAskedAt) {
				existing.lastAskedAt = msg.createdAt;
			}
		} else {
			questionsMap.set(questionText, {
				questionText,
				cluster: clusterName,
				count: 1,
				lastAskedAt: msg.createdAt,
				conversationIds: [msg.conversationId],
			});
		}
	}

	// Convert to array and sort by count (most asked first)
	const recentWithUserMessages = Array.from(questionsMap.values())
		.sort((a, b) => b.count - a.count)
		.slice(0, 10);

	// Calculate reason breakdown (simplified for v1 - confidence only)
	const reasonBreakdown = {
		lowConfidence: currentMetrics.unansweredCount,
		noMatchingKnowledge: 0, // v2 feature
		fallbackResponse: 0, // v2 feature
		retrievalError: 0, // v2 feature
	};

	// Suggested knowledge additions (top 5 high-volume clusters)
	const suggestedKnowledge = validClusters.slice(0, 5).map((cluster) => ({
		clusterId: cluster.clusterId,
		representativeQuestion: cluster.representativeQuestion,
		volume: cluster.volume,
		exampleQuestions: [cluster.representativeQuestion], // Could expand this in v2
	}));

	return c.json({
		summary: {
			unansweredCount: currentMetrics.unansweredCount,
			previousUnansweredCount: previousMetrics.unansweredCount,
			unansweredPercentage: currentMetrics.unansweredPercentage,
			previousUnansweredPercentage: previousMetrics.unansweredPercentage,
			meaningfulQuestions: currentMetrics.totalMeaningfulQuestions,
			previousMeaningfulQuestions: previousMetrics.totalMeaningfulQuestions,
			topCluster: topCluster
				? {
						name: topCluster.representativeQuestion,
						volume: topCluster.volume,
					}
				: null,
		},
		clusters: validClusters,
		recentQuestions: recentWithUserMessages,
		reasonBreakdown,
		suggestedKnowledge,
	});
});

// GET /analytics/clusters/:clusterId - Get cluster details with representative question
analytics.get("/clusters/:clusterId", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const clusterId = c.req.param("clusterId");
	if (!clusterId) {
		return c.json({ error: "Cluster ID is required" }, 400);
	}

	const db = getDb();

	// Fetch the cluster
	const [cluster] = await db
		.select({
			id: questionClusters.id,
			agentId: questionClusters.agentId,
			representativeQuestionId: questionClusters.representativeQuestionId,
			conversationCount: questionClusters.conversationCount,
			clusterDate: questionClusters.clusterDate,
		})
		.from(questionClusters)
		.where(eq(questionClusters.id, clusterId))
		.limit(1);

	if (!cluster) {
		return c.json({ error: "Cluster not found" }, 404);
	}

	// Verify user has access to this cluster's agent
	const hasAccess = await verifyAgentOwnership(db, cluster.agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Fetch the representative question text
	let representativeQuestion = null;
	if (cluster.representativeQuestionId) {
		const [message] = await db
			.select({ content: chatMessages.content })
			.from(chatMessages)
			.where(eq(chatMessages.id, cluster.representativeQuestionId))
			.limit(1);

		if (message) {
			representativeQuestion = message.content;
		}
	}

	return c.json({
		id: cluster.id,
		agentId: cluster.agentId,
		representativeQuestion: representativeQuestion || "Unknown cluster",
		conversationCount: cluster.conversationCount || 0,
		clusterDate: cluster.clusterDate,
	});
});

// POST /analytics/cluster - Trigger clustering job for specific agent or all agents
analytics.post("/cluster", async (c) => {
	const user = c.get("user");
	if (!user) return c.json({ error: "Unauthorized" }, 401);

	const { agentId, batchLimit } = await c.req.json();

	// Verify agent ownership if specific agent is provided
	if (agentId) {
		const db = getDb();
		if (!(await verifyAgentOwnership(db, agentId, user.id))) {
			return c.json({ error: "Agent not found or unauthorized" }, 404);
		}
	}

	try {
		// Dynamic import to avoid circular dependencies
		const { main: runClustering } = await import("../../scripts/cluster-questions");

		// Run clustering in background (don't wait for completion)
		runClustering({
			agentId,
			batchLimit: batchLimit || (agentId ? undefined : 50),
		}).catch((error) => {
			console.error("[analytics] Clustering job failed:", error);
		});

		return c.json({
			success: true,
			message: agentId
				? `Clustering job started for agent ${agentId}`
				: `Clustering job started for ${batchLimit || 50} agents`,
		});
	} catch (error) {
		console.error("[analytics] Failed to start clustering job:", error);
		return c.json({ error: "Failed to start clustering job" }, 500);
	}
});

// GET /analytics/clusters/:clusterId/confidence - Get confidence stats for a specific cluster
analytics.get("/clusters/:clusterId/confidence", async (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const clusterId = c.req.param("clusterId");
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	if (!clusterId) {
		return c.json({ error: "Cluster ID is required" }, 400);
	}

	const db = getDb();

	// Fetch the cluster
	const [cluster] = await db
		.select({
			id: questionClusters.id,
			agentId: questionClusters.agentId,
			representativeQuestionId: questionClusters.representativeQuestionId,
			memberQuestionIds: questionClusters.memberQuestionIds,
		})
		.from(questionClusters)
		.where(eq(questionClusters.id, clusterId))
		.limit(1);

	if (!cluster) {
		return c.json({ error: "Cluster not found" }, 404);
	}

	// Verify user has access to this cluster's agent
	const hasAccess = await verifyAgentOwnership(db, cluster.agentId, user.id);
	if (!hasAccess) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	const memberIds = (cluster.memberQuestionIds as string[]).filter((id) => id != null);
	if (memberIds.length === 0) {
		return c.json({
			clusterId,
			volume: 0,
			avgConfidence: null,
			lowConfidenceCount: 0,
			conversationIds: [],
		});
	}

	const start = startDate
		? startOfDayUTC(new Date(startDate))
		: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const end = endDate ? startOfDayUTC(new Date(endDate)) : new Date();
	// Add one day to include the end date
	end.setUTCDate(end.getUTCDate() + 1);

	// Get agent's confidence threshold
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, cluster.agentId))
		.limit(1);
	const confidenceThreshold = escalationSettings?.confidenceThreshold || 70;

	// Get conversations that have user messages in this cluster (simpler approach without turns/traces)
	const conversationsWithClusterMessages = await db
		.selectDistinct({ conversationId: chatMessages.conversationId })
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			and(
				inArray(chatMessages.id, memberIds),
				eq(chatMessages.role, "user"),
				gte(conversations.createdAt, start),
				lte(conversations.createdAt, end),
			),
		);

	if (conversationsWithClusterMessages.length === 0) {
		return c.json({
			clusterId,
			volume: 0,
			avgConfidence: null,
			lowConfidenceCount: 0,
			conversationIds: [],
		});
	}

	const clusterConversationIds = conversationsWithClusterMessages.map((c) => c.conversationId);

	// Get all assistant messages with confidence scores from these conversations
	const confidenceData = await db
		.select({
			conversationId: chatMessages.conversationId,
			confidenceScore: chatMessages.confidenceScore,
		})
		.from(chatMessages)
		.where(
			and(
				inArray(chatMessages.conversationId, clusterConversationIds),
				eq(chatMessages.role, "assistant"),
				isNotNull(chatMessages.confidenceScore),
			),
		);

	if (confidenceData.length === 0) {
		return c.json({
			clusterId,
			volume: clusterConversationIds.length,
			avgConfidence: null,
			lowConfidenceCount: 0,
			conversationIds: clusterConversationIds,
		});
	}

	const avgConfidence =
		confidenceData.reduce((sum, d) => sum + (d.confidenceScore || 0), 0) / confidenceData.length;

	const lowConfidenceMessages = confidenceData.filter(
		(d) => (d.confidenceScore || 0) < confidenceThreshold,
	);

	// Get unique conversation IDs for low confidence messages
	const lowConfidenceConversationIds = [
		...new Set(lowConfidenceMessages.map((d) => d.conversationId)),
	];

	return c.json({
		clusterId,
		volume: confidenceData.length,
		avgConfidence: Math.round(avgConfidence),
		lowConfidenceCount: lowConfidenceMessages.length,
		conversationIds: lowConfidenceConversationIds,
		confidenceThreshold,
	});
});

export { analytics };
