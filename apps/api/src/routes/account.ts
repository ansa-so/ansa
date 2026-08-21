import { agents, eq, getDb, shopifyShops, userSubscriptions, users } from "@ansa/db";
import { Hono } from "hono";
import { authMiddleware, requireAuth } from "../middleware/auth";

const account = new Hono();

// Helper to get user from context
function getUser(c: { get: (key: string) => unknown }): { id: string } {
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		throw new Error("User not authenticated");
	}
	return user;
}

/**
 * DELETE /account
 * Permanently deletes the user account and all associated data.
 * The database cascade will handle:
 * - agents (and their tools, documents, settings, etc.)
 * - sessions
 * - accounts (OAuth connections)
 * - userSubscriptions
 * - shopifyShops
 * - usageEvents
 */
account.delete("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	try {
		console.log(`[account] Starting account deletion for user ${user.id}`);

		// First, cancel any active Stripe subscriptions
		const [subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, user.id))
			.limit(1);

		if (subscription?.stripeSubscriptionId && subscription.billingProvider === "stripe") {
			try {
				const Stripe = (await import("stripe")).default;
				const stripe = process.env.STRIPE_SECRET_KEY
					? new Stripe(process.env.STRIPE_SECRET_KEY)
					: null;

				if (stripe) {
					await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
					console.log(
						`[account] Cancelled Stripe subscription ${subscription.stripeSubscriptionId}`,
					);
				}
			} catch (stripeErr) {
				console.error("[account] Failed to cancel Stripe subscription:", stripeErr);
				// Continue with deletion even if Stripe cancellation fails
			}
		}

		// Delete the user - cascades will handle related records
		// Note: The database has ON DELETE CASCADE for most relations
		await db.delete(users).where(eq(users.id, user.id));

		console.log(`[account] Successfully deleted user ${user.id} and all related data`);

		return c.json({ success: true, message: "Account deleted successfully" });
	} catch (err) {
		console.error("[account] Failed to delete account:", err);
		return c.json({ error: "Failed to delete account" }, 500);
	}
});

/**
 * GET /account
 * Get current user account info
 */
account.get("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	try {
		const [userData] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

		if (!userData) {
			return c.json({ error: "User not found" }, 404);
		}

		// Get subscription info
		const [subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, user.id))
			.limit(1);

		// Get connected Shopify shops count
		const shopifyShopsData = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.userId, user.id));

		// Get agents count
		const agentsData = await db.select().from(agents).where(eq(agents.userId, user.id));

		return c.json({
			id: userData.id,
			email: userData.email,
			name: userData.name,
			image: userData.image,
			timezone: userData.timezone,
			createdAt: userData.createdAt,
			subscription: subscription
				? {
						planId: subscription.planId,
						status: subscription.status,
						billingProvider: subscription.billingProvider,
					}
				: null,
			stats: {
				agentsCount: agentsData.length,
				shopifyShopsCount: shopifyShopsData.length,
			},
		});
	} catch (err) {
		console.error("[account] Failed to get account:", err);
		return c.json({ error: "Failed to get account info" }, 500);
	}
});

/**
 * PUT /account/timezone
 * Update the user's timezone (called automatically from frontend)
 * Only sets timezone once - if already set, it won't be overwritten
 */
account.put("/timezone", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	try {
		const body = await c.req.json();
		const { timezone } = body;

		if (!timezone || typeof timezone !== "string") {
			return c.json({ error: "Invalid timezone" }, 400);
		}

		// Validate timezone by trying to use it
		try {
			new Intl.DateTimeFormat("en-US", { timeZone: timezone });
		} catch {
			return c.json({ error: "Invalid timezone format" }, 400);
		}

		// Check if user already has a timezone set - only set it once
		const [currentUser] = await db
			.select({ timezone: users.timezone })
			.from(users)
			.where(eq(users.id, user.id))
			.limit(1);

		if (currentUser?.timezone) {
			// Timezone already set, don't overwrite
			return c.json({ success: true, timezone: currentUser.timezone, alreadySet: true });
		}

		await db.update(users).set({ timezone, updatedAt: new Date() }).where(eq(users.id, user.id));

		console.log(`[account] Set timezone for user ${user.id} to ${timezone}`);

		return c.json({ success: true, timezone });
	} catch (err) {
		console.error("[account] Failed to update timezone:", err);
		return c.json({ error: "Failed to update timezone" }, 500);
	}
});

export { account as accountRoute };
