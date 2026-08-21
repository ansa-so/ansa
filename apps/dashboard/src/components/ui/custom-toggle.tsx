"use client";

import { cn } from "@/lib/utils";

interface CustomToggleProps {
	checked: boolean;
	onCheckedChange?: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}

export function CustomToggle({
	checked,
	onCheckedChange,
	disabled = false,
	className,
}: CustomToggleProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			disabled={disabled}
			onClick={() => onCheckedChange?.(!checked)}
			className={cn(
				"w-8 h-4 rounded-full border relative transition-colors focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:ring-offset-2",
				checked ? "bg-[#1A1A1A] border-[#1A1A1A]" : "bg-[#E5E5E5] border-[#D1D1D1]",
				disabled && "opacity-50 cursor-not-allowed",
				!disabled && "cursor-pointer",
				className,
			)}
		>
			<div
				className={cn(
					"absolute top-0.5 w-2.5 h-2.5 bg-white rounded-full transition-all",
					checked ? "left-4" : "left-0.5",
				)}
			/>
		</button>
	);
}
