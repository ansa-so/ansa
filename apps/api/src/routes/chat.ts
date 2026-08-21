import type { AgentTool } from "@ansa/db";
import {
	agentEscalationSettings,
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	desc,
	eq,
	escalations,
	getDb,
	inArray,
	interfaceSettings,
	interfaceSettingsTranslations,
	isNotNull,
	isNull,
	kbRetrievalSources,
	llmUsage,
	type NewLLMUsage,
	or,
	retrievalTraces,
	securitySettings,
	shopifyCustomers,
	shopifyOrders,
	shopifyProducts,
	shopifyShopAgents,
	shopifyShops,
	sql,
	toolExecutions,
	turnEvents,
	turns,
	userSubscriptions,
} from "@ansa/db";
import type { ChatMessage, ChatRequest, DisplayConfig, ToolBlockData } from "@ansa/types";
import { AI_QUALITY_TIERS, type AIQuality } from "@ansa/types";
import { extractFormBlock, getPersonaSystemPrompt } from "@ansa/utils";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { trackLLMCost } from "../lib/analytics";
import { config } from "../lib/config";
import { calculateLLMCostCents } from "../lib/cost-tracking";
import { createQueryEmbedding } from "../lib/embeddings";
import { detectLanguage } from "../lib/language-detection";
import { streamChat, type Tool, type ToolUse } from "../lib/llm";
import { resolveTierToModel } from "../lib/models";
import { CONVERSATION_RATE_LIMITS, canRemoveBranding, getAvailableAIQuality } from "../lib/plans";
import { extractShopifyProductHandle, formatProductContext } from "../lib/product-utils";
import { emitToConversation } from "../lib/socket-emitter";
import { usageProvider } from "../lib/usage";
import { vectorClient } from "../lib/vector";
import { DEFAULT_FOOTER_MESSAGE } from "./interface-settings";

const chat = new Hono();

// Escalation intent detection functions
function detectHumanRequest(message: string): boolean {
	const patterns = [
		// English
		/\b(talk|speak|connect|transfer|chat|reach).*(human|agent|person|someone|representative|support)\b/i,
		/\b(human|agent|person|representative).*(talk|speak|connect|available)\b/i,
		// Spanish
		/\b(hablar|habla|contactar|conectar).*(humano|agente|persona|representante|soporte)\b/i,
		// French
		/\b(parler|parle|contacter|joindre).*(humain|agent|personne|représentant|support)\b/i,
		// German
		/\b(sprechen|reden|kontaktieren|verbinden).*(mensch|agent|person|mitarbeiter|support)\b/i,
	];
	return patterns.some((pattern) => pattern.test(message));
}

function detectHelpRequest(message: string): boolean {
	const patterns = [
		/\b(i need help|need assistance|help me|can you help|could you help|please help)\b/i,
		/\b(stuck|confused|lost|don't understand|can't figure)\b/i,
		/\b(ayuda|ayúdame|necesito ayuda)\b/i, // Spanish
		/\b(aide|aidez-moi|besoin d'aide|j'ai besoin)\b/i, // French
		/\b(hilfe|hilfst|brauche hilfe|können sie helfen)\b/i, // German
	];
	return patterns.some((pattern) => pattern.test(message));
}

// Fetch tools from database for an agent
async function getAgentTools(agentId: string, escalationEnabled = false): Promise<Tool[]> {
	const db = getDb();
	const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, agentId));

	const result = tools
		.filter((t) => t.isEnabled)
		// Filter out human_handoff_form when escalation is enabled (they serve the same purpose)
		.filter((t) => !(escalationEnabled && t.name === "human_handoff_form"))
		.map((t) => {
			// For form tools, use empty input schema - the AI just needs to decide
			// to show the form based on the description, no parameters to extract
			const inputSchema =
				t.executionType === "form"
					? { type: "object", properties: {}, required: [] }
					: t.inputSchema;

			return {
				name: t.name,
				description: t.description,
				input_schema: { ...inputSchema, required: inputSchema.required ?? [] },
			} as Tool;
		});

	return result;
}

// Form field type definition (matches schema)
interface FormField {
	name: string;
	label: string;
	type:
		| "text"
		| "email"
		| "tel"
		| "number"
		| "textarea"
		| "select"
		| "multiselect"
		| "date"
		| "datetime"
		| "file"
		| "image";
	placeholder?: string;
	defaultValue?: string;
	options?: Array<{ label: string; value: string }>;
	validation?: {
		required?: { value: boolean; message: string };
		minLength?: { value: number; message: string };
		maxLength?: { value: number; message: string };
		min?: { value: number; message: string };
		max?: { value: number; message: string };
		pattern?: { value: string; message: string };
	};
}

interface FormSchema {
	fields: FormField[];
	introText?: string;
	submitLabel?: string;
	successMessage?: string;
	errorMessage?: string;
}

// Tool execution result type
interface ToolDebugInfo {
	url: string;
	method: string;
	statusCode: number | null;
	rawResponse: string;
	executionTimeMs: number;
}

interface ToolExecutionResult {
	result: string;
	displayConfig: (typeof agentTools.$inferSelect)["displayConfig"];
	debugInfo?: ToolDebugInfo;
	// Form-specific fields (only present when executionType is "form")
	isFormTool?: boolean;
	toolId?: string;
	formSchema?: FormSchema;
	formExecutionMode?: "server" | "client" | "both";
	formClientHandler?: string;
	formPostActions?: Array<
		| { type: "webhook"; url: string; headers?: Record<string, string> }
		| { type: "slack"; webhookUrl: string; messageTemplate: string }
	>;
	toolArgs?: Record<string, unknown>; // AI-generated arguments
}

// Tool with form fields (extended type until schema types are rebuilt)
type ToolWithFormFields = typeof agentTools.$inferSelect & {
	formSchema?: FormSchema;
	formExecutionMode?: "server" | "client" | "both";
	formClientHandler?: string;
	formWebhookUrl?: string;
	formPostActions?: Array<
		| { type: "webhook"; url: string; headers?: Record<string, string> }
		| { type: "slack"; webhookUrl: string; messageTemplate: string }
	>;
};

// User context for tool execution (identity passed from widget)
interface UserContext {
	userId?: string;
	userMetadata?: Record<string, unknown>;
}

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue({ user: { profile: { id: 123 } } }, "user.profile.id") => 123
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	return path.split(".").reduce((current: unknown, key: string) => {
		if (current && typeof current === "object" && key in current) {
			return (current as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj);
}

/**
 * Substitute {{context}} placeholders in a string with values from userContext
 * Supports deep paths like {{userMetadata.auth.token}}
 */
function substituteUserContext(template: string, userContext?: UserContext): string {
	if (!userContext) return template;

	return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
		const trimmedPath = path.trim();

		// Handle {{userId}} directly
		if (trimmedPath === "userId") {
			return userContext.userId ?? "";
		}

		// Handle {{userMetadata.x.y.z}} paths
		if (trimmedPath.startsWith("userMetadata.") && userContext.userMetadata) {
			const metadataPath = trimmedPath.slice("userMetadata.".length);
			const value = getNestedValue(userContext.userMetadata, metadataPath);
			return value !== undefined ? String(value) : "";
		}

		// Handle {{userMetadata}} as JSON
		if (trimmedPath === "userMetadata" && userContext.userMetadata) {
			return JSON.stringify(userContext.userMetadata);
		}

		// No match, return empty string
		return "";
	});
}

// Tool execution handler - reads config from database
async function executeTool(
	toolUse: ToolUse,
	agentId: string,
	userContext?: UserContext,
): Promise<ToolExecutionResult> {
	const db = getDb();
	const [rawTool] = await db
		.select()
		.from(agentTools)
		.where(and(eq(agentTools.agentId, agentId), eq(agentTools.name, toolUse.name)))
		.limit(1);

	if (!rawTool) {
		// Track failed execution (tool not found)
		db.insert(toolExecutions)
			.values({
				agentId,
				toolId: null,
				toolName: toolUse.name,
				success: false,
				errorMessage: `Unknown tool: ${toolUse.name}`,
				executionTimeMs: 0,
			})
			.execute()
			.catch((err) => console.error("Failed to log tool execution:", err));
		return {
			result: JSON.stringify({ error: `Unknown tool: ${toolUse.name}` }),
			displayConfig: null,
		};
	}

	// Cast to include form fields (until schema types are rebuilt)
	const tool = rawTool as ToolWithFormFields;

	// Handle form tools specially - don't execute, just return the form schema
	if (tool.executionType === "form") {
		// Log that the form was triggered
		db.insert(toolExecutions)
			.values({
				agentId,
				toolId: tool.id,
				toolName: tool.name,
				success: true,
				errorMessage: null,
				executionTimeMs: 0,
			})
			.execute()
			.catch((err) => console.error("Failed to log tool execution:", err));

		return {
			result: JSON.stringify({ status: "form_displayed", message: "Form shown to user" }),
			displayConfig: tool.displayConfig,
			isFormTool: true,
			toolId: tool.id,
			formSchema: tool.formSchema,
			formExecutionMode: tool.formExecutionMode,
			formClientHandler: tool.formClientHandler,
			formPostActions: tool.formPostActions,
			toolArgs: toolUse.input as Record<string, unknown>,
		};
	}

	// Execute with timing
	const startTime = Date.now();
	let result: string;
	let success = true;
	let errorMessage: string | null = null;

	let debugInfo: ToolDebugInfo | undefined;

	try {
		const execResult = await executeToolWithConfig(toolUse, tool, agentId, userContext);
		result = execResult.result;
		debugInfo = execResult.debugInfo;
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

	// Log execution asynchronously (non-blocking)
	db.insert(toolExecutions)
		.values({
			agentId,
			toolId: tool.id,
			toolName: tool.name,
			success,
			errorMessage,
			executionTimeMs,
		})
		.execute()
		.catch((err) => console.error("Failed to log tool execution:", err));

	return { result, displayConfig: tool.displayConfig, debugInfo };
}

/**
 * Merge default values from the tool's inputSchema for parameters
 * the AI didn't provide. Optional params without a default get null,
 * ensuring every schema-defined parameter is present in the result.
 * Use stripNullValues() before sending to external APIs.
 */
function applySchemaDefaults(
	aiInput: Record<string, unknown>,
	inputSchema: (typeof agentTools.$inferSelect)["inputSchema"],
): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...aiInput };
	if (inputSchema?.properties) {
		for (const [key, prop] of Object.entries(inputSchema.properties)) {
			// Fill in default values for missing params
			if (merged[key] === undefined || merged[key] === null || merged[key] === "") {
				merged[key] = prop.default !== undefined ? prop.default : null;
			}
		}
	}
	return merged;
}

/**
 * Remove keys with null or undefined values from an object.
 * Used to clean up params before sending to external APIs
 * so that null placeholders never reach the HTTP request.
 */
function stripNullValues(obj: Record<string, unknown>): Record<string, unknown> {
	const cleaned: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== null && value !== undefined) {
			cleaned[key] = value;
		}
	}
	return cleaned;
}

/**
 * Remove any remaining ${...} placeholders from a URL.
 * For query params like &key=${value} or ?key=${value}, removes the entire key=value pair.
 * For path segments, removes the placeholder text.
 * Cleans up resulting double-& or trailing ? / &.
 */
function cleanUnresolvedPlaceholders(url: string): string {
	// Remove query params whose value is an unresolved ${...} placeholder
	// Matches: key=${...} (possibly with surrounding & or ?)
	let cleaned = url.replace(/([&?])[^&?=]+=\$\{[^}]+\}/g, (_match, sep) => {
		// If separator is ?, keep ? so remaining params stay valid
		return sep === "?" ? "?" : "";
	});
	// Remove any remaining ${...} in path segments
	cleaned = cleaned.replace(/\$\{[^}]+\}/g, "");
	// Clean up malformed query strings: trailing ?, trailing &, double &&, ?&
	cleaned = cleaned.replace(/\?&/, "?").replace(/&&+/g, "&").replace(/[?&]$/, "");
	return cleaned;
}

/**
 * Resolve a dot-notation path on an object (e.g. "results.items" → obj.results.items).
 */
