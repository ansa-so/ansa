"use client";

import { getConfidenceLevel } from "@ansa/utils";
import { Check, ChevronDown, Languages, Lightbulb, Tag, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { BlockRenderer } from "@/components/tool-blocks";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ConversationMessage } from "@/lib/api";
import { getLanguageName } from "@/lib/language-names";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
	message: ConversationMessage;
	onSuggestResponse?: () => void;
	showSuggestButton?: boolean;
	isSeen?: boolean;
	fallbackHumanName?: string;
}

function formatTime(dateString: string): string {
	return new Date(dateString).toLocaleTimeString([], {
		hour: "numeric",
		minute: "2-digit",
	});
}

export function MessageBubble({
	message,
	onSuggestResponse,
	showSuggestButton = false,
	isSeen = false,
	fallbackHumanName,
}: MessageBubbleProps) {
	const isUser = message.role === "user";
	const isHuman = message.isHumanResponse;
	const isAI = message.role === "assistant" && !isHuman;
	const [showOriginal, setShowOriginal] = useState(false);

	// Check if message was translated
	const isTranslated = !!message.metadata?.originalContent;
	const originalContent = message.metadata?.originalContent;
	const translatedFrom = message.metadata?.translatedFrom;
	const translatedTo = message.metadata?.translatedTo;

	// Render system messages as dividers
	const isSystemMessage =
		message.metadata?.messageType &&
		["escalation_notice", "user_escalation_notice", "deescalation_notice"].includes(
			message.metadata.messageType,
		);

	if (isSystemMessage) {
		return (
			<div className="flex justify-center my-6">
				<span className="text-[10px] font-mono text-[#888] bg-[#F3F2EE] dark:bg-zinc-800 px-3 py-1 border border-[#E5E5E5] dark:border-zinc-700 uppercase tracking-wide">
					{message.content}
				</span>
			</div>
		);
	}

	// Check for internal notes
	const isInternalNote = message.metadata?.messageType === "internal_note";

	if (isInternalNote) {
		return (
			<div className="mx-8 my-4 bg-[#FFF9C4] dark:bg-yellow-900/30 border border-[#FBC02D] dark:border-yellow-700 p-3 flex gap-3 text-xs text-[#555] dark:text-yellow-200">
				<div className="mt-0.5 text-[#FBC02D]">
					<Tag size={12} />
				</div>
				<div>
					<span className="font-bold text-[#1A1A1A] dark:text-white mr-2">Internal Note:</span>
					{message.content}
				</div>
			</div>
		);
	}

	// Get confidence info
	const confidenceScore = message.confidenceScore;
	const confidenceLevel = confidenceScore != null ? getConfidenceLevel(confidenceScore) : null;

	return (
		<div className={cn("group flex flex-col mb-6 px-6", isUser ? "items-end" : "items-start")}>
			{/* Metadata Header - test1 style */}
			<div className={cn("w-full max-w-xl mb-2 select-none", isUser ? "text-right" : "text-left")}>
				<div className="flex items-center gap-2">
					<div className={cn("flex items-center gap-2", isUser && "flex-row-reverse w-full")}>
						{/* Role Badge */}
						<div
							className={cn(
								"text-[9px] font-bold uppercase px-1.5 py-0.5 border",
								isUser
									? "bg-white dark:bg-zinc-800 text-[#1A1A1A] dark:text-zinc-100 border-[#D1D1D1] dark:border-zinc-500"
									: isHuman
										? "bg-purple-600 text-white border-purple-600"
										: "bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 border-[#1A1A1A] dark:border-zinc-100",
							)}
						>
							{isUser
								? "USER"
								: isHuman
									? message.metadata?.sentByName ||
										message.metadata?.sentByEmail?.split("@")[0] ||
										fallbackHumanName ||
										"HUMAN"
									: "AI"}
						</div>
						<span className="text-[9px] font-mono text-[#888]">
							{formatTime(message.createdAt)}
						</span>
						{isTranslated && (
							<>
								<span className="text-[9px] text-[#D1D1D1]">|</span>
								<Tooltip>
									<TooltipTrigger asChild>
										<span className="flex items-center gap-0.5 text-[9px] text-blue-600 dark:text-blue-400 cursor-help font-mono">
											<Languages className="w-3 h-3" /> TRANSLATED
										</span>
									</TooltipTrigger>
									<TooltipContent>
										Translated from {translatedFrom ? getLanguageName(translatedFrom) : "unknown"}{" "}
										to {translatedTo ? getLanguageName(translatedTo) : "unknown"}
									</TooltipContent>
								</Tooltip>
							</>
						)}
						{confidenceScore != null &&
							!isUser &&
							(!message.toolBlocks || message.toolBlocks.length === 0) && (
								<>
									<span className="text-[9px] text-[#D1D1D1]">|</span>
									<Tooltip>
										<TooltipTrigger asChild>
											<span
												className={cn(
													"text-[9px] font-mono cursor-help",
													confidenceLevel === "high"
														? "text-green-600"
														: confidenceLevel === "medium"
															? "text-orange-600"
															: "text-red-600",
												)}
											>
												CONF: {confidenceScore}%
											</span>
										</TooltipTrigger>
										<TooltipContent className="max-w-xs">
											Confidence score indicates how well this response is grounded in your
											knowledge base
										</TooltipContent>
									</Tooltip>
								</>
							)}
					</div>
					<div
						className={cn(
							"text-[9px] font-mono text-[#CCC] opacity-0 group-hover:opacity-100 transition-opacity",
							isUser && "order-first mr-2",
						)}
					>
						ID: {message.id.slice(0, 8)}
					</div>
				</div>
			</div>

			{/* Message Body - test1 style */}
			<div
				className={cn(
					"max-w-xl border p-5 shadow-sm relative",
					isUser
						? "bg-white dark:bg-zinc-800 border-[#D1D1D1] dark:border-zinc-600"
						: isHuman
							? "bg-purple-50 dark:bg-purple-900/30 border-[#D1D1D1] dark:border-purple-700"
							: "bg-[#FAFAF9] dark:bg-zinc-800 border-[#D1D1D1] dark:border-zinc-600",
				)}
			>
				{/* Decorative left bar for AI/Human responses */}
				{!isUser && (
					<div
						className={cn(
							"absolute top-0 left-0 w-1 h-full",
							isHuman ? "bg-purple-600" : "bg-[#1A1A1A] dark:bg-zinc-400",
						)}
					/>
				)}

				{/* Tool blocks for assistant messages */}
				{!isUser && message.toolBlocks && message.toolBlocks.length > 0 && (
					<div className="mb-3 space-y-2">
						{message.toolBlocks.map((block, idx) => (
							<BlockRenderer key={`${block.toolName}-${idx}`} block={block} />
						))}
					</div>
				)}

				{/* Message Content */}
				<div className="text-sm leading-relaxed whitespace-pre-wrap break-words text-[#1A1A1A] dark:text-zinc-100">
					{isUser ? message.content : renderMarkdown(message.content)}
				</div>

				{/* Show original message for translated messages */}
				{isTranslated && originalContent && (
					<Collapsible open={showOriginal} onOpenChange={setShowOriginal}>
						<CollapsibleTrigger asChild>
							<button
								type="button"
								className="flex items-center gap-1 mt-3 pt-3 border-t border-[#E5E5E5] dark:border-zinc-600 border-dashed text-[10px] font-mono text-[#888] hover:text-[#1A1A1A] dark:hover:text-zinc-100 transition-colors uppercase tracking-wide"
							>
								<ChevronDown
									className={cn("h-3 w-3 transition-transform", showOriginal && "rotate-180")}
								/>
								{showOriginal ? "Hide Original" : "Show Original"}
							</button>
						</CollapsibleTrigger>
						<CollapsibleContent>
							<div className="mt-2">
								<span className="text-[9px] font-mono text-[#888] block mb-1 uppercase">
									Original ({translatedFrom ? getLanguageName(translatedFrom) : "unknown"}):
								</span>
								<div className="text-sm whitespace-pre-wrap break-words text-[#555] dark:text-zinc-400">
									{originalContent}
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>
				)}

				{/* Suggest response button */}
				{showSuggestButton &&
					isAI &&
					onSuggestResponse &&
					(!message.toolBlocks || message.toolBlocks.length === 0) &&
					message.metadata?.messageType !== "escalation_notice" && (
						<Button
							variant="ghost"
							size="sm"
							className="absolute w-8 h-8 p-0 transition-opacity -translate-y-1/2 opacity-0 -right-10 top-1/2 group-hover:opacity-100"
							onClick={onSuggestResponse}
							title="Suggest a better response"
						>
							<Lightbulb className="w-4 h-4 text-yellow-500" />
						</Button>
					)}
			</div>

			{/* Footer metadata row - test1 style */}
			<div
				className={cn(
					"flex items-center gap-1.5 text-[9px] font-mono text-[#888] mt-1.5",
					isUser ? "flex-row-reverse" : "flex-row",
				)}
			>
				{message.feedback && (
					<span
						className={cn(
							"flex items-center gap-1 px-1.5 py-0.5 border",
							message.feedback === "up"
								? "text-green-700 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400"
								: "text-red-700 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400",
						)}
					>
						{message.feedback === "up" ? (
							<ThumbsUp className="w-3 h-3" />
						) : (
							<ThumbsDown className="w-3 h-3" />
						)}
						{message.feedback === "up" ? "POSITIVE" : "NEGATIVE"}
					</span>
				)}

				{!isUser && isSeen && (
					<span className="flex items-center gap-1 text-[#888]">
						<Check className="w-3 h-3" />
						SEEN
					</span>
				)}
			</div>
		</div>
	);
}
