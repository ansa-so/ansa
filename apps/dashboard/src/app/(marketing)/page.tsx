import { ArrowRight } from "lucide-react";
import { CommunicationGateways } from "@/components/home/communication-gateways";
import { CTAV4 } from "@/components/home/cta-v4";
import { DevelopersSection } from "@/components/home/developers-section";
import { EnterpriseSection } from "@/components/home/enterprise-section";
import { FeatureAnalytics } from "@/components/home/feature-analytics";
import { FeatureEscalation } from "@/components/home/feature-escalation";
import { FeatureKnowledge } from "@/components/home/feature-knowledge";
import { FeatureTools } from "@/components/home/feature-tools";
import { FeatureTriggers } from "@/components/home/feature-triggers";
import { HeroV4 } from "@/components/home/hero-v4";
import { IntegrationsSection } from "@/components/home/integrations-section";
import { OperationalModules } from "@/components/home/operational-modules";
import { SoftwareProductSchema } from "@/components/seo/structured-data";

export default function MarketingHomePage() {
	return (
		<div className="">
			<SoftwareProductSchema />
			<HeroV4 />
			<div className="px-6 mx-auto max-w-7xl">
				<CommunicationGateways />
				<OperationalModules />
			</div>
			<section className="px-0 md:px-8 max-w-[1800px] mx-auto mb-0 mt-40">
				<div className="mb-16 text-center md:mb-24">
					<h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-6 leading-[0.9]">
						The complete <br />
						<span className="font-serif italic text-[#999]">AI stack.</span>
					</h2>
					<p className="text-xl text-[#555] leading-relaxed max-w-2xl mx-auto">
						Five layers of intelligence working together to automate your workflows, from ingestion
						to resolution.
					</p>
				</div>
				<div className="">
					<FeatureKnowledge />
					<FeatureTools />
					<FeatureEscalation />
					<FeatureTriggers />
					<FeatureAnalytics />
				</div>
				{/* Discrete Feature Index Link */}
				<div className="flex justify-center pt-4 pb-8">
					<a
						href="/features"
						className="group flex items-center gap-3 px-5 py-2.5 border border-[#D1D1D1] bg-white hover:border-[#1A1A1A] hover:shadow-sm transition-all duration-300"
					>
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] group-hover:text-[#1A1A1A] transition-colors">
							View More Feature
						</span>
						<div className="w-5 h-5 rounded-full bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center text-[#888] group-hover:bg-[#1A1A1A] group-hover:border-[#1A1A1A] group-hover:text-white transition-all duration-300">
							<ArrowRight
								size={10}
								className="transition-transform duration-300 group-hover:-rotate-45"
							/>
						</div>
					</a>
				</div>
			</section>
			<IntegrationsSection />
			<DevelopersSection />
			<EnterpriseSection />
			<CTAV4 />
		</div>
	);
}
