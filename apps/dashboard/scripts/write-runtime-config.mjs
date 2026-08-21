#!/usr/bin/env node
/**
 * Writes public/runtime-config.js from the environment.
 *
 * Runs at container start, not at build time, so one image serves any
 * environment. Also runs before `next dev` so local development matches.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(here, "..", "public");

const config = {
	apiUrl: process.env.API_URL || "http://localhost:3001",
	docsUrl: process.env.DOCS_URL || "http://localhost:3003",
	dashboardUrl: process.env.DASHBOARD_URL || "http://localhost:3000",
	widgetUrl: process.env.WIDGET_URL || "http://localhost:3002",
	cdnUrl: process.env.CDN_URL || "http://localhost:3002",
	dashboardAgentId: process.env.DASHBOARD_AGENT_ID || "",
	emailInboundDomain: process.env.EMAIL_INBOUND_DOMAIN || "",
	projectName: process.env.PROJECT_NAME || "Ansa",
	shopifyClientId: process.env.SHOPIFY_CLIENT_ID || "",
	posthogKey: process.env.POSTHOG_KEY || "",
	posthogHost: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
};

// Only public configuration belongs here — this file is served to browsers.
const body = `window.__ANSA_CONFIG__=${JSON.stringify(config)};\n`;

await mkdir(publicDir, { recursive: true });
await writeFile(path.join(publicDir, "runtime-config.js"), body, "utf8");
console.log(`[runtime-config] wrote ${Object.keys(config).length} values, apiUrl=${config.apiUrl}`);
