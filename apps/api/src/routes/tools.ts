import {
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	count,
	desc,
	eq,
	getDb,
	interfaceSettings,
	sql,
	toolExecutions,
	userSubscriptions,
} from "@ansa/db";
import type { ToolBlockData } from "@ansa/types";
import { extractFormBlock } from "@ansa/utils";
import { Hono } from "hono";
import { z } from "zod";
import type { ToolUse } from "../lib/llm";
import { getToolLimit, isSelfHosted } from "../lib/plans";
import { safeFetch } from "../lib/safe-fetch";
import { emitToConversation } from "../lib/socket-emitter";

const toolsRoute = new Hono();

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
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

const inputSchemaPropertySchema = z.object({
	type: z.string(),
	description: z.string().optional(),
	enum: z.array(z.string()).optional(),
	default: z.string().optional(),
});

const inputSchemaSchema = z.object({
	type: z.literal("object"),
	properties: z.record(z.string(), inputSchemaPropertySchema),
	required: z.array(z.string()).optional(),
});

const displayConfigSchema = z
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
		textFallback: z.string().optional(),
		skipFollowUp: z.boolean().optional(),
		followUpAcknowledgment: z.string().optional(),
		options: z
			.object({
				showPrice: z.boolean().optional(),
				showImage: z.boolean().optional(),
				showAddToCart: z.boolean().optional(),
				columns: z
					.array(
						z.object({
							key: z.string(),
							label: z.string(),
							width: z.string().optional(),
						}),
					)
					.optional(),
				buttonStyle: z.enum(["primary", "secondary", "outline"]).optional(),
				template: z.string().optional(),
				maxItems: z.number().optional(),
				viewMoreUrl: z.string().optional(),
				cardStyle: z.enum(["compact", "detailed"]).optional(),
			})
			.optional(),
	})
	.optional()
	.nullable();

// User context for tool execution
interface UserContext {
	userId?: string;
	userMetadata?: Record<string, unknown>;
}

