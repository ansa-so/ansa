import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = path.join(__dirname, "../apps/dashboard/public/email-icons");
const OUTPUT_SIZE = 48; // 2x resolution for retina displays

async function generateEmailIcons() {
	const files = fs.readdirSync(ICONS_DIR);
	const svgFiles = files.filter((f) => f.endsWith(".svg"));

	console.log(`Found ${svgFiles.length} SVG files to convert...`);

	for (const svgFile of svgFiles) {
		const svgPath = path.join(ICONS_DIR, svgFile);
		const pngPath = path.join(ICONS_DIR, svgFile.replace(".svg", ".png"));

		await sharp(svgPath)
			.resize(OUTPUT_SIZE, OUTPUT_SIZE)
			.png({ compressionLevel: 9 })
			.toFile(pngPath);

		console.log(`✓ ${svgFile} → ${svgFile.replace(".svg", ".png")}`);
	}

	console.log(`\nDone! Generated ${svgFiles.length} PNG icons.`);
}

generateEmailIcons().catch((err) => {
	console.error("Error generating icons:", err);
	process.exit(1);
});
