"use client";

import type { LucideIcon } from "lucide-react";
import { Database, Mail, MessageSquare, Webhook } from "lucide-react";

// Icon mapping for different action types
const ACTION_TYPE_ICONS: Record<string, LucideIcon> = {
	save_db: Database,
	database: Database,
	webhook: Webhook,
	slack: MessageSquare,
	email: Mail,
};

function getActionIcon(type: string): LucideIcon {
	return ACTION_TYPE_ICONS[type] || Database;
}

export interface PipelineAction {
	id?: string;
	type: string;
	label: string;
	detail?: string;
	enabled?: boolean;
}

interface PipelineStepProps {
	action: PipelineAction;
	onEdit?: () => void;
	onDelete?: () => void;
	onToggle?: (enabled: boolean) => void;
}

export function PipelineStep({ action, onEdit, onDelete, onToggle }: PipelineStepProps) {
	const Icon = getActionIcon(action.type);
	const isEnabled = action.enabled !== false;

	return (
		<div
			className={`flex items-center gap-3 p-3 bg-[#FAFAF9] border border-[#D1D1D1] border-l-4 border-l-[#1A1A1A] ${
				!isEnabled ? "opacity-50" : ""
			}`}
		>
			<div className="w-8 h-8 bg-white border border-[#E5E5E5] flex items-center justify-center text-[#1A1A1A]">
				<Icon size={14} />
			</div>
			<div className="flex-1 min-w-0">
				<div className="text-xs font-bold uppercase truncate">{action.label}</div>
				{action.detail && (
					<div className="text-[9px] font-mono text-[#888] truncate">{action.detail}</div>
				)}
			</div>
			<div className="flex items-center gap-2">
				<div
					className={`px-2 py-1 border text-[9px] font-mono uppercase ${
						isEnabled
							? "bg-white border-[#E5E5E5] text-[#555]"
							: "bg-[#F3F2EE] border-[#D1D1D1] text-[#888]"
					}`}
				>
					{isEnabled ? "Active" : "Disabled"}
				</div>
				{onToggle && (
					<button
						type="button"
						onClick={() => onToggle(!isEnabled)}
						className="text-[9px] font-mono uppercase text-[#888] hover:text-[#1A1A1A] transition-colors"
					>
						{isEnabled ? "Disable" : "Enable"}
					</button>
				)}
				{onEdit && (
					<button
						type="button"
						onClick={onEdit}
						className="text-[9px] font-mono uppercase text-[#888] hover:text-[#1A1A1A] transition-colors"
					>
						Edit
					</button>
				)}
				{onDelete && (
					<button
						type="button"
						onClick={onDelete}
						className="text-[9px] font-mono uppercase text-red-400 hover:text-red-600 transition-colors"
					>
						Remove
					</button>
				)}
			</div>
		</div>
	);
}
