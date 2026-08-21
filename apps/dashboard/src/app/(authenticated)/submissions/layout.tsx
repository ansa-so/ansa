"use client";

import type { FormSubmissionOutcome } from "@ansa/types";
import { formatRelativeTime } from "@ansa/utils";
import { Calendar, Download, FileText, Loader2, Send } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAgent } from "@/lib/agent-context";
import { getConfig } from "@/lib/runtime-config";
import {
	type FormSubmission,
	SubmissionListProvider,
	useSubmissionList,
} from "@/lib/submission-list-context";
import { cn } from "@/lib/utils";

const API_URL = getConfig().apiUrl || "http://localhost:3001";

// Category labels for display
const TOOL_CATEGORY_LABELS: Record<string, string> = {
	lead_sales: "Lead & Sales",
	support_escalation: "Support Escalation",
	feedback_survey: "Feedback & Survey",
	account_user: "Account & User",
	operations_internal: "Operations & Internal",
	custom: "Custom",
};

// Helper: Normalize status to Success/Pending/Failed
function normalizeStatus(status: string): {
	label: string;
	color: string;
} {
	const successStatuses = ["submitted", "webhook_success", "client_success"];
	const failedStatuses = ["webhook_failed", "client_failed"];

	if (successStatuses.includes(status)) {
		return {
			label: "Success",
			color: "bg-blue-50 border-blue-200 text-blue-700",
		};
	}
	if (failedStatuses.includes(status)) {
		return {
			label: "Failed",
			color: "bg-red-50 border-red-200 text-red-700",
		};
	}
	return {
		label: "Pending",
		color: "bg-amber-50 border-amber-200 text-amber-700",
	};
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
	const { label, color } = normalizeStatus(status);
	return (
		<span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 border", color)}>{label}</span>
	);
}

// Outcome Badge Component
function OutcomeBadge({ outcome }: { outcome: FormSubmissionOutcome }) {
	const config = getOutcomeBadge(outcome);
	if (!config) return null;
	return (
		<span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 border", config.className)}>
			{config.label}
		</span>
	);
}

// New Badge Component
function NewBadge() {
	return (
		<span className="text-[9px] font-bold uppercase px-2 py-0.5 border bg-emerald-50 border-emerald-200 text-emerald-700">
			New
		</span>
	);
}

// Helper: Get outcome badge styling
function getOutcomeBadge(outcome: FormSubmissionOutcome) {
	switch (outcome) {
		case "conversion":
			return { label: "Conversion", className: "bg-green-50 border-green-200 text-green-700" };
		case "resolution":
			return { label: "Resolution", className: "bg-purple-50 border-purple-200 text-purple-700" };
		default:
			return null;
	}
}

// Helper: Get smart field preview (prioritize email/name, fallback to first field)
function getSmartFieldPreview(
	formData: Record<string, unknown>,
	fieldMetadata?: FormSubmission["fieldMetadata"],
): string {
	if (!formData || Object.keys(formData).length === 0) {
		return "No data";
	}

	// Try to find email or name fields using metadata
	if (fieldMetadata) {
		const priorityField = fieldMetadata.find(
			(field) => field.type === "email" || field.name.toLowerCase().includes("name"),
		);
		if (priorityField && formData[priorityField.name]) {
			const value = String(formData[priorityField.name]);
			return value.length > 40 ? `${value.slice(0, 40)}...` : value;
		}
	}

	// Fallback to first field
	const [, firstValue] = Object.entries(formData)[0];
	const value = String(firstValue);
	return value.length > 40 ? `${value.slice(0, 40)}...` : value;
}

