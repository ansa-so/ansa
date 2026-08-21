import * as React from "react";

import { cn } from "@/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
	showCharCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, showCharCount, ...props }, ref) => {
		const value = typeof props.value === "string" ? props.value : "";

		return (
			<div className="group">
				<div className="relative flex w-full">
					<textarea
						className={cn(
							"peer w-full bg-[#F9F9F9] border border-[#D1D1D1] p-4 text-sm focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-colors placeholder:text-[#CCC] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
							"aria-invalid:border-destructive",
							className,
						)}
						ref={ref}
						{...props}
					/>
					<div className="absolute inset-y-0 left-0 w-1 bg-transparent peer-focus:bg-[#1A1A1A] transition-colors pointer-events-none" />
				</div>
				{showCharCount && (
					<div className="text-[8px] font-mono text-[#CCC] uppercase mt-1 text-right">
						{value.length} chars
					</div>
				)}
			</div>
		);
	},
);
Textarea.displayName = "Textarea";

export { Textarea };
