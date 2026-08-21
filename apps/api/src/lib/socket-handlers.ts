import type {
	AgentJoinEvent,
	AgentStatusChangeEvent,
	EscalationEvent,
	TypingEvent,
} from "@ansa/types";
import type { Namespace, Socket } from "socket.io";
import { agentStatusManager } from "./agent-status.js";
import { handleMessageReplay } from "./message-replay.js";
import { presenceTracker } from "./presence-tracker.js";

// Rate limiting using token bucket algorithm
interface TokenBucket {
	tokens: number;
	lastRefill: number;
	maxTokens: number;
	refillRate: number; // tokens per second
}

const rateLimiters = new Map<
	string,
	{
		messages: TokenBucket;
		typing: TokenBucket;
		overall: TokenBucket;
	}
>();

function createTokenBucket(maxTokens: number, refillRate: number): TokenBucket {
	return {
		tokens: maxTokens,
		lastRefill: Date.now(),
		maxTokens,
		refillRate,
	};
}

function consumeToken(bucket: TokenBucket): boolean {
	const now = Date.now();
	const timePassed = (now - bucket.lastRefill) / 1000;
	const tokensToAdd = timePassed * bucket.refillRate;

	bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
	bucket.lastRefill = now;

	if (bucket.tokens >= 1) {
		bucket.tokens -= 1;
		return true;
	}
	return false;
}

function getRateLimiter(socketId: string) {
	if (!rateLimiters.has(socketId)) {
		rateLimiters.set(socketId, {
			messages: createTokenBucket(10, 10 / 60), // 10 per minute
			typing: createTokenBucket(3, 3), // 3 per second
			overall: createTokenBucket(50, 50 / 60), // 50 per minute
		});
	}
	return rateLimiters.get(socketId)!;
}

function cleanupRateLimiter(socketId: string) {
	rateLimiters.delete(socketId);
}

// In-memory message deduplication cache
const messageCache = new Map<string, number>();
const DEDUPLICATION_WINDOW = 5 * 60 * 1000; // 5 minutes

function isDuplicateMessage(conversationId: string, content: string): boolean {
	const key = `${conversationId}:${content}`;
	const timestamp = messageCache.get(key);

	if (timestamp && Date.now() - timestamp < DEDUPLICATION_WINDOW) {
		return true;
	}

	messageCache.set(key, Date.now());

	// Cleanup old entries periodically
	if (messageCache.size > 1000) {
		const now = Date.now();
		for (const [k, ts] of messageCache.entries()) {
			if (now - ts > DEDUPLICATION_WINDOW) {
				messageCache.delete(k);
			}
		}
	}

	return false;
}

// In-memory metrics
export const socketMetrics = {
	activeConnections: 0,
	totalEvents: 0,
	eventCounts: {
		messages: 0,
		typing: 0,
		escalations: 0,
		agentJoins: 0,
	},
	errors: 0,
	reconnections: 0,
};

