import {
	ArrowRight,
	CheckCircle2,
	Code,
	Headphones,
	LineChart,
	MessageSquare,
	Rocket,
	Users,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI Support for SaaS Companies",
	description:
		"Scale your SaaS customer support with AI agents. Resolve 80%+ of tickets automatically, reduce churn, and provide 24/7 support without scaling your team. SDK/API included.",
	keywords: [
		"SaaS customer support",
		"SaaS AI chatbot",
		"B2B customer support AI",
		"SaaS help desk",
		"software support automation",
		"SaaS onboarding AI",
		"customer success AI",
	],
	openGraph: {
		title: "AI Support for SaaS Companies - Ansa",
		description:
			"Scale your SaaS support with AI. Resolve 80%+ of tickets automatically, reduce churn, 24/7 availability.",
	},
};

const features = [
	{
		icon: Code,
		title: "SDK & API Access",
		description:
			"Embed AI support directly in your product with our SDK. Build custom integrations with our REST API.",
	},
	{
		icon: Zap,
		title: "Instant Onboarding Help",
		description:
			"Guide new users through setup, answer feature questions, and reduce time-to-value automatically.",
	},
	{
		icon: LineChart,
		title: "Reduce Churn",
		description:
			"Catch frustrated users before they leave. Proactive support that addresses issues instantly.",
	},
	{
		icon: Users,
		title: "Scale Without Hiring",
		description:
			"Handle 10x more support volume without expanding your team. AI resolves common issues automatically.",
	},
	{
		icon: Headphones,
		title: "24/7 Global Support",
		description: "Support users in any timezone. Your AI agent never sleeps, never takes breaks.",
	},
	{
		icon: Rocket,
		title: "Fast Implementation",
		description:
			"Go live in hours, not weeks. Import your docs, connect your tools, and start resolving tickets.",
	},
];

const useCases = [
	{
		title: "Feature Questions",
		description: "Instant answers about how your product works, capabilities, and best practices.",
	},
	{
		title: "Account Management",
		description: "Help users manage billing, update settings, and navigate their dashboard.",
	},
	{
		title: "Technical Troubleshooting",
		description: "Debug common issues, explain error messages, and guide users to solutions.",
	},
	{
		title: "Integration Help",
		description: "Assist with API setup, webhook configuration, and third-party integrations.",
	},
];

const stats = [
	{ value: "80%+", label: "Tickets Resolved" },
	{ value: "24/7", label: "Availability" },
	{ value: "<5s", label: "Response Time" },
	{ value: "0", label: "Per-Resolution Fees" },
];

export default function SaaSPage() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "SaaS", url: `${BASE_URL}/solutions/saas` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pt-32 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Code size={12} />
						<span>SaaS</span>
					</div>
					<h1 className="mb-6 text-4xl font-light md:text-6xl tracking-tight">
						AI Support Built for <br />
						<span className="font-serif italic">SaaS Companies</span>
					</h1>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						Your users expect instant answers. Give them AI-powered support that scales with your
						product—not your headcount.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Start Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href={docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							View SDK Docs
						</Link>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="bg-[#1A1A1A] text-white py-24">
				<div className="max-w-[1800px] mx-auto px-4 md:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
						{stats.map((stat) => (
							<div
								key={stat.label}
								className="bg-[#1A1A1A] p-10 flex flex-col items-center justify-center text-center h-[200px]"
							>
								<div className="mb-2 text-5xl font-bold">{stat.value}</div>
								<div className="font-mono text-[10px] text-[#888] uppercase tracking-widest">
									{stat.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="mb-16 text-center">
					<h2 className="mb-6 text-4xl font-light">Why SaaS Teams Choose Ansa</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						Purpose-built for software companies. SDK access, instant setup, and AI that understands
						your product.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
					{features.map((feature) => {
						const Icon = feature.icon;
						return (
							<div
								key={feature.title}
								className="bg-white p-10 flex flex-col justify-between hover:bg-[#F9F9F9] transition-colors group h-[280px]"
							>
								<div>
									<Icon
										size={32}
										className="mb-6 text-[#BBB] group-hover:text-foreground transition-colors"
										strokeWidth={1.5}
									/>
									<h3 className="mb-2 text-xl font-medium">{feature.title}</h3>
								</div>
								<p className="text-sm text-[#666] leading-relaxed">{feature.description}</p>
							</div>
						);
					})}
				</div>
			</section>

			{/* Use Cases */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1800px] mx-auto">
					<div className="mb-16">
						<h2 className="mb-6 text-4xl font-light">Common SaaS Support Scenarios</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							AI that handles the questions your team answers every day.
						</p>
					</div>
					<div className="grid gap-px md:grid-cols-2 bg-[#D1D1D1] border border-[#D1D1D1]">
						{useCases.map((useCase) => (
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
						<MessageSquare className="w-8 h-8 text-foreground" />
					</div>
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">
						Scale Your Support Today
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Join SaaS companies using Ansa to provide exceptional support at scale.
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
							href="/contact"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							Talk to Sales
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
