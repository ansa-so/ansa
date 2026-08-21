import * as fs from "node:fs";
import * as path from "node:path";
import { chromium, type Page } from "playwright";

// Defaults to a local instance. Playwright captures page content only (no browser
// chrome), so local screenshots are indistinguishable from production ones.
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
	throw new Error(
		"TEST_EMAIL and TEST_PASSWORD must be set. Seed a local account first with " +
			"`pnpm --filter @ansa/api seed:screenshots`, then pass the same credentials here.",
	);
}

// Onboarding/Auth pages (public)
const ONBOARDING_PAGES = [
	{
		path: "/login",
		name: "login",
		title: "Login",
		description: "Sign in to your Ansa account with email/password or OAuth providers.",
	},
	{
		path: "/signup",
		name: "signup",
		title: "Sign Up",
		description: "Create a new Ansa account to start building AI agents.",
	},
	{
		path: "/forgot-password",
		name: "forgot-password",
		title: "Forgot Password",
		description: "Reset your password via email.",
	},
];

// Marketing pages (public)
const MARKETING_PAGES = [
	{
		path: "/",
		name: "marketing-home",
		title: "Home",
		description: "Ansa homepage showcasing AI-powered customer support features.",
	},
	{
		path: "/features",
		name: "marketing-features",
		title: "Features",
		description: "Detailed overview of all Ansa platform capabilities.",
	},
	{
		path: "/pricing",
		name: "marketing-pricing",
		title: "Pricing",
		description: "Subscription plans and pricing options.",
	},
	{
		path: "/shopify",
		name: "marketing-shopify",
		title: "Shopify Integration",
		description: "Marketing page for Shopify store integration features.",
	},
];

// Onboarding flow (authenticated, before agent creation)
const ONBOARDING_FLOW_PAGES = [
	{
		path: "/onboarding",
		name: "onboarding",
		title: "Onboarding",
		description:
			"Quick setup wizard - enter your website URL and Ansa automatically creates an AI assistant trained on your content.",
	},
	{
		path: "/choose-plan",
		name: "choose-plan",
		title: "Choose Plan",
		description: "Select a subscription plan after signing up.",
	},
];

// Integration pages (authenticated)
const INTEGRATION_PAGES = [
	{
		path: "/integrations/shopify",
		name: "integrations-shopify",
		title: "Shopify Integration",
		description:
			"Connect your Shopify store for AI-powered customer support with order lookup and product info.",
	},
	{
		path: "/integrations/email",
		name: "integrations-email",
		title: "Email Integration",
		description: "Configure email forwarding to let your AI agent handle support emails.",
	},
];

// Standalone dashboard pages (no agent required)
const STANDALONE_PAGES = [
	{
		path: "/dashboard",
		name: "agents-list",
		title: "Agents List",
		description:
			"Dashboard home showing all your AI agents. Create, manage, and monitor your agents from here.",
	},
	{
		path: "/agents/new",
		name: "create-agent",
		title: "Create Agent",
		description: "Create a new AI agent with custom name, instructions, and configuration.",
	},
	{
		path: "/team",
		name: "team",
		title: "Team Management",
		description: "Manage team members, invite collaborators, and control access permissions.",
	},
	{
		path: "/billing",
		name: "billing",
		title: "Billing",
		description: "View and manage your subscription, usage stats, and payment methods.",
	},
	{
		path: "/account",
		name: "account",
		title: "Account Settings",
		description: "Manage your account profile, email preferences, and security settings.",
	},
	{
		path: "/contact",
		name: "contact",
		title: "Contact Support",
		description: "Get help from the Ansa team or submit feedback.",
	},
];

