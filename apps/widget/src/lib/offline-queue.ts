/**
 * Offline Message Queue
 *
 * Manages messages sent while disconnected:
 * - Stores in localStorage
 * - Auto-retries on reconnection with exponential backoff
 * - Deduplicates messages
 * - Tracks retry attempts
 */

interface QueuedMessage {
	id: string;
	content: string;
	conversationId?: string;
	agentId: string;
	timestamp: number;
	retryCount: number;
	lastAttempt?: number;
	userIdentity?: {
		userId?: string;
		userMetadata?: Record<string, unknown>;
	};
	context?: {
		messages: Array<{ role: string; content: string }>;
		initialMessage?: string;
	};
}

interface QueueConfig {
	maxRetries: number;
	baseDelay: number; // Base delay in ms for exponential backoff
	maxDelay: number; // Maximum delay between retries
	storageKey: string;
}

const DEFAULT_CONFIG: QueueConfig = {
	maxRetries: 5,
	baseDelay: 1000, // 1 second
	maxDelay: 30000, // 30 seconds
	storageKey: "ansa_offline_queue",
};

export class OfflineMessageQueue {
	private config: QueueConfig;
	private processingQueue = false;

	constructor(config?: Partial<QueueConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	/**
	 * Add a message to the queue
	 */
	enqueue(message: Omit<QueuedMessage, "timestamp" | "retryCount">): void {
		try {
			const queue = this.getQueue();

			// Check if message already exists (deduplication)
			if (queue.some((msg) => msg.id === message.id)) {
				console.log("[OfflineQueue] Message already queued:", message.id);
				return;
			}

			const queuedMessage: QueuedMessage = {
				...message,
				timestamp: Date.now(),
				retryCount: 0,
			};

			queue.push(queuedMessage);
			this.saveQueue(queue);

			console.log("[OfflineQueue] Enqueued message:", message.id);
		} catch (error) {
			console.error("[OfflineQueue] Failed to enqueue message:", error);
		}
	}

	/**
	 * Remove a message from the queue
	 */
	dequeue(messageId: string): void {
		try {
			const queue = this.getQueue();
			const filtered = queue.filter((msg) => msg.id !== messageId);

			if (filtered.length < queue.length) {
				this.saveQueue(filtered);
				console.log("[OfflineQueue] Dequeued message:", messageId);
			}
		} catch (error) {
			console.error("[OfflineQueue] Failed to dequeue message:", error);
		}
	}

	/**
	 * Get all queued messages
	 */
	getQueue(): QueuedMessage[] {
		try {
			const stored = localStorage.getItem(this.config.storageKey);
			if (!stored) return [];

			const queue = JSON.parse(stored) as QueuedMessage[];

			// Filter out expired messages (older than 24 hours)
			const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
			return queue.filter((msg) => msg.timestamp > dayAgo);
		} catch (error) {
			console.error("[OfflineQueue] Failed to read queue:", error);
			return [];
		}
	}

	/**
	 * Save queue to localStorage
	 */
	private saveQueue(queue: QueuedMessage[]): void {
		try {
			localStorage.setItem(this.config.storageKey, JSON.stringify(queue));
		} catch (error) {
			console.error("[OfflineQueue] Failed to save queue:", error);
		}
	}

	/**
	 * Calculate backoff delay based on retry count
	 */
	private getBackoffDelay(retryCount: number): number {
		const delay = Math.min(this.config.baseDelay * 2 ** retryCount, this.config.maxDelay);
		return delay;
	}

	/**
	 * Check if a message is ready to retry
	 */
	private isReadyToRetry(message: QueuedMessage): boolean {
		if (message.retryCount >= this.config.maxRetries) {
			return false;
		}

		if (!message.lastAttempt) {
			return true;
		}

		const backoffDelay = this.getBackoffDelay(message.retryCount);
		const timeSinceLastAttempt = Date.now() - message.lastAttempt;

		return timeSinceLastAttempt >= backoffDelay;
	}

	/**
	 * Process the queue by sending all ready messages
	 */
	async processQueue(
		apiUrl: string,
		onSuccess?: (messageId: string) => void,
		onError?: (messageId: string, error: Error) => void,
	): Promise<void> {
		if (this.processingQueue) {
			console.log("[OfflineQueue] Already processing queue");
			return;
		}

		this.processingQueue = true;

		try {
			const queue = this.getQueue();
			const readyMessages = queue.filter((msg) => this.isReadyToRetry(msg));

			if (readyMessages.length === 0) {
				console.log("[OfflineQueue] No messages ready to process");
				return;
			}

			console.log(`[OfflineQueue] Processing ${readyMessages.length} messages`);

			// Process messages in order
			for (const message of readyMessages) {
				try {
					await this.sendMessage(message, apiUrl);

					// Success - remove from queue
					this.dequeue(message.id);
					onSuccess?.(message.id);

					console.log("[OfflineQueue] Successfully sent message:", message.id);
				} catch (error) {
					// Failure - update retry count
					this.updateRetryCount(message.id);
					onError?.(message.id, error as Error);

					console.error(
						`[OfflineQueue] Failed to send message ${message.id} (attempt ${message.retryCount + 1}):`,
						error,
					);
				}
			}
		} finally {
			this.processingQueue = false;
		}
	}

	/**
	 * Update retry count and last attempt timestamp
	 */
	private updateRetryCount(messageId: string): void {
		try {
			const queue = this.getQueue();
			const message = queue.find((msg) => msg.id === messageId);

			if (message) {
				message.retryCount++;
				message.lastAttempt = Date.now();

				// Remove if max retries exceeded
				if (message.retryCount >= this.config.maxRetries) {
					console.warn(`[OfflineQueue] Message ${messageId} exceeded max retries, removing`);
					this.dequeue(messageId);
				} else {
					this.saveQueue(queue);
				}
			}
		} catch (error) {
			console.error("[OfflineQueue] Failed to update retry count:", error);
		}
	}

	/**
	 * Send a message to the API
	 */
	private async sendMessage(message: QueuedMessage, apiUrl: string): Promise<void> {
		const response = await fetch(`${apiUrl}/chat`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				messages: message.context?.messages || [{ role: "user", content: message.content }],
				agentId: message.agentId,
				conversationId: message.conversationId,
				userIdentity: message.userIdentity,
				messageId: message.id, // Include original message ID for deduplication
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		// We don't need to process the streaming response for queued messages
		// The WebSocket will handle real-time updates
		await response.body?.cancel();
	}

	/**
	 * Get the number of pending messages
	 */
	getPendingCount(): number {
		return this.getQueue().length;
	}

	/**
	 * Clear all queued messages
	 */
	clear(): void {
		try {
			localStorage.removeItem(this.config.storageKey);
			console.log("[OfflineQueue] Queue cleared");
		} catch (error) {
			console.error("[OfflineQueue] Failed to clear queue:", error);
		}
	}

	/**
	 * Get messages that have exceeded max retries
	 */
	getFailedMessages(): QueuedMessage[] {
		return this.getQueue().filter((msg) => msg.retryCount >= this.config.maxRetries);
	}
}

// Singleton instance - use function instead of top-level to avoid initialization issues
export function getOfflineQueue(config?: Partial<QueueConfig>): OfflineMessageQueue {
	// Use a module-scoped variable that's initialized on first access
	if (typeof window === "undefined") {
		// SSR safety - return a dummy instance
		return new OfflineMessageQueue(config);
	}

	// Store in window to ensure true singleton across all imports
	if (!(window as any).__ansaOfflineQueue) {
		(window as any).__ansaOfflineQueue = new OfflineMessageQueue(config);
	}
	return (window as any).__ansaOfflineQueue;
}