function getValueByPath(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== "object") return undefined;
	const cleanPath = path.replace(/^\$\.?/, "");
	if (!cleanPath) return obj;
	let current: unknown = obj;
	for (const part of cleanPath.split(".")) {
		if (current === null || current === undefined || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * Build a compact LLM-friendly summary of a tool result, using the tool's
 * displayConfig (dataPath, fieldMappings, maxItems) when available.
 *
 * The full result is still sent to the UI via SSE — this summary is only
 * used for the follow-up LLM call to reduce token usage dramatically.
 *
 * MAX_LLM_RESULT_CHARS caps the final string to prevent context blow-up
 * even when no displayConfig is configured.
 */
const MAX_LLM_RESULT_CHARS = 3000;
const DEFAULT_LLM_MAX_ITEMS = 8;

function summarizeToolResultForLLM(
	rawResult: string,
	displayConfig?: {
		dataPath?: string;
		fieldMappings?: Record<string, string>;
		options?: { maxItems?: number };
	} | null,
): string {
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawResult);
	} catch {
		// Not JSON — just truncate the raw text
		if (rawResult.length > MAX_LLM_RESULT_CHARS) {
			return `${rawResult.slice(0, MAX_LLM_RESULT_CHARS)}...(truncated)`;
		}
		return rawResult;
	}

	// --- Try to locate the main data array ---
	let items: unknown[] | null = null;
	let totalCount: number | null = null;

	// 1. Use dataPath from displayConfig if available
	if (displayConfig?.dataPath) {
		const resolved = getValueByPath(parsed, displayConfig.dataPath);
		if (Array.isArray(resolved)) {
			items = resolved;
		}
	}

	// 2. Fallback: look for common array keys or top-level array
	if (!items) {
		if (Array.isArray(parsed)) {
			items = parsed;
		} else if (parsed && typeof parsed === "object") {
			const obj = parsed as Record<string, unknown>;

			// Extract total count metadata if present
			for (const key of ["total", "total_count", "totalCount", "count", "total_results"]) {
				if (typeof obj[key] === "number") {
					totalCount = obj[key] as number;
					break;
				}
			}

			// Find the main array
			for (const key of [
				"products",
				"items",
				"data",
				"results",
				"properties",
				"listings",
				"entries",
				"records",
				"hits",
			]) {
				if (Array.isArray(obj[key])) {
					items = obj[key] as unknown[];
					break;
				}
			}

			// Fallback: first array value whose items look like objects
			if (!items) {
				for (const value of Object.values(obj)) {
					if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
						items = value;
						break;
					}
				}
			}
		}
	}

	// --- No array found: treat the whole result as a single object/value ---
	if (!items) {
		const compact = JSON.stringify(parsed);
		if (compact.length <= MAX_LLM_RESULT_CHARS) return compact;
		return `${compact.slice(0, MAX_LLM_RESULT_CHARS)}...(truncated)`;
	}

	// --- Summarize the array ---
	const total = totalCount ?? items.length;
	const maxItems = displayConfig?.options?.maxItems ?? DEFAULT_LLM_MAX_ITEMS;
	const sliced = items.slice(0, maxItems);
	const fieldMappings = displayConfig?.fieldMappings;

	let summaryLines: string[];

	if (fieldMappings && Object.keys(fieldMappings).length > 0) {
		// Use field mappings to extract only the fields that matter
		summaryLines = sliced.map((item) => {
			const mapped: Record<string, unknown> = {};
			for (const [targetField, expression] of Object.entries(fieldMappings)) {
				// Support simple dot paths (skip template expressions for server-side)
				if (!expression.includes("{{")) {
					const pathOnly = expression.replace(/\s*\|\|.*$/, "").trim();
					const value = getValueByPath(item, pathOnly);
					if (value !== undefined && value !== null && value !== "") {
						mapped[targetField] = value;
					}
				}
			}
			// Build a readable line: "Title — Price, Description"
			const parts: string[] = [];
			for (const [key, val] of Object.entries(mapped)) {
				// Skip image/url fields — they waste tokens and the LLM doesn't need them
				if (/image|img|photo|thumbnail|url|href|link|src/i.test(key)) continue;
				parts.push(`${key}: ${String(val)}`);
			}
			return parts.length > 0 ? `- ${parts.join(", ")}` : `- ${JSON.stringify(mapped)}`;
		});
	} else {
		// No field mappings — extract a compact version of each item
		summaryLines = sliced.map((item) => {
			if (!item || typeof item !== "object") return `- ${JSON.stringify(item)}`;
			const obj = item as Record<string, unknown>;
			const compact: Record<string, unknown> = {};
			for (const [key, val] of Object.entries(obj)) {
				// Skip heavy/non-useful fields
				if (
					/image|img|photo|thumbnail|src|coordinates?|lat|lng|longitude|latitude|amenities|house_rules|cancellation|host|reviews?|html|description/i.test(
						key,
					)
				)
					continue;
				if (typeof val === "object" && val !== null) continue; // Skip nested objects
				if (typeof val === "string" && val.length > 200) continue; // Skip long strings
				compact[key] = val;
			}
			return `- ${JSON.stringify(compact)}`;
		});
	}

	const header =
		total > sliced.length
			? `${total} results total, showing first ${sliced.length}:`
			: `${total} results:`;
	const summary = `${header}\n${summaryLines.join("\n")}`;

	// Final safety cap
	if (summary.length > MAX_LLM_RESULT_CHARS) {
		return `${summary.slice(0, MAX_LLM_RESULT_CHARS)}...(truncated)`;
	}
	return summary;
}

/**
 * Cap the number of items in a tool result before streaming via SSE.
 * The widget only displays a limited number (carousel defaults to 10, grid to ~20),
 * so sending hundreds of full objects wastes bandwidth and can cause SSE parsing
 * issues with very large payloads.
 */
const MAX_SSE_ITEMS = 20;
function trimResultForSSE(
	parsed: unknown,
	displayConfig?: {
		dataPath?: string;
		options?: { maxItems?: number };
	} | null,
): unknown {
	const maxItems = displayConfig?.options?.maxItems ?? MAX_SSE_ITEMS;

	// Check dataPath first
	if (displayConfig?.dataPath && parsed && typeof parsed === "object") {
		const resolved = getValueByPath(parsed, displayConfig.dataPath);
		if (Array.isArray(resolved) && resolved.length > maxItems) {
			// Clone the top-level object and replace the array at the dataPath with a trimmed version
			// For simplicity, only handle single-level dataPath
			const obj = { ...(parsed as Record<string, unknown>) };
			const pathParts = displayConfig.dataPath.replace(/^\$\.?/, "").split(".");
			if (pathParts.length === 1 && pathParts[0]) {
				obj[pathParts[0]] = resolved.slice(0, maxItems);
				return obj;
			}
		}
	}

	// Top-level array
	if (Array.isArray(parsed) && parsed.length > maxItems) {
		return parsed.slice(0, maxItems);
	}

	// Object with common array keys
	if (parsed && typeof parsed === "object") {
		const obj = parsed as Record<string, unknown>;
		const commonKeys = [
			"products",
			"items",
			"data",
			"results",
			"properties",
			"listings",
			"entries",
			"records",
			"hits",
		];
		for (const key of commonKeys) {
			if (Array.isArray(obj[key]) && (obj[key] as unknown[]).length > maxItems) {
				return { ...obj, [key]: (obj[key] as unknown[]).slice(0, maxItems) };
			}
		}
	}

	return parsed;
}

