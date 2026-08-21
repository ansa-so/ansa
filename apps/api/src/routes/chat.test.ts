import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Drizzle query-builder double.
 *
 * The previous version of this file mocked the database by call sequence
 * (`mockReturnValueOnce` chains), so every new query added to chat.ts shifted
 * the sequence and broke unrelated assertions. This resolves rows by *table*
 * instead, which is order-independent: tests declare what a table contains and
 * chat.ts can query in any order, any number of times.
 */
const dbMock = vi.hoisted(() => {
	const fixtures = new Map<string, unknown[]>();
	const inserts: Array<{ table: string; values: unknown }> = [];
	const updates: Array<{ table: string; set: unknown }> = [];

	const nameOf = (t: unknown): string =>
		t && typeof t === "object" && "__table" in t
			? String((t as { __table: string }).__table)
			: "unknown";

	function chain(initialTable: string) {
		let tbl = initialTable;
		const rows = () => fixtures.get(tbl) ?? [];
		// biome-ignore lint/suspicious/noExplicitAny: a query-builder double is inherently untyped
		const self: any = {
			from: (t: unknown) => {
				tbl = nameOf(t);
				return self;
			},
			innerJoin: () => self,
			leftJoin: () => self,
			where: () => self,
			orderBy: () => self,
			groupBy: () => self,
			having: () => self,
			limit: () => self,
			offset: () => self,
			values: (v: unknown) => {
				inserts.push({ table: tbl, values: v });
				return self;
			},
			set: (v: unknown) => {
				updates.push({ table: tbl, set: v });
				return self;
			},
			returning: () => self,
			onConflictDoNothing: () => self,
			onConflictDoUpdate: () => self,
			execute: () => Promise.resolve(rows()),
			// Thenable, so `await db.select().from(x).where(y)` yields the fixture rows.
			// biome-ignore lint/suspicious/noThenProperty: a Drizzle query builder is awaitable, so its double must be too
			then: (ok: unknown, err: unknown) => Promise.resolve(rows()).then(ok as never, err as never),
			catch: (err: unknown) => Promise.resolve(rows()).catch(err as never),
			finally: (f: () => void) => Promise.resolve(rows()).finally(f),
		};
		return self;
	}

	return {
		db: {
			select: () => chain("unknown"),
			insert: (t: unknown) => chain(nameOf(t)),
			update: (t: unknown) => chain(nameOf(t)),
			delete: (t: unknown) => chain(nameOf(t)),
		},
		reset() {
			fixtures.clear();
			inserts.length = 0;
			updates.length = 0;
		},
		/** Declare the rows a table returns for every query against it. */
		setRows(tableName: string, rows: unknown[]) {
			fixtures.set(tableName, rows);
		},
		/** Every `.values()` payload written to a table, in call order. */
		insertsFor(tableName: string) {
			return inserts.filter((i) => i.table === tableName).map((i) => i.values);
		},
		/** Every `.set()` payload applied to a table, in call order. */
		updatesFor(tableName: string) {
			return updates.filter((u) => u.table === tableName).map((u) => u.set);
		},
	};
});

vi.mock("@ansa/db", () => {
	const table = (name: string) => ({ __table: name });
	return {
		getDb: () => dbMock.db,
		agentEscalationSettings: table("agentEscalationSettings"),
		agents: table("agents"),
		agentTools: table("agentTools"),
		chatMessages: table("chatMessages"),
		conversations: table("conversations"),
		escalations: table("escalations"),
		interfaceSettings: table("interfaceSettings"),
		interfaceSettingsTranslations: table("interfaceSettingsTranslations"),
		kbRetrievalSources: table("kbRetrievalSources"),
		llmUsage: table("llmUsage"),
		retrievalTraces: table("retrievalTraces"),
		securitySettings: table("securitySettings"),
		shopifyCustomers: table("shopifyCustomers"),
		shopifyOrders: table("shopifyOrders"),
		shopifyProducts: table("shopifyProducts"),
		shopifyShopAgents: table("shopifyShopAgents"),
		shopifyShops: table("shopifyShops"),
		toolExecutions: table("toolExecutions"),
		turnEvents: table("turnEvents"),
		turns: table("turns"),
		userSubscriptions: table("userSubscriptions"),
		and: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		inArray: vi.fn(),
		isNotNull: vi.fn(),
		isNull: vi.fn(),
		or: vi.fn(),
		sql: vi.fn(),
	};
});

