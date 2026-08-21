"use client";

import { ArrowRight, Check, Link2, Sparkles } from "lucide-react";

const steps = [
	{
		number: "01",
		icon: Link2,
		title: "Paste your API URL",
		description: "Enter a sample URL with real values, like api.example.com/users/123",
		example: "https://api.yourdomain.com/search?userId=123",
	},
	{
		number: "02",
		icon: Sparkles,
		title: "We detect parameters",
		description: "Our AI identifies IDs, UUIDs, dates, and query params automatically",
		example: "${userId} → numeric_id",
	},
	{
		number: "03",
		icon: Check,
		title: "Tool created instantly",
		description: "Your agent can now call this API with any parameter value",
		example: "search(userId: string)",
	},
];

export function HowItWorksSection() {
	return (
		<section className="mb-24">
			<div className="mb-16 text-center">
				<h2 className="mb-4 text-4xl font-medium tracking-tight md:text-5xl">How it works</h2>
				<p className="text-lg text-[#555] max-w-xl mx-auto">
					Three steps to connect any REST API to your AI agent.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
				{steps.map((step, i) => (
					<div key={step.number} className="relative">
						{/* Connector Line */}
						{i < steps.length - 1 && (
							<div className="absolute hidden w-full md:block top-12 left-full">
								<div className="flex items-center justify-center w-full">
									<ArrowRight className="text-[#D1D1D1]" size={24} />
								</div>
							</div>
						)}

						<div className="bg-white border border-[#D1D1D1] p-8 h-full">
							<div className="flex items-center gap-4 mb-6">
								<div className="w-12 h-12 bg-[#1A1A1A] text-white flex items-center justify-center font-mono text-lg font-bold">
									{step.number}
								</div>
								<step.icon className="text-[#888]" size={24} />
							</div>
							<h3 className="mb-3 text-xl font-medium">{step.title}</h3>
							<p className="text-sm text-[#555] mb-4">{step.description}</p>
							<code className="block bg-[#F3F2EE] text-[#1A1A1A] font-mono text-xs p-3 border border-[#D1D1D1]">
								{step.example}
							</code>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
