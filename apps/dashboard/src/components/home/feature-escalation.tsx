"use client";

import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, User, Zap } from "lucide-react";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

export function FeatureEscalation() {
	return (
		<div className="flex flex-col items-center gap-16 py-16 md:py-24 lg:flex-row lg:gap-24">
			{/* Text Content */}
			<div className="flex-1">
				<div className="font-mono text-xs uppercase tracking-widest text-[#888] mb-4">
					{"/// Seamless Escalation"}
				</div>
				<Title tag="h2" size="h3">
					Human Handoff.
				</Title>
				<Text size="subtitle" className="mb-6">
					Ansa's AI is trained to recognize its own limits. When a conversation requires a human
					touch, it escalates instantly and smoothly.
				</Text>
				<Text size="subtitle" className="mb-6">
					It detects signs of frustration, confusion, or complex requests, and sends an immediate
					notification via Slack or email to your team.
				</Text>
				<div className="space-y-6 text-lg text-[#555] leading-relaxed">
					<div className="p-4 text-sm border-l-4 border-red-400 bg-red-50">
						<span className="block mb-1 font-bold text-red-700">Key Feature:</span>
						Every handoff includes a full conversation summary, so your agents never have to ask the
						same questions twice.
					</div>
				</div>
			</div>

			{/* Visual Content with Solid Color Background */}
			<div className="flex-1 relative w-full min-h-[400px] flex items-center justify-center p-8 md:p-12">
				{/* Solid Color Background */}
				<div className="absolute inset-0 transform bg-red-100 rotate-1" />

				{/* The UI Mockup (Screenshot-like) */}
				<motion.div
					whileHover={{ y: -5, scale: 1.02 }}
					transition={{ type: "spring", stiffness: 300, damping: 20 }}
					className="relative z-10 w-full h-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl overflow-hidden border border-white/50 bg-white"
				>
					<div className="w-full h-full bg-[#F3F2EE] flex flex-col border border-[#D1D1D1] shadow-sm font-sans text-[#1A1A1A]">
						{/* --- Header --- */}
						<div className="bg-white border-b border-[#E5E5E5] h-12 flex justify-between items-center px-4">
							<div className="flex items-center gap-3">
								<div className="text-sm font-bold">Free offer inquiry</div>
								<span className="font-mono text-[10px] bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded-sm uppercase tracking-wide">
									Escalated
								</span>
							</div>
							<div className="flex gap-2">
								<div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
								<div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
							</div>
						</div>

						{/* --- Main Content Layout --- */}
						<div className="flex flex-1 overflow-hidden">
							{/* Left: Chat Area (Blurred/Inactive) */}
							<div className="relative flex-1 p-6 bg-white">
								<div className="flex flex-col gap-6 opacity-40 grayscale">
									<div className="flex justify-end">
										<div className="bg-[#1A1A1A] text-white p-3 text-sm rounded-lg rounded-tr-none max-w-[80%]">
											What's the price of this shirt?
										</div>
									</div>
									<div className="text-center text-[10px] font-mono text-[#888] my-2">
										Jan 7, 2026, 7:45 PM
									</div>
								</div>

								{/* Overlay: The "Respond" Action Card (From Screenshot) */}
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] bg-[#FFF9F2] border border-[#F5E1C8] p-5 shadow-lg z-10">
									<div className="flex items-start gap-3 mb-3">
										<div className="mt-1 text-orange-600">
											<User size={16} />
										</div>
										<div>
											<h4 className="text-sm font-bold text-[#5C3D2E]">Respond to Customer</h4>
											<p className="mt-1 text-xs text-orange-800">
												AI confidence was too low to respond automatically.
											</p>
										</div>
									</div>
									<button className="bg-white border border-[#E5CFA5] text-[#5C3D2E] text-xs font-bold uppercase px-4 py-2 hover:bg-[#FFF] transition-colors flex items-center gap-2">
										<ArrowRight size={12} /> Reply Manually
									</button>
								</div>
							</div>

							{/* Right: Sidebar (Context & Confidence) */}
							<div className="w-64 bg-white border-l border-[#D1D1D1] flex flex-col hidden md:block">
								{/* Section: Context */}
								<div className="p-5 border-b border-[#F3F2EE]">
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-4">
										Context
									</div>

									{/* Escalation Source */}
									<div className="flex gap-3 mb-4">
										<Zap size={16} className="text-[#888] shrink-0" />
										<div>
											<div className="text-[10px] uppercase font-bold text-[#888]">
												Escalation Source
											</div>
											<div className="text-sm font-medium leading-tight">AI confidence too low</div>
										</div>
									</div>

									{/* Confidence Meter */}
									<div className="flex gap-3">
										<AlertCircle size={16} className="text-red-500 shrink-0" />
										<div className="w-full">
											<div className="text-[10px] uppercase font-bold text-[#888]">
												AI Confidence
											</div>
											<div className="flex items-baseline gap-2 mb-2">
												<span className="text-sm font-bold text-red-600">Low</span>
												<span className="text-xs text-[#888] font-mono">(37%)</span>
											</div>
											{/* Progress Bar */}
											<div className="h-1.5 w-full bg-[#F3F2EE] rounded-full overflow-hidden">
												<div className="h-full bg-red-500 w-[37%]" />
												{/* Threshold Marker */}
											</div>
											<div className="text-[9px] text-[#888] mt-1 text-right">Threshold: 60%</div>
										</div>
									</div>
								</div>

								{/* Section: History */}
								<div className="p-5 flex-1 bg-[#FAFAF9]">
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-4 flex justify-between items-center">
										Escalation History{" "}
										<span className="bg-[#E5E5E5] px-1.5 py-0.5 rounded-full text-[9px]">1</span>
									</div>

									<div className="relative py-1 pl-3 border-l-2 border-blue-500">
										<div className="absolute -left-[5px] top-0 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
										<div className="flex gap-2 mb-1">
											<span className="bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 uppercase">
												Escalated
											</span>
											<span className="bg-white border border-[#D1D1D1] text-[9px] font-mono px-1.5 py-0.5 uppercase">
												Medium
											</span>
										</div>
										<div className="text-[10px] text-[#888] font-mono">Jan 7, 2026, 7:45 PM</div>
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
