"use client";

import { Search } from "lucide-react";

export function MarketplaceEmpty() {
	return (
		<div className="lg:col-span-9">
			<div className="py-20 text-center border border-[#D1D1D1] bg-white">
				<Search size={48} className="mx-auto text-[#DDD] mb-4" />
				<h3 className="text-lg font-medium text-foreground">No results found</h3>
				<p className="text-sm text-[#888]">Try adjusting your search or filters.</p>
			</div>
		</div>
	);
}
