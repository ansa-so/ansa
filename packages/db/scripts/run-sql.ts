#!/usr/bin/env tsx
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import postgres from "postgres";

let file = process.argv[2];

if (!file) {
	console.error("Usage: pnpm db:sql <file.sql>");
	process.exit(1);
}

// Try to resolve relative to cwd first, then relative to this script
if (!existsSync(file)) {
	const altPath = resolve(process.cwd(), "..", "..", file);
	if (existsSync(altPath)) {
		file = altPath;
	}
}

const url = process.env.DATABASE_URL;
if (!url) {
	console.error("DATABASE_URL not set");
	process.exit(1);
}

const sql = postgres(url);

try {
	const content = readFileSync(file, "utf-8");
	console.log(`Running ${file}...`);

	// Remove single-line comments (-- ...) but preserve statement-breakpoint markers for splitting
	const withoutComments = content
		.split("\n")
		.map((line) => {
			// Keep statement-breakpoint comments for splitting, remove others
			if (line.trim().startsWith("--") && !line.includes("statement-breakpoint")) {
				return "";
			}
			return line;
		})
		.join("\n");

	// Split by statement-breakpoint comments first, then by semicolons
	// The key fix: split on semicolons followed by whitespace/newlines, not just end-of-line
	const statements = withoutComments
		.split(/-->\s*statement-breakpoint/)
		.flatMap((s) => s.split(/;(?=\s*(?:\n|$))/))
		.map((s) => s.trim())
		.filter((s) => s && s.length > 0);

	console.log(`Found ${statements.length} statements to execute`);

	let successCount = 0;
	for (const statement of statements) {
		if (statement) {
			try {
				console.log(`  Executing: ${statement.substring(0, 60).replace(/\n/g, " ")}...`);
				await sql.unsafe(statement);
				successCount++;
			} catch (stmtError: unknown) {
				const errorMessage = stmtError instanceof Error ? stmtError.message : String(stmtError);
				// Check if it's a "column already exists" or "table already exists" error - these are OK
				if (errorMessage.includes("already exists") || errorMessage.includes("duplicate key")) {
					console.log(`  ⚠ Skipped (already exists): ${statement.substring(0, 40)}...`);
					successCount++;
				} else {
					console.error(`  ✗ Failed: ${statement.substring(0, 60)}...`);
					console.error(`    Error: ${errorMessage}`);
					throw stmtError;
				}
			}
		}
	}

	console.log(`✓ Migration complete (${successCount}/${statements.length} statements)`);
} catch (error) {
	console.error("Migration failed:", error);
	process.exit(1);
} finally {
	await sql.end();
}
