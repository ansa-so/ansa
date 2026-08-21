// =============================================================================
// PLAN LIMITS - Single Source of Truth
// =============================================================================
// All plan restrictions are defined here. Update this file to change limits
// across the entire application.
// =============================================================================

import { AI_QUALITY_TIERS, type AIQuality } from "@ansa/types";

// AI Quality tiers available per plan
export const PLAN_AI_QUALITY: Record<string, readonly AIQuality[]> = {
	free: [AI_QUALITY_TIERS.BALANCED], // Free users only get balanced
	starter: [AI_QUALITY_TIERS.BALANCED], // Starter users only get balanced
	growth: [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.HIGH_QUALITY], // Growth gets both
	pro: [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.HIGH_QUALITY], // Pro gets both
	enterprise: [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.HIGH_QUALITY], // Enterprise gets both
} as const;

// Storage limits in bytes (-1 = unlimited)
export const STORAGE_LIMITS = {
	free: 400 * 1024, // 400KB
	starter: 5 * 1024 * 1024, // 5MB
	growth: 34 * 1024 * 1024, // 34MB
	pro: 100 * 1024 * 1024, // 100MB
	enterprise: -1, // Unlimited
} as const;

// Tool limits per agent (-1 = unlimited)
export const TOOL_LIMITS = {
	free: 1,
	starter: 3,
	growth: 10,
	pro: -1, // Unlimited
	enterprise: -1, // Unlimited
} as const;

// Web source URL limits per account (-1 = unlimited)
export const WEB_SOURCE_LIMITS = {
	free: 10,
	starter: 50,
	growth: 200,
	pro: -1, // Unlimited
	enterprise: -1, // Unlimited
} as const;

// Conversation rate limits (per-conversation AI response limits)
export const CONVERSATION_RATE_LIMITS = {
	MAX_AI_RESPONSES: 50, // Maximum AI responses per conversation before auto-escalation
	WARNING_THRESHOLD: 45, // Warning threshold for approaching limit
	ADMIN_MONITOR_THRESHOLD: 30, // Show conversations in admin dashboard when they exceed this
} as const;

