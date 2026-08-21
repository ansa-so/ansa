import crypto from "node:crypto";
import {
	agentEscalationSettings,
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	count,
	eq,
	getDb,
	ilike,
	inArray,
	isNotNull,
	ne,
	or,
	shopifyComplianceAuditLog,
	shopifyCustomers,
	shopifyOrders,
	shopifyProducts,
	shopifyRefundRequests,
	shopifyShopAgents,
	shopifyShops,
	sql,
	userSubscriptions,
	users,
	verifications,
} from "@ansa/db";
import { Hono } from "hono";
import { Resend } from "resend";
import { renderEmail } from "../lib/email";
import { requireParam } from "../lib/params";
import { restoreBrandingForUser } from "../lib/plans";
import { normalizeColor, normalizeSize } from "../lib/product-utils";
import {
	createRefund,
	exchangeCodeForToken,
	getShopData,
	injectWidgetScriptTag,
	listScriptTags,
	registerWebhooks,
	removeAgentMetafield,
	removeScriptTag,
	ShopifyAuthError,
	setAgentMetafield,
	shopifyConfig,
	syncShopData,
	transformCustomerToSchema,
	transformOrderToSchema,
	transformProductToSchema,
	verifyRequestSignature,
	verifyWebhookHmac,
} from "../lib/shopify";
import { createShopifyToolDefinitions } from "../lib/shopify-tools";
import { authMiddleware, requireAuth } from "../middleware/auth";

const shopify = new Hono();

// Helper to get user from context (set by authMiddleware)
// Should only be called after requireAuth which ensures user exists
function getUser(c: { get: (key: string) => unknown }): { id: string } {
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		throw new Error("User not authenticated");
	}
	return user;
}

// Helper to get widget config for Shopify script tag
// Only includes agentId - widget fetches rest from API at runtime
function getWidgetConfig(agentId: string) {
	return {
		agentId,
	};
}

// ============ OAUTH FLOW ============

/**
 * GET /shopify/install
 * Initiates the Shopify OAuth flow
 * Query params: shop (required), agentId (optional - which agent to connect)
 *
 * Supports two flows:
 * 1. Authenticated install: User is logged in, agentId can be provided
 * 2. App Store install: No auth required, user will be created in callback
 */
