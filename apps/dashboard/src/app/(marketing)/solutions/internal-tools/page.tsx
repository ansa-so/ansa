import {
	ArrowRight,
	Building2,
	CheckCircle2,
	Cog,
	Database,
	FileSearch,
	Lock,
	MessageSquare,
	Settings,
	Shield,
	Sparkles,
	Users,
	Workflow,
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
	title: "AI Assistants for Internal Teams",
	description:
		"Boost productivity with AI that understands your internal knowledge, processes, and systems. IT help desk, HR, onboarding, and operations support.",
	keywords: [
		"internal AI assistant",
		"employee chatbot",
		"IT help desk AI",
		"HR automation AI",
		"internal knowledge base",
		"onboarding assistant",
		"enterprise AI assistant",
	],
	openGraph: {
		title: "AI Assistants for Internal Teams - Ansa",
		description:
			"Boost team productivity with AI that understands your internal knowledge and processes.",
	},
};

const features = [
	{
		icon: Database,
		title: "Knowledge Base Access",
		description:
			"Connect your internal docs, wikis, and knowledge bases so employees can find answers instantly.",
	},
	{
		icon: Workflow,
		title: "Process Automation",
		description:
			"Automate routine tasks like status updates, report generation, and data lookups through chat.",
	},
	{
		icon: Lock,
		title: "Secure & Private",
		description:
			"Enterprise-grade security with role-based access, SSO, and data encryption. Your data stays yours.",
	},
	{
		icon: Cog,
		title: "Custom Integrations",
		description:
			"Connect to your internal systems, APIs, and databases with custom tool integrations.",
	},
	{
		icon: FileSearch,
		title: "Policy Lookup",
		description:
			"Help employees find HR policies, compliance guidelines, and company procedures instantly.",
	},
	{
		icon: Users,
		title: "Team Collaboration",
		description: "Shared agents for teams with customized access levels and conversation history.",
	},
];

const stats = [
	{ value: "40%", label: "Time Saved" },
	{ value: "5min", label: "Avg. Time to Answer" },
	{ value: "99.9%", label: "Uptime SLA" },
	{ value: "SOC 2", label: "Compliant" },
];

const useCases = [
	{
		title: "IT Help Desk",
		description:
			"Answer common IT questions, reset passwords, and troubleshoot issues without waiting for support.",
	},
	{
		title: "HR & Benefits",
		description:
			"Help employees understand benefits, request time off, and find HR policies quickly.",
	},
	{
		title: "Onboarding Assistant",
		description:
			"Guide new hires through onboarding steps, answer questions, and help them get started faster.",
	},
	{
		title: "Operations Support",
		description:
			"Provide instant access to SOPs, processes, and operational guidelines for your team.",
	},
];

export default function InternalToolsPage() {
	return (
		<div className="min-h-screen">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Internal Tools", url: `${BASE_URL}/solutions/internal-tools` },
				]}
			/>
			<MarketingHeader activePage="solutions" />

			{/* Hero */}
			<section className="px-6 pt-32 pb-20">
				<div className="max-w-4xl mx-auto text-center">
					<Badge variant="marketing" className="mb-8">
						<Users className="w-3.5 h-3.5" />
						Internal Tools
					</Badge>
					<Title tag="h1" size="6xl" className="mb-6">
						AI Assistants for Your{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/70 to-primary">
							Internal Teams
						</span>
					</Title>
					<Text size="lg" variant="subtitle" className="mb-10">
						Boost productivity across your organization with AI that understands your internal
						knowledge, processes, and systems.
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
							Built for Enterprise Needs
						</Title>
						<Text size="lg" className="max-w-2xl mx-auto text-neutral-600 dark:text-neutral-400">
							Secure, scalable, and customizable AI assistants that integrate with your existing
							tools and workflows.
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
							Empower Every Department
						</Title>
						<Text size="lg" variant="subtitle" className="ml-0">
							From IT to HR to Operations, create AI assistants that help your teams work smarter.
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
						<Building2 className="w-8 h-8 text-primary" />
					</div>
					<Title size="5xl" className="mb-4">
						Ready to Boost Team Productivity?
					</Title>
					<Text size="lg" variant="subtitle" className="mb-8">
						Join organizations using Ansa to streamline internal operations and empower their teams.
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
							<Link href="/contact">Request Demo</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
