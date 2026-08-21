"use client";

import { cn } from "@/lib/utils";

interface ProgressBarProps {
	value: number;
	color?: string;
	className?: string;
}

export function ProgressBar({ value, color = "bg-blue-600", className }: ProgressBarProps) {
	// Auto-determine color based on value if no color is specified
	const autoColor = value > 90 ? "bg-green-600" : value > 50 ? "bg-yellow-500" : "bg-red-600";

	return (
		<div className={cn("h-1.5 w-full bg-[#F3F2EE] overflow-hidden", className)}>
			<div
				className={cn(
					"h-full transition-all duration-300",
					color === "bg-blue-600" ? autoColor : color,
				)}
				style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
			/>
		</div>
	);
}
