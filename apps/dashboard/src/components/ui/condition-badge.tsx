"use client";

import { cn } from "@/lib/utils";

interface ConditionBadgeProps {
	condition: string;
	className?: string;
}

export function ConditionBadge({ condition, className }: ConditionBadgeProps) {
	if (!condition || condition === "—") {
		return <span className={cn("text-[9px] font-mono text-[#888]", className)}>—</span>;
	}

	return (
		<div
			className={cn(
				"bg-[#F3F2EE] border border-[#D1D1D1] px-2 py-1.5 font-mono text-[9px] text-[#555] truncate w-fit max-w-full",
				className,
			)}
		>
			{condition}
		</div>
	);
}
