import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getConfig } from "@/lib/runtime-config";

/**
 * Request blocking.
 *
 * Generic command-injection shapes stay here because they are not tied to any
 * one incident. Anything specific — observed attacker addresses, payload
 * filenames seen in a particular campaign — belongs in configuration, not in a
 * public source file: it dates quickly, it tells an attacker exactly what is
 * filtered, and payload names are frequently chosen to be offensive.
 *
 * Configure per environment:
 *   PROXY_BLOCKED_IPS=203.0.113.4,198.51.100.9
 *   PROXY_BLOCKED_PATTERNS=some-payload\.sh,another-marker
 *
 * A WAF rule is the better home for both if one is available.
 */
const DEFAULT_BLOCKED_PATTERNS = [
	/wget/i,
	/curl.*http:\/\//i,
	/\/bin\/(sh|bash)/i,
	/mkfifo/i,
	/\/dev\/tcp/i,
];

function parseList(value: string | undefined): string[] {
	return (value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

const BLOCKED_PATTERNS = [
	...DEFAULT_BLOCKED_PATTERNS,
	...parseList(process.env.PROXY_BLOCKED_PATTERNS).flatMap((source) => {
		try {
			return [new RegExp(source, "i")];
		} catch {
			console.warn(`[proxy] Ignoring invalid PROXY_BLOCKED_PATTERNS entry: ${source}`);
			return [];
		}
	}),
];

const MALICIOUS_IPS = parseList(process.env.PROXY_BLOCKED_IPS);

function getClientIP(request: NextRequest): string {
	return (
		request.headers.get("x-forwarded-for")?.split(",")[0] ||
		request.headers.get("x-real-ip") ||
		"unknown"
	);
}

function checkBlockedPatterns(request: NextRequest): boolean {
	const url = request.url;
	const userAgent = request.headers.get("user-agent") || "";

	return BLOCKED_PATTERNS.some((pattern) => pattern.test(url) || pattern.test(userAgent));
}

export function proxy(request: NextRequest) {
	const ip = getClientIP(request);
	const { pathname, searchParams } = request.nextUrl;

	// Block malicious IPs immediately
	if (MALICIOUS_IPS.includes(ip)) {
		console.warn(`[SECURITY] Blocked malicious IP: ${ip}`);
		return new NextResponse("Forbidden", { status: 403 });
	}

	// Check for attack patterns
	if (checkBlockedPatterns(request)) {
		console.warn(`[SECURITY] Blocked attack pattern from ${ip}: ${pathname}`);
		return new NextResponse("Forbidden", { status: 403 });
	}

	// Security headers
	const response = NextResponse.next();

	// Detect Shopify app entry: when Shopify admin opens the app, it sends
	// shop + hmac params. Redirect to the API's /shopify/app route which
	// handles HMAC verification, user lookup, and magic-link auto-login.
	const shopParam = searchParams.get("shop");
	const hmacParam = searchParams.get("hmac");
	if (shopParam?.includes(".myshopify.com") && hmacParam) {
		const apiUrl = getConfig().apiUrl || "https://api.ansa.so";
		const shopifyAppUrl = new URL(`${apiUrl}/shopify/app`);
		// Forward all query params to the API route
		searchParams.forEach((value, key) => {
			shopifyAppUrl.searchParams.set(key, value);
		});
		return NextResponse.redirect(shopifyAppUrl.toString());
	}

	// Allow Shopify to embed the dashboard when embedded=1 is present
	const isShopifyEmbed =
		searchParams.get("embedded") === "1" || searchParams.get("shop")?.includes(".myshopify.com");

	if (isShopifyEmbed) {
		// Use CSP frame-ancestors to allow Shopify admin domains
		response.headers.set(
			"Content-Security-Policy",
			"frame-ancestors https://*.myshopify.com https://admin.shopify.com https://*.spin.dev;",
		);
		// Remove X-Frame-Options as CSP frame-ancestors takes precedence
	} else {
		response.headers.set("X-Frame-Options", "DENY");
	}

	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("X-XSS-Protection", "1; mode=block");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

	return response;
}

export const config = {
	matcher: [
		/*
		 * Match all request paths except:
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files (public folder)
		 */
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
