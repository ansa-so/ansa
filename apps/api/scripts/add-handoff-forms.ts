import "dotenv/config";
import {
	agentEscalationSettings,
	agents,
	agentTools,
	eq,
	getDb,
	userSubscriptions,
	users,
} from "@ansa/db";

/**
 * Migration script to add human_handoff_form tool to existing agents
 * that have escalation DISABLED in their settings
 */
async function addHandoffForms() {
	const db = getDb();

	console.log("🔍 Finding agents with escalation disabled...");

	// Get all agents with their escalation settings
	const allAgents = await db
		.select({
			agentId: agents.id,
			agentName: agents.name,
			userId: agents.userId,
			userEmail: users.email,
			planId: userSubscriptions.planId,
			escalationEnabled: agentEscalationSettings.enabled,
		})
		.from(agents)
		.innerJoin(users, eq(agents.userId, users.id))
		.leftJoin(userSubscriptions, eq(users.id, userSubscriptions.userId))
		.leftJoin(agentEscalationSettings, eq(agents.id, agentEscalationSettings.agentId));

	console.log(`📊 Found ${allAgents.length} total agents`);

	let processed = 0;
	let created = 0;
	let skipped = 0;

	for (const agent of allAgents) {
		const escalationEnabled = agent.escalationEnabled ?? false;

		// Skip if agent has escalation enabled
		if (escalationEnabled) {
			console.log(`  ⏭️  Agent "${agent.agentName}" has escalation enabled, skipping`);
			skipped++;
			continue;
		}

		// Check if handoff form already exists
		const existingHandoffForm = await db
			.select()
			.from(agentTools)
			.where(eq(agentTools.agentId, agent.agentId))
			.then((tools) => tools.find((t) => t.name === "human_handoff_form"));

		if (existingHandoffForm) {
			console.log(`  ⏭️  Agent "${agent.agentName}" already has handoff form, skipping`);
			skipped++;
			continue;
		}

		// Create the handoff form
		if (agent.userEmail) {
			const planId = agent.planId || "free";
			try {
				await db.insert(agentTools).values({
					agentId: agent.agentId,
					name: "human_handoff_form",
					description:
						"Use when user wants to speak to a human, talk to someone, needs human assistance, or requests to contact support. Show this form to collect their information so the team can follow up.",
					inputSchema: {
						type: "object",
						properties: {
							name: { type: "string", description: "Full name" },
							email: { type: "string", description: "Email address" },
							message: { type: "string", description: "Message or request" },
						},
						required: ["name", "email", "message"],
					},
					executionType: "form",
					formSchema: {
						fields: [
							{
								name: "name",
								label: "Your Name",
								type: "text",
								placeholder: "Your name",
								validation: { required: { value: true, message: "Name is required" } },
							},
							{
								name: "email",
								label: "Email Address",
								type: "email",
								placeholder: "you@example.com",
								validation: { required: { value: true, message: "Email is required" } },
							},
							{
								name: "message",
								label: "How can we help?",
								type: "textarea",
								placeholder: "Please describe your question or issue...",
								validation: { required: { value: true, message: "Message is required" } },
							},
						],
						submitLabel: "Send Request",
						successMessage: "Thank you! Our team will get back to you soon.",
					},
					formPostActions: [
						{
							type: "email",
							config: {
								recipients: [agent.userEmail],
								subject: "New Support Request from {{name}}",
							},
						},
					],
					isEnabled: true,
					system: true,
				});

				console.log(`  ✅ Created handoff form for agent "${agent.agentName}" (${planId} plan)`);
				created++;
			} catch (error) {
				console.error(`  ❌ Failed to create handoff form for agent "${agent.agentName}":`, error);
			}
		} else {
			console.log(
				`  ⚠️  Agent "${agent.agentName}" has no owner email, skipping (plan: ${agent.planId || "free"})`,
			);
			skipped++;
		}

		processed++;
	}

	console.log("\n📈 Migration Summary:");
	console.log(`   Total agents: ${allAgents.length}`);
	console.log(`   Processed: ${processed}`);
	console.log(`   ✅ Created: ${created}`);
	console.log(`   ⏭️  Skipped: ${skipped}`);
	console.log("\n✨ Migration complete!");

	process.exit(0);
}

addHandoffForms().catch((e) => {
	console.error("❌ Migration failed:", e);
	process.exit(1);
});
