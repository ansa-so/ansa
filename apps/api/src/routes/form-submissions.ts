import {
	agents,
	agentTools,
	and,
	conversations,
	eq,
	formSubmissions,
	getDb,
	inArray,
	lte,
	users,
} from "@ansa/db";
import type { FormPostAction, FormSubmissionStatus } from "@ansa/types";
import { Hono } from "hono";
import { Resend } from "resend";
import { z } from "zod";
import { trackAccountEvent } from "../lib/analytics";
import { renderEmail } from "../lib/email";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const formSubmissionsRoute = new Hono();

// Special UUID for built-in satisfaction survey (not a real tool)
const SATISFACTION_SURVEY_TOOL_ID = "00000000-0000-0000-0000-000000000000";

// Max file size for base64 encoded files (5MB)
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Retry delays in milliseconds: immediate, 1 minute, 5 minutes
const RETRY_DELAYS = [0, 60 * 1000, 5 * 60 * 1000];
const MAX_RETRY_ATTEMPTS = 3;

// Helper to get userId from context (optional for widget submissions)
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Validate form submission request
const submitFormSchema = z.object({
	toolId: z.string().uuid(),
	conversationId: z.string().uuid().nullish(),
	formData: z.record(z.string(), z.unknown()),
	fieldsCompleted: z.array(z.string()),
	impressionAt: z.number().nullish(),
	startedAt: z.number().nullish(),
});

// Remove undefined values from objects (PostgreSQL doesn't accept undefined in JSON)
function sanitizeFormData(obj: Record<string, unknown>): Record<string, unknown> {
	const sanitized: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value !== undefined) {
			sanitized[key] = value;
		}
	}
	return sanitized;
}

