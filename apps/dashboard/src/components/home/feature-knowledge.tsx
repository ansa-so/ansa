"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Database, Sparkles } from "lucide-react";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

export function FeatureKnowledge() {
	return (
		<section className="px-4 md:px-8 max-w-[1800px] mx-auto mb-26 md:mb-48">
			<div className="grid items-center grid-cols-1 gap-10 md:gap-24 lg:grid-cols-2">
				{/* Text Side */}
				<div>
					<h3 className="font-mono text-xs text-[#888] uppercase tracking-widest mb-2 md:mb-6">
						{"/// Dynamic Knowledge"}
					</h3>
					<Title tag="h2" size="h3">
						It knows your business.
					</Title>
					<Text size="subtitle" className="max-w-md mb-12">
						Connect your Help Center, Websites, docs, and past tickets. Ansa updates its knowledge
						graph in real-time and cites sources whenever it can.
					</Text>
					<ul className="space-y-4 font-mono text-sm">
						<li className="flex items-center gap-3 border border-[#D1D1D1] bg-white p-3">
							<CheckCircle2 size={16} className="text-green-600" />
							<span>Syncs with Urls, Documents, Question/Answers etc.</span>
						</li>
						<li className="flex items-center gap-3 border border-[#D1D1D1] bg-white p-3">
							<CheckCircle2 size={16} className="text-green-600" />
							<span>Auto-updates on document changes</span>
						</li>
					</ul>
				</div>

				{/* Visual Side */}
				<div className="relative">
					{/* Glow */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-bl from-yellow-100 via-orange-100 to-stone-200 blur-[100px] opacity-60 pointer-events-none" />

					{/* Floating UI Elements */}
					<motion.div
						whileHover={{ y: -5, scale: 1.02 }}
						transition={{ type: "spring", stiffness: 300, damping: 20 }}
						className="relative z-10 bg-white border border-[#D1D1D1] p-8 shadow-[20px_20px_0px_0px_rgba(26,26,26,0.05)]"
					>
						{/* Abstract RAG Visualization */}
						<div className="flex justify-center mb-8">
							<Database size={48} strokeWidth={1} className="text-[#D1D1D1]" />
						</div>

						{/* Floating Source Cards */}
						<div className="grid grid-cols-3 gap-4 mb-8 font-mono text-[10px] uppercase text-[#555] text-center relative z-10">
							<motion.div
								animate={{ y: [0, -10, 0] }}
								transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
								className="bg-[#F9F9F9] border border-[#E5E5E5] p-3 shadow-sm"
							>
								Website URLS
							</motion.div>
							<motion.div
								animate={{ y: [0, -10, 0] }}
								transition={{ repeat: Infinity, duration: 5, delay: 0.5, ease: "easeInOut" }}
								className="bg-[#F9F9F9] border border-[#E5E5E5] p-3 shadow-sm"
							>
								Questions / Answers
							</motion.div>
							<motion.div
								animate={{ y: [0, -10, 0] }}
								transition={{ repeat: Infinity, duration: 6, delay: 1, ease: "easeInOut" }}
								className="bg-[#F9F9F9] border border-[#E5E5E5] p-3 shadow-sm"
							>
								Internal Docs
							</motion.div>
						</div>

						{/* AI Processing Block */}
						<div className="bg-[#1A1A1A] text-white p-6 font-mono text-xs border-t-4 border-green-500 shadow-inner">
							<div className="flex items-center gap-2 mb-4 tracking-widest uppercase">
								<Sparkles size={12} className="text-green-400" /> Semantic Indexing
							</div>
							<div className="space-y-2 text-[#AAA]">
								<div>
									&gt; Chunking documents... <span className="text-green-400">Done.</span>
								</div>
								<div>
									&gt; Generating embeddings (v3)... <span className="text-green-400">Done.</span>
								</div>
								<div>&gt; Knowledge Graph updated.</div>
								<div className="text-white mt-4 pt-4 border-t border-[#333]">
									Ready to query 14,502 nodes.
								</div>
							</div>
						</div>
					</motion.div>
				</div>
			</div>
		</section>
	);
}