// Complete plan configuration
export const PLAN_LIMITS = {
	free: {
		name: "Free",
		price: 0,
		messages: 75,
		agents: 1,
		tools: TOOL_LIMITS.free,
		storage: STORAGE_LIMITS.free,
		aiQuality: PLAN_AI_QUALITY.free,
		webSources: WEB_SOURCE_LIMITS.free,
		canRemoveBranding: false, // "Powered by Ansa" always shown
		hasEscalation: false, // Escalation feature not available
		hasEmailChannel: false, // Email channel not available
		hasMessengerChannel: false, // Facebook Messenger not available
	},
	starter: {
		name: "Starter",
		price: 29,
		messages: 2000,
		agents: 1,
		tools: TOOL_LIMITS.starter,
		storage: STORAGE_LIMITS.starter,
		aiQuality: PLAN_AI_QUALITY.starter,
		webSources: WEB_SOURCE_LIMITS.starter,
		canRemoveBranding: false,
		hasEscalation: false, // Escalation feature not available
		hasEmailChannel: false, // Email channel not available
		hasMessengerChannel: false, // Facebook Messenger not available
	},
	growth: {
		name: "Growth",
		price: 99,
		messages: 15000,
		agents: 3,
		tools: TOOL_LIMITS.growth,
		storage: STORAGE_LIMITS.growth,
		aiQuality: PLAN_AI_QUALITY.growth,
		webSources: WEB_SOURCE_LIMITS.growth,
		canRemoveBranding: true,
		hasEscalation: true, // Escalation feature available
		hasEmailChannel: true, // Email channel available
		hasMessengerChannel: true, // Facebook Messenger available
	},
	pro: {
		name: "Pro",
		price: 299,
		messages: 50000,
		agents: -1, // Unlimited
		tools: TOOL_LIMITS.pro,
		storage: STORAGE_LIMITS.pro,
		aiQuality: PLAN_AI_QUALITY.pro,
		webSources: WEB_SOURCE_LIMITS.pro,
		canRemoveBranding: true,
		hasEscalation: true, // Escalation feature available
		hasEmailChannel: true, // Email channel available
		hasMessengerChannel: true, // Facebook Messenger available
	},
	enterprise: {
		name: "Enterprise",
		price: -1, // Custom pricing
		messages: -1, // Unlimited
		agents: -1, // Unlimited
		tools: TOOL_LIMITS.enterprise,
		storage: STORAGE_LIMITS.enterprise,
		aiQuality: PLAN_AI_QUALITY.enterprise,
		webSources: WEB_SOURCE_LIMITS.enterprise,
		canRemoveBranding: true,
		hasEscalation: true, // Escalation feature available
		hasEmailChannel: true, // Email channel available
		hasMessengerChannel: true, // Facebook Messenger available
	},
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;
export type PlanConfig = (typeof PLAN_LIMITS)[PlanId];

// Extended plan config for self-hosted mode
interface ExtendedPlanConfig {
	name: string;
	price: number;
	messages: number;
	agents: number;
	tools: number;
	storage: number;
	aiQuality: readonly AIQuality[];
	webSources: number;
	canRemoveBranding: boolean;
	hasEscalation: boolean;
	hasEmailChannel: boolean;
	hasMessengerChannel: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

// Check if running in self-hosted mode (bypasses all limits)
export function isSelfHosted(): boolean {
	return process.env.SELF_HOSTED === "true";
}

// Get the effective plan limits (returns unlimited for self-hosted)
export function getEffectivePlanLimits(planId: string): ExtendedPlanConfig {
	if (isSelfHosted()) {
		return {
			name: "Self-Hosted",
			price: 0,
			messages: -1,
			agents: -1,
			tools: -1,
			storage: -1,
			aiQuality: [AI_QUALITY_TIERS.BALANCED, AI_QUALITY_TIERS.HIGH_QUALITY],
			webSources: -1,
			canRemoveBranding: true,
			hasEscalation: true, // Self-hosted always has escalation
			hasEmailChannel: true, // Self-hosted always has email channel
			hasMessengerChannel: true, // Self-hosted always has Facebook Messenger
		};
	}
	return PLAN_LIMITS[planId as PlanId] ?? PLAN_LIMITS.free;
}

export function getPlanLimit(planId: string): number {
	return getEffectivePlanLimits(planId).messages;
}

export function getAgentLimit(planId: string): number {
	return getEffectivePlanLimits(planId).agents;
}

export function getToolLimit(planId: string): number {
	return getEffectivePlanLimits(planId).tools;
}

export function getStorageLimit(planId: string): number {
	return getEffectivePlanLimits(planId).storage;
}

export function getWebSourceLimit(planId: string): number {
	return getEffectivePlanLimits(planId).webSources;
}

export function getAvailableAIQuality(planId: string): readonly AIQuality[] {
	return getEffectivePlanLimits(planId).aiQuality;
}

export function getPlanName(planId: string): string {
	return PLAN_LIMITS[planId as PlanId]?.name ?? "Free";
}

export function getPlanPrice(planId: string): number {
	return PLAN_LIMITS[planId as PlanId]?.price ?? 0;
}

// Format storage size for display
export function formatStorageSize(bytes: number): string {
	if (bytes === -1) return "Unlimited";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
	if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
	return `${Math.round(bytes / (1024 * 1024 * 1024))} GB`;
}

// Format limit for display (-1 = Unlimited)
export function formatLimit(value: number): string {
	return value === -1 ? "Unlimited" : value.toLocaleString();
}

// Map price ID to plan ID
export function mapPriceToPlan(priceId: string): PlanId {
	// Check both monthly and yearly prices for each plan
	if (
		priceId === process.env.STRIPE_PRICE_STARTER_MONTHLY ||
		priceId === process.env.STRIPE_PRICE_STARTER_YEARLY
	) {
		return "starter";
	}
	if (
		priceId === process.env.STRIPE_PRICE_GROWTH_MONTHLY ||
		priceId === process.env.STRIPE_PRICE_GROWTH_YEARLY
	) {
		return "growth";
	}
	if (
		priceId === process.env.STRIPE_PRICE_PRO_MONTHLY ||
		priceId === process.env.STRIPE_PRICE_PRO_YEARLY
	) {
		return "pro";
	}
	return "free";
}

export function canRemoveBranding(planId: string): boolean {
	return getEffectivePlanLimits(planId).canRemoveBranding;
}

export function hasEscalation(planId: string): boolean {
	return getEffectivePlanLimits(planId).hasEscalation;
}

export function getAllPlans() {
	return Object.entries(PLAN_LIMITS).map(([id, plan]) => ({
		id,
		name: plan.name,
		price: plan.price,
		messages: plan.messages,
		agents: plan.agents,
		tools: plan.tools,
		storage: plan.storage,
		storageFormatted: formatStorageSize(plan.storage),
		aiQuality: plan.aiQuality,
		canRemoveBranding: plan.canRemoveBranding,
		hasEscalation: plan.hasEscalation,
		hasEmailChannel: plan.hasEmailChannel,
		hasMessengerChannel: plan.hasMessengerChannel,
		stripePriceId: getStripePriceId(id, "monthly"),
		stripePriceIdMonthly: getStripePriceId(id, "monthly"),
		stripePriceIdYearly: getStripePriceId(id, "yearly"),
	}));
}

// Get Stripe price ID for a plan
export function getStripePriceId(
	planId: string,
	interval: "monthly" | "yearly" = "monthly",
): string | null {
	const suffix = interval === "yearly" ? "_YEARLY" : "_MONTHLY";
	switch (planId) {
		case "starter":
			return process.env[`STRIPE_PRICE_STARTER${suffix}`] || null;
		case "growth":
			return process.env[`STRIPE_PRICE_GROWTH${suffix}`] || null;
		case "pro":
			return process.env[`STRIPE_PRICE_PRO${suffix}`] || null;
		default:
			return null;
	}
}

/**
 * Get a user's active plan from database.
 * Checks subscription status to ensure only active subscriptions grant access.
 * Works for both Stripe and Shopify billing providers.
 */
export async function getUserPlan(userId: string): Promise<{
	planId: PlanId;
	billingProvider: "stripe" | "shopify" | null;
	isActive: boolean;
}> {
	// Self-hosted mode bypasses all limits
	if (isSelfHosted()) {
		return {
			planId: "enterprise",
			billingProvider: null,
			isActive: true,
		};
	}

	// Dynamic import to avoid circular dependencies
	const { getDb, userSubscriptions, eq } = await import("@ansa/db");
	const db = getDb();

	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	if (!subscription) {
		return {
			planId: "free",
			billingProvider: null,
			isActive: true,
		};
	}

	// Grace period: canceled subscription still grants plan access until billingPeriodEnd
	const isActive = subscription.status === "active";
	const inGracePeriod =
		subscription.cancelAtPeriodEnd &&
		subscription.billingPeriodEnd &&
		new Date() <= subscription.billingPeriodEnd;
	const grantsPlanAccess = isActive || inGracePeriod;

	return {
		planId: grantsPlanAccess ? (subscription.planId as PlanId) : "free",
		billingProvider: subscription.billingProvider as "stripe" | "shopify",
		isActive: grantsPlanAccess,
	};
}

// =============================================================================
// Downgrade Check
// =============================================================================

export interface DowngradeBlocker {
	type: "agents" | "storage" | "tools" | "webSources" | "model" | "aiQuality";
	current: number | string;
	limit: number | string;
	message: string;
	agentId?: string;
	agentName?: string;
}

export interface DowngradeCheckResult {
	canDowngrade: boolean;
	blockers: DowngradeBlocker[];
}

// Plan hierarchy by price (for determining if it's a downgrade)
const PLAN_HIERARCHY: Record<string, number> = {
	free: 0,
	starter: 29,
	growth: 99,
	pro: 299,
	enterprise: 999,
};

/**
 * Check if switching from currentPlan to targetPlan is a downgrade
 */
export function isDowngrade(currentPlanId: string, targetPlanId: string): boolean {
	const currentRank = PLAN_HIERARCHY[currentPlanId] ?? 0;
	const targetRank = PLAN_HIERARCHY[targetPlanId] ?? 0;
	return targetRank < currentRank;
}

/**
 * Check if a user can downgrade to a target plan.
 * Returns blockers if their current usage exceeds the target plan limits.
 */
export async function checkDowngrade(
	userId: string,
	targetPlanId: string,
): Promise<DowngradeCheckResult> {
	// Self-hosted mode has no restrictions
	if (isSelfHosted()) {
		return { canDowngrade: true, blockers: [] };
	}

	const targetLimits = getEffectivePlanLimits(targetPlanId);
	const targetAIQuality = getAvailableAIQuality(targetPlanId);
	const blockers: DowngradeBlocker[] = [];

	// Dynamic import to avoid circular dependencies
	const {
		getDb,
		agents,
		agentTools,
		documents,
		qaSources,
		textSources,
		webSources,
		eq,
		inArray,
		count,
		sql,
	} = await import("@ansa/db");
	const db = getDb();

	// 1. Check agent count
	if (targetLimits.agents !== -1) {
		const [agentCount] = await db
			.select({ count: count() })
			.from(agents)
			.where(eq(agents.userId, userId));

		if ((agentCount?.count ?? 0) > targetLimits.agents) {
			blockers.push({
				type: "agents",
				current: agentCount?.count ?? 0,
				limit: targetLimits.agents,
				message: `You have ${agentCount?.count} agents, but ${targetLimits.name} plan allows only ${targetLimits.agents}`,
			});
		}
	}

	// Get all user's agents for subsequent checks
	const userAgents = await db
		.select({ id: agents.id, name: agents.name, aiQuality: agents.aiQuality })
		.from(agents)
		.where(eq(agents.userId, userId));
	const agentIds = userAgents.map((a) => a.id);

	// 2. Check storage usage
	if (targetLimits.storage !== -1 && agentIds.length > 0) {
		// Calculate total storage from documents, QA sources, and text sources
		const [docStorage] = await db
			.select({ total: sql<number>`COALESCE(SUM(size), 0)` })
			.from(documents)
			.where(inArray(documents.agentId, agentIds));

		const [qaStorage] = await db
			.select({ total: sql<number>`COALESCE(SUM(LENGTH(questions::text) + LENGTH(answer)), 0)` })
			.from(qaSources)
			.where(inArray(qaSources.agentId, agentIds));

		const [textStorage] = await db
			.select({ total: sql<number>`COALESCE(SUM(LENGTH(content)), 0)` })
			.from(textSources)
			.where(inArray(textSources.agentId, agentIds));

		const totalStorage =
			(Number(docStorage?.total) || 0) +
			(Number(qaStorage?.total) || 0) +
			(Number(textStorage?.total) || 0);

		if (totalStorage > targetLimits.storage) {
			blockers.push({
				type: "storage",
				current: formatStorageSize(totalStorage),
				limit: formatStorageSize(targetLimits.storage),
				message: `You're using ${formatStorageSize(totalStorage)}, but ${targetLimits.name} plan allows only ${formatStorageSize(targetLimits.storage)}`,
			});
		}
	}

	// 3. Check web sources count
	if (targetLimits.webSources !== -1 && agentIds.length > 0) {
		const [webSourceCount] = await db
			.select({ count: count() })
			.from(webSources)
			.where(inArray(webSources.agentId, agentIds));

		if ((webSourceCount?.count ?? 0) > targetLimits.webSources) {
			blockers.push({
				type: "webSources",
				current: webSourceCount?.count ?? 0,
				limit: targetLimits.webSources,
				message: `You have ${webSourceCount?.count} web sources, but ${targetLimits.name} plan allows only ${targetLimits.webSources}`,
			});
		}
	}

	// 4. Check tools per agent
	if (targetLimits.tools !== -1) {
		for (const agent of userAgents) {
			const [toolCount] = await db
				.select({ count: count() })
				.from(agentTools)
				.where(eq(agentTools.agentId, agent.id));

			if ((toolCount?.count ?? 0) > targetLimits.tools) {
				blockers.push({
					type: "tools",
					current: toolCount?.count ?? 0,
					limit: targetLimits.tools,
					message: `Agent "${agent.name}" has ${toolCount?.count} tools, but ${targetLimits.name} plan allows only ${targetLimits.tools} per agent`,
					agentId: agent.id,
					agentName: agent.name,
				});
			}
		}
	}

	// 5. Check AI quality tiers in use
	for (const agent of userAgents) {
		if (agent.aiQuality && !targetAIQuality.includes(agent.aiQuality as AIQuality)) {
			blockers.push({
				type: "aiQuality",
				current: agent.aiQuality,
				limit: targetAIQuality.join(", "),
				message: `Agent "${agent.name}" uses ${agent.aiQuality} AI quality, which is not available on ${targetLimits.name} plan`,
				agentId: agent.id,
				agentName: agent.name,
			});
		}
	}

	return {
		canDowngrade: blockers.length === 0,
		blockers,
	};
}

/**
 * Restore branding for all agents when user downgrades to a plan that doesn't allow branding removal
 */
export async function restoreBrandingForUser(userId: string): Promise<void> {
	const { getDb, agents, interfaceSettings, eq } = await import("@ansa/db");
	const db = getDb();

	// Get all user's agents
	const userAgents = await db
		.select({ id: agents.id })
		.from(agents)
		.where(eq(agents.userId, userId));

	// Update interface settings to show branding
	for (const agent of userAgents) {
		await db
			.update(interfaceSettings)
			.set({ updatedAt: new Date() })
			.where(eq(interfaceSettings.agentId, agent.id));
	}

	console.log(`[plans] Restored branding for ${userAgents.length} agents of user ${userId}`);
}
