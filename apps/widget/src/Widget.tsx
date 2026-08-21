import type {
	FormExecutionMode,
	FormHandlerResult,
	FormPostAction,
	FormSchema,
	ToolBlockData,
} from "@ansa/types";
import { extractFormBlock } from "@ansa/utils";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BlockRenderer, FormBlock, type FormBlockType, type ToolBlock } from "./components/blocks";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { MessageStatus } from "./components/MessageStatus";
import { TypingIndicator } from "./components/TypingIndicator";
import { clearFormData, trackFormImpression } from "./lib/form-storage";
import { renderMarkdown } from "./lib/format-message";
import { getOfflineQueue } from "./lib/offline-queue";
import { getTranslations, type TranslationStrings } from "./lib/translations";
import { useChatKitEvents } from "./lib/useChatKitEvents";
import { useScrollManager } from "./lib/useScrollManager";
import { useSocket } from "./lib/useSocket";

declare const __ANSA_VERSION__: string;

/**
 * Format a timestamp as a localized relative time string
 * Uses translations for proper i18n support
 */
function formatLocalizedRelativeTime(date: string | number, t: TranslationStrings): string {
	const timestamp = typeof date === "string" ? new Date(date).getTime() : date;
	const now = Date.now();
	const diffMs = now - timestamp;
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);
	const diffWeeks = Math.floor(diffDays / 7);
	const diffMonths = Math.floor(diffDays / 30);

	if (diffSecs < 60) return t.time.justNow;
	if (diffMins < 60) return t.time.minutesAgo.replace("{count}", String(diffMins));
	if (diffHours < 24) return t.time.hoursAgo.replace("{count}", String(diffHours));
	if (diffDays === 1) return t.time.yesterday;
	if (diffDays < 7) return t.time.daysAgo.replace("{count}", String(diffDays));
	if (diffWeeks < 4) return t.time.weeksAgo.replace("{count}", String(diffWeeks));
	if (diffMonths < 12) return t.time.monthsAgo.replace("{count}", String(diffMonths));

	return new Date(timestamp).toLocaleDateString();
}

// ============================================================
// DARK MODE FEATURE FLAG
// Set to true to re-enable dark mode support
// When false, the widget always uses light theme
// ============================================================
const DARK_MODE_ENABLED = false;

// Detect if a color is light (needs dark text for contrast)
function isLightColor(hex: string): boolean {
	// Remove # if present
	const color = hex.replace(/^#/, "");
	// Parse hex to RGB
	let r: number, g: number, b: number;
	if (color.length === 3) {
		r = Number.parseInt(color[0] + color[0], 16);
		g = Number.parseInt(color[1] + color[1], 16);
		b = Number.parseInt(color[2] + color[2], 16);
	} else {
		r = Number.parseInt(color.slice(0, 2), 16);
		g = Number.parseInt(color.slice(2, 4), 16);
		b = Number.parseInt(color.slice(4, 6), 16);
	}
	// Calculate relative luminance (per WCAG)
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.7; // Consider light if luminance > 0.7
}

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp?: number;
	isHumanResponse?: boolean;
	blocks?: ToolBlock[];
	formBlock?: FormBlockType;
	formSubmission?: {
		id: string;
		status: string;
		submittedAt: number;
	};
	clientFormCallbacks?: {
		onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
		onCancel?: () => void;
		sendToAgent?: boolean;
	};
	deliveryStatus?: "sending" | "delivered" | "failed";
	metadata?: {
		messageType?: string;
		shouldShowEscalation?: boolean;
		escalationIntent?: string;
		attachmentUpload?: {
			filename: string;
			size: number;
			type: string;
		};
		attachmentId?: string;
		uploadSuccess?: boolean;
		uploadError?: boolean;
		errorMessage?: string;
		errorType?: string;
		retryable?: boolean;
	};
}

/**
 * Sort messages by timestamp ascending.
 * Preserves relative order for messages with equal or missing timestamps (stable sort).
 */
function sortMessages(msgs: Message[]): Message[] {
	return [...msgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

/**
 * Process {{userMetadata.x}} placeholders in a string
 * Returns empty string for undefined values
 */
function processTemplate(
	message: string,
	identity?: { userId?: string; userMetadata?: Record<string, unknown> },
): string {
	if (!identity) return message;

	return message.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
		const trimmedPath = path.trim();

		// Handle {{userId}}
		if (trimmedPath === "userId") {
			return identity.userId ?? "";
		}

		// Handle {{userMetadata.x.y.z}}
		if (trimmedPath.startsWith("userMetadata.") && identity.userMetadata) {
			const metadataPath = trimmedPath.slice("userMetadata.".length);
			const value = metadataPath.split(".").reduce((obj: unknown, key: string) => {
				if (obj && typeof obj === "object" && key in obj) {
					return (obj as Record<string, unknown>)[key];
				}
				return undefined;
			}, identity.userMetadata);
			return value !== undefined ? String(value) : "";
		}

		return "";
	});
}

export interface WidgetConfig {
	apiUrl: string;
	agentId: string;
	theme?: "light" | "dark" | "system";
	primaryColor?: string;
	chatBubbleColor?: string;
	displayName?: string;
	profilePicture?: string | null;
	initialMessage?: string | string[] | null;
	suggestedMessages?: string[];
	messagePlaceholder?: string | null;
	footerMessage?: string | null;
	dismissibleMessage?: string | null;
	homeGreeting?: string | null;
	homeSubtitle?: string | null;
	collectUserFeedback?: boolean;
	showSatisfactionOnResolved?: boolean;
	// Page tracking
	pageUrl?: string;
	pageDomain?: string;
	pagePath?: string;
	// Channel tracking (widget, dashboard, iframe, etc.)
	channel?: string;
	// Debug mode - show tool debug info (URL, response, timing) in dashboard /chat
	_debug?: boolean;
	// Escalation settings
	escalation?: {
		enabled: boolean;
		showButtonsAfter:
			| "first_ai_response"
			| "every_ai_response"
			| "never"
			| "on_human_request"
			| "on_low_confidence"
			| "on_help_request"
			| "on_human_or_negative_feedback"
			| "on_any_signal"
			| "every_response"
			| "thumbs_down_only"
			| "after_n_messages";
		showAfterMessageCount?: number;
		positiveFeedbackPrompt: string;
		requestHumanPrompt: string;
		humanSupportConfirmation: string;
	} | null;
	// Language for localized messages
	language?: string;
}

interface InterfaceSettings {
	theme: "light" | "dark" | "system";
	primaryColor: string;
	chatBubbleColor: string;
	displayName: string;
	profilePicture: string | null;
	initialMessage: string | string[] | null;
	suggestedMessages: string[];
	messagePlaceholder: string | null;
	footerMessage: string | null;
	dismissibleMessage: string | null;
	homeGreeting: string;
	homeSubtitle: string;
}

interface RecentChat {
	conversationId: string;
	messages: Message[];
	timestamp: number;
	preview: string;
	status?: "open" | "closed" | "resolved";
}

interface StoredConversation {
	conversationId: string;
	messages: Message[];
	timestamp: number;
}

const EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_RECENT_CHATS = 10;

interface ClientFormProps {
	schema: FormSchema;
	title?: string;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onCancel?: () => void;
	sendToAgent?: boolean;
}

interface WidgetProps {
	config: WidgetConfig;
	onClose: () => void;
	triggerMessage?: string | string[];
	triggerForm?: { toolId: string; message?: string; requestId?: string };
	clientForm?: ClientFormProps;
	userIdentity?: { userId?: string; userMetadata?: Record<string, unknown> };
	onFirstMessage?: () => void;
	onUnreadCountChange?: (count: number) => void;
	onMessageReceived?: () => void;
	/** Whether the widget is currently open/visible (for scroll management) */
	isWidgetOpen?: boolean;
}

