import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

interface OrganizationSchemaProps {
	name?: string;
	url?: string;
	logo?: string;
	description?: string;
}

export function OrganizationSchema({
	name = "Ansa",
	url = BASE_URL,
	logo = `${BASE_URL}/logo.png`,
	description = "Build AI agents that answer, book, sell, and support. Integrate via SDK/API or use our no-code dashboard.",
}: OrganizationSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name,
		url,
		logo,
		description,
		sameAs: ["https://twitter.com/ansa_ai", "https://github.com/ansa-so"],
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface WebSiteSchemaProps {
	name?: string;
	url?: string;
}

export function WebSiteSchema({ name = "Ansa", url = BASE_URL }: WebSiteSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "WebSite",
		name,
		url,
		potentialAction: {
			"@type": "SearchAction",
			target: `${url}/search?q={search_term_string}`,
			"query-input": "required name=search_term_string",
		},
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface SoftwareProductSchemaProps {
	name?: string;
	description?: string;
	applicationCategory?: string;
	operatingSystem?: string;
}

export function SoftwareProductSchema({
	name = "Ansa AI Agents",
	description = "AI-powered customer support and sales agents. RAG-powered knowledge base, 24/7 automation, SDK/API access.",
	applicationCategory = "BusinessApplication",
	operatingSystem = "Web",
}: SoftwareProductSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name,
		url: BASE_URL,
		description,
		applicationCategory,
		operatingSystem,
		screenshot: `${BASE_URL}/og-image.png`,
		offers: [
			{
				"@type": "Offer",
				name: "Free",
				price: "0",
				priceCurrency: "USD",
				description: "75 AI responses lifetime. No credit card required.",
			},
			{
				"@type": "Offer",
				name: "Pro",
				price: "29",
				priceCurrency: "USD",
				billingIncrement: "P1M",
				description: "5,000 AI responses/month. No per-resolution fees.",
			},
		],
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface FAQItem {
	question: string;
	answer: string;
}

interface FAQSchemaProps {
	items: FAQItem[];
}

export function FAQSchema({ items }: FAQSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question",
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer",
				text: item.answer,
			},
		})),
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface BreadcrumbItem {
	name: string;
	url: string;
}

interface BreadcrumbSchemaProps {
	items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "BreadcrumbList",
		itemListElement: items.map((item, index) => ({
			"@type": "ListItem",
			position: index + 1,
			name: item.name,
			item: item.url,
		})),
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}

interface ComparisonSchemaProps {
	competitor: string;
	competitorUrl: string;
}

export function ComparisonSchema({ competitor, competitorUrl }: ComparisonSchemaProps) {
	const schema = {
		"@context": "https://schema.org",
		"@type": "WebPage",
		name: `Ansa vs ${competitor} Comparison`,
		description: `Compare Ansa with ${competitor}. See features, pricing, and why teams choose Ansa as their ${competitor} alternative.`,
		mainEntity: {
			"@type": "ItemList",
			itemListElement: [
				{
					"@type": "SoftwareApplication",
					name: "Ansa",
					url: BASE_URL,
				},
				{
					"@type": "SoftwareApplication",
					name: competitor,
					url: competitorUrl,
				},
			],
		},
	};

	return (
		<script
			type="application/ld+json"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data built from internal constants; JSON.stringify output, no user input
			dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
		/>
	);
}
