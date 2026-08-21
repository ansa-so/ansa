import { agents, agentTools, and, eq, getDb } from "../src/index.js";

async function main() {
	const db = getDb();
	const results = await db
		.select({
			id: agentTools.id,
			agentId: agentTools.agentId,
			name: agentTools.name,
			system: agentTools.system,
			agentName: agents.name,
		})
		.from(agentTools)
		.leftJoin(agents, eq(agents.id, agentTools.agentId))
		.where(and(eq(agentTools.name, "satisfaction_survey"), eq(agentTools.system, true)));

	console.log("Found", results.length, "satisfaction survey tools:");
	console.log(JSON.stringify(results, null, 2));
	process.exit(0);
}

main();
