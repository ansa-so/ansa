"use client";

import { motion } from "framer-motion";
import { Cloud, FileText, GitBranch, Hash, MessageSquare, Plus, ShoppingBag } from "lucide-react";

export function IntegrationsSection() {
	return (
		<section className="px-4 md:px-8 pt-32 max-w-[1400px] mx-auto mb-15 md:mb-48">
			<div className="relative">
				{/* 1. The Warm "Energy" Glow behind the grid */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[140%] bg-gradient-to-r from-stone-200 via-orange-100 to-rose-100 blur-[120px] opacity-60 pointer-events-none" />

				<div className="relative z-10 text-center">
					{/* Editorial Header */}
					<h2 className="text-5xl md:text-7xl font-medium mb-8 tracking-tight leading-[0.95]">
						The center of <br />
						<span className="font-serif italic text-[#999]">your stack.</span>
					</h2>
					<p className="text-xl text-[#555] max-w-2xl mx-auto mb-16 leading-relaxed">
						Ansa acts as the intelligence layer between your database, helpdesk, and internal tools.
						Secure, two-way sync with no hacky workarounds.
					</p>

					{/* 2. The Floating "Dock" Grid */}
					<motion.div
						initial={{ y: 20, opacity: 0 }}
						whileInView={{ y: 0, opacity: 1 }}
						viewport={{ once: true }}
						className="bg-white/50 backdrop-blur-md border-white/60 p-6 rounded-none shadow-[20px_20px_40px_0px_rgba(26,26,26,0.05)] max-w-5xl mx-auto ring-1 ring-[#D1D1D1]"
					>
						{/* Technical Header Bar */}
						<div className="flex justify-between items-center border-b border-[#D1D1D1] pb-4 mb-6 font-mono text-[10px] uppercase tracking-widest text-[#888]">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
								System Status: Connected
							</div>
							<div>Active Nodes: 50+</div>
						</div>

						{/* The Grid */}
						<div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
							{[
								{ name: "Zendesk", cat: "Support", icon: MessageSquare },
								{ name: "Shopify", cat: "Commerce", icon: ShoppingBag },
								{ name: "Linear", cat: "Engineering", icon: GitBranch },
								{ name: "Slack", cat: "Comms", icon: Hash },
								{ name: "Salesforce", cat: "CRM", icon: Cloud },
								{ name: "Notion", cat: "Knowledge", icon: FileText },
							].map((tool, i) => (
								<div
									key={i}
									className="bg-white border border-[#D1D1D1] p-6 flex flex-col items-center justify-center gap-4 hover:border-[#1A1A1A] hover:-translate-y-1 transition-all cursor-pointer group h-40 shadow-sm relative overflow-hidden"
								>
									{/* Hover indicator strip */}
									<div className="absolute top-0 left-0 w-full h-1 bg-[#1A1A1A] transform -translate-y-full group-hover:translate-y-0 transition-transform" />

									<div className="w-12 h-12 bg-[#F9F9F9] border border-[#E5E5E5] rounded-full flex items-center justify-center group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
										<tool.icon size={20} strokeWidth={1.5} />
									</div>
									<div className="text-center">
										<div className="mb-1 text-sm font-bold">{tool.name}</div>
										<div className="font-mono text-[9px] uppercase text-[#AAA] tracking-widest">
											{tool.cat}
										</div>
									</div>
								</div>
							))}
						</div>

						{/* Footer / Link to Marketplace */}
						<div className="mt-6 pt-6 border-t border-[#D1D1D1] flex justify-center">
							<a
								href="/marketplace"
								className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1A1A1A] hover:text-[#555] transition-colors border-b border-[#1A1A1A] pb-0.5 hover:border-[#555]"
							>
								<Plus size={14} />
								Browse Integration Marketplace
							</a>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