// Execute tool based on its configuration
async function executeToolWithConfig(
	toolUse: ToolUse,
	tool: AgentTool,
	agentId: string,
	userContext?: UserContext,
): Promise<{ result: string; debugInfo?: ToolDebugInfo }> {
	switch (tool.executionType) {
		case "mock": {
			// Return mock response, with variable substitution
			if (tool.mockResponse) {
				let response = tool.mockResponse;
				// Merge default values for params the AI didn't provide
				const inputWithDefaults = stripNullValues(
					applySchemaDefaults(toolUse.input, tool.inputSchema),
				);
				// Replace ${param} placeholders with actual values
				for (const [key, value] of Object.entries(inputWithDefaults)) {
					response = response.replace(new RegExp(`\\$\\{${key}\\}`, "g"), String(value));
				}
				return { result: response };
			}
			return { result: JSON.stringify({ result: "Mock response not configured" }) };
		}

		case "http": {
			if (!tool.httpUrl) {
				return { result: JSON.stringify({ error: "HTTP URL not configured" }) };
			}

			// Build URL with parameter substitution (${param} for AI inputs)
			let url = tool.httpUrl;
			// Merge default values for params the AI didn't provide, then strip nulls
			const inputWithDefaults = stripNullValues(
				applySchemaDefaults(toolUse.input, tool.inputSchema),
			);
			// Track which params were consumed by ${placeholder} substitution
			const consumedParams = new Set<string>();
			for (const [key, value] of Object.entries(inputWithDefaults)) {
				const placeholderRegex = new RegExp(`\\$\\{${key}\\}`, "g");
				if (placeholderRegex.test(url)) {
					consumedParams.add(key);
					url = url.replace(new RegExp(`\\$\\{${key}\\}`, "g"), encodeURIComponent(String(value)));
				}
			}
			// Clean up any remaining ${...} placeholders (optional params with no default and no AI value)
			url = cleanUnresolvedPlaceholders(url);

			// For GET requests, append any unconsumed params as query parameters
			// This ensures optional params the LLM extracted are sent to the API
			const httpMethodForParams = tool.httpMethod || "GET";
			if (httpMethodForParams === "GET") {
				const extraParams: string[] = [];
				for (const [key, value] of Object.entries(inputWithDefaults)) {
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
				// Start with tool input (including defaults for missing params)
				const inputWithContext: Record<string, unknown> = { ...inputWithDefaults };

				// Inject agentId for internal endpoints (Shopify integration tools)
				if (tool.integrationSource && url.includes("/internal/")) {
					inputWithContext.agentId = agentId;
				}

				// Substitute any {{}} placeholders in stringified form
				const bodyString = JSON.stringify(inputWithContext);
				requestBody = substituteUserContext(bodyString, userContext);
			}

			const httpMethod = tool.httpMethod || "GET";
			const httpStartTime = Date.now();

			try {
				const response = await fetch(url, {
					method: httpMethod,
					headers: processedHeaders,
					...(tool.httpMethod === "POST" && {
						body: requestBody,
					}),
				});

				const rawText = await response.text();
				const truncatedRaw =
					rawText.length > 2048 ? `${rawText.slice(0, 2048)}...truncated` : rawText;
				const debugInfo: ToolDebugInfo = {
					url,
					method: httpMethod,
					statusCode: response.status,
					rawResponse: truncatedRaw,
					executionTimeMs: Date.now() - httpStartTime,
				};

				if (!response.ok) {
					return {
						result: JSON.stringify({ error: `HTTP ${response.status}: ${response.statusText}` }),
						debugInfo,
					};
				}

				try {
					const data = JSON.parse(rawText);
					return { result: JSON.stringify(data), debugInfo };
				} catch {
					return { result: rawText, debugInfo };
				}
			} catch (error) {
				return {
					result: JSON.stringify({ error: `HTTP request failed: ${error}` }),
					debugInfo: {
						url,
						method: httpMethod,
						statusCode: null,
						rawResponse: String(error),
						executionTimeMs: Date.now() - httpStartTime,
					},
				};
			}
		}

		default:
			return { result: JSON.stringify({ error: `Unknown execution type: ${tool.executionType}` }) };
	}
}

// In-memory rate limiter (key: agentId:clientIP, value: timestamps)
const rateLimitStore = new Map<string, number[]>();

// Clean up old entries every 5 minutes
setInterval(
	() => {
		const now = Date.now();
		for (const [key, timestamps] of rateLimitStore.entries()) {
			const filtered = timestamps.filter((t) => now - t < 86400000); // keep last 24h
			if (filtered.length === 0) {
				rateLimitStore.delete(key);
			} else {
				rateLimitStore.set(key, filtered);
			}
		}
	},
	5 * 60 * 1000,
);

function checkRateLimit(
	agentId: string,
	clientIP: string,
	limit: number,
	windowSeconds: number,
): { allowed: boolean; remaining: number } {
	const key = `${agentId}:${clientIP}`;
	const now = Date.now();
	const windowMs = windowSeconds * 1000;

	const timestamps = rateLimitStore.get(key) || [];
	const validTimestamps = timestamps.filter((t) => now - t < windowMs);

	if (validTimestamps.length >= limit) {
		return { allowed: false, remaining: 0 };
	}

	validTimestamps.push(now);
	rateLimitStore.set(key, validTimestamps);

	return { allowed: true, remaining: limit - validTimestamps.length };
}

function checkDomainAllowed(origin: string | null, allowedDomains: string[]): boolean {
	// Empty array means allow all
	if (!allowedDomains || allowedDomains.length === 0) {
		return true;
	}
	if (!origin) {
		return false; // No origin = block if domains are configured
	}
	try {
		const originHost = new URL(origin).host;
		return allowedDomains.some((domain) => {
			try {
				const allowedHost = new URL(domain).host;
				return originHost === allowedHost || originHost.endsWith(`.${allowedHost}`);
			} catch {
				// If domain is just a hostname without protocol
				return originHost === domain || originHost.endsWith(`.${domain}`);
			}
		});
	} catch {
		return false;
	}
}

/**
 * Fetch Shopify context for an agent (products, recent orders, customers)
 */
async function getShopifyContext(agentId: string): Promise<string | null> {
	const db = getDb();

	// Check if agent is linked to a Shopify shop
	const [shopAgent] = await db
		.select({
			shopId: shopifyShopAgents.shopId,
			currency: shopifyShops.currency,
		})
		.from(shopifyShopAgents)
		.innerJoin(shopifyShops, eq(shopifyShops.id, shopifyShopAgents.shopId))
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) {
		return null;
	}

	// Fetch products (limit to 50 most recent)
	let products: Array<{
		title: string;
		handle: string | null;
		description: string | null;
		vendor: string | null;
		productType: string | null;
		tags: string[] | null;
		status: string | null;
		variants: unknown;
	}> = [];

	try {
		products = await db
			.select({
				title: shopifyProducts.title,
				handle: shopifyProducts.handle,
				description: shopifyProducts.description,
				vendor: shopifyProducts.vendor,
				productType: shopifyProducts.productType,
				tags: shopifyProducts.tags,
				status: shopifyProducts.status,
				variants: shopifyProducts.variants,
			})
			.from(shopifyProducts)
			.where(
				and(
					eq(shopifyProducts.shopId, shopAgent.shopId),
					eq(shopifyProducts.status, "active"),
					// TODO: Add publishedAt filter after migration
				),
			)
			.limit(50);
	} catch (err) {
		console.warn("[Shopify Context] Failed to fetch products:", err);
	}

	// Fetch recent orders (limit to 20)
	let orders: Array<{
		orderNumber: string;
		email: string | null;
		financialStatus: string | null;
		fulfillmentStatus: string | null;
		totalPrice: string;
		lineItems: unknown;
		createdAt: Date;
	}> = [];

	try {
		orders = await db
			.select({
				orderNumber: shopifyOrders.orderNumber,
				email: shopifyOrders.customerEmail,
				financialStatus: shopifyOrders.financialStatus,
				fulfillmentStatus: shopifyOrders.fulfillmentStatus,
				totalPrice: shopifyOrders.totalPrice,
				lineItems: shopifyOrders.lineItems,
				createdAt: shopifyOrders.shopifyCreatedAt,
			})
			.from(shopifyOrders)
			.where(eq(shopifyOrders.shopId, shopAgent.shopId))
			.orderBy(desc(shopifyOrders.shopifyCreatedAt))
			.limit(20);
	} catch (err) {
		console.warn("[Shopify Context] Failed to fetch orders:", err);
	}

	// Fetch customers (limit to 30)
	let customers: Array<{
		email: string | null;
		firstName: string | null;
		lastName: string | null;
		ordersCount: number | null;
		totalSpent: string | null;
		tags: string[] | null;
	}> = [];

	try {
		customers = await db
			.select({
				email: shopifyCustomers.email,
				firstName: shopifyCustomers.firstName,
				lastName: shopifyCustomers.lastName,
				ordersCount: shopifyCustomers.ordersCount,
				totalSpent: shopifyCustomers.totalSpent,
				tags: shopifyCustomers.tags,
			})
			.from(shopifyCustomers)
			.where(eq(shopifyCustomers.shopId, shopAgent.shopId))
			.limit(30);
	} catch (err) {
		console.warn("[Shopify Context] Failed to fetch customers:", err);
	}

	if (products.length === 0 && orders.length === 0 && customers.length === 0) {
		return null;
	}

	// Build context string
	const contextParts: string[] = [];

	if (products.length > 0) {
		const productList = products
			.map((p) => {
				// Parse variants for pricing info
				const variants = p.variants as Array<{
					title: string;
					price: string;
					sku?: string;
					inventory_quantity?: number;
				}> | null;
				const currency = shopAgent.currency || "USD";
				const parsedPrices =
					variants?.map((v) => parseFloat(v.price)).filter((n) => !Number.isNaN(n)) || [];
				const minPrice = parsedPrices.length ? Math.min(...parsedPrices) : null;
				const maxPrice = parsedPrices.length ? Math.max(...parsedPrices) : null;
				const priceInfo =
					minPrice !== null
						? minPrice === maxPrice
							? `Price: ${currency} ${minPrice}`
							: `Price: ${currency} ${minPrice} - ${maxPrice}`
						: "";
				const variantDetails =
					variants && variants.length > 1
						? ` Variants: ${variants.map((v) => `${v.title}: ${currency} ${v.price}`).join(", ")}`
						: "";
				const tagsStr = Array.isArray(p.tags) ? p.tags.join(", ") : "none";
				return `- ${p.title}: ${p.description?.replace(/<[^>]*>/g, "").slice(0, 150) || "No description"}. ${priceInfo}.${variantDetails} Status: ${p.status || "active"}. Tags: ${tagsStr}`;
			})
			.join("\n");
		contextParts.push(`## Available Products (${products.length})\n${productList}`);
	}

	if (orders.length > 0) {
		const orderList = orders
			.map((o) => {
				const items = o.lineItems as Array<{ title: string; quantity: number }> | null;
				const itemSummary = items?.map((i) => `${i.quantity}x ${i.title}`).join(", ") || "No items";
				return `- Order #${o.orderNumber} (${o.email}): ${itemSummary}. Total: ${o.totalPrice}. Status: ${o.financialStatus}/${o.fulfillmentStatus || "unfulfilled"}`;
			})
			.join("\n");
		contextParts.push(`## Recent Orders (${orders.length})\n${orderList}`);
	}

	if (customers.length > 0) {
		const customerList = customers
			.map((c) => {
				return `- ${c.firstName || ""} ${c.lastName || ""} (${c.email}): ${c.ordersCount} orders, ${c.totalSpent} spent. Tags: ${c.tags || "none"}`;
			})
			.join("\n");
		contextParts.push(`## Customers (${customers.length})\n${customerList}`);
	}

	return `## Shopify Store Data\n\n${contextParts.join("\n\n")}`;
}

/**
 * Sensitive keys to exclude from LLM context (case-insensitive matching)
 */
const SENSITIVE_KEY_PATTERNS = [
	"token",
	"secret",
	"password",
	"apikey",
	"api_key",
	"accesstoken",
	"access_token",
	"refreshtoken",
	"refresh_token",
	"auth",
	"credential",
	"private",
];

/**
 * Sanitize userMetadata by removing sensitive fields before passing to LLM
 */
function sanitizeUserMetadataForLLM(
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;

	const sanitized: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(metadata)) {
		const lowerKey = key.toLowerCase();
		const isSensitive = SENSITIVE_KEY_PATTERNS.some((pattern) => lowerKey.includes(pattern));

		if (!isSensitive) {
			// Recursively sanitize nested objects
			if (value && typeof value === "object" && !Array.isArray(value)) {
				const sanitizedNested = sanitizeUserMetadataForLLM(value as Record<string, unknown>);
				if (sanitizedNested && Object.keys(sanitizedNested).length > 0) {
					sanitized[key] = sanitizedNested;
				}
			} else {
				sanitized[key] = value;
			}
		}
	}

	return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

const DEFAULT_ESCALATION_NOTICE =
	"We don't have an exact response to your question, but we've escalated your message to our team. A human agent will respond soon.";

/**
 * Get the escalation notice message for a given agent and language.
 * Supports language cascade fallback (e.g., fr-CA -> fr -> default).
 */
async function getEscalationNoticeMessage(
	agentId: string,
	requestedLang?: string,
): Promise<string> {
	const db = getDb();

	// Get interface settings for this agent
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) return DEFAULT_ESCALATION_NOTICE;

	let message = settings.escalationNoticeMessage || DEFAULT_ESCALATION_NOTICE;

	// If language requested, try to find translation
	if (requestedLang) {
		// Build cascade list: e.g., "fr-CA" -> ["fr-ca", "fr", defaultLanguage]
		const langCascade: string[] = [];
		const normalizedLang = requestedLang.toLowerCase();
		const baseLang = normalizedLang.split("-")[0];

		if (normalizedLang !== baseLang) {
			langCascade.push(normalizedLang);
		}
		langCascade.push(baseLang);

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
		for (const lang of langCascade) {
			const found = translations.find((t) => t.languageCode === lang);
			if (found?.escalationNoticeMessage) {
				message = found.escalationNoticeMessage;
				break;
			}
		}
	}

	return message;
}

const DEFAULT_RATE_LIMIT_NOTICE =
	"This conversation has reached its message limit. Please start a new conversation for further assistance.";

/**
 * Get the rate limit notice message for a given agent and language.
 * Used when a conversation hits the message limit but escalation is disabled.
 * Supports language cascade fallback (e.g., fr-CA -> fr -> default).
 */
async function getRateLimitNoticeMessage(agentId: string, requestedLang?: string): Promise<string> {
	const db = getDb();

	// Get interface settings for this agent
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, agentId));

	if (!settings) return DEFAULT_RATE_LIMIT_NOTICE;

	let message = settings.rateLimitNoticeMessage || DEFAULT_RATE_LIMIT_NOTICE;

	// If language requested, try to find translation
	if (requestedLang) {
		// Build cascade list: e.g., "fr-CA" -> ["fr-ca", "fr", defaultLanguage]
		const langCascade: string[] = [];
		const normalizedLang = requestedLang.toLowerCase();
		const baseLang = normalizedLang.split("-")[0];

		if (normalizedLang !== baseLang) {
			langCascade.push(normalizedLang);
		}
		langCascade.push(baseLang);

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
		for (const lang of langCascade) {
			const found = translations.find((t) => t.languageCode === lang);
			if (found?.rateLimitNoticeMessage) {
				message = found.rateLimitNoticeMessage;
				break;
			}
		}
	}

	return message;
}

