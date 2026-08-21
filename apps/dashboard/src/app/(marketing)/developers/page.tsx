import { CapabilityBlocks } from "@/components/developers/capability-blocks";
import { DevelopersCTA } from "@/components/developers/developers-cta";
import { DevelopersHero } from "@/components/developers/developers-hero";
import { InteractiveCodeBlock } from "@/components/developers/interactive-code-block";
import { SDKGrid } from "@/components/developers/sdk-grid";
import { TechnicalSpecs } from "@/components/developers/technical-specs";

export default function DevelopersPage() {
	return (
		<div>
			<section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-0 border-b border-[#D1D1D1] pb-24 mb-12 md:mb-24">
				<DevelopersHero />
				<InteractiveCodeBlock />
			</section>

			<SDKGrid />
			<CapabilityBlocks />
			<TechnicalSpecs />

			<DevelopersCTA />
		</div>
	);
}
