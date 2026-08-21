"use client";

import { Calendar, Code2, LayoutGrid, Lock, Search, Sparkles, Table, Zap } from "lucide-react";

const features = [
	{
		icon: Search,
		title: "Smart Parameter Detection",
		description:
			"Automatically identifies numeric IDs, UUIDs, dates, slugs, and query parameters from your URL.",
	},
	{
		icon: LayoutGrid,
		title: "Auto Display Config",
		description:
			"Analyzes your API response to suggest the best display format—cards, carousels, or tables.",
	},
	{
		icon: Lock,
		title: "Auth Header Support",
		description: "Add Bearer tokens, API keys, or custom headers. Credentials are securely stored.",
	},
	{
		icon: Zap,
		title: "Instant Tool Creation",
		description: "Skip the manual configuration. Go from URL to working tool in under 60 seconds.",
	},
	{
		icon: Code2,
		title: "Works with Any REST API",
		description:
			"Connect to any JSON REST API—internal services, third-party APIs, or microservices.",
	},
	{
		icon: Sparkles,
		title: "AI-Ready Schema",
		description: "Generated input schema helps your AI agent understand what parameters to use.",
	},
];

export function FeaturesSection() {
	return (
		<section className="mb-24 bg-[#1A1A1A] text-white -mx-8 px-8 py-16 md:-mx-16 md:px-16">
			<div className="text-center mb-12">
				<h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
					Why use Auto-Discovery?
				</h2>
				<p className="text-lg text-[#888] max-w-xl mx-auto">
					Stop writing boilerplate. Let us handle the configuration.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{features.map((feature) => (
					<div
						key={feature.title}
						className="border border-[#333] p-6 hover:border-[#555] transition-colors"
					>
						<feature.icon className="text-[#F59E0B] mb-4" size={24} />
						<h3 className="text-lg font-medium mb-2">{feature.title}</h3>
						<p className="text-sm text-[#888]">{feature.description}</p>
					</div>
				))}
			</div>
		</section>
	);
}
