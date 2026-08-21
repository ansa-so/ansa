import crypto from "node:crypto";
import type { NewShopifyCustomer, NewShopifyOrder, NewShopifyProduct, ShopifyShop } from "@ansa/db";
import {
	and,
	desc,
	eq,
	getDb,
	shopifyCustomers,
	shopifyOrders,
	shopifyProducts,
	shopifyShopAgents,
	shopifyShops,
} from "@ansa/db";

// ============ CONFIGURATION ============

export const shopifyConfig = {
	clientId: process.env.SHOPIFY_CLIENT_ID || "",
	clientSecret: process.env.SHOPIFY_CLIENT_SECRET || "",
	scopes: process.env.SHOPIFY_SCOPES || "read_orders,write_orders,read_customers,read_products",
	apiVersion: "2025-01",
	// Use getters to evaluate env vars at access time, not module load time
	get appUrl() {
		return process.env.API_URL || "http://localhost:3001";
	},
	get widgetUrl() {
		return process.env.WIDGET_URL || "http://localhost:3002";
	},
};

// ============ ERRORS ============

/**
 * Thrown when Shopify returns a 401 — the stored access token is invalid/revoked.
 * Callers should catch this and prompt the user to re-authenticate.
 */
export class ShopifyAuthError extends Error {
	constructor(
		public shop: string,
		message = "Shopify access token is invalid or revoked",
	) {
		super(message);
		this.name = "ShopifyAuthError";
	}
}

// ============ HMAC VALIDATION ============

/**
 * Verify Shopify webhook HMAC signature
 */
export function verifyWebhookHmac(body: string, hmacHeader: string): boolean {
	const hash = crypto
		.createHmac("sha256", shopifyConfig.clientSecret)
		.update(body, "utf8")
		.digest("base64");
	return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

/**
 * Verify Shopify OAuth/Admin request signature (query params)
 */
export function verifyRequestSignature(query: Record<string, string>): boolean {
	const { hmac, ...params } = query;
	if (!hmac) return false;

	// Sort and stringify params
	const message = Object.keys(params)
		.sort()
		.map((key) => `${key}=${params[key]}`)
		.join("&");

	const hash = crypto
		.createHmac("sha256", shopifyConfig.clientSecret)
		.update(message)
		.digest("hex");

	return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

/**
 * Verify Shopify session token (JWT from App Bridge)
 * Returns the decoded payload if valid, null if invalid
 */
export function verifySessionToken(token: string): {
	iss: string;
	dest: string;
	aud: string;
	sub: string;
	exp: number;
	nbf: number;
	iat: number;
	jti: string;
	sid: string;
} | null {
	try {
		// Shopify session tokens are JWTs signed with the app's client secret
		const [headerB64, payloadB64, signatureB64] = token.split(".");
		if (!headerB64 || !payloadB64 || !signatureB64) {
			return null;
		}

		// Verify signature
		const signatureInput = `${headerB64}.${payloadB64}`;
		const expectedSignature = crypto
			.createHmac("sha256", shopifyConfig.clientSecret)
			.update(signatureInput)
			.digest("base64url");

		if (expectedSignature !== signatureB64) {
			console.warn("[Shopify] Session token signature mismatch");
			return null;
		}

		// Decode payload
		const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));

		// Verify expiration
		const now = Math.floor(Date.now() / 1000);
		if (payload.exp && payload.exp < now) {
			console.warn("[Shopify] Session token expired");
			return null;
		}

		// Verify not before
		if (payload.nbf && payload.nbf > now) {
			console.warn("[Shopify] Session token not yet valid");
			return null;
		}

		// Verify audience (should be our client ID)
		if (payload.aud !== shopifyConfig.clientId) {
			console.warn("[Shopify] Session token audience mismatch");
			return null;
		}

		return payload;
	} catch (error) {
		console.error("[Shopify] Failed to verify session token:", error);
		return null;
	}
}

/**
 * Extract shop domain from session token destination
 * dest is like "https://myshop.myshopify.com"
 */
export function getShopFromSessionToken(payload: { dest: string }): string | null {
	try {
		const url = new URL(payload.dest);
		return url.hostname;
	} catch {
		return null;
	}
}

// ============ OAUTH ============

/**
 * Generate the Shopify OAuth URL for app installation
 */
export function getInstallUrl(shop: string, state: string): string {
	const redirectUri = `${shopifyConfig.appUrl}/shopify/callback`;
	const scopes = shopifyConfig.scopes;

	return `https://${shop}/admin/oauth/authorize?client_id=${shopifyConfig.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

/**
 * Exchange the authorization code for an access token
 */
export async function exchangeCodeForToken(
	shop: string,
	code: string,
): Promise<{ access_token: string; scope: string }> {
	const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			client_id: shopifyConfig.clientId,
			client_secret: shopifyConfig.clientSecret,
			code,
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Failed to exchange code: ${error}`);
	}

	return response.json() as Promise<{ access_token: string; scope: string }>;
}

// ============ SHOPIFY API CLIENT ============

interface ShopifyApiOptions {
	shop: string;
	accessToken: string;
}

/**
 * Make a request to Shopify Admin API
 */
async function shopifyApi<T>(
	{ shop, accessToken }: ShopifyApiOptions,
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const url = `https://${shop}/admin/api/${shopifyConfig.apiVersion}${endpoint}`;

	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			"X-Shopify-Access-Token": accessToken,
			...options.headers,
		},
	});

	if (!response.ok) {
		const error = await response.text();
		if (response.status === 401 || response.status === 403) {
			throw new ShopifyAuthError(shop, `Shopify API auth error: ${response.status} ${error}`);
		}
		throw new Error(`Shopify API error: ${response.status} ${error}`);
	}

	return response.json() as Promise<T>;
}