// chat.ts streams through lib/llm, not the Anthropic client directly.
vi.mock("../lib/llm", () => ({ streamChat: vi.fn() }));
vi.mock("../lib/vector", () => ({ vectorClient: { search: vi.fn() } }));
vi.mock("../lib/embeddings", () => ({ createQueryEmbedding: vi.fn() }));
vi.mock("../lib/socket-emitter", () => ({ emitToConversation: vi.fn() }));
vi.mock("../lib/analytics", () => ({ trackLLMCost: vi.fn() }));
vi.mock("../lib/usage", () => ({
	usageProvider: {
		canSendMessage: vi.fn(),
		trackMessage: vi.fn(),
		getUsage: vi.fn(),
	},
}));

import { createQueryEmbedding } from "../lib/embeddings";
import { streamChat } from "../lib/llm";
import { usageProvider } from "../lib/usage";
import { vectorClient } from "../lib/vector";
import { chat } from "./chat";

type StreamEvent = {
	type: "text_delta" | "tool_use" | "done" | "error";
	text?: string;
	error?: string;
	usage?: { inputTokens: number; outputTokens: number };
};

/** Drive the streamChat callback with a scripted sequence of events. */
function scriptStream(events: StreamEvent[]) {
	vi.mocked(streamChat).mockImplementation(
		async (_options, callback: (e: StreamEvent) => Promise<void>) => {
			for (const event of events) {
				await callback(event);
			}
		},
	);
}

/** Shorthand: emit the given text as deltas, then a done event with usage. */
function scriptText(...chunks: string[]) {
	scriptStream([
		...chunks.map((text) => ({ type: "text_delta" as const, text })),
		{ type: "done" as const, usage: { inputTokens: 10, outputTokens: 20 } },
	]);
}

/** Read the body so the SSE stream runs to completion before we assert. */
async function drain(res: Response) {
	await res.text();
}

async function collectSSEEvents(response: Response) {
	const text = await response.text();
	const events: Array<{ event: string; data: unknown }> = [];
	let currentEvent = "";

	for (const line of text.split("\n")) {
		if (line.startsWith("event:")) {
			currentEvent = line.slice(6).trim();
		} else if (line.startsWith("data:")) {
			const data = line.slice(5).trim();
			if (currentEvent && data) {
				events.push({ event: currentEvent, data: JSON.parse(data) });
				currentEvent = "";
			}
		}
	}
	return events;
}

const AGENT = {
	id: "agent-1",
	userId: "user-456",
	name: "Test Agent",
	systemPrompt: "You are helpful",
	persona: null,
	temperature: 50,
	model: "claude-sonnet-4-20250514",
	aiQuality: "balanced",
	isDefault: true,
	confidenceThreshold: 70,
	lowConfidenceAction: "respond",
};

