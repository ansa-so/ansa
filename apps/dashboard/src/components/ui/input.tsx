import type * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
	showCharCount?: boolean;
}

function Input({ className, type, showCharCount, ...props }: InputProps) {
	const value = typeof props.value === "string" ? props.value : "";

	return (
		<div className="w-full">
			<div className="relative group">
				<input
					type={type}
					data-slot="input"
					className={cn(
						"w-full bg-[#F9F9F9] border border-[#D1D1D1] p-4 text-sm focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-colors placeholder:text-[#CCC] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
						"aria-invalid:border-destructive",
						className,
					)}
					{...props}
				/>
				<div className="absolute top-0 left-0 w-1 h-full bg-transparent group-focus-within:bg-[#1A1A1A] transition-colors" />
			</div>
			{showCharCount && (
				<div className="text-[8px] font-mono text-[#CCC] uppercase mt-1 text-right">
					{value.length} chars
				</div>
			)}
		</div>
	);
}

export { Input };
