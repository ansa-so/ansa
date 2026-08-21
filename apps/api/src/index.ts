// Load .env BEFORE any other imports that depend on env vars
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import type { AuthVariables } from "./middleware/auth";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to find .env in multiple locations
const possiblePaths = [
	resolve(process.cwd(), ".env"), // Root when running from root
	resolve(process.cwd(), "../../.env"), // Root when running from apps/api
	resolve(__dirname, "../../../..", ".env"), // Relative to this file
	resolve(__dirname, "..", ".env"), // apps/api/.env
];

const envPath = possiblePaths.find((p) => existsSync(p));
if (envPath) {
	console.log(`[api] Loading .env from: ${envPath}`);
	config({ path: envPath });
} else {
	console.warn("[api] No .env file found");
	config();
}

// Now import everything else
const { serve } = await import("@hono/node-server");
const { Hono } = await import("hono");
const { cors } = await import("hono/cors");
const { secureHeaders } = await import("hono/secure-headers");
const { auth } = await import("./lib/auth");
const { authMiddleware } = await import("./middleware/auth");
const { agentsRoute } = await import("./routes/agents");
const { chat } = await import("./routes/chat");
const { conversationsRoute } = await import("./routes/conversations");
const { interfaceSettingsRoute } = await import("./routes/interface-settings");
const { qaSourcesRoute } = await import("./routes/qa-sources");
const { team } = await import("./routes/team");
const { textSourcesRoute } = await import("./routes/text-sources");
const { upload } = await import("./routes/upload");
const { usage } = await import("./routes/usage");
const { configRoute } = await import("./routes/config");
const { securitySettingsRoute } = await import("./routes/security-settings");
const { feedback } = await import("./routes/feedback");
const { analytics } = await import("./routes/analytics");
const { toolsRoute } = await import("./routes/tools");
const { marketplace } = await import("./routes/marketplace");
const { webSourcesRoute } = await import("./routes/web-sources");
const { stripeRoute } = await import("./routes/stripe");
const { contactRoute } = await import("./routes/contact");
const { default: shopifyRoute } = await import("./routes/shopify");
const { getSocketMetricsHandler } = await import("./routes/socket-metrics");
const { onboardingRoute } = await import("./routes/onboarding");
const { accountRoute } = await import("./routes/account");
const { emailRoute } = await import("./routes/email");
const { messengerRoute } = await import("./routes/messenger");
const { default: userPreferencesRoute } = await import("./routes/user-preferences");
const { formSubmissionsRoute } = await import("./routes/form-submissions");
const { leads } = await import("./routes/leads");
const { triggersRouter } = await import("./routes/triggers");
const { apiKeysRoute } = await import("./routes/api-keys");
const { escalationsRoute } = await import("./routes/escalations");
const { admin } = await import("./routes/admin");
const { apiDiscoveryRoute } = await import("./routes/api-discovery");
const { attachments_route } = await import("./routes/attachments");
const { initRecapCron } = await import("./lib/cron");
const { flushAnalytics } = await import("./lib/analytics");

const app = new Hono<{ Variables: AuthVariables }>();

// CORS must be before auth routes
app.use(
	"/*",
	cors({
		origin: (origin) => {
			const allowedOrigins = [
				process.env.DASHBOARD_URL || "http://localhost:3000",
				process.env.WIDGET_URL || "http://localhost:3002",
			];
			// Allow requests with no origin (like mobile apps or curl)
			if (!origin) return allowedOrigins[0];
			// Check if origin is in allowed list
			if (allowedOrigins.includes(origin)) return origin;
			// Also allow any origin for widget embed (interface-settings and chat endpoints)
			return origin;
		},
		credentials: true,
		allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"X-Shopify-Shop",
			"X-Shopify-Host",
			"X-Requested-With",
		],
	}),
);

// Security headers
app.use(
	"/*",
	secureHeaders({
		xContentTypeOptions: "nosniff",
		xFrameOptions: false, // Handled conditionally below for Shopify compatibility
		strictTransportSecurity: "max-age=63072000; includeSubDomains; preload",
		referrerPolicy: "strict-origin-when-cross-origin",
		xXssProtection: "1; mode=block",
		permissionsPolicy: {
			camera: [],
			microphone: [],
			geolocation: [],
		},
		contentSecurityPolicy: {}, // Handled conditionally below
	}),
);

// Conditionally set X-Frame-Options and CSP based on route
// Shopify routes need to be frameable by Shopify admin; all others deny framing
const SHOPIFY_FRAME_ANCESTORS =
	"frame-ancestors https://*.myshopify.com https://admin.shopify.com https://*.spin.dev;";

app.use("/*", async (c, next) => {
	await next();
	const path = new URL(c.req.url).pathname;
	const isShopifyRoute = path.startsWith("/shopify/") || path.startsWith("/api/auth/magic-link/");

	if (isShopifyRoute) {
		c.res.headers.set("Content-Security-Policy", SHOPIFY_FRAME_ANCESTORS);
	} else {
		c.res.headers.set("X-Frame-Options", "DENY");
		c.res.headers.set("Content-Security-Policy", "default-src 'none'");
	}
});

