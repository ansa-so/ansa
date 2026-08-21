"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
	variant?: "default" | "brutalist";
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
	({ className, variant = "default", ...props }, ref) => (
		<SliderPrimitive.Root
			ref={ref}
			className={cn("relative flex w-full touch-none select-none items-center", className)}
			{...props}
		>
			<SliderPrimitive.Track
				className={cn(
					"relative w-full grow overflow-hidden",
					variant === "brutalist" ? "h-1 bg-[#F3F2EE]" : "h-2 rounded-full bg-secondary",
				)}
			>
				<SliderPrimitive.Range
					className={cn("absolute h-full", variant === "brutalist" ? "bg-[#1A1A1A]" : "bg-primary")}
				/>
			</SliderPrimitive.Track>
			<SliderPrimitive.Thumb
				className={cn(
					"block ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
					variant === "brutalist"
						? "h-3 w-3 bg-[#1A1A1A]"
						: "h-5 w-5 rounded-full border-2 border-primary bg-background",
				)}
			/>
		</SliderPrimitive.Root>
	),
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
