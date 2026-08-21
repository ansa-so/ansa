"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import useSWR from "swr";
import { useAgent } from "./agent-context";
import { type Conversation, type ConversationFilterCounts, listConversations } from "./api";

// Define types for filters
export type InboxTab = "all" | "mine" | "unassigned" | "escalated" | "low-confidence";
export type FeedbackFilter = "thumbs-up" | "thumbs-down" | null;
export type ActionStatusFilter = "has_action" | "succeeded" | "failed" | "none";

interface ConversationFilters {
	activeTab: InboxTab;
	selectedChannels: string[];
	selectedConfidenceLevels: string[];
	selectedFeedback: FeedbackFilter;
	clusterId?: string | null;
	actionStatus?: ActionStatusFilter | null;
	resolved?: boolean | null;
	hasMeaningfulQuestion?: boolean;
	hasConversion?: boolean;
}

interface ConversationListContextValue {
	// Conversation list
	conversations: Conversation[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	offset: number;
	filterCounts: ConversationFilterCounts;

	// Filters
	activeTab: InboxTab;
	selectedChannels: string[];
	selectedConfidenceLevels: string[];
	selectedFeedback: FeedbackFilter;
	clusterId?: string | null;
	actionStatus?: ActionStatusFilter | null;
	resolved?: boolean | null;
	hasMeaningfulQuestion?: boolean;
	hasConversion?: boolean;

	// Actions
	setActiveTab: (tab: InboxTab) => void;
	setSelectedChannels: (channels: string[]) => void;
	setSelectedConfidenceLevels: (levels: string[]) => void;
	setSelectedFeedback: (feedback: FeedbackFilter) => void;
	setClusterId: (id: string | null) => void;
	setActionStatus: (status: ActionStatusFilter | null) => void;
	setResolved: (resolved: boolean | null) => void;
	setHasMeaningfulQuestion: (value: boolean) => void;
	setHasConversion: (value: boolean) => void;
	fetchConversations: (offset: number, reset: boolean) => Promise<void>;
	refetch: () => Promise<void>;
}

const ConversationListContext = createContext<ConversationListContextValue | undefined>(undefined);

const FILTERS_KEY = "openchat_conversation_filters";
const LIMIT = 50;

export function ConversationListProvider({ children }: { children: ReactNode }) {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const initializedRef = useRef(false);

	// Load filters from localStorage or URL
	const getInitialFilters = (): ConversationFilters => {
		// First try URL params
		const tabParam = searchParams.get("tab");
		const actionStatusParam = searchParams.get("actionStatus") as ActionStatusFilter | null;
		const resolvedParam = searchParams.get("resolved");
		const hasMeaningfulQuestionParam = searchParams.get("has_meaningful_question");
		const hasConversionParam = searchParams.get("has_conversion");
		const confidenceParam = searchParams.get("confidence");

		let initialTab: InboxTab = "all";

		if (tabParam === "needs-attention") {
			initialTab = "escalated";
		} else if (
			tabParam &&
			["all", "mine", "unassigned", "escalated", "low-confidence"].includes(tabParam)
		) {
			initialTab = tabParam as InboxTab;
		} else {
			// Try localStorage
			const stored = localStorage.getItem(FILTERS_KEY);
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					if (parsed.activeTab) {
						initialTab = parsed.activeTab;
					}
				} catch (e) {
					console.error("Failed to parse stored filters:", e);
				}
			}
		}

		// Parse confidence level from URL
		const initialConfidenceLevels: string[] = [];
		if (confidenceParam && ["high", "medium", "low"].includes(confidenceParam)) {
			initialConfidenceLevels.push(confidenceParam);
		}

