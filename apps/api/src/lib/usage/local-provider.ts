import {
	agents,
	and,
	count,
	documents,
	eq,
	getDb,
	gte,
	inArray,
	qaSources,
	shopifyShops,
	sum,
	textSources,
	usageEvents,
	userSubscriptions,
	webSourcePages,
	webSources,
} from "@ansa/db";
import { getPlanLimit, getStorageLimit } from "../plans";
import type { CanSendResult, UsageData, UsageProvider } from "./types";

// In-memory TTL cache for Shopify reconciliation (avoids querying Shopify on every request)
const reconcileCache = new Map<string, number>();
const RECONCILE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class LocalUsageProvider implements UsageProvider {
	async trackMessage(userId: string, metadata?: Record<string, unknown>): Promise<void> {
		const db = getDb();
		const subscription = await this.getSubscription(userId);

		await db.insert(usageEvents).values({
			userId,
			eventType: "message",
			metadata,
			billingPeriodStart: subscription.billingPeriodStart,
		});
	}

	async getUsage(userId: string): Promise<UsageData> {
		const db = getDb();
		const subscription = await this.getSubscription(userId);

		// For free plan, count all messages (lifetime), not just current billing period
		const whereConditions = [eq(usageEvents.userId, userId), eq(usageEvents.eventType, "message")];

		if (subscription.planId !== "free") {
			whereConditions.push(gte(usageEvents.billingPeriodStart, subscription.billingPeriodStart));
		}

		const [result] = await db
			.select({ count: count() })
			.from(usageEvents)
			.where(and(...whereConditions));

		return {
			used: result?.count ?? 0,
			limit: getPlanLimit(subscription.planId),
			planId: subscription.planId,
			billingPeriodStart: subscription.billingPeriodStart,
			billingPeriodEnd: subscription.billingPeriodEnd,
			hasSubscription: subscription.hasSubscription,
			hasPlanSelected: subscription.hasPlanSelected,
			storageUsed: await this.getStorageUsed(userId),
			storageLimit: getStorageLimit(subscription.planId),
			billingProvider: subscription.billingProvider ?? null,
			cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
		};
	}

	async getStorageUsed(userId: string): Promise<number> {
		const db = getDb();

		// Get all agents owned by this user
		const userAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.userId, userId));

		if (userAgents.length === 0) return 0;

		const agentIds = userAgents.map((a) => a.id);

		// Calculate document sizes
		const [docSize] = await db
			.select({ total: sum(documents.size) })
			.from(documents)
			.where(inArray(documents.agentId, agentIds));

		// Calculate text source sizes (from content column)
		const textSourcesData = await db
			.select({ content: textSources.content })
			.from(textSources)
			.where(inArray(textSources.agentId, agentIds));
		const textSize = textSourcesData.reduce(
			(acc, ts) => acc + new TextEncoder().encode(ts.content || "").length,
			0,
		);

		// Calculate Q&A source sizes
		const qaSourcesData = await db
			.select({ questions: qaSources.questions, answer: qaSources.answer })
			.from(qaSources)
			.where(inArray(qaSources.agentId, agentIds));
		const qaSize = qaSourcesData.reduce((acc, qa) => {
			const questionsSize = qa.questions.reduce(
				(qAcc, q) => qAcc + new TextEncoder().encode(q).length,
				0,
			);
			const answerSize = new TextEncoder().encode(qa.answer || "").length;
			return acc + questionsSize + answerSize;
		}, 0);

		// Calculate web source page sizes
		const userWebSources = await db
			.select({ id: webSources.id })
			.from(webSources)
			.where(inArray(webSources.agentId, agentIds));

		let webSize = 0;
		if (userWebSources.length > 0) {
			const webSourceIds = userWebSources.map((ws) => ws.id);
			const [webPageSize] = await db
				.select({ total: sum(webSourcePages.contentSize) })
				.from(webSourcePages)
				.where(inArray(webSourcePages.webSourceId, webSourceIds));
			webSize = Number(webPageSize?.total) || 0;
		}

		return (Number(docSize?.total) || 0) + textSize + qaSize + webSize;
	}

	async canSendMessage(userId: string): Promise<CanSendResult> {
		const { used, limit } = await this.getUsage(userId);

		// -1 means unlimited
		if (limit !== -1 && used >= limit) {
			return {
				allowed: false,
				reason: `You've reached your monthly limit of ${limit.toLocaleString()} messages. Please upgrade your plan to continue.`,
				used,
				limit,
			};
		}

		return { allowed: true, used, limit };
	}

	/**
	 * Reconcile local subscription with Shopify's actual subscription.
	 * Called for Shopify users when planId is "free" to catch missed billing callbacks.
	 */
	private async reconcileShopifySubscription(
		userId: string,
		shop: { shopDomain: string; accessToken: string },
	): Promise<{ planId: string; chargeId: string; periodEnd: Date } | null> {
		// Throttle: skip if we checked recently
		const lastCheck = reconcileCache.get(userId);
		if (lastCheck && Date.now() - lastCheck < RECONCILE_TTL_MS) {
			return null;
		}
		reconcileCache.set(userId, Date.now());

		try {
			const { getActiveShopSubscription, SHOPIFY_PLAN_NAME_MAP } = await import("../shopify");
			const activeSub = await getActiveShopSubscription({
				shop: shop.shopDomain,
				accessToken: shop.accessToken,
			});

			if (!activeSub) return null;

			const planId = SHOPIFY_PLAN_NAME_MAP[activeSub.name];
			if (!planId || planId === "free") return null;

			console.log(
				`[Usage] Reconciling Shopify subscription for user ${userId}: Shopify has "${activeSub.name}" (${planId})`,
			);

			// Upsert the local subscription row
			const db = getDb();
			const now = new Date();
			const [existing] = await db
				.select()
				.from(userSubscriptions)
				.where(eq(userSubscriptions.userId, userId))
				.limit(1);

			if (existing) {
				await db
					.update(userSubscriptions)
					.set({
						planId,
						status: "active",
						billingProvider: "shopify",
						shopifyChargeId: activeSub.id,
						billingPeriodEnd: activeSub.currentPeriodEnd,
						cancelAtPeriodEnd: false,
						updatedAt: now,
					})
					.where(eq(userSubscriptions.userId, userId));
			} else {
				await db.insert(userSubscriptions).values({
					userId,
					planId,
					status: "active",
					billingProvider: "shopify",
					shopifyChargeId: activeSub.id,
					billingPeriodStart: now,
					billingPeriodEnd: activeSub.currentPeriodEnd,
				});
			}

			return { planId, chargeId: activeSub.id, periodEnd: activeSub.currentPeriodEnd };
		} catch (err) {
			console.warn(
				`[Usage] Shopify reconciliation failed for user ${userId}:`,
				err instanceof Error ? err.message : err,
			);
			return null;
		}
	}

	private async getSubscription(userId: string) {
		const db = getDb();
		const [subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1);

		if (subscription) {
			// Grace period check: if canceled but billing period still active, keep the paid plan.
			// Once billingPeriodEnd passes, treat as free.
			let effectivePlanId = subscription.planId;
			if (
				subscription.cancelAtPeriodEnd &&
				subscription.billingPeriodEnd &&
				new Date() > subscription.billingPeriodEnd
			) {
				effectivePlanId = "free";
			}

			// Shopify reconciliation: if local says "free" but Shopify may have an active plan
			if (effectivePlanId === "free" && subscription.billingProvider === "shopify") {
				const [shop] = await db
					.select()
					.from(shopifyShops)
					.where(and(eq(shopifyShops.userId, userId), eq(shopifyShops.status, "active")))
					.limit(1);

				if (shop) {
					const reconciled = await this.reconcileShopifySubscription(userId, shop);
					if (reconciled) {
						effectivePlanId = reconciled.planId;
						subscription.shopifyChargeId = reconciled.chargeId;
						subscription.status = "active";
						subscription.cancelAtPeriodEnd = false;
					}
				}
			}

			// Only consider it a "subscription" if there's an active paid plan
			// Free plans and canceled subscriptions should go through checkout, not portal
			const hasPaidSubscription =
				!!subscription.stripeSubscriptionId || !!subscription.shopifyChargeId;
			const hasActiveSubscription = hasPaidSubscription && subscription.status === "active";
			// Canceled-but-in-grace-period subscriptions should still show as having a subscription
			const inGracePeriod =
				subscription.cancelAtPeriodEnd &&
				subscription.billingPeriodEnd &&
				new Date() <= subscription.billingPeriodEnd;
			// hasPlanSelected is true if user has chosen any plan (including free)
			return {
				...subscription,
				planId: effectivePlanId,
				hasSubscription: hasActiveSubscription || inGracePeriod,
				hasPlanSelected: true,
			};
		}

		// No subscription row — check if this is a Shopify user (safety net).
		// Shopify users should always have a subscription row created during
		// OAuth callback, but this handles pre-existing installs.
		const [shopifyShop] = await db
			.select()
			.from(shopifyShops)
			.where(and(eq(shopifyShops.userId, userId), eq(shopifyShops.status, "active")))
			.limit(1);

		const now = new Date();
		const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		if (shopifyShop) {
			// Shopify user without a subscription row — try reconciling with Shopify first
			const reconciled = await this.reconcileShopifySubscription(userId, shopifyShop);
			if (reconciled) {
				return {
					userId,
					planId: reconciled.planId,
					billingPeriodStart: now,
					billingPeriodEnd: reconciled.periodEnd,
					hasSubscription: true,
					hasPlanSelected: true,
					billingProvider: "shopify",
					cancelAtPeriodEnd: false,
				};
			}

			// No active Shopify sub — treat as free
			return {
				userId,
				planId: "free",
				billingPeriodStart,
				billingPeriodEnd,
				hasSubscription: false,
				hasPlanSelected: true,
				billingProvider: "shopify",
				cancelAtPeriodEnd: false,
			};
		}

		// Default to free plan with current month billing period
		return {
			userId,
			planId: "free",
			billingPeriodStart,
			billingPeriodEnd,
			hasSubscription: false,
			hasPlanSelected: false,
			billingProvider: null,
			cancelAtPeriodEnd: false,
		};
	}
}

export const usageProvider = new LocalUsageProvider();
