import { and, asc, chatMessages, eq, getDb, gt } from "@ansa/db";
import type { Socket } from "socket.io";

export async function handleMessageReplay(
	socket: Socket,
	data: { conversationId: string; since: Date | string },
): Promise<void> {
	try {
		const { conversationId, since } = data;

		// Convert since to Date if string
		const sinceDate = typeof since === "string" ? new Date(since) : since;

		const db = getDb();

		// Query database for messages since the provided timestamp
		const messages = await db.query.chatMessages.findMany({
			where: and(
				eq(chatMessages.conversationId, conversationId),
				gt(chatMessages.createdAt, sinceDate),
			),
			orderBy: [asc(chatMessages.createdAt)],
			limit: 100,
		});

		// Transform to chat message format
		const formattedMessages = messages.map((msg) => ({
			id: msg.id,
			role: msg.role as "user" | "assistant",
			content: msg.content,
			createdAt: msg.createdAt,
			metadata: msg.metadata,
			toolBlocks: msg.toolBlocks,
			isHumanResponse: msg.isHumanResponse,
		}));

		// Send messages back to client
		socket.emit("messages-replay", {
			messages: formattedMessages,
		});

		console.log(`Replayed ${formattedMessages.length} messages for conversation ${conversationId}`);
	} catch (error) {
		console.error("Error in message replay:", error);
		throw error;
	}
}
