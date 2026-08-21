import { createAuthClient } from "better-auth/react";
import { useEffect, useState } from "react";
import { getConfig } from "@/lib/runtime-config";
import {
	getGlobalHost,
	getGlobalSessionToken,
	getGlobalShop,
	isShopifyEmbedded,
} from "./shopify-context";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

// Custom fetch that adds Shopify session token when embedded
const authenticatedFetch: typeof fetch = async (input, init) => {
	const headers = new Headers(init?.headers);

	// If we're in Shopify embedded mode, add the session token or shop info
	if (isShopifyEmbedded()) {
		const token = await getGlobalSessionToken();
		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		} else {
			// Fallback: use shop/host from URL params
			const shop = getGlobalShop();
			const host = getGlobalHost();
			if (shop) headers.set("X-Shopify-Shop", shop);
			if (host) headers.set("X-Shopify-Host", host);
		}
	}

	return fetch(input, {
		...init,
		headers,
		credentials: "include",
	});
};

export const authClient = createAuthClient({
	baseURL: API_BASE,
	fetchOptions: {
		credentials: "include",
	},
	fetch: authenticatedFetch,
});

const { useSession: useBetterAuthSession } = authClient;

export const { signIn, signUp, signOut, resetPassword, requestPasswordReset } = authClient;

export const forgetPassword = requestPasswordReset;

// Session type matching better-auth's structure
type SessionUser = {
	id: string;
	email: string;
	emailVerified: boolean;
	name: string | null;
	image: string | null;
	createdAt: Date;
	updatedAt: Date;
};

type SessionData = {
	session: { id: string } | null;
	user: SessionUser | null;
};

/**
 * Custom useSession hook that works in both normal and Shopify embedded contexts.
 * When embedded in Shopify, uses the /api/shopify-session endpoint with session tokens.
 * Otherwise, falls back to better-auth's built-in useSession.
 */
export function useSession() {
	const betterAuthSession = useBetterAuthSession();
	const [shopifySession, setShopifySession] = useState<SessionData | null>(null);
	const [shopifyPending, setShopifyPending] = useState(true);
	const [isEmbedded, setIsEmbedded] = useState<boolean | null>(null); // null = not determined yet

	// Check if we're in Shopify embedded mode
	useEffect(() => {
		// Small delay to ensure globals are set
		const timer = setTimeout(() => {
			const embedded = isShopifyEmbedded();
			setIsEmbedded(embedded);
		}, 50);
		return () => clearTimeout(timer);
	}, []);

	// Fetch session from Shopify endpoint when embedded
	useEffect(() => {
		if (isEmbedded !== true) {
			return;
		}

		const fetchSession = async () => {
			try {
				const token = await getGlobalSessionToken();
				const shop = getGlobalShop();
				const host = getGlobalHost();

				// Build headers with whatever we have
				const headers: Record<string, string> = {};
				if (token) {
					headers.Authorization = `Bearer ${token}`;
				}
				if (shop) {
					headers["X-Shopify-Shop"] = shop;
				}
				if (host) {
					headers["X-Shopify-Host"] = host;
				}

				// If we have neither token nor shop, we can't authenticate
				if (!token && !shop) {
					setShopifySession({ session: null, user: null });
					setShopifyPending(false);
					return;
				}

				const response = await fetch(`${API_BASE}/api/shopify-session`, {
					headers,
				});

				if (response.ok) {
					const data = await response.json();
					setShopifySession(data);
				} else {
					setShopifySession({ session: null, user: null });
				}
			} catch {
				setShopifySession({ session: null, user: null });
			} finally {
				setShopifyPending(false);
			}
		};

		fetchSession();
	}, [isEmbedded]);

	// Still determining if embedded
	if (isEmbedded === null) {
		return { data: null, isPending: true, error: null };
	}

	// If not embedded, use better-auth session
	if (!isEmbedded) {
		return betterAuthSession;
	}

	// Return Shopify session in the same format as better-auth
	return {
		data: shopifySession?.user ? shopifySession : null,
		isPending: shopifyPending,
		error: null,
	};
}
