"use client";

import { Activity, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanGrid } from "@/components/plan-grid";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import { usePlans } from "@/hooks/use-plans";
import { getUsage, listAgents, listShopifyShops } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useShopify } from "@/lib/shopify-context";

export default function ChoosePlanPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const { plans, isLoading } = usePlans();
	const { isEmbedded, shop } = useShopify();
	const [isCheckingSubscription, setIsCheckingSubscription] = useState(true);
	const [isAnnual, setIsAnnual] = useState(true);
	const [isShopifyUser, setIsShopifyUser] = useState(false);
	const [shopDomain, setShopDomain] = useState<string | null>(null);

	useEffect(() => {
		if (session) {
			Promise.all([getUsage(), listShopifyShops().catch(() => [])])
				.then(([data, shops]) => {
					// If user already has a plan selected, redirect to dashboard
					if (data.hasPlanSelected) {
						router.push("/dashboard");
						router.refresh();
						return;
					}

					const shopify = isEmbedded || data.billingProvider === "shopify" || shops.length > 0;
					if (shopify) {
						setIsShopifyUser(true);
						const domain = shop || shops[0]?.shopDomain || null;
						setShopDomain(domain);
					}
					setIsCheckingSubscription(false);
				})
				.catch(() => {
					setIsCheckingSubscription(false);
				});
		}
	}, [session, router, isEmbedded, shop]);

	const handlePlanChange = async () => {
		try {
			const agents = await listAgents();
			router.push(agents.length === 0 ? "/onboarding" : "/dashboard");
		} catch {
			// If we can't fetch agents, default to onboarding
			router.push("/onboarding");
		}
		router.refresh();
	};

	// Build Shopify pricing URL
	const shopHandle = shopDomain?.replace(".myshopify.com", "") ?? null;
	const shopifyPricingUrl = shopHandle
		? `https://admin.shopify.com/store/${shopHandle}/charges/vela-ai/pricing_plans`
		: null;

	// Show loading while checking subscription
	if (isCheckingSubscription) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#F3F2EE]">
				<div className="w-8 h-8 border-4 border-[#1A1A1A] rounded-full animate-spin border-t-transparent" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE] dark:bg-zinc-900 text-[#1A1A1A] dark:text-zinc-100 font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE] flex flex-col">
			{/* --- HEADER --- */}
			<header className="h-20 bg-white dark:bg-zinc-800 border-b border-[#D1D1D1] dark:border-zinc-700 flex items-center justify-between px-8 sticky top-0 z-50">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 bg-[#1A1A1A] dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-bold text-xs">
						A
					</div>
					<div className="h-4 w-px bg-[#D1D1D1] dark:bg-zinc-600" />
					<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-zinc-400">
						License Allocation
					</span>
				</div>
				<div className="text-[10px] font-mono text-[#888] dark:text-zinc-400">SECURE SESSION</div>
			</header>

			{/* --- MAIN CONTENT --- */}
			<main className="flex-1 p-8 overflow-y-auto md:p-12">
				<div className="max-w-[1400px] mx-auto">
					{/* Title Section */}
					<div className="mb-16 text-center">
						<div className="inline-flex items-center gap-2 bg-[#E5E5E5] dark:bg-zinc-700 border border-[#D1D1D1] dark:border-zinc-600 px-3 py-1 mb-4">
							<Activity size={12} />
							<span className="text-[10px] font-mono uppercase font-bold text-[#555] dark:text-zinc-300">
								System Ready
							</span>
						</div>
						<h1 className="mb-4 text-3xl font-medium tracking-tight md:text-4xl">
							Welcome to Ansa! 🎉
						</h1>
						<p className="text-[#555] dark:text-zinc-400 max-w-xl mx-auto text-sm">
							{isShopifyUser
								? "Choose a plan to get started. You'll be redirected to Shopify to approve the charge."
								: "Choose a plan to get started. You can upgrade or downgrade your capacity at any time via the admin console."}
						</p>
						{!isShopifyUser && (
							<PricingBillingToggle isAnnual={isAnnual} setIsAnnual={setIsAnnual} />
						)}
					</div>

					{/* Plans Grid */}
					<PlanGrid
						plans={plans}
						isLoading={isLoading}
						hasSubscription={false}
						onPlanChange={handlePlanChange}
						isAnnual={isShopifyUser ? false : isAnnual}
						billingProvider={isShopifyUser ? "shopify" : null}
						shopifyPricingUrl={isShopifyUser ? shopifyPricingUrl : null}
					/>

					{/* Enterprise Banner */}
					<div className="mt-12 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 p-8 flex flex-col md:flex-row items-center justify-between gap-8 border border-[#1A1A1A] dark:border-zinc-100 relative overflow-hidden group">
						{/* Background effect */}
						<div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none bg-white/5 dark:bg-black/5 blur-3xl" />

						<div className="relative z-10 flex items-start gap-6">
							<div className="flex items-center justify-center w-12 h-12 text-white dark:text-zinc-900 border bg-white/10 dark:bg-black/10 border-white/20 dark:border-black/20">
								<Server size={24} />
							</div>
							<div>
								<h3 className="mb-2 text-xl font-bold">Custom Enterprise Infrastructure</h3>
								<p className="text-sm text-[#CCC] dark:text-zinc-600 max-w-xl leading-relaxed">
									For organizations requiring dedicated instances, custom SLAs, or compliance
									environments. Full audit logs and SSO included.
								</p>
							</div>
						</div>

						<button
							onClick={() => router.push("/contact?subject=Enterprise%20Plan%20Inquiry")}
							className="whitespace-nowrap bg-white dark:bg-zinc-900 text-[#1A1A1A] dark:text-zinc-100 px-8 py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E5E5] dark:hover:bg-zinc-800 transition-colors relative z-10"
						>
							Contact Solutions Engineering
						</button>
					</div>
				</div>
			</main>

			{/* --- FOOTER --- */}
			<footer className="p-6 border-t border-[#D1D1D1] dark:border-zinc-700 bg-white dark:bg-zinc-800 text-center text-[10px] text-[#888] dark:text-zinc-400 font-mono">
				SECURE SSL ENCRYPTED PAYMENT
			</footer>
		</div>
	);
}
