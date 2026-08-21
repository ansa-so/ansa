import { safeFetch } from "./safe-fetch";
/**
 * API Auto-Discovery Service
 *
 * Analyzes API URLs to detect parameters, fetch sample responses,
 * and generate tool configurations automatically.
 */

export interface DetectedParam {
	name: string;
	type: "numeric_id" | "uuid" | "slug" | "date" | "query" | "unknown";
	originalValue: string;
	placeholder: string;
	position: number;
	isQueryParam: boolean;
}

export interface DiscoveryResult {
	detectedParams: DetectedParam[];
	urlTemplate: string;
	sampleResponse: unknown;
	suggestedInputSchema: {
		type: "object";
		properties: Record<string, { type: string; description: string }>;
		required: string[];
	};
	suggestedDisplayConfig: {
		type: string;
		fieldMappings?: Record<string, string>;
		options?: Record<string, unknown>;
	};
	suggestedName: string;
	suggestedDescription: string;
}

// Common resource names that should NOT be detected as parameters
// These are API path segments, not actual parameter values
const RESOURCE_NAME_BLOCKLIST = new Set([
	// API structure
	"api",
	"v1",
	"v2",
	"v3",
	"rest",
	"graphql",
	// Common resources
	"user",
	"users",
	"product",
	"products",
	"order",
	"orders",
	"item",
	"items",
	"property",
	"properties",
	"post",
	"posts",
	"article",
	"articles",
	"category",
	"categories",
	"customer",
	"customers",
	"invoice",
	"invoices",
	"booking",
	"bookings",
	"event",
	"events",
	"ticket",
	"tickets",
	"comment",
	"comments",
	"review",
	"reviews",
	"listing",
	"listings",
	"account",
	"accounts",
	"profile",
	"profiles",
	"settings",
	"config",
	"data",
	"info",
	"details",
	"search",
	"list",
	"all",
]);

// Common resource names to help generate meaningful param names
const RESOURCE_PATTERNS: Record<string, string> = {
	user: "user_id",
	users: "user_id",
	product: "product_id",
	products: "product_id",
	order: "order_id",
	orders: "order_id",
	item: "item_id",
	items: "item_id",
	property: "property_id",
	properties: "property_id",
	post: "post_id",
	posts: "post_id",
	article: "article_id",
	articles: "article_id",
	category: "category_id",
	categories: "category_id",
	customer: "customer_id",
	customers: "customer_id",
	invoice: "invoice_id",
	invoices: "invoice_id",
	booking: "booking_id",
	bookings: "booking_id",
	event: "event_id",
	events: "event_id",
	ticket: "ticket_id",
	tickets: "ticket_id",
};

/**
 * Detect parameter type based on value pattern
 */
function detectParamType(value: string): DetectedParam["type"] {
	// UUID pattern
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
		return "uuid";
	}

	// Date pattern (YYYY-MM-DD)
	if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		return "date";
	}

	// Numeric ID
	if (/^\d+$/.test(value)) {
		return "numeric_id";
	}

	// Slug-like pattern (lowercase with dashes/underscores)
	// Must contain at least one digit to distinguish from regular path segments
	// e.g. "my-product-123" is a slug, but "cancellation-policy" is a path segment
	if (/^[a-z0-9][a-z0-9-_]*[a-z0-9]$/.test(value) && value.length > 2 && /\d/.test(value)) {
		return "slug";
	}

	return "unknown";
}

/**
 * Generate a meaningful parameter name based on context
 */
function generateParamName(
	value: string,
	type: DetectedParam["type"],
	precedingSegment: string | null,
	position: number,
): string {
	// Try to use the preceding segment for context
	if (precedingSegment) {
		const cleanSegment = precedingSegment.toLowerCase().replace(/[^a-z]/g, "");
		if (RESOURCE_PATTERNS[cleanSegment]) {
			return RESOURCE_PATTERNS[cleanSegment];
		}
		// Create name from segment
		if (cleanSegment.length > 0) {
			return `${cleanSegment}_id`;
		}
	}

	// Fallback based on type
	switch (type) {
		case "uuid":
			return position === 0 ? "id" : `id_${position + 1}`;
		case "date":
			return position === 0 ? "date" : `date_${position + 1}`;
		case "numeric_id":
			return position === 0 ? "id" : `id_${position + 1}`;
		case "slug":
			return position === 0 ? "slug" : `slug_${position + 1}`;
		default:
			return position === 0 ? "param" : `param_${position + 1}`;
	}
}

/**
 * Detect parameters in a URL (both path and query params)
 */