shopify.get("/install", authMiddleware, async (c) => {
	const shop = c.req.query("shop");
	const agentId = c.req.query("agentId");

	// Get user if authenticated (optional for App Store installs)
	const user = (c.get as (key: string) => unknown)("user") as { id: string } | null;

	if (!shop) {
		return c.json({ error: "Missing shop parameter" }, 400);
	}

	// Validate shop domain format
	if (!shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/)) {
		return c.json({ error: "Invalid shop domain" }, 400);
	}

	// Generate state token for CSRF protection
	const state = crypto.randomBytes(16).toString("hex");

	// Store state in a cookie (or could use database)
	// Include agentId and userId for post-callback use
	// userId can be null for App Store installs
	const stateData = JSON.stringify({
		nonce: state,
		userId: user?.id || null,
		agentId: agentId || null,
		isAppStoreInstall: !user, // Flag to indicate App Store install flow
	});

	// Build OAuth URL
	const redirectUri = `${shopifyConfig.appUrl}/shopify/callback`;
	const scopes = shopifyConfig.scopes;
	const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${shopifyConfig.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(stateData)}`;

	// For App Store installs (direct browser navigation), redirect directly
	// For authenticated installs (fetch from dashboard), return JSON
	// redirect=1 param forces redirect (used by /shopify/app entry point)
	if (!user || c.req.query("redirect") === "1") {
		return c.redirect(installUrl);
	}

	// Return the URL instead of redirecting (to avoid CORS issues with fetch)
	return c.json({ installUrl });
});

/**
 * GET /shopify/callback
 * Handles the OAuth callback from Shopify
 * Uses authMiddleware to detect existing sessions — if the user is already
 * logged into the dashboard, the shop is linked to their account even when
 * the store's admin email is different (fixes ownership mismatch).
 */
shopify.get("/callback", authMiddleware, async (c) => {
	const { shop, code, state, hmac } = c.req.query();

	if (!shop || !code || !state) {
		return c.json({ error: "Missing required parameters" }, 400);
	}

	// Verify HMAC if provided
	if (hmac) {
		const query = Object.fromEntries(new URL(c.req.url).searchParams);
		if (!verifyRequestSignature(query)) {
			return c.json({ error: "Invalid signature" }, 401);
		}
	}

	// Parse state
	let stateData: {
		nonce: string;
		userId: string | null;
		agentId: string | null;
		isAppStoreInstall?: boolean;
	};
	try {
		stateData = JSON.parse(state);
	} catch {
		return c.json({ error: "Invalid state" }, 400);
	}

	try {
		const db = getDb();

		// Exchange code for access token
		const { access_token, scope } = await exchangeCodeForToken(shop, code);

		// Fetch shop details
		const shopData = await getShopData({ shop, accessToken: access_token });

		// Check if shop already exists (needed for user resolution)
		const existingShop = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.shopDomain, shop))
			.limit(1);

		// Determine the user to link the shop to.
		// Each shop gets its own isolated user account. The only exception is
		// reconnecting the same shop (uninstall + reinstall) — reuse original owner.
		// We never share users across shops via session cookies or email matching.
		let userId = stateData.userId;
		let isNewUser = false;

		if (!userId) {
			if (existingShop.length > 0) {
				// Reconnection: reuse the original shop owner
				userId = existingShop[0].userId;
				console.log(`[Shopify] Reconnecting shop ${shop} to existing owner ${userId}`);
			} else {
				// Brand-new store — always create a new user.
				// Use shop-scoped email to guarantee uniqueness per store.
				const shopScopedEmail = `${shopData.email.split("@")[0]}+${shop.replace(".myshopify.com", "")}@${shopData.email.split("@")[1]}`;
				const newUserId = crypto.randomUUID();
				await db.insert(users).values({
					id: newUserId,
					email: shopScopedEmail,
					name: shopData.name || shopData.email.split("@")[0],
					emailVerified: true,
					createdAt: new Date(),
					updatedAt: new Date(),
				});
				userId = newUserId;
				isNewUser = true;
				console.log(
					`[Shopify] Created new user ${newUserId} (${shopScopedEmail}) for new shop ${shop}`,
				);
			}
		}

		let shopId: string;

		if (existingShop.length > 0) {
			// Update existing shop — only reassign userId if user was authenticated
			// (via state or session). For unauthenticated reconnections we already
			// resolved userId to the existing owner above, so this is safe either way.
			const updateData: Record<string, unknown> = {
				accessToken: access_token,
				scopes: scope,
				shopName: shopData.name,
				shopEmail: shopData.email,
				currency: shopData.currency,
				timezone: shopData.iana_timezone,
				status: "active",
				uninstalledAt: null,
				updatedAt: new Date(),
			};
			// Only update userId when we have an authenticated user (state or session)
			if (stateData.userId || (c.get as (key: string) => unknown)("user")) {
				updateData.userId = userId;
			}
			await db.update(shopifyShops).set(updateData).where(eq(shopifyShops.id, existingShop[0].id));
			shopId = existingShop[0].id;
		} else {
			// Create new shop record
			const [newShop] = await db
				.insert(shopifyShops)
				.values({
					userId,
					shopDomain: shop,
					accessToken: access_token,
					scopes: scope,
					shopName: shopData.name,
					shopEmail: shopData.email,
					currency: shopData.currency,
					timezone: shopData.iana_timezone,
				})
				.returning();
			shopId = newShop.id;
		}

		// Determine which agent to link: explicit agentId from state, or auto-detect sole agent
		let agentToLink: { id: string } | null = null;

		if (stateData.agentId && stateData.userId) {
			// Verify agent belongs to user
			const [agent] = await db
				.select()
				.from(agents)
				.where(and(eq(agents.id, stateData.agentId), eq(agents.userId, stateData.userId)))
				.limit(1);
			if (agent) agentToLink = agent;
		} else {
			// Never auto-link agents to shops. Each shop should get its own agent
			// via onboarding. Auto-linking caused cross-store contamination when
			// agents from uninstalled shops got re-linked to new shops.
			console.log(`[Shopify] No explicit agentId — skipping auto-link for shop ${shop}`);
		}

		if (agentToLink) {
			// Check if link already exists
			const existingLink = await db
				.select()
				.from(shopifyShopAgents)
				.where(
					and(eq(shopifyShopAgents.shopId, shopId), eq(shopifyShopAgents.agentId, agentToLink.id)),
				)
				.limit(1);

			if (existingLink.length === 0) {
				// Create link and set as primary
				await db.insert(shopifyShopAgents).values({
					shopId,
					agentId: agentToLink.id,
					isPrimary: true,
				});

				// Set agent metafield on AppInstallation for theme app extension
				try {
					await setAgentMetafield({ shop, accessToken: access_token }, agentToLink.id);
				} catch (err) {
					console.error("Failed to set agent metafield:", err);
				}

				// Inject widget script tag (legacy, kept for existing installs)
				try {
					const widgetConfig = getWidgetConfig(agentToLink.id);
					const { widgetScriptTag, identificationScriptTag } = await injectWidgetScriptTag(
						{ shop, accessToken: access_token },
						widgetConfig,
					);
					await db
						.update(shopifyShops)
						.set({
							scriptTagId: String(widgetScriptTag.id),
							identificationScriptTagId: String(identificationScriptTag.id),
						})
						.where(eq(shopifyShops.id, shopId));
				} catch (err) {
					console.error("Failed to inject script tag:", err);
				}
			}
		}

		// Register webhooks for real-time updates
		registerWebhooks({ shop, accessToken: access_token }).catch((err) => {
			console.error("Failed to register webhooks:", err);
		});

		// Start background sync of orders/customers/products
		const shopRecord = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.id, shopId))
			.limit(1);

		if (shopRecord.length > 0) {
			// Run sync in background (don't await)
			syncShopData(shopRecord[0]).catch((err) => {
				console.error("Background sync failed:", err);
			});
		}

		// Ensure Shopify users always have a subscription row so they bypass
		// the choose-plan gate and agent-limit checks use the correct plan.
		const [existingSub] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1);

		if (!existingSub) {
			const now = new Date();
			const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
			await db.insert(userSubscriptions).values({
				userId,
				planId: "free",
				status: "active",
				billingProvider: "shopify",
				billingPeriodStart: now,
				billingPeriodEnd: periodEnd,
			});
			console.log(`[Shopify] Created default shopify subscription for user ${userId}`);
		} else if (existingSub.billingProvider !== "shopify") {
			// User had a Stripe (or other) sub but is now installing via Shopify —
			// mark billing provider as shopify so dashboard routes correctly.
			await db
				.update(userSubscriptions)
				.set({ billingProvider: "shopify", updatedAt: new Date() })
				.where(eq(userSubscriptions.userId, userId));
			console.log(`[Shopify] Switched billing provider to shopify for user ${userId}`);
		}

		const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";
		const apiUrl = process.env.API_URL || "http://localhost:3001";

		// For App Store installs, create magic link and redirect to plan selection
		if (stateData.isAppStoreInstall || isNewUser) {
			// Get the user's email for magic link
			const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
			if (!user) {
				return c.json({ error: "User not found" }, 500);
			}

			// Generate a magic link verification token
			const token = crypto.randomBytes(32).toString("base64url");
			const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

			// Store the token in verifications table
			await db.insert(verifications).values({
				id: crypto.randomUUID(),
				identifier: token,
				value: JSON.stringify({ email: user.email }),
				expiresAt,
				createdAt: new Date(),
				updatedAt: new Date(),
			});

			// Redirect to magic link verify, then to onboarding
			// Plan selection is handled by Shopify Managed Pricing
			const verifyUrl = new URL(`${apiUrl}/api/auth/magic-link/verify`);
			verifyUrl.searchParams.set("token", token);
			verifyUrl.searchParams.set("callbackURL", `${dashboardUrl}/onboarding`);

			return c.redirect(verifyUrl.toString());
		}

		// Standard authenticated install - redirect to integrations page
		return c.redirect(
			`${dashboardUrl}/integrations/shopify?success=true&shop=${encodeURIComponent(shop)}`,
		);
	} catch (err) {
		console.error("Shopify OAuth error:", err);
		const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";
		return c.redirect(`${dashboardUrl}/integrations/shopify?error=oauth_failed`);
	}
});

// ============ EMBEDDED APP ENTRY ============

/**
 * GET /shopify/app
 * Entry point for when the app is opened from Shopify admin
 * Verifies the request and redirects to dashboard with auto-login using better-auth magic link
 */
shopify.get("/app", authMiddleware, async (c) => {
	const query = Object.fromEntries(new URL(c.req.url).searchParams);
	const { shop, host, embedded } = query;

	if (!shop) {
		return c.json({ error: "Missing shop parameter" }, 400);
	}

	// Verify the HMAC signature from Shopify
	if (!verifyRequestSignature(query)) {
		console.error("[Shopify] Invalid HMAC signature for /app request");
		return c.json({ error: "Invalid signature" }, 401);
	}

	try {
		const db = getDb();

		// Check if the current browser session has a logged-in user
		const sessionUser = (c.get as (key: string) => unknown)("user") as { id: string } | null;

		// Find the shop and its owner
		const [shopRecord] = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.shopDomain, shop))
			.limit(1);

		if (!shopRecord || !shopRecord.userId) {
			// Shop not connected yet — re-run the OAuth install flow to create
			// the shop record and link it to the correct user
			return c.redirect(`/shopify/install?shop=${encodeURIComponent(shop)}&redirect=1`);
		}

		// Use the shop's existing owner — do NOT re-claim based on dashboard session.
		// A browser session cookie doesn't prove ownership of this Shopify store;
		// it just means someone happens to be logged into the dashboard.
		const ownerId = shopRecord.userId;
		if (sessionUser && sessionUser.id !== shopRecord.userId) {
			console.warn(
				`[Shopify] Session user ${sessionUser.id} opened /shopify/app for shop ${shop} owned by ${shopRecord.userId} — ignoring session, using shop owner`,
			);
		}

		// Get the owner user's email for the magic link
		const [user] = await db.select().from(users).where(eq(users.id, ownerId)).limit(1);
		if (!user) {
			console.error("[Shopify] Owner user not found for shop:", shop);
			return c.json({ error: "User not found" }, 404);
		}

		// Get agents connected to this shop
		const connectedAgents = await db
			.select({ agentId: shopifyShopAgents.agentId })
			.from(shopifyShopAgents)
			.where(eq(shopifyShopAgents.shopId, shopRecord.id));

		// Generate a magic link verification token (same format as better-auth magic link plugin)
		const token = crypto.randomBytes(32).toString("base64url");
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

		// Store the token in verifications table with user email (format used by magic link plugin)
		await db.insert(verifications).values({
			id: crypto.randomUUID(),
			identifier: token, // magic link uses token as identifier
			value: JSON.stringify({ email: user.email }), // magic link stores email in value
			expiresAt,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Build the callback URL for after auth
		const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";
		let callbackPath = "/dashboard";

		// If only one agent is connected, auto-select it and show overview
		if (connectedAgents.length === 1) {
			const agentId = connectedAgents[0].agentId;
			callbackPath = `/overview?agent=${agentId}`;
			if (embedded === "1" && host) {
				callbackPath += `&embedded=1&host=${encodeURIComponent(host)}`;
				if (shop) callbackPath += `&shop=${encodeURIComponent(shop)}`;
			}
		} else if (embedded === "1" && host) {
			callbackPath = `/dashboard?embedded=1&host=${encodeURIComponent(host)}`;
			if (shop) callbackPath += `&shop=${encodeURIComponent(shop)}`;
		}

		// Redirect to better-auth's magic link verify endpoint
		// This will create a properly signed session cookie
		const apiUrl = process.env.API_URL || "http://localhost:3001";
		const verifyUrl = new URL(`${apiUrl}/api/auth/magic-link/verify`);
		verifyUrl.searchParams.set("token", token);
		verifyUrl.searchParams.set("callbackURL", `${dashboardUrl}${callbackPath}`);

		return c.redirect(verifyUrl.toString());
	} catch (err) {
		console.error("[Shopify] App entry error:", err);
		return c.json({ error: "Internal error" }, 500);
	}
});

// ============ SHOPIFY BILLING ============

/**
 * GET /shopify/billing/welcome
 * Welcome link handler for Shopify Managed Pricing.
 * Shopify redirects here after a merchant approves a plan charge.
 * Query params: charge_id (appended by Shopify)
 */
shopify.get("/billing/welcome", async (c) => {
	const chargeId = c.req.query("charge_id");
	const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";

	if (!chargeId) {
		console.error("[Shopify Billing] Welcome link missing charge_id");
		return c.redirect(`${dashboardUrl}/dashboard?error=missing_charge_id`);
	}

	try {
		const db = getDb();
		const { getAppSubscription, SHOPIFY_PLAN_NAME_MAP } = await import("../lib/shopify");

		// Find which shop owns this charge by checking all active shops
		const activeShops = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.status, "active"));

		let userId: string | null = null;
		let shopDomain: string | null = null;
		let shopAccessToken: string | null = null;
		let subscription: { name: string; status: string; currentPeriodEnd: Date } | null = null;

		for (const activeShop of activeShops) {
			try {
				const sub = await getAppSubscription(
					{ shop: activeShop.shopDomain, accessToken: activeShop.accessToken },
					chargeId,
				);
				if (sub) {
					subscription = sub;
					shopDomain = activeShop.shopDomain;
					shopAccessToken = activeShop.accessToken;
					userId = activeShop.userId;
					break;
				}
			} catch (err) {
				console.warn(
					`[Shopify Billing] Charge lookup failed for ${activeShop.shopDomain}:`,
					err instanceof Error ? err.message : err,
				);
			}
		}

		if (!userId || !shopDomain || !subscription) {
			console.error("[Shopify Billing] Could not find shop for charge:", chargeId);
			return c.redirect(`${dashboardUrl}/dashboard?error=shop_not_found`);
		}

		if (subscription.status !== "ACTIVE") {
			return c.redirect(`${dashboardUrl}/dashboard?error=payment_declined`);
		}

		// Map Shopify plan name to internal plan ID
		const planId = SHOPIFY_PLAN_NAME_MAP[subscription.name];
		if (!planId) {
			console.error("[Shopify Billing] Unknown plan name:", subscription.name);
			return c.redirect(`${dashboardUrl}/dashboard?error=unknown_plan`);
		}

		// Upsert user subscription
		const now = new Date();
		const periodEnd = subscription.currentPeriodEnd;

		const existingSub = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1);

		if (existingSub.length > 0) {
			await db
				.update(userSubscriptions)
				.set({
					planId,
					status: "active",
					billingProvider: "shopify",
					shopifyChargeId: chargeId,
					billingPeriodStart: now,
					billingPeriodEnd: periodEnd,
					updatedAt: now,
				})
				.where(eq(userSubscriptions.userId, userId));
		} else {
			await db.insert(userSubscriptions).values({
				userId,
				planId,
				status: "active",
				billingProvider: "shopify",
				shopifyChargeId: chargeId,
				billingPeriodStart: now,
				billingPeriodEnd: periodEnd,
			});
		}

		console.log(
			`[Shopify Billing] Activated ${planId} plan for user ${userId} (charge ${chargeId})`,
		);

		// Generate magic link for auto-login
		const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
		if (!user) {
			return c.redirect(`${dashboardUrl}/dashboard?error=user_not_found`);
		}

		const token = crypto.randomBytes(32).toString("base64url");
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

		await db.insert(verifications).values({
			id: crypto.randomUUID(),
			identifier: token,
			value: JSON.stringify({ email: user.email }),
			expiresAt,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const apiUrl = process.env.API_URL || "http://localhost:3001";
		const verifyUrl = new URL(`${apiUrl}/api/auth/magic-link/verify`);
		verifyUrl.searchParams.set("token", token);
		verifyUrl.searchParams.set("callbackURL", `${dashboardUrl}/onboarding`);

		return c.redirect(verifyUrl.toString());
	} catch (err) {
		console.error("[Shopify Billing] Welcome error:", err);
		return c.redirect(`${dashboardUrl}/dashboard?error=billing_failed`);
	}
});

/**
 * GET /shopify/billing/confirm
 * Legacy handler: return from Shopify after payment approval (Billing API flow).
 * Kept for backward compatibility with in-flight charges.
 * Query params: shop (required), plan (required), charge_id (from Shopify)
 */
shopify.get("/billing/confirm", async (c) => {
	const shopDomain = c.req.query("shop");
	const plan = c.req.query("plan");
	const chargeId = c.req.query("charge_id");

	if (!shopDomain || !plan) {
		return c.json({ error: "Missing required parameters" }, 400);
	}

	const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";

	try {
		const db = getDb();

		// Find the shop
		const [shop] = await db
			.select()
			.from(shopifyShops)
			.where(eq(shopifyShops.shopDomain, shopDomain))
			.limit(1);

		if (!shop) {
			return c.redirect(`${dashboardUrl}/integrations/shopify/plans?error=shop_not_found`);
		}

		// Import billing helper
		const { getAppSubscription } = await import("../lib/shopify");

		// Verify the subscription is active
		if (chargeId) {
			const subscription = await getAppSubscription(
				{ shop: shopDomain, accessToken: shop.accessToken },
				chargeId,
			);

			if (!subscription || subscription.status !== "ACTIVE") {
				// User declined or cancelled
				return c.redirect(
					`${dashboardUrl}/integrations/shopify/plans?error=payment_declined&shop=${encodeURIComponent(shopDomain)}`,
				);
			}

			// Import userSubscriptions from db
			const { userSubscriptions } = await import("@ansa/db");

			// Create or update user subscription
			const existingSub = await db
				.select()
				.from(userSubscriptions)
				.where(eq(userSubscriptions.userId, shop.userId))
				.limit(1);

			const now = new Date();
			const periodEnd = subscription.currentPeriodEnd;

			if (existingSub.length > 0) {
				await db
					.update(userSubscriptions)
					.set({
						planId: plan,
						billingProvider: "shopify",
						shopifyChargeId: chargeId,
						billingPeriodStart: now,
						billingPeriodEnd: periodEnd,
						updatedAt: now,
					})
					.where(eq(userSubscriptions.userId, shop.userId));
			} else {
				await db.insert(userSubscriptions).values({
					userId: shop.userId,
					planId: plan,
					billingProvider: "shopify",
					shopifyChargeId: chargeId,
					billingPeriodStart: now,
					billingPeriodEnd: periodEnd,
				});
			}
		}

		// Get user for magic link
		const [user] = await db.select().from(users).where(eq(users.id, shop.userId)).limit(1);
		if (!user) {
			return c.redirect(`${dashboardUrl}/integrations/shopify/plans?error=user_not_found`);
		}

		// Generate magic link for auto-login
		const token = crypto.randomBytes(32).toString("base64url");
		const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

		await db.insert(verifications).values({
			id: crypto.randomUUID(),
			identifier: token,
			value: JSON.stringify({ email: user.email }),
			expiresAt,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		// Redirect to magic link verify, then to onboarding
		const apiUrl = process.env.API_URL || "http://localhost:3001";
		const verifyUrl = new URL(`${apiUrl}/api/auth/magic-link/verify`);
		verifyUrl.searchParams.set("token", token);
		verifyUrl.searchParams.set("callbackURL", `${dashboardUrl}/onboarding`);

		return c.redirect(verifyUrl.toString());
	} catch (err) {
		console.error("[Shopify Billing] Confirm error:", err);
		return c.redirect(
			`${dashboardUrl}/integrations/shopify/plans?error=confirmation_failed&shop=${encodeURIComponent(shopDomain || "")}`,
		);
	}
});

// ============ WEBHOOKS ============

/**
 * POST /shopify/webhooks
 * Handles incoming Shopify webhooks (topic from header)
 * Used by compliance webhooks configured in shopify.app.toml
 */
shopify.post("/webhooks", async (c) => {
	const topicHeader = c.req.header("X-Shopify-Topic");
	const hmac = c.req.header("X-Shopify-Hmac-Sha256");
	const shopDomain = c.req.header("X-Shopify-Shop-Domain");

	if (!hmac || !shopDomain) {
		return c.json({ error: "Missing headers" }, 401);
	}

	if (!topicHeader) {
		return c.json({ error: "Missing X-Shopify-Topic header" }, 400);
	}

	// Convert topic from header format (e.g., "customers/redact") to route format (e.g., "customers-redact")
	const topic = topicHeader.replace("/", "-");

	// Verify webhook signature
	const body = await c.req.text();
	if (!verifyWebhookHmac(body, hmac)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	const db = getDb();
	const payload = JSON.parse(body);

	// Find the shop
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(eq(shopifyShops.shopDomain, shopDomain))
		.limit(1);

	if (!shop) {
		console.warn(`Webhook received for unknown shop: ${shopDomain}`);
		return c.json({ received: true });
	}

	try {
		switch (topic) {
			case "app-uninstalled":
				await handleAppUninstalled(shop.id);
				break;
			case "app_subscriptions-update":
				await handleSubscriptionUpdate(shop, payload);
				break;
			case "orders-create":
			case "orders-updated":
				await handleOrderWebhook(shop, payload);
				break;
			case "customers-create":
			case "customers-update":
				await handleCustomerWebhook(shop, payload);
				break;
			case "refunds-create":
				await handleRefundWebhook(shop, payload);
				break;
			case "products-create":
			case "products-update":
				await handleProductWebhook(shop, payload, "upsert");
				break;
			case "products-delete":
				await handleProductWebhook(shop, payload, "delete");
				break;
			// Mandatory compliance webhooks for GDPR/CCPA
			case "customers-data_request":
				await handleCustomerDataRequest(shop, shopDomain, payload);
				break;
			case "customers-redact":
				await handleCustomerRedact(shop, shopDomain, payload);
				break;
			case "shop-redact":
				await handleShopRedact(shop, shopDomain, payload);
				break;
			default:
				console.log(`Unhandled webhook topic: ${topic}`);
		}
	} catch (err) {
		console.error(`Error processing webhook ${topic}:`, err);
	}

	return c.json({ received: true });
});

/**
 * POST /shopify/webhooks/:topic
 * Handles incoming Shopify webhooks (topic from URL param)
 * Used by webhooks registered via API
 */
shopify.post("/webhooks/:topic", async (c) => {
	const topic = requireParam(c, "topic");
	const hmac = c.req.header("X-Shopify-Hmac-Sha256");
	const shopDomain = c.req.header("X-Shopify-Shop-Domain");

	if (!hmac || !shopDomain) {
		return c.json({ error: "Missing headers" }, 401);
	}

	// Verify webhook signature
	const body = await c.req.text();
	if (!verifyWebhookHmac(body, hmac)) {
		return c.json({ error: "Invalid signature" }, 401);
	}

	const db = getDb();
	const payload = JSON.parse(body);

	// Find the shop
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(eq(shopifyShops.shopDomain, shopDomain))
		.limit(1);

	if (!shop) {
		console.warn(`Webhook received for unknown shop: ${shopDomain}`);
		return c.json({ received: true });
	}

	try {
		switch (topic) {
			case "app-uninstalled":
				await handleAppUninstalled(shop.id);
				break;
			case "app_subscriptions-update":
				await handleSubscriptionUpdate(shop, payload);
				break;
			case "orders-create":
			case "orders-updated":
				await handleOrderWebhook(shop, payload);
				break;
			case "customers-create":
			case "customers-update":
				await handleCustomerWebhook(shop, payload);
				break;
			case "refunds-create":
				await handleRefundWebhook(shop, payload);
				break;
			case "products-create":
			case "products-update":
				await handleProductWebhook(shop, payload, "upsert");
				break;
			case "products-delete":
				await handleProductWebhook(shop, payload, "delete");
				break;
			// Mandatory compliance webhooks for GDPR/CCPA
			case "customers-data_request":
				await handleCustomerDataRequest(shop, shopDomain, payload);
				break;
			case "customers-redact":
				await handleCustomerRedact(shop, shopDomain, payload);
				break;
			case "shop-redact":
				await handleShopRedact(shop, shopDomain, payload);
				break;
			default:
				console.log(`Unhandled webhook topic: ${topic}`);
		}
	} catch (err) {
		console.error(`Error processing webhook ${topic}:`, err);
	}

	return c.json({ received: true });
});

/**
 * Shared cleanup logic for shop disconnect/uninstall.
 * Used by both webhook handler and manual disconnect endpoint.
 * Deletes all Shopify tools and agent links before marking shop as uninstalled.
 */
async function cleanupShopDisconnect(shopId: string): Promise<void> {
	const db = getDb();

	// 1. Delete all Shopify tools linked to this shop
	const deletedTools = await db
		.delete(agentTools)
		.where(and(eq(agentTools.integrationSource, "shopify"), eq(agentTools.integrationId, shopId)))
		.returning({ id: agentTools.id });

	if (deletedTools.length > 0) {
		console.log(`[shopify] Deleted ${deletedTools.length} Shopify tools for shop ${shopId}`);
	}

	// 2. Delete all shop-agent links
	const deletedLinks = await db
		.delete(shopifyShopAgents)
		.where(eq(shopifyShopAgents.shopId, shopId))
		.returning({ agentId: shopifyShopAgents.agentId });

	if (deletedLinks.length > 0) {
		console.log(`[shopify] Removed ${deletedLinks.length} agent links for shop ${shopId}`);
	}

	// 3. Mark shop as uninstalled and clear credentials
	await db
		.update(shopifyShops)
		.set({
			status: "uninstalled",
			uninstalledAt: new Date(),
			accessToken: "", // Clear access token for security
		})
		.where(eq(shopifyShops.id, shopId));
}

async function handleAppUninstalled(shopId: string) {
	await cleanupShopDisconnect(shopId);
}

/**
 * Handle APP_SUBSCRIPTIONS_UPDATE webhook
 * This is triggered when a subscription status changes (cancelled, expired, etc.)
 */
async function handleSubscriptionUpdate(
	shop: typeof shopifyShops.$inferSelect,
	payload: Record<string, unknown>,
) {
	const db = getDb();
	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const subscriptionPayload = payload as any;

	const appSubscription = subscriptionPayload.app_subscription;
	if (!appSubscription) {
		console.warn("[Shopify] Subscription update webhook missing app_subscription");
		return;
	}

	const chargeId = appSubscription.admin_graphql_api_id; // e.g. "gid://shopify/AppSubscription/12345"
	const status = appSubscription.status; // "ACTIVE", "CANCELLED", "EXPIRED", "FROZEN", etc.

	console.log(`[Shopify] Subscription update for ${shop.shopDomain}: ${status} (${chargeId})`);

	// Find the user associated with this shop
	if (!shop.userId) {
		console.warn(`[Shopify] No user associated with shop ${shop.shopDomain}`);
		return;
	}

	// Find the existing subscription row (used by both branches)
	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(
			and(
				eq(userSubscriptions.userId, shop.userId),
				eq(userSubscriptions.billingProvider, "shopify"),
			),
		)
		.limit(1);

	// Handle reactivation / plan changes via ACTIVE status
	if (status === "ACTIVE") {
		const planName = appSubscription.name as string | undefined;
		const { SHOPIFY_PLAN_NAME_MAP } = await import("../lib/shopify");
		const planId = planName ? SHOPIFY_PLAN_NAME_MAP[planName] : undefined;

		if (planId && planId !== "free") {
			const now = new Date();
			if (subscription) {
				await db
					.update(userSubscriptions)
					.set({
						planId,
						status: "active",
						shopifyChargeId: chargeId,
						cancelAtPeriodEnd: false,
						updatedAt: now,
					})
					.where(eq(userSubscriptions.id, subscription.id));
			} else {
				await db.insert(userSubscriptions).values({
					userId: shop.userId,
					planId,
					status: "active",
					billingProvider: "shopify",
					shopifyChargeId: chargeId,
					billingPeriodStart: now,
					billingPeriodEnd: new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()),
				});
			}
			console.log(`[Shopify] Activated ${planId} plan for user ${shop.userId} via webhook`);
		}
		return;
	}

	// Handle subscription status changes (cancel, expire, freeze)
	if (status === "CANCELLED" || status === "EXPIRED" || status === "FROZEN") {
		if (subscription) {
			const isCancelledOrExpired = status === "CANCELLED" || status === "EXPIRED";
			const stillInPeriod =
				subscription.billingPeriodEnd && subscription.billingPeriodEnd > new Date();

			if (isCancelledOrExpired && stillInPeriod) {
				// Billing period still active — keep the paid plan, mark as canceled.
				// Read-time checks will downgrade to free once period expires.
				await db
					.update(userSubscriptions)
					.set({
						status: "canceled",
						cancelAtPeriodEnd: true,
						updatedAt: new Date(),
					})
					.where(eq(userSubscriptions.id, subscription.id));
			} else {
				// Period expired or account frozen — immediately downgrade to free
				if (isCancelledOrExpired) {
					await restoreBrandingForUser(shop.userId);
				}

				await db
					.update(userSubscriptions)
					.set({
						planId: "free",
						status: isCancelledOrExpired ? "canceled" : "past_due",
						cancelAtPeriodEnd: false,
						updatedAt: new Date(),
					})
					.where(eq(userSubscriptions.id, subscription.id));
			}

			console.log(`[Shopify] Updated subscription ${subscription.id} to ${status}`);
		}
	}
}

async function handleOrderWebhook(
	shop: typeof shopifyShops.$inferSelect,
	payload: Record<string, unknown>,
) {
	const db = getDb();

	// Check if we have a customer record
	let customerId: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const customerData = (payload as any).customer;
	if (customerData?.id) {
		const [existingCustomer] = await db
			.select()
			.from(shopifyCustomers)
			.where(
				and(
					eq(shopifyCustomers.shopId, shop.id),
					eq(shopifyCustomers.shopifyCustomerId, String(customerData.id)),
				),
			)
			.limit(1);
		customerId = existingCustomer?.id;
	}

	// Transform and upsert order
	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const orderData = transformOrderToSchema(shop.id, payload as any, customerId);

	await db
		.insert(shopifyOrders)
		.values(orderData)
		.onConflictDoUpdate({
			target: [shopifyOrders.shopId, shopifyOrders.shopifyOrderId],
			set: {
				financialStatus: orderData.financialStatus,
				fulfillmentStatus: orderData.fulfillmentStatus,
				totalPrice: orderData.totalPrice,
				lineItems: orderData.lineItems,
				trackingNumber: orderData.trackingNumber,
				trackingUrl: orderData.trackingUrl,
				trackingCompany: orderData.trackingCompany,
				cancelledAt: orderData.cancelledAt,
				closedAt: orderData.closedAt,
				shopifyUpdatedAt: orderData.shopifyUpdatedAt,
				updatedAt: new Date(),
			},
		});
}

async function handleCustomerWebhook(
	shop: typeof shopifyShops.$inferSelect,
	payload: Record<string, unknown>,
) {
	const db = getDb();

	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const customerData = transformCustomerToSchema(shop.id, payload as any);

	await db
		.insert(shopifyCustomers)
		.values(customerData)
		.onConflictDoUpdate({
			target: [shopifyCustomers.shopId, shopifyCustomers.shopifyCustomerId],
			set: {
				email: customerData.email,
				firstName: customerData.firstName,
				lastName: customerData.lastName,
				phone: customerData.phone,
				ordersCount: customerData.ordersCount,
				totalSpent: customerData.totalSpent,
				tags: customerData.tags,
				note: customerData.note,
				acceptsMarketing: customerData.acceptsMarketing,
				updatedAt: new Date(),
			},
		});
}

async function handleRefundWebhook(
	shop: typeof shopifyShops.$inferSelect,
	payload: Record<string, unknown>,
) {
	const db = getDb();

	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const refund = payload as any;
	const orderId = refund.order_id;

	// Find the order in our system
	const [order] = await db
		.select()
		.from(shopifyOrders)
		.where(
			and(eq(shopifyOrders.shopId, shop.id), eq(shopifyOrders.shopifyOrderId, String(orderId))),
		)
		.limit(1);

	if (order) {
		// Update order financial status
		await db
			.update(shopifyOrders)
			.set({
				financialStatus: "refunded",
				updatedAt: new Date(),
			})
			.where(eq(shopifyOrders.id, order.id));

		// If we have a pending refund request, mark it as processed
		const [pendingRequest] = await db
			.select()
			.from(shopifyRefundRequests)
			.where(
				and(
					eq(shopifyRefundRequests.orderId, order.id),
					eq(shopifyRefundRequests.status, "approved"),
				),
			)
			.limit(1);

		if (pendingRequest) {
			await db
				.update(shopifyRefundRequests)
				.set({
					status: "processed",
					shopifyRefundId: String(refund.id),
					updatedAt: new Date(),
				})
				.where(eq(shopifyRefundRequests.id, pendingRequest.id));
		}
	}
}

async function handleProductWebhook(
	shop: typeof shopifyShops.$inferSelect,
	payload: Record<string, unknown>,
	action: "upsert" | "delete",
) {
	const db = getDb();
	// biome-ignore lint/suspicious/noExplicitAny: Shopify webhook payload
	const product = payload as any;

	if (action === "delete") {
		await db
			.delete(shopifyProducts)
			.where(
				and(
					eq(shopifyProducts.shopId, shop.id),
					eq(shopifyProducts.shopifyProductId, String(product.id)),
				),
			);
		console.log(`[Shopify Webhook] Deleted product ${product.id} for ${shop.shopDomain}`);
		return;
	}

	const productData = transformProductToSchema(shop.id, product);
	await db
		.insert(shopifyProducts)
		.values(productData)
		.onConflictDoUpdate({
			target: [shopifyProducts.shopId, shopifyProducts.shopifyProductId],
			set: {
				title: productData.title,
				handle: productData.handle,
				description: productData.description,
				vendor: productData.vendor,
				productType: productData.productType,
				status: productData.status,
				tags: productData.tags,
				variants: productData.variants,
				images: productData.images,
				shopifyUpdatedAt: productData.shopifyUpdatedAt,
				publishedAt: productData.publishedAt,
				updatedAt: new Date(),
			},
		});
	console.log(`[Shopify Webhook] Upserted product ${product.id} for ${shop.shopDomain}`);
}

// ============ COMPLIANCE WEBHOOK HANDLERS ============

interface CustomerDataRequestPayload {
	shop_id: number;
	shop_domain: string;
	orders_requested: number[];
	customer: {
		id: number;
		email: string;
		phone?: string;
	};
	data_request: {
		id: number;
	};
}

interface CustomerRedactPayload {
	shop_id: number;
	shop_domain: string;
	customer: {
		id: number;
		email: string;
		phone?: string;
	};
	orders_to_redact: number[];
}

interface ShopRedactPayload {
	shop_id: number;
	shop_domain: string;
}

/**
 * Handle customers/data_request webhook
 * Customer requests a copy of their data (GDPR Article 15)
 * Must be fulfilled within 30 days
 */
async function handleCustomerDataRequest(
	shop: typeof shopifyShops.$inferSelect | null,
	shopDomain: string,
	payload: Record<string, unknown>,
) {
	const db = getDb();
	const data = payload as unknown as CustomerDataRequestPayload;

	// Create audit log entry immediately
	const [auditLog] = await db
		.insert(shopifyComplianceAuditLog)
		.values({
			shopId: shop?.id,
			shopDomain,
			action: "customers/data_request",
			shopifyCustomerId: String(data.customer.id),
			customerEmail: data.customer.email,
			status: "processing",
			requestPayload: payload,
		})
		.returning();

	try {
		// Gather all customer data
		const customerData: Record<string, unknown> = {
			request_id: data.data_request.id,
			shop_domain: shopDomain,
			customer_id: data.customer.id,
			customer_email: data.customer.email,
			exported_at: new Date().toISOString(),
			data: {},
		};

		if (shop) {
			// Get customer record
			const [customer] = await db
				.select()
				.from(shopifyCustomers)
				.where(
					and(
						eq(shopifyCustomers.shopId, shop.id),
						eq(shopifyCustomers.shopifyCustomerId, String(data.customer.id)),
					),
				)
				.limit(1);

			if (customer) {
				customerData.data = {
					...(customerData.data as object),
					customer_profile: {
						email: customer.email,
						firstName: customer.firstName,
						lastName: customer.lastName,
						phone: customer.phone,
						ordersCount: customer.ordersCount,
						totalSpent: customer.totalSpent,
						currency: customer.currency,
						tags: customer.tags,
						note: customer.note,
						acceptsMarketing: customer.acceptsMarketing,
						createdAt: customer.createdAt,
					},
				};

				// Get orders
				const orders = await db
					.select()
					.from(shopifyOrders)
					.where(eq(shopifyOrders.customerId, customer.id));

				customerData.data = {
					...(customerData.data as object),
					orders: orders.map((o) => ({
						orderNumber: o.orderNumber,
						totalPrice: o.totalPrice,
						currency: o.currency,
						financialStatus: o.financialStatus,
						fulfillmentStatus: o.fulfillmentStatus,
						lineItems: o.lineItems,
						shippingAddress: o.shippingAddress,
						createdAt: o.shopifyCreatedAt,
					})),
				};
			}

			// Get conversations with this customer email
			const agentLinks = await db
				.select({ agentId: shopifyShopAgents.agentId })
				.from(shopifyShopAgents)
				.where(eq(shopifyShopAgents.shopId, shop.id));

			if (agentLinks.length > 0) {
				const agentIds = agentLinks.map((l) => l.agentId);
				const convos = await db
					.select()
					.from(conversations)
					.where(
						and(
							inArray(conversations.agentId, agentIds),
							sql`${conversations.userMetadata}->>'email' = ${data.customer.email}`,
						),
					);

				if (convos.length > 0) {
					const convoIds = convos.map((c) => c.id);
					const msgs = await db
						.select()
						.from(chatMessages)
						.where(inArray(chatMessages.conversationId, convoIds));

					customerData.data = {
						...(customerData.data as object),
						conversations: convos.map((c) => ({
							id: c.id,
							title: c.title,
							channel: c.channel,
							status: c.status,
							createdAt: c.createdAt,
							messages: msgs
								.filter((m) => m.conversationId === c.id)
								.map((m) => ({
									role: m.role,
									content: m.content,
									createdAt: m.createdAt,
								})),
						})),
					};
				}
			}
		}

		// Store the data export (in production, upload to S3/storage and generate signed URL)
		const exportJson = JSON.stringify(customerData, null, 2);
		const exportUrl = `data:application/json;base64,${Buffer.from(exportJson).toString("base64")}`;
		const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

		// Update audit log with export URL
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "completed",
				dataExportUrl: exportUrl,
				dataExportExpiresAt: expiresAt,
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));

		// Send email notification to shop owner
		if (shop?.userId) {
			const [owner] = await db
				.select({ email: users.email, name: users.name })
				.from(users)
				.where(eq(users.id, shop.userId))
				.limit(1);

			if (owner) {
				try {
					const resend = new Resend(process.env.RESEND_API_KEY);
					const dashboardUrl = process.env.DASHBOARD_URL || "https://app.ansa.so";

					await resend.emails.send({
						from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
						to: owner.email,
						subject: `📋 Customer Data Request - ${data.customer.email}`,
						html: `
							<h2>Customer Data Export Request</h2>
							<p>A customer has requested a copy of their data under GDPR/CCPA.</p>
							<ul>
								<li><strong>Shop:</strong> ${shopDomain}</li>
								<li><strong>Customer Email:</strong> ${data.customer.email}</li>
								<li><strong>Request ID:</strong> ${data.data_request.id}</li>
							</ul>
							<p>The data export has been compiled and is available for 30 days.</p>
							<p><a href="${dashboardUrl}/settings/compliance">View in Dashboard</a></p>
							<p><small>This request must be fulfilled within 30 days per GDPR requirements.</small></p>
						`,
					});
				} catch (emailError) {
					console.error(
						"[Shopify Compliance] Failed to send data request notification:",
						emailError,
					);
				}
			}
		}

		console.log(
			`[Shopify Compliance] Customer data request processed for ${data.customer.email} at ${shopDomain}`,
		);
	} catch (error) {
		console.error("[Shopify Compliance] Error processing customer data request:", error);
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "failed",
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));
	}
}

/**
 * Handle customers/redact webhook
 * Customer requests deletion of their data (GDPR Article 17 - Right to Erasure)
 * Must be completed within 30 days
 */
async function handleCustomerRedact(
	shop: typeof shopifyShops.$inferSelect | null,
	shopDomain: string,
	payload: Record<string, unknown>,
) {
	const db = getDb();
	const data = payload as unknown as CustomerRedactPayload;

	// Create audit log entry
	const [auditLog] = await db
		.insert(shopifyComplianceAuditLog)
		.values({
			shopId: shop?.id,
			shopDomain,
			action: "customers/redact",
			shopifyCustomerId: String(data.customer.id),
			customerEmail: data.customer.email,
			status: "processing",
			requestPayload: payload,
		})
		.returning();

	try {
		if (shop) {
			// Delete customer record (this will anonymize orders via SET NULL)
			await db
				.delete(shopifyCustomers)
				.where(
					and(
						eq(shopifyCustomers.shopId, shop.id),
						eq(shopifyCustomers.shopifyCustomerId, String(data.customer.id)),
					),
				);

			// Anonymize customer email in orders
			await db
				.update(shopifyOrders)
				.set({
					customerEmail: "[REDACTED]",
					shippingAddress: { name: "[REDACTED]" },
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(shopifyOrders.shopId, shop.id),
						eq(shopifyOrders.customerEmail, data.customer.email),
					),
				);

			// Anonymize customer data in conversations
			const agentLinks = await db
				.select({ agentId: shopifyShopAgents.agentId })
				.from(shopifyShopAgents)
				.where(eq(shopifyShopAgents.shopId, shop.id));

			if (agentLinks.length > 0) {
				const agentIds = agentLinks.map((l) => l.agentId);
				await db
					.update(conversations)
					.set({
						userMetadata: { redacted: true, redactedAt: new Date().toISOString() },
						updatedAt: new Date(),
					})
					.where(
						and(
							inArray(conversations.agentId, agentIds),
							sql`${conversations.userMetadata}->>'email' = ${data.customer.email}`,
						),
					);
			}
		}

		// Mark as completed
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "completed",
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));

		// Notify shop owner
		if (shop?.userId) {
			const [owner] = await db
				.select({ email: users.email })
				.from(users)
				.where(eq(users.id, shop.userId))
				.limit(1);

			if (owner) {
				try {
					const resend = new Resend(process.env.RESEND_API_KEY);
					await resend.emails.send({
						from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
						to: owner.email,
						subject: `🗑️ Customer Data Deleted - ${data.customer.email}`,
						html: `
							<h2>Customer Data Deletion Completed</h2>
							<p>A customer's data has been deleted per their GDPR/CCPA request.</p>
							<ul>
								<li><strong>Shop:</strong> ${shopDomain}</li>
								<li><strong>Customer Email:</strong> ${data.customer.email}</li>
							</ul>
							<p>All customer records, order emails, and conversation data have been anonymized or deleted.</p>
						`,
					});
				} catch (emailError) {
					console.error("[Shopify Compliance] Failed to send redact notification:", emailError);
				}
			}
		}

		console.log(
			`[Shopify Compliance] Customer data redacted for ${data.customer.email} at ${shopDomain}`,
		);
	} catch (error) {
		console.error("[Shopify Compliance] Error processing customer redact:", error);
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "failed",
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));
	}
}

/**
 * Handle shop/redact webhook
 * Merchant uninstalled the app - delete ALL shop data
 * Sent 48 hours after uninstall, must complete within 30 days
 */
async function handleShopRedact(
	shop: typeof shopifyShops.$inferSelect | null,
	shopDomain: string,
	payload: Record<string, unknown>,
) {
	const db = getDb();

	// Create audit log entry (don't associate with shopId since we're deleting it)
	const [auditLog] = await db
		.insert(shopifyComplianceAuditLog)
		.values({
			shopId: null, // Will be deleted
			shopDomain,
			action: "shop/redact",
			status: "processing",
			requestPayload: payload,
		})
		.returning();

	try {
		if (shop) {
			// Get user for notification before deletion
			const userId = shop.userId;
			let ownerEmail: string | null = null;

			if (userId) {
				const [owner] = await db
					.select({ email: users.email })
					.from(users)
					.where(eq(users.id, userId))
					.limit(1);
				ownerEmail = owner?.email || null;
			}

			// Delete all shop data (cascade will handle related records)
			// 1. shopifyCustomers (cascade deletes orders via customer_id SET NULL already handled)
			// 2. shopifyOrders
			// 3. shopifyProducts
			// 4. shopifyRefundRequests
			// 5. shopifyShopAgents
			// 6. agentTools with integrationSource='shopify'

			await db.delete(shopifyCustomers).where(eq(shopifyCustomers.shopId, shop.id));
			await db.delete(shopifyOrders).where(eq(shopifyOrders.shopId, shop.id));
			await db.delete(shopifyProducts).where(eq(shopifyProducts.shopId, shop.id));
			await db.delete(shopifyRefundRequests).where(eq(shopifyRefundRequests.shopId, shop.id));
			await db.delete(shopifyShopAgents).where(eq(shopifyShopAgents.shopId, shop.id));
			await db
				.delete(agentTools)
				.where(
					and(eq(agentTools.integrationSource, "shopify"), eq(agentTools.integrationId, shop.id)),
				);

			// Finally delete the shop record
			await db.delete(shopifyShops).where(eq(shopifyShops.id, shop.id));

			// Notify the user
			if (ownerEmail) {
				try {
					const resend = new Resend(process.env.RESEND_API_KEY);
					await resend.emails.send({
						from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
						to: ownerEmail,
						subject: `🏪 Shop Data Deleted - ${shopDomain}`,
						html: `
							<h2>Shop Data Deletion Completed</h2>
							<p>All data for your Shopify store has been permanently deleted per GDPR/CCPA requirements.</p>
							<ul>
								<li><strong>Shop:</strong> ${shopDomain}</li>
								<li><strong>Deleted:</strong> Customers, orders, products, conversations, and all associated data</li>
							</ul>
							<p>This action was triggered 48 hours after app uninstallation as required by Shopify's privacy policy.</p>
						`,
					});
				} catch (emailError) {
					console.error(
						"[Shopify Compliance] Failed to send shop redact notification:",
						emailError,
					);
				}
			}
		}

		// Mark as completed
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "completed",
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));

		console.log(`[Shopify Compliance] Shop data redacted for ${shopDomain}`);
	} catch (error) {
		console.error("[Shopify Compliance] Error processing shop redact:", error);
		await db
			.update(shopifyComplianceAuditLog)
			.set({
				status: "failed",
				errorMessage: error instanceof Error ? error.message : "Unknown error",
				updatedAt: new Date(),
			})
			.where(eq(shopifyComplianceAuditLog.id, auditLog.id));
	}
}

// ============ API ENDPOINTS ============

/**
 * GET /shopify/shops
 * List connected Shopify shops for the current user
 */
shopify.get("/shops", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	const shops = await db
		.select({
			id: shopifyShops.id,
			shopDomain: shopifyShops.shopDomain,
			shopName: shopifyShops.shopName,
			shopEmail: shopifyShops.shopEmail,
			status: shopifyShops.status,
			lastSyncAt: shopifyShops.lastSyncAt,
			installedAt: shopifyShops.installedAt,
		})
		.from(shopifyShops)
		.where(and(eq(shopifyShops.userId, user.id), ne(shopifyShops.status, "uninstalled")));

	// Get order and customer counts for each shop
	const shopsWithCounts = await Promise.all(
		shops.map(async (shop) => {
			const [orderCount] = await db
				.select({ count: count() })
				.from(shopifyOrders)
				.where(eq(shopifyOrders.shopId, shop.id));
			const [customerCount] = await db
				.select({ count: count() })
				.from(shopifyCustomers)
				.where(eq(shopifyCustomers.shopId, shop.id));
			const [productCount] = await db
				.select({ count: count() })
				.from(shopifyProducts)
				.where(eq(shopifyProducts.shopId, shop.id));

			return {
				...shop,
				ordersCount: Number(orderCount?.count || 0),
				customersCount: Number(customerCount?.count || 0),
				productsCount: Number(productCount?.count || 0),
			};
		}),
	);

	return c.json(shopsWithCounts);
});

/**
 * GET /shopify/shops/:shopId
 * Get a single shop with its linked agents
 */
shopify.get("/shops/:shopId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	const [shop] = await db
		.select({
			id: shopifyShops.id,
			shopDomain: shopifyShops.shopDomain,
			shopName: shopifyShops.shopName,
			shopEmail: shopifyShops.shopEmail,
			status: shopifyShops.status,
			lastSyncAt: shopifyShops.lastSyncAt,
			installedAt: shopifyShops.installedAt,
		})
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Get counts
	const [orderCount] = await db
		.select({ count: count() })
		.from(shopifyOrders)
		.where(eq(shopifyOrders.shopId, shop.id));
	const [customerCount] = await db
		.select({ count: count() })
		.from(shopifyCustomers)
		.where(eq(shopifyCustomers.shopId, shop.id));

	// Get linked agents
	const linkedAgents = await db
		.select({
			id: shopifyShopAgents.id,
			shopId: shopifyShopAgents.shopId,
			agentId: shopifyShopAgents.agentId,
			refundAutoApproveLimit: shopifyShopAgents.refundAutoApproveLimit,
			createdAt: shopifyShopAgents.createdAt,
		})
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.shopId, shopId));

	return c.json({
		...shop,
		ordersCount: Number(orderCount?.count || 0),
		customersCount: Number(customerCount?.count || 0),
		agents: linkedAgents,
	});
});

/**
 * POST /shopify/shops/:shopId/sync
 * Manually trigger a sync for a Shopify shop
 */
shopify.post("/shops/:shopId/sync", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	if (shop.status !== "active") {
		return c.json({ error: "Shop is not active" }, 400);
	}

	try {
		console.log(`[Shopify] Manual sync triggered for ${shop.shopDomain}`);
		const result = await syncShopData(shop);

		// Update last sync time
		await db
			.update(shopifyShops)
			.set({ lastSyncAt: new Date() })
			.where(eq(shopifyShops.id, shopId));

		return c.json({
			success: true,
			synced: result,
		});
	} catch (err) {
		console.error(`[Shopify] Manual sync failed for ${shop.shopDomain}:`, err);
		return c.json({ error: "Sync failed", details: String(err) }, 500);
	}
});

/**
 * GET /shopify/shops/:shopId/agents
 * Get agents linked to a Shopify shop
 */
shopify.get("/shops/:shopId/agents", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	const linkedAgents = await db
		.select({
			id: shopifyShopAgents.id,
			agentId: shopifyShopAgents.agentId,
			agentName: agents.name,
			isPrimary: shopifyShopAgents.isPrimary,
			refundAutoApproveLimit: shopifyShopAgents.refundAutoApproveLimit,
		})
		.from(shopifyShopAgents)
		.innerJoin(agents, eq(shopifyShopAgents.agentId, agents.id))
		.where(eq(shopifyShopAgents.shopId, shopId));

	return c.json({ agents: linkedAgents });
});

/**
 * POST /shopify/shops/:shopId/agents
 * Link an agent to a Shopify shop
 */
shopify.post("/shops/:shopId/agents", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const { agentId, isPrimary, refundAutoApproveLimit } = await c.req.json();
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Verify agent belongs to user
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, user.id)))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// If setting as primary, unset other primaries
	if (isPrimary) {
		await db
			.update(shopifyShopAgents)
			.set({ isPrimary: false })
			.where(eq(shopifyShopAgents.shopId, shopId));
	}

	// Create link
	const [link] = await db
		.insert(shopifyShopAgents)
		.values({
			shopId,
			agentId,
			isPrimary: isPrimary ?? false,
			refundAutoApproveLimit: refundAutoApproveLimit ?? 0,
		})
		.onConflictDoUpdate({
			target: [shopifyShopAgents.shopId, shopifyShopAgents.agentId],
			set: {
				isPrimary: isPrimary ?? false,
				refundAutoApproveLimit: refundAutoApproveLimit ?? 0,
			},
		})
		.returning();

	// Auto-create Shopify integration tools for this agent
	try {
		// Check if Shopify tools already exist for this agent/shop combination
		const existingTools = await db
			.select({ id: agentTools.id })
			.from(agentTools)
			.where(
				and(
					eq(agentTools.agentId, agentId),
					eq(agentTools.integrationSource, "shopify"),
					eq(agentTools.integrationId, shopId),
				),
			);

		// Only create tools if they don't already exist
		if (existingTools.length === 0) {
			const shopifyTools = createShopifyToolDefinitions({
				shopId,
				shopDomain: shop.shopDomain,
				agentId,
			});

			if (shopifyTools.length > 0) {
				await db.insert(agentTools).values(shopifyTools as any);
				console.log(`[shopify] Created ${shopifyTools.length} Shopify tools for agent ${agentId}`);
			}
		}
	} catch (err) {
		console.error("[shopify] Failed to create Shopify tools:", err);
		// Don't fail the linking - tools can be created manually if needed
	}

	// If primary, update the metafield and script tag
	if (isPrimary && shop.status === "active") {
		// Set agent metafield on AppInstallation for theme app extension
		try {
			await setAgentMetafield({ shop: shop.shopDomain, accessToken: shop.accessToken }, agentId);
		} catch (err) {
			console.error("Failed to set agent metafield:", err);
		}

		// Inject widget script tag (legacy, kept for existing installs)
		try {
			const widgetConfig = getWidgetConfig(agentId);
			const { widgetScriptTag, identificationScriptTag } = await injectWidgetScriptTag(
				{ shop: shop.shopDomain, accessToken: shop.accessToken },
				widgetConfig,
			);

			// Update stored script tag IDs
			await db
				.update(shopifyShops)
				.set({
					scriptTagId: String(widgetScriptTag.id),
					identificationScriptTagId: String(identificationScriptTag.id),
				})
				.where(eq(shopifyShops.id, shop.id));
		} catch (err) {
			console.error("Failed to update script tags:", err);
		}
	}

	return c.json({ link });
});

/**
 * POST /shopify/shops/:shopId/install-widget
 * Manually install/reinstall the widget script tag
 */
shopify.post("/shops/:shopId/install-widget", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	if (shop.status !== "active") {
		return c.json({ error: "Shop is not active" }, 400);
	}

	// Find the primary agent
	const [primaryAgent] = await db
		.select()
		.from(shopifyShopAgents)
		.where(and(eq(shopifyShopAgents.shopId, shopId), eq(shopifyShopAgents.isPrimary, true)))
		.limit(1);

	if (!primaryAgent) {
		return c.json({ error: "No primary agent linked. Please link an agent first." }, 400);
	}

	try {
		// Set agent metafield on AppInstallation for theme app extension
		await setAgentMetafield(
			{ shop: shop.shopDomain, accessToken: shop.accessToken },
			primaryAgent.agentId,
		);

		// Inject widget script tag (legacy fallback, non-critical)
		try {
			const widgetConfig = getWidgetConfig(primaryAgent.agentId);
			const { widgetScriptTag, identificationScriptTag } = await injectWidgetScriptTag(
				{ shop: shop.shopDomain, accessToken: shop.accessToken },
				widgetConfig,
			);

			await db
				.update(shopifyShops)
				.set({
					scriptTagId: String(widgetScriptTag.id),
					identificationScriptTagId: String(identificationScriptTag.id),
				})
				.where(eq(shopifyShops.id, shopId));
		} catch (scriptErr) {
			// Script tags require read_script_tags/write_script_tags scopes which
			// may not be granted. This is fine — the theme app extension is primary.
			console.warn("[Shopify] Legacy script tag injection skipped:", scriptErr);
		}

		return c.json({ success: true });
	} catch (err) {
		if (err instanceof ShopifyAuthError) {
			const reconnectUrl = `${shopifyConfig.appUrl}/shopify/install?shop=${encodeURIComponent(shop.shopDomain)}&redirect=1`;
			return c.json(
				{
					error: "token_invalid",
					message: "Shopify access token is invalid. Please reconnect your store.",
					reconnectUrl,
				},
				401,
			);
		}
		console.error("Failed to install widget:", err);
		return c.json({ error: "Failed to install widget", details: String(err) }, 500);
	}
});

/**
 * POST /shopify/shops/:shopId/sync-tools
 * Create or sync Shopify tools for all linked agents
 * Query param: ?force=true to delete and recreate existing tools
 */
shopify.post("/shops/:shopId/sync-tools", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const force = c.req.query("force") === "true";
	const user = getUser(c);
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Get all linked agents
	const linkedAgents = await db
		.select({ agentId: shopifyShopAgents.agentId })
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.shopId, shopId));

	if (linkedAgents.length === 0) {
		return c.json({ error: "No agents linked to this shop" }, 400);
	}

	const results = {
		total: linkedAgents.length,
		created: 0,
		updated: 0,
		skipped: 0,
		errors: [] as string[],
	};

	for (const { agentId } of linkedAgents) {
		try {
			// Check if tools already exist
			const existingTools = await db
				.select({ id: agentTools.id })
				.from(agentTools)
				.where(
					and(
						eq(agentTools.agentId, agentId),
						eq(agentTools.integrationSource, "shopify"),
						eq(agentTools.integrationId, shopId),
					),
				);

			if (existingTools.length > 0) {
				if (force) {
					// Delete existing tools and recreate
					await db
						.delete(agentTools)
						.where(
							and(
								eq(agentTools.agentId, agentId),
								eq(agentTools.integrationSource, "shopify"),
								eq(agentTools.integrationId, shopId),
							),
						);
					console.log(
						`[shopify] Deleted ${existingTools.length} existing tools for agent ${agentId}`,
					);
				} else {
					results.skipped++;
					continue;
				}
			}

			// Create tools
			const shopifyTools = createShopifyToolDefinitions({
				shopId,
				shopDomain: shop.shopDomain,
				agentId,
			});

			if (shopifyTools.length > 0) {
				await db.insert(agentTools).values(shopifyTools as any);
			}
			if (existingTools.length > 0) {
				results.updated++;
				console.log(`[shopify] Recreated ${shopifyTools.length} tools for agent ${agentId}`);
			} else {
				results.created++;
				console.log(`[shopify] Created ${shopifyTools.length} tools for agent ${agentId}`);
			}
		} catch (err) {
			console.error(`[shopify] Failed to create tools for agent ${agentId}:`, err);
			results.errors.push(`Agent ${agentId}: ${err}`);
		}
	}

	return c.json({
		success: true,
		message: force
			? `Recreated tools for ${results.updated} agents, created for ${results.created}`
			: `Created tools for ${results.created} agents, skipped ${results.skipped}`,
		...results,
	});
});

/**
 * POST /shopify/shops/update-identification-scripts
 * Update all active shops with customer identification scripts (migration endpoint)
 */
shopify.post("/shops/update-identification-scripts", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	// Get all active shops for this user
	const shops = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.userId, user.id), eq(shopifyShops.status, "active")));

	const results = {
		total: shops.length,
		updated: 0,
		failed: 0,
		errors: [] as Array<{ shopDomain: string; error: string }>,
	};

	for (const shop of shops) {
		if (!shop.accessToken) {
			results.failed++;
			results.errors.push({
				shopDomain: shop.shopDomain,
				error: "Missing access token",
			});
			continue;
		}

		try {
			// Get primary agent for this shop
			const [primaryAgent] = await db
				.select()
				.from(shopifyShopAgents)
				.where(and(eq(shopifyShopAgents.shopId, shop.id), eq(shopifyShopAgents.isPrimary, true)))
				.limit(1);

			if (!primaryAgent) {
				results.failed++;
				results.errors.push({
					shopDomain: shop.shopDomain,
					error: "No primary agent linked",
				});
				continue;
			}

			// Set agent metafield on AppInstallation for theme app extension
			await setAgentMetafield(
				{ shop: shop.shopDomain, accessToken: shop.accessToken },
				primaryAgent.agentId,
			);

			// Re-inject both widget and identification scripts (legacy)
			const widgetConfig = getWidgetConfig(primaryAgent.agentId);
			const { widgetScriptTag, identificationScriptTag } = await injectWidgetScriptTag(
				{ shop: shop.shopDomain, accessToken: shop.accessToken },
				widgetConfig,
			);

			// Update stored script tag IDs
			await db
				.update(shopifyShops)
				.set({
					scriptTagId: String(widgetScriptTag.id),
					identificationScriptTagId: String(identificationScriptTag.id),
				})
				.where(eq(shopifyShops.id, shop.id));

			results.updated++;
			console.log(`[Shopify] Updated identification scripts for ${shop.shopDomain}`);
		} catch (err) {
			results.failed++;
			results.errors.push({
				shopDomain: shop.shopDomain,
				error: String(err),
			});
			console.error(`[Shopify] Failed to update ${shop.shopDomain}:`, err);
		}
	}

	return c.json(results);
});

/**
 * GET /shopify/shops/:shopId/script-tags
 * List all script tags for a shop (for debugging)
 */
shopify.get("/shops/:shopId/script-tags", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	try {
		const tags = await listScriptTags({
			shop: shop.shopDomain,
			accessToken: shop.accessToken,
		});
		return c.json({ scriptTags: tags, storedScriptTagId: shop.scriptTagId });
	} catch (err) {
		return c.json({ error: "Failed to list script tags", details: String(err) }, 500);
	}
});

/**
 * DELETE /shopify/shops/:shopId/script-tags/:tagId
 * Remove a specific script tag
 */
shopify.delete("/shops/:shopId/script-tags/:tagId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const tagId = requireParam(c, "tagId");
	const user = getUser(c);
	const db = getDb();

	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	try {
		await removeScriptTag({ shop: shop.shopDomain, accessToken: shop.accessToken }, tagId);

		// Clear stored ID if it matches
		if (shop.scriptTagId === tagId) {
			await db.update(shopifyShops).set({ scriptTagId: null }).where(eq(shopifyShops.id, shopId));
		}

		return c.json({ success: true });
	} catch (err) {
		return c.json({ error: "Failed to remove script tag", details: String(err) }, 500);
	}
});

/**
 * PUT /shopify/shops/:shopId/agents/:linkId
 * Update agent link settings (refund limit, primary status)
 */
shopify.put("/shops/:shopId/agents/:linkId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const linkId = requireParam(c, "linkId");
	const user = getUser(c);
	const { isPrimary, refundAutoApproveLimit } = await c.req.json();
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// If setting as primary, unset other primaries
	if (isPrimary) {
		await db
			.update(shopifyShopAgents)
			.set({ isPrimary: false })
			.where(eq(shopifyShopAgents.shopId, shopId));
	}

	const [updated] = await db
		.update(shopifyShopAgents)
		.set({
			isPrimary: isPrimary ?? undefined,
			refundAutoApproveLimit: refundAutoApproveLimit ?? undefined,
		})
		.where(eq(shopifyShopAgents.id, linkId))
		.returning();

	return c.json({ link: updated });
});

/**
 * PATCH /shopify/shops/:shopId/agents/:agentId
 * Update agent link settings by agentId (for dashboard compatibility)
 */
shopify.patch("/shops/:shopId/agents/:agentId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const agentId = requireParam(c, "agentId");
	const user = getUser(c);
	const { refundAutoApproveLimit } = await c.req.json();
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Build update object with only provided fields
	const updateData: Record<string, unknown> = {};
	if (refundAutoApproveLimit !== undefined) {
		updateData.refundAutoApproveLimit = refundAutoApproveLimit ?? null;
	}

	const [updated] = await db
		.update(shopifyShopAgents)
		.set(updateData)
		.where(and(eq(shopifyShopAgents.shopId, shopId), eq(shopifyShopAgents.agentId, agentId)))
		.returning();

	if (!updated) {
		return c.json({ error: "Agent link not found" }, 404);
	}

	return c.json(updated);
});

/**
 * DELETE /shopify/shops/:shopId/agents/:agentId
 * Unlink an agent from a shop
 */
shopify.delete("/shops/:shopId/agents/:agentId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const agentId = requireParam(c, "agentId");
	const user = getUser(c);
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Delete the shop-agent link
	await db
		.delete(shopifyShopAgents)
		.where(and(eq(shopifyShopAgents.shopId, shopId), eq(shopifyShopAgents.agentId, agentId)));

	// Delete Shopify integration tools that were auto-created for this agent/shop
	try {
		const deletedTools = await db
			.delete(agentTools)
			.where(
				and(
					eq(agentTools.agentId, agentId),
					eq(agentTools.integrationSource, "shopify"),
					eq(agentTools.integrationId, shopId),
				),
			)
			.returning({ id: agentTools.id });

		if (deletedTools.length > 0) {
			console.log(
				`[shopify] Deleted ${deletedTools.length} Shopify tools for agent ${agentId} (shop ${shopId})`,
			);
		}
	} catch (err) {
		console.error("[shopify] Failed to delete Shopify tools:", err);
		// Don't fail the unlinking
	}

	// If no agents remain linked, remove the metafield so the widget stops rendering
	try {
		const remainingAgents = await db
			.select({ id: shopifyShopAgents.id })
			.from(shopifyShopAgents)
			.where(eq(shopifyShopAgents.shopId, shopId))
			.limit(1);

		if (remainingAgents.length === 0 && shop.accessToken && shop.shopDomain) {
			await removeAgentMetafield({ shop: shop.shopDomain, accessToken: shop.accessToken });
			console.log(`[shopify] Removed agent metafield for ${shop.shopDomain} (last agent unlinked)`);
		}
	} catch (err) {
		console.warn("[shopify] Failed to remove agent metafield:", err);
		// Don't fail the unlinking
	}

	return c.json({ success: true });
});

/**
 * POST /shopify/shops/:shopId/sync
 * Manually trigger a sync for a shop
 */
shopify.post("/shops/:shopId/sync", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	if (shop.status !== "active") {
		return c.json({ error: "Shop is not active" }, 400);
	}

	// Run sync
	const result = await syncShopData(shop);

	return c.json({ success: true, ...result });
});

/**
 * DELETE /shopify/shops/:shopId
 * Disconnect a Shopify shop
 */
shopify.delete("/shops/:shopId", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const db = getDb();

	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Remove widget from Shopify storefront before clearing credentials
	if (shop.accessToken && shop.shopDomain) {
		const opts = { shop: shop.shopDomain, accessToken: shop.accessToken };

		// Remove agent metafield so theme app extension stops rendering widget
		try {
			await removeAgentMetafield(opts);
			console.log(`[shopify] Removed agent metafield for ${shop.shopDomain}`);
		} catch (err) {
			console.warn(`[shopify] Failed to remove agent metafield for ${shop.shopDomain}:`, err);
		}

		// Remove legacy script tags if they exist
		if (shop.scriptTagId) {
			try {
				await removeScriptTag(opts, shop.scriptTagId);
				console.log(`[shopify] Removed widget script tag for ${shop.shopDomain}`);
			} catch (err) {
				console.warn(`[shopify] Failed to remove widget script tag for ${shop.shopDomain}:`, err);
			}
		}
		if (shop.identificationScriptTagId) {
			try {
				await removeScriptTag(opts, shop.identificationScriptTagId);
				console.log(`[shopify] Removed identification script tag for ${shop.shopDomain}`);
			} catch (err) {
				console.warn(
					`[shopify] Failed to remove identification script tag for ${shop.shopDomain}:`,
					err,
				);
			}
		}
	}

	// Clean up all tools, agent links, and mark as uninstalled
	await cleanupShopDisconnect(shopId);

	return c.json({ success: true });
});

/**
 * GET /shopify/refund-requests
 * List all pending refund requests across user's shops
 */
shopify.get("/refund-requests", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const status = c.req.query("status") || "pending";
	const db = getDb();

	// Get all user's shops first
	const userShops = await db
		.select({ id: shopifyShops.id })
		.from(shopifyShops)
		.where(eq(shopifyShops.userId, user.id));

	if (userShops.length === 0) {
		return c.json([]);
	}

	const shopIds = userShops.map((s) => s.id);

	// Join with orders to get order name/number
	const requests = await db
		.select({
			id: shopifyRefundRequests.id,
			shopId: shopifyRefundRequests.shopId,
			orderId: shopifyRefundRequests.orderId,
			conversationId: shopifyRefundRequests.conversationId,
			amount: shopifyRefundRequests.amount,
			currency: shopifyRefundRequests.currency,
			reason: shopifyRefundRequests.reason,
			lineItems: shopifyRefundRequests.lineItems,
			status: shopifyRefundRequests.status,
			reviewedBy: shopifyRefundRequests.reviewedBy,
			reviewedAt: shopifyRefundRequests.reviewedAt,
			reviewNotes: shopifyRefundRequests.reviewNotes,
			shopifyRefundId: shopifyRefundRequests.shopifyRefundId,
			customerName: shopifyRefundRequests.customerName,
			customerEmail: shopifyRefundRequests.customerEmail,
			customerPhone: shopifyRefundRequests.customerPhone,
			emailMismatch: shopifyRefundRequests.emailMismatch,
			errorMessage: shopifyRefundRequests.errorMessage,
			retryCount: shopifyRefundRequests.retryCount,
			lastRetryAt: shopifyRefundRequests.lastRetryAt,
			slackNotified: shopifyRefundRequests.slackNotified,
			emailNotified: shopifyRefundRequests.emailNotified,
			createdAt: shopifyRefundRequests.createdAt,
			updatedAt: shopifyRefundRequests.updatedAt,
			// Join order fields
			orderName: shopifyOrders.orderNumber,
			shopifyOrderId: shopifyOrders.shopifyOrderId,
		})
		.from(shopifyRefundRequests)
		.leftJoin(shopifyOrders, eq(shopifyRefundRequests.orderId, shopifyOrders.id))
		.where(
			eq(shopifyRefundRequests.status, status as "pending" | "approved" | "rejected" | "processed"),
		)
		.orderBy(shopifyRefundRequests.createdAt);

	// Filter to only user's shops
	const userRequests = requests.filter((r) => shopIds.includes(r.shopId));

	return c.json(userRequests);
});

/**
 * GET /shopify/shops/:shopId/refund-requests
 * List pending refund requests for a shop
 */
shopify.get("/shops/:shopId/refund-requests", authMiddleware, requireAuth, async (c) => {
	const shopId = requireParam(c, "shopId");
	const user = getUser(c);
	const status = c.req.query("status") || "pending";
	const db = getDb();

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	const requests = await db
		.select({
			id: shopifyRefundRequests.id,
			orderId: shopifyRefundRequests.orderId,
			orderNumber: shopifyOrders.orderNumber,
			amount: shopifyRefundRequests.amount,
			currency: shopifyRefundRequests.currency,
			reason: shopifyRefundRequests.reason,
			status: shopifyRefundRequests.status,
			createdAt: shopifyRefundRequests.createdAt,
		})
		.from(shopifyRefundRequests)
		.innerJoin(shopifyOrders, eq(shopifyRefundRequests.orderId, shopifyOrders.id))
		.where(and(eq(shopifyRefundRequests.shopId, shopId), eq(shopifyRefundRequests.status, status)));

	return c.json({ requests });
});

/**
 * POST /shopify/refund-requests/:requestId/approve
 * Approve a pending refund request and process via Shopify API
 */
shopify.post("/refund-requests/:requestId/approve", authMiddleware, requireAuth, async (c) => {
	const requestId = requireParam(c, "requestId");
	const user = getUser(c);
	const { notes } = await c.req.json();
	const db = getDb();

	// Get the request with order info
	const [request] = await db
		.select({
			id: shopifyRefundRequests.id,
			shopId: shopifyRefundRequests.shopId,
			orderId: shopifyRefundRequests.orderId,
			amount: shopifyRefundRequests.amount,
			reason: shopifyRefundRequests.reason,
			lineItems: shopifyRefundRequests.lineItems,
			status: shopifyRefundRequests.status,
		})
		.from(shopifyRefundRequests)
		.where(eq(shopifyRefundRequests.id, requestId))
		.limit(1);

	if (!request) {
		return c.json({ error: "Request not found" }, 404);
	}

	if (request.status !== "pending" && request.status !== "failed") {
		return c.json({ error: "Request has already been processed" }, 400);
	}

	// Verify shop belongs to user and get shop details
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, request.shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get order details for Shopify API call
	const [order] = await db
		.select()
		.from(shopifyOrders)
		.where(eq(shopifyOrders.id, request.orderId))
		.limit(1);

	if (!order) {
		return c.json({ error: "Order not found" }, 404);
	}

	// Determine line items to refund
	// If request has specific line items, use those; otherwise refund all line items from the order
	let refundLineItems:
		| Array<{
				line_item_id: number;
				quantity: number;
				restock_type: "return" | "no_restock";
		  }>
		| undefined;

	if (request.lineItems && request.lineItems.length > 0) {
		// Partial refund with specific line items
		refundLineItems = request.lineItems.map((item) => ({
			line_item_id: Number(item.lineItemId),
			quantity: item.quantity,
			restock_type: "return" as const,
		}));
	} else if (order.lineItems && order.lineItems.length > 0) {
		// Full refund - use all order line items
		refundLineItems = order.lineItems.map((item) => ({
			line_item_id: Number(item.id),
			quantity: item.quantity,
			restock_type: "return" as const,
		}));
	}

	// Process refund via Shopify API
	try {
		const refundResult = await createRefund(
			{ shop: shop.shopDomain, accessToken: shop.accessToken },
			{
				orderId: order.shopifyOrderId,
				reason: request.reason || notes || "Approved by merchant",
				notify: true,
				refundLineItems,
			},
		);

		// Update request with success status
		await db
			.update(shopifyRefundRequests)
			.set({
				status: "processed",
				shopifyRefundId: String(refundResult.refund.id),
				reviewedBy: user.id,
				reviewedAt: new Date(),
				reviewNotes: notes,
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(shopifyRefundRequests.id, requestId));

		return c.json({
			success: true,
			message: "Refund processed successfully",
			shopifyRefundId: refundResult.refund.id,
		});
	} catch (error) {
		console.error("Failed to process refund via Shopify:", error);

		// Update request with failed status
		await db
			.update(shopifyRefundRequests)
			.set({
				status: "failed",
				reviewedBy: user.id,
				reviewedAt: new Date(),
				reviewNotes: notes,
				errorMessage: error instanceof Error ? error.message : "Unknown error processing refund",
				updatedAt: new Date(),
			})
			.where(eq(shopifyRefundRequests.id, requestId));

		return c.json(
			{
				success: false,
				error: "Failed to process refund",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		);
	}
});

/**
 * POST /shopify/refund-requests/:requestId/reject
 * Reject a pending refund request
 */
shopify.post("/refund-requests/:requestId/reject", authMiddleware, requireAuth, async (c) => {
	const requestId = requireParam(c, "requestId");
	const user = getUser(c);
	const { notes } = await c.req.json();
	const db = getDb();

	// Get the request and verify ownership
	const [request] = await db
		.select()
		.from(shopifyRefundRequests)
		.where(eq(shopifyRefundRequests.id, requestId))
		.limit(1);

	if (!request) {
		return c.json({ error: "Request not found" }, 404);
	}

	// Verify shop belongs to user
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, request.shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	await db
		.update(shopifyRefundRequests)
		.set({
			status: "rejected",
			reviewedBy: user.id,
			reviewedAt: new Date(),
			reviewNotes: notes,
			updatedAt: new Date(),
		})
		.where(eq(shopifyRefundRequests.id, requestId));

	return c.json({ success: true });
});

/**
 * POST /shopify/refund-requests/:requestId/retry
 * Retry a failed refund request (max 3 retries, 1-minute cooldown)
 */
shopify.post("/refund-requests/:requestId/retry", authMiddleware, requireAuth, async (c) => {
	const requestId = requireParam(c, "requestId");
	const user = getUser(c);
	const db = getDb();

	// Get the request with order info
	const [request] = await db
		.select({
			id: shopifyRefundRequests.id,
			shopId: shopifyRefundRequests.shopId,
			orderId: shopifyRefundRequests.orderId,
			amount: shopifyRefundRequests.amount,
			reason: shopifyRefundRequests.reason,
			lineItems: shopifyRefundRequests.lineItems,
			status: shopifyRefundRequests.status,
			retryCount: shopifyRefundRequests.retryCount,
			lastRetryAt: shopifyRefundRequests.lastRetryAt,
		})
		.from(shopifyRefundRequests)
		.where(eq(shopifyRefundRequests.id, requestId))
		.limit(1);

	if (!request) {
		return c.json({ error: "Request not found" }, 404);
	}

	if (request.status !== "failed") {
		return c.json({ error: "Only failed requests can be retried" }, 400);
	}

	// Check retry limit (max 3 retries)
	if (request.retryCount >= 3) {
		return c.json(
			{
				error: "Maximum retry attempts reached",
				message: "This refund has failed 3 times. Please process it manually in Shopify admin.",
			},
			400,
		);
	}

	// Check cooldown (1 minute between retries)
	if (request.lastRetryAt) {
		const cooldownMs = 60 * 1000; // 1 minute
		const timeSinceLastRetry = Date.now() - request.lastRetryAt.getTime();
		if (timeSinceLastRetry < cooldownMs) {
			const remainingSeconds = Math.ceil((cooldownMs - timeSinceLastRetry) / 1000);
			return c.json(
				{
					error: "Retry cooldown active",
					message: `Please wait ${remainingSeconds} seconds before retrying.`,
					retryAfterSeconds: remainingSeconds,
				},
				429,
			);
		}
	}

	// Verify shop belongs to user and get shop details
	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(and(eq(shopifyShops.id, request.shopId), eq(shopifyShops.userId, user.id)))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Unauthorized" }, 403);
	}

	// Get order details for Shopify API call
	const [order] = await db
		.select()
		.from(shopifyOrders)
		.where(eq(shopifyOrders.id, request.orderId))
		.limit(1);

	if (!order) {
		return c.json({ error: "Order not found" }, 404);
	}

	// Determine line items to refund
	// If request has specific line items, use those; otherwise refund all line items from the order
	let retryRefundLineItems:
		| Array<{
				line_item_id: number;
				quantity: number;
				restock_type: "return" | "no_restock";
		  }>
		| undefined;

	if (request.lineItems && request.lineItems.length > 0) {
		// Partial refund with specific line items
		retryRefundLineItems = request.lineItems.map((item) => ({
			line_item_id: Number(item.lineItemId),
			quantity: item.quantity,
			restock_type: "return" as const,
		}));
	} else if (order.lineItems && order.lineItems.length > 0) {
		// Full refund - use all order line items
		retryRefundLineItems = order.lineItems.map((item) => ({
			line_item_id: Number(item.id),
			quantity: item.quantity,
			restock_type: "return" as const,
		}));
	}

	// Update retry tracking before attempting
	await db
		.update(shopifyRefundRequests)
		.set({
			retryCount: request.retryCount + 1,
			lastRetryAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(shopifyRefundRequests.id, requestId));

	// Process refund via Shopify API
	try {
		const refundResult = await createRefund(
			{ shop: shop.shopDomain, accessToken: shop.accessToken },
			{
				orderId: order.shopifyOrderId,
				reason: request.reason || "Retry after failed attempt",
				notify: true,
				refundLineItems: retryRefundLineItems,
			},
		);

		// Update request with success status
		await db
			.update(shopifyRefundRequests)
			.set({
				status: "processed",
				shopifyRefundId: String(refundResult.refund.id),
				errorMessage: null,
				updatedAt: new Date(),
			})
			.where(eq(shopifyRefundRequests.id, requestId));

		return c.json({
			success: true,
			message: "Refund processed successfully on retry",
			shopifyRefundId: refundResult.refund.id,
		});
	} catch (error) {
		console.error("Failed to retry refund via Shopify:", error);

		// Update error message
		await db
			.update(shopifyRefundRequests)
			.set({
				errorMessage: error instanceof Error ? error.message : "Unknown error processing refund",
				updatedAt: new Date(),
			})
			.where(eq(shopifyRefundRequests.id, requestId));

		return c.json(
			{
				success: false,
				error: "Retry failed",
				message: error instanceof Error ? error.message : "Unknown error",
				retriesRemaining: 3 - (request.retryCount + 1),
			},
			500,
		);
	}
});

// ============ INTERNAL TOOL ENDPOINTS ============
// These endpoints are called by the auto-created Shopify integration tools
// They receive agentId from the tool execution and look up the linked shop

/**
 * POST /shopify/internal/search-products
 * Internal endpoint for the shopify_search_products tool
 * Body: { agentId, query, limit? }
 */
shopify.post("/internal/search-products", async (c) => {
	const db = getDb();

	let body: { agentId: string; query: string; limit?: number };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body. Required: { agentId, query, limit? }" }, 400);
	}

	const { agentId, query, limit = 5 } = body;

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	// Find the shop linked to this agent
	const [shopAgent] = await db
		.select({
			shopId: shopifyShopAgents.shopId,
			shopDomain: shopifyShops.shopDomain,
			currency: shopifyShops.currency,
		})
		.from(shopifyShopAgents)
		.innerJoin(shopifyShops, eq(shopifyShops.id, shopifyShopAgents.shopId))
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return c.json({ error: "No Shopify shop linked to this agent" }, 404);
	}

	// Build search conditions - only return active products
	// TODO: Add publishedAt filter after migration to exclude unpublished products
	const conditions = [
		eq(shopifyProducts.shopId, shopAgent.shopId),
		eq(shopifyProducts.status, "active"),
	];

	if (query) {
		const searchCondition = or(
			ilike(shopifyProducts.title, `%${query}%`),
			ilike(shopifyProducts.description, `%${query}%`),
			sql`${shopifyProducts.tags}::text ILIKE ${`%${query}%`}`,
		);
		if (searchCondition) {
			conditions.push(searchCondition);
		}
	}

	// Fetch products
	const products = await db
		.select()
		.from(shopifyProducts)
		.where(and(...conditions))
		.limit(Math.min(limit, 20));

	// Placeholder image for products without images
	const PLACEHOLDER_IMAGE =
		"https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png";

	// Transform for widget display - filter out products without handle (would cause 404)
	const transformedProducts = products
		.filter((p) => p.handle) // Must have handle for valid URL
		.map((p) => {
			const currency = shopAgent.currency || "USD";
			const allVariants = p.variants || [];
			const firstVariant = allVariants[0];
			const image = p.images?.[0]?.src || PLACEHOLDER_IMAGE;

			const prices = allVariants.map((v) => parseFloat(v.price)).filter((n) => !Number.isNaN(n));
			const minPrice = prices.length ? Math.min(...prices) : 0;
			const maxPrice = prices.length ? Math.max(...prices) : 0;

			const variantsList = allVariants.map((v) => ({
				title: v.title,
				price: `${currency} ${v.price}`,
			}));

			return {
				title: p.title,
				description: p.description?.substring(0, 150) || "",
				price:
					minPrice === maxPrice
						? `${currency} ${minPrice}`
						: `${currency} ${minPrice} - ${maxPrice}`,
				variants: variantsList,
				image,
				url: `https://${shopAgent.shopDomain}/products/${p.handle}`,
				variantId: firstVariant?.id,
				productType: p.productType,
				vendor: p.vendor,
			};
		});

	return c.json({
		products: transformedProducts,
		count: transformedProducts.length,
	});
});

