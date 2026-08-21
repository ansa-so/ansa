"use client";

import { ArrowRight, Filter } from "lucide-react";
import Link from "next/link";
import { getConfig } from "@/lib/runtime-config";
import { Button } from "../ui/button";

interface MarketplaceSidebarProps {
	categories: string[];
	activeCategory: string;
	setActiveCategory: (category: string) => void;
}

export function MarketplaceSidebar({
	categories,
	activeCategory,
	setActiveCategory,
}: MarketplaceSidebarProps) {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";
	return (
		<aside className="lg:col-span-3">
			<div className="sticky top-32 space-y-8">
				<div className="border border-[#D1D1D1] bg-white">
					<div className="p-4 border-b border-[#D1D1D1] bg-[#F9F9F9]">
						<div className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase">
							<Filter size={14} /> Categories
						</div>
					</div>
					<div className="flex flex-col">
						{categories.map((cat) => (
							<button
								key={cat}
								type="button"
								onClick={() => setActiveCategory(cat)}
								className={`
                      text-left px-4 py-3 text-xs font-mono uppercase tracking-widest border-b border-[#F3F2EE] last:border-0 hover:bg-[#F3F2EE] transition-colors flex justify-between group
                      ${activeCategory === cat ? "bg-[#1A1A1A] text-white hover:!bg-[#1A1A1A]" : "text-[#555]"}
                    `}
							>
								{cat}
								{activeCategory === cat && <ArrowRight size={12} />}
							</button>
						))}
					</div>
				</div>

				{/* "Build Your Own" Callout */}
				<div className="p-6 bg-[#EAE9E5] border border-[#D1D1D1]">
					<h4 className="mb-2 text-sm font-bold">Build your own</h4>
					<p className="text-xs text-[#666] mb-4 leading-relaxed">
						Can&apos;t find what you need? Use our GraphQL API to build custom connectors.
					</p>
					<Button variant="link" size="none" asChild>
						<Link href={docsUrl}>Read API Docs</Link>
					</Button>
				</div>
			</div>
		</aside>
	);
}