function buildSystemPrompt(
	basePrompt: string,
	context: string[],
	tools: Tool[],
	userContext?: { userId?: string; userMetadata?: Record<string, unknown> },
	escalationEnabled?: boolean,
	escalationIntent?: string,
	productContext?: {
		currentProduct?: string;
		lastProductHandle?: string | null;
	},
	pageContext?: { pageUrl?: string | null; pagePath?: string | null },
): string {
	let prompt = basePrompt;

	// Add escalation-specific instructions based on intent ONLY if escalation is enabled
	if (escalationEnabled && escalationIntent) {
		switch (escalationIntent) {
			case "human_request":
				prompt += `\n\nIMPORTANT: The user has requested to speak with a human agent. Your response should warmly acknowledge their request and guide them to click the "Connect to an agent" button that appears below your message. Keep your response brief, friendly, and helpful.`;
				break;
			case "help_request":
				prompt += `\n\nNOTE: The user has indicated they need help. Be extra clear and thorough in your response. If your answer might not fully address their needs, mention that they can also connect with a human agent using the button available below your message.`;
				break;
			case "low_confidence":
				prompt += `\n\nNOTE: Your confidence in answering this question is low. Be transparent about any limitations or uncertainty in your response, and let the user know they can connect with a human agent using the button below your message for more detailed assistance.`;
				break;
		}
	}

	// Add user context for personalization (sanitized - no sensitive fields)
	if (userContext?.userId || userContext?.userMetadata) {
		const sanitizedMetadata = sanitizeUserMetadataForLLM(userContext.userMetadata);
		prompt += `\n\n## Current User`;
		if (userContext.userId) {
			prompt += `\nUser ID: ${userContext.userId}`;
		}
		if (sanitizedMetadata && Object.keys(sanitizedMetadata).length > 0) {
			prompt += `\nUser Info: ${JSON.stringify(sanitizedMetadata)}`;
		}
		prompt += `\n\nUse this information to personalize your responses when appropriate (e.g., address the user by name).`;
	}

	// Add product context for Shopify stores
	if (productContext?.currentProduct) {
		prompt += `\n\n## Current Product Being Viewed\nThe user is currently viewing the following product:\n\n${productContext.currentProduct}`;
		prompt += `\n\nUse this product information to answer questions about "this product", variants (colors/sizes available), pricing, and availability. This is the product the user is looking at right now. IMPORTANT: When asked about price, if there are multiple variants with different prices, state the full price range and list individual variant prices. Never quote only the highest or lowest price as "the" price.`;
	} else if (productContext?.lastProductHandle) {
		prompt += `\n\n## Last Discussed Product\nThe user was previously looking at a product (handle: ${productContext.lastProductHandle}). If they reference "that product" or "it" without viewing a current product, they likely mean this one.`;
	}

	// Add current page context so the AI knows what page the user is browsing
	if (pageContext?.pageUrl) {
		prompt += `\n\n## Current Page\nThe user is currently browsing: ${pageContext.pageUrl}`;
		prompt += `\nWhen the user refers to "this product", "this item", "this page", "this property", or similar contextual references, use the URL to understand what they are looking at. Extract relevant identifiers (IDs, slugs, names) from the URL path and use appropriate tools to retrieve information.`;
	}

	// Add current date/time so the AI can handle relative dates ("in a week", "tomorrow", etc.)
	const now = new Date();
	prompt += `\n\n## Current Date & Time\nToday is ${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}. The current time is ${now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" })}. Use this to calculate any relative dates (e.g., "in a week", "tomorrow", "next Monday").`;

	// Add markdown formatting instruction
	prompt += `

## Response Formatting
When responding, use markdown formatting:
- Use **bold** for emphasis
- Use \`inline code\` for short code snippets, commands, or technical terms
- Use fenced code blocks with language identifiers for code examples:
\`\`\`python
print("Hello, World!")
\`\`\`
- Use bullet points and numbered lists when appropriate`;

	// Add tool usage instructions if tools are available
	if (tools.length > 0) {
		const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join("\n");

		// Check if there are any form tools
		const hasFormTools = tools.some(
			(t) =>
				t.description?.toLowerCase().includes("form") ||
				t.name?.toLowerCase().includes("form") ||
				t.name?.toLowerCase().includes("contact"),
		);

		prompt += `

## Available Tools
You have access to the following tools. Use them when appropriate based on their descriptions:

${toolList}

CRITICAL TOOL USAGE RULES:
1. When a user's request matches a tool's description, you MUST call that tool. NEVER respond with plain text when a tool call is appropriate.
2. If the user asks to search, find, look up, show, list, or browse items and a matching tool exists, ALWAYS call the tool — do NOT attempt to answer from memory or prior context.
3. When calling a tool, extract and include ALL parameters the user mentioned or that can be inferred from the conversation, even if those parameters are optional in the schema.
4. Do NOT describe what a tool would return — actually call it. The user expects to see live results, not a text summary.
5. When in doubt about whether to call a tool, CALL IT. It is always better to call a tool and show real results than to respond with text.`;

		// Only add form-specific instructions if form tools exist
		if (hasFormTools) {
			prompt += `

CRITICAL - Form Tool Protocol:
When calling a form tool, do NOT write an introduction or explanation - just call the tool directly. The form will display its own intro text to the user. Your message before the form should be empty or minimal.`;
		}

		// Check if Shopify product search tool is available
		const hasProductSearchTool = tools.some((t) => t.name === "shopify_search_products");

		if (hasProductSearchTool) {
			prompt += `

PRODUCT DISPLAY GUIDANCE:
When users ask to see, browse, find, or compare multiple products, you MUST use the shopify_search_products tool. This displays products visually with images, prices, and add-to-cart buttons.

Examples that REQUIRE using the tool:
- "What snowboards do you have?"
- "Show me your products"
- "I'm looking for gifts under $50"
- "What else is available?"
- "Do you have any t-shirts?"

For single-product detail questions (e.g., "does this come in blue?", "what's the return policy for this item?"), you may answer from context without calling the tool.`;
		}

		// Add escalation guidance when enabled (always guide to button, not forms)
		if (escalationEnabled) {
			prompt += `

HUMAN SUPPORT: If a user asks to speak to a human, talk to someone, or requests human support, let them know they can click the "Connect to an agent" button that appears below messages to reach our support team. Do NOT promise to show a form - instead, guide them to use the escalation button.`;
		}
	} else {
		// No tools available
		if (escalationEnabled) {
			// Escalation is enabled - guide user to the button
			prompt += `

NOTE: You do not have access to tools. If a user asks to speak to a human or contact support, let them know they can click the "Connect to an agent" button that appears below messages to reach our support team.`;
		} else {
			// No tools and no escalation - be honest about limitations
			prompt += `

NOTE: You do not have access to any tools or forms. If a user asks to speak to a human or contact support, politely explain that you're an AI assistant and suggest they look for contact information on the website or try reaching out through other channels.`;
		}
	}

	// Add context if available
	if (context.length > 0) {
		prompt += `

Use the following knowledge base context to answer questions. Each section is labeled with its source.

<context>
${context.join("\n\n---\n\n")}
</context>

Answer based on the context when relevant. If the context doesn't contain relevant information, answer from your general knowledge. Do not mention the source labels to the user.`;
	}

	return prompt;
}

interface ChatBody extends ChatRequest {
	conversationId?: string;
	agentId: string; // Required - chat must be scoped to an agent
	// Custom overrides (when not using saved agent)
	customModel?: string;
	customTemp?: number;
	customPrompt?: string;
	// Widget branding validation
	footerMessage?: string | null;
	// Page tracking (where conversation started)
	pageUrl?: string;
	pageDomain?: string;
	pagePath?: string;
	// Channel tracking (widget, iframe, email, api, etc.)
	channel?: string;
	// User identity for personalized tool execution
	userId?: string;
	userMetadata?: Record<string, unknown>;
	// Language for localized messages (ISO 639-1 code)
	lang?: string;
	// Debug mode - includes tool URL, raw response, status code in SSE events (dashboard only)
	_debug?: boolean;
}

