import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { attachments, chatMessages, conversations, eq, getDb } from "@ansa/db";
import { Hono } from "hono";
import { trackServerEvent } from "../lib/analytics";

const attachments_route = new Hono();

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const UPLOADS_DIR = process.env.UPLOADS_DIR || join(process.cwd(), "uploads", "attachments");
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	"application/pdf",
	"application/msword",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"text/plain",
];

// Ensure uploads directory exists
async function ensureUploadsDir() {
	try {
		await access(UPLOADS_DIR);
	} catch {
		await mkdir(UPLOADS_DIR, { recursive: true });
	}
}

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Helper to verify message belongs to user's conversation
async function verifyMessageAccess(messageId: string, userId: string): Promise<boolean> {
	const db = getDb();
	const [message] = await db
		.select({ conversationId: chatMessages.conversationId })
		.from(chatMessages)
		.where(eq(chatMessages.id, messageId));

	if (!message) return false;

	const [conversation] = await db
		.select({ userId: conversations.userId })
		.from(conversations)
		.where(eq(conversations.id, message.conversationId));

	return conversation?.userId === userId;
}

// Map internal event names to ServerEvent type and track via PostHog
function trackAttachmentEvent(event: string, data: Record<string, unknown> & { userId?: string }) {
	const eventMap: Record<
		string,
		| "attachment_uploaded"
		| "attachment_upload_failed"
		| "attachment_downloaded"
		| "attachment_download_failed"
		| "attachment_viewed"
		| "attachment_deleted"
	> = {
		upload_success: "attachment_uploaded",
		upload_failed: "attachment_upload_failed",
		download_success: "attachment_downloaded",
		download_failed: "attachment_download_failed",
		attachments_viewed: "attachment_viewed",
		delete_success: "attachment_deleted",
	};
	const serverEvent = eventMap[event];
	if (serverEvent && data.userId) {
		trackServerEvent(serverEvent, data.userId as string, data);
	}
}

// Upload attachment for a message (Paperclip)
attachments_route.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const formData = await c.req.formData();
	const file = formData.get("file");
	const messageId = formData.get("messageId") as string;

	if (!messageId) {
		return c.json({ error: "messageId required" }, 400);
	}

	if (!(await verifyMessageAccess(messageId, userId))) {
		return c.json({ error: "Message not found" }, 404);
	}

	if (!file || !(file instanceof File)) {
		return c.json({ error: "file required" }, 400);
	}

	if (file.size > MAX_ATTACHMENT_SIZE) {
		await trackAttachmentEvent("upload_failed", {
			userId,
			messageId,
			reason: "file_too_large",
			fileSize: file.size,
			fileName: file.name,
		});
		return c.json({ error: "File too large (max 10MB)" }, 400);
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		await trackAttachmentEvent("upload_failed", {
			userId,
			messageId,
			reason: "invalid_file_type",
			fileType: file.type,
			fileName: file.name,
		});
		return c.json(
			{
				error: "Unsupported file type. Allowed: images, PDF, Word docs, text files",
			},
			400,
		);
	}

	await ensureUploadsDir();

	// Generate unique filename
	const fileExtension = file.name.split(".").pop() || "bin";
	const uniqueFilename = `${randomUUID()}.${fileExtension}`;
	const filePath = join(UPLOADS_DIR, uniqueFilename);

	// Save file
	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(filePath, buffer);

	const db = getDb();

	// Create attachment record
	const [attachment] = await db
		.insert(attachments)
		.values({
			messageId,
			filename: file.name,
			contentType: file.type,
			fileSize: file.size,
			filePath: uniqueFilename, // Store relative path
			uploadedBy: userId,
		})
		.returning();

	// Track successful upload
	await trackAttachmentEvent("upload_success", {
		userId,
		messageId,
		attachmentId: attachment.id,
		fileName: file.name,
		fileType: file.type,
		fileSize: file.size,
		contentCategory: file.type.split("/")[0], // image, application, text
	});

	return c.json({
		id: attachment.id,
		filename: attachment.filename,
		contentType: attachment.contentType,
		fileSize: attachment.fileSize,
		createdAt: attachment.createdAt,
	});
});

// Get attachments for a message
attachments_route.get("/message/:messageId", async (c) => {
	const messageId = c.req.param("messageId");
	const userId = getUserId(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	if (!(await verifyMessageAccess(messageId, userId))) {
		return c.json({ error: "Message not found" }, 404);
	}

	const db = getDb();
	const messageAttachments = await db
		.select({
			id: attachments.id,
			filename: attachments.filename,
			contentType: attachments.contentType,
			fileSize: attachments.fileSize,
			createdAt: attachments.createdAt,
		})
		.from(attachments)
		.where(eq(attachments.messageId, messageId))
		.orderBy(attachments.createdAt);

	await trackAttachmentEvent("attachments_viewed", {
		userId,
		messageId,
		attachmentCount: messageAttachments.length,
	});

	return c.json(messageAttachments);
});

// Download attachment
attachments_route.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Get attachment and verify access
	const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));

	if (!attachment) {
		return c.json({ error: "Attachment not found" }, 404);
	}

	if (!(await verifyMessageAccess(attachment.messageId, userId))) {
		return c.json({ error: "Access denied" }, 403);
	}

	// Read and return file
	const filePath = join(UPLOADS_DIR, attachment.filePath);
	try {
		const fileContent = await readFile(filePath);

		// Track download
		await trackAttachmentEvent("download_success", {
			userId,
			attachmentId: id,
			fileName: attachment.filename,
			fileType: attachment.contentType,
			fileSize: attachment.fileSize,
		});

		return new Response(fileContent, {
			headers: {
				"Content-Type": attachment.contentType,
				"Content-Disposition": `attachment; filename="${attachment.filename}"`,
				"Content-Length": attachment.fileSize.toString(),
			},
		});
	} catch (error) {
		console.error("Error reading attachment file:", error);

		await trackAttachmentEvent("download_failed", {
			userId,
			attachmentId: id,
			reason: "file_not_found",
			error: error instanceof Error ? error.message : String(error),
		});

		return c.json({ error: "File not found" }, 404);
	}
});

// Delete attachment
attachments_route.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);

	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Get attachment and verify access
	const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id));

	if (!attachment) {
		return c.json({ error: "Attachment not found" }, 404);
	}

	if (!(await verifyMessageAccess(attachment.messageId, userId))) {
		return c.json({ error: "Access denied" }, 403);
	}

	// Delete file from filesystem
	const filePath = join(UPLOADS_DIR, attachment.filePath);
	try {
		await unlink(filePath);
	} catch (error) {
		console.error("Error deleting attachment file:", error);
		// Continue with database deletion even if file deletion fails
	}

	// Delete database record
	await db.delete(attachments).where(eq(attachments.id, id));

	// Track deletion
	await trackAttachmentEvent("delete_success", {
		userId,
		attachmentId: id,
		fileName: attachment.filename,
		fileType: attachment.contentType,
	});

	return c.json({ deleted: true });
});

export { attachments_route };