export function detectUrlParams(url: string): DetectedParam[] {
	const params: DetectedParam[] = [];
	let position = 0;

	try {
		const urlObj = new URL(url);

		// Detect path parameters
		const pathSegments = urlObj.pathname.split("/").filter(Boolean);
		for (let i = 0; i < pathSegments.length; i++) {
			const segment = pathSegments[i];

			// Skip common resource names - they are not parameters
			if (RESOURCE_NAME_BLOCKLIST.has(segment.toLowerCase())) {
				continue;
			}

			const type = detectParamType(segment);

			// Consider it a parameter if it looks like an ID, UUID, date, or slug
			if (type !== "unknown" || /^\d/.test(segment)) {
				const precedingSegment = i > 0 ? pathSegments[i - 1] : null;
				const name = generateParamName(segment, type, precedingSegment, position);

				params.push({
					name,
					type: type === "unknown" ? "numeric_id" : type,
					originalValue: segment,
					placeholder: `\${${name}}`,
					position,
					isQueryParam: false,
				});
				position++;
			}
		}

		// Detect query parameters
		for (const [key, value] of urlObj.searchParams.entries()) {
			const type = detectParamType(value);
			params.push({
				name: key,
				type: type === "unknown" ? "query" : type,
				originalValue: value,
				placeholder: `\${${key}}`,
				position,
				isQueryParam: true,
			});
			position++;
		}
	} catch {
		// Invalid URL, return empty params
	}

	return params;
}

/**
 * Generate URL template by replacing detected params with placeholders
 */
export function generateUrlTemplate(url: string, params: DetectedParam[]): string {
	let template = url;

	for (const param of params) {
		if (param.isQueryParam) {
			// Replace query param value with placeholder
			template = template.replace(
				new RegExp(`([?&])${param.name}=${encodeURIComponent(param.originalValue)}`, "g"),
				`$1${param.name}=${param.placeholder}`,
			);
		} else {
			// Replace path segment with placeholder
			template = template.replace(
				new RegExp(`/${escapeRegExp(param.originalValue)}(/|$)`, "g"),
				`/${param.placeholder}$1`,
			);
		}
	}

	return template;
}

function escapeRegExp(string: string): string {
	return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Analyze JSON response to suggest display configuration
 */
export function analyzeResponseForDisplay(
	response: unknown,
): DiscoveryResult["suggestedDisplayConfig"] {
	if (response === null || response === undefined) {
		return { type: "text" };
	}

	// Check if it's an array
	if (Array.isArray(response)) {
		if (response.length === 0) {
			return { type: "text" };
		}

		const firstItem = response[0];
		if (typeof firstItem === "object" && firstItem !== null) {
			// Check for product-like structure
			const hasImage = "image" in firstItem || "image_url" in firstItem || "imageUrl" in firstItem;
			const hasPrice = "price" in firstItem || "cost" in firstItem || "amount" in firstItem;
			const hasTitle = "title" in firstItem || "name" in firstItem;

			if (hasImage && hasPrice && hasTitle) {
				return {
					type: "product_carousel",
					fieldMappings: {
						title: findFieldPath(firstItem, ["title", "name"]),
						price: findFieldPath(firstItem, ["price", "cost", "amount"]),
						image: findFieldPath(firstItem, ["image", "image_url", "imageUrl", "thumbnail"]),
					},
					options: { maxItems: 5 },
				};
			}

			// Default to table for arrays of objects
			const keys = Object.keys(firstItem).slice(0, 5);
			return {
				type: "table",
				options: {
					columns: keys.map((key) => ({
						key,
						label: formatLabel(key),
					})),
				},
			};
		}

		return { type: "text" };
	}

	// Check if it's an object
	if (typeof response === "object") {
		const obj = response as Record<string, unknown>;

		// Check for nested array under common keys
		const arrayKeys = ["items", "data", "results", "records", "entries"];
		for (const key of arrayKeys) {
			if (Array.isArray(obj[key])) {
				return analyzeResponseForDisplay(obj[key]);
			}
		}

		// Check for product-like single object
		const hasImage = "image" in obj || "image_url" in obj || "imageUrl" in obj;
		const hasPrice = "price" in obj || "cost" in obj || "amount" in obj;
		const hasTitle = "title" in obj || "name" in obj;

		if (hasImage && hasPrice && hasTitle) {
			return {
				type: "product_card",
				fieldMappings: {
					title: findFieldPath(obj, ["title", "name"]),
					price: findFieldPath(obj, ["price", "cost", "amount"]),
					image: findFieldPath(obj, ["image", "image_url", "imageUrl", "thumbnail"]),
					description: findFieldPath(obj, ["description", "summary", "body"]),
				},
			};
		}

		// Default to text for simple objects
		return { type: "text" };
	}

	return { type: "text" };
}

function findFieldPath(obj: Record<string, unknown>, candidates: string[]): string {
	for (const candidate of candidates) {
		if (candidate in obj) {
			return candidate;
		}
	}
	return candidates[0];
}

function formatLabel(key: string): string {
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/[_-]/g, " ")
		.replace(/^\w/, (c) => c.toUpperCase())
		.trim();
}

