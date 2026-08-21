import { getConfig } from "@/lib/runtime-config";
import type { Plan } from "./plans";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

export interface DowngradeBlocker {
	type: "agents" | "storage" | "tools" | "webSources" | "model";
	current: number | string;
	limit: number | string;
	message: string;
	agentId?: string;
	agentName?: string;
}

export interface DowngradeCheckResult {
	canDowngrade: boolean;
	blockers: DowngradeBlocker[];
	isDowngrade: boolean;
	currentPlanId?: string;
	targetPlanId?: string;
}

export async function checkDowngrade(targetPlanId: string): Promise<DowngradeCheckResult> {
	const response = await fetch(`${API_BASE}/stripe/check-downgrade/${targetPlanId}`, {
		credentials: "include",
	});

	const data = await response.json();
	return {
		canDowngrade: data.canDowngrade ?? false,
		blockers: data.blockers ?? [],
		isDowngrade: data.isDowngrade ?? true,
		currentPlanId: data.currentPlanId,
		targetPlanId: data.targetPlanId,
	};
}

export async function startCheckout(priceId: string): Promise<string | null> {
	const response = await fetch(`${API_BASE}/stripe/checkout`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ priceId }),
	});

	const data = await response.json();
	return data.url || null;
}

export async function selectFreePlan(): Promise<boolean> {
	const response = await fetch(`${API_BASE}/stripe/select-free`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	});

	const data = await response.json();
	return data.success === true;
}

export async function openCustomerPortal(): Promise<string | null> {
	const response = await fetch(`${API_BASE}/stripe/portal`, {
		method: "POST",
		credentials: "include",
		headers: { "Content-Type": "application/json" },
	});

	const data = await response.json();
	return data.url || null;
}

export async function fetchPlans(): Promise<Plan[]> {
	try {
		const response = await fetch(`${API_BASE}/usage/plans`, {
			credentials: "include",
		});

		if (!response.ok) {
			// Return empty array for unauthorized or failed requests
			return [];
		}

		const data = await response.json();
		return data?.plans || [];
	} catch (error) {
		console.error("Failed to fetch plans:", error);
		return [];
	}
}