export function Widget({
	config,
	onClose,
	triggerMessage,
	triggerForm,
	clientForm,
	userIdentity,
	onFirstMessage,
	onUnreadCountChange,
	onMessageReceived,
	isWidgetOpen = true,
}: WidgetProps) {
	const STORAGE_KEY = `ansa-conversation-${config.agentId}`;
	const RECENT_CHATS_KEY = `ansa-recent-chats-${config.agentId}`;
	const TRIGGER_FORM_KEY = `ansa-trigger-form-${config.agentId}`;

	const settings: InterfaceSettings = {
		theme: config.theme || "system",
		primaryColor: config.primaryColor || "#3b82f6",
		chatBubbleColor: config.chatBubbleColor || "#3b82f6",
		displayName: config.displayName || "AI Assistant",
		profilePicture: config.profilePicture ?? null,
		initialMessage: triggerMessage || config.initialMessage || "Hello! How can I help you today?",
		suggestedMessages: config.suggestedMessages || [],
		messagePlaceholder: config.messagePlaceholder ?? "Type a message...",
		footerMessage: config.footerMessage ?? null,
		dismissibleMessage: config.dismissibleMessage ?? null,
		homeGreeting: config.homeGreeting || "Hello.",
		homeSubtitle: config.homeSubtitle || "Hi! I'm here to help. Ask me anything.",
	};

	// Get system translations based on configured language
	const t = getTranslations(config.language || "en");

	function loadStoredConversation(): StoredConversation | null {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;
			const data: StoredConversation = JSON.parse(stored);
			if (Date.now() - data.timestamp > EXPIRY_MS) {
				localStorage.removeItem(STORAGE_KEY);
				return null;
			}
			return data;
		} catch {
			return null;
		}
	}

	function saveConversation(convId: string, msgs: Message[]) {
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ conversationId: convId, messages: msgs, timestamp: Date.now() }),
			);
		} catch {}
	}

	function loadRecentChats(): RecentChat[] {
		try {
			const stored = localStorage.getItem(RECENT_CHATS_KEY);
			if (!stored) return [];
			const chats: RecentChat[] = JSON.parse(stored);
			const now = Date.now();
			return chats.filter((chat) => now - chat.timestamp < EXPIRY_MS);
		} catch {
			return [];
		}
	}

	function saveRecentChats(chats: RecentChat[]) {
		try {
			localStorage.setItem(RECENT_CHATS_KEY, JSON.stringify(chats));
		} catch {}
	}

	function archiveCurrentChat(convId: string, msgs: Message[], status: "open" | "closed" = "open") {
		if (!convId || msgs.length === 0) return;
		const firstUserMessage = msgs.find((m) => m.role === "user");
		if (!firstUserMessage) return;

		const recentChats = loadRecentChats();
		const filtered = recentChats.filter((c) => c.conversationId !== convId);
		const newChat: RecentChat = {
			conversationId: convId,
			messages: msgs,
			timestamp: Date.now(),
			preview: firstUserMessage.content.slice(0, 100),
			status,
		};
		const updated = [newChat, ...filtered].slice(0, MAX_RECENT_CHATS);
		saveRecentChats(updated);
	}

	// Trigger form persistence for page refresh
	function saveTriggerForm(form: { toolId: string; message?: string }) {
		try {
			localStorage.setItem(TRIGGER_FORM_KEY, JSON.stringify({ ...form, timestamp: Date.now() }));
		} catch {}
	}

	function loadTriggerForm(): { toolId: string; message?: string } | null {
		try {
			const stored = localStorage.getItem(TRIGGER_FORM_KEY);
			if (!stored) return null;
			const data = JSON.parse(stored);
			// Expire after 1 hour
			if (Date.now() - data.timestamp > 60 * 60 * 1000) {
				localStorage.removeItem(TRIGGER_FORM_KEY);
				return null;
			}
			return { toolId: data.toolId, message: data.message };
		} catch {
			return null;
		}
	}

	function clearTriggerForm() {
		try {
			localStorage.removeItem(TRIGGER_FORM_KEY);
		} catch {}
	}

	const [initialData] = useState(() => {
		const stored = loadStoredConversation();
		return {
			messages: sortMessages(stored?.messages || []),
			conversationId: stored?.conversationId || null,
			hasMessages: (stored?.messages?.length || 0) > 0,
		};
	});

	const FEEDBACK_KEY = `ansa-feedback-${config.agentId}`;

	function loadFeedbackState(): Record<string, "up" | "down" | null> {
		try {
			const stored = localStorage.getItem(FEEDBACK_KEY);
			return stored ? JSON.parse(stored) : {};
		} catch {
			return {};
		}
	}

	function saveFeedbackState(state: Record<string, "up" | "down" | null>) {
		try {
			localStorage.setItem(FEEDBACK_KEY, JSON.stringify(state));
		} catch {}
	}

	const [messages, setMessages] = useState<Message[]>(initialData.messages);
	const [conversationId, setConversationId] = useState<string | null>(initialData.conversationId);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showInitialMessage, setShowInitialMessage] = useState(!initialData.hasMessages);
	const [showDismissibleBanner, setShowDismissibleBanner] = useState(true);
	const [showMenu, setShowMenu] = useState(false);
	const [showRecentChats, setShowRecentChats] = useState(false);
	const [showEndChatScreen, setShowEndChatScreen] = useState(false);
	const [endChatConversationId, setEndChatConversationId] = useState<string | null>(null);
	const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
	const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
	const [feedbackState, setFeedbackState] =
		useState<Record<string, "up" | "down" | null>>(loadFeedbackState);
	// Escalation state
	const [isEscalated, setIsEscalated] = useState(false);
	const [isRateLimited, setIsRateLimited] = useState(false);
	const [isResolved, setIsResolved] = useState(false);
	const [escalationPending, setEscalationPending] = useState(false);
	const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName?: string }>>([]);
	const [offlinePendingCount, setOfflinePendingCount] = useState(0);
	const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
	const [isExpanded, setIsExpanded] = useState(false);
	// Internal visibility state - tracks both prop and message events (for iframe embed)
	const [internalIsOpen, setInternalIsOpen] = useState(isWidgetOpen);
	const streamContentRef = useRef("");
	const conversationIdRef = useRef<string | null>(initialData.conversationId);
	const offlineQueueRef = useRef<ReturnType<typeof getOfflineQueue> | null>(null);
	const isStreamingRef = useRef(false);
	const pendingFilesRef = useRef<Map<string, File>>(new Map());

	// Sync internal visibility state with prop (for standalone embed)
	useEffect(() => {
		setInternalIsOpen(isWidgetOpen);
	}, [isWidgetOpen]);

	// Listen for visibility messages from parent (for iframe embed)
	useEffect(() => {
		const handleVisibilityMessage = (event: MessageEvent) => {
			const { type, isOpen } = event.data || {};
			if (type === "ansa:visibility" && typeof isOpen === "boolean") {
				setInternalIsOpen(isOpen);
			}
		};

		window.addEventListener("message", handleVisibilityMessage);
		return () => window.removeEventListener("message", handleVisibilityMessage);
	}, []);

	// Lazy initialize offline queue
	const getQueue = () => {
		if (!offlineQueueRef.current) {
			offlineQueueRef.current = getOfflineQueue();
		}
		return offlineQueueRef.current;
	};

	const menuRef = useRef<HTMLDivElement>(null);
	const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastMessageTimestamp = useRef<Date>(new Date());
	const endChatContainerRef = useRef<HTMLDivElement>(null);

	// Update isMobile on window resize
	useEffect(() => {
		const handleResize = () => {
			const mobile = window.innerWidth <= 768;
			setIsMobile(mobile);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Scroll to top when showing the Chat Ended screen
	useEffect(() => {
		if (showEndChatScreen && endChatContainerRef.current) {
			endChatContainerRef.current.scrollTop = 0;
		}
	}, [showEndChatScreen]);

	// Socket.IO connection for real-time updates
	const { socket, connectionState, reconnect } = useSocket({
		url: config.apiUrl,
		conversationId: conversationId || undefined,
		userId: userIdentity?.userId,
		onConnectionChange: () => {
			// Connection state changes are handled internally
		},
		onReconnect: () => {
			// Request missed messages on reconnect
			if (conversationId && socket) {
				socket.emit("get-messages-since", {
					conversationId,
					since: lastMessageTimestamp.current,
				});
			}

			// Process offline message queue
			const queue = getQueue();
			queue
				.processQueue(
					config.apiUrl,
					(messageId) => {
						// Success - update message status
						setMessages((prev) =>
							prev.map((msg) =>
								msg.id === messageId ? { ...msg, deliveryStatus: "delivered" as const } : msg,
							),
						);
						setOfflinePendingCount(queue.getPendingCount());
					},
					(messageId, error) => {
						console.error("Failed to send queued message:", messageId, error);
						setOfflinePendingCount(queue.getPendingCount());
					},
				)
				.catch((error) => {
					console.error("Error processing queue:", error);
				});
		},
	});

	// Handle Socket.IO ChatKit events for real-time streaming
	useChatKitEvents(socket, isStreamingRef, {
		onMessageStart: (data) => {
			const messageId = data.message.id;
			streamContentRef.current = "";

			// Play notification sound for incoming assistant messages
			if (data.message.role === "assistant" && onMessageReceived) {
				onMessageReceived();
			}

			// Check if message already exists or if we're already streaming (avoid duplicates from HTTP stream)
			setMessages((prev) => {
				// Check if message with this ID already exists
				if (prev.some((m) => m.id === messageId)) {
					return prev;
				}

				// Check if last message is an assistant message that's currently being streamed (from HTTP)
				const lastMsg = prev[prev.length - 1];
				if (lastMsg && lastMsg.role === "assistant" && !lastMsg.metadata?.messageType) {
					// Update the existing streaming message with the server's ID
					const updated = [...prev];
					updated[updated.length - 1] = { ...lastMsg, id: messageId };
					return updated;
				}

				const assistantMessage: Message = {
					id: messageId,
					role: "assistant",
					content: "",
					timestamp: Date.now(),
				};
				return [...prev, assistantMessage];
			});
		},
		onContentBlockDelta: (data) => {
			if (data.delta?.text) {
				streamContentRef.current += data.delta.text;
				setMessages((prev) => {
					const lastIndex = prev.length - 1;
					if (lastIndex === -1 || prev[lastIndex].role !== "assistant") return prev;
					const updated = [...prev];
					updated[lastIndex] = { ...updated[lastIndex], content: streamContentRef.current };
					return updated;
				});
			}
		},
		onContentClear: () => {
			streamContentRef.current = "";
			setMessages((prev) => {
				const lastIndex = prev.length - 1;
				if (lastIndex === -1 || prev[lastIndex].role !== "assistant") return prev;
				const updated = [...prev];
				updated[lastIndex] = { ...updated[lastIndex], content: "" };
				return updated;
			});
		},
		onToolUse: (data) => {
			setMessages((prev) => {
				const lastIndex = prev.length - 1;
				if (lastIndex === -1 || prev[lastIndex].role !== "assistant") return prev;
				const updated = [...prev];
				const msg = updated[lastIndex];

				// Handle tool errors - show error block in chat
				if (data.isError) {
					const errorBlock: ToolBlock = {
						type: "tool_result",
						toolName: data.tool,
						result: data.result,
						displayConfig: (data.displayConfig as any) || { type: "text" },
						isError: true,
						errorMessage: data.errorMessage || "Tool execution failed",
						...(data.debugInfo && { debugInfo: data.debugInfo as any }),
					};
					updated[lastIndex] = {
						...msg,
						blocks: [...(msg.blocks || []), errorBlock],
					};
				} else if (data.isFormTool) {
					const formBlock: FormBlockType = {
						type: "form",
						toolId: data.toolId || "",
						toolName: data.tool,
						formSchema: data.formSchema as FormSchema | undefined,
						executionMode: (data.formExecutionMode || "webhook") as FormExecutionMode,
						clientHandler: data.formClientHandler,
						toolArgs: data.toolArgs as Record<string, unknown> | undefined,
						formPostActions: data.formPostActions as FormPostAction[] | undefined,
						initialValues: undefined,
					};
					updated[lastIndex] = { ...msg, formBlock };
				} else if (data.displayConfig && (data.displayConfig as any).type !== "text") {
					const newBlock: ToolBlock = {
						type: "tool_result",
						toolName: data.tool,
						result: data.result,
						displayConfig: data.displayConfig,
						...(data.debugInfo && { debugInfo: data.debugInfo as any }),
					};
					updated[lastIndex] = {
						...msg,
						blocks: [...(msg.blocks || []), newBlock],
					};
				} else if (data.debugInfo && config._debug) {
					// Debug-only block for text-type tools
					const debugBlock: ToolBlock = {
						type: "tool_result",
						toolName: data.tool,
						result: data.result,
						displayConfig: (data.displayConfig as any) || { type: "text" },
						debugInfo: data.debugInfo as any,
					};
					updated[lastIndex] = {
						...msg,
						blocks: [...(msg.blocks || []), debugBlock],
					};
				}
				return updated;
			});
		},
		onMessageStop: (data) => {
			if (data.conversationId) {
				setConversationId(data.conversationId);
				conversationIdRef.current = data.conversationId;
			}
			if (data.metadata) {
				setMessages((prev) => {
					const lastIndex = prev.length - 1;
					if (lastIndex === -1 || prev[lastIndex].role !== "assistant") return prev;
					const updated = [...prev];
					updated[lastIndex] = {
						...updated[lastIndex],
						metadata: data.metadata as any,
					};
					return updated;
				});
			}
			setIsLoading(false);
			lastMessageTimestamp.current = new Date();
		},
		onError: (data) => {
			setMessages((prev) => {
				const lastIndex = prev.length - 1;
				if (lastIndex === -1 || prev[lastIndex].role !== "assistant") return prev;
				const updated = [...prev];
				updated[lastIndex] = {
					...updated[lastIndex],
					content: `Error: ${data.error.message}`,
				};
				return updated;
			});
			setIsLoading(false);
		},
		onMessageDelivered: (data) => {
			// Update message delivery status
			setMessages((prev) => {
				const updated = [...prev];
				const msgIndex = updated.findIndex((m) => m.id === data.messageId);
				if (msgIndex !== -1 && updated[msgIndex].role === "user") {
					updated[msgIndex] = {
						...updated[msgIndex],
						deliveryStatus: "delivered",
					};
				}
				return updated;
			});
		},
		onUserTyping: (data) => {
			// Handle typing indicators from agents
			if (data.role === "agent") {
				setTypingUsers((prev) => {
					if (data.isTyping) {
						// Add user if not already in list
						if (prev.some((u) => u.userId === data.userId)) return prev;
						return [...prev, { userId: data.userId, userName: data.userName }];
					} else {
						// Remove user from list
						return prev.filter((u) => u.userId !== data.userId);
					}
				});
			}
		},
		onAgentJoined: () => {
			// Could show a system message that agent joined
		},
		onMessagesReplay: (data) => {
			// Handle replayed messages after reconnection
			if (data.messages.length > 0) {
				setMessages((prev) => {
					const existingIds = new Set(prev.map((m) => m.id));
					const newMessages = data.messages.filter((m) => !existingIds.has(m.id));
					if (newMessages.length === 0) return prev;
					return sortMessages([
						...prev,
						...newMessages.map((msg): Message => {
							// Map server toolBlocks (DB column) to widget blocks/formBlock fields
							const { formBlock, nonFormBlocks } = extractFormBlock(
								msg.toolBlocks as ToolBlockData[] | null | undefined,
							);
							return {
								id: msg.id,
								role: msg.role,
								content: msg.content,
								timestamp: new Date(msg.createdAt).getTime(),
								isHumanResponse: (msg as { isHumanResponse?: boolean }).isHumanResponse,
								metadata: msg.metadata as Message["metadata"],
								blocks: nonFormBlocks.length > 0 ? (nonFormBlocks as ToolBlock[]) : undefined,
								formBlock: formBlock
									? ({
											type: "form",
											toolId: formBlock.toolId,
											toolName: formBlock.toolName,
											formSchema: formBlock.formSchema as FormSchema | undefined,
											executionMode: (formBlock.executionMode || "webhook") as FormExecutionMode,
											clientHandler: formBlock.clientHandler,
											toolArgs: formBlock.toolArgs,
											formPostActions:
												formBlock.formPostActions as FormBlockType["formPostActions"],
										} satisfies FormBlockType)
									: undefined,
							};
						}),
					]);
				});
			}
		},
		onEscalationRequested: (_data) => {
			// Handle escalation event from dashboard
			setIsEscalated(true);
		},
	});

	// Handle complete messages from human agents (non-streaming)
	useEffect(() => {
		if (!socket) return;

		const handleMessageComplete = (data: {
			type: string;
			message: {
				id: string;
				role: "user" | "assistant";
				content: string;
				isHumanResponse?: boolean;
				createdAt?: string;
				blocks?: ToolBlock[];
				formBlock?: FormBlockType;
				metadata?: {
					messageType?: string;
					shouldShowEscalation?: boolean;
					escalationIntent?: string;
				};
			};
		}) => {
			const msg = data.message;

			// Play notification sound for incoming assistant messages
			if (msg.role === "assistant" && onMessageReceived) {
				onMessageReceived();
			}

			setMessages((prev) => {
				// Check if message already exists
				if (prev.some((m) => m.id === msg.id)) {
					return prev;
				}

				const newMessage: Message = {
					id: msg.id,
					role: msg.role,
					content: msg.content,
					timestamp: msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now(),
					isHumanResponse: msg.isHumanResponse,
					blocks: msg.blocks,
					formBlock: msg.formBlock,
					metadata: msg.metadata,
				};
				return sortMessages([...prev, newMessage]);
			});
		};

		socket.on("message_complete", handleMessageComplete);

		return () => {
			socket.off("message_complete", handleMessageComplete);
		};
	}, [socket, onMessageReceived]);

	// Scroll manager hook for unread tracking and scroll position persistence
	const {
		scrollContainerRef,
		lastReadMessageRef,
		messagesEndRef,
		lastReadMessageId,
		handleScroll,
		scrollToBottom,
		initializeScrollPosition,
	} = useScrollManager({
		agentId: config.agentId,
		messages,
		onUnreadCountChange,
		isWidgetOpen: internalIsOpen,
	});

	// Initialize scroll position on mount
	useEffect(() => {
		if (messages.length > 0) {
			initializeScrollPosition();
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Mark conversation as seen on server when user reads all messages
	useEffect(() => {
		if (!conversationId) return;

		// Check if user has read all messages (lastReadMessageId is the last message)
		const lastMessage = messages[messages.length - 1];
		if (lastMessage && lastReadMessageId === lastMessage.id) {
			// User has seen all messages - notify server
			fetch(`${config.apiUrl}/chat/seen/${conversationId}`, { method: "POST" }).catch(() => {});
		}
	}, [lastReadMessageId, messages, conversationId, config.apiUrl]);

	// Fetch form submissions on mount and merge into messages
	useEffect(() => {
		if (!conversationId) return;

		const fetchFormSubmissions = async () => {
			try {
				const response = await fetch(`${config.apiUrl}/form-submissions/widget/${conversationId}`);
				if (!response.ok) return;

				const data = await response.json();
				if (!data.submissions || data.submissions.length === 0) return;

				// Create a map of toolId -> submission
				const submissionMap = new Map(
					data.submissions.map(
						(sub: { id: string; toolId: string; status: string; formSubmittedAt: string }) => [
							sub.toolId,
							{
								id: sub.id,
								status: sub.status,
								submittedAt: new Date(sub.formSubmittedAt).getTime(),
							},
						],
					),
				);

				// Update messages with submission data
				setMessages((prevMessages) => {
					let updated = false;
					const newMessages = prevMessages.map((msg) => {
						if (msg.formBlock && submissionMap.has(msg.formBlock.toolId)) {
							updated = true;
							return {
								...msg,
								formSubmission: submissionMap.get(msg.formBlock.toolId),
							};
						}
						return msg;
					});

					// Only update if there were actual changes
					return updated ? newMessages : prevMessages;
				});
			} catch (error) {
				console.error("[Widget] Failed to fetch form submissions:", error);
			}
		};

		fetchFormSubmissions();
	}, [conversationId, config.apiUrl]);

	useEffect(() => {
		conversationIdRef.current = conversationId;
	}, [conversationId]);

	// Reset escalation state when conversation changes to prevent carrying over state
	useEffect(() => {
		// When conversationId changes from one value to a different value (not just null to value)
		const prevId = conversationIdRef.current;
		if (prevId && conversationId && prevId !== conversationId) {
			// New conversation started after a previous one - reset escalation state
			setIsEscalated(false);
			setIsRateLimited(false);
			setIsResolved(false);
		}
	}, [conversationId]);

	// Notify parent about conversation state for socket management (standalone embed)
	useEffect(() => {
		if (conversationId) {
			window.postMessage(
				{
					type: "ansa:conversation-state",
					conversationId,
					isResolved,
				},
				"*",
			);
		}
	}, [conversationId, isResolved]);

	useEffect(() => {
		if (conversationId && messages.length > 0) {
			saveConversation(conversationId, messages);
		}
	}, [messages, conversationId]);

	// Poll for new messages when escalated (human agent may respond)
	useEffect(() => {
		if (!isEscalated || !conversationId) return;

		const pollInterval = 5000; // Poll every 5 seconds
		let lastMessageTimestamp =
			messages.length > 0 ? Math.max(...messages.map((m) => m.timestamp || 0)) : 0;
		let isFirstPoll = true; // Flag for first poll after escalation

		const pollForMessages = async () => {
			try {
				// Also check if escalation was resolved or de-escalated
				const statusResponse = await fetch(`${config.apiUrl}/escalations/status/${conversationId}`);
				if (statusResponse.ok) {
					const statusData = await statusResponse.json();
					if (statusData.isResolved) {
						setIsResolved(true);
						setIsEscalated(false);
						// Add resolution message
						const resolutionMessage: Message = {
							id: `resolution-${Date.now()}`,
							role: "assistant",
							content: t.chat.resolutionMessage,
							timestamp: Date.now(),
							metadata: { messageType: "resolution_notice" },
						};
						setMessages((prev) => {
							// Only add if not already present
							if (prev.some((m) => m.id.startsWith("resolution-"))) return prev;
							return [...prev, resolutionMessage];
						});
						return; // Stop polling
					} else if (!statusData.isEscalated && isEscalated) {
						// De-escalation detected - fetch any new messages (including de-escalation notice) before stopping
						try {
							const messagesResponse = await fetch(
								`${config.apiUrl}/chat/messages/${conversationId}?since=${lastMessageTimestamp}`,
							);
							if (messagesResponse.ok) {
								const messagesData = await messagesResponse.json();
								if (messagesData.messages && messagesData.messages.length > 0) {
									const existingIds = new Set(messages.map((m) => m.id));
									const newMessages = messagesData.messages.filter(
										(m: { id: string; role: string }) =>
											!existingIds.has(m.id) && m.role === "assistant",
									);
									if (newMessages.length > 0) {
										setMessages((prev) => {
											const existingIds = new Set(prev.map((m) => m.id));
											const uniqueNewMessages = newMessages.filter(
												(m: { id: string }) => !existingIds.has(m.id),
											);
											return sortMessages([...prev, ...uniqueNewMessages]);
										});
									}
								}
							}
						} catch {
							// Silently fail
						}
						// Update state and stop polling
						setIsEscalated(false);
						setIsResolved(false);
						return; // Stop polling since it's no longer escalated
					}
				}

				// On first poll after escalation, fetch without timestamp filter to avoid clock skew issues
				const url = isFirstPoll
					? `${config.apiUrl}/chat/messages/${conversationId}`
					: `${config.apiUrl}/chat/messages/${conversationId}?since=${lastMessageTimestamp}`;
				isFirstPoll = false;

				const response = await fetch(url);
				if (!response.ok) return;

				const data = await response.json();
				if (data.messages && data.messages.length > 0) {
					// Filter out messages we already have (by ID) and user messages (we add those locally)
					const existingIds = new Set(messages.map((m) => m.id));
					const newMessages = data.messages.filter(
						(m: { id: string; role: string }) => !existingIds.has(m.id) && m.role === "assistant",
					);

					if (newMessages.length > 0) {
						setMessages((prev) => {
							// Merge new messages, avoiding duplicates
							const existingIds = new Set(prev.map((m) => m.id));
							const uniqueNewMessages = newMessages.filter(
								(m: { id: string }) => !existingIds.has(m.id),
							);
							return sortMessages([...prev, ...uniqueNewMessages]);
						});
						// Update last timestamp
						lastMessageTimestamp = Math.max(
							lastMessageTimestamp,
							...newMessages.map((m: { timestamp: number }) => m.timestamp || 0),
						);
					}
				}
			} catch {
				// Silently fail - will retry on next poll
			}
		};

		// Poll immediately when escalation is set, then continue polling at interval
		pollForMessages();
		const intervalId = setInterval(pollForMessages, pollInterval);

		// Cleanup on unmount or when escalation changes
		return () => clearInterval(intervalId);
	}, [isEscalated, conversationId, config.apiUrl]);

	// Fetch escalation status when loading an existing conversation
	useEffect(() => {
		if (!conversationId) return;

		const checkEscalationStatus = async () => {
			try {
				const response = await fetch(`${config.apiUrl}/escalations/status/${conversationId}`);
				if (response.ok) {
					const data = await response.json();
					if (data.isEscalated) {
						setIsEscalated(true);
						setIsResolved(false);
					} else if (data.isResolved) {
						setIsResolved(true);
						setIsEscalated(false);
					} else {
						// Handle de-escalation case (status="resolved" but resolvedAt=null)
						setIsEscalated(false);
						setIsResolved(false);
					}
				}
			} catch {
				// Silently fail
			}
		};

		checkEscalationStatus();
	}, [conversationId, config.apiUrl]);

	// Show satisfaction survey when conversation is resolved
	useEffect(() => {
		if (!isResolved || !config.showSatisfactionOnResolved || !conversationId) return;

		// Check if satisfaction survey already shown
		const satisfactionShown = messages.some(
			(m) => m.formBlock?.type === "form" && m.metadata?.messageType === "satisfaction_survey",
		);
		if (satisfactionShown) return;

		// Check if satisfaction survey was already submitted by fetching submissions
		const checkAndAddSurvey = async () => {
			let existingSubmission: { id: string; status: string; submittedAt: number } | undefined;

			try {
				const response = await fetch(`${config.apiUrl}/form-submissions/widget/${conversationId}`);
				if (response.ok) {
					const data = await response.json();
					// Look for satisfaction survey submission (uses special UUID)
					const satisfactionSubmission = data.submissions?.find(
						(sub: { toolId: string }) => sub.toolId === "00000000-0000-0000-0000-000000000000",
					);
					if (satisfactionSubmission) {
						existingSubmission = {
							id: satisfactionSubmission.id,
							status: satisfactionSubmission.status,
							submittedAt: new Date(satisfactionSubmission.formSubmittedAt).getTime(),
						};
					}
				}
			} catch {
				// Silently fail - will show form without submission data
			}

			// If already submitted, don't show the form at all
			if (existingSubmission) return;

			// Add satisfaction survey form message
			const satisfactionSurveyMessage: Message = {
				id: `satisfaction-${Date.now()}`,
				role: "assistant",
				content: "", // Empty content - introText is shown inside the form
				timestamp: Date.now(),
				metadata: { messageType: "satisfaction_survey" },
				formBlock: {
					type: "form",
					toolId: "00000000-0000-0000-0000-000000000000", // Special UUID for built-in satisfaction survey
					toolName: t.forms.customerSatisfactionSurvey,
					formSchema: {
						name: t.forms.customerSatisfactionSurvey,
						title: t.forms.customerSatisfactionSurvey,
						introText: t.forms.satisfactionIntro,
						description: t.forms.satisfactionDescription,
						fields: [
							{
								name: "rating",
								label: t.forms.satisfactionQuestion,
								type: "select",
								required: true,
								options: [
									{ label: t.forms.verySatisfied, value: "5" },
									{ label: t.forms.satisfied, value: "4" },
									{ label: t.forms.neutral, value: "3" },
									{ label: t.forms.dissatisfied, value: "2" },
									{ label: t.forms.veryDissatisfied, value: "1" },
								],
							},
							{
								name: "feedback",
								label: t.forms.additionalFeedbackOptional,
								type: "textarea",
								required: false,
							},
						],
					},
					executionMode: "webhook",
					formPostActions: [],
					schema: {
						name: t.forms.customerSatisfactionSurvey,
						title: t.forms.customerSatisfactionSurvey,
						introText: t.forms.satisfactionIntro,
						description: t.forms.satisfactionDescription,
						fields: [
							{
								name: "rating",
								label: t.forms.satisfactionQuestion,
								type: "select",
								required: true,
								options: [
									{ label: t.forms.verySatisfied, value: "5" },
									{ label: t.forms.satisfied, value: "4" },
									{ label: t.forms.neutral, value: "3" },
									{ label: t.forms.dissatisfied, value: "2" },
									{ label: t.forms.veryDissatisfied, value: "1" },
								],
							},
							{
								name: "feedback",
								label: t.forms.additionalFeedbackOptional,
								type: "textarea",
								required: false,
							},
						],
					},
				},
			};

			setMessages((prev) => [...prev, satisfactionSurveyMessage]);
		};

		checkAndAddSurvey();
	}, [isResolved, config.showSatisfactionOnResolved, conversationId, messages, config.apiUrl, t]);

	// Close menu when clicking outside - uses capture phase to work in Shadow DOM
	const containerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setShowMenu(false);
			}
		};
		if (showMenu && containerRef.current) {
			containerRef.current.addEventListener("mousedown", handleClickOutside);
		}
		return () => {
			if (containerRef.current) {
				containerRef.current.removeEventListener("mousedown", handleClickOutside);
			}
		};
	}, [showMenu]);

	// Handle trigger form - fetch form schema and display it as a message
	// Also check for stored trigger form on page refresh
	useEffect(() => {
		// Use prop triggerForm or load from localStorage for page refresh
		const formToShow = triggerForm || loadTriggerForm();
		if (!formToShow?.toolId) return;

		// Save to localStorage so it survives page refresh (before conversation is created)
		if (triggerForm) {
			saveTriggerForm(triggerForm);
		}

		const fetchAndShowForm = async () => {
			try {
				const response = await fetch(`${config.apiUrl}/triggers/form/${formToShow.toolId}`);
				if (!response.ok) {
					console.error("[Ansa] Failed to fetch trigger form");
					return;
				}

				const formData = await response.json();

				// Create a message with the form
				const formMessage: Message = {
					id: `trigger-form-${Date.now()}`,
					role: "assistant",
					content: formToShow.message || "",
					timestamp: Date.now(),
					formBlock: {
						type: "form",
						toolId: formData.toolId,
						toolName: formData.toolName,
						formSchema: formData.formSchema,
						executionMode: formData.executionMode || "webhook",
						clientHandler: formData.clientHandler,
						formPostActions: formData.formPostActions,
					},
				};

				setMessages((prev) => [...prev, formMessage]);
				setShowInitialMessage(false);
			} catch (err) {
				console.error("[Ansa] Error fetching trigger form:", err);
			}
		};

		fetchAndShowForm();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [triggerForm?.toolId, triggerForm?.message, triggerForm?.requestId, config.apiUrl]);

	// Handle client-side form (passed directly with schema)
	useEffect(() => {
		if (!clientForm?.schema) return;

		// Create a message with the form
		const formMessage: Message = {
			id: `client-form-${Date.now()}`,
			role: "assistant",
			content: clientForm.title || "",
			timestamp: Date.now(),
			formBlock: {
				type: "form",
				toolId: `client-form-${Date.now()}`,
				toolName: "client_form",
				formSchema: clientForm.schema,
				executionMode: "client",
				clientHandler: undefined,
			},
			clientFormCallbacks: {
				onSubmit: clientForm.onSubmit,
				onCancel: clientForm.onCancel,
				sendToAgent: clientForm.sendToAgent,
			},
		};

		setMessages((prev) => [...prev, formMessage]);
		setShowInitialMessage(false);
	}, [clientForm]);

	const handleStartNewChat = () => {
		if (conversationId && messages.length > 0) {
			archiveCurrentChat(conversationId, messages, "open");
		}
		setMessages([]);
		setConversationId(null);
		conversationIdRef.current = null;
		setShowInitialMessage(true);
		setShowMenu(false);
		setShowRecentChats(false);
		setIsEscalated(false);
		setIsRateLimited(false);
		setIsResolved(false);
		clearTriggerForm();
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {}
	};

	const handleEndChat = async () => {
		// Close and resolve the conversation if one exists
		if (conversationId && messages.length > 0) {
			try {
				await fetch(`${config.apiUrl}/chat/close/${conversationId}`, {
					method: "POST",
				});
			} catch (error) {
				console.error("Error closing conversation:", error);
			}
			archiveCurrentChat(conversationId, messages, "closed");
		}

		// Show end chat screen with satisfaction survey if enabled
		if (config.showSatisfactionOnResolved && conversationId) {
			setEndChatConversationId(conversationId);
			setShowEndChatScreen(true);
			setShowMenu(false);
		} else {
			goToHomeScreen();
		}
	};

	const goToHomeScreen = () => {
		setMessages([]);
		setConversationId(null);
		conversationIdRef.current = null;
		setShowInitialMessage(true);
		setShowMenu(false);
		setShowEndChatScreen(false);
		setEndChatConversationId(null);
		setIsResolved(false);
		setIsEscalated(false);
		setInput("");
		clearTriggerForm();
		try {
			localStorage.removeItem(STORAGE_KEY);
		} catch {}
	};

	const handleSatisfactionSubmit = async (data: { rating: string; feedback?: string }) => {
		if (endChatConversationId) {
			try {
				// Use the existing form submission endpoint with the special satisfaction survey tool ID
				await fetch(`${config.apiUrl}/form-submissions/submit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						toolId: "00000000-0000-0000-0000-000000000000", // Special UUID for built-in satisfaction survey
						conversationId: endChatConversationId,
						formData: {
							rating: data.rating,
							feedback: data.feedback || "",
						},
						fieldsCompleted: data.feedback ? ["rating", "feedback"] : ["rating"],
					}),
				});
			} catch (error) {
				console.error("Error submitting satisfaction:", error);
			}
		}
		goToHomeScreen();
	};

	const handleViewRecentChats = () => {
		setShowMenu(false);
		setRecentChats(loadRecentChats());
		setShowRecentChats(true);
	};

	const handleLoadRecentChat = (chat: RecentChat) => {
		// Update ref FIRST to prevent useEffect from resetting isResolved
		conversationIdRef.current = chat.conversationId;
		setMessages(chat.messages);
		setConversationId(chat.conversationId);
		setShowInitialMessage(false);
		setShowRecentChats(false);
		// Set resolved state based on chat status (both 'resolved' and 'closed' are considered resolved)
		setIsResolved(chat.status === "closed" || chat.status === "resolved");
		saveConversation(chat.conversationId, chat.messages);
	};

	const handleBackFromRecentChats = () => {
		setShowRecentChats(false);
	};

	const handleCopyMessage = async (messageId: string, content: string) => {
		try {
			await navigator.clipboard.writeText(content);
			setCopiedMessageId(messageId);
			setTimeout(() => setCopiedMessageId(null), 2000);
		} catch {}
	};

	const handleFeedback = async (messageId: string, feedback: "up" | "down") => {
		const newValue = feedbackState[messageId] === feedback ? null : feedback;
		const newState = {
			...feedbackState,
			[messageId]: newValue,
		};
		setFeedbackState(newState);
		saveFeedbackState(newState);

		// Send feedback to API (only if setting, not clearing)
		if (newValue) {
			try {
				await fetch(`${config.apiUrl}/feedback`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messageId,
						feedback: newValue,
					}),
				});
			} catch {
				// Silently fail - feedback is optional
			}
		}
	};

	// Handle escalation to human support
	const handleEscalate = async () => {
		if (!conversationId || isEscalated || escalationPending) return;

		setEscalationPending(true);
		try {
			const response = await fetch(`${config.apiUrl}/escalations`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					conversationId,
					source: "user_request",
				}),
			});

			if (response.ok || response.status === 409) {
				// 409 means already escalated, which is fine
				setIsEscalated(true);
				// Add confirmation message to chat
				const confirmationMessage: Message = {
					id: `escalation-${Date.now()}`,
					role: "assistant",
					content: config.escalation?.humanSupportConfirmation || t.chat.escalationConfirmation,
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, confirmationMessage]);
			}
		} catch {
			// Silently fail
		} finally {
			setEscalationPending(false);
		}
	};

	// Handle positive feedback (answered my question)
	const handlePositiveFeedback = async (messageId: string) => {
		// Set thumbs up feedback
		await handleFeedback(messageId, "up");
	};

	// Determine if escalation buttons should be shown for a message
	const shouldShowEscalationButtons = (messageIndex: number): boolean => {
		if (!config.escalation?.enabled || isEscalated) return false;

		const showAfter = config.escalation.showButtonsAfter;

		switch (showAfter) {
			case "every_response":
			case "every_ai_response":
				return true;
			case "first_ai_response": {
				// Show only after the first AI response
				const assistantCount = messages
					.slice(0, messageIndex + 1)
					.filter((m) => m.role === "assistant").length;
				return assistantCount === 1;
			}
			case "thumbs_down_only": {
				// Show only if user gave thumbs down on this message
				const msgId = messages[messageIndex]?.id;
				return feedbackState[msgId] === "down";
			}
			case "after_n_messages": {
				// Count assistant messages
				const assistantCount = messages
					.slice(0, messageIndex + 1)
					.filter((m) => m.role === "assistant").length;
				return assistantCount >= (config.escalation.showAfterMessageCount || 3);
			}
			case "on_human_request":
			case "on_low_confidence":
			case "on_help_request":
			case "on_human_or_negative_feedback":
			case "on_any_signal": {
				// These are triggered by AI signals, check the last assistant message for escalation signal
				const lastAssistantMsg = messages[messageIndex];
				return lastAssistantMsg?.metadata?.shouldShowEscalation === true;
			}
			case "never":
				return false;
			default:
				return false;
		}
	};

	const handleAddToCart = async (variantId: string) => {
		try {
			const response = await fetch(`${config.apiUrl}/shopify/cart/checkout`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					agentId: config.agentId,
					variantId,
					quantity: 1,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create checkout");
			}

			const data = await response.json();
			if (data.checkoutUrl) {
				window.open(data.checkoutUrl, "_blank");
			}
		} catch (err) {
			console.error("Failed to add to cart:", err);
		}
	};

	// Form submission handler
	const handleFormSubmit = useCallback(
		async (
			formBlock: FormBlockType,
			formData: Record<string, unknown>,
			fieldsCompleted: string[],
			storedData?: { impressionAt?: number; startedAt?: number },
		): Promise<FormHandlerResult> => {
			const { toolId, toolName, executionMode, clientHandler, schema } = formBlock;

			// Try client-side handler first if available
			if ((executionMode === "client" || executionMode === "both") && clientHandler) {
				try {
					// Send message to parent window to execute client handler
					const requestId = crypto.randomUUID();

					const result = await new Promise<FormHandlerResult>((resolve, reject) => {
						const timeout = setTimeout(() => {
							window.removeEventListener("message", handleResult);
							reject(new Error(t.errors.formTimeout));
						}, 30000); // 30 second timeout

						const handleResult = (event: MessageEvent) => {
							const { type, data } = event.data || {};
							if (type === "ansa:formResult" && data?.requestId === requestId) {
								clearTimeout(timeout);
								window.removeEventListener("message", handleResult);
								resolve({
									success: data.success,
									message: data.message,
									data: data.data,
								});
							}
						};

						window.addEventListener("message", handleResult);

						// Send to parent window
						window.parent.postMessage(
							{
								type: "ansa:formSubmit",
								data: {
									requestId,
									handlerName: clientHandler,
									formData,
									fieldSchemas: schema.fields.map((f) => ({
										name: f.name,
										type: f.type,
										label: f.label,
										required: f.required,
									})),
									conversationId,
								},
							},
							"*",
						);
					});

					// Report client result to server for analytics
					await fetch(`${config.apiUrl}/form-submissions/client-result`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							submissionId: toolId,
							success: result.success,
							message: result.message,
							data: result.data,
						}),
					}).catch(() => {}); // Ignore errors in analytics reporting

					if (result.success) {
						clearFormData(config.agentId, toolName);
						clearTriggerForm();
					}

					// If client-only, return here
					if (executionMode === "client") {
						return result;
					}

					// For "both", continue to webhook even if client succeeded
					if (!result.success) {
						return result;
					}
				} catch (err) {
					console.error("[ansa] Client form handler error:", err);
					if (executionMode === "client") {
						return {
							success: false,
							message: err instanceof Error ? err.message : t.errors.clientHandlerFailed,
						};
					}
				}
			}

			// Submit to server for webhook execution
			try {
				const response = await fetch(`${config.apiUrl}/form-submissions/submit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						toolId,
						conversationId,
						formData,
						fieldsCompleted,
						impressionAt: storedData?.impressionAt,
						startedAt: storedData?.startedAt,
					}),
				});

				if (!response.ok) {
					const error = await response.json();
					return {
						success: false,
						message: error.error || t.errors.formSubmissionFailed,
					};
				}

				const result = await response.json();

				if (result.success) {
					clearFormData(config.agentId, toolName);
					clearTriggerForm();

					// Update the message with submission data
					if (result.submissionId) {
						setMessages((prevMessages) => {
							const updatedMessages = prevMessages.map((msg) => {
								if (msg.formBlock?.toolId === toolId) {
									return {
										...msg,
										formSubmission: {
											id: result.submissionId,
											status: result.status || "submitted",
											submittedAt: Date.now(),
										},
									};
								}
								return msg;
							});
							return updatedMessages;
						});
					}
				}

				return {
					success: result.webhookResult?.success ?? result.success,
					message: result.webhookResult?.error,
				};
			} catch (err) {
				console.error("[ansa] Form submission error:", err);
				return {
					success: false,
					message: err instanceof Error ? err.message : t.errors.formSubmissionFailed,
				};
			}
		},
		[config.apiUrl, config.agentId, conversationId],
	);

	const sendMessage = useCallback(
		async (messageContent?: string) => {
			const content = messageContent || input.trim();
			if (!content || isLoading || isRateLimited) return;

			// Stop typing indicator
			if (socket && conversationId) {
				socket.emit("typing-stop", {
					conversationId,
					userId: userIdentity?.userId || "anonymous",
					role: "user" as const,
				});
			}
			if (typingTimeoutRef.current) {
				clearTimeout(typingTimeoutRef.current);
			}

			// Track first message (conversion) if no conversationId yet
			if (!conversationId && onFirstMessage) {
				onFirstMessage();
			}

			setShowInitialMessage(false);

			const userMessage: Message = {
				id: crypto.randomUUID(),
				role: "user",
				content,
				timestamp: Date.now(),
				deliveryStatus: "sending",
			};

			setMessages((prev) => [...prev, userMessage]);
			setInput("");
			setIsLoading(true);

			// Scroll to bottom when user sends a message
			requestAnimationFrame(() => {
				scrollToBottom("smooth");
			});

			const assistantMessageId = crypto.randomUUID();
			streamContentRef.current = "";

			// Build message history to send to API (before try block so it's accessible in catch)
			// Include initial message as assistant context if this is the first user message
			const messageHistory: Array<{ role: string; content: string }> = [];

			if (messages.length === 0 && settings.initialMessage) {
				// First message - include the initial message as assistant context
				messageHistory.push({
					role: "assistant",
					content: Array.isArray(settings.initialMessage)
						? settings.initialMessage[0]
						: settings.initialMessage,
				});
			}

			// Add existing messages
			messageHistory.push(
				...messages.map((m) => ({
					role: m.role,
					content: m.content,
				})),
			);

			// Add the new user message
			messageHistory.push({
				role: "user",
				content: userMessage.content,
			});

			try {
				const response = await fetch(`${config.apiUrl}/chat`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						messages: messageHistory,
						agentId: config.agentId,
						conversationId: conversationId,
						footerMessage: settings.footerMessage,
						// Channel tracking (defaults to "widget" on API side)
						...(config.channel ? { channel: config.channel } : {}),
						// Debug mode for dashboard testing (only when channel is dashboard)
						...(config._debug && config.channel === "dashboard" ? { _debug: true } : {}),
						// Language for localized escalation messages
						...(config.language ? { lang: config.language } : {}),
						// User identity for personalized tool execution
						...(userIdentity?.userId ? { userId: userIdentity.userId } : {}),
						...(userIdentity?.userMetadata ? { userMetadata: userIdentity.userMetadata } : {}),
						// Page tracking - only sent on first message (when no conversationId)
						...(conversationId
							? {}
							: {
									pageUrl: config.pageUrl,
									pageDomain: config.pageDomain,
									pagePath: config.pagePath,
								}),
					}),
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({}));
					if (errorData.code === "BRANDING_REQUIRED") {
						throw new Error(t.errors.brandingRequired);
					}
					throw new Error(errorData.error || "Failed to send message");
				}

				// Check if response is JSON (escalated conversation) vs SSE stream
				const contentType = response.headers.get("content-type") || "";
				if (contentType.includes("application/json")) {
					// Escalated conversation - message saved, no AI response
					const jsonData = await response.json();
					if (jsonData.escalated) {
						// Set conversation ID if returned
						if (jsonData.conversationId) {
							setConversationId(jsonData.conversationId);
							conversationIdRef.current = jsonData.conversationId;
						}

						// Display the escalation message immediately using the database ID
						if (jsonData.message) {
							const assistantMessage: Message = {
								id: jsonData.messageId || assistantMessageId,
								role: "assistant",
								content: jsonData.message,
								timestamp: Date.now(),
								metadata: { messageType: "escalation_notice" },
							};
							setMessages((prev) => [...prev, assistantMessage]);
						}

						// Set escalated state to trigger message polling (for future human responses)
						setIsEscalated(true);
						setIsLoading(false);
						isStreamingRef.current = false;
						return;
					} else if (jsonData.rateLimited) {
						// Rate limited - no escalation, no more AI responses
						if (jsonData.conversationId) {
							setConversationId(jsonData.conversationId);
							conversationIdRef.current = jsonData.conversationId;
						}

						// Display the rate limit message if returned
						if (jsonData.message) {
							const assistantMessage: Message = {
								id: jsonData.messageId || assistantMessageId,
								role: "assistant",
								content: jsonData.message,
								timestamp: Date.now(),
								metadata: { messageType: "rate_limit_notice" },
							};
							setMessages((prev) => [...prev, assistantMessage]);
						}

						// Set rate limited state - no polling, no more messages
						setIsRateLimited(true);
						setIsLoading(false);
						isStreamingRef.current = false;
						return;
					} else if (jsonData.conversationId) {
						// Not escalated but conversation ID returned - ensure escalation state is cleared for new conversations
						setConversationId(jsonData.conversationId);
						conversationIdRef.current = jsonData.conversationId;
						setIsEscalated(false);
						setIsResolved(false);
					}
				}

				// Add assistant placeholder now that we know we're getting a streaming response
				const assistantMessage: Message = {
					id: assistantMessageId,
					role: "assistant",
					content: "",
					timestamp: Date.now(),
				};
				setMessages((prev) => [...prev, assistantMessage]);

				// Play notification sound when starting to receive AI response
				if (onMessageReceived) {
					onMessageReceived();
				}

				// Mark that we're streaming via HTTP to prevent WebSocket duplicate handlers
				isStreamingRef.current = true;

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				if (!reader) throw new Error("No response body");

				let buffer = "";
				let serverMessageId: string | null = null;

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() || "";

					for (const line of lines) {
						if (line.startsWith("data:")) {
							try {
								const data = JSON.parse(line.slice(5).trim());
								// Capture server message ID from message_start
								if (data.type === "message_start" && data.message?.id) {
									serverMessageId = data.message.id;
									// Update local message with server ID for feedback tracking
									setMessages((prev) => {
										const lastIndex = prev.findIndex((m) => m.id === assistantMessageId);
										if (lastIndex === -1) return prev;
										const updated = [...prev];
										updated[lastIndex] = { ...updated[lastIndex], id: serverMessageId! };
										return updated;
									});
								}
								// Clear accumulated text when starting a new tool follow-up round
								if (data.type === "content_clear") {
									streamContentRef.current = "";
									const msgId = serverMessageId || assistantMessageId;
									setMessages((prev) => {
										const lastIndex = prev.findIndex((m) => m.id === msgId);
										if (lastIndex === -1) return prev;
										const updated = [...prev];
										updated[lastIndex] = { ...updated[lastIndex], content: "" };
										return updated;
									});
								}
								if (data.type === "content_block_delta" && data.delta?.text) {
									streamContentRef.current += data.delta.text;
									const newContent = streamContentRef.current;
									const msgId = serverMessageId || assistantMessageId;
									setMessages((prev) => {
										const lastIndex = prev.findIndex((m) => m.id === msgId);
										if (lastIndex === -1) return prev;
										const updated = [...prev];
										updated[lastIndex] = { ...updated[lastIndex], content: newContent };
										return updated;
									});
								}
								// Handle tool_use events for rich content blocks
								if (data.type === "tool_use") {
									const msgId = serverMessageId || assistantMessageId;

									// Handle tool errors - show error block in chat
									if (data.isError) {
										const errorBlock: ToolBlock = {
											type: "tool_result",
											toolName: data.tool,
											result: data.result,
											displayConfig: data.displayConfig || { type: "text" },
											isError: true,
											errorMessage: data.errorMessage || "Tool execution failed",
											...(data.debugInfo && { debugInfo: data.debugInfo }),
										};
										setMessages((prev) => {
											const lastIndex = prev.findIndex((m) => m.id === msgId);
											if (lastIndex === -1) return prev;
											const updated = [...prev];
											const msg = updated[lastIndex];
											updated[lastIndex] = {
												...msg,
												blocks: [...(msg.blocks || []), errorBlock],
											};
											return updated;
										});
									} else if (data.isFormTool) {
										// Handle form blocks specially (check isFormTool flag from API)
										const formBlock: FormBlockType = {
											type: "form",
											toolId: data.toolId,
											toolName: data.tool,
											formSchema: data.formSchema as FormSchema | undefined,
											executionMode: (data.formExecutionMode || "webhook") as FormExecutionMode,
											clientHandler: data.formClientHandler,
											toolArgs: data.toolArgs as Record<string, unknown> | undefined,
											formPostActions: data.formPostActions as FormPostAction[] | undefined,
											initialValues: data.initialValues,
										};
										setMessages((prev) => {
											const lastIndex = prev.findIndex((m) => m.id === msgId);
											if (lastIndex === -1) return prev;
											const updated = [...prev];
											const msg = updated[lastIndex];
											updated[lastIndex] = {
												...msg,
												formBlock,
											};
											return updated;
										});
									} else if (data.displayConfig?.type && data.displayConfig.type !== "text") {
										// Handle other rich tool blocks (non-form, non-text)
										const newBlock: ToolBlock = {
											type: "tool_result",
											toolName: data.tool,
											result: data.result,
											displayConfig: data.displayConfig,
											...(data.debugInfo && { debugInfo: data.debugInfo }),
										};
										setMessages((prev) => {
											const lastIndex = prev.findIndex((m) => m.id === msgId);
											if (lastIndex === -1) return prev;
											const updated = [...prev];
											const msg = updated[lastIndex];
											updated[lastIndex] = {
												...msg,
												blocks: [...(msg.blocks || []), newBlock],
											};
											return updated;
										});
									} else if (data.debugInfo && config._debug) {
										// Debug-only block for text-type tools (no rich display, but show debug panel)
										// Only created when _debug is enabled (dashboard /chat page)
										const debugBlock: ToolBlock = {
											type: "tool_result",
											toolName: data.tool,
											result: data.result,
											displayConfig: data.displayConfig || { type: "text" },
											debugInfo: data.debugInfo,
										};
										setMessages((prev) => {
											const lastIndex = prev.findIndex((m) => m.id === msgId);
											if (lastIndex === -1) return prev;
											const updated = [...prev];
											const msg = updated[lastIndex];
											updated[lastIndex] = {
												...msg,
												blocks: [...(msg.blocks || []), debugBlock],
											};
											return updated;
										});
									}
								}
								if (data.type === "message_stop" && data.conversationId) {
									setConversationId(data.conversationId);
									conversationIdRef.current = data.conversationId;

									// Update message metadata if provided
									if (data.metadata) {
										const msgId = serverMessageId || assistantMessageId;
										setMessages((prev) => {
											const lastIndex = prev.findIndex((m) => m.id === msgId);
											if (lastIndex === -1) return prev;
											const updated = [...prev];
											updated[lastIndex] = {
												...updated[lastIndex],
												metadata: data.metadata,
											};
											return updated;
										});
									}
								}
							} catch {
								// Ignore malformed SSE data lines
							}
						}
					}
				}

				// HTTP streaming completed successfully
				isStreamingRef.current = false;
			} catch (err) {
				// HTTP streaming failed - reset flag
				isStreamingRef.current = false;

				const errorMessage = err instanceof Error ? err.message : t.errors.somethingWentWrong;

				// Check if offline - queue message for retry
				if (connectionState === "disconnected" || connectionState === "reconnecting") {
					const queue = getQueue();
					queue.enqueue({
						id: userMessage.id,
						content: userMessage.content,
						conversationId: conversationId || undefined,
						agentId: config.agentId,
						userIdentity,
						context: {
							messages: messageHistory,
							initialMessage: Array.isArray(settings.initialMessage)
								? settings.initialMessage[0]
								: settings.initialMessage || undefined,
						},
					});
					setOfflinePendingCount(queue.getPendingCount());

					// Keep message in "sending" state
					setIsLoading(false);
					return;
				}

				// Online error - mark user message as failed, show error
				setMessages((prev) => {
					const updated = [...prev];
					// Mark the user message as failed
					const userIdx = updated.findIndex((m) => m.id === userMessage.id);
					if (userIdx !== -1) {
						updated[userIdx] = { ...updated[userIdx], deliveryStatus: "failed" };
					}
					// Update or remove the assistant error placeholder
					const last = updated[updated.length - 1];
					if (last.role === "assistant" && !last.content) {
						// Remove empty assistant placeholder
						updated.pop();
					} else if (last.role === "assistant") {
						last.content = `Error: ${errorMessage}`;
					}
					return updated;
				});
			} finally {
				setIsLoading(false);
			}
		},
		[
			input,
			isLoading,
			messages,
			conversationId,
			connectionState,
			settings.footerMessage,
			settings.initialMessage,
			config.apiUrl,
			config.agentId,
			config.pageUrl,
			config.pageDomain,
			config.pagePath,
			config.language,
			onFirstMessage,
			userIdentity,
			scrollToBottom,
			socket,
		],
	);

	const retryMessage = useCallback(
		(messageId: string) => {
			const msg = messages.find((m) => m.id === messageId);
			if (!msg || msg.role !== "user") return;
			// Remove failed message and resend
			setMessages((prev) => prev.filter((m) => m.id !== messageId));
			sendMessage(msg.content);
		},
		[messages, sendMessage],
	);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	// Paperclip: Enhanced file upload handler with comprehensive error handling
	const handleFileUpload = useCallback(
		async (file: File) => {
			if (!conversationId || isLoading) return;

			// Enhanced file validation
			const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
			const allowedTypes = [
				"image/jpeg",
				"image/png",
				"image/gif",
				"image/webp",
				"application/pdf",
				"application/msword",
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				"text/plain",
			];

			// Validate file size
			if (file.size > MAX_FILE_SIZE) {
				const userMessage: Message = {
					id: crypto.randomUUID(),
					role: "user",
					content: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`,
					timestamp: Date.now(),
					metadata: { uploadError: true, errorType: "size_limit" },
				};
				setMessages((prev) => [...prev, userMessage]);
				return;
			}

			// Validate file type
			if (!allowedTypes.includes(file.type)) {
				const userMessage: Message = {
					id: crypto.randomUUID(),
					role: "user",
					content: `Unsupported file type: ${file.name}. Allowed: images, PDFs, Word documents, text files.`,
					timestamp: Date.now(),
					metadata: { uploadError: true, errorType: "invalid_type" },
				};
				setMessages((prev) => [...prev, userMessage]);
				return;
			}

			// Create optimistic user message
			const userMessage: Message = {
				id: crypto.randomUUID(),
				role: "user",
				content: file.name,
				timestamp: Date.now(),
				metadata: {
					attachmentUpload: {
						filename: file.name,
						size: file.size,
						type: file.type,
					},
				},
			};

			setMessages((prev) => [...prev, userMessage]);
			pendingFilesRef.current.set(userMessage.id, file);
			setIsLoading(true);

			try {
				// Upload file
				const formData = new FormData();
				formData.append("file", file);
				formData.append("messageId", userMessage.id);

				const response = await fetch(`${config.apiUrl}/attachments`, {
					method: "POST",
					body: formData,
					credentials: "include",
				});

				if (!response.ok) {
					const errorData = await response.json().catch(() => ({ error: "Upload failed" }));
					throw new Error(errorData.error || `Upload failed (${response.status})`);
				}

				const attachment = await response.json();

				// Update message with success
				pendingFilesRef.current.delete(userMessage.id);
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === userMessage.id
							? {
									...msg,
									metadata: {
										...msg.metadata,
										attachmentId: attachment.id,
										uploadSuccess: true,
									},
								}
							: msg,
					),
				);

				// Auto-scroll to show the uploaded attachment
				requestAnimationFrame(() => {
					scrollToBottom("smooth");
				});
			} catch (error) {
				console.error("Paperclip upload error:", error);

				// Update message with detailed error
				const errorMessage = error instanceof Error ? error.message : "Upload failed";
				const retryable = !errorMessage.includes("size") && !errorMessage.includes("type");
				if (!retryable) pendingFilesRef.current.delete(userMessage.id);
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === userMessage.id
							? {
									...msg,
									content: `Failed to upload ${file.name}: ${errorMessage}`,
									metadata: {
										...msg.metadata,
										uploadError: true,
										errorMessage: errorMessage,
										retryable,
									},
								}
							: msg,
					),
				);
			} finally {
				setIsLoading(false);
			}
		},
		[conversationId, isLoading, config.apiUrl, scrollToBottom],
	);

	// System theme detection with real-time updates
	const [isDark, setIsDark] = useState(() => {
		// Dark mode disabled - always use light theme
		if (!DARK_MODE_ENABLED) {
			return false;
		}
		// Original dark mode logic (preserved for re-enablement)
		if (settings.theme === "system") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches;
		}
		return settings.theme === "dark";
	});

	useEffect(() => {
		// Dark mode disabled - always use light theme
		if (!DARK_MODE_ENABLED) {
			setIsDark(false);
			return;
		}
		// Original dark mode logic (preserved for re-enablement)
		if (settings.theme === "system") {
			const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
			setIsDark(mediaQuery.matches);
			const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
			mediaQuery.addEventListener("change", handler);
			return () => mediaQuery.removeEventListener("change", handler);
		}
		setIsDark(settings.theme === "dark");
	}, [settings.theme]);

	// Check if primary color is light and needs dark text for contrast
	const primaryIsLight = isLightColor(settings.primaryColor);
	const primaryContrastColor = primaryIsLight ? "#121317" : "#ffffff";
	// Header icons should be dark in light mode (white header bg), follow primaryContrastColor in dark mode
	const headerIconColor = isDark ? primaryContrastColor : "#1A1A1A";

	// Bubble style helper - only dynamic colors (uses Tailwind for everything else)
	const getBubbleStyle = (isUser: boolean) => ({
		backgroundColor: isUser ? settings.chatBubbleColor : undefined,
		borderColor: isUser ? undefined : isDark ? "#374151" : "#E5E5E5",
	});

	// Bubble classes helper
	const getBubbleClasses = (isUser: boolean) =>
		isUser
			? "text-white rounded-[20px] rounded-tr-sm shadow-sm"
			: `${isDark ? "bg-gray-800 text-gray-100" : "bg-white text-[#1A1A1A]"} border rounded-[20px] rounded-tl-sm shadow-sm`;

	// Suggested button border (dynamic based on dark mode)
	const suggestedBtnBorder = `1px solid ${isDark ? "#374151" : "#e5e7eb"}`;

	return (
		<>
			<style>
				{`
          @keyframes thinkingDots {
            0%, 20% { opacity: 0; }
            40% { opacity: 1; }
            60%, 100% { opacity: 0; }
          }
        `}
			</style>
			{/* Backdrop overlay - only on mobile */}
			{isMobile && (
				<div aria-hidden="true" className="fixed inset-0 bg-black/40 -z-10" onClick={onClose} />
			)}
			<div
				ref={containerRef}
				className={`flex flex-col h-full font-sans text-sm leading-normal ${
					isDark ? "bg-zinc-900 text-gray-100" : "bg-[#FAFAF9] text-[#1A1A1A]"
				}`}
				style={
					isMobile
						? {
								boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(0, 0, 0, 0.1)",
							}
						: undefined
				}
			>
				{/* Header */}
				{!(messages.length === 0 && showInitialMessage) && (
					<div
						className={`flex items-center justify-between flex-shrink-0 h-16 px-5 border-b backdrop-blur-md z-[100] ${
							isDark ? "bg-zinc-900/80 border-white/5" : "bg-white/80 border-black/5"
						}`}
					>
						<div className="flex items-center gap-3">
							{settings.profilePicture ? (
								<img
									src={settings.profilePicture}
									alt={settings.displayName}
									className="object-cover w-8 h-8 rounded-full"
								/>
							) : (
								<div
									className={`flex items-center justify-center w-8 h-8 rounded-full ${isDark ? "" : "bg-[#1A1A1A] text-white"}`}
									style={
										isDark
											? { backgroundColor: settings.primaryColor, color: primaryContrastColor }
											: undefined
									}
								>
									<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
										<path d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
								</div>
							)}
							<div>
								<h3
									className={`font-bold text-sm leading-none ${isDark ? "text-gray-100" : "text-[#1A1A1A]"}`}
								>
									{settings.displayName}
								</h3>
								<div className="flex items-center gap-1 mt-1">
									<span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
									<span
										className={`text-[10px] font-mono ${isDark ? "text-zinc-500" : "text-[#888]"}`}
									>
										{isEscalated ? t.header.humanAgentConnected : t.header.alwaysOnline}
									</span>
								</div>
							</div>
						</div>
						<div className="flex items-center gap-1 ml-auto">
							{/* Expand/Collapse button - only show on desktop */}
							{!isMobile && (
								<button
									type="button"
									className="flex items-center justify-center w-8 h-8 transition-colors bg-transparent border-none rounded-full cursor-pointer hover:bg-black/10"
									style={{ color: headerIconColor }}
									onClick={() => {
										const newExpanded = !isExpanded;
										setIsExpanded(newExpanded);
										window.parent.postMessage(
											{ type: "ansa:expand", isExpanded: newExpanded },
											"*",
										);
									}}
									title={isExpanded ? t.buttons.collapse : t.buttons.expand}
								>
									{isExpanded ? (
										<svg
											width="18"
											height="18"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											strokeWidth="2"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
											/>
										</svg>
									) : (
										<svg
											width="18"
											height="18"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											strokeWidth="2"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
											/>
										</svg>
									)}
								</button>
							)}
							<div className="relative" ref={menuRef}>
								<button
									type="button"
									className="flex items-center justify-center w-8 h-8 bg-transparent border-none rounded-full cursor-pointer"
									style={{ color: headerIconColor }}
									onClick={() => setShowMenu(!showMenu)}
								>
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
										<circle cx="12" cy="5" r="2" />
										<circle cx="12" cy="12" r="2" />
										<circle cx="12" cy="19" r="2" />
									</svg>
								</button>
								{showMenu && (
									<div
										className={`absolute right-0 top-10 w-48 rounded-lg shadow-lg z-[100] border ${
											isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
										}`}
									>
										<button
											type="button"
											className={`w-full px-4 py-2 border-none bg-transparent text-left cursor-pointer flex items-center gap-2 text-sm z-100 ${
												isDark
													? "text-gray-100 hover:bg-gray-700"
													: "text-gray-800 hover:bg-gray-100"
											}`}
											onClick={handleStartNewChat}
										>
											<svg
												width="16"
												height="16"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 4v16m8-8H4"
												/>
											</svg>
											{t.menu.startNewChat}
										</button>
										{!isResolved && (
											<button
												type="button"
												className={`w-full px-4 py-2 border-none bg-transparent text-left cursor-pointer flex items-center gap-2 text-sm ${
													isDark
														? "text-gray-100 hover:bg-gray-700"
														: "text-gray-800 hover:bg-gray-100"
												}`}
												onClick={handleEndChat}
											>
												<svg
													width="16"
													height="16"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M6 18L18 6M6 6l12 12"
													/>
												</svg>
												End chat
											</button>
										)}
										<button
											type="button"
											className={`w-full px-4 py-2 border-none bg-transparent text-left cursor-pointer flex items-center gap-2 text-sm ${
												isDark
													? "text-gray-100 hover:bg-gray-700"
													: "text-gray-800 hover:bg-gray-100"
											}`}
											onClick={handleViewRecentChats}
										>
											<svg
												width="16"
												height="16"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											{t.menu.viewRecentChats}
										</button>
										{/* Version */}
										<div
											className={`px-4 py-2 text-[11px] border-t ${
												isDark ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-200"
											}`}
										>
											v{__ANSA_VERSION__}
										</div>
									</div>
								)}
							</div>
							{/* Close button - only show on mobile */}
							{isMobile && (
								<button
									type="button"
									className={`flex items-center justify-center w-8 h-8 transition-colors bg-transparent border-none rounded-full cursor-pointer ${isDark ? "hover:bg-white/10" : "hover:bg-black/10"}`}
									onClick={onClose}
									title={t.buttons.close}
								>
									<svg
										width="18"
										height="18"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										strokeWidth="2"
									>
										<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
									</svg>
								</button>
							)}
						</div>
					</div>
				)}

				{/* Connection Status Banner */}
				<ConnectionStatus
					connectionState={connectionState}
					onReconnect={reconnect}
					labels={{
						reconnect: t.connection.reconnect,
						disconnectedTap: t.connection.disconnectedTap,
					}}
				/>

				{/* Messages */}
				{showEndChatScreen ? (
					<div ref={endChatContainerRef} className="flex flex-col flex-1 overflow-y-auto">
						{/* Content Area */}
						<div className="flex flex-col items-center flex-1 p-6 pt-10">
							{/* Status Icon */}
							<div className="relative mb-6">
								<div
									className={`flex items-center justify-center w-16 h-16 transform rounded-2xl rotate-3 border shadow-sm ${
										isDark
											? "bg-green-900/30 border-green-800 text-green-400"
											: "bg-green-100 border-green-200 text-green-600"
									}`}
								>
									<svg
										width="32"
										height="32"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
								<div
									className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
										isDark
											? "bg-zinc-700 text-white border-zinc-800"
											: "bg-[#1A1A1A] text-white border-white"
									}`}
								>
									<svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
									</svg>
								</div>
							</div>

							<h2
								className={`text-xl font-bold mb-2 text-center ${isDark ? "text-gray-100" : "text-[#1A1A1A]"}`}
							>
								{t.endChat.title}
							</h2>
							<p
								className={`text-sm text-center max-w-[260px] leading-relaxed mb-8 ${isDark ? "text-gray-400" : "text-[#555]"}`}
							>
								{t.endChat.description}
							</p>

							{/* Survey Form */}
							<form
								onSubmit={(e) => {
									e.preventDefault();
									const formData = new FormData(e.currentTarget);
									handleSatisfactionSubmit({
										rating: formData.get("rating") as string,
										feedback: formData.get("feedback") as string,
									});
								}}
								className="w-full space-y-6"
							>
								{/* Rating Module */}
								<div className="space-y-3">
									<div
										className={`flex items-center justify-between text-[10px] font-mono uppercase tracking-widest px-1 ${isDark ? "text-gray-500" : "text-[#888]"}`}
									>
										<span>{t.endChat.rateQuality}</span>
										<span>{t.endChat.required}</span>
									</div>
									<div className="flex gap-2">
										{[
											{ emoji: "😞", label: t.endChat.bad, value: "1" },
											{ emoji: "😐", label: t.endChat.okay, value: "2" },
											{ emoji: "😃", label: t.endChat.good, value: "3" },
											{ emoji: "😍", label: t.endChat.great, value: "4" },
										].map((option) => (
											<label key={option.value} className="flex-1 cursor-pointer">
												<input
													type="radio"
													name="rating"
													value={option.value}
													required
													className="sr-only peer"
												/>
												<div
													className={`flex flex-col items-center gap-2 py-3 rounded-xl border transition-all duration-200 ${
														isDark
															? "bg-zinc-800 border-zinc-700 peer-checked:bg-zinc-600 peer-checked:border-zinc-500 peer-checked:-translate-y-1 peer-checked:shadow-md hover:border-zinc-600 hover:bg-zinc-700/50"
															: "bg-white border-[#E5E5E5] peer-checked:bg-[#1A1A1A] peer-checked:border-[#1A1A1A] peer-checked:-translate-y-1 peer-checked:shadow-md hover:border-[#CCC] hover:bg-[#FAFAF9]"
													}`}
												>
													<span className="text-2xl transition-transform duration-200 peer-checked:scale-110">
														{option.emoji}
													</span>
													<span
														className={`text-[9px] font-mono uppercase tracking-wide transition-colors ${
															isDark
																? "text-gray-400 peer-checked:text-gray-200"
																: "text-[#888] peer-checked:text-white"
														}`}
													>
														{option.label}
													</span>
												</div>
											</label>
										))}
									</div>
								</div>

								{/* Feedback Text */}
								<div className="space-y-2">
									<label
										htmlFor="ansa-additional-feedback"
										className={`block text-[10px] font-mono uppercase tracking-widest px-1 ${isDark ? "text-gray-500" : "text-[#888]"}`}
									>
										{t.endChat.additionalFeedback}
									</label>
									<div className="relative">
										<textarea
											id="ansa-additional-feedback"
											name="feedback"
											rows={3}
											placeholder={t.endChat.feedbackPlaceholder}
											className={`w-full h-24 rounded-xl p-3 text-sm resize-none focus:outline-none transition-all ${
												isDark
													? "bg-zinc-800 border border-zinc-700 text-gray-100 placeholder-gray-500 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20"
													: "bg-white border border-[#E5E5E5] text-[#1A1A1A] placeholder-[#CCC] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A]/5"
											}`}
										/>
										<div className="absolute bottom-2 right-2">
											<svg
												width="12"
												height="12"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												viewBox="0 0 24 24"
												className={isDark ? "text-zinc-600" : "text-[#E5E5E5]"}
											>
												<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
											</svg>
										</div>
									</div>
								</div>

								{/* Submit Button */}
								<button
									type="submit"
									className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
										isDark
											? "bg-white text-black shadow-lg hover:bg-gray-200 hover:-translate-y-0.5"
											: "bg-[#1A1A1A] text-white shadow-lg hover:bg-[#333] hover:-translate-y-0.5"
									}`}
								>
									{t.endChat.submitReview}
									<svg
										width="14"
										height="14"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											d="M14 5l7 7m0 0l-7 7m7-7H3"
										/>
									</svg>
								</button>
							</form>
						</div>

						{/* Footer - Start New Chat */}
						<div
							className={`p-4 border-t flex-shrink-0 ${isDark ? "bg-zinc-800/50 border-zinc-700" : "bg-white border-[#F3F2EE]"}`}
						>
							<button
								type="button"
								onClick={goToHomeScreen}
								className={`w-full py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors group ${
									isDark
										? "bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 text-gray-200"
										: "bg-[#FAFAF9] hover:bg-[#F3F2EE] border border-[#E5E5E5] text-[#1A1A1A]"
								}`}
							>
								<svg
									width="14"
									height="14"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
									className="transition-transform duration-300 group-hover:-rotate-90"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								{t.endChat.startNewChat}
							</button>
						</div>
					</div>
				) : showRecentChats ? (
					<div className="flex-1 p-4 overflow-y-auto">
						<div className="flex items-center gap-2 mb-4">
							<button
								type="button"
								onClick={handleBackFromRecentChats}
								className={`w-8 h-8 rounded-full border-none bg-transparent cursor-pointer flex items-center justify-center ${
									isDark ? "text-gray-100" : "text-gray-800"
								}`}
							>
								<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 19l-7-7 7-7"
									/>
								</svg>
							</button>
							<div
								className={`flex items-center gap-2 ${isDark ? "text-gray-500" : "text-[#888]"}`}
							>
								<svg
									width="12"
									height="12"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									viewBox="0 0 24 24"
								>
									<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<span className="text-[10px] font-mono uppercase tracking-widest">
									{t.recentChats.title}
								</span>
							</div>
						</div>
						{recentChats.length === 0 ? (
							<div className={`text-center py-8 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
								{t.recentChats.empty}
							</div>
						) : (
							<div className="space-y-2">
								{recentChats.map((chat) => (
									<button
										type="button"
										key={chat.conversationId}
										onClick={() => handleLoadRecentChat(chat)}
										className={`w-full py-3 px-4 border shadow-sm transition-all group flex items-center justify-between text-left ${
											isDark
												? "bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:shadow-md"
												: "bg-white border-[#E5E5E5] hover:bg-[#1A1A1A] hover:border-[#1A1A1A] hover:shadow-md"
										}`}
									>
										<div className="flex-1 min-w-0">
											<div
												className={`font-medium text-sm overflow-hidden text-ellipsis whitespace-nowrap ${isDark ? "text-gray-100" : "text-[#1A1A1A] group-hover:text-white"}`}
											>
												{chat.preview}
											</div>
											<div
												className={`text-xs mt-1 flex items-center gap-2 ${isDark ? "text-gray-500" : "text-[#888] group-hover:text-gray-300"}`}
											>
												<span>
													{new Date(chat.timestamp).toLocaleDateString()} · {chat.messages.length}{" "}
													{t.recentChats.messages}
												</span>
												<span
													className={`px-1.5 py-0.5 text-[9px] font-mono uppercase ${
														chat.status === "closed" || chat.status === "resolved"
															? isDark
																? "bg-green-900/50 text-green-400"
																: "bg-green-100 text-green-700"
															: isDark
																? "bg-blue-900/50 text-blue-400"
																: "bg-blue-100 text-blue-700"
													}`}
												>
													{chat.status === "closed" || chat.status === "resolved"
														? t.recentChats.resolved
														: t.recentChats.open}
												</span>
											</div>
										</div>
										<span
											className={`transition-all duration-300 group-hover:translate-x-1 ml-3 ${isDark ? "text-gray-600 group-hover:text-gray-300" : "text-[#CCC] group-hover:text-white"}`}
										>
											<svg
												width="16"
												height="16"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
												viewBox="0 0 24 24"
											>
												<path d="M5 12h14M12 5l7 7-7 7" />
											</svg>
										</span>
									</button>
								))}
							</div>
						)}
					</div>
				) : (
					<div
						ref={scrollContainerRef}
						className="flex-1 overflow-y-scroll"
						onScroll={handleScroll}
					>
						{messages.length === 0 && showInitialMessage ? (
							<div className="flex flex-col h-full">
								{/* Hero Header */}
								<div
									className={`flex-shrink-0 flex-1 p-6 pb-4 border-b ${isDark ? "bg-zinc-800/50 border-zinc-700" : "bg-white/50 border-black/5"} backdrop-blur-sm`}
								>
									<div className="flex items-start justify-between mb-6">
										{settings.profilePicture ? (
											<img
												src={settings.profilePicture}
												alt={settings.displayName}
												className="w-10 h-10 rounded-[12px] object-cover shadow-lg"
											/>
										) : (
											<div
												className={`w-10 h-10 rounded-[12px] flex items-center justify-center text-white shadow-lg ${isDark ? "bg-zinc-600" : "bg-[#1A1A1A]"}`}
											>
												<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
													<path d="M13 10V3L4 14h7v7l9-11h-7z" />
												</svg>
											</div>
										)}
										<div className="flex items-center gap-1">
											<div className="relative" ref={menuRef}>
												<button
													type="button"
													className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? "text-gray-400 hover:bg-white/10" : "text-[#888] hover:bg-black/5"}`}
													onClick={() => setShowMenu(!showMenu)}
												>
													<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
														<circle cx="12" cy="5" r="2" />
														<circle cx="12" cy="12" r="2" />
														<circle cx="12" cy="19" r="2" />
													</svg>
												</button>
												{showMenu && (
													<div
														className={`absolute right-0 top-10 w-48 rounded-lg shadow-lg z-[100] border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
													>
														<button
															type="button"
															className={`w-full px-4 py-2 border-none bg-transparent text-left cursor-pointer flex items-center gap-2 text-sm ${isDark ? "text-gray-100 hover:bg-gray-700" : "text-gray-800 hover:bg-gray-100"}`}
															onClick={handleViewRecentChats}
														>
															<svg
																width="16"
																height="16"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	strokeLinecap="round"
																	strokeLinejoin="round"
																	strokeWidth={2}
																	d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
																/>
															</svg>
															{t.menu.viewRecentChats}
														</button>
														{/* Version */}
														<div
															className={`px-4 py-2 text-[11px] border-t ${isDark ? "text-gray-500 border-gray-700" : "text-gray-400 border-gray-200"}`}
														>
															v{__ANSA_VERSION__}
														</div>
													</div>
												)}
											</div>
											{/* Close button - only show on mobile */}
											{isMobile && (
												<button
													type="button"
													className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? "text-gray-400 hover:bg-white/10" : "text-[#888] hover:bg-black/5"}`}
													onClick={onClose}
													title={t.buttons.close}
												>
													<svg
														width="18"
														height="18"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
														strokeWidth="2"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M6 18L18 6M6 6l12 12"
														/>
													</svg>
												</button>
											)}
										</div>
									</div>

									<h2
										className={`text-2xl font-bold tracking-tight mb-2 ${isDark ? "text-white" : "text-[#1A1A1A]"}`}
									>
										{settings.homeGreeting}
									</h2>
									<p
										className={`text-sm leading-relaxed max-w-[280px] ${isDark ? "text-gray-400" : "text-[#555]"}`}
									>
										{settings.homeSubtitle}
									</p>

									{/* Status Badges */}
									<div className="flex flex-wrap items-center gap-2 mt-6">
										<div
											className={`px-2 py-1 rounded-md flex items-center gap-2 shadow-sm ${isDark ? "bg-zinc-700 border border-zinc-600" : "bg-white border border-[#E5E5E5]"}`}
										>
											<span className="relative flex w-2 h-2">
												<span className="absolute inline-flex w-full h-full bg-green-400 rounded-full opacity-75 animate-ping"></span>
												<span className="relative inline-flex w-2 h-2 bg-green-500 rounded-full"></span>
											</span>
											<span
												className={`text-[10px] font-mono font-bold uppercase tracking-wider ${isDark ? "text-gray-200" : "text-[#1A1A1A]"}`}
											>
												{t.home.online}
											</span>
										</div>
										{config.escalation?.enabled && (
											<div
												className={`px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm text-[10px] font-mono uppercase tracking-wider ${isDark ? "bg-zinc-700 border border-zinc-600 text-gray-400" : "bg-white border border-[#E5E5E5] text-[#888]"}`}
											>
												{t.home.humanAgents}{" "}
												<span
													className={
														isDark ? "text-gray-200 font-bold" : "text-[#1A1A1A] font-bold"
													}
												>
													{t.home.available}
												</span>
											</div>
										)}
									</div>
								</div>

								{/* Suggested Prompts */}
								{settings.suggestedMessages && settings.suggestedMessages.length > 0 && (
									<div className="p-4 overflow-y-auto">
										<div
											className={`flex items-center gap-2 mb-4 ${isDark ? "text-gray-500" : "text-[#888]"}`}
										>
											<svg
												width="12"
												height="12"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												viewBox="0 0 24 24"
											>
												<path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
											</svg>
											<span className="text-[10px] font-mono uppercase tracking-widest">
												{t.home.suggestedActions}
											</span>
										</div>

										<div className="space-y-2">
											{settings.suggestedMessages.map((msg, i) => (
												<button
													key={i}
													type="button"
													onClick={() => sendMessage(msg)}
													disabled={isLoading}
													className={`w-full p-4 border shadow-sm transition-all group flex items-center justify-between text-left ${
														isDark
															? "bg-zinc-800 border-zinc-700 hover:border-zinc-500 hover:shadow-md"
															: "bg-white border-[#E5E5E5] hover:bg-[#1A1A1A] hover:border-[#1A1A1A] hover:shadow-md"
													}`}
												>
													<span
														className={`font-medium text-sm ${isDark ? "text-gray-100" : "text-[#1A1A1A] group-hover:text-white"}`}
													>
														{msg}
													</span>
													<span
														className={`transition-all duration-300 group-hover:translate-x-1 ${isDark ? "text-gray-600 group-hover:text-gray-300" : "text-[#CCC] group-hover:text-white"}`}
													>
														<svg
															width="16"
															height="16"
															fill="none"
															stroke="currentColor"
															strokeWidth="2"
															strokeLinecap="round"
															strokeLinejoin="round"
															viewBox="0 0 24 24"
														>
															<path d="M5 12h14M12 5l7 7-7 7" />
														</svg>
													</span>
												</button>
											))}
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="p-4">
								{messages.map((msg, i) => {
									// Check if this is a system message that should render as a divider
									const isSystemMessage =
										msg.metadata?.messageType &&
										[
											"escalation_notice",
											"user_escalation_notice",
											"deescalation_notice",
											"resolution_notice",
										].includes(msg.metadata.messageType);

									if (isSystemMessage) {
										const isResolved = msg.metadata?.messageType === "resolution_notice";
										const isEscalationMsg =
											msg.metadata?.messageType === "escalation_notice" ||
											msg.metadata?.messageType === "user_escalation_notice";

										return (
											<div
												key={msg.id}
												data-message-id={msg.id}
												ref={msg.id === lastReadMessageId ? lastReadMessageRef : null}
												className="flex flex-col items-center gap-2 my-6"
											>
												<div
													className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 rounded-full border ${
														isDark
															? "bg-zinc-800 border-zinc-700 text-zinc-400"
															: "bg-[#F9F9F9] border-[#E5E5E5] text-[#888]"
													}`}
												>
													{isEscalationMsg && (
														<svg
															width="12"
															height="12"
															className="text-blue-500"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															strokeWidth="2"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
															/>
														</svg>
													)}
													{isResolved && (
														<svg
															width="12"
															height="12"
															className="text-green-500"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
															strokeWidth="2"
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
															/>
														</svg>
													)}
													<span>{msg.content}</span>
												</div>
											</div>
										);
									}

									return (
										<div
											key={msg.id}
											data-message-id={msg.id}
											ref={msg.id === lastReadMessageId ? lastReadMessageRef : null}
											className="mb-6"
										>
											{msg.role === "assistant" && (
												<div className="flex w-full gap-3">
													{/* Avatar */}
													<div className="flex-shrink-0 mt-6">
														{msg.isHumanResponse ? (
															<div
																className={`flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-white border ${
																	isDark
																		? "bg-gray-700 border-gray-600"
																		: "bg-[#F3F2EE] border-[#E5E5E5]"
																}`}
															>
																<svg
																	width="16"
																	height="16"
																	className={isDark ? "text-gray-300" : "text-[#666]"}
																	fill="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
																</svg>
															</div>
														) : settings.profilePicture ? (
															<img
																src={settings.profilePicture}
																alt={settings.displayName}
																className="object-cover w-8 h-8 rounded-full shadow-sm ring-2 ring-white"
															/>
														) : (
															<div
																className={`flex items-center justify-center w-8 h-8 rounded-full shadow-sm ring-2 ring-white ${isDark ? "bg-white" : ""}`}
																style={isDark ? undefined : { backgroundColor: "#1a1a1a" }}
															>
																<svg
																	width="14"
																	height="14"
																	fill="currentColor"
																	className={isDark ? "text-[#1a1a1a]" : "text-white/90"}
																	viewBox="0 0 24 24"
																>
																	<path d="M13 10V3L4 14h7v7l9-11h-7z" />
																</svg>
															</div>
														)}
													</div>

													<div className="flex flex-col gap-1.5 flex-1 min-w-0 max-w-[80%]">
														{/* Name & Role Label */}
														<div className="flex items-center gap-2 ml-1">
															<span
																className={`text-[11px] font-bold ${isDark ? "text-gray-100" : "text-[#1A1A1A]"}`}
															>
																{msg.isHumanResponse ? t.chat.supportAgent : settings.displayName}
															</span>
															<span
																className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm uppercase ${
																	msg.isHumanResponse
																		? isDark
																			? "text-green-400 bg-green-500/10"
																			: "text-green-700 bg-green-50"
																		: isDark
																			? "text-indigo-400 bg-indigo-500/10"
																			: "text-indigo-600 bg-indigo-50"
																}`}
															>
																{msg.isHumanResponse ? t.chat.supportAgent : t.chat.automated}
															</span>
														</div>
														{/* Render text content first */}
														{(msg.content || isLoading) &&
															msg.metadata?.messageType !== "tool_execution" && (
																<div
																	className={`px-4 py-3 whitespace-pre-line break-words ${getBubbleClasses(false)}`}
																	style={getBubbleStyle(false)}
																>
																	{msg.content ? (
																		renderMarkdown(msg.content, isDark)
																	) : !isEscalated ? (
																		<span className={isDark ? "text-gray-300" : "text-gray-500"}>
																			{t.chat.thinking}
																			<span className="inline-block animate-[thinkingDots_1.4s_infinite]">
																				...
																			</span>
																		</span>
																	) : null}
																</div>
															)}
														{/* Render rich content blocks after text */}
														{msg.blocks && msg.blocks.length > 0 && (
															<div className="">
																{msg.blocks.map((block, blockIndex) => (
																	<BlockRenderer
																		key={blockIndex}
																		block={block}
																		isDark={isDark}
																		primaryColor={settings.primaryColor}
																		onAddToCart={handleAddToCart}
																	/>
																))}
															</div>
														)}
														{/* Render form block after text - full width */}
														{msg.formBlock && (
															<FormBlock
																schema={msg.formBlock.formSchema}
																clientHandler={msg.formBlock.clientHandler}
																toolArgs={msg.formBlock.toolArgs}
																toolId={msg.formBlock.toolId}
																toolName={msg.formBlock.toolName}
																isDark={isDark}
																primaryColor={settings.primaryColor}
																existingSubmission={msg.formSubmission}
																translations={t}
																initialValues={(() => {
																	// Build initialValues from userIdentity using exact field name matching
																	const values: Record<string, unknown> = {};
																	const fields = msg.formBlock?.formSchema?.fields || [];
																	for (const field of fields) {
																		if (userIdentity?.userMetadata?.[field.name] !== undefined) {
																			values[field.name] = userIdentity.userMetadata[field.name];
																		}
																	}
																	return Object.keys(values).length > 0 ? values : undefined;
																})()}
																onSubmit={async (data, fieldsCompleted) => {
																	// For server-side forms, use the regular handler (keeps form to show result)
																	if (!msg.clientFormCallbacks) {
																		return handleFormSubmit(
																			msg.formBlock!,
																			data,
																			fieldsCompleted,
																			undefined,
																		);
																	}

																	// If client form with callbacks, call them directly
																	if (msg.clientFormCallbacks?.onSubmit) {
																		try {
																			await msg.clientFormCallbacks.onSubmit(data);
																		} catch (err) {
																			console.error("[Ansa] Client form onSubmit error:", err);
																		}
																	}
																	// If sendToAgent is true, send form data as a message
																	if (msg.clientFormCallbacks?.sendToAgent) {
																		const formSummary = Object.entries(data)
																			.map(([key, value]) => `${key}: ${value}`)
																			.join("\n");
																		await sendMessage(`${t.forms.formSubmitted}\n${formSummary}`);
																	}
																	// Remove the form message after submission for client-side forms only
																	setMessages((prev) => prev.filter((m) => m.id !== msg.id));
																	return { success: true };
																}}
																onFieldsChange={(_data, _completedFields) => {
																	// Track form impression on first interaction
																	trackFormImpression(config.agentId, msg.formBlock!.toolName);
																}}
																onCancel={
																	msg.clientFormCallbacks?.onCancel
																		? () => {
																				msg.clientFormCallbacks?.onCancel?.();
																				setMessages((prev) => prev.filter((m) => m.id !== msg.id));
																			}
																		: undefined
																}
															/>
														)}
														{msg.content && (
															<div
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "8px",
																	marginTop: "0",
																	marginLeft: "4px",
																	fontSize: "11px",
																	color: isDark ? "#6b7280" : "#9ca3af",
																}}
															>
																{msg.timestamp && (
																	<span>{formatLocalizedRelativeTime(msg.timestamp, t)}</span>
																)}
																<div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
																	{/* Copy button */}
																	<button
																		type="button"
																		onClick={() => handleCopyMessage(msg.id, msg.content)}
																		style={{
																			padding: "4px",
																			borderRadius: "4px",
																			border: "none",
																			backgroundColor: "transparent",
																			cursor: "pointer",
																			color: "inherit",
																			display: "flex",
																		}}
																		title={t.buttons.copy}
																	>
																		{copiedMessageId === msg.id ? (
																			<svg
																				width="14"
																				height="14"
																				fill="none"
																				stroke="#22c55e"
																				viewBox="0 0 24 24"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth={2}
																					d="M5 13l4 4L19 7"
																				/>
																			</svg>
																		) : (
																			<svg
																				width="14"
																				height="14"
																				fill="none"
																				stroke="currentColor"
																				viewBox="0 0 24 24"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth={2}
																					d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
																				/>
																			</svg>
																		)}
																	</button>
																	{/* Thumbs up */}
																	<button
																		type="button"
																		onClick={() => handleFeedback(msg.id, "up")}
																		style={{
																			padding: "4px",
																			borderRadius: "4px",
																			border: "none",
																			backgroundColor: "transparent",
																			cursor: "pointer",
																			color: feedbackState[msg.id] === "up" ? "#22c55e" : "inherit",
																			display: "flex",
																		}}
																		title={t.buttons.helpful}
																	>
																		<svg
																			width="14"
																			height="14"
																			fill={
																				feedbackState[msg.id] === "up" ? "currentColor" : "none"
																			}
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={2}
																				d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
																			/>
																		</svg>
																	</button>
																	{/* Thumbs down */}
																	<button
																		type="button"
																		onClick={() => handleFeedback(msg.id, "down")}
																		style={{
																			padding: "4px",
																			borderRadius: "4px",
																			border: "none",
																			backgroundColor: "transparent",
																			cursor: "pointer",
																			color:
																				feedbackState[msg.id] === "down" ? "#ef4444" : "inherit",
																			display: "flex",
																		}}
																		title={t.buttons.notHelpful}
																	>
																		<svg
																			width="14"
																			height="14"
																			fill={
																				feedbackState[msg.id] === "down" ? "currentColor" : "none"
																			}
																			stroke="currentColor"
																			viewBox="0 0 24 24"
																		>
																			<path
																				strokeLinecap="round"
																				strokeLinejoin="round"
																				strokeWidth={2}
																				d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v2a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
																			/>
																		</svg>
																	</button>
																</div>
																{/* Seen indicator - show if user has responded after this message */}
																{(() => {
																	// Check if there's a user message after this assistant message
																	const isSeen = messages.some(
																		(m, idx) => idx > i && m.role === "user",
																	);
																	if (!isSeen) return null;

																	return (
																		<span
																			style={{
																				display: "flex",
																				alignItems: "center",
																				gap: "2px",
																			}}
																		>
																			<svg
																				width="12"
																				height="12"
																				fill="none"
																				stroke="currentColor"
																				viewBox="0 0 24 24"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					strokeWidth={2}
																					d="M5 13l4 4L19 7"
																				/>
																			</svg>
																			{t.chat.seen}
																		</span>
																	);
																})()}
															</div>
														)}
														{/* Escalation buttons */}
														{shouldShowEscalationButtons(i) && (
															<div
																style={{
																	display: "flex",
																	flexWrap: "wrap",
																	gap: "4px",
																	marginTop: "8px",
																	marginLeft: "4px",
																}}
															>
																<button
																	type="button"
																	onClick={() => handlePositiveFeedback(msg.id)}
																	style={{
																		padding: "6px 12px",
																		borderRadius: "16px",
																		border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
																		backgroundColor: isDark ? "#1f2937" : "#f9fafb",
																		color: isDark ? "#d1d5db" : "#374151",
																		fontSize: "12px",
																		cursor: "pointer",
																		display: "flex",
																		alignItems: "center",
																		gap: "4px",
																	}}
																>
																	<svg
																		width="14"
																		height="14"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M5 13l4 4L19 7"
																		/>
																	</svg>
																	{config.escalation?.positiveFeedbackPrompt ||
																		t.escalation.positiveFeedback}
																</button>
																<button
																	type="button"
																	onClick={handleEscalate}
																	disabled={escalationPending}
																	style={{
																		padding: "6px 12px",
																		borderRadius: "16px",
																		border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
																		backgroundColor: isDark ? "#1f2937" : "#f9fafb",
																		color: isDark ? "#d1d5db" : "#374151",
																		fontSize: "12px",
																		cursor: escalationPending ? "wait" : "pointer",
																		opacity: escalationPending ? 0.6 : 1,
																		display: "flex",
																		alignItems: "center",
																		gap: "4px",
																	}}
																>
																	<svg
																		width="14"
																		height="14"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		strokeWidth="2"
																	>
																		<path
																			strokeLinecap="round"
																			strokeLinejoin="round"
																			d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
																		/>
																	</svg>
																	{config.escalation?.requestHumanPrompt ||
																		t.escalation.requestHuman}
																</button>
															</div>
														)}
													</div>
												</div>
											)}
											{msg.role === "user" && (
												<div className="flex flex-col items-end gap-1">
													<div className="flex items-end gap-1.5 justify-end">
														<div
															className={`px-4 py-3 whitespace-pre-line break-words ${getBubbleClasses(true)}`}
															style={getBubbleStyle(true)}
														>
															{/* Paperclip: Enhanced attachment display for user messages */}
															{msg.metadata?.attachmentUpload ? (
																<div className="flex items-center gap-3 p-2 rounded-lg bg-black bg-opacity-10">
																	{/* File type icon */}
																	{msg.metadata.attachmentUpload.type.startsWith("image/") ? (
																		<svg
																			width="20"
																			height="20"
																			fill="currentColor"
																			viewBox="0 0 24 24"
																			className="text-blue-500"
																		>
																			<path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
																		</svg>
																	) : msg.metadata.attachmentUpload.type === "application/pdf" ? (
																		<svg
																			width="20"
																			height="20"
																			fill="currentColor"
																			viewBox="0 0 24 24"
																			className="text-red-500"
																		>
																			<path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM9.5 16.5v-9h2.25c.5 0 .95.15 1.35.45.4.3.6.75.6 1.35 0 .6-.2 1.05-.6 1.35-.4.3-.85.45-1.35.45H10.5v5.4h-.5zm2.25-6.4c.25 0 .45-.1.6-.25.15-.15.25-.35.25-.6s-.1-.45-.25-.6c-.15-.15-.35-.25-.6-.25H10.5v1.7h1.25zm5.25 6.4v-9h-.5v9h.5z" />
																		</svg>
																	) : msg.metadata.attachmentUpload.type.includes("word") ||
																		msg.metadata.attachmentUpload.type.includes("document") ? (
																		<svg
																			width="20"
																			height="20"
																			fill="currentColor"
																			viewBox="0 0 24 24"
																			className="text-blue-600"
																		>
																			<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
																		</svg>
																	) : (
																		<svg
																			width="20"
																			height="20"
																			fill="currentColor"
																			viewBox="0 0 24 24"
																			className="text-gray-500"
																		>
																			<path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
																		</svg>
																	)}

																	<div className="flex flex-col min-w-0 flex-1">
																		<span className="text-sm font-medium truncate text-white">
																			{msg.metadata.attachmentUpload.filename}
																		</span>
																		<div className="flex items-center gap-2">
																			<span className="text-xs opacity-75 text-white">
																				{(msg.metadata.attachmentUpload.size / 1024).toFixed(1)}KB
																			</span>
																			<span className="text-xs opacity-75 text-white">
																				{msg.metadata.attachmentUpload.type.split("/")[0]}
																			</span>
																		</div>
																	</div>

																	{/* Status indicator */}
																	<div className="flex-shrink-0">
																		{msg.metadata.uploadError ? (
																			<div className="flex items-center gap-1">
																				<svg
																					width="18"
																					height="18"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																					strokeWidth="2"
																					className="text-red-300"
																				>
																					<circle cx="12" cy="12" r="10" />
																					<line x1="15" y1="9" x2="9" y2="15" />
																					<line x1="9" y1="9" x2="15" y2="15" />
																				</svg>
																				{msg.metadata.retryable &&
																					pendingFilesRef.current.has(msg.id) && (
																						<button
																							onClick={() =>
																								handleFileUpload(
																									pendingFilesRef.current.get(msg.id)!,
																								)
																							}
																							className="text-xs underline text-white opacity-75 hover:opacity-100"
																						>
																							retry
																						</button>
																					)}
																			</div>
																		) : msg.metadata.attachmentId ? (
																			<svg
																				width="18"
																				height="18"
																				fill="none"
																				stroke="currentColor"
																				viewBox="0 0 24 24"
																				strokeWidth="2"
																				className="text-green-300"
																			>
																				<path
																					strokeLinecap="round"
																					strokeLinejoin="round"
																					d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
																				/>
																			</svg>
																		) : (
																			<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin opacity-75"></div>
																		)}
																	</div>
																</div>
															) : (
																msg.content
															)}
														</div>
													</div>
													{msg.deliveryStatus && (
														<MessageStatus
															status={msg.deliveryStatus}
															onRetry={
																msg.deliveryStatus === "failed"
																	? () => retryMessage(msg.id)
																	: undefined
															}
															failedLabel={t.errors.tapToRetry}
														/>
													)}
												</div>
											)}
										</div>
									);
								})}
								{/* Typing indicator */}
								{typingUsers.length > 0 &&
									typingUsers.map((user) => (
										<TypingIndicator key={user.userId} userName={user.userName || "Agent"} />
									))}
								<div ref={messagesEndRef} />
							</div>
						)}
					</div>
				)}

				{/* Input */}
				{!showRecentChats && !showEndChatScreen && (
					<div className="p-3">
						{/* Resolved state - show button to start new conversation */}
						{isResolved ? (
							<div className="flex flex-col items-center gap-3">
								<div className="flex items-center gap-2 text-sm font-medium text-green-500">
									<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
										<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
									</svg>
									{t.chat.conversationResolved}
								</div>
								<button
									type="button"
									onClick={handleStartNewChat}
									className="px-5 py-2.5 rounded-lg border-none cursor-pointer text-sm font-medium flex items-center gap-2"
									style={{
										color: isLightColor(settings.primaryColor) ? "#1f2937" : "#ffffff",
									}}
								>
									<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
									{t.chat.startNewChat}
								</button>
							</div>
						) : isRateLimited ? (
							<div className="flex flex-col items-center gap-3">
								<div
									className={`flex items-center gap-2 text-sm font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}
								>
									<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
										/>
									</svg>
									{t.chat.rateLimitReached}
								</div>
								<button
									type="button"
									onClick={handleStartNewChat}
									className="px-5 py-2.5 rounded-lg border-none cursor-pointer text-sm font-medium flex items-center gap-2"
									style={{
										color: isLightColor(settings.primaryColor) ? "#1f2937" : "#ffffff",
									}}
								>
									<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M12 4v16m8-8H4"
										/>
									</svg>
									{t.chat.startNewChat}
								</button>
							</div>
						) : (
							<>
								{showDismissibleBanner && settings.dismissibleMessage && (
									<div
										style={{
											marginBottom: "8px",
											padding: "12px",
											borderRadius: "8px",
											backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff",
											color: isDark ? "#93c5fd" : "#1e40af",
											display: "flex",
											alignItems: "flex-start",
											gap: "8px",
											fontSize: "13px",
										}}
									>
										<span style={{ flex: 1 }}>{settings.dismissibleMessage}</span>
										<button
											type="button"
											onClick={() => setShowDismissibleBanner(false)}
											style={{
												border: "none",
												background: "transparent",
												cursor: "pointer",
												color: "inherit",
												padding: "2px",
											}}
										>
											<svg
												width="16"
												height="16"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M6 18L18 6M6 6l12 12"
												/>
											</svg>
										</button>
									</div>
								)}
								{/* Offline queue indicator */}
								{offlinePendingCount > 0 && (
									<div
										style={{
											marginBottom: "12px",
											padding: "10px 12px",
											borderRadius: "8px",
											backgroundColor: isDark ? "rgba(251, 191, 36, 0.2)" : "#fef3c7",
											color: isDark ? "#fbbf24" : "#92400e",
											display: "flex",
											alignItems: "center",
											gap: "8px",
											fontSize: "13px",
										}}
									>
										<svg
											width="16"
											height="16"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											style={{ flexShrink: 0 }}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										<span>
											{offlinePendingCount} message{offlinePendingCount > 1 ? "s" : ""}{" "}
											{t.errors.offlineQueue}
										</span>
									</div>
								)}
								<div
									className={`rounded-[20px] p-1.5 flex items-center gap-2 transition-all border ${
										isDark
											? "bg-gray-800 border-gray-700 focus-within:border-gray-600 focus-within:bg-gray-700"
											: "bg-[#FAFAF9] border-[#E5E5E5] focus-within:border-[#CCC] focus-within:bg-white"
									}`}
								>
									<input
										type="text"
										value={input}
										onChange={(e) => {
											setInput(e.target.value);
											// Emit typing indicator with debouncing
											if (socket && conversationId && e.target.value.length > 0) {
												socket.emit("typing-start", {
													conversationId,
													userId: userIdentity?.userId || "anonymous",
													role: "user" as const,
												});
												// Clear previous timeout
												if (typingTimeoutRef.current) {
													clearTimeout(typingTimeoutRef.current);
												}
												// Stop typing after 5 seconds of no activity
												typingTimeoutRef.current = setTimeout(() => {
													socket.emit("typing-stop", {
														conversationId,
														userId: userIdentity?.userId || "anonymous",
														role: "user" as const,
													});
												}, 5000);
											}
										}}
										onBlur={() => {
											// Stop typing indicator when input loses focus
											if (socket && conversationId) {
												if (typingTimeoutRef.current) {
													clearTimeout(typingTimeoutRef.current);
												}
												socket.emit("typing-stop", {
													conversationId,
													userId: userIdentity?.userId || "anonymous",
													role: "user" as const,
												});
											}
										}}
										onKeyDown={handleKeyDown}
										placeholder={settings.messagePlaceholder || "Type a message..."}
										className={`flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm h-9 px-2 ${
											isDark
												? "text-gray-100 placeholder:text-gray-500"
												: "text-[#1A1A1A] placeholder:text-[#AAA]"
										}`}
										disabled={isLoading}
									/>
									{/* Paperclip attachment button */}
									<button
										type="button"
										onClick={() => {
											const input = document.createElement("input");
											input.type = "file";
											input.accept = "image/*,.pdf,.doc,.docx,.txt";
											input.onchange = (e) => {
												const file = (e.target as HTMLInputElement).files?.[0];
												if (file) {
													handleFileUpload(file);
												}
											};
											input.click();
										}}
										disabled={isLoading || !conversationId}
										className="flex items-center justify-center flex-shrink-0 transition-all rounded-full w-9 h-9 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
										title="Attach file (images, PDFs, documents)"
									>
										<svg
											width="16"
											height="16"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											strokeWidth="2"
											className={
												isDark
													? "text-gray-400 hover:text-gray-300"
													: "text-gray-600 hover:text-gray-700"
											}
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
											/>
										</svg>
									</button>
									<button
										type="button"
										onClick={() => sendMessage()}
										disabled={isLoading || input.trim() === ""}
										className="flex items-center justify-center flex-shrink-0 transition-opacity rounded-full shadow-sm w-9 h-9 disabled:opacity-50"
										style={{ backgroundColor: settings.primaryColor, color: primaryContrastColor }}
									>
										<svg
											width="16"
											height="16"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											strokeWidth="2"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												d="M14 5l7 7m0 0l-7 7m7-7H3"
											/>
										</svg>
									</button>
								</div>
								{settings.footerMessage && (
									<div
										className={`text-center text-xs ${isDark ? "text-gray-500" : "text-gray-400"} ${isMobile ? "mt-0.5" : "mt-2"}`}
									>
										{settings.footerMessage === "Powered by Ansa" ? (
											<a
												href="https://ansa.so"
												target="_blank"
												rel="noopener noreferrer"
												className="no-underline cursor-pointer text-inherit"
											>
												{settings.footerMessage}
											</a>
										) : (
											settings.footerMessage
										)}
									</div>
								)}
							</>
						)}
					</div>
				)}
			</div>
		</>
	);
}
