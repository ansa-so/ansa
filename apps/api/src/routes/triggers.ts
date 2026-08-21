import {
	agentTools,
	and,
	eq,
	getDb,
	sql,
	triggerEvents,
	triggers,
	triggerTemplates,
} from "@ansa/db";
import { Hono } from "hono";
import { z } from "zod";
import { requireOwnedAgent, requireOwnedTrigger, requireUserId } from "../lib/ownership";

const triggersRouter = new Hono();

// Rate limiter for trigger events
const triggerEventRateLimitStore = new Map<string, number[]>();

setInterval(() => {
	const now = Date.now();
	for (const [key, timestamps] of triggerEventRateLimitStore.entries()) {
		const filtered = timestamps.filter((t) => now - t < 60000);
		if (filtered.length === 0) {
			triggerEventRateLimitStore.delete(key);
		} else {
			triggerEventRateLimitStore.set(key, filtered);
		}
	}
}, 60 * 1000);

function checkTriggerEventRateLimit(
	agentId: string,
	clientKey: string,
): { allowed: boolean; remaining: number } {
	const key = `trigger:${agentId}:${clientKey}`;
	const LIMIT = 100; // 100 events per minute
	const WINDOW_MS = 60 * 1000;

	const now = Date.now();
	const timestamps = triggerEventRateLimitStore.get(key) || [];
	const validTimestamps = timestamps.filter((t) => now - t < WINDOW_MS);

	if (validTimestamps.length >= LIMIT) {
		return { allowed: false, remaining: 0 };
	}

	validTimestamps.push(now);
	triggerEventRateLimitStore.set(key, validTimestamps);

	return { allowed: true, remaining: LIMIT - validTimestamps.length };
}

// Validation schemas
const conditionsSchema = z.object({
	timeOnPage: z.number().nullish(),
	scrollDepth: z.number().min(0).max(100).nullish(),
	page: z.string().nullish(),
	event: z.string().nullish(),
	eventData: z.record(z.string(), z.unknown()).nullish(),
});

const actionConfigSchema = z.object({
	message: z.string().nullish(),
	toolId: z.string().nullish(),
	duration: z.number().nullish(),
});

const createTriggerSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullish(),
	triggerType: z.enum(["time_on_page", "scroll_depth", "exit_intent", "page_view", "custom_event"]),
	conditions: conditionsSchema,
	actionType: z.enum(["open_chat", "show_form", "show_bubble"]),
	actionConfig: actionConfigSchema,
	triggerOnce: z.boolean().nullish().default(true),
	isEnabled: z.boolean().nullish().default(true),
	priority: z.number().nullish().default(0),
});

const updateTriggerSchema = createTriggerSchema.partial();

// List trigger templates (marketplace)
triggersRouter.get("/templates", async (c) => {
	requireUserId(c);
	const db = getDb();
	const result = await db.select().from(triggerTemplates);
	return c.json(result);
});

// List triggers for an agent
triggersRouter.get("/", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const agentId = c.req.query("agentId");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	const result = await db
		.select()
		.from(triggers)
		.where(eq(triggers.agentId, agentId))
		.orderBy(triggers.priority);

	return c.json(result);
});

// Get trigger stats (fired count, converted count) - authenticated
// Must be defined before /:id to avoid route matching issues
triggersRouter.get("/stats", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const agentId = c.req.query("agentId");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	// Get stats from raw events grouped by triggerId
	const stats = await db
		.select({
			triggerId: triggerEvents.triggerId,
			firedCount: sql<number>`SUM(CASE WHEN ${triggerEvents.eventType} = 'fired' THEN 1 ELSE 0 END)::int`,
			convertedCount: sql<number>`SUM(CASE WHEN ${triggerEvents.eventType} = 'converted' THEN 1 ELSE 0 END)::int`,
		})
		.from(triggerEvents)
		.where(eq(triggerEvents.agentId, agentId))
		.groupBy(triggerEvents.triggerId);

	// Convert to map for easy lookup
	const statsMap: Record<string, { firedCount: number; convertedCount: number }> = {};
	for (const stat of stats) {
		if (stat.triggerId) {
			statsMap[stat.triggerId] = {
				firedCount: stat.firedCount || 0,
				convertedCount: stat.convertedCount || 0,
			};
		}
	}

	return c.json(statsMap);
});

