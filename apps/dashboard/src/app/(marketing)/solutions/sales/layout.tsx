import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI Sales Assistant & Lead Qualification",
	description:
		"Qualify leads and book demos automatically with AI-powered sales conversations. Increase pipeline velocity, improve conversion rates, and never miss a lead. Integrates with HubSpot, Calendly & CRMs.",
	keywords: [
		"AI sales assistant",
		"sales chatbot",
		"lead qualification AI",
		"automated demo booking",
		"AI SDR",
		"HubSpot AI",
		"sales automation",
	],
};

export default function SalesLayout({ children }: { children: React.ReactNode }) {
	return children;
}
