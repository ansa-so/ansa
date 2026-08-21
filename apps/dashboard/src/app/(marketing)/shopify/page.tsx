import type { Metadata } from "next";
import { HeroSection } from "@/components/shopify/hero-section";
import { ReviewsSection } from "@/components/shopify/reviews-section";
import { SetupSection } from "@/components/shopify/setup-section";
import { StatsSection } from "@/components/shopify/stats-section";
import { UseCasesSection } from "@/components/shopify/use-cases-section";

export const metadata: Metadata = {
	title: "Shopify Integration",
	description:
		"Add AI-powered customer support to your Shopify store. Automatic product sync, order lookup, smart recommendations, and 24/7 automated assistance for your customers.",
	openGraph: {
		title: "Shopify Integration - Ansa AI Customer Support",
		description:
			"Add AI-powered customer support to your Shopify store. Automatic product sync, order lookup, and 24/7 automated assistance.",
	},
};

export default function Shopify() {
	return (
		<div>
			<HeroSection />
			<StatsSection />
			<UseCasesSection />
			<ReviewsSection />
			<SetupSection />
		</div>
	);
}