chat.post("/", async (c) => {
	const body = await c.req.json<ChatBody>();
	const {
		messages,
		conversationId,
		agentId,
		customModel,
		customTemp,
		customPrompt,
		channel,
		userId,
		userMetadata,
	} = body;

	if (!messages || !Array.isArray(messages) || messages.length === 0) {
		return c.json({ error: "messages array required" }, 400);
	}

	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	// Check security settings (rate limit and domain)
	const [security] = await db
		.select()
		.from(securitySettings)
		.where(eq(securitySettings.agentId, agentId));

	if (security) {
		// Check domain restriction
		const origin = c.req.header("origin") || c.req.header("referer");
		if (!checkDomainAllowed(origin || null, security.allowedDomains || [])) {
			return c.json({ error: "Domain not allowed", code: "DOMAIN_BLOCKED" }, 403);
		}

		// Check rate limit
		const clientIP =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
			c.req.header("x-real-ip") ||
			"unknown";
		const rateCheck = checkRateLimit(
			agentId,
			clientIP,
			security.messageLimit,
			security.messageLimitWindow,
		);
		if (!rateCheck.allowed) {
			return c.json(
				{
					error: `Rate limit exceeded. Try again in ${security.messageLimitWindow} seconds.`,
					code: "RATE_LIMITED",
				},
				429,
			);
		}
	}

	// Get latest user message for vector search
	const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
	if (!lastUserMessage) {
		return c.json({ error: "at least one user message required" }, 400);
	}

	// Determine model/temp/prompt: custom overrides > agent config > defaults
	let agentModel: string;
	let agentTemp: number;
	let basePrompt: string;

	// Fetch agent to get owner's userId for billing and branding check
	type AgentRow = typeof agents.$inferSelect;
	let agent: AgentRow | undefined;
	if (agentId) {
		[agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
	}
	if (!agent) {
		[agent] = await db.select().from(agents).where(eq(agents.isDefault, true)).limit(1);
	}

	// Check usage limits for agent owner (they pay for all widget/iframe usage)
	if (agent?.userId) {
		const canSend = await usageProvider.canSendMessage(agent.userId);
		if (!canSend.allowed) {
			return c.json({ error: canSend.reason, code: "LIMIT_REACHED" }, 403);
		}
	}

	// Get user subscription once for reuse throughout the request
	let subscription: typeof userSubscriptions.$inferSelect | undefined;
	if (agent?.userId) {
		[subscription] = await db
			.select()
			.from(userSubscriptions)
			.where(eq(userSubscriptions.userId, agent.userId))
			.limit(1);
	}

	// Validate branding for free users
	if (agent) {
		const agentOwnerPlan = subscription?.planId ?? "free";
		const allowBrandingRemoval = canRemoveBranding(agentOwnerPlan);

		if (!allowBrandingRemoval && body.footerMessage !== DEFAULT_FOOTER_MESSAGE) {
			return c.json(
				{
					error: "Ansa branding is required on the free plan. Please upgrade to remove branding.",
					code: "BRANDING_REQUIRED",
				},
				403,
			);
		}
	}

	// Track tier and upgrade info for cost tracking
	let selectedTier: AIQuality = AI_QUALITY_TIERS.BALANCED;
	let wasUpgraded = false;
	let originalTier: AIQuality | undefined;

	if (customModel || customTemp !== undefined || customPrompt) {
		// Use custom params
		// Check if customModel is a tier name, if so resolve it
		if (customModel && Object.values(AI_QUALITY_TIERS).includes(customModel as AIQuality)) {
			selectedTier = customModel as AIQuality;
			agentModel = resolveTierToModel(selectedTier);
		} else {
			agentModel = customModel || config.defaultModel;
			// For custom models that aren't tiers, use balanced as the tier for tracking
			selectedTier = AI_QUALITY_TIERS.BALANCED;
		}
		agentTemp = customTemp !== undefined ? customTemp / 100 : 0.5;
		basePrompt = customPrompt || "You are a helpful assistant.";
	} else {
		// Use agent config (already fetched above)
		agentTemp = agent ? agent.temperature / 100 : 0.5;
		// Resolve persona to system prompt
		basePrompt = agent
			? getPersonaSystemPrompt(agent.persona, agent.systemPrompt)
			: "You are a helpful assistant.";

		// Get agent's AI quality tier
		selectedTier = (agent?.aiQuality as AIQuality) || AI_QUALITY_TIERS.BALANCED;
		originalTier = selectedTier;

		// Note: Auto-upgrade logic prepared but not yet implemented
		// TODO: Implement confidence-based upgrade after confidence calculation
		// Will check if confidence < 0.7 and upgrade BALANCED -> HIGH_QUALITY if plan allows

		// Resolve tier to actual model
		agentModel = resolveTierToModel(selectedTier);
	}

	// Search vector DB for relevant context (scoped to agent)
	const { results: searchResults, meta: searchMeta } = await vectorClient.search(
		lastUserMessage.content,
		agentId,
	);

	// Build context with source attribution for better grounding
	const contextDocs = searchResults.map((r) => {
		const label = r.sourceTitle ? `[Source: ${r.sourceTitle}]` : `[Source: ${r.sourceType}]`;
		return `${label}\n${r.content}`;
	});

	// Calculate confidence score from top RAG matches (0-100 scale)
	// Use weighted average of top-3 scores for stability instead of max-only
	let confidenceScore: number | null = null;
	if (searchResults.length > 0) {
		const topScores = searchResults.slice(0, 3).map((r) => r.score);
		// Weight: best=3x, second=2x, third=1x
		const weights = [3, 2, 1];
		let weightedSum = 0;
		let totalWeight = 0;
		for (let i = 0; i < topScores.length; i++) {
			weightedSum += topScores[i] * weights[i];
			totalWeight += weights[i];
		}
		confidenceScore = Math.round((weightedSum / totalWeight) * 100);
	}

	// Detect escalation intent and boost confidence
	let escalationIntent: string | undefined;
	const userMessage = lastUserMessage.content;

	if (detectHumanRequest(userMessage)) {
		escalationIntent = "human_request";
		confidenceScore = 95; // High confidence - clear user intent
	} else if (detectHelpRequest(userMessage)) {
		escalationIntent = "help_request";
		confidenceScore = 90; // Good confidence - user needs assistance
	} else if (confidenceScore !== null && confidenceScore < 50) {
		escalationIntent = "low_confidence";
		// Keep original low confidence score
	}

	// Auto-upgrade logic: Upgrade to HIGH_QUALITY if conditions are met
	// Skip auto-upgrade when the agent has tools — low RAG confidence is expected
	// for tool-calling queries that don't need knowledge base matches
	const agentHasTools =
		agent &&
		(await db
			.select({ id: agentTools.id })
			.from(agentTools)
			.where(and(eq(agentTools.agentId, agentId), eq(agentTools.isEnabled, true)))
			.limit(1)
			.then((r) => r.length > 0));

	if (
		!customModel &&
		agent &&
		!agentHasTools &&
		selectedTier === AI_QUALITY_TIERS.BALANCED &&
		((confidenceScore !== null && confidenceScore < 50) || escalationIntent !== undefined)
	) {
		// Check if plan allows HIGH_QUALITY tier
		if (agent.userId) {
			const planId = subscription?.planId ?? "free";
			const availableTiers = getAvailableAIQuality(planId);
			if (availableTiers.includes(AI_QUALITY_TIERS.HIGH_QUALITY)) {
				// Upgrade to HIGH_QUALITY
				originalTier = selectedTier;
				selectedTier = AI_QUALITY_TIERS.HIGH_QUALITY;
				agentModel = resolveTierToModel(selectedTier);
				wasUpgraded = true;
				console.log(
					`[chat] Auto-upgraded from ${originalTier} to ${selectedTier} for agent ${agentId} (confidence: ${confidenceScore}, escalationIntent: ${escalationIntent})`,
				);
			}
		}
	}

	// Add Shopify context if agent is linked to a shop
	const shopifyContext = await getShopifyContext(agentId);
	if (shopifyContext) {
		contextDocs.push(shopifyContext);
	}

	// Fetch Shopify shop domain for this agent (if linked to a shop)
	let shopifyShopDomain: string | null = null;
	let shopifyCurrency = "USD";

	if (shopifyContext) {
		const [shopAgentConfig] = await db
			.select({
				shopDomain: shopifyShops.shopDomain,
				currency: shopifyShops.currency,
			})
			.from(shopifyShopAgents)
			.innerJoin(shopifyShops, eq(shopifyShopAgents.shopId, shopifyShops.id))
			.where(eq(shopifyShopAgents.agentId, agentId))
			.limit(1);

		if (shopAgentConfig) {
			shopifyShopDomain = shopAgentConfig.shopDomain;
			shopifyCurrency = shopAgentConfig.currency || "USD";
		}
	}

	// Check for product context from URL (Shopify integration)
	let currentProductContext: string | undefined;
	let lastProductHandle: string | null = null;

	// Get existing conversation to access lastProductHandle, pageUrl, and aiResponseCount
	let currentAiResponseCount = 0;
	let resolvedPageUrl: string | null = body.pageUrl || null;
	let resolvedPagePath: string | null = body.pagePath || null;
	if (conversationId) {
		const [existingConvo] = await db
			.select({
				lastProductHandle: conversations.lastProductHandle,
				pageUrl: conversations.pageUrl,
				pagePath: conversations.pagePath,
				aiResponseCount: conversations.aiResponseCount,
			})
			.from(conversations)
			.where(eq(conversations.id, conversationId))
			.limit(1);

		if (existingConvo) {
			lastProductHandle = existingConvo.lastProductHandle;
			currentAiResponseCount = existingConvo.aiResponseCount || 0;
			resolvedPageUrl = resolvedPageUrl || existingConvo.pageUrl;
			resolvedPagePath = resolvedPagePath || existingConvo.pagePath;

			// Try to extract product from current page URL
			const currentPageUrl = body.pageUrl || existingConvo.pageUrl;
			if (currentPageUrl) {
				const productHandle = extractShopifyProductHandle(currentPageUrl);
				if (productHandle) {
					// Fetch product details from database
					const [product] = await db
						.select()
						.from(shopifyProducts)
						.innerJoin(shopifyShopAgents, eq(shopifyProducts.shopId, shopifyShopAgents.shopId))
						.where(
							and(
								eq(shopifyShopAgents.agentId, agentId),
								eq(shopifyProducts.handle, productHandle),
							),
						)
						.limit(1);

					if (product?.shopify_products) {
						currentProductContext = formatProductContext(product.shopify_products, shopifyCurrency);
						lastProductHandle = productHandle; // Update for conversation memory
					}
				}
			}
		}
	} else if (body.pageUrl) {
		// New conversation - try to extract product from URL
		const productHandle = extractShopifyProductHandle(body.pageUrl);
		if (productHandle) {
			const [product] = await db
				.select()
				.from(shopifyProducts)
				.innerJoin(shopifyShopAgents, eq(shopifyProducts.shopId, shopifyShopAgents.shopId))
				.where(
					and(eq(shopifyShopAgents.agentId, agentId), eq(shopifyProducts.handle, productHandle)),
				)
				.limit(1);

			if (product?.shopify_products) {
				currentProductContext = formatProductContext(product.shopify_products, shopifyCurrency);
				lastProductHandle = productHandle;
			}
		}
	}

	// Check if escalation is enabled for this agent and get confidence settings
	const [escalationSettings] = await db
		.select({
			enabled: agentEscalationSettings.enabled,
			confidenceThreshold: agentEscalationSettings.confidenceThreshold,
			widgetConfidenceThreshold: agentEscalationSettings.widgetConfidenceThreshold,
			widgetLowConfidenceAction: agentEscalationSettings.widgetLowConfidenceAction,
			showButtonsAfter: agentEscalationSettings.showButtonsAfter,
		})
		.from(agentEscalationSettings)
		.where(eq(agentEscalationSettings.agentId, agentId))
		.limit(1);
	const escalationEnabled = escalationSettings?.enabled ?? false;

	// Get tools for this agent (exclude human_handoff_form if escalation is enabled)
	const tools = await getAgentTools(agentId, escalationEnabled);

	// Downgrade HIGH_QUALITY → BALANCED when agent has tools.
	// Tool-calling (pick a tool, fill JSON params, summarize result) is a structured
	// task that BALANCED handles just as well — save the expensive model for pure Q&A.
	if (!customModel && tools.length > 0 && selectedTier === AI_QUALITY_TIERS.HIGH_QUALITY) {
		originalTier = selectedTier;
		selectedTier = AI_QUALITY_TIERS.BALANCED;
		agentModel = resolveTierToModel(selectedTier);
	}

	const confidenceThreshold =
		escalationSettings?.widgetConfidenceThreshold ?? escalationSettings?.confidenceThreshold ?? 50;
	const widgetLowConfidenceAction = (escalationSettings?.widgetLowConfidenceAction ?? "respond") as
		| "respond"
		| "escalate";

	// Build user context for personalization (sanitized for LLM)
	const userContextForPrompt = userId || userMetadata ? { userId, userMetadata } : undefined;

	// Build product context for system prompt
	const productContext =
		currentProductContext || lastProductHandle
			? { currentProduct: currentProductContext, lastProductHandle }
			: undefined;

	// Build page context for system prompt
	const pageContext = resolvedPageUrl
		? { pageUrl: resolvedPageUrl, pagePath: resolvedPagePath }
		: undefined;

	const systemPrompt = buildSystemPrompt(
		basePrompt,
		contextDocs,
		tools,
		userContextForPrompt,
		escalationEnabled,
		escalationIntent,
		productContext,
		pageContext,
	);

	// Convert messages to Anthropic format
	const anthropicMessages = messages.map((m: ChatMessage) => ({
		role: m.role as "user" | "assistant",
		content: m.content,
	}));

	// Create or get conversation for logging
	let convoId = conversationId;

	if (!convoId) {
		// Create new conversation with first user message as title
		const title = lastUserMessage.content.slice(0, 100);
		// Get country code from Cloudflare header
		const countryCode = c.req.header("cf-ipcountry") || null;
		// Language will be detected after first AI response for better accuracy
		const language = null;

		const conversationData = {
			agentId,
			title,
			countryCode,
			language,
			pageUrl: body.pageUrl || null,
			pageDomain: body.pageDomain || null,
			pagePath: body.pagePath || null,
			lastProductHandle: lastProductHandle || null,
			channel: body.channel || "widget",
			visitorId: userId || null,
			userMetadata: userMetadata || null,
		};

		// Debug: Log any undefined values
		const undefinedFields = Object.entries(conversationData)
			.filter(([_, value]) => value === undefined)
			.map(([key]) => key);
		if (undefinedFields.length > 0) {
			console.error(
				`[chat] ERROR: Undefined fields in conversation insert: ${undefinedFields.join(", ")}`,
			);
			console.error("[chat] Conversation data:", JSON.stringify(conversationData, null, 2));
		}

		const [newConvo] = await db.insert(conversations).values(conversationData).returning();
		convoId = newConvo.id;
	} else if (userId || userMetadata) {
		// Update existing conversation with user info if not already set
		const [existing] = await db
			.select({ visitorId: conversations.visitorId, userMetadata: conversations.userMetadata })
			.from(conversations)
			.where(eq(conversations.id, convoId))
			.limit(1);

		if (existing && (!existing.visitorId || !existing.userMetadata)) {
			const updateData = {
				visitorId: existing.visitorId || userId || null,
				userMetadata: existing.userMetadata || userMetadata || null,
				updatedAt: new Date(),
			};

			// Debug: Log any undefined values
			const undefinedFields = Object.entries(updateData)
				.filter(([_, value]) => value === undefined)
				.map(([key]) => key);
			if (undefinedFields.length > 0) {
				console.error(
					`[chat] ERROR: Undefined fields in conversation update: ${undefinedFields.join(", ")}`,
				);
				console.error("[chat] Update data:", JSON.stringify(updateData, null, 2));
				console.error("[chat] existing:", JSON.stringify(existing, null, 2));
				console.error("[chat] userId:", userId);
				console.error("[chat] userMetadata:", userMetadata);
			}

			await db.update(conversations).set(updateData).where(eq(conversations.id, convoId));
		}
	}

	// Check if conversation has an active escalation - if so, save message but skip AI response
	const [activeEscalation] = await db
		.select({ id: escalations.id, status: escalations.status })
		.from(escalations)
		.where(
			and(
				eq(escalations.conversationId, convoId),
				inArray(escalations.status, ["open", "assigned", "in_progress", "waiting_on_customer"]),
			),
		)
		.limit(1);

	// Update lastActivityAt and status for auto-close timing
	// When customer sends a message, change status from "pending", "resolved", or "closed" to "open"
	// Also update lastProductHandle if a product was detected on this message
	const conversationUpdate: {
		lastActivityAt: Date;
		status: ReturnType<typeof sql>;
		lastProductHandle?: string | null;
	} = {
		lastActivityAt: new Date(),
		status: sql`CASE WHEN ${conversations.status} IN ('pending', 'resolved', 'closed') THEN 'open' ELSE ${conversations.status} END`,
	};

	// Update lastProductHandle if product detected (engagement-based update)
	if (lastProductHandle !== null) {
		conversationUpdate.lastProductHandle = lastProductHandle;
	}

	await db.update(conversations).set(conversationUpdate).where(eq(conversations.id, convoId));

	// If escalation was waiting on customer, transition back to in_progress
	if (activeEscalation && activeEscalation.status === "waiting_on_customer") {
		await db
			.update(escalations)
			.set({
				status: "in_progress",
				updatedAt: new Date(),
			})
			.where(eq(escalations.id, activeEscalation.id));
	}

	// Generate embedding for user message (for semantic clustering)
	let userEmbedding: number[] | null = null;
	try {
		userEmbedding = await createQueryEmbedding(lastUserMessage.content);
	} catch (error) {
		console.error("[chat] Failed to generate embedding:", error);
		// Continue without embedding
	}

	// Save user message with embedding (always save, even if escalated)
	const [savedUserMessage] = await db
		.insert(chatMessages)
		.values({
			conversationId: convoId,
			role: "user",
			content: lastUserMessage.content,
			embedding: userEmbedding || null,
		})
		.returning();

	// If escalated, return success without AI response - human agent will respond
	if (activeEscalation) {
		return c.json({
			success: true,
			conversationId: convoId,
			escalated: true,
		});
	}

	// If already rate-limited (re-visit) and no active escalation, block further messages
	if (
		!activeEscalation &&
		currentAiResponseCount >= CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES &&
		!escalationEnabled
	) {
		return c.json({
			success: true,
			conversationId: convoId,
			escalated: false,
			rateLimited: true,
		});
	}

	// Check rate limit - if conversation has reached limit, auto-escalate or stop AI responses
	if (currentAiResponseCount >= CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES) {
		console.log(
			`[chat] Conversation ${convoId} reached rate limit (${currentAiResponseCount}/${CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES}) - escalation ${escalationEnabled ? "enabled" : "disabled"}`,
		);

		if (escalationEnabled) {
			// Escalation is enabled - escalate to human agent
			const escalationNotice = await getEscalationNoticeMessage(agentId, body.lang);

			// Add system message about rate limit escalation
			const systemMessageId = crypto.randomUUID();
			await db.insert(chatMessages).values({
				id: systemMessageId,
				conversationId: convoId,
				role: "assistant",
				content: "⚠️ Conversation automatically escalated after 50 AI responses",
				metadata: { messageType: "system", reason: "rate_limit" },
			});

			// Save escalation notice message (user-visible)
			const escalationMessageId = crypto.randomUUID();
			await db.insert(chatMessages).values({
				id: escalationMessageId,
				conversationId: convoId,
				role: "assistant",
				content: escalationNotice,
				metadata: { messageType: "escalation_notice" },
			});

			// Create escalation record with auto_rate_limit source
			await db.insert(escalations).values({
				conversationId: convoId,
				agentId,
				escalationSource: "auto_rate_limit",
				priority: "medium",
				status: "open",
			});

			// Update conversation state
			await db
				.update(conversations)
				.set({
					updatedAt: new Date(),
					lastActivityAt: new Date(),
					needsAttention: true,
					resolution: null,
				})
				.where(eq(conversations.id, convoId));

			// Track usage for billing (agent owner pays)
			if (agent?.userId) {
				await usageProvider.trackMessage(agent.userId, {
					conversationId: convoId,
					model: agentModel,
					channel: body.channel || "widget",
				});
			}

			return c.json({
				success: true,
				conversationId: convoId,
				escalated: true,
				rateLimitReached: true,
				message: escalationNotice,
				messageId: escalationMessageId,
			});
		}

		// Escalation is disabled - stop AI responses without creating an escalation
		const rateLimitNotice = await getRateLimitNoticeMessage(agentId, body.lang);

		// Add system message about rate limit
		const systemMessageId = crypto.randomUUID();
		await db.insert(chatMessages).values({
			id: systemMessageId,
			conversationId: convoId,
			role: "assistant",
			content: "⚠️ Conversation reached message limit (AI responses stopped)",
			metadata: { messageType: "system", reason: "rate_limit" },
		});

		// Save rate limit notice message (user-visible)
		const rateLimitMessageId = crypto.randomUUID();
		await db.insert(chatMessages).values({
			id: rateLimitMessageId,
			conversationId: convoId,
			role: "assistant",
			content: rateLimitNotice,
			metadata: { messageType: "rate_limit_notice" },
		});

		// Update conversation state - mark as closed since no one will respond
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
				lastActivityAt: new Date(),
				status: "closed",
				resolution: "ai_handled",
			})
			.where(eq(conversations.id, convoId));

		// Track usage for billing (agent owner pays)
		if (agent?.userId) {
			await usageProvider.trackMessage(agent.userId, {
				conversationId: convoId,
				model: agentModel,
				channel: body.channel || "widget",
			});
		}

		return c.json({
			success: true,
			conversationId: convoId,
			escalated: false,
			rateLimited: true,
			message: rateLimitNotice,
			messageId: rateLimitMessageId,
		});
	}

	// Check if approaching rate limit (warning threshold)
	const isApproachingLimit =
		currentAiResponseCount >= CONVERSATION_RATE_LIMITS.WARNING_THRESHOLD &&
		currentAiResponseCount < CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES;

	if (isApproachingLimit) {
		console.log(
			`[chat] Conversation ${convoId} approaching rate limit (${currentAiResponseCount}/${CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES})`,
		);
	}

	// Create turn record
	const hasKbContext = searchResults.length > 0;

	let turn: any;
	try {
		const turnData = {
			conversationId: convoId,
			agentId,
			userMessageId: savedUserMessage.id,
			hasKbContext,
			escalationIntent: escalationIntent || null,
			status: "in_progress" as const,
		};

		[turn] = await db.insert(turns).values(turnData).returning();
	} catch (error) {
		console.error("[chat] CRITICAL ERROR in turns insert:");
		console.error("[chat] Error:", error);
		console.error("[chat] convoId:", convoId);
		console.error("[chat] agentId:", agentId);
		console.error("[chat] savedUserMessage:", savedUserMessage);
		console.error("[chat] hasKbContext:", hasKbContext);
		console.error("[chat] escalationIntent:", escalationIntent);
		throw error;
	}

	// Check confidence BEFORE streaming - if low confidence + escalate action, handle without streaming
	const isLowConfidence = confidenceScore !== null && confidenceScore < confidenceThreshold;

	// Count user messages in this conversation to prevent early escalation
	const [messageCount] = await db
		.select({ count: sql<number>`count(*)` })
		.from(chatMessages)
		.where(and(eq(chatMessages.conversationId, convoId), eq(chatMessages.role, "user")));

	const userMessageCount = Number(messageCount?.count) || 0;
	const messageWordCount = lastUserMessage.content.trim().split(/\s+/).length;

	// Don't auto-escalate on low confidence if:
	// 1. Fewer than 3 user messages (still warming up the conversation)
	// 2. Message is very short (< 3 words) - likely just greetings/acknowledgments
	const shouldPreventAutoEscalation = userMessageCount < 3 || messageWordCount < 3;

	// Escalate if:
	// - Low confidence AND escalate action enabled AND not prevented by rules above, OR
	// - Explicit human request (always escalate regardless of message count/length)
	const shouldEscalate =
		(isLowConfidence &&
			widgetLowConfidenceAction === "escalate" &&
			escalationEnabled &&
			!shouldPreventAutoEscalation) ||
		(escalationIntent === "human_request" && escalationEnabled);

	if (shouldEscalate) {
		// Get localized escalation notice message
		const escalationNotice = await getEscalationNoticeMessage(agentId, body.lang);
		// Generate AI response without streaming (for "AI Suggested Response" in dashboard)
		let aiResponse = "";
		try {
			await streamChat(
				{
					model: agentModel,
					maxTokens: 4096,
					temperature: agentTemp,
					system: systemPrompt,
					messages: anthropicMessages,
					tools: tools.length > 0 ? tools : undefined,
				},
				async (event) => {
					if (event.type === "text_delta" && event.text) {
						aiResponse += event.text;
					}
					// Skip tool execution for escalated responses
				},
			);
		} catch (error) {
			console.error("[chat] Failed to generate AI suggested response:", error);
			aiResponse = "Failed to generate AI response.";
		}

		// Save AI response with isSent: false (for "AI Suggested Response" in dashboard)
		const assistantMessageData = {
			conversationId: convoId,
			role: "assistant" as const,
			content: aiResponse,
			confidenceScore: confidenceScore ?? null,
			isSent: false,
		};

		const [assistantMessage] = await db
			.insert(chatMessages)
			.values(assistantMessageData)
			.returning();

		// Save retrieval trace with source attribution
		const retrievedChunks = searchResults.map((r) => ({
			sourceId: r.sourceId || r.id,
			chunkId: r.id,
			score: r.score,
			sourceType: r.sourceType || "unknown",
			title: r.sourceTitle,
		}));

		const traceData = {
			turnId: turn.id,
			assistantMessageId: assistantMessage.id,
			confidenceScore,
			retrievalMode: searchResults.length > 0 ? "kb" : "none",
			topK: searchResults.length,
			sourcesUsedCount: new Set(searchResults.map((r) => r.sourceId || r.id)).size,
			noContextReason: searchResults.length === 0 ? "no_results" : null,
			retrievedChunks,
			retrievalLatencyMs: searchMeta.latencyMs,
			candidateCount: searchMeta.candidateCount,
		};

		const [trace] = await db.insert(retrievalTraces).values(traceData).returning();

		// Save KB sources for analytics
		if (searchResults.length > 0) {
			await db.insert(kbRetrievalSources).values(
				searchResults.map((r) => ({
					traceId: trace.id,
					sourceId: r.sourceId || r.id,
					chunkId: r.id,
					score: Math.round(r.score * 100),
				})),
			);
		}

		// Record turn event for assistant message
		await db.insert(turnEvents).values({
			turnId: turn.id,
			eventType: "assistant_message",
			eventId: assistantMessage.id,
		});

		// Mark turn as completed
		await db
			.update(turns)
			.set({
				status: "completed",
				completedAt: new Date(),
			})
			.where(eq(turns.id, turn.id));

		// Save escalation notice message (user-visible, persists after refresh)
		const escalationMessageId = crypto.randomUUID();
		const escalationMessageData = {
			id: escalationMessageId,
			conversationId: convoId,
			role: "assistant" as const,
			content: escalationNotice,
			metadata: { messageType: "escalation_notice" },
		};

		await db.insert(chatMessages).values(escalationMessageData);

		// Create escalation record
		const escalationData = {
			conversationId: convoId,
			agentId,
			escalationSource: "low_confidence" as const,
			priority: "medium" as const,
			status: "open" as const,
		};

		await db.insert(escalations).values(escalationData);

		// Update conversation state
		await db
			.update(conversations)
			.set({
				updatedAt: new Date(),
				lastActivityAt: new Date(),
				needsAttention: false,
				resolution: null,
				aiResponseCount: sql`${conversations.aiResponseCount} + 1`,
			})
			.where(eq(conversations.id, convoId));

		// Track usage for billing (agent owner pays even for escalated messages)
		if (agent?.userId) {
			await usageProvider.trackMessage(agent.userId, {
				conversationId: convoId,
				model: agentModel,
				channel: body.channel || "widget",
			});
		}

		// Return JSON response (not streaming)
		return c.json({
			success: true,
			conversationId: convoId,
			escalated: true,
			lowConfidence: true,
			confidenceScore,
			message: escalationNotice,
			messageId: escalationMessageId,
		});
	}

	return streamSSE(c, async (stream) => {
		const messageId = crypto.randomUUID();
		let fullResponse = "";

		// Insert placeholder message immediately so feedback can work during streaming
		await db.insert(chatMessages).values({
			id: messageId,
			conversationId: convoId,
			role: "assistant",
			content: "",
		});

		// ChatKit protocol: message_start (SSE only)
		const messageStartData = {
			type: "message_start",
			message: { id: messageId, role: "assistant" },
		};
		await stream.writeSSE({
			event: "message_start",
			data: JSON.stringify(messageStartData),
		});

		// ChatKit protocol: content_block_start (SSE only)
		const blockStartData = {
			type: "content_block_start",
			index: 0,
			content_block: { type: "text", text: "" },
		};
		await stream.writeSSE({
			event: "content_block_start",
			data: JSON.stringify(blockStartData),
		});

		let finalUsage = { inputTokens: 0, outputTokens: 0 };

		// Track tool use for follow-up call
		let usedToolName: string | null = null;
		let toolResult: string | null = null;
		let usedToolDisplayConfig: DisplayConfig | null = null;

		// Collect tool blocks for storage
		const collectedToolBlocks: ToolBlockData[] = [];

		// Maximum number of chained tool calls (e.g. geocode → search)
		const MAX_TOOL_ROUNDS = 5;

		// Helper to handle a tool_use event (shared between initial and follow-up calls)
		const isDebugMode = body._debug === true && channel === "dashboard";

		const handleToolUse = async (event: {
			toolUse: { id: string; name: string; input: unknown };
		}) => {
			const userContext = userId || userMetadata ? { userId, userMetadata } : undefined;
			const toolExecResult = await executeTool(
				{
					id: event.toolUse.id,
					name: event.toolUse.name,
					input: event.toolUse.input as Record<string, unknown>,
				},
				agentId,
				userContext,
			);
			const {
				result,
				displayConfig,
				debugInfo,
				isFormTool,
				toolId,
				formSchema,
				formExecutionMode,
				formClientHandler,
				formPostActions,
				toolArgs,
			} = toolExecResult;

			// Detect if tool result is an error
			let toolIsError = false;
			let toolErrorMessage: string | undefined;
			try {
				const errCheck = JSON.parse(result);
				if (errCheck && typeof errCheck === "object" && errCheck.error) {
					toolIsError = true;
					toolErrorMessage =
						typeof errCheck.error === "string" ? errCheck.error : JSON.stringify(errCheck.error);
				}
			} catch {
				// not JSON, not an error
			}

			// Store for follow-up call (but not for form tools - they handle their own follow-up)
			if (!isFormTool) {
				usedToolName = event.toolUse.name;
				toolResult = result;
				usedToolDisplayConfig = displayConfig as DisplayConfig | null;

				// If the tool errored, always collect an error block so the UI can show it
				if (toolIsError) {
					collectedToolBlocks.push({
						type: "tool_result",
						toolName: event.toolUse.name,
						result: { error: toolErrorMessage },
						displayConfig: displayConfig || { type: "text" },
						isError: true,
						errorMessage: toolErrorMessage,
					});
				}

				// Check if result contains product data (for Shopify display config)
				let finalDisplayConfig = displayConfig;
				const parsedResult = JSON.parse(result);

				// Detect product-like results and enhance display config with shopDomain for viewMoreUrl
				if (shopifyShopDomain && displayConfig) {
					const isProductResult =
						(Array.isArray(parsedResult) &&
							parsedResult.length > 0 &&
							(parsedResult[0].title || parsedResult[0].price || parsedResult[0].image)) ||
						(parsedResult.products && Array.isArray(parsedResult.products)) ||
						(parsedResult.items && Array.isArray(parsedResult.items)) ||
						(parsedResult.title && (parsedResult.price || parsedResult.image));

					if (isProductResult) {
						// Add viewMoreUrl to display config if not already set
						finalDisplayConfig = {
							...displayConfig,
							options: {
								...displayConfig.options,
								viewMoreUrl:
									displayConfig.options?.viewMoreUrl ||
									`https://${shopifyShopDomain}/collections/all`,
							},
						};
					}
				}

				// Collect tool block if it has a rich display config
				if (finalDisplayConfig && finalDisplayConfig.type !== "text") {
					collectedToolBlocks.push({
						type: "tool_result",
						toolName: event.toolUse.name,
						result: parsedResult,
						displayConfig: finalDisplayConfig,
					});
				}
			} else {
				// Collect form tool blocks so they appear in conversation history
				collectedToolBlocks.push({
					type: "tool_result",
					toolName: event.toolUse.name,
					result: {
						formSchema,
						formExecutionMode,
						formClientHandler,
						formPostActions,
						toolArgs,
						toolId,
					},
					displayConfig: displayConfig || { type: "form" },
				});
			}

			// Stream tool use info to client (for debugging/UI indicators)
			// Get the final display config from the collected block (for products) or use original
			const streamDisplayConfig =
				!isFormTool && collectedToolBlocks.length > 0
					? collectedToolBlocks[collectedToolBlocks.length - 1].displayConfig
					: displayConfig || { type: isFormTool ? "form" : "text" };

			const toolUseData = {
				type: "tool_use",
				tool: event.toolUse.name,
				input: event.toolUse.input,
				// Trim large results for SSE — the widget only displays limited items
				result: trimResultForSSE(JSON.parse(result), streamDisplayConfig),
				displayConfig: streamDisplayConfig,
				// Error flag for tool failures
				...(toolIsError && {
					isError: true,
					errorMessage: toolErrorMessage,
				}),
				// Debug info (only when _debug is enabled from dashboard /chat)
				...(isDebugMode && debugInfo && { debugInfo }),
				// Form-specific fields
				...(isFormTool && {
					isFormTool: true,
					toolId,
					formSchema,
					formExecutionMode,
					formClientHandler,
					formPostActions,
					toolArgs, // AI-generated args for client-side schema function
				}),
			};
			await stream.writeSSE({
				event: "tool_use",
				data: JSON.stringify(toolUseData),
			});
		};

		try {
			await streamChat(
				{
					model: agentModel,
					maxTokens: 4096,
					temperature: agentTemp,
					system: systemPrompt,
					messages: anthropicMessages,
					tools: tools.length > 0 ? tools : undefined,
				},
				async (event) => {
					if (event.type === "text_delta" && event.text) {
						fullResponse += event.text;
						// ChatKit protocol: content_block_delta (SSE only)
						const deltaData = {
							type: "content_block_delta",
							index: 0,
							delta: { type: "text_delta", text: event.text },
						};
						await stream.writeSSE({
							event: "content_block_delta",
							data: JSON.stringify(deltaData),
						});
					} else if (event.type === "tool_use" && event.toolUse) {
						await handleToolUse(event as { toolUse: { id: string; name: string; input: unknown } });
					} else if (event.type === "done" && event.usage) {
						finalUsage = event.usage;
					} else if (event.type === "error") {
						throw new Error(event.error);
					}
				},
			);

			// Save the initial call's usage before the tool loop may accumulate more
			const initialUsage = {
				inputTokens: finalUsage.inputTokens,
				outputTokens: finalUsage.outputTokens,
			};

			// If a tool was used, make follow-up calls with the result.
			// Supports multi-round tool chaining (e.g. geocode → search) up to MAX_TOOL_ROUNDS.
			const shouldSkipFollowUp =
				(usedToolDisplayConfig as DisplayConfig | null)?.skipFollowUp === true;

			let toolRound = 0;
			while (usedToolName && toolResult && !shouldSkipFollowUp && toolRound < MAX_TOOL_ROUNDS) {
				toolRound++;

				// Check if the result is empty (no products, empty array, etc.)
				let isEmptyResult = false;
				try {
					const parsedToolResult = JSON.parse(toolResult);
					if (parsedToolResult && typeof parsedToolResult === "object") {
						const obj = parsedToolResult as Record<string, unknown>;
						isEmptyResult =
							(Array.isArray(obj.products) && obj.products.length === 0) ||
							(Array.isArray(obj.items) && obj.items.length === 0) ||
							(Array.isArray(obj.data) && obj.data.length === 0) ||
							obj.count === 0 ||
							(Array.isArray(parsedToolResult) && (parsedToolResult as unknown[]).length === 0);
					}
				} catch {
					// If parsing fails, treat as non-empty
				}

				// Check if the tool result was an error
				let isToolError = false;
				try {
					const errCheck = JSON.parse(toolResult);
					if (errCheck && typeof errCheck === "object" && errCheck.error) {
						isToolError = true;
					}
				} catch {
					// not JSON
				}

				// Check if the tool result will already be shown via a rich display block (carousel, table, grid, etc.)
				const hasRichDisplay =
					usedToolDisplayConfig &&
					(usedToolDisplayConfig as DisplayConfig | null)?.type &&
					(usedToolDisplayConfig as DisplayConfig | null)?.type !== "text";

				// Summarize the tool result for the LLM to reduce token usage.
				// The full result is already streamed to the UI via SSE — the LLM
				// only needs enough context to write a natural response.
				const summarizedResult = summarizeToolResultForLLM(
					toolResult,
					usedToolDisplayConfig as {
						dataPath?: string;
						fieldMappings?: Record<string, string>;
						options?: { maxItems?: number };
					} | null,
				);

				const followUpInstruction = isToolError
					? `The tool "${usedToolName}" encountered an error: ${toolResult}\n\nApologize to the user and let them know this feature is temporarily unavailable. Do not expose technical error details. Suggest they try again later or contact support if the issue persists.`
					: isEmptyResult
						? `Tool result: ${toolResult}\n\nThe search returned no results. Respond naturally to let the user know you couldn't find what they were looking for. Suggest alternatives if possible (e.g., different search terms, browsing categories, or contacting support). Do not say "Here's what I found" or similar phrases when there are no results.`
						: hasRichDisplay
							? `Tool result from "${usedToolName}" (${summarizedResult})\n\nIMPORTANT: The results are ALREADY being displayed to the user visually (as a rich interactive component like a slideshow, carousel, table, or grid). Do NOT list, repeat, or summarize individual items from the results in your text response. Instead, write a brief natural sentence acknowledging the results (e.g., "I found X properties in Miami for your dates" or "Here are the available options"). Keep it short — the user can see the details in the visual display. If you need to call another tool to fully answer the user's question, do so now.`
							: `Tool result from "${usedToolName}": ${summarizedResult}\n\nIf you need to call another tool to fully answer the user's question, do so now. Otherwise, respond naturally to the user based on this result. Do not mention that you used a tool.`;

				const followUpMessages = [
					...anthropicMessages,
					{
						role: "assistant" as const,
						content: fullResponse || `Using ${usedToolName}...`,
					},
					{
						role: "user" as const,
						content: followUpInstruction,
					},
				];

				// Clear for this round
				fullResponse = "";
				usedToolName = null;
				toolResult = null;

				let roundRequestedTool = false;
				const roundUsage = { inputTokens: 0, outputTokens: 0 };

				// Tell client to clear accumulated text from previous rounds
				// so only the final round's response is displayed
				await stream.writeSSE({
					event: "content_clear",
					data: JSON.stringify({ type: "content_clear" }),
				});

				await streamChat(
					{
						model: agentModel,
						maxTokens: 4096,
						temperature: agentTemp,
						system: systemPrompt,
						messages: followUpMessages,
						// Pass tools so the LLM can chain calls (e.g. geocode result → search)
						// Don't pass tools on error rounds or if no tools available
						tools: !isToolError && tools.length > 0 ? tools : undefined,
					},
					async (event) => {
						if (event.type === "text_delta" && event.text) {
							fullResponse += event.text;
							const deltaData = {
								type: "content_block_delta",
								index: 0,
								delta: { type: "text_delta", text: event.text },
							};
							await stream.writeSSE({
								event: "content_block_delta",
								data: JSON.stringify(deltaData),
							});
						} else if (event.type === "tool_use" && event.toolUse) {
							roundRequestedTool = true;
							await handleToolUse(
								event as { toolUse: { id: string; name: string; input: unknown } },
							);
						} else if (event.type === "done" && event.usage) {
							roundUsage.inputTokens = event.usage.inputTokens;
							roundUsage.outputTokens = event.usage.outputTokens;
						}
					},
				);

				// Track usage for this follow-up round (each LLM call counts as 1 message toward plan)
				if (agent?.userId) {
					await usageProvider.trackMessage(agent.userId, {
						conversationId: convoId,
						model: agentModel,
						channel: body.channel || "widget",
						isToolFollowUp: true,
						toolRound,
					});

					// Track LLM usage and costs for this specific round only
					if (roundUsage.inputTokens > 0 || roundUsage.outputTokens > 0) {
						try {
							const totalCost = calculateLLMCostCents(
								agentModel,
								roundUsage.inputTokens,
								roundUsage.outputTokens,
							);
							const inputCost = calculateLLMCostCents(agentModel, roundUsage.inputTokens, 0);
							const outputCost = calculateLLMCostCents(agentModel, 0, roundUsage.outputTokens);

							if (!agent.userId || !agentId || !convoId || !messageId) {
								console.warn(
									"[chat] Skipping tool follow-up LLM usage tracking - missing required IDs",
								);
							} else {
								await db.insert(llmUsage).values({
									userId: agent.userId,
									agentId: agentId,
									conversationId: convoId,
									messageId: messageId,
									model: agentModel,
									tier: selectedTier,
									inputTokens: roundUsage.inputTokens,
									outputTokens: roundUsage.outputTokens,
									costCents: totalCost.toString(),
									costInputCents: inputCost.toString(),
									costOutputCents: outputCost.toString(),
									channel: body.channel || "widget",
									isToolFollowup: true,
									wasUpgraded: wasUpgraded,
									originalTier: originalTier || null,
									billingPeriodStart:
										subscription?.billingPeriodStart ||
										new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
								});

								// Track to PostHog for analytics
								const provider = agentModel.startsWith("claude-")
									? "anthropic"
									: agentModel.startsWith("gpt-") ||
											agentModel.startsWith("o1") ||
											agentModel.startsWith("o3")
										? "openai"
										: agentModel.startsWith("gemini-")
											? "gemini"
											: "ollama";
								trackLLMCost(agent.userId, {
									agentId,
									conversationId: convoId,
									messageId,
									model: agentModel,
									provider,
									tier: selectedTier,
									inputTokens: roundUsage.inputTokens,
									outputTokens: roundUsage.outputTokens,
									costCents: totalCost,
									costInputCents: inputCost,
									costOutputCents: outputCost,
									channel: body.channel || "widget",
									isToolFollowup: true,
								});
							}
						} catch (costError) {
							console.error("[chat] Failed to track tool follow-up LLM usage:", costError);
						}
					}
				}

				// If this round didn't request another tool, we're done
				if (!roundRequestedTool) break;
			}

			if (usedToolName && toolResult && shouldSkipFollowUp) {
				// Use static acknowledgment instead of LLM follow-up for rich displays
				const acknowledgment =
					(usedToolDisplayConfig as DisplayConfig | null)?.followUpAcknowledgment || "";
				if (acknowledgment) {
					fullResponse = acknowledgment;
					const deltaData = {
						type: "content_block_delta",
						index: 0,
						delta: { type: "text_delta", text: acknowledgment },
					};
					await stream.writeSSE({
						event: "content_block_delta",
						data: JSON.stringify(deltaData),
					});
				}
			}

			// Determine if escalation button should be shown based on showButtonsAfter setting
			const showButtonsAfter = escalationSettings?.showButtonsAfter || "on_human_request";
			const shouldShowEscalationButton =
				escalationEnabled &&
				((showButtonsAfter === "on_human_request" && escalationIntent === "human_request") ||
					(showButtonsAfter === "on_low_confidence" && escalationIntent === "low_confidence") ||
					(showButtonsAfter === "on_help_request" && escalationIntent === "help_request") ||
					(showButtonsAfter === "on_human_or_negative_feedback" &&
						(escalationIntent === "human_request" || escalationIntent === "help_request")) ||
					(showButtonsAfter === "on_any_signal" && escalationIntent !== undefined));

			// Update assistant message with final content and confidence score
			await db
				.update(chatMessages)
				.set({
					content: fullResponse,
					confidenceScore,
					isSent: true,
					toolBlocks: collectedToolBlocks.length > 0 ? collectedToolBlocks : null,
					metadata: shouldShowEscalationButton
						? { shouldShowEscalation: true, escalationIntent }
						: null,
				})
				.where(eq(chatMessages.id, messageId));

			// Save retrieval trace for this turn
			const retrievedChunks = searchResults.map((r) => ({
				sourceId: r.id,
				chunkId: r.id,
				score: r.score,
				sourceType: r.sourceType || "unknown",
			}));

			const [trace] = await db
				.insert(retrievalTraces)
				.values({
					turnId: turn.id,
					assistantMessageId: messageId,
					confidenceScore,
					retrievalMode: searchResults.length > 0 ? "kb" : "none",
					topK: searchResults.length,
					sourcesUsedCount: new Set(searchResults.map((r) => r.id)).size,
					noContextReason: searchResults.length === 0 ? "no_results" : null,
					retrievedChunks,
				})
				.returning();

			// Save KB sources for analytics
			if (searchResults.length > 0) {
				await db.insert(kbRetrievalSources).values(
					searchResults.map((r) => ({
						traceId: trace.id,
						sourceId: r.id,
						chunkId: r.id,
						score: Math.round(r.score * 100),
					})),
				);
			}

			// Record turn event for assistant message
			await db.insert(turnEvents).values({
				turnId: turn.id,
				eventType: "assistant_message",
				eventId: messageId,
			});

			// Record turn events for tool executions if any
			if (collectedToolBlocks.length > 0) {
				// Get tool execution IDs for this conversation (most recent ones)
				const recentToolExecutions = await db
					.select({ id: toolExecutions.id })
					.from(toolExecutions)
					.where(eq(toolExecutions.agentId, agentId))
					.orderBy(desc(toolExecutions.createdAt))
					.limit(collectedToolBlocks.length);

				for (const execution of recentToolExecutions) {
					await db.insert(turnEvents).values({
						turnId: turn.id,
						eventType: "tool_call",
						eventId: execution.id,
					});
				}
			}

			// Mark turn as completed
			await db
				.update(turns)
				.set({
					status: "completed",
					completedAt: new Date(),
				})
				.where(eq(turns.id, turn.id));

			// Emit message delivered event via WebSocket
			emitToConversation(convoId, "message-delivered", {
				messageId,
				conversationId: convoId,
				sequenceId: Date.now(), // Use timestamp as sequence ID
				timestamp: new Date(),
			});

			// Track usage for billing - initial LLM call (agent owner pays for all usage)
			if (agent?.userId) {
				await usageProvider.trackMessage(agent.userId, {
					conversationId: convoId,
					model: agentModel,
					channel: body.channel || "widget",
				});

				// Track LLM usage and costs for the initial call only (follow-up rounds tracked above)
				if (initialUsage.inputTokens > 0 || initialUsage.outputTokens > 0) {
					try {
						if (!agent.userId || !agentId || !convoId || !messageId) {
							console.warn("[chat] Skipping LLM usage tracking - missing required IDs");
						} else {
							const totalCost = calculateLLMCostCents(
								agentModel,
								initialUsage.inputTokens,
								initialUsage.outputTokens,
							);
							const inputCost = calculateLLMCostCents(agentModel, initialUsage.inputTokens, 0);
							const outputCost = calculateLLMCostCents(agentModel, 0, initialUsage.outputTokens);

							await db.insert(llmUsage).values({
								userId: agent.userId,
								agentId: agentId,
								conversationId: convoId,
								messageId: messageId,
								model: agentModel,
								tier: selectedTier,
								inputTokens: initialUsage.inputTokens,
								outputTokens: initialUsage.outputTokens,
								costCents: totalCost.toString(),
								costInputCents: inputCost.toString(),
								costOutputCents: outputCost.toString(),
								channel: body.channel || "widget",
								isToolFollowup: false,
								wasUpgraded: wasUpgraded,
								originalTier: originalTier || null,
								billingPeriodStart:
									subscription?.billingPeriodStart ||
									new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
							});

							// Track to PostHog for analytics
							const provider = agentModel.startsWith("claude-")
								? "anthropic"
								: agentModel.startsWith("gpt-") ||
										agentModel.startsWith("o1") ||
										agentModel.startsWith("o3")
									? "openai"
									: agentModel.startsWith("gemini-")
										? "gemini"
										: "ollama";
							trackLLMCost(agent.userId, {
								agentId,
								conversationId: convoId,
								messageId,
								model: agentModel,
								provider,
								tier: selectedTier,
								inputTokens: initialUsage.inputTokens,
								outputTokens: initialUsage.outputTokens,
								costCents: totalCost,
								costInputCents: inputCost,
								costOutputCents: outputCost,
								channel: body.channel || "widget",
								isToolFollowup: false,
							});
						}
					} catch (costError) {
						// Don't fail the request if cost tracking fails
						console.error("[chat] Failed to track LLM usage:", costError);
					}
				}
			}

			// Detect language from AI response if not already set (more accurate than short user messages)
			const [currentConvo] = await db
				.select({ language: conversations.language })
				.from(conversations)
				.where(eq(conversations.id, convoId))
				.limit(1);

			let detectedLanguage: string | null = null;
			if (!currentConvo?.language) {
				// Try detecting from AI response first (longer, more reliable)
				detectedLanguage = detectLanguage(fullResponse);

				// Fallback: try accumulated user messages
				if (!detectedLanguage) {
					const allUserContent = messages
						.filter((m: ChatMessage) => m.role === "user")
						.map((m: ChatMessage) => m.content)
						.join(" ");
					detectedLanguage = detectLanguage(allUserContent);
				}
			}

			// Update conversation state (normal flow - no escalation needed at this point)
			// Increment AI response count and set language if detected
			await db
				.update(conversations)
				.set({
					updatedAt: new Date(),
					lastActivityAt: new Date(),
					needsAttention: false,
					resolution: "ai_handled",
					aiResponseCount: sql`${conversations.aiResponseCount} + 1`,
					...(detectedLanguage ? { language: detectedLanguage } : {}),
				})
				.where(eq(conversations.id, convoId));

			// If approaching warning threshold, add a warning message
			if (currentAiResponseCount + 1 === CONVERSATION_RATE_LIMITS.WARNING_THRESHOLD) {
				const warningMessageId = crypto.randomUUID();
				await db.insert(chatMessages).values({
					id: warningMessageId,
					conversationId: convoId,
					role: "assistant",
					content: `⚠️ This conversation is nearing the response limit (${CONVERSATION_RATE_LIMITS.WARNING_THRESHOLD}/${CONVERSATION_RATE_LIMITS.MAX_AI_RESPONSES}) and may be escalated soon`,
					metadata: { messageType: "system", reason: "rate_limit_warning" },
				});
			}

			// ChatKit protocol: content_block_stop (SSE only)
			const blockStopData = { type: "content_block_stop", index: 0 };
			await stream.writeSSE({
				event: "content_block_stop",
				data: JSON.stringify(blockStopData),
			});

			// ChatKit protocol: message_stop with conversationId and metadata (SSE only)
			const messageStopData = {
				type: "message_stop",
				conversationId: convoId,
				metadata: shouldShowEscalationButton
					? { shouldShowEscalation: true, escalationIntent }
					: undefined,
			};
			await stream.writeSSE({
				event: "message_stop",
				data: JSON.stringify(messageStopData),
			});
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			const errorData = {
				type: "error",
				error: { message: errorMessage },
			};
			await stream.writeSSE({
				event: "error",
				data: JSON.stringify(errorData),
			});
		}
	});
});

