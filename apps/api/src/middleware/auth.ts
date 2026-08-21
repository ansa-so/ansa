import { eq, getDb, shopifyShops, users } from "@ansa/db";
import type { Context, Next } from "hono";
import { auth } from "../lib/auth";
import { getShopFromSessionToken, verifySessionToken } from "../lib/shopify";

export type AuthVariables = {
	user: typeof auth.$Infer.Session.user | null;
	session: typeof auth.$Infer.Session.session | null;
	shopDomain: string | null;
};

/**
 * Try to authenticate via Shopify session token
 * Returns the user and shop domain if valid, null otherwise
 */
async function tryShopifySessionToken(
	token: string,
): Promise<{ user: typeof auth.$Infer.Session.user; shopDomain: string } | null> {
	console.log("[Shopify Auth] Attempting to verify session token");
	const payload = verifySessionToken(token);
	if (!payload) {
		console.log("[Shopify Auth] Token verification failed");
		return null;
	}

	const shopDomain = getShopFromSessionToken(payload);
	if (!shopDomain) {
		console.log("[Shopify Auth] Could not extract shop domain from token");
		return null;
	}

	const user = await lookupUserByShopDomain(shopDomain);
	if (!user) return null;
	return { user, shopDomain };
}

/**
 * Look up a user by their Shopify shop domain
 */
async function lookupUserByShopDomain(
	shopDomain: string,
): Promise<typeof auth.$Infer.Session.user | null> {
	console.log(`[Shopify Auth] Looking up shop: ${shopDomain}`);

	// Look up the shop and get the associated user
	const db = getDb();
	const [shop] = await db
		.select({
			userId: shopifyShops.userId,
			user: users,
		})
		.from(shopifyShops)
		.innerJoin(users, eq(users.id, shopifyShops.userId))
		.where(eq(shopifyShops.shopDomain, shopDomain))
		.limit(1);

	if (!shop?.user) {
		console.log(`[Shopify Auth] No user found for shop: ${shopDomain}`);
		return null;
	}

	console.log(`[Shopify Auth] Successfully authenticated user: ${shop.user.id}`);

	// Return user in the expected format
	return {
		id: shop.user.id,
		email: shop.user.email,
		emailVerified: shop.user.emailVerified || false,
		name: shop.user.name || "",
		image: shop.user.image,
		createdAt: shop.user.createdAt,
		updatedAt: shop.user.updatedAt,
	};
}

/**
 * Try to authenticate via X-Shopify-Shop header (fallback when idToken unavailable)
 * This is less secure but necessary when session tokens can't be obtained
 */
async function tryShopifyShopHeader(
	shopDomain: string,
): Promise<typeof auth.$Infer.Session.user | null> {
	console.log("[Shopify Auth] Attempting to authenticate via shop header:", shopDomain);
	return lookupUserByShopDomain(shopDomain);
}

export async function authMiddleware(c: Context, next: Next) {
	// First, check for Bearer token (API key or Shopify session token)
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);

		// Try Shopify session token first (JWTs have 3 parts separated by dots)
		if (token.split(".").length === 3) {
			const result = await tryShopifySessionToken(token);
			if (result) {
				c.set("user", result.user);
				c.set("session", null);
				c.set("shopDomain", result.shopDomain);
				return next();
			}
		}

		// Try API key
		const { validateApiKey } = await import("../routes/api-keys");
		const user = await validateApiKey(token);
		if (user) {
			c.set("user", user);
			c.set("session", null);
			c.set("shopDomain", null);
			return next();
		}
	}

	// Check for X-Shopify-Shop header (fallback when session tokens unavailable)
	const shopifyShop = c.req.header("X-Shopify-Shop");
	if (shopifyShop) {
		const user = await tryShopifyShopHeader(shopifyShop);
		if (user) {
			c.set("user", user);
			c.set("session", null);
			c.set("shopDomain", shopifyShop);
			return next();
		}
	}

	// Fall back to session auth
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	c.set("user", session?.user || null);
	c.set("session", session?.session || null);
	// If X-Shopify-Shop header is present, use it for shop scoping
	// even when authenticated via session cookie (e.g. magic link + embedded)
	c.set("shopDomain", c.req.header("X-Shopify-Shop") || null);

	await next();
}

export async function requireAuth(c: Context, next: Next) {
	// Check if already authenticated (from authMiddleware)
	const existingUser = c.get("user");
	if (existingUser) {
		return next();
	}

	// Try Bearer token
	const authHeader = c.req.header("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		const token = authHeader.slice(7);

		// Try Shopify session token first
		if (token.split(".").length === 3) {
			const result = await tryShopifySessionToken(token);
			if (result) {
				c.set("user", result.user);
				c.set("session", null);
				c.set("shopDomain", result.shopDomain);
				return next();
			}
		}

		// Try API key
		const { validateApiKey } = await import("../routes/api-keys");
		const user = await validateApiKey(token);
		if (user) {
			c.set("user", user);
			c.set("session", null);
			c.set("shopDomain", null);
			return next();
		}
	}

	// Check for X-Shopify-Shop header (fallback when session tokens unavailable)
	const shopifyShop = c.req.header("X-Shopify-Shop");
	if (shopifyShop) {
		const user = await tryShopifyShopHeader(shopifyShop);
		if (user) {
			c.set("user", user);
			c.set("session", null);
			c.set("shopDomain", shopifyShop);
			return next();
		}
	}

	// Try session
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("user", session.user);
	c.set("session", session.session);
	c.set("shopDomain", c.req.header("X-Shopify-Shop") || null);

	await next();
}
