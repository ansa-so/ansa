import { ArrowLeft, ArrowRight, Calendar, ChevronRight, Clock, User } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serialize } from "next-mdx-remote/serialize";
import remarkGfm from "remark-gfm";
import { MDXContent } from "@/components/blog/mdx-content";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

interface PageProps {
	params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
	return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
	const { slug } = await params;
	const post = getPostBySlug(slug);

	if (!post) {
		return { title: "Post Not Found" };
	}

	return {
		title: `${post.title} — Ansa Blog`,
		description: post.description,
		keywords: post.tags,
		authors: [{ name: post.author }],
		openGraph: {
			type: "article",
			title: post.title,
			description: post.description,
			url: `${BASE_URL}/blog/${post.slug}`,
			publishedTime: post.date,
			authors: [post.author],
			tags: post.tags,
			...(post.coverImage && {
				images: [
					{
						url: `${BASE_URL}${post.coverImage}`,
						width: 1200,
						height: 630,
						alt: post.title,
					},
				],
			}),
		},
		twitter: {
			card: "summary_large_image",
			title: post.title,
			description: post.description,
		},
	};
}

export default async function BlogPostPage({ params }: PageProps) {
	const { slug } = await params;
	const post = getPostBySlug(slug);

	if (!post) {
		notFound();
	}

	const mdxSource = await serialize(post.content, {
		mdxOptions: { remarkPlugins: [remarkGfm] },
	});

	return (
		<article className="min-h-screen pb-24 selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* Breadcrumb */}
			<div className="mx-auto mb-10 max-w-3xl flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
				<Link href="/blog" className="transition-colors hover:text-[#1A1A1A]">
					Intelligence_Log
				</Link>
				<ChevronRight size={10} />
				<span className="font-bold text-[#1A1A1A]">Entry</span>
			</div>

			{/* Cover Image */}
			{post.coverImage && (
				<div className="relative mx-auto mb-10 max-w-3xl overflow-hidden border border-[#D1D1D1]">
					<Image
						src={post.coverImage}
						alt={post.title}
						width={1200}
						height={630}
						className="h-auto w-full"
					/>
					<div className="absolute left-3 top-3 z-10 border border-[#1A1A1A] bg-white px-2 py-1 font-mono text-[9px] font-bold uppercase">
						FILE: {post.slug.toUpperCase().replace(/-/g, "_")}
					</div>
				</div>
			)}

			{/* Header */}
			<header className="mx-auto mb-12 max-w-3xl">
				{/* Tags */}
				<div className="mb-5 flex flex-wrap gap-2">
					{post.tags.map((tag) => (
						<span
							key={tag}
							className="border border-[#D1D1D1] bg-[#F3F2EE] px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-[#1A1A1A]"
						>
							#{tag.replace(/\s+/g, "_")}
						</span>
					))}
				</div>

				<h1 className="mb-6 text-4xl font-bold uppercase leading-[1.1] tracking-tight text-[#1A1A1A] md:text-6xl">
					{post.title}
				</h1>

				<p className="mb-8 max-w-2xl border-l-2 border-[#1A1A1A] py-1 pl-4 font-mono text-sm text-[#555] md:text-base">
					{post.description}
				</p>

				{/* Metadata Bar */}
				<div className="flex flex-wrap items-center gap-4 border border-[#D1D1D1] bg-white px-5 py-3 font-mono text-[9px] uppercase tracking-wider text-[#888]">
					<span className="flex items-center gap-1.5">
						<User size={10} />
						{post.author}
					</span>
					<span className="text-[#D1D1D1]">|</span>
					<span className="flex items-center gap-1.5">
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
					<span className="flex items-center gap-1.5">
						<Clock size={10} />
						{post.readingTime.toUpperCase()}
					</span>
				</div>
			</header>

			{/* Content */}
			<div className="mx-auto max-w-3xl">
				<MDXContent source={mdxSource} />
			</div>

			{/* CTA Banner */}
			<div className="mx-auto mt-16 max-w-3xl border border-[#1A1A1A] bg-[#1A1A1A] p-8 md:p-12">
				<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-4">
					Next Step
				</div>
				<h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-3">
					Ready to automate your Shopify support?
				</h2>
				<p className="text-[#999] mb-6 max-w-xl">
					Join Shopify stores using Ansa to resolve 80%+ of support tickets instantly — no
					per-resolution fees.
				</p>
				<Link
					href="/signup"
					className="inline-flex items-center gap-2 border border-white bg-white px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] transition-all hover:bg-transparent hover:text-white"
				>
					Start for free
					<ArrowRight size={12} />
				</Link>
			</div>

			{/* Footer */}
			<div className="mx-auto mt-8 max-w-3xl border-t border-[#D1D1D1] pt-8 flex items-center justify-between">
				<Link
					href="/blog"
					className="inline-flex items-center gap-2 border border-[#D1D1D1] bg-white px-6 py-3 font-mono text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] transition-all hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
				>
					<ArrowLeft size={12} />
					All Entries
				</Link>

				<div className="flex items-center gap-2 opacity-50">
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
					<div className="h-1 w-1 rounded-full bg-[#1A1A1A]" />
				</div>
			</div>
		</article>
	);
}
