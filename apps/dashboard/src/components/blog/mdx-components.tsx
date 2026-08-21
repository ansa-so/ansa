import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { CodeBlockPre } from "@/components/blog/code-block-pre";
import { cn } from "@/lib/utils";

/* ─────────────── Callout ─────────────── */

const calloutStyles = {
	info: {
		border: "border-l-[#1A1A1A]",
		bg: "bg-white",
		icon: "ℹ",
	},
	tip: {
		border: "border-l-green-600",
		bg: "bg-green-50",
		icon: "✓",
	},
	warning: {
		border: "border-l-amber-500",
		bg: "bg-amber-50",
		icon: "⚠",
	},
	danger: {
		border: "border-l-red-500",
		bg: "bg-red-50",
		icon: "✕",
	},
};

export function Callout({
	children,
	variant = "info",
}: {
	children: ReactNode;
	variant?: keyof typeof calloutStyles;
}) {
	const style = calloutStyles[variant];

	return (
		<div
			className={cn(
				"my-6 flex items-start gap-3 border border-[#D1D1D1] border-l-4 p-4",
				style.border,
				style.bg,
			)}
		>
			<span className="mt-0.5 shrink-0 text-sm font-bold">{style.icon}</span>
			<div className="text-sm text-[#555] [&>p]:m-0">{children}</div>
		</div>
	);
}

/* ─────────────── CodeBlock ─────────────── */

export function CodeBlock({
	children,
	language,
	title,
}: {
	children: string;
	language?: string;
	title?: string;
}) {
	return (
		<div className="my-6 border border-[#333] bg-[#1A1A1A]">
			{(title || language) && (
				<div className="flex items-center justify-between border-b border-[#333] px-4 py-2">
					{title && (
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
							{title}
						</span>
					)}
					{language && !title && (
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#666]">
							{language}
						</span>
					)}
				</div>
			)}
			<pre className="p-5 overflow-x-auto">
				<code className="font-mono text-xs text-[#E5E5E5]">{children}</code>
			</pre>
		</div>
	);
}

/* ─────────────── BlogImage ─────────────── */

export function BlogImage({
	src,
	alt,
	caption,
	width = 1200,
	height = 630,
}: {
	src: string;
	alt: string;
	caption?: string;
	width?: number;
	height?: number;
}) {
	return (
		<figure className="my-8">
			<div className="overflow-hidden border border-[#D1D1D1]">
				<Image src={src} alt={alt} width={width} height={height} className="w-full h-auto" />
			</div>
			{caption && (
				<figcaption className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-[#888]">
					{caption}
				</figcaption>
			)}
		</figure>
	);
}

/* ─────────────── VideoEmbed ─────────────── */

export function VideoEmbed({ src, title = "Video" }: { src: string; title?: string }) {
	return (
		<div className="my-8 border border-[#D1D1D1]">
			<div className="relative aspect-video">
				<iframe
					src={src}
					title={title}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					className="absolute inset-0 w-full h-full"
				/>
			</div>
		</div>
	);
}

/* ─────────────── MDX Overrides ─────────────── */

export function getMDXComponents() {
	return {
		// Custom components available in MDX
		Callout,
		CodeBlock,
		BlogImage,
		VideoEmbed,

		// Override default elements
		h1: ({ children }: { children?: ReactNode }) => (
			<h1 className="mb-6 mt-12 text-4xl font-medium tracking-tight text-[#1A1A1A] first:mt-0 md:text-5xl">
				{children}
			</h1>
		),
		h2: ({ children }: { children?: ReactNode }) => (
			<h2 className="mb-4 mt-14 text-2xl font-medium tracking-tight text-[#1A1A1A] md:text-3xl">
				{children}
			</h2>
		),
		h3: ({ children }: { children?: ReactNode }) => (
			<h3 className="mb-3 mt-8 text-xl font-medium tracking-tight text-[#1A1A1A] md:text-2xl">
				{children}
			</h3>
		),
		h4: ({ children }: { children?: ReactNode }) => (
			<h4 className="mb-2 mt-6 text-lg font-medium text-[#1A1A1A]">{children}</h4>
		),
		p: ({ children }: { children?: ReactNode }) => (
			<p className="mb-4 leading-relaxed text-[#555]">{children}</p>
		),
		a: ({ href, children }: { href?: string; children?: ReactNode }) => (
			<Link
				href={href || "#"}
				className="text-[#1A1A1A] underline decoration-[#D1D1D1] underline-offset-4 transition-colors hover:decoration-[#1A1A1A]"
			>
				{children}
			</Link>
		),
		ul: ({ children }: { children?: ReactNode }) => (
			<ul className="mb-4 ml-4 list-inside list-disc space-y-2 text-[#555]">{children}</ul>
		),
		ol: ({ children }: { children?: ReactNode }) => (
			<ol className="mb-4 ml-4 list-inside list-decimal space-y-2 text-[#555]">{children}</ol>
		),
		li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
		blockquote: ({ children }: { children?: ReactNode }) => (
			<blockquote className="my-6 border-l-4 border-[#1A1A1A] bg-[#F3F2EE] py-1 pl-4 italic text-[#666] [&>p]:m-0">
				{children}
			</blockquote>
		),
		code: ({ children, className }: { children?: ReactNode; className?: string }) => {
			// Inline code (no className = not a fenced code block)
			if (!className) {
				return (
					<code className="font-mono border border-[#D1D1D1] bg-[#F3F2EE] px-1.5 py-0.5 text-[13px] text-[#1A1A1A]">
						{children}
					</code>
				);
			}
			// Fenced code blocks — pass through for <pre> wrapping
			return <code className={cn("font-mono text-xs text-[#E5E5E5]", className)}>{children}</code>;
		},
		pre: ({ children }: { children?: ReactNode }) => <CodeBlockPre>{children}</CodeBlockPre>,
		table: ({ children }: { children?: ReactNode }) => (
			<div className="my-6 overflow-x-auto border border-[#D1D1D1]">
				<table className="w-full text-sm">{children}</table>
			</div>
		),
		thead: ({ children }: { children?: ReactNode }) => (
			<thead className="border-b border-[#D1D1D1] bg-[#F3F2EE]">{children}</thead>
		),
		th: ({ children }: { children?: ReactNode }) => (
			<th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-[#888]">
				{children}
			</th>
		),
		td: ({ children }: { children?: ReactNode }) => (
			<td className="border-t border-[#D1D1D1] px-4 py-3 text-[#555]">{children}</td>
		),
		hr: () => <hr className="my-10 border-t border-[#D1D1D1]" />,
		strong: ({ children }: { children?: ReactNode }) => (
			<strong className="font-semibold text-[#1A1A1A]">{children}</strong>
		),
	};
}
