import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { agents, agentTools } from "../schema";

/**
 * Actions table - Business intent layer above Tools
 *
 * Defines what actions represent conversions or resolutions.
 * Actions reference Tools but add semantic meaning for outcomes tracking.
 */
export const actions = pgTable(
	"actions",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		agentId: uuid("agent_id")
			.notNull()
			.references(() => agents.id, { onDelete: "cascade" }),
		toolId: uuid("tool_id")
			.notNull()
			.references(() => agentTools.id, { onDelete: "cascade" }),

		// Action definition
		name: text("name").notNull(), // Business-friendly name, e.g., "Request Demo", "Submit Support Ticket"
		category: text("category").notNull(), // "sales" | "support" | "feedback" | "ops" | "other"
		description: text("description"), // Optional explanation of what this action represents

		// Outcome flags - determines what counts as success
		countsAsConversion: boolean("counts_as_conversion").notNull().default(false), // Does this action represent a conversion?
		countsAsResolution: boolean("counts_as_resolution").notNull().default(false), // Does this action resolve the conversation?

		// Visibility
		isVisibleToAI: boolean("is_visible_to_ai").notNull().default(true), // Should AI suggest this action?
		status: text("status").notNull().default("active"), // "active" | "paused"

		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		index("actions_agent_idx").on(table.agentId),
		index("actions_tool_idx").on(table.toolId),
		index("actions_status_idx").on(table.status),
	],
);

export type Action = typeof actions.$inferSelect;
export type NewAction = typeof actions.$inferInsert;
