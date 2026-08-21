"use client";

import { cn } from "@/lib/utils";

export type StatusTagVariant =
	| "escalated"
	| "open"
	| "snoozed"
	| "resolved"
	| "closed"
	| "active"
	| "inactive"
	| "pending"
	| "success"
	| "failed"
	| "high"
	| "medium"
	| "low"
	| "critical"
	| "warning"
	| "info";

const statusStyles: Record<StatusTagVariant, string> = {
	// Conversation statuses
	escalated:
		"bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
	open: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
	snoozed:
		"bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
	resolved:
		"bg-[#F3F2EE] text-[#888] border-[#D1D1D1] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
	closed:
		"bg-[#F3F2EE] text-[#888] border-[#D1D1D1] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",

	// General statuses
	active:
		"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
	inactive:
		"bg-[#F3F2EE] text-[#888] border-[#D1D1D1] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
	pending:
		"bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
	success:
		"bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
	failed:
		"bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",

	// Confidence/priority levels
	high: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
	medium:
		"bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
	low: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
	critical:
		"bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
	warning:
		"bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
	info: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
};

interface StatusTagProps {
	status: StatusTagVariant | string;
	label?: string;
	className?: string;
	icon?: React.ReactNode;
}

export function StatusTag({ status, label, className, icon }: StatusTagProps) {
	const styleKey = status.toLowerCase() as StatusTagVariant;
	const styles = statusStyles[styleKey] || statusStyles.resolved;
	const displayLabel = label || status;

	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 border tracking-wide",
				styles,
				className,
			)}
		>
			{icon}
			{displayLabel}
		</span>
	);
}
