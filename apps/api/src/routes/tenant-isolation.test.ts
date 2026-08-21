import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression tests for cross-tenant access on /leads and /triggers.
 *
 * Both routers previously read no session at all and scoped their queries only
 * by an id taken from the request, so any caller could read another tenant's
 * form submissions (which hold end-customer names, emails and phone numbers)
 * and modify or delete their triggers. `agentId` is public — it ships in the
 * widget snippet on every customer's site — so no guessing was required.
 *
 * The db double resolves rows by table, so a tenant "owning" a record is
 * expressed by whether the ownership lookup finds a row.
 */
const dbMock = vi.hoisted(() => {
	const fixtures = new Map<string, unknown[]>();
	const nameOf = (t: unknown): string =>
		t && typeof t === "object" && "__table" in t
			? String((t as { __table: string }).__table)
			: "unknown";

	function chain(initialTable: string) {
		let tbl = initialTable;
		const rows = () => fixtures.get(tbl) ?? [];
		// biome-ignore lint/suspicious/noExplicitAny: query-builder double
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
			limit: () => self,
			offset: () => self,
			values: () => self,
			set: () => self,
			returning: () => self,
			execute: () => Promise.resolve(rows()),
			// biome-ignore lint/suspicious/noThenProperty: a Drizzle query is awaitable
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
		reset: () => fixtures.clear(),
		setRows: (t: string, rows: unknown[]) => fixtures.set(t, rows),
	};
});

vi.mock("@ansa/db", () => {
	const table = (name: string) => ({ __table: name });
	return {
		getDb: () => dbMock.db,
		agents: table("agents"),
		agentTools: table("agentTools"),
		emailChannelSettings: table("emailChannelSettings"),
		formSubmissions: table("formSubmissions"),
		triggerEvents: table("triggerEvents"),
		triggerTemplates: table("triggerTemplates"),
		triggers: table("triggers"),
		and: vi.fn(),
		desc: vi.fn(),
		eq: vi.fn(),
		gte: vi.fn(),
		lte: vi.fn(),
		sql: vi.fn(),
	};
});

import { requireOwnedEmailDomain } from "../lib/ownership";
import { leads } from "./leads";
import { triggersRouter } from "./triggers";

const OWNER = "user-owner";

/** Mount a router, optionally with a signed-in user, mirroring authMiddleware. */
function mount(path: string, router: Hono, user: { id: string } | null) {
	const app = new Hono<{ Variables: { user: { id: string } | null } }>();
	app.use("/*", async (c, next) => {
		c.set("user", user);
		await next();
	});
	app.route(path, router);
	return app;
}

describe("tenant isolation: /leads", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.reset();
	});
	afterEach(() => vi.resetAllMocks());

	it("rejects an unauthenticated read of form submissions", async () => {
		const app = mount("/leads", leads, null);
		const res = await app.request("/leads?agentId=agent-1");
		expect(res.status).toBe(401);
	});

	it("rejects an unauthenticated CSV export", async () => {
		const app = mount("/leads", leads, null);
		const res = await app.request("/leads/export/csv?agentId=agent-1");
		expect(res.status).toBe(401);
	});

	it("hides submissions for an agent the caller does not own", async () => {
		// Ownership lookup finds nothing: this agent belongs to someone else.
		dbMock.setRows("agents", []);
		const app = mount("/leads", leads, { id: OWNER });
		const res = await app.request("/leads?agentId=someone-elses-agent");
		expect(res.status).toBe(404);
	});

	it("returns submissions for an agent the caller owns", async () => {
		dbMock.setRows("agents", [{ id: "agent-1" }]);
		dbMock.setRows("formSubmissions", []);
		const app = mount("/leads", leads, { id: OWNER });
		const res = await app.request("/leads?agentId=agent-1");
		expect(res.status).toBe(200);
	});

	it("refuses to delete another tenant's submission", async () => {
		dbMock.setRows("formSubmissions", []); // ownership join finds nothing
		const app = mount("/leads", leads, { id: OWNER });
		const res = await app.request("/leads/submission-1", { method: "DELETE" });
		expect(res.status).toBe(404);
	});
});

