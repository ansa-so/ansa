import {
	eq,
	getDb,
	type NewUserPreferences,
	type UserPreferences,
	userPreferences,
} from "@ansa/db";
import { Hono } from "hono";
import { authMiddleware, requireAuth } from "../middleware/auth";

const userPreferencesRoute = new Hono();

// Helper to get user from context
function getUser(c: { get: (key: string) => unknown }): { id: string } {
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		throw new Error("User not authenticated");
	}
	return user;
}

/**
 * GET /user-preferences
 * Get current user's preferences (creates defaults if not exists)
 */
userPreferencesRoute.get("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	try {
		let [prefs] = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id))
			.limit(1);

		// Create default preferences if they don't exist
		if (!prefs) {
			const [newPrefs] = await db
				.insert(userPreferences)
				.values({
					userId: user.id,
					recapFrequency: "daily",
					recapHour: 9,
					recapDigestMode: false,
				})
				.returning();
			prefs = newPrefs;
		}

		return c.json({
			recapFrequency: prefs.recapFrequency,
			recapHour: prefs.recapHour,
			recapDigestMode: prefs.recapDigestMode,
		});
	} catch (err) {
		console.error("[user-preferences] Failed to get preferences:", err);
		return c.json({ error: "Failed to get preferences" }, 500);
	}
});

/**
 * PUT /user-preferences
 * Update user's preferences
 */
userPreferencesRoute.put("/", authMiddleware, requireAuth, async (c) => {
	const user = getUser(c);
	const db = getDb();

	try {
		const body = await c.req.json();
		const { recapFrequency, recapHour, recapDigestMode } = body;

		// Validate recapFrequency
		if (recapFrequency !== undefined && !["none", "daily", "weekly"].includes(recapFrequency)) {
			return c.json({ error: "Invalid recapFrequency. Must be 'none', 'daily', or 'weekly'" }, 400);
		}

		// Validate recapHour
		if (recapHour !== undefined && (recapHour < 0 || recapHour > 23)) {
			return c.json({ error: "Invalid recapHour. Must be between 0 and 23" }, 400);
		}

		// Check if preferences exist
		const [existing] = await db
			.select()
			.from(userPreferences)
			.where(eq(userPreferences.userId, user.id))
			.limit(1);

		const updateData: Partial<NewUserPreferences> = {
			updatedAt: new Date(),
		};

		if (recapFrequency !== undefined) updateData.recapFrequency = recapFrequency;
		if (recapHour !== undefined) updateData.recapHour = recapHour;
		if (recapDigestMode !== undefined) updateData.recapDigestMode = recapDigestMode;

		let prefs: UserPreferences;

		if (existing) {
			// Update existing
			const [updated] = await db
				.update(userPreferences)
				.set(updateData)
				.where(eq(userPreferences.userId, user.id))
				.returning();
			prefs = updated;
		} else {
			// Create new with provided values
			const [created] = await db
				.insert(userPreferences)
				.values({
					userId: user.id,
					recapFrequency: recapFrequency ?? "none",
					recapHour: recapHour ?? 9,
					recapDigestMode: recapDigestMode ?? false,
				})
				.returning();
			prefs = created;
		}

		console.log(`[user-preferences] Updated preferences for user ${user.id}:`, {
			recapFrequency: prefs.recapFrequency,
			recapHour: prefs.recapHour,
			recapDigestMode: prefs.recapDigestMode,
		});

		return c.json({
			recapFrequency: prefs.recapFrequency,
			recapHour: prefs.recapHour,
			recapDigestMode: prefs.recapDigestMode,
		});
	} catch (err) {
		console.error("[user-preferences] Failed to update preferences:", err);
		return c.json({ error: "Failed to update preferences" }, 500);
	}
});

export default userPreferencesRoute;
