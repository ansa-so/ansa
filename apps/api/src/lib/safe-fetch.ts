import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Guards for server-side fetches of caller-supplied URLs.
 *
 * Three features take a URL and fetch it from inside the API: knowledge-base web
 * sources, HTTP tools, and API discovery. Without a check, those are a request
 * forgery primitive — reachable targets include cloud metadata services, other
 * containers on the same Docker network, and anything the host exposes on
 * loopback. This codebase is public, so the endpoints that accept URLs are known.
 */

const BLOCKED_HOSTNAMES = new Set([
	"localhost",
	"metadata.google.internal",
	"metadata",
	"instance-data",
]);

/** Link-local, loopback, private, and carrier-grade NAT ranges. */
function isBlockedIp(address: string): boolean {
	if (net.isIPv4(address)) {
		const [a, b] = address.split(".").map(Number);
		if (a === 127 || a === 0 || a === 10) return true;
		if (a === 169 && b === 254) return true; // includes 169.254.169.254
		if (a === 172 && b >= 16 && b <= 31) return true;
		if (a === 192 && b === 168) return true;
		if (a === 100 && b >= 64 && b <= 127) return true;
		return false;
	}

	if (net.isIPv6(address)) {
		const lower = address.toLowerCase();
		if (lower === "::1" || lower === "::") return true;
		if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
		// IPv4-mapped addresses. Note that Node normalises ::ffff:127.0.0.1 to the
		// hex form ::ffff:7f00:1, so both spellings have to be handled.
		const mapped = lower.match(/^::ffff:(.+)$/);
		if (mapped?.[1]) {
			const rest = mapped[1];
			if (rest.includes(".")) {
				return isBlockedIp(rest);
			}
			const groups = rest.split(":");
			if (groups.length === 2) {
				const high = Number.parseInt(groups[0], 16);
				const low = Number.parseInt(groups[1], 16);
				if (!Number.isNaN(high) && !Number.isNaN(low)) {
					const dotted = [high >> 8, high & 0xff, low >> 8, low & 0xff].join(".");
					return isBlockedIp(dotted);
				}
			}
		}
		return false;
	}

	return false;
}

export class BlockedUrlError extends Error {
	constructor(reason: string) {
		super(reason);
		this.name = "BlockedUrlError";
	}
}

/**
 * Reject a URL that is not a public HTTP(S) endpoint.
 *
 * Resolves DNS and checks every returned address, so a hostname that points at
 * a private range is caught too. Returns the resolved addresses for callers that
 * want to pin them.
 */
export async function assertPublicUrl(rawUrl: string): Promise<{ addresses: string[] }> {
	let url: URL;
	try {
		url = new URL(rawUrl);
	} catch {
		throw new BlockedUrlError("Invalid URL");
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		throw new BlockedUrlError(`Unsupported protocol: ${url.protocol}`);
	}

	const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

	if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
		throw new BlockedUrlError("Refusing to fetch a loopback or metadata host");
	}

	// A literal IP needs no lookup.
	if (net.isIP(hostname)) {
		if (isBlockedIp(hostname)) {
			throw new BlockedUrlError("Refusing to fetch a private or link-local address");
		}
		return { addresses: [hostname] };
	}

	let addresses: string[];
	try {
		const results = await lookup(hostname, { all: true });
		addresses = results.map((r) => r.address);
	} catch {
		throw new BlockedUrlError(`Could not resolve host: ${hostname}`);
	}

	if (addresses.length === 0) {
		throw new BlockedUrlError(`Could not resolve host: ${hostname}`);
	}

	if (addresses.some(isBlockedIp)) {
		throw new BlockedUrlError("Host resolves to a private or link-local address");
	}

	return { addresses };
}

/**
 * fetch() for caller-supplied URLs.
 *
 * Validates before the request and again on each redirect hop, since a public
 * URL may redirect into a private range. Redirects are followed manually for
 * that reason.
 */
export async function safeFetch(
	rawUrl: string,
	init: RequestInit = {},
	options: { maxRedirects?: number } = {},
): Promise<Response> {
	const maxRedirects = options.maxRedirects ?? 3;
	let target = rawUrl;

	for (let hop = 0; hop <= maxRedirects; hop++) {
		await assertPublicUrl(target);

		const response = await fetch(target, { ...init, redirect: "manual" });

		if (response.status < 300 || response.status >= 400) {
			return response;
		}

		const location = response.headers.get("location");
		if (!location) {
			return response;
		}

		target = new URL(location, target).toString();
	}

	throw new BlockedUrlError(`Too many redirects (limit ${maxRedirects})`);
}
