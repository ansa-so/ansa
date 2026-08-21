"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface DashboardSocketOptions {
	url: string;
	agentId?: string;
	userName?: string;
	conversationId?: string;
	onMessageUpdate?: (data: unknown) => void;
	onTypingUpdate?: (data: { userId: string; userName?: string; isTyping: boolean }) => void;
	onPresenceUpdate?: (data: {
		viewers: Array<{ userId: string; userName?: string; role: string }>;
	}) => void;
	onNewMessage?: (data: unknown) => void;
	onConnectionChange?: (
		state: "connected" | "connecting" | "reconnecting" | "disconnected",
	) => void;
}

export function useDashboardSocket(options: DashboardSocketOptions) {
	const [socket, setSocket] = useState<Socket | null>(null);
	const [connectionState, setConnectionState] = useState<
		"connected" | "connecting" | "reconnecting" | "disconnected"
	>("connecting");
	const [isConnected, setIsConnected] = useState(false);
	const reconnectAttempts = useRef(0);

	useEffect(() => {
		// Create socket connection to /conversations namespace (same as widget)
		// This ensures we receive typing indicators and other real-time events
		const socketInstance = io(`${options.url}/conversations`, {
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 30000,
			reconnectionAttempts: Infinity,
			timeout: 20000,
		});

		// Connection events
		socketInstance.on("connect", () => {
			setConnectionState("connected");
			setIsConnected(true);
			reconnectAttempts.current = 0;
			options.onConnectionChange?.("connected");

			// Join conversation room if specified
			if (options.conversationId) {
				socketInstance.emit("join-conversation", {
					conversationId: options.conversationId,
					userId: options.agentId || "dashboard-user",
					userName: options.userName,
				});

				// Also emit agent-join with name for presence tracking
				socketInstance.emit("agent-join", {
					conversationId: options.conversationId,
					agentId: options.agentId || "dashboard-user",
					userName: options.userName || "Agent",
				});
			}
		});

		socketInstance.on("disconnect", (_reason) => {
			setConnectionState("disconnected");
			setIsConnected(false);
			options.onConnectionChange?.("disconnected");
		});

		socketInstance.on("connect_error", (_error) => {
			reconnectAttempts.current++;
			setConnectionState("reconnecting");
			options.onConnectionChange?.("reconnecting");
		});

		socketInstance.on("reconnect", (_attemptNumber) => {
			setConnectionState("connected");
			setIsConnected(true);
			options.onConnectionChange?.("connected");
		});

		// ChatKit events for real-time message streaming
		socketInstance.on("message_start", (data) => {
			options.onMessageUpdate?.(data);
		});

		socketInstance.on("content_block_delta", (data) => {
			options.onMessageUpdate?.(data);
		});

		socketInstance.on("message_stop", (data) => {
			options.onMessageUpdate?.(data);
		});

		socketInstance.on("tool_use", (data) => {
			options.onMessageUpdate?.(data);
		});

		// Message complete (tool execution results, human agent messages)
		socketInstance.on("message_complete", (data) => {
			options.onMessageUpdate?.(data);
		});

		// Typing indicators
		socketInstance.on("user-typing", (data) => {
			if (data.role === "user") {
				options.onTypingUpdate?.(data);
			}
		});

		// Presence updates
		socketInstance.on("agent-viewing-update", (data) => {
			options.onPresenceUpdate?.(data);
		});

		// New messages (for conversation list updates)
		socketInstance.on("new-message-notification", (data) => {
			options.onNewMessage?.(data);
		});

		setSocket(socketInstance);

		return () => {
			if (options.conversationId) {
				socketInstance.emit("leave-conversation", {
					conversationId: options.conversationId,
					userId: options.agentId || "dashboard-user",
				});
			}
			socketInstance.disconnect();
		};
	}, [options.url, options.conversationId, options.agentId]);

	// Emit typing indicator
	const emitTyping = (conversationId: string, isTyping: boolean) => {
		if (socket && isConnected) {
			socket.emit(isTyping ? "typing-start" : "typing-stop", {
				conversationId,
				userId: options.agentId || "dashboard-user",
				userName: options.userName || "Agent",
				role: "agent",
			});
		}
	};

	// Emit viewing status
	const emitViewing = (conversationId: string) => {
		if (socket && isConnected) {
			socket.emit("agent-viewing", {
				conversationId,
				agentId: options.agentId || "dashboard-user",
			});
		}
	};

	// Send a message
	const sendMessage = (conversationId: string, content: string) => {
		if (socket && isConnected) {
			socket.emit("send-message", {
				conversationId,
				content,
				agentId: options.agentId || "dashboard-user",
			});
		}
	};

	return {
		socket,
		connectionState,
		isConnected,
		emitTyping,
		emitViewing,
		sendMessage,
	};
}
