/**
 * Script to create Stripe products and prices for all plans
 *
 * Usage:
 *   npx tsx scripts/create-stripe-prices.ts
 *
 * Make sure STRIPE_SECRET_KEY is set in your .env file
 */

import * as path from "node:path";
import * as dotenv from "dotenv";
import Stripe from "stripe";

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, "../.env") });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// Plan definitions matching apps/api/src/lib/plans.ts
const PLANS = [
	{
		id: "free",
		name: "Free",
		price: 0, // Free plan - no Stripe price needed but we create one for tracking
		description: "Get started with basic features",
		features: [
			"75 messages/month",
			"1 agent",
			"1 tool per agent",
			"400KB storage",
			"10 web sources",
		],
	},
	{
		id: "starter",
		name: "Starter",
		price: 2900, // $29.00 in cents
		description: "For individuals and small projects",
		features: [
			"2,000 messages/month",
			"1 agent",
			"3 tools per agent",
			"5MB storage",
			"50 web sources",
		],
	},
	{
		id: "growth",
		name: "Growth",
		price: 9900, // $99.00 in cents
		description: "For growing businesses",
		features: [
			"15,000 messages/month",
			"3 agents",
			"10 tools per agent",
			"34MB storage",
			"200 web sources",
			"Remove branding",
			"Email channel",
			"Escalation",
			"Facebook Messenger",
		],
	},
	{
		id: "pro",
		name: "Pro",
		price: 29900, // $299.00 in cents
		description: "For professional teams",
		features: [
			"50,000 messages/month",
			"Unlimited agents",
			"Unlimited tools",
			"100MB storage",
			"Unlimited web sources",
			"Remove branding",
			"Email channel",
			"Escalation",
			"Facebook Messenger",
		],
	},
];

async function createStripePrices() {
	console.log("🚀 Creating Stripe products and prices...\n");

	const results: {
		planId: string;
		productId: string;
		monthlyPriceId: string;
		yearlyPriceId: string;
		monthlyPrice: number;
		yearlyPrice: number;
	}[] = [];

	for (const plan of PLANS) {
		try {
			// Create or find the product
			console.log(`📦 Creating product for ${plan.name}...`);

			// Search for existing product by name
			const existingProducts = await stripe.products.search({
				query: `name:'${plan.name}'`,
			});

			let product: Stripe.Product;

			if (existingProducts.data.length > 0) {
				product = existingProducts.data[0];
				console.log(`   Found existing product: ${product.id}`);

				// Update product metadata
				await stripe.products.update(product.id, {
					description: plan.description,
					metadata: {
						planId: plan.id,
						features: plan.features.join(", "),
					},
				});
			} else {
				product = await stripe.products.create({
					name: plan.name,
					description: plan.description,
					metadata: {
						planId: plan.id,
						features: plan.features.join(", "),
					},
				});
				console.log(`   Created new product: ${product.id}`);
			}

			// Create monthly price
			console.log(
				`💰 Creating monthly price for ${plan.name} ($${(plan.price / 100).toFixed(2)}/mo)...`,
			);

			const monthlyPrice = await stripe.prices.create({
				product: product.id,
				unit_amount: plan.price,
				currency: "usd",
				recurring: {
					interval: "month",
				},
				metadata: {
					planId: plan.id,
					interval: "month",
				},
			});

			console.log(`   Created monthly price: ${monthlyPrice.id}`);

			// Create yearly price (2 months free = 10 months price)
			const yearlyAmount = Math.round(plan.price * 10); // 2 months free
			console.log(
				`💰 Creating yearly price for ${plan.name} ($${(yearlyAmount / 100).toFixed(2)}/yr)...`,
			);

			const yearlyPrice = await stripe.prices.create({
				product: product.id,
				unit_amount: yearlyAmount,
				currency: "usd",
				recurring: {
					interval: "year",
				},
				metadata: {
					planId: plan.id,
					interval: "year",
				},
			});

			console.log(`   Created yearly price: ${yearlyPrice.id}\n`);

			results.push({
				planId: plan.id,
				productId: product.id,
				monthlyPriceId: monthlyPrice.id,
				yearlyPriceId: yearlyPrice.id,
				monthlyPrice: plan.price,
				yearlyPrice: yearlyAmount,
			});
		} catch (error) {
			console.error(`❌ Error creating ${plan.name}:`, error);
		}
	}

	// Print summary
	console.log(`\n${"=".repeat(70)}`);
	console.log("📋 SUMMARY - Add these to your .env file:");
	console.log(`${"=".repeat(70)}\n`);

	for (const result of results) {
		const monthlyVar = `STRIPE_PRICE_${result.planId.toUpperCase()}_MONTHLY`;
		const yearlyVar = `STRIPE_PRICE_${result.planId.toUpperCase()}_YEARLY`;
		console.log(`${monthlyVar}='${result.monthlyPriceId}'`);
		console.log(`${yearlyVar}='${result.yearlyPriceId}'`);
	}

	console.log(`\n${"=".repeat(70)}`);
	console.log("📊 All Created IDs:");
	console.log(`${"=".repeat(70)}\n`);

	console.table(
		results.map((r) => ({
			Plan: r.planId,
			"Product ID": r.productId,
			"Monthly Price ID": r.monthlyPriceId,
			"Yearly Price ID": r.yearlyPriceId,
			Monthly: `$${(r.monthlyPrice / 100).toFixed(2)}/mo`,
			Yearly: `$${(r.yearlyPrice / 100).toFixed(2)}/yr`,
		})),
	);
}

// Run the script
createStripePrices().catch(console.error);
