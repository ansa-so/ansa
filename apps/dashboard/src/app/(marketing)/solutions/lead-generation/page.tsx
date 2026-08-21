import {
	ArrowRight,
	Bot,
	CheckCircle2,
	ClipboardList,
	Filter,
	FormInput,
	Mail,
	MessageSquare,
	Sparkles,
	Target,
	TrendingUp,
	UserPlus,
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
	title: "AI Lead Generation — 5x Your Conversion Rate",
	description:
		"Replace static forms with intelligent conversations that capture, qualify, and route leads automatically. 5x your conversion rates with conversational AI.",
	keywords: [
		"AI lead generation",
		"conversational forms",
		"lead capture AI",
		"lead qualification automation",
		"form replacement AI",
		"lead routing",
		"conversion optimization AI",
	],
	openGraph: {
		title: "AI Lead Generation — 5x Your Conversion Rate - Ansa",
		description: "Replace static forms with AI conversations. 5x your conversion rates.",
	},
};

const features = [
	{
		icon: MessageSquare,
		title: "Conversational Forms",
		description:
			"Replace boring forms with engaging conversations that feel natural and increase completion rates.",
	},
	{
		icon: Filter,
		title: "Real-Time Qualification",
		description:
			"Score and qualify leads instantly based on their responses, company data, and engagement signals.",
	},
	{
		icon: UserPlus,
		title: "Progressive Profiling",
		description:
			"Gather information gradually across multiple interactions without overwhelming prospects.",
	},
	{
		icon: Zap,
		title: "Instant Follow-Up",
		description:
			"Engage leads the moment they show interest. No more delays between form submission and response.",
	},
	{
		icon: Target,
		title: "Smart Routing",
		description:
			"Route qualified leads to the right team member based on territory, product interest, or deal size.",
	},
	{
		icon: Mail,
		title: "CRM & Email Sync",
		description:
			"Automatically push leads to your CRM and trigger email sequences based on conversation outcomes.",
	},
];

const stats = [
	{ value: "5x", label: "More Conversions" },
	{ value: "80%", label: "Form Completion" },
	{ value: "2min", label: "Avg. Qualification" },
	{ value: "100%", label: "Lead Capture" },
];

const useCases = [
	{
		title: "Website Lead Capture",
		description:
			"Engage visitors proactively and capture contact information through natural conversations.",
	},
	{
		title: "Event Registration",
		description:
			"Collect registrations for webinars, demos, and events with higher completion rates than forms.",
	},
	{
		title: "Content Gating",
		description:
			"Gather lead information in exchange for premium content, whitepapers, and resources.",
	},
	{
		title: "Newsletter Signups",
		description:
			"Grow your email list with conversational opt-ins that feel personal, not transactional.",
	},
];

export default function LeadGenerationPage() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div className="min-h-screen">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Lead Generation", url: `${BASE_URL}/solutions/lead-generation` },
				]}
			/>
			<MarketingHeader activePage="solutions" />

			{/* Hero */}
			<section className="px-6 pt-32 pb-20">
				<div className="max-w-4xl mx-auto text-center">
					<Badge variant="marketing" className="mb-8">
						<Bot className="w-3.5 h-3.5" />
						Lead Generation
					</Badge>
					<Title tag="h1" size="6xl" className="mb-6">
						Turn Every Visitor Into a{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/70 to-primary">
							Qualified Lead
						</span>
					</Title>
					<Text size="lg" variant="subtitle" className="mb-10">
						Replace static forms with intelligent conversations that capture, qualify, and route
						leads automatically. 5x your conversion rates.
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
							Lead Generation That Actually Works
						</Title>
						<Text size="lg" variant="subtitle">
							Move beyond traditional forms. Create conversations that engage prospects and capture
							the information you need to close deals.
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
							Capture Leads Everywhere
						</Title>
						<Text size="lg" variant="subtitle" className="ml-0">
							From website visitors to event attendees, create lead capture experiences that convert
							at scale.
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
						<ClipboardList className="w-8 h-8 text-primary" />
					</div>
					<Title size="5xl" className="mb-4">
						Ready to Capture More Leads?
					</Title>
					<Text size="lg" variant="subtitle" className="mb-8">
						Join marketing teams using Ansa to generate more qualified leads with less effort.
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
