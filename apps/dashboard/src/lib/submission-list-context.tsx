"use client";

import type { FormFieldMetadata, FormSubmissionOutcome } from "@ansa/types";
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
import { toast } from "sonner";
import { getConfig } from "@/lib/runtime-config";
import { useAgent } from "./agent-context";

const API_URL = getConfig().apiUrl || "http://localhost:3001";

export interface FormSubmission {
	id: string;
	agentId: string;
	toolId: string;
	toolName: string | null;
	conversationId: string | null;
	formData: Record<string, unknown>;
	status: string;
	webhookResponse: unknown;
	createdAt: string;
	outcome?: FormSubmissionOutcome;
	fieldMetadata?: FormFieldMetadata[];
	category?: string;
	countsAsConversion?: boolean;
	countsAsResolution?: boolean;
}

export interface FormOption {
	id: string;
	name: string;
}

interface SubmissionFilters {
	formId: string;
	status: string;
	startDate: string;
	endDate: string;
}

interface SubmissionListContextValue {
	// Submission list
	submissions: FormSubmission[];
	forms: FormOption[];
	loading: boolean;
	loadingMore: boolean;
	hasMore: boolean;
	total: number;

	// Filters
	formId: string;
	status: string;
	startDate: string;
	endDate: string;

	// Actions
	setFormId: (formId: string) => void;
	setStatus: (status: string) => void;
	setStartDate: (date: string) => void;
	setEndDate: (date: string) => void;
	clearFilters: () => void;
	fetchSubmissions: (page: number, append: boolean) => Promise<void>;
	refetch: () => Promise<void>;
	removeSubmission: (id: string) => void;
}

const SubmissionListContext = createContext<SubmissionListContextValue | undefined>(undefined);

const LIMIT = 30;

function buildUrlWithFilters(
	basePath: string,
	filters: SubmissionFilters,
	selectedId?: string | null,
): string {
	const params = new URLSearchParams();

	if (filters.formId && filters.formId !== "all") {
		params.set("formId", filters.formId);
	}
	if (filters.status && filters.status !== "all") {
		params.set("status", filters.status);
	}
	if (filters.startDate) {
		params.set("startDate", filters.startDate);
	}
	if (filters.endDate) {
		params.set("endDate", filters.endDate);
	}

	const path = selectedId ? `${basePath}/${selectedId}` : basePath;
	const queryString = params.toString();
	return queryString ? `${path}?${queryString}` : path;
}

