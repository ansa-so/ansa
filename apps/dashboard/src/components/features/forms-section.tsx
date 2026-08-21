"use client";

import { BarChart2, GitBranch, MessageSquare, Sparkles, Webhook } from "lucide-react";

export function FormsSection() {
	return (
		<section id="forms" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Dynamic Forms</h2>
				<span className="font-mono text-xs text-[#888]">[06]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: Natural Conversations */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<MessageSquare size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Conversational Forms</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Turn conversations into conversions. Collect info naturally without forms that feel like
						forms.
					</p>

					{/* Abstract Visual */}
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex gap-2 items-start">
							<div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
							<div className="text-sm text-[#666]">
								<div className="font-medium text-[#1A1A1A] mb-1">Customer:</div>
								&quot;I need help with pricing&quot;
							</div>
						</div>
						<div className="flex gap-2 items-start">
							<div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5" />
							<div className="text-sm text-[#666]">
								<div className="font-medium text-[#1A1A1A] mb-1">AI:</div>
								&quot;What&apos;s your company size?&quot;
							</div>
						</div>
						<div className="border-t border-[#D1D1D1] pt-2 mt-2 text-[10px] font-mono text-green-600">
							✓ Lead captured: company_size, intent, email
						</div>
					</div>
				</div>

				{/* Feature Card 2: Conditional Logic */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<GitBranch size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Conditional Fields</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Show the right fields at the right time. Dynamic forms adapt based on previous answers,
						keeping the experience smooth.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						<div className="flex items-center justify-between text-sm p-2 bg-green-50 border border-green-200">
							<span className="text-[#666]">Role?</span>
							<span className="font-medium text-green-700">Developer</span>
						</div>
						<div className="flex justify-center text-[#D1D1D1]">↓</div>
						<div className="flex items-center justify-between text-sm p-2 bg-blue-50 border border-blue-200">
							<span className="text-[#666]">Tech stack?</span>
							<span className="font-medium text-blue-700">React, Node.js</span>
						</div>
						<div className="flex justify-center text-[#D1D1D1]">↓</div>
						<div className="flex items-center justify-between text-sm p-2 bg-purple-50 border border-purple-200">
							<span className="text-[#666]">API needs?</span>
							<span className="text-[10px] font-mono text-purple-600">SHOWN</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{/* Feature Card 3: Smart Lead Qualification */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Sparkles size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Smart Lead Qualification</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						AI asks the right questions at the right time. Qualify leads, schedule meetings, and
						route to sales—all automatically.
					</p>
					<div className="space-y-2">
						{[
							"Email & Contact Info",
							"Company Details",
							"Intent & Use Case",
							"Budget & Timeline",
						].map((field) => (
							<div
								key={field}
								className="px-3 py-2 border border-[#D1D1D1] text-sm bg-white flex items-center justify-between"
							>
								<span className="text-[#666]">{field}</span>
								<span className="text-[10px] font-mono text-green-600">CAPTURED</span>
							</div>
						))}
					</div>
				</div>

				{/* Feature Card 4: Webhooks & Analytics */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Webhook size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Form Webhooks</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Push form submissions anywhere. Trigger webhooks on completion to sync with your CRM,
						Slack, or any custom workflow.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#666]">On Submit</span>
							<span className="text-[10px] font-mono text-blue-600">→ WEBHOOK</span>
						</div>
						<div className="bg-[#F3F2EE] p-3 font-mono text-[10px] text-[#888] overflow-hidden">
							POST https://your-api.com/leads
						</div>
						<div className="border-t border-[#D1D1D1] pt-3 flex items-center gap-4 text-xs">
							<div className="flex items-center gap-2">
								<BarChart2 size={14} className="text-[#888]" />
								<span className="text-[#666]">Track: impressions, starts, completions</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Handoff Forms Banner */}
			<div className="bg-[#EAE9E5] p-8 md:p-12 mt-px border border-[#D1D1D1] flex flex-col md:flex-row items-center justify-between gap-8">
				<div>
					<h4 className="mb-2 text-lg font-bold">Handoff Forms</h4>
					<p className="text-sm text-[#666]">
						Collect context before escalating to humans. Pre-fill agent dashboards with customer
						info for faster resolution.
					</p>
				</div>
				<div className="flex gap-6 text-center">
					<div>
						<div className="text-2xl font-bold">85%</div>
						<div className="text-[10px] font-mono text-[#888]">COMPLETION</div>
					</div>
					<div className="w-px bg-[#D1D1D1]" />
					<div>
						<div className="text-2xl font-bold text-green-600">3.2x</div>
						<div className="text-[10px] font-mono text-[#888]">FASTER RESOLVE</div>
					</div>
				</div>
			</div>
		</section>
	);
}
