/**
 * Shopify integration tool definitions
 * These tools are automatically created when a Shopify store is linked to an agent
 */

const API_URL = process.env.API_URL || "https://api.ansa.so";

export interface ShopifyToolConfig {
	shopId: string;
	shopDomain: string;
	agentId: string;
}

/**
 * Tool definition for Shopify integration
 * Uses a more permissive type to avoid issues with schema updates
 */
interface ShopifyToolDefinition {
	agentId: string;
	name: string;
	description: string;
	inputSchema: {
		type: "object";
		properties: Record<string, unknown>;
		required?: string[];
	};
	executionType: "http" | "mock" | "form";
	// HTTP-specific config (optional for form tools)
	httpUrl?: string;
	httpMethod?: "POST" | "GET";
	httpHeaders?: Record<string, string>;
	// Form-specific config (optional for HTTP tools)
	formSchema?: {
		fields: Array<{
			name: string;
			label: string;
			type: "text" | "email" | "tel" | "number" | "textarea" | "select" | "hidden";
			placeholder?: string;
			defaultValue?: string;
			options?: Array<{ label: string; value: string }>;
			validation?: {
				required?: { value: boolean; message: string };
				minLength?: { value: number; message: string };
				maxLength?: { value: number; message: string };
				pattern?: { value: string; message: string };
			};
		}>;
		introText?: string;
		submitLabel?: string;
		successMessage?: string;
		errorMessage?: string;
	};
	formExecutionMode?: "webhook" | "client" | "both";
	formWebhookUrl?: string;
	formPostActions?: Array<
		| { type: "slack"; webhookUrl: string; messageTemplate: string }
		| { type: "email"; recipientIds: string[]; subject?: string }
	>;
	displayConfig?: {
		type: string;
		fieldMappings?: Record<string, string>;
		textFallback?: string;
		skipFollowUp?: boolean;
		followUpAcknowledgment?: string;
		options?: Record<string, unknown>;
	};
	isEnabled: boolean;
	allowAiSuggest: boolean;
	countsAsConversion: boolean;
	countsAsResolution: boolean;
	category: string;
	system: boolean;
	integrationSource: string;
	integrationId: string;
}

/**
 * Creates the set of Shopify tools for an agent linked to a shop
 */
