import {
	agents,
	and,
	count,
	eq,
	getDb,
	webSourcePageChunks,
	webSourcePages,
	webSources,
} from "@ansa/db";
import { Hono } from "hono";
import { chunkText } from "../lib/chunker";
import { createEmbedding } from "../lib/embeddings";
import { getStorageLimit, getWebSourceLimit } from "../lib/plans";
import { safeFetch } from "../lib/safe-fetch";
import { usageProvider } from "../lib/usage";

const webSourcesRoute = new Hono();

// Helper to verify agent ownership
async function verifyAgentOwnership(
	db: ReturnType<typeof getDb>,
	agentId: string,
	userId: string,
): Promise<boolean> {
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
		.limit(1);
	return !!agent;
}

// Helper to delay execution
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Fetch content from a URL using Jina Reader with retry logic
async function fetchPageContent(
	url: string,
	retries = 3,
): Promise<{ title: string; content: string }> {
	const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;
	console.log(`[WebSource] Fetching content from: ${url}`);

	for (let attempt = 1; attempt <= retries; attempt++) {
		const response = await fetch(jinaUrl, {
			headers: {
				Accept: "text/plain",
				"User-Agent": "ansa.so/1.0",
			},
		});

		if (response.ok) {
			const text = await response.text();

			// Extract title from first line if it looks like a title
			const lines = text.split("\n");
			let title = url;
			let content = text;

			if (lines[0] && lines[0].length < 200 && !lines[0].includes(" ")) {
				title = lines[0];
				content = lines.slice(1).join("\n").trim();
			}

			return { title, content };
		}

		// Handle rate limiting with exponential backoff
		if (response.status === 429 && attempt < retries) {
			const waitTime = 2 ** attempt * 5000; // 10s, 20s, 40s
			console.log(
				`[WebSource] Rate limited on ${url}, waiting ${waitTime / 1000}s before retry ${attempt + 1}/${retries}`,
			);
			await delay(waitTime);
			continue;
		}

		const errorText = await response.text().catch(() => "");
		console.error(`[WebSource] Failed to fetch ${url}: ${response.status} - ${errorText}`);
		throw new Error(`Failed to fetch ${url}: ${response.status}`);
	}

	throw new Error(`Failed to fetch ${url} after ${retries} retries`);
}

// Fetch HTML content from a URL using Jina Reader (for link extraction in SPAs)
async function fetchHtmlForLinks(url: string): Promise<string> {
	// Use Jina Reader with HTML output for JavaScript-rendered pages
	const response = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
		headers: {
			Accept: "text/html",
			"User-Agent": "ansa.so/1.0",
			"X-Return-Format": "html",
		},
	});

	if (!response.ok) {
		// Fallback to direct fetch for simple HTML pages
		const directResponse = await safeFetch(url, {
			headers: { "User-Agent": "ansa.so/1.0" },
		});
		if (!directResponse.ok) return "";
		return directResponse.text();
	}

	return response.text();
}

