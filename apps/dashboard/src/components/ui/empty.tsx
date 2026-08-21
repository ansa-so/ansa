import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const emptyVariants = cva(
	"flex min-w-0 flex-1 flex-col items-center justify-center gap-0 text-balance p-6 text-center md:p-12",
	{
		variants: {
			variant: {
				default: "rounded-lg border-dashed",
				warm: "border-[#D1D1D1] selection:bg-[#1A1A1A] selection:text-[#F3F2EE]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function Empty({
	className,
	variant,
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyVariants>) {
	return (
		<div
			data-slot="empty"
			data-variant={variant}
			className={cn(emptyVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-header"
			className={cn("flex max-w-sm flex-col items-center gap-2 text-center", className)}
			{...props}
		/>
	);
}

const emptyMediaVariants = cva(
	"mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				icon: "bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6",
				"icon-warm":
					"bg-white border border-[#D1D1D1] text-[#888] flex size-10 shrink-0 items-center justify-center [&_svg:not([class*='size-'])]:size-6",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function EmptyMedia({
	className,
	variant = "default",
	...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
	return (
		<div
			data-slot="empty-icon"
			data-variant={variant}
			className={cn(emptyMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-title"
			className={cn("text-lg font-medium tracking-tight leading-6", className)}
			{...props}
		/>
	);
}

const emptyDescriptionVariants = cva(
	"text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4 leading-5",
	{
		variants: {
			variant: {
				default: "text-muted-foreground [&>a:hover]:text-primary",
				warm: "text-[#888] [&>a:hover]:text-[#1A1A1A]",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

function EmptyDescription({
	className,
	variant,
	...props
}: React.ComponentProps<"p"> & VariantProps<typeof emptyDescriptionVariants>) {
	return (
		<div
			data-slot="empty-description"
			data-variant={variant}
			className={cn(emptyDescriptionVariants({ variant, className }))}
			{...props}
		/>
	);
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="empty-content"
			className={cn(
				"flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle };
