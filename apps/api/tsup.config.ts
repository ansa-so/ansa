import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["esm"],
	dts: true,
	clean: true,
	external: ["@ansa/db", "@ansa/types", "@ansa/utils"],
});
