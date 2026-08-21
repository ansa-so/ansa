"use client";

import { useState } from "react";
import { MarketplaceEmpty } from "@/components/marketplace/marketplace-empty";
import { type MarketplaceApp, MarketplaceGrid } from "@/components/marketplace/marketplace-grid";
import { MarketplaceHero } from "@/components/marketplace/marketplace-hero";
import { MarketplaceSearch } from "@/components/marketplace/marketplace-search";
import { MarketplaceSidebar } from "@/components/marketplace/marketplace-sidebar";

interface MarketplaceClientProps {
	apps: MarketplaceApp[];
}

export function MarketplaceClient({ apps }: MarketplaceClientProps) {
	const [activeCategory, setActiveCategory] = useState("All");
	const [searchQuery, setSearchQuery] = useState("");

	// Extract unique categories
	const categorySet = new Set(apps.map((app) => app.category));
	const categories = ["All", ...Array.from(categorySet).sort()];

	// Filter Logic
	const filteredApps = apps.filter((app) => {
		const matchesCat = activeCategory === "All" || app.category === activeCategory;
		const matchesSearch =
			app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			app.description.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesCat && matchesSearch;
	});

	return (
		<div>
			{/* --- Hero Section --- */}
			<section className="border-b border-[#D1D1D1] pb-16 mb-16">
				<div className="grid items-end grid-cols-1 md:gap-12 lg:grid-cols-12">
					<MarketplaceHero />
					<MarketplaceSearch
						searchQuery={searchQuery}
						setSearchQuery={setSearchQuery}
						resultCount={filteredApps.length}
					/>
				</div>
			</section>

			{/* --- Main Grid Layout --- */}
			<div className="grid grid-cols-1 gap-8 mb-32 lg:grid-cols-12">
				<MarketplaceSidebar
					categories={categories}
					activeCategory={activeCategory}
					setActiveCategory={setActiveCategory}
				/>

				{filteredApps.length > 0 ? <MarketplaceGrid apps={filteredApps} /> : <MarketplaceEmpty />}
			</div>
		</div>
	);
}
