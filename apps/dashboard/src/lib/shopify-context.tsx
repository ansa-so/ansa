"use client";

import { useSearchParams } from "next/navigation";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { getConfig } from "@/lib/runtime-config";

interface ShopifyContextValue {
	isEmbedded: boolean;
	shop: string | null;
	host: string | null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	shopify: any;
	/**
	 * Authenticated fetch for Shopify embedded apps.
	 * Uses session tokens when embedded, falls back to credentials for non-embedded.
	 */
	authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
	/**
	 * Get the current session token (for manual use if needed)
	 */
	getSessionToken: () => Promise<string | null>;
}

const ShopifyContext = createContext<ShopifyContextValue>({
	isEmbedded: false,
	shop: null,
	host: null,
	shopify: null,
	authenticatedFetch: (url, options) => fetch(url, { ...options, credentials: "include" }),
	getSessionToken: async () => null,
});

export function useShopify() {
	return useContext(ShopifyContext);
}

// Global session token getter - set by ShopifyProvider when embedded
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let globalShopifyInstance: any = null;
let globalIsEmbedded = false;
let globalShop: string | null = null;
let globalHost: string | null = null;
let cachedSessionToken: string | null = null;

/**
 * Get session token from global Shopify instance
 * This is used by api.ts functions that can't use React hooks
 */
export async function getGlobalSessionToken(): Promise<string | null> {
	// Return cached token if available
	if (cachedSessionToken) {
		return cachedSessionToken;
	}

	if (!globalIsEmbedded || !globalShopifyInstance) {
		return null;
	}

	try {
		// ready is a Promise - await it before calling idToken
		if (globalShopifyInstance.ready && typeof globalShopifyInstance.ready.then === "function") {
			await globalShopifyInstance.ready;
		}

		// Call idToken with a short timeout - don't block forever
		const tokenPromise = globalShopifyInstance.idToken();
		const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
		const token = await Promise.race([tokenPromise, timeoutPromise]);

		if (token) {
			cachedSessionToken = token;
		}

		return token;
	} catch {
		return null;
	}
}

/**
 * Get the shop domain from URL params (fallback when token unavailable)
 */
export function getGlobalShop(): string | null {
	return globalShop;
}

/**
 * Get the host parameter from URL params (fallback when token unavailable)
 */
export function getGlobalHost(): string | null {
	return globalHost;
}

/**
 * Check if we're in a Shopify embedded context
 */
export function isShopifyEmbedded(): boolean {
	return globalIsEmbedded;
}

/**
 * Hook that returns a function to build hrefs preserving Shopify embed params.
 * Use in any component that renders <Link> inside the Shopify embedded context.
 */
export function useShopifyHref() {
	const { isEmbedded, shop, host } = useShopify();

	return useMemo(() => {
		if (!isEmbedded) return (path: string) => path;

		const params = new URLSearchParams();
		params.set("embedded", "1");
		if (shop) params.set("shop", shop);
		if (host) params.set("host", host);
		const suffix = params.toString();

		return (path: string) => {
			const separator = path.includes("?") ? "&" : "?";
			return `${path}${separator}${suffix}`;
		};
	}, [isEmbedded, shop, host]);
}

