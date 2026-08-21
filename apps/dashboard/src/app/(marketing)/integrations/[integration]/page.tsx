import { ArrowRight, CheckCircle2, Plug, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getIntegration, integrationIds } from "@/data/integrations";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

interface PageProps {
	params: Promise<{ integration: string }>;
}

export async function generateStaticParams() {
	return integrationIds.map((id) => ({ integration: id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { integration: integrationId } = await params;
	const integration = getIntegration(integrationId);

	if (!integration) {
		return { title: "Integration" };
	}

	return {
		title: integration.metaTitle,
		description: integration.metaDescription,
		keywords: [
			`${integration.name} AI integration`,
			`${integration.name} chatbot`,
			`${integration.name} automation`,
			"AI customer support",
			"AI agent integration",
		],
		openGraph: {
			title: integration.metaTitle,
			description: integration.metaDescription,
		},
	};
}

export default async function IntegrationPage({ params }: PageProps) {
	const { integration: integrationId } = await params;
	const integration = getIntegration(integrationId);

	if (!integration) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Integrations", url: `${BASE_URL}/integrations` },
					{ name: integration.name, url: `${BASE_URL}/integrations/${integration.id}` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pt-32 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Plug size={12} />
						<span>{integration.category}</span>
					</div>
					<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.9]">
						{integration.name} + <span className="font-serif italic text-[#999]">Ansa</span>
					</h1>
					<p className="text-xl text-[#555] max-w-2xl mx-auto leading-relaxed mb-12">
						{integration.heroDescription}
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Get Started Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/marketplace"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							View All Integrations
						</Link>
					</div>
				</div>
			</section>

			{/* How It Works */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="mb-16 text-center">
					<h2 className="mb-6 text-4xl font-light">How It Works</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						Connect {integration.name} to Ansa in minutes.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#D1D1D1] border border-[#D1D1D1] max-w-4xl mx-auto">
					{integration.howItWorks.map((step, index) => (
						<div key={step.step} className="bg-white p-10 flex flex-col items-center text-center">
							<div className="w-12 h-12 flex items-center justify-center border border-[#D1D1D1] mb-6 font-mono text-lg font-bold text-[#888]">
								{index + 1}
							</div>
							<h3 className="mb-2 text-xl font-medium">{step.step}</h3>
							<p className="text-sm text-[#666] leading-relaxed">{step.description}</p>
						</div>
					))}
				</div>
			</section>

			{/* Use Cases */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1800px] mx-auto">
					<div className="mb-16">
						<h2 className="mb-6 text-4xl font-light">What You Can Do</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							Common use cases for the {integration.name} integration.
						</p>
					</div>
					<div className="grid gap-px md:grid-cols-2 bg-[#D1D1D1] border border-[#D1D1D1]">
						{integration.useCases.map((useCase) => (
							<div
								key={useCase.title}
								className="flex gap-4 p-10 bg-white hover:bg-[#F9F9F9] transition-colors"
							>
								<CheckCircle2 className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
								<div>
									<h3 className="mb-2 text-xl font-medium">{useCase.title}</h3>
									<p className="text-[#666]">{useCase.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-4 py-32 md:px-8">
				<div className="max-w-4xl mx-auto text-center">
					<div className="flex items-center justify-center w-16 h-16 mx-auto mb-8 border border-[#D1D1D1] bg-white">
						<Zap className="w-8 h-8 text-foreground" />
					</div>
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">
						Connect {integration.name} Today
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Start free with 75 AI responses. No credit card required.
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
