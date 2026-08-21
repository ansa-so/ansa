import type { Namespace } from "socket.io";

let conversationsNamespace: Namespace | null = null;

export function setConversationsNamespace(namespace: Namespace): void {
	conversationsNamespace = namespace;
}

export function getConversationsNamespace(): Namespace | null {
	return conversationsNamespace;
}

// Helper to emit events to a conversation room
export function emitToConversation(conversationId: string, event: string, data: unknown): void {
	if (conversationsNamespace) {
		conversationsNamespace.to(conversationId).emit(event, data);
	} else {
		console.warn("Conversations namespace not initialized");
	}
}