/**
 * POST /shopify/internal/lookup-order
 * Internal endpoint for the shopify_lookup_order tool
 * Body: { agentId, order_number, email? }
 */
shopify.post("/internal/lookup-order", async (c) => {
	const db = getDb();

	let body: { agentId: string; order_number: string; email?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body. Required: { agentId, order_number, email? }" }, 400);
	}

	const { agentId, order_number, email } = body;

	if (!agentId || !order_number) {
		return c.json({ error: "agentId and order_number are required" }, 400);
	}

	// Find the shop linked to this agent
	const [shopAgent] = await db
		.select({ shopId: shopifyShopAgents.shopId })
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return c.json({ error: "No Shopify shop linked to this agent" }, 404);
	}

	// Normalize order number (remove # prefix if present, trim whitespace)
	const normalizedOrderNumber = order_number.replace(/^#/, "").trim();

	// Build conditions - search with and without # prefix
	const conditions = [
		eq(shopifyOrders.shopId, shopAgent.shopId),
		or(
			eq(shopifyOrders.orderNumber, normalizedOrderNumber),
			eq(shopifyOrders.orderNumber, `#${normalizedOrderNumber}`),
			// Also try just the numeric part in case there's extra formatting
			ilike(shopifyOrders.orderNumber, `%${normalizedOrderNumber}`),
		),
	];

	// Optionally verify email
	if (email) {
		conditions.push(eq(shopifyOrders.customerEmail, email.toLowerCase()));
	}

	// Find the order
	const [order] = await db
		.select()
		.from(shopifyOrders)
		.where(and(...conditions))
		.limit(1);

	if (!order) {
		return c.json(
			{
				error: "Order not found",
				message: email
					? "No order found with that number and email combination"
					: "No order found with that number",
			},
			404,
		);
	}

	return c.json({
		order: {
			name: order.orderNumber,
			email: order.customerEmail,
			financial_status: order.financialStatus,
			fulfillment_status: order.fulfillmentStatus || "unfulfilled",
			total_price: `${order.currency || "USD"} ${order.totalPrice}`,
			subtotal_price: order.subtotalPrice
				? `${order.currency || "USD"} ${order.subtotalPrice}`
				: undefined,
			created_at: order.shopifyCreatedAt?.toISOString(),
			line_items: order.lineItems,
			tracking_number: order.trackingNumber,
			tracking_url: order.trackingUrl,
			tracking_company: order.trackingCompany,
			shipping_address: order.shippingAddress,
		},
	});
});