// Submit a form
formSubmissionsRoute.post("/submit", async (c) => {
	const body = await c.req.json();
	const parsed = submitFormSchema.safeParse(body);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const data = parsed.data;
	const db = getDb();

	// Check if this is a built-in satisfaction survey (for backward compatibility)
	const isSatisfactionSurvey = data.toolId === SATISFACTION_SURVEY_TOOL_ID;

	let tool: {
		id: string;
		agentId: string;
		name: string;
		executionType: string;
		formExecutionMode: string | null;
		formWebhookUrl: string | null;
		formClientHandler: string | null;
		formPostActions: unknown;
	} | null = null;

	if (isSatisfactionSurvey) {
		// For satisfaction survey with special UUID, find the real system tool
		if (!data.conversationId) {
			return c.json({ error: "Conversation ID required for satisfaction survey" }, 400);
		}

		const [conversation] = await db
			.select({ agentId: conversations.agentId })
			.from(conversations)
			.where(eq(conversations.id, data.conversationId));

		if (!conversation) {
			return c.json({ error: "Conversation not found" }, 404);
		}

		// Query the real satisfaction survey tool from database
		const [satisfactionTool] = await db
			.select({
				id: agentTools.id,
				agentId: agentTools.agentId,
				name: agentTools.name,
				executionType: agentTools.executionType,
				formExecutionMode: agentTools.formExecutionMode,
				formWebhookUrl: agentTools.formWebhookUrl,
				formClientHandler: agentTools.formClientHandler,
				formPostActions: agentTools.formPostActions,
			})
			.from(agentTools)
			.where(
				and(
					eq(agentTools.agentId, conversation.agentId),
					eq(agentTools.name, "satisfaction_survey"),
					eq(agentTools.system, true),
				),
			);

		if (!satisfactionTool) {
			return c.json({ error: "Satisfaction survey tool not found for this agent" }, 404);
		}

		tool = satisfactionTool;
	} else {
		// Get the tool and verify it exists and is a form type
		const [foundTool] = await db
			.select({
				id: agentTools.id,
				agentId: agentTools.agentId,
				name: agentTools.name,
				executionType: agentTools.executionType,
				formExecutionMode: agentTools.formExecutionMode,
				formWebhookUrl: agentTools.formWebhookUrl,
				formClientHandler: agentTools.formClientHandler,
				formPostActions: agentTools.formPostActions,
			})
			.from(agentTools)
			.where(eq(agentTools.id, data.toolId));

		if (!foundTool) {
			return c.json({ error: "Tool not found" }, 404);
		}

		if (foundTool.executionType !== "form") {
			return c.json({ error: "Tool is not a form type" }, 400);
		}

		tool = foundTool;
	}

	// Validate file sizes in formData
	for (const [key, value] of Object.entries(data.formData)) {
		if (typeof value === "string" && value.startsWith("data:")) {
			// Base64 encoded file
			const base64Length = value.length - (value.indexOf(",") + 1);
			const fileSizeBytes = (base64Length * 3) / 4;
			if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
				return c.json(
					{
						error: `File in field "${key}" exceeds maximum size of 5MB`,
					},
					400,
				);
			}
		}
	}

	// Create the submission record
	const submissionData = {
		toolId: isSatisfactionSurvey ? tool.id : data.toolId, // Use real tool ID for satisfaction survey
		conversationId: data.conversationId ?? null,
		agentId: tool.agentId,
		formData: sanitizeFormData(data.formData),
		status: "pending" as FormSubmissionStatus,
		fieldsCompleted: data.fieldsCompleted ?? null,
		formImpressionAt: data.impressionAt ? new Date(data.impressionAt) : null,
		formStartedAt: data.startedAt ? new Date(data.startedAt) : null,
		formSubmittedAt: new Date(),
	};

	// Check for undefined values
	const undefinedFields = Object.entries(submissionData)
		.filter(([_, value]) => value === undefined)
		.map(([key]) => key);
	if (undefinedFields.length > 0) {
		console.error("[form-submissions] Undefined fields:", undefinedFields);
		console.error("[form-submissions] Data:", submissionData);
		return c.json({ error: `Internal error: undefined fields ${undefinedFields.join(", ")}` }, 500);
	}

	const [submission] = await db.insert(formSubmissions).values(submissionData).returning();

	// Determine execution mode
	const executionMode = tool.formExecutionMode || "webhook";
	let webhookResult: { success: boolean; error?: string; response?: unknown } | null = null;

	// For satisfaction surveys, just mark as submitted (no webhook needed)
	if (isSatisfactionSurvey) {
		await db
			.update(formSubmissions)
			.set({
				status: "submitted",
				updatedAt: new Date(),
			})
			.where(eq(formSubmissions.id, submission.id));
	}
	// If webhook execution is needed
	else if ((executionMode === "webhook" || executionMode === "both") && tool.formWebhookUrl) {
		webhookResult = await executeWebhook(
			tool.formWebhookUrl,
			{
				submissionId: submission.id,
				toolId: tool.id,
				toolName: tool.name,
				conversationId: data.conversationId ?? null,
				formData: sanitizeFormData(data.formData),
				submittedAt: new Date().toISOString(),
			},
			submission.id,
		);

		// Update submission with webhook result
		await db
			.update(formSubmissions)
			.set({
				status: webhookResult.success ? "webhook_success" : "webhook_failed",
				webhookAttempts: 1,
				webhookLastAttempt: new Date(),
				webhookError: webhookResult.error ?? null,
				webhookResponse: webhookResult.response ?? null,
				webhookNextRetry: webhookResult.success ? null : new Date(Date.now() + RETRY_DELAYS[1]),
				updatedAt: new Date(),
			})
			.where(eq(formSubmissions.id, submission.id));
	}
	// If client-only or both (client will handle separately)
	else if (executionMode === "client") {
		await db
			.update(formSubmissions)
			.set({
				status: "submitted",
				updatedAt: new Date(),
			})
			.where(eq(formSubmissions.id, submission.id));
	}

	// Process any configured post-submission actions (Slack, additional webhooks)
	let postActionResults: { type: string; success: boolean; error?: string }[] = [];
	const postActions = tool.formPostActions as FormPostAction[] | null;
	if (postActions && postActions.length > 0) {
		postActionResults = await processPostActions(postActions, {
			submissionId: submission.id,
			toolId: tool.id,
			toolName: tool.name,
			conversationId: data.conversationId ?? undefined,
			formData: sanitizeFormData(data.formData),
			submittedAt: new Date().toISOString(),
		});
	}

	// Determine final status based on all actions
	const webhookSucceeded = !tool.formWebhookUrl || webhookResult?.success;
	const postActionsSucceeded =
		postActionResults.length === 0 || postActionResults.every((r) => r.success);
	const allSucceeded = webhookSucceeded && postActionsSucceeded;

	// Update to final success/failed status
	let finalStatus: FormSubmissionStatus;
	if (allSucceeded) {
		if (executionMode === "webhook") {
			finalStatus = "webhook_success";
		} else if (executionMode === "client") {
			finalStatus = "submitted"; // Will be updated by client later
		} else {
			finalStatus = "webhook_success"; // "both" mode defaults to webhook
		}
	} else {
		finalStatus = executionMode === "webhook" ? "webhook_failed" : "client_failed";
	}

	await db
		.update(formSubmissions)
		.set({
			status: finalStatus,
			updatedAt: new Date(),
		})
		.where(eq(formSubmissions.id, submission.id));

	// Track form submission event (server-side)
	trackAccountEvent("form_submission_received", tool.agentId, {
		agentId: tool.agentId,
		toolId: tool.id,
		toolName: tool.name,
		isConversion: !isSatisfactionSurvey,
		formFields: data.fieldsCompleted?.length ?? 0,
	});

	return c.json({
		success: true,
		submissionId: submission.id,
		executionMode,
		webhookResult: webhookResult
			? {
					success: webhookResult.success,
					error: webhookResult.error,
				}
			: null,
		postActionResults: postActionResults.length > 0 ? postActionResults : null,
		clientHandler: executionMode !== "webhook" ? tool.formClientHandler : null,
	});
});

