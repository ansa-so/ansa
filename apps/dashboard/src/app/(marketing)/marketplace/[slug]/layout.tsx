import type { Metadata } from "next";
import { getMarketplaceTool } from "@/lib/server-api";

interface LayoutProps {
	children: React.ReactNode;
	params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
	const { slug } = await params;
	const tool = await getMarketplaceTool(slug);

	if (!tool) {
		return {
			title: "Marketplace Tool",
			robots: { index: false, follow: true },
		};
	}

	const title = `${tool.name} Tool`;
	const description = tool.longDescription || tool.description;
	const url = `/marketplace/${tool.slug}`;

	return {
		title,
		description,
		alternates: { canonical: url },
		openGraph: {
			title,
			description,
			url,
		},
		twitter: {
			card: "summary_large_image",
			title,
			description,
		},
	};
}

export default function MarketplaceToolLayout({ children }: LayoutProps) {
	return children;
}
