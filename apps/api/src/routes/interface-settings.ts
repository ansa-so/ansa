import {
	agentEscalationSettings,
	agents,
	and,
	eq,
	getDb,
	inArray,
	interfaceSettings,
	interfaceSettingsTranslations,
	userSubscriptions,
} from "@ansa/db";
import { Hono } from "hono";
import { z } from "zod";
import { canRemoveBranding } from "../lib/plans";

const interfaceSettingsRoute = new Hono();

export const DEFAULT_FOOTER_MESSAGE = "Powered by Ansa";

// Supported languages for widget translations
export const SUPPORTED_LANGUAGES = [
	{ code: "en", name: "English" },
	{ code: "es", name: "Spanish" },
	{ code: "fr", name: "French" },
	{ code: "de", name: "German" },
	{ code: "it", name: "Italian" },
	{ code: "pt", name: "Portuguese" },
	{ code: "nl", name: "Dutch" },
	{ code: "pl", name: "Polish" },
	{ code: "ru", name: "Russian" },
	{ code: "ja", name: "Japanese" },
	{ code: "ko", name: "Korean" },
	{ code: "zh", name: "Chinese" },
	{ code: "ar", name: "Arabic" },
	{ code: "hi", name: "Hindi" },
	{ code: "tr", name: "Turkish" },
	{ code: "vi", name: "Vietnamese" },
	{ code: "th", name: "Thai" },
	{ code: "id", name: "Indonesian" },
	{ code: "ms", name: "Malay" },
	{ code: "sv", name: "Swedish" },
	{ code: "da", name: "Danish" },
	{ code: "no", name: "Norwegian" },
	{ code: "fi", name: "Finnish" },
	{ code: "cs", name: "Czech" },
	{ code: "uk", name: "Ukrainian" },
	{ code: "he", name: "Hebrew" },
] as const;

export type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Helper to get user's plan
async function getUserPlanId(userId: string): Promise<string> {
	const db = getDb();
	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);
	return subscription?.planId ?? "free";
}

// Helper to verify agent belongs to user
async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
	return !!agent;
}

const updateSettingsSchema = z.object({
	theme: z.enum(["light", "dark", "system"]).optional(),
	primaryColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "invalid hex color")
		.optional(),
	chatBubbleColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "invalid hex color")
		.optional(),
	chatBubbleAlign: z.enum(["left", "right"]).optional(),
	displayName: z.string().min(1).max(100).optional(),
	profilePicture: z.string().url().nullable().optional(),
	widgetButtonColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, "invalid hex color")
		.optional(),
	widgetButtonIcon: z.string().nullable().optional(),
	widgetButtonIconType: z.enum(["upload", "url", "emoji"]).nullable().optional(),
	widgetButtonBorderRadius: z.string().max(20).optional(),
	initialMessage: z.string().max(500).nullable().optional(),
	suggestedMessages: z.array(z.string().max(200)).max(5).optional(),
	messagePlaceholder: z.string().max(100).nullable().optional(),
	footerMessage: z.string().max(200).nullable().optional(),
	dismissibleMessage: z.string().max(500).nullable().optional(),
	welcomeBubbles: z.array(z.string().max(150)).max(5).optional(),
	collectUserFeedback: z.boolean().optional(),
	showSatisfactionOnResolved: z.boolean().optional(),
	escalationNoticeMessage: z.string().max(500).nullable().optional(),
});

// Get settings for an agent
interfaceSettingsRoute.get("/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	let [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		// Create default settings if none exist
		[settings] = await db.insert(interfaceSettings).values({ agentId }).returning();
	}

	// Check if user can remove branding
	const planId = await getUserPlanId(userId);
	const allowBrandingRemoval = canRemoveBranding(planId);

	// Force branding for free users in the response
	return c.json({
		...settings,
		footerMessage: allowBrandingRemoval ? settings.footerMessage : DEFAULT_FOOTER_MESSAGE,
	});
});

