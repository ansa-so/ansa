import type { ConnectionState } from "@ansa/types";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

interface UseSocketOptions {
	url: string;
	conversationId?: string;
	userId?: string;
	onConnectionChange?: (state: ConnectionState) => void;
	onReconnect?: () => void;
}

// Singleton socket instance per URL
const socketInstances = new Map<string, Socket>();

function getOrCreateSocket(url: string): Socket {
	const key = `${url}/conversations`;

	if (!socketInstances.has(key)) {
		const socket = io(key, {
			transports: ["websocket", "polling"],
			reconnection: true,
			reconnectionDelay: 1000,
			reconnectionDelayMax: 30000,
			reconnectionAttempts: Number.POSITIVE_INFINITY,
		});
		socketInstances.set(key, socket);
	}

	return socketInstances.get(key)!;
}

export function useSocket({
	url,
	conversationId,
	userId,
	onConnectionChange,
	onReconnect,
}: UseSocketOptions) {
	const socketRef = useRef<Socket | null>(null);
	const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
	const reconnectAttempts = useRef(0);
	const currentConversationRef = useRef<string | undefined>(conversationId);
	const conversationIdRef = useRef(conversationId);
	const userIdRef = useRef(userId);
	const listenersAttached = useRef(false);

	// Use refs for callbacks to avoid dependency issues
	const onConnectionChangeRef = useRef(onConnectionChange);
	const onReconnectRef = useRef(onReconnect);

	// Update refs when values change
	useEffect(() => {
		onConnectionChangeRef.current = onConnectionChange;
		onReconnectRef.current = onReconnect;
		conversationIdRef.current = conversationId;
		userIdRef.current = userId;
	});

	// Handle conversation room changes without reconnecting socket
	useEffect(() => {
		const socket = socketRef.current;
		if (!socket || !socket.connected) return;

		// Leave old room if we had one
		if (currentConversationRef.current && currentConversationRef.current !== conversationId) {
			socket.emit("leave-conversation", {
				conversationId: currentConversationRef.current,
			});
		}

		// Join new room if we have a conversation ID
		if (conversationId) {
			socket.emit("join-conversation", { conversationId, userId });
		}

		currentConversationRef.current = conversationId;
	}, [conversationId, userId]);

	useEffect(() => {
		// Get or create singleton socket instance
		const socket = getOrCreateSocket(url);
		socketRef.current = socket;

		// Set initial connection state
		setConnectionState(socket.connected ? "connected" : "disconnected");

		// Only attach listeners once per socket instance
		if (!listenersAttached.current) {
			listenersAttached.current = true;

			// Connection event handlers
			socket.on("connect", () => {
				setConnectionState("connected");
				onConnectionChangeRef.current?.("connected");
				reconnectAttempts.current = 0;

				// Join conversation room if we have a conversation ID
				const currentConversationId = conversationIdRef.current;
				const currentUserId = userIdRef.current;
				if (currentConversationId) {
					socket.emit("join-conversation", {
						conversationId: currentConversationId,
						userId: currentUserId,
					});
					currentConversationRef.current = currentConversationId;
				}
			});

			socket.on("disconnect", (reason) => {
				setConnectionState("disconnected");
				onConnectionChangeRef.current?.("disconnected");
			});

			socket.on("connect_error", (error) => {
				console.error("Socket connection error:", error);
				setConnectionState("reconnecting");
				onConnectionChangeRef.current?.("reconnecting");
				reconnectAttempts.current += 1;
			});

			socket.io.on("reconnect_attempt", () => {
				setConnectionState("reconnecting");
				onConnectionChangeRef.current?.("reconnecting");
			});

			socket.io.on("reconnect", () => {
				setConnectionState("connected");
				onConnectionChangeRef.current?.("connected");
				onReconnectRef.current?.();

				// Rejoin conversation room
				const currentConversationId = conversationIdRef.current;
				const currentUserId = userIdRef.current;
				if (currentConversationId) {
					socket.emit("join-conversation", {
						conversationId: currentConversationId,
						userId: currentUserId,
					});
					currentConversationRef.current = currentConversationId;
				}
			});

			socket.io.on("reconnect_failed", () => {
				console.error("Reconnection failed");
				setConnectionState("disconnected");
				onConnectionChangeRef.current?.("disconnected");
			});
		}

		// If socket is already connected, join room immediately
		if (socket.connected && conversationId) {
			socket.emit("join-conversation", { conversationId, userId });
			currentConversationRef.current = conversationId;
		}

		// Don't disconnect on unmount - keep singleton alive
		return () => {
			// Only leave the conversation room, don't disconnect
			if (currentConversationRef.current) {
				socket.emit("leave-conversation", {
					conversationId: currentConversationRef.current,
				});
			}
		};
	}, [url]);

	const reconnect = useCallback(() => {
		const socket = socketRef.current;
		if (socket && !socket.connected) {
			socket.connect();
		}
	}, []);

	return {
		socket: socketRef.current,
		connectionState,
		isConnected: connectionState === "connected",
		reconnect,
	};
}
