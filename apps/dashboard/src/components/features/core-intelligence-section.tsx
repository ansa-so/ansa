"use client";

import { BookOpen, Database } from "lucide-react";

export function CoreIntelligenceSection() {
	return (
		<section id="core" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Core Intelligence</h2>
				<span className="font-mono text-xs text-[#888]">[01]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 3: Knowledge Base */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<BookOpen size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Knowledge Base</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Upload your docs, FAQs, and content. Your AI reads it all so you don&apos;t have to
						explain things twice.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						<div className="flex items-center gap-2 text-sm text-[#666]">
							<div className="w-2 h-2 bg-green-500 rounded-full" />
							<span>Documentation synced</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-[#666]">
							<div className="w-2 h-2 bg-green-500 rounded-full" />
							<span>FAQs indexed</span>
						</div>
						<div className="flex items-center gap-2 text-sm text-[#666]">
							<div className="w-2 h-2 bg-green-500 rounded-full" />
							<span>Content ready</span>
						</div>
					</div>
				</div>

				{/* Feature Card 2: RAG / Knowledge */}
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Database size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Live Knowledge Sync</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Connect Notion, Zendesk Guide, or Google Drive. Ansa ingests your documentation in
						seconds and updates automatically when you edit a page.
					</p>
					<div className="flex gap-2">
						{["Notion", "Google Drive", "Zendesk", "Linear"].map((tool) => (
							<span
								key={tool}
								className="px-2 py-1 border border-[#D1D1D1] text-[10px] font-mono uppercase bg-white"
							>
								{tool}
							</span>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
