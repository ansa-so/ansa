import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from root of the monorepo
config({ path: path.join(__dirname, "../../../.env") });

async function getAppliedMigrations(client: postgres.Sql): Promise<Set<string>> {
	try {
		const result = await client`SELECT hash FROM drizzle.__drizzle_migrations`;
		return new Set(result.map((row) => row.hash as string));
	} catch {
		return new Set();
	}
}

async function runMigrations() {
	const connectionString = process.env.DATABASE_URL;

	if (!connectionString) {
		console.error("❌ DATABASE_URL environment variable is required");
		process.exit(1);
	}

	console.log("🔄 Running migrations...");

	const migrationClient = postgres(connectionString, { max: 1 });
	const db = drizzle(migrationClient);

	try {
		// Get migrations applied before
		const appliedBefore = await getAppliedMigrations(migrationClient);

		await migrate(db, {
			migrationsFolder: path.join(__dirname, "../drizzle"),
		});

		// Get migrations applied after
		const appliedAfter = await getAppliedMigrations(migrationClient);

		// Find newly applied migrations
		const newlyApplied = [...appliedAfter].filter((hash) => !appliedBefore.has(hash));

		if (newlyApplied.length === 0) {
			console.log("✅ No new migrations to apply");
		} else {
			// Read migration files to get names
			const migrationsFolder = path.join(__dirname, "../drizzle");
			const migrationFiles = fs
				.readdirSync(migrationsFolder)
				.filter((f) => f.endsWith(".sql"))
				.sort();

			console.log(`✅ Applied ${newlyApplied.length} migration(s):`);
			for (const file of migrationFiles.slice(-newlyApplied.length)) {
				console.log(`   📄 ${file}`);
			}
		}
	} catch (error) {
		console.error("❌ Migration failed:", error);
		process.exit(1);
	} finally {
		await migrationClient.end();
	}
}

runMigrations();
