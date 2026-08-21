import type { Metadata } from "next";
import { MarketplaceClient } from "@/components/marketplace/marketplace-client";
import type { MarketplaceApp } from "@/components/marketplace/marketplace-grid";
import { listMarketplaceTools, type ToolTemplate } from "@/lib/server-api";

// Icon mapping from database categories
function getCategoryIconName(category: string): string {
	const normalized = category.toLowerCase();
	if (normalized.includes("ticketing") || normalized.includes("communication")) {
		return "MessageSquare";
	}
	if (normalized.includes("crm") || normalized.includes("data")) {
		return "Database";
	}
	if (normalized.includes("ecommerce")) {
		return "ShoppingBag";
	}
	if (normalized.includes("engineering") || normalized.includes("productivity")) {
		return "GitBranch";
	}
	if (normalized.includes("security")) {
		return "Shield";
	}
	if (normalized.includes("search")) {
		return "Search";
	}
	if (normalized.includes("email") || normalized.includes("mail")) {
		return "Mail";
	}
	return "Zap";
}

// Map ToolTemplate to MarketplaceApp
function mapToolToApp(tool: ToolTemplate): MarketplaceApp {
	return {
		id: tool.id,
		slug: tool.slug,
		name: tool.name,
		category: tool.category.charAt(0).toUpperCase() + tool.category.slice(1),
		description: tool.description,
		iconName: getCategoryIconName(tool.category),
		installed: false, // Could be enhanced with actual install state
		isFree: tool.isFree,
	};
}

export const metadata: Metadata = {
	title: "Tool Marketplace",
	description:
		"Extend your AI agents with powerful tools from the Ansa marketplace. Order lookup, refund processing, appointment booking, and more integrations.",
	openGraph: {
		title: "Tool Marketplace - Ansa AI",
		description:
			"Extend your AI agents with powerful tools. Order lookup, refund processing, appointment booking, and more.",
	},
};

// Force dynamic rendering - API not available during build
export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
	const tools = await listMarketplaceTools();
	const apps = tools.map(mapToolToApp);

	return <MarketplaceClient apps={apps} />;
}
