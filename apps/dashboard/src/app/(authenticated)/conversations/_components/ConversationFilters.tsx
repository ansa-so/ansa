"use client";

import { CONFIDENCE_LEVELS } from "@ansa/utils";
import {
	AlertTriangle,
	CheckCircle,
	CheckCircle2,
	Filter,
	Globe,
	HelpCircle,
	Lightbulb,
	Mail,
	MessageSquare,
	MousePointerClick,
	Target,
	ThumbsDown,
	ThumbsUp,
	XCircle,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { ConversationFilterCounts } from "@/lib/api";
import type { ActionStatusFilter } from "@/lib/conversation-list-context";
import { cn } from "@/lib/utils";

export type InboxTab = "all" | "mine" | "unassigned" | "escalated" | "low-confidence";
export type FeedbackFilter = "thumbs-up" | "thumbs-down" | null;

const CHANNELS = [
	{ id: "widget", label: "Widget", icon: MessageSquare },
	{ id: "iframe", label: "Iframe", icon: Globe },
	{ id: "email", label: "Email", icon: Mail },
] as const;

// Map confidence level IDs to icons
const CONFIDENCE_ICONS = {
	high: CheckCircle,
	medium: HelpCircle,
	low: AlertTriangle,
} as const;

const FEEDBACK_OPTIONS = [
	{ id: "thumbs-up", label: "Thumbs Up", icon: ThumbsUp, color: "text-green-600" },
	{ id: "thumbs-down", label: "Thumbs Down", icon: ThumbsDown, color: "text-red-600" },
] as const;

const ACTION_STATUS_OPTIONS = [
	{ id: "has_action", label: "Has action", icon: MousePointerClick, color: "text-blue-600" },
	{ id: "succeeded", label: "Succeeded", icon: CheckCircle2, color: "text-green-600" },
	{ id: "failed", label: "Failed", icon: XCircle, color: "text-red-600" },
	{ id: "none", label: "No action", icon: Zap, color: "text-gray-400" },
] as const;

interface ConversationFiltersProps {
	activeTab: InboxTab;
	onTabChange: (tab: InboxTab) => void;
	selectedChannels: string[];
	onChannelsChange: (channels: string[]) => void;
	selectedConfidenceLevels: string[];
	onConfidenceLevelsChange: (levels: string[]) => void;
	selectedFeedback: FeedbackFilter;
	onFeedbackChange: (feedback: FeedbackFilter) => void;
	filterCounts: ConversationFilterCounts;
	actionStatus?: ActionStatusFilter | null;
	onActionStatusChange: (status: ActionStatusFilter | null) => void;
	resolved?: boolean | null;
	onResolvedChange: (resolved: boolean | null) => void;
	hasMeaningfulQuestion?: boolean;
	onHasMeaningfulQuestionChange: (value: boolean) => void;
	hasConversion?: boolean;
	onHasConversionChange: (value: boolean) => void;
}

export function ConversationFilters({
	activeTab,
	onTabChange,
	selectedChannels,
	onChannelsChange,
	selectedConfidenceLevels,
	onConfidenceLevelsChange,
	selectedFeedback,
	onFeedbackChange,
	filterCounts,
	actionStatus,
	onActionStatusChange,
	resolved,
	onResolvedChange,
	hasMeaningfulQuestion,
	onHasMeaningfulQuestionChange,
	hasConversion,
	onHasConversionChange,
}: ConversationFiltersProps) {
	const getTabLabel = (tab: InboxTab) => {
		switch (tab) {
			case "all":
				return "All";
			case "mine":
				return "Mine";
			case "unassigned":
				return "Unassigned";
			case "escalated":
				return "Escalated";
			case "low-confidence":
				return "Low confidence";
		}
	};

	const activeFilterCount =
		selectedChannels.length +
		selectedConfidenceLevels.length +
		(selectedFeedback ? 1 : 0) +
		(actionStatus ? 1 : 0) +
		(resolved !== null && resolved !== undefined ? 1 : 0) +
		(hasMeaningfulQuestion ? 1 : 0) +
		(hasConversion ? 1 : 0);

	return (
		<div className="flex items-center gap-2 p-3 border-b border-[#D1D1D1] min-h-[64px] bg-white">
			<Select value={activeTab} onValueChange={(v) => onTabChange(v as InboxTab)}>
				<SelectTrigger className="w-[160px] h-8 text-[10px] font-mono uppercase tracking-widest border-[#D1D1D1]">
					<SelectValue>
						{getTabLabel(activeTab)}
						{activeTab === "escalated" && (filterCounts.escalated ?? 0) > 0 && (
							<Badge variant="destructive" className="h-4 px-1 ml-1.5 min-w-4 text-[10px]">
								{filterCounts.escalated}
							</Badge>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="all">All</SelectItem>
					<SelectItem value="mine">Mine</SelectItem>
					<SelectItem value="unassigned">Unassigned</SelectItem>
					<SelectItem value="escalated">
						<span className="flex items-center gap-1.5">
							Escalated
							{(filterCounts.escalated ?? 0) > 0 && (
								<Badge variant="destructive" className="h-4 px-1 min-w-4 text-[10px]">
									{filterCounts.escalated}
								</Badge>
							)}
						</span>
					</SelectItem>
					<SelectItem value="low-confidence">Low confidence</SelectItem>
				</SelectContent>
			</Select>

			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant={activeFilterCount > 0 ? "default" : "ghost"}
						size="sm"
						className="p-0 ml-auto h-7 w-7"
					>
						<Filter className="h-3.5 w-3.5" />
						{activeFilterCount > 0 && (
							<Badge
								variant="secondary"
								className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
							>
								{activeFilterCount}
							</Badge>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-3 w-52" align="end">
					<div className="space-y-3">
						{/* Channels */}
						<div>
							<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
								Channel
							</p>
							<div className="space-y-1">
								{CHANNELS.map((channel) => (
									<Label
										key={channel.id}
										className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm"
									>
										<Checkbox
											checked={selectedChannels.includes(channel.id)}
											onCheckedChange={(checked) => {
												onChannelsChange(
													checked
														? [...selectedChannels, channel.id]
														: selectedChannels.filter((c) => c !== channel.id),
												);
											}}
										/>
										<channel.icon className="h-3.5 w-3.5" />
										{channel.label}
									</Label>
								))}
							</div>
						</div>

						<Separator />

						{/* Confidence */}
						<div>
							<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
								Confidence
							</p>
							<div className="space-y-1">
								{CONFIDENCE_LEVELS.map((level) => {
									const Icon = CONFIDENCE_ICONS[level.id];
									return (
										<Label
											key={level.id}
											className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm"
										>
											<Checkbox
												checked={selectedConfidenceLevels.includes(level.id)}
												onCheckedChange={(checked) => {
													onConfidenceLevelsChange(
														checked
															? [...selectedConfidenceLevels, level.id]
															: selectedConfidenceLevels.filter((c) => c !== level.id),
													);
												}}
											/>
											<Icon className={cn("h-3.5 w-3.5", level.color)} />
											{level.label}
										</Label>
									);
								})}
							</div>
						</div>

						<Separator />

						{/* Feedback */}
						<div>
							<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
								Feedback
							</p>
							<div className="space-y-1">
								{FEEDBACK_OPTIONS.map((option) => (
									<Label
										key={option.id}
										className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm"
									>
										<Checkbox
											checked={selectedFeedback === option.id}
											onCheckedChange={(checked) => {
												onFeedbackChange(checked ? (option.id as FeedbackFilter) : null);
											}}
										/>
										<option.icon className={cn("h-3.5 w-3.5", option.color)} />
										{option.label}
									</Label>
								))}
							</div>
						</div>

						<Separator />

						{/* Action Status */}
						<div>
							<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
								Actions
							</p>
							<div className="space-y-1">
								{ACTION_STATUS_OPTIONS.map((option) => (
									<Label
										key={option.id}
										className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm"
									>
										<Checkbox
											checked={actionStatus === option.id}
											onCheckedChange={(checked) => {
												onActionStatusChange(checked ? (option.id as ActionStatusFilter) : null);
											}}
										/>
										<option.icon className={cn("h-3.5 w-3.5", option.color)} />
										{option.label}
									</Label>
								))}
							</div>
						</div>

						<Separator />

						{/* Resolution & Questions */}
						<div>
							<p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
								Status
							</p>
							<div className="space-y-1">
								<Label className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm">
									<Checkbox
										checked={resolved === true}
										onCheckedChange={(checked) => {
											onResolvedChange(checked ? true : null);
										}}
									/>
									<CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
									Resolved only
								</Label>
								<Label className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm">
									<Checkbox
										checked={hasMeaningfulQuestion === true}
										onCheckedChange={(checked) => {
											onHasMeaningfulQuestionChange(!!checked);
										}}
									/>
									<Lightbulb className="h-3.5 w-3.5 text-amber-500" />
									Meaningful questions
								</Label>
								<Label className="flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-muted text-sm">
									<Checkbox
										checked={hasConversion === true}
										onCheckedChange={(checked) => {
											onHasConversionChange(!!checked);
										}}
									/>
									<Target className="h-3.5 w-3.5 text-blue-500" />
									Has conversion
								</Label>
							</div>
						</div>

						{activeFilterCount > 0 && (
							<>
								<Separator />
								<Button
									variant="ghost"
									size="sm"
									className="w-full text-xs h-7"
									onClick={() => {
										onChannelsChange([]);
										onConfidenceLevelsChange([]);
										onFeedbackChange(null);
										onActionStatusChange(null);
										onResolvedChange(null);
										onHasMeaningfulQuestionChange(false);
										onHasConversionChange(false);
									}}
								>
									Clear all filters
								</Button>
							</>
						)}
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
