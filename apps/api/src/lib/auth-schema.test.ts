import { accounts } from "@ansa/db";
import { describe, expect, it } from "vitest";

describe("Better Auth account schema", () => {
	it("exposes the issuer field used to look up OAuth identities", () => {
		expect(accounts).toHaveProperty("issuer");
		expect((accounts as unknown as { issuer: { name: string } }).issuer.name).toBe("issuer");
	});
});
