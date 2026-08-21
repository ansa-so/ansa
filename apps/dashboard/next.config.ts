import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	transpilePackages: ["@ansa/ui"],
	// Enable standalone output for Docker
	output: "standalone",
	// Security headers
	async headers() {
		return [
			{
				source: "/runtime-config.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-store, max-age=0",
					},
					{
						key: "CDN-Cache-Control",
						value: "no-store",
					},
					{
						key: "Cloudflare-CDN-Cache-Control",
						value: "no-store",
					},
				],
			},
			{
				source: "/:path*",
				headers: [
					{
						key: "X-DNS-Prefetch-Control",
						value: "on",
					},
					// Note: X-Frame-Options removed to allow Shopify embedded app iframe
					// CSP frame-ancestors below provides more granular control
					{
						key: "Content-Security-Policy",
						value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com 'self';",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
					{
						key: "Referrer-Policy",
						value: "strict-origin-when-cross-origin",
					},
					{
						key: "Permissions-Policy",
						value: "camera=(), microphone=(), geolocation=()",
					},
				],
			},
		];
	},
	// Allow images from any domain (for profile pictures)
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "**",
			},
		],
	},
};

export default nextConfig;
