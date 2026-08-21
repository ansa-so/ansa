"use client";

import { BarChart3, MousePointerClick, TrendingUp, Users } from "lucide-react";

export function AnalyticsSection() {
	return (
		<section id="analytics" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Insights &amp; Analytics</h2>
				<span className="font-mono text-xs text-[#888]">[07]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: Conversation Tracking */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<BarChart3 size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Track Every Conversation</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						See what&apos;s working. Track conversations, response times, resolution rates, and
						customer satisfaction in real-time.
					</p>

					{/* Abstract Visual */}
					<div className="bg-white border border-[#D1D1D1] p-4">
						<div className="space-y-3">
							<div className="flex items-baseline justify-between">
								<span className="text-xs font-mono text-[#888]">Response Time</span>
								<span className="text-lg font-medium">2.4s</span>
							</div>
							<div className="w-full h-2 bg-[#EAE9E5] rounded-full overflow-hidden">
								<div className="h-full bg-green-500 w-[85%]" />
							</div>
							<div className="flex items-baseline justify-between">
								<span className="text-xs font-mono text-[#888]">Resolution Rate</span>
								<span className="text-lg font-medium">94%</span>
							</div>
							<div className="w-full h-2 bg-[#EAE9E5] rounded-full overflow-hidden">
								<div className="h-full bg-blue-500 w-[94%]" />
							</div>
							<div className="flex items-baseline justify-between">
								<span className="text-xs font-mono text-[#888]">CSAT Score</span>
								<span className="text-lg font-medium">4.8/5</span>
							</div>
							<div className="w-full h-2 bg-[#EAE9E5] rounded-full overflow-hidden">
								<div className="h-full bg-purple-500 w-[96%]" />
							</div>
						</div>
					</div>
				</div>

				{/* Feature Card 2: Trigger Analytics */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<MousePointerClick size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Trigger Performance</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Measure trigger effectiveness. See which automations drive engagement and optimize for
						higher conversion rates.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm text-[#666]">Exit Intent - Pricing</span>
							<div className="flex items-center gap-3">
								<span className="text-xs text-[#888]">1.2k fired</span>
								<span className="font-mono text-xs text-green-600">32% CVR</span>
							</div>
						</div>
						<div className="w-full h-2 bg-[#EAE9E5] rounded-full overflow-hidden">
							<div className="h-full bg-green-500 w-[32%]" />
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm text-[#666]">Time on Page - Demo</span>
							<div className="flex items-center gap-3">
								<span className="text-xs text-[#888]">890 fired</span>
								<span className="font-mono text-xs text-blue-600">18% CVR</span>
							</div>
						</div>
						<div className="w-full h-2 bg-[#EAE9E5] rounded-full overflow-hidden">
							<div className="h-full bg-blue-500 w-[18%]" />
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{/* Feature Card 3: Escalation Metrics */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Users size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Escalation Metrics</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Track handoff performance. Monitor escalation reasons, agent response times, and
						resolution rates to optimize your support team.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						<div className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors">
							<span className="text-[#666]">Escalation Rate</span>
							<span className="font-mono text-[#1A1A1A]">12%</span>
						</div>
						<div className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors">
							<span className="text-[#666]">Avg. First Response</span>
							<span className="font-mono text-[#1A1A1A]">2m 34s</span>
						</div>
						<div className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors">
							<span className="text-[#666]">Human Resolution</span>
							<span className="font-mono text-green-600">98%</span>
						</div>
						<div className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors">
							<span className="text-[#666]">SLA Compliance</span>
							<span className="font-mono text-green-600">95%</span>
						</div>
					</div>
				</div>

				{/* Feature Card 4: Continuous Improvement */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<TrendingUp size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Measure Impact</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Identify trends, spot issues early, and improve over time. Data-driven insights to make
						your support better every day.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#666]">Top Issues</span>
							<span className="font-mono text-[10px] text-blue-500">IDENTIFIED</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#666]">Knowledge Gaps</span>
							<span className="font-mono text-[10px] text-yellow-600">FLAGGED</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#666]">Performance Trends</span>
							<span className="font-mono text-[10px] text-green-500">TRACKED</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-[#666]">AI Improvements</span>
							<span className="font-mono text-[10px] text-purple-500">SUGGESTED</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
