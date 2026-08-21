import { Building2, type LucideIcon, MessageSquare, Sparkles, Zap } from "lucide-react";

// Plan data returned from API
export interface Plan {
	id: string;
	name: string;
	price: number;
	messages: number;
	agents: number;
	tools: number;
	storage: number;
	storageFormatted: string;
	models: string[];
	canRemoveBranding: boolean;
	hasEscalation: boolean;
	hasEmailChannel: boolean;
	hasMessengerChannel: boolean;
	stripePriceId: string | null;
	stripePriceIdMonthly: string | null;
	stripePriceIdYearly: string | null;
}

// UI metadata for plans (icons, descriptions)
export interface PlanMeta {
	description: string;
	icon: LucideIcon;
	popular?: boolean;
}

export const PLAN_ORDER = ["free", "starter", "growth", "pro", "enterprise"];

export const PLAN_META: Record<string, PlanMeta> = {
	free: {
		description: "Perfect for trying out Ansa",
		icon: MessageSquare,
	},
	starter: {
		description: "Great for individuals and small projects",
		icon: Zap,
	},
	growth: {
		description: "For growing teams and businesses",
		icon: Sparkles,
		popular: true,
	},
	pro: {
		description: "For high-volume production workloads",
		icon: Building2,
	},
	enterprise: {
		description: "Custom solutions for large organizations",
		icon: Sparkles,
	},
};

// Feature with optional tooltip
export interface PlanFeature {
	text: string;
	tooltip?: string;
}

// Generate feature list from plan data
export function getPlanFeatures(plan: Plan): (string | PlanFeature)[] {
	const features: (string | PlanFeature)[] = [];

	// Agents (what you get)
	if (plan.agents === -1) {
		features.push("Unlimited agents");
	} else {
		features.push(`${plan.agents} ${plan.agents === 1 ? "agent" : "agents"}`);
	}

	// Messages (usage limits)
	if (plan.messages === -1) {
		features.push("Unlimited messages");
	} else if (plan.id === "free") {
		features.push(`Up to ${plan.messages.toLocaleString()} messages (lifetime)`);
	} else {
		features.push(`Up to ${plan.messages.toLocaleString()} messages per month`);
	}

	// Storage (resources)
	if (plan.storage === -1) {
		features.push("Unlimited knowledge base");
	} else {
		// Convert bytes to approximate pages (assuming ~2KB per page of text)
		const pages = Math.round(plan.storage / (2 * 1024));
		// Round to cleaner numbers
		let roundedPages: number;
		if (pages < 1000) {
			roundedPages = Math.round(pages / 100) * 100;
		} else if (pages < 10000) {
			roundedPages = Math.round(pages / 1000) * 1000;
		} else {
			// For very large numbers, round to nearest 10k
			roundedPages = Math.round(pages / 10000) * 10000;
		}
		features.push({
			text: `Up to ${roundedPages.toLocaleString()} pages of content`,
			tooltip: `${plan.storageFormatted} of document storage`,
		});
	}

	// Tools (agent capabilities)
	if (plan.tools === -1) {
		features.push("Unlimited tools per agent");
	} else {
		features.push(`${plan.tools} ${plan.tools === 1 ? "tool" : "tools"} per agent`);
	}

	// Models (AI capabilities)
	if (plan.models && plan.models.length === 1) {
		features.push("Basic AI model");
	} else if (plan.models && plan.models.length <= 3) {
		features.push("Standard AI models");
	} else if (plan.models && plan.models.length > 3) {
		features.push("All AI models");
	}

	// Branding (customization)
	if (plan.canRemoveBranding) {
		features.push("Remove Ansa branding");
	}

	// Email channel
	if (plan.hasEmailChannel) {
		features.push("Email gateway");
	}

	// Facebook Messenger channel
	if (plan.hasMessengerChannel) {
		features.push("Facebook Messenger");
	}

	// Shopify integration (all plans)
	features.push("Shopify native integration");

	// AI Performance analytics (starter and above)
	if (plan.id !== "free") {
		features.push("AI Performance analytics");
	}

	// Support
	if (plan.id === "starter") {
		features.push("Email support");
	} else if (plan.id === "growth") {
		features.push("Priority support");
	} else if (plan.id === "pro") {
		features.push("Dedicated support");
	} else if (plan.id === "enterprise") {
		features.push("Priority support");
		features.push("Custom SLA");
	}

	// Advanced features
	if (plan.id === "pro") {
		features.push("API access");
	} else if (plan.id === "enterprise") {
		features.push("Dedicated account manager");
		features.push("API access");
		features.push("SSO & advanced security");
	}

	return features;
}

export function getPlanAction(
	currentPlanId: string | null,
	targetPlanId: string,
): "current" | "upgrade" | "downgrade" | "select" {
	if (!currentPlanId) return "select";
	if (currentPlanId === targetPlanId) return "current";

	const currentIndex = PLAN_ORDER.indexOf(currentPlanId);
	const targetIndex = PLAN_ORDER.indexOf(targetPlanId);

	return targetIndex > currentIndex ? "upgrade" : "downgrade";
}