// Get settings for public widget (no auth required)
// Supports ?lang=xx query param for localized content with cascade fallback
interfaceSettingsRoute.get("/public/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const requestedLang = c.req.query("lang")?.toLowerCase();

	// Validate UUID format to prevent Postgres errors
	const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		agentId,
	);
	if (!isValidUuid) {
		return c.json({ error: "invalid agent id" }, 400);
	}

	const db = getDb();

	// Get settings and agent owner info
	const [result] = await db
		.select({
			settings: interfaceSettings,
			agentUserId: agents.userId,
		})
		.from(interfaceSettings)
		.innerJoin(agents, eq(agents.id, interfaceSettings.agentId))
		.where(eq(interfaceSettings.agentId, agentId));

	if (!result) {
		return c.json({ error: "agent not found" }, 404);
	}

	const { settings, agentUserId } = result;

	// Get escalation settings for this agent
	const [escalationSettings] = await db
		.select()
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId));

	// Check if agent owner can remove branding
	const planId = await getUserPlanId(agentUserId);
	const allowBrandingRemoval = canRemoveBranding(planId);

	// Force branding for free users, or if paid user has empty/null footer
	const footerMessage = allowBrandingRemoval
		? settings.footerMessage || null // Paid users can have custom or no footer
		: DEFAULT_FOOTER_MESSAGE; // Free users always show branding

	// Build base response from default settings
	let displayName = settings.displayName;
	let initialMessage = settings.initialMessage;
	let suggestedMessages = settings.suggestedMessages;
	let messagePlaceholder = settings.messagePlaceholder;
	let dismissibleMessage = settings.dismissibleMessage;
	let welcomeBubbles = settings.welcomeBubbles;
	// Escalation prompts (from interface settings, can be translated)
	let positiveFeedbackPrompt = settings.positiveFeedbackPrompt;
	let requestHumanPrompt = settings.requestHumanPrompt;
	let humanSupportConfirmation = settings.humanSupportConfirmation;
	let escalationNoticeMessage = settings.escalationNoticeMessage;

	// If language requested, try to find translation with cascade fallback
	if (requestedLang) {
		// Build cascade list: e.g., "fr-CA" -> ["fr-ca", "fr", defaultLanguage]
		const langCascade: string[] = [];
		const baseLang = requestedLang.split("-")[0];

		// Add full locale if different from base
		if (requestedLang !== baseLang) {
			langCascade.push(requestedLang);
		}
		// Add base language
		langCascade.push(baseLang);
		// Add default language as final fallback (if different)
		const defaultLang = settings.defaultLanguage || "en";
		if (!langCascade.includes(defaultLang)) {
			langCascade.push(defaultLang);
		}

		// Fetch all potential translations in one query
		const translations = await db
			.select()
			.from(interfaceSettingsTranslations)
			.where(
				and(
					eq(interfaceSettingsTranslations.interfaceSettingsId, settings.id),
					inArray(interfaceSettingsTranslations.languageCode, langCascade),
				),
			);

		// Find best matching translation using cascade order
		let bestTranslation = null;
		for (const lang of langCascade) {
			const found = translations.find((t) => t.languageCode === lang);
			if (found) {
				bestTranslation = found;
				break;
			}
		}

		// Merge translation fields over defaults (only non-null values)
		if (bestTranslation) {
			if (bestTranslation.displayName) displayName = bestTranslation.displayName;
			if (bestTranslation.initialMessage) initialMessage = bestTranslation.initialMessage;
			if (bestTranslation.suggestedMessages) suggestedMessages = bestTranslation.suggestedMessages;
			if (bestTranslation.messagePlaceholder)
				messagePlaceholder = bestTranslation.messagePlaceholder;
			if (bestTranslation.dismissibleMessage)
				dismissibleMessage = bestTranslation.dismissibleMessage;
			if (bestTranslation.welcomeBubbles) welcomeBubbles = bestTranslation.welcomeBubbles;
			// Escalation prompt translations
			if (bestTranslation.positiveFeedbackPrompt)
				positiveFeedbackPrompt = bestTranslation.positiveFeedbackPrompt;
			if (bestTranslation.requestHumanPrompt)
				requestHumanPrompt = bestTranslation.requestHumanPrompt;
			if (bestTranslation.humanSupportConfirmation)
				humanSupportConfirmation = bestTranslation.humanSupportConfirmation;
			if (bestTranslation.escalationNoticeMessage)
				escalationNoticeMessage = bestTranslation.escalationNoticeMessage;
		}
	}

	// Generate ETag based on settings updatedAt
	const etag = `"${settings.updatedAt.getTime()}"`;

	// Check If-None-Match header for conditional request
	const ifNoneMatch = c.req.header("If-None-Match");
	if (ifNoneMatch === etag) {
		return c.body(null, 304);
	}

	// Set caching headers for CDN
	c.header("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
	c.header("ETag", etag);
	c.header("Vary", "Accept-Encoding");

	// Return only public-facing settings
	return c.json({
		theme: settings.theme,
		primaryColor: settings.primaryColor,
		chatBubbleColor: settings.chatBubbleColor,
		chatBubbleAlign: settings.chatBubbleAlign,
		displayName,
		profilePicture: settings.profilePicture,
		initialMessage,
		suggestedMessages,
		messagePlaceholder,
		footerMessage,
		dismissibleMessage,
		welcomeBubbles,
		collectUserFeedback: settings.collectUserFeedback,
		showSatisfactionOnResolved: settings.showSatisfactionOnResolved,
		// Include language info for widget
		defaultLanguage: settings.defaultLanguage || "en",
		// Escalation settings
		escalation: escalationSettings?.enabled
			? {
					enabled: true,
					showButtonsAfter: escalationSettings.showButtonsAfter,
					showAfterMessageCount: escalationSettings.showAfterMessageCount,
					positiveFeedbackPrompt,
					requestHumanPrompt,
					humanSupportConfirmation,
					escalationNoticeMessage,
				}
			: null,
	});
});

