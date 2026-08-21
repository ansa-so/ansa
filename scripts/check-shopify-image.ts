import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3000";
const pageUrl = new URL("/shopify", baseUrl).toString();

async function main() {
	const browser = await chromium.launch({
		headless: true,
		...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
	});

	try {
		const page = await browser.newPage();
		await page.goto(pageUrl, { waitUntil: "domcontentloaded" });

		const image = page.locator('img[alt="Shopify integration screenshot"]');
		await image.waitFor();
		await page.waitForFunction(
			() =>
				document.querySelector<HTMLImageElement>('img[alt="Shopify integration screenshot"]')
					?.complete,
		);

		const dimensions = await image.evaluate((element) => {
			const imageElement = element as HTMLImageElement;
			return {
				naturalHeight: imageElement.naturalHeight,
				naturalWidth: imageElement.naturalWidth,
				src: imageElement.currentSrc,
			};
		});

		if (dimensions.naturalWidth === 0 || dimensions.naturalHeight === 0) {
			throw new Error(`Shopify hero image did not load: ${JSON.stringify(dimensions)}`);
		}

		console.log("Shopify hero image loaded correctly");
	} finally {
		await browser.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
