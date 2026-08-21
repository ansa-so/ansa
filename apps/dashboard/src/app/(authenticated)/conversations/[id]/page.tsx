"use client";

import { MarkdownEditor } from "@ansa/ui";
import {
	ArrowDownToLine,
	CheckCircle2,
	Clock,
	ExternalLink,
	FileInput,
	Hash,
	Loader2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { QuickActionsPanel } from "@/components/quick-actions-panel";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Title } from "@/components/ui/title";
import "@ansa/ui/markdown-editor.css";
import { ConversationInfoPanel } from "@/components/conversation-info-panel";
import { DeEscalationDialog } from "@/components/de-escalation-dialog";
import { useLanguageDetection } from "@/hooks/use-language-detection";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useDashboardSocket } from "@/hooks/useDashboardSocket";
import { useAgent } from "@/lib/agent-context";
import {
	type Conversation,
	type ConversationFormSubmission,
	createEscalation,
	createQaSource,
	getConversation,
	getEscalationSettings,
	markConversationImproved,
	replyToConversation,
	respondToEscalation,
	translateMessage,
	updateConversationStatus,
	updateEscalationStatus,
} from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useConversationList } from "@/lib/conversation-list-context";
import { getConfig } from "@/lib/runtime-config";
import {
	ComposeArea,
	ConversationHeader,
	ConversationStatusBanner,
	MessageBubble,
} from "../_components";

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { data: session } = useSession();
	const { plans, currentPlanId } = usePlansWithCurrent();
	const router = useRouter();
	const [conversationIdFromUrl, setConversationIdFromUrl] = useState<string | null>(null);

	// Check if current plan has escalation feature
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasEscalation = currentPlan?.hasEscalation ?? false;

	useEffect(() => {
		params.then(({ id }) => setConversationIdFromUrl(id));
	}, [params]);

	const { conversations, refetch: refetchConversations } = useConversationList();

	const {
		data: selectedConvo,
		isLoading: loadingConvo,
		mutate: mutateConversation,
	} = useSWR(
		conversationIdFromUrl ? `/conversations/${conversationIdFromUrl}` : null,
		() => (conversationIdFromUrl ? getConversation(conversationIdFromUrl) : null),
		{
			keepPreviousData: true,
			dedupingInterval: 2000,
			revalidateOnFocus: true,
			revalidateIfStale: true,
			fallbackData: conversations.find((c: Conversation) => c.id === conversationIdFromUrl),
		},
	);

	// Fetch escalation settings to check if human escalation is enabled
	const { data: escalationSettings } = useSWR(
		currentAgent?.id ? `/escalations/settings/${currentAgent.id}` : null,
		() => (currentAgent?.id ? getEscalationSettings(currentAgent.id) : null),
	);

	// Real-time Socket.IO connection
	const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName?: string }>>([]);
	const [viewers, setViewers] = useState<
		Array<{ userId: string; userName?: string; role: string }>
	>([]);

	const { connectionState, emitTyping, emitViewing } = useDashboardSocket({
		url: getConfig().apiUrl || "http://localhost:3001",
		agentId: session?.user?.id,
		userName: session?.user?.name || undefined,
		conversationId: conversationIdFromUrl || undefined,
		onMessageUpdate: () => {
			// Real-time message updates - refresh conversation
			mutateConversation();
		},
		onTypingUpdate: (data) => {
			setTypingUsers((prev) => {
				if (data.isTyping) {
					if (prev.some((u) => u.userId === data.userId)) return prev;
					return [...prev, { userId: data.userId, userName: data.userName }];
				} else {
					return prev.filter((u) => u.userId !== data.userId);
				}
			});
		},
		onPresenceUpdate: (data) => {
			setViewers(data.viewers);
		},
		onNewMessage: () => {
			// Refresh conversation when new message arrives
			mutateConversation();
		},
	});

	// Emit viewing status when conversation loads
	useEffect(() => {
		if (conversationIdFromUrl && emitViewing) {
			emitViewing(conversationIdFromUrl);

			// Emit viewing status every 15 seconds to stay active
			const interval = setInterval(() => {
				emitViewing(conversationIdFromUrl);
			}, 15000);

			return () => clearInterval(interval);
		}
	}, [conversationIdFromUrl, emitViewing]);

	const [responseContent, setResponseContent] = useState("");
	const [sendingResponse, setSendingResponse] = useState(false);

	// Auto-translate state
	const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(true);
	const [isTranslating, setIsTranslating] = useState(false);
	const { detectedLanguage } = useLanguageDetection(responseContent);

	const [suggestingFor, setSuggestingFor] = useState<{
		messageId: string;
		userQuestion: string;
	} | null>(null);
	const [suggestedAnswer, setSuggestedAnswer] = useState("");
	const [savingSuggestion, setSavingSuggestion] = useState(false);

	const [conversationInfoPanelOpen, setConversationInfoPanelOpen] = useLocalStorage(
		"info_panel_open",
		false,
	);
	const [quickActionsPanelOpen, setQuickActionsPanelOpen] = useState(false);
	const [deEscalationDialogOpen, setDeEscalationDialogOpen] = useState(false);
	const [deEscalating, setDeEscalating] = useState(false);

	const [slaTimeRemaining, setSlaTimeRemaining] = useState<string | null>(null);
	const [slaBreached, setSlaBreached] = useState(false);
	const slaIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	// Scroll to bottom when conversation loads or changes
	useEffect(() => {
		if (selectedConvo && scrollAreaRef.current) {
			// Use setTimeout to ensure DOM is updated
			setTimeout(() => {
				const viewport = scrollAreaRef.current?.querySelector("[data-radix-scroll-area-viewport]");
				if (viewport) {
					viewport.scrollTop = viewport.scrollHeight;
				}
			}, 100);
		}
	}, [selectedConvo]);

	const updateSlaCountdown = useCallback(() => {
		if (!selectedConvo?.escalation?.slaDeadline) {
			setSlaTimeRemaining(null);
			setSlaBreached(false);
			return;
		}

		if (selectedConvo.escalation.firstResponseAt) {
			const escalatedAt = new Date(selectedConvo.escalation.escalatedAt);
			const respondedAt = new Date(selectedConvo.escalation.firstResponseAt);
			const diffMs = respondedAt.getTime() - escalatedAt.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMins / 60);

			const slaDeadline = new Date(selectedConvo.escalation.slaDeadline);
			const wasWithinSla = respondedAt <= slaDeadline;
			setSlaBreached(!wasWithinSla);

			if (diffHours > 0) {
				setSlaTimeRemaining(`Replied in ${diffHours}h ${diffMins % 60}m`);
			} else {
				setSlaTimeRemaining(`Replied in ${diffMins}m`);
			}
			return;
		}

		if (selectedConvo.escalation.slaBrokenAt) {
			setSlaBreached(true);
			const brokenAt = new Date(selectedConvo.escalation.slaBrokenAt);
			const now = new Date();
			const diffMs = now.getTime() - brokenAt.getTime();
			const diffMins = Math.floor(diffMs / 60000);
			const diffHours = Math.floor(diffMins / 60);
			if (diffHours > 0) {
				setSlaTimeRemaining(`${diffHours}h ${diffMins % 60}m ago`);
			} else {
				setSlaTimeRemaining(`${diffMins}m ago`);
			}
			return;
		}

		const deadline = new Date(selectedConvo.escalation.slaDeadline);
		const now = new Date();
		const diffMs = deadline.getTime() - now.getTime();

		if (diffMs <= 0) {
			setSlaBreached(true);
			setSlaTimeRemaining("Just now");
			return;
		}

		setSlaBreached(false);
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMins / 60);
		if (diffHours > 0) {
			setSlaTimeRemaining(`${diffHours}h ${diffMins % 60}m left`);
		} else {
			setSlaTimeRemaining(`${diffMins}m left`);
		}
	}, [selectedConvo?.escalation]);

	useEffect(() => {
		updateSlaCountdown();
		if (selectedConvo?.escalation?.slaDeadline && !selectedConvo?.escalation?.firstResponseAt) {
			slaIntervalRef.current = setInterval(updateSlaCountdown, 60000);
		}
		return () => {
			if (slaIntervalRef.current) {
				clearInterval(slaIntervalRef.current);
			}
		};
	}, [selectedConvo?.escalation, updateSlaCountdown]);

	const handleSendResponse = async () => {
		if (!selectedConvo || !responseContent.trim()) return;

		// Stop typing indicator when sending message
		if (conversationIdFromUrl && emitTyping) {
			emitTyping(conversationIdFromUrl, false);
		}

		setSendingResponse(true);

		// Check if translation is needed
		const conversationLanguage = selectedConvo.language;
		const shouldTranslate =
			autoTranslateEnabled &&
			conversationLanguage &&
			detectedLanguage &&
			detectedLanguage !== conversationLanguage;

		let contentToSend = responseContent.trim();
		let translationMetadata:
			| { originalContent: string; translatedFrom: string; translatedTo: string }
			| undefined;

		// Translate if needed
		if (shouldTranslate) {
			setIsTranslating(true);
			try {
				const translation = await translateMessage(
					selectedConvo.id,
					contentToSend,
					conversationLanguage,
				);
				translationMetadata = {
					originalContent: contentToSend,
					translatedFrom: detectedLanguage,
					translatedTo: conversationLanguage,
				};
				contentToSend = translation.translatedText;
			} catch (err) {
				console.error("Failed to translate:", err);
				toast.error("Translation failed, sending original message");
				// Continue with original content if translation fails
			} finally {
				setIsTranslating(false);
			}
		}

		try {
			// Escalate conversation first if not already escalated
			if (!selectedConvo.escalation) {
				try {
					await createEscalation(selectedConvo.id, "user_request");
					await mutateConversation();
				} catch (err) {
					console.error("Failed to auto-escalate:", err);
					toast.error(err instanceof Error ? err.message : "Failed to escalate conversation");
					setSendingResponse(false);
					return;
				}
			}

			// Refresh conversation to get updated escalation data
			const updatedConvo = await mutateConversation();
			const escalation = updatedConvo?.escalation || selectedConvo.escalation;

			if (escalation) {
				const result = await respondToEscalation(escalation.id, contentToSend, translationMetadata);
				if (result.emailSent) {
					toast.success(
						translationMetadata
							? "Translated response sent and email delivered"
							: "Response sent and email delivered",
					);
				} else {
					toast.success(translationMetadata ? "Translated response sent" : "Response sent");
				}
			} else {
				const result = await replyToConversation(
					selectedConvo.id,
					contentToSend,
					translationMetadata,
				);
				if (result.emailSent) {
					toast.success(
						translationMetadata
							? "Translated response sent and email delivered"
							: "Response sent and email delivered",
					);
				} else {
					toast.success(translationMetadata ? "Translated response sent" : "Response sent");
				}
			}

			setResponseContent("");
			await mutateConversation();
			await refetchConversations();
		} catch (error) {
			console.error("Failed to send response:", error);
			toast.error(error instanceof Error ? error.message : "Failed to send response");
		} finally {
			setSendingResponse(false);
		}
	};

	const findUserQuestion = (messageId: string): string | null => {
		if (!selectedConvo?.messages) return null;
		const msgIndex = selectedConvo.messages.findIndex((m) => m.id === messageId);
		if (msgIndex <= 0) return null;
		const prevMsg = selectedConvo.messages[msgIndex - 1];
		return prevMsg.role === "user" ? prevMsg.content : null;
	};

	const handleSuggestResponse = (messageId: string) => {
		const userQuestion = findUserQuestion(messageId);
		if (!userQuestion) return;
		setSuggestingFor({ messageId, userQuestion });
		setSuggestedAnswer("");
	};

	const handleCancelSuggestion = () => {
		setSuggestingFor(null);
		setSuggestedAnswer("");
	};

	const handleSaveSuggestion = async () => {
		if (!currentAgent || !suggestingFor || !suggestedAnswer.trim() || !conversationIdFromUrl)
			return;

		setSavingSuggestion(true);
		try {
			await createQaSource(currentAgent.id, [suggestingFor.userQuestion], suggestedAnswer.trim());
			await markConversationImproved(conversationIdFromUrl, suggestingFor.messageId);
			toast.success("Q&A added to knowledge base!", {
				description: "The AI will now use this answer for similar questions.",
			});
			setSuggestingFor(null);
			setSuggestedAnswer("");
			await mutateConversation();
			await refetchConversations();
		} catch (err) {
			console.error("Failed to save Q&A:", err);
			toast.error("Failed to save Q&A");
		} finally {
			setSavingSuggestion(false);
		}
	};

	const handleStatusChange = async (status: string) => {
		if (!conversationIdFromUrl) return;

		try {
			await updateConversationStatus(
				conversationIdFromUrl,
				status as "open" | "pending" | "resolved",
			);
			// Force immediate revalidation
			await mutateConversation(undefined, { revalidate: true });
			await refetchConversations();
		} catch (err) {
			console.error("Failed to update status:", err);
			toast.error(err instanceof Error ? err.message : "Failed to update status");
		}
	};

	const handleEscalationStatusChange = async (
		escalationId: string,
		status: string,
		resolutionNote?: string,
		skipDialog?: boolean,
	) => {
		// If de-escalating and dialog not explicitly skipped, show dialog
		if (status === "resolved" && !skipDialog) {
			setDeEscalationDialogOpen(true);
			return;
		}

		try {
			setDeEscalating(true);
			await updateEscalationStatus(
				escalationId,
				status as "open" | "assigned" | "in_progress" | "waiting_on_customer" | "resolved",
				resolutionNote,
			);
			toast.success(
				status === "resolved"
					? "Conversation de-escalated successfully"
					: "Escalation status updated",
			);
			setDeEscalationDialogOpen(false);
			// Force immediate revalidation
			await mutateConversation(undefined, { revalidate: true });
			await refetchConversations();
		} catch (err) {
			console.error("Failed to update escalation status:", err);
			toast.error(err instanceof Error ? err.message : "Failed to update escalation status");
		} finally {
			setDeEscalating(false);
		}
	};

	const handleDeEscalationConfirm = async (resolutionNote?: string) => {
		if (!selectedConvo?.escalation?.id) return;
		await handleEscalationStatusChange(
			selectedConvo.escalation.id,
			"resolved",
			resolutionNote,
			true,
		);
	};

	const handleCreateEscalation = async () => {
		if (!conversationIdFromUrl) return;

		try {
			const response = await fetch(`${getConfig().apiUrl || "http://localhost:3001"}/escalations`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					conversationId: conversationIdFromUrl,
					source: "user_request",
				}),
				credentials: "include",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || "Failed to create escalation");
			}

			toast.success("Escalation created successfully");
			// Force immediate revalidation
			await mutateConversation(undefined, { revalidate: true });
			await refetchConversations();
		} catch (err) {
			console.error("Failed to create escalation:", err);
			toast.error(err instanceof Error ? err.message : "Failed to create escalation");
		}
	};

	const handleAddNote = () => {
		// Open conversation info panel which has the internal note editor
		setConversationInfoPanelOpen(true);
	};

	if (loadingConvo) {
		return (
			<div className="flex items-center justify-center h-full flex-1 min-w-0 bg-[#F3F2EE] dark:bg-zinc-950">
				<Loader2 className="w-8 h-8 animate-spin text-[#888]" />
			</div>
		);
	}

	if (!selectedConvo) {
		return null;
	}

	// Messages from API are already filtered (no isSent:false)
	const displayMessages = selectedConvo.messages;

	return (
		<>
			<div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-[#F3F2EE] dark:bg-zinc-950">
				<ConversationHeader
					conversation={selectedConvo}
					slaTimeRemaining={slaTimeRemaining}
					slaBreached={slaBreached}
					onOpenQuickActions={() => setQuickActionsPanelOpen(true)}
					onOpenUserInfo={() => setConversationInfoPanelOpen(true)}
					onClose={() => router.push("/conversations")}
				/>

				{/* Connection and viewer status */}
				{(() => {
					const otherViewers = viewers.filter((v) => v.userId !== session?.user?.id);
					const shouldShowBar = connectionState !== "connected" || otherViewers.length > 0;

					if (!shouldShowBar) return null;

					return (
						<div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
							{connectionState !== "connected" && (
								<div className="flex items-center gap-2 text-xs">
									<div
										className={`w-2 h-2 rounded-full ${
											connectionState === "connecting"
												? "bg-yellow-500 animate-pulse"
												: connectionState === "reconnecting"
													? "bg-orange-500 animate-pulse"
													: "bg-red-500"
										}`}
									/>
									<span className="text-muted-foreground">
										{connectionState === "connecting" && "Connecting..."}
										{connectionState === "reconnecting" && "Reconnecting..."}
										{connectionState === "disconnected" && "Disconnected"}
									</span>
								</div>
							)}
							{otherViewers.length > 0 && (
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<span>👀</span>
									<span>
										{(() => {
											if (otherViewers.length === 1) {
												return `${otherViewers[0].userName || "Someone"} is viewing`;
											} else if (otherViewers.length === 2) {
												return `${otherViewers[0].userName || "Someone"} and ${otherViewers[1].userName || "someone"} are viewing`;
											} else {
												return `${otherViewers[0].userName || "Someone"}, ${otherViewers[1].userName || "someone"} and ${otherViewers.length - 2} ${otherViewers.length - 2 === 1 ? "other" : "others"} are viewing`;
											}
										})()}
									</span>
								</div>
							)}
						</div>
					);
				})()}

				<ConversationStatusBanner conversation={selectedConvo} />

				<ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
					{displayMessages?.map((msg, idx) => {
						// Consider a message "seen" if there's a user message after it
						// This means the user has read the assistant message and responded
						const isSeen =
							msg.role === "assistant" &&
							displayMessages.some((m, i) => i > idx && m.role === "user");

						return (
							<div key={msg.id} className="relative">
								<MessageBubble
									message={msg}
									showSuggestButton={
										msg.role === "assistant" &&
										idx > 0 &&
										(!msg.toolBlocks || msg.toolBlocks.length === 0)
									}
									onSuggestResponse={() => handleSuggestResponse(msg.id)}
									isSeen={isSeen}
									fallbackHumanName={
										selectedConvo?.assignee?.name || selectedConvo?.assignee?.email?.split("@")[0]
									}
								/>

								{suggestingFor?.messageId === msg.id && (
									<div className="p-4 mb-4 ml-10 bg-white border rounded-lg shadow-lg">
										<div className="flex items-center justify-between mb-3">
											<Title tag="h4" size="sm">
												Teach AI a better response
											</Title>
											<Button
												variant="ghost"
												size="icon"
												className="w-6 h-6"
												onClick={handleCancelSuggestion}
											>
												<X className="w-4 h-4" />
											</Button>
										</div>
										<p className="mb-2 text-xs text-muted-foreground">
											Question: {suggestingFor.userQuestion}
										</p>
										<div className="mb-3">
											<MarkdownEditor
												value={suggestedAnswer}
												onChange={setSuggestedAnswer}
												placeholder="Enter a better answer..."
												height={120}
											/>
										</div>
										<div className="flex justify-end gap-2">
											<Button variant="outline" size="sm" onClick={handleCancelSuggestion}>
												Cancel
											</Button>
											<Button
												size="sm"
												onClick={handleSaveSuggestion}
												disabled={savingSuggestion || !suggestedAnswer.trim()}
											>
												{savingSuggestion ? "Saving..." : "Save & Train AI"}
											</Button>
										</div>
									</div>
								)}
							</div>
						);
					})}

					{/* Typing indicator */}
					{typingUsers.length > 0 && (
						<div className="flex items-center gap-2 px-4 py-2 mb-4 rounded-lg bg-muted/50">
							<div className="flex space-x-1">
								<div
									className="rounded-full bg-primary"
									style={{
										width: "4px",
										height: "4px",
										animation: "typing-bounce 700ms ease-in-out 0ms infinite",
									}}
								/>
								<div
									className="rounded-full bg-primary"
									style={{
										width: "4px",
										height: "4px",
										animation: "typing-bounce 700ms ease-in-out 150ms infinite",
									}}
								/>
								<div
									className="rounded-full bg-primary"
									style={{
										width: "4px",
										height: "4px",
										animation: "typing-bounce 700ms ease-in-out 300ms infinite",
									}}
								/>
							</div>
							<span className="text-xs text-muted-foreground">
								{typingUsers[0].userName || "User"} is typing...
							</span>
							<style jsx>{`
                @keyframes typing-bounce {
                  0%, 60%, 100% { transform: translateY(0); }
                  30% { transform: translateY(-3px); }
                }
              `}</style>
						</div>
					)}

					{selectedConvo.formSubmissions && selectedConvo.formSubmissions.length > 0 && (
						<div className="pt-4 mt-4 border-t">
							<p className="mb-3 text-xs font-medium text-muted-foreground">Form Submissions</p>
							{selectedConvo.formSubmissions.map((submission) => (
								<FormSubmissionBlock key={submission.id} submission={submission} />
							))}
						</div>
					)}
				</ScrollArea>

				<ComposeArea
					conversation={selectedConvo}
					responseContent={responseContent}
					onResponseChange={(value) => {
						setResponseContent(value);
						// Emit typing indicator
						if (conversationIdFromUrl && emitTyping) {
							emitTyping(conversationIdFromUrl, value.length > 0);
						}
					}}
					onResponseBlur={() => {
						// Stop typing indicator when editor loses focus
						if (conversationIdFromUrl && emitTyping) {
							emitTyping(conversationIdFromUrl, false);
						}
					}}
					onSend={handleSendResponse}
					sending={sendingResponse || isTranslating}
					onOpenQuickActions={() => setQuickActionsPanelOpen(true)}
					onOpenConversationInfo={() => setConversationInfoPanelOpen(true)}
					onStatusChange={handleStatusChange}
					onEscalationStatusChange={handleEscalationStatusChange}
					onCreateEscalation={handleCreateEscalation}
					onAddNote={handleAddNote}
					escalationEnabled={escalationSettings?.enabled ?? true}
					planHasEscalation={planHasEscalation}
					isEscalated={!!selectedConvo.escalation}
					autoTranslateEnabled={autoTranslateEnabled}
					onAutoTranslateChange={setAutoTranslateEnabled}
					isTranslating={isTranslating}
				/>
			</div>

			<ConversationInfoPanel
				conversationId={conversationIdFromUrl}
				escalation={selectedConvo?.escalation}
				open={conversationInfoPanelOpen}
				onClose={() => setConversationInfoPanelOpen(false)}
				onConversationSelect={(id) => router.push(`/conversations/${id}`)}
				onEscalationUpdate={async () => {
					await mutateConversation();
					await refetchConversations();
				}}
				escalationEnabled={escalationSettings?.enabled ?? true}
			/>

			<QuickActionsPanel
				agentId={currentAgent?.id || null}
				conversationId={conversationIdFromUrl}
				userMetadata={null}
				open={quickActionsPanelOpen}
				onClose={() => setQuickActionsPanelOpen(false)}
			/>

			<DeEscalationDialog
				open={deEscalationDialogOpen}
				onClose={() => setDeEscalationDialogOpen(false)}
				onConfirm={handleDeEscalationConfirm}
				loading={deEscalating}
			/>
		</>
	);
}