// Get form submissions for a conversation (widget endpoint)
formSubmissionsRoute.get("/widget/:conversationId", async (c) => {
	const conversationId = c.req.param("conversationId");

	// Validate UUID format
	const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
		conversationId,
	);
	if (!isValidUuid) {
		return c.json({ error: "Invalid conversation id" }, 400);
	}

	const db = getDb();

	// Query form submissions for this conversation with tool name
	const submissions = await db
		.select({
			id: formSubmissions.id,
			toolId: formSubmissions.toolId,
			toolName: agentTools.name,
			status: formSubmissions.status,
			formData: formSubmissions.formData,
			formSubmittedAt: formSubmissions.formSubmittedAt,
			webhookResponse: formSubmissions.webhookResponse,
		})
		.from(formSubmissions)
		.leftJoin(agentTools, eq(formSubmissions.toolId, agentTools.id))
		.where(eq(formSubmissions.conversationId, conversationId));

	// Map satisfaction_survey back to special UUID for widget matching
	const mappedSubmissions = submissions.map((sub) => ({
		id: sub.id,
		toolId: sub.toolName === "satisfaction_survey" ? SATISFACTION_SURVEY_TOOL_ID : sub.toolId,
		status: sub.status,
		formData: sub.formData,
		formSubmittedAt: sub.formSubmittedAt,
		webhookResponse: sub.webhookResponse,
	}));

	return c.json({ submissions: mappedSubmissions });
});

// Execute webhook with error handling
async function executeWebhook(
	url: string,
	payload: Record<string, unknown>,
	_submissionId: string,
): Promise<{ success: boolean; error?: string; response?: unknown }> {
	try {
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
		});

		const responseText = await response.text();
		let responseData: unknown;
		try {
			responseData = JSON.parse(responseText);
		} catch {
			responseData = responseText;
		}

		if (!response.ok) {
			return {
				success: false,
				error: `HTTP ${response.status}: ${response.statusText}`,
				response: responseData,
			};
		}

		return {
			success: true,
			response: responseData,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

// Format a Slack message template with form data
function formatSlackMessage(
	template: string,
	formData: Record<string, unknown>,
	toolName: string,
): string {
	let message = template;
	// Replace {{field}} placeholders with actual values
	for (const [key, value] of Object.entries(formData)) {
		const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, "g");
		const displayValue = typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
		message = message.replace(placeholder, displayValue);
	}
	// Replace {{_toolName}} with the tool name
	message = message.replace(/\{\{\s*_toolName\s*\}\}/g, toolName);
	return message;
}

// Send a Slack notification
async function sendSlackNotification(
	webhookUrl: string,
	message: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ text: message }),
		});

		if (!response.ok) {
			return {
				success: false,
				error: `Slack webhook failed: HTTP ${response.status}`,
			};
		}

		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error sending Slack notification",
		};
	}
}