export function ShopifyProvider({ children }: { children: ReactNode }) {
	const searchParams = useSearchParams();
	const embedded = searchParams.get("embedded");
	const host = searchParams.get("host");
	const shop = searchParams.get("shop");
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const [shopifyGlobal, setShopifyGlobal] = useState<any>(null);
	const [isEmbedded, setIsEmbedded] = useState(false);
	const [mounted, setMounted] = useState(false);

	// Detect embedded state after mount (window is only available client-side)
	useEffect(() => {
		setMounted(true);
		const isInIframe = window.self !== window.top;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const hasShopifyGlobal = !!(window as any).shopify;
		const shouldBeEmbedded =
			(embedded === "1" && !!host) || hasShopifyGlobal || (isInIframe && !!shop);

		// Set globals immediately so auth-client can use them
		globalIsEmbedded = shouldBeEmbedded;
		globalShop = shop;
		globalHost = host;
		if (hasShopifyGlobal) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			globalShopifyInstance = (window as any).shopify;
		}

		setIsEmbedded(shouldBeEmbedded);
	}, [embedded, host, shop]);

	// Check if shopify global is available (script loaded in head via beforeInteractive)
	useEffect(() => {
		if (!isEmbedded) {
			globalIsEmbedded = false;
			globalShopifyInstance = null;
			return;
		}

		globalIsEmbedded = true;

		// Check if shopify global is available (script loaded in head)
		const checkShopify = () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			if (typeof window !== "undefined" && (window as any).shopify) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const shopify = (window as any).shopify;
				setShopifyGlobal(shopify);
				globalShopifyInstance = shopify;
				return true;
			}
			return false;
		};

		// Check immediately
		if (checkShopify()) {
			return;
		}

		// Poll for shopify global (in case script hasn't loaded yet)
		const interval = setInterval(() => {
			if (checkShopify()) {
				clearInterval(interval);
			}
		}, 100);

		// Cleanup
		return () => {
			clearInterval(interval);
			globalIsEmbedded = false;
			globalShopifyInstance = null;
		};
	}, [isEmbedded]);

	// Proactively fetch a session token when embedded to ensure Shopify sees us using it
	useEffect(() => {
		if (!isEmbedded || !shopifyGlobal) return;

		// Fetch session token immediately and make an authenticated request
		// This generates session data for Shopify to verify
		const fetchInitialToken = async () => {
			try {
				// First, wait for the ready promise if it exists
				if (shopifyGlobal.ready) {
					await shopifyGlobal.ready;
				}

				const timeoutId = setTimeout(() => {}, 5000);

				try {
					const token = await shopifyGlobal.idToken();
					clearTimeout(timeoutId);
					if (token) {
						// Make an authenticated API request so Shopify sees us using the token
						// This is important for Shopify's automated verification
						const apiUrl = getConfig().apiUrl || "http://localhost:3001";
						try {
							await fetch(`${apiUrl}/config`, {
								headers: {
									Authorization: `Bearer ${token}`,
								},
							});
						} catch {
							// Ignore fetch errors
						}
					}
				} catch {
					clearTimeout(timeoutId);
				}
			} catch {
				// Ignore errors
			}
		};

		fetchInitialToken();
	}, [isEmbedded, shopifyGlobal]);

	// Get session token from App Bridge
	const getSessionToken = useCallback(async (): Promise<string | null> => {
		if (!isEmbedded || !shopifyGlobal) return null;
		try {
			return await shopifyGlobal.idToken();
		} catch {
			return null;
		}
	}, [isEmbedded, shopifyGlobal]);

	// Authenticated fetch that uses session tokens when embedded
	const authenticatedFetch = useCallback(
		async (url: string, options: RequestInit = {}): Promise<Response> => {
			if (!isEmbedded) {
				// Not embedded, use regular cookie-based auth
				return fetch(url, { ...options, credentials: "include" });
			}

			// Embedded in Shopify - use session token
			const token = await getSessionToken();
			const headers = new Headers(options.headers);

			if (token) {
				headers.set("Authorization", `Bearer ${token}`);
			}

			return fetch(url, {
				...options,
				headers,
				credentials: "include", // Still include cookies as fallback
			});
		},
		[isEmbedded, getSessionToken],
	);

	// Wait for client-side mount before deciding embedded state
	if (!mounted) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
					<p className="text-sm text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// If not embedded in Shopify, just render children without App Bridge
	if (!isEmbedded) {
		return (
			<ShopifyContext.Provider
				value={{
					isEmbedded: false,
					shop: null,
					host: null,
					shopify: null,
					authenticatedFetch,
					getSessionToken,
				}}
			>
				{children}
			</ShopifyContext.Provider>
		);
	}

	// Wait for Shopify App Bridge to be ready before rendering children
	// This prevents API calls from being made before session tokens are available
	if (!shopifyGlobal) {
		return (
			<div className="flex items-center justify-center h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
					<p className="text-sm text-gray-600">Connecting to Shopify...</p>
				</div>
			</div>
		);
	}

	// Embedded in Shopify and App Bridge is ready
	return (
		<ShopifyContext.Provider
			value={{
				isEmbedded: true,
				shop,
				host,
				shopify: shopifyGlobal,
				authenticatedFetch,
				getSessionToken,
			}}
		>
			{children}
		</ShopifyContext.Provider>
	);
}
