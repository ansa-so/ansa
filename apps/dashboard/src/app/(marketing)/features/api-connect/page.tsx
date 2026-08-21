import type { Metadata } from "next";
import { CtaSection } from "@/components/api-connect/cta-section";
import { FeaturesSection } from "@/components/api-connect/features-section";
import { HeroSection } from "@/components/api-connect/hero-section";
import { HowItWorksSection } from "@/components/api-connect/how-it-works-section";

export const metadata: Metadata = {
	title: "API Auto-Discovery",
	description:
		"Connect your API in 60 seconds. Paste a URL and we automatically detect parameters, analyze responses, and create a tool for your AI agent.",
	openGraph: {
		title: "API Auto-Discovery - Ansa",
		description:
			"Connect your API in 60 seconds. Paste a URL and we automatically detect parameters and create a tool for your AI agent.",
	},
};

export default function ApiConnectPage() {
	return (
		<div>
			<HeroSection />
			<HowItWorksSection />
			<FeaturesSection />
			<CtaSection />
		</div>
	);
}
