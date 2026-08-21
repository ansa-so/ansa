"use client";

import { useEffect, useState } from "react";
import { AnalyticsSection } from "@/components/features/analytics-section";
import { CoreIntelligenceSection } from "@/components/features/core-intelligence-section";
import { FeaturesCTA } from "@/components/features/features-cta";
import { FeaturesHeader } from "@/components/features/features-header";
import { FeaturesSidebar } from "@/components/features/features-sidebar";
import { FormsSection } from "@/components/features/forms-section";
import { HandoffSection } from "@/components/features/handoff-section";
import { IntegrationsSection } from "@/components/features/integrations-section";
import { MultiChannelSection } from "@/components/features/multi-channel-section";
import { MultilingualSection } from "@/components/features/multilingual-section";
import { RealtimeSection } from "@/components/features/realtime-section";
import { TriggersSection } from "@/components/features/triggers-section";

export default function FeaturesPage() {
	const [activeSection, setActiveSection] = useState("core");

	// Simple scroll spy to update active section in sidebar
	useEffect(() => {
		const handleScroll = () => {
			const sections = [
				"core",
				"realtime",
				"integrations",
				"triggers",
				"handoff",
				"forms",
				"analytics",
				"multichannel",
				"multilingual",
			];

			// Find the section that is currently most visible in viewport
			let currentSection = sections[0];
			let minDistance = Infinity;

			sections.forEach((section) => {
				const element = document.getElementById(section);
				if (element) {
					const rect = element.getBoundingClientRect();
					// Calculate distance from top of viewport (accounting for sticky header)
					const distance = Math.abs(rect.top - 200);

					// If this section is closer to the target position and is visible
					if (distance < minDistance && rect.top < window.innerHeight && rect.bottom > 0) {
						minDistance = distance;
						currentSection = section;
					}
				}
			});

			setActiveSection(currentSection);
		};

		// Run on mount and scroll
		handleScroll();
		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, []);

	return (
		<>
			<FeaturesHeader />

			<div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12">
				<FeaturesSidebar activeSection={activeSection} />

				<div className="space-y-24 lg:col-span-9">
					<CoreIntelligenceSection />
					<RealtimeSection />
					<IntegrationsSection />
					<TriggersSection />
					<HandoffSection />
					<FormsSection />
					<AnalyticsSection />
					<MultiChannelSection />
					<MultilingualSection />
				</div>
			</div>

			<FeaturesCTA />
		</>
	);
}
