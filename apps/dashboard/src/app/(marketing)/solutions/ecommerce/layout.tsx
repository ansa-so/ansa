import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "AI E-commerce Chatbot for Shopify & Online Stores",
	description:
		"Boost sales with AI-powered product recommendations, order tracking, and shopping assistance. Perfect for Shopify stores. Increase AOV and reduce cart abandonment.",
	keywords: [
		"e-commerce chatbot",
		"Shopify AI",
		"AI product recommendations",
		"shopping assistant AI",
		"order tracking chatbot",
		"Shopify chatbot",
		"AI for online stores",
	],
};

export default function EcommerceLayout({ children }: { children: React.ReactNode }) {
	return children;
}
