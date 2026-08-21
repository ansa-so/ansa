"use client";

import { MousePointerClick, Play, Timer, Workflow } from "lucide-react";

const triggerTypes = [
	{ name: "Time on Page", desc: "30s, 60s, custom", icon: Timer },
	{ name: "Scroll Depth", desc: "25%, 50%, 75%", icon: MousePointerClick },
	{ name: "Exit Intent", desc: "Mouse leaves viewport", icon: MousePointerClick },
	{ name: "Page View", desc: "URL pattern match", icon: MousePointerClick },
	{ name: "Custom Event", desc: "JS event listener", icon: Play },
];

const actions = [
	{ name: "Open Chat", color: "blue" },
	{ name: "Show Form", color: "purple" },
	{ name: "Show Bubble", color: "green" },
];

export function TriggersSection() {
	return (
		<section id="triggers" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Smart Triggers</h2>
				<span className="font-mono text-xs text-[#888]">[04]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: Trigger Types */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<MousePointerClick size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Proactive Engagement</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Don&apos;t wait for customers to reach out. Trigger conversations based on behavior,
						intent signals, and page context.
					</p>

					<div className="space-y-2">
						{triggerTypes.map((trigger) => (
							<div
								key={trigger.name}
								className="px-4 py-3 border border-[#D1D1D1] bg-white flex items-center justify-between"
							>
								<div className="flex items-center gap-3">
									<trigger.icon size={16} className="text-[#888]" />
									<span className="text-sm font-medium">{trigger.name}</span>
								</div>
								<span className="text-[10px] font-mono text-[#888]">{trigger.desc}</span>
							</div>
						))}
					</div>
				</div>

				{/* Feature Card 2: Actions & Flow */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Workflow size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Trigger → Action</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Configure what happens when triggers fire. Open the chat, display a form, or show a
						custom message bubble—all automatically.
					</p>

					{/* Flow Diagram */}
					<div className="bg-white border border-[#D1D1D1] p-6">
						<div className="flex items-center gap-4 mb-6">
							<div className="flex-1 text-center">
								<div className="text-[10px] font-mono text-[#888] mb-2">TRIGGER</div>
								<div className="bg-[#F3F2EE] border border-[#D1D1D1] p-3 text-xs font-medium">
									Exit Intent
								</div>
							</div>
							<div className="text-[#D1D1D1] hidden md:block">→</div>
							<div className="flex-1 text-center">
								<div className="text-[10px] font-mono text-[#888] mb-2">CONDITION</div>
								<div className="bg-[#F3F2EE] border border-[#D1D1D1] p-3 text-xs font-medium">
									/pricing/*
								</div>
							</div>
							<div className="text-[#D1D1D1] hidden md:block">→</div>
							<div className="flex-1 text-center">
								<div className="text-[10px] font-mono text-[#888] mb-2">ACTION</div>
								<div className="p-3 text-xs font-medium text-blue-700 border border-blue-200 bg-blue-50">
									Open Chat
								</div>
							</div>
						</div>

						<div className="border-t border-[#D1D1D1] pt-4 flex gap-2 justify-center">
							{actions.map((action) => (
								<span
									key={action.name}
									className={`px-3 py-1 text-[10px] font-mono border rounded-full bg-${action.color}-50 border-${action.color}-200 text-${action.color}-700`}
								>
									{action.name}
								</span>
							))}
						</div>
					</div>
				</div>
			</div>

			{/* Analytics Banner */}
			<div className="bg-[#EAE9E5] p-8 md:p-12 mt-px border border-[#D1D1D1] flex flex-col md:flex-row items-center justify-between gap-8">
				<div>
					<h4 className="mb-2 text-lg font-bold">Measure Trigger Performance</h4>
					<p className="text-sm text-[#666]">
						Track impressions, engagement rates, and conversions. A/B test different trigger
						configurations to optimize results.
					</p>
				</div>
				<div className="flex gap-6 text-center">
					<div>
						<div className="text-2xl font-bold">12.4k</div>
						<div className="text-[10px] font-mono text-[#888]">TRIGGERED</div>
					</div>
					<div className="w-px bg-[#D1D1D1]" />
					<div>
						<div className="text-2xl font-bold">3.2k</div>
						<div className="text-[10px] font-mono text-[#888]">ENGAGED</div>
					</div>
					<div className="w-px bg-[#D1D1D1]" />
					<div>
						<div className="text-2xl font-bold text-green-600">26%</div>
						<div className="text-[10px] font-mono text-[#888]">CONVERSION</div>
					</div>
				</div>
			</div>
		</section>
	);
}
