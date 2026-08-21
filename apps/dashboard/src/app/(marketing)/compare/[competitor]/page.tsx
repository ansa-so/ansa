import { ArrowRight, Check, CheckCircle2, Minus, Scale, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema, ComparisonSchema } from "@/components/seo/structured-data";
import { Title } from "@/components/ui/title";
import { competitorIds, competitors, getCompetitor } from "@/data/competitors";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

interface PageProps {
	params: Promise<{ competitor: string }>;
}

export async function generateStaticParams() {
	return competitorIds.map((id) => ({ competitor: id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { competitor: competitorId } = await params;
	const competitor = getCompetitor(competitorId);

	if (!competitor) {
		return { title: "Comparison" };
	}

	return {
		title: competitor.metaTitle,
		description: competitor.metaDescription,
		keywords: [
			`${competitor.name} alternative`,
			`${competitor.name} vs Ansa`,
			`Ansa vs ${competitor.name}`,
			`${competitor.name} competitor`,
			"AI customer support",
			"AI chatbot platform",
		],
		openGraph: {
			title: competitor.metaTitle,
			description: competitor.metaDescription,
		},
	};
}

function FeatureValue({ value }: { value: boolean | string }) {
	if (value === true) {
		return <Check className="w-5 h-5 text-green-600" />;
	}
	if (value === false) {
		return <X className="w-5 h-5 text-red-400" />;
	}
	return <span className="text-sm">{value}</span>;
}

export default async function ComparisonPage({ params }: PageProps) {
	const { competitor: competitorId } = await params;
	const competitor = getCompetitor(competitorId);

	if (!competitor) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<ComparisonSchema competitor={competitor.name} competitorUrl={competitor.url} />
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Compare", url: `${BASE_URL}/compare` },
					{ name: `vs ${competitor.name}`, url: `${BASE_URL}/compare/${competitor.id}` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Scale size={12} />
						<span>Comparison</span>
					</div>
					<Title tag="h1" size="h1" className="mb-6">
						Ansa vs {competitor.name}
					</Title>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						See why teams choose Ansa as their {competitor.name} alternative. Unlimited AI
						conversations, transparent pricing, and enterprise-ready features.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Try Ansa Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/pricing"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							View Pricing
						</Link>
					</div>
				</div>
			</section>

			{/* Quick Comparison */}
			<section className="bg-[#1A1A1A] text-white py-16">
				<div className="max-w-[1800px] mx-auto px-4 md:px-8">
					<div className="grid grid-cols-2 gap-px bg-[#333] border border-[#333]">
						<div className="bg-[#1A1A1A] p-8 text-center">
							<div className="mb-4 text-4xl font-bold text-green-400">Free</div>
							<div className="font-mono text-xs text-[#888] uppercase tracking-widest">
								Ansa Starting Price
							</div>
						</div>
						<div className="bg-[#1A1A1A] p-8 text-center">
							<div className="mb-4 text-4xl font-bold text-[#888]">
								{competitor.plans[0].price}
								<span className="text-lg">/{competitor.plans[0].period}</span>
							</div>
							<div className="font-mono text-xs text-[#888] uppercase tracking-widest">
								{competitor.name} Starting Price
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Why Switch */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="mb-16 text-center">
					<h2 className="mb-6 text-4xl font-light">Why Teams Switch From {competitor.name}</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">{competitor.description}</p>
				</div>

				<div className="grid gap-16 md:grid-cols-2">
					{/* Competitor Limitations */}
					<div>
						<h3 className="mb-6 text-lg font-mono uppercase tracking-widest text-[#888]">
							{competitor.name} Limitations
						</h3>
						<div className="space-y-4">
							{competitor.limitations.map((limitation) => (
								<div
									key={limitation}
									className="flex items-start gap-3 p-4 border border-red-100 bg-red-50"
								>
									<Minus className="w-5 h-5 mt-0.5 text-red-400 shrink-0" />
									<span className="text-[#555]">{limitation}</span>
								</div>
							))}
						</div>
					</div>

					{/* Ansa Advantages */}
					<div>
						<h3 className="mb-6 text-lg font-mono uppercase tracking-widest text-[#888]">
							Why Ansa
						</h3>
						<div className="space-y-4">
							{competitor.ansaAdvantages.map((advantage) => (
								<div
									key={advantage}
									className="flex items-start gap-3 p-4 border border-green-100 bg-green-50"
								>
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 shrink-0" />
									<span className="text-[#555]">{advantage}</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* Feature Comparison Table */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1200px] mx-auto">
					<div className="mb-16 text-center">
						<h2 className="mb-6 text-4xl font-light">Feature Comparison</h2>
						<p className="text-xl text-[#666]">See how Ansa stacks up against {competitor.name}</p>
					</div>

					<div className="overflow-hidden bg-white border border-[#D1D1D1]">
						{/* Header */}
						<div className="grid grid-cols-3 gap-px bg-[#D1D1D1] border-b border-[#D1D1D1]">
							<div className="bg-[#F3F2EE] p-6 font-mono text-xs uppercase tracking-widest text-[#888]">
								Feature
							</div>
							<div className="bg-[#F3F2EE] p-6 font-mono text-xs uppercase tracking-widest text-center text-green-600">
								Ansa
							</div>
							<div className="bg-[#F3F2EE] p-6 font-mono text-xs uppercase tracking-widest text-center text-[#888]">
								{competitor.name}
							</div>
						</div>

						{/* Rows */}
						{competitor.features.map((feature, index) => (
							<div
								key={feature.name}
								className={`grid grid-cols-3 gap-px bg-[#D1D1D1] ${
									index < competitor.features.length - 1 ? "border-b border-[#D1D1D1]" : ""
								}`}
							>
								<div className="p-6 font-medium bg-white">{feature.name}</div>
								<div className="flex items-center justify-center p-6 bg-white">
									<FeatureValue value={feature.ansa} />
								</div>
								<div className="flex items-center justify-center p-6 bg-white">
									<FeatureValue value={feature.competitor} />
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Pricing Comparison */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="mb-16 text-center">
					<h2 className="mb-6 text-4xl font-light">Pricing Comparison</h2>
					<p className="text-xl text-[#666]">Transparent pricing without surprises</p>
				</div>

				<div className="grid max-w-4xl gap-8 mx-auto md:grid-cols-2">
					{/* Ansa Pricing */}
					<div className="p-8 bg-[#1A1A1A] text-white border border-[#333]">
						<div className="mb-6 font-mono text-xs tracking-widest text-green-400 uppercase">
							Ansa
						</div>
						<div className="space-y-4">
							<div className="flex justify-between items-center py-3 border-b border-[#333]">
								<span>Free Trial</span>
								<span className="font-bold">75 responses</span>
							</div>
							<div className="flex justify-between items-center py-3 border-b border-[#333]">
								<span>Pro</span>
								<span className="font-bold">$29/month</span>
							</div>
							<div className="flex justify-between items-center py-3 border-b border-[#333]">
								<span>Enterprise</span>
								<span className="font-bold">Custom</span>
							</div>
						</div>
						<div className="mt-6 pt-6 border-t border-[#333]">
							<div className="text-sm text-[#888]">
								<CheckCircle2 className="inline w-4 h-4 mr-2 text-green-400" />
								Unlimited AI conversations on paid plans
							</div>
						</div>
					</div>

					{/* Competitor Pricing */}
					<div className="p-8 bg-white border border-[#D1D1D1]">
						<div className="mb-6 font-mono text-xs uppercase tracking-widest text-[#888]">
							{competitor.name}
						</div>
						<div className="space-y-4">
							{competitor.plans.map((plan) => (
								<div
									key={plan.name}
									className="flex justify-between items-center py-3 border-b border-[#D1D1D1]"
								>
									<span>
										{plan.name}
										{plan.note && <span className="text-xs text-[#888] ml-2">({plan.note})</span>}
									</span>
									<span className="font-bold">
										{plan.price}/{plan.period}
									</span>
								</div>
							))}
						</div>
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-4 py-32 md:px-8 bg-[#1A1A1A] text-white">
				<div className="max-w-4xl mx-auto text-center">
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">Ready to Switch?</h2>
					<p className="text-lg text-[#888] mb-12 max-w-xl mx-auto">
						Try free with 75 AI responses. No credit card required. Import your knowledge base and
						go live in minutes.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-white text-[#1A1A1A] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F3F2EE] transition-colors inline-flex items-center gap-2"
						>
							Get Started Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/contact"
							className="border border-[#555] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
						>
							Talk to Sales
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
