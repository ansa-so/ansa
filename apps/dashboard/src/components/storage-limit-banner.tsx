"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { getUsage, type UsageData } from "@/lib/api";
import { useConfig } from "@/lib/config-context";

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function StorageLimitBanner() {
	const { isSelfHosted } = useConfig();
	const [usage, setUsage] = useState<UsageData | null>(null);

	useEffect(() => {
		if (!isSelfHosted) {
			getUsage().then(setUsage).catch(console.error);
		}
	}, [isSelfHosted]);

	// Don't show anything for self-hosted or while loading
	if (isSelfHosted || !usage) {
		return null;
	}

	const isAtLimit = usage.storageUsed >= usage.storageLimit;
	const isNearLimit = usage.storagePercentUsed >= 80;

	// Don't show if under 80% usage
	if (!isNearLimit) {
		return null;
	}

	return (
		<div
			className={`mb-6 rounded-lg border p-4 ${
				isAtLimit
					? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
					: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
			}`}
		>
			<div className="flex items-start gap-3">
				<AlertTriangle
					className={`h-5 w-5 mt-0.5 ${
						isAtLimit ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
					}`}
				/>
				<div className="flex-1">
					<Text
						className={`font-semibold ${isAtLimit ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}`}
					>
						{isAtLimit ? "Storage limit reached" : "Approaching storage limit"}
					</Text>
					<div className="mt-2 space-y-3">
						<div className="flex items-center justify-between text-sm">
							<span
								className={
									isAtLimit
										? "text-red-700 dark:text-red-300"
										: "text-amber-700 dark:text-amber-300"
								}
							>
								{formatBytes(usage.storageUsed)} of {formatBytes(usage.storageLimit)} used
							</span>
							<span
								className={`font-medium ${isAtLimit ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}
							>
								{Math.round(usage.storagePercentUsed)}%
							</span>
						</div>
						{/* Progress bar */}
						<div className="w-full h-2 bg-gray-200 rounded-full dark:bg-gray-700">
							<div
								className={`h-2 rounded-full transition-all ${
									isAtLimit ? "bg-red-500" : "bg-amber-500"
								}`}
								style={{ width: `${Math.min(usage.storagePercentUsed, 100)}%` }}
							/>
						</div>
						<Text
							size="sm"
							className={
								isAtLimit ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"
							}
						>
							{isAtLimit
								? `You've reached your storage limit on the ${usage.planName} plan. Upgrade to add more knowledge sources.`
								: "You're running low on storage. Consider upgrading to avoid interruptions."}
						</Text>
						<div className="flex gap-2 mt-1">
							<Button asChild size="sm" variant={isAtLimit ? "destructive" : "default"}>
								<Link href="/billing">Upgrade Plan</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
