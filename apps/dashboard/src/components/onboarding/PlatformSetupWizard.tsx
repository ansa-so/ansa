"use client";

import { AlertCircle, CheckCircle2, ChevronRight, Loader2, Store } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

interface PlatformSetupWizardProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	platform: "woocommerce" | "magento" | "bigcommerce";
	agentId: string;
	onComplete: () => void;
	onSkip: () => void;
}

const platformConfigs = {
	woocommerce: {
		name: "WooCommerce",
		logo: "🛒",
		description:
			"Connect your WooCommerce store to enable order lookup and customer support tools.",
		fields: [
			{
				name: "storeUrl",
				label: "Store URL",
				type: "url",
				placeholder: "https://yourstore.com",
				required: true,
			},
			{
				name: "apiKey",
				label: "Consumer Key",
				type: "text",
				placeholder: "ck_...",
				required: true,
			},
			{
				name: "apiSecret",
				label: "Consumer Secret",
				type: "password",
				placeholder: "cs_...",
				required: true,
			},
		],
		helpText: "You can find your API credentials in WooCommerce → Settings → Advanced → REST API.",
		helpLink: "https://woocommerce.com/document/woocommerce-rest-api/",
	},
	magento: {
		name: "Magento",
		logo: "🧡",
		description: "Connect your Magento store to enable order lookup and customer support tools.",
		fields: [
			{
				name: "storeUrl",
				label: "Store URL",
				type: "url",
				placeholder: "https://yourstore.com",
				required: true,
			},
			{
				name: "apiKey",
				label: "Integration Access Token",
				type: "password",
				placeholder: "Bearer token",
				required: true,
			},
		],
		helpText:
			"Create an Integration in System → Extensions → Integrations to get your access token.",
		helpLink:
			"https://devdocs.magento.com/guides/v2.4/get-started/authentication/gs-authentication-token.html",
	},
	bigcommerce: {
		name: "BigCommerce",
		logo: "🏪",
		description:
			"Connect your BigCommerce store to enable order lookup and customer support tools.",
		fields: [
			{
				name: "storeUrl",
				label: "API Path",
				type: "url",
				placeholder: "https://api.bigcommerce.com/stores/{store_hash}",
				required: true,
			},
			{
				name: "apiKey",
				label: "Access Token",
				type: "password",
				placeholder: "Your API access token",
				required: true,
			},
		],
		helpText: "Create an API Account in Settings → API → API Accounts to get your credentials.",
		helpLink: "https://developer.bigcommerce.com/docs/start/authentication/api-accounts",
	},
};

export function PlatformSetupWizard({
	open,
	onOpenChange,
	platform,
	agentId,
	onComplete,
	onSkip,
}: PlatformSetupWizardProps) {
	const [credentials, setCredentials] = useState<Record<string, string>>({});
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState(false);

	const config = platformConfigs[platform];

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setIsLoading(true);

		try {
			const response = await fetch(`${API_BASE}/onboarding/configure-platform`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					platform,
					agentId,
					credentials: {
						storeUrl: credentials.storeUrl,
						apiKey: credentials.apiKey,
						apiSecret: credentials.apiSecret,
					},
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || data.details || "Failed to connect store");
			}

			setSuccess(true);
			setTimeout(() => {
				onComplete();
			}, 1500);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSkip = () => {
		onSkip();
		onOpenChange(false);
	};

	if (success) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogPortal>
					<DialogOverlay className="bg-[#1A1A1A]/50 dark:bg-[#000]/70" />
					<DialogContent className="!rounded-none border-2 border-[#1A1A1A] dark:border-[#F3F2EE] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.1)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.1)] p-0 sm:max-w-md bg-white dark:bg-[#252525]">
						{/* Header */}
						<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center gap-3">
							<CheckCircle2 className="w-6 h-6 text-green-500" />
							<div>
								<h2 className="text-lg font-medium tracking-tight">{config.name} Connected!</h2>
								<p className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666] mt-1">
									Integration Complete
								</p>
							</div>
						</div>

						<div className="p-8 text-center">
							<div className="inline-flex items-center justify-center w-16 h-16 mb-4 border-2 border-green-600 dark:border-green-500">
								<CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
							</div>
							<p className="font-mono text-sm text-[#555] dark:text-[#999]">
								Order lookup and e-commerce tools have been set up for your agent.
							</p>
						</div>
					</DialogContent>
				</DialogPortal>
			</Dialog>
		);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogOverlay className="bg-[#1A1A1A]/50 dark:bg-[#000]/70" />
				<DialogContent className="!rounded-none border-2 border-[#1A1A1A] dark:border-[#F3F2EE] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.1)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.1)] p-0 sm:max-w-lg bg-white dark:bg-[#252525]">
					{/* Header */}
					<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center gap-3">
						<div className="flex items-center justify-center w-12 h-12 text-2xl border-2 border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A]">
							{config.logo}
						</div>
						<div>
							<h2 className="text-lg font-medium tracking-tight">Connect {config.name}</h2>
							<p className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666] mt-1">
								Platform Configuration
							</p>
						</div>
					</div>

					<div className="p-6">
						<p className="font-mono text-sm text-[#555] dark:text-[#999] mb-6">
							{config.description}
						</p>

						<form onSubmit={handleSubmit} className="space-y-4">
							{config.fields.map((field) => (
								<div key={field.name}>
									<label
										htmlFor={field.name}
										className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#777] block mb-2"
									>
										{field.label}
										{field.required && <span className="text-red-500 ml-1">*</span>}
									</label>
									<input
										id={field.name}
										type={field.type}
										placeholder={field.placeholder}
										value={credentials[field.name] || ""}
										onChange={(e) =>
											setCredentials((prev) => ({ ...prev, [field.name]: e.target.value }))
										}
										required={field.required}
										disabled={isLoading}
										className="w-full h-12 px-4 font-mono text-sm bg-[#FAFAF9] dark:bg-[#1A1A1A] border-2 border-[#1A1A1A] dark:border-[#F3F2EE] outline-none focus:bg-white dark:focus:bg-[#252525] transition-colors placeholder:text-[#AAA] dark:placeholder:text-[#666] disabled:opacity-50 text-[#1A1A1A] dark:text-[#F3F2EE]"
									/>
								</div>
							))}

							{error && (
								<div className="flex items-start gap-2 p-3 border border-red-500 bg-red-50 dark:bg-red-900/20">
									<AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
									<span className="font-mono text-[11px] text-red-600 dark:text-red-400">
										{error}
									</span>
								</div>
							)}

							<div className="p-3 border border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A] font-mono text-[11px] text-[#555] dark:text-[#999]">
								<p>{config.helpText}</p>
								<a
									href={config.helpLink}
									target="_blank"
									rel="noopener noreferrer"
									className="text-[#1A1A1A] dark:text-[#F3F2EE] hover:underline mt-1 inline-block"
								>
									Learn more →
								</a>
							</div>

							{/* Actions */}
							<div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2">
								<button
									type="button"
									onClick={handleSkip}
									disabled={isLoading}
									className="px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-[#888] dark:text-[#777] hover:text-[#1A1A1A] dark:hover:text-[#F3F2EE] transition-colors disabled:opacity-50"
								>
									Skip for now
								</button>
								<button
									type="submit"
									disabled={isLoading}
									className="px-6 py-3 bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
								>
									{isLoading ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											Connecting...
										</>
									) : (
										<>
											<Store className="w-4 h-4" />
											Connect Store
											<ChevronRight className="w-4 h-4" />
										</>
									)}
								</button>
							</div>
						</form>
					</div>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	);
}