// ============ SHOP DATA ============

interface ShopifyShopData {
	shop: {
		id: number;
		name: string;
		email: string;
		domain: string;
		myshopify_domain: string;
		currency: string;
		iana_timezone: string;
	};
}

/**
 * Fetch shop details from Shopify
 */
export async function getShopData(opts: ShopifyApiOptions): Promise<ShopifyShopData["shop"]> {
	const data = await shopifyApi<ShopifyShopData>(opts, "/shop.json");
	return data.shop;
}

// ============ SCRIPT TAG INJECTION ============

interface ScriptTag {
	id: number;
	src: string;
	event: string;
	display_scope: string;
}

/**
 * Register webhooks for a Shopify shop
 */
export async function registerWebhooks(opts: ShopifyApiOptions): Promise<void> {
	const webhookTopics = [
		"app/uninstalled",
		"app_subscriptions/update", // For billing status changes
		"orders/create",
		"orders/updated",
		"customers/create",
		"customers/update",
		"refunds/create",
		"products/create",
		"products/update",
		"products/delete",
		// Mandatory compliance webhooks for GDPR/CCPA
		"customers/data_request",
		"customers/redact",
		"shop/redact",
	];

	const webhookUrl = `${shopifyConfig.appUrl}/shopify/webhooks`;

	for (const topic of webhookTopics) {
		try {
			const response = await fetch(
				`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/webhooks.json`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"X-Shopify-Access-Token": opts.accessToken,
					},
					body: JSON.stringify({
						webhook: {
							topic,
							address: `${webhookUrl}/${topic.replace("/", "-")}`,
							format: "json",
						},
					}),
				},
			);

			if (response.ok) {
				console.log(`[Shopify] Registered webhook: ${topic} for ${opts.shop}`);
			} else if (response.status === 422) {
				// Webhook already exists, ignore
				console.log(`[Shopify] Webhook already exists: ${topic} for ${opts.shop}`);
			} else {
				console.error(`[Shopify] Failed to register webhook ${topic}: ${response.status}`);
			}
		} catch (err) {
			console.error(`[Shopify] Error registering webhook ${topic}:`, err);
		}
	}
}

/**
 * Inject the chat widget script tag into the Shopify storefront
 */
interface WidgetConfig {
	agentId: string;
}

/**
 * Build widget script URL with minimal params (agentId only)
 * The widget will fetch full config from /interface-settings/public/:agentId
 * API URL is hardcoded in the widget build
 */
export function buildWidgetScriptUrl(config: WidgetConfig): string {
	const url = new URL("https://cdn.ansa.so/embed.js");
	url.searchParams.set("agentId", config.agentId);
	return url.toString();
}

/**
 * Build customer identification script that calls ansa.identify() with Shopify customer data.
 * Uses Shopify's Customer Privacy API to fetch customer details.
 */
export function buildCustomerIdentificationScript(): string {
	return `
(function() {
	function identifyCustomer() {
		// Check if customer is logged in via Shopify Analytics
		var customerId = window.ShopifyAnalytics?.meta?.page?.customerId;

		if (!customerId) {
			// Try alternative location
			customerId = window.meta?.page?.customerId;
		}

		if (!customerId) {
			// Not logged in, clear any existing identity
			if (window.ansa && window.ansa.resetUser) {
				window.ansa.resetUser();
			}
			return;
		}

		// Fetch customer details from Shopify Customer Privacy API
		if (window.Shopify && window.Shopify.customerPrivacy) {
			window.Shopify.customerPrivacy.userDataCanBeSold().then(function() {
				// Customer has consented, we can access their data
				// Shopify exposes customer email in the checkout/account context
				var email = null;

				// Try to get email from various Shopify contexts
				if (window.Shopify.checkout && window.Shopify.checkout.email) {
					email = window.Shopify.checkout.email;
				}

				if (window.ansa && window.ansa.identify) {
					var metadata = {
						shopifyCustomerId: String(customerId)
					};

					if (email) {
						metadata.email = email;
					}

					window.ansa.identify({
						userId: String(customerId),
						userMetadata: metadata
					});
				}
			}).catch(function() {
				// Customer hasn't consented or error occurred
				// Still identify with just the ID
				if (window.ansa && window.ansa.identify) {
					window.ansa.identify({
						userId: String(customerId),
						userMetadata: {
							shopifyCustomerId: String(customerId)
						}
					});
				}
			});
		} else {
			// Privacy API not available, just use customer ID
			if (window.ansa && window.ansa.identify) {
				window.ansa.identify({
					userId: String(customerId),
					userMetadata: {
						shopifyCustomerId: String(customerId)
					}
				});
			}
		}
	}

	// Wait for both Shopify and widget to be ready
	function waitForWidget() {
		if (window.ansa && window.ansa.isReady && window.ansa.isReady()) {
			identifyCustomer();
		} else {
			setTimeout(waitForWidget, 100);
		}
	}

	// Start polling for widget readiness
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', waitForWidget);
	} else {
		waitForWidget();
	}
})();
`.trim();
}

