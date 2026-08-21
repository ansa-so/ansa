import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

type TitleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
type TitleSize =
	| "xs"
	| "sm"
	| "md"
	| "lg"
	| "xl"
	| "2xl"
	| "3xl"
	| "4xl"
	| "5xl"
	| "6xl"
	| "h1"
	| "h2"
	| "h3"
	| "h4"
	| "h5";

interface TitleProps {
	tag?: TitleTag;
	size?: TitleSize;
	children: ReactNode;
	className?: string;
}

const sizeClasses: Record<TitleSize, string> = {
	xs: "text-xs font-medium",
	sm: "text-sm font-medium",
	md: "text-base font-semibold",
	lg: "text-base md:text-lg",
	xl: "text-lg md:text-xl font-semibold",
	"2xl": "text-xl md:text-2xl font-bold",
	"3xl": "text-1xl md:text-3xl font-bold tracking-tight",
	"4xl": "text-2xl md:text-4xl font-semibold tracking-tighter",
	"5xl": "text-3xl md:text-5xl font-semibold tracking-tighter max-w-xl mx-auto",
	"6xl": "text-4xl md:text-6xl font-semibold tracking-tighter max-w-xl mx-auto",

	h1: "text-5xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9]",
	h2: "text-5xl font-medium tracking-tight md:text-7xl",
	h3: "text-4xl md:text-5xl font-medium mb-6 leading-[0.95]",
	h4: "mb-6 text-4xl font-light",
	h5: "font-mono uppercase !text-[10px] tracking-widest text-[#888]",
};

export function Title({ tag = "h2", size = "lg", children, className }: TitleProps) {
	const Component = tag as ElementType;

	return <Component className={cn(sizeClasses[size], className)}>{children}</Component>;
}
