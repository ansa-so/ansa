import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const cardVariants = cva("border text-card-foreground transition-colors", {
	variants: {
		variant: {
			default: "rounded-xl bg-card shadow-sm hover:border-[#1A1A1A]",
			brutalist: "rounded-none bg-white border-[#D1D1D1] shadow-sm",
			metric:
				"rounded-none bg-white border-[#D1D1D1] p-5 shadow-sm hover:border-[#1A1A1A] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,0.1)] transition-all group",
			section:
				"rounded-none bg-white border-[#D1D1D1] shadow-sm hover:border-[#1A1A1A] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,0.1)] transition-all",
			chart: "rounded-none bg-white border-[#D1D1D1] shadow-sm flex flex-col relative",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

export interface CardProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof cardVariants> {
	onClick?: () => void;
	/** Height class for chart variant (default: min-h-[320px]) */
	height?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
	({ className, variant, onClick, height = "min-h-[320px]", ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				cardVariants({ variant }),
				variant === "chart" && height,
				onClick && "cursor-pointer active:scale-[0.98]",
				className,
			)}
			onClick={onClick}
			// A clickable card must be focusable and operable by keyboard.
			// Without onClick this stays a plain, non-interactive container.
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
			onKeyDown={
				onClick
					? (e: React.KeyboardEvent<HTMLDivElement>) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								onClick();
							}
						}
					: undefined
			}
			{...props}
		/>
	),
);
Card.displayName = "Card";

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "brutalist";
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
	({ className, variant = "default", ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"flex flex-col space-y-1.5 p-6",
				variant === "brutalist" && "pb-4 mb-0 border-b border-[#D1D1D1]",
				className,
			)}
			{...props}
		/>
	),
);
CardHeader.displayName = "CardHeader";

interface CardMetricHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	label: string;
	icon?: LucideIcon;
	trend?: string | null;
}

const CardMetricHeader = React.forwardRef<HTMLDivElement, CardMetricHeaderProps>(
	({ className, label, icon: Icon, trend, ...props }, ref) => (
		<div ref={ref} className={cn("flex items-start justify-between mb-4", className)} {...props}>
			<div className="flex items-center gap-2 text-[#888] font-mono text-[10px] uppercase tracking-widest group-hover:text-[#1A1A1A] transition-colors">
				{Icon && <Icon size={12} />}
				{label}
			</div>
			{trend && (
				<div
					className={cn(
						"text-[9px] font-mono font-bold px-1.5 py-0.5",
						trend.includes("+") || (!trend.includes("-") && Number.parseFloat(trend) > 0)
							? "bg-green-100 text-green-700"
							: "bg-red-100 text-red-700",
					)}
				>
					{trend}
				</div>
			)}
		</div>
	),
);
CardMetricHeader.displayName = "CardMetricHeader";

interface CardSectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	icon?: LucideIcon;
	action?: React.ReactNode;
}

const CardSectionHeader = React.forwardRef<HTMLDivElement, CardSectionHeaderProps>(
	({ className, title, icon: Icon, action, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-2">
				{Icon && <Icon size={14} className="text-[#1A1A1A]" />}
				<h3 className="text-xs font-bold tracking-wide uppercase">{title}</h3>
			</div>
			{action}
		</div>
	),
);
CardSectionHeader.displayName = "CardSectionHeader";

interface CardChartHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
	title: string;
	icon?: LucideIcon;
}

const CardChartHeader = React.forwardRef<HTMLDivElement, CardChartHeaderProps>(
	({ className, title, icon: Icon, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"p-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9] shrink-0",
				className,
			)}
			{...props}
		>
			<div className="flex items-center gap-2">
				{Icon && <Icon size={14} className="text-[#1A1A1A]" />}
				<h3 className="text-xs font-bold tracking-wide uppercase">{title}</h3>
			</div>
			<div className="flex gap-2">
				<div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
				<div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
			</div>
		</div>
	),
);
CardChartHeader.displayName = "CardChartHeader";

/** Grid background content wrapper for chart variant */
const CardChartContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, children, ...props }, ref) => (
		<div ref={ref} className={cn("relative flex-1 min-h-0", className)} {...props}>
			{/* Grid Background */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.07]"
				style={{
					backgroundImage:
						"linear-gradient(to right, #1A1A1A 1px, transparent 1px), linear-gradient(to bottom, #1A1A1A 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>
			<div className="relative flex items-center justify-center w-full h-full p-4">
				<div className="w-full h-full max-h-[260px]">{children}</div>
			</div>
		</div>
	),
);
CardChartContent.displayName = "CardChartContent";

const CardStatusHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("flex items-center justify-between px-6 py-4 border-b border-muted", className)}
			{...props}
		/>
	),
);
CardStatusHeader.displayName = "CardStatusHeader";

interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {
	icon?: React.ReactNode;
}

const CardTitle = React.forwardRef<HTMLDivElement, CardTitleProps>(
	({ className, icon, children, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"flex items-center gap-2 text-muted-foreground font-mono uppercase tracking-widest leading-none !text-xs",
				className,
			)}
			{...props}
		>
			{icon && (
				<div className="bg-[#F3F2EE] p-1.5 border border-[#E5E5E5] text-[#1A1A1A]">{icon}</div>
			)}
			<span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">{children}</span>
		</div>
	),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
	),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
	),
);
CardContent.displayName = "CardContent";

const CardValue = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn("text-3xl font-medium tracking-tighter text-[#1A1A1A]", className)}
			{...props}
		/>
	),
);
CardValue.displayName = "CardValue";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
	),
);
CardFooter.displayName = "CardFooter";

const CardActionFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			className={cn(
				"mt-auto border-t border-border flex divide-x divide-border bg-surface-subtle",
				className,
			)}
			{...props}
		/>
	),
);
CardActionFooter.displayName = "CardActionFooter";

interface SectionCardProps {
	title: string;
	icon?: LucideIcon;
	action?: React.ReactNode;
	className?: string;
	children?: React.ReactNode;
}

const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
	({ className, title, icon: Icon, action, children }, ref) => (
		<Card ref={ref} variant="section" className={className}>
			<CardSectionHeader title={title} icon={Icon} action={action} />
			{children}
		</Card>
	),
);
SectionCard.displayName = "SectionCard";

interface TechChartProps {
	title: string;
	icon?: LucideIcon;
	className?: string;
	children?: React.ReactNode;
}

const TechChart = React.forwardRef<HTMLDivElement, TechChartProps>(
	({ className, title, icon: Icon, children }, ref) => (
		<Card ref={ref} variant="chart" className={className}>
			<CardChartHeader title={title} icon={Icon} />
			<CardChartContent>{children}</CardChartContent>
		</Card>
	),
);
TechChart.displayName = "TechChart";

export {
	Card,
	CardActionFooter,
	CardChartContent,
	CardChartHeader,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardMetricHeader,
	CardSectionHeader,
	CardStatusHeader,
	CardTitle,
	CardValue,
	cardVariants,
	SectionCard,
	TechChart,
};
