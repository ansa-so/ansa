import {
	ArrowRight,
	CheckCircle2,
	CreditCard,
	Lock,
	MessageSquare,
	PiggyBank,
	Shield,
	TrendingUp,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI Support for Financial Services",
	description:
		"Secure AI customer support for fintech and financial services. Enterprise security, compliance-ready, 24/7 availability. Handle account inquiries, transactions, and support at scale.",
	keywords: [
		"fintech AI support",
		"financial services chatbot",
		"banking AI assistant",
		"fintech customer service",
		"financial support automation",
		"secure AI chatbot",
		"enterprise fintech support",
	],
	openGraph: {
		title: "AI Support for Financial Services - Ansa",
		description:
			"Secure AI support for fintech. Enterprise security, compliance-ready, 24/7 availability.",
	},
};

const features = [
	{
		icon: Shield,
		title: "Enterprise Security",
		description:
			"SOC 2 compliant infrastructure. Your data is encrypted at rest and in transit. Self-hosted option for enterprise.",
	},
	{
		icon: Lock,
		title: "Data Privacy",
		description:
			"Keep sensitive financial data secure. Enterprise self-hosted deployment keeps data on your servers.",
	},
	{
		icon: Zap,
		title: "Instant Responses",
		description:
			"Handle high volumes of account inquiries, balance questions, and transaction lookups automatically.",
	},
	{
		icon: TrendingUp,
		title: "Scale Support",
		description:
			"Handle 10x more inquiries without expanding your team. AI resolves common questions instantly.",
	},
	{
		icon: CreditCard,
		title: "Transaction Support",
		description:
			"Integrate with your systems to provide real-time transaction status, payment details, and account info.",
	},
	{
		icon: PiggyBank,
		title: "Cost Efficient",
		description:
			"Reduce support costs while improving response times. No per-resolution fees, predictable pricing.",
	},
];

const useCases = [
	{
		title: "Account Inquiries",
		description: "Instant answers about balances, statements, and account details.",
	},
	{
		title: "Transaction Status",
		description: "Real-time updates on payments, transfers, and pending transactions.",
	},
	{
		title: "Product Questions",
		description: "Explain features, rates, and terms for your financial products.",
	},
	{
		title: "Troubleshooting",
		description: "Help users resolve login issues, card problems, and common errors.",
	},
];

const stats = [
	{ value: "80%+", label: "Inquiries Resolved" },
	{ value: "24/7", label: "Availability" },
	{ value: "<5s", label: "Response Time" },
	{ value: "Enterprise", label: "Self-Hosted Option" },
];

export default function FintechPage() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Fintech", url: `${BASE_URL}/solutions/fintech` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Shield size={12} />
						<span>Financial Services</span>
					</div>
					<h1 className="mb-6 text-4xl font-light tracking-tight md:text-6xl">
						Secure AI Support for <br />
						<span className="font-serif italic">Financial Services</span>
					</h1>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						Enterprise-grade AI support with the security and compliance your financial services
						business requires.
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
							href="/enterprise"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							Enterprise Options
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
					<h2 className="mb-6 text-4xl font-light">Built for Financial Services</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						Security-first AI support designed for the unique needs of fintech and financial
						services.
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
						<h2 className="mb-6 text-4xl font-light">Common Financial Support Scenarios</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							Automate the inquiries your team handles every day.
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
						Secure Support at Scale
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Join financial services companies using Ansa for secure, compliant AI support.
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
