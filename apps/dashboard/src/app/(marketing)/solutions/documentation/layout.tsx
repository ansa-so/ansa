import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Documentation Assistant & API Helper",
	description:
		"Help users navigate your docs and APIs with an AI assistant. Answer technical questions instantly, guide developers to the right resources, and reduce support burden.",
	keywords: [
		"documentation chatbot",
		"AI docs assistant",
		"API documentation AI",
		"developer support chatbot",
		"technical documentation AI",
		"AI for documentation",
	],
};

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
	return children;
}
