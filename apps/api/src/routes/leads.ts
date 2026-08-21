import { agentTools, and, desc, eq, formSubmissions, getDb, gte, lte, sql } from "@ansa/db";
import type { FormFieldMetadata, FormSubmissionOutcome } from "@ansa/types";
import { Hono } from "hono";
import { requireOwnedAgent, requireOwnedFormSubmission, requireUserId } from "../lib/ownership";

const leads = new Hono();

// Helper function to determine submission outcome
function computeSubmissionOutcome(
	status: string,
	countsAsConversion: boolean | null,
	countsAsResolution: boolean | null,
): FormSubmissionOutcome {
	// Only successful submissions can have outcomes
	const isSuccess = ["submitted", "webhook_success", "client_success"].includes(status);
	if (!isSuccess) {
		return "none";
	}

	// Priority: resolution > conversion > none
	if (countsAsResolution) {
		return "resolution";
	}
	if (countsAsConversion) {
		return "conversion";
	}
	return "none";
}

// Helper function to extract field metadata from form schema
function extractFieldMetadata(formSchema: unknown): FormFieldMetadata[] {
	if (!formSchema || typeof formSchema !== "object") {
		return [];
	}

	const schema = formSchema as { fields?: Array<{ name: string; type: string; label?: string }> };
	if (!Array.isArray(schema.fields)) {
		return [];
	}

	return schema.fields.map((field) => ({
		name: field.name,
		type: field.type as FormFieldMetadata["type"],
		label: field.label,
	}));
}

// Get count of new submissions since a given timestamp
leads.get("/count/new", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const agentId = c.req.query("agentId");
	const since = c.req.query("since");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	const conditions = [eq(formSubmissions.agentId, agentId)];

	if (since) {
		conditions.push(gte(formSubmissions.createdAt, new Date(since)));
	}

	const [result] = await db
		.select({ count: sql<number>`count(*)` })
		.from(formSubmissions)
		.where(and(...conditions));

	return c.json({ count: Number(result?.count ?? 0) });
});

// List all form submissions (leads) with filtering
leads.get("/", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();

	// Get query params
	const agentId = c.req.query("agentId");
	const toolId = c.req.query("toolId"); // Filter by specific form
	const status = c.req.query("status"); // pending, success, failed
	const startDate = c.req.query("startDate");
	const endDate = c.req.query("endDate");
	const page = parseInt(c.req.query("page") || "1", 10);
	const limit = parseInt(c.req.query("limit") || "50", 10);
	const offset = (page - 1) * limit;

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	// Build conditions
	const conditions = [eq(formSubmissions.agentId, agentId)];

	if (toolId) {
		conditions.push(eq(formSubmissions.toolId, toolId));
	}
	if (status) {
		conditions.push(eq(formSubmissions.status, status));
	}
	if (startDate) {
		conditions.push(gte(formSubmissions.createdAt, new Date(startDate)));
	}
	if (endDate) {
		conditions.push(lte(formSubmissions.createdAt, new Date(endDate)));
	}

	// Get submissions with tool name and action configuration (now on agentTools directly)
	const submissions = await db
		.select({
			id: formSubmissions.id,
			agentId: formSubmissions.agentId,
			toolId: formSubmissions.toolId,
			toolName: agentTools.name,
			conversationId: formSubmissions.conversationId,
			formData: formSubmissions.formData,
			status: formSubmissions.status,
			webhookResponse: formSubmissions.webhookResponse,
			createdAt: formSubmissions.createdAt,
			// Action outcome flags (now on agentTools)
			countsAsConversion: agentTools.countsAsConversion,
			countsAsResolution: agentTools.countsAsResolution,
			category: agentTools.category,
			// Form schema for field metadata
			formSchema: agentTools.formSchema,
		})
		.from(formSubmissions)
		.leftJoin(agentTools, eq(formSubmissions.toolId, agentTools.id))
		.where(and(...conditions))
		.orderBy(desc(formSubmissions.createdAt))
		.limit(limit)
		.offset(offset);

	// Enhance submissions with computed outcome and field metadata
	const enhancedSubmissions = submissions.map((sub) => {
		const outcome = computeSubmissionOutcome(
			sub.status,
			sub.countsAsConversion,
			sub.countsAsResolution,
		);
		const fieldMetadata = extractFieldMetadata(sub.formSchema);

		return {
			id: sub.id,
			agentId: sub.agentId,
			toolId: sub.toolId,
			toolName: sub.toolName,
			conversationId: sub.conversationId,
			formData: sub.formData,
			status: sub.status,
			webhookResponse: sub.webhookResponse,
			createdAt: sub.createdAt,
			outcome,
			fieldMetadata,
			category: sub.category,
			countsAsConversion: sub.countsAsConversion,
			countsAsResolution: sub.countsAsResolution,
		};
	});

	// Get total count for pagination
	const [countResult] = await db
		.select({ count: sql<number>`count(*)` })
		.from(formSubmissions)
		.where(and(...conditions));

	// Get available forms for filter dropdown
	const forms = await db
		.select({
			id: agentTools.id,
			name: agentTools.name,
		})
		.from(agentTools)
		.where(and(eq(agentTools.agentId, agentId), eq(agentTools.executionType, "form")));

	return c.json({
		submissions: enhancedSubmissions,
		forms,
		pagination: {
			page,
			limit,
			total: Number(countResult?.count ?? 0),
			totalPages: Math.ceil(Number(countResult?.count ?? 0) / limit),
		},
	});
});