// Send email notifications for form submissions
async function sendEmailNotification(
	recipientIds: string[],
	subject: string | undefined,
	submissionData: {
		toolName: string;
		formData: Record<string, unknown>;
		submittedAt: string;
		conversationId?: string;
	},
): Promise<{ success: boolean; error?: string }> {
	if (!resend) {
		return { success: false, error: "Email service not configured" };
	}

	// Check if recipientIds is valid
	if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
		return { success: false, error: "No recipients specified" };
	}

	const db = getDb();

	// Fetch recipient emails from user IDs
	const recipients = await db
		.select({ id: users.id, email: users.email, name: users.name })
		.from(users)
		.where(inArray(users.id, recipientIds));

	if (recipients.length === 0) {
		return { success: false, error: "No valid recipients found" };
	}

	const dashboardUrl = `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/submissions`;
	const conversationUrl = submissionData.conversationId
		? `${process.env.DASHBOARD_URL || "https://app.ansa.so"}/conversations/${submissionData.conversationId}`
		: undefined;

	const emailSubject = subject || `New form submission: ${submissionData.toolName}`;

	try {
		const html = await renderEmail("form-notification", {
			formName: submissionData.toolName,
			formData: submissionData.formData,
			submittedAt: submissionData.submittedAt,
			dashboardUrl,
			conversationUrl,
		});

		// Send to all recipients
		const sendPromises = recipients.map((recipient) =>
			resend.emails.send({
				from: process.env.EMAIL_FROM || "Ansa <notifications@ansa.so>",
				to: recipient.email,
				subject: emailSubject,
				html,
			}),
		);

		await Promise.all(sendPromises);
		return { success: true };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error sending email notification",
		};
	}
}

// Process post-submission actions (webhooks, Slack, etc.)
async function processPostActions(
	actions: FormPostAction[],
	submissionData: {
		submissionId: string;
		toolId: string;
		toolName: string;
		conversationId?: string;
		formData: Record<string, unknown>;
		submittedAt: string;
	},
): Promise<{ type: string; success: boolean; error?: string }[]> {
	const results: { type: string; success: boolean; error?: string }[] = [];

	for (const action of actions) {
		if (action.type === "webhook") {
			const result = await executeWebhook(
				action.url,
				{
					...submissionData,
					headers: action.headers,
				},
				submissionData.submissionId,
			);
			results.push({
				type: "webhook",
				success: result.success,
				error: result.error,
			});
		} else if (action.type === "slack") {
			const message = formatSlackMessage(
				action.messageTemplate,
				submissionData.formData,
				submissionData.toolName,
			);
			const result = await sendSlackNotification(action.webhookUrl, message);
			results.push({
				type: "slack",
				success: result.success,
				error: result.error,
			});
		} else if (action.type === "email") {
			const result = await sendEmailNotification(action.recipientIds, action.subject, {
				toolName: submissionData.toolName,
				formData: submissionData.formData,
				submittedAt: submissionData.submittedAt,
				conversationId: submissionData.conversationId,
			});
			results.push({
				type: "email",
				success: result.success,
				error: result.error,
			});
		}
	}

	return results;
}

// Update client-side submission result
formSubmissionsRoute.post("/client-result", async (c) => {
	const body = await c.req.json();
	const { submissionId, success, message, data: resultData } = body;

	if (!submissionId) {
		return c.json({ error: "submissionId required" }, 400);
	}

	const db = getDb();

	const [submission] = await db
		.select()
		.from(formSubmissions)
		.where(eq(formSubmissions.id, submissionId));

	if (!submission) {
		return c.json({ error: "Submission not found" }, 404);
	}

	await db
		.update(formSubmissions)
		.set({
			status: success ? "client_success" : "client_failed",
			webhookResponse: resultData ? { clientResult: resultData, message } : null,
			webhookError: success ? null : message,
			updatedAt: new Date(),
		})
		.where(eq(formSubmissions.id, submissionId));

	return c.json({ success: true });
});

