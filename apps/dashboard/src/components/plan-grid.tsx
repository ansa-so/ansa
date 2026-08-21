"use client";

import { PlanCard } from "@/components/plan-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Plan } from "@/lib/plans";

interface PlanGridProps {
	plans: Plan[];
	currentPlanId?: string | null;
	hasSubscription?: boolean;
	isLoading?: boolean;
	onPlanChange?: () => void;
	isAnnual?: boolean;
	billingProvider?: string | null;
	shopifyPricingUrl?: string | null;
}

export function PlanGrid({
	plans,
	currentPlanId,
	hasSubscription = false,
	isLoading = false,
	onPlanChange,
	isAnnual = true,
	billingProvider,
	shopifyPricingUrl,
}: PlanGridProps) {
	if (isLoading) {
		return <PlanGridSkeleton />;
	}

	const mainPlans = plans.filter((plan) => plan.id !== "enterprise");

	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{mainPlans.map((plan) => (
				<PlanCard
					key={plan.id}
					plan={plan}
					currentPlanId={currentPlanId}
					hasSubscription={hasSubscription}
					onPlanChange={onPlanChange}
					isAnnual={isAnnual}
					billingProvider={billingProvider}
					shopifyPricingUrl={shopifyPricingUrl}
				/>
			))}
		</section>
	);
}

export function PlanGridSkeleton() {
	return (
		<section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="p-6 border border-[#D1D1D1] flex flex-col min-h-[500px] bg-white">
					<Skeleton className="w-24 h-3 mb-4" />
					<Skeleton className="w-32 h-12 mb-4" />
					<Skeleton className="w-full h-10 mb-6" />
					<Skeleton className="w-full h-16 mb-6" />
					<div className="flex-1 mb-8 space-y-3">
						<Skeleton className="w-full h-4" />
						<Skeleton className="w-full h-4" />
						<Skeleton className="w-3/4 h-4" />
					</div>
					<Skeleton className="w-full h-12" />
				</div>
			))}
		</section>
	);
}
