import { ArrowRight, Scale } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { competitors } from "@/data/competitors";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "Compare Ansa vs Competitors",
	description:
		"See how Ansa compares to Intercom, Zendesk, Drift, Freshdesk, and Tidio. Feature comparisons, pricing breakdowns, and why teams switch to Ansa.",
	keywords: [
		"Intercom alternative",
		"Zendesk alternative",
		"Drift alternative",
		"Freshdesk alternative",
		"AI chatbot comparison",
		"customer support platform comparison",
	],
	openGraph: {
		title: "Compare Ansa vs Competitors",
		description: "Feature comparisons, pricing breakdowns, and why teams switch to Ansa.",
	},
};

export default function ComparePage() {
	const allCompetitors = Object.values(competitors);

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Compare", url: `${BASE_URL}/compare` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pt-32 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Scale size={12} />
						<span>Comparisons</span>
					</div>
					<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.9]">
						How Ansa Compares
					</h1>
					<p className="text-xl text-[#555] max-w-2xl mx-auto leading-relaxed">
						See why teams switch from legacy support platforms to Ansa. Transparent pricing,
						unlimited AI conversations, and no per-resolution fees.
					</p>
				</div>
			</section>

			{/* Competitor Grid */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
					{allCompetitors.map((competitor) => (
						<Link
							key={competitor.id}
							href={`/compare/${competitor.id}`}
							className="bg-white p-10 flex flex-col justify-between hover:bg-[#F9F9F9] transition-colors group h-[320px]"
						>
							<div>
								<h2 className="mb-2 text-2xl font-medium">Ansa vs {competitor.name}</h2>
								<p className="text-sm text-[#888] mb-4">{competitor.tagline}</p>
								<p className="text-[#666] leading-relaxed text-sm line-clamp-3">
									{competitor.description}
								</p>
							</div>
							<div className="flex items-center justify-between pt-6 border-t border-[#E5E5E5]">
								<div className="text-sm">
									<span className="text-[#888]">Starting at </span>
									<span className="font-bold">
										{competitor.plans[0].price}/{competitor.plans[0].period}
									</span>
								</div>
								<div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#888] group-hover:text-foreground transition-colors">
									Compare
									<ArrowRight
										size={12}
										className="transition-transform group-hover:translate-x-1"
									/>
								</div>
							</div>
						</Link>
					))}

					{/* Ansa Card */}
					<Link
						href="/pricing"
						className="bg-[#1A1A1A] text-white p-10 flex flex-col justify-between hover:bg-[#333] transition-colors group h-[320px]"
					>
						<div>
							<h2 className="mb-2 text-2xl font-medium">Ansa</h2>
							<p className="text-sm text-[#888] mb-4">The AI agent platform</p>
							<p className="text-[#999] leading-relaxed text-sm">
								Flat pricing, unlimited AI conversations, SDK/API access, and multi-model AI. No
								per-resolution fees, no per-seat charges.
							</p>
						</div>
						<div className="flex items-center justify-between pt-6 border-t border-[#333]">
							<div className="text-sm">
								<span className="text-[#888]">Starting at </span>
								<span className="font-bold text-green-400">Free</span>
							</div>
							<div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#888] group-hover:text-white transition-colors">
								View Pricing
								<ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
							</div>
						</div>
					</Link>
				</div>
			</section>

			{/* CTA */}
			<section className="px-4 py-32 md:px-8 bg-[#EAE9E5] border-t border-[#D1D1D1]">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">Ready to Switch?</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Try Ansa free with 75 AI responses. No credit card required.
					</p>
					<Link
						href="/signup"
						className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
					>
						Get Started Free
						<ArrowRight size={14} />
					</Link>
				</div>
			</section>
		</div>
	);
}
