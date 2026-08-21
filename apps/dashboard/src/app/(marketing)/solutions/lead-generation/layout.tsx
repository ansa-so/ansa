import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Lead Generation & Capture",
	description:
		"Capture and qualify leads automatically with AI-powered conversations. Convert website visitors into qualified prospects 24/7. Integrate with your CRM and marketing tools.",
	keywords: [
		"AI lead generation",
		"lead capture chatbot",
		"lead qualification AI",
		"conversational marketing",
		"website lead capture",
		"B2B lead generation AI",
	],
};

export default function LeadGenerationLayout({ children }: { children: React.ReactNode }) {
	return children;
}