describe("tenant isolation: /triggers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.reset();
	});
	afterEach(() => vi.resetAllMocks());

	it("rejects an unauthenticated delete", async () => {
		const app = mount("/triggers", triggersRouter, null);
		const res = await app.request("/triggers/trigger-1", { method: "DELETE" });
		expect(res.status).toBe(401);
	});

	it("refuses to delete a trigger belonging to another tenant", async () => {
		dbMock.setRows("triggers", []); // ownership join finds nothing
		const app = mount("/triggers", triggersRouter, { id: OWNER });
		const res = await app.request("/triggers/trigger-1", { method: "DELETE" });
		expect(res.status).toBe(404);
	});

	it("refuses to update a trigger belonging to another tenant", async () => {
		dbMock.setRows("triggers", []);
		const app = mount("/triggers", triggersRouter, { id: OWNER });
		const res = await app.request("/triggers/trigger-1", {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: "hijacked" }),
		});
		expect(res.status).toBe(404);
	});

	it("refuses to toggle a trigger belonging to another tenant", async () => {
		dbMock.setRows("triggers", []);
		const app = mount("/triggers", triggersRouter, { id: OWNER });
		const res = await app.request("/triggers/trigger-1/toggle", { method: "POST" });
		expect(res.status).toBe(404);
	});

	it("hides the trigger list for an agent the caller does not own", async () => {
		dbMock.setRows("agents", []);
		const app = mount("/triggers", triggersRouter, { id: OWNER });
		const res = await app.request("/triggers?agentId=someone-elses-agent");
		expect(res.status).toBe(404);
	});

	// The widget is unauthenticated by design. These three must stay open or
	// proactive triggers and form rendering break on every customer site.
	it("keeps GET /triggers/widget/:agentId open to the widget", async () => {
		dbMock.setRows("triggers", []);
		const app = mount("/triggers", triggersRouter, null);
		// The route validates UUID shape before querying, so use a real one.
		const res = await app.request("/triggers/widget/3f2504e0-4f89-11d3-9a0c-0305e82c3301");
		expect(res.status).toBe(200);
	});

	it("keeps GET /triggers/form/:toolIdOrName open to the widget", async () => {
		dbMock.setRows("agentTools", []);
		const app = mount("/triggers", triggersRouter, null);
		const res = await app.request("/triggers/form/tool-1");
		expect(res.status).not.toBe(401);
	});
});

describe("tenant isolation: email sending domains", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		dbMock.reset();
	});
	afterEach(() => vi.resetAllMocks());

	it("accepts a domain the caller configured as a reply address", async () => {
		dbMock.setRows("emailChannelSettings", [{ replyAddress: "support@acme.test" }]);
		await expect(requireOwnedEmailDomain("acme.test", OWNER)).resolves.toBeUndefined();
	});

	it("matches the domain case-insensitively", async () => {
		dbMock.setRows("emailChannelSettings", [{ replyAddress: "Support@ACME.test" }]);
		await expect(requireOwnedEmailDomain("acme.TEST", OWNER)).resolves.toBeUndefined();
	});

	it("rejects a domain belonging to another tenant", async () => {
		// The ownership query is scoped to the caller, so another tenant's rows
		// never appear here.
		dbMock.setRows("emailChannelSettings", [{ replyAddress: "support@acme.test" }]);
		await expect(requireOwnedEmailDomain("rival.test", OWNER)).rejects.toMatchObject({
			status: 404,
		});
	});

	it("rejects when the caller has configured no reply address at all", async () => {
		dbMock.setRows("emailChannelSettings", [{ replyAddress: null }]);
		await expect(requireOwnedEmailDomain("acme.test", OWNER)).rejects.toMatchObject({
			status: 404,
		});
	});

	it("does not treat a suffix collision as ownership", async () => {
		// "notacme.test" must not satisfy a request for "acme.test".
		dbMock.setRows("emailChannelSettings", [{ replyAddress: "support@notacme.test" }]);
		await expect(requireOwnedEmailDomain("acme.test", OWNER)).rejects.toMatchObject({
			status: 404,
		});
	});
});