export async function injectWidgetScriptTag(
	opts: ShopifyApiOptions,
	config: WidgetConfig,
): Promise<{ widgetScriptTag: ScriptTag; identificationScriptTag: ScriptTag }> {
	const widgetSrc = buildWidgetScriptUrl(config);

	// First, remove any existing Ansa script tags to avoid duplicates
	try {
		const existingTags = await listScriptTags(opts);
		const ansaTags = existingTags.filter(
			(tag) => tag.src.includes("embed.js") || tag.src.includes("ansa-customer-identify"),
		);
		for (const tag of ansaTags) {
			console.log(`[Shopify] Removing existing script tag: ${tag.id}`);
			await removeScriptTag(opts, String(tag.id));
		}
	} catch (err) {
		console.warn("[Shopify] Failed to check/remove existing script tags:", err);
		// Continue anyway
	}

	// Inject widget script tag
	const widgetData = await shopifyApi<{ script_tag: ScriptTag }>(opts, "/script_tags.json", {
		method: "POST",
		body: JSON.stringify({
			script_tag: {
				event: "onload",
				src: widgetSrc,
				display_scope: "online_store",
			},
		}),
	});

	// Inject customer identification script tag
	const identificationData = await injectCustomerIdentificationScriptTag(opts, config.agentId);

	return {
		widgetScriptTag: widgetData.script_tag,
		identificationScriptTag: identificationData,
	};
}

/**
 * Inject customer identification script tag that calls ansa.identify() with Shopify customer data.
 * This must be injected AFTER the main widget script tag.
 */
export async function injectCustomerIdentificationScriptTag(
	opts: ShopifyApiOptions,
	agentId: string,
): Promise<ScriptTag> {
	// Use hosted endpoint instead of data URL to avoid 255-character limit
	const scriptSrc = `${shopifyConfig.appUrl}/shopify/customer-identify-script/${agentId}`;

	const data = await shopifyApi<{ script_tag: ScriptTag }>(opts, "/script_tags.json", {
		method: "POST",
		body: JSON.stringify({
			script_tag: {
				event: "onload",
				src: scriptSrc,
				display_scope: "online_store",
			},
		}),
	});

	return data.script_tag;
}

/**
 * Remove a script tag from the Shopify storefront
 */
export async function removeScriptTag(opts: ShopifyApiOptions, scriptTagId: string): Promise<void> {
	await shopifyApi(opts, `/script_tags/${scriptTagId}.json`, {
		method: "DELETE",
	});
}

/**
 * Update script tag by removing old one and creating new one
 * (Shopify doesn't support updating script tag src directly)
 */
export async function updateScriptTag(
	opts: ShopifyApiOptions,
	oldScriptTagId: string | null,
	oldIdentificationScriptTagId: string | null,
	config: WidgetConfig,
): Promise<{ widgetScriptTag: ScriptTag; identificationScriptTag: ScriptTag }> {
	// Remove old script tags if they exist
	if (oldScriptTagId) {
		try {
			await removeScriptTag(opts, oldScriptTagId);
		} catch (err) {
			console.warn("Failed to remove old widget script tag:", err);
			// Continue anyway - might already be deleted
		}
	}

	if (oldIdentificationScriptTagId) {
		try {
			await removeScriptTag(opts, oldIdentificationScriptTagId);
		} catch (err) {
			console.warn("Failed to remove old identification script tag:", err);
			// Continue anyway - might already be deleted
		}
	}

	// Create new script tags with updated config
	return injectWidgetScriptTag(opts, config);
}

/**
 * Update widget script tags for all Shopify shops where this agent is primary
 * Note: Since we only pass agentId and apiUrl in the script URL, and the widget
 * fetches settings at runtime from the API, we typically don't need to call this
 * when interface settings change. Only call this if the widget URL changes.
 */
export async function updateWidgetForAgent(agentId: string): Promise<void> {
	const db = getDb();

	// Find all shops where this agent is the primary agent
	const shopsWithAgent = await db
		.select({
			shop: shopifyShops,
		})
		.from(shopifyShopAgents)
		.innerJoin(shopifyShops, eq(shopifyShops.id, shopifyShopAgents.shopId))
		.where(and(eq(shopifyShopAgents.agentId, agentId), eq(shopifyShopAgents.isPrimary, true)));

	const config: WidgetConfig = {
		agentId,
	};

	// Update each shop's script tag
	for (const { shop } of shopsWithAgent) {
		if (shop.status !== "active" || !shop.accessToken) {
			continue;
		}

		try {
			const { widgetScriptTag, identificationScriptTag } = await updateScriptTag(
				{ shop: shop.shopDomain, accessToken: shop.accessToken },
				shop.scriptTagId,
				shop.identificationScriptTagId,
				config,
			);

			// Update the stored script tag IDs
			await db
				.update(shopifyShops)
				.set({
					scriptTagId: String(widgetScriptTag.id),
					identificationScriptTagId: String(identificationScriptTag.id),
				})
				.where(eq(shopifyShops.id, shop.id));

			console.log(`Updated widget script tags for shop ${shop.shopDomain}`);
		} catch (err) {
			console.error(`Failed to update script tags for shop ${shop.shopDomain}:`, err);
		}
	}
}

/**
 * List all script tags for the shop
 */
export async function listScriptTags(opts: ShopifyApiOptions): Promise<ScriptTag[]> {
	const data = await shopifyApi<{ script_tags: ScriptTag[] }>(opts, "/script_tags.json");
	return data.script_tags;
}

// ============ APP METAFIELDS (for Theme App Extension) ============

/**
 * Get the current app installation GID.
 * Used as ownerId for app-owned metafields (accessible via app.metafields in Liquid).
 */