// Get single trigger
triggersRouter.get("/:id", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	await requireOwnedTrigger(id, userId);

	const [trigger] = await db.select().from(triggers).where(eq(triggers.id, id)).limit(1);

	if (!trigger) {
		return c.json({ error: "Trigger not found" }, 404);
	}

	return c.json(trigger);
});

// Create trigger
triggersRouter.post("/", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const agentId = c.req.query("agentId");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	const body = await c.req.json();
	const parseResult = createTriggerSchema.safeParse(body);

	if (!parseResult.success) {
		return c.json({ error: "Invalid request body", details: parseResult.error.issues }, 400);
	}

	const data = parseResult.data;

	const [trigger] = await db
		.insert(triggers)
		.values({
			agentId,
			name: data.name,
			description: data.description ?? null,
			triggerType: data.triggerType,
			conditions: {
				timeOnPage: data.conditions.timeOnPage ?? undefined,
				scrollDepth: data.conditions.scrollDepth ?? undefined,
				page: data.conditions.page ?? undefined,
				event: data.conditions.event ?? undefined,
				eventData: data.conditions.eventData ?? undefined,
			},
			actionType: data.actionType,
			actionConfig: {
				message: data.actionConfig.message ?? undefined,
				toolId: data.actionConfig.toolId ?? undefined,
				duration: data.actionConfig.duration ?? undefined,
			},
			triggerOnce: data.triggerOnce ?? true,
			isEnabled: data.isEnabled ?? true,
			priority: data.priority ?? 0,
		})
		.returning();

	return c.json(trigger);
});

// Update trigger
triggersRouter.put("/:id", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	await requireOwnedTrigger(id, userId);

	const body = await c.req.json();
	const parseResult = updateTriggerSchema.safeParse(body);

	if (!parseResult.success) {
		return c.json({ error: "Invalid request body", details: parseResult.error.issues }, 400);
	}

	const data = parseResult.data;

	const [trigger] = await db
		.update(triggers)
		.set({
			name: data.name,
			description: data.description ?? undefined,
			triggerType: data.triggerType,
			conditions: data.conditions
				? {
						timeOnPage: data.conditions.timeOnPage ?? undefined,
						scrollDepth: data.conditions.scrollDepth ?? undefined,
						page: data.conditions.page ?? undefined,
						event: data.conditions.event ?? undefined,
						eventData: data.conditions.eventData ?? undefined,
					}
				: undefined,
			actionType: data.actionType,
			actionConfig: data.actionConfig
				? {
						message: data.actionConfig.message ?? undefined,
						toolId: data.actionConfig.toolId ?? undefined,
						duration: data.actionConfig.duration ?? undefined,
					}
				: undefined,
			triggerOnce: data.triggerOnce ?? undefined,
			isEnabled: data.isEnabled ?? undefined,
			priority: data.priority ?? undefined,
			updatedAt: new Date(),
		})
		.where(eq(triggers.id, id))
		.returning();

	if (!trigger) {
		return c.json({ error: "Trigger not found" }, 404);
	}

	return c.json(trigger);
});

// Delete trigger
triggersRouter.delete("/:id", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	// Throws 404 when the trigger does not exist or belongs to another tenant, so
	// this no longer reports success for ids it never touched.
	await requireOwnedTrigger(id, userId);

	await db.delete(triggers).where(eq(triggers.id, id));

	return c.json({ success: true });
});