function post(body: unknown, app: Hono) {
	return app.request("/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /chat", () => {
	let app: Hono;

	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.reset();

		// Unit tests run in self-hosted mode: plan limits and the branding gate are
		// billing concerns with their own coverage, and they would otherwise 403
		// every request here.
		process.env.SELF_HOSTED = "true";

		dbMock.setRows("agents", [AGENT]);
		// chat.ts dereferences `.returning()` when it creates a conversation, a turn,
		// a chat message, and a retrieval trace. Each needs at least one row.
		dbMock.setRows("conversations", [{ id: "conv-new", agentId: "agent-1", aiResponseCount: 0 }]);
		dbMock.setRows("turns", [{ id: "turn-1" }]);
		dbMock.setRows("chatMessages", [{ id: "msg-1" }]);
		dbMock.setRows("retrievalTraces", [{ id: "trace-1" }]);
		vi.mocked(vectorClient.search).mockResolvedValue({
			results: [],
			meta: { latencyMs: 0, candidateCount: 0, postFilterCount: 0 },
		});
		vi.mocked(createQueryEmbedding).mockResolvedValue([]);
		vi.mocked(usageProvider.canSendMessage).mockResolvedValue({
			allowed: true,
			used: 0,
			limit: -1,
		});
		vi.mocked(usageProvider.trackMessage).mockResolvedValue(undefined);
		scriptText("Hello");

		app = new Hono();
		app.route("/chat", chat);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("validation", () => {
		it("returns 400 when messages array is missing", async () => {
			const res = await post({ agentId: "agent-1" }, app);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "messages array required" });
		});

		it("returns 400 when messages is not an array", async () => {
			const res = await post({ agentId: "agent-1", messages: "not an array" }, app);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "messages array required" });
		});

		it("returns 400 when messages array is empty", async () => {
			const res = await post({ agentId: "agent-1", messages: [] }, app);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "messages array required" });
		});

		it("returns 400 when agentId is missing", async () => {
			const res = await post({ messages: [{ role: "user", content: "Hi" }] }, app);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "agentId required" });
		});

		it("returns 400 when no user message exists", async () => {
			const res = await post(
				{ agentId: "agent-1", messages: [{ role: "assistant", content: "Hello" }] },
				app,
			);
			expect(res.status).toBe(400);
			expect(await res.json()).toEqual({ error: "at least one user message required" });
		});
	});

	describe("streaming response", () => {
		it("streams SSE events in ChatKit protocol format", async () => {
			scriptText("Hello", " World");

			const res = await post(
				{ agentId: "agent-1", messages: [{ role: "user", content: "Hi" }] },
				app,
			);

			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toContain("text/event-stream");

			const events = await collectSSEEvents(res);

			const messageStart = events.find((e) => e.event === "message_start");
			expect(messageStart).toBeDefined();
			const startData = messageStart?.data as {
				type: string;
				message: { role: string; id: string };
			};
			expect(startData.type).toBe("message_start");
			expect(startData.message.role).toBe("assistant");
			expect(startData.message.id).toBeDefined();

			const blockStart = events.find((e) => e.event === "content_block_start");
			expect(blockStart).toBeDefined();
			// Narrow before indexing: dereferencing an optional chain throws when the
			// event is missing, which hides which assertion actually failed.
			const blockStartData = blockStart?.data as { index: number } | undefined;
			expect(blockStartData?.index).toBe(0);

			const deltas = events.filter((e) => e.event === "content_block_delta");
			expect(deltas.length).toBe(2);
			const deltaTexts = deltas.map((e) => (e.data as { delta?: { text?: string } }).delta?.text);
			expect(deltaTexts).toEqual(["Hello", " World"]);
		});

		it("includes vector search context in the system prompt", async () => {
			vi.mocked(vectorClient.search).mockResolvedValue({
				results: [
					{
						id: "chunk-1",
						sourceId: "src-1",
						sourceType: "qa" as const,
						score: 0.9,
						content: "Refunds take 5 days.",
					},
				],
				meta: { latencyMs: 1, candidateCount: 1, postFilterCount: 1 },
			});

			await drain(
				await post(
					{ agentId: "agent-1", messages: [{ role: "user", content: "refund policy?" }] },
					app,
				),
			);

			expect(streamChat).toHaveBeenCalled();
			const [options] = vi.mocked(streamChat).mock.calls[0];
			expect(options.system).toContain("Refunds take 5 days.");
		});

		it("uses the agent's own prompt when no context is available", async () => {
			await drain(
				await post({ agentId: "agent-1", messages: [{ role: "user", content: "Hi" }] }, app),
			);

			const [options] = vi.mocked(streamChat).mock.calls[0];
			expect(options.system).toContain("You are helpful");
		});

		it("searches with the most recent user message", async () => {
			await drain(
				await post(
					{
						agentId: "agent-1",
						messages: [
							{ role: "user", content: "first question" },
							{ role: "assistant", content: "an answer" },
							{ role: "user", content: "second question" },
						],
					},
					app,
				),
			);

			expect(vectorClient.search).toHaveBeenCalled();
			const searchArgs = vi.mocked(vectorClient.search).mock.calls[0];
			expect(JSON.stringify(searchArgs)).toContain("second question");
		});

		it("passes the conversation to the model in order", async () => {
			await drain(
				await post(
					{
						agentId: "agent-1",
						messages: [
							{ role: "user", content: "Hello" },
							{ role: "assistant", content: "Hi there" },
							{ role: "user", content: "How are you?" },
						],
					},
					app,
				),
			);

			const [options] = vi.mocked(streamChat).mock.calls[0];
			expect(options.messages.map((m: { role: string }) => m.role)).toEqual([
				"user",
				"assistant",
				"user",
			]);
			expect(options.messages.at(-1)?.content).toContain("How are you?");
		});
	});

	describe("error handling", () => {
		it("streams an error event when the model call fails", async () => {
			vi.mocked(streamChat).mockRejectedValue(new Error("Anthropic API error"));

			const res = await post(
				{ agentId: "agent-1", messages: [{ role: "user", content: "Hi" }] },
				app,
			);

			expect(res.status).toBe(200);
			const events = await collectSSEEvents(res);
			expect(events.some((e) => e.event === "error")).toBe(true);
		});

		it("streams an error event for non-Error exceptions", async () => {
			vi.mocked(streamChat).mockRejectedValue("a string, not an Error");

			const res = await post(
				{ agentId: "agent-1", messages: [{ role: "user", content: "Hi" }] },
				app,
			);

			expect(res.status).toBe(200);
			const events = await collectSSEEvents(res);
			expect(events.some((e) => e.event === "error")).toBe(true);
		});
	});
});