// --- Form Submission Block Component (Brutalist Design) ---
function FormSubmissionBlock({ submission }: { submission: ConversationFormSubmission }) {
	const formattedDate = new Date(submission.createdAt).toLocaleString("en-US", {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
		timeZoneName: "short",
	});

	const isSuccess = submission.status === "success";

	return (
		<Link
			href={`/submissions/${submission.id}`}
			className="block w-full mb-3 bg-white border border-[#D1D1D1] shadow-sm font-sans text-[#1A1A1A] relative overflow-hidden group hover:border-[#1A1A1A]/30 hover:shadow-md transition-all"
		>
			{/* Packet Header */}
			<div className="flex items-center justify-between px-4 py-2 bg-[#FAFAF9] border-b border-[#D1D1D1]">
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 bg-[#1A1A1A] text-white flex items-center justify-center">
						<FileInput size={10} />
					</div>
					<span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]">
						Capture: {submission.toolName || "form"}
					</span>
				</div>

				<div className="flex items-center gap-2">
					<div
						className={`flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase px-2 py-0.5 border ${
							isSuccess
								? "text-green-700 bg-green-50 border-green-200"
								: "text-amber-700 bg-amber-50 border-amber-200"
						}`}
					>
						<CheckCircle2 size={8} /> {submission.status.toUpperCase()}
					</div>
					<span className="flex items-center gap-1 text-[9px] font-bold uppercase text-[#888] opacity-0 group-hover:opacity-100 transition-opacity">
						View <ExternalLink size={10} />
					</span>
				</div>
			</div>

			{/* Data Payload */}
			<div className="p-4">
				<div className="grid grid-cols-[200px_1fr] gap-y-3 text-xs">
					{Object.entries(submission.formData).map(([key, value]) => {
						const stringValue = String(value);
						const isLongText = stringValue.length > 100;

						return (
							<React.Fragment key={key}>
								<div className="text-[10px] font-mono text-[#888] uppercase pt-0.5 flex items-center gap-1">
									<Hash size={8} /> {key}
								</div>
								{isLongText ? (
									<div className="bg-[#F3F2EE] border border-[#E5E5E5] p-3 text-[#555] leading-relaxed font-mono text-[11px]">
										"{stringValue}"
									</div>
								) : (
									<div className="font-medium text-[#1A1A1A] border-b border-[#F3F2EE] w-full break-all">
										{stringValue}
									</div>
								)}
							</React.Fragment>
						);
					})}
				</div>
			</div>

			{/* Metadata Footer */}
			<div className="px-4 py-2 border-t border-[#D1D1D1] bg-[#FAFAF9] flex justify-between items-center">
				<div className="flex items-center gap-2 text-[9px] font-mono text-[#888]">
					<Clock size={10} />
					<span>{formattedDate}</span>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-[9px] font-mono text-[#CCC]">
						{submission.id.slice(0, 12).toUpperCase()}
					</span>
					<ArrowDownToLine size={12} className="text-[#1A1A1A]" />
				</div>
			</div>
		</Link>
	);
}
