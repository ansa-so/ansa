"use client";

import { ToggleLeft, ToggleRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HardwareSwitchProps {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
	className?: string;
}

function HardwareSwitch({
	label,
	description,
	checked,
	onChange,
	disabled,
	className,
}: HardwareSwitchProps) {
	return (
		<div
			className={cn(
				"flex items-start justify-between bg-white border border-[#D1D1D1] p-4 group hover:border-[#1A1A1A] transition-colors",
				disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
				className,
			)}
			onClick={() => !disabled && onChange(!checked)}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					!disabled && onChange(!checked);
				}
			}}
			role="switch"
			aria-checked={checked}
			tabIndex={disabled ? -1 : 0}
		>
			<div>
				<div className="mb-1 text-xs font-bold uppercase">{label}</div>
				{description && (
					<div className="text-[10px] text-[#888] font-mono leading-snug">{description}</div>
				)}
			</div>
			<button
				type="button"
				className={cn(
					"transition-colors duration-200 flex-shrink-0",
					checked ? "text-[#1A1A1A]" : "text-[#D1D1D1]",
				)}
				disabled={disabled}
				tabIndex={-1}
			>
				{checked ? (
					<ToggleRight size={28} strokeWidth={1.5} />
				) : (
					<ToggleLeft size={28} strokeWidth={1.5} />
				)}
			</button>
		</div>
	);
}

export { HardwareSwitch };