describe("escalation flow", () => {
	let app: Hono;
	const conversationId = "conv-123";

	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.reset();
		process.env.SELF_HOSTED = "true";

		dbMock.setRows("agents", [AGENT]);
		dbMock.setRows("conversations", [
			{ id: conversationId, agentId: "agent-1", aiResponseCount: 0 },
		]);
		dbMock.setRows("turns", [{ id: "turn-1" }]);
		dbMock.setRows("retrievalTraces", [{ id: "trace-1" }]);
		vi.mocked(createQueryEmbedding).mockResolvedValue([]);
		vi.mocked(usageProvider.canSendMessage).mockResolvedValue({
			allowed: true,
			used: 0,
			limit: -1,
		});
		vi.mocked(vectorClient.search).mockResolvedValue({
			results: [],
			meta: { latencyMs: 0, candidateCount: 0, postFilterCount: 0 },
		});

		app = new Hono();
		app.route("/chat", chat);
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it("saves the user message and skips the AI response while escalated", async () => {
		dbMock.setRows("escalations", [{ id: "esc-1", status: "open" }]);
		const userMessage = "I need help with my order";

		const res = await post(
			{ agentId: "agent-1", conversationId, messages: [{ role: "user", content: userMessage }] },
			app,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toMatchObject({
			success: true,
			conversationId,
			escalated: true,
		});

		// The message must be persisted even though no AI reply is generated,
		// otherwise the human agent never sees what the customer asked.
		expect(dbMock.insertsFor("chatMessages")).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ conversationId, role: "user", content: userMessage }),
			]),
		);

		// No model call on the escalated path.
		expect(streamChat).not.toHaveBeenCalled();
	});

	it("moves an escalation from waiting_on_customer back to in_progress", async () => {
		dbMock.setRows("escalations", [{ id: "esc-1", status: "waiting_on_customer" }]);

		const res = await post(
			{ agentId: "agent-1", conversationId, messages: [{ role: "user", content: "any update?" }] },
			app,
		);

		expect(res.status).toBe(200);
		expect(dbMock.updatesFor("escalations")).toEqual(
			expect.arrayContaining([expect.objectContaining({ status: "in_progress" })]),
		);
	});

	it("saves every user message sent after escalation, not just the first", async () => {
		dbMock.setRows("escalations", [{ id: "esc-1", status: "in_progress" }]);

		for (const content of ["first follow-up", "second follow-up"]) {
			const res = await post(
				{ agentId: "agent-1", conversationId, messages: [{ role: "user", content }] },
				app,
			);
			expect(res.status).toBe(200);
		}

		const saved = dbMock
			.insertsFor("chatMessages")
			.filter(
				(v): v is { role: string; content: string } => (v as { role: string }).role === "user",
			)
			.map((v) => v.content);

		expect(saved).toEqual(["first follow-up", "second follow-up"]);
	});
});
