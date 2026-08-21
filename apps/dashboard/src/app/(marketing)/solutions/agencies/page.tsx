import {
	ArrowRight,
	CheckCircle2,
	Layers,
	MessageSquare,
	Palette,
	Settings,
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
	title: "AI Support for Agencies",
	description:
		"Offer AI-powered support to your agency clients. White-label chatbots, multi-client management, and custom branding. Expand your service offerings with Ansa.",
	keywords: [
		"agency AI chatbot",
		"white-label chatbot",
		"agency customer support",
		"multi-client AI support",
		"chatbot for agencies",
		"agency service expansion",
		"white-label AI assistant",
	],
	openGraph: {
		title: "AI Support for Agencies - Ansa",
		description:
			"Offer AI support to clients. White-label chatbots, multi-client management, custom branding.",
	},
};

const features = [
	{
		icon: Palette,
		title: "White-Label Ready",
		description: "Custom branding, colors, and styling. Your clients see your brand, not ours.",
	},
	{
		icon: Layers,
		title: "Multi-Client Management",
		description:
			"Manage all your clients from one dashboard. Separate knowledge bases, separate billing.",
	},
	{
		icon: Settings,
		title: "Full Customization",
		description:
			"Configure each client's AI differently. Custom personas, tools, and behaviors per client.",
	},
	{
		icon: Users,
		title: "Client Portal",
		description:
			"Give clients access to their own analytics and conversation history without full dashboard access.",
	},
	{
		icon: Sparkles,
		title: "Expand Services",
		description: "Add AI support to your service offerings. New revenue stream, minimal overhead.",
	},
	{
		icon: Zap,
		title: "Quick Client Setup",
		description: "Spin up new client instances in minutes. Import their docs and go live fast.",
	},
];

const useCases = [
	{
		title: "Client Website Support",
		description: "Add AI chat widgets to client websites for 24/7 visitor support.",
	},
	{
		title: "E-commerce Support",
		description: "Help e-commerce clients with order tracking, returns, and product questions.",
	},
	{
		title: "Lead Qualification",
		description: "Capture and qualify leads for clients automatically around the clock.",
	},
	{
		title: "Service Expansion",
		description: "Add AI support as a new service line for existing clients.",
	},
];

const stats = [
	{ value: "Unlimited", label: "Clients" },
	{ value: "Custom", label: "Branding" },
	{ value: "Separate", label: "Knowledge Bases" },
	{ value: "Agency", label: "Dashboard" },
];

export default function AgenciesPage() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Agencies", url: `${BASE_URL}/solutions/agencies` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Layers size={12} />
						<span>Agencies</span>
					</div>
					<h1 className="mb-6 text-4xl font-light tracking-tight md:text-6xl">
						AI Support for <br />
						<span className="font-serif italic">Your Agency Clients</span>
					</h1>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						Expand your service offerings with white-label AI support. Manage multiple clients,
						custom branding, separate knowledge bases.
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
							href="/contact"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							Agency Partnership
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
					<h2 className="mb-6 text-4xl font-light">Built for Agencies</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						Everything you need to offer AI support to your clients at scale.
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
						<h2 className="mb-6 text-4xl font-light">Agency Use Cases</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							How agencies use Ansa to serve their clients.
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
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">Grow Your Agency</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Add AI support to your service offerings. New revenue, minimal overhead.
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
							Partnership Inquiry
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