// Process webhook retries (called by cron job)
export async function processWebhookRetries(): Promise<number> {
	const db = getDb();

	// Find submissions that need retry
	const pendingRetries = await db
		.select({
			id: formSubmissions.id,
			toolId: formSubmissions.toolId,
			formData: formSubmissions.formData,
			conversationId: formSubmissions.conversationId,
			webhookAttempts: formSubmissions.webhookAttempts,
		})
		.from(formSubmissions)
		.where(
			and(
				eq(formSubmissions.status, "webhook_failed"),
				lte(formSubmissions.webhookNextRetry, new Date()),
			),
		)
		.limit(50);

	let processed = 0;

	for (const submission of pendingRetries) {
		const [tool] = await db
			.select({
				formWebhookUrl: agentTools.formWebhookUrl,
				name: agentTools.name,
			})
			.from(agentTools)
			.where(eq(agentTools.id, submission.toolId));

		if (!tool?.formWebhookUrl) {
			// Tool deleted or no webhook URL, mark as failed permanently
			await db
				.update(formSubmissions)
				.set({
					status: "webhook_failed",
					webhookNextRetry: null,
					webhookError: "Tool or webhook URL no longer available",
					updatedAt: new Date(),
				})
				.where(eq(formSubmissions.id, submission.id));
			continue;
		}

		const attemptNumber = submission.webhookAttempts + 1;
		const result = await executeWebhook(
			tool.formWebhookUrl,
			{
				submissionId: submission.id,
				toolId: submission.toolId,
				toolName: tool.name,
				conversationId: submission.conversationId,
				formData: submission.formData,
				submittedAt: new Date().toISOString(),
				retryAttempt: attemptNumber,
			},
			submission.id,
		);

		const isLastAttempt = attemptNumber >= MAX_RETRY_ATTEMPTS;

		await db
			.update(formSubmissions)
			.set({
				status: result.success ? "webhook_success" : "webhook_failed",
				webhookAttempts: attemptNumber,
				webhookLastAttempt: new Date(),
				webhookError: result.error ?? null,
				webhookResponse: result.response ?? null,
				webhookNextRetry:
					result.success || isLastAttempt
						? null
						: new Date(Date.now() + RETRY_DELAYS[attemptNumber]),
				updatedAt: new Date(),
			})
			.where(eq(formSubmissions.id, submission.id));

		processed++;
	}

	return processed;
}

// Get form analytics for an agent (authenticated route)
formSubmissionsRoute.get("/analytics", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	// Verify ownership
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)));

	if (!agent) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Get form tools with submission stats
	const formTools = await db
		.select({
			id: agentTools.id,
			name: agentTools.name,
		})
		.from(agentTools)
		.where(and(eq(agentTools.agentId, agentId), eq(agentTools.executionType, "form")));

	const analytics = await Promise.all(
		formTools.map(async (tool) => {
			const submissions = await db
				.select({
					status: formSubmissions.status,
					fieldsCompleted: formSubmissions.fieldsCompleted,
					formImpressionAt: formSubmissions.formImpressionAt,
					formStartedAt: formSubmissions.formStartedAt,
					formSubmittedAt: formSubmissions.formSubmittedAt,
				})
				.from(formSubmissions)
				.where(eq(formSubmissions.toolId, tool.id));

			const impressions = submissions.filter((s) => s.formImpressionAt).length;
			const started = submissions.filter((s) => s.formStartedAt).length;
			const submitted = submissions.filter((s) => s.formSubmittedAt).length;
			const successful = submissions.filter(
				(s) =>
					s.status === "webhook_success" ||
					s.status === "client_success" ||
					s.status === "submitted",
			).length;
			const failed = submissions.filter(
				(s) => s.status === "webhook_failed" || s.status === "client_failed",
			).length;

			// Field completion rates
			const fieldCompletionCounts: Record<string, number> = {};
			for (const sub of submissions) {
				if (sub.fieldsCompleted) {
					for (const field of sub.fieldsCompleted) {
						fieldCompletionCounts[field] = (fieldCompletionCounts[field] || 0) + 1;
					}
				}
			}

			return {
				toolId: tool.id,
				toolName: tool.name,
				impressionCount: impressions,
				startedCount: started,
				submissionCount: submitted,
				successful,
				failed,
				conversionRate: impressions > 0 ? (submitted / impressions) * 100 : 0,
				completionRate: started > 0 ? (submitted / started) * 100 : 0,
				startRate: impressions > 0 ? (started / impressions) * 100 : 0,
				avgCompletionTimeSeconds: null, // TODO: Calculate from formStartedAt to formSubmittedAt
				fieldCompletionRates: Object.fromEntries(
					Object.entries(fieldCompletionCounts).map(([field, count]) => [
						field,
						submitted > 0 ? (count / submitted) * 100 : 0,
					]),
				),
			};
		}),
	);

	return c.json({ analytics });
});

export { formSubmissionsRoute };
