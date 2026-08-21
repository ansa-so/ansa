"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
	name: string;
	description?: string;
	icon: React.ElementType;
	onClick: () => void;
	className?: string;
}

export function TemplateCard({
	name,
	description,
	icon: Icon,
	onClick,
	className,
}: TemplateCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"border border-[#D1D1D1] bg-[#FAFAF9] p-4 flex items-center justify-between hover:border-[#1A1A1A] hover:bg-white transition-all cursor-pointer group text-left w-full",
				className,
			)}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className="w-8 h-8 bg-white border border-[#D1D1D1] flex items-center justify-center text-[#1A1A1A] shrink-0">
					<Icon size={14} />
				</div>
				<div className="min-w-0">
					<span className="text-sm font-medium block truncate">{name}</span>
					{description && (
						<span className="text-[10px] text-[#888] block truncate mt-0.5">{description}</span>
					)}
				</div>
			</div>
			<ArrowRight
				size={14}
				className="text-[#CCC] group-hover:text-[#1A1A1A] -translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
			/>
		</button>
	);
}
