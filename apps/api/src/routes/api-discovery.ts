import { agents, agentTools, and, eq, getDb } from "@ansa/db";
import { Hono } from "hono";
import { z } from "zod";
import { analyzeApi, detectUrlParams, generateUrlTemplate } from "../lib/api-discovery";

const apiDiscoveryRoute = new Hono();

function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

async function verifyAgentOwnership(agentId: string, userId: string): Promise<boolean> {
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)));
	return !!agent;
}

const analyzeSchema = z.object({
	url: z.string().url("Valid URL required"),
	method: z.enum(["GET", "POST"]).default("GET"),
	headers: z.record(z.string(), z.string()).optional(),
});

const createToolSchema = z.object({
	agentId: z.string().uuid("Invalid agentId"),
	urlTemplate: z.string().min(1),
	method: z.enum(["GET", "POST"]).default("GET"),
	headers: z.record(z.string(), z.string()).optional(),
	name: z
		.string()
		.min(1)
		.max(100)
		.regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores"),
	description: z.string().min(1).max(1000),
	inputSchema: z.object({
		type: z.literal("object"),
		properties: z.record(
			z.string(),
			z.object({
				type: z.string(),
				description: z.string().optional(),
				default: z.string().optional(),
			}),
		),
		required: z.array(z.string()).optional(),
	}),
	displayConfig: z
		.object({
			type: z.enum([
				"text",
				"product_card",
				"product_carousel",
				"product_grid",
				"image",
				"table",
				"buttons",
				"form",
				"custom",
			]),
			fieldMappings: z.record(z.string(), z.string()).optional(),
			dataPath: z.string().optional(),
			textFallback: z.string().optional(),
			options: z.record(z.string(), z.unknown()).optional(),
		})
		.optional(),
});

/**
 * POST /discovery/analyze
 * Analyze an API URL to detect parameters and suggest configuration
 */
apiDiscoveryRoute.post("/analyze", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json();
	const parsed = analyzeSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { url, method, headers } = parsed.data;

	try {
		const result = await analyzeApi(url, { method, headers, timeout: 30000 });
		return c.json(result);
	} catch (error) {
		return c.json({ error: error instanceof Error ? error.message : "Analysis failed" }, 500);
	}
});

/**
 * POST /discovery/detect-params
 * Quick endpoint to just detect params without fetching
 */
apiDiscoveryRoute.post("/detect-params", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{ url: string }>();

	if (!body.url) {
		return c.json({ error: "URL required" }, 400);
	}

	try {
		new URL(body.url); // Validate URL
	} catch {
		return c.json({ error: "Invalid URL" }, 400);
	}

	const params = detectUrlParams(body.url);
	const urlTemplate = generateUrlTemplate(body.url, params);

	return c.json({ params, urlTemplate });
});

/**
 * POST /discovery/create-tool
 * Create a tool from discovery results
 */
apiDiscoveryRoute.post("/create-tool", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json();
	const parsed = createToolSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const data = parsed.data;

	// Verify agent ownership
	const isOwner = await verifyAgentOwnership(data.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const db = getDb();

	// Check for duplicate name
	const [existing] = await db
		.select({ id: agentTools.id })
		.from(agentTools)
		.where(and(eq(agentTools.agentId, data.agentId), eq(agentTools.name, data.name)));

	if (existing) {
		return c.json({ error: "A tool with this name already exists" }, 400);
	}

	// Create the tool
	const [newTool] = await db
		.insert(agentTools)
		.values({
			agentId: data.agentId,
			name: data.name,
			description: data.description,
			inputSchema: data.inputSchema,
			executionType: "http",
			httpUrl: data.urlTemplate,
			httpMethod: data.method,
			httpHeaders: data.headers,
			displayConfig: data.displayConfig,
			isEnabled: true,
			allowAiSuggest: true,
			category: "custom",
		})
		.returning();

	return c.json(newTool, 201);
});

export { apiDiscoveryRoute };