// Public endpoint for widget to poll for new messages (used during escalation)
chat.get("/messages/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");
	const since = c.req.query("since"); // Optional: only get messages after this timestamp

	const db = getDb();

	// Get conversation to verify it exists
	const [convo] = await db.select().from(conversations).where(eq(conversations.id, conversationId));

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Get messages (optionally filtered by timestamp)
	// Always filter out AI suggestions (isSent = false) - those are only visible to agents in the dashboard
	// The dashboard uses /conversations/:id endpoint which returns all messages including suggestions
	const messageFilter = and(
		eq(chatMessages.conversationId, conversationId),
		or(eq(chatMessages.isSent, true), isNull(chatMessages.isSent)),
	);

	const messagesQuery = db
		.select({
			id: chatMessages.id,
			role: chatMessages.role,
			content: chatMessages.content,
			createdAt: chatMessages.createdAt,
			isHumanResponse: chatMessages.isHumanResponse,
			metadata: chatMessages.metadata,
			isSent: chatMessages.isSent,
			toolBlocks: chatMessages.toolBlocks,
		})
		.from(chatMessages)
		.where(messageFilter)
		.orderBy(chatMessages.createdAt);

	const messages = await messagesQuery;

	// Filter by timestamp if provided
	const filteredMessages = since
		? messages.filter((m) => new Date(m.createdAt).getTime() > Number.parseInt(since, 10))
		: messages;

	return c.json({
		messages: filteredMessages.map((m) => {
			const messageData: {
				id: string;
				role: string;
				content: string;
				timestamp: number;
				isHumanResponse?: boolean;
				metadata?: { messageType?: string };
				blocks?: ToolBlockData[];
				formBlock?: {
					type: "form";
					toolId: string;
					toolName: string;
					formSchema: unknown;
					executionMode: string;
					clientHandler?: string;
					toolArgs?: Record<string, unknown>;
					formPostActions?: unknown[];
				};
			} = {
				id: m.id,
				role: m.role,
				content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
				timestamp: new Date(m.createdAt).getTime(),
				isHumanResponse: m.isHumanResponse || undefined,
				metadata: m.metadata || undefined,
			};

			// Process toolBlocks using shared utility
			if (m.toolBlocks && m.toolBlocks.length > 0) {
				const { formBlock, nonFormBlocks } = extractFormBlock(m.toolBlocks);

				if (formBlock) {
					messageData.formBlock = formBlock;
				}
				if (nonFormBlocks.length > 0) {
					messageData.blocks = nonFormBlocks;
				}
			}

			return messageData;
		}),
	});
});

