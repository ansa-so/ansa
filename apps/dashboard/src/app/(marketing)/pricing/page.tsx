"use client";

import { Briefcase, Server } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanGrid, PlanGridSkeleton } from "@/components/plan-grid";
import { PricingBillingToggle } from "@/components/pricing/pricing-billing-toggle";
import { PricingCalculator } from "@/components/pricing/pricing-calculator";
import { PricingComparisonTable } from "@/components/pricing/pricing-comparison-table";
import { PricingFAQ } from "@/components/pricing/pricing-faq";
import { PricingHero } from "@/components/pricing/pricing-hero";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { authClient } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";

export default function PricingPage() {
	const router = useRouter();
	const { docsUrl } = useConfig();
	const { plans, currentPlanId, hasSubscription, isLoading } = usePlansWithCurrent();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authLoading, setAuthLoading] = useState(true);
	const [isAnnual, setIsAnnual] = useState(true);

	useEffect(() => {
		async function checkAuth() {
			try {
				const session = await authClient.getSession();
				if (session?.data?.user) {
					setIsAuthenticated(true);
				}
			} catch (err) {
				console.error("Auth check failed:", err);
			} finally {
				setAuthLoading(false);
			}
		}
		checkAuth();
	}, []);

	const loading = isLoading || authLoading;

	return (
		<div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
			<PricingHero />
			<PricingBillingToggle isAnnual={isAnnual} setIsAnnual={setIsAnnual} />

			{/* Pricing Cards */}
			<section className="container px-4 pb-16 mx-auto mt-10">
				<div className="">
					{loading ? (
						<PlanGridSkeleton />
					) : (
						<PlanGrid
							plans={plans}
							currentPlanId={isAuthenticated ? currentPlanId : null}
							hasSubscription={isAuthenticated && hasSubscription}
							isAnnual={isAnnual}
						/>
					)}
				</div>
			</section>

			{/* Enterprise & Self-Hosted Split Block */}
			<section className="container px-4 pb-16 mx-auto">
				<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
					{/* Enterprise */}
					<div className="bg-[#1A1A1A] text-white p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
						<div className="absolute top-0 right-0 w-32 h-32 pointer-events-none bg-gradient-to-bl from-white/10 to-transparent" />

						<div className="z-10 flex items-start gap-4">
							<div className="p-3 border bg-white/10 border-white/20">
								<Briefcase size={20} />
							</div>
							<div>
								<h3 className="text-lg font-bold">Enterprise</h3>
								<p className="text-xs text-[#CCC] mt-1 max-w-sm leading-relaxed">
									Custom SLAs, dedicated infrastructure, and unlimited volume for large
									organizations.
								</p>
								<div className="flex gap-2 mt-3">
									<span className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5">
										SSO
									</span>
									<span className="text-[9px] font-mono border border-white/20 px-1.5 py-0.5">
										AUDIT LOGS
									</span>
								</div>
							</div>
						</div>

						<button
							type="button"
							onClick={() => router.push("/contact?subject=Enterprise%20Plan%20Inquiry")}
							className="bg-white text-[#1A1A1A] px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E5E5] transition-colors whitespace-nowrap z-10"
						>
							Contact Support
						</button>
					</div>

					{/* Self Hosted */}
					<div className="bg-white border border-[#D1D1D1] p-6 flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-[#1A1A1A] transition-colors">
						<div className="flex items-start gap-4">
							<div className="bg-[#F3F2EE] border border-[#E5E5E5] p-3 text-[#1A1A1A]">
								<Server size={20} />
							</div>
							<div>
								<h3 className="font-bold text-lg text-[#1A1A1A]">Self-Hosted</h3>
								<p className="text-xs text-[#555] mt-1 max-w-sm leading-relaxed">
									Deploy on your own infrastructure. Full data control and air-gapped support.
								</p>
							</div>
						</div>

						<a
							href={`${docsUrl}/self-hosting`}
							className="bg-white border border-[#1A1A1A] text-[#1A1A1A] px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors whitespace-nowrap"
						>
							View Documentation
						</a>
					</div>
				</div>
			</section>

			<PricingComparisonTable />

			<PricingCalculator />

			<PricingFAQ />
		</div>
	);
}
