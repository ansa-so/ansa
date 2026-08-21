import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

interface BlogPaginationProps {
	currentPage: number;
	totalPages: number;
}

function getPageHref(page: number): string {
	return page === 1 ? "/blog" : `/blog/page/${page}`;
}

export function BlogPagination({ currentPage, totalPages }: BlogPaginationProps) {
	if (totalPages <= 1) return null;

	const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

	return (
		<nav aria-label="Blog pagination" className="mt-16 flex items-center justify-center gap-2">
			{/* Previous */}
			{currentPage > 1 ? (
				<Link
					href={getPageHref(currentPage - 1)}
					className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
				>
					<ArrowLeft size={12} />
					Prev
				</Link>
			) : (
				<span className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#CCC] cursor-not-allowed">
					<ArrowLeft size={12} />
					Prev
				</span>
			)}

			{/* Page numbers */}
			{pages.map((page) => (
				<Link
					key={page}
					href={getPageHref(page)}
					className={
						page === currentPage
							? "flex h-9 w-9 items-center justify-center border border-[#1A1A1A] bg-[#1A1A1A] font-mono text-[10px] text-white"
							: "flex h-9 w-9 items-center justify-center border border-[#D1D1D1] bg-white font-mono text-[10px] text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
					}
				>
					{page}
				</Link>
			))}

			{/* Next */}
			{currentPage < totalPages ? (
				<Link
					href={getPageHref(currentPage + 1)}
					className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#1A1A1A] transition-colors hover:border-[#1A1A1A] hover:bg-[#F3F2EE]"
				>
					Next
					<ArrowRight size={12} />
				</Link>
			) : (
				<span className="flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-[#CCC] cursor-not-allowed">
					Next
					<ArrowRight size={12} />
				</span>
			)}
		</nav>
	);
}
