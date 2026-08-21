import { describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
	lookup: vi.fn(),
}));

import { lookup } from "node:dns/promises";
import { assertPublicUrl, BlockedUrlError } from "./safe-fetch";

const resolvesTo = (...addresses: string[]) =>
	vi
		.mocked(lookup)
		.mockResolvedValue(
			addresses.map((address) => ({ address, family: address.includes(":") ? 6 : 4 })) as never,
		);

describe("assertPublicUrl", () => {
	it("allows a public host", async () => {
		resolvesTo("93.184.216.34");
		await expect(assertPublicUrl("https://example.com/docs")).resolves.toMatchObject({
			addresses: ["93.184.216.34"],
		});
	});

	it.each([
		["cloud metadata", "http://169.254.169.254/latest/meta-data/"],
		["loopback literal", "http://127.0.0.1:3001/health"],
		["loopback name", "http://localhost:5432"],
		["private class A", "http://10.1.2.3/"],
		["private class B", "http://172.20.0.5/"],
		["private class C", "http://192.168.1.1/"],
		["carrier-grade NAT", "http://100.64.0.1/"],
		["IPv6 loopback", "http://[::1]:8080/"],
		["IPv4-mapped loopback", "http://[::ffff:127.0.0.1]/"],
		["GCP metadata host", "http://metadata.google.internal/"],
	])("blocks %s", async (_label, url) => {
		await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(BlockedUrlError);
	});

	it("blocks a public hostname that resolves into a private range", async () => {
		// The DNS-rebinding shape: the name looks fine, the address does not.
		resolvesTo("10.0.0.7");
		await expect(assertPublicUrl("https://sneaky.example.com")).rejects.toBeInstanceOf(
			BlockedUrlError,
		);
	});

	it("blocks when any resolved address is private, not just the first", async () => {
		resolvesTo("93.184.216.34", "192.168.0.10");
		await expect(assertPublicUrl("https://mixed.example.com")).rejects.toBeInstanceOf(
			BlockedUrlError,
		);
	});

	it.each(["file:///etc/passwd", "gopher://x/", "ftp://example.com/"])(
		"rejects non-HTTP protocol %s",
		async (url) => {
			await expect(assertPublicUrl(url)).rejects.toBeInstanceOf(BlockedUrlError);
		},
	);

	it("rejects a hostname that does not resolve", async () => {
		vi.mocked(lookup).mockRejectedValue(new Error("ENOTFOUND"));
		await expect(assertPublicUrl("https://nope.invalid")).rejects.toBeInstanceOf(BlockedUrlError);
	});

	it("rejects a malformed URL", async () => {
		await expect(assertPublicUrl("not a url")).rejects.toBeInstanceOf(BlockedUrlError);
	});

	it("does not require DNS for a public IP literal", async () => {
		vi.mocked(lookup).mockRejectedValue(new Error("should not be called"));
		await expect(assertPublicUrl("https://93.184.216.34/")).resolves.toBeTruthy();
	});
});
