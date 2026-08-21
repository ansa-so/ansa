"use client";

import { CheckSquare, GripVertical, Trash2 } from "lucide-react";
import type { ReactNode } from "react";

// Color mapping for different field types
const FIELD_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
	rating: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
	text: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
	text_area: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
	textarea: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
	email: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
	tel: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
	number: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
	select: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
	multiselect: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
	date: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
	datetime: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
	file: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
	image: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

function getFieldTypeColors(type: string) {
	return (
		FIELD_TYPE_COLORS[type] || {
			bg: "bg-blue-50",
			text: "text-blue-700",
			border: "border-blue-200",
		}
	);
}

export interface FieldNodeField {
	id?: string | number;
	type: string;
	label: string;
	name?: string;
	required?: boolean;
	varName?: string;
}

interface FieldNodeProps {
	field: FieldNodeField;
	onDelete?: () => void;
	onRequiredChange?: (required: boolean) => void;
	onLabelChange?: (label: string) => void;
	onClick?: () => void;
	rightContent?: ReactNode;
	isDragging?: boolean;
	dragHandleProps?: Record<string, unknown>;
	showDragHandle?: boolean;
	showRequiredToggle?: boolean;
	showDeleteButton?: boolean;
	readOnly?: boolean;
}

export function FieldNode({
	field,
	onDelete,
	onRequiredChange,
	onLabelChange,
	onClick,
	rightContent,
	isDragging = false,
	dragHandleProps,
	showDragHandle = true,
	showRequiredToggle = true,
	showDeleteButton = true,
	readOnly = false,
}: FieldNodeProps) {
	const colors = getFieldTypeColors(field.type);
	const varName = field.varName || field.name || field.type;

	return (
		<div
			className={`group flex items-start gap-3 p-3 bg-white border border-[#D1D1D1] hover:border-[#1A1A1A] transition-all relative ${
				isDragging ? "shadow-lg opacity-90" : ""
			} ${onClick ? "cursor-pointer" : ""}`}
			onClick={onClick}
			onKeyDown={(e) => {
				if (onClick && e.key === "Enter") onClick();
			}}
			role={onClick ? "button" : undefined}
			tabIndex={onClick ? 0 : undefined}
		>
			{/* Drag Handle */}
			{showDragHandle && (
				<div
					className="mt-2 text-[#D1D1D1] cursor-grab active:cursor-grabbing hover:text-[#1A1A1A]"
					{...dragHandleProps}
				>
					<GripVertical size={14} />
				</div>
			)}

			<div className="flex-1 space-y-2">
				{/* Header Row */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<span
							className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded-sm border ${colors.bg} ${colors.text} ${colors.border}`}
						>
							{field.type}
						</span>
						<span className="text-[10px] font-mono text-[#888]">var: {varName}</span>
					</div>

					<div className="flex items-center gap-2">
						{showRequiredToggle && (
							<label className="flex items-center gap-1 cursor-pointer select-none">
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onRequiredChange?.(!field.required);
									}}
									className={`w-3 h-3 border border-[#D1D1D1] flex items-center justify-center ${
										field.required ? "bg-[#1A1A1A] border-[#1A1A1A]" : "bg-white"
									}`}
								>
									{field.required && <CheckSquare size={8} className="text-white" />}
								</button>
								<span className="text-[9px] font-mono uppercase text-[#555]">Req</span>
							</label>
						)}
						{showDeleteButton && onDelete && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									onDelete();
								}}
								className="text-[#D1D1D1] hover:text-red-600 transition-colors"
							>
								<Trash2 size={12} />
							</button>
						)}
						{rightContent}
					</div>
				</div>

				{/* Input/Label Display */}
				{readOnly ? (
					<input
						type="text"
						value={field.label}
						readOnly
						className="w-full bg-[#FAFAF9] border-b border-[#E5E5E5] text-xs font-medium text-[#1A1A1A] py-1 focus:outline-none focus:border-[#1A1A1A] cursor-default"
					/>
				) : (
					<input
						type="text"
						value={field.label}
						onChange={(e) => onLabelChange?.(e.target.value)}
						onClick={(e) => e.stopPropagation()}
						className="w-full bg-[#FAFAF9] border-b border-[#E5E5E5] text-xs font-medium text-[#1A1A1A] py-1 focus:outline-none focus:border-[#1A1A1A]"
						placeholder="Field label..."
					/>
				)}
			</div>
		</div>
	);
}
