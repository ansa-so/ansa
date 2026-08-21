import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricsGridProps extends React.HTMLAttributes<HTMLDivElement> {
	columns?: 2 | 3 | 4;
}

const MetricsGrid = React.forwardRef<HTMLDivElement, MetricsGridProps>(
	({ className, columns = 2, children, ...props }, ref) => {
		const gridCols = {
			2: "grid-cols-2",
			3: "grid-cols-3",
			4: "grid-cols-4",
		};

		return (
			<div
				ref={ref}
				className={cn("grid border border-border bg-surface-subtle", gridCols[columns], className)}
				{...props}
			>
				{children}
			</div>
		);
	},
);
MetricsGrid.displayName = "MetricsGrid";

interface MetricCellProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: React.ReactNode;
	label: string;
	value: React.ReactNode;
	warning?: boolean;
}

const MetricCell = React.forwardRef<HTMLDivElement, MetricCellProps>(
	({ className, icon, label, value, warning, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("p-4 border-r border-border last:border-r-0", className)}
			{...props}
		>
			<div className="flex items-center gap-2 mb-2">
				{icon && <span className="text-muted-foreground">{icon}</span>}
				<span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
					{label}
				</span>
			</div>
			<div className="flex items-baseline gap-1 text-2xl font-medium tracking-tight">
				{value}
				{warning && <span className="text-[10px] text-red-500 font-bold ml-1">!</span>}
			</div>
		</div>
	),
);
MetricCell.displayName = "MetricCell";

export { MetricCell, MetricsGrid };
