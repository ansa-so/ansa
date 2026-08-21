"use client";

import { Edit3, Trash2 } from "lucide-react";
import { ConditionBadge } from "@/components/ui/condition-badge";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { TriggerTypeIcon } from "@/components/ui/trigger-type-icon";

interface TriggerRowProps {
	// Core identification
	id?: string;
	name: string;
	type: string;

	// Metrics
	fired: number;
	converted?: number;
	conversionRate?: number;

	// Status - accept both formats for backwards compatibility
	status?: "active" | "inactive";
	isActive?: boolean;

	// Extended features (for triggers management page)
	condition?: string;
	action?: string;
	description?: string;

	// Display variant
	variant?: "compact" | "full";

	// Interactive features
	onToggle?: () => void;
	onEdit?: () => void;
	onDelete?: () => void;
	onClick?: () => void;
}

export function TriggerRow({
	id,
	name,
	type,
	fired,
	converted,
	conversionRate,
	status,
	isActive,
	condition,
	action,
	description,
	variant = "compact",
	onToggle,
	onEdit,
	onDelete,
	onClick,
}: TriggerRowProps) {
	// Normalize status from either prop
	const normalizedStatus: "active" | "inactive" = status ?? (isActive ? "active" : "inactive");

	const isActiveState = normalizedStatus === "active";

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (onClick && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			onClick();
		}
	};

	// Compact variant - original layout for analytics page
	if (variant === "compact") {
		return (
			<div
				className="grid grid-cols-6 gap-2 py-3 items-center hover:bg-[#F9F9F9] transition-colors"
				onClick={onClick}
				onKeyDown={handleKeyDown}
				role={onClick ? "button" : undefined}
				tabIndex={onClick ? 0 : undefined}
			>
				<div className="font-medium text-sm text-[#1A1A1A] truncate">{name}</div>
				<div className="text-[9px] text-[#888] font-mono uppercase">{type.replace(/_/g, " ")}</div>
				<div className="text-right font-mono text-sm">{fired}</div>
				<div className="text-right font-mono text-sm">{converted ?? "-"}</div>
				<div className="text-right">
					<span
						className={`font-mono text-sm ${conversionRate !== undefined && conversionRate >= 20 ? "text-green-600" : conversionRate !== undefined && conversionRate >= 10 ? "text-yellow-600" : "text-[#888]"}`}
					>
						{conversionRate !== undefined ? `${conversionRate}%` : "-"}
					</span>
				</div>
				<div className="text-right">
					<span
						className={`text-[9px] font-bold uppercase px-2 py-1 border ${
							normalizedStatus === "active"
								? "bg-green-50 border-green-200 text-green-700"
								: "bg-[#F3F2EE] border-[#D1D1D1] text-[#888]"
						}`}
					>
						{normalizedStatus}
					</span>
				</div>
			</div>
		);
	}

	// Full variant - grid layout for triggers management page
	return (
		<div
			className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center transition-colors group ${
				isActiveState ? "bg-white hover:bg-[#FAFAF9]" : "bg-[#F9F9F9] opacity-70"
			}`}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			{/* Name & ID */}
			<div className="col-span-3">
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClick?.();
					}}
					className="font-bold text-sm text-[#1A1A1A] mb-1 cursor-pointer hover:text-[#555] transition-colors text-left"
				>
					{name}
				</button>
				{id && <div className="text-[9px] font-mono text-[#888]">{id}</div>}
				{description && !id && <div className="text-[9px] text-[#888] truncate">{description}</div>}
			</div>

			{/* Type */}
			<div className="flex items-center col-span-2 gap-2">
				<TriggerTypeIcon type={type} showBox />
				<span className="font-mono text-[10px] text-[#555]">{type.replace(/_/g, " ")}</span>
			</div>

			{/* Logic Condition */}
			<div className="col-span-3">
				<ConditionBadge condition={condition || "—"} />
			</div>

			{/* Action */}
			<div className="col-span-2">
				{action ? (
					<span className="font-mono text-[9px] font-bold uppercase tracking-wider border border-[#E5E5E5] px-2 py-1 bg-white">
						{action.replace(/_/g, " ")}
					</span>
				) : (
					<span className="text-[9px] text-[#888]">—</span>
				)}
			</div>

			{/* Metrics */}
			<div className="col-span-1 text-center">
				<div className="font-mono text-xs font-medium">{fired}</div>
				{converted !== undefined && (
					<div className="text-[9px] text-[#888] font-mono">{converted} conv</div>
				)}
			</div>

			{/* Controls */}
			<div className="flex items-center justify-end col-span-1 gap-3">
				{onToggle && <CustomToggle checked={isActiveState} onCheckedChange={onToggle} />}
				{onEdit && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onEdit();
						}}
						className="text-[#888] hover:text-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<Edit3 size={14} />
					</button>
				)}
				{onDelete && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="text-[#888] hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
					>
						<Trash2 size={14} />
					</button>
				)}
			</div>
		</div>
	);
}
