import {
	agents,
	and,
	chatMessages,
	conversations,
	count,
	desc,
	eq,
	getDb,
	gte,
	llmUsage,
	lte,
	sql,
	sum,
	userSubscriptions,
	users,
} from "@ansa/db";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import { getPlanName, PLAN_LIMITS } from "../lib/plans";
import type { AuthVariables } from "../middleware/auth";

const admin = new Hono<{ Variables: AuthVariables }>();

// Admin middleware - verify role === "admin"
async function requireAdmin(c: Context, next: Next) {
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

	if (!dbUser || dbUser.role !== "admin") {
		return c.json({ error: "Admin access required" }, 403);
	}

	return next();
}

// Check if current user is admin
admin.get("/check", async (c) => {
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ isAdmin: false, role: null });
	}

	const db = getDb();
	const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

	return c.json({
		isAdmin: dbUser?.role === "admin",
		role: dbUser?.role || "user",
	});
});

// All other admin routes require admin role
admin.use("/*", requireAdmin);

// Get business growth KPIs
admin.get("/kpis", async (c) => {
	const db = getDb();
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");

	// Parse dates (default to last 30 days)
	const end = endDate ? new Date(endDate) : new Date();
	const start = startDate
		? new Date(startDate)
		: new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

	// Set end to end of day
	end.setHours(23, 59, 59, 999);
	start.setHours(0, 0, 0, 0);

	const [userMetrics, subscriptionMetrics, conversationMetrics, llmMetrics] = await Promise.all([
		getUserMetrics(db, start, end),
		getSubscriptionMetrics(db),
		getConversationMetrics(db, start, end),
		getLLMMetrics(db, start, end),
	]);

	return c.json({
		dateRange: { start: start.toISOString(), end: end.toISOString() },
		users: userMetrics,
		subscriptions: subscriptionMetrics,
		conversations: conversationMetrics,
		llm: llmMetrics,
	});
});

// User metrics
async function getUserMetrics(db: ReturnType<typeof getDb>, start: Date, end: Date) {
	// Total users
	const [totalResult] = await db.select({ count: count() }).from(users);

	// New users in period
	const [newResult] = await db
		.select({ count: count() })
		.from(users)
		.where(and(gte(users.createdAt, start), lte(users.createdAt, end)));

	// Daily signups
	const dailySignups = await db
		.select({
			date: sql<string>`DATE(${users.createdAt})`,
			count: count(),
		})
		.from(users)
		.where(and(gte(users.createdAt, start), lte(users.createdAt, end)))
		.groupBy(sql`DATE(${users.createdAt})`)
		.orderBy(sql`DATE(${users.createdAt})`);

	return {
		total: Number(totalResult?.count) || 0,
		newInPeriod: Number(newResult?.count) || 0,
		daily: dailySignups.map((d) => ({ date: d.date, count: Number(d.count) })),
	};
}

// Subscription metrics
async function getSubscriptionMetrics(db: ReturnType<typeof getDb>) {
	// Count users by plan (active subscriptions)
	const byPlan = await db
		.select({
			planId: userSubscriptions.planId,
			count: count(),
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.status, "active"))
		.groupBy(userSubscriptions.planId);

	// Calculate total paying users (non-free plans)
	const totalPaying = byPlan
		.filter((p) => p.planId !== "free")
		.reduce((acc, p) => acc + Number(p.count), 0);

	// Calculate MRR
	let mrr = 0;
	for (const plan of byPlan) {
		const planConfig = PLAN_LIMITS[plan.planId as keyof typeof PLAN_LIMITS];
		if (planConfig && planConfig.price > 0) {
			mrr += planConfig.price * Number(plan.count);
		}
	}

	// By billing provider
	const byProvider = await db
		.select({
			provider: userSubscriptions.billingProvider,
			count: count(),
		})
		.from(userSubscriptions)
		.where(eq(userSubscriptions.status, "active"))
		.groupBy(userSubscriptions.billingProvider);

	return {
		byPlan: byPlan.map((p) => ({
			planId: p.planId,
			name: getPlanName(p.planId),
			count: Number(p.count),
		})),
		mrr,
		byProvider: byProvider.map((p) => ({ provider: p.provider, count: Number(p.count) })),
		totalPaying,
	};
}

// Conversation metrics
async function getConversationMetrics(db: ReturnType<typeof getDb>, start: Date, end: Date) {
	// Total conversations
	const [totalResult] = await db.select({ count: count() }).from(conversations);

	// Conversations in period
	const [inPeriodResult] = await db
		.select({ count: count() })
		.from(conversations)
		.where(and(gte(conversations.createdAt, start), lte(conversations.createdAt, end)));

	// Daily trend
	const daily = await db
		.select({
			date: sql<string>`DATE(${conversations.createdAt})`,
			count: count(),
		})
		.from(conversations)
		.where(and(gte(conversations.createdAt, start), lte(conversations.createdAt, end)))
		.groupBy(sql`DATE(${conversations.createdAt})`)
		.orderBy(sql`DATE(${conversations.createdAt})`);

	// By channel
	const byChannel = await db
		.select({
			channel: conversations.channel,
			count: count(),
		})
		.from(conversations)
		.where(and(gte(conversations.createdAt, start), lte(conversations.createdAt, end)))
		.groupBy(conversations.channel);

	// Messages in period
	const [messagesResult] = await db
		.select({ count: count() })
		.from(chatMessages)
		.where(and(gte(chatMessages.createdAt, start), lte(chatMessages.createdAt, end)));

	return {
		total: Number(totalResult?.count) || 0,
		inPeriod: Number(inPeriodResult?.count) || 0,
		messagesInPeriod: Number(messagesResult?.count) || 0,
		daily: daily.map((d) => ({ date: d.date, count: Number(d.count) })),
		byChannel: byChannel.map((c) => ({ channel: c.channel, count: Number(c.count) })),
	};
}

