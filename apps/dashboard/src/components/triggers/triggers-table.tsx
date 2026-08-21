"use client";

import { TriggerRow } from "@/components/analytics/brutalist/trigger-row";
import { TableToolbar } from "@/components/ui/table-toolbar";
import type { Trigger, TriggerActionType, TriggerStats } from "@/lib/api";

interface TriggersTableProps {
	triggers: Trigger[];
	stats: Record<string, TriggerStats>;
	onEdit: (trigger: Trigger) => void;
	onDelete: (trigger: Trigger) => void;
	onToggle: (trigger: Trigger) => void;
	isLoading?: boolean;
	searchValue?: string;
	onSearchChange?: (value: string) => void;
	activeFilter?: string;
	onFilterChange?: (filter: string) => void;
}

function getConditionsSummary(trigger: Trigger): string {
	const parts: string[] = [];
	if (trigger.conditions.timeOnPage) {
		parts.push(`time > ${trigger.conditions.timeOnPage}s`);
	}
	if (trigger.conditions.scrollDepth) {
		parts.push(`scroll > ${trigger.conditions.scrollDepth}%`);
	}
	if (trigger.conditions.page) {
		parts.push(`path == ${trigger.conditions.page}`);
	}
	if (trigger.conditions.event) {
		parts.push(`event == ${trigger.conditions.event}`);
	}

	// Format like test9: combine with &&
	return parts.length > 0 ? parts.join(" && ") : "global";
}

function formatActionType(actionType: TriggerActionType): string {
	return actionType.toUpperCase().replace(/_/g, "_");
}

export function TriggersTable({
	triggers,
	stats,
	onEdit,
	onDelete,
	onToggle,
	isLoading = false,
	searchValue = "",
	onSearchChange,
	activeFilter = "all",
	onFilterChange,
}: TriggersTableProps) {
	const activeTriggers = triggers.filter((t) => t.isEnabled);
	const inactiveTriggers = triggers.filter((t) => !t.isEnabled);

	const filters = onFilterChange
		? [
				{
					label: "All",
					count: triggers.length,
					active: activeFilter === "all",
					onClick: () => onFilterChange("all"),
				},
				{
					label: "Active",
					count: activeTriggers.length,
					active: activeFilter === "active",
					onClick: () => onFilterChange("active"),
				},
				{
					label: "Inactive",
					count: inactiveTriggers.length,
					active: activeFilter === "inactive",
					onClick: () => onFilterChange("inactive"),
				},
			]
		: undefined;

	// Filter triggers based on search and active filter
	let filteredTriggers = triggers;

	if (searchValue) {
		const search = searchValue.toLowerCase();
		filteredTriggers = filteredTriggers.filter(
			(t) =>
				t.name.toLowerCase().includes(search) ||
				t.triggerType.toLowerCase().includes(search) ||
				t.actionType.toLowerCase().includes(search),
		);
	}

	if (activeFilter === "active") {
		filteredTriggers = filteredTriggers.filter((t) => t.isEnabled);
	} else if (activeFilter === "inactive") {
		filteredTriggers = filteredTriggers.filter((t) => !t.isEnabled);
	}

	if (isLoading) {
		return (
			<div className="bg-white border border-[#D1D1D1] shadow-sm">
				<div className="flex items-center justify-center py-12">
					<div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
				</div>
			</div>
		);
	}

	return (
		<section className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col">
			{/* Toolbar */}
			<TableToolbar
				searchPlaceholder="FILTER RULES..."
				searchValue={searchValue}
				onSearchChange={onSearchChange}
				filters={filters}
			/>

			{/* Header */}
			<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
				<div className="col-span-3">Rule Name</div>
				<div className="col-span-2">Type</div>
				<div className="col-span-3">Conditions (Logic)</div>
				<div className="col-span-2">Exec Action</div>
				<div className="col-span-1 text-center">Fired</div>
				<div className="col-span-1 text-right">State</div>
			</div>

			{/* Body */}
			<div className="flex-1 min-h-[200px]">
				{filteredTriggers.length === 0 ? (
					<div className="flex items-center justify-center py-12 text-[#888] font-mono text-xs">
						No triggers found
					</div>
				) : (
					filteredTriggers.map((trigger) => {
						const triggerStats = stats[trigger.id];
						return (
							<TriggerRow
								key={trigger.id}
								id={trigger.id.slice(0, 8)}
								name={trigger.name}
								type={trigger.triggerType}
								condition={getConditionsSummary(trigger)}
								action={formatActionType(trigger.actionType)}
								fired={triggerStats?.firedCount || 0}
								converted={triggerStats?.convertedCount}
								status={trigger.isEnabled ? "active" : "inactive"}
								variant="full"
								onToggle={() => onToggle(trigger)}
								onEdit={() => onEdit(trigger)}
								onDelete={() => onDelete(trigger)}
								onClick={() => onEdit(trigger)}
							/>
						);
					})
				)}
			</div>
		</section>
	);
}
