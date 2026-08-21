import { ArrowRight, Calendar, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { BlogPostMeta } from "@/lib/blog";

export function BlogCard({ post, index }: { post: BlogPostMeta; index?: number }) {
	const postId = `LOG_${String((index ?? 0) + 1).padStart(3, "0")}`;

	return (
		<Link href={`/blog/${post.slug}`} className="group block">
			<article className="flex h-full flex-col border border-[#D1D1D1] bg-white transition-all duration-200 hover:border-[#1A1A1A] hover:shadow-[6px_6px_0px_0px_#1A1A1A]">
				{/* Image */}
				{post.coverImage && (
					<div className="relative h-48 overflow-hidden border-b border-[#D1D1D1]">
						<Image
							src={post.coverImage}
							alt={post.title}
							width={600}
							height={338}
							className="h-full w-full object-cover opacity-90 grayscale transition-all duration-500 group-hover:opacity-100 group-hover:grayscale-0"
						/>
						<div className="absolute left-2 top-2 z-10 border border-[#1A1A1A] bg-white px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase">
							ID: {postId}
						</div>
					</div>
				)}

				{/* Metadata Bar */}
				<div className="flex items-center gap-3 border-b border-[#F3F2EE] px-5 py-3 font-mono text-[9px] uppercase tracking-wider text-[#888]">
					<span className="flex items-center gap-1">
						<Calendar size={10} />
						{new Date(post.date)
							.toLocaleDateString("en-US", {
								year: "numeric",
								month: "short",
								day: "numeric",
							})
							.toUpperCase()}
					</span>
					<span className="text-[#D1D1D1]">|</span>
					<span className="flex items-center gap-1">
						<Clock size={10} />
						{post.readingTime.toUpperCase()}
					</span>
				</div>

				{/* Content */}
				<div className="flex flex-1 flex-col p-5">
					{/* Tags */}
					<div className="mb-4 flex flex-wrap gap-2">
						{post.tags.map((tag) => (
							<span
								key={tag}
								className="border border-transparent bg-[#F3F2EE] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#1A1A1A] group-hover:border-[#D1D1D1]"
							>
								#{tag.toUpperCase().replace(/\s+/g, "_")}
							</span>
						))}
					</div>

					<h3 className="mb-3 text-lg font-bold leading-tight decoration-2 underline-offset-4 group-hover:underline">
						{post.title}
					</h3>

					<p className="mb-6 line-clamp-3 font-mono text-xs leading-relaxed text-[#555]">
						{post.description}
					</p>

					<div className="mt-auto flex items-center justify-between border-t border-[#F3F2EE] pt-4">
						<span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] transition-all group-hover:gap-2">
							Read Article <ArrowRight size={12} />
						</span>
					</div>
				</div>
			</article>
		</Link>
	);
}