/**
 * POST /shopify/internal/request-refund
 * Internal endpoint for the shopify_request_refund tool
 *
 * Accepts form webhook payload:
 * { submissionId, toolId, toolName, conversationId, formData: { customer_name, customer_email, customer_phone, order_number, reason, amount? }, submittedAt }
 *
 * OR legacy direct API call:
 * { agentId, order_number, reason, amount?, customer_name, customer_email, customer_phone }
 *
 * All refunds now require contact information for identity verification.
 */
shopify.post("/internal/request-refund", async (c) => {
	const db = getDb();

	let rawBody: unknown;
	try {
		rawBody = await c.req.json();
	} catch {
		return c.json(
			{
				error: "Invalid JSON body",
			},
			400,
		);
	}

	// Determine if this is a form webhook submission or legacy direct call
	const isFormSubmission = rawBody && typeof rawBody === "object" && "formData" in rawBody;

	let agentId: string;
	let order_number: string;
	let reason: string;
	let amount: number | undefined;
	let customer_name: string | undefined;
	let customer_email: string | undefined;
	let customer_phone: string | undefined;
	let conversationId: string | null = null;

	if (isFormSubmission) {
		// Form webhook format
		const formPayload = rawBody as {
			submissionId: string;
			toolId: string;
			toolName: string;
			conversationId: string | null;
			formData: {
				customer_name?: string;
				customer_email?: string;
				customer_phone?: string;
				order_number?: string;
				reason?: string;
				amount?: string;
			};
			submittedAt: string;
		};

		// Look up agentId from toolId
		const [tool] = await db
			.select({ agentId: agentTools.agentId })
			.from(agentTools)
			.where(eq(agentTools.id, formPayload.toolId))
			.limit(1);

		if (!tool) {
			return c.json({ error: "Tool not found" }, 404);
		}

		agentId = tool.agentId;
		order_number = formPayload.formData.order_number || "";
		reason = formPayload.formData.reason || "";
		amount = formPayload.formData.amount
			? Number.parseFloat(formPayload.formData.amount)
			: undefined;
		customer_name = formPayload.formData.customer_name;
		customer_email = formPayload.formData.customer_email;
		customer_phone = formPayload.formData.customer_phone;
		conversationId = formPayload.conversationId;
	} else {
		// Legacy direct API call format
		const body = rawBody as {
			agentId?: string;
			order_number?: string;
			reason?: string;
			amount?: number;
			customer_name?: string;
			customer_email?: string;
			customer_phone?: string;
			conversationId?: string;
		};

		agentId = body.agentId || "";
		order_number = body.order_number || "";
		reason = body.reason || "";
		amount = body.amount;
		customer_name = body.customer_name;
		customer_email = body.customer_email;
		customer_phone = body.customer_phone;
		conversationId = body.conversationId || null;
	}

	// Validate required fields
	if (!agentId || !order_number || !reason) {
		return c.json({ error: "order_number and reason are required" }, 400);
	}

	// Contact info is now required for all refunds (identity verification)
	if (!customer_email || !customer_name) {
		return c.json(
			{
				error: "Customer name and email are required for identity verification",
				message: "Please provide your name and email address to proceed with the refund request.",
			},
			400,
		);
	}

	// Find the shop linked to this agent
	const [shopAgent] = await db
		.select({
			shopId: shopifyShopAgents.shopId,
			refundAutoApproveLimit: shopifyShopAgents.refundAutoApproveLimit,
		})
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return c.json({ error: "No Shopify shop linked to this agent" }, 404);
	}

	// Normalize order number
	const normalizedOrderNumber = order_number.replace(/^#/, "");

	// Find the order
	const [order] = await db
		.select()
		.from(shopifyOrders)
		.where(
			and(
				eq(shopifyOrders.shopId, shopAgent.shopId),
				or(
					eq(shopifyOrders.orderNumber, normalizedOrderNumber),
					eq(shopifyOrders.orderNumber, `#${normalizedOrderNumber}`),
				),
			),
		)
		.limit(1);

	if (!order) {
		return c.json({ error: "Order not found", message: "No order found with that number" }, 404);
	}

	// Calculate refund amount (convert to cents for storage)
	const refundAmountDollars = amount ?? Number.parseFloat(order.totalPrice);
	const refundAmountCents = Math.round(refundAmountDollars * 100);
	const autoApproveLimit = shopAgent.refundAutoApproveLimit || 0;

	// Check for email mismatch (fraud detection)
	const orderEmail = order.customerEmail?.toLowerCase().trim();
	const submittedEmail = customer_email.toLowerCase().trim();
	const emailMismatch = orderEmail ? orderEmail !== submittedEmail : false;

	if (emailMismatch) {
		console.warn(
			`[Refund] Email mismatch for order ${order.orderNumber}: ` +
				`order email "${orderEmail}" vs submitted email "${submittedEmail}"`,
		);
	}

	// Auto-approval requires: under limit AND email must match (security check)
	const canAutoApprove =
		autoApproveLimit > 0 && refundAmountCents <= autoApproveLimit && !emailMismatch;

	// Create refund request with correct schema fields
	const [refundRequest] = await db
		.insert(shopifyRefundRequests)
		.values({
			shopId: shopAgent.shopId,
			orderId: order.id,
			conversationId,
			amount: refundAmountCents,
			currency: order.currency || "USD",
			reason,
			status: canAutoApprove ? "approved" : "pending",
			lineItems: null, // Line items removed from simplified form flow
			customerName: customer_name,
			customerEmail: customer_email,
			customerPhone: customer_phone || null,
			emailMismatch,
		})
		.returning();

	// If auto-approved, process the refund immediately
	if (canAutoApprove) {
		// Process refund via Shopify API
		try {
			const [shop] = await db
				.select()
				.from(shopifyShops)
				.where(eq(shopifyShops.id, shopAgent.shopId))
				.limit(1);

			if (shop) {
				// Full refund - use all order line items
				const autoRefundLineItems = order.lineItems?.map((item) => ({
					line_item_id: Number(item.id),
					quantity: item.quantity,
					restock_type: "return" as const,
				}));

				const refundResult = await createRefund(
					{ shop: shop.shopDomain, accessToken: shop.accessToken },
					{
						orderId: order.shopifyOrderId,
						reason,
						notify: true,
						refundLineItems: autoRefundLineItems,
					},
				);

				// Update with Shopify refund ID
				await db
					.update(shopifyRefundRequests)
					.set({
						shopifyRefundId: String(refundResult.refund.id),
						status: "processed",
						updatedAt: new Date(),
					})
					.where(eq(shopifyRefundRequests.id, refundRequest.id));
			}
		} catch (error) {
			console.error("Failed to process auto-approved refund:", error);
			// Update status to failed
			await db
				.update(shopifyRefundRequests)
				.set({
					status: "failed",
					errorMessage: error instanceof Error ? error.message : "Unknown error processing refund",
					updatedAt: new Date(),
				})
				.where(eq(shopifyRefundRequests.id, refundRequest.id));

			return c.json({
				success: false,
				message:
					"Your refund was approved but there was an issue processing it. Our team has been notified and will complete it shortly.",
				status: "failed",
				requestId: refundRequest.id,
			});
		}

		return c.json({
			success: true,
			message: `Refund of $${refundAmountDollars.toFixed(2)} has been automatically approved and processed. You should receive a confirmation email shortly.`,
			status: "processed",
			requestId: refundRequest.id,
		});
	}

	// Send notifications for pending refund
	await sendRefundEscalationNotifications(db, agentId, refundRequest.id, {
		orderNumber: order.orderNumber,
		amount: refundAmountDollars,
		currency: order.currency || "USD",
		reason,
		customerName: customer_name,
		customerEmail: customer_email,
		customerPhone: customer_phone,
		emailMismatch,
		orderEmail: order.customerEmail,
	});

	return c.json({
		success: true,
		message: `Thank you! Your refund request for $${refundAmountDollars.toFixed(2)} has been submitted. Our team will review it and contact you at ${customer_email} within 24-48 hours.`,
		status: "pending",
		requestId: refundRequest.id,
	});
});

