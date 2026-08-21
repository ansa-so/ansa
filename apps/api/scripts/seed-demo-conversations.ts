import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load env from project root BEFORE importing db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

import type { NewChatMessage, NewConversation, NewEscalation, NewFormSubmission } from "@ansa/db";
import {
	agentTools,
	and,
	chatMessages,
	conversations,
	eq,
	escalations,
	formSubmissions,
	getDb,
} from "@ansa/db";

/**
 * Seed demo conversations for new users during onboarding
 * Creates two educational conversations: one widget (with escalation) and one email (with form)
 */
export async function seedDemoConversations(
	agentId: string,
	countryCode?: string | null,
): Promise<void> {
	const db = getDb();

	console.log(`[seed-demo] Creating demo conversations for agent ${agentId}...`);

	// Timestamps for realistic conversation spacing
	const now = new Date();
	const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
	const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

	// ==============================================
	// WIDGET CONVERSATION - Explains confidence & escalation
	// ==============================================

	const widgetConvoData: NewConversation = {
		agentId,
		title: "👋 This is your first conversation from your chat widget!",
		channel: "widget",
		status: "resolved",
		resolution: "ai_handled",
		needsAttention: false,
		visitorId: "demo_visitor_widget",
		userMetadata: {
			name: "Alex Chen",
			email: "alex@example.com",
		},
		pageUrl: "https://example.com/demo",
		pageDomain: "example.com",
		pagePath: "/demo",
		language: "eng",
		countryCode: countryCode || null,
		lastActivityAt: oneDayAgo,
		resolvedAt: oneDayAgo,
		createdAt: new Date(oneDayAgo.getTime() - 3 * 60 * 1000), // 3 minutes before
		updatedAt: oneDayAgo,
	};

	const [widgetConvo] = await db.insert(conversations).values(widgetConvoData).returning();

	// Widget conversation messages (spaced 20-30 seconds apart)
	const widgetMessages: Omit<NewChatMessage, "conversationId">[] = [
		{
			role: "assistant",
			content:
				"👋 This is your first conversation from your chat widget! This is how it will look. You can see the AI confidence under each response to help you understand and improve future responses.",
			confidenceScore: 95,
			createdAt: new Date(widgetConvo.createdAt.getTime() + 2000), // +2s
		},
		{
			role: "user",
			content: "Ah super! Can I respond to users if I want to interact with them?",
			createdAt: new Date(widgetConvo.createdAt.getTime() + 27000), // +27s
		},
		{
			role: "assistant",
			content:
				"Yes! Enable Human Escalation at /settings/escalation - you'll be able to respond to your users wherever they are 💬 You can set when escalation buttons appear and how you want to be notified.",
			confidenceScore: 85,
			createdAt: new Date(widgetConvo.createdAt.getTime() + 57000), // +57s (30s diff)
		},
		{
			role: "user",
			content: "What happens when the AI has low confidence?",
			createdAt: new Date(widgetConvo.createdAt.getTime() + 79000), // +79s (22s diff)
		},
		{
			role: "assistant",
			content:
				"I'm not entirely sure about that specific question 🤔 When my confidence is low like this, you can see it reflected in the score below.",
			confidenceScore: 45, // LOW CONFIDENCE
			createdAt: new Date(widgetConvo.createdAt.getTime() + 107000), // +107s (28s diff)
		},
		{
			role: "assistant",
			content:
				"When confidence drops below your threshold, you'll be alerted and can take over the conversation! Set your minimum confidence at /settings/escalation and choose how to be contacted (webhook, email, or Slack) ✅",
			confidenceScore: 88,
			createdAt: new Date(widgetConvo.createdAt.getTime() + 131000), // +131s (24s diff)
		},
	];

	// Insert widget messages
	for (const msg of widgetMessages) {
		await db.insert(chatMessages).values({
			...msg,
			conversationId: widgetConvo.id,
		});
	}

	// Create escalation for the low confidence message
	const widgetEscalationData: NewEscalation = {
		conversationId: widgetConvo.id,
		agentId,
		status: "open",
		priority: "medium",
		escalationSource: "low_confidence",
		escalatedAt: new Date(widgetConvo.createdAt.getTime() + 107000), // When low confidence message was sent
		notificationSentAt: new Date(widgetConvo.createdAt.getTime() + 107000),
		createdAt: new Date(widgetConvo.createdAt.getTime() + 107000),
		updatedAt: new Date(widgetConvo.createdAt.getTime() + 107000),
	};

	await db.insert(escalations).values(widgetEscalationData);

	console.log(
		`[seed-demo] ✅ Created widget conversation with ${widgetMessages.length} messages and escalation`,
	);

	// ==============================================
	// EMAIL CONVERSATION - Explains knowledge base & forms
	// ==============================================

	const emailConvoData: NewConversation = {
		agentId,
		title: "📧 Email: Question about pricing and demo request",
		channel: "email",
		status: "open",
		resolution: null,
		needsAttention: false,
		visitorId: "demo_visitor_email",
		userMetadata: {
			name: "Jordan Smith",
			email: "jordan@example.com",
		},
		language: "eng",
		countryCode: countryCode || null,
		lastActivityAt: twoDaysAgo,
		createdAt: new Date(twoDaysAgo.getTime() - 2 * 60 * 1000), // 2 minutes before
		updatedAt: twoDaysAgo,
	};

	const [emailConvo] = await db.insert(conversations).values(emailConvoData).returning();

	// Email conversation messages with form submission
	const emailMessages: Omit<NewChatMessage, "conversationId">[] = [
		{
			role: "user",
			content: "Hi! I'm interested in learning more about your platform. What's your pricing?",
			createdAt: new Date(emailConvo.createdAt.getTime() + 1000), // +1s
		},
		{
			role: "assistant",
			content:
				"📧 This is an email conversation! The AI automatically pulls answers from your knowledge base to reply to emails. We have flexible pricing plans to fit different needs. I'd be happy to connect you with our team for a personalized demo! 📝",
			confidenceScore: 78,
			createdAt: new Date(emailConvo.createdAt.getTime() + 28000), // +28s (27s diff)
		},
		{
			role: "user",
			content: "That would be great! How do I schedule a demo?",
			createdAt: new Date(emailConvo.createdAt.getTime() + 52000), // +52s (24s diff)
		},
		{
			role: "assistant",
			content:
				"Perfect! I can help you schedule a demo right away. Let me collect a few details from you.",
			confidenceScore: 92,
			toolBlocks: [
				{
					type: "tool_result",
					toolName: "contact_form",
					result: {
						formSchema: {
							title: "Schedule a Demo",
							description: "Tell us a bit about your needs",
							fields: [
								{
									name: "name",
									label: "Full Name",
									type: "text",
									required: true,
								},
								{
									name: "email",
									label: "Email Address",
									type: "email",
									required: true,
								},
								{
									name: "company",
									label: "Company Name",
									type: "text",
									required: false,
								},
								{
									name: "interest",
									label: "Primary Interest",
									type: "select",
									options: [
										{ label: "Pricing", value: "pricing" },
										{ label: "Features", value: "features" },
										{ label: "Integration", value: "integration" },
										{ label: "Enterprise", value: "enterprise" },
									],
									required: true,
								},
							],
						},
						// Simulate submitted form data
						submittedData: {
							name: "Jordan Smith",
							email: "jordan@example.com",
							company: "Acme Corp",
							interest: "pricing",
						},
						submitted: true,
						submittedAt: new Date(emailConvo.createdAt.getTime() + 81000).toISOString(),
					},
					displayConfig: {
						type: "form",
					},
				},
			],
			createdAt: new Date(emailConvo.createdAt.getTime() + 81000), // +81s (29s diff)
		},
		{
			role: "assistant",
			content:
				"Thanks Jordan! I've received your contact information (Name: Jordan Smith, Email: jordan@example.com, Company: Acme Corp). Our team will reach out within 24 hours. Forms are great for collecting structured lead data - you can set them up at /tools and trigger them based on user intent ✅",
			confidenceScore: 90,
			createdAt: new Date(emailConvo.createdAt.getTime() + 107000), // +107s (26s diff)
		},
		{
			role: "user",
			content: "Perfect! How can I improve the AI responses over time?",
			createdAt: new Date(emailConvo.createdAt.getTime() + 133000), // +133s (26s diff)
		},
		{
			role: "assistant",
			content:
				"Great question! Add more content to your knowledge base at /ai-knowledge - you can add Q&As, documents, website pages, and more. The AI will automatically use this to give better answers. You can also review low-confidence conversations to identify gaps 📚",
			confidenceScore: 88,
			createdAt: new Date(emailConvo.createdAt.getTime() + 159000), // +159s (26s diff)
		},
	];

	// Insert email messages
	for (const msg of emailMessages) {
		await db.insert(chatMessages).values({
			...msg,
			conversationId: emailConvo.id,
		});
	}

	// Create form submission using existing contact_form tool
	const [contactFormTool] = await db
		.select()
		.from(agentTools)
		.where(and(eq(agentTools.agentId, agentId), eq(agentTools.name, "contact_form")))
		.limit(1);

	if (contactFormTool) {
		const submissionData: NewFormSubmission = {
			toolId: contactFormTool.id,
			conversationId: emailConvo.id,
			agentId,
			formData: {
				name: "Jordan Smith",
				email: "jordan@example.com",
				message: "I'm interested in learning more about your platform and pricing.",
			},
			status: "submitted",
			formSubmittedAt: new Date(emailConvo.createdAt.getTime() + 81000),
			createdAt: new Date(emailConvo.createdAt.getTime() + 81000),
			updatedAt: new Date(emailConvo.createdAt.getTime() + 81000),
		};

		await db.insert(formSubmissions).values(submissionData);
		console.log(`[seed-demo] ✅ Created form submission for contact_form tool`);
	} else {
		console.log(`[seed-demo] ⚠️ No contact_form tool found, skipping form submission`);
	}

	console.log(`[seed-demo] ✅ Created email conversation with ${emailMessages.length} messages`);
	console.log(`[seed-demo] 🎉 Successfully created 2 demo conversations!`);
}

// Allow running script directly for testing
if (import.meta.url === `file://${process.argv[1]}`) {
	const testAgentId = process.argv[2];
	if (!testAgentId) {
		console.error("Usage: node seed-demo-conversations.js <agentId>");
		process.exit(1);
	}
	seedDemoConversations(testAgentId)
		.then(() => {
			console.log("✅ Demo conversations seeded successfully");
			process.exit(0);
		})
		.catch((err) => {
			console.error("❌ Error seeding demo conversations:", err);
			process.exit(1);
		});
}
