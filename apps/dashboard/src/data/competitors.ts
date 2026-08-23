export interface CompetitorPlan {
	name: string;
	price: string;
	period: string;
	note?: string;
}

export interface CompetitorFeature {
	name: string;
	ansa: boolean | string;
	competitor: boolean | string;
}

export interface Competitor {
	id: string;
	name: string;
	tagline: string;
	url: string;
	description: string;
	plans: CompetitorPlan[];
	keyFeatures: string[];
	limitations: string[];
	ansaAdvantages: string[];
	features: CompetitorFeature[];
	metaTitle: string;
	metaDescription: string;
}

export const competitors: Record<string, Competitor> = {
	intercom: {
		id: "intercom",
		name: "Intercom",
		tagline: "Customer messaging platform",
		url: "https://www.intercom.com",
		description:
			"Intercom is a customer messaging platform with live chat, bots, and help desk features. Their Fin AI agent charges $0.99 per resolution — costs that spiral as you scale. Responses are text-only with no way to render rich product cards, carousels, or custom UI from your own data sources.",
		plans: [
			{ name: "Essential", price: "$29", period: "seat/mo", note: "billed annually" },
			{ name: "Advanced", price: "$85", period: "seat/mo", note: "billed annually" },
			{ name: "Expert", price: "$132", period: "seat/mo", note: "billed annually" },
			{ name: "Fin AI Agent", price: "$0.99", period: "resolution", note: "min 50/mo" },
		],
		keyFeatures: [
			"Fin AI Agent",
			"Messenger widget",
			"Shared inbox",
			"Ticketing system",
			"Help center",
		],
		limitations: [
			"Per-resolution AI pricing adds up quickly — $0.99/resolution with a 50/mo minimum",
			"AI responses are text-only — no cards, carousels, or custom UI components",
			"No way to connect internal tools/APIs and render results directly in chat",
			"No native Shopify app — ecommerce integrations require custom dev work",
			"Limited proactive messaging — no exit intent, scroll depth, or cart abandonment triggers",
			"No confidence-based human handoff — escalation rules are manual and rigid",
			"Analytics focused on conversation counts, not AI confidence or knowledge gaps",
		],
		ansaAdvantages: [
			"No per-resolution fees — unlimited AI responses on all paid plans",
			"Custom data rendering — connect APIs and display results as cards, carousels, forms, and custom UI in chat",
			"Native Shopify app — product-aware responses, WISMO queries, and cart recovery built in",
			"Smart triggers — exit intent, cart abandonment, scroll depth, time on page, custom JS events",
			"Confidence-based human handoff — set a threshold and auto-escalate to Slack/email/helpdesk with full context",
			"Advanced analytics — confidence scoring per response, auto-detected knowledge gaps, resolution tracking",
			"Simple, transparent pricing from $38/mo",
		],
		features: [
			{ name: "AI-powered responses", ansa: "Unlimited", competitor: "$0.99/resolution" },
			{
				name: "Custom data rendering (cards, carousels, forms)",
				ansa: true,
				competitor: "Text only",
			},
			{ name: "Connect internal APIs to chat", ansa: true, competitor: "Requires dev work" },
			{ name: "Native Shopify app", ansa: true, competitor: false },
			{ name: "Product-aware responses (inventory, WISMO)", ansa: true, competitor: false },
			{ name: "Cart recovery in chat", ansa: true, competitor: false },
			{ name: "Exit intent triggers", ansa: true, competitor: false },
			{ name: "Cart abandonment triggers", ansa: true, competitor: false },
			{ name: "Scroll depth / time-on-page triggers", ansa: true, competitor: false },
			{
				name: "Confidence-based human handoff",
				ansa: "Configurable threshold",
				competitor: "Manual rules",
			},
			{ name: "AI confidence scoring per response", ansa: true, competitor: false },
			{ name: "Auto-detected knowledge gaps", ansa: true, competitor: false },
			{ name: "Resolution tracking", ansa: true, competitor: "Basic" },
			{ name: "Knowledge base / RAG", ansa: true, competitor: true },
			{ name: "Live chat widget", ansa: true, competitor: true },
			{ name: "SDK/API access", ansa: "All plans", competitor: "Higher tiers" },
			{ name: "Self-hosted option", ansa: "Enterprise", competitor: false },
			{ name: "Free trial available", ansa: "75 responses", competitor: false },
		],
		metaTitle: "Ansa vs Intercom: No Per-Resolution Fees, Rich UI in Chat",
		metaDescription:
			"Compare Ansa vs Intercom. Unlimited AI with custom data rendering — cards, carousels, and forms in chat — not text-only responses at $0.99 each. Native Shopify, smart triggers, and confidence-based handoff.",
	},

	zendesk: {
		id: "zendesk",
		name: "Zendesk",
		tagline: "Legacy customer service platform",
		url: "https://www.zendesk.com",
		description:
			"Zendesk is an enterprise customer service platform built around ticketing. AI is bolted on as a $50/agent add-on, not part of the core product. Proactive engagement requires separate products, and human handoff relies on manual routing rules rather than AI confidence signals.",
		plans: [
			{ name: "Support Team", price: "$19", period: "agent/mo" },
			{ name: "Suite Growth", price: "$89", period: "agent/mo" },
			{ name: "Suite Professional", price: "$115", period: "agent/mo" },
			{ name: "Suite Enterprise", price: "$169", period: "agent/mo" },
			{ name: "AI Copilot Add-on", price: "$50", period: "agent/mo", note: "extra" },
		],
		keyFeatures: [
			"Ticketing system",
			"AI Copilot",
			"Knowledge base",
			"Workforce management",
			"Quality assurance",
		],
		limitations: [
			"AI is a bolt-on add-on ($50/agent) — not built into the core product",
			"Legacy ticketing-first architecture — AI feels tacked on",
			"No smart triggers — proactive engagement requires separate Zendesk products",
			"Human handoff uses manual routing rules, not AI confidence thresholds",
			"No confidence scoring per response — you can't see when the AI is guessing",
			"Per-agent pricing scales poorly as your team grows",
			"Complex setup takes days or weeks — not minutes",
		],
		ansaAdvantages: [
			"AI-first architecture — AI is the core product, not an add-on",
			"Smart triggers — exit intent, scroll depth, time on page, cart abandonment, custom JS events",
			"Confidence-based human handoff — set a % threshold, auto-escalate with full context to Slack/email/helpdesk",
			"Advanced analytics — confidence scoring per response, auto-detected knowledge gaps, resolution tracking",
			"Custom data rendering — connect APIs and show cards, carousels, forms in chat",
			"Setup in minutes, not days",
			"Simple pricing — no per-agent fees, no add-ons",
		],
		features: [
			{ name: "AI included in base plan", ansa: true, competitor: "+$50/agent add-on" },
			{ name: "AI-first architecture", ansa: true, competitor: "Bolt-on AI" },
			{
				name: "Smart triggers (exit intent, scroll, time)",
				ansa: "5 trigger types",
				competitor: "Separate product",
			},
			{ name: "Cart abandonment triggers", ansa: true, competitor: false },
			{
				name: "Confidence-based human handoff",
				ansa: "Configurable threshold",
				competitor: "Manual routing",
			},
			{ name: "AI confidence scoring per response", ansa: true, competitor: false },
			{ name: "Auto-detected knowledge gaps", ansa: true, competitor: false },
			{ name: "Resolution tracking", ansa: true, competitor: "Basic" },
			{ name: "Custom data rendering (cards, carousels)", ansa: true, competitor: "Limited" },
			{ name: "Connect internal APIs to chat", ansa: true, competitor: "Via Zendesk Apps" },
			{ name: "Setup time", ansa: "Minutes", competitor: "Days/Weeks" },
			{ name: "Unlimited AI conversations", ansa: true, competitor: "Add-on" },
			{ name: "Knowledge base / RAG", ansa: true, competitor: true },
			{ name: "Ticketing system", ansa: true, competitor: true },
			{ name: "SDK/API access", ansa: "All plans", competitor: "Higher tiers" },
			{ name: "Self-hosted option", ansa: "Enterprise", competitor: false },
			{ name: "Transparent pricing", ansa: true, competitor: "Complex add-ons" },
			{ name: "Free trial available", ansa: "75 responses", competitor: "14 days" },
		],
		metaTitle: "Ansa vs Zendesk: AI-First Support, Not a Bolt-On",
		metaDescription:
			"Compare Ansa vs Zendesk. AI-first architecture with smart triggers and confidence-based human handoff — not a $50/agent add-on bolted onto legacy ticketing. Setup in minutes.",
	},

	drift: {
		id: "drift",
		name: "Drift",
		tagline: "Conversational marketing platform",
		url: "https://www.salesloft.com/platform/drift",
		description:
			"Drift (now part of Salesloft) is a conversational marketing platform focused exclusively on B2B sales. Starting at $2,500/month, it has no real support use case, no ecommerce features, and analytics focused on pipeline — not support quality or AI confidence.",
		plans: [
			{ name: "Premium", price: "$2,500", period: "month", note: "billed annually" },
			{ name: "Advanced", price: "Custom", period: "month", note: "contact sales" },
			{ name: "Enterprise", price: "$50k-150k", period: "year", note: "custom" },
		],
		keyFeatures: [
			"Conversational marketing",
			"ABM targeting",
			"Meeting scheduling",
			"Lead qualification",
			"Chatbots",
		],
		limitations: [
			"Starts at $2,500/mo — over 65x more expensive than Ansa",
			"Sales-only — no real customer support capabilities",
			"No ecommerce features — no Shopify, no product catalog, no WISMO",
			"Analytics focused on sales pipeline, not AI quality or resolution rates",
			"No confidence scoring — you can't tell when the AI doesn't know the answer",
			"No knowledge gap detection — blindspots go unnoticed",
			"Requires sales contact for most plans — no self-serve",
		],
		ansaAdvantages: [
			"Works for support AND sales — not just pipeline generation",
			"Built for ecommerce — native Shopify app, product-aware responses, WISMO, cart recovery",
			"Advanced analytics — confidence scoring per response, knowledge gap detection, resolution tracking",
			"Confidence-based human handoff — auto-escalate when AI isn't sure, with full context",
			"Custom data rendering — cards, carousels, forms from your APIs, not just text bubbles",
			"Start free, upgrade to $38/mo — not $2,500/mo",
			"Self-serve signup, no sales calls required",
		],
		features: [
			{ name: "Starting price", ansa: "Free", competitor: "$2,500/mo" },
			{ name: "Customer support use case", ansa: true, competitor: "Sales only" },
			{ name: "Native Shopify app", ansa: true, competitor: false },
			{ name: "Product-aware responses (inventory, WISMO)", ansa: true, competitor: false },
			{ name: "Cart recovery in chat", ansa: true, competitor: false },
			{ name: "AI confidence scoring per response", ansa: true, competitor: false },
			{ name: "Auto-detected knowledge gaps", ansa: true, competitor: false },
			{ name: "Resolution tracking", ansa: true, competitor: "Pipeline only" },
			{ name: "Confidence-based human handoff", ansa: "Configurable threshold", competitor: false },
			{ name: "Custom data rendering (cards, carousels)", ansa: true, competitor: true },
			{ name: "Connect internal APIs to chat", ansa: true, competitor: "Enterprise only" },
			{
				name: "Smart triggers (exit intent, scroll, time)",
				ansa: "All plans",
				competitor: "Higher tiers",
			},
			{ name: "Self-serve signup", ansa: true, competitor: false },
			{ name: "AI-powered chat", ansa: true, competitor: true },
			{ name: "Knowledge base / RAG", ansa: true, competitor: "Limited" },
			{ name: "SDK/API access", ansa: "All plans", competitor: "Enterprise" },
			{ name: "Lead qualification", ansa: true, competitor: true },
		],
		metaTitle: "Ansa vs Drift: Support + Sales + Ecommerce from $38/mo",
		metaDescription:
			"Compare Ansa vs Drift. Full support and ecommerce capabilities — not just sales pipeline — starting free, not $2,500/mo. AI confidence scoring, knowledge gap detection, and native Shopify.",
	},

	freshdesk: {
		id: "freshdesk",
		name: "Freshdesk",
		tagline: "Help desk software with bolt-on AI",
		url: "https://www.freshworks.com/freshdesk",
		description:
			"Freshdesk is help desk software from Freshworks with Freddy AI bolted on as a $29/agent add-on. Freddy is limited to text responses — no custom UI rendering, no API connections to your tools, and no native Shopify integration for ecommerce teams.",
		plans: [
			{ name: "Free", price: "$0", period: "up to 2 agents" },
			{ name: "Growth", price: "$15", period: "agent/mo" },
			{ name: "Pro", price: "$49", period: "agent/mo" },
			{ name: "Enterprise", price: "$79", period: "agent/mo" },
			{ name: "Freddy AI Copilot", price: "$29", period: "agent/mo", note: "add-on" },
		],
		keyFeatures: ["Ticketing", "Freddy AI", "Automation", "Omnichannel", "Knowledge base"],
		limitations: [
			"AI is a bolt-on add-on (Freddy, $29/agent) — not native to the product",
			"Freddy responses are text-only — no cards, carousels, or custom UI in chat",
			"No way to connect your internal APIs and render results in the conversation",
			"No native Shopify app — ecommerce teams need marketplace plugins with limited features",
			"No confidence-based handoff — escalation rules are manual",
			"Analytics are basic conversation counts — no confidence scoring or knowledge gap detection",
			"Proactive campaigns restricted to Pro+ tiers",
		],
		ansaAdvantages: [
			"AI-native — AI is the core product, not a $29/agent add-on",
			"Custom data rendering — connect your APIs and display cards, carousels, forms, and custom UI directly in chat",
			"Native Shopify app — product catalog, inventory-aware responses, WISMO queries, cart recovery",
			"Confidence-based human handoff — set a % threshold, auto-escalate to Slack/email/helpdesk with full context",
			"Advanced analytics — confidence scoring, knowledge gap detection, resolution tracking",
			"Smart triggers on all plans — exit intent, scroll depth, cart abandonment, custom events",
			"Full SDK/API access on all plans",
		],
		features: [
			{ name: "AI included in base plan", ansa: true, competitor: "+$29/agent add-on" },
			{ name: "AI-native architecture", ansa: true, competitor: "Bolt-on (Freddy)" },
			{
				name: "Custom data rendering (cards, carousels, forms)",
				ansa: true,
				competitor: "Text only",
			},
			{ name: "Connect internal APIs to chat", ansa: true, competitor: "Via apps (limited)" },
			{ name: "Native Shopify app", ansa: true, competitor: "Marketplace plugin" },
			{ name: "Product-aware responses (inventory, WISMO)", ansa: true, competitor: false },
			{ name: "Cart recovery in chat", ansa: true, competitor: false },
			{
				name: "Confidence-based human handoff",
				ansa: "Configurable threshold",
				competitor: "Manual rules",
			},
			{ name: "AI confidence scoring per response", ansa: true, competitor: false },
			{ name: "Auto-detected knowledge gaps", ansa: true, competitor: false },
			{ name: "Resolution tracking", ansa: true, competitor: "Basic" },
			{
				name: "Smart triggers (exit intent, scroll, time)",
				ansa: "5 trigger types",
				competitor: "Pro+ tiers",
			},
			{ name: "Cart abandonment triggers", ansa: true, competitor: false },
			{ name: "Knowledge base / RAG", ansa: "Advanced RAG", competitor: "Basic" },
			{ name: "SDK/API access", ansa: "All plans", competitor: "Paid plans" },
			{ name: "Self-hosted option", ansa: "Enterprise", competitor: false },
			{ name: "Free trial available", ansa: "75 responses", competitor: "2 agents" },
		],
		metaTitle: "Ansa vs Freshdesk: AI-Native with Rich UI, Not a Bolt-On",
		metaDescription:
			"Compare Ansa vs Freshdesk. AI-native with custom data rendering — cards, carousels, and forms in chat — not text-only Freddy at $29/agent extra. Native Shopify, confidence-based handoff.",
	},

	tidio: {
		id: "tidio",
		name: "Tidio",
		tagline: "Live chat with conversation caps",
		url: "https://www.tidio.com",
		description:
			"Tidio is a live chat platform with Lyro AI chatbot. Conversation-based pricing caps your AI usage, analytics are limited to basic counts, and there's no way to connect custom APIs or render rich UI in chat responses.",
		plans: [
			{ name: "Starter", price: "$24", period: "month", note: "100 conversations" },
			{ name: "Growth", price: "$49", period: "month", note: "250 conversations" },
			{ name: "Plus", price: "$749", period: "month", note: "custom" },
			{ name: "Lyro AI", price: "Tiered", period: "conversations", note: "limited" },
		],
		keyFeatures: [
			"Live chat",
			"Lyro AI chatbot",
			"Automation flows",
			"Ticketing",
			"Basic analytics",
		],
		limitations: [
			"Conversation-based pricing caps AI usage — you pay more as you grow",
			"Analytics are basic conversation counts — no confidence scoring or knowledge gap detection",
			"No custom API connections — can't pull data from your internal tools into chat",
			"No custom data rendering — can't display cards, carousels, or forms from your data",
			"SDK/API access restricted to Plus tier ($749/mo)",
			"No confidence-based human handoff — escalation is manual",
			"Huge pricing gap between Growth ($49) and Plus ($749)",
		],
		ansaAdvantages: [
			"Advanced analytics — confidence scoring per response, auto-detected knowledge gaps, resolution tracking",
			"Custom data rendering — connect APIs and display cards, carousels, forms, and custom UI in chat",
			"Full SDK/API access on all plans — not locked behind $749/mo tier",
			"Confidence-based human handoff — set a threshold, auto-escalate with full context to Slack/email/helpdesk",
			"Unlimited AI conversations — no caps, no per-conversation pricing",
			"Smart triggers — exit intent, scroll depth, cart abandonment, custom JS events",
			"Native Shopify app with product-aware responses",
		],
		features: [
			{ name: "AI conversations", ansa: "Unlimited", competitor: "Capped per plan" },
			{ name: "AI confidence scoring per response", ansa: true, competitor: false },
			{ name: "Auto-detected knowledge gaps", ansa: true, competitor: false },
			{ name: "Resolution tracking", ansa: true, competitor: "Basic counts" },
			{ name: "Custom data rendering (cards, carousels, forms)", ansa: true, competitor: false },
			{ name: "Connect internal APIs to chat", ansa: true, competitor: false },
			{ name: "SDK/API access", ansa: "All plans", competitor: "Plus only ($749/mo)" },
			{
				name: "Confidence-based human handoff",
				ansa: "Configurable threshold",
				competitor: "Manual",
			},
			{
				name: "Smart triggers (exit intent, scroll, time)",
				ansa: "5 trigger types",
				competitor: "Automation flows",
			},
			{ name: "Cart abandonment triggers", ansa: true, competitor: false },
			{ name: "Custom JS event triggers", ansa: true, competitor: false },
			{ name: "Native Shopify app", ansa: true, competitor: "Plugin" },
			{ name: "Product-aware responses (inventory, WISMO)", ansa: true, competitor: false },
			{ name: "Knowledge base / RAG", ansa: "Advanced", competitor: "Basic" },
			{ name: "Live chat", ansa: true, competitor: true },
			{ name: "Self-hosted option", ansa: "Enterprise", competitor: false },
			{ name: "Free trial available", ansa: "75 responses", competitor: "Limited" },
		],
		metaTitle: "Ansa vs Tidio: Advanced Analytics & Custom Rendering, No Caps",
		metaDescription:
			"Compare Ansa vs Tidio. AI confidence scoring, knowledge gap detection, and custom data rendering in chat — not basic counts with conversation caps. Full API access on all plans.",
	},
};

export const competitorIds = Object.keys(competitors) as Array<keyof typeof competitors>;

export function getCompetitor(id: string): Competitor | undefined {
	return competitors[id];
}
