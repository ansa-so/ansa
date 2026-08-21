import type { Metadata } from "next";
import { BlogListPage } from "@/components/blog/blog-list-page";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "Blog — Ansa",
	description:
		"Guides, best practices, and news about AI agents, customer support automation, and building better customer experiences.",
	openGraph: {
		title: "Blog — Ansa",
		description:
			"Guides, best practices, and news about AI agents, customer support automation, and building better customer experiences.",
		url: `${BASE_URL}/blog`,
	},
	alternates: {
		types: {
			"application/rss+xml": `${BASE_URL}/blog/feed.xml`,
		},
	},
};

export default function BlogIndexPage() {
	return <BlogListPage page={1} />;
}
