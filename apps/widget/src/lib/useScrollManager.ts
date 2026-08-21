import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	getLastReadMessageId,
	getLastReadMessageIndex,
	getUnreadCount,
	saveLastReadMessageId,
} from "./unread-storage";

interface Message {
	id: string;
	role: "user" | "assistant";
}

interface UseScrollManagerOptions {
	agentId: string;
	messages: Message[];
	/** Called when unread count changes */
	onUnreadCountChange?: (count: number) => void;
	/** Whether the widget is currently open/visible */
	isWidgetOpen?: boolean;
}

interface UseScrollManagerResult {
	/** Ref for the scroll container (messages area) */
	scrollContainerRef: React.RefObject<HTMLDivElement | null>;
	/** Ref to attach to the last read message element for scroll targeting */
	lastReadMessageRef: React.RefObject<HTMLDivElement | null>;
	/** Ref to attach to the bottom of the messages list */
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	/** ID of the last read message (for attaching ref) */
	lastReadMessageId: string | null;
	/** ID of the first unseen/unread message */
	firstUnseenMessageId: string | null;
	/** Current unread count */
	unreadCount: number;
	/** Whether the user is currently at the bottom of the scroll */
	isAtBottom: boolean;
	/** Handler to attach to scroll container's onScroll event */
	handleScroll: () => void;
	/** Scroll to the last read message position */
	scrollToLastRead: (behavior?: ScrollBehavior) => void;
	/** Scroll to the bottom of messages */
	scrollToBottom: (behavior?: ScrollBehavior) => void;
	/** Scroll to the first unseen message (bottom of message visible) */
	scrollToFirstUnseen: (behavior?: ScrollBehavior) => void;
	/** Mark all messages as read (when user scrolls to bottom) */
	markAllAsRead: () => void;
	/** Initialize scroll position on mount (call in useEffect) */
	initializeScrollPosition: () => void;
}

/**
 * Shared scroll management hook for chat widgets
 * Handles scroll position persistence, unread tracking, and scroll restoration
 */