// Update settings for an agent
interfaceSettingsRoute.put("/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const rawBody = await c.req.json();
	const parsed = updateSettingsSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	// Check if user can remove branding
	const planId = await getUserPlanId(userId);
	const allowBrandingRemoval = canRemoveBranding(planId);

	// If user cannot remove branding, always force the default footer message
	if (!allowBrandingRemoval) {
		// Always set to default - prevents null, empty string, or any custom value
		parsed.data.footerMessage = DEFAULT_FOOTER_MESSAGE;
	}

	const db = getDb();

	// Get or create settings
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	let finalSettings;

	if (!settings) {
		const [created] = await db
			.insert(interfaceSettings)
			.values({
				agentId,
				...parsed.data,
			})
			.returning();
		finalSettings = created;
	} else {
		// Update existing
		const [updated] = await db
			.update(interfaceSettings)
			.set({
				...parsed.data,
				updatedAt: new Date(),
			})
			.where(eq(interfaceSettings.agentId, agentId))
			.returning();
		finalSettings = updated;
	}

	// Note: No need to update Shopify script tags here since the widget
	// fetches settings at runtime from /interface-settings/public/:agentId
	// The script URL only contains agentId and apiUrl which don't change

	return c.json(finalSettings);
});

// Upload profile picture for an agent
interfaceSettingsRoute.post("/:agentId/profile-picture", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const formData = await c.req.formData();
	const file = formData.get("file") as File;

	if (!file) {
		return c.json({ error: "file required" }, 400);
	}

	// Validate file type
	const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
	if (!allowedTypes.includes(file.type)) {
		return c.json({ error: "invalid file type. allowed: jpeg, png, gif, webp" }, 400);
	}

	// Validate file size (max 2MB)
	if (file.size > 2 * 1024 * 1024) {
		return c.json({ error: "file too large. max 2MB" }, 400);
	}

	// Convert to base64 data URL for simplicity
	// In production, you'd upload to S3/Cloudflare R2/etc
	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");
	const dataUrl = `data:${file.type};base64,${base64}`;

	const db = getDb();

	// Get or create settings
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		const [created] = await db
			.insert(interfaceSettings)
			.values({ agentId, profilePicture: dataUrl })
			.returning();
		return c.json({ url: created.profilePicture });
	}

	// Update existing
	const [updated] = await db
		.update(interfaceSettings)
		.set({
			profilePicture: dataUrl,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	return c.json({ url: updated.profilePicture });
});

