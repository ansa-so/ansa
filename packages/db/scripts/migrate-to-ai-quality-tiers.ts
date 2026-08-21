/**
 * Migration script: Convert agents.model to agents.aiQuality
 *
 * This script:
 * 1. Adds the new ai_quality column
 * 2. Migrates existing model values to tiers (defaults all to 'balanced')
 * 3. Creates the new llm_usage table for cost tracking
 * 4. Drops the old model column (after verification)
 *
 * Run with: pnpm db:migrate-ai-quality
 */

import { sql } from "drizzle-orm";
import { db } from "../src/index.js";

async function migrateToAIQualityTiers() {
	console.log("🚀 Starting migration to AI Quality Tiers...\n");

	try {
		// Step 1: Add ai_quality column to agents table
		console.log("1️⃣  Adding ai_quality column to agents table...");
		await db.execute(sql`
			ALTER TABLE agents
			ADD COLUMN IF NOT EXISTS ai_quality TEXT NOT NULL DEFAULT 'balanced'
			CHECK (ai_quality IN ('fast', 'balanced', 'high_quality'));
		`);
		console.log("✅ ai_quality column added\n");

		// Step 2: Create llm_usage table
		console.log("2️⃣  Creating llm_usage table for cost tracking...");
		await db.execute(sql`
			CREATE TABLE IF NOT EXISTS llm_usage (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
				conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
				message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,

				-- Model and tier information
				model TEXT NOT NULL,
				tier TEXT NOT NULL DEFAULT 'balanced' CHECK (tier IN ('fast', 'balanced', 'high_quality')),

				-- Token usage
				input_tokens INTEGER NOT NULL,
				output_tokens INTEGER NOT NULL,

				-- Cost tracking (in cents, with 3 decimal precision)
				cost_cents NUMERIC(10, 3) NOT NULL,
				cost_input_cents NUMERIC(10, 3) NOT NULL,
				cost_output_cents NUMERIC(10, 3) NOT NULL,

				-- Context
				channel TEXT NOT NULL,
				is_tool_followup BOOLEAN NOT NULL DEFAULT FALSE,
				was_upgraded BOOLEAN NOT NULL DEFAULT FALSE,
				original_tier TEXT CHECK (original_tier IN ('fast', 'balanced', 'high_quality')),

				-- Timing
				billing_period_start TIMESTAMP NOT NULL,
				created_at TIMESTAMP DEFAULT NOW() NOT NULL
			);
		`);
		console.log("✅ llm_usage table created\n");

		// Step 3: Create indexes for llm_usage
		console.log("3️⃣  Creating indexes for llm_usage...");
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS llm_usage_user_period_idx
			ON llm_usage(user_id, billing_period_start);
		`);
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS llm_usage_agent_date_idx
			ON llm_usage(agent_id, created_at);
		`);
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS llm_usage_conversation_idx
			ON llm_usage(conversation_id);
		`);
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS llm_usage_model_idx
			ON llm_usage(model);
		`);
		await db.execute(sql`
			CREATE INDEX IF NOT EXISTS llm_usage_cost_idx
			ON llm_usage(cost_cents);
		`);
		console.log("✅ Indexes created\n");

		// Step 4: Verify all agents have ai_quality set (should be 'balanced' by default)
		console.log("4️⃣  Verifying agent migration...");
		const result = await db.execute(sql`
			SELECT COUNT(*) as count FROM agents WHERE ai_quality IS NULL;
		`);
		const nullCount = result.rows[0]?.count || 0;

		if (nullCount > 0) {
			console.warn(`⚠️  Warning: ${nullCount} agents have NULL ai_quality`);
		} else {
			console.log("✅ All agents have ai_quality set\n");
		}

		// Step 5: Optional - Drop old model column (commented out for safety)
		console.log("5️⃣  Old 'model' column can now be dropped manually if desired:");
		console.log("   Run: ALTER TABLE agents DROP COLUMN IF EXISTS model;\n");

		console.log("🎉 Migration completed successfully!");
		console.log("\n📊 Next steps:");
		console.log("   1. Update your application code to use aiQuality");
		console.log("   2. Test thoroughly");
		console.log("   3. Drop the old 'model' column when ready");
		console.log("   4. Monitor llm_usage table for cost tracking\n");
	} catch (error) {
		console.error("❌ Migration failed:", error);
		throw error;
	}
}

// Run migration
migrateToAIQualityTiers()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});
