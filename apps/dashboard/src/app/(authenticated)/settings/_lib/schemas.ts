import { z } from "zod";

// Constants
export const WINDOW_PRESETS = [
	{ label: "1 minute", value: 60 },
	{ label: "5 minutes", value: 300 },
	{ label: "15 minutes", value: 900 },
	{ label: "1 hour", value: 3600 },
	{ label: "24 hours", value: 86400 },
];

// Agent form schema
export const agentSchema = z.object({
	name: z.string().min(1, "Name is required"),
	aiQuality: z.enum(["balanced", "high_quality"]),
	temperature: z.number().min(0).max(100),
	systemPrompt: z.string().min(1, "System prompt is required"),
	persona: z.enum([
		"default",
		"urgent",
		"problem_solver",
		"consultant",
		"sales_expert",
		"playful",
		"inspirational",
		"engaging",
		"informative",
		"professional",
		"neutral",
		"custom",
	]),
	isDefault: z.boolean(),
});

// Embed form schema
export const embedSchema = z.object({
	theme: z.enum(["light", "dark", "system"]),
	primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
	chatBubbleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
	chatBubbleAlign: z.enum(["left", "right"]),
	widgetButtonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
	widgetButtonBorderRadius: z.string().max(20),
	displayName: z.string().min(1, "Display name is required").max(100),
	initialMessage: z.string().max(500).nullable(),
	suggestedMessages: z.array(z.object({ value: z.string().max(200) })),
	messagePlaceholder: z.string().max(100).nullable(),
	footerMessage: z.string().max(200).nullable(),
	dismissibleMessage: z.string().max(500).nullable(),
	welcomeBubbles: z.array(z.object({ value: z.string().max(150) })).max(5),
	collectUserFeedback: z.boolean(),
	showSatisfactionOnResolved: z.boolean(),
	escalationNoticeMessage: z.string().max(500).nullable(),
	userEscalationMessage: z.string().max(500).nullable(),
	deescalationMessage: z.string().max(500).nullable(),
});

// Conversations form schema (SLA + auto-close)
export const conversationsSchema = z.object({
	slaLow: z.number().int().min(1),
	slaMedium: z.number().int().min(1),
	slaHigh: z.number().int().min(1),
	slaUrgent: z.number().int().min(1),
	widgetAutoCloseMinutes: z.number().int().min(1),
	emailAutoCloseMinutes: z.number().int().min(1),
});

// Escalation form schema
export const escalationSchema = z.object({
	enabled: z.boolean(),
	showButtonsAfter: z.enum([
		"first_ai_response",
		"every_ai_response",
		"never",
		"on_human_request",
		"on_low_confidence",
		"on_help_request",
		"on_human_or_negative_feedback",
		"on_any_signal",
	]),
	notificationMethod: z.enum(["none", "email", "slack", "webhook"]),
	emailAddresses: z.string(),
	slackWebhookUrl: z.string(),
	webhookUrl: z.string(),
	defaultPriority: z.enum(["low", "medium", "high", "urgent"]),
	defaultAssigneeId: z.string(),
});

// Confidence form schema
export const confidenceSchema = z.object({
	widgetConfidenceThreshold: z.number().min(0).max(100),
	widgetLowConfidenceAction: z.enum(["respond", "escalate"]),
	escalationNoticeMessage: z.string().max(500).nullable(),
	userEscalationMessage: z.string().max(500).nullable(),
	deescalationMessage: z.string().max(500).nullable(),
});

// Security form schema
export const securitySchema = z.object({
	messageLimit: z.number().int().min(1).max(10000),
	messageLimitWindow: z.number().int().min(1).max(86400),
	allowedDomains: z.array(z.object({ value: z.string().max(255) })),
});

// Messages form schema (subset of embed settings for messages page)
export const messagesSchema = z.object({
	initialMessage: z.string().max(500).nullable(),
	suggestedMessages: z.array(z.object({ value: z.string().max(200) })),
	messagePlaceholder: z.string().max(100).nullable(),
	dismissibleMessage: z.string().max(500).nullable(),
	welcomeBubbles: z.array(z.object({ value: z.string().max(150) })).max(5),
});

// TypeScript types derived from schemas
export type AgentFormData = z.infer<typeof agentSchema>;
export type EmbedFormData = z.infer<typeof embedSchema>;
export type ConversationsFormData = z.infer<typeof conversationsSchema>;
export type EscalationFormData = z.infer<typeof escalationSchema>;
export type ConfidenceFormData = z.infer<typeof confidenceSchema>;
export type SecurityFormData = z.infer<typeof securitySchema>;
export type MessagesFormData = z.infer<typeof messagesSchema>;
