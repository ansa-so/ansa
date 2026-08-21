import {
	ArrowRight,
	BookOpen,
	CheckCircle2,
	HelpCircle,
	MessageSquare,
	Search,
	Sparkles,
	Users,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI-Powered Self-Service Portal",
	description:
		"Build an AI-powered self-service portal. Let customers find answers instantly with intelligent search, RAG-powered knowledge base, and conversational AI support.",
	keywords: [
		"self-service portal",
		"AI knowledge base",
		"customer self-service",
		"help center AI",
		"self-service support",
		"AI help desk",
		"knowledge base chatbot",
	],
	openGraph: {
		title: "AI-Powered Self-Service Portal - Ansa",
		description:
			"Build an AI self-service portal. Instant answers, intelligent search, conversational support.",
	},
};

const features = [
	{
		icon: Search,
		title: "Intelligent Search",
		description:
			"AI-powered search that understands intent, not just keywords. Customers find answers faster.",
	},
	{
		icon: Sparkles,
		title: "RAG Knowledge Base",
		description:
			"Retrieval-augmented generation delivers accurate answers from your docs. No hallucinations.",
	},
	{
		icon: MessageSquare,
		title: "Conversational AI",
		description:
			"When search isn't enough, customers can ask questions naturally and get instant answers.",
	},
	{
		icon: BookOpen,
		title: "Auto-Updated Content",
		description: "Import docs, websites, and files. Knowledge base stays current automatically.",
	},
	{
		icon: Users,
		title: "Reduce Support Volume",
		description:
			"Customers help themselves. Your team handles fewer tickets, focuses on complex issues.",
	},
	{
		icon: Zap,
		title: "24/7 Availability",
		description: "Self-service never sleeps. Customers get answers any time, any timezone.",
	},
];

const useCases = [
	{
		title: "How-To Questions",
		description: "Customers learn to use your product without contacting support.",
	},
	{
		title: "Troubleshooting",
		description: "Self-diagnose common issues with guided troubleshooting steps.",
	},
	{
		title: "Account Management",
		description: "Find answers about billing, settings, and account features.",
	},
	{
		title: "Product Information",
		description: "Learn about features, capabilities, and best practices.",
	},
];

const stats = [
	{ value: "70%", label: "Self-Service Rate" },
	{ value: "24/7", label: "Availability" },
	{ value: "Instant", label: "Answers" },
	{ value: "RAG", label: "Powered" },
];

export default function SelfServicePage() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Self-Service", url: `${BASE_URL}/solutions/self-service` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<HelpCircle size={12} />
						<span>Self-Service</span>
					</div>
					<h1 className="mb-6 text-4xl font-light tracking-tight md:text-6xl">
						AI-Powered <br />
						<span className="font-serif italic">Self-Service Portal</span>
					</h1>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						Give customers the power to help themselves. Intelligent search, RAG knowledge base, and
						conversational AI—all in one portal.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Build Your Portal
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/features"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							See Features
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
					<h2 className="mb-6 text-4xl font-light">Self-Service That Actually Works</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						More than a help center. AI that understands questions and delivers accurate answers.
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
						<h2 className="mb-6 text-4xl font-light">What Customers Can Self-Serve</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							The questions your customers can answer themselves.
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
						Empower Your Customers
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Build a self-service portal that customers actually want to use.
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
