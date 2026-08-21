import { cva, type VariantProps } from "class-variance-authority";
import { Plus } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const emptyCardVariants = cva(
	"border border-dashed flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors",
	{
		variants: {
			variant: {
				default: "border-[#AAA] bg-muted hover:bg-surface-warm-dark",
				subtle: "border-border bg-transparent hover:bg-muted/50",
			},
			size: {
				default: "min-h-[300px]",
				sm: "min-h-[200px]",
				lg: "min-h-[400px]",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface EmptyCardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof emptyCardVariants> {
	icon?: React.ReactNode;
	label?: string;
}

const EmptyCard = React.forwardRef<HTMLDivElement, EmptyCardProps>(
	({ className, variant, size, icon, label = "Add New", children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(emptyCardVariants({ variant, size }), "group", className)}
			{...props}
		>
			{children ?? (
				<>
					<div className="w-12 h-12 rounded-full border border-[#AAA] flex items-center justify-center text-[#AAA] group-hover:border-foreground group-hover:text-foreground transition-colors">
						{icon ?? <Plus size={24} />}
					</div>
					<span className="font-mono text-xs uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
						{label}
					</span>
				</>
			)}
		</div>
	),
);
EmptyCard.displayName = "EmptyCard";

export { EmptyCard, emptyCardVariants };
