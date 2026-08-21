import * as React from "react";
import { cn } from "@/lib/utils";

interface StatsBarProps extends React.HTMLAttributes<HTMLDivElement> {}

const StatsBar = React.forwardRef<HTMLDivElement, StatsBarProps>(
	({ className, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("grid border border-border bg-card divide-x divide-border", className)}
			style={{
				gridTemplateColumns: `repeat(${React.Children.count(children)}, minmax(0, 1fr))`,
			}}
			{...props}
		>
			{children}
		</div>
	),
);
StatsBar.displayName = "StatsBar";

interface StatItemProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string;
	value: React.ReactNode;
}

const StatItem = React.forwardRef<HTMLDivElement, StatItemProps>(
	({ className, label, value, ...props }, ref) => (
		<div ref={ref} className={cn("flex items-center justify-between p-4", className)} {...props}>
			<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
				{label}
			</span>
			<span className="text-xl font-medium">{value}</span>
		</div>
	),
);
StatItem.displayName = "StatItem";

export { StatItem, StatsBar };
