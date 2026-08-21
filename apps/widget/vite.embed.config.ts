import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import pkg from "./package.json";

const API_URL = process.env.API_URL || "https://api.ansa.so";

// Plugin to inline CSS into the bundle for Shadow DOM injection
function inlineCssPlugin() {
	let cssContent = "";

	return {
		name: "inline-css-for-shadow-dom",
		enforce: "post" as const,

		// Capture CSS during build
		generateBundle(
			_options: unknown,
			bundle: Record<string, { type: string; source?: string; fileName: string }>,
		) {
			for (const [fileName, chunk] of Object.entries(bundle)) {
				if (fileName.endsWith(".css")) {
					cssContent = chunk.source as string;
					// Remove the CSS file from output - we'll inline it
					delete bundle[fileName];
				}
			}
		},

		// Inject CSS string into the JS bundle
		writeBundle() {
			if (!cssContent) return;

			const outPath = path.resolve("dist", "embed.js");
			let code = fs.readFileSync(outPath, "utf-8");
			// Replace the placeholder with actual CSS (properly escape for JS string)
			// Use JSON.stringify to handle all escaping, then strip the outer quotes
			const escapedCss = JSON.stringify(cssContent).slice(1, -1);
			code = code.replace("__ANSA_STYLES_PLACEHOLDER__", escapedCss);
			fs.writeFileSync(outPath, code);
		},
	};
}

// Separate config for building the self-contained embed bundle
export default defineConfig({
	plugins: [react(), inlineCssPlugin()],
	define: {
		__ANSA_VERSION__: JSON.stringify(pkg.version),
		__ANSA_API_URL__: JSON.stringify(API_URL),
		"process.env.NODE_ENV": JSON.stringify("production"),
	},
	css: {
		// Ensure CSS is extracted so we can capture it
		postcss: "./postcss.config.js",
	},
	build: {
		lib: {
			entry: "src/embed-standalone.tsx",
			name: "AnsaWidget",
			fileName: () => "embed.js",
			formats: ["iife"],
		},
		outDir: "dist",
		emptyOutDir: false,
		minify: "esbuild",
		cssCodeSplit: false, // Bundle all CSS together
		rollupOptions: {
			output: {
				// Ensure everything is bundled
				inlineDynamicImports: true,
				// Keep CSS as separate file initially so plugin can capture it
				assetFileNames: "[name][extname]",
			},
		},
	},
});
