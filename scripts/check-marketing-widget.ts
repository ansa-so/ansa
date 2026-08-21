import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
	});

	try {
		const page = await browser.newPage();
		await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
		await page.waitForSelector("#ansa-widget-container", {
			state: "attached",
			timeout: 15_000,
		});
		console.log(`Marketing widget loaded on ${baseUrl}`);
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
