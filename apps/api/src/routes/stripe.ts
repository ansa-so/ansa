import { eq, getDb, userSubscriptions } from "@ansa/db";
import { Hono } from "hono";
import Stripe from "stripe";
import {
	checkDowngrade,
	getUserPlan,
	isDowngrade,
	mapPriceToPlan,
	restoreBrandingForUser,
} from "../lib/plans";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const isSelfHosted = process.env.SELF_HOSTED === "true";

// Shared helper: upsert subscription record from a Stripe Subscription object
async function activateSubscription(
	userId: string,
	subscription: Stripe.Subscription,
	customerId: string,
	db: ReturnType<typeof getDb>,
) {
	const priceId = subscription.items.data[0]?.price.id as string;
	const planId = mapPriceToPlan(priceId);

	const periodStart = subscription.current_period_start
		? new Date(subscription.current_period_start * 1000)
		: new Date();
	const periodEnd = subscription.current_period_end
		? new Date(subscription.current_period_end * 1000)
		: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

	await db
		.insert(userSubscriptions)
		.values({
			userId,
			planId,
			stripeCustomerId: customerId,
			stripeSubscriptionId: subscription.id,
			billingPeriodStart: periodStart,
			billingPeriodEnd: periodEnd,
			cancelAtPeriodEnd: false,
		})
		.onConflictDoUpdate({
			target: userSubscriptions.userId,
			set: {
				status: "active",
				planId,
				stripeCustomerId: customerId,
				stripeSubscriptionId: subscription.id,
				billingPeriodStart: periodStart,
				billingPeriodEnd: periodEnd,
				cancelAtPeriodEnd: false,
				updatedAt: new Date(),
			},
		});

	console.log(`[stripe] Subscription activated for user ${userId}: ${planId}`);
	return planId;
}

// Helper to get user from context
function getUser(c: unknown): { id: string; email: string } | null {
	const ctx = c as { get: (key: string) => unknown };
	const user = ctx.get("user") as { id: string; email: string } | null;
	return user ?? null;
}

export const stripeRoute = new Hono();

// Select free plan (creates subscription record + Stripe customer)
stripeRoute.post("/select-free", async (c) => {
	const user = getUser(c);
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const now = new Date();
	const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
	const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

	try {
		let stripeCustomerId: string | null = null;

		// Create Stripe customer if Stripe is configured (not self-hosted)
		if (stripe && !isSelfHosted) {
			// Check if customer already exists
			const customers = await stripe.customers.list({
				email: user.email,
				limit: 1,
			});

			if (customers.data.length > 0) {
				stripeCustomerId = customers.data[0].id;
			} else {
				// Create new Stripe customer
				const customer = await stripe.customers.create({
					email: user.email,
					metadata: { userId: user.id },
				});
				stripeCustomerId = customer.id;
				console.log(`[stripe] Created customer ${stripeCustomerId} for user ${user.id}`);
			}
		}

		// Check if user already has a subscription
		const existing = await db.query.userSubscriptions.findFirst({
			where: (subs, { eq }) => eq(subs.userId, user.id),
		});

		if (existing) {
			// Update to free plan
			await db
				.update(userSubscriptions)
				.set({
					planId: "free",
					stripeCustomerId: stripeCustomerId ?? existing.stripeCustomerId,
					stripeSubscriptionId: null,
					billingPeriodStart,
					billingPeriodEnd,
					updatedAt: new Date(),
				})
				.where(eq(userSubscriptions.userId, user.id));
		} else {
			// Create new free subscription
			await db.insert(userSubscriptions).values({
				userId: user.id,
				planId: "free",
				stripeCustomerId,
				billingPeriodStart,
				billingPeriodEnd,
			});
		}

		console.log(`[stripe] Free plan selected for user ${user.id}`);
		return c.json({ success: true, planId: "free" });
	} catch (error) {
		console.error("[stripe] Error selecting free plan:", error);
		return c.json({ error: "Failed to select free plan" }, 500);
	}
});

