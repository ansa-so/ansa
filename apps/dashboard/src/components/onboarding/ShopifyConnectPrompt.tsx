"use client";

import { ChevronRight, MessageSquare, Package, ShoppingBag, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";

interface ShopifyConnectPromptProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onConnect: () => void;
	onSkip: () => void;
}

const benefits = [
	{
		icon: Package,
		title: "Order Lookup",
		description: "Let customers check their order status instantly",
	},
	{
		icon: MessageSquare,
		title: "Smart Responses",
		description: "AI knows your products, prices, and inventory",
	},
	{
		icon: Zap,
		title: "Auto-Sync",
		description: "Always up-to-date with your store data",
	},
];

export function ShopifyConnectPrompt({
	open,
	onOpenChange,
	onConnect,
	onSkip,
}: ShopifyConnectPromptProps) {
	const handleConnect = () => {
		onConnect();
		onOpenChange(false);
	};

	const handleSkip = () => {
		onSkip();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogOverlay className="bg-[#1A1A1A]/50 dark:bg-[#000]/70" />
				<DialogContent className="!rounded-none border-2 border-[#1A1A1A] dark:border-[#F3F2EE] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.1)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.1)] p-0 sm:max-w-lg bg-white dark:bg-[#252525]">
					{/* Header */}
					<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center gap-3">
						<div className="flex items-center justify-center w-12 h-12 border-2 border-[#96bf48]">
							<ShoppingBag className="w-6 h-6 text-[#96bf48]" />
						</div>
						<div>
							<h2 className="text-lg font-medium tracking-tight">Connect Your Shopify Store</h2>
							<p className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666] mt-1">
								Platform Detected
							</p>
						</div>
					</div>

					<div className="p-6">
						<p className="font-mono text-sm text-[#555] dark:text-[#999] mb-6">
							We detected you&apos;re using Shopify! Connect your store to unlock powerful features.
						</p>

						{/* Benefits */}
						<div className="space-y-4 mb-6">
							{benefits.map((benefit) => (
								<div key={benefit.title} className="flex items-start gap-3">
									<div className="flex items-center justify-center w-10 h-10 shrink-0 border border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A]">
										<benefit.icon className="w-5 h-5 text-[#555] dark:text-[#999]" />
									</div>
									<div>
										<p className="font-medium text-[#1A1A1A] dark:text-[#F3F2EE]">
											{benefit.title}
										</p>
										<p className="font-mono text-[11px] text-[#888] dark:text-[#777]">
											{benefit.description}
										</p>
									</div>
								</div>
							))}
						</div>

						{/* Info box */}
						<div className="p-3 border border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A] font-mono text-[11px] text-[#555] dark:text-[#999] mb-6">
							<p>
								You&apos;ll be redirected to Shopify to authorize the connection. We only request
								the permissions needed for order lookup and product information.
							</p>
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
							<button
								type="button"
								onClick={handleSkip}
								className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-[#888] dark:text-[#777] hover:text-[#1A1A1A] dark:hover:text-[#F3F2EE] transition-colors"
							>
								Skip for now
							</button>
							<button
								type="button"
								onClick={handleConnect}
								className="px-6 py-3 bg-[#96bf48] hover:bg-[#7ea83a] text-white font-medium flex items-center justify-center gap-2 transition-colors"
							>
								Connect Shopify
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	);
}
