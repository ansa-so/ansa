"use client";

import { Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterTab {
	label: string;
	count?: number;
	active: boolean;
	onClick: () => void;
}

interface TableToolbarProps {
	searchPlaceholder?: string;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	filters?: FilterTab[];
	showSettings?: boolean;
	onSettingsClick?: () => void;
	actions?: React.ReactNode;
	className?: string;
}

export function TableToolbar({
	searchPlaceholder = "FILTER...",
	searchValue = "",
	onSearchChange,
	filters,
	showSettings = false,
	onSettingsClick,
	actions,
	className,
}: TableToolbarProps) {
	return (
		<div
			className={cn(
				"px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				{onSearchChange && (
					<div className="relative">
						<Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888]" />
						<input
							type="text"
							value={searchValue}
							onChange={(e) => onSearchChange(e.target.value)}
							placeholder={searchPlaceholder}
							className="h-8 pl-8 pr-4 bg-white border border-[#D1D1D1] text-[10px] font-mono focus:outline-none focus:border-[#1A1A1A] w-48 uppercase placeholder:text-[#888]"
						/>
					</div>
				)}

				{filters && filters.length > 0 && (
					<>
						{onSearchChange && <div className="w-px h-4 bg-[#D1D1D1] mx-2" />}
						{filters.map((filter, index) => (
							<button
								key={index}
								type="button"
								onClick={filter.onClick}
								className={cn(
									"text-[10px] font-bold uppercase transition-colors",
									filter.active ? "text-[#1A1A1A]" : "text-[#888] hover:text-[#1A1A1A]",
								)}
							>
								{filter.label}
								{filter.count !== undefined && ` (${filter.count})`}
							</button>
						))}
					</>
				)}
			</div>

			<div className="flex items-center gap-2">
				{actions}
				{showSettings && (
					<button
						type="button"
						onClick={onSettingsClick}
						className="w-8 h-8 flex items-center justify-center border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] text-[#555] transition-colors"
					>
						<Settings size={14} />
					</button>
				)}
			</div>
		</div>
	);
}
