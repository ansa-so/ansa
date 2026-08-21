"use client";

import { CircularProgress } from "@ansa/ui";
import { formatRelativeTime } from "@ansa/utils";
import { User, UserRoundCog } from "lucide-react";
import type { ReactNode } from "react";
import { StatusTag } from "@/components/ui/status-tag";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Conversation } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_TAGS = 3;

// const RESOLUTIONS = [
//   { id: "ai_handled", label: "AI", icon: Bot, color: "text-blue-600" },
//   { id: "human_handled", label: "Human", icon: User, color: "text-purple-600" },
//   { id: "improved", label: "Improved", icon: Sparkles, color: "text-amber-600" },
// ] as const;

function getLastMessagePreview(conversation: Conversation): string | null {
	const messages = conversation.messages;
	if (!messages || messages.length === 0) return conversation.title || null;

	// Get the last message
	const lastMsg = messages[messages.length - 1];
	if (!lastMsg) return conversation.title || null;

	const content = lastMsg.content.replace(/\n/g, " ").trim();
	return content.length > 85 ? `${content.slice(0, 85)}...` : content;
}

interface TagItem {
	key: string;
	element: ReactNode;
	tooltip?: string;
}

interface ConversationListItemProps {
	conversation: Conversation;
	isSelected: boolean;
	onClick: () => void;
}

export function ConversationListItem({
	conversation,
	isSelected,
	onClick,
}: ConversationListItemProps) {
	// const resolutionInfo = RESOLUTIONS.find((r) => r.id === conversation.resolution);
	const preview = getLastMessagePreview(conversation);
	const isClosed = conversation.status === "closed" || conversation.status === "resolved";

	// Collect all tags
	const allTags: TagItem[] = [];

	if (conversation.hasEscalation) {
		allTags.push({
			key: "escalation",
			element: <StatusTag status="escalated" icon={<UserRoundCog className="w-3 h-3" />} />,
			tooltip: "This conversation needs human attention",
		});
	}

	// Confidence is now shown as a circular progress indicator at bottom-right

	// if (resolutionInfo) {
	//   const tooltipText = resolutionInfo.id === "ai_handled"
	//     ? "AI resolved this conversation"
	//     : resolutionInfo.id === "human_handled"
	//       ? "Human agent resolved this conversation"
	//       : "Response was improved for better future responses";

	//   allTags.push({
	//     key: "resolution",
	//     element: (
	//       <StatusTag
	//         status={resolutionInfo.id === "ai_handled" ? "info" : resolutionInfo.id === "human_handled" ? "warning" : "success"}
	//         label={resolutionInfo.label}
	//         icon={<resolutionInfo.icon className="w-3 h-3" />}
	//       />
	//     ),
	//     tooltip: tooltipText,
	//   });
	// }

	if (conversation.assignee) {
		allTags.push({
			key: "assignee",
			element: (
				<StatusTag
					status="resolved"
					label={conversation.assignee.name || conversation.assignee.email.split("@")[0]}
					icon={<User className="w-3 h-3" />}
				/>
			),
		});
	}

	const visibleTags = allTags.slice(0, MAX_VISIBLE_TAGS);
	const hiddenCount = allTags.length - MAX_VISIBLE_TAGS;

	return (
		<button
			type="button"
			className={cn(
				"w-full text-left p-4 transition-colors relative border-b border-[#F3F2EE] min-h-26 dark:border-zinc-800 bg-white dark:bg-zinc-900",
				"hover:bg-[#FAFAF9] dark:hover:bg-zinc-800",
				isSelected && "bg-[#F3F2EE] dark:bg-zinc-800",
				isClosed && "opacity-70",
			)}
			onClick={onClick}
		>
			{/* Active indicator - test7 style left border */}
			{isSelected && (
				<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A1A1A] dark:bg-white" />
			)}

			{/* Status tag - absolute positioned */}
			<span
				className={cn(
					"absolute right-3.5 top-9 text-[9px] font-mono uppercase px-1.5 py-0.5 border rounded-sm",
					isClosed
						? "bg-[#F3F2EE] text-[#555] border-[#D1D1D1] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-600"
						: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
				)}
			>
				{isClosed ? "resolved" : "open"}
			</span>

			<div className="flex items-start justify-between mb-1">
				<span className="font-bold text-xs uppercase tracking-tight text-[#555] dark:text-zinc-400 truncate">
					{conversation.title || "Untitled"}
				</span>
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="font-mono text-[10px] text-[#888] shrink-0">
							{formatRelativeTime(conversation.updatedAt, { compact: true })}
						</span>
					</TooltipTrigger>
					<TooltipContent>{new Date(conversation.updatedAt).toLocaleString()}</TooltipContent>
				</Tooltip>
			</div>

			{preview && (
				<p className="text-xs text-[#666] dark:text-zinc-500 truncate mb-3 font-mono pr-16">
					{preview}
				</p>
			)}

			<div className="flex items-center gap-1.5 flex-wrap min-h-6">
				{visibleTags.map((tag) =>
					tag.tooltip ? (
						<Tooltip key={tag.key}>
							<TooltipTrigger asChild>
								<span className="shrink-0">{tag.element}</span>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs">{tag.tooltip}</TooltipContent>
						</Tooltip>
					) : (
						<span key={tag.key} className="shrink-0">
							{tag.element}
						</span>
					),
				)}

				{hiddenCount > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="shrink-0 inline-flex items-center text-[9px] font-bold uppercase px-1.5 py-0.5 border tracking-wide bg-[#F3F2EE] text-[#888] border-[#D1D1D1] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
								+{hiddenCount}
							</span>
						</TooltipTrigger>
						<TooltipContent>
							{allTags
								.slice(MAX_VISIBLE_TAGS)
								.map((tag) => tag.key)
								.join(", ")}
						</TooltipContent>
					</Tooltip>
				)}
			</div>

			{/* Confidence indicator - bottom right */}
			{conversation.minConfidence != null && (
				<Tooltip>
					<TooltipTrigger asChild>
						<span className="absolute bottom-3 right-3">
							<CircularProgress value={conversation.minConfidence} size={20} />
						</span>
					</TooltipTrigger>
					<TooltipContent>Confidence: {Math.round(conversation.minConfidence)}%</TooltipContent>
				</Tooltip>
			)}
		</button>
	);
}