export function setupSocketHandlers(
	conversationsNamespace: Namespace,
	dashboardNamespace: Namespace,
) {
	// Conversations namespace - for widget and dashboard to join specific conversations
	conversationsNamespace.on("connection", (socket: Socket) => {
		console.log(`Socket connected to /conversations: ${socket.id}`);
		socketMetrics.activeConnections++;

		// Join conversation room
		socket.on("join-conversation", async ({ conversationId, userId, userName }) => {
			try {
				const limiter = getRateLimiter(socket.id);
				if (!consumeToken(limiter.overall)) {
					socket.emit("rate-limit-exceeded", { retryAfter: 60 });
					return;
				}

				socket.join(conversationId);
				console.log(`Socket ${socket.id} joined conversation ${conversationId}`);

				// Track presence - determine role based on userId pattern or default to user
				const role =
					userId?.startsWith("agent-") || userId?.includes("dashboard") ? "agent" : "user";
				presenceTracker.addViewer(conversationId, socket.id, userId || "anonymous", role, userName);

				// Broadcast updated presence to room
				const viewers = presenceTracker.getViewers(conversationId);
				conversationsNamespace.to(conversationId).emit("agent-viewing-update", {
					conversationId,
					viewers,
				});
			} catch (error) {
				console.error("Error joining conversation:", error);
				socket.emit("error", { type: "error", error: { message: "Failed to join conversation" } });
			}
		});

		// Typing indicators
		socket.on("typing-start", (data: Omit<TypingEvent, "isTyping">) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.typing) || !consumeToken(limiter.overall)) {
				return; // Silently drop if rate limited
			}

			socketMetrics.eventCounts.typing++;
			socketMetrics.totalEvents++;

			const typingEvent: TypingEvent = { ...data, isTyping: true };
			socket.to(data.conversationId).emit("user-typing", typingEvent);
		});

		socket.on("typing-stop", (data: Omit<TypingEvent, "isTyping">) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.typing) || !consumeToken(limiter.overall)) {
				return;
			}

			const typingEvent: TypingEvent = { ...data, isTyping: false };
			socket.to(data.conversationId).emit("user-typing", typingEvent);
		});

		// Escalation
		socket.on("escalate-conversation", (data: EscalationEvent) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.overall)) {
				socket.emit("rate-limit-exceeded", { retryAfter: 60 });
				return;
			}

			socketMetrics.eventCounts.escalations++;
			socketMetrics.totalEvents++;

			// Broadcast to dashboard agents
			dashboardNamespace.emit("escalation-requested", data);

			// Also broadcast to conversation room
			conversationsNamespace.to(data.conversationId).emit("escalation-requested", data);
		});

		// Agent join
		socket.on(
			"agent-join",
			async (data: Omit<AgentJoinEvent, "userName" | "agentStatus"> & { userName?: string }) => {
				const limiter = getRateLimiter(socket.id);
				if (!consumeToken(limiter.overall)) {
					socket.emit("rate-limit-exceeded", { retryAfter: 60 });
					return;
				}

				socketMetrics.eventCounts.agentJoins++;
				socketMetrics.totalEvents++;

				const { conversationId, agentId, userName: providedUserName } = data;

				// Get agent status
				const status = agentStatusManager.getStatus(agentId);

				// Use provided user name or fallback to "Agent"
				const userName = providedUserName || "Agent";

				// Track presence with user name
				presenceTracker.addViewer(conversationId, socket.id, agentId, "agent", userName);

				// Broadcast to conversation
				const joinEvent: AgentJoinEvent = {
					conversationId,
					agentId,
					userName,
					agentStatus: status,
				};
				conversationsNamespace.to(conversationId).emit("agent-joined", joinEvent);

				// Update presence
				const viewers = presenceTracker.getViewers(conversationId);
				conversationsNamespace.to(conversationId).emit("agent-viewing-update", {
					conversationId,
					viewers,
				});
			},
		);

		// Agent viewing heartbeat
		socket.on("agent-viewing", ({ conversationId }) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.overall)) {
				return; // Silently drop
			}

			// Refresh presence (updates lastSeen)
			presenceTracker.refreshViewer(conversationId, socket.id);
		});

		// Agent status change
		socket.on("agent-status-change", (data: AgentStatusChangeEvent) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.overall)) {
				return;
			}

			agentStatusManager.setStatus(data.agentId, data.status);

			// Broadcast to dashboard
			dashboardNamespace.emit("agent-status-changed", data);
		});

		// Message replay for reconnection
		socket.on("get-messages-since", async (data) => {
			const limiter = getRateLimiter(socket.id);
			if (!consumeToken(limiter.overall)) {
				socket.emit("rate-limit-exceeded", { retryAfter: 60 });
				return;
			}

			try {
				await handleMessageReplay(socket, data);
			} catch (error) {
				console.error("Error replaying messages:", error);
				socket.emit("error", { type: "error", error: { message: "Failed to replay messages" } });
			}
		});

		// Disconnect handling
		socket.on("disconnect", () => {
			console.log(`Socket disconnected from /conversations: ${socket.id}`);
			socketMetrics.activeConnections--;

			// Remove from presence tracking
			presenceTracker.removeViewer(socket.id);

			// Cleanup rate limiter after grace period
			setTimeout(() => {
				cleanupRateLimiter(socket.id);
			}, 30000); // 30 second grace period
		});
	});

	// Dashboard namespace - for dashboard-specific events
	dashboardNamespace.on("connection", (socket: Socket) => {
		console.log(`Socket connected to /dashboard: ${socket.id}`);

		// Join agent's personal room for notifications
		socket.on("join-agent-room", ({ agentId }) => {
			socket.join(`agent:${agentId}`);
			console.log(`Socket ${socket.id} joined agent room agent:${agentId}`);

			// Update agent status to Online
			agentStatusManager.setStatus(agentId, "Online");
		});

		socket.on("disconnect", () => {
			console.log(`Socket disconnected from /dashboard: ${socket.id}`);
		});
	});

	console.log("Socket handlers configured");
}