// Toggle trigger enabled/disabled
triggersRouter.post("/:id/toggle", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	await requireOwnedTrigger(id, userId);

	const [trigger] = await db.select().from(triggers).where(eq(triggers.id, id)).limit(1);

	if (!trigger) {
		return c.json({ error: "Trigger not found" }, 404);
	}

	const [updated] = await db
		.update(triggers)
		.set({
			isEnabled: !trigger.isEnabled,
			updatedAt: new Date(),
		})
		.where(eq(triggers.id, id))
		.returning();

	return c.json(updated);
});

// Get triggers for widget (public endpoint - by agent ID)
triggersRouter.get("/widget/:agentId", async (c) => {
	const db = getDb();
	const agentId = c.req.param("agentId");

	// Validate UUID format to prevent Postgres errors
	const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		agentId,
	);
	if (!isValidUuid) {
		return c.json({ error: "invalid agent id" }, 400);
	}

	const result = await db
		.select({
			id: triggers.id,
			name: triggers.name,
			triggerType: triggers.triggerType,
			conditions: triggers.conditions,
			actionType: triggers.actionType,
			actionConfig: triggers.actionConfig,
			triggerOnce: triggers.triggerOnce,
			priority: triggers.priority,
		})
		.from(triggers)
		.where(and(eq(triggers.agentId, agentId), eq(triggers.isEnabled, true)))
		.orderBy(triggers.priority);

	return c.json(result);
});

// Record trigger event from widget (public endpoint)
triggersRouter.post("/event", async (c) => {
	const body = await c.req.json();
	const {
		agentId,
		triggerId,
		triggerName,
		triggerType,
		actionType,
		eventType,
		sessionId,
		pagePath,
	} = body;

	if (!agentId || !triggerName || !triggerType || !actionType || !eventType) {
		return c.json({ error: "Missing required fields" }, 400);
	}

	// Rate limit by session or IP
	const clientIP = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
	const clientKey = sessionId || clientIP;

	const rateCheck = checkTriggerEventRateLimit(agentId, clientKey);
	if (!rateCheck.allowed) {
		return c.json({ error: "Rate limit exceeded" }, 429);
	}

	const db = getDb();
	await db.insert(triggerEvents).values({
		agentId,
		triggerId: triggerId || null,
		triggerName,
		triggerType,
		actionType,
		eventType,
		sessionId,
		pagePath,
	});

	return c.json({ success: true });
});

// Public endpoint to get a form tool for triggers
// This allows the widget to fetch form schema when a trigger fires
// Accepts either a UUID (tool ID) or a string (tool name)
triggersRouter.get("/form/:toolIdOrName", async (c) => {
	const toolIdOrName = c.req.param("toolIdOrName");
	const db = getDb();

	// Try to find by name first (safer, works for any string)
	let [tool] = await db
		.select({
			id: agentTools.id,
			name: agentTools.name,
			formSchema: agentTools.formSchema,
			formExecutionMode: agentTools.formExecutionMode,
			formClientHandler: agentTools.formClientHandler,
			formPostActions: agentTools.formPostActions,
		})
		.from(agentTools)
		.where(and(eq(agentTools.name, toolIdOrName), eq(agentTools.executionType, "form")));

	// If not found by name, check if it's a valid UUID and try by ID
	if (!tool) {
		const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
			toolIdOrName,
		);
		if (isValidUuid) {
			[tool] = await db
				.select({
					id: agentTools.id,
					name: agentTools.name,
					formSchema: agentTools.formSchema,
					formExecutionMode: agentTools.formExecutionMode,
					formClientHandler: agentTools.formClientHandler,
					formPostActions: agentTools.formPostActions,
				})
				.from(agentTools)
				.where(and(eq(agentTools.id, toolIdOrName), eq(agentTools.executionType, "form")));
		}
	}

	if (!tool) {
		return c.json({ error: "Form not found" }, 404);
	}

	return c.json({
		toolId: tool.id,
		toolName: tool.name,
		formSchema: tool.formSchema,
		executionMode: tool.formExecutionMode || "webhook",
		clientHandler: tool.formClientHandler,
		formPostActions: tool.formPostActions,
	});
});

export { triggersRouter };