/**
 * Helper function to send refund escalation notifications (email + Slack)
 */
async function sendRefundEscalationNotifications(
	db: ReturnType<typeof getDb>,
	agentId: string,
	refundRequestId: string,
	details: {
		orderNumber: string;
		amount: number;
		currency: string;
		reason: string;
		customerName?: string;
		customerEmail?: string;
		customerPhone?: string;
		emailMismatch?: boolean;
		orderEmail?: string | null;
	},
) {
	try {
		// Get agent and escalation settings
		const [agent] = await db
			.select({
				id: agents.id,
				name: agents.name,
			})
			.from(agents)
			.where(eq(agents.id, agentId))
			.limit(1);

		const [escalationSettings] = await db
			.select()
			.from(agentEscalationSettings)
			.where(eq(agentEscalationSettings.agentId, agentId))
			.limit(1);

		const notificationConfig = escalationSettings?.notificationConfig;
		const notificationMethod = escalationSettings?.notificationMethod || "email";

		let emailNotified = false;
		let slackNotified = false;

		// Send Slack notification
		if (
			(notificationMethod === "slack" || notificationMethod === "all") &&
			notificationConfig?.slackWebhookUrl
		) {
			try {
				let slackMessage =
					`🔔 *New Refund Request*\n` +
					`*Agent:* ${agent?.name || "Unknown"}\n` +
					`*Order:* ${details.orderNumber}\n` +
					`*Amount:* ${details.currency} ${details.amount.toFixed(2)}\n` +
					`*Reason:* ${details.reason}\n` +
					`*Customer:* ${details.customerName || "N/A"}\n` +
					`*Email:* ${details.customerEmail || "N/A"}\n` +
					`*Phone:* ${details.customerPhone || "N/A"}`;

				// Add warning if email doesn't match order email
				if (details.emailMismatch) {
					slackMessage += `\n\n⚠️ *Email Mismatch Alert*: Submitted email doesn't match order email (${details.orderEmail || "unknown"})`;
				}

				const response = await fetch(notificationConfig.slackWebhookUrl, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ text: slackMessage }),
				});

				slackNotified = response.ok;
			} catch (error) {
				console.error("Failed to send Slack notification for refund:", error);
			}
		}

		// Send email notification
		if (
			(notificationMethod === "email" || notificationMethod === "all") &&
			notificationConfig?.emailRecipientIds?.length
		) {
			try {
				const recipients = await db
					.select({ email: users.email, name: users.name })
					.from(users)
					.where(inArray(users.id, notificationConfig.emailRecipientIds));

				if (recipients.length > 0) {
					const resend = new Resend(process.env.RESEND_API_KEY);
					const dashboardUrl = process.env.DASHBOARD_URL || "https://app.ansa.so";

					const html = await renderEmail("refund-escalation", {
						agentName: agent?.name || "Unknown Agent",
						orderNumber: details.orderNumber,
						amount: details.amount,
						currency: details.currency,
						reason: details.reason,
						customerName: details.customerName,
						customerEmail: details.customerEmail,
						customerPhone: details.customerPhone,
						dashboardUrl,
					});

					for (const recipient of recipients) {
						await resend.emails.send({
							from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
							to: recipient.email,
							subject: `💰 Refund Request - Order ${details.orderNumber} - ${agent?.name || "Agent"}`,
							html,
						});
					}

					emailNotified = true;
				}
			} catch (error) {
				console.error("Failed to send email notification for refund:", error);
			}
		}

		// Update notification tracking
		await db
			.update(shopifyRefundRequests)
			.set({
				slackNotified,
				emailNotified,
				updatedAt: new Date(),
			})
			.where(eq(shopifyRefundRequests.id, refundRequestId));
	} catch (error) {
		console.error("Failed to send refund escalation notifications:", error);
	}
}

