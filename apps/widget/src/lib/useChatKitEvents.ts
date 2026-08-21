import type React from "react";
import { useEffect } from "react";
import type { Socket } from "socket.io-client";

interface ChatKitEventHandlers {
	onMessageStart?: (data: { message: { id: string; role: string } }) => void;
	onContentBlockStart?: (data: {
		index: number;
		content_block: { type: string; text: string };
	}) => void;
	onContentBlockDelta?: (data: { index: number; delta: { type: string; text: string } }) => void;
	onContentClear?: (data: { type: string }) => void;
	onContentBlockStop?: (data: { index: number }) => void;
	onToolUse?: (data: {
		type: string;
		tool: string;
		input: unknown;
		result: unknown;
		displayConfig?: unknown;
		isFormTool?: boolean;
		toolId?: string;
		formSchema?: unknown;
		formExecutionMode?: string;
		formClientHandler?: string;
		formPostActions?: unknown[];
		toolArgs?: unknown;
		isError?: boolean;
		errorMessage?: string;
	}) => void;
	onMessageStop?: (data: {
		type: string;
		conversationId?: string;
		metadata?: Record<string, unknown>;
	}) => void;
	onError?: (data: { error: { message: string } }) => void;
	onMessageDelivered?: (data: {
		messageId: string;
		conversationId: string;
		sequenceId: number;
		timestamp: Date;
	}) => void;
	onUserTyping?: (data: {
		conversationId: string;
		userId: string;
		userName?: string;
		role: "user" | "agent";
		isTyping: boolean;
	}) => void;
	onAgentViewing?: (data: {
		conversationId: string;
		viewers: Array<{
			userId: string;
			userName?: string;
			role: "user" | "agent";
		}>;
	}) => void;
	onAgentJoined?: (data: {
		conversationId: string;
		agentId: string;
		userName: string;
		agentStatus: string;
	}) => void;
	onEscalationRequested?: (data: { conversationId: string; reason?: string }) => void;
	onMessagesReplay?: (data: {
		messages: Array<{
			id: string;
			role: "user" | "assistant";
			content: string;
			createdAt: Date;
			metadata?: unknown;
			toolBlocks?: unknown;
		}>;
	}) => void;
	onRateLimitExceeded?: (data: { retryAfter: number }) => void;
}

export function useChatKitEvents(
	socket: Socket | null,
	isStreamingRef: React.MutableRefObject<boolean>,
	handlers: ChatKitEventHandlers,
) {
	useEffect(() => {
		if (!socket) return;

		// ChatKit protocol events - skip during HTTP streaming to avoid duplicates
		if (handlers.onMessageStart) {
			socket.on("message_start", (data) => {
				if (!isStreamingRef.current) handlers.onMessageStart?.(data);
			});
		}
		if (handlers.onContentBlockStart) {
			socket.on("content_block_start", (data) => {
				if (!isStreamingRef.current) handlers.onContentBlockStart?.(data);
			});
		}
		if (handlers.onContentBlockDelta) {
			socket.on("content_block_delta", (data) => {
				if (!isStreamingRef.current) handlers.onContentBlockDelta?.(data);
			});
		}
		if (handlers.onContentClear) {
			socket.on("content_clear", (data) => {
				if (!isStreamingRef.current) handlers.onContentClear?.(data);
			});
		}
		if (handlers.onContentBlockStop) {
			socket.on("content_block_stop", (data) => {
				if (!isStreamingRef.current) handlers.onContentBlockStop?.(data);
			});
		}
		if (handlers.onToolUse) {
			socket.on("tool_use", (data) => {
				if (!isStreamingRef.current) handlers.onToolUse?.(data);
			});
		}
		if (handlers.onMessageStop) {
			socket.on("message_stop", (data) => {
				if (!isStreamingRef.current) handlers.onMessageStop?.(data);
			});
		}
		if (handlers.onError) {
			socket.on("error", (data) => {
				if (!isStreamingRef.current) handlers.onError?.(data);
			});
		}

		// Custom events
		if (handlers.onMessageDelivered) {
			socket.on("message-delivered", handlers.onMessageDelivered);
		}
		if (handlers.onUserTyping) {
			socket.on("user-typing", handlers.onUserTyping);
		}
		if (handlers.onAgentViewing) {
			socket.on("agent-viewing-update", handlers.onAgentViewing);
		}
		if (handlers.onAgentJoined) {
			socket.on("agent-joined", handlers.onAgentJoined);
		}
		if (handlers.onEscalationRequested) {
			socket.on("escalation-requested", handlers.onEscalationRequested);
		}
		if (handlers.onMessagesReplay) {
			socket.on("messages-replay", handlers.onMessagesReplay);
		}
		if (handlers.onRateLimitExceeded) {
			socket.on("rate-limit-exceeded", handlers.onRateLimitExceeded);
		}

		// Cleanup listeners on unmount
		return () => {
			socket.off("message_start");
			socket.off("content_block_start");
			socket.off("content_block_delta");
			socket.off("content_clear");
			socket.off("content_block_stop");
			socket.off("tool_use");
			socket.off("message_stop");
			socket.off("error");
			socket.off("message-delivered");
			socket.off("user-typing");
			socket.off("agent-viewing-update");
			socket.off("agent-joined");
			socket.off("escalation-requested");
			socket.off("messages-replay");
			socket.off("rate-limit-exceeded");
		};
	}, [socket]); // Removed 'handlers' from dependencies to prevent re-attaching listeners on every render
}
