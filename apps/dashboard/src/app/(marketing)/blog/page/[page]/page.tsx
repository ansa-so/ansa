import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { BlogListPage } from "@/components/blog/blog-list-page";
import { getAllPostsMeta, POSTS_PER_PAGE } from "@/lib/blog";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

interface PageProps {
	params: Promise<{ page: string }>;
}

export async function generateStaticParams() {
	const posts = getAllPostsMeta();
	const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

	// Only generate page/2, page/3, etc. (page 1 is handled by /blog)
	return Array.from({ length: totalPages - 1 }, (_, i) => ({
		page: String(i + 2),
	}));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { page } = await params;
	const pageNum = Number.parseInt(page, 10);

	return {
		title: `Blog — Page ${pageNum} — Ansa`,
		description:
			"Guides, best practices, and news about AI agents, customer support automation, and building better customer experiences.",
		openGraph: {
			title: `Blog — Page ${pageNum} — Ansa`,
			url: `${BASE_URL}/blog/page/${pageNum}`,
		},
	};
}

export default async function BlogPaginatedPage({ params }: PageProps) {
	const { page } = await params;
	const pageNum = Number.parseInt(page, 10);

	// Redirect /blog/page/1 to /blog
	if (pageNum === 1) {
		redirect("/blog");
	}

	// Validate page number
	if (Number.isNaN(pageNum) || pageNum < 1) {
		notFound();
	}

	const posts = getAllPostsMeta();
	const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));

	if (pageNum > totalPages) {
		notFound();
	}

	return <BlogListPage page={pageNum} />;
}