/**
 * POST /shopify/internal/customer-info
 * Internal endpoint for the shopify_get_customer_info tool
 * Body: { agentId, email?, customer_id? }
 */
shopify.post("/internal/customer-info", async (c) => {
	const db = getDb();

	let body: { agentId: string; email?: string; customer_id?: string };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body. Required: { agentId, email?, customer_id? }" }, 400);
	}

	const { agentId, email, customer_id } = body;

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	if (!email && !customer_id) {
		return c.json({ error: "Either email or customer_id is required" }, 400);
	}

	// Find the shop linked to this agent
	const [shopAgent] = await db
		.select({ shopId: shopifyShopAgents.shopId })
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return c.json({ error: "No Shopify shop linked to this agent" }, 404);
	}

	// Build conditions
	const conditions = [eq(shopifyCustomers.shopId, shopAgent.shopId)];

	if (email) {
		conditions.push(eq(shopifyCustomers.email, email.toLowerCase()));
	} else if (customer_id) {
		conditions.push(eq(shopifyCustomers.id, customer_id));
	}

	// Find the customer
	const [customer] = await db
		.select()
		.from(shopifyCustomers)
		.where(and(...conditions))
		.limit(1);

	if (!customer) {
		return c.json(
			{
				error: "Customer not found",
				message: email ? "No customer found with that email" : "No customer found with that ID",
			},
			404,
		);
	}

	// Get recent orders for this customer
	const recentOrders = await db
		.select({
			orderNumber: shopifyOrders.orderNumber,
			totalPrice: shopifyOrders.totalPrice,
			financialStatus: shopifyOrders.financialStatus,
			fulfillmentStatus: shopifyOrders.fulfillmentStatus,
			createdAt: shopifyOrders.shopifyCreatedAt,
		})
		.from(shopifyOrders)
		.where(eq(shopifyOrders.customerId, customer.id))
		.orderBy(shopifyOrders.shopifyCreatedAt)
		.limit(5);

	return c.json({
		customer: {
			name: [customer.firstName, customer.lastName].filter(Boolean).join(" ") || "Unknown",
			email: customer.email,
			phone: customer.phone,
			ordersCount: customer.ordersCount || 0,
			totalSpent: customer.totalSpent
				? `${customer.currency || "USD"} ${customer.totalSpent}`
				: undefined,
			tags: customer.tags,
			createdAt: customer.shopifyCreatedAt?.toISOString(),
		},
		recentOrders: recentOrders.map((o) => ({
			orderNumber: o.orderNumber,
			totalPrice: o.totalPrice,
			status: o.financialStatus,
			fulfillment: o.fulfillmentStatus || "unfulfilled",
			date: o.createdAt?.toISOString(),
		})),
	});
});