// Delete profile picture for an agent
interfaceSettingsRoute.delete("/:agentId/profile-picture", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	const [updated] = await db
		.update(interfaceSettings)
		.set({
			profilePicture: null,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	if (!updated) {
		return c.json({ error: "no settings found" }, 404);
	}

	return c.json({ deleted: true });
});

// Get lightweight widget button config (public, no auth)
interfaceSettingsRoute.get("/widget-button/:agentId", async (c) => {
	const agentId = c.req.param("agentId");

	// Validate UUID format
	const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		agentId,
	);
	if (!isValidUuid) {
		return c.json({ error: "invalid agent id" }, 400);
	}

	const db = getDb();

	const [settings] = await db
		.select({
			widgetButtonColor: interfaceSettings.widgetButtonColor,
			widgetButtonIcon: interfaceSettings.widgetButtonIcon,
			widgetButtonIconType: interfaceSettings.widgetButtonIconType,
			widgetButtonBorderRadius: interfaceSettings.widgetButtonBorderRadius,
		})
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		// Return defaults if settings don't exist yet
		return c.json({
			widgetButtonColor: "#3b82f6",
			widgetButtonIcon: null,
			widgetButtonIconType: null,
			widgetButtonBorderRadius: "28px",
		});
	}

	return c.json(settings);
});

// Upload widget button icon for an agent
interfaceSettingsRoute.post("/:agentId/widget-icon", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const formData = await c.req.formData();
	const file = formData.get("file") as File;

	if (!file) {
		return c.json({ error: "file required" }, 400);
	}

	// Validate file type
	const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
	if (!allowedTypes.includes(file.type)) {
		return c.json({ error: "invalid file type. allowed: jpeg, png, gif, webp, svg" }, 400);
	}

	// Validate file size (max 2MB)
	if (file.size > 2 * 1024 * 1024) {
		return c.json({ error: "file too large. max 2MB" }, 400);
	}

	// Convert to base64 data URL
	const arrayBuffer = await file.arrayBuffer();
	const base64 = Buffer.from(arrayBuffer).toString("base64");
	const dataUrl = `data:${file.type};base64,${base64}`;

	const db = getDb();

	// Get or create settings
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		const [created] = await db
			.insert(interfaceSettings)
			.values({
				agentId,
				widgetButtonIcon: dataUrl,
				widgetButtonIconType: "upload",
			})
			.returning();
		return c.json({
			icon: created.widgetButtonIcon,
			iconType: created.widgetButtonIconType,
		});
	}

	// Update existing
	const [updated] = await db
		.update(interfaceSettings)
		.set({
			widgetButtonIcon: dataUrl,
			widgetButtonIconType: "upload",
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	return c.json({
		icon: updated.widgetButtonIcon,
		iconType: updated.widgetButtonIconType,
	});
});

// Delete widget button icon for an agent
interfaceSettingsRoute.delete("/:agentId/widget-icon", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	const [updated] = await db
		.update(interfaceSettings)
		.set({
			widgetButtonIcon: null,
			widgetButtonIconType: null,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	if (!updated) {
		return c.json({ error: "no settings found" }, 404);
	}

	return c.json({ deleted: true });
});

// ============================================================
// Translation Management Endpoints
// ============================================================

// Get list of supported languages
interfaceSettingsRoute.get("/languages", async (c) => {
	return c.json({ languages: SUPPORTED_LANGUAGES });
});

// Get all translations for an agent
interfaceSettingsRoute.get("/:agentId/translations", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	// Get interface settings ID
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		return c.json({ translations: [], defaultLanguage: "en" });
	}

	const translations = await db
		.select()
		.from(interfaceSettingsTranslations)
		.where(eq(interfaceSettingsTranslations.interfaceSettingsId, settings.id));

	return c.json({
		translations,
		defaultLanguage: settings.defaultLanguage || "en",
		supportedLanguages: SUPPORTED_LANGUAGES,
	});
});

// Translation schema for create/update
const translationSchema = z.object({
	displayName: z.string().max(100).nullable().optional(),
	initialMessage: z.string().max(500).nullable().optional(),
	suggestedMessages: z.array(z.string().max(200)).max(5).nullable().optional(),
	messagePlaceholder: z.string().max(100).nullable().optional(),
	dismissibleMessage: z.string().max(500).nullable().optional(),
	welcomeBubbles: z.array(z.string().max(150)).max(5).nullable().optional(),
	// Escalation translations
	positiveFeedbackPrompt: z.string().max(100).nullable().optional(),
	requestHumanPrompt: z.string().max(100).nullable().optional(),
	humanSupportConfirmation: z.string().max(500).nullable().optional(),
	escalationNoticeMessage: z.string().max(500).nullable().optional(),
});