// Pages that require an agent to be selected
const AGENT_PAGES = [
	{
		path: "/chat",
		name: "chat",
		title: "Chat Playground",
		description:
			"Test your AI agent in real-time. See how it responds to questions using your knowledge base.",
	},
	{
		path: "/ai-knowledge/files",
		name: "files",
		title: "File Sources",
		description:
			"Upload PDF, DOCX, and TXT files to train your AI. Documents are processed and indexed automatically.",
	},
	{
		path: "/ai-knowledge/texts",
		name: "text-sources",
		title: "Text Sources",
		description:
			"Add rich text content directly. Perfect for FAQs, policies, and custom knowledge.",
	},
	{
		path: "/ai-knowledge/qa",
		name: "qa-sources",
		title: "Q&A Sources",
		description: "Define exact question-answer pairs for precise responses to common queries.",
	},
	{
		path: "/ai-knowledge/web-sources",
		name: "web-sources",
		title: "Web Sources",
		description:
			"Crawl websites and import content automatically. Keep your AI updated with live web data.",
	},
	{
		path: "/conversations",
		name: "history",
		title: "Chat History",
		description:
			"Review all conversations between users and your AI. Monitor quality and identify improvement areas.",
	},
	{
		path: "/analytics",
		name: "analytics",
		title: "Analytics",
		description: "Track usage metrics, response quality, and customer satisfaction over time.",
	},
	{
		path: "/settings/appearance",
		name: "widget",
		title: "Widget Builder",
		description:
			"Customize your chat widget appearance. Set colors, messages, and embed on your website.",
	},
	{
		path: "/settings/security",
		name: "security",
		title: "Security Settings",
		description: "Configure rate limiting, allowed domains, and other security options.",
	},
	{
		path: "/tools",
		name: "tools",
		title: "Tools",
		description:
			"Add custom tools and API integrations. Let your AI fetch live data and perform actions.",
	},
	{
		path: "/settings/general",
		name: "agent-settings",
		title: "Agent Settings",
		description: "Configure AI model, system instructions, and behavior for this agent.",
	},
	{
		path: "/settings/personality",
		name: "agent-personality",
		title: "Agent Persona",
		description: "Configure AI Personality.",
	},
];

const SCREENSHOTS_DIR = path.join(process.cwd(), "apps/docs/screenshots");
// The generated guide links its images with "./screenshots/...", so it has to sit
// next to SCREENSHOTS_DIR. It previously wrote to /docs while images went to
// /apps/docs/screenshots, which silently froze the guide's images.
const DOCS_DIR = path.join(process.cwd(), "apps/docs");

type PageResult = {
	name: string;
	title: string;
	description: string;
	success: boolean;
	category: string;
};

async function ensureDirectories() {
	if (!fs.existsSync(SCREENSHOTS_DIR)) {
		fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
	}
	if (!fs.existsSync(DOCS_DIR)) {
		fs.mkdirSync(DOCS_DIR, { recursive: true });
	}
}

async function login(page: Page) {
	console.log("\n🔐 Logging in...");
	await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	try {
		await page.waitForSelector("#email", { timeout: 10000 });
	} catch {
		await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug-login-failed.png") });
		console.error("   Login form not found. Screenshot saved to debug-login-failed.png");
		console.error("   Current URL:", page.url());
		throw new Error("Could not find login form");
	}

	await page.fill("#email", TEST_EMAIL);
	await page.fill("#password", TEST_PASSWORD);
	await page.click('button[type="submit"]');

	try {
		await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
	} catch {
		await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug-after-login.png") });
		console.error("   Login may have failed. Screenshot saved. Current URL:", page.url());
		throw new Error("Login redirect failed");
	}

	await page.waitForLoadState("networkidle");
	console.log("   Logged in successfully");
}

async function getFirstAgentId(page: Page): Promise<string | null> {
	// Extract agent ID from dashboard links
	const agentLink = await page.$('a[href*="agent="]');
	if (agentLink) {
		const href = await agentLink.getAttribute("href");
		const match = href?.match(/agent=([^&]+)/);
		return match?.[1] ?? null;
	}
	return null;
}

async function createAgent(page: Page): Promise<string | null> {
	console.log("\n🤖 Creating test agent...");

	await page.goto(`${BASE_URL}/agents/new`, { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	try {
		// Wait for form to load
		await page.waitForSelector('input[placeholder="My Assistant"]', { timeout: 10000 });

		// Fill the form
		await page.fill('input[placeholder="My Assistant"]', "Screenshot Test Agent");

		// Submit the form
		await page.click('button[type="submit"]');

		// Wait for redirect to chat page (may or may not have agent param)
		await page.waitForURL((url) => url.pathname === "/chat", { timeout: 30000 });
		await page.waitForLoadState("networkidle");

		// Check if agent ID is in URL
		const url = new URL(page.url());
		let agentId = url.searchParams.get("agent");

		// If not in URL, go back to home and get it from there
		if (!agentId) {
			await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
			await page.waitForTimeout(1000);
			agentId = await getFirstAgentId(page);
		}

		if (agentId) {
			console.log(`   Created agent: ${agentId}`);
		}
		return agentId;
	} catch (error) {
		await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "debug-create-agent.png") });
		console.error("   Failed to create agent. Screenshot saved.", error);
		return null;
	}
}

