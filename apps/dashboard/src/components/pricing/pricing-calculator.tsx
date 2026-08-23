"use client";

import { useEffect, useState } from "react";
import type { Plan } from "@/lib/plans";
import { fetchPlans } from "@/lib/stripe";

const VOLUME_PRESETS = [1000, 5000, 10000, 25000, 50000];

const externalCompetitors = [
	{
		name: "Intercom",
		calculate: (conversations: number) => conversations * 0.99,
		note: "$0.99/resolution",
	},
	{
		name: "Zendesk",
		calculate: (conversations: number) => {
			const agents = Math.max(3, Math.ceil(conversations / 500));
			return agents * 89 + agents * 50;
		},
		note: "$89/agent + $50 AI add-on",
	},
	{
		name: "Drift",
		calculate: () => 2500,
		note: "Starts at $2,500/mo",
	},
	{
		name: "Freshdesk",
		calculate: (conversations: number) => {
			const agents = Math.max(2, Math.ceil(conversations / 500));
			return agents * 49 + agents * 29;
		},
		note: "$49/agent + $29 AI add-on",
	},
];

function formatCurrency(amount: number): string {
	if (amount >= 10000) {
		return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`;
	}
	return `$${amount.toLocaleString()}`;
}

function pickAnsaPlan(
	plans: Plan[],
	volume: number,
): { name: string; price: number; note: string } | null {
	// Sort by messages ascending, filter out free & enterprise
	const paid = plans
		.filter((p) => p.id !== "free" && p.id !== "enterprise" && p.price > 0)
		.sort((a, b) => a.messages - b.messages);

	if (paid.length === 0) return null;

	// Pick the cheapest plan that covers the volume
	for (const plan of paid) {
		if (plan.messages === -1 || plan.messages >= volume) {
			return {
				name: plan.name,
				price: Math.round(plan.price * 1.3),
				note: `${plan.name} — ${plan.messages === -1 ? "unlimited" : plan.messages.toLocaleString()} msgs/mo`,
			};
		}
	}

	// Volume exceeds all plans → show enterprise
	return { name: "Enterprise", price: -1, note: "Custom pricing" };
}

export function PricingCalculator() {
	const [volume, setVolume] = useState(10000);
	const [plans, setPlans] = useState<Plan[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchPlans()
			.then(setPlans)
			.finally(() => setLoading(false));
	}, []);

	const ansa = pickAnsaPlan(plans, volume);

	return (
		<section className="container px-4 pb-16 mx-auto">
			<div className="border border-[#D1D1D1] bg-white">
				<div className="p-8 md:p-12 border-b border-[#D1D1D1]">
					<h2 className="text-2xl md:text-3xl font-light mb-2">Cost at Scale</h2>
					<p className="text-[#666] text-sm">See how much you save with flat pricing.</p>
				</div>

				{/* Volume Selector */}
				<div className="p-8 md:px-12 border-b border-[#D1D1D1] bg-[#F9F9F9]">
					<div className="flex flex-wrap items-center gap-3">
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
							Monthly conversations:
						</span>
						{VOLUME_PRESETS.map((preset) => (
							<button
								key={preset}
								type="button"
								onClick={() => setVolume(preset)}
								className={`px-4 py-2 text-xs font-mono transition-colors ${
									volume === preset
										? "bg-[#1A1A1A] text-white"
										: "bg-white border border-[#D1D1D1] text-[#666] hover:border-[#1A1A1A]"
								}`}
							>
								{preset.toLocaleString()}
							</button>
						))}
					</div>
				</div>

				{/* Results */}
				<div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[#D1D1D1]">
					{/* Ansa */}
					<div className="bg-[#1A1A1A] text-white p-6 md:p-8 flex flex-col justify-between min-h-[160px]">
						{loading ? (
							<div className="animate-pulse">
								<div className="h-3 w-12 bg-white/20 mb-3 rounded" />
								<div className="h-10 w-20 bg-white/20 rounded" />
							</div>
						) : ansa ? (
							<>
								<div>
									<div className="font-mono text-[10px] uppercase tracking-widest text-green-400 mb-1">
										Ansa
									</div>
									<div className="text-3xl md:text-4xl font-bold">
										{ansa.price === -1 ? "Custom" : `$${ansa.price}`}
									</div>
								</div>
								<div className="text-[10px] text-[#888] font-mono mt-3">{ansa.note}</div>
							</>
						) : (
							<>
								<div>
									<div className="font-mono text-[10px] uppercase tracking-widest text-green-400 mb-1">
										Ansa
									</div>
									<div className="text-3xl md:text-4xl font-bold">$38</div>
								</div>
								<div className="text-[10px] text-[#888] font-mono mt-3">From $38/mo</div>
							</>
						)}
					</div>

					{/* Competitors */}
					{externalCompetitors.map((comp) => {
						const cost = comp.calculate(volume);
						const ansaPrice = ansa?.price ?? 38;
						const savings = ansaPrice > 0 ? cost - ansaPrice : cost;
						return (
							<div
								key={comp.name}
								className="bg-white p-6 md:p-8 flex flex-col justify-between min-h-[160px]"
							>
								<div>
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-1">
										{comp.name}
									</div>
									<div className="text-3xl md:text-4xl font-bold text-[#888]">
										{formatCurrency(cost)}
									</div>
								</div>
								<div className="text-[10px] font-mono mt-3">
									<span className="text-red-500">{formatCurrency(savings)} more</span>
									<span className="text-[#CCC] block">{comp.note}</span>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