// Get single submission details
leads.get("/:id", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	await requireOwnedFormSubmission(id, userId);

	const [submission] = await db
		.select({
			id: formSubmissions.id,
			agentId: formSubmissions.agentId,
			toolId: formSubmissions.toolId,
			toolName: agentTools.name,
			conversationId: formSubmissions.conversationId,
			formData: formSubmissions.formData,
			status: formSubmissions.status,
			webhookResponse: formSubmissions.webhookResponse,
			createdAt: formSubmissions.createdAt,
			// Action outcome flags (now on agentTools)
			countsAsConversion: agentTools.countsAsConversion,
			countsAsResolution: agentTools.countsAsResolution,
			category: agentTools.category,
			// Form schema for field metadata
			formSchema: agentTools.formSchema,
		})
		.from(formSubmissions)
		.leftJoin(agentTools, eq(formSubmissions.toolId, agentTools.id))
		.where(eq(formSubmissions.id, id))
		.limit(1);

	if (!submission) {
		return c.json({ error: "Submission not found" }, 404);
	}

	// Enhance with computed outcome and field metadata
	const outcome = computeSubmissionOutcome(
		submission.status,
		submission.countsAsConversion,
		submission.countsAsResolution,
	);
	const fieldMetadata = extractFieldMetadata(submission.formSchema);

	return c.json({
		id: submission.id,
		agentId: submission.agentId,
		toolId: submission.toolId,
		toolName: submission.toolName,
		conversationId: submission.conversationId,
		formData: submission.formData,
		status: submission.status,
		webhookResponse: submission.webhookResponse,
		createdAt: submission.createdAt,
		outcome,
		fieldMetadata,
		category: submission.category,
		countsAsConversion: submission.countsAsConversion,
		countsAsResolution: submission.countsAsResolution,
	});
});

// Delete a submission
leads.delete("/:id", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const id = c.req.param("id");

	await requireOwnedFormSubmission(id, userId);

	await db.delete(formSubmissions).where(eq(formSubmissions.id, id));

	return c.json({ success: true });
});

// Export to CSV
leads.get("/export/csv", async (c) => {
	const userId = requireUserId(c);
	const db = getDb();
	const agentId = c.req.query("agentId");
	const toolId = c.req.query("toolId");

	if (!agentId) {
		return c.json({ error: "agentId is required" }, 400);
	}

	await requireOwnedAgent(agentId, userId);

	const conditions = [eq(formSubmissions.agentId, agentId)];
	if (toolId) {
		conditions.push(eq(formSubmissions.toolId, toolId));
	}

	const submissions = await db
		.select({
			id: formSubmissions.id,
			toolName: agentTools.name,
			formData: formSubmissions.formData,
			status: formSubmissions.status,
			createdAt: formSubmissions.createdAt,
		})
		.from(formSubmissions)
		.leftJoin(agentTools, eq(formSubmissions.toolId, agentTools.id))
		.where(and(...conditions))
		.orderBy(desc(formSubmissions.createdAt));

	// Build CSV
	if (submissions.length === 0) {
		return c.text("No data to export", 200);
	}

	// Get all unique keys from formData across all submissions
	const allKeys = new Set<string>();
	for (const sub of submissions) {
		const data = sub.formData as Record<string, unknown>;
		if (data) {
			for (const key of Object.keys(data)) {
				allKeys.add(key);
			}
		}
	}

	const headers = ["ID", "Form", "Status", "Submitted At", ...Array.from(allKeys)];
	const rows = submissions.map((sub) => {
		const data = (sub.formData as Record<string, unknown>) || {};
		return [
			sub.id,
			sub.toolName || "Unknown",
			sub.status,
			sub.createdAt?.toISOString() || "",
			...Array.from(allKeys).map((key) => {
				const value = data[key];
				if (typeof value === "string") {
					// Escape quotes and wrap in quotes if contains comma
					return value.includes(",") || value.includes('"')
						? `"${value.replace(/"/g, '""')}"`
						: value;
				}
				return String(value ?? "");
			}),
		];
	});

	const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

	c.header("Content-Type", "text/csv");
	c.header(
		"Content-Disposition",
		`attachment; filename="leads-${new Date().toISOString().split("T")[0]}.csv"`,
	);

	return c.text(csv);
});

export { leads };
