import {
	ArrowRight,
	CheckCircle2,
	Clock,
	Filter,
	Inbox,
	MessageSquare,
	RefreshCw,
	Tag,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI Ticket Automation",
	description:
		"Automate support ticket resolution with AI. Resolve 80%+ of tickets automatically, route complex issues to the right team, reduce response times by 90%.",
	keywords: [
		"ticket automation",
		"AI ticket resolution",
		"automated support tickets",
		"helpdesk automation",
		"ticket deflection",
		"support automation",
		"AI helpdesk",
	],
	openGraph: {
		title: "AI Ticket Automation - Ansa",
		description:
			"Automate support ticket resolution. Resolve 80%+ automatically, reduce response times by 90%.",
	},
};

const features = [
	{
		icon: Zap,
		title: "Instant Resolution",
		description:
			"AI resolves common tickets in seconds. No waiting, no queue, no frustration for your customers.",
	},
	{
		icon: Filter,
		title: "Smart Routing",
		description:
			"Complex issues automatically routed to the right team with full context. AI knows when to escalate.",
	},
	{
		icon: Tag,
		title: "Auto-Tagging",
		description: "Tickets automatically categorized and tagged. Better reporting, easier analysis.",
	},
	{
		icon: Clock,
		title: "24/7 Processing",
		description: "Tickets resolved around the clock. No backlog when your team starts their day.",
	},
	{
		icon: Inbox,
		title: "Multi-Channel",
		description: "Automate tickets from email, chat, and forms. One AI, all your support channels.",
	},
	{
		icon: RefreshCw,
		title: "Continuous Learning",
		description:
			"AI learns from every resolution. Gets smarter and handles more tickets over time.",
	},
];

const useCases = [
	{
		title: "FAQ Tickets",
		description: "Instantly resolve the repetitive questions your team answers daily.",
	},
	{
		title: "Status Inquiries",
		description: "Order status, shipping updates, account info—all automated.",
	},
	{
		title: "Password Resets",
		description: "Guide users through self-service password recovery automatically.",
	},
	{
		title: "Billing Questions",
		description: "Answer invoice questions, explain charges, provide receipts instantly.",
	},
];

const stats = [
	{ value: "80%+", label: "Auto-Resolved" },
	{ value: "90%", label: "Faster Response" },
	{ value: "24/7", label: "Processing" },
	{ value: "0", label: "Queue Time" },
];

export default function TicketAutomationPage() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Ticket Automation", url: `${BASE_URL}/solutions/ticket-automation` },
				]}
			/>

			{/* Hero */}
			<section className="px-4 md:px-8 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Zap size={12} />
						<span>Automation</span>
					</div>
					<h1 className="mb-6 text-4xl font-light tracking-tight md:text-6xl">
						Automate Support <br />
						<span className="font-serif italic">Ticket Resolution</span>
					</h1>
					<p className="text-xl text-[#666] max-w-2xl mx-auto mb-12">
						Stop drowning in tickets. Let AI handle the repetitive work so your team can focus on
						complex issues that need a human touch.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Start Automating
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
					<h2 className="mb-6 text-4xl font-light">How Ticket Automation Works</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						AI that understands tickets, resolves what it can, and routes what it can't.
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
						<h2 className="mb-6 text-4xl font-light">Tickets That Automate Best</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							The repetitive tickets that eat up your team's time.
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
						Clear Your Ticket Queue
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Start automating today. See results in hours, not weeks.
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