function SubmissionsLayoutContent({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const selectedAgentId = currentAgent?.id;

	const {
		submissions,
		forms,
		loading,
		loadingMore,
		hasMore,
		total,
		formId,
		status,
		startDate,
		endDate,
		setFormId,
		setStatus,
		setStartDate,
		setEndDate,
		clearFilters,
		fetchSubmissions,
	} = useSubmissionList();

	// Track last seen timestamp for "NEW" badges
	const [lastSeen, setLastSeen] = useState<Date | null>(null);

	// Determine selected ID from pathname
	const selectedId =
		pathname.startsWith("/submissions/") && pathname !== "/submissions"
			? pathname.split("/")[2]
			: null;

	// Infinite scroll sentinel
	const sentinelRef = useRef<HTMLDivElement>(null);
	const pageRef = useRef(1);

	// Infinite scroll observer
	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
					pageRef.current += 1;
					fetchSubmissions(pageRef.current, true);
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, loadingMore, loading, fetchSubmissions]);

	// Reset page ref when filters change - these deps trigger the effect intentionally
	// biome-ignore lint/correctness/useExhaustiveDependencies: We want to reset on filter changes
	useEffect(() => {
		pageRef.current = 1;
	}, [formId, status, startDate, endDate]);

	// Read lastSeen from localStorage on mount, then update it after viewing
	useEffect(() => {
		if (!selectedAgentId) return;

		const lastSeenKey = `submissions-last-seen-${selectedAgentId}`;
		const storedLastSeen = localStorage.getItem(lastSeenKey);

		// Only set lastSeen if we have a stored value - new users won't see NEW badges
		// until their second visit (which is the expected behavior)
		if (storedLastSeen) {
			setLastSeen(new Date(storedLastSeen));
		}

		// Update lastSeen to now when leaving the page
		return () => {
			localStorage.setItem(lastSeenKey, new Date().toISOString());
		};
	}, [selectedAgentId]);

	const handleExportCSV = () => {
		if (!selectedAgentId) return;

		const params = new URLSearchParams({ agentId: selectedAgentId });
		if (formId && formId !== "all") {
			params.set("toolId", formId);
		}

		window.open(`${API_URL}/leads/export/csv?${params}`, "_blank");
	};

	const handleSelectSubmission = (submissionId: string) => {
		const params = new URLSearchParams(searchParams.toString());
		router.push(`/submissions/${submissionId}?${params.toString()}`, { scroll: false });
	};

	const hasFilters = formId !== "all" || status !== "all" || startDate || endDate;

	if (agentLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	if (!selectedAgentId) {
		return (
			<div className="flex items-center justify-center h-64">
				<p className="text-muted-foreground">Please select an agent first</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full overflow-hidden">
			{/* Top Toolbar */}
			<header className="flex items-center justify-between h-16 px-6 bg-white border-b shrink-0">
				<div className="flex items-center gap-2">
					<Send size={16} />
					<h1 className="text-sm font-bold tracking-wide uppercase">Form Submissions</h1>
					<span className="bg-muted border text-[10px] px-2 py-0.5 rounded-full text-muted-foreground font-mono">
						{total} Total
					</span>
				</div>

				<div className="flex items-center gap-3">
					{/* Filters */}
					<div className="flex gap-2">
						<Select value={formId} onValueChange={setFormId}>
							<SelectTrigger className="h-8 px-3 border bg-white hover:bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground w-[140px]">
								<SelectValue placeholder="All Forms" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Forms</SelectItem>
								{forms.map((form) => (
									<SelectItem key={form.id} value={form.id}>
										{form.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger className="h-8 px-3 border bg-white hover:bg-muted/50 text-[10px] font-bold uppercase text-muted-foreground w-[120px]">
								<SelectValue placeholder="All Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="submitted">Success</SelectItem>
								<SelectItem value="pending">Pending</SelectItem>
								<SelectItem value="webhook_failed">Failed</SelectItem>
							</SelectContent>
						</Select>

						<Button
							variant="outline"
							size="sm"
							className="h-8 px-3 text-[10px] font-bold uppercase text-muted-foreground"
						>
							<Calendar size={10} className="mr-1" />
							<Input
								type="date"
								value={startDate}
								onChange={(e) => setStartDate(e.target.value)}
								className="border-0 h-6 w-[100px] p-0 text-[10px] bg-transparent"
								placeholder="Start"
							/>
							<span className="mx-1">–</span>
							<Input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="border-0 h-6 w-[100px] p-0 text-[10px] bg-transparent"
								placeholder="End"
							/>
						</Button>

						{hasFilters && (
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-[10px] font-bold uppercase"
								onClick={clearFilters}
							>
								Clear
							</Button>
						)}
					</div>

					<Separator orientation="vertical" className="h-6" />

					<Button
						onClick={handleExportCSV}
						size="sm"
						className="h-8 px-4 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest hover:bg-foreground/90"
						disabled={submissions.length === 0}
					>
						<Download size={12} className="mr-2" /> Export CSV
					</Button>
				</div>
			</header>

			{/* Main content - two panel layout */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left panel - Submission list */}
				<div className="w-[400px] border-r bg-background flex flex-col shrink-0">
					<ScrollArea className="flex-1 bg-white">
						{loading ? (
							<div className="flex flex-col items-center justify-center py-16 text-center">
								<Loader2 className="w-8 h-8 mb-3 animate-spin text-muted-foreground" />
								<Label>Loading submissions</Label>
							</div>
						) : submissions.length === 0 ? (
							<div className="flex flex-col items-center justify-center px-6 py-16 text-center">
								<div className="flex items-center justify-center w-12 h-12 mb-4 border bg-muted">
									<FileText className="w-5 h-5 text-muted-foreground" />
								</div>
								<p className="mb-2 text-sm font-bold tracking-wide uppercase">No submissions yet</p>
								<div className="text-sm max-w-[240px] text-muted-foreground">
									Submissions appear when users complete forms or actions during conversations.
								</div>
								<Button
									asChild
									variant="outline"
									size="sm"
									className="mt-5 h-8 text-[10px] font-bold uppercase"
								>
									<Link href="/tools">Go to Tools</Link>
								</Button>
							</div>
						) : (
							<div className="flex flex-col">
								{submissions.map((submission) => {
									const isSelected = selectedId === submission.id;
									return (
										<button
											key={submission.id}
											type="button"
											onClick={() => handleSelectSubmission(submission.id)}
											className={cn(
												"w-full text-left p-4 transition-all border-b border-muted cursor-pointer relative",
												"hover:bg-[#FAFAF9] border-l-4 border-l-transparent",
												isSelected && "bg-[#F3F2EE] border-l-4 border-l-foreground",
											)}
										>
											{/* Time - top right */}
											<span className="absolute right-4 top-4 font-mono text-[10px] text-[#888]">
												{formatRelativeTime(submission.createdAt)}
											</span>

											{/* Status badge - below time */}
											<span className="absolute right-4 top-9">
												<StatusBadge status={submission.status} />
											</span>

											<div className="flex-1 min-w-0 pr-20">
												<div className="flex items-center gap-2 mb-1">
													<span className="text-sm font-bold truncate">
														{submission.toolName || "Unknown Form"}
													</span>
												</div>
												<p className="mb-3 text-xs font-medium truncate text-muted-foreground">
													{getSmartFieldPreview(submission.formData, submission.fieldMetadata)}
												</p>
												<div className="flex items-center gap-2">
													{(lastSeen === null || new Date(submission.createdAt) > lastSeen) && (
														<NewBadge />
													)}
													{submission.category && (
														<span className="text-[9px] font-bold uppercase px-2 py-0.5 border text-muted-foreground">
															{TOOL_CATEGORY_LABELS[submission.category] || submission.category}
														</span>
													)}
													{submission.outcome && <OutcomeBadge outcome={submission.outcome} />}
												</div>
											</div>
										</button>
									);
								})}
								{/* Infinite scroll sentinel */}
								<div ref={sentinelRef} className="h-4">
									{loadingMore && (
										<p className="py-2 text-xs text-center text-muted-foreground">
											Loading more...
										</p>
									)}
								</div>
							</div>
						)}
					</ScrollArea>
				</div>

				{/* Right panel - Detail view (rendered by child page) */}
				{children}
			</div>
		</div>
	);
}

export default function SubmissionsLayout({ children }: { children: React.ReactNode }) {
	return (
		<SubmissionListProvider>
			<SubmissionsLayoutContent>{children}</SubmissionsLayoutContent>
		</SubmissionListProvider>
	);
}
