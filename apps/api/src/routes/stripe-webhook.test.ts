import { beforeEach, describe, expect, it, vi } from "vitest";

// All mock functions + env vars must be created via vi.hoisted so they exist before vi.mock runs
const {
	mockFindFirst,
	mockUpdate,
	mockSet,
	mockWhere,
	mockInsert,
	mockValues,
	mockOnConflictDoUpdate,
	mockConstructEvent,
} = vi.hoisted(() => {
	process.env.STRIPE_SECRET_KEY = "sk_test_fake";
	process.env.STRIPE_WEBHOOK_SECRET = "whsec_fake";
	return {
		mockFindFirst: vi.fn(),
		mockUpdate: vi.fn(),
		mockSet: vi.fn(),
		mockWhere: vi.fn(),
		mockInsert: vi.fn(),
		mockValues: vi.fn(),
		mockOnConflictDoUpdate: vi.fn(),
		mockConstructEvent: vi.fn(),
	};
});

vi.mock("@ansa/db", () => ({
	getDb: vi.fn(() => ({
		query: {
			userSubscriptions: {
				findFirst: mockFindFirst,
			},
		},
		update: mockUpdate,
		insert: mockInsert,
	})),
	userSubscriptions: { userId: "user_id" },
	eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
}));

vi.mock("../lib/plans", () => ({
	mapPriceToPlan: vi.fn(() => "growth"),
	isDowngrade: vi.fn(() => false),
	checkDowngrade: vi.fn(),
	getUserPlan: vi.fn(),
	restoreBrandingForUser: vi.fn(),
}));

vi.mock("stripe", () => ({
	default: class {
		webhooks = { constructEvent: mockConstructEvent };
		checkout = { sessions: { create: vi.fn() } };
		billingPortal = { sessions: { create: vi.fn() } };
		customers = { list: vi.fn(), create: vi.fn(), retrieve: vi.fn() };
		subscriptions = { retrieve: vi.fn() };
	},
}));

import { Hono } from "hono";
import { stripeRoute } from "./stripe";

const app = new Hono();
app.route("/stripe", stripeRoute);

function makeWebhookRequest(event: unknown) {
	return app.request("/stripe/webhook", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"stripe-signature": "fake_sig",
		},
		body: JSON.stringify(event),
	});
}

describe("Stripe webhook: cancelled yearly subscription billing period", () => {
	const YEARLY_PERIOD_START = new Date("2026-03-18T00:00:00Z");
	const YEARLY_PERIOD_END = new Date("2027-03-18T00:00:00Z");
	const YEARLY_PERIOD_START_UNIX = Math.floor(YEARLY_PERIOD_START.getTime() / 1000);
	const YEARLY_PERIOD_END_UNIX = Math.floor(YEARLY_PERIOD_END.getTime() / 1000);

	const existingSub = {
		userId: "user_123",
		planId: "growth",
		stripeSubscriptionId: "sub_yearly_123",
		stripeCustomerId: "cus_123",
		billingPeriodStart: YEARLY_PERIOD_START,
		billingPeriodEnd: YEARLY_PERIOD_END,
		cancelAtPeriodEnd: false,
		status: "active",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdate.mockReturnValue({ set: mockSet });
		mockSet.mockReturnValue({ where: mockWhere });
		mockWhere.mockResolvedValue(undefined);
		mockInsert.mockReturnValue({ values: mockValues });
		mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
		mockOnConflictDoUpdate.mockResolvedValue(undefined);
	});

	it("customer.subscription.deleted preserves yearly billingPeriodEnd when current_period_end is missing", async () => {
		const event = {
			type: "customer.subscription.deleted",
			data: {
				object: {
					id: "sub_yearly_123",
					current_period_end: 0, // falsy — triggers the bug
				},
			},
		};

		mockConstructEvent.mockReturnValue(event);
		mockFindFirst.mockResolvedValue({ ...existingSub });

		const res = await makeWebhookRequest(event);
		expect(res.status).toBe(200);

		// Should NOT downgrade to free — existing DB record has valid future billingPeriodEnd
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				cancelAtPeriodEnd: true,
				status: "canceled",
				billingPeriodEnd: YEARLY_PERIOD_END,
			}),
		);
		// Should NOT set planId to "free"
		const setArg = mockSet.mock.calls[0][0];
		expect(setArg.planId).toBeUndefined();
	});

	it("customer.subscription.deleted uses current_period_end when valid for yearly sub", async () => {
		const event = {
			type: "customer.subscription.deleted",
			data: {
				object: {
					id: "sub_yearly_123",
					current_period_end: YEARLY_PERIOD_END_UNIX,
				},
			},
		};

		mockConstructEvent.mockReturnValue(event);
		mockFindFirst.mockResolvedValue({ ...existingSub });

		const res = await makeWebhookRequest(event);
		expect(res.status).toBe(200);

		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				cancelAtPeriodEnd: true,
				status: "canceled",
				billingPeriodEnd: YEARLY_PERIOD_END,
			}),
		);
	});

	it("customer.subscription.updated does not shorten billingPeriodEnd on cancellation", async () => {
		const MONTHLY_END_UNIX = Math.floor(new Date("2026-04-18T00:00:00Z").getTime() / 1000);

		const event = {
			type: "customer.subscription.updated",
			data: {
				object: {
					id: "sub_yearly_123",
					current_period_start: YEARLY_PERIOD_START_UNIX,
					current_period_end: MONTHLY_END_UNIX, // only 1 month out
					cancel_at_period_end: true,
					items: { data: [{ price: { id: "price_growth_yearly" } }] },
				},
			},
		};

		mockConstructEvent.mockReturnValue(event);
		mockFindFirst.mockResolvedValue({ ...existingSub });

		const res = await makeWebhookRequest(event);
		expect(res.status).toBe(200);

		// billingPeriodEnd should be the LONGER of: webhook value vs existing DB value
		const setArg = mockOnConflictDoUpdate.mock.calls[0]?.[0]?.set;
		expect(setArg.billingPeriodEnd).toEqual(YEARLY_PERIOD_END);
	});
});
