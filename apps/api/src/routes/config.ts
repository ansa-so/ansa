import { Hono } from "hono";

const configRoute = new Hono();

// Public configuration endpoint - no auth required
configRoute.get("/", (c) => {
	return c.json({
		selfHosted: process.env.SELF_HOSTED === "true",
		widgetUrl: process.env.WIDGET_URL || "http://localhost:3002",
		cdnUrl: process.env.CDN_URL || "http://localhost:3002",
		docsUrl: process.env.DOCS_URL || "http://localhost:3003",
		apiUrl: process.env.API_URL || "http://localhost:3001",
	});
});

export { configRoute };