export function useScrollManager({
	agentId,
	messages,
	onUnreadCountChange,
	isWidgetOpen = true,
}: UseScrollManagerOptions): UseScrollManagerResult {
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const lastReadMessageRef = useRef<HTMLDivElement | null>(null);
	const messagesEndRef = useRef<HTMLDivElement | null>(null);

	// Load last read message ID from storage
	const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(() => {
		return getLastReadMessageId(agentId);
	});

	const [isAtBottom, setIsAtBottom] = useState(true);
	const [unreadCount, setUnreadCount] = useState(0);

	// Track whether we've done initial scroll
	const hasInitializedRef = useRef(false);
	// Track previous message count for detecting new messages
	const prevMessageCountRef = useRef(messages.length);
	// Track previous widget open state for detecting visibility changes
	const wasOpenRef = useRef(isWidgetOpen);

	// Calculate and update unread count when messages or lastReadMessageId changes
	useEffect(() => {
		const count = getUnreadCount(messages, lastReadMessageId);
		setUnreadCount(count);
		onUnreadCountChange?.(count);
	}, [messages, lastReadMessageId, onUnreadCountChange]);

	// Handle widget visibility changes - scroll to first unseen when widget becomes visible
	useEffect(() => {
		const wasOpen = wasOpenRef.current;
		wasOpenRef.current = isWidgetOpen;

		// Widget just became visible (false → true)
		if (isWidgetOpen && !wasOpen) {
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					const count = getUnreadCount(messages, lastReadMessageId);
					if (count > 0) {
						// Scroll to first unseen message
						const firstUnseenId = (() => {
							if (!lastReadMessageId) {
								return messages.length > 0 ? messages[0].id : null;
							}
							const lastReadIndex = messages.findIndex((m) => m.id === lastReadMessageId);
							if (lastReadIndex === -1 || lastReadIndex >= messages.length - 1) {
								return null;
							}
							return messages[lastReadIndex + 1].id;
						})();

						if (firstUnseenId && scrollContainerRef.current) {
							const messageElement = scrollContainerRef.current.querySelector(
								`[data-message-id="${firstUnseenId}"]`,
							);
							if (messageElement) {
								messageElement.scrollIntoView({ behavior: "auto", block: "end" });
							} else {
								messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
							}
						} else {
							messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
						}
					} else if (messages.length > 0) {
						// No unread messages, scroll to bottom
						messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
					}
				});
			});
		}
	}, [isWidgetOpen, messages, lastReadMessageId]);

	// Handle scroll event to detect when user reaches bottom
	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		const { scrollTop, scrollHeight, clientHeight } = container;
		// Consider "at bottom" if within 50px of the bottom
		const atBottom = scrollHeight - scrollTop - clientHeight < 50;
		setIsAtBottom(atBottom);

		// If user scrolled to bottom, mark all as read
		if (atBottom && messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			if (lastMessage && lastMessage.id !== lastReadMessageId) {
				setLastReadMessageId(lastMessage.id);
				saveLastReadMessageId(agentId, lastMessage.id);
			}
		}
	}, [agentId, messages, lastReadMessageId]);

	// Mark all messages as read
	const markAllAsRead = useCallback(() => {
		if (messages.length > 0) {
			const lastMessage = messages[messages.length - 1];
			setLastReadMessageId(lastMessage.id);
			saveLastReadMessageId(agentId, lastMessage.id);
		}
	}, [agentId, messages]);

	// Scroll to the last read message
	const scrollToLastRead = useCallback(
		(behavior: ScrollBehavior = "auto") => {
			if (!lastReadMessageId) {
				// No last read message, scroll to bottom
				messagesEndRef.current?.scrollIntoView({ behavior });
				return;
			}

			const lastReadIndex = getLastReadMessageIndex(messages, lastReadMessageId);
			if (lastReadIndex === -1) {
				// Message not found, scroll to bottom
				messagesEndRef.current?.scrollIntoView({ behavior });
				return;
			}

			// If last read is the last message, scroll to bottom
			if (lastReadIndex === messages.length - 1) {
				messagesEndRef.current?.scrollIntoView({ behavior });
				return;
			}

			// Scroll to the last read message ref
			if (lastReadMessageRef.current) {
				lastReadMessageRef.current.scrollIntoView({ behavior, block: "start" });
			}
		},
		[lastReadMessageId, messages],
	);

	// Scroll to bottom of messages
	const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
		messagesEndRef.current?.scrollIntoView({ behavior });
	}, []);

	// Compute the first unseen message ID (message after the last read one)
	const firstUnseenMessageId = useMemo(() => {
		if (!lastReadMessageId) {
			// If no last read message, the first message is unseen (if any)
			return messages.length > 0 ? messages[0].id : null;
		}
		const lastReadIndex = messages.findIndex((m) => m.id === lastReadMessageId);
		if (lastReadIndex === -1 || lastReadIndex >= messages.length - 1) {
			// Message not found or it's the last message - no unseen messages
			return null;
		}
		return messages[lastReadIndex + 1].id;
	}, [messages, lastReadMessageId]);

	// Scroll to the first unseen message (scroll so the bottom of that message is visible)
	const scrollToFirstUnseen = useCallback(
		(behavior: ScrollBehavior = "smooth") => {
			if (!firstUnseenMessageId) {
				// No unseen messages, scroll to bottom
				messagesEndRef.current?.scrollIntoView({ behavior });
				return;
			}

			const container = scrollContainerRef.current;
			if (!container) return;

			// Find the message element using data-message-id attribute
			const messageElement = container.querySelector(`[data-message-id="${firstUnseenMessageId}"]`);

			if (messageElement) {
				// Scroll so the bottom of the message is visible (block: "end")
				messageElement.scrollIntoView({ behavior, block: "end" });
			} else {
				// Fallback to scrolling to bottom
				messagesEndRef.current?.scrollIntoView({ behavior });
			}
		},
		[firstUnseenMessageId],
	);

	// Initialize scroll position on mount
	const initializeScrollPosition = useCallback(() => {
		if (hasInitializedRef.current) return;
		hasInitializedRef.current = true;

		// Use requestAnimationFrame to ensure DOM is ready
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				// If there are no unread messages, scroll to bottom
				const count = getUnreadCount(messages, lastReadMessageId);
				if (count === 0 && messages.length > 0) {
					scrollToBottom("auto");
				} else {
					scrollToLastRead("auto");
				}
			});
		});
	}, [scrollToLastRead, scrollToBottom, messages, lastReadMessageId]);

	// Handle new messages - scroll to first unseen message when new messages arrive
	useEffect(() => {
		const prevCount = prevMessageCountRef.current;
		const currentCount = messages.length;
		prevMessageCountRef.current = currentCount;

		// Only handle new messages (not initial load)
		if (!hasInitializedRef.current) return;
		if (currentCount <= prevCount) return;

		// Check if the new message is from assistant (not user's own message)
		const newMessage = messages[messages.length - 1];
		if (!newMessage || newMessage.role === "user") return;

		// Scroll to the first unseen message so it becomes visible
		if (isWidgetOpen) {
			requestAnimationFrame(() => {
				scrollToFirstUnseen("smooth");
			});
		}
	}, [messages, isWidgetOpen, scrollToFirstUnseen]);

	return {
		scrollContainerRef,
		lastReadMessageRef,
		messagesEndRef,
		lastReadMessageId,
		firstUnseenMessageId,
		unreadCount,
		isAtBottom,
		handleScroll,
		scrollToLastRead,
		scrollToBottom,
		scrollToFirstUnseen,
		markAllAsRead,
		initializeScrollPosition,
	};
}