// ============ CART OPERATIONS ============

/**
 * POST /shopify/cart/checkout
 * Generate a checkout URL for adding items to cart
 * Used by the widget to enable "Add to Cart" functionality
 * Body: { agentId, variantId, quantity? }
 */
shopify.post("/cart/checkout", async (c) => {
	let body: { agentId: string; variantId: string; quantity?: number };
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "Invalid JSON body. Required: { agentId, variantId, quantity? }" }, 400);
	}

	const { agentId, variantId, quantity = 1 } = body;

	if (!agentId || !variantId) {
		return c.json({ error: "agentId and variantId are required" }, 400);
	}

	const db = getDb();

	// Find the shop linked to this agent
	const [shopAgent] = await db
		.select({
			shopId: shopifyShopAgents.shopId,
		})
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return c.json({ error: "Agent not linked to a Shopify shop" }, 404);
	}

	// Get shop details
	const [shop] = await db
		.select({
			domain: shopifyShops.shopDomain,
		})
		.from(shopifyShops)
		.where(eq(shopifyShops.id, shopAgent.shopId))
		.limit(1);

	if (!shop) {
		return c.json({ error: "Shop not found" }, 404);
	}

	// Extract numeric variant ID if it's a gid
	let numericVariantId = variantId;
	if (variantId.startsWith("gid://shopify/ProductVariant/")) {
		numericVariantId = variantId.replace("gid://shopify/ProductVariant/", "");
	}

	// Generate Shopify checkout URL
	// Format: https://shop.myshopify.com/cart/VARIANT_ID:QUANTITY
	const checkoutUrl = `https://${shop.domain}/cart/${numericVariantId}:${quantity}`;

	return c.json({
		checkoutUrl,
		variantId: numericVariantId,
		quantity,
	});
});