// Get unread count for a visitor's conversation
chat.get("/unread/:agentId", async (c) => {
	const agentId = c.req.param("agentId");
	const visitorId = c.req.query("visitorId");

	if (!visitorId) {
		return c.json({ unreadCount: 0 });
	}

	const db = getDb();

	// Find the most recent non-resolved conversation for this visitor
	const [convo] = await db
		.select({
			id: conversations.id,
			lastSeenAt: conversations.lastSeenAt,
			status: conversations.status,
		})
		.from(conversations)
		.where(
			and(
				eq(conversations.agentId, agentId),
				eq(conversations.visitorId, visitorId),
				inArray(conversations.status, ["open", "pending"]),
			),
		)
		.orderBy(desc(conversations.updatedAt))
		.limit(1);

	if (!convo) {
		return c.json({ unreadCount: 0 });
	}

	// Count assistant messages after lastSeenAt
	const countConditions = [
		eq(chatMessages.conversationId, convo.id),
		eq(chatMessages.role, "assistant"),
		or(eq(chatMessages.isSent, true), isNull(chatMessages.isSent)),
	];

	if (convo.lastSeenAt) {
		countConditions.push(sql`${chatMessages.createdAt} > ${convo.lastSeenAt}`);
	}

	const [result] = await db
		.select({ count: sql<number>`count(*)` })
		.from(chatMessages)
		.where(and(...countConditions));

	return c.json({
		unreadCount: Number(result?.count) || 0,
		conversationId: convo.id,
	});
});

// Mark conversation as seen (update lastSeenAt)
chat.post("/seen/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");

	const db = getDb();

	// Update lastSeenAt
	await db
		.update(conversations)
		.set({ lastSeenAt: new Date() })
		.where(eq(conversations.id, conversationId));

	return c.json({ success: true });
});

// Close/resolve conversation from widget (public endpoint)
chat.post("/close/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");

	const db = getDb();

	// Get conversation to check current state
	const [convo] = await db
		.select({
			id: conversations.id,
			resolution: conversations.resolution,
			firstHumanResponseAt: conversations.firstHumanResponseAt,
		})
		.from(conversations)
		.where(eq(conversations.id, conversationId))
		.limit(1);

	if (!convo) {
		return c.json({ error: "Conversation not found" }, 404);
	}

	// Determine resolution type if not already set
	const resolution =
		convo.resolution || (convo.firstHumanResponseAt ? "human_handled" : "ai_handled");

	// Update conversation to closed and resolved
	await db
		.update(conversations)
		.set({
			status: "closed",
			resolvedAt: new Date(),
			resolution,
			needsAttention: false,
		})
		.where(eq(conversations.id, conversationId));

	return c.json({ success: true });
});

export { chat };