// Auth middleware to populate user context for all routes
app.use("/*", authMiddleware);

// BetterAuth handler
app.on(["POST", "GET"], "/api/auth/*", (c) => {
	return auth.handler(c.req.raw);
});

// Custom session endpoint for Shopify embedded apps
// This bypasses better-auth and returns session based on Shopify session token
app.get("/api/shopify-session", (c) => {
	const user = c.get("user");
	if (!user) {
		return c.json({ session: null, user: null });
	}
	return c.json({
		session: { id: "shopify-session" },
		user: {
			id: user.id,
			email: user.email,
			emailVerified: user.emailVerified,
			name: user.name,
			image: user.image,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt,
		},
	});
});

app.get("/", (c) => {
	return c.json({ message: "Hello from Hono!" });
});

app.get("/health", (c) => {
	return c.json({ status: "ok" });
});

app.get("/admin/socket-metrics", getSocketMetricsHandler);

app.route("/chat", chat);
app.route("/documents", upload);
app.route("/text-sources", textSourcesRoute);
app.route("/qa-sources", qaSourcesRoute);
app.route("/conversations", conversationsRoute);
app.route("/agents", agentsRoute);
app.route("/interface-settings", interfaceSettingsRoute);
app.route("/usage", usage);
app.route("/team", team);
app.route("/config", configRoute);
app.route("/security-settings", securitySettingsRoute);
app.route("/feedback", feedback);
app.route("/analytics", analytics);
app.route("/tools", toolsRoute);
app.route("/marketplace", marketplace);
app.route("/web-sources", webSourcesRoute);
app.route("/stripe", stripeRoute);
app.route("/contact", contactRoute);
app.route("/shopify", shopifyRoute);
app.route("/onboarding", onboardingRoute);
app.route("/account", accountRoute);
app.route("/email", emailRoute);
app.route("/messenger", messengerRoute);
app.route("/user-preferences", userPreferencesRoute);
app.route("/form-submissions", formSubmissionsRoute);
app.route("/leads", leads);
app.route("/triggers", triggersRouter);
app.route("/api-keys", apiKeysRoute);
app.route("/escalations", escalationsRoute);
app.route("/admin", admin);
app.route("/discovery", apiDiscoveryRoute);
app.route("/attachments", attachments_route);

// Debug endpoint to manually trigger recap emails
app.get("/debug/trigger-recap", async (c) => {
	try {
		const { processRecapEmails } = await import("./lib/cron");
		await processRecapEmails();
		return c.json({ success: true, message: "Recap email processing triggered" });
	} catch (err) {
		return c.json({ success: false, error: String(err) }, 500);
	}
});

// Initialize cron jobs
initRecapCron();

const port = Number(process.env.PORT) || 3001;

console.log(`Server running on http://localhost:${port}`);

const server = serve({
	fetch: app.fetch,
	port,
});

// Setup Socket.IO
const { Server } = await import("socket.io");
const { setupSocketHandlers } = await import("./lib/socket-handlers");

const io = new Server(server as any, {
	cors: {
		origin: (origin, callback) => {
			const allowedOrigins = [
				process.env.DASHBOARD_URL || "http://localhost:3000",
				process.env.WIDGET_URL || "http://localhost:3002",
			];
			// Allow requests with no origin or any origin for widget embed
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(null, true); // Allow all for widget embed flexibility
			}
		},
		credentials: true,
		methods: ["GET", "POST"],
	},
	pingTimeout: 5000,
	pingInterval: 25000,
});

// Create namespaces
const conversationsNamespace = io.of("/conversations");
const dashboardNamespace = io.of("/dashboard");

// Setup socket event handlers
setupSocketHandlers(conversationsNamespace, dashboardNamespace);

// Make namespace available to other modules
const { setConversationsNamespace } = await import("./lib/socket-emitter");
setConversationsNamespace(conversationsNamespace);

console.log("Socket.IO server initialized");

// Export io for use in other modules
export { conversationsNamespace, dashboardNamespace, io };

// Graceful shutdown handler
const shutdown = async (signal: string) => {
	console.log(`\n${signal} received. Starting graceful shutdown...`);

	// Set a timeout to force shutdown if graceful shutdown takes too long
	const forceShutdownTimeout = setTimeout(() => {
		console.error("Graceful shutdown timed out. Forcing exit.");
		process.exit(1);
	}, 30000); // 30 second timeout

	try {
		// Flush PostHog analytics events
		console.log("Flushing analytics...");
		await flushAnalytics();

		// Close Socket.IO connections
		console.log("Closing Socket.IO connections...");
		io.close();

		// Wait 10 seconds for clients to reconnect to new server
		console.log("Waiting 10 seconds for clients to reconnect...");
		await new Promise((resolve) => setTimeout(resolve, 10000));

		// Close the server and wait for existing connections to finish
		await new Promise<void>((resolve, reject) => {
			server.close((err) => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});

		console.log("Server closed. All requests finished.");
		clearTimeout(forceShutdownTimeout);
		process.exit(0);
	} catch (err) {
		console.error("Error during shutdown:", err);
		clearTimeout(forceShutdownTimeout);
		process.exit(1);
	}
};

// Listen for termination signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default app;
