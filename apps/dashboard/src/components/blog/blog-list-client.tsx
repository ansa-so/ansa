"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { BlogCard } from "@/components/blog/blog-card";
import { BlogCommandBar } from "@/components/blog/blog-command-bar";
import type { BlogPostMeta } from "@/lib/blog";

const POSTS_PER_PAGE = 9;

/** Map command-bar categories to post tag substrings (case-insensitive) */
const CATEGORY_TAG_MAP: Record<string, string[]> = {
	GUIDES: ["guide", "best practices", "how to"],
	ENGINEERING: ["engineering", "open source", "architecture"],
	PRODUCT: ["product", "ai agents", "shopify", "e-commerce"],
};

interface BlogListClientProps {
	allPosts: BlogPostMeta[];
	initialPage: number;
}

export function BlogListClient({ allPosts, initialPage }: BlogListClientProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeCategory, setActiveCategory] = useState("ALL");
	const [page, setPage] = useState(initialPage);

	const filteredPosts = useMemo(() => {
		let posts = allPosts;

		// Category filter
		if (activeCategory !== "ALL") {
			const keywords = CATEGORY_TAG_MAP[activeCategory] ?? [];
			posts = posts.filter((post) =>
				post.tags.some((tag) => keywords.some((kw) => tag.toLowerCase().includes(kw))),
			);
		}

		// Search filter
		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			posts = posts.filter(
				(post) =>
					post.title.toLowerCase().includes(q) ||
					post.description.toLowerCase().includes(q) ||
					post.tags.some((tag) => tag.toLowerCase().includes(q)),
			);
		}

		return posts;
	}, [allPosts, searchQuery, activeCategory]);

	const isFiltering = searchQuery.trim() !== "" || activeCategory !== "ALL";

	const totalPages = Math.max(1, Math.ceil(filteredPosts.length / POSTS_PER_PAGE));
	const currentPage = Math.min(Math.max(1, page), totalPages);
	const paginatedPosts = isFiltering
		? filteredPosts
		: filteredPosts.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);

	// Reset to page 1 when filters change
	const handleSearchChange = (q: string) => {
		setSearchQuery(q);
		setPage(1);
	};

	const handleCategoryChange = (cat: string) => {
		setActiveCategory(cat);
		setPage(1);
	};

	return (
		<>
			<BlogCommandBar
				searchQuery={searchQuery}
				onSearchChange={handleSearchChange}
				activeCategory={activeCategory}
				onCategoryChange={handleCategoryChange}
			/>

			{paginatedPosts.length > 0 ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{paginatedPosts.map((post, i) => (
						<BlogCard key={post.slug} post={post} index={(currentPage - 1) * POSTS_PER_PAGE + i} />
					))}
				</div>
			) : (
				<div className="py-24 text-center">
					<p className="font-mono text-sm uppercase tracking-widest text-[#888]">
						{isFiltering ? "No matching posts found." : "No posts yet — check back soon."}
					</p>
				</div>
			)}

			{/* Client-side pagination (only when not filtering) */}
			{!isFiltering && totalPages > 1 && (
				<nav aria-label="Blog pagination" className="flex items-center justify-center gap-2 mt-16">
					{currentPage > 1 ? (
						<button
							type="button"
							onClick={() => setPage(currentPage - 1)}
							className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
						>
							<ArrowLeft size={12} />
							Prev
						</button>
					) : (
						<span className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#CCC] cursor-not-allowed">
							<ArrowLeft size={12} />
							Prev
						</span>
					)}

					{Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
						<button
							key={p}
							type="button"
							onClick={() => setPage(p)}
							className={
								p === currentPage
									? "flex h-9 w-9 items-center justify-center border border-[#1A1A1A] bg-[#1A1A1A] font-mono text-[10px] text-white"
									: "flex h-9 w-9 items-center justify-center border border-[#D1D1D1] bg-white font-mono text-[10px] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
							}
						>
							{p}
						</button>
					))}

					{currentPage < totalPages ? (
						<button
							type="button"
							onClick={() => setPage(currentPage + 1)}
							className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
						>
							Next
							<ArrowRight size={12} />
						</button>
					) : (
						<span className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#CCC] cursor-not-allowed">
							Next
							<ArrowRight size={12} />
						</span>
					)}
				</nav>
			)}
		</>
	);
}