async function getAppInstallationId(opts: ShopifyApiOptions): Promise<string> {
	const query = `
		query {
			currentAppInstallation {
				id
			}
		}
	`;

	const response = await fetch(
		`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": opts.accessToken,
			},
			body: JSON.stringify({ query }),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		if (response.status === 401 || response.status === 403) {
			throw new ShopifyAuthError(opts.shop, `Shopify GraphQL auth error: ${error}`);
		}
		throw new Error(`Shopify GraphQL error fetching app installation: ${error}`);
	}

	const result = (await response.json()) as {
		data?: { currentAppInstallation: { id: string } };
		errors?: Array<{ message: string }>;
	};

	if (result.errors?.length) {
		throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
	}

	return result.data!.currentAppInstallation.id;
}

interface MetafieldsSetResponse {
	data?: {
		metafieldsSet: {
			metafields: Array<{ id: string; namespace: string; key: string; value: string }> | null;
			userErrors: Array<{ field: string[]; message: string }>;
		};
	};
	errors?: Array<{ message: string }>;
}

/**
 * Set the agent ID as an app-owned metafield on the shop.
 * The theme app extension reads this via {{ app.metafields.ansa.agent_id }}
 * to load the correct widget.
 */
export async function setAgentMetafield(opts: ShopifyApiOptions, agentId: string): Promise<void> {
	const mutation = `
		mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
			metafieldsSet(metafields: $metafields) {
				metafields {
					id
					namespace
					key
					value
				}
				userErrors {
					field
					message
				}
			}
		}
	`;

	// app.metafields in Liquid reads from the AppInstallation owner.
	// Fetch the current app installation GID to use as ownerId.
	const appInstallationId = await getAppInstallationId(opts);

	const variables = {
		metafields: [
			{
				namespace: "ansa",
				key: "agent_id",
				type: "single_line_text_field",
				value: agentId,
				ownerId: appInstallationId,
			},
		],
	};

	const response = await fetch(
		`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": opts.accessToken,
			},
			body: JSON.stringify({ query: mutation, variables }),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		if (response.status === 401 || response.status === 403) {
			throw new ShopifyAuthError(opts.shop, `Shopify GraphQL auth error: ${error}`);
		}
		throw new Error(`Shopify GraphQL error setting metafield: ${error}`);
	}

	const result = (await response.json()) as MetafieldsSetResponse;

	if (result.errors?.length) {
		throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
	}

	const userErrors = result.data?.metafieldsSet?.userErrors;
	if (userErrors?.length) {
		throw new Error(`Metafield user errors: ${userErrors.map((e) => e.message).join(", ")}`);
	}

	console.log(`[Shopify] Set ansa.agent_id metafield to ${agentId} for ${opts.shop}`);
}

/**
 * Ensure the ansa.agent_id metafield definition exists with storefront access.
 * Without this, app.metafields.ansa.agent_id is not visible in Liquid.
 */
export async function ensureAgentMetafieldDefinition(opts: ShopifyApiOptions): Promise<void> {
	const mutation = `
		mutation MetafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
			metafieldDefinitionCreate(definition: $definition) {
				createdDefinition {
					id
					namespace
					key
				}
				userErrors {
					field
					message
					code
				}
			}
		}
	`;

	const variables = {
		definition: {
			namespace: "ansa",
			key: "agent_id",
			name: "Ansa Agent ID",
			description: "The agent ID used by the Ansa chat widget",
			type: "single_line_text_field",
			ownerType: "APPINSTALLATION",
			access: {
				storefront: "PUBLIC_READ",
			},
		},
	};

	const response = await fetch(
		`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": opts.accessToken,
			},
			body: JSON.stringify({ query: mutation, variables }),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Shopify GraphQL error creating metafield definition: ${error}`);
	}

	const result = (await response.json()) as {
		data?: {
			metafieldDefinitionCreate: {
				createdDefinition: { id: string; namespace: string; key: string } | null;
				userErrors: Array<{ field: string[]; message: string; code: string }>;
			};
		};
		errors?: Array<{ message: string }>;
	};

	if (result.errors?.length) {
		throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
	}

	const userErrors = result.data?.metafieldDefinitionCreate?.userErrors;
	if (userErrors?.length) {
		// TAKEN is expected if definition already exists
		const nonTakenErrors = userErrors.filter((e) => e.code !== "TAKEN");
		if (nonTakenErrors.length) {
			throw new Error(
				`Metafield definition errors: ${nonTakenErrors.map((e) => e.message).join(", ")}`,
			);
		}
		console.log(`[Shopify] Metafield definition ansa.agent_id already exists for ${opts.shop}`);
		return;
	}

	console.log(`[Shopify] Created metafield definition ansa.agent_id for ${opts.shop}`);
}

/**
 * Remove the agent ID metafield from the shop.
 * Called on uninstall or when unlinking the agent.
 */
