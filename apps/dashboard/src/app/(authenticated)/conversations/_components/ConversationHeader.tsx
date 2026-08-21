"use client";

import { CircularProgress } from "@ansa/ui";
import { formatRelativeTime } from "@ansa/utils";
import {
	AlertTriangle,
	Bot,
	CheckCircle,
	Clock,
	Globe,
	Info,
	Mail,
	MessageSquare,
	Sparkles,
	User,
	Wrench,
	X,
} from "lucide-react";
import { StatusTag } from "@/components/ui/status-tag";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Conversation } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ConversationHeaderProps {
	conversation: Conversation;
	slaTimeRemaining: string | null;
	slaBreached: boolean;
	onOpenQuickActions: () => void;
	onOpenUserInfo: () => void;
	onClose: () => void;
}

export function ConversationHeader({
	conversation,
	slaTimeRemaining,
	slaBreached,
	onOpenQuickActions,
	onOpenUserInfo,
	onClose,
}: ConversationHeaderProps) {
	return (
		<>
			{/* Header - test7 style */}
			<header className="h-16 border-b border-[#D1D1D1] dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-between px-6 shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-sm font-bold text-[#1A1A1A] dark:text-white truncate max-w-[400px]">
							{conversation.title || "Untitled"}
						</h1>
					</div>

					<div className="flex items-center gap-2 mt-1">
						{/* Escalation status - test7 style */}
						{conversation.hasEscalation && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<StatusTag status="escalated" icon={<AlertTriangle size={8} />} />
									</span>
								</TooltipTrigger>
								<TooltipContent>This conversation needs human attention</TooltipContent>
							</Tooltip>
						)}

						{/* SLA/Time indicator - test7 style */}
						{conversation.escalation && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span
										className={cn(
											"flex items-center gap-1 text-[9px] font-mono uppercase",
											slaBreached ? "text-red-600" : "text-[#888]",
										)}
									>
										<Clock size={10} />
										{slaTimeRemaining || formatRelativeTime(conversation.escalation.escalatedAt)}
									</span>
								</TooltipTrigger>
								<TooltipContent>
									{conversation.escalation.slaDeadline
										? slaBreached
											? "This escalation has exceeded its SLA deadline"
											: `SLA deadline: ${new Date(conversation.escalation.slaDeadline).toLocaleString()}`
										: `Escalated ${formatRelativeTime(conversation.escalation.escalatedAt)} • Priority: ${conversation.escalation.priority}`}
								</TooltipContent>
							</Tooltip>
						)}

						{(conversation.escalation || conversation.hasEscalation) && (
							<span className="text-[#D1D1D1] dark:text-zinc-700">|</span>
						)}

						{/* Channel - test7 style */}
						{conversation.channel && (
							<span className="font-mono text-[9px] border border-[#E5E5E5] dark:border-zinc-700 px-1.5 py-0.5 text-[#888] uppercase flex items-center gap-1">
								{conversation.channel === "widget" && <MessageSquare size={10} />}
								{conversation.channel === "iframe" && <Globe size={10} />}
								{conversation.channel === "email" && <Mail size={10} />}
								{conversation.channel}
							</span>
						)}

						{/* Confidence level - circular progress */}
						{conversation.minConfidence != null && (
							<Tooltip>
								<TooltipTrigger asChild>
									<span>
										<CircularProgress value={conversation.minConfidence} size={20} />
									</span>
								</TooltipTrigger>
								<TooltipContent>
									Confidence: {Math.round(conversation.minConfidence)}%
								</TooltipContent>
							</Tooltip>
						)}

						{/* Resolution - test7 style */}
						{conversation.resolution && (
							<StatusTag
								status={
									conversation.resolution === "ai_handled"
										? "info"
										: conversation.resolution === "human_handled"
											? "warning"
											: "success"
								}
								label={
									conversation.resolution === "ai_handled"
										? "AI"
										: conversation.resolution === "human_handled"
											? "Human"
											: "Improved"
								}
								icon={
									conversation.resolution === "ai_handled" ? (
										<Bot className="w-3 h-3" />
									) : conversation.resolution === "human_handled" ? (
										<User className="w-3 h-3" />
									) : (
										<Sparkles className="w-3 h-3" />
									)
								}
							/>
						)}

						{/* Closed status - test7 style */}
						{(conversation.status === "closed" || conversation.status === "resolved") && (
							<StatusTag status="closed" icon={<CheckCircle className="w-3 h-3" />} />
						)}
					</div>
				</div>

				{/* Action buttons - test7 style */}
				<div className="flex gap-2">
					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="border border-[#D1D1D1] dark:border-zinc-600 bg-white dark:bg-zinc-800 p-2 hover:bg-[#1A1A1A] dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 hover:border-[#1A1A1A] dark:hover:border-white transition-colors"
								onClick={onOpenQuickActions}
							>
								<Wrench size={16} />
							</button>
						</TooltipTrigger>
						<TooltipContent>Quick Actions</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="border border-[#D1D1D1] dark:border-zinc-600 bg-white dark:bg-zinc-800 p-2 hover:bg-[#1A1A1A] dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 hover:border-[#1A1A1A] dark:hover:border-white transition-colors"
								onClick={onOpenUserInfo}
							>
								<Info size={16} />
							</button>
						</TooltipTrigger>
						<TooltipContent>Conversation Info</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger asChild>
							<button
								type="button"
								className="border border-[#D1D1D1] dark:border-zinc-600 bg-white dark:bg-zinc-800 p-2 hover:bg-[#1A1A1A] dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 hover:border-[#1A1A1A] dark:hover:border-white transition-colors"
								onClick={onClose}
							>
								<X size={16} />
							</button>
						</TooltipTrigger>
						<TooltipContent>Close</TooltipContent>
					</Tooltip>
				</div>
			</header>
		</>
	);
}
