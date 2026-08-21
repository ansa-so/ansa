/**
 * Configuration resolved at runtime rather than baked into the bundle.
 *
 * `next.config.ts` previously mapped these through `env:`, which inlines values
 * at build time. Combined with `"use client"` pages, that meant the API URL was
 * compiled into the JavaScript sent to the browser — so a published image only
 * ever worked for the environment it was built for, and self-hosting required
 * rebuilding the whole dashboard to change one URL.
 *
 * Now a small script is written at container start and loaded before Next's own
 * JavaScript, so the same image runs anywhere.
 */

export type RuntimeConfig = {
	apiUrl: string;
	docsUrl: string;
	dashboardUrl: string;
	widgetUrl: string;
	cdnUrl: string;
	dashboardAgentId: string;
	emailInboundDomain: string;
	projectName: string;
	shopifyClientId: string;
	posthogKey: string;
	posthogHost: string;
};

/** Local-development values. Deployments override every one of these. */
const DEV_DEFAULTS: RuntimeConfig = {
	apiUrl: "http://localhost:3001",
	docsUrl: "http://localhost:3003",
	dashboardUrl: "http://localhost:3000",
	widgetUrl: "http://localhost:3002",
	cdnUrl: "http://localhost:3002",
	dashboardAgentId: "",
	emailInboundDomain: "",
	projectName: "Ansa",
	shopifyClientId: "",
	posthogKey: "",
	posthogHost: "https://us.i.posthog.com",
};

declare global {
	interface Window {
		__ANSA_CONFIG__?: Partial<RuntimeConfig>;
	}
}

/**
 * Read configuration from the environment. Server-side only — the client bundle
 * has no access to these variables, which is the entire point.
 */
export function readServerConfig(): RuntimeConfig {
	const env = process.env;
	return {
		apiUrl: env.API_URL || DEV_DEFAULTS.apiUrl,
		docsUrl: env.DOCS_URL || DEV_DEFAULTS.docsUrl,
		dashboardUrl: env.DASHBOARD_URL || DEV_DEFAULTS.dashboardUrl,
		widgetUrl: env.WIDGET_URL || DEV_DEFAULTS.widgetUrl,
		cdnUrl: env.CDN_URL || DEV_DEFAULTS.cdnUrl,
		dashboardAgentId: env.DASHBOARD_AGENT_ID || DEV_DEFAULTS.dashboardAgentId,
		emailInboundDomain: env.EMAIL_INBOUND_DOMAIN || DEV_DEFAULTS.emailInboundDomain,
		projectName: env.PROJECT_NAME || DEV_DEFAULTS.projectName,
		shopifyClientId: env.SHOPIFY_CLIENT_ID || DEV_DEFAULTS.shopifyClientId,
		posthogKey: env.POSTHOG_KEY || DEV_DEFAULTS.posthogKey,
		posthogHost: env.POSTHOG_HOST || DEV_DEFAULTS.posthogHost,
	};
}

/**
 * The configuration for the current environment.
 *
 * On the server this reads the environment directly. In the browser it reads the
 * object installed by /runtime-config.js, falling back to development defaults
 * so a missing file degrades to localhost rather than to undefined.
 */
export function getConfig(): RuntimeConfig {
	if (typeof window === "undefined") {
		return readServerConfig();
	}
	return { ...DEV_DEFAULTS, ...(window.__ANSA_CONFIG__ ?? {}) };
}

/** Convenience accessor for the value that matters most often. */
export function apiUrl(): string {
	return getConfig().apiUrl;
}