export async function removeAgentMetafield(opts: ShopifyApiOptions): Promise<void> {
	// First find the metafield to get its ID
	const query = `
		query {
			currentAppInstallation {
				metafields(first: 10, namespace: "ansa") {
					edges {
						node {
							id
							key
						}
					}
				}
			}
		}
	`;

	const findResponse = await fetch(
		`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": opts.accessToken,
			},
			body: JSON.stringify({ query }),
		},
	);

	if (!findResponse.ok) {
		console.warn("[Shopify] Failed to find metafields for removal:", await findResponse.text());
		return;
	}

	const findResult = (await findResponse.json()) as {
		data?: {
			currentAppInstallation: {
				metafields: { edges: Array<{ node: { id: string; key: string } }> };
			};
		};
	};

	const metafields = findResult.data?.currentAppInstallation?.metafields?.edges || [];
	const agentMetafield = metafields.find((e) => e.node.key === "agent_id");

	if (!agentMetafield) {
		console.log("[Shopify] No ansa.agent_id metafield found to remove");
		return;
	}

	// Delete it
	const deleteMutation = `
		mutation MetafieldDelete($input: MetafieldDeleteInput!) {
			metafieldDelete(input: $input) {
				deletedId
				userErrors {
					field
					message
				}
			}
		}
	`;

	const deleteResponse = await fetch(
		`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": opts.accessToken,
			},
			body: JSON.stringify({
				query: deleteMutation,
				variables: { input: { id: agentMetafield.node.id } },
			}),
		},
	);

	if (!deleteResponse.ok) {
		console.warn("[Shopify] Failed to delete metafield:", await deleteResponse.text());
		return;
	}

	console.log(`[Shopify] Removed ansa.agent_id metafield from ${opts.shop}`);
}

// ============ ORDER SYNC ============

interface ShopifyOrderData {
	id: number;
	name: string; // Order number like "#1001"
	email: string;
	financial_status: string;
	fulfillment_status: string | null;
	total_price: string;
	subtotal_price: string;
	total_tax: string;
	total_shipping_price_set?: { shop_money: { amount: string } };
	currency: string;
	line_items: Array<{
		id: number;
		title: string;
		quantity: number;
		price: string;
		sku?: string;
		variant_title?: string;
	}>;
	shipping_address?: {
		name?: string;
		address1?: string;
		address2?: string;
		city?: string;
		province?: string;
		country?: string;
		zip?: string;
		phone?: string;
	};
	fulfillments?: Array<{
		tracking_number?: string;
		tracking_url?: string;
		tracking_company?: string;
	}>;
	cancelled_at?: string;
	closed_at?: string;
	created_at: string;
	updated_at: string;
	customer?: {
		id: number;
		email: string;
	};
}

/**
 * Fetch orders from the last N days
 */
export async function fetchRecentOrders(
	opts: ShopifyApiOptions,
	days: number = 30,
): Promise<ShopifyOrderData[]> {
	const sinceDate = new Date();
	sinceDate.setDate(sinceDate.getDate() - days);
	const createdAtMin = sinceDate.toISOString();

	const allOrders: ShopifyOrderData[] = [];
	let pageInfo: string | null = null;

	do {
		const endpoint = pageInfo
			? `/orders.json?page_info=${pageInfo}&limit=250`
			: `/orders.json?created_at_min=${createdAtMin}&limit=250&status=any`;

		const url = `https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}${endpoint}`;
		console.log(`[Shopify] Fetching orders from: ${url}`);

		const response = await fetch(url, {
			headers: {
				"X-Shopify-Access-Token": opts.accessToken,
			},
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`[Shopify] Order fetch failed: ${response.status} - ${errorBody}`);
			if (response.status === 403) {
				console.warn(
					`[Shopify] Missing read_orders permission for ${opts.shop}. Please reinstall the app to grant order access.`,
				);
				return [];
			}
			throw new Error(`Failed to fetch orders: ${response.status}`);
		}

		const data = (await response.json()) as { orders: ShopifyOrderData[] };
		console.log(`[Shopify] Fetched ${data.orders.length} orders from ${opts.shop}`);
		allOrders.push(...data.orders);

		// Check for next page
		const linkHeader = response.headers.get("link");
		if (linkHeader?.includes('rel="next"')) {
			const match = linkHeader.match(/page_info=([^>&]+)/);
			pageInfo = match ? match[1] : null;
		} else {
			pageInfo = null;
		}
	} while (pageInfo);

	return allOrders;
}

/**
 * Transform Shopify order data to our schema format
 */
export function transformOrderToSchema(
	shopId: string,
	order: ShopifyOrderData,
	customerId?: string,
): NewShopifyOrder {
	const fulfillment = order.fulfillments?.[0];

	return {
		shopId,
		shopifyOrderId: String(order.id),
		orderNumber: order.name,
		customerEmail: order.email,
		customerId: customerId || null,
		financialStatus: order.financial_status,
		fulfillmentStatus: order.fulfillment_status,
		totalPrice: order.total_price,
		subtotalPrice: order.subtotal_price,
		totalTax: order.total_tax,
		totalShipping: order.total_shipping_price_set?.shop_money?.amount,
		currency: order.currency,
		lineItems: order.line_items.map((item) => ({
			id: String(item.id),
			title: item.title,
			quantity: item.quantity,
			price: item.price,
			sku: item.sku,
			variantTitle: item.variant_title,
		})),
		shippingAddress: order.shipping_address
			? {
					name: order.shipping_address.name,
					address1: order.shipping_address.address1,
					address2: order.shipping_address.address2,
					city: order.shipping_address.city,
					province: order.shipping_address.province,
					country: order.shipping_address.country,
					zip: order.shipping_address.zip,
					phone: order.shipping_address.phone,
				}
			: undefined,
		trackingNumber: fulfillment?.tracking_number,
		trackingUrl: fulfillment?.tracking_url,
		trackingCompany: fulfillment?.tracking_company,
		cancelledAt: order.cancelled_at ? new Date(order.cancelled_at) : null,
		closedAt: order.closed_at ? new Date(order.closed_at) : null,
		shopifyCreatedAt: new Date(order.created_at),
		shopifyUpdatedAt: new Date(order.updated_at),
	};
}