		return {
			activeTab: initialTab,
			selectedChannels: [],
			selectedConfidenceLevels: initialConfidenceLevels,
			selectedFeedback: null,
			clusterId: null,
			actionStatus:
				actionStatusParam &&
				["has_action", "succeeded", "failed", "none"].includes(actionStatusParam)
					? actionStatusParam
					: null,
			resolved: resolvedParam === "true" ? true : resolvedParam === "false" ? false : null,
			hasMeaningfulQuestion: hasMeaningfulQuestionParam === "true",
			hasConversion: hasConversionParam === "true",
		};
	};

	const [filters, setFilters] = useState<ConversationFilters>(getInitialFilters);
	const [loadingMore, setLoadingMore] = useState(false);
	const [offset, setOffset] = useState(0);

	// Persist filters to localStorage whenever they change
	useEffect(() => {
		if (initializedRef.current) {
			localStorage.setItem(FILTERS_KEY, JSON.stringify(filters));
		}
	}, [filters]);

	// Sync URL tab param to state when navigating via client-side links
	useEffect(() => {
		if (!pathname.startsWith("/conversations")) return;

		const tabParam = searchParams.get("tab");
		let targetTab: InboxTab = "all";

		if (tabParam === "needs-attention") {
			targetTab = "escalated";
		} else if (
			tabParam &&
			["all", "mine", "unassigned", "escalated", "low-confidence"].includes(tabParam)
		) {
			targetTab = tabParam as InboxTab;
		}

		// Only update if different to avoid unnecessary re-renders
		if (filters.activeTab !== targetTab) {
			setFilters((prev) => ({ ...prev, activeTab: targetTab }));
			setOffset(0);
		}
	}, [searchParams, pathname]); // Intentionally exclude filters.activeTab to avoid loops

	// Build SWR key based on current filters and agent
	const buildSwrKey = useCallback(() => {
		if (!currentAgent) return null;

		let filter: "escalated" | "low-confidence" | undefined;
		let assigneeId: string | undefined;

		// Handle tab-specific filters
		if (filters.activeTab === "escalated") {
			filter = "escalated";
		} else if (filters.activeTab === "low-confidence") {
			filter = "low-confidence";
		} else if (filters.activeTab === "mine") {
			assigneeId = "me";
		} else if (filters.activeTab === "unassigned") {
			assigneeId = "unassigned";
		}

		// Feedback is always passed independently
		const feedback = filters.selectedFeedback || undefined;

		return {
			key: "conversations",
			agentId: currentAgent.id,
			filter,
			feedback,
			assigneeId,
			channels: filters.selectedChannels.length > 0 ? filters.selectedChannels : undefined,
			confidenceLevels:
				filters.selectedConfidenceLevels.length > 0 ? filters.selectedConfidenceLevels : undefined,
			clusterId: filters.clusterId || undefined,
			actionStatus: filters.actionStatus || undefined,
			resolved: filters.resolved,
			hasMeaningfulQuestion: filters.hasMeaningfulQuestion || undefined,
			hasConversion: filters.hasConversion || undefined,
			offset: 0,
			limit: LIMIT,
		};
	}, [currentAgent, filters]);

	// Use SWR for automatic caching, deduplication, and polling
	const { data, isLoading, mutate } = useSWR(
		buildSwrKey(),
		async (params) => {
			if (!params) return null;
			const {
				agentId,
				filter,
				feedback,
				assigneeId,
				channels,
				confidenceLevels,
				clusterId,
				actionStatus,
				resolved,
				hasMeaningfulQuestion,
				hasConversion,
				offset,
				limit,
			} = params;
			return await listConversations({
				agentId,
				filter,
				feedback,
				assigneeId,
				channels,
				confidenceLevels,
				clusterId,
				actionStatus,
				resolved: resolved ?? undefined,
				hasMeaningfulQuestion,
				hasConversion,
				offset,
				limit,
			});
		},
		{
			// Poll every 30 seconds for real-time updates
			refreshInterval: 30000,
			// Keep previous data while revalidating
			keepPreviousData: true,
			// Revalidate when window regains focus
			revalidateOnFocus: true,
			// Don't revalidate on mount if data is fresh
			revalidateIfStale: false,
		},
	);

	const conversations = data?.conversations || [];
	const hasMore = data?.hasMore || false;
	const filterCounts = data?.filterCounts || {
		thumbsUp: 0,
		thumbsDown: 0,
		escalated: 0,
		lowConfidence: 0,
	};

	// Mark as initialized after first load
	useEffect(() => {
		if (!initializedRef.current && !agentLoading && currentAgent) {
			initializedRef.current = true;
		}
	}, [agentLoading, currentAgent]);

	// Manual fetchConversations for pagination (load more)
	const fetchConversations = useCallback(
		async (offsetToUse: number, reset: boolean) => {
			if (!currentAgent) return;

			if (!reset) {
				setLoadingMore(true);
			}

			try {
				let filter: "escalated" | "low-confidence" | undefined;
				let assigneeId: string | undefined;

				// Handle tab-specific filters
				if (filters.activeTab === "escalated") {
					filter = "escalated";
				} else if (filters.activeTab === "low-confidence") {
					filter = "low-confidence";
				} else if (filters.activeTab === "mine") {
					assigneeId = "me";
				} else if (filters.activeTab === "unassigned") {
					assigneeId = "unassigned";
				}

				// Feedback is always passed independently
				const feedback = filters.selectedFeedback || undefined;

				const newData = await listConversations({
					agentId: currentAgent.id,
					filter,
					feedback,
					assigneeId,
					channels: filters.selectedChannels.length > 0 ? filters.selectedChannels : undefined,
					confidenceLevels:
						filters.selectedConfidenceLevels.length > 0
							? filters.selectedConfidenceLevels
							: undefined,
					clusterId: filters.clusterId || undefined,
					actionStatus: filters.actionStatus || undefined,
					resolved: filters.resolved ?? undefined,
					hasMeaningfulQuestion: filters.hasMeaningfulQuestion || undefined,
					hasConversion: filters.hasConversion || undefined,
					limit: LIMIT,
					offset: offsetToUse,
				});

				if (reset) {
					// Reset to fresh data
					await mutate(newData, false);
					setOffset(newData.conversations.length);
				} else {
					// Append to existing data
					await mutate((current) => {
						if (!current) return newData;
						return {
							...newData,
							conversations: [...current.conversations, ...newData.conversations],
						};
					}, false);
					setOffset(offsetToUse + newData.conversations.length);
				}
			} catch (err) {
				console.error("Failed to fetch conversations:", err);
			} finally {
				setLoadingMore(false);
			}
		},
		[currentAgent, filters, mutate],
	);

	const refetch = useCallback(async () => {
		await mutate();
	}, [mutate]);

	const setActiveTab = useCallback(
		(tab: InboxTab) => {
			setFilters((prev) => ({ ...prev, activeTab: tab }));
			setOffset(0);

			// Update URL with tab parameter (only on conversations pages)
			if (pathname.startsWith("/conversations")) {
				const params = new URLSearchParams(searchParams.toString());
				if (tab === "all") {
					params.delete("tab");
				} else {
					params.set("tab", tab);
				}
				const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
				router.replace(newUrl, { scroll: false });
			}
		},
		[pathname, router, searchParams],
	);

	const setSelectedChannels = useCallback((channels: string[]) => {
		setFilters((prev) => ({ ...prev, selectedChannels: channels }));
		setOffset(0);
	}, []);

	// Helper function to update URL params
	const updateUrlParams = useCallback(
		(updates: Record<string, string | null>) => {
			if (!pathname.startsWith("/conversations")) return;
			const params = new URLSearchParams(searchParams.toString());
			for (const [key, value] of Object.entries(updates)) {
				if (value === null) {
					params.delete(key);
				} else {
					params.set(key, value);
				}
			}
			const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
			router.replace(newUrl, { scroll: false });
		},
		[pathname, router, searchParams],
	);

	const setSelectedConfidenceLevels = useCallback(
		(levels: string[]) => {
			setFilters((prev) => ({ ...prev, selectedConfidenceLevels: levels }));
			setOffset(0);
			// Update URL - use first level if single, otherwise remove param
			updateUrlParams({ confidence: levels.length === 1 ? levels[0] : null });
		},
		[updateUrlParams],
	);

	const setSelectedFeedback = useCallback((feedback: FeedbackFilter) => {
		setFilters((prev) => ({ ...prev, selectedFeedback: feedback }));
		setOffset(0);
	}, []);

	const setClusterId = useCallback((id: string | null) => {
		setFilters((prev) => ({ ...prev, clusterId: id }));
		setOffset(0);
	}, []);

	const setActionStatus = useCallback((status: ActionStatusFilter | null) => {
		setFilters((prev) => ({ ...prev, actionStatus: status }));
		setOffset(0);
	}, []);

	const setResolved = useCallback((resolved: boolean | null) => {
		setFilters((prev) => ({ ...prev, resolved }));
		setOffset(0);
	}, []);

	const setHasMeaningfulQuestion = useCallback(
		(value: boolean) => {
			setFilters((prev) => ({ ...prev, hasMeaningfulQuestion: value }));
			setOffset(0);
			updateUrlParams({ has_meaningful_question: value ? "true" : null });
		},
		[updateUrlParams],
	);

	const setHasConversion = useCallback(
		(value: boolean) => {
			setFilters((prev) => ({ ...prev, hasConversion: value }));
			setOffset(0);
			updateUrlParams({ has_conversion: value ? "true" : null });
		},
		[updateUrlParams],
	);

	return (
		<ConversationListContext.Provider
			value={{
				conversations,
				loading: isLoading,
				loadingMore,
				hasMore,
				offset,
				filterCounts,
				activeTab: filters.activeTab,
				selectedChannels: filters.selectedChannels,
				selectedConfidenceLevels: filters.selectedConfidenceLevels,
				selectedFeedback: filters.selectedFeedback,
				clusterId: filters.clusterId,
				actionStatus: filters.actionStatus,
				resolved: filters.resolved,
				hasMeaningfulQuestion: filters.hasMeaningfulQuestion,
				hasConversion: filters.hasConversion,
				setActiveTab,
				setSelectedChannels,
				setSelectedConfidenceLevels,
				setSelectedFeedback,
				setClusterId,
				setActionStatus,
				setResolved,
				setHasMeaningfulQuestion,
				setHasConversion,
				fetchConversations,
				refetch,
			}}
		>
			{children}
		</ConversationListContext.Provider>
	);
}

export function useConversationList() {
	const context = useContext(ConversationListContext);
	if (context === undefined) {
		throw new Error("useConversationList must be used within a ConversationListProvider");
	}
	return context;
}
