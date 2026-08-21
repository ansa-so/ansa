import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const distDir = path.resolve(import.meta.dirname, "../apps/widget/dist");

const contentTypes: Record<string, string> = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".js": "application/javascript; charset=utf-8",
};

const server = createServer(async (request, response) => {
	try {
		const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
		const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
		const filePath = path.resolve(distDir, relativePath);

		if (!filePath.startsWith(`${distDir}${path.sep}`)) {
			response.writeHead(403).end();
			return;
		}

		const body = await readFile(filePath);
		response.writeHead(200, {
			"Content-Type": contentTypes[path.extname(filePath)] ?? "application/octet-stream",
		});
		response.end(body);
	} catch {
		response.writeHead(404).end();
	}
});

async function main() {
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	const address = server.address();
	if (!address || typeof address === "string")
		throw new Error("Could not start widget test server");

	const browser = await chromium.launch({
		headless: true,
		...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
	});

	try {
		const page = await browser.newPage();
		await page.goto(`http://127.0.0.1:${address.port}/?mode=inline`, {
			waitUntil: "domcontentloaded",
		});
		await page.waitForSelector('input[placeholder="Type a message..."]');

		const styles = await page.evaluate(() => {
			const closeButton = Array.from(document.querySelectorAll("button")).find((button) =>
				button.className.includes("rounded-full"),
			);
			const input = document.querySelector<HTMLInputElement>(
				'input[placeholder="Type a message..."]',
			);
			if (!closeButton || !input) throw new Error("Inline widget controls did not render");

			const closeRect = closeButton.getBoundingClientRect();
			const closeStyle = getComputedStyle(closeButton);
			const inputStyle = getComputedStyle(input);

			return {
				closeHeight: closeRect.height,
				closeWidth: closeRect.width,
				closeBorderWidth: closeStyle.borderWidth,
				inputHeight: inputStyle.height,
				inputFontSize: inputStyle.fontSize,
			};
		});

		if (
			styles.closeWidth !== 32 ||
			styles.closeHeight !== 32 ||
			styles.closeBorderWidth !== "0px" ||
			styles.inputHeight !== "36px" ||
			styles.inputFontSize !== "14px"
		) {
			throw new Error(`Inline widget styles are missing: ${JSON.stringify(styles)}`);
		}

		console.log("Inline widget styles loaded correctly");
	} finally {
		await browser.close();
		server.close();
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
