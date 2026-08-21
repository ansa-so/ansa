"use client";

import { motion } from "framer-motion";
import { Check, Clock, MousePointer, ShoppingCart } from "lucide-react";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

export function FeatureTriggers() {
	return (
		<div className="flex flex-col items-center gap-16 py-16 md:py-24 lg:flex-row-reverse lg:gap-24">
			{/* Text Content */}
			<div className="flex-1">
				<div className="font-mono text-xs uppercase tracking-widest text-[#888] mb-4">
					{"/// Proactive Engagement"}
				</div>
				<Title tag="h2" size="h3" className="mb-6">
					Smart Triggers
				</Title>
				<Text size="subtitle" className="mb-6">
					Don't wait for customers to ask for help. Ansa's proactive triggers allow you to engage
					visitors at the perfect moment to drive conversions.
				</Text>
				<div className="space-y-6 text-lg text-[#555] leading-relaxed">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div>
							<h4 className="flex items-center gap-2 mb-2 font-bold">
								<MousePointer size={16} /> Behavior-Based
							</h4>
							<ul className="space-y-2 text-sm">
								<li className="flex items-center gap-2">
									<Check size={14} className="text-teal-500" /> Exit Intent
								</li>
								<li className="flex items-center gap-2">
									<Check size={14} className="text-teal-500" /> Time on Page
								</li>
							</ul>
						</div>
						<div>
							<h4 className="flex items-center gap-2 mb-2 font-bold">
								<ShoppingCart size={16} /> Commerce-Based
							</h4>
							<ul className="space-y-2 text-sm">
								<li className="flex items-center gap-2">
									<Check size={14} className="text-teal-500" /> Cart Abandonment
								</li>
								<li className="flex items-center gap-2">
									<Check size={14} className="text-teal-500" /> Product Views
								</li>
							</ul>
						</div>
					</div>
					<p className="text-sm italic">
						Deliver the right message to the right visitor at the right moment.
					</p>
				</div>
			</div>

			{/* Visual Content with Solid Color Background */}
			<div className="flex-1 relative w-full min-h-[400px] flex items-center justify-center p-8 md:p-12">
				{/* Solid Color Background */}
				<div className="absolute inset-0 transform bg-teal-100 rotate-1" />

				{/* The UI Mockup (Screenshot-like) */}
				<motion.div
					whileHover={{ y: -5, scale: 1.02 }}
					transition={{ type: "spring", stiffness: 300, damping: 20 }}
					className="relative z-10 w-full h-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-xl overflow-hidden border border-white/50 bg-white"
				>
					<div className="relative flex flex-col h-full overflow-hidden bg-white">
						<div className="bg-[#F3F2EE] border-b border-[#E5E5E5] h-8 flex items-center px-4 gap-2">
							<div className="w-2.5 h-2.5 rounded-full bg-[#CCC]" />
							<div className="w-2.5 h-2.5 rounded-full bg-[#CCC]" />
							<div className="w-2.5 h-2.5 rounded-full bg-[#CCC]" />
						</div>
						<div className="relative flex-1 p-8 bg-white">
							<div className="h-8 bg-[#F3F2EE] w-3/4 mb-4" />
							<div className="h-4 bg-[#F3F2EE] w-full mb-2" />
							<div className="h-4 bg-[#F3F2EE] w-5/6 mb-8" />
							<div className="h-32 bg-[#F3F2EE] w-full" />

							{/* The Smart Trigger Pop-up */}
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.5, duration: 0.5 }}
								className="absolute bottom-4 right-4 w-56 bg-[#1A1A1A] text-white p-4 shadow-xl border border-[#333] z-30 rounded-lg"
							>
								<div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase text-teal-400">
									<Clock size={10} /> Exit intent detected
								</div>
								<p className="text-xs leading-relaxed">
									Wait! Don't leave your cart behind. Here's a{" "}
									<span className="font-bold text-teal-300">10% off</span> code for you:{" "}
									<span className="px-1 font-bold bg-teal-900">STAY10</span>
								</p>
							</motion.div>
						</div>
					</div>
				</motion.div>
			</div>
		</div>
	);
}
