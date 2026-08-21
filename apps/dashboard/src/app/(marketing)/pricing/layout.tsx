import type { Metadata } from "next";
import { FAQSchema } from "@/components/seo/structured-data";

export const metadata: Metadata = {
	title: "Ansa Pricing: Free Plan + $29/mo Pro | No Per-Resolution Fees",
	description:
		"Simple, transparent pricing for Ansa AI agents. Start free with 75 AI responses, Pro from $29/month. No per-resolution fees. Enterprise self-hosted available.",
	keywords: [
		"AI chatbot pricing",
		"free AI support",
		"Intercom alternative pricing",
		"Zendesk alternative pricing",
		"AI customer support cost",
	],
	openGraph: {
		title: "Pricing - Ansa AI Agents",
		description:
			"Simple pricing. Start free with 75 AI responses, Pro from $29/month. No per-resolution fees.",
	},
};

const pricingFAQs = [
	{
		question: "What counts as an AI response?",
		answer:
			"Each AI reply to a user message counts as one AI response. User messages and human-escalated conversations don't count toward your limit.",
	},
	{
		question: "What's the 50-response per-conversation limit?",
		answer:
			"To prevent infinite loops and runaway costs, conversations are automatically escalated to your team after 50 AI responses. You'll see a warning at 45 responses, and you can manually resolve and reset the counter anytime.",
	},
	{
		question: "What happens if I exceed my limit?",
		answer:
			"You won't be able to send new AI responses until your billing period resets or you upgrade to a higher plan.",
	},
	{
		question: "Can I change plans anytime?",
		answer:
			"Yes! You can upgrade or downgrade at any time. Plan changes take effect at the start of your next billing period.",
	},
	{
		question: "Do unused AI responses roll over?",
		answer:
			"No, AI response limits reset at the start of each billing period. Unused responses do not carry over.",
	},
	{
		question: "Is there a free trial?",
		answer:
			"The Free plan gives you 75 AI responses lifetime to try out Ansa. No credit card required.",
	},
];

export default function PricingLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<FAQSchema items={pricingFAQs} />
			{children}
		</>
	);
}