// ============ CUSTOMER SYNC ============

interface ShopifyCustomerData {
	id: number;
	email: string;
	first_name: string;
	last_name: string;
	phone?: string;
	orders_count: number;
	total_spent: string;
	currency: string;
	tags: string;
	note?: string;
	accepts_marketing: boolean;
	created_at: string;
}

/**
 * Fetch customers from Shopify
 */
export async function fetchCustomers(
	opts: ShopifyApiOptions,
	limit: number = 250,
): Promise<ShopifyCustomerData[]> {
	const allCustomers: ShopifyCustomerData[] = [];
	let pageInfo: string | null = null;

	do {
		const endpoint = pageInfo
			? `/customers.json?page_info=${pageInfo}&limit=${limit}`
			: `/customers.json?limit=${limit}`;

		const url = `https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}${endpoint}`;
		console.log(`[Shopify] Fetching customers from: ${url}`);

		const response = await fetch(url, {
			headers: {
				"X-Shopify-Access-Token": opts.accessToken,
			},
		});

		if (!response.ok) {
			const errorBody = await response.text();
			console.error(`[Shopify] Customer fetch failed: ${response.status} - ${errorBody}`);
			if (response.status === 403) {
				console.warn(
					`[Shopify] Missing read_customers permission for ${opts.shop}. Please reinstall the app to grant customer access.`,
				);
				return [];
			}
			throw new Error(`Failed to fetch customers: ${response.status}`);
		}

		const data = (await response.json()) as { customers: ShopifyCustomerData[] };
		console.log(`[Shopify] Fetched ${data.customers.length} customers from ${opts.shop}`);
		allCustomers.push(...data.customers);

		// Check for next page
		const linkHeader = response.headers.get("link");
		if (linkHeader?.includes('rel="next"')) {
			const match = linkHeader.match(/page_info=([^>&]+)/);
			pageInfo = match ? match[1] : null;
		} else {
			pageInfo = null;
		}
	} while (pageInfo);

	console.log(`[Shopify] Total customers fetched for ${opts.shop}: ${allCustomers.length}`);
	return allCustomers;
}

// ============ PRODUCT DATA ============

interface ShopifyVariantData {
	id: number;
	title: string;
	price: string;
	compare_at_price?: string;
	sku?: string;
	inventory_quantity: number;
	option1?: string;
	option2?: string;
	option3?: string;
}

interface ShopifyImageData {
	id: number;
	src: string;
	alt?: string;
	position: number;
}

interface ShopifyProductData {
	id: number;
	title: string;
	handle: string;
	body_html?: string;
	vendor?: string;
	product_type?: string;
	status: string;
	tags: string;
	variants: ShopifyVariantData[];
	images: ShopifyImageData[];
	created_at: string;
	updated_at: string;
	published_at?: string | null; // null = not published to online store
}

/**
 * Fetch products from Shopify
 */
export async function fetchProducts(
	opts: ShopifyApiOptions,
	limit: number = 250,
): Promise<ShopifyProductData[]> {
	const allProducts: ShopifyProductData[] = [];
	let pageInfo: string | null = null;

	do {
		const endpoint = pageInfo
			? `/products.json?page_info=${pageInfo}&limit=${limit}`
			: `/products.json?limit=${limit}`;

		const response = await fetch(
			`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}${endpoint}`,
			{
				headers: {
					"X-Shopify-Access-Token": opts.accessToken,
				},
			},
		);

		if (!response.ok) {
			if (response.status === 403) {
				console.warn(
					`[Shopify] Missing read_products permission for ${opts.shop}. Please reinstall the app.`,
				);
				return [];
			}
			throw new Error(`Failed to fetch products: ${response.status}`);
		}

		const data = (await response.json()) as { products: ShopifyProductData[] };
		allProducts.push(...data.products);

		// Check for next page
		const linkHeader = response.headers.get("link");
		if (linkHeader?.includes('rel="next"')) {
			const match = linkHeader.match(/page_info=([^>&]+)/);
			pageInfo = match ? match[1] : null;
		} else {
			pageInfo = null;
		}
	} while (pageInfo);

	return allProducts;
}

/**
 * Fetch product count from Shopify
 */
export async function fetchProductCount(opts: ShopifyApiOptions): Promise<number> {
	try {
		const response = await fetch(
			`https://${opts.shop}/admin/api/${shopifyConfig.apiVersion}/products/count.json`,
			{
				headers: {
					"X-Shopify-Access-Token": opts.accessToken,
				},
			},
		);

		if (!response.ok) {
			return 0;
		}

		const data = (await response.json()) as { count: number };
		return data.count;
	} catch {
		return 0;
	}
}

/**
 * Transform Shopify product data to our schema format
 */
export function transformProductToSchema(
	shopId: string,
	product: ShopifyProductData,
): NewShopifyProduct {
	return {
		shopId,
		shopifyProductId: String(product.id),
		title: product.title,
		handle: product.handle,
		description: product.body_html || null,
		vendor: product.vendor || null,
		productType: product.product_type || null,
		status: product.status,
		tags: product.tags ? product.tags.split(", ").filter(Boolean) : [],
		variants: product.variants.map((v) => ({
			id: String(v.id),
			title: v.title,
			price: v.price,
			compareAtPrice: v.compare_at_price,
			sku: v.sku,
			inventoryQuantity: v.inventory_quantity,
			option1: v.option1,
			option2: v.option2,
			option3: v.option3,
		})),
		images: product.images.map((img) => ({
			id: String(img.id),
			src: img.src,
			alt: img.alt,
			position: img.position,
		})),
		shopifyCreatedAt: new Date(product.created_at),
		shopifyUpdatedAt: new Date(product.updated_at),
		publishedAt: product.published_at ? new Date(product.published_at) : null,
	};
}

