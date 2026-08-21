"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { getUsage } from "@/lib/api";
import { useConfig } from "@/lib/config-context";

interface PremiumGateProps {
	children: React.ReactNode;
	feature?: "analytics" | "escalation";
	title?: string;
	description?: string;
}

const FEATURE_CONFIG = {
	analytics: {
		title: "Upgrade to unlock Analytics",
		description:
			"Get detailed insights into answer quality, unanswered questions, and issues needing attention.",
	},
	escalation: {
		title: "Upgrade to Enable Human Escalation",
		description:
			"Allow users to request live agent handoff with escalation buttons and human support features. Upgrade to Growth plan or higher to enable.",
	},
};

export function PremiumGate({
	children,
	feature = "analytics",
	title,
	description,
}: PremiumGateProps) {
	const { isSelfHosted } = useConfig();
	const [isFreePlan, setIsFreePlan] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [showModal, setShowModal] = useState(false);

	useEffect(() => {
		// Skip gating for self-hosted instances
		if (isSelfHosted) {
			setIsLoading(false);
			return;
		}

		async function checkPlan() {
			try {
				const usage = await getUsage();
				// For escalation feature, block free AND starter plans
				// For analytics, only block free plan
				const isBlocked =
					feature === "escalation"
						? usage.planId === "free" || usage.planId === "starter"
						: usage.planId === "free";
				setIsFreePlan(isBlocked);
				if (isBlocked) {
					setShowModal(true);
				}
			} catch (error) {
				console.error("Failed to check plan:", error);
			} finally {
				setIsLoading(false);
			}
		}
		checkPlan();
	}, [isSelfHosted, feature]);

	const config = FEATURE_CONFIG[feature];
	const modalTitle = title || config.title;
	const modalDescription = description || config.description;

	if (isLoading) {
		return <>{children}</>;
	}

	if (!isFreePlan) {
		return <>{children}</>;
	}

	return (
		<div className="relative">
			<div className="select-none blur-sm pointer-events-none">{children}</div>

			<Dialog open={showModal} onOpenChange={setShowModal}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader className="text-center sm:text-center">
						<div className="flex justify-center mb-4">
							<div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
								<Lock className="w-6 h-6 text-primary" />
							</div>
						</div>
						<DialogTitle>{modalTitle}</DialogTitle>
						<DialogDescription>{modalDescription}</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex-col gap-2 sm:flex-col">
						<Button asChild className="w-full">
							<Link href="/billing">Upgrade Plan</Link>
						</Button>
						<Button variant="ghost" className="w-full" onClick={() => setShowModal(false)}>
							Maybe later
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