// Execute tool based on its configuration (simplified version from chat.ts)
async function executeToolWithConfig(
	toolUse: ToolUse,
	tool: typeof agentTools.$inferSelect,
	userContext?: UserContext,
): Promise<string> {
	// Helper to substitute {{userContext.field}} placeholders
	const substituteUserContext = (text: string, ctx?: UserContext): string => {
		if (!ctx) return text;
		let result = text;
		// Replace {{userId}}
		if (ctx.userId) {
			result = result.replace(/\{\{userId\}\}/g, ctx.userId);
		}
		// Replace {{userMetadata.field}}
		if (ctx.userMetadata) {
			for (const [key, value] of Object.entries(ctx.userMetadata)) {
				const placeholder = new RegExp(`\\{\\{userMetadata\\.${key}\\}\\}`, "g");
				result = result.replace(placeholder, String(value));
			}
		}
		return result;
	};

	// Apply schema defaults (fill missing optional params with default or null)
	const inputWithDefaults: Record<string, unknown> = { ...toolUse.input };
	if (tool.inputSchema?.properties) {
		for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
			if (
				inputWithDefaults[key] === undefined ||
				inputWithDefaults[key] === null ||
				inputWithDefaults[key] === ""
			) {
				inputWithDefaults[key] = prop.default !== undefined ? prop.default : null;
			}
		}
	}
	// Strip null values before sending to external APIs
	const filteredInput: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(inputWithDefaults)) {
		if (value !== null && value !== undefined) {
			filteredInput[key] = value;
		}
	}

	switch (tool.executionType) {
		case "mock": {
			// Return mock response, with variable substitution
			if (tool.mockResponse) {
				let response = tool.mockResponse;
				// Replace ${param} placeholders with actual values
				for (const [key, value] of Object.entries(filteredInput)) {
					response = response.replace(new RegExp(`\\$\\{${key}\\}`, "g"), String(value));
				}
				return response;
			}
			return JSON.stringify({ result: "Mock response not configured" });
		}

		case "http": {
			if (!tool.httpUrl) {
				return JSON.stringify({ error: "HTTP URL not configured" });
			}

			// Build URL with parameter substitution (${param} for AI inputs)
			let url = tool.httpUrl;
			// Track which params were consumed by ${placeholder} substitution
			const consumedParams = new Set<string>();
			for (const [key, value] of Object.entries(filteredInput)) {
				const placeholderRegex = new RegExp(`\\$\\{${key}\\}`, "g");
				if (placeholderRegex.test(url)) {
					consumedParams.add(key);
					url = url.replace(new RegExp(`\\$\\{${key}\\}`, "g"), encodeURIComponent(String(value)));
				}
			}

			// For GET requests, append any unconsumed params as query parameters
			const httpMethodForParams = tool.httpMethod || "GET";
			if (httpMethodForParams === "GET") {
				const extraParams: string[] = [];
				for (const [key, value] of Object.entries(filteredInput)) {
					if (!consumedParams.has(key) && value !== undefined && value !== null && value !== "") {
						extraParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
					}
				}
				if (extraParams.length > 0) {
					url += url.includes("?") ? "&" : "?";
					url += extraParams.join("&");
				}
			}
			// Substitute {{userContext}} placeholders in URL
			url = substituteUserContext(url, userContext);

			// Process headers with {{userContext}} substitution
			const processedHeaders: Record<string, string> = {
				"Content-Type": "application/json",
			};
			if (tool.httpHeaders) {
				for (const [key, value] of Object.entries(tool.httpHeaders)) {
					processedHeaders[key] = substituteUserContext(value, userContext);
				}
			}

			// Build request body with {{userContext}} substitution for POST
			let requestBody: string | undefined;
			if (tool.httpMethod === "POST") {
				// Start with tool input, then substitute any {{}} placeholders in stringified form
				const bodyString = JSON.stringify(filteredInput);
				requestBody = substituteUserContext(bodyString, userContext);
			}

			try {
				const response = await safeFetch(url, {
					method: tool.httpMethod || "GET",
					headers: processedHeaders,
					...(tool.httpMethod === "POST" && {
						body: requestBody,
					}),
				});

				if (!response.ok) {
					return JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` });
				}

				const data = await response.json();
				return JSON.stringify(data);
			} catch (error) {
				return JSON.stringify({ error: `HTTP request failed: ${error}` });
			}
		}

		case "form": {
			// Form tools don't execute, they just display forms
			return JSON.stringify({ status: "form_displayed", message: "Form shown to user" });
		}

		default:
			return JSON.stringify({ error: `Unknown execution type: ${tool.executionType}` });
	}
}

// Form field validation schema
const formFieldValidationSchema = z
	.object({
		required: z.object({ value: z.boolean(), message: z.string() }).optional(),
		minLength: z.object({ value: z.number(), message: z.string() }).optional(),
		maxLength: z.object({ value: z.number(), message: z.string() }).optional(),
		min: z.object({ value: z.number(), message: z.string() }).optional(),
		max: z.object({ value: z.number(), message: z.string() }).optional(),
		pattern: z.object({ value: z.string(), message: z.string() }).optional(),
	})
	.optional();

// Form field schema
const formFieldSchema = z.object({
	name: z.string().min(1),
	label: z.string().min(1),
	type: z.enum([
		"text",
		"email",
		"tel",
		"number",
		"textarea",
		"select",
		"multiselect",
		"date",
		"datetime",
		"file",
		"image",
	]),
	placeholder: z.string().optional(),
	defaultValue: z.string().optional(),
	options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
	validation: formFieldValidationSchema,
});

// Form schema
const formSchemaSchema = z
	.object({
		fields: z.array(formFieldSchema).min(1, "At least one field is required"),
		introText: z.string().optional(),
		submitLabel: z.string().optional(),
		successMessage: z.string().optional(),
		errorMessage: z.string().optional(),
	})
	.optional()
	.nullable();

const createToolSchema = z.object({
	agentId: z.string().uuid("invalid agentId"),
	name: z
		.string()
		.min(1, "name required")
		.max(100, "name too long")
		.regex(/^[a-z_][a-z0-9_]*$/, "name must be lowercase with underscores"),
	description: z.string().min(1, "description required").max(1000, "description too long"),
	inputSchema: inputSchemaSchema,
	executionType: z.enum(["mock", "http", "form"]).default("mock"),
	httpUrl: z.string().url().optional().nullable(),
	httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().nullable(),
	httpHeaders: z.record(z.string(), z.string()).optional().nullable(),
	mockResponse: z.string().optional().nullable(),
	// Form-specific fields
	formSchema: formSchemaSchema,
	formExecutionMode: z.enum(["webhook", "client", "both"]).optional().nullable(),
	formWebhookUrl: z.string().url().optional().nullable(),
	formClientHandler: z.string().optional().nullable(),
	formPostActions: z
		.array(
			z.discriminatedUnion("type", [
				z.object({
					type: z.literal("webhook"),
					url: z.string().url(),
					headers: z.record(z.string(), z.string()).optional(),
				}),
				z.object({
					type: z.literal("slack"),
					webhookUrl: z.string().url(),
					messageTemplate: z.string().max(2000),
				}),
				z.object({
					type: z.literal("email"),
					recipientIds: z.array(z.string()),
				}),
			]),
		)
		.optional()
		.nullable(),
	displayConfig: displayConfigSchema,
	isEnabled: z.boolean().default(true),
	// Action configuration
	allowAiSuggest: z.boolean().default(true),
	countsAsConversion: z.boolean().default(false),
	countsAsResolution: z.boolean().default(false),
	category: z
		.enum([
			"lead_sales",
			"support_escalation",
			"feedback_survey",
			"account_user",
			"operations_internal",
			"custom",
		])
		.default("custom"),
});

const updateToolSchema = z
	.object({
		name: z
			.string()
			.min(1, "name required")
			.max(100, "name too long")
			.regex(/^[a-z_][a-z0-9_]*$/, "name must be lowercase with underscores")
			.optional(),
		description: z
			.string()
			.min(1, "description required")
			.max(1000, "description too long")
			.optional(),
		inputSchema: inputSchemaSchema.optional(),
		executionType: z.enum(["mock", "http", "form"]).optional(),
		httpUrl: z.string().url().optional().nullable(),
		httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional().nullable(),
		httpHeaders: z.record(z.string(), z.string()).optional().nullable(),
		mockResponse: z.string().optional().nullable(),
		// Form-specific fields
		formSchema: formSchemaSchema,
		formExecutionMode: z.enum(["webhook", "client", "both"]).optional().nullable(),
		formWebhookUrl: z.string().url().optional().nullable(),
		formClientHandler: z.string().optional().nullable(),
		formPostActions: z
			.array(
				z.discriminatedUnion("type", [
					z.object({
						type: z.literal("webhook"),
						url: z.string().url(),
						headers: z.record(z.string(), z.string()).optional(),
					}),
					z.object({
						type: z.literal("slack"),
						webhookUrl: z.string().url(),
						messageTemplate: z.string().max(2000),
					}),
					z.object({
						type: z.literal("email"),
						recipientIds: z.array(z.string()),
					}),
				]),
			)
			.optional()
			.nullable(),
		displayConfig: displayConfigSchema,
		isEnabled: z.boolean().optional(),
		// Action configuration
		allowAiSuggest: z.boolean().optional(),
		countsAsConversion: z.boolean().optional(),
		countsAsResolution: z.boolean().optional(),
		category: z
			.enum([
				"lead_sales",
				"support_escalation",
				"feedback_survey",
				"account_user",
				"operations_internal",
				"custom",
			])
			.optional(),
	})
	.refine((data) => Object.keys(data).length > 0, {
		message: "at least one field required",
	});

// List all tools for an agent
toolsRoute.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const isOwner = await verifyAgentOwnership(agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const db = getDb();

	// Get interface settings to check which system tools are enabled
	const [interfaceConfig] = await db
		.select({
			showSatisfactionOnResolved: interfaceSettings.showSatisfactionOnResolved,
		})
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	const whereConditions = [eq(agentTools.agentId, agentId)];

	// Filter out satisfaction survey system tool if the feature is disabled
	if (!interfaceConfig?.showSatisfactionOnResolved) {
		whereConditions.push(
			sql`NOT (${agentTools.system} = true AND ${agentTools.name} = 'satisfaction_survey')`,
		);
	}

	const tools = await db
		.select()
		.from(agentTools)
		.where(and(...whereConditions))
		.orderBy(desc(agentTools.createdAt));

	return c.json(tools);
});

// Get tool limits for the authenticated user's agent
toolsRoute.get("/limits", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const isOwner = await verifyAgentOwnership(agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const db = getDb();

	// Get interface settings to check enabled features
	const [interfaceConfig] = await db
		.select({
			showSatisfactionOnResolved: interfaceSettings.showSatisfactionOnResolved,
		})
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	// Get current tool count for this agent (exclude system tools, or satisfaction survey if disabled)
	const whereConditions = [eq(agentTools.agentId, agentId), eq(agentTools.system, false)];

	// Also count satisfaction survey if it's enabled
	if (interfaceConfig?.showSatisfactionOnResolved) {
		whereConditions.pop(); // Remove system = false condition
		whereConditions.push(
			sql`(${agentTools.system} = false OR (${agentTools.system} = true AND ${agentTools.name} = 'satisfaction_survey'))`,
		);
	}

	const [toolCount] = await db
		.select({ count: count() })
		.from(agentTools)
		.where(and(...whereConditions));

	const currentCount = toolCount?.count ?? 0;

	// Self-hosted mode has no limits
	if (isSelfHosted()) {
		return c.json({
			current: currentCount,
			limit: null,
			planId: "self-hosted",
			canCreate: true,
		});
	}

	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const limit = getToolLimit(planId);

	return c.json({
		current: currentCount,
		limit: limit === -1 ? null : limit,
		planId,
		canCreate: limit === -1 || currentCount < limit,
	});
});

// Get a single tool
toolsRoute.get("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const db = getDb();

	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	return c.json(tool);
});

// Create a new tool
toolsRoute.post("/", async (c) => {
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

	// Check tool limit (skip for self-hosted)
	if (!isSelfHosted()) {
		const [subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, userId))
			.limit(1);

		const planId = subscription?.planId ?? "free";
		const limit = getToolLimit(planId);

		// Get current tool count for this agent
		const [toolCount] = await db
			.select({ count: count() })
			.from(agentTools)
			.where(eq(agentTools.agentId, data.agentId));

		const currentCount = toolCount?.count ?? 0;

		// -1 means unlimited
		if (limit !== -1 && currentCount >= limit) {
			return c.json(
				{
					error: "Tool limit reached",
					code: "TOOL_LIMIT_REACHED",
					limit,
					current: currentCount,
				},
				403,
			);
		}
	}

	// Check for duplicate name within agent
	const [existing] = await db
		.select({ id: agentTools.id })
		.from(agentTools)
		.where(and(eq(agentTools.agentId, data.agentId), eq(agentTools.name, data.name)));

	if (existing) {
		return c.json({ error: "A tool with this name already exists for this agent" }, 400);
	}

	const [newTool] = await db
		.insert(agentTools)
		.values({
			agentId: data.agentId,
			name: data.name,
			description: data.description,
			inputSchema: data.inputSchema,
			executionType: data.executionType,
			httpUrl: data.httpUrl,
			httpMethod: data.httpMethod,
			httpHeaders: data.httpHeaders,
			mockResponse: data.mockResponse,
			formSchema: data.formSchema,
			formExecutionMode: data.formExecutionMode,
			formWebhookUrl: data.formWebhookUrl,
			formClientHandler: data.formClientHandler,
			displayConfig: data.displayConfig,
			isEnabled: data.isEnabled,
			// Action configuration
			allowAiSuggest: data.allowAiSuggest,
			countsAsConversion: data.countsAsConversion,
			countsAsResolution: data.countsAsResolution,
			category: data.category,
		})
		.returning();

	return c.json(newTool, 201);
});

// Update a tool
toolsRoute.put("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const body = await c.req.json();
	const parsed = updateToolSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const data = parsed.data;
	const db = getDb();

	// Get existing tool
	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Prevent renaming system tools
	if (tool.system && data.name && data.name !== tool.name) {
		return c.json(
			{
				error:
					"System tool names cannot be changed. This is a built-in tool managed by the platform.",
			},
			403,
		);
	}

	// Check for duplicate name if name is being changed
	if (data.name && data.name !== tool.name) {
		const [existing] = await db
			.select({ id: agentTools.id })
			.from(agentTools)
			.where(and(eq(agentTools.agentId, tool.agentId), eq(agentTools.name, data.name)));

		if (existing) {
			return c.json({ error: "A tool with this name already exists for this agent" }, 400);
		}
	}

	const [updated] = await db
		.update(agentTools)
		.set({
			name: data.name,
			description: data.description,
			inputSchema: data.inputSchema,
			executionType: data.executionType,
			httpUrl: data.httpUrl,
			httpMethod: data.httpMethod,
			httpHeaders: data.httpHeaders,
			mockResponse: data.mockResponse,
			formSchema: data.formSchema,
			formExecutionMode: data.formExecutionMode,
			formWebhookUrl: data.formWebhookUrl,
			formClientHandler: data.formClientHandler,
			formPostActions:
				data.formPostActions?.filter((action) => action.type !== "email") ?? undefined,
			displayConfig: data.displayConfig,
			isEnabled: data.isEnabled,
			allowAiSuggest: data.allowAiSuggest,
			countsAsConversion: data.countsAsConversion,
			countsAsResolution: data.countsAsResolution,
			category: data.category,
			updatedAt: new Date(),
		})
		.where(eq(agentTools.id, toolId))
		.returning();

	return c.json(updated);
});

// Delete a tool
toolsRoute.delete("/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const db = getDb();

	// Get existing tool
	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Prevent deletion of system tools
	if (tool.system) {
		return c.json(
			{ error: "System tools cannot be deleted. This is a built-in tool managed by the platform." },
			403,
		);
	}

	// Verify ownership via agent
	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	await db.delete(agentTools).where(eq(agentTools.id, toolId));

	return c.json({ success: true });
});

// Execute a tool manually (for human agents in Quick Actions)
toolsRoute.post("/:id/execute", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const toolId = c.req.param("id");
	const body = await c.req.json<{
		conversationId: string;
		input: Record<string, unknown>;
		userMetadata?: Record<string, unknown>;
	}>();

	const db = getDb();

	// Get tool and verify ownership
	const [tool] = await db.select().from(agentTools).where(eq(agentTools.id, toolId));

	if (!tool) {
		return c.json({ error: "Tool not found" }, 404);
	}

	const isOwner = await verifyAgentOwnership(tool.agentId, userId);
	if (!isOwner) {
		return c.json({ error: "Tool not found" }, 404);
	}

	// Get conversation and verify it exists
	const [convo] = await db
		.select()
		.from(conversations)
		.where(eq(conversations.id, body.conversationId));

	if (!convo || convo.agentId !== tool.agentId) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Build tool use object
	const toolUse: ToolUse = {
		id: tool.id,
		name: tool.name,
		input: body.input,
	};

	// Execute the tool with user context
	const userContext = body.userMetadata ? { userMetadata: body.userMetadata } : undefined;

	const startTime = Date.now();
	let result: string;
	let success = true;
	let errorMessage: string | null = null;

	try {
		result = await executeToolWithConfig(toolUse, tool, userContext);

		// Check if result contains an error
		try {
			const parsed = JSON.parse(result);
			if (parsed.error) {
				success = false;
				errorMessage = parsed.error;
			}
		} catch {
			// Result is not JSON, assume success
		}
	} catch (error) {
		success = false;
		errorMessage = error instanceof Error ? error.message : String(error);
		result = JSON.stringify({ error: errorMessage });
	}

	const executionTimeMs = Date.now() - startTime;

	// Log execution
	await db.insert(toolExecutions).values({
		agentId: tool.agentId,
		toolId: tool.id,
		toolName: tool.name,
		success,
		errorMessage,
		executionTimeMs,
	});

	// Only create a message if execution was successful
	if (!success) {
		return c.json({
			success,
			errorMessage,
			executionTimeMs,
		});
	}

	// Create tool blocks for the message based on tool type
	let toolBlocks: ToolBlockData[] | null = null;

	// For form tools, include the form schema in the result so widget can render the form
	if (tool.executionType === "form" && tool.formSchema) {
		toolBlocks = [
			{
				type: "tool_result",
				toolName: tool.name,
				result: {
					formSchema: tool.formSchema,
					formExecutionMode: tool.formExecutionMode || "webhook",
					formClientHandler: tool.formClientHandler,
					formPostActions: tool.formPostActions,
					toolId: tool.id,
					// Include the input as toolArgs for client-side schema functions
					toolArgs: body.input,
				},
				displayConfig: tool.displayConfig || { type: "form" },
			},
		];
	}
	// For non-form tools with rich display configs
	else if (tool.displayConfig && tool.displayConfig.type !== "text") {
		toolBlocks = [
			{
				type: "tool_result",
				toolName: tool.name,
				result: JSON.parse(result),
				displayConfig: tool.displayConfig,
			},
		];
	}

	// Create a message with the tool result
	const [message] = await db
		.insert(chatMessages)
		.values({
			conversationId: body.conversationId,
			role: "assistant",
			content: `Tool executed: ${tool.name}`,
			isHumanResponse: true,
			toolBlocks,
			metadata: { messageType: "tool_execution" },
		})
		.returning();

	// Emit WebSocket event to notify widget of new message with tool result
	const { formBlock, nonFormBlocks } = extractFormBlock(toolBlocks);
	emitToConversation(body.conversationId, "message_complete", {
		type: "message_complete",
		message: {
			id: message.id,
			role: "assistant",
			content: message.content,
			isHumanResponse: true,
			createdAt: message.createdAt,
			metadata: message.metadata,
			formBlock,
			blocks: nonFormBlocks.length > 0 ? nonFormBlocks : undefined,
		},
	});

	// Update conversation activity
	await db
		.update(conversations)
		.set({
			lastActivityAt: new Date(),
			updatedAt: new Date(),
		})
		.where(eq(conversations.id, body.conversationId));

	return c.json({
		success,
		message,
		toolResult: JSON.parse(result),
		executionTimeMs,
	});
});

// Test an HTTP endpoint configuration (for visual field mapping)
toolsRoute.post("/test-http", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{
		url: string;
		method: "GET" | "POST" | "PUT" | "DELETE";
		headers?: Record<string, string>;
		input?: Record<string, unknown>;
	}>();

	if (!body.url) {
		return c.json({ error: "URL is required" }, 400);
	}

	try {
		let fetchUrl = body.url;
		const fetchOptions: RequestInit = {
			method: body.method || "GET",
			headers: {
				"Content-Type": "application/json",
				...(body.headers || {}),
			},
		};

		// Replace placeholders in URL like ${param} with actual values
		if (body.input) {
			for (const [key, value] of Object.entries(body.input)) {
				fetchUrl = fetchUrl.replace(
					new RegExp(`\\$\\{${key}\\}`, "g"),
					encodeURIComponent(String(value)),
				);
			}
		}

		if (body.method === "GET" && body.input) {
			const url = new URL(fetchUrl);
			for (const [key, value] of Object.entries(body.input)) {
				if (!body.url.includes(`\${${key}}`)) {
					url.searchParams.set(key, String(value));
				}
			}
			fetchUrl = url.toString();
		} else if (body.method !== "GET" && body.input) {
			fetchOptions.body = JSON.stringify(body.input);
		}

		const response = await safeFetch(fetchUrl, fetchOptions);
		const contentType = response.headers.get("content-type") || "";

		let responseData: unknown;
		if (contentType.includes("application/json")) {
			responseData = await response.json();
		} else {
			responseData = await response.text();
		}

		return c.json({
			success: response.ok,
			status: response.status,
			statusText: response.statusText,
			data: responseData,
		});
	} catch (error) {
		return c.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Failed to make request",
			},
			500,
		);
	}
});

export { toolsRoute };
