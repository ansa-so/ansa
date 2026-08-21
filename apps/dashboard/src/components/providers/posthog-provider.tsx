"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { getConfig } from "@/lib/runtime-config";

const POSTHOG_KEY = getConfig().posthogKey;
const POSTHOG_HOST = getConfig().posthogHost || "https://us.i.posthog.com";

// Initialize PostHog only once on client
if (typeof window !== "undefined" && POSTHOG_KEY) {
	posthog.init(POSTHOG_KEY, {
		api_host: POSTHOG_HOST,
		person_profiles: "identified_only",
		capture_pageview: false, // We'll capture manually with Next.js router
		capture_pageleave: true,
		session_recording: {
			maskAllInputs: true, // Mask sensitive inputs by default
			maskTextSelector: ".ph-no-capture", // Additional masking via CSS class
		},
		loaded: (posthog) => {
			// Register environment as a super property (included in all events)
			posthog.register({
				environment: process.env.NODE_ENV,
				app: "dashboard",
			});
		},
	});
}

// Component to track pageviews on route changes
function PageViewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const posthog = usePostHog();

	useEffect(() => {
		if (pathname && posthog) {
			let url = window.origin + pathname;
			if (searchParams.toString()) {
				url = `${url}?${searchParams.toString()}`;
			}
			posthog.capture("$pageview", { $current_url: url });
		}
	}, [pathname, searchParams, posthog]);

	return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
	// Don't render provider if PostHog is not configured
	if (!POSTHOG_KEY) {
		return <>{children}</>;
	}

	return (
		<PHProvider client={posthog}>
			<Suspense fallback={null}>
				<PageViewTracker />
			</Suspense>
			{children}
		</PHProvider>
	);
}

// Export posthog instance for direct use
export { posthog };