// Get a specific translation
interfaceSettingsRoute.get("/:agentId/translations/:languageCode", async (c) => {
	const agentId = c.req.param("agentId");
	const languageCode = c.req.param("languageCode").toLowerCase();
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	if (!SUPPORTED_LANGUAGE_CODES.includes(languageCode as SupportedLanguageCode)) {
		return c.json({ error: "unsupported language code" }, 400);
	}

	const db = getDb();

	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		return c.json({ error: "settings not found" }, 404);
	}

	const [translation] = await db
		.select()
		.from(interfaceSettingsTranslations)
		.where(
			and(
				eq(interfaceSettingsTranslations.interfaceSettingsId, settings.id),
				eq(interfaceSettingsTranslations.languageCode, languageCode),
			),
		);

	if (!translation) {
		return c.json({ error: "translation not found" }, 404);
	}

	return c.json(translation);
});

// Create or update a translation (upsert)
interfaceSettingsRoute.put("/:agentId/translations/:languageCode", async (c) => {
	const agentId = c.req.param("agentId");
	const languageCode = c.req.param("languageCode").toLowerCase();
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	if (!SUPPORTED_LANGUAGE_CODES.includes(languageCode as SupportedLanguageCode)) {
		return c.json({ error: "unsupported language code" }, 400);
	}

	const rawBody = await c.req.json();
	const parsed = translationSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	// Get or create interface settings
	let [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		[settings] = await db.insert(interfaceSettings).values({ agentId }).returning();
	}

	// Check if translation exists
	const [existing] = await db
		.select()
		.from(interfaceSettingsTranslations)
		.where(
			and(
				eq(interfaceSettingsTranslations.interfaceSettingsId, settings.id),
				eq(interfaceSettingsTranslations.languageCode, languageCode),
			),
		);

	let translation;

	if (existing) {
		// Update existing translation
		[translation] = await db
			.update(interfaceSettingsTranslations)
			.set({
				...parsed.data,
				updatedAt: new Date(),
			})
			.where(eq(interfaceSettingsTranslations.id, existing.id))
			.returning();
	} else {
		// Create new translation
		[translation] = await db
			.insert(interfaceSettingsTranslations)
			.values({
				interfaceSettingsId: settings.id,
				languageCode,
				...parsed.data,
			})
			.returning();
	}

	// Update the parent settings timestamp so widget caches refresh
	await db
		.update(interfaceSettings)
		.set({ updatedAt: new Date() })
		.where(eq(interfaceSettings.id, settings.id));

	return c.json(translation);
});

// Delete a translation
interfaceSettingsRoute.delete("/:agentId/translations/:languageCode", async (c) => {
	const agentId = c.req.param("agentId");
	const languageCode = c.req.param("languageCode").toLowerCase();
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const db = getDb();

	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) {
		return c.json({ error: "settings not found" }, 404);
	}

	const result = await db
		.delete(interfaceSettingsTranslations)
		.where(
			and(
				eq(interfaceSettingsTranslations.interfaceSettingsId, settings.id),
				eq(interfaceSettingsTranslations.languageCode, languageCode),
			),
		)
		.returning();

	if (result.length === 0) {
		return c.json({ error: "translation not found" }, 404);
	}

	// Update the parent settings timestamp so widget caches refresh
	await db
		.update(interfaceSettings)
		.set({ updatedAt: new Date() })
		.where(eq(interfaceSettings.id, settings.id));

	return c.json({ deleted: true });
});

// Update default language for an agent
interfaceSettingsRoute.put("/:agentId/default-language", async (c) => {
	const agentId = c.req.param("agentId");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyAgentOwnership(agentId, userId))) {
		return c.json({ error: "agent not found" }, 404);
	}

	const { languageCode } = await c.req.json();

	if (!languageCode || !SUPPORTED_LANGUAGE_CODES.includes(languageCode as SupportedLanguageCode)) {
		return c.json({ error: "invalid or unsupported language code" }, 400);
	}

	const db = getDb();

	const [updated] = await db
		.update(interfaceSettings)
		.set({
			defaultLanguage: languageCode,
			updatedAt: new Date(),
		})
		.where(eq(interfaceSettings.agentId, agentId))
		.returning();

	if (!updated) {
		return c.json({ error: "settings not found" }, 404);
	}

	return c.json({ defaultLanguage: updated.defaultLanguage });
});

export { interfaceSettingsRoute };
