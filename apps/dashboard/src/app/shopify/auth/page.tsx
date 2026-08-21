"use client";

import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ShopifyAuthContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		// Check for error query params (from magic link verify redirect)
		const errorParam = searchParams.get("error");
		if (errorParam) {
			switch (errorParam) {
				case "INVALID_TOKEN":
					setError("Invalid authentication token. Please try again.");
					break;
				case "EXPIRED_TOKEN":
					setError("Authentication token has expired. Please try again.");
					break;
				default:
					setError(errorParam);
			}
			return;
		}

		// If no error, just redirect to home
		// The cookie should already be set by better-auth magic link
		const host = searchParams.get("host");
		const shop = searchParams.get("shop");
		const embedded = searchParams.get("embedded");

		let redirectUrl = "/";
		if (embedded === "1" && host) {
			redirectUrl = `/?embedded=1&host=${encodeURIComponent(host)}`;
			if (shop) redirectUrl += `&shop=${encodeURIComponent(shop)}`;
		}

		router.push(redirectUrl);
	}, [searchParams, router]);

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen">
				<div className="p-6 text-center bg-background rounded-lg shadow-lg">
					<h1 className="mb-2 text-xl font-semibold text-red-600">Authentication Error</h1>
					<p className="text-gray-600">{error}</p>
					<a
						href="/login"
						className="inline-block px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
					>
						Go to Login
					</a>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center min-h-screen">
			<Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
			<p className="text-muted-foreground">Signing you in...</p>
		</div>
	);
}

export default function ShopifyAuthPage() {
	return (
		<Suspense
			fallback={
				<div className="flex flex-col items-center justify-center min-h-screen">
					<Loader2 className="w-8 h-8 mb-4 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			}
		>
			<ShopifyAuthContent />
		</Suspense>
	);
}
