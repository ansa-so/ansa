import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

const statusIndicatorVariants = cva("inline-flex items-center gap-3", {
	variants: {
		size: {
			sm: "gap-2",
			default: "gap-3",
			lg: "gap-4",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

const dotVariants = cva("rounded-full", {
	variants: {
		status: {
			active: "bg-green-500 animate-pulse",
			idle: "bg-[#D1D1D1]",
			warning: "bg-yellow-500 animate-pulse",
			error: "bg-red-500 animate-pulse",
		},
		size: {
			sm: "w-1.5 h-1.5",
			default: "w-2 h-2",
			lg: "w-2.5 h-2.5",
		},
	},
	defaultVariants: {
		status: "idle",
		size: "default",
	},
});

export interface StatusIndicatorProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof statusIndicatorVariants>,
		VariantProps<typeof dotVariants> {
	label?: string;
	showLabel?: boolean;
}

const statusLabels: Record<string, string> = {
	active: "System Online",
	idle: "System Idle",
	warning: "Warning",
	error: "Error",
};

function StatusIndicator({
	className,
	status = "idle",
	size = "default",
	label,
	showLabel = true,
	...props
}: StatusIndicatorProps) {
	const displayLabel = label ?? statusLabels[status ?? "idle"];

	return (
		<div className={cn(statusIndicatorVariants({ size }), className)} {...props}>
			<div className={cn(dotVariants({ status, size }))} />
			{showLabel && (
				<span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
					{displayLabel}
				</span>
			)}
		</div>
	);
}

StatusIndicator.displayName = "StatusIndicator";

export { dotVariants, StatusIndicator, statusIndicatorVariants };
