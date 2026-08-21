import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Developers",
	description:
		"Build AI agents with Ansa. SDK, API reference, code examples, and everything you need to integrate AI into your application.",
	openGraph: {
		title: "Developers - Ansa",
		description:
			"Build AI agents with Ansa. SDK, API reference, code examples, and everything you need.",
	},
};

export default function DevelopersLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
