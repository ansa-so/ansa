"use client";

import { Plus } from "lucide-react";
import { Title } from "@/components/ui/title";

const faqs = [
	{
		value: "ai-responses",
		question: "What counts as an AI response?",
		answer:
			"Each AI reply to a user message counts as one AI response. User messages and human-escalated conversations don't count toward your limit.",
	},
	{
		value: "rate-limit",
		question: "What's the 50-response per-conversation limit?",
		answer:
			"To prevent infinite loops and runaway costs, conversations are automatically escalated to your team after 50 AI responses. You'll see a warning at 45 responses, and you can manually resolve and reset the counter anytime.",
	},
	{
		value: "exceed-limit",
		question: "What happens if I exceed my limit?",
		answer:
			"You won't be able to send new AI responses until your billing period resets or you upgrade to a higher plan.",
	},
	{
		value: "change-plans",
		question: "Can I change plans anytime?",
		answer:
			"Yes! You can upgrade or downgrade at any time. Plan changes take effect at the start of your next billing period.",
	},
	{
		value: "rollover",
		question: "Do unused AI responses roll over?",
		answer:
			"No, AI response limits reset at the start of each billing period. Unused responses do not carry over.",
	},
	{
		value: "free-trial",
		question: "Is there a free trial?",
		answer:
			"The Free plan gives you 75 AI responses lifetime to try out Ansa. No credit card required.",
	},
];

export function PricingFAQ() {
	return (
		<section className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-32 border-t border-[#1A1A1A] pt-16">
			<div className="lg:col-span-4">
				<Title tag="h2" size="h4">
					Common <br /> Questions.
				</Title>
				<div className="inline-flex items-center gap-2 border border-[#D1D1D1] px-4 py-2 bg-white text-xs font-mono mt-8">
					<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
					<span>Support Online</span>
				</div>
			</div>

			<div className="lg:col-span-8 divide-y divide-[#D1D1D1]">
				{faqs.map((item) => (
					<div key={item.value} className="py-8 cursor-pointer group">
						<div className="flex items-start justify-between mb-4">
							<h3 className="text-xl md:text-2xl font-light group-hover:text-[#666] transition-colors pr-8">
								{item.question}
							</h3>
							<Plus className="text-[#CCC] group-hover:text-foreground transition-colors shrink-0" />
						</div>
						<p className="text-[#666] leading-relaxed max-w-2xl hidden group-hover:block transition-all animate-in fade-in slide-in-from-top-2 duration-300">
							{item.answer}
						</p>
					</div>
				))}
			</div>
		</section>
	);
}
