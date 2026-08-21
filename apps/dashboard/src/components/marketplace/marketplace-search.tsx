"use client";

import { Search } from "lucide-react";

interface MarketplaceSearchProps {
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	resultCount: number;
}

export function MarketplaceSearch({
	searchQuery,
	setSearchQuery,
	resultCount,
}: MarketplaceSearchProps) {
	return (
		<div className="lg:col-span-4">
			<div className="relative">
				<input
					type="text"
					placeholder="Search integrations..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full bg-white border border-[#D1D1D1] p-4 pl-12 text-sm font-mono placeholder:text-[#BBB] focus:outline-none focus:border-[#1A1A1A] transition-colors"
				/>
				<Search className="absolute left-4 top-4 text-[#BBB]" size={18} />
			</div>
			<div className="mt-2 text-right">
				<span className="font-mono text-[10px] text-[#888] uppercase tracking-widest">
					Showing {resultCount} Apps
				</span>
			</div>
		</div>
	);
}
