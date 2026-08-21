import type * as React from "react";

export interface PageHeaderProps {
	title: string;
	subtitle?: string;
	icon?: React.ReactNode;
	badge?: React.ReactNode;
	action?: React.ReactNode;
	className?: string;
}

export function PageHeader({
	title,
	subtitle,
	icon,
	badge,
	action,
	className = "",
}: PageHeaderProps) {
	return (
		<div
			className={`h-20 min-h-20 flex items-center justify-between px-8 bg-white border-b border-[#D1D1D1] ${className}`}
		>
			<div>
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-medium tracking-tight text-[#1A1A1A]">{title}</h1>
					{badge}
				</div>
				{(subtitle || icon) && (
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-1">
						{icon && <span>{icon}</span>}
						{subtitle && <span>{subtitle}</span>}
					</div>
				)}
			</div>
			{action && <div>{action}</div>}
		</div>
	);
}
