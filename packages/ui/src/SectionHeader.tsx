import type * as React from "react";

export interface SectionHeaderProps {
	title: string;
	icon?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

export function SectionHeader({ title, icon, action, className = "" }: SectionHeaderProps) {
	return (
		<div className={`flex justify-between items-center mb-4 ${className}`}>
			<h2 className="font-mono text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
				{icon && <span className="text-[#888]">{icon}</span>}
				{title}
			</h2>
			{action && <div>{action}</div>}
		</div>
	);
}
