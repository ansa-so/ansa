import crypto from "node:crypto";
import { apiKeys, desc, eq, getDb, users } from "@ansa/db";
import { Hono } from "hono";
import { requireParam } from "../lib/params";
import { authMiddleware, requireAuth } from "../middleware/auth";

const apiKeysRoute = new Hono();

function getUser(c: { get: (key: string) => unknown }): { id: string } {
	const user = c.get("user") as { id: string } | null;
	if (!user) throw new Error("User not authenticated");
	return user;
}

// Generate a secure API key with prefix
function generateApiKey(): { key: string; prefix: string; hash: string } {
	const randomBytes = crypto.randomBytes(24).toString("base64url");
	const key = `ansa_sk_${randomBytes}`;
	const prefix = key.slice(0, 16); // "ansa_sk_" + first 8 chars
	const hash = crypto.createHash("sha256").update(key).digest("hex");
	return { key, prefix, hash };
}

/**
 * GET /api-keys
 * List all API keys for the authenticated user (returns prefix only, not full keys)
 */
apiKeysRoute.get("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	const keys = await db
		.select({
			id: apiKeys.id,
			name: apiKeys.name,
			keyPrefix: apiKeys.keyPrefix,
			lastUsedAt: apiKeys.lastUsedAt,
			createdAt: apiKeys.createdAt,
		})
		.from(apiKeys)
		.where(eq(apiKeys.userId, user.id))
		.orderBy(desc(apiKeys.createdAt));

	return c.json(keys);
});

/**
 * POST /api-keys
 * Create a new API key. Returns the full key only once - it cannot be retrieved again.
 */
apiKeysRoute.post("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();
	const body = await c.req.json<{ name: string }>();

	if (!body.name || body.name.trim().length === 0) {
		return c.json({ error: "Name is required" }, 400);
	}

	const { key, prefix, hash } = generateApiKey();

	const [created] = await db
		.insert(apiKeys)
		.values({
			userId: user.id,
			name: body.name.trim(),
			keyPrefix: prefix,
			keyHash: hash,
		})
		.returning();

	// Return the full key only on creation - this is the only time it's visible
	return c.json({
		id: created.id,
		name: created.name,
		key, // Full key - only returned once!
		keyPrefix: prefix,
		createdAt: created.createdAt,
	});
});

/**
 * DELETE /api-keys/:id
 * Revoke (delete) an API key
 */
apiKeysRoute.delete("/:id", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();
	const keyId = requireParam(c, "id");

	// First verify the key belongs to this user
	const [existingKey] = await db.select().from(apiKeys).where(eq(apiKeys.id, keyId)).limit(1);

	if (!existingKey || existingKey.userId !== user.id) {
		return c.json({ error: "API key not found" }, 404);
	}

	await db.delete(apiKeys).where(eq(apiKeys.id, keyId));

	return c.json({ success: true });
});

/**
 * Validate an API key and return the associated user
 * This is used by the auth middleware
 */
export async function validateApiKey(
	bearerToken: string,
): Promise<{ id: string; email: string } | null> {
	if (!bearerToken.startsWith("ansa_sk_")) {
		return null;
	}

	const db = getDb();
	const hash = crypto.createHash("sha256").update(bearerToken).digest("hex");

	const [keyRecord] = await db.select().from(apiKeys).where(eq(apiKeys.keyHash, hash)).limit(1);

	if (!keyRecord) {
		return null;
	}

	// Update last used timestamp (fire and forget)
	db.update(apiKeys)
		.set({ lastUsedAt: new Date() })
		.where(eq(apiKeys.id, keyRecord.id))
		.catch(() => {});

	// Fetch user info
	const [user] = await db
		.select({ id: users.id, email: users.email })
		.from(users)
		.where(eq(users.id, keyRecord.userId))
		.limit(1);

	return user || null;
}

export { apiKeysRoute };
