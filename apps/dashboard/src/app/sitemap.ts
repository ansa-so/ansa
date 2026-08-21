import type { MetadataRoute } from "next";
import { integrationIds } from "@/data/integrations";
import { getAllPostsMeta } from "@/lib/blog";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export default function sitemap(): MetadataRoute.Sitemap {
	const now = new Date();

	// Core marketing pages
	const marketingPages = [
		{ url: "", priority: 1.0, changeFrequency: "weekly" as const },
		{ url: "/features", priority: 0.9, changeFrequency: "weekly" as const },
		{ url: "/pricing", priority: 0.9, changeFrequency: "weekly" as const },
		{ url: "/developers", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/enterprise", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/shopify", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/marketplace", priority: 0.7, changeFrequency: "monthly" as const },
		{ url: "/contact", priority: 0.6, changeFrequency: "monthly" as const },
	];

	// Solution pages
	const solutionPages = [
		{ url: "/solutions/customer-support", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/documentation", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/ecommerce", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/sales", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/lead-generation", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/internal-tools", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/saas", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/fintech", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/agencies", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/ticket-automation", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/solutions/self-service", priority: 0.8, changeFrequency: "monthly" as const },
	];

	// Comparison pages
	const comparisonPages = [
		{ url: "/compare", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/compare/intercom", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/compare/zendesk", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/compare/drift", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/compare/freshdesk", priority: 0.8, changeFrequency: "monthly" as const },
		{ url: "/compare/tidio", priority: 0.8, changeFrequency: "monthly" as const },
	];

	// Integration pages
	const integrationPages = integrationIds.map((id) => ({
		url: `/integrations/${id}`,
		priority: 0.7,
		changeFrequency: "monthly" as const,
	}));

	// Legal pages
	const legalPages = [
		{ url: "/terms", priority: 0.3, changeFrequency: "yearly" as const },
		{ url: "/privacy-policy", priority: 0.3, changeFrequency: "yearly" as const },
	];

	// Auth pages (low priority but still indexable)
	const authPages = [
		{ url: "/login", priority: 0.4, changeFrequency: "yearly" as const },
		{ url: "/signup", priority: 0.5, changeFrequency: "yearly" as const },
	];

	const allPages = [
		...marketingPages,
		...solutionPages,
		...comparisonPages,
		...integrationPages,
		...legalPages,
		...authPages,
	];

	// Blog pages
	const blogPosts = getAllPostsMeta();
	const blogPages = [
		{ url: "/blog", priority: 0.8, changeFrequency: "weekly" as const },
		...blogPosts.map((post) => ({
			url: `/blog/${post.slug}`,
			priority: 0.7,
			changeFrequency: "weekly" as const,
		})),
	];

	return [...allPages, ...blogPages].map((page) => ({
		url: `${BASE_URL}${page.url}`,
		lastModified: now,
		changeFrequency: page.changeFrequency,
		priority: page.priority,
	}));
}
