"use client";

import { MarkdownEditor } from "@ansa/ui";
import "@ansa/ui/markdown-editor.css";
import {
	CheckCircle,
	ChevronDown,
	FileCheck,
	Info,
	Languages,
	Lightbulb,
	Loader2,
	Lock,
	Mail,
	Send,
	StickyNote,
	UserRoundCog,
	UserRoundPlus,
	Wrench,
} from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguageDetection } from "@/hooks/use-language-detection";
import type { Conversation } from "@/lib/api";
import { getLanguageName } from "@/lib/language-names";

interface ComposeAreaProps {
	conversation: Conversation;
	responseContent: string;
	onResponseChange: (value: string) => void;
	onResponseBlur?: () => void;
	onSend: () => void;
	sending: boolean;
	onOpenQuickActions?: () => void;
	onOpenConversationInfo?: () => void;
	onStatusChange?: (status: string) => void;
	onEscalationStatusChange?: (escalationId: string, status: string) => void;
	onCreateEscalation?: () => void;
	onAddNote?: () => void;
	escalationEnabled?: boolean;
	planHasEscalation?: boolean;
	isEscalated?: boolean;
	// Auto-translate props
	autoTranslateEnabled?: boolean;
	onAutoTranslateChange?: (enabled: boolean) => void;
	isTranslating?: boolean;
}