/**
 * Transform Shopify customer data to our schema format
 */
export function transformCustomerToSchema(
	shopId: string,
	customer: ShopifyCustomerData,
): NewShopifyCustomer {
	return {
		shopId,
		shopifyCustomerId: String(customer.id),
		email: customer.email,
		firstName: customer.first_name,
		lastName: customer.last_name,
		phone: customer.phone,
		ordersCount: customer.orders_count,
		totalSpent: customer.total_spent,
		currency: customer.currency,
		tags: customer.tags ? customer.tags.split(",").map((t) => t.trim()) : [],
		note: customer.note,
		acceptsMarketing: customer.accepts_marketing,
		shopifyCreatedAt: new Date(customer.created_at),
	};
}

// ============ REFUNDS ============

interface RefundLineItem {
	line_item_id: number;
	quantity: number;
	restock_type?: "no_restock" | "cancel" | "return";
}

interface CreateRefundParams {
	orderId: string;
	reason?: string;
	notify?: boolean;
	refundLineItems?: RefundLineItem[];
	shipping?: { full_refund?: boolean; amount?: string };
}

/**
 * Create a refund for an order
 */
export async function createRefund(
	opts: ShopifyApiOptions,
	params: CreateRefundParams,
): Promise<{ refund: { id: number } }> {
	// First, calculate the refund
	const calculateResponse = await shopifyApi<{
		refund: {
			transactions: Array<{ amount: string; kind: string }>;
		};
	}>(opts, `/orders/${params.orderId}/refunds/calculate.json`, {
		method: "POST",
		body: JSON.stringify({
			refund: {
				refund_line_items: params.refundLineItems,
				shipping: params.shipping,
			},
		}),
	});

	// Then create the actual refund
	const refundData = await shopifyApi<{ refund: { id: number } }>(
		opts,
		`/orders/${params.orderId}/refunds.json`,
		{
			method: "POST",
			body: JSON.stringify({
				refund: {
					notify: params.notify ?? true,
					note: params.reason,
					refund_line_items: params.refundLineItems,
					shipping: params.shipping,
					transactions: calculateResponse.refund.transactions,
				},
			}),
		},
	);

	return refundData;
}

// ============ BACKFILL JOB ============

/**
 * Sync orders, customers, and products from Shopify (30-day backfill for orders)
 */
export async function syncShopData(
	shop: ShopifyShop,
): Promise<{ orders: number; customers: number; products: number }> {
	const db = getDb();
	const opts = { shop: shop.shopDomain, accessToken: shop.accessToken };

	// Fetch customers first (so we can link them to orders)
	console.log(`[Shopify Sync] Fetching customers for ${shop.shopDomain}...`);
	const customers = await fetchCustomers(opts);

	const customerIdMap = new Map<string, string>(); // shopifyCustomerId -> our DB id

	for (const customer of customers) {
		const customerData = transformCustomerToSchema(shop.id, customer);
		const [inserted] = await db
			.insert(shopifyCustomers)
			.values(customerData)
			.onConflictDoUpdate({
				target: [shopifyCustomers.shopId, shopifyCustomers.shopifyCustomerId],
				set: {
					email: customerData.email,
					firstName: customerData.firstName,
					lastName: customerData.lastName,
					phone: customerData.phone,
					ordersCount: customerData.ordersCount,
					totalSpent: customerData.totalSpent,
					tags: customerData.tags,
					note: customerData.note,
					acceptsMarketing: customerData.acceptsMarketing,
					updatedAt: new Date(),
				},
			})
			.returning({ id: shopifyCustomers.id });

		if (inserted) {
			customerIdMap.set(String(customer.id), inserted.id);
		}
	}

	// Fetch orders from last 30 days
	console.log(`[Shopify Sync] Fetching orders for ${shop.shopDomain}...`);
	const orders = await fetchRecentOrders(opts, 30);

	for (const order of orders) {
		const customerId = order.customer?.id
			? customerIdMap.get(String(order.customer.id))
			: undefined;
		const orderData = transformOrderToSchema(shop.id, order, customerId);

		await db
			.insert(shopifyOrders)
			.values(orderData)
			.onConflictDoUpdate({
				target: [shopifyOrders.shopId, shopifyOrders.shopifyOrderId],
				set: {
					financialStatus: orderData.financialStatus,
					fulfillmentStatus: orderData.fulfillmentStatus,
					trackingNumber: orderData.trackingNumber,
					trackingUrl: orderData.trackingUrl,
					trackingCompany: orderData.trackingCompany,
					cancelledAt: orderData.cancelledAt,
					closedAt: orderData.closedAt,
					shopifyUpdatedAt: orderData.shopifyUpdatedAt,
					updatedAt: new Date(),
				},
			});
	}

	// Fetch all products
	console.log(`[Shopify Sync] Fetching products for ${shop.shopDomain}...`);
	const products = await fetchProducts(opts);

	for (const product of products) {
		const productData = transformProductToSchema(shop.id, product);

		await db
			.insert(shopifyProducts)
			.values(productData)
			.onConflictDoUpdate({
				target: [shopifyProducts.shopId, shopifyProducts.shopifyProductId],
				set: {
					title: productData.title,
					handle: productData.handle,
					description: productData.description,
					vendor: productData.vendor,
					productType: productData.productType,
					status: productData.status,
					tags: productData.tags,
					variants: productData.variants,
					images: productData.images,
					shopifyUpdatedAt: productData.shopifyUpdatedAt,
					updatedAt: new Date(),
				},
			});
	}

	// Update last sync time
	await db.update(shopifyShops).set({ lastSyncAt: new Date() }).where(eq(shopifyShops.id, shop.id));

	console.log(
		`[Shopify Sync] Completed for ${shop.shopDomain}: ${customers.length} customers, ${orders.length} orders, ${products.length} products`,
	);

	return { orders: orders.length, customers: customers.length, products: products.length };
}

