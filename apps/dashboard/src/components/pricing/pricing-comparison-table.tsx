"use client";

import { Check, HelpCircle, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const comparisonData = [
	{
		name: "Monthly AI Responses",
		tooltip:
			"Total number of AI-generated responses your agents can send per month. User messages don't count toward this limit.",
		start: "2,000",
		grow: "15,000",
		pro: "50,000",
		ent: "Unlimited",
	},
	{
		name: "Rate Limit per Conversation",
		tooltip:
			"Maximum AI responses allowed in a single conversation before automatic escalation to prevent infinite loops.",
		start: "50 responses",
		grow: "50 responses",
		pro: "50 responses",
		ent: "50 responses",
	},
	{
		name: "AI Agents",
		tooltip:
			"Number of different AI agents you can create. Each agent can be customized with unique knowledge, tools, and behavior.",
		start: "1",
		grow: "3",
		pro: "Unlimited",
		ent: "Unlimited",
	},
	{
		name: "Tools per Agent",
		tooltip:
			"Number of tools (integrations, actions, forms) each agent can use to perform tasks and collect information.",
		start: "3",
		grow: "10",
		pro: "Unlimited",
		ent: "Unlimited",
	},
	{
		name: "Document Storage",
		tooltip:
			"Total storage space for documents, files, and content that powers your agent's knowledge base.",
		start: "5 MB",
		grow: "34 MB",
		pro: "100 MB",
		ent: "Unlimited",
	},
	{
		name: "AI Quality",
		tooltip:
			"AI model tier. Balanced uses faster, cost-effective models. High Quality uses advanced models for better responses.",
		start: "Balanced",
		grow: "High Quality",
		pro: "High Quality",
		ent: "High Quality",
	},
	{
		name: "Remove Branding",
		tooltip:
			"Option to remove 'Powered by Ansa' branding from your chat widget for a fully white-labeled experience.",
		start: <Minus size={16} className="mx-auto text-[#CCC]" />,
		grow: <Check size={16} className="mx-auto" />,
		pro: <Check size={16} className="mx-auto" />,
		ent: <Check size={16} className="mx-auto" />,
	},
	{
		name: "Escalation to Humans",
		tooltip:
			"Allow conversations to be escalated to your team when the AI needs human assistance or reaches rate limits.",
		start: <Minus size={16} className="mx-auto text-[#CCC]" />,
		grow: <Check size={16} className="mx-auto" />,
		pro: <Check size={16} className="mx-auto" />,
		ent: <Check size={16} className="mx-auto" />,
	},
	{
		name: "Support",
		tooltip:
			"Level of customer support you receive. Higher tiers include faster response times and dedicated support channels.",
		start: "Email",
		grow: "Priority",
		pro: "Priority",
		ent: "Dedicated",
	},
	{
		name: "API Access",
		tooltip: "Programmatic access to Ansa via REST API for custom integrations and automation.",
		start: <Minus size={16} className="mx-auto text-[#CCC]" />,
		grow: <Minus size={16} className="mx-auto text-[#CCC]" />,
		pro: <Check size={16} className="mx-auto" />,
		ent: <Check size={16} className="mx-auto" />,
	},
	{
		name: "Shopify Integration",
		tooltip:
			"Native Shopify integration for order tracking, customer data sync, and automated refund handling.",
		start: <Check size={16} className="mx-auto" />,
		grow: <Check size={16} className="mx-auto" />,
		pro: <Check size={16} className="mx-auto" />,
		ent: <Check size={16} className="mx-auto" />,
	},
	{
		name: "AI Performance Analytics",
		tooltip:
			"Detailed insights into your AI agent's performance, including response confidence scores, topic clustering, and conversation quality metrics to help you improve your knowledge base.",
		start: <Check size={16} className="mx-auto" />,
		grow: <Check size={16} className="mx-auto" />,
		pro: <Check size={16} className="mx-auto" />,
		ent: <Check size={16} className="mx-auto" />,
	},
];

export function PricingComparisonTable() {
	return (
		<section className="mb-32">
			<div className="px-4 mb-12">
				<h2 className="mb-4 text-4xl font-medium">Detailed Specs.</h2>
				<p className="text-[#666]">Full feature breakdown by tier.</p>
			</div>

			<div className="border-t border-[#1A1A1A] overflow-x-auto">
				{/* Table Header */}
				<div className="grid grid-cols-[minmax(160px,1.5fr)_repeat(4,minmax(110px,1fr))] min-w-[640px] bg-[#EAE9E5] border-b border-[#D1D1D1]">
					<div className="p-4 md:p-6 font-mono text-xs text-[#888] sticky left-0 bg-[#EAE9E5] z-10 border-r border-[#D1D1D1] md:border-r-0">
						FEATURE
					</div>
					<div className="p-4 md:p-6 font-mono text-xs text-[#888] text-center border-l border-[#D1D1D1]">
						STARTER
					</div>
					<div className="p-4 md:p-6 font-mono text-xs text-[#1A1A1A] font-bold text-center border-l border-[#D1D1D1]">
						GROWTH
					</div>
					<div className="p-4 md:p-6 font-mono text-xs text-[#888] text-center border-l border-[#D1D1D1]">
						PRO
					</div>
					<div className="p-4 md:p-6 font-mono text-xs text-[#888] text-center border-l border-[#D1D1D1]">
						ENTERPRISE
					</div>
				</div>

				{/* Comparison Rows */}
				{comparisonData.map((row) => (
					<div
						key={row.name}
						className="grid grid-cols-[minmax(160px,1.5fr)_repeat(4,minmax(110px,1fr))] min-w-[640px] border-b border-[#D1D1D1] bg-white hover:bg-[#FAFAFA] transition-colors group"
					>
						<div className="p-4 md:p-6 text-sm font-medium text-[#1A1A1A] flex items-center gap-2 sticky left-0 bg-white group-hover:bg-[#FAFAFA] transition-colors z-10 border-r border-[#D1D1D1] md:border-r-0">
							{row.name}
							<TooltipProvider>
								<Tooltip>
									<TooltipTrigger asChild>
										<HelpCircle
											size={14}
											className="text-[#999] hover:text-[#666] transition-colors cursor-help flex-shrink-0"
										/>
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p>{row.tooltip}</p>
									</TooltipContent>
								</Tooltip>
							</TooltipProvider>
						</div>
						<div className="p-4 md:p-6 text-sm text-[#555] text-center border-l border-[#D1D1D1] flex items-center justify-center font-mono">
							{row.start}
						</div>
						<div className="p-4 md:p-6 text-sm text-[#1A1A1A] font-bold text-center border-l border-[#D1D1D1] flex items-center justify-center font-mono bg-[#F9F9F9]">
							{row.grow}
						</div>
						<div className="p-4 md:p-6 text-sm text-[#555] text-center border-l border-[#D1D1D1] flex items-center justify-center font-mono">
							{row.pro}
						</div>
						<div className="p-4 md:p-6 text-sm text-[#555] text-center border-l border-[#D1D1D1] flex items-center justify-center font-mono">
							{row.ent}
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
