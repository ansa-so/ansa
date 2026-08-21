export interface Integration {
	id: string;
	name: string;
	category: string;
	description: string;
	heroDescription: string;
	useCases: { title: string; description: string }[];
	howItWorks: { step: string; description: string }[];
	metaTitle: string;
	metaDescription: string;
}

export const integrations: Record<string, Integration> = {
	stripe: {
		id: "stripe",
		name: "Stripe",
		category: "Payments",
		description:
			"Connect Ansa to Stripe for real-time payment status, subscription management, and billing inquiries handled by AI.",
		heroDescription:
			"Let your AI agent check payment status, manage subscriptions, handle refund requests, and answer billing questions — all connected to your Stripe account.",
		useCases: [
			{
				title: "Payment Status",
				description:
					"Customers can check payment status, view invoices, and get receipt copies instantly.",
			},
			{
				title: "Subscription Management",
				description: "Handle plan upgrades, downgrades, and cancellation requests automatically.",
			},
			{
				title: "Refund Processing",
				description: "Process refund requests with configurable approval workflows.",
			},
			{
				title: "Billing Questions",
				description: "Answer questions about charges, billing cycles, and payment methods.",
			},
		],
		howItWorks: [
			{
				step: "Connect",
				description: "Link your Stripe account via API key in the Ansa dashboard.",
			},
			{
				step: "Configure",
				description: "Set permissions for what your agent can access and modify.",
			},
			{
				step: "Deploy",
				description: "Your agent can now handle billing and payment queries automatically.",
			},
		],
		metaTitle: "Stripe Integration — AI-Powered Billing Support",
		metaDescription:
			"Connect Ansa to Stripe. Let AI handle payment inquiries, subscription management, and refund requests automatically.",
	},
	slack: {
		id: "slack",
		name: "Slack",
		category: "Communication",
		description:
			"Get notified in Slack when conversations need attention. Escalate to human agents via Slack channels.",
		heroDescription:
			"Route AI-escalated conversations to Slack channels. Get real-time notifications, respond from Slack, and keep your team in the loop.",
		useCases: [
			{
				title: "Escalation Alerts",
				description:
					"Get notified in specific channels when AI escalates a conversation to a human.",
			},
			{
				title: "Team Handoff",
				description: "Agents can claim and respond to escalated conversations directly from Slack.",
			},
			{
				title: "Daily Summaries",
				description: "Receive daily conversation summaries and key metrics in your channel.",
			},
			{
				title: "Internal Notifications",
				description: "Alert teams about VIP customers, urgent issues, or specific keywords.",
			},
		],
		howItWorks: [
			{ step: "Install", description: "Add the Ansa Slack app to your workspace." },
			{
				step: "Map Channels",
				description: "Connect Slack channels to specific agents or escalation rules.",
			},
			{
				step: "Respond",
				description: "Your team gets notified and can respond without leaving Slack.",
			},
		],
		metaTitle: "Slack Integration — AI Support Escalations in Slack",
		metaDescription:
			"Connect Ansa to Slack. Get AI escalation alerts, respond from Slack, and keep your support team in the loop.",
	},
	zendesk: {
		id: "zendesk",
		name: "Zendesk",
		category: "Help Desk",
		description:
			"Migrate from Zendesk or use Ansa alongside it. Sync tickets, import knowledge bases, and unify support.",
		heroDescription:
			"Import your Zendesk knowledge base, sync tickets bidirectionally, and let Ansa AI handle frontline support while complex issues go to Zendesk.",
		useCases: [
			{
				title: "Knowledge Import",
				description: "Import your existing Zendesk help center articles as Ansa knowledge sources.",
			},
			{
				title: "Ticket Sync",
				description: "Create Zendesk tickets from escalated Ansa conversations automatically.",
			},
			{
				title: "Gradual Migration",
				description: "Run Ansa alongside Zendesk and migrate at your own pace.",
			},
			{
				title: "Unified Reporting",
				description: "Combine AI resolution data with Zendesk metrics for complete visibility.",
			},
		],
		howItWorks: [
			{ step: "Connect", description: "Link your Zendesk account via API credentials." },
			{ step: "Import", description: "Import knowledge base articles and configure ticket sync." },
			{
				step: "Deploy",
				description: "Ansa handles frontline support, Zendesk handles escalations.",
			},
		],
		metaTitle: "Zendesk Integration — AI-Powered Frontline Support",
		metaDescription:
			"Connect Ansa to Zendesk. Import knowledge bases, sync tickets, and let AI handle frontline support automatically.",
	},
	notion: {
		id: "notion",
		name: "Notion",
		category: "Knowledge Base",
		description:
			"Connect Notion as a knowledge source. Your AI agent learns from your Notion docs, wikis, and databases.",
		heroDescription:
			"Train your AI agent on your Notion workspace. It reads your docs, wikis, and databases so it can answer questions with your actual content.",
		useCases: [
			{
				title: "Documentation Sync",
				description: "Keep your agent's knowledge current by syncing Notion pages automatically.",
			},
			{
				title: "Wiki Search",
				description: "Let customers or employees search your Notion wiki via natural language.",
			},
			{
				title: "Process Guides",
				description: "Agent references your SOPs and process documents when answering questions.",
			},
			{
				title: "FAQ Automation",
				description: "Maintain FAQs in Notion, agent answers from them automatically.",
			},
		],
		howItWorks: [
			{ step: "Authorize", description: "Connect your Notion workspace with one-click OAuth." },
			{ step: "Select Pages", description: "Choose which Notion pages and databases to sync." },
			{
				step: "Auto-Sync",
				description: "Changes in Notion are automatically reflected in your agent.",
			},
		],
		metaTitle: "Notion Integration — Train AI on Your Docs",
		metaDescription:
			"Connect Notion to Ansa. Train your AI agent on your docs, wikis, and databases. Auto-sync keeps answers current.",
	},
	salesforce: {
		id: "salesforce",
		name: "Salesforce",
		category: "CRM",
		description:
			"Sync leads, contacts, and cases with Salesforce. AI qualifies leads and creates CRM records automatically.",
		heroDescription:
			"Your AI agent qualifies leads and pushes them to Salesforce. Look up customer records, create cases, and update opportunities — all from chat.",
		useCases: [
			{
				title: "Lead Capture",
				description:
					"AI-qualified leads are automatically created as Salesforce leads or contacts.",
			},
			{
				title: "Case Creation",
				description: "Escalated conversations become Salesforce cases with full context.",
			},
			{
				title: "Customer Lookup",
				description: "Agent checks Salesforce for customer history and account details.",
			},
			{
				title: "Opportunity Updates",
				description: "Update deal stages and add notes from conversation insights.",
			},
		],
		howItWorks: [
			{
				step: "Authenticate",
				description: "Connect Salesforce with OAuth and configure object mapping.",
			},
			{
				step: "Map Fields",
				description: "Map conversation data to Salesforce fields and objects.",
			},
			{
				step: "Automate",
				description: "AI creates and updates Salesforce records from conversations.",
			},
		],
		metaTitle: "Salesforce Integration — AI Lead Qualification to CRM",
		metaDescription:
			"Connect Ansa to Salesforce. AI qualifies leads, creates cases, and syncs customer data to your CRM automatically.",
	},
	linear: {
		id: "linear",
		name: "Linear",
		category: "Project Management",
		description:
			"Create Linear issues from support conversations. Track bugs and feature requests from customer feedback.",
		heroDescription:
			"Turn customer feedback into Linear issues automatically. AI categorizes bug reports and feature requests, creates issues with full context.",
		useCases: [
			{
				title: "Bug Reports",
				description: "AI identifies bug reports and creates Linear issues with reproduction steps.",
			},
			{
				title: "Feature Requests",
				description: "Capture and categorize feature requests directly from conversations.",
			},
			{
				title: "Status Updates",
				description: "Customers can check the status of their reported issues via chat.",
			},
			{
				title: "Priority Routing",
				description: "Route urgent issues to the right team automatically.",
			},
		],
		howItWorks: [
			{ step: "Connect", description: "Link your Linear workspace via API key." },
			{ step: "Configure", description: "Set up teams, labels, and priority mapping rules." },
			{
				step: "Automate",
				description: "AI creates and updates issues from support conversations.",
			},
		],
		metaTitle: "Linear Integration — Support to Engineering Pipeline",
		metaDescription:
			"Connect Ansa to Linear. Turn customer feedback into issues automatically. Bug reports, feature requests, and status updates.",
	},
	hubspot: {
		id: "hubspot",
		name: "HubSpot",
		category: "CRM",
		description:
			"Sync contacts and deals with HubSpot. AI captures leads and enriches your CRM with conversation data.",
		heroDescription:
			"Your AI agent captures leads and pushes them to HubSpot. Enrich contact records with conversation insights and automate deal creation.",
		useCases: [
			{
				title: "Contact Enrichment",
				description: "Add conversation data, preferences, and interests to HubSpot contacts.",
			},
			{
				title: "Deal Creation",
				description: "AI creates deals in HubSpot when conversations indicate buying intent.",
			},
			{
				title: "Lead Scoring",
				description: "Combine AI qualification data with HubSpot lead scores.",
			},
			{
				title: "Workflow Triggers",
				description: "Trigger HubSpot workflows based on conversation events and outcomes.",
			},
		],
		howItWorks: [
			{ step: "Connect", description: "Link HubSpot with OAuth and select properties to sync." },
			{ step: "Map", description: "Configure contact, deal, and company property mapping." },
			{
				step: "Sync",
				description: "AI creates and updates HubSpot records from every conversation.",
			},
		],
		metaTitle: "HubSpot Integration — AI Lead Capture to CRM",
		metaDescription:
			"Connect Ansa to HubSpot. AI captures leads, enriches contacts, and creates deals from conversations automatically.",
	},
	wordpress: {
		id: "wordpress",
		name: "WordPress",
		category: "Website",
		description:
			"Add Ansa AI chat to your WordPress site. One-click install, works with any theme.",
		heroDescription:
			"Add AI-powered support to your WordPress site in minutes. Install the plugin, connect your agent, and start resolving customer queries automatically.",
		useCases: [
			{
				title: "Visitor Support",
				description: "Answer visitor questions about your products, services, and content.",
			},
			{
				title: "WooCommerce Support",
				description:
					"Handle order tracking, product questions, and returns for WooCommerce stores.",
			},
			{
				title: "Lead Capture",
				description: "Qualify and capture leads from your WordPress site visitors.",
			},
			{
				title: "Content Assistance",
				description: "Help visitors find relevant blog posts, pages, and resources.",
			},
		],
		howItWorks: [
			{
				step: "Install",
				description: "Install the Ansa plugin from the WordPress plugin directory.",
			},
			{ step: "Connect", description: "Enter your Ansa agent ID to connect your agent." },
			{ step: "Customize", description: "Style the chat widget to match your theme." },
		],
		metaTitle: "WordPress Integration — AI Chat Plugin",
		metaDescription:
			"Add AI-powered chat to WordPress. One-click install, WooCommerce support, and lead capture for any WordPress site.",
	},
	webflow: {
		id: "webflow",
		name: "Webflow",
		category: "Website",
		description:
			"Embed Ansa AI chat on your Webflow site. Copy-paste integration, no code required.",
		heroDescription:
			"Add AI-powered support to your Webflow site with a simple embed code. No developer needed — just paste the script and your agent is live.",
		useCases: [
			{
				title: "Visitor Engagement",
				description: "Engage Webflow site visitors with proactive AI conversations.",
			},
			{
				title: "Lead Generation",
				description: "Capture and qualify leads directly from your Webflow landing pages.",
			},
			{
				title: "Product Questions",
				description: "Answer questions about your product or service 24/7.",
			},
			{
				title: "Booking & Scheduling",
				description: "Let visitors book demos or appointments through the chat widget.",
			},
		],
		howItWorks: [
			{ step: "Copy", description: "Get your embed code from the Ansa dashboard." },
			{ step: "Paste", description: "Add the script to your Webflow site's custom code section." },
			{ step: "Publish", description: "Publish your Webflow site and your agent is live." },
		],
		metaTitle: "Webflow Integration — AI Chat for Webflow Sites",
		metaDescription:
			"Add AI chat to Webflow. No-code embed, lead capture, and 24/7 automated support for your Webflow site.",
	},
};

export const integrationIds = Object.keys(integrations);

export function getIntegration(id: string): Integration | undefined {
	return integrations[id];
}