// Parse sitemap XML to extract URLs
async function parseSitemap(url: string): Promise<string[]> {
	const response = await safeFetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch sitemap: ${response.status}`);
	}

	const xml = await response.text();
	const urls: string[] = [];

	// Extract URLs from sitemap using matchAll
	const locRegex = /<loc>([^<]+)<\/loc>/g;
	for (const match of xml.matchAll(locRegex)) {
		urls.push(match[1]);
	}

	// Check if this is a sitemap index (contains other sitemaps)
	if (xml.includes("<sitemapindex")) {
		const nestedUrls: string[] = [];
		for (const sitemapUrl of urls.slice(0, 5)) {
			// Limit nested sitemaps
			try {
				const nested = await parseSitemap(sitemapUrl);
				nestedUrls.push(...nested);
			} catch {
				// Ignore nested sitemap errors
			}
		}
		return nestedUrls;
	}

	return urls;
}

// Extract links from a page for crawling
async function extractLinks(url: string, content: string): Promise<string[]> {
	const baseUrl = new URL(url);
	const links: string[] = [];

	// File extensions to exclude (assets, media, etc.)
	const excludedExtensions = [
		// Stylesheets
		".css",
		// Scripts
		".js",
		".mjs",
		".cjs",
		".ts",
		// Fonts
		".woff",
		".woff2",
		".ttf",
		".otf",
		".eot",
		// Images
		".png",
		".jpg",
		".jpeg",
		".gif",
		".svg",
		".ico",
		".webp",
		".avif",
		".bmp",
		// Media
		".mp3",
		".mp4",
		".wav",
		".ogg",
		".webm",
		".avi",
		".mov",
		// Documents
		".pdf",
		".doc",
		".docx",
		".xls",
		".xlsx",
		".ppt",
		".pptx",
		// Archives
		".zip",
		".tar",
		".gz",
		".rar",
		".7z",
		// Data files
		".json",
		".xml",
		".csv",
		".yaml",
		".yml",
		// Maps
		".map",
	];

	// Extract href attributes using matchAll
	const hrefRegex = /href=["']([^"']+)["']/g;
	for (const match of content.matchAll(hrefRegex)) {
		try {
			const linkUrl = new URL(match[1], baseUrl.href);
			const pathname = linkUrl.pathname.toLowerCase();

			// Only include links from same domain
			if (linkUrl.hostname !== baseUrl.hostname) continue;

			// Skip fragment-only links (like href="#section")
			if (match[1].startsWith("#")) continue;

			// Strip fragment from URL
			linkUrl.hash = "";

			// Skip asset files
			const isAsset = excludedExtensions.some((ext) => pathname.endsWith(ext));
			if (isAsset) continue;

			// Skip common asset directories
			if (
				pathname.includes("/assets/") ||
				pathname.includes("/static/") ||
				pathname.includes("/_next/") ||
				pathname.includes("/fonts/") ||
				pathname.includes("/images/") ||
				pathname.includes("/img/") ||
				pathname.includes("/css/") ||
				pathname.includes("/js/")
			)
				continue;

			links.push(linkUrl.href);
		} catch {
			// Ignore invalid URLs
		}
	}

	return [...new Set(links)]; // Deduplicate
}

// Helper function to start crawling a web source (non-blocking)
async function startCrawl(sourceId: string): Promise<void> {
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);
	if (!source) return;

	// Update status to crawling
	await db
		.update(webSources)
		.set({ status: "crawling", errorMessage: null })
		.where(eq(webSources.id, sourceId));

	// Start crawl in background (non-blocking)
	(async () => {
		try {
			let pageUrls: string[] = [];
			const maxPages = source.maxPages || 100;

			if (source.sourceType === "individual" || source.sourceType === "page") {
				pageUrls = [source.url];
			} else if (source.sourceType === "sitemap") {
				pageUrls = await parseSitemap(source.url);
			} else if (source.sourceType === "crawl") {
				// Recursive crawl - discover pages by following links
				const baseUrl = new URL(source.url);
				const discovered = new Set<string>([source.url]);
				const toVisit: string[] = [source.url];

				console.log(`[WebSource] Starting crawl for ${source.url}, maxPages: ${maxPages}`);

				while (toVisit.length > 0 && discovered.size < maxPages) {
					const currentUrl = toVisit.shift()!;
					try {
						console.log(`[WebSource] Fetching links from: ${currentUrl}`);
						// Use Jina Reader to get HTML (handles JavaScript-rendered pages)
						const html = await fetchHtmlForLinks(currentUrl);
						if (!html) {
							console.log(`[WebSource] No content from: ${currentUrl}`);
							continue;
						}

						const newLinks = await extractLinks(currentUrl, html);
						console.log(`[WebSource] Found ${newLinks.length} links on ${currentUrl}`);

						// Filter to only include URLs under the same path prefix (subpath crawl)
						const basePath = baseUrl.pathname.replace(/\/$/, "");
						for (const link of newLinks) {
							if (discovered.size >= maxPages) break;
							try {
								const linkUrl = new URL(link);
								// Must be same hostname
								if (linkUrl.hostname !== baseUrl.hostname) continue;
								// Must be under the same path prefix (or equal)
								if (!linkUrl.pathname.startsWith(basePath)) continue;
								// Not already discovered
								if (!discovered.has(link)) {
									discovered.add(link);
									toVisit.push(link);
									console.log(`[WebSource] Discovered: ${link}`);
								}
							} catch {
								// Invalid URL
							}
						}
					} catch (error) {
						// Failed to fetch page, continue with next
						console.log(`[WebSource] Failed to fetch ${currentUrl}:`, error);
					}
				}

				pageUrls = Array.from(discovered);
				console.log(`[WebSource] Crawl complete. Total pages discovered: ${pageUrls.length}`);
			}

			// Limit pages
			pageUrls = pageUrls.slice(0, maxPages);

			// Clear existing pages for re-crawl
			await db.delete(webSourcePages).where(eq(webSourcePages.webSourceId, sourceId));

			// Create page entries
			for (const url of pageUrls) {
				await db.insert(webSourcePages).values({
					webSourceId: sourceId,
					url,
					status: "pending",
				});
			}

			// Crawl each page
			const pages = await db
				.select()
				.from(webSourcePages)
				.where(and(eq(webSourcePages.webSourceId, sourceId), eq(webSourcePages.status, "pending")));

			console.log(`[WebSource] Processing ${pages.length} pages for content extraction`);

			for (let i = 0; i < pages.length; i++) {
				const page = pages[i];
				try {
					// Add delay between requests to avoid rate limiting (except for first request)
					if (i > 0) {
						await delay(3000); // 3 second delay between requests
					}

					const { title, content } = await fetchPageContent(page.url);
					const contentSize = Buffer.byteLength(content, "utf-8");

					// Update page
					await db
						.update(webSourcePages)
						.set({
							title,
							content,
							contentSize,
							status: "crawled",
							lastCrawledAt: new Date(),
						})
						.where(eq(webSourcePages.id, page.id));

					// Delete old chunks
					await db
						.delete(webSourcePageChunks)
						.where(eq(webSourcePageChunks.webSourcePageId, page.id));

					// Create embeddings
					const chunks = chunkText(content);
					for (let j = 0; j < chunks.length; j++) {
						const embedding = await createEmbedding(chunks[j]);
						await db.insert(webSourcePageChunks).values({
							webSourcePageId: page.id,
							content: chunks[j],
							chunkIndex: j,
							embedding,
						});
					}

					console.log(
						`[WebSource] Successfully processed page ${i + 1}/${pages.length}: ${page.url}`,
					);
				} catch (error) {
					console.error(`[WebSource] Failed to process page ${page.url}:`, error);
					await db
						.update(webSourcePages)
						.set({
							status: "failed",
							errorMessage: error instanceof Error ? error.message : "Unknown error",
						})
						.where(eq(webSourcePages.id, page.id));
				}
			}

			// Update source status
			await db
				.update(webSources)
				.set({
					status: "completed",
					lastCrawledAt: new Date(),
				})
				.where(eq(webSources.id, sourceId));
		} catch (error) {
			await db
				.update(webSources)
				.set({
					status: "failed",
					errorMessage: error instanceof Error ? error.message : "Unknown error",
				})
				.where(eq(webSources.id, sourceId));
		}
	})();
}

// GET /web-sources - List all web sources for an agent
webSourcesRoute.get("/", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const agentId = c.req.query("agentId");
	if (!agentId) {
		return c.json({ error: "agentId required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const sources = await db
		.select()
		.from(webSources)
		.where(eq(webSources.agentId, agentId))
		.orderBy(webSources.createdAt);

	// Get page counts and total sizes for each source
	const sourcesWithStats = await Promise.all(
		sources.map(async (source) => {
			const pages = await db
				.select()
				.from(webSourcePages)
				.where(eq(webSourcePages.webSourceId, source.id));

			const pageCount = pages.length;
			const totalSize = pages.reduce((sum, p) => sum + (p.contentSize || 0), 0);
			const crawledCount = pages.filter((p) => p.status === "crawled").length;

			return {
				...source,
				pageCount,
				crawledCount,
				totalSize,
			};
		}),
	);

	return c.json(sourcesWithStats);
});

// GET /web-sources/:id - Get a web source with its pages
webSourcesRoute.get("/:id", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const pages = await db
		.select()
		.from(webSourcePages)
		.where(eq(webSourcePages.webSourceId, id))
		.orderBy(webSourcePages.createdAt);

	return c.json({ ...source, pages });
});

// POST /web-sources - Create a new web source
webSourcesRoute.post("/", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const body = await c.req.json<{
		agentId: string;
		url: string;
		sourceType: "individual" | "page" | "sitemap" | "crawl";
		name?: string;
		maxPages?: number;
	}>();

	if (!body.agentId || !body.url || !body.sourceType) {
		return c.json({ error: "agentId, url, and sourceType are required" }, 400);
	}

	const db = getDb();

	if (!(await verifyAgentOwnership(db, body.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Check storage limit
	const usageData = await usageProvider.getUsage(user.id);
	const storageLimit = getStorageLimit(usageData.planId);
	if (storageLimit !== -1 && usageData.storageUsed >= storageLimit) {
		return c.json(
			{
				error: "Storage limit reached. Please upgrade your plan or delete existing content.",
				code: "STORAGE_LIMIT_REACHED",
			},
			403,
		);
	}

	// Check web source limit
	const webSourceLimit = getWebSourceLimit(usageData.planId);
	if (webSourceLimit !== -1) {
		// Count existing web sources for all user's agents
		const userAgents = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.userId, user.id));
		const agentIds = userAgents.map((a) => a.id);

		let totalWebSources = 0;
		if (agentIds.length > 0) {
			for (const agentId of agentIds) {
				const [result] = await db
					.select({ count: count() })
					.from(webSources)
					.where(eq(webSources.agentId, agentId));
				totalWebSources += result?.count ?? 0;
			}
		}

		if (totalWebSources >= webSourceLimit) {
			return c.json(
				{
					error: `Web source limit reached (${webSourceLimit}). Please upgrade your plan or delete existing web sources.`,
					code: "WEB_SOURCE_LIMIT_REACHED",
				},
				403,
			);
		}
	}

	// Normalize sourceType (frontend sends "individual", backend originally used "page")
	const normalizedSourceType = body.sourceType === "individual" ? "individual" : body.sourceType;

	// Create the web source
	const [source] = await db
		.insert(webSources)
		.values({
			agentId: body.agentId,
			url: body.url,
			sourceType: normalizedSourceType,
			name: body.name || new URL(body.url).hostname,
			maxPages: body.maxPages || 100,
			status: "pending",
		})
		.returning();

	// Start crawling automatically (non-blocking)
	startCrawl(source.id);

	return c.json(source, 201);
});

// POST /web-sources/:id/crawl - Start crawling a web source
webSourcesRoute.post("/:id/crawl", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Start crawl using the helper function
	startCrawl(id);

	return c.json({ success: true, message: "Crawl started" });
});

// POST /web-sources/:id/recrawl - Alias for crawl endpoint
webSourcesRoute.post("/:id/recrawl", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	// Start crawl using the helper function
	startCrawl(id);

	return c.json({ success: true, message: "Crawl started" });
});

// DELETE /web-sources/:id - Delete a web source
webSourcesRoute.delete("/:id", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const id = c.req.param("id");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, id)).limit(1);

	if (!source) {
		return c.json({ error: "Web source not found" }, 404);
	}

	if (!(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Agent not found" }, 404);
	}

	await db.delete(webSources).where(eq(webSources.id, id));

	return c.json({ success: true });
});

// PATCH /web-sources/:sourceId/pages/:pageId - Update a page (e.g., exclude)
webSourcesRoute.patch("/:sourceId/pages/:pageId", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sourceId = c.req.param("sourceId");
	const pageId = c.req.param("pageId");
	const body = await c.req.json<{ isExcluded?: boolean; status?: string }>();
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);

	if (!source || !(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const [page] = await db
		.select()
		.from(webSourcePages)
		.where(and(eq(webSourcePages.id, pageId), eq(webSourcePages.webSourceId, sourceId)))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Determine new status
	const newStatus =
		body.isExcluded !== undefined ? (body.isExcluded ? "excluded" : "crawled") : body.status;

	// If excluding, delete chunks
	if (newStatus === "excluded") {
		await db.delete(webSourcePageChunks).where(eq(webSourcePageChunks.webSourcePageId, pageId));
	}

	await db
		.update(webSourcePages)
		.set({ status: newStatus, updatedAt: new Date() })
		.where(eq(webSourcePages.id, pageId));

	return c.json({ success: true });
});

// POST /web-sources/:sourceId/pages/:pageId/recrawl - Recrawl a single page
webSourcesRoute.post("/:sourceId/pages/:pageId/recrawl", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sourceId = c.req.param("sourceId");
	const pageId = c.req.param("pageId");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);

	if (!source || !(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const [page] = await db
		.select()
		.from(webSourcePages)
		.where(and(eq(webSourcePages.id, pageId), eq(webSourcePages.webSourceId, sourceId)))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	try {
		// Fetch fresh content
		const { title, content } = await fetchPageContent(page.url);
		const contentSize = Buffer.byteLength(content, "utf-8");

		// Update page
		await db
			.update(webSourcePages)
			.set({
				title,
				content,
				contentSize,
				status: "crawled",
				lastCrawledAt: new Date(),
				errorMessage: null,
			})
			.where(eq(webSourcePages.id, pageId));

		// Delete old chunks
		await db.delete(webSourcePageChunks).where(eq(webSourcePageChunks.webSourcePageId, pageId));

		// Create new embeddings
		const chunks = chunkText(content);
		for (let j = 0; j < chunks.length; j++) {
			const embedding = await createEmbedding(chunks[j]);
			await db.insert(webSourcePageChunks).values({
				webSourcePageId: pageId,
				content: chunks[j],
				chunkIndex: j,
				embedding,
			});
		}

		console.log(`[WebSource] Successfully recrawled page: ${page.url}`);
		return c.json({ success: true });
	} catch (error) {
		console.error(`[WebSource] Failed to recrawl page ${page.url}:`, error);
		await db
			.update(webSourcePages)
			.set({
				status: "failed",
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			})
			.where(eq(webSourcePages.id, pageId));
		return c.json({ error: "Failed to recrawl page" }, 500);
	}
});

// DELETE /web-sources/:sourceId/pages/:pageId - Delete a page
webSourcesRoute.delete("/:sourceId/pages/:pageId", async (c) => {
	// @ts-expect-error - user is set by auth middleware
	const user = c.get("user") as { id: string } | null;
	if (!user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const sourceId = c.req.param("sourceId");
	const pageId = c.req.param("pageId");
	const db = getDb();

	const [source] = await db.select().from(webSources).where(eq(webSources.id, sourceId)).limit(1);

	if (!source || !(await verifyAgentOwnership(db, source.agentId, user.id))) {
		return c.json({ error: "Not authorized" }, 403);
	}

	const [page] = await db
		.select()
		.from(webSourcePages)
		.where(and(eq(webSourcePages.id, pageId), eq(webSourcePages.webSourceId, sourceId)))
		.limit(1);

	if (!page) {
		return c.json({ error: "Page not found" }, 404);
	}

	// Delete chunks first
	await db.delete(webSourcePageChunks).where(eq(webSourcePageChunks.webSourcePageId, pageId));
	// Delete the page
	await db.delete(webSourcePages).where(eq(webSourcePages.id, pageId));

	return c.json({ success: true });
});

export { webSourcesRoute };
