import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load env from project root BEFORE importing db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

const { getDb, toolTemplates } = await import("@ansa/db");
type NewToolTemplate = (typeof toolTemplates)["$inferInsert"];

const marketplaceTools: Omit<NewToolTemplate, "id" | "createdAt" | "updatedAt">[] = [
	{
		slug: "url-fetcher",
		name: "URL Fetcher",
		description: "Fetch and read content from web pages",
		longDescription:
			"Enable your agent to fetch content from URLs. Useful for reading articles, documentation, or any public web page. No API key required.",
		category: "search",
		icon: "link",
		toolName: "fetch_url",
		toolDescription: "Fetch the content of a web page. Returns the main text content of the page.",
		inputSchema: {
			type: "object" as const,
			properties: {
				url: {
					type: "string",
					description: "The URL of the web page to fetch",
				},
			},
			required: ["url"],
		},
		executionType: "http",
		httpUrl: "https://r.jina.ai/${url}",
		httpMethod: "GET",
		httpHeaders: { Accept: "text/plain" },
		requiredConfig: [],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "currency-converter",
		name: "Currency Converter",
		description: "Convert between different currencies",
		longDescription:
			"Allow your agent to convert amounts between different currencies using real-time exchange rates. Uses the free ExchangeRate API.",
		category: "data",
		icon: "coins",
		toolName: "convert_currency",
		toolDescription: "Convert an amount from one currency to another using current exchange rates.",
		inputSchema: {
			type: "object" as const,
			properties: {
				amount: {
					type: "number",
					description: "The amount to convert",
				},
				from: {
					type: "string",
					description: "The source currency code (e.g., USD, EUR, GBP)",
				},
				to: {
					type: "string",
					description: "The target currency code (e.g., USD, EUR, GBP)",
				},
			},
			required: ["amount", "from", "to"],
		},
		executionType: "http",
		httpUrl: "https://api.exchangerate-api.com/v4/latest/${from}",
		httpMethod: "GET",
		httpHeaders: {},
		requiredConfig: [],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "order-lookup",
		name: "Order Lookup",
		description: "Look up order status (template for your API)",
		longDescription:
			"A template tool for looking up order information. Configure this with your own order management API to allow customers to check their order status.",
		category: "ecommerce",
		icon: "package",
		toolName: "lookup_order",
		toolDescription: "Look up the status of an order by order ID or email address.",
		inputSchema: {
			type: "object" as const,
			properties: {
				order_id: {
					type: "string",
					description: "The order ID or order number",
				},
				email: {
					type: "string",
					description: "The customer email address (optional, for verification)",
				},
			},
			required: ["order_id"],
		},
		executionType: "http",
		httpUrl: "${api_url}/orders/${order_id}",
		httpMethod: "GET",
		httpHeaders: { Authorization: "Bearer ${api_key}" },
		requiredConfig: [
			{
				key: "api_url",
				label: "Your API Base URL",
				type: "url" as const,
				placeholder: "https://api.yourstore.com",
				helpText: "The base URL of your order management API",
			},
			{
				key: "api_key",
				label: "API Key",
				type: "password" as const,
				placeholder: "Your API key",
				helpText: "Authentication key for your API",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "send-email",
		name: "Send Email",
		description: "Send email notifications",
		longDescription:
			"Enable your agent to send emails. Great for notifications, follow-ups, or automated responses. Powered by Resend, a modern email API.",
		category: "communication",
		icon: "mail",
		toolName: "send_email",
		toolDescription:
			"Send an email to a recipient. Use this when a user requests to be contacted by email or needs a follow-up.",
		inputSchema: {
			type: "object" as const,
			properties: {
				to: {
					type: "string",
					description: "The recipient email address",
				},
				subject: {
					type: "string",
					description: "The email subject line",
				},
				body: {
					type: "string",
					description: "The email body content",
				},
			},
			required: ["to", "subject", "body"],
		},
		executionType: "http",
		httpUrl: "https://api.resend.com/emails",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${api_key}",
		},
		requiredConfig: [
			{
				key: "api_key",
				label: "Resend API Key",
				type: "password" as const,
				placeholder: "re_...",
				helpText: "Get an API key from Resend",
				helpUrl: "https://resend.com/",
			},
			{
				key: "from_email",
				label: "From Email",
				type: "text" as const,
				placeholder: "noreply@yourdomain.com",
				helpText: "The sender email address (must be verified in Resend)",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	// ============ NEW INTEGRATIONS ============
	{
		slug: "slack-notification",
		name: "Slack Notification",
		description: "Send messages to Slack channels",
		longDescription:
			"Enable your agent to send notifications to Slack channels. Great for alerting teams, escalating issues, or keeping stakeholders informed. Uses Slack Incoming Webhooks.",
		category: "communication",
		icon: "message-square",
		toolName: "send_slack_message",
		toolDescription:
			"Send a message to a Slack channel. Use this when you need to notify a team, escalate an issue, or share information with colleagues.",
		inputSchema: {
			type: "object" as const,
			properties: {
				message: {
					type: "string",
					description: "The message to send to Slack",
				},
				channel: {
					type: "string",
					description: "Optional: Override the default channel (e.g., #support)",
				},
			},
			required: ["message"],
		},
		executionType: "http",
		httpUrl: "${webhook_url}",
		httpMethod: "POST",
		httpHeaders: { "Content-Type": "application/json" },
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Slack Webhook URL",
				type: "url" as const,
				placeholder: "https://hooks.slack.com/services/...",
				helpText: "Create an Incoming Webhook in your Slack workspace",
				helpUrl: "https://api.slack.com/messaging/webhooks",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "support_escalation",
	},
	{
		slug: "zendesk-ticket",
		name: "Create Zendesk Ticket",
		description: "Create support tickets in Zendesk",
		longDescription:
			"Allow your agent to create support tickets in Zendesk when issues need human attention. Automatically captures conversation context and customer information.",
		category: "support",
		icon: "ticket",
		toolName: "create_zendesk_ticket",
		toolDescription:
			"Create a support ticket in Zendesk. Use this when a customer issue needs to be escalated to a human agent or tracked for follow-up.",
		inputSchema: {
			type: "object" as const,
			properties: {
				subject: {
					type: "string",
					description: "The ticket subject/title",
				},
				description: {
					type: "string",
					description: "Detailed description of the issue",
				},
				priority: {
					type: "string",
					description: "Ticket priority: low, normal, high, or urgent",
				},
				requester_email: {
					type: "string",
					description: "The customer's email address",
				},
				requester_name: {
					type: "string",
					description: "The customer's name",
				},
			},
			required: ["subject", "description"],
		},
		executionType: "http",
		httpUrl: "https://${subdomain}.zendesk.com/api/v2/tickets.json",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Basic ${api_token}",
		},
		requiredConfig: [
			{
				key: "subdomain",
				label: "Zendesk Subdomain",
				type: "text" as const,
				placeholder: "yourcompany",
				helpText: "Your Zendesk subdomain (e.g., 'yourcompany' from yourcompany.zendesk.com)",
			},
			{
				key: "api_token",
				label: "API Token (Base64)",
				type: "password" as const,
				placeholder: "Base64 encoded email:token",
				helpText: "Base64 encode your email/token as: email@example.com/token:your_api_token",
				helpUrl: "https://developer.zendesk.com/api-reference/introduction/security-and-auth/",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	{
		slug: "intercom-ticket",
		name: "Create Intercom Conversation",
		description: "Create conversations in Intercom",
		longDescription:
			"Enable your agent to create or update conversations in Intercom. Perfect for escalating to human support or tracking customer interactions.",
		category: "support",
		icon: "message-circle",
		toolName: "create_intercom_conversation",
		toolDescription:
			"Create a new conversation in Intercom. Use this to escalate issues to human support or log important customer interactions.",
		inputSchema: {
			type: "object" as const,
			properties: {
				message: {
					type: "string",
					description: "The message content for the conversation",
				},
				user_email: {
					type: "string",
					description: "The customer's email address",
				},
				user_name: {
					type: "string",
					description: "The customer's name",
				},
			},
			required: ["message", "user_email"],
		},
		executionType: "http",
		httpUrl: "https://api.intercom.io/conversations",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${access_token}",
			"Intercom-Version": "2.11",
		},
		requiredConfig: [
			{
				key: "access_token",
				label: "Intercom Access Token",
				type: "password" as const,
				placeholder: "dG9rOjEyMzQ...",
				helpText: "Get your access token from Intercom Developer Hub",
				helpUrl: "https://developers.intercom.com/docs/build-an-integration/getting-started/",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	{
		slug: "hubspot-contact-lookup",
		name: "HubSpot Contact Lookup",
		description: "Look up contacts in HubSpot CRM",
		longDescription:
			"Allow your agent to look up customer information from HubSpot CRM. Great for providing personalized support based on customer history and context.",
		category: "crm",
		icon: "users",
		toolName: "hubspot_lookup_contact",
		toolDescription:
			"Look up a contact in HubSpot CRM by email. Returns contact details, company info, and recent activity.",
		inputSchema: {
			type: "object" as const,
			properties: {
				email: {
					type: "string",
					description: "The email address to search for",
				},
			},
			required: ["email"],
		},
		executionType: "http",
		httpUrl: "https://api.hubapi.com/crm/v3/objects/contacts/search",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${access_token}",
		},
		requiredConfig: [
			{
				key: "access_token",
				label: "HubSpot Access Token",
				type: "password" as const,
				placeholder: "pat-na1-...",
				helpText: "Create a Private App in HubSpot to get an access token",
				helpUrl: "https://developers.hubspot.com/docs/api/private-apps",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "hubspot-create-contact",
		name: "HubSpot Create Contact",
		description: "Create new contacts in HubSpot CRM",
		longDescription:
			"Enable your agent to create new contacts in HubSpot CRM. Capture lead information directly from chat conversations.",
		category: "crm",
		icon: "user-plus",
		toolName: "hubspot_create_contact",
		toolDescription:
			"Create a new contact in HubSpot CRM. Use this to capture lead information from the conversation.",
		inputSchema: {
			type: "object" as const,
			properties: {
				email: {
					type: "string",
					description: "The contact's email address",
				},
				firstname: {
					type: "string",
					description: "The contact's first name",
				},
				lastname: {
					type: "string",
					description: "The contact's last name",
				},
				phone: {
					type: "string",
					description: "The contact's phone number",
				},
				company: {
					type: "string",
					description: "The contact's company name",
				},
			},
			required: ["email"],
		},
		executionType: "http",
		httpUrl: "https://api.hubapi.com/crm/v3/objects/contacts",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${access_token}",
		},
		requiredConfig: [
			{
				key: "access_token",
				label: "HubSpot Access Token",
				type: "password" as const,
				placeholder: "pat-na1-...",
				helpText: "Create a Private App in HubSpot to get an access token",
				helpUrl: "https://developers.hubspot.com/docs/api/private-apps",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "google-calendar-events",
		name: "Google Calendar - List Events",
		description: "List upcoming calendar events",
		longDescription:
			"Allow your agent to check calendar availability and list upcoming events. Great for scheduling assistants and booking tools.",
		category: "productivity",
		icon: "calendar",
		toolName: "google_calendar_list_events",
		toolDescription:
			"List upcoming events from Google Calendar. Use this to check availability or show scheduled meetings.",
		inputSchema: {
			type: "object" as const,
			properties: {
				max_results: {
					type: "number",
					description: "Maximum number of events to return (default: 10)",
				},
				time_min: {
					type: "string",
					description: "Start time in ISO format (default: now)",
				},
				time_max: {
					type: "string",
					description: "End time in ISO format",
				},
			},
			required: [],
		},
		executionType: "http",
		httpUrl:
			"https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${max_results}&timeMin=${time_min}&orderBy=startTime&singleEvents=true",
		httpMethod: "GET",
		httpHeaders: {
			Authorization: "Bearer ${access_token}",
		},
		requiredConfig: [
			{
				key: "access_token",
				label: "Google OAuth Access Token",
				type: "password" as const,
				placeholder: "ya29...",
				helpText: "Use OAuth 2.0 to get an access token with calendar.readonly scope",
				helpUrl: "https://developers.google.com/calendar/api/quickstart/js",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "google-calendar-create",
		name: "Google Calendar - Create Event",
		description: "Create new calendar events",
		longDescription:
			"Enable your agent to create new events in Google Calendar. Perfect for booking meetings, scheduling appointments, or setting reminders.",
		category: "productivity",
		icon: "calendar-plus",
		toolName: "google_calendar_create_event",
		toolDescription:
			"Create a new event in Google Calendar. Use this to schedule meetings or appointments.",
		inputSchema: {
			type: "object" as const,
			properties: {
				summary: {
					type: "string",
					description: "The title of the event",
				},
				description: {
					type: "string",
					description: "Description or notes for the event",
				},
				start_time: {
					type: "string",
					description: "Start time in ISO format (e.g., 2024-12-20T10:00:00Z)",
				},
				end_time: {
					type: "string",
					description: "End time in ISO format",
				},
				attendees: {
					type: "string",
					description: "Comma-separated list of attendee email addresses",
				},
			},
			required: ["summary", "start_time", "end_time"],
		},
		executionType: "http",
		httpUrl: "https://www.googleapis.com/calendar/v3/calendars/primary/events",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${access_token}",
		},
		requiredConfig: [
			{
				key: "access_token",
				label: "Google OAuth Access Token",
				type: "password" as const,
				placeholder: "ya29...",
				helpText: "Use OAuth 2.0 to get an access token with calendar.events scope",
				helpUrl: "https://developers.google.com/calendar/api/quickstart/js",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "shopify-order-lookup",
		name: "Shopify Order Lookup",
		description: "Look up orders in Shopify",
		longDescription:
			"Allow your agent to look up order details from Shopify. Perfect for e-commerce support to check order status, tracking, and fulfillment info.",
		category: "ecommerce",
		icon: "shopping-bag",
		toolName: "shopify_lookup_order",
		toolDescription:
			"Look up an order in Shopify by order number. Returns order status, items, shipping info, and tracking.",
		inputSchema: {
			type: "object" as const,
			properties: {
				order_number: {
					type: "string",
					description: "The order number (e.g., #1001)",
				},
				email: {
					type: "string",
					description: "Customer email for verification (optional)",
				},
			},
			required: ["order_number"],
		},
		executionType: "http",
		httpUrl: "https://${shop_domain}/admin/api/2024-01/orders.json?name=${order_number}",
		httpMethod: "GET",
		httpHeaders: {
			"Content-Type": "application/json",
			"X-Shopify-Access-Token": "${access_token}",
		},
		requiredConfig: [
			{
				key: "shop_domain",
				label: "Shop Domain",
				type: "text" as const,
				placeholder: "your-store.myshopify.com",
				helpText: "Your Shopify store domain",
			},
			{
				key: "access_token",
				label: "Admin API Access Token",
				type: "password" as const,
				placeholder: "shpat_...",
				helpText: "Create a custom app in Shopify Admin to get an access token",
				helpUrl: "https://shopify.dev/docs/apps/auth/admin-app-access-tokens",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "shopify-refund-request",
		name: "Shopify Refund Request",
		description: "Request a refund for a Shopify order",
		longDescription:
			"Enable your agent to process refund requests for Shopify orders. Supports configurable auto-approval thresholds - refunds under the limit are processed automatically, larger refunds are queued for manual approval.",
		category: "ecommerce",
		icon: "rotate-ccw",
		toolName: "shopify_request_refund",
		toolDescription:
			"Request a refund for a Shopify order. Provide the order number and refund reason. Small refunds may be auto-approved based on your settings.",
		inputSchema: {
			type: "object" as const,
			properties: {
				order_number: {
					type: "string",
					description: "The order number to refund (e.g., #1001)",
				},
				reason: {
					type: "string",
					description: "The reason for the refund",
				},
				amount: {
					type: "number",
					description: "The refund amount in dollars (optional - defaults to full refund)",
				},
				notify_customer: {
					type: "boolean",
					description: "Whether to notify the customer about the refund (default: true)",
				},
			},
			required: ["order_number", "reason"],
		},
		executionType: "http",
		httpUrl: "${api_url}/shopify/internal/refund",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${api_key}",
		},
		requiredConfig: [
			{
				key: "api_url",
				label: "Ansa API URL",
				type: "url" as const,
				placeholder: "https://api.ansa.so",
				helpText: "Your Ansa API endpoint",
			},
			{
				key: "api_key",
				label: "API Key",
				type: "password" as const,
				placeholder: "ansa_...",
				helpText: "Your Ansa API key (found in settings)",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	{
		slug: "stripe-payment-lookup",
		name: "Stripe Payment Lookup",
		description: "Look up payments in Stripe",
		longDescription:
			"Enable your agent to look up payment information from Stripe. Check payment status, refund eligibility, and transaction details.",
		category: "ecommerce",
		icon: "credit-card",
		toolName: "stripe_lookup_payment",
		toolDescription:
			"Look up a payment in Stripe by payment intent ID or charge ID. Returns payment status, amount, and refund info.",
		inputSchema: {
			type: "object" as const,
			properties: {
				payment_id: {
					type: "string",
					description: "The payment intent ID (pi_...) or charge ID (ch_...)",
				},
			},
			required: ["payment_id"],
		},
		executionType: "http",
		httpUrl: "https://api.stripe.com/v1/payment_intents/${payment_id}",
		httpMethod: "GET",
		httpHeaders: {
			Authorization: "Bearer ${secret_key}",
		},
		requiredConfig: [
			{
				key: "secret_key",
				label: "Stripe Secret Key",
				type: "password" as const,
				placeholder: "sk_live_...",
				helpText: "Your Stripe secret key (use test key for testing)",
				helpUrl: "https://dashboard.stripe.com/apikeys",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "twilio-sms",
		name: "Send SMS (Twilio)",
		description: "Send SMS messages via Twilio",
		longDescription:
			"Allow your agent to send SMS notifications. Great for appointment reminders, order updates, or urgent notifications.",
		category: "communication",
		icon: "smartphone",
		toolName: "send_sms",
		toolDescription:
			"Send an SMS message to a phone number. Use this for appointment reminders or urgent notifications.",
		inputSchema: {
			type: "object" as const,
			properties: {
				to: {
					type: "string",
					description: "The recipient phone number in E.164 format (e.g., +14155551234)",
				},
				message: {
					type: "string",
					description: "The SMS message content (max 1600 characters)",
				},
			},
			required: ["to", "message"],
		},
		executionType: "http",
		httpUrl: "https://api.twilio.com/2010-04-01/Accounts/${account_sid}/Messages.json",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: "Basic ${auth_token}",
		},
		requiredConfig: [
			{
				key: "account_sid",
				label: "Twilio Account SID",
				type: "text" as const,
				placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
				helpText: "Find this in your Twilio Console",
				helpUrl: "https://console.twilio.com/",
			},
			{
				key: "auth_token",
				label: "Auth Token (Base64)",
				type: "password" as const,
				placeholder: "Base64 encoded SID:Token",
				helpText: "Base64 encode your Account SID:Auth Token",
			},
			{
				key: "from_number",
				label: "From Phone Number",
				type: "text" as const,
				placeholder: "+14155551234",
				helpText: "Your Twilio phone number",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "notion-create-page",
		name: "Notion - Create Page",
		description: "Create pages in Notion",
		longDescription:
			"Enable your agent to create new pages in Notion. Great for saving conversation summaries, creating meeting notes, or capturing leads.",
		category: "productivity",
		icon: "file-text",
		toolName: "notion_create_page",
		toolDescription:
			"Create a new page in Notion. Use this to save notes, summaries, or important information from the conversation.",
		inputSchema: {
			type: "object" as const,
			properties: {
				title: {
					type: "string",
					description: "The page title",
				},
				content: {
					type: "string",
					description: "The page content (supports markdown)",
				},
			},
			required: ["title", "content"],
		},
		executionType: "http",
		httpUrl: "https://api.notion.com/v1/pages",
		httpMethod: "POST",
		httpHeaders: {
			"Content-Type": "application/json",
			Authorization: "Bearer ${api_key}",
			"Notion-Version": "2022-06-28",
		},
		requiredConfig: [
			{
				key: "api_key",
				label: "Notion API Key",
				type: "password" as const,
				placeholder: "secret_...",
				helpText: "Create an integration in Notion to get an API key",
				helpUrl: "https://www.notion.so/my-integrations",
			},
			{
				key: "parent_page_id",
				label: "Parent Page ID",
				type: "text" as const,
				placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
				helpText: "The ID of the parent page where new pages will be created",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	{
		slug: "airtable-lookup",
		name: "Airtable - Search Records",
		description: "Search records in Airtable",
		longDescription:
			"Allow your agent to search and retrieve records from Airtable. Great for querying product catalogs, customer databases, or any structured data.",
		category: "data",
		icon: "table",
		toolName: "airtable_search",
		toolDescription:
			"Search for records in an Airtable base. Use this to look up information from your database.",
		inputSchema: {
			type: "object" as const,
			properties: {
				search_query: {
					type: "string",
					description: "The search query or filter formula",
				},
				max_records: {
					type: "number",
					description: "Maximum number of records to return (default: 10)",
				},
			},
			required: ["search_query"],
		},
		executionType: "http",
		httpUrl:
			"https://api.airtable.com/v0/${base_id}/${table_name}?filterByFormula=SEARCH(%22${search_query}%22%2C+ARRAYJOIN(RECORD_ID()))&maxRecords=${max_records}",
		httpMethod: "GET",
		httpHeaders: {
			Authorization: "Bearer ${api_key}",
		},
		requiredConfig: [
			{
				key: "api_key",
				label: "Airtable API Key",
				type: "password" as const,
				placeholder: "pat...",
				helpText: "Create a personal access token in Airtable",
				helpUrl: "https://airtable.com/create/tokens",
			},
			{
				key: "base_id",
				label: "Base ID",
				type: "text" as const,
				placeholder: "appXXXXXXXXXXXXXX",
				helpText: "Find this in your Airtable base URL",
			},
			{
				key: "table_name",
				label: "Table Name",
				type: "text" as const,
				placeholder: "Products",
				helpText: "The name of the table to search",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
	// ============ FORM TEMPLATES ============
	{
		slug: "contact-form",
		name: "Contact Form",
		description: "Capture contact details and inquiries from visitors",
		longDescription:
			"A versatile contact form that collects visitor information and their message. Perfect for general inquiries, getting in touch, or as a starting point for lead capture. Easily connect to your CRM or get Slack notifications.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_contact_form",
		toolDescription:
			"Display a contact form to collect the user's name, email, and message. Use this when someone wants to get in touch, send a message, or contact your team.",
		inputSchema: {
			type: "object" as const,
			properties: {
				prefill_name: {
					type: "string",
					description: "Optional: Pre-fill the name field if known",
				},
				prefill_email: {
					type: "string",
					description: "Optional: Pre-fill the email field if known",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: {
						required: { value: true, message: "Please enter your name" },
						minLength: { value: 2, message: "Name must be at least 2 characters" },
					},
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: {
						required: { value: true, message: "Please enter your email" },
						pattern: {
							value: "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$",
							message: "Please enter a valid email address",
						},
					},
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
				},
				{
					name: "message",
					label: "Message",
					type: "textarea" as const,
					placeholder: "How can we help you?",
					validation: {
						required: { value: true, message: "Please enter a message" },
						minLength: { value: 10, message: "Message must be at least 10 characters" },
					},
				},
			],
			submitLabel: "Send Message",
			successMessage: "Thanks for reaching out! We'll get back to you soon.",
			errorMessage: "Something went wrong. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/contacts",
				helpText: "URL to receive form submissions",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "request-quote-form",
		name: "Request a Quote",
		description: "Collect detailed requirements for pricing quotes",
		longDescription:
			"A lead generation form designed for service businesses. Collects project details, budget range, and timeline to help you prepare accurate quotes. Great for agencies, contractors, and B2B services.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_quote_form",
		toolDescription:
			"Display a quote request form to collect project details. Use this when someone wants a price estimate, quote, or proposal for services.",
		inputSchema: {
			type: "object" as const,
			properties: {
				service_type: {
					type: "string",
					description: "Optional: Pre-select a specific service category",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: {
						required: { value: true, message: "Please enter your name" },
					},
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: {
						required: { value: true, message: "Please enter your email" },
					},
				},
				{
					name: "company",
					label: "Company Name",
					type: "text" as const,
					placeholder: "Acme Inc.",
				},
				{
					name: "service_type",
					label: "Service Type",
					type: "select" as const,
					placeholder: "Select a service",
					options: [
						{ label: "Consulting", value: "consulting" },
						{ label: "Development", value: "development" },
						{ label: "Design", value: "design" },
						{ label: "Marketing", value: "marketing" },
						{ label: "Other", value: "other" },
					],
					validation: {
						required: { value: true, message: "Please select a service type" },
					},
				},
				{
					name: "budget",
					label: "Budget Range",
					type: "select" as const,
					placeholder: "Select your budget",
					options: [
						{ label: "Under $5,000", value: "under-5k" },
						{ label: "$5,000 - $15,000", value: "5k-15k" },
						{ label: "$15,000 - $50,000", value: "15k-50k" },
						{ label: "$50,000+", value: "50k-plus" },
						{ label: "Not sure yet", value: "unsure" },
					],
				},
				{
					name: "timeline",
					label: "Desired Timeline",
					type: "select" as const,
					placeholder: "When do you need this?",
					options: [
						{ label: "ASAP", value: "asap" },
						{ label: "1-2 weeks", value: "1-2-weeks" },
						{ label: "1 month", value: "1-month" },
						{ label: "2-3 months", value: "2-3-months" },
						{ label: "Flexible", value: "flexible" },
					],
				},
				{
					name: "description",
					label: "Project Description",
					type: "textarea" as const,
					placeholder: "Tell us about your project requirements...",
					validation: {
						required: { value: true, message: "Please describe your project" },
						minLength: {
							value: 20,
							message: "Please provide more details (at least 20 characters)",
						},
					},
				},
			],
			submitLabel: "Request Quote",
			successMessage: "Thanks! We'll review your requirements and send a quote within 24-48 hours.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/quotes",
				helpText: "URL to receive quote requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "book-demo-form",
		name: "Book a Demo",
		description: "Schedule product demos and sales calls",
		longDescription:
			"A scheduling-focused form for booking product demonstrations or sales calls. Collects contact info, company details, and preferred time slots. Perfect for SaaS products and B2B sales teams.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_demo_form",
		toolDescription:
			"Display a demo booking form. Use this when someone wants to schedule a demo, see the product in action, or book a call with sales.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: {
						required: { value: true, message: "Please enter your name" },
					},
				},
				{
					name: "email",
					label: "Work Email",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: {
						required: { value: true, message: "Please enter your work email" },
					},
				},
				{
					name: "company",
					label: "Company Name",
					type: "text" as const,
					placeholder: "Acme Inc.",
					validation: {
						required: { value: true, message: "Please enter your company name" },
					},
				},
				{
					name: "job_title",
					label: "Job Title",
					type: "text" as const,
					placeholder: "Product Manager",
				},
				{
					name: "company_size",
					label: "Company Size",
					type: "select" as const,
					placeholder: "Select company size",
					options: [
						{ label: "1-10 employees", value: "1-10" },
						{ label: "11-50 employees", value: "11-50" },
						{ label: "51-200 employees", value: "51-200" },
						{ label: "201-500 employees", value: "201-500" },
						{ label: "500+ employees", value: "500-plus" },
					],
				},
				{
					name: "preferred_date",
					label: "Preferred Date",
					type: "date" as const,
					validation: {
						required: { value: true, message: "Please select a preferred date" },
					},
				},
				{
					name: "use_case",
					label: "What would you like to see?",
					type: "textarea" as const,
					placeholder: "Tell us what features or use cases interest you most...",
				},
			],
			submitLabel: "Book Demo",
			successMessage: "Demo request received! We'll send you a calendar invite within 24 hours.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/demos",
				helpText: "URL to receive demo booking requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "newsletter-signup-form",
		name: "Newsletter Signup",
		description: "Grow your email list with a simple signup form",
		longDescription:
			"A minimal, high-converting newsletter signup form. Just email and optional name - perfect for growing your mailing list. Connect to Mailchimp, ConvertKit, or your email platform via webhook.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_newsletter_form",
		toolDescription:
			"Display a newsletter signup form. Use this when someone wants to subscribe to updates, join the mailing list, or receive news and tips.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "you@example.com",
					validation: {
						required: { value: true, message: "Please enter your email" },
						pattern: {
							value: "^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$",
							message: "Please enter a valid email address",
						},
					},
				},
				{
					name: "first_name",
					label: "First Name (optional)",
					type: "text" as const,
					placeholder: "John",
				},
			],
			submitLabel: "Subscribe",
			successMessage: "You're subscribed! Check your inbox for a confirmation email.",
			errorMessage: "Unable to subscribe. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-email-platform.com/subscribe",
				helpText: "URL to receive subscriber info (Zapier, Make, or direct API)",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "support-ticket-form",
		name: "Support Ticket",
		description: "Collect detailed support requests from customers",
		longDescription:
			"A structured support request form that captures issue details, urgency, and contact information. Helps organize incoming support tickets and ensures you have all the info needed to help customers.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_support_form",
		toolDescription:
			"Display a support ticket form. Use this when someone needs help with an issue, has a problem, or wants to report a bug.",
		inputSchema: {
			type: "object" as const,
			properties: {
				category: {
					type: "string",
					description: "Optional: Pre-select the issue category",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: {
						required: { value: true, message: "Please enter your name" },
					},
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: {
						required: { value: true, message: "Please enter your email" },
					},
				},
				{
					name: "category",
					label: "Issue Category",
					type: "select" as const,
					placeholder: "Select a category",
					options: [
						{ label: "Technical Issue", value: "technical" },
						{ label: "Billing Question", value: "billing" },
						{ label: "Account Access", value: "account" },
						{ label: "Feature Request", value: "feature" },
						{ label: "Bug Report", value: "bug" },
						{ label: "Other", value: "other" },
					],
					validation: {
						required: { value: true, message: "Please select a category" },
					},
				},
				{
					name: "priority",
					label: "Priority",
					type: "select" as const,
					placeholder: "How urgent is this?",
					options: [
						{ label: "Low - General question", value: "low" },
						{ label: "Medium - Need help soon", value: "medium" },
						{ label: "High - Blocking my work", value: "high" },
						{ label: "Critical - System down", value: "critical" },
					],
					validation: {
						required: { value: true, message: "Please select a priority level" },
					},
				},
				{
					name: "subject",
					label: "Subject",
					type: "text" as const,
					placeholder: "Brief summary of the issue",
					validation: {
						required: { value: true, message: "Please enter a subject" },
					},
				},
				{
					name: "description",
					label: "Description",
					type: "textarea" as const,
					placeholder:
						"Please describe your issue in detail. Include any error messages, steps to reproduce, and what you expected to happen.",
					validation: {
						required: { value: true, message: "Please describe your issue" },
						minLength: {
							value: 20,
							message: "Please provide more details (at least 20 characters)",
						},
					},
				},
			],
			submitLabel: "Submit Ticket",
			successMessage: "Ticket submitted! We'll get back to you within 24 hours.",
			errorMessage: "Unable to submit ticket. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-helpdesk.com/tickets",
				helpText: "URL to receive support tickets",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	{
		slug: "feedback-form",
		name: "Feedback Form",
		description: "Collect customer feedback and suggestions",
		longDescription:
			"A simple feedback form to gather customer opinions and suggestions. Includes a satisfaction rating and open-ended feedback. Great for product improvement and understanding customer sentiment.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_feedback_form",
		toolDescription:
			"Display a feedback form. Use this when someone wants to share feedback, give a rating, or suggest improvements.",
		inputSchema: {
			type: "object" as const,
			properties: {
				context: {
					type: "string",
					description:
						"Optional: Context about what feedback is for (e.g., 'product', 'support interaction')",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "rating",
					label: "How would you rate your experience?",
					type: "select" as const,
					placeholder: "Select a rating",
					options: [
						{ label: "⭐ 1 - Very Poor", value: "1" },
						{ label: "⭐⭐ 2 - Poor", value: "2" },
						{ label: "⭐⭐⭐ 3 - Average", value: "3" },
						{ label: "⭐⭐⭐⭐ 4 - Good", value: "4" },
						{ label: "⭐⭐⭐⭐⭐ 5 - Excellent", value: "5" },
					],
					validation: {
						required: { value: true, message: "Please select a rating" },
					},
				},
				{
					name: "feedback",
					label: "Your Feedback",
					type: "textarea" as const,
					placeholder: "What did you like? What could we improve?",
					validation: {
						required: { value: true, message: "Please share your feedback" },
						minLength: {
							value: 10,
							message: "Please provide a bit more detail (at least 10 characters)",
						},
					},
				},
				{
					name: "email",
					label: "Email (optional)",
					type: "email" as const,
					placeholder: "john@example.com",
				},
				{
					name: "can_contact",
					label: "Can we contact you for follow-up?",
					type: "select" as const,
					options: [
						{ label: "Yes, feel free to reach out", value: "yes" },
						{ label: "No, prefer not to be contacted", value: "no" },
					],
				},
			],
			submitLabel: "Submit Feedback",
			successMessage: "Thank you for your feedback! We really appreciate it.",
			errorMessage: "Unable to submit feedback. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/feedback",
				helpText: "URL to receive feedback submissions",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "feedback_survey",
	},
	{
		slug: "free-trial-form",
		name: "Free Trial Request",
		description: "Capture trial signups with use case details",
		longDescription:
			"A lead capture form for free trial requests. Collects contact info and use case to help qualify leads and personalize onboarding. Great for SaaS products.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_trial_form",
		toolDescription:
			"Display a free trial request form. Use this when someone wants to try the product, start a trial, or test it out.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Work Email",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "company",
					label: "Company Name",
					type: "text" as const,
					placeholder: "Acme Inc.",
				},
				{
					name: "use_case",
					label: "What do you want to use it for?",
					type: "textarea" as const,
					placeholder: "Describe your main use case or goal...",
					validation: { required: { value: true, message: "Please describe your use case" } },
				},
			],
			submitLabel: "Start Free Trial",
			successMessage: "You're in! Check your email for login instructions.",
			errorMessage: "Unable to process request. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/trials",
				helpText: "URL to receive trial requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	// ============ CUSTOMER SUPPORT FORMS ============
	{
		slug: "bug-report-form",
		name: "Bug Report",
		description: "Collect detailed bug reports with steps to reproduce",
		longDescription:
			"A structured bug report form that captures all the details needed to investigate issues. Includes steps to reproduce, expected vs actual behavior, and device info.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_bug_report_form",
		toolDescription:
			"Display a bug report form. Use this when someone found a bug, encountered an error, or something isn't working correctly.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "title",
					label: "Bug Title",
					type: "text" as const,
					placeholder: "Brief description of the issue",
					validation: { required: { value: true, message: "Please enter a title" } },
				},
				{
					name: "steps",
					label: "Steps to Reproduce",
					type: "textarea" as const,
					placeholder: "1. Go to...\n2. Click on...\n3. See error",
					validation: { required: { value: true, message: "Please describe the steps" } },
				},
				{
					name: "expected",
					label: "Expected Behavior",
					type: "textarea" as const,
					placeholder: "What should have happened?",
				},
				{
					name: "actual",
					label: "Actual Behavior",
					type: "textarea" as const,
					placeholder: "What actually happened?",
					validation: { required: { value: true, message: "Please describe what happened" } },
				},
				{
					name: "browser_device",
					label: "Browser / Device",
					type: "text" as const,
					placeholder: "e.g., Chrome on Windows, Safari on iPhone",
				},
			],
			submitLabel: "Submit Bug Report",
			successMessage: "Bug report received! Our team will investigate.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/bugs",
				helpText: "URL to receive bug reports",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	{
		slug: "feature-request-form",
		name: "Feature Request",
		description: "Collect feature ideas and enhancement requests",
		longDescription:
			"A form for collecting feature requests and product suggestions. Helps prioritize roadmap items by capturing use cases and urgency.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_feature_request_form",
		toolDescription:
			"Display a feature request form. Use this when someone has an idea, wants a new feature, or suggests an improvement.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "feature_title",
					label: "Feature Title",
					type: "text" as const,
					placeholder: "Name your feature idea",
					validation: { required: { value: true, message: "Please enter a title" } },
				},
				{
					name: "description",
					label: "Description",
					type: "textarea" as const,
					placeholder: "Describe the feature and how it would work...",
					validation: { required: { value: true, message: "Please describe the feature" } },
				},
				{
					name: "use_case",
					label: "Use Case",
					type: "textarea" as const,
					placeholder: "How would you use this feature? What problem does it solve?",
					validation: { required: { value: true, message: "Please describe your use case" } },
				},
				{
					name: "priority",
					label: "How important is this to you?",
					type: "select" as const,
					options: [
						{ label: "Nice to have", value: "low" },
						{ label: "Would be helpful", value: "medium" },
						{ label: "Very important", value: "high" },
						{ label: "Critical for my workflow", value: "critical" },
					],
				},
			],
			submitLabel: "Submit Feature Request",
			successMessage: "Thanks for your suggestion! We review all feature requests.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/features",
				helpText: "URL to receive feature requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: true,
		actionCategory: "support_escalation",
	},
	// ============ E-COMMERCE FORMS ============
	{
		slug: "product-inquiry-form",
		name: "Product Inquiry",
		description: "Answer questions about specific products",
		longDescription:
			"A form for product-related questions. Captures which product they're asking about and their specific question. Great for complex products that need expert guidance.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_product_inquiry_form",
		toolDescription:
			"Display a product inquiry form. Use this when someone has a question about a specific product or needs more information before buying.",
		inputSchema: {
			type: "object" as const,
			properties: {
				product_name: {
					type: "string",
					description: "Optional: Pre-fill the product name if known",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "product_name",
					label: "Product Name",
					type: "text" as const,
					placeholder: "Which product are you asking about?",
					validation: { required: { value: true, message: "Please enter the product name" } },
				},
				{
					name: "question",
					label: "Your Question",
					type: "textarea" as const,
					placeholder: "What would you like to know about this product?",
					validation: { required: { value: true, message: "Please enter your question" } },
				},
			],
			submitLabel: "Ask Question",
			successMessage: "Question received! We'll get back to you soon.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/inquiries",
				helpText: "URL to receive product inquiries",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "back-in-stock-form",
		name: "Back in Stock Notification",
		description: "Notify customers when products are available again",
		longDescription:
			"Capture email addresses for out-of-stock product notifications. Collects email and product/variant details to send alerts when items return to inventory.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_stock_notification_form",
		toolDescription:
			"Display a back-in-stock notification form. Use this when a product is out of stock and the customer wants to be notified when it's available.",
		inputSchema: {
			type: "object" as const,
			properties: {
				product_name: {
					type: "string",
					description: "The product name to pre-fill",
				},
				variant: {
					type: "string",
					description: "The variant (size, color) if known",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "product_name",
					label: "Product",
					type: "text" as const,
					placeholder: "Product name",
					validation: { required: { value: true, message: "Please enter the product" } },
				},
				{
					name: "variant",
					label: "Size / Color / Variant",
					type: "text" as const,
					placeholder: "e.g., Large, Blue",
				},
			],
			submitLabel: "Notify Me",
			successMessage: "Got it! We'll email you when it's back in stock.",
			errorMessage: "Unable to subscribe. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/stock-alerts",
				helpText: "URL to receive stock notification requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "wholesale-inquiry-form",
		name: "Wholesale Inquiry",
		description: "Capture B2B wholesale and bulk order requests",
		longDescription:
			"A form for wholesale and bulk purchase inquiries. Collects business information, volume requirements, and products of interest for B2B sales opportunities.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_wholesale_form",
		toolDescription:
			"Display a wholesale inquiry form. Use this when someone wants to buy in bulk, become a reseller, or inquire about wholesale pricing.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "business_name",
					label: "Business Name",
					type: "text" as const,
					placeholder: "Your Company LLC",
					validation: { required: { value: true, message: "Please enter your business name" } },
				},
				{
					name: "contact_name",
					label: "Contact Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
				},
				{
					name: "products",
					label: "Products of Interest",
					type: "textarea" as const,
					placeholder: "Which products are you interested in?",
					validation: { required: { value: true, message: "Please specify products" } },
				},
				{
					name: "volume",
					label: "Estimated Monthly Volume",
					type: "select" as const,
					options: [
						{ label: "10-50 units", value: "10-50" },
						{ label: "50-200 units", value: "50-200" },
						{ label: "200-500 units", value: "200-500" },
						{ label: "500+ units", value: "500+" },
					],
					validation: { required: { value: true, message: "Please select volume" } },
				},
				{
					name: "message",
					label: "Additional Information",
					type: "textarea" as const,
					placeholder: "Tell us about your business and requirements...",
				},
			],
			submitLabel: "Submit Inquiry",
			successMessage: "Wholesale inquiry received! Our sales team will contact you.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/wholesale",
				helpText: "URL to receive wholesale inquiries",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "custom-order-form",
		name: "Custom Order Request",
		description: "Capture custom product or service requests",
		longDescription:
			"A form for custom order requests. Collects specific requirements, quantity, and deadline for bespoke products or personalized services.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_custom_order_form",
		toolDescription:
			"Display a custom order request form. Use this when someone wants a custom product, personalized item, or made-to-order service.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "requirements",
					label: "Custom Requirements",
					type: "textarea" as const,
					placeholder: "Describe what you need in detail...",
					validation: { required: { value: true, message: "Please describe your requirements" } },
				},
				{
					name: "quantity",
					label: "Quantity",
					type: "number" as const,
					placeholder: "1",
					validation: { required: { value: true, message: "Please enter quantity" } },
				},
				{
					name: "deadline",
					label: "Needed By",
					type: "date" as const,
				},
				{
					name: "budget",
					label: "Budget Range",
					type: "select" as const,
					options: [
						{ label: "Under $100", value: "under-100" },
						{ label: "$100 - $500", value: "100-500" },
						{ label: "$500 - $1,000", value: "500-1000" },
						{ label: "$1,000+", value: "1000-plus" },
						{ label: "Flexible", value: "flexible" },
					],
				},
			],
			submitLabel: "Request Quote",
			successMessage: "Custom order request received! We'll send you a quote.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/custom-orders",
				helpText: "URL to receive custom order requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	// ============ BOOKING & SCHEDULING FORMS ============
	{
		slug: "appointment-request-form",
		name: "Appointment Request",
		description: "Schedule appointments and service bookings",
		longDescription:
			"A general appointment booking form. Collects service type, preferred date/time, and contact info. Perfect for salons, clinics, consultants, and service businesses.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_appointment_form",
		toolDescription:
			"Display an appointment request form. Use this when someone wants to schedule an appointment, book a service, or reserve a time slot.",
		inputSchema: {
			type: "object" as const,
			properties: {
				service: {
					type: "string",
					description: "Optional: Pre-select the service type",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
					validation: { required: { value: true, message: "Please enter your phone" } },
				},
				{
					name: "service",
					label: "Service",
					type: "select" as const,
					placeholder: "Select a service",
					options: [
						{ label: "Consultation", value: "consultation" },
						{ label: "Follow-up", value: "followup" },
						{ label: "New Client", value: "new-client" },
						{ label: "Other", value: "other" },
					],
					validation: { required: { value: true, message: "Please select a service" } },
				},
				{
					name: "preferred_date",
					label: "Preferred Date",
					type: "date" as const,
					validation: { required: { value: true, message: "Please select a date" } },
				},
				{
					name: "preferred_time",
					label: "Preferred Time",
					type: "select" as const,
					options: [
						{ label: "Morning (9am - 12pm)", value: "morning" },
						{ label: "Afternoon (12pm - 5pm)", value: "afternoon" },
						{ label: "Evening (5pm - 8pm)", value: "evening" },
					],
					validation: { required: { value: true, message: "Please select a time" } },
				},
				{
					name: "notes",
					label: "Additional Notes",
					type: "textarea" as const,
					placeholder: "Anything else we should know?",
				},
			],
			submitLabel: "Request Appointment",
			successMessage: "Appointment request received! We'll confirm your booking soon.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/appointments",
				helpText: "URL to receive appointment requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	{
		slug: "event-registration-form",
		name: "Event Registration",
		description: "Register attendees for events and webinars",
		longDescription:
			"An event registration form for webinars, workshops, conferences, or meetups. Collects attendee details and any special requirements.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_event_registration_form",
		toolDescription:
			"Display an event registration form. Use this when someone wants to sign up for an event, webinar, workshop, or conference.",
		inputSchema: {
			type: "object" as const,
			properties: {
				event_name: {
					type: "string",
					description: "The event name to display",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "company",
					label: "Company (optional)",
					type: "text" as const,
					placeholder: "Acme Inc.",
				},
				{
					name: "attendee_count",
					label: "Number of Attendees",
					type: "number" as const,
					placeholder: "1",
					validation: { required: { value: true, message: "Please enter attendee count" } },
				},
				{
					name: "dietary",
					label: "Dietary Requirements",
					type: "select" as const,
					options: [
						{ label: "None", value: "none" },
						{ label: "Vegetarian", value: "vegetarian" },
						{ label: "Vegan", value: "vegan" },
						{ label: "Gluten-free", value: "gluten-free" },
						{ label: "Other (please specify in notes)", value: "other" },
					],
				},
				{
					name: "notes",
					label: "Special Requirements",
					type: "textarea" as const,
					placeholder: "Any accessibility needs or other requirements?",
				},
			],
			submitLabel: "Register",
			successMessage: "You're registered! Check your email for confirmation.",
			errorMessage: "Unable to register. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/registrations",
				helpText: "URL to receive event registrations",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	{
		slug: "consultation-booking-form",
		name: "Consultation Booking",
		description: "Book consultation calls with topic details",
		longDescription:
			"A consultation booking form for coaches, consultants, and advisors. Captures the topic of discussion, goals, and availability.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_consultation_form",
		toolDescription:
			"Display a consultation booking form. Use this when someone wants to book a consultation, strategy call, or advisory session.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
				},
				{
					name: "topic",
					label: "Consultation Topic",
					type: "text" as const,
					placeholder: "What would you like to discuss?",
					validation: { required: { value: true, message: "Please enter the topic" } },
				},
				{
					name: "goals",
					label: "What do you hope to achieve?",
					type: "textarea" as const,
					placeholder: "Describe your goals for this consultation...",
					validation: { required: { value: true, message: "Please describe your goals" } },
				},
				{
					name: "availability",
					label: "Your Availability",
					type: "textarea" as const,
					placeholder: "When are you available? List a few options...",
					validation: { required: { value: true, message: "Please provide availability" } },
				},
			],
			submitLabel: "Book Consultation",
			successMessage: "Consultation request received! We'll send you available times.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/consultations",
				helpText: "URL to receive consultation bookings",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	// ============ SURVEY FORMS ============
	{
		slug: "csat-survey-form",
		name: "Customer Satisfaction (CSAT)",
		description: "Measure customer satisfaction with quick surveys",
		longDescription:
			"A customer satisfaction survey to measure how happy customers are with your product or service. Simple rating plus open-ended feedback.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_csat_form",
		toolDescription:
			"Display a customer satisfaction survey. Use this to gather feedback on customer experience or after a support interaction.",
		inputSchema: {
			type: "object" as const,
			properties: {
				context: {
					type: "string",
					description: "What the survey is about (e.g., 'recent purchase', 'support call')",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "satisfaction",
					label: "How satisfied are you with your experience?",
					type: "select" as const,
					options: [
						{ label: "Very Dissatisfied", value: "1" },
						{ label: "Dissatisfied", value: "2" },
						{ label: "Neutral", value: "3" },
						{ label: "Satisfied", value: "4" },
						{ label: "Very Satisfied", value: "5" },
					],
					validation: { required: { value: true, message: "Please select a rating" } },
				},
				{
					name: "what_went_well",
					label: "What went well?",
					type: "textarea" as const,
					placeholder: "Tell us what you liked...",
				},
				{
					name: "improvements",
					label: "What could we improve?",
					type: "textarea" as const,
					placeholder: "How can we do better?",
				},
			],
			submitLabel: "Submit Feedback",
			successMessage: "Thank you for your feedback!",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/surveys",
				helpText: "URL to receive survey responses",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "feedback_survey",
	},
	{
		slug: "nps-survey-form",
		name: "NPS Survey",
		description: "Measure customer loyalty with Net Promoter Score",
		longDescription:
			"A Net Promoter Score (NPS) survey to measure customer loyalty. The classic 'How likely are you to recommend us?' question with follow-up.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_nps_form",
		toolDescription:
			"Display an NPS survey. Use this to measure how likely customers are to recommend your product or service.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "score",
					label: "How likely are you to recommend us to a friend or colleague?",
					type: "select" as const,
					options: [
						{ label: "0 - Not at all likely", value: "0" },
						{ label: "1", value: "1" },
						{ label: "2", value: "2" },
						{ label: "3", value: "3" },
						{ label: "4", value: "4" },
						{ label: "5", value: "5" },
						{ label: "6", value: "6" },
						{ label: "7", value: "7" },
						{ label: "8", value: "8" },
						{ label: "9", value: "9" },
						{ label: "10 - Extremely likely", value: "10" },
					],
					validation: { required: { value: true, message: "Please select a score" } },
				},
				{
					name: "reason",
					label: "What's the main reason for your score?",
					type: "textarea" as const,
					placeholder: "Tell us why you chose this score...",
					validation: { required: { value: true, message: "Please explain your score" } },
				},
				{
					name: "suggestions",
					label: "Any suggestions for improvement?",
					type: "textarea" as const,
					placeholder: "How can we do better?",
				},
			],
			submitLabel: "Submit",
			successMessage: "Thank you for your feedback!",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/nps",
				helpText: "URL to receive NPS responses",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "feedback_survey",
	},
	{
		slug: "exit-intent-form",
		name: "Exit Intent Survey",
		description: "Understand why visitors are leaving",
		longDescription:
			"A quick exit intent survey to understand why visitors are leaving without converting. Helps identify friction points and objections.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_exit_survey_form",
		toolDescription:
			"Display an exit intent survey. Use this when someone is about to leave, expressing hesitation, or hasn't taken action.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "reason",
					label: "What's stopping you today?",
					type: "select" as const,
					options: [
						{ label: "Just browsing", value: "browsing" },
						{ label: "Price is too high", value: "price" },
						{ label: "Need more information", value: "info" },
						{ label: "Comparing options", value: "comparing" },
						{ label: "Technical issues", value: "technical" },
						{ label: "Not what I'm looking for", value: "wrong-fit" },
						{ label: "Other", value: "other" },
					],
					validation: { required: { value: true, message: "Please select a reason" } },
				},
				{
					name: "details",
					label: "Tell us more (optional)",
					type: "textarea" as const,
					placeholder: "What would help you make a decision?",
				},
				{
					name: "email",
					label: "Email (for follow-up offers)",
					type: "email" as const,
					placeholder: "john@example.com",
				},
			],
			submitLabel: "Submit",
			successMessage: "Thanks for your feedback!",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/exit-surveys",
				helpText: "URL to receive exit survey responses",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	// ============ APPLICATION FORMS ============
	{
		slug: "job-application-form",
		name: "Job Application",
		description: "Collect job applications with resume and details",
		longDescription:
			"A job application form for collecting candidate information. Includes position, experience, availability, and resume upload (via URL or text).",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_job_application_form",
		toolDescription:
			"Display a job application form. Use this when someone wants to apply for a job, submit their resume, or inquire about open positions.",
		inputSchema: {
			type: "object" as const,
			properties: {
				position: {
					type: "string",
					description: "The job position they're applying for",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
					validation: { required: { value: true, message: "Please enter your phone" } },
				},
				{
					name: "position",
					label: "Position Applying For",
					type: "text" as const,
					placeholder: "e.g., Software Engineer",
					validation: { required: { value: true, message: "Please enter the position" } },
				},
				{
					name: "experience",
					label: "Years of Relevant Experience",
					type: "select" as const,
					options: [
						{ label: "0-1 years", value: "0-1" },
						{ label: "1-3 years", value: "1-3" },
						{ label: "3-5 years", value: "3-5" },
						{ label: "5-10 years", value: "5-10" },
						{ label: "10+ years", value: "10+" },
					],
					validation: { required: { value: true, message: "Please select experience" } },
				},
				{
					name: "resume_url",
					label: "Resume/LinkedIn URL",
					type: "text" as const,
					placeholder: "https://linkedin.com/in/... or link to resume",
					validation: { required: { value: true, message: "Please provide resume link" } },
				},
				{
					name: "availability",
					label: "When can you start?",
					type: "select" as const,
					options: [
						{ label: "Immediately", value: "immediate" },
						{ label: "2 weeks notice", value: "2-weeks" },
						{ label: "1 month", value: "1-month" },
						{ label: "2+ months", value: "2-months" },
					],
				},
				{
					name: "cover_letter",
					label: "Why are you interested in this role?",
					type: "textarea" as const,
					placeholder: "Tell us about yourself and why you'd be a great fit...",
				},
			],
			submitLabel: "Submit Application",
			successMessage: "Application received! We'll review and get back to you.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/applications",
				helpText: "URL to receive job applications",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	{
		slug: "partner-application-form",
		name: "Partner/Affiliate Application",
		description: "Recruit partners and affiliates",
		longDescription:
			"A partner or affiliate application form. Collects business information, audience details, and partnership proposal for affiliate and partnership programs.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_partner_application_form",
		toolDescription:
			"Display a partner application form. Use this when someone wants to become a partner, affiliate, reseller, or join your partnership program.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "company_name",
					label: "Company/Brand Name",
					type: "text" as const,
					placeholder: "Your Company",
					validation: { required: { value: true, message: "Please enter your company" } },
				},
				{
					name: "contact_name",
					label: "Contact Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "website",
					label: "Website URL",
					type: "text" as const,
					placeholder: "https://yourwebsite.com",
					validation: { required: { value: true, message: "Please enter your website" } },
				},
				{
					name: "audience_size",
					label: "Audience Size",
					type: "select" as const,
					options: [
						{ label: "Under 1,000", value: "under-1k" },
						{ label: "1,000 - 10,000", value: "1k-10k" },
						{ label: "10,000 - 50,000", value: "10k-50k" },
						{ label: "50,000 - 100,000", value: "50k-100k" },
						{ label: "100,000+", value: "100k-plus" },
					],
					validation: { required: { value: true, message: "Please select audience size" } },
				},
				{
					name: "proposal",
					label: "Partnership Proposal",
					type: "textarea" as const,
					placeholder: "How would you like to partner with us? What value can you bring?",
					validation: { required: { value: true, message: "Please describe your proposal" } },
				},
			],
			submitLabel: "Apply",
			successMessage: "Application received! Our partnerships team will review.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/partners",
				helpText: "URL to receive partner applications",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	{
		slug: "vendor-application-form",
		name: "Vendor Application",
		description: "Onboard new vendors and suppliers",
		longDescription:
			"A vendor or supplier application form. Collects business information, products/services offered, and certifications for vendor onboarding.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_vendor_application_form",
		toolDescription:
			"Display a vendor application form. Use this when someone wants to become a vendor, supplier, or sell through your platform.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "business_name",
					label: "Business Name",
					type: "text" as const,
					placeholder: "Your Company LLC",
					validation: { required: { value: true, message: "Please enter your business name" } },
				},
				{
					name: "contact_name",
					label: "Contact Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@company.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
				},
				{
					name: "products_services",
					label: "Products/Services Offered",
					type: "textarea" as const,
					placeholder: "Describe what you offer...",
					validation: { required: { value: true, message: "Please describe your offerings" } },
				},
				{
					name: "certifications",
					label: "Relevant Certifications",
					type: "textarea" as const,
					placeholder: "List any certifications, licenses, or credentials...",
				},
				{
					name: "years_in_business",
					label: "Years in Business",
					type: "select" as const,
					options: [
						{ label: "Less than 1 year", value: "under-1" },
						{ label: "1-3 years", value: "1-3" },
						{ label: "3-5 years", value: "3-5" },
						{ label: "5-10 years", value: "5-10" },
						{ label: "10+ years", value: "10-plus" },
					],
				},
			],
			submitLabel: "Submit Application",
			successMessage: "Vendor application received! We'll review and contact you.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/vendors",
				helpText: "URL to receive vendor applications",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	// ============ INDUSTRY-SPECIFIC FORMS ============
	{
		slug: "real-estate-inquiry-form",
		name: "Real Estate Inquiry",
		description: "Capture property inquiries from buyers and renters",
		longDescription:
			"A real estate inquiry form for property searches. Collects property type preferences, budget, location, and timeline for buyers or renters.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_real_estate_form",
		toolDescription:
			"Display a real estate inquiry form. Use this when someone is looking for a property, wants to buy/rent, or needs real estate assistance.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Your Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
					validation: { required: { value: true, message: "Please enter your phone" } },
				},
				{
					name: "property_type",
					label: "Property Type",
					type: "select" as const,
					options: [
						{ label: "House", value: "house" },
						{ label: "Apartment/Condo", value: "apartment" },
						{ label: "Townhouse", value: "townhouse" },
						{ label: "Land", value: "land" },
						{ label: "Commercial", value: "commercial" },
					],
					validation: { required: { value: true, message: "Please select property type" } },
				},
				{
					name: "intent",
					label: "Looking to",
					type: "select" as const,
					options: [
						{ label: "Buy", value: "buy" },
						{ label: "Rent", value: "rent" },
						{ label: "Sell", value: "sell" },
					],
					validation: { required: { value: true, message: "Please select intent" } },
				},
				{
					name: "budget",
					label: "Budget Range",
					type: "select" as const,
					options: [
						{ label: "Under $200,000", value: "under-200k" },
						{ label: "$200,000 - $400,000", value: "200k-400k" },
						{ label: "$400,000 - $600,000", value: "400k-600k" },
						{ label: "$600,000 - $1,000,000", value: "600k-1m" },
						{ label: "$1,000,000+", value: "1m-plus" },
					],
					validation: { required: { value: true, message: "Please select budget" } },
				},
				{
					name: "location",
					label: "Preferred Location/Area",
					type: "text" as const,
					placeholder: "City, neighborhood, or zip code",
					validation: { required: { value: true, message: "Please enter location" } },
				},
				{
					name: "timeline",
					label: "Timeline",
					type: "select" as const,
					options: [
						{ label: "ASAP", value: "asap" },
						{ label: "1-3 months", value: "1-3-months" },
						{ label: "3-6 months", value: "3-6-months" },
						{ label: "6+ months", value: "6-plus-months" },
						{ label: "Just exploring", value: "exploring" },
					],
				},
			],
			submitLabel: "Submit Inquiry",
			successMessage: "Inquiry received! An agent will contact you soon.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/real-estate",
				helpText: "URL to receive real estate inquiries",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "healthcare-appointment-form",
		name: "Healthcare Appointment",
		description: "Schedule medical appointments with patient info",
		longDescription:
			"A healthcare appointment request form. Collects appointment type, symptoms/reason, insurance info, and contact details for medical offices and clinics.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_healthcare_form",
		toolDescription:
			"Display a healthcare appointment form. Use this when someone needs to schedule a medical appointment, doctor visit, or health consultation.",
		inputSchema: {
			type: "object" as const,
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "patient_name",
					label: "Patient Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter patient name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
					validation: { required: { value: true, message: "Please enter your phone" } },
				},
				{
					name: "appointment_type",
					label: "Appointment Type",
					type: "select" as const,
					options: [
						{ label: "New Patient Visit", value: "new-patient" },
						{ label: "Follow-up", value: "followup" },
						{ label: "Annual Checkup", value: "checkup" },
						{ label: "Urgent Care", value: "urgent" },
						{ label: "Specialist Referral", value: "specialist" },
					],
					validation: { required: { value: true, message: "Please select appointment type" } },
				},
				{
					name: "symptoms",
					label: "Reason for Visit / Symptoms",
					type: "textarea" as const,
					placeholder: "Please describe your symptoms or reason for the appointment...",
					validation: { required: { value: true, message: "Please describe your reason" } },
				},
				{
					name: "insurance",
					label: "Insurance Provider",
					type: "text" as const,
					placeholder: "e.g., Blue Cross, Aetna, Self-pay",
				},
				{
					name: "preferred_date",
					label: "Preferred Date",
					type: "date" as const,
					validation: { required: { value: true, message: "Please select a date" } },
				},
			],
			submitLabel: "Request Appointment",
			successMessage: "Appointment request received! We'll confirm your booking.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/healthcare",
				helpText: "URL to receive healthcare appointment requests",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "account_user",
	},
	{
		slug: "education-enrollment-form",
		name: "Education Enrollment",
		description: "Capture course interest and enrollment requests",
		longDescription:
			"An education enrollment or course interest form. Collects course preferences, experience level, and learning goals for schools, courses, and training programs.",
		category: "forms",
		icon: "clipboard-list",
		toolName: "show_education_form",
		toolDescription:
			"Display an education enrollment form. Use this when someone is interested in a course, program, training, or wants to learn more about educational offerings.",
		inputSchema: {
			type: "object" as const,
			properties: {
				course_name: {
					type: "string",
					description: "Pre-select a specific course",
				},
			},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "name",
					label: "Full Name",
					type: "text" as const,
					placeholder: "John Doe",
					validation: { required: { value: true, message: "Please enter your name" } },
				},
				{
					name: "email",
					label: "Email Address",
					type: "email" as const,
					placeholder: "john@example.com",
					validation: { required: { value: true, message: "Please enter your email" } },
				},
				{
					name: "phone",
					label: "Phone Number",
					type: "tel" as const,
					placeholder: "+1 (555) 123-4567",
				},
				{
					name: "course_interest",
					label: "Course/Program of Interest",
					type: "text" as const,
					placeholder: "Which course are you interested in?",
					validation: { required: { value: true, message: "Please enter course interest" } },
				},
				{
					name: "experience_level",
					label: "Current Experience Level",
					type: "select" as const,
					options: [
						{ label: "Complete Beginner", value: "beginner" },
						{ label: "Some Experience", value: "intermediate" },
						{ label: "Advanced", value: "advanced" },
						{ label: "Looking to Refresh Skills", value: "refresh" },
					],
					validation: { required: { value: true, message: "Please select experience level" } },
				},
				{
					name: "goals",
					label: "Learning Goals",
					type: "textarea" as const,
					placeholder: "What do you hope to achieve? Career goals, skills to gain...",
					validation: { required: { value: true, message: "Please describe your goals" } },
				},
				{
					name: "start_date",
					label: "When would you like to start?",
					type: "select" as const,
					options: [
						{ label: "As soon as possible", value: "asap" },
						{ label: "Next month", value: "next-month" },
						{ label: "Next semester/quarter", value: "next-term" },
						{ label: "Just exploring options", value: "exploring" },
					],
				},
			],
			submitLabel: "Submit Interest",
			successMessage: "Thanks for your interest! We'll send you more information.",
			errorMessage: "Unable to submit. Please try again.",
		},
		formExecutionMode: "webhook",
		requiredConfig: [
			{
				key: "webhook_url",
				label: "Webhook URL",
				type: "url" as const,
				placeholder: "https://your-api.com/enrollments",
				helpText: "URL to receive enrollment inquiries",
			},
		],
		isFree: true,
		allowAiSuggest: true,
		countsAsConversion: true,
		countsAsResolution: false,
		actionCategory: "lead_sales",
	},
	{
		slug: "google-maps-geocoding",
		name: "Google Maps Geocoding",
		description: "Get geographic coordinates and bounds for any location",
		longDescription:
			"Enable your agent to geocode locations using the Google Maps Geocoding API. Given a place name (e.g., 'Paris, France'), it returns geographic coordinates (latitude/longitude) and bounding box (northeast/southwest bounds). Useful for converting human-readable locations into precise geographic data that can be used with other map-based APIs.",
		category: "data",
		icon: "map-pin",
		toolName: "geocode_location",
		toolDescription:
			"Geocode a location by name. Returns geographic coordinates (lat/lng), bounding box (northeast and southwest bounds), and the formatted address. Use this when you need map bounds, coordinates, or geographic information for a place.",
		inputSchema: {
			type: "object" as const,
			properties: {
				address: {
					type: "string",
					description:
						"The location to geocode (e.g., 'Paris, France', 'New York, NY', '1600 Amphitheatre Parkway')",
				},
			},
			required: ["address"],
		},
		executionType: "http",
		httpUrl: "https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${api_key}",
		httpMethod: "GET",
		httpHeaders: {},
		requiredConfig: [
			{
				key: "api_key",
				label: "Google Maps API Key",
				type: "password",
				placeholder: "AIzaSy...",
				helpText:
					"Your Google Maps API key with Geocoding API enabled. Get one at https://console.cloud.google.com",
			},
		],
		isFree: false,
		allowAiSuggest: true,
		countsAsConversion: false,
		countsAsResolution: false,
		actionCategory: "operations_internal",
	},
];

async function seed() {
	// Filter by category if provided: pnpm seed-marketplace forms
	const categoryFilter = process.argv[2];
	const toolsToSeed = categoryFilter
		? marketplaceTools.filter((t) => t.category === categoryFilter)
		: marketplaceTools;

	if (categoryFilter) {
		console.log(`Seeding marketplace tools (category: ${categoryFilter})...`);
	} else {
		console.log("Seeding all marketplace tools...");
	}

	if (toolsToSeed.length === 0) {
		console.log("No tools found matching filter.");
		process.exit(0);
	}

	const db = getDb();

	for (const tool of toolsToSeed) {
		try {
			await db
				.insert(toolTemplates)
				.values({
					...tool,
					isActive: true,
				})
				.onConflictDoNothing();
			console.log(`✓ Added: ${tool.name}`);
		} catch (error) {
			console.error(`✗ Failed to add ${tool.name}:`, error);
		}
	}

	console.log("\nDone! Seeded", toolsToSeed.length, "tools.");
	process.exit(0);
}

seed();