// ============ CONTEXT ENRICHMENT ============

/**
 * Get customer context for a conversation (by email)
 */
export async function getCustomerContext(
	shopId: string,
	email: string,
): Promise<{
	customer: typeof shopifyCustomers.$inferSelect | null;
	recentOrders: Array<typeof shopifyOrders.$inferSelect>;
}> {
	const db = getDb();

	// Find customer
	const [customer] = await db
		.select()
		.from(shopifyCustomers)
		.where(and(eq(shopifyCustomers.shopId, shopId), eq(shopifyCustomers.email, email)))
		.limit(1);

	// Find recent orders
	const recentOrders = await db
		.select()
		.from(shopifyOrders)
		.where(and(eq(shopifyOrders.shopId, shopId), eq(shopifyOrders.customerEmail, email)))
		.orderBy(desc(shopifyOrders.shopifyCreatedAt))
		.limit(10);

	return { customer: customer || null, recentOrders };
}

/**
 * Find shop by agent ID (for widget context)
 */
export async function getShopByAgentId(agentId: string): Promise<ShopifyShop | null> {
	const db = getDb();

	const [shopAgent] = await db
		.select({ shopId: shopifyShopAgents.shopId })
		.from(shopifyShopAgents)
		.where(eq(shopifyShopAgents.agentId, agentId))
		.limit(1);

	if (!shopAgent) return null;

	const [shop] = await db
		.select()
		.from(shopifyShops)
		.where(eq(shopifyShops.id, shopAgent.shopId))
		.limit(1);

	return shop || null;
}

// ============ SHOPIFY BILLING API ============

/**
 * Map Shopify Managed Pricing plan display names to internal plan IDs.
 * Update these if you rename plans in the Partner Dashboard.
 */
export const SHOPIFY_PLAN_NAME_MAP: Record<string, string> = {
	Free: "free",
	"Free Plan": "free",
	Starter: "starter",
	"Starter Plan": "starter",
	Growth: "growth",
	"Growth Plan": "growth",
	Pro: "pro",
	"Pro Plan": "pro",
};

interface AppSubscriptionResponse {
	data?: {
		node: {
			id: string;
			name: string;
			status: string;
			currentPeriodEnd: string;
		} | null;
	};
	errors?: Array<{ message: string }>;
}

/**
 * Get the status of an App Subscription
 */
export async function getAppSubscription(
	options: ShopifyApiOptions,
	chargeId: string,
): Promise<{ name: string; status: string; currentPeriodEnd: Date } | null> {
	const query = `
		query getSubscription($id: ID!) {
			node(id: $id) {
				... on AppSubscription {
					id
					name
					status
					currentPeriodEnd
				}
			}
		}
	`;

	const gid = chargeId.startsWith("gid://")
		? chargeId
		: `gid://shopify/AppSubscription/${chargeId}`;

	const response = await fetch(
		`https://${options.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": options.accessToken,
			},
			body: JSON.stringify({ query, variables: { id: gid } }),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Shopify GraphQL error: ${error}`);
	}

	const result = (await response.json()) as AppSubscriptionResponse;

	if (result.errors?.length) {
		throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
	}

	const node = result.data?.node;
	if (!node) {
		return null;
	}

	return {
		name: node.name,
		status: node.status,
		currentPeriodEnd: new Date(node.currentPeriodEnd),
	};
}

interface ActiveSubscriptionsResponse {
	data?: {
		currentAppInstallation: {
			activeSubscriptions: Array<{
				id: string;
				name: string;
				status: string;
				currentPeriodEnd: string;
			}>;
		};
	};
	errors?: Array<{ message: string }>;
}

/**
 * Get the currently active subscription for a shop (no charge ID needed).
 * Uses the currentAppInstallation query to fetch activeSubscriptions.
 */
export async function getActiveShopSubscription(
	options: ShopifyApiOptions,
): Promise<{ name: string; status: string; id: string; currentPeriodEnd: Date } | null> {
	const query = `
		query {
			currentAppInstallation {
				activeSubscriptions {
					id
					name
					status
					currentPeriodEnd
				}
			}
		}
	`;

	const response = await fetch(
		`https://${options.shop}/admin/api/${shopifyConfig.apiVersion}/graphql.json`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Shopify-Access-Token": options.accessToken,
			},
			body: JSON.stringify({ query }),
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Shopify GraphQL error: ${error}`);
	}

	const result = (await response.json()) as ActiveSubscriptionsResponse;

	if (result.errors?.length) {
		throw new Error(`GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`);
	}

	const subs = result.data?.currentAppInstallation?.activeSubscriptions;
	if (!subs || subs.length === 0) {
		return null;
	}

	// Return the first active subscription
	const sub = subs[0];
	return {
		name: sub.name,
		status: sub.status,
		id: sub.id,
		currentPeriodEnd: new Date(sub.currentPeriodEnd),
	};
}
