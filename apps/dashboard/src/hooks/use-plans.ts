"use client";

import { useEffect, useState } from "react";
import { getUsage } from "@/lib/api";
import type { Plan } from "@/lib/plans";
import { fetchPlans } from "@/lib/stripe";

interface UsageData {
	planId: string;
	messageCount: number;
	messageLimit: number;
	agentCount: number;
	agentLimit: number;
	hasSubscription: boolean;
	billingProvider: string | null;
}

export function usePlans() {
	const [plans, setPlans] = useState<Plan[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		fetchPlans()
			.then((data) => {
				setPlans(data);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err);
				setIsLoading(false);
			});
	}, []);

	return { plans, isLoading, error };
}

export function useCurrentPlan() {
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		getUsage()
			.then((data) => {
				setUsage(data as unknown as UsageData);
				setIsLoading(false);
			})
			.catch((err) => {
				setError(err);
				setIsLoading(false);
			});
	}, []);

	return {
		currentPlanId: usage?.planId || null,
		hasSubscription: usage?.hasSubscription || false,
		billingProvider: usage?.billingProvider || null,
		usage,
		isLoading,
		error,
	};
}

export function usePlansWithCurrent() {
	const { plans, isLoading: plansLoading, error: plansError } = usePlans();
	const {
		currentPlanId,
		hasSubscription,
		billingProvider,
		usage,
		isLoading: usageLoading,
		error: usageError,
	} = useCurrentPlan();

	return {
		plans,
		currentPlanId,
		hasSubscription,
		billingProvider,
		usage,
		isLoading: plansLoading || usageLoading,
		error: plansError || usageError,
	};
}
