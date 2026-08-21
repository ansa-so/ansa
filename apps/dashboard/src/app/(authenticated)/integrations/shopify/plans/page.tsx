"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Legacy Shopify plans page — plan selection is now handled by Shopify Managed Pricing.
 * Redirects to onboarding for backward compatibility.
 */
export default function ShopifyPlansPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/onboarding");
	}, [router]);

	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="w-8 h-8 border-4 border-[#1A1A1A] rounded-full animate-spin border-t-transparent" />
		</div>
	);
}
