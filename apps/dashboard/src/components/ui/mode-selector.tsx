"use client";

import { cn } from "@/lib/utils";

interface ModeSelectorOption {
	label: string;
	value: string;
	disabled?: boolean;
	badge?: string;
}

interface ModeSelectorProps {
	options: ModeSelectorOption[];
	value: string;
	onChange: (value: string) => void;
	className?: string;
}

function ModeSelector({ options, value, onChange, className }: ModeSelectorProps) {
	return (
		<div className={cn("flex bg-[#F3F2EE] p-1 border border-[#E5E5E5]", className)}>
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => !opt.disabled && onChange(opt.value)}
					disabled={opt.disabled}
					className={cn(
						"flex-1 py-2 px-3 text-[10px] font-bold uppercase tracking-widest transition-all border",
						value === opt.value
							? "bg-white text-[#1A1A1A] border-[#1A1A1A] shadow-sm"
							: "bg-transparent text-[#888] border-transparent hover:text-[#555]",
						opt.disabled && "opacity-50 cursor-not-allowed",
					)}
				>
					{opt.label}
					{opt.badge && (
						<span className="ml-1.5 text-[8px] px-1 py-0.5 bg-[#E5E5E5] text-[#555]">
							{opt.badge}
						</span>
					)}
				</button>
			))}
		</div>
	);
}

export { ModeSelector, type ModeSelectorOption };
