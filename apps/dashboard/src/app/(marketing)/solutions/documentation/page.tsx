import {
	ArrowRight,
	Book,
	BookOpen,
	CheckCircle2,
	Code2,
	FileCode,
	FileText,
	HelpCircle,
	MessageSquare,
	Search,
	Sparkles,
	Terminal,
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
	title: "AI Documentation Assistant",
	description:
		"Transform your docs into an interactive AI assistant. Help developers find answers instantly with semantic search, code examples, and API guidance.",
	keywords: [
		"documentation chatbot",
		"developer docs AI",
		"API documentation assistant",
		"technical documentation AI",
		"documentation search",
		"developer support AI",
		"code examples AI",
	],
	openGraph: {
		title: "AI Documentation Assistant - Ansa",
		description:
			"Transform docs into an interactive AI assistant. Semantic search, code examples, and API guidance.",
	},
};

const features = [
	{
		icon: Search,
		title: "Semantic Search",
		description:
			"Users can ask questions in natural language and get relevant documentation instantly, no keyword hunting required.",
	},
	{
		icon: Code2,
		title: "Code Examples",
		description:
			"Provide working code snippets and examples tailored to the user's specific use case and programming language.",
	},
	{
		icon: Terminal,
		title: "API Assistance",
		description:
			"Help developers understand endpoints, parameters, and authentication with conversational API support.",
	},
	{
		icon: BookOpen,
		title: "Tutorial Guidance",
		description:
			"Guide users through tutorials and getting-started flows with interactive, step-by-step assistance.",
	},
	{
		icon: HelpCircle,
		title: "Troubleshooting",
		description:
			"Diagnose issues and provide solutions by understanding error messages and user context.",
	},
	{
		icon: Zap,
		title: "Always Current",
		description:
			"Automatically syncs with your latest documentation, ensuring answers are always up-to-date.",
	},
];

const stats = [
	{ value: "50%", label: "Fewer Support Tickets" },
	{ value: "3x", label: "Faster Time to Answer" },
	{ value: "24/7", label: "Developer Support" },
	{ value: "90%", label: "Self-Service Rate" },
];

const useCases = [
	{
		title: "Getting Started Help",
		description:
			"Guide new users through installation, setup, and first steps with your product or API.",
	},
	{
		title: "API Reference Lookup",
		description:
			"Help developers find the right endpoints, understand parameters, and see example responses.",
	},
	{
		title: "Error Resolution",
		description:
			"Diagnose error codes and messages, providing specific solutions from your documentation.",
	},
	{
		title: "Feature Discovery",
		description:
			"Help users discover features and capabilities they didn't know existed in your product.",
	},
];

export default function DocumentationPage() {
	return (
		<div className="min-h-screen">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "Documentation", url: `${BASE_URL}/solutions/documentation` },
				]}
			/>
			<MarketingHeader activePage="solutions" />

			{/* Hero */}
			<section className="px-6 pt-32 pb-20">
				<div className="max-w-4xl mx-auto text-center">
					<Badge variant="marketing">
						<FileText className="w-3.5 h-3.5" />
						Documentation
					</Badge>
					<Title tag="h1" size="6xl" className="max-w-xl mx-auto mt-5 mb-6">
						AI That Makes Your{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary/70 to-primary">
							Docs Come Alive
						</span>
					</Title>
					<Text size="lg" variant="subtitle" className="mb-8">
						Help developers and users find answers instantly. Transform your documentation into an
						interactive assistant that understands context.
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
							Documentation That Answers Back
						</Title>
						<Text size="lg" variant="subtitle">
							Stop forcing users to search through endless pages. Let AI guide them to exactly what
							they need.
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
							Support Every Developer Journey
						</Title>
						<Text size="lg" variant="subtitle" className="ml-0">
							From first-time setup to advanced troubleshooting, be there at every step of the
							developer experience.
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
						<Book className="w-8 h-8 text-primary" />
					</div>
					<Title size="5xl" className="max-w-lg mb-4">
						Ready to Transform Your Docs?
					</Title>
					<Text size="lg" variant="subtitle" className="mb-8">
						Join developer-focused companies using Ansa to make their documentation more accessible
						and useful.
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
							<Link href="/developers">View Our Docs</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