export function createShopifyToolDefinitions(config: ShopifyToolConfig): ShopifyToolDefinition[] {
	const { shopId, agentId } = config;

	return [
		{
			agentId,
			name: "shopify_search_products",
			description:
				"Search for products in the Shopify store. Use this when a customer asks about products, wants recommendations, or is looking for specific items.",
			inputSchema: {
				type: "object",
				properties: {
					query: {
						type: "string",
						description: "The search query - product name, type, color, or any descriptive terms",
					},
					limit: {
						type: "number",
						description: "Maximum number of products to return (default: 5, max: 20)",
					},
				},
				required: ["query"],
			},
			executionType: "http",
			httpUrl: `${API_URL}/shopify/internal/search-products`,
			httpMethod: "POST",
			httpHeaders: {
				"Content-Type": "application/json",
			},
			displayConfig: {
				type: "product_carousel",
				// Products are already in the correct format from the internal endpoint
				// No field mappings needed - the response has { products: [{ title, price, image, url, ... }] }
				textFallback: "Found {{count}} products: {{#products}}{{title}} - {{price}}{{/products}}",
				skipFollowUp: true,
				followUpAcknowledgment: "Here's what I found:",
				options: {
					showPrice: true,
					showImage: true,
					showAddToCart: true,
					maxItems: 10,
					cardStyle: "detailed",
				},
			},
			isEnabled: true,
			allowAiSuggest: true,
			countsAsConversion: false,
			countsAsResolution: false,
			category: "custom",
			system: true,
			integrationSource: "shopify",
			integrationId: shopId,
		},
		{
			agentId,
			name: "shopify_lookup_order",
			description:
				"Look up an order by order number. Use this when a customer asks about their order status, shipping, tracking, or order details.",
			inputSchema: {
				type: "object",
				properties: {
					order_number: {
						type: "string",
						description: "The order number (e.g., #1001 or just 1001)",
					},
					email: {
						type: "string",
						description: "Customer email for verification (optional but recommended for security)",
					},
				},
				required: ["order_number"],
			},
			executionType: "http",
			httpUrl: `${API_URL}/shopify/internal/lookup-order`,
			httpMethod: "POST",
			httpHeaders: {
				"Content-Type": "application/json",
			},
			displayConfig: {
				type: "table",
				fieldMappings: {
					orderId: "$.order.name",
					status: "$.order.fulfillment_status",
					total: "$.order.total_price",
					createdAt: "$.order.created_at",
					trackingUrl: "$.order.tracking_url",
				},
				textFallback: "Order {{orderId}}: Status - {{status}}, Total - {{total}}",
				skipFollowUp: true,
				followUpAcknowledgment: "Here's your order:",
				options: {
					columns: [
						{ key: "orderId", label: "Order #" },
						{ key: "status", label: "Status" },
						{ key: "total", label: "Total" },
						{ key: "createdAt", label: "Date" },
					],
				},
			},
			isEnabled: true,
			allowAiSuggest: true,
			countsAsConversion: false,
			countsAsResolution: true,
			category: "support_escalation",
			system: true,
			integrationSource: "shopify",
			integrationId: shopId,
		},
		{
			agentId,
			name: "shopify_request_refund",
			description:
				"Request a refund for an order. Use this when a customer wants to return an item or request a refund. A form will collect customer contact information for identity verification before processing.",
			inputSchema: {
				type: "object",
				properties: {
					order_number: {
						type: "string",
						description: "The order number to refund",
					},
					reason: {
						type: "string",
						description: "The reason for the refund request",
					},
					amount: {
						type: "number",
						description: "The refund amount in dollars (optional - defaults to full refund)",
					},
				},
				required: ["order_number", "reason"],
			},
			executionType: "form",
			formSchema: {
				introText:
					"Please review the details below and complete the form to submit your refund request.",
				fields: [
					// Pre-filled fields from AI conversation (editable so user can correct if needed)
					{
						name: "order_number",
						label: "Order Number",
						type: "text",
						placeholder: "e.g. #12345",
						defaultValue: "{{toolArgs.order_number}}",
						validation: {
							required: { value: true, message: "Please enter the order number" },
						},
					},
					{
						name: "reason",
						label: "Reason for Refund",
						type: "textarea",
						placeholder: "Please describe why you're requesting a refund",
						defaultValue: "{{toolArgs.reason}}",
						validation: {
							required: { value: true, message: "Please provide a reason for the refund" },
						},
					},
					{
						name: "amount",
						label: "Refund Amount (optional)",
						type: "text",
						placeholder: "Leave blank for full refund",
						defaultValue: "{{toolArgs.amount}}",
					},
					// Customer contact information
					{
						name: "customer_name",
						label: "Your Name",
						type: "text",
						placeholder: "John Doe",
						validation: {
							required: { value: true, message: "Please enter your name" },
							minLength: { value: 2, message: "Name must be at least 2 characters" },
						},
					},
					{
						name: "customer_email",
						label: "Email Address",
						type: "email",
						placeholder: "john@example.com",
						validation: {
							required: { value: true, message: "Please enter your email" },
							pattern: {
								value: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
								message: "Please enter a valid email address",
							},
						},
					},
					{
						name: "customer_phone",
						label: "Phone Number (optional)",
						type: "tel",
						placeholder: "+1 (555) 123-4567",
					},
				],
				submitLabel: "Submit Refund Request",
				successMessage:
					"Your refund request has been submitted. Our team will review it and get back to you as soon as possible.",
				errorMessage: "Something went wrong. Please try again or contact support.",
			},
			formExecutionMode: "webhook",
			formWebhookUrl: `${API_URL}/shopify/internal/request-refund`,
			isEnabled: true,
			allowAiSuggest: true,
			countsAsConversion: false,
			countsAsResolution: true,
			category: "support_escalation",
			system: true,
			integrationSource: "shopify",
			integrationId: shopId,
		},
		{
			agentId,
			name: "shopify_get_customer_info",
			description:
				"Look up customer information and order history. Use this to provide personalized assistance based on the customer's past purchases and preferences.",
			inputSchema: {
				type: "object",
				properties: {
					email: {
						type: "string",
						description: "The customer's email address",
					},
					customer_id: {
						type: "string",
						description: "The Shopify customer ID (alternative to email)",
					},
				},
				required: [],
			},
			executionType: "http",
			httpUrl: `${API_URL}/shopify/internal/customer-info`,
			httpMethod: "POST",
			httpHeaders: {
				"Content-Type": "application/json",
			},
			displayConfig: {
				type: "text",
				textFallback:
					"Customer: {{name}} ({{email}}). Total orders: {{orderCount}}, Total spent: {{totalSpent}}",
			},
			isEnabled: true,
			allowAiSuggest: true,
			countsAsConversion: false,
			countsAsResolution: false,
			category: "account_user",
			system: true,
			integrationSource: "shopify",
			integrationId: shopId,
		},
	];
}

/**
 * Tool names used for Shopify integration
 */
export const SHOPIFY_TOOL_NAMES = [
	"shopify_search_products",
	"shopify_lookup_order",
	"shopify_request_refund",
	"shopify_get_customer_info",
] as const;

export type ShopifyToolName = (typeof SHOPIFY_TOOL_NAMES)[number];
