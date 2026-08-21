"use client";

import type { FormSubmissionOutcome } from "@ansa/types";
import { formatDateTime } from "@ansa/utils";
import {
	AlertTriangle,
	ExternalLink,
	FileText,
	Loader2,
	MessageSquare,
	Terminal,
	Trash2,
	User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { type FormSubmission, getSubmission } from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";
import { useSubmissionList } from "@/lib/submission-list-context";
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
	description: string;
} {
	const successStatuses = ["submitted", "webhook_success", "client_success"];
	const failedStatuses = ["webhook_failed", "client_failed"];

	if (successStatuses.includes(status)) {
		return {
			label: "Success",
			color: "bg-blue-50 border-blue-200 text-blue-700",
			description: "Submission completed successfully",
		};
	}
	if (failedStatuses.includes(status)) {
		return {
			label: "Failed",
			color: "bg-red-50 border-red-200 text-red-700",
			description: "Submission processing failed",
		};
	}
	return {
		label: "Pending",
		color: "bg-amber-50 border-amber-200 text-amber-700",
		description: "Awaiting processing",
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

// Detail Field Component
function DetailField({
	label,
	value,
	large = false,
}: {
	label: string;
	value: string;
	large?: boolean;
}) {
	return (
		<div className={cn("mb-4", large ? "col-span-2" : "col-span-1")}>
			<Label className="mb-1.5">{label}</Label>
			<div
				className={cn(
					"text-sm text-foreground",
					large ? "leading-relaxed" : "font-medium truncate",
				)}
			>
				{value}
			</div>
		</div>
	);
}

export default function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const router = useRouter();
	const [submissionId, setSubmissionId] = useState<string | null>(null);
	const [submissionToDelete, setSubmissionToDelete] = useState<string | null>(null);
	const { submissions, removeSubmission } = useSubmissionList();

	// Handle async params (Next.js 15)
	useEffect(() => {
		params.then(({ id }) => setSubmissionId(id));
	}, [params]);

	// Fetch submission with SWR
	const {
		data: submission,
		isLoading,
		error,
	} = useSWR(
		submissionId ? `/leads/${submissionId}` : null,
		() => (submissionId ? getSubmission(submissionId) : null),
		{
			keepPreviousData: true,
			dedupingInterval: 2000,
			revalidateOnFocus: true,
			// Use list data as fallback for instant display
			fallbackData: submissions.find((s) => s.id === submissionId) as FormSubmission | undefined,
		},
	);

	const handleDelete = async (id: string) => {
		try {
			const response = await fetch(`${API_URL}/leads/${id}`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) throw new Error("Failed to delete");

			toast.success("Submission deleted");
			removeSubmission(id);
			router.push("/submissions");
		} catch (_error) {
			toast.error("Failed to delete submission");
		} finally {
			setSubmissionToDelete(null);
		}
	};

	// Loading state
	if (isLoading && !submission) {
		return (
			<div className="flex items-center justify-center flex-1 min-w-0 bg-[#F9F9F9]">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	// Error/Not found state
	if (error || (!isLoading && !submission)) {
		return (
			<div className="flex-1 p-8 overflow-y-auto bg-[#F9F9F9]">
				<div className="flex flex-col items-center justify-center h-full px-4 text-center">
					<div className="flex items-center justify-center w-16 h-16 mb-4 border border-red-200 bg-red-50">
						<AlertTriangle className="w-6 h-6 text-red-500" />
					</div>
					<p className="mb-2 text-sm font-bold tracking-wide uppercase">Submission not found</p>
					<Label className="max-w-[280px] mb-4 leading-[1.4] font-sans">
						This submission may have been deleted or doesn't exist.
					</Label>
					<Button variant="outline" onClick={() => router.push("/submissions")} className="mt-2">
						Back to Submissions
					</Button>
				</div>
			</div>
		);
	}

	// At this point, submission is guaranteed to be defined
	const selectedSubmission = submission!;

	return (
		<>
			<div className="flex-1 p-8 overflow-y-auto bg-[#F9F9F9]">
				{/* Unified Detail Card */}
				<div className="bg-white border shadow-sm">
					{/* Record Header */}
					<div className="flex items-center justify-between p-6 border-b">
						<div>
							<Label className="mb-1">Record ID: {selectedSubmission.id.slice(0, 8)}</Label>
							<div className="text-sm font-medium">
								{formatDateTime(selectedSubmission.createdAt)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<StatusBadge status={selectedSubmission.status} />
							{selectedSubmission.category && (
								<span className="text-[9px] font-mono border px-2 py-0.5 uppercase text-muted-foreground">
									{TOOL_CATEGORY_LABELS[selectedSubmission.category] || selectedSubmission.category}
								</span>
							)}
							{selectedSubmission.outcome && <OutcomeBadge outcome={selectedSubmission.outcome} />}
							<Button
								variant="ghost"
								size="icon"
								className="ml-4 text-muted-foreground hover:text-destructive"
								onClick={() => setSubmissionToDelete(selectedSubmission.id)}
							>
								<Trash2 size={16} />
							</Button>
						</div>
					</div>

					{/* Section: Form Data */}
					<div className="p-6 border-b">
						<Label className="flex items-center gap-2 mb-6">
							<FileText size={12} /> Form Data Payload
						</Label>
						<div className="grid grid-cols-2 gap-y-6 gap-x-12">
							{selectedSubmission.fieldMetadata && selectedSubmission.fieldMetadata.length > 0
								? selectedSubmission.fieldMetadata.map((field) => {
										const value = selectedSubmission.formData[field.name];
										if (value === undefined) return null;
										const isLarge = String(value).length > 100;
										return (
											<DetailField
												key={field.name}
												label={field.label || field.name}
												value={String(value)}
												large={isLarge}
											/>
										);
									})
								: Object.entries(selectedSubmission.formData).map(([key, value]) => {
										const isLarge = String(value).length > 100;
										return (
											<DetailField key={key} label={key} value={String(value)} large={isLarge} />
										);
									})}
						</div>
					</div>

					{/* Section: Related Conversation */}
					{selectedSubmission.conversationId && (
						<div className="p-6 border-b bg-[#FAFAF9]">
							<Label className="flex items-center gap-2 mb-4">
								<MessageSquare size={12} /> Related Conversation
							</Label>
							<button
								type="button"
								onClick={() => router.push(`/conversations/${selectedSubmission.conversationId}`)}
								className="flex items-center justify-between w-full p-4 transition-colors bg-white border cursor-pointer group hover:border-foreground"
							>
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-8 h-8 border bg-muted text-muted-foreground">
										<User size={14} />
									</div>
									<div className="text-left">
										<div className="text-xs font-bold">
											Session #{selectedSubmission.conversationId.slice(0, 8)}
										</div>
										<Label>Converted via {selectedSubmission.toolName || "form"}</Label>
									</div>
								</div>
								<span className="text-[9px] font-bold uppercase flex items-center gap-2 border-b border-foreground pb-0.5">
									View Log <ExternalLink size={10} />
								</span>
							</button>
						</div>
					)}

					{/* Section: Execution Details - Terminal Style */}
					<div className="p-6">
						<Label className="flex items-center gap-2 mb-4">
							<Terminal size={12} /> Execution Details
						</Label>
						<div className="bg-[#1A1A1A] text-[#F3F2EE] p-4 font-mono text-[10px] space-y-2 relative overflow-hidden">
							<div className="flex justify-between">
								<span className="opacity-50">ACTION_NAME</span>
								<span>{selectedSubmission.toolName || "Unknown"}</span>
							</div>
							<div className="flex justify-between">
								<span className="opacity-50">STATUS</span>
								<span
									className={
										normalizeStatus(selectedSubmission.status).label === "Success"
											? "text-green-400"
											: normalizeStatus(selectedSubmission.status).label === "Failed"
												? "text-red-400"
												: "text-amber-400"
									}
								>
									{normalizeStatus(selectedSubmission.status).label.toUpperCase()}
								</span>
							</div>
							<div className="flex justify-between">
								<span className="opacity-50">RAW_STATUS</span>
								<span>{selectedSubmission.status}</span>
							</div>
							<div className="flex justify-between pt-2 mt-2 border-t border-white/20">
								<span className="opacity-50">MESSAGE</span>
								<span>{normalizeStatus(selectedSubmission.status).description}</span>
							</div>
							{selectedSubmission.webhookResponse !== null &&
								selectedSubmission.webhookResponse !== undefined && (
									<div className="pt-2 mt-2 border-t border-white/20">
										<div className="mb-2 opacity-50">RESPONSE_PAYLOAD</div>
										<pre className="text-[9px] overflow-auto max-h-[150px] whitespace-pre-wrap">
											{JSON.stringify(selectedSubmission.webhookResponse, null, 2)}
										</pre>
									</div>
								)}

							{/* Decorative scanline */}
							<div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
						</div>
					</div>
				</div>

				{/* Footer Tip */}
				<div className="mt-4 text-center">
					<Label>Submission ID: {selectedSubmission.id}</Label>
				</div>
			</div>

			{/* Delete Confirmation */}
			<AlertDialog open={!!submissionToDelete} onOpenChange={() => setSubmissionToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Submission</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete this submission? This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => submissionToDelete && handleDelete(submissionToDelete)}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