/**
 * GET /shopify/customer-identify-script/:agentId
 * Serve the customer identification script for a specific agent
 * Public endpoint (no auth required) - used by Shopify script tags
 */
shopify.get("/customer-identify-script/:agentId", async (c) => {
	const agentId = requireParam(c, "agentId");

	// Validate agentId exists
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(eq(agents.id, agentId))
		.limit(1);

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Import the function from lib/shopify
	const { buildCustomerIdentificationScript } = await import("../lib/shopify");

	// Generate the script
	const script = buildCustomerIdentificationScript();

	// Set headers
	c.header("Content-Type", "text/javascript");
	c.header("Cache-Control", "no-cache");

	// Return the script
	return c.body(script);
});

/**
 * GET /shopify/products/search
 * Search products with variant filtering
 * Public endpoint (no auth) - used by agent tools in chat
 */
shopify.get("/products/search", async (c) => {
	const db = getDb();
	const query = c.req.query("q") || "";
	const shopId = c.req.query("shopId");
	const productType = c.req.query("productType");
	const color = c.req.query("color");
	const size = c.req.query("size");
	const inStock = c.req.query("inStock");
	const limit = Math.min(Number.parseInt(c.req.query("limit") || "10", 10), 50);

	if (!shopId) {
		return c.json({ error: "shopId is required" }, 400);
	}

	// Build base query conditions
	const conditions = [eq(shopifyProducts.shopId, shopId), eq(shopifyProducts.status, "active")];

	// Add text search conditions (ANY match with OR)
	const textConditions = [];
	if (query) {
		textConditions.push(
			ilike(shopifyProducts.title, `%${query}%`),
			ilike(shopifyProducts.description, `%${query}%`),
			sql`${shopifyProducts.tags}::text ILIKE ${`%${query}%`}`,
		);
	}

	if (productType) {
		textConditions.push(ilike(shopifyProducts.productType, `%${productType}%`));
	}

	// Combine all conditions
	if (textConditions.length > 0) {
		const textCondition = or(...textConditions);
		if (textCondition) {
			conditions.push(textCondition);
		}
	}

	// Fetch products matching base criteria
	let products = await db
		.select()
		.from(shopifyProducts)
		.where(and(...conditions))
		.limit(limit * 3); // Fetch more for filtering

	// Filter by variant attributes (color, size, inStock)
	if (color || size || inStock) {
		products = products.filter((product) => {
			if (!product.variants || product.variants.length === 0) {
				return false;
			}

			// Filter variants within each product
			const matchingVariants = product.variants.filter((variant) => {
				// Color filter (fuzzy match ANY)
				if (color) {
					const normalizedColors = normalizeColor(color);
					const hasColorMatch =
						(variant.option1 &&
							normalizedColors.some((c) => variant.option1?.toLowerCase().includes(c))) ||
						(variant.option2 &&
							normalizedColors.some((c) => variant.option2?.toLowerCase().includes(c))) ||
						(variant.option3 &&
							normalizedColors.some((c) => variant.option3?.toLowerCase().includes(c)));

					if (!hasColorMatch) return false;
				}

				// Size filter (fuzzy match ANY)
				if (size) {
					const normalizedSizes = normalizeSize(size);
					const hasSizeMatch =
						(variant.option1 &&
							normalizedSizes.some((s) => variant.option1?.toLowerCase().includes(s))) ||
						(variant.option2 &&
							normalizedSizes.some((s) => variant.option2?.toLowerCase().includes(s))) ||
						(variant.option3 &&
							normalizedSizes.some((s) => variant.option3?.toLowerCase().includes(s)));

					if (!hasSizeMatch) return false;
				}

				// Stock filter (boolean)
				if (inStock === "true" && variant.inventoryQuantity <= 0) {
					return false;
				}

				return true;
			});

			// Only include product if it has matching variants
			if (matchingVariants.length === 0) {
				return false;
			}

			// Replace variants with only matching ones
			product.variants = matchingVariants;
			return true;
		});
	}

	// Limit final results
	const finalProducts = products.slice(0, limit);

	return c.json({
		products: finalProducts,
		count: finalProducts.length,
		query: {
			q: query,
			productType,
			color,
			size,
			inStock,
		},
	});
});

/**
 * GET /shopify/resolve-agent?shop=xxx.myshopify.com
 * Public endpoint — resolves a Shopify shop domain to its primary agent ID.
 * Used by the theme app extension to avoid metafield caching issues.
 */
shopify.get("/resolve-agent", async (c) => {
	const shop = c.req.query("shop");
	if (!shop) {
		return c.json({ error: "Missing shop parameter" }, 400);
	}

	const db = getDb();
	const [result] = await db
		.select({ agentId: shopifyShopAgents.agentId })
		.from(shopifyShops)
		.innerJoin(shopifyShopAgents, eq(shopifyShopAgents.shopId, shopifyShops.id))
		.where(
			and(
				eq(shopifyShops.shopDomain, shop),
				eq(shopifyShops.status, "active"),
				eq(shopifyShopAgents.isPrimary, true),
			),
		)
		.limit(1);

	if (!result) {
		return c.json({ error: "Shop not found" }, 404);
	}

	return c.json({ agentId: result.agentId }, 200, {
		"Cache-Control": "public, max-age=60, stale-while-revalidate=300",
	});
});

export default shopify;
