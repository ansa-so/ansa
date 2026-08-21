import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Re-export ToolBlockData from @ansa/types for convenience
export type { ToolBlockData } from "@ansa/types";
export {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	gte,
	ilike,
	inArray,
	isNotNull,
	isNull,
	lt,
	lte,
	ne,
	or,
	sql,
	sum,
} from "drizzle-orm";
export * from "./schema";

const connectionString = process.env.DATABASE_URL;

const client = connectionString ? postgres(connectionString) : null;

export const db = client ? drizzle(client, { schema }) : null;

export function getDb() {
	if (!db) {
		throw new Error("DATABASE_URL not configured");
	}
	return db;
}