// Check if user can downgrade to a specific plan
stripeRoute.get("/check-downgrade/:targetPlanId", async (c) => {
	const user = getUser(c);
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const targetPlanId = c.req.param("targetPlanId");
	if (!targetPlanId) {
		return c.json({ error: "Target plan ID is required" }, 400);
	}

	try {
		// Get user's current plan
		const currentPlan = await getUserPlan(user.id);

		// Check if this is actually a downgrade
		if (!isDowngrade(currentPlan.planId, targetPlanId)) {
			return c.json({
				canDowngrade: true,
				blockers: [],
				isDowngrade: false,
			});
		}

		// Check for blockers
		const result = await checkDowngrade(user.id, targetPlanId);

		return c.json({
			...result,
			isDowngrade: true,
			currentPlanId: currentPlan.planId,
			targetPlanId,
		});
	} catch (error) {
		console.error("[stripe] Error checking downgrade:", error);
		return c.json({ error: "Failed to check downgrade eligibility" }, 500);
	}
});

// Create checkout session
stripeRoute.post("/checkout", async (c) => {
	if (isSelfHosted || !stripe) {
		return c.json({ error: "Billing is disabled in self-hosted mode" }, 400);
	}

	const user = getUser(c);
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { priceId } = await c.req.json();
	if (!priceId) {
		return c.json({ error: "Price ID is required" }, 400);
	}

	try {
		// Determine the target plan from the price
		const targetPlanId = mapPriceToPlan(priceId);
		if (!targetPlanId || targetPlanId === "free") {
			return c.json({ error: "Invalid price ID" }, 400);
		}

		// Check if this is a downgrade
		const currentPlan = await getUserPlan(user.id);
		if (isDowngrade(currentPlan.planId, targetPlanId)) {
			// Validate downgrade
			const downgradeCheck = await checkDowngrade(user.id, targetPlanId);
			if (!downgradeCheck.canDowngrade) {
				return c.json(
					{
						error: "Cannot downgrade",
						blockers: downgradeCheck.blockers,
					},
					400,
				);
			}
		}

		const session = await stripe.checkout.sessions.create({
			mode: "subscription",
			payment_method_types: ["card"],
			customer_email: user.email,
			client_reference_id: user.id,
			allow_promotion_codes: true,
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			success_url: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/choose-plan?canceled=true`,
			metadata: {
				userId: user.id,
			},
		});

		return c.json({ url: session.url });
	} catch (error) {
		console.error("[stripe] Checkout error:", error);
		return c.json({ error: "Failed to create checkout session" }, 500);
	}
});

// Create customer portal session
stripeRoute.post("/portal", async (c) => {
	if (isSelfHosted || !stripe) {
		return c.json({ error: "Billing is disabled in self-hosted mode" }, 400);
	}

	const user = getUser(c);
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	try {
		// First try to find customer ID from our database
		const subscription = await db.query.userSubscriptions.findFirst({
			where: (subs, { eq }) => eq(subs.userId, user.id),
		});

		let customerId = subscription?.stripeCustomerId;

		// Verify the customer exists in Stripe, or find/create one
		if (customerId) {
			try {
				await stripe.customers.retrieve(customerId);
			} catch (err) {
				// Customer doesn't exist in Stripe (maybe test/live mode mismatch)
				console.log(
					`[stripe] Customer ${customerId} not found in Stripe, will find or create new one`,
				);
				customerId = undefined;
			}
		}

		// If not found in DB or invalid, look up by email or create new customer
		if (!customerId) {
			const customers = await stripe.customers.list({
				email: user.email,
				limit: 1,
			});

			if (customers.data.length === 0) {
				// Create a new Stripe customer
				const newCustomer = await stripe.customers.create({
					email: user.email,
					metadata: { userId: user.id },
				});
				customerId = newCustomer.id;
				console.log(`[stripe] Created new customer ${customerId} for user ${user.id}`);
			} else {
				customerId = customers.data[0].id;
				console.log(`[stripe] Found existing customer ${customerId} for user ${user.id}`);
			}

			// Update the subscription record with the correct customer ID
			if (subscription) {
				await db
					.update(userSubscriptions)
					.set({ stripeCustomerId: customerId })
					.where(eq(userSubscriptions.userId, user.id));
				console.log(`[stripe] Updated subscription record with customer ${customerId}`);
			}
		}

		const session = await stripe.billingPortal.sessions.create({
			customer: customerId,
			return_url: `${process.env.DASHBOARD_URL || "http://localhost:3000"}/billing`,
		});

		return c.json({ url: session.url });
	} catch (error) {
		console.error("[stripe] Portal error:", error);
		return c.json({ error: "Failed to create portal session" }, 500);
	}
});

// Stripe webhook handler
stripeRoute.post("/webhook", async (c) => {
	if (!stripe) {
		return c.json({ error: "Stripe not configured" }, 400);
	}

	const sig = c.req.header("stripe-signature");
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	if (!sig || !webhookSecret) {
		console.error("[stripe] Missing webhook signature or secret");
		return c.json({ error: "Missing signature" }, 400);
	}

	let event: Stripe.Event;

	try {
		const body = await c.req.text();
		event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
	} catch (err) {
		console.error("[stripe] Webhook signature verification failed:", err);
		return c.json({ error: "Invalid signature" }, 400);
	}

	const db = getDb();

	try {
		switch (event.type) {
			case "checkout.session.completed": {
				const session = event.data.object as Stripe.Checkout.Session;
				const userId = session.client_reference_id || session.metadata?.userId;
				const subscriptionId = session.subscription as string;
				const customerId = session.customer as string;

				if (userId && subscriptionId) {
					try {
						const subscription = await stripe.subscriptions.retrieve(subscriptionId);
						await activateSubscription(userId, subscription, customerId, db);
					} catch (err) {
						console.error("[stripe] checkout.session.completed failed:", {
							userId,
							subscriptionId,
							err,
						});
						throw err;
					}
				}
				break;
			}

			case "customer.subscription.updated": {
				const subscription = event.data.object as Stripe.Subscription;
				const subscriptionId = subscription.id;
				const priceId = subscription.items.data[0]?.price.id as string;
				const planId = mapPriceToPlan(priceId);

				const periodStart = subscription.current_period_start
					? new Date(subscription.current_period_start * 1000)
					: new Date();
				let periodEnd = subscription.current_period_end
					? new Date(subscription.current_period_end * 1000)
					: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

				// Find user by subscription ID and update
				const existingSub = await db.query.userSubscriptions.findFirst({
					where: (subs, { eq }) => eq(subs.stripeSubscriptionId, subscriptionId),
				});

				if (existingSub) {
					// When cancelling, never shorten the billing period — the user paid through the existing end date
					if (
						subscription.cancel_at_period_end &&
						existingSub.billingPeriodEnd &&
						existingSub.billingPeriodEnd > periodEnd
					) {
						periodEnd = existingSub.billingPeriodEnd;
					}

					// Check if this is a downgrade to a plan without branding removal
					if (isDowngrade(existingSub.planId, planId)) {
						// Restore branding for all agents
						await restoreBrandingForUser(existingSub.userId);
					}

					await db
						.insert(userSubscriptions)
						.values({
							userId: existingSub.userId,
							planId,
							stripeSubscriptionId: subscriptionId,
							billingPeriodStart: periodStart,
							billingPeriodEnd: periodEnd,
							cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
						})
						.onConflictDoUpdate({
							target: userSubscriptions.userId,
							set: {
								planId,
								stripeSubscriptionId: subscriptionId,
								billingPeriodStart: periodStart,
								billingPeriodEnd: periodEnd,
								cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
								updatedAt: new Date(),
							},
						});

					console.log(`[stripe] Subscription updated for user ${existingSub.userId}: ${planId}`);
				}
				break;
			}

			case "customer.subscription.deleted": {
				const subscription = event.data.object as Stripe.Subscription;
				const subscriptionId = subscription.id;

				// Find user and handle cancellation
				const existingSub = await db.query.userSubscriptions.findFirst({
					where: (subs, { eq }) => eq(subs.stripeSubscriptionId, subscriptionId),
				});

				if (existingSub) {
					const periodEnd = subscription.current_period_end
						? new Date(subscription.current_period_end * 1000)
						: null;

					// Use the longer of: Stripe's current_period_end, existing DB value, or null
					const effectivePeriodEnd =
						periodEnd && existingSub.billingPeriodEnd
							? periodEnd > existingSub.billingPeriodEnd
								? periodEnd
								: existingSub.billingPeriodEnd
							: (periodEnd ?? existingSub.billingPeriodEnd ?? null);

					const stillInPeriod = effectivePeriodEnd && effectivePeriodEnd > new Date();

					if (stillInPeriod) {
						// Billing period still active — keep the paid plan but mark as canceled.
						// getUserPlan() / getSubscription() will downgrade to free once period expires.
						await db
							.update(userSubscriptions)
							.set({
								status: "canceled",
								cancelAtPeriodEnd: true,
								stripeSubscriptionId: null,
								billingPeriodEnd: effectivePeriodEnd,
								updatedAt: new Date(),
							})
							.where(eq(userSubscriptions.userId, existingSub.userId));

						console.log(
							`[stripe] Subscription canceled for user ${existingSub.userId}, grace period until ${effectivePeriodEnd.toISOString()}`,
						);
					} else {
						// Period already expired — immediately downgrade to free
						await restoreBrandingForUser(existingSub.userId);

						await db
							.update(userSubscriptions)
							.set({
								planId: "free",
								status: "canceled",
								stripeSubscriptionId: null,
								cancelAtPeriodEnd: false,
								billingPeriodStart: new Date(),
								billingPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
								updatedAt: new Date(),
							})
							.where(eq(userSubscriptions.userId, existingSub.userId));

						console.log(
							`[stripe] Subscription canceled for user ${existingSub.userId}, downgraded to free`,
						);
					}
				}
				break;
			}

			default:
				console.log(`[stripe] Unhandled event type: ${event.type}`);
		}

		return c.json({ received: true });
	} catch (error) {
		console.error("[stripe] Webhook processing error:", error);
		return c.json({ error: "Webhook processing failed" }, 500);
	}
});

// POST /stripe/activate-session
// Called by checkout-success page as reliable fallback if webhook is slow
stripeRoute.post("/activate-session", async (c) => {
	if (isSelfHosted || !stripe) {
		return c.json({ error: "Billing is disabled in self-hosted mode" }, 400);
	}

	const user = getUser(c);
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { sessionId } = await c.req.json();
	if (!sessionId) {
		return c.json({ error: "sessionId is required" }, 400);
	}

	try {
		const session = await stripe.checkout.sessions.retrieve(sessionId, {
			expand: ["subscription"],
		});

		if (session.payment_status !== "paid") {
			return c.json({ error: "Not paid" }, 400);
		}

		if (session.client_reference_id !== user.id && session.metadata?.userId !== user.id) {
			return c.json({ error: "Unauthorized" }, 403);
		}

		const db = getDb();

		// Check if webhook already activated (idempotent check)
		const existing = await db.query.userSubscriptions.findFirst({
			where: (subs, { eq }) => eq(subs.userId, user.id),
		});
		if (existing?.stripeSubscriptionId && existing?.status === "active") {
			return c.json({ activated: true });
		}

		if (!session.subscription || typeof session.subscription === "string") {
			console.error("[stripe] activate-session: subscription not expanded", { sessionId });
			return c.json({ error: "Subscription not available" }, 400);
		}

		const subscription = session.subscription as Stripe.Subscription;
		const customerId = session.customer as string;
		await activateSubscription(user.id, subscription, customerId, db);

		return c.json({ activated: true });
	} catch (error) {
		console.error("[stripe] activate-session error:", error);
		return c.json({ error: "Failed to activate session" }, 500);
	}
});