export function ComposeArea({
	conversation,
	responseContent,
	onResponseChange,
	onResponseBlur,
	onSend,
	sending,
	onOpenQuickActions,
	onOpenConversationInfo,
	onStatusChange,
	onEscalationStatusChange,
	onCreateEscalation,
	onAddNote,
	escalationEnabled = true,
	planHasEscalation = true,
	isEscalated = false,
	autoTranslateEnabled = true,
	onAutoTranslateChange,
	isTranslating = false,
}: ComposeAreaProps) {
	// Detect language of input text. Must run before any early return (Rules of Hooks).
	const { detectedLanguage } = useLanguageDetection(responseContent);

	// Hide compose area for resolved/closed conversations
	if (conversation.status === "resolved" || conversation.status === "closed") {
		return (
			<div className="border-t border-[#D1D1D1] dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
				<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
					<CheckCircle className="w-4 h-4" />
					This conversation has been resolved.
				</div>
			</div>
		);
	}

	const threshold = conversation.confidenceThreshold ?? 70;

	// Check if translation should be shown
	// Only show when:
	// 1. Conversation has a detected language
	// 2. Input text has enough characters to detect language
	// 3. Detected input language differs from conversation language
	const conversationLanguage = conversation.language;
	const showTranslateOption =
		conversationLanguage && detectedLanguage && detectedLanguage !== conversationLanguage;

	const targetLanguageName = conversationLanguage ? getLanguageName(conversationLanguage) : "";

	// Use suggestedMessage from API (isSent: false messages are no longer in messages array)
	const apiSuggestedMessage = conversation.suggestedMessage;

	// Show suggested response only if:
	// - Below threshold
	// - Response box is empty
	// - Exclude tool responses - confidence is irrelevant for tool actions
	// - Has non-empty content
	const suggestedMessage =
		apiSuggestedMessage &&
		apiSuggestedMessage.confidenceScore != null &&
		apiSuggestedMessage.confidenceScore < threshold &&
		(!apiSuggestedMessage.toolBlocks || apiSuggestedMessage.toolBlocks.length === 0) &&
		!responseContent &&
		apiSuggestedMessage.content &&
		apiSuggestedMessage.content.trim() !== ""
			? apiSuggestedMessage
			: null;

	return (
		<div className="border-t border-[#D1D1D1] dark:border-zinc-700 bg-white dark:bg-zinc-900">
			{/* AI Suggested Response - test7 style */}
			{suggestedMessage && (
				<Collapsible>
					<div className="bg-[#FFFDE7] dark:bg-yellow-900/20 border-b border-[#F3F2EE] dark:border-zinc-800 p-4 flex flex-col gap-3 relative overflow-hidden">
						{/* Yellow accent bar on left - test7 style */}
						<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FBC02D]" />

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-[#F9A825] font-bold text-[10px] uppercase tracking-widest">
								<Lightbulb size={12} className="fill-current" />
								AI Suggested Response
								<span className="bg-white/50 dark:bg-zinc-800/50 px-1.5 py-0.5 border border-[#FBC02D]/30 text-[#888]">
									{suggestedMessage.confidenceScore}% Confidence
								</span>
							</div>
							<div className="flex gap-2">
								<CollapsibleTrigger asChild>
									<button
										type="button"
										className="bg-white dark:bg-zinc-800 border border-[#D1D1D1] dark:border-zinc-600 text-[9px] font-bold uppercase px-3 py-1 hover:border-[#1A1A1A] dark:hover:border-white transition-colors"
									>
										View Full
									</button>
								</CollapsibleTrigger>
								<button
									type="button"
									className="bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 border border-[#1A1A1A] dark:border-white text-[9px] font-bold uppercase px-3 py-1 hover:bg-[#333] dark:hover:bg-zinc-200 flex items-center gap-2 transition-colors"
									onClick={() => onResponseChange(suggestedMessage.content)}
								>
									Use This <ChevronDown size={10} className="rotate-[-90deg]" />
								</button>
							</div>
						</div>

						<p className="text-xs text-[#1A1A1A] dark:text-zinc-200 font-mono leading-relaxed opacity-80 line-clamp-2">
							{suggestedMessage.content}
						</p>

						<CollapsibleContent>
							<p className="text-xs text-[#1A1A1A] dark:text-zinc-200 font-mono leading-relaxed opacity-80 mt-2 pt-2 border-t border-[#FBC02D]/20">
								{suggestedMessage.content}
							</p>
						</CollapsibleContent>
					</div>
				</Collapsible>
			)}

			{/* Editor - test7 style */}
			<div className="p-4">
				{escalationEnabled && (
					<MarkdownEditor
						value={responseContent}
						onChange={onResponseChange}
						onBlur={onResponseBlur}
						placeholder={
							conversation.status === "closed" || conversation.status === "resolved"
								? "This conversation is closed"
								: !escalationEnabled
									? "Human escalation is disabled"
									: "Type your response..."
						}
						height={100}
						onSubmit={onSend}
						disabled={
							conversation.status === "closed" ||
							conversation.status === "resolved" ||
							!escalationEnabled
						}
					/>
				)}

				{!escalationEnabled && (
					<div className="p-2 mt-2 text-xs text-center bg-[#F3F2EE] dark:bg-zinc-800 text-[#888] border border-[#E5E5E5] dark:border-zinc-700">
						<Link
							href="/settings/escalation"
							className="text-[#1A1A1A] dark:text-white hover:underline font-medium"
						>
							Enable Human Escalation
						</Link>{" "}
						to respond to this conversation
					</div>
				)}

				{escalationEnabled && (
					<div className="flex items-center justify-between mt-3">
						<div className="flex items-center gap-3">
							<span className="text-[10px] font-mono text-[#888] uppercase">⌘+Enter to send</span>

							{/* Auto-translate checkbox - test7 style */}
							{showTranslateOption && (
								<div className="flex items-center gap-1.5 text-[10px] font-mono text-[#888] uppercase">
									<Checkbox
										id="auto-translate"
										checked={autoTranslateEnabled}
										onCheckedChange={(checked) => onAutoTranslateChange?.(!!checked)}
										disabled={sending || isTranslating}
										className="h-3.5 w-3.5 border-[#D1D1D1] dark:border-zinc-600"
									/>
									<label
										htmlFor="auto-translate"
										className="flex items-center gap-1.5 cursor-pointer select-none hover:text-[#1A1A1A] dark:hover:text-white transition-colors"
									>
										<Languages className="w-3 h-3" />
										<span>Auto-translate to {targetLanguageName}</span>
										{isTranslating && <Loader2 className="w-3 h-3 animate-spin" />}
									</label>
								</div>
							)}
						</div>

						<div className="flex items-center gap-2">
							{conversation.channel === "email" && (
								<span className="font-mono text-[9px] border border-[#E5E5E5] dark:border-zinc-700 px-1.5 py-0.5 text-[#888] uppercase flex items-center gap-1">
									<Mail className="w-3 h-3" />
									Email
								</span>
							)}

							{/* Quick Actions Dropdown - test7 style */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="border border-[#D1D1D1] dark:border-zinc-600 bg-white dark:bg-zinc-800 p-2 hover:bg-[#1A1A1A] dark:hover:bg-white hover:text-white dark:hover:text-zinc-900 hover:border-[#1A1A1A] dark:hover:border-white transition-colors disabled:opacity-50"
										disabled={
											conversation.status === "closed" || conversation.status === "resolved"
										}
									>
										<ChevronDown className="w-4 h-4" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" side="top" className="w-56">
									<DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
									<DropdownMenuSeparator />

									{escalationEnabled && (
										<DropdownMenuItem onClick={onOpenQuickActions}>
											<Wrench className="w-4 h-4 mr-2" />
											Run Tool
										</DropdownMenuItem>
									)}

									<DropdownMenuItem onClick={onOpenConversationInfo}>
										<Info className="w-4 h-4 mr-2" />
										Conversation Info
									</DropdownMenuItem>

									<DropdownMenuSeparator />

									{/* Change Status Submenu */}
									<DropdownMenuSub>
										<DropdownMenuSubTrigger>
											<FileCheck className="w-4 h-4 mr-2" />
											Change Status
										</DropdownMenuSubTrigger>
										<DropdownMenuSubContent>
											<DropdownMenuRadioGroup value={conversation.status}>
												<DropdownMenuRadioItem
													value="open"
													onClick={() => onStatusChange?.("open")}
												>
													In Progress
												</DropdownMenuRadioItem>
												<DropdownMenuRadioItem
													value="pending"
													onClick={() => onStatusChange?.("pending")}
												>
													Waiting on Customer
												</DropdownMenuRadioItem>
												<DropdownMenuRadioItem
													value="resolved"
													onClick={() => onStatusChange?.("resolved")}
												>
													Resolved
												</DropdownMenuRadioItem>
											</DropdownMenuRadioGroup>
										</DropdownMenuSubContent>
									</DropdownMenuSub>

									<DropdownMenuItem onClick={onAddNote}>
										<StickyNote className="w-4 h-4 mr-2" />
										Add Internal Note
									</DropdownMenuItem>

									<DropdownMenuSeparator />

									{/* Escalation Actions */}
									{escalationEnabled &&
										planHasEscalation &&
										(conversation.hasEscalation ? (
											<DropdownMenuItem
												onClick={() =>
													onEscalationStatusChange?.(conversation.escalation!.id, "resolved")
												}
											>
												<UserRoundCog className="w-4 h-4 mr-2" />
												De-escalate
											</DropdownMenuItem>
										) : (
											<DropdownMenuItem onClick={onCreateEscalation}>
												<UserRoundPlus className="w-4 h-4 mr-2" />
												Escalate
											</DropdownMenuItem>
										))}

									{/* Allow de-escalate for existing escalations even if plan doesn't have escalation */}
									{escalationEnabled && !planHasEscalation && conversation.hasEscalation && (
										<DropdownMenuItem
											onClick={() =>
												onEscalationStatusChange?.(conversation.escalation!.id, "resolved")
											}
										>
											<UserRoundCog className="w-4 h-4 mr-2" />
											De-escalate
										</DropdownMenuItem>
									)}

									{/* Upgrade prompt for free users */}
									{!planHasEscalation && !conversation.hasEscalation && (
										<DropdownMenuItem asChild>
											<Link href="/billing" className="flex items-center text-muted-foreground">
												<Lock className="w-4 h-4 mr-2" />
												<span>Upgrade to escalate</span>
											</Link>
										</DropdownMenuItem>
									)}

									{/* Resolve & Close Conversation */}
									{conversation.status !== "resolved" && conversation.status !== "closed" && (
										<DropdownMenuItem onClick={() => onStatusChange?.("closed")}>
											<FileCheck className="w-4 h-4 mr-2" />
											Resolve & Close
										</DropdownMenuItem>
									)}
								</DropdownMenuContent>
							</DropdownMenu>

							{/* Send button - test7 style */}
							<button
								type="button"
								onClick={onSend}
								disabled={
									!responseContent.trim() ||
									sending ||
									conversation.status === "closed" ||
									conversation.status === "resolved"
								}
								className="bg-[#1A1A1A] dark:bg-white text-white dark:text-zinc-900 pl-4 pr-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#333] dark:hover:bg-zinc-200 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{sending ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<>
										{isEscalated ? "Send" : "Escalate & Send"}
										<Send className="w-3 h-3" />
									</>
								)}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
