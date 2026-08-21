"use client";

import { LayoutGrid } from "lucide-react";
import { Text } from "../ui/text";

export function MarketplaceHero() {
	return (
		<div className="lg:col-span-8">
			<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest">
				<LayoutGrid size={14} />
				<span>Integration Library</span>
			</div>
			<h1 className="text-6xl md:text-8xl font-medium tracking-tight mb-6 leading-[0.9]">
				Extend your <br />
				<span className="font-serif italic text-[#999]">Intelligence.</span>
			</h1>
			<Text tag="p" size="subtitle" className="mb-12">
				Connect Ansa to the tools you already use. Sync data, trigger actions, and automate
				workflows across your entire stack.
			</Text>
		</div>
	);
}
