"use client";

import type { LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

interface SectionHeaderProps {
	icon: LucideIcon | ReactNode;
	title: string;
	rightContent?: ReactNode;
}

export function SectionHeader({ icon, title, rightContent }: SectionHeaderProps) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
			<div className="flex items-center gap-2 text-[#555]">
				{isValidElement(icon)
					? icon
					: (() => {
							const Icon = icon as LucideIcon;
							return <Icon size={14} />;
						})()}
				<h3 className="text-xs font-bold tracking-widest uppercase">{title}</h3>
			</div>
			{rightContent}
		</div>
	);
}
