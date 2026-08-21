import {
	ArrowRight,
	Calendar,
	CheckCircle2,
	DollarSign,
	Filter,
	MessageSquare,
	Sparkles,
	Target,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI Sales Assistant — Qualify Leads & Book Demos 24/7",
	description:
		"Turn website visitors into qualified pipeline with AI-powered sales conversations. Engage, qualify, and convert leads 24/7. Book more demos without hiring more SDRs.",
	keywords: [
		"AI sales assistant",
		"lead qualification AI",
		"automated demo booking",
		"sales chatbot",
		"conversational sales",
		"pipeline automation",
		"sales AI agent",
	],
	openGraph: {
		title: "AI Sales Assistant — Qualify Leads & Book Demos 24/7 - Ansa",
		description:
			"Turn visitors into qualified pipeline with AI sales conversations. Book more demos 24/7.",
	},
};

const features = [
	{
		icon: Filter,
		title: "Smart Lead Qualification",
		description:
			"Automatically qualify leads based on your criteria. Ask the right questions and score prospects in real-time.",
	},
	{
		icon: Calendar,
		title: "Automated Demo Booking",
		description:
			"Let qualified leads book demos directly through chat. Integrates with your calendar to find perfect slots.",
	},
	{
		icon: Target,
		title: "Personalized Engagement",
		description:
			"Tailor conversations based on visitor behavior, company size, and industry for higher conversion rates.",
	},
	{
		icon: Zap,
		title: "Instant Response",
		description:
			"Engage prospects the moment they show interest. No more lost leads due to slow response times.",
	},
	{
		icon: TrendingUp,
		title: "Pipeline Analytics",
		description:
			"Track conversion rates, qualification metrics, and identify bottlenecks in your sales funnel.",
	},
	{
		icon: Users,
		title: "CRM Integration",
		description:
			"Automatically sync qualified leads and conversation data to Salesforce, HubSpot, or your CRM.",
	},
];

const stats = [
	{ value: "3x", label: "More Qualified Leads" },
	{ value: "40%", label: "Higher Conversion" },
	{ value: "<1min", label: "Response Time" },
	{ value: "24/7", label: "Lead Capture" },
];

const useCases = [
	{
		title: "Inbound Lead Qualification",
		description:
			"Engage website visitors, understand their needs, and qualify them before routing to sales reps.",
	},
	{
		title: "Demo Scheduling",
		description:
			"Let prospects book product demos at their convenience, integrated with your team's calendars.",
	},
	{
		title: "Pricing Questions",
		description:
			"Answer pricing inquiries intelligently, highlighting value and directing to the right plan.",
	},
	{
		title: "After-Hours Engagement",
		description:
			"Capture and qualify leads even when your sales team is offline, never miss an opportunity.",
	},
];

export default function SalesPage() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div className="min-h-screen">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Sales", url: `${BASE_URL}/solutions/sales` },
				]}
			/>
			<MarketingHeader activePage="solutions" />

			{/* Hero */}
			<section className="px-6 pt-32 pb-20">
				<div className="max-w-4xl mx-auto text-center">
					<Badge variant="marketing" className="mb-8">
						<Calendar className="w-3.5 h-3.5" />
						Sales
					</Badge>
					<Title tag="h1" size="6xl" className="mb-6">
						Turn Visitors Into{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/70 to-primary">
							Qualified Pipeline
						</span>
					</Title>
					<Text size="lg" variant="subtitle" className="mb-10">
						Engage, qualify, and convert leads 24/7 with AI-powered sales conversations. Book more
						demos while your team focuses on closing.
					</Text>
					<div className="flex flex-wrap justify-center gap-4">
						<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
							<Link href="/signup">
								Get Started for Free
								<ArrowRight className="w-4 h-4 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 px-8 text-base rounded-full"
						>
							<Link href="/contact">Talk to Sales</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="px-6 py-16 bg-neutral-900 dark:bg-neutral-950">
				<div className="max-w-6xl mx-auto">
					<div className="grid grid-cols-2 gap-8 md:grid-cols-4">
						{stats.map((stat) => (
							<div key={stat.label} className="text-center">
								<Title size="5xl" className="mb-2 text-white">
									{stat.value}
								</Title>
								<Text className="text-neutral-400">{stat.label}</Text>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-6 py-24">
				<div className="max-w-6xl mx-auto">
					<div className="mb-16 text-center">
						<Title size="5xl" className="mb-4">
							Your Always-On Sales Assistant
						</Title>
						<Text size="lg" variant="subtitle">
							Capture every opportunity with AI that understands your sales process and qualifies
							leads just like your best reps.
						</Text>
					</div>
					<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{features.map((feature) => {
							const Icon = feature.icon;
							return (
								<div
									key={feature.title}
									className="p-6 border rounded-2xl border-neutral-200 dark:border-neutral-800"
								>
									<div className="flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-primary/10">
										<Icon className="w-6 h-6 text-primary" />
									</div>
									<Title tag="h3" size="lg" className="mb-2">
										{feature.title}
									</Title>
									<Text className="text-neutral-600 dark:text-neutral-400">
										{feature.description}
									</Text>
								</div>
							);
						})}
					</div>
				</div>
			</section>

			{/* Use Cases */}
			<section className="px-6 py-24 bg-neutral-50 dark:bg-neutral-900">
				<div className="max-w-6xl mx-auto">
					<div className="mb-16">
						<Title size="5xl" className="mb-4 ml-0">
							Accelerate Your Sales Funnel
						</Title>
						<Text size="lg" variant="subtitle" className="ml-0">
							From first touch to booked demo, automate the repetitive parts of sales so your team
							can focus on closing deals.
						</Text>
					</div>
					<div className="grid gap-6 md:grid-cols-2">
						{useCases.map((useCase) => (
							<div
								key={useCase.title}
								className="flex gap-4 p-6 bg-white border rounded-2xl dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
							>
								<CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
								<div>
									<Title tag="h3" size="lg" className="mb-2">
										{useCase.title}
									</Title>
									<Text className="text-neutral-600 dark:text-neutral-400">
										{useCase.description}
									</Text>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-6 py-24">
				<div className="max-w-4xl mx-auto text-center">
					<div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/10">
						<DollarSign className="w-8 h-8 text-primary" />
					</div>
					<Title size="5xl" className="mb-4">
						Ready to Grow Your Pipeline?
					</Title>
					<Text size="lg" variant="subtitle" className="mb-8">
						Join sales teams using Ansa to qualify more leads and book more demos, without hiring
						more SDRs.
					</Text>
					<div className="flex flex-wrap justify-center gap-4">
						<Button asChild size="lg" className="h-12 px-8 text-base rounded-full">
							<Link href="/signup">
								Get Started Free
								<ArrowRight className="w-4 h-4 ml-2" />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 px-8 text-base rounded-full"
						>
							<Link href={docsUrl} target="_blank">
								View Documentation
							</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
