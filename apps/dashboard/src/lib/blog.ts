import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import readingTime from "reading-time";

export const POSTS_PER_PAGE = 9;

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export interface BlogPost {
	slug: string;
	title: string;
	description: string;
	date: string;
	author: string;
	coverImage: string;
	tags: string[];
	readingTime: string;
	content: string;
}

export interface BlogPostMeta {
	slug: string;
	title: string;
	description: string;
	date: string;
	author: string;
	coverImage: string;
	tags: string[];
	readingTime: string;
}

function parseBlogPost(fileName: string): BlogPost {
	const filePath = path.join(BLOG_DIR, fileName);
	const fileContent = fs.readFileSync(filePath, "utf-8");
	const { data, content } = matter(fileContent);
	const stats = readingTime(content);

	return {
		slug: data.slug || fileName.replace(/\.mdx?$/, ""),
		title: data.title,
		description: data.description,
		date: data.date,
		author: data.author || "Ansa Team",
		coverImage: data.coverImage || "",
		tags: data.tags || [],
		readingTime: stats.text,
		content,
	};
}

export function getAllPosts(): BlogPost[] {
	if (!fs.existsSync(BLOG_DIR)) {
		return [];
	}

	const files = fs.readdirSync(BLOG_DIR).filter((f) => /\.mdx?$/.test(f));

	return files
		.map(parseBlogPost)
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getAllPostsMeta(): BlogPostMeta[] {
	return getAllPosts().map(({ content: _, ...meta }) => meta);
}

export function getPostBySlug(slug: string): BlogPost | undefined {
	return getAllPosts().find((post) => post.slug === slug);
}

export function getPaginatedPosts(
	page: number,
	perPage: number = POSTS_PER_PAGE,
): {
	posts: BlogPostMeta[];
	totalPages: number;
	currentPage: number;
	totalPosts: number;
} {
	const allPosts = getAllPostsMeta();
	const totalPosts = allPosts.length;
	const totalPages = Math.max(1, Math.ceil(totalPosts / perPage));
	const currentPage = Math.min(Math.max(1, page), totalPages);
	const start = (currentPage - 1) * perPage;
	const posts = allPosts.slice(start, start + perPage);

	return { posts, totalPages, currentPage, totalPosts };
}