export function SubmissionListProvider({ children }: { children: ReactNode }) {
	const { currentAgent } = useAgent();
	const selectedAgentId = currentAgent?.id;
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const initializedRef = useRef(false);

	// Parse initial filters from URL
	const getInitialFilters = (): SubmissionFilters => {
		return {
			formId: searchParams.get("formId") || "all",
			status: searchParams.get("status") || "all",
			startDate: searchParams.get("startDate") || "",
			endDate: searchParams.get("endDate") || "",
		};
	};

	const [filters, setFilters] = useState<SubmissionFilters>(getInitialFilters);
	const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
	const [forms, setForms] = useState<FormOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [total, setTotal] = useState(0);

	// Get selected ID from pathname
	const selectedId = pathname.startsWith("/submissions/") ? pathname.split("/")[2] : null;

	// Sync URL params to state when navigating
	useEffect(() => {
		if (!pathname.startsWith("/submissions")) return;

		const newFormId = searchParams.get("formId") || "all";
		const newStatus = searchParams.get("status") || "all";
		const newStartDate = searchParams.get("startDate") || "";
		const newEndDate = searchParams.get("endDate") || "";

		setFilters((prev) => {
			if (
				prev.formId !== newFormId ||
				prev.status !== newStatus ||
				prev.startDate !== newStartDate ||
				prev.endDate !== newEndDate
			) {
				return {
					formId: newFormId,
					status: newStatus,
					startDate: newStartDate,
					endDate: newEndDate,
				};
			}
			return prev;
		});
	}, [searchParams, pathname]);

	const fetchSubmissions = useCallback(
		async (pageNum = 1, append = false) => {
			if (!selectedAgentId) return;

			if (pageNum === 1) {
				setLoading(true);
			} else {
				setLoadingMore(true);
			}

			try {
				const params = new URLSearchParams({
					agentId: selectedAgentId,
					page: String(pageNum),
					limit: String(LIMIT),
				});

				if (filters.formId && filters.formId !== "all") {
					params.set("toolId", filters.formId);
				}
				if (filters.status && filters.status !== "all") {
					params.set("status", filters.status);
				}
				if (filters.startDate) {
					params.set("startDate", filters.startDate);
				}
				if (filters.endDate) {
					params.set("endDate", filters.endDate);
				}

				const response = await fetch(`${API_URL}/leads?${params}`, {
					credentials: "include",
				});

				if (!response.ok) throw new Error("Failed to fetch submissions");

				const data = await response.json();

				if (append) {
					setSubmissions((prev) => [...prev, ...data.submissions]);
				} else {
					setSubmissions(data.submissions);
				}

				setForms(data.forms);
				setTotal(data.pagination.total);
				setHasMore(data.pagination.page < data.pagination.totalPages);
			} catch (error) {
				console.error("Error fetching submissions:", error);
				toast.error("Failed to load submissions");
			} finally {
				setLoading(false);
				setLoadingMore(false);
			}
		},
		[selectedAgentId, filters],
	);

	// Initial load and filter changes
	useEffect(() => {
		if (!initializedRef.current && selectedAgentId) {
			initializedRef.current = true;
		}
		if (selectedAgentId) {
			setSubmissions([]);
			fetchSubmissions(1, false);
		}
	}, [selectedAgentId, fetchSubmissions]);

	// Update last seen timestamp when viewing this page
	useEffect(() => {
		if (selectedAgentId && pathname.startsWith("/submissions")) {
			const lastSeenKey = `submissions-last-seen-${selectedAgentId}`;
			localStorage.setItem(lastSeenKey, new Date().toISOString());
		}
	}, [selectedAgentId, pathname]);

	const updateUrlWithFilters = useCallback(
		(newFilters: SubmissionFilters) => {
			const url = buildUrlWithFilters("/submissions", newFilters, selectedId);
			router.replace(url, { scroll: false });
		},
		[router, selectedId],
	);

	const setFormId = useCallback(
		(formId: string) => {
			const newFilters = { ...filters, formId };
			setFilters(newFilters);
			updateUrlWithFilters(newFilters);
		},
		[filters, updateUrlWithFilters],
	);

	const setStatus = useCallback(
		(status: string) => {
			const newFilters = { ...filters, status };
			setFilters(newFilters);
			updateUrlWithFilters(newFilters);
		},
		[filters, updateUrlWithFilters],
	);

	const setStartDate = useCallback(
		(startDate: string) => {
			const newFilters = { ...filters, startDate };
			setFilters(newFilters);
			updateUrlWithFilters(newFilters);
		},
		[filters, updateUrlWithFilters],
	);

	const setEndDate = useCallback(
		(endDate: string) => {
			const newFilters = { ...filters, endDate };
			setFilters(newFilters);
			updateUrlWithFilters(newFilters);
		},
		[filters, updateUrlWithFilters],
	);

	const clearFilters = useCallback(() => {
		const newFilters = { formId: "all", status: "all", startDate: "", endDate: "" };
		setFilters(newFilters);
		updateUrlWithFilters(newFilters);
	}, [updateUrlWithFilters]);

	const refetch = useCallback(async () => {
		await fetchSubmissions(1, false);
	}, [fetchSubmissions]);

	const removeSubmission = useCallback((id: string) => {
		setSubmissions((prev) => prev.filter((s) => s.id !== id));
	}, []);

	return (
		<SubmissionListContext.Provider
			value={{
				submissions,
				forms,
				loading,
				loadingMore,
				hasMore,
				total,
				formId: filters.formId,
				status: filters.status,
				startDate: filters.startDate,
				endDate: filters.endDate,
				setFormId,
				setStatus,
				setStartDate,
				setEndDate,
				clearFilters,
				fetchSubmissions: (pageNum: number, append: boolean) => fetchSubmissions(pageNum, append),
				refetch,
				removeSubmission,
			}}
		>
			{children}
		</SubmissionListContext.Provider>
	);
}

export function useSubmissionList() {
	const context = useContext(SubmissionListContext);
	if (context === undefined) {
		throw new Error("useSubmissionList must be used within a SubmissionListProvider");
	}
	return context;
}
