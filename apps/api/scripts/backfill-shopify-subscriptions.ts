/**
 * Backfill script: Create userSubscriptions rows for existing Shopify users
 * who have an active shopifyShops record but no userSubscriptions row.
 *
 * This ensures existing Shopify merchants:
 * 1. Don't get blocked by the choose-plan gate (hasPlanSelected = true)
 * 2. Have billingProvider = "shopify" so dashboard routes correctly
 * 3. Agent limit checks use the correct plan (not the fallback "free" with no row)
 *
 * Usage: npx tsx apps/api/scripts/backfill-shopify-subscriptions.ts
 */

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

// Load .env from project root BEFORE importing db
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../../../.env") });

const { eq, getDb, shopifyShops, userSubscriptions } = await import("@ansa/db");

const db = getDb();

// Find all active Shopify shops
const activeShops = await db
	.select({ userId: shopifyShops.userId, shopDomain: shopifyShops.shopDomain })
	.from(shopifyShops)
	.where(eq(shopifyShops.status, "active"));

console.log(`Found ${activeShops.length} active Shopify shop(s)`);

let created = 0;
let skipped = 0;
let updated = 0;

for (const shop of activeShops) {
	const [existingSub] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, shop.userId))
		.limit(1);

	if (!existingSub) {
		// No subscription row — create one with billingProvider = "shopify"
		const now = new Date();
		const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

		await db.insert(userSubscriptions).values({
			userId: shop.userId,
			planId: "free",
			status: "active",
			billingProvider: "shopify",
			billingPeriodStart: now,
			billingPeriodEnd: periodEnd,
		});

		console.log(`  Created subscription for user ${shop.userId} (shop: ${shop.shopDomain})`);
		created++;
	} else if (existingSub.billingProvider !== "shopify") {
		// Has a non-Shopify subscription — update billing provider
		await db
			.update(userSubscriptions)
			.set({ billingProvider: "shopify", updatedAt: new Date() })
			.where(eq(userSubscriptions.userId, shop.userId));

		console.log(
			`  Updated billingProvider to shopify for user ${shop.userId} (was: ${existingSub.billingProvider}, shop: ${shop.shopDomain})`,
		);
		updated++;
	} else {
		console.log(`  Skipped user ${shop.userId} — already has shopify subscription`);
		skipped++;
	}
}

console.log(`\nDone: ${created} created, ${updated} updated, ${skipped} skipped`);
process.exit(0);
