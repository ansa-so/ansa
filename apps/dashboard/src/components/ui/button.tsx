import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex cursor-pointer items-center justify-center gap-2 font-bold text-xs uppercase whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
	{
		variants: {
			variant: {
				default:
					"tracking-widest bg-foreground text-white p-4 text-xs hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
				primary:
					"tracking-widest bg-primary text-white p-4 text-xs hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed",
				destructive:
					"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
				outline:
					"border border-[#D1D1D1] hover:border-[#1A1A1A] bg-transparent dark:bg-input/30 dark:border-input dark:hover:bg-input/50 font-mono uppercase tracking-widest font-normal",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
				link: "text-xs font-bold tracking-normal uppercase border-b border-[#1A1A1A] pb-0.5 hover:text-[#555] transition-colors",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5 text-[10px]",
				lg: "h-10 px-6 has-[>svg]:px-4",
				xl: "h-12 px-10 has-[>svg]:px-6",
				icon: "size-9",
				none: "px-0 h-auto",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends Omit<React.ComponentProps<"button">, "size" | "variant">,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
