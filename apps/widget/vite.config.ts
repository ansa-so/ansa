import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";

export default defineConfig({
	plugins: [react()],
	define: {
		__ANSA_VERSION__: JSON.stringify(pkg.version),
		// Map API_URL to VITE_API_URL at build time for consolidation
		"import.meta.env.VITE_API_URL": JSON.stringify(process.env.API_URL || "http://localhost:3001"),
	},
	build: {
		// Main app build only - embed is built separately via vite.embed.config.ts
	},
	server: {
		cors: true,
		port: 3002,
	},
});