// LLM usage metrics
async function getLLMMetrics(db: ReturnType<typeof getDb>, start: Date, end: Date) {
	// Total cost and tokens in period
	const [totals] = await db
		.select({
			cost: sum(llmUsage.costCents),
			inputTokens: sum(llmUsage.inputTokens),
			outputTokens: sum(llmUsage.outputTokens),
			calls: count(),
		})
		.from(llmUsage)
		.where(and(gte(llmUsage.createdAt, start), lte(llmUsage.createdAt, end)));

	// By tier
	const byTier = await db
		.select({
			tier: llmUsage.tier,
			cost: sum(llmUsage.costCents),
			calls: count(),
		})
		.from(llmUsage)
		.where(and(gte(llmUsage.createdAt, start), lte(llmUsage.createdAt, end)))
		.groupBy(llmUsage.tier);

	// By model
	const byModel = await db
		.select({
			model: llmUsage.model,
			cost: sum(llmUsage.costCents),
			inputTokens: sum(llmUsage.inputTokens),
			outputTokens: sum(llmUsage.outputTokens),
			calls: count(),
		})
		.from(llmUsage)
		.where(and(gte(llmUsage.createdAt, start), lte(llmUsage.createdAt, end)))
		.groupBy(llmUsage.model)
		.orderBy(desc(sum(llmUsage.costCents)));

	// Daily cost trend
	const daily = await db
		.select({
			date: sql<string>`DATE(${llmUsage.createdAt})`,
			cost: sum(llmUsage.costCents),
			calls: count(),
		})
		.from(llmUsage)
		.where(and(gte(llmUsage.createdAt, start), lte(llmUsage.createdAt, end)))
		.groupBy(sql`DATE(${llmUsage.createdAt})`)
		.orderBy(sql`DATE(${llmUsage.createdAt})`);

	// Daily cost by tier (for stacked chart)
	const dailyByTier = await db
		.select({
			date: sql<string>`DATE(${llmUsage.createdAt})`,
			tier: llmUsage.tier,
			cost: sum(llmUsage.costCents),
		})
		.from(llmUsage)
		.where(and(gte(llmUsage.createdAt, start), lte(llmUsage.createdAt, end)))
		.groupBy(sql`DATE(${llmUsage.createdAt})`, llmUsage.tier)
		.orderBy(sql`DATE(${llmUsage.createdAt})`);

	// Transform daily by tier to format suitable for stacked chart
	const dailyMap = new Map<string, { date: string; balanced: number; high_quality: number }>();
	for (const row of dailyByTier) {
		const existing = dailyMap.get(row.date) || { date: row.date, balanced: 0, high_quality: 0 };
		if (row.tier === "balanced") {
			existing.balanced = Number(row.cost) || 0;
		} else if (row.tier === "high_quality") {
			existing.high_quality = Number(row.cost) || 0;
		}
		dailyMap.set(row.date, existing);
	}

	return {
		totalCostCents: Number(totals?.cost) || 0,
		totalInputTokens: Number(totals?.inputTokens) || 0,
		totalOutputTokens: Number(totals?.outputTokens) || 0,
		totalCalls: Number(totals?.calls) || 0,
		byTier: byTier.map((t) => ({
			tier: t.tier,
			costCents: Number(t.cost) || 0,
			calls: Number(t.calls) || 0,
		})),
		byModel: byModel.map((m) => ({
			model: m.model,
			costCents: Number(m.cost) || 0,
			inputTokens: Number(m.inputTokens) || 0,
			outputTokens: Number(m.outputTokens) || 0,
			calls: Number(m.calls) || 0,
		})),
		daily: daily.map((d) => ({
			date: d.date,
			costCents: Number(d.cost) || 0,
			calls: Number(d.calls) || 0,
		})),
		dailyByTier: Array.from(dailyMap.values()),
	};
}

// Get recently created accounts
admin.get("/recent-accounts", async (c) => {
	const db = getDb();
	const limit = Number(c.req.query("limit")) || 5;

	const recentUsers = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
			createdAt: users.createdAt,
			planId: userSubscriptions.planId,
		})
		.from(users)
		.leftJoin(userSubscriptions, eq(userSubscriptions.userId, users.id))
		.orderBy(desc(users.createdAt))
		.limit(limit);

	return c.json({
		accounts: recentUsers.map((u) => ({
			id: u.id,
			email: u.email,
			name: u.name,
			createdAt: u.createdAt?.toISOString() ?? null,
			plan: u.planId ? getPlanName(u.planId) : "Free",
		})),
	});
});

// Get top agents by usage
admin.get("/top-agents", async (c) => {
	const db = getDb();
	const limit = Number(c.req.query("limit")) || 10;

	const topAgents = await db
		.select({
			agentId: agents.id,
			agentName: agents.name,
			ownerEmail: users.email,
			conversationCount: count(conversations.id),
		})
		.from(agents)
		.leftJoin(users, eq(agents.userId, users.id))
		.leftJoin(conversations, eq(conversations.agentId, agents.id))
		.groupBy(agents.id, agents.name, users.email)
		.orderBy(desc(count(conversations.id)))
		.limit(limit);

	return c.json({
		agents: topAgents.map((a) => ({
			id: a.agentId,
			name: a.agentName,
			ownerEmail: a.ownerEmail,
			conversationCount: Number(a.conversationCount) || 0,
		})),
	});
});

export { admin };
