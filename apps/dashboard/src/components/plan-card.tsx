"use client";

import { AlertCircle, Check, Cpu, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trackEvent } from "@/lib/analytics";
import { listAgents } from "@/lib/api";
import { getPlanAction, getPlanFeatures, PLAN_META, type Plan, type PlanMeta } from "@/lib/plans";
import {
	checkDowngrade,
	type DowngradeBlocker,
	openCustomerPortal,
	selectFreePlan,
	startCheckout,
} from "@/lib/stripe";

interface PlanCardProps {
	plan: Plan;
	currentPlanId?: string | null;
	hasSubscription?: boolean;
	onPlanChange?: () => void;
	isAnnual?: boolean;
	billingProvider?: string | null;
	shopifyPricingUrl?: string | null;
}

export function PlanCard({
	plan,
	currentPlanId,
	hasSubscription = false,
	onPlanChange,
	isAnnual = true,
	billingProvider,
	shopifyPricingUrl,
}: PlanCardProps) {
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [blockers, setBlockers] = useState<DowngradeBlocker[]>([]);
	const [showBlockersDialog, setShowBlockersDialog] = useState(false);

	const meta: PlanMeta = PLAN_META[plan.id] || {
		description: "",
		icon: undefined as any,
		popular: false,
	};

	// Check if this is the current plan (works for both free and paid users)
	const isCurrent = currentPlanId === plan.id;
	// For paid subscriptions, determine if this would be an upgrade or downgrade
	const action = hasSubscription ? getPlanAction(currentPlanId || "free", plan.id) : "select";
	const isUpgrade =
		action === "upgrade" || (!hasSubscription && plan.id !== "free" && plan.id !== currentPlanId);
	const isDowngrade = action === "downgrade";

	// Get the correct price ID based on billing interval
	const stripePriceId = isAnnual ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

	async function handleAction() {
		// Enterprise plan - redirect to contact page
		if (plan.id === "enterprise") {
			router.push("/contact?subject=Enterprise%20Plan%20Inquiry");
			return;
		}

		// Shopify billing — plan changes are handled in Shopify admin via Managed Pricing
		if (billingProvider === "shopify") {
			const url = shopifyPricingUrl || "https://admin.shopify.com";
			window.open(url, "_top");
			return;
		}

		setIsLoading(true);

		try {
			// Initial free plan selection
			if (plan.id === "free" && !hasSubscription) {
				const success = await selectFreePlan();
				if (success) {
					trackEvent("plan_selected", {
						planName: plan.id,
						billingPeriod: isAnnual ? "yearly" : "monthly",
					});
					onPlanChange?.();
					// Check if user has agents to determine redirect destination
					try {
						const agents = await listAgents();
						router.push(agents.length === 0 ? "/onboarding" : "/dashboard");
					} catch {
						// If we can't fetch agents, default to onboarding
						router.push("/onboarding");
					}
				}
				return;
			}

			// Initial paid plan selection - go to checkout
			if (!hasSubscription && plan.id !== "free") {
				if (!stripePriceId) {
					toast.error("Billing is not configured. Please contact support.");
					return;
				}
				trackEvent("plan_selected", {
					planName: plan.id,
					billingPeriod: isAnnual ? "yearly" : "monthly",
				});
				const url = await startCheckout(stripePriceId);
				if (url) {
					window.location.href = url;
				} else {
					toast.error("Failed to start checkout. Please try again.");
				}
				return;
			}

			// Upgrading from free or lower plan - go to checkout
			// Customer Portal doesn't show upgrade options, only manages existing subscriptions
			if (hasSubscription && isUpgrade) {
				if (!stripePriceId) {
					toast.error("Billing is not configured. Please contact support.");
					return;
				}
				trackEvent("plan_upgraded", {
					fromPlan: currentPlanId || "free",
					toPlan: plan.id,
					billingPeriod: isAnnual ? "yearly" : "monthly",
				});
				const url = await startCheckout(stripePriceId);
				if (url) {
					window.location.href = url;
				} else {
					toast.error("Failed to start checkout. Please try again.");
				}
				return;
			}

			// Downgrading - check for blockers first
			if (hasSubscription && isDowngrade) {
				const result = await checkDowngrade(plan.id);

				if (!result.canDowngrade && result.blockers?.length > 0) {
					setBlockers(result.blockers);
					setShowBlockersDialog(true);
					return;
				}

				if (!result.canDowngrade) {
					toast.error("Cannot downgrade plan. Please try again.");
					return;
				}

				// No blockers, proceed to portal
				const url = await openCustomerPortal();
				if (url) {
					window.location.href = url;
				}
			}
		} catch (error) {
			console.error("Plan action failed:", error);
		} finally {
			setIsLoading(false);
		}
	}

	function getButtonText(): string {
		if (plan.id === "enterprise") return "Contact Us";
		if (isCurrent) return "Current Plan";
		if (isUpgrade) return "Upgrade";
		if (isDowngrade) return "Downgrade";
		if (plan.id === "free") return "Get Started";
		return "Subscribe";
	}

	const features = getPlanFeatures(plan);

	const capacityText =
		plan.messages === -1
			? "Unlimited messages/mo"
			: plan.id === "free"
				? `${plan.messages.toLocaleString()} Messages (Lifetime)`
				: `${plan.messages.toLocaleString()} Messages / mo`;

	return (
		<>
			<div
				className={`flex flex-col h-full border relative group transition-all duration-300 ${
					isCurrent
						? "bg-white border-[#1A1A1A] shadow-[0_0_0_1px_#1A1A1A] z-10"
						: "bg-white border-[#D1D1D1] hover:border-[#888] hover:shadow-lg"
				}`}
			>
				{/* Status Badges */}
				<div className="absolute top-0 right-0 flex">
					{meta.popular && !isCurrent && (
						<div className="bg-[#1A1A1A] text-white text-[9px] font-bold uppercase px-2 py-1">
							Most Popular
						</div>
					)}
					{isCurrent && (
						<div className="bg-green-500 text-white text-[9px] font-bold uppercase px-2 py-1 flex items-center gap-1">
							<div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
							Active License
						</div>
					)}
				</div>

				<div className="flex flex-col flex-1 p-6">
					{/* Header */}
					<div className="mb-4">
						<h3 className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-2">
							{plan.name}
						</h3>
						<div className="flex items-baseline">
							{plan.price === -1 ? (
								<span className="text-4xl font-medium tracking-tighter text-[#1A1A1A]">Custom</span>
							) : (
								<>
									<span className="mr-1 text-lg font-medium align-top">$</span>
									<span className="text-5xl font-medium tracking-tighter text-[#1A1A1A]">
										{isAnnual ? plan.price : Math.round(plan.price * 1.3)}
									</span>
									<span className="text-xs text-[#888] font-mono ml-1">/mo</span>
								</>
							)}
						</div>
						{plan.price !== -1 && plan.id !== "free" && isAnnual && (
							<p className="text-[10px] text-[#888] mt-1">
								billed ${(plan.price * 12).toLocaleString()} yearly
							</p>
						)}
					</div>

					{/* Description */}
					<p className="text-xs text-[#555] mb-6 leading-relaxed min-h-[40px]">
						{meta.description}
					</p>

					{/* Capacity Metric */}
					<div className="bg-[#FAFAF9] border border-[#F3F2EE] p-3 mb-6">
						<div className="text-[9px] font-mono uppercase text-[#888] mb-1">Capacity Limit</div>
						<div className="text-xs font-bold text-[#1A1A1A] flex items-center gap-2">
							<Cpu size={12} /> {capacityText}
						</div>
					</div>

					{/* Specs List */}
					<div className="flex-1 mb-8 space-y-3">
						{features.map((feat, j) => {
							const isFeatureObject = typeof feat === "object" && feat !== null;
							const featureText = isFeatureObject ? feat.text : feat;
							const featureTooltip = isFeatureObject ? feat.tooltip : undefined;

							return (
								<div key={j} className="flex items-start gap-3 text-xs text-[#555]">
									<div className={`mt-0.5 ${isCurrent ? "text-green-600" : "text-[#1A1A1A]"}`}>
										<Check size={12} strokeWidth={3} />
									</div>
									{featureTooltip ? (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="cursor-help border-b border-dotted border-[#888]">
														{featureText}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>{featureTooltip}</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									) : (
										<span>{featureText}</span>
									)}
								</div>
							);
						})}
					</div>

					{/* Action Button */}
					<button
						type="button"
						onClick={handleAction}
						disabled={isLoading || isCurrent}
						className={`w-full py-3 text-[10px] font-bold uppercase tracking-widest transition-colors border ${
							isCurrent
								? "bg-[#F3F2EE] text-[#888] border-[#D1D1D1] cursor-default"
								: "bg-white text-[#1A1A1A] border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
						}`}
					>
						{isLoading ? (
							<span className="flex items-center justify-center gap-2">
								<Loader2 className="w-3 h-3 animate-spin" />
								Loading...
							</span>
						) : (
							getButtonText()
						)}
					</button>
				</div>
			</div>

			{/* Downgrade Blockers Dialog */}
			<AlertDialog open={showBlockersDialog} onOpenChange={setShowBlockersDialog}>
				<AlertDialogContent className="max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<AlertCircle className="w-5 h-5 text-destructive" />
							Cannot Downgrade to {plan.name}
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-4">
								<p>
									Your current usage exceeds the limits of the {plan.name} plan. Please reduce your
									usage before downgrading.
								</p>
								<div className="space-y-3">
									{blockers.map((blocker) => (
										<div
											key={`${blocker.type}-${blocker.agentId || blocker.current}`}
											className="p-3 text-sm border rounded-lg bg-muted/50"
										>
											<p className="font-medium text-foreground">{blocker.message}</p>
											{blocker.agentName && (
												<p className="mt-1 text-xs text-muted-foreground">
													Agent: {blocker.agentName}
												</p>
											)}
										</div>
									))}
								</div>
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Close</AlertDialogCancel>
						<AlertDialogAction onClick={() => router.push("/dashboard")}>
							Manage Agents
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
