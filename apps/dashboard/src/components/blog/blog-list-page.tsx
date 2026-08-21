import { BlogListClient } from "@/components/blog/blog-list-client";
import { getAllPostsMeta } from "@/lib/blog";

interface BlogListPageProps {
	page: number;
}

export function BlogListPage({ page }: BlogListPageProps) {
	const allPosts = getAllPostsMeta();

	return (
		<div className="pb-24">
			{/* Hero */}
			<header className="mb-16">
				<div className="flex items-center gap-2 mb-4">
					<div className="h-2 w-2 animate-pulse bg-[#1A1A1A]" />
					<span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#888]">
						System Status: Recording
					</span>
				</div>

				<h1 className="mb-6 text-5xl font-bold tracking-tight uppercase md:text-7xl">
					Insights & <br />
					<span className="bg-gradient-to-r from-[#1A1A1A] to-[#888] bg-clip-text text-transparent">
						Updates
					</span>
				</h1>

				<p className="max-w-xl border-l-2 border-[#1A1A1A] py-1 pl-4 font-mono text-sm text-[#555] md:text-base">
					Guides, best practices, and release notes about AI agents, customer support automation,
					and building better customer experiences.
				</p>
			</header>

			{/* Command Bar + Posts (client-side search/filter) */}
			<BlogListClient allPosts={allPosts} initialPage={page} />

			{/* Footer Decoration */}
			<div className="flex justify-center mt-16">
				<div className="flex items-center gap-2 opacity-50">
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
				</div>
			</div>
		</div>
	);
}
