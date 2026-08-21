import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

interface DataLogProps {
	title: string;
	icon?: LucideIcon;
	items: string[];
	emptyMessage?: string;
	footerAction?: {
		label: string;
		href: string;
	};
}

export function DataLog({
	title,
	icon: Icon,
	items,
	emptyMessage = "No data available",
	footerAction,
}: DataLogProps) {
	return (
		<div className="bg-white border border-[#D1D1D1] shadow-sm hover:border-[#1A1A1A] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,0.1)] transition-all flex flex-col">
			<div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
				<h3 className="text-xs font-bold tracking-wide uppercase">{title}</h3>
				{Icon && <Icon size={12} className="text-[#888]" />}
			</div>
			<div className="p-0">
				{items.length === 0 ? (
					<div className="px-4 py-6 text-sm text-center text-muted-foreground">{emptyMessage}</div>
				) : (
					items.map((item, i) => (
						<div
							key={item}
							className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F2EE] last:border-0 hover:bg-[#F9F9F9] text-sm font-mono text-[#555]"
						>
							<span className="text-[#CCC] w-4 text-right tabular-nums">
								{String(i + 1).padStart(2, "0")}
							</span>
							<span className="truncate">"{item}"</span>
						</div>
					))
				)}
			</div>
			{footerAction && (
				<div className="p-3 border-t border-[#D1D1D1]">
					<Link
						href={footerAction.href}
						className="text-[10px] font-bold uppercase flex items-center gap-2 hover:text-[#555] transition-colors"
					>
						{footerAction.label} <ArrowRight size={10} />
					</Link>
				</div>
			)}
		</div>
	);
}
