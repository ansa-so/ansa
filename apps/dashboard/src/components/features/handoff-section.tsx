"use client";

import { ArrowRightLeft, Bell, Gauge, Users } from "lucide-react";

export function HandoffSection() {
	return (
		<section id="handoff" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Human Handoff</h2>
				<span className="font-mono text-xs text-[#888]">[05]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: Confidence Threshold */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Gauge size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Confidence Threshold</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						AI knows when it&apos;s uncertain. Set confidence thresholds to automatically escalate
						to human agents when the AI isn&apos;t sure.
					</p>

					{/* Confidence Visual */}
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-4">
						<div>
							<div className="flex justify-between mb-2">
								<span className="text-xs font-mono text-[#888]">CONFIDENCE LEVEL</span>
								<span className="text-xs font-mono text-[#1A1A1A]">85%</span>
							</div>
							<div className="w-full h-3 bg-[#EAE9E5] rounded-full overflow-hidden relative">
								<div className="w-full h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 opacity-30" />
								<div className="absolute top-0 left-0 h-full bg-green-500 w-[85%]" />
								<div className="absolute top-0 h-full w-0.5 bg-[#1A1A1A]" style={{ left: "70%" }} />
							</div>
							<div className="flex justify-between mt-1 text-[10px] text-[#888]">
								<span>0%</span>
								<span className="text-yellow-600">Threshold: 70%</span>
								<span>100%</span>
							</div>
						</div>
						<div className="border-t border-[#D1D1D1] pt-3 flex items-center justify-between">
							<span className="text-sm text-[#666]">Status</span>
							<span className="font-mono text-xs text-green-600">✓ AI HANDLING</span>
						</div>
					</div>
				</div>

				{/* Feature Card 2: Escalation Sources */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<ArrowRightLeft size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Smart Escalation</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Multiple ways to escalate. User request, low confidence, form submission, or custom
						rules—you decide when humans step in.
					</p>

					<div className="space-y-2">
						{[
							{ source: "User Request", desc: "Customer asks for human", status: "INSTANT" },
							{ source: "Low Confidence", desc: "AI below threshold", status: "AUTO" },
							{ source: "Form Submission", desc: "Lead capture complete", status: "ROUTED" },
							{ source: "Sentiment Detection", desc: "Frustration detected", status: "FLAGGED" },
						].map((item) => (
							<div
								key={item.source}
								className="px-4 py-3 border border-[#D1D1D1] bg-white flex items-center justify-between"
							>
								<div>
									<div className="text-sm font-medium">{item.source}</div>
									<div className="text-[10px] text-[#888]">{item.desc}</div>
								</div>
								<span className="text-[10px] font-mono text-blue-600">{item.status}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{/* Feature Card 3: Team Notifications */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Bell size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Team Notifications</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Never miss an escalation. Get notified via Slack, email, or webhooks the moment a
						conversation needs human attention.
					</p>

					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex items-center gap-3 p-2 bg-[#F3F2EE] border border-[#D1D1D1]">
							<div className="w-8 h-8 bg-[#4A154B] rounded flex items-center justify-center">
								<span className="text-xs font-bold text-white">#</span>
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">#support-escalations</div>
								<div className="text-[10px] text-[#888]">Slack channel notifications</div>
							</div>
							<span className="text-[10px] font-mono text-green-600">ACTIVE</span>
						</div>
						<div className="flex items-center gap-3 p-2 bg-[#F3F2EE] border border-[#D1D1D1]">
							<div className="flex items-center justify-center w-8 h-8 bg-blue-500 rounded">
								<span className="text-xs text-white">@</span>
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">team@company.com</div>
								<div className="text-[10px] text-[#888]">Email notifications</div>
							</div>
							<span className="text-[10px] font-mono text-green-600">ACTIVE</span>
						</div>
					</div>
				</div>

				{/* Feature Card 4: Status Flow */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Users size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">SLA & Assignment</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Set response time targets and priority levels. Automatically assign to the right team
						member based on skills and availability.
					</p>

					<div className="bg-white border border-[#D1D1D1] p-4">
						<div className="flex items-center justify-between gap-2 mb-4">
							{["Open", "Assigned", "In Progress", "Resolved"].map((status, i) => (
								<div key={status} className="flex items-center">
									<div
										className={`px-2 py-1 text-[10px] font-mono rounded ${
											i === 2
												? "bg-blue-100 text-blue-700 border border-blue-200"
												: i < 2
													? "bg-green-100 text-green-700 border border-green-200"
													: "bg-[#F3F2EE] text-[#888] border border-[#D1D1D1]"
										}`}
									>
										{status}
									</div>
									{i < 3 && <span className="text-[#D1D1D1] mx-1 hidden md:block">→</span>}
								</div>
							))}
						</div>
						<div className="border-t border-[#D1D1D1] pt-3 flex justify-between text-xs">
							<span className="text-[#888]">SLA Target</span>
							<span className="font-mono text-[#1A1A1A]">First response &lt; 5min</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
