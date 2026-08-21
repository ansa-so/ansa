"use client";

import { Terminal } from "lucide-react";

const CATEGORIES = ["ALL", "GUIDES", "ENGINEERING", "PRODUCT"] as const;

interface BlogCommandBarProps {
	searchQuery: string;
	onSearchChange: (query: string) => void;
	activeCategory: string;
	onCategoryChange: (category: string) => void;
}

export function BlogCommandBar({
	searchQuery,
	onSearchChange,
	activeCategory,
	onCategoryChange,
}: BlogCommandBarProps) {
	return (
		<div className="mb-12">
			<div className="flex flex-col gap-2 border border-[#D1D1D1] bg-[#FAFAF9] p-2 shadow-sm md:flex-row">
				{/* Search Input */}
				<div className="relative flex-1 group">
					<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] group-focus-within:text-[#1A1A1A]">
						<Terminal size={14} />
					</div>
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						placeholder="search_database..."
						className="h-10 w-full border border-[#E5E5E5] bg-white pl-9 pr-4 font-mono text-xs transition-all placeholder:text-[#CCC] focus:border-[#1A1A1A] focus:outline-none"
					/>
				</div>

				{/* Filter Tabs */}
				<div className="flex overflow-x-auto border border-[#E5E5E5] bg-white">
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							type="button"
							onClick={() => onCategoryChange(cat)}
							className={`h-10 whitespace-nowrap border-r border-[#E5E5E5] px-4 text-[10px] font-bold uppercase transition-colors last:border-r-0 hover:bg-[#FAFAF9] ${
								activeCategory === cat ? "bg-[#1A1A1A] text-white" : "text-[#555]"
							}`}
						>
							{cat}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
