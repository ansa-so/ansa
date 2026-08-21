"use client";

import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";

export function PricingHero() {
	return (
		<section className="container px-4 mx-auto text-center">
			<Badge variant="marketing" className="mb-6">
				Pricing 2.0
			</Badge>
			<Title tag="h1" size="h1" className="mb-4">
				Predictable costs.
				<br />
				<span className="font-serif italic text-[#999]">Infinite scale.</span>
			</Title>
			<Text tag="p" size="subtitle" className="mx-auto">
				Choose the plan that fits your needs. Scale up as you grow. No hidden fees, cancel anytime.
			</Text>
		</section>
	);
}
