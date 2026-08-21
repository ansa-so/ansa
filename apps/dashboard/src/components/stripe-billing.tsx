"use client";

import { PageHeader } from "@ansa/ui";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	Briefcase,
	Calendar,
	Clock,
	ExternalLink,
	HardDrive,
	Server,
	ShoppingBag,
	Sparkles,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PlanGrid, PlanGridSkeleton } from "@/components/plan-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { getUsage, listShopifyShops, type UsageData } from "@/lib/api";
import { useShopify } from "@/lib/shopify-context";
import { openCustomerPortal } from "@/lib/stripe";

// --- USAGE COMPONENTS ---

function CapacityGauge({
	label,
	used,
	total,
	unit,
	icon: Icon,
	color = "bg-[#1A1A1A]",
	formatValue,
}: {
	label: string;
	used: number;
	total: number;
	unit: string;
	icon: React.ElementType;
	color?: string;
	formatValue?: (value: number) => string;
}) {
	const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
	const format = formatValue || ((v: number) => v.toLocaleString());

	return (
		<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm flex flex-col justify-between h-full relative overflow-hidden group hover:border-[#1A1A1A] transition-colors">
			<div className="flex items-start justify-between mb-6">
				<div className="flex items-center gap-2 text-[#888] font-mono text-[10px] uppercase tracking-widest group-hover:text-[#1A1A1A] transition-colors">
					{Icon && <Icon size={12} />}
					{label}
				</div>
				<div className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-[#F3F2EE] border border-[#E5E5E5] text-[#555]">
					{percentage.toFixed(1)}% USED
				</div>
			</div>

			<div>
				<div className="flex items-baseline gap-1 mb-2">
					<span className="text-3xl font-medium tracking-tighter text-[#1A1A1A]">
						{format(used)}
					</span>
					<span className="text-sm text-[#888] font-mono">
						/ {format(total)} {unit}
					</span>
				</div>

				{/* Technical Segmented Bar */}
				<div className="h-2 w-full bg-[#F3F2EE] flex gap-0.5 overflow-hidden">
					{Array.from({ length: 20 }).map((_, i) => (
						<div
							key={i}
							className={`flex-1 transition-all duration-500 ${
								(i / 20) * 100 < percentage
									? percentage > 90
										? "bg-red-500"
										: color
									: "bg-transparent"
							}`}
						/>
					))}
				</div>

				<div className="mt-4 flex items-center gap-2 text-[10px] text-[#888] font-mono">
					<Activity size={10} />
					<span>{(100 - percentage).toFixed(1)}% remaining</span>
				</div>
			</div>
		</div>
	);
}

function PlanCard({
	planName,
	billingPeriodStart,
	billingPeriodEnd,
	daysRemaining,
	isFreePlan,
	onManageClick,
	billingProvider,
	cancelAtPeriodEnd,
}: {
	planName: string;
	billingPeriodStart?: string;
	billingPeriodEnd?: string;
	daysRemaining: number | null;
	isFreePlan: boolean;
	onManageClick?: () => void;
	billingProvider?: string | null;
	cancelAtPeriodEnd?: boolean;
}) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		});
	};

	return (
		<div className="bg-[#1A1A1A] text-white p-8 relative overflow-hidden shadow-lg">
			{/* Background decoration */}
			<div className="absolute top-0 right-0 w-64 h-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-white/5 blur-3xl" />

			<div className="relative z-10 flex items-start justify-between">
				<div>
					<div className="flex items-center gap-2 mb-2">
						<div
							className={`w-2 h-2 rounded-full ${cancelAtPeriodEnd ? "bg-red-500" : "bg-green-500 animate-pulse"}`}
						/>
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
							{cancelAtPeriodEnd ? "Cancelled" : "Active Plan"}
						</span>
					</div>
					<h2 className="mb-1 text-3xl font-medium tracking-tight uppercase">{planName}</h2>
				</div>
				<button
					type="button"
					onClick={onManageClick}
					className="bg-white text-[#1A1A1A] px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E5E5] transition-colors flex items-center gap-2"
				>
					{isFreePlan ? (
						<>
							<Sparkles size={10} /> Upgrade Plan
						</>
					) : billingProvider === "shopify" ? (
						<>
							Manage in Shopify <ExternalLink size={10} />
						</>
					) : (
						<>
							Manage Subscription <ArrowRight size={10} />
						</>
					)}
				</button>
			</div>

			{billingPeriodStart && billingPeriodEnd && (
				<div className="grid grid-cols-2 gap-8 pt-6 mt-8 border-t border-white/10">
					<div>
						<div className="text-[10px] font-mono uppercase text-[#888] mb-1 flex items-center gap-2">
							<Calendar size={10} /> Billing Cycle
						</div>
						<div className="text-sm font-medium">
							{formatDate(billingPeriodStart)} - {formatDate(billingPeriodEnd)}
						</div>
					</div>
					<div>
						<div className="text-[10px] font-mono uppercase text-[#888] mb-1 flex items-center gap-2">
							<Clock size={10} /> {cancelAtPeriodEnd ? "Expires in" : "Renewal in"}
						</div>
						<div className={`text-sm font-medium ${cancelAtPeriodEnd ? "text-red-500" : ""}`}>
							{isFreePlan
								? "-"
								: cancelAtPeriodEnd
									? billingPeriodEnd
										? `Expires ${formatDate(billingPeriodEnd)}`
										: "Cancelled"
									: daysRemaining === 0
										? "Today"
										: `${daysRemaining} ${daysRemaining === 1 ? "Day" : "Days"}`}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function formatStorage(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

function formatStorageLimit(bytes: number): string {
	if (bytes < 1024) return `${bytes}`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}`;
	if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)}`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)}`;
}

function getStorageUnit(bytes: number): string {
	if (bytes < 1024) return "B";
	if (bytes < 1024 * 1024) return "KB";
	if (bytes < 1024 * 1024 * 1024) return "MB";
	return "GB";
}

// --- MAIN COMPONENT ---

export function StripeBilling() {
	const router = useRouter();
	const {
		plans,
		currentPlanId,
		hasSubscription,
		billingProvider,
		isLoading: plansLoading,
	} = usePlansWithCurrent();
	const { shop, isEmbedded } = useShopify();
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [portalLoading, setPortalLoading] = useState(false);
	const [isAnnual, setIsAnnual] = useState(true);
	const [shopDomain, setShopDomain] = useState<string | null>(null);

	// Shopify billing if: embedded in Shopify iframe, OR API says billing provider is shopify, OR user has connected shops
	const isShopifyBilling =
		isEmbedded ||
		billingProvider === "shopify" ||
		usage?.billingProvider === "shopify" ||
		shopDomain !== null;

	// Build the Shopify admin pricing URL from either URL params or API-fetched shop domain
	const effectiveShop = shop || shopDomain;
	const shopHandle = effectiveShop?.replace(".myshopify.com", "") ?? null;
	const shopifyPricingUrl = shopHandle
		? `https://admin.shopify.com/store/${shopHandle}/charges/vela-ai/pricing_plans`
		: null;

	useEffect(() => {
		async function fetchData() {
			try {
				const [usageData, shops] = await Promise.all([
					getUsage(),
					listShopifyShops().catch(() => []),
				]);
				setUsage(usageData);
				if (shops.length > 0 && shops[0].shopDomain) {
					setShopDomain(shops[0].shopDomain);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load usage");
			} finally {
				setLoading(false);
			}
		}
		fetchData();
	}, []);

	const handleOpenPortal = async () => {
		if (isShopifyBilling) {
			if (shopifyPricingUrl) {
				window.open(shopifyPricingUrl, "_top");
			} else {
				window.open("https://admin.shopify.com", "_top");
			}
			return;
		}

		setPortalLoading(true);
		try {
			const url = await openCustomerPortal();
			if (url) {
				window.location.href = url;
			} else {
				setError("Failed to open billing portal");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to open billing portal");
		} finally {
			setPortalLoading(false);
		}
	};

	const scrollToPlans = () => {
		document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" });
	};

	const isNearLimit = usage && usage.percentUsed >= 80;
	const isFreePlan = usage?.planId === "free";

	const daysRemaining = usage?.billingPeriodEnd
		? (() => {
				const end = new Date(usage.billingPeriodEnd);
				const now = new Date();
				const diff = end.getTime() - now.getTime();
				return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
			})()
		: null;

	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const currentPlanName = currentPlan?.name || usage?.planName || "Free";

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Usage & Billing"
				icon={
					<span className="flex items-center gap-2">
						<span>Monitor your usage and manage your subscription</span>
					</span>
				}
			/>

			<div className="w-full p-8 space-y-8">
				{/* Usage Section */}
				{loading ? (
					<section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
						<Skeleton className="h-48" />
						<div className="grid grid-cols-2 gap-4">
							<Skeleton className="h-48" />
							<Skeleton className="h-48" />
						</div>
					</section>
				) : error ? (
					<section className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<div className="flex items-center gap-3 text-red-600">
							<AlertTriangle size={16} />
							<span className="text-sm">{error}</span>
						</div>
					</section>
				) : usage ? (
					<>
						{/* Plan & Meters Section */}
						<section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
							<PlanCard
								planName={currentPlanName}
								billingPeriodStart={usage.billingPeriodStart}
								billingPeriodEnd={usage.billingPeriodEnd}
								daysRemaining={daysRemaining}
								isFreePlan={isFreePlan ?? true}
								onManageClick={isFreePlan ? scrollToPlans : handleOpenPortal}
								billingProvider={isShopifyBilling ? "shopify" : null}
								cancelAtPeriodEnd={usage.cancelAtPeriodEnd}
							/>

							<div
								className={`grid gap-4 ${usage.storageLimit !== -1 ? "grid-cols-2" : "grid-cols-1"}`}
							>
								<CapacityGauge
									label="AI Responses"
									icon={Zap}
									used={usage.used}
									total={usage.limit}
									unit="reqs"
									color="bg-blue-600"
								/>
								{usage.storageLimit !== -1 && (
									<CapacityGauge
										label="Storage"
										icon={HardDrive}
										used={usage.storageUsed}
										total={usage.storageLimit}
										unit={getStorageUnit(usage.storageLimit)}
										color="bg-orange-500"
										formatValue={(v) =>
											v === usage.storageUsed ? formatStorage(v) : formatStorageLimit(v)
										}
									/>
								)}
							</div>
						</section>

						{/* Usage Info Section */}
						<section className="bg-white border border-[#D1D1D1] shadow-sm p-6">
							<h3 className="text-xs font-bold tracking-wide uppercase text-[#1A1A1A] mb-4 flex items-center gap-2">
								<Zap size={14} className="text-[#888]" /> How Usage Works
							</h3>
							<div className="space-y-3 text-sm text-[#555]">
								<p>
									<strong className="text-[#1A1A1A]">AI Responses:</strong> Each AI reply counts as
									one response. User messages and human-escalated conversations don't count toward
									your limit.
								</p>
								<p>
									<strong className="text-[#1A1A1A]">Auto-escalation:</strong> Conversations are
									automatically escalated to a human after 50 AI responses.
								</p>
								{usage.storageLimit !== -1 && (
									<p>
										<strong className="text-[#1A1A1A]">Storage:</strong> Knowledge base documents
										and files count toward your storage limit.
									</p>
								)}
							</div>
						</section>

						{/* Near Limit Warning */}
						{isNearLimit && (
							<section className="flex items-start gap-3 p-4 border border-yellow-200 bg-yellow-50">
								<AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
								<div>
									<p className="text-sm font-medium text-yellow-700">Approaching message limit</p>
									<p className="text-xs text-yellow-600">
										Consider upgrading your plan to avoid service interruption.
									</p>
								</div>
							</section>
						)}
					</>
				) : null}

				{/* Plans Section */}
				<section id="plans-section" className="pt-4">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-xl font-medium tracking-tight">Subscription Plans</h2>
							<p className="text-sm text-[#888] mt-1">
								{isShopifyBilling
									? "Choose a plan that fits your needs. Billing is handled through Shopify."
									: "Choose a plan that fits your needs"}
							</p>
						</div>

						{!isShopifyBilling && (
							<div className="flex items-center gap-4">
								{/* Billing Interval Toggle */}
								<div className="flex items-center gap-2 border border-[#D1D1D1] bg-[#FAFAF9] p-1">
									<button
										type="button"
										onClick={() => setIsAnnual(false)}
										className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
											!isAnnual
												? "bg-[#1A1A1A] text-white"
												: "bg-transparent text-[#555] hover:text-[#1A1A1A]"
										}`}
									>
										Monthly
									</button>
									<button
										type="button"
										onClick={() => setIsAnnual(true)}
										className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors flex items-center gap-1.5 ${
											isAnnual
												? "bg-[#1A1A1A] text-white"
												: "bg-transparent text-[#555] hover:text-[#1A1A1A]"
										}`}
									>
										Yearly
										<span
											className={`text-[8px] px-1 py-0.5 rounded ${isAnnual ? "bg-green-500 text-white" : "bg-green-100 text-green-700"}`}
										>
											Save 17%
										</span>
									</button>
								</div>

								<button
									type="button"
									onClick={handleOpenPortal}
									disabled={portalLoading}
									className="h-8 px-4 border border-[#D1D1D1] bg-white text-[10px] font-bold uppercase hover:bg-[#F9F9F9] flex items-center gap-2 text-[#555] disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<ExternalLink size={12} />
									{portalLoading ? "Loading..." : "Manage Payment Method"}
								</button>
							</div>
						)}
					</div>

					{/* Pricing Grid */}
					{plansLoading ? (
						<PlanGridSkeleton />
					) : (
						<PlanGrid
							plans={plans}
							currentPlanId={currentPlanId}
							hasSubscription={hasSubscription}
							isAnnual={isShopifyBilling ? false : isAnnual}
							billingProvider={isShopifyBilling ? "shopify" : null}
							shopifyPricingUrl={isShopifyBilling ? shopifyPricingUrl : null}
						/>
					)}
				</section>

				{/* Shopify Billing Notice */}
				{isShopifyBilling && (
					<section className="bg-white border border-[#D1D1D1] shadow-sm p-6">
						<h3 className="text-xs font-bold tracking-wide uppercase text-[#1A1A1A] mb-4 flex items-center gap-2">
							<ShoppingBag size={14} className="text-[#888]" /> Shopify Billing
						</h3>
						<p className="text-sm text-[#555] mb-4">
							Your subscription is managed through Shopify. When you select a plan above, you'll be
							redirected to Shopify to approve the charge.
						</p>
						<button
							type="button"
							onClick={handleOpenPortal}
							className="bg-[#1A1A1A] text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2"
						>
							Manage Plan in Shopify <ExternalLink size={10} />
						</button>
					</section>
				)}

				{/* Enterprise & Self-Hosted Split Block */}
				<section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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

						<button
							type="button"
							onClick={() => router.push("/contact?subject=Self-Hosted%20Inquiry")}
							className="bg-white border border-[#1A1A1A] text-[#1A1A1A] px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-colors whitespace-nowrap"
						>
							Contact Support
						</button>
					</div>
				</section>
			</div>
		</div>
	);
}
