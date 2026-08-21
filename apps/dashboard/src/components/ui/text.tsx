import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TextTag = "p" | "span" | "div" | "label" | "small" | "strong" | "em";
type TextSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "subtitle" | "subtitle-lg";
type TextVariant = "default" | "subtitle" | "subtitle-mono";

interface TextProps {
	tag?: TextTag;
	size?: TextSize;
	variant?: TextVariant;
	children: ReactNode;
	className?: string;
}

const sizeClasses: Record<TextSize, string> = {
	xs: "text-xs text-neutral-900 dark:text-neutral-400",
	sm: "text-sm text-neutral-900 dark:text-neutral-400 leading-3 md:leading-4",
	md: "text-sm md:text-base text-neutral-900 dark:text-neutral-400 leading-4 md:leading-5",
	lg: "text-base md:text-lg text-neutral-900 dark:text-neutral-400 leading-5 md:leading-6",
	xl: "text-lg md:text-xl text-gray-600 dark:text-neutral-400 leading-relaxed",
	"4xl": "text-4xl text-neutral-900 dark:text-neutral-400",
	"2xl": "text-2xl text-neutral-900 dark:text-neutral-400 font-bold",

	subtitle: "text-lg md:text-xl text-gray-600 dark:text-neutral-400 leading-relaxed max-w-xl",
	"subtitle-lg": "text-xl md:text-2xl text-[#555] max-w-xl leading-relaxed font-light max-w-xl",
};

const variantClasses: Record<TextVariant, string> = {
	default: "",
	subtitle: "max-w-lg mx-auto mt-8 dark:text-neutral-400",
	"subtitle-mono": "font-mono uppercase !text-xs tracking-widest text-muted-foreground",
};

export function Text({
	tag = "p",
	size = "md",
	variant = "default",
	children,
	className,
}: TextProps) {
	const Component = tag as ElementType;

	return (
		<Component className={cn(sizeClasses[size], variantClasses[variant], className)}>
			{children}
		</Component>
	);
}