/**
 * Generate a tool name from the URL
 */
function generateToolName(url: string): string {
	try {
		const urlObj = new URL(url);
		const pathSegments = urlObj.pathname.split("/").filter(Boolean);

		// Find the first non-parameter segment
		for (const segment of pathSegments) {
			const type = detectParamType(segment);
			if (type === "unknown" && !/^\d/.test(segment)) {
				// Clean and format the segment
				const cleaned = segment.toLowerCase().replace(/[^a-z0-9]/g, "_");
				return `get_${cleaned}`;
			}
		}

		// Fallback to hostname-based name
		const hostname = urlObj.hostname.replace(/^(www\.|api\.)/i, "").split(".")[0];
		return `get_${hostname.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
	} catch {
		return "api_lookup";
	}
}

/**
 * Generate a description from the URL and response
 */
function generateToolDescription(url: string, params: DetectedParam[]): string {
	try {
		const urlObj = new URL(url);
		const pathSegments = urlObj.pathname.split("/").filter(Boolean);

		// Find resource name
		for (const segment of pathSegments) {
			const type = detectParamType(segment);
			if (type === "unknown" && !/^\d/.test(segment)) {
				const resource = segment.replace(/[-_]/g, " ");
				const paramDesc = params.length > 0 ? ` by ${params.map((p) => p.name).join(", ")}` : "";
				return `Look up ${resource}${paramDesc}`;
			}
		}

		return `Fetch data from ${urlObj.hostname}`;
	} catch {
		return "Fetch data from API";
	}
}

/**
 * Generate input schema from detected parameters
 */
function generateInputSchema(params: DetectedParam[]): DiscoveryResult["suggestedInputSchema"] {
	const properties: Record<string, { type: string; description: string }> = {};
	const required: string[] = [];

	for (const param of params) {
		let description = "";
		switch (param.type) {
			case "numeric_id":
				description = `The ${param.name.replace(/_/g, " ")} to look up`;
				break;
			case "uuid":
				description = `UUID identifier for ${param.name.replace(/_/g, " ")}`;
				break;
			case "date":
				description = `Date in YYYY-MM-DD format`;
				break;
			case "slug":
				description = `Slug or identifier for ${param.name.replace(/_/g, " ")}`;
				break;
			case "query":
				description = `Value for ${param.name} parameter`;
				break;
			default:
				description = `Value for ${param.name}`;
		}

		properties[param.name] = {
			type: "string",
			description,
		};

		// All detected params are required by default
		required.push(param.name);
	}

	return {
		type: "object",
		properties,
		required,
	};
}

/**
 * Fetch and analyze an API URL
 */
export async function analyzeApi(
	url: string,
	options: {
		method?: "GET" | "POST";
		headers?: Record<string, string>;
		timeout?: number;
	} = {},
): Promise<DiscoveryResult> {
	const { method = "GET", headers = {}, timeout = 30000 } = options;

	// Detect parameters
	const detectedParams = detectUrlParams(url);

	// Generate URL template
	const urlTemplate = generateUrlTemplate(url, detectedParams);

	// Fetch sample response
	let sampleResponse: unknown = null;
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeout);

		const response = await safeFetch(url, {
			method,
			headers: {
				Accept: "application/json",
				...headers,
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		if (response.ok) {
			const contentType = response.headers.get("content-type") || "";
			if (contentType.includes("application/json")) {
				sampleResponse = await response.json();
			} else {
				sampleResponse = { _warning: "Response is not JSON", _contentType: contentType };
			}
		} else {
			sampleResponse = {
				_error: `HTTP ${response.status}`,
				_status: response.status,
				_statusText: response.statusText,
			};
		}
	} catch (error) {
		sampleResponse = {
			_error: error instanceof Error ? error.message : "Failed to fetch",
		};
	}

	// Analyze response for display config
	const suggestedDisplayConfig = analyzeResponseForDisplay(sampleResponse);

	// Generate tool metadata
	const suggestedName = generateToolName(url);
	const suggestedDescription = generateToolDescription(url, detectedParams);
	const suggestedInputSchema = generateInputSchema(detectedParams);

	return {
		detectedParams,
		urlTemplate,
		sampleResponse,
		suggestedInputSchema,
		suggestedDisplayConfig,
		suggestedName,
		suggestedDescription,
	};
}
