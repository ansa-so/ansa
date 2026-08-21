"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Agent, createAgent, listAgents } from "@/lib/api";
import { isShopifyEmbedded } from "@/lib/shopify-context";

export type { Agent } from "@/lib/api";

const SELECTED_AGENT_KEY = "openchat_selected_agent";

interface UseAgentsResult {
	agents: Agent[];
	currentAgent: Agent | null;
	currentAgentId: string | null;
	isLoading: boolean;
	error: string | null;
	refetchAgents: () => Promise<Agent[]>;
	setCurrentAgent: (agent: Agent) => void;
}

/**
 * Hook to get the list of agents and current agent from URL.
 * Components using this hook should be wrapped in Suspense.
 */
export function useAgents(): UseAgentsResult {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const [agents, setAgents] = useState<Agent[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
	const initializedRef = useRef(false);

	const agentIdFromUrl = searchParams.get("agent");

	// Initialize selected agent from localStorage on mount
	useEffect(() => {
		if (!initializedRef.current) {
			const stored = localStorage.getItem(SELECTED_AGENT_KEY);
			if (stored) {
				setSelectedAgentId(stored);
			}
			initializedRef.current = true;
		}
	}, []);

	// When URL has agent param, update the stored selection
	useEffect(() => {
		if (agentIdFromUrl) {
			setSelectedAgentId(agentIdFromUrl);
			localStorage.setItem(SELECTED_AGENT_KEY, agentIdFromUrl);
		}
	}, [agentIdFromUrl]);

	const redirectedRef = useRef(false);

	const fetchAgents = useCallback(async () => {
		try {
			setError(null);
			const agentList = await listAgents();
			setAgents(agentList);

			// When embedded in Shopify and no agents linked to this shop,
			// redirect to onboarding so user can create one
			if (agentList.length === 0 && isShopifyEmbedded() && !redirectedRef.current) {
				redirectedRef.current = true;
				const params = new URLSearchParams(window.location.search);
				router.push(`/onboarding?${params.toString()}`);
			}

			return agentList;
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load agents");
			return [];
		} finally {
			setIsLoading(false);
		}
	}, [router]);

	useEffect(() => {
		fetchAgents();
	}, [fetchAgents]);

	// If URL has an agent ID that's not in the list, refetch to get the new agent
	useEffect(() => {
		if (agentIdFromUrl && agents.length > 0 && !agents.find((a) => a.id === agentIdFromUrl)) {
			fetchAgents();
		}
	}, [agentIdFromUrl, agents, fetchAgents]);

	// Priority: URL param > stored selection > default agent > first agent
	const effectiveAgentId = agentIdFromUrl || selectedAgentId;
	const currentAgent =
		(effectiveAgentId ? agents.find((a) => a.id === effectiveAgentId) : null) ||
		agents.find((a) => a.isDefault) ||
		agents[0] ||
		null;

	const setCurrentAgent = useCallback(
		(agent: Agent) => {
			// Update localStorage
			localStorage.setItem(SELECTED_AGENT_KEY, agent.id);
			setSelectedAgentId(agent.id);
			// Update URL
			const params = new URLSearchParams(searchParams.toString());
			params.set("agent", agent.id);
			router.push(`${pathname}?${params.toString()}`);
		},
		[router, pathname, searchParams],
	);

	return {
		agents,
		currentAgent,
		currentAgentId: currentAgent?.id || null,
		isLoading,
		error,
		refetchAgents: fetchAgents,
		setCurrentAgent,
	};
}

export const useAgent = useAgents;
