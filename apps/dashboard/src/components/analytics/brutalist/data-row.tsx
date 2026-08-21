"use client";

import { cn } from "@/lib/utils";

interface DataRowProps {
	label: string | React.ReactNode;
	value: string | number;
	icon?: React.ReactNode;
	className?: string;
}

export function DataRow({ label, value, icon, className }: DataRowProps) {
	return (
		<div
			className={cn(
				"flex items-center justify-between p-4 border-b border-[#F3F2EE] hover:bg-[#F9F9F9] transition-colors",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				{icon}
				<span className="text-sm font-medium text-[#1A1A1A]">{label}</span>
			</div>
			<span className="text-sm font-mono text-[#888]">{value}</span>
		</div>
	);
}
