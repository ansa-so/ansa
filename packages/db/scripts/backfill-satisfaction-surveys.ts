import { agents, agentTools, and, eq, formSubmissions, getDb } from "../src/index.js";

async function main() {
	const db = getDb();

	console.log("Fetching all agents...");
	const allAgents = await db.select().from(agents);
	console.log(`Found ${allAgents.length} agents`);

	let created = 0;
	let skipped = 0;

	for (const agent of allAgents) {
		// Check if satisfaction survey already exists
		const existing = await db
			.select()
			.from(agentTools)
			.where(
				and(
					eq(agentTools.agentId, agent.id),
					eq(agentTools.name, "satisfaction_survey"),
					eq(agentTools.system, true),
				),
			);

		if (existing.length > 0) {
			console.log(`Skipping agent ${agent.name} (${agent.id}) - already has satisfaction survey`);
			skipped++;
			continue;
		}

		// Create satisfaction survey tool
		const [tool] = await db
			.insert(agentTools)
			.values({
				agentId: agent.id,
				name: "satisfaction_survey",
				description: "Customer satisfaction survey shown after conversation resolution",
				inputSchema: { type: "object", properties: {}, required: [] },
				executionType: "form",
				formSchema: {
					fields: [
						{
							name: "rating",
							label: "How satisfied are you with the resolution?",
							type: "select",
							options: [
								{ label: "⭐⭐⭐⭐⭐ Very Satisfied", value: "5" },
								{ label: "⭐⭐⭐⭐ Satisfied", value: "4" },
								{ label: "⭐⭐⭐ Neutral", value: "3" },
								{ label: "⭐⭐ Dissatisfied", value: "2" },
								{ label: "⭐ Very Dissatisfied", value: "1" },
							],
							validation: {
								required: { value: true, message: "Please select a rating" },
							},
						},
						{
							name: "feedback",
							label: "Any additional feedback? (optional)",
							type: "textarea",
						},
					],
					introText: "Thank you for contacting us! We'd love to hear about your experience.",
					submitLabel: "Submit Feedback",
					successMessage: "Thank you for your feedback!",
				},
				formExecutionMode: null,
				isEnabled: true,
				allowAiSuggest: false,
				countsAsConversion: false,
				countsAsResolution: false,
				category: "feedback_survey",
				system: true,
			})
			.returning();

		console.log(`Created satisfaction survey for agent ${agent.name} (${agent.id})`);
		created++;

		// Update any existing form submissions with the special UUID
		const updated = await db
			.update(formSubmissions)
			.set({ toolId: tool.id })
			.where(
				and(
					eq(formSubmissions.agentId, agent.id),
					eq(formSubmissions.toolId, "00000000-0000-0000-0000-000000000000"),
				),
			);

		if (updated.rowCount && updated.rowCount > 0) {
			console.log(`  Updated ${updated.rowCount} form submissions`);
		}
	}

	console.log("\nBackfill complete!");
	console.log(`Created: ${created}`);
	console.log(`Skipped: ${skipped}`);
	console.log(`Total: ${allAgents.length}`);

	process.exit(0);
}

main().catch((error) => {
	console.error("Error during backfill:", error);
	process.exit(1);
});
