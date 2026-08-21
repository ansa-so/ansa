"use client";

import { motion } from "framer-motion";
import { AlertCircle, BarChart3, TrendingUp, Zap } from "lucide-react";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

export function FeatureAnalytics() {
	return (
		<div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24 py-10 md:py-24 border-b border-[#D1D1D1] last:border-b-0">
			{/* Text Content */}
			<div className="flex-1">
				<div className="font-mono text-xs uppercase tracking-widest text-[#888] mb-4">
					{"/// Continuous Improvement"}
				</div>
				<Title tag="h2" size="h3" className="mb-6">
					Insights & Analytics.
				</Title>
				<Text size="subtitle" className="mb-6">
					Ansa provides a continuous improvement loop, helping you identify gaps in your knowledge
					base and improve your AI's performance over time.
				</Text>
				<div className="space-y-6 text-lg text-[#555] leading-relaxed">
					<ul className="space-y-3">
						<li className="flex items-center gap-3">
							<TrendingUp size={18} className="text-[#1A1A1A] shrink-0" />
							<span>Track confidence scores and resolution rates over time.</span>
						</li>
						<li className="flex items-center gap-3">
							<AlertCircle size={18} className="text-[#1A1A1A] shrink-0" />
							<span>Surface low-confidence and unanswered questions automatically.</span>
						</li>
						<li className="flex items-center gap-3">
							<BarChart3 size={18} className="text-[#1A1A1A] shrink-0" />
							<span>Spot patterns in what your customers are asking most frequently.</span>
						</li>
					</ul>
				</div>
			</div>

			{/* Visual Content with Solid Color Background */}
			<div className="flex-1 relative w-full min-h-[400px] flex items-center justify-center p-8 md:p-12">
				{/* Solid Color Background */}
				<div className="absolute inset-0 transform bg-purple-100 rotate-1" />

				{/* The UI Mockup (Screenshot-like) */}
				<motion.div
					whileHover={{ y: -5, scale: 1.02 }}
					transition={{ type: "spring", stiffness: 300, damping: 20 }}
					className="relative z-10 w-full h-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl overflow-hidden border border-white/50 bg-white"
				>
					<div className="w-full h-full bg-[#F3F2EE] flex flex-col border border-[#D1D1D1] shadow-sm font-sans text-[#1A1A1A]">
						{/* Header */}
						<div className="bg-white border-b border-[#E5E5E5] h-12 flex justify-between items-center px-4">
							<div className="text-sm font-bold tracking-tight">Analytics & Health</div>
							<div className="flex gap-2">
								<span className="text-[10px] font-mono bg-[#F9F9F9] border border-[#E5E5E5] px-2 py-1 text-[#888]">
									LAST 30 DAYS
								</span>
							</div>
						</div>

						{/* Main Dashboard Content */}
						<div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
							{/* 1. Top Metrics Grid */}
							<div className="grid gap-4 md:grid-cols-3">
								<div className="bg-white border border-[#D1D1D1] p-4 flex flex-col justify-between shadow-sm">
									<div className="flex items-center gap-2 mb-2">
										<Zap size={12} className="text-blue-600" />
										<span className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
											Trusted Answer Rate
										</span>
									</div>
									<div className="text-3xl font-medium tracking-tighter">88%</div>
									<div className="text-[10px] text-green-600 mt-1 font-mono">
										↑ 5% vs last period
									</div>
								</div>

								<div className="bg-white border border-[#D1D1D1] p-4 flex flex-col justify-between shadow-sm">
									<div className="flex items-center gap-2 mb-2">
										<div className="w-2 h-2 rounded-full border border-[#888]" />
										<span className="font-mono text-[9px] uppercase tracking-widest text-[#888]">
											Avg Confidence
										</span>
									</div>
									<div className="text-3xl font-medium tracking-tighter">84%</div>
									<div className="text-[10px] text-[#888] mt-1 font-mono">
										Based on 1.2k responses
									</div>
								</div>

								<div className="bg-white border border-[#D1D1D1] p-4 flex flex-col justify-between shadow-sm border-l-4 border-l-red-500">
									<div className="flex items-center gap-2 mb-2">
										<AlertCircle size={12} className="text-red-500" />
										<span className="font-mono text-[9px] uppercase tracking-widest text-red-700">
											Needs Attention
										</span>
									</div>
									<div className="text-3xl font-medium tracking-tighter text-red-600">10</div>
									<div className="text-[10px] text-red-600 mt-1 font-mono">
										Critical Escalations
									</div>
								</div>
							</div>

							{/* 2. Confidence Distribution Chart (Recreated from screenshot) */}
							<div className="bg-white border border-[#D1D1D1] p-5 shadow-sm">
								<div className="flex items-center justify-between mb-6">
									<h4 className="text-xs font-bold uppercase tracking-wide text-[#1A1A1A]">
										Confidence Score Distribution
									</h4>
									<BarChart3 size={14} className="text-[#CCC]" />
								</div>

								<div className="space-y-3">
									{/* High Confidence Row */}
									<div className="flex items-center gap-3 text-xs">
										<span className="font-mono w-12 text-[#888] text-right">90-99</span>
										<div className="flex-1 h-3 bg-[#F3F2EE] rounded-sm overflow-hidden">
											<div className="h-full bg-green-500 w-[65%]" />
										</div>
										<span className="w-8 font-mono text-right">65%</span>
									</div>

									{/* Medium Confidence Row */}
									<div className="flex items-center gap-3 text-xs">
										<span className="font-mono w-12 text-[#888] text-right">70-89</span>
										<div className="flex-1 h-3 bg-[#F3F2EE] rounded-sm overflow-hidden">
											<div className="h-full bg-green-400 w-[25%]" />
										</div>
										<span className="w-8 font-mono text-right">25%</span>
									</div>

									{/* Low Confidence Row (Warning) */}
									<div className="flex items-center gap-3 text-xs">
										<span className="font-mono w-12 text-[#888] text-right">0-69</span>
										<div className="flex-1 h-3 bg-[#F3F2EE] rounded-sm overflow-hidden">
											<div className="h-full bg-yellow-400 w-[10%]" />
										</div>
										<span className="w-8 font-mono text-right">10%</span>
									</div>
								</div>
							</div>

							{/* 3. Actionable Issues List (Recreated from screenshot) */}
							<div className="bg-white border border-[#D1D1D1] shadow-sm">
								<div className="bg-[#FAFAFA] border-b border-[#E5E5E5] px-4 py-2 flex items-center gap-2">
									<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
									<span className="font-mono text-[10px] uppercase font-bold text-red-600">
										Prioritized Issues
									</span>
								</div>

								<div className="divide-y divide-[#F3F2EE]">
									{/* Issue 1 */}
									<div className="p-4 flex items-center justify-between group hover:bg-[#FDFDFB] transition-colors">
										<div className="flex items-start gap-3">
											<div className="mt-0.5 text-red-500">
												<AlertCircle size={14} />
											</div>
											<div>
												<div className="text-xs font-bold text-[#1A1A1A]">
													Knowledge gaps detected
												</div>
												<div className="text-[10px] text-[#888] mt-0.5">
													"Pricing for Enterprise" asked 10x without answer.
												</div>
											</div>
										</div>
										<button className="text-[9px] font-bold uppercase border border-[#D1D1D1] bg-white px-3 py-1.5 hover:bg-[#1A1A1A] hover:text-white transition-colors">
											Fix Answer
										</button>
									</div>

									{/* Issue 2 */}
									<div className="p-4 flex items-center justify-between group hover:bg-[#FDFDFB] transition-colors">
										<div className="flex items-start gap-3">
											<div className="mt-0.5 text-yellow-500">
												<AlertCircle size={14} />
											</div>
											<div>
												<div className="text-xs font-bold text-[#1A1A1A]">
													Low confidence detected
												</div>
												<div className="text-[10px] text-[#888] mt-0.5">
													12 answers below 70% confidence threshold.
												</div>
											</div>
										</div>
										<button className="text-[9px] font-bold uppercase border border-[#D1D1D1] bg-white px-3 py-1.5 hover:bg-[#1A1A1A] hover:text-white transition-colors">
											Review
										</button>
									</div>
								</div>
							</div>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
