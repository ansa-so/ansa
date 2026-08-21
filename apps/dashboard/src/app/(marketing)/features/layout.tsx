import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Agent Features: RAG Knowledge Base, Shopify, SDK/API | Ansa",
	description:
		"Resolve 80%+ of support tickets with AI agents. RAG-powered knowledge base, 24/7 automation, Shopify integration, tool marketplace, SDK/API access. Pro from $29/mo.",
	keywords: [
		"AI agent features",
		"RAG knowledge base",
		"AI chatbot features",
		"Shopify AI integration",
		"support automation features",
	],
	openGraph: {
		title: "Features - Ansa AI Agents",
		description:
			"Resolve 80%+ of tickets with AI. RAG knowledge base, 24/7 automation, Shopify integration, SDK/API.",
	},
};

export default function FeaturesLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
