/**
 * Unread message tracking using localStorage
 * Tracks the last read message ID to calculate unread count and scroll position
 */

const STORAGE_PREFIX = "ansa_unread_";

interface UnreadStorageData {
	lastReadMessageId: string;
	timestamp: number;
}

/**
 * Get the storage key for unread tracking
 */
function getStorageKey(agentId: string): string {
	return `${STORAGE_PREFIX}${agentId}`;
}

/**
 * Save the last read message ID to localStorage
 */
export function saveLastReadMessageId(agentId: string, messageId: string): void {
	const key = getStorageKey(agentId);
	const data: UnreadStorageData = {
		lastReadMessageId: messageId,
		timestamp: Date.now(),
	};

	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.warn("[ansa] Failed to save unread state to localStorage:", error);
	}
}

/**
 * Load the last read message ID from localStorage
 */
export function getLastReadMessageId(agentId: string): string | null {
	const key = getStorageKey(agentId);

	try {
		const stored = localStorage.getItem(key);
		if (!stored) return null;

		const data = JSON.parse(stored) as UnreadStorageData;

		// Expire after 24 hours (matches conversation expiry)
		const maxAge = 24 * 60 * 60 * 1000;
		if (Date.now() - data.timestamp > maxAge) {
			clearLastReadMessageId(agentId);
			return null;
		}

		return data.lastReadMessageId;
	} catch (error) {
		console.warn("[ansa] Failed to load unread state from localStorage:", error);
		return null;
	}
}

/**
 * Clear the last read message ID from localStorage
 */
export function clearLastReadMessageId(agentId: string): void {
	const key = getStorageKey(agentId);

	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn("[ansa] Failed to clear unread state from localStorage:", error);
	}
}

/**
 * Calculate the number of unread assistant messages
 * Counts assistant messages that appear after the lastReadMessageId
 */
export function getUnreadCount(
	messages: Array<{ id: string; role: "user" | "assistant" }>,
	lastReadMessageId: string | null,
): number {
	if (messages.length === 0) return 0;

	// If no lastReadMessageId, all assistant messages are unread
	if (!lastReadMessageId) {
		return messages.filter((m) => m.role === "assistant").length;
	}

	// Find the index of the last read message
	const lastReadIndex = messages.findIndex((m) => m.id === lastReadMessageId);

	// If lastReadMessageId not found (message deleted?), treat all as unread
	if (lastReadIndex === -1) {
		return messages.filter((m) => m.role === "assistant").length;
	}

	// Count assistant messages after the last read message
	const unreadMessages = messages.slice(lastReadIndex + 1);
	return unreadMessages.filter((m) => m.role === "assistant").length;
}

/**
 * Find the index of the last read message in the messages array
 * Returns -1 if not found (should scroll to bottom)
 */
export function getLastReadMessageIndex(
	messages: Array<{ id: string }>,
	lastReadMessageId: string | null,
): number {
	if (!lastReadMessageId || messages.length === 0) return -1;
	return messages.findIndex((m) => m.id === lastReadMessageId);
}