async function takeScreenshot(
	page: Page,
	pagePath: string,
	name: string,
	title: string,
): Promise<boolean> {
	console.log(`  ${title} (${pagePath})`);

	try {
		await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await page.waitForTimeout(2000);
		await page.waitForLoadState("networkidle");

		const screenshotPath = path.join(SCREENSHOTS_DIR, `${name}.png`);
		await page.screenshot({
			path: screenshotPath,
			fullPage: true,
		});

		return true;
	} catch (error) {
		console.error(`    Error: ${error}`);
		return false;
	}
}

function generateMarkdown(results: PageResult[]) {
	const categories = [
		{ key: "marketing", title: "Marketing Pages" },
		{ key: "onboarding", title: "Authentication & Onboarding" },
		{ key: "onboarding-flow", title: "Setup Flow" },
		{ key: "integrations", title: "Integrations" },
		{ key: "dashboard", title: "Dashboard" },
		{ key: "agent", title: "Agent Management" },
	];

	let markdown = `# Ansa Platform Guide

This guide provides an overview of all features available in the Ansa platform.

`;

	for (const cat of categories) {
		const pages = results.filter((p) => p.success && p.category === cat.key);
		if (pages.length === 0) continue;

		markdown += `## ${cat.title}\n\n`;

		for (const p of pages) {
			markdown += `### ${p.title}\n\n${p.description}\n\n![${p.title}](./screenshots/${p.name}.png)\n\n`;
		}
	}

	markdown += `---\n\n*Generated automatically by screenshot crawler*\n`;

	const outputPath = path.join(DOCS_DIR, "platform-guide.md");
	fs.writeFileSync(outputPath, markdown);
	console.log(`\n📄 Generated: ${outputPath}`);
}

async function main() {
	await ensureDirectories();

	const browser = await chromium.launch({
		headless: true,
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	const page = await context.newPage();
	const results: PageResult[] = [];

	try {
		// 1. Marketing pages (no auth needed)
		console.log("\n📸 Marketing pages...");
		for (const p of MARKETING_PAGES) {
			const success = await takeScreenshot(page, p.path, p.name, p.title);
			results.push({ ...p, success, category: "marketing" });
		}

		// 2. Onboarding/auth pages (no auth needed)
		console.log("\n📸 Onboarding pages...");
		for (const p of ONBOARDING_PAGES) {
			const success = await takeScreenshot(page, p.path, p.name, p.title);
			results.push({ ...p, success, category: "onboarding" });
		}

		// 3. Login
		await login(page);

		// 4. Onboarding flow pages (authenticated, before agent)
		console.log("\n📸 Setup flow pages...");
		for (const p of ONBOARDING_FLOW_PAGES) {
			const success = await takeScreenshot(page, p.path, p.name, p.title);
			results.push({ ...p, success, category: "onboarding-flow" });
		}

		// 5. Integration pages
		console.log("\n📸 Integration pages...");
		for (const p of INTEGRATION_PAGES) {
			const success = await takeScreenshot(page, p.path, p.name, p.title);
			results.push({ ...p, success, category: "integrations" });
		}

		// 6. Standalone dashboard pages
		console.log("\n📸 Dashboard pages...");
		for (const p of STANDALONE_PAGES) {
			const success = await takeScreenshot(page, p.path, p.name, p.title);
			results.push({ ...p, success, category: "dashboard" });
		}

		// 7. Get or create agent for agent-specific pages
		await page.goto(`${BASE_URL}/dashboard`);
		await page.waitForTimeout(2000);
		await page.waitForLoadState("networkidle");

		// Check if there are any agents by looking for agent links
		const agentLink = await page.$('a[href*="agent="]');
		let agentId: string | null = null;

		if (agentLink) {
			console.log("\n🔍 Found existing agent, getting ID...");
			agentId = await getFirstAgentId(page);
		} else {
			console.log("\n🔍 No agents found, creating one...");
			agentId = await createAgent(page);
		}

		if (agentId) {
			console.log(`\n📸 Agent pages (using agent: ${agentId})...`);

			for (const p of AGENT_PAGES) {
				const pathWithAgent = `${p.path}?agent=${agentId}`;
				const success = await takeScreenshot(page, pathWithAgent, p.name, p.title);
				results.push({ ...p, success, category: "agent" });
			}
		} else {
			console.log("\n⚠️  Could not get or create agent - skipping agent-specific pages");

			for (const p of AGENT_PAGES) {
				results.push({ ...p, success: false, category: "agent" });
			}
		}

		// Generate markdown
		generateMarkdown(results);

		const successful = results.filter((r) => r.success).length;
		console.log(`\n✅ Done! ${successful}/${results.length} screenshots captured`);
	} finally {
		await browser.close();
	}
}

main().catch(console.error);
