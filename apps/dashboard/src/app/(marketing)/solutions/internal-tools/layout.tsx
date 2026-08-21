import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Internal Tools & Team Automation",
	description:
		"Streamline team workflows and automate internal processes with AI-powered assistants. Boost productivity, reduce repetitive tasks, and connect to Slack, Notion & your internal systems.",
	keywords: [
		"internal tools AI",
		"team automation",
		"AI workflow automation",
		"internal chatbot",
		"Slack AI bot",
		"enterprise AI assistant",
		"AI for teams",
	],
};

export default function InternalToolsLayout({ children }: { children: React.ReactNode }) {
	return children;
}
