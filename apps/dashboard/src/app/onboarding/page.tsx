"use client";

import { motion } from "framer-motion";
import {
	CheckCircle2,
	ChevronRight,
	Crosshair,
	ExternalLink,
	Globe,
	Loader2,
	Radio,
	Terminal,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PlatformSetupWizard, ShopifyConnectPrompt } from "@/components/onboarding";
import { getAgentLimits } from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";
import { getGlobalSessionToken, isShopifyEmbedded } from "@/lib/shopify-context";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

type OnboardingState = "input" | "loading" | "complete";

interface Step {
	id: string;
	message: string;
	done: boolean;
}

interface InfoItem {
	label: string;
	value: string;
}

interface UrlItem {
	url: string;
	index: number;
}

interface SetupResult {
	agentId: string;
	agentName: string;
	profilePicture: string | null;
}

interface AutoSetupInfo {
	triggers: string[];
	hasContactForm: boolean;
	isEcommerce: boolean;
}

interface PlatformInfo {
	platform: string;
	name: string;
}

interface PlatformAction {
	action: "oauth" | "setup_wizard" | "none";
	provider?: string;
	platform?: string;
	installUrl?: string;
}

export default function OnboardingPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const shopParam = searchParams.get("shop");
	const [state, setState] = useState<OnboardingState>("input");
	const [websiteUrl, setWebsiteUrl] = useState(
		shopParam ? `https://${shopParam.replace(/\.myshopify\.com$/, "")}.myshopify.com` : "",
	);
	const [error, setError] = useState("");
	const [result, setResult] = useState<SetupResult | null>(null);
	const [fadeOut, setFadeOut] = useState(false);

	// Progress state
	const [steps, setSteps] = useState<Step[]>([]);
	const [infoItems, setInfoItems] = useState<InfoItem[]>([]);
	const [urls, setUrls] = useState<UrlItem[]>([]);
	const [indexingUrl, setIndexingUrl] = useState<string | null>(null);
	const [progress, setProgress] = useState(0);

	// New state for enhanced onboarding
	const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);
	const [autoSetupInfo, setAutoSetupInfo] = useState<AutoSetupInfo | null>(null);
	const [platformAction, setPlatformAction] = useState<PlatformAction | null>(null);

	// Modal state
	const [showShopifyPrompt, setShowShopifyPrompt] = useState(false);
	const [showSetupWizard, setShowSetupWizard] = useState(false);

	const urlListRef = useRef<HTMLDivElement>(null);

	// Check if user can create a new agent
	useEffect(() => {
		getAgentLimits()
			.then((limits) => {
				if (!limits.canCreate) {
					toast.error(
						"You've reached your agent limit. Please upgrade your plan to create more agents.",
					);
					router.push("/billing");
				}
			})
			.catch(console.error);
	}, [router]);

	// Auto-scroll URL list
	useEffect(() => {
		if (urlListRef.current) {
			urlListRef.current.scrollTop = urlListRef.current.scrollHeight;
		}
	}, [urls]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		let url = websiteUrl.trim();
		if (!url) {
			setError("Please enter your website URL");
			return;
		}

		if (!url.startsWith("http://") && !url.startsWith("https://")) {
			url = `https://${url}`;
			setWebsiteUrl(url);
		}

		try {
			new URL(url);
		} catch {
			setError("Please enter a valid URL");
			return;
		}

		setState("loading");
		setSteps([]);
		setInfoItems([]);
		setUrls([]);
		setProgress(0);
		setPlatformInfo(null);
		setAutoSetupInfo(null);

		try {
			const headers: Record<string, string> = { "Content-Type": "application/json" };
			if (isShopifyEmbedded()) {
				const token = await getGlobalSessionToken();
				if (token) headers.Authorization = `Bearer ${token}`;
			}
			const response = await fetch(`${API_BASE}/onboarding/setup`, {
				method: "POST",
				headers,
				credentials: "include",
				body: JSON.stringify({ websiteUrl: url }),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || "Failed to set up AI assistant");
			}

			// Handle SSE stream
			const reader = response.body?.getReader();
			const decoder = new TextDecoder();

			if (!reader) throw new Error("No response body");

			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data:")) {
						try {
							const data = JSON.parse(line.slice(5).trim());
							handleEvent(data);
						} catch {
							// Skip invalid JSON
						}
					}
				}
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong");
			setState("input");
		}
	};

	const handleEvent = (data: Record<string, unknown>) => {
		const type = data.type as string;

		switch (type) {
			case "step": {
				const step = data.step as string;
				const message = data.message as string;
				const done = data.done as boolean;

				if (done) {
					setSteps((prev) => {
						const existing = prev.find((s) => s.id === step);
						if (existing) {
							return prev.map((s) => (s.id === step ? { ...s, message, done: true } : s));
						}
						return [...prev, { id: step, message, done: true }];
					});

					// Update progress based on step (adjusted for new setting_up step)
					const stepProgress: Record<string, number> = {
						connecting: 12,
						extracting: 28,
						finding: 45,
						creating: 60,
						setting_up: 78,
						indexing: 95,
					};
					setProgress(stepProgress[step] || progress);
				} else {
					setSteps((prev) => {
						const existing = prev.find((s) => s.id === step);
						if (!existing) {
							return [...prev, { id: step, message, done: false }];
						}
						return prev.map((s) => (s.id === step ? { ...s, message } : s));
					});
				}
				break;
			}

			case "info": {
				const label = data.label as string;
				const value = data.value as string;
				setInfoItems((prev) => [...prev, { label, value }]);
				break;
			}

			case "url": {
				const url = data.url as string;
				const index = data.index as number;
				setUrls((prev) => [...prev, { url, index }]);
				break;
			}

			case "indexing": {
				const url = data.url as string;
				setIndexingUrl(url);
				break;
			}

			case "platform": {
				const platform = data.platform as string;
				const name = data.name as string;
				setPlatformInfo({ platform, name });
				break;
			}

			case "auto_setup": {
				const triggers = data.triggers as string[];
				const hasContactForm = data.hasContactForm as boolean;
				const isEcommerce = data.isEcommerce as boolean;
				const action = data.platformAction as PlatformAction | undefined;
				setAutoSetupInfo({ triggers, hasContactForm, isEcommerce });
				if (action) {
					setPlatformAction(action);
				}
				break;
			}

			case "complete": {
				const agentId = data.agentId as string;
				const agentName = data.agentName as string;
				const profilePicture = data.profilePicture as string | null;
				const action = data.platformAction as PlatformAction | undefined;

				setResult({ agentId, agentName, profilePicture });
				setProgress(100);
				setState("complete");

				if (action) {
					setPlatformAction(action);
				}

				// Check if we need to show a platform modal
				const effectiveAction = action || platformAction;
				if (
					effectiveAction?.action === "oauth" &&
					effectiveAction.provider === "shopify" &&
					!isShopifyEmbedded()
				) {
					// Show Shopify connect prompt only when NOT already embedded in Shopify
					setTimeout(() => {
						setShowShopifyPrompt(true);
					}, 1500);
				} else if (effectiveAction?.action === "setup_wizard" && effectiveAction.platform) {
					// Show setup wizard after a short delay
					setTimeout(() => {
						setShowSetupWizard(true);
					}, 1500);
				} else {
					// No platform action, redirect to setup complete page
					setTimeout(() => {
						setFadeOut(true);
						setTimeout(() => {
							router.push(`/setup-complete?agent=${agentId}`);
						}, 500);
					}, 2500);
				}
				break;
			}

			case "error": {
				const message = data.message as string;
				setError(message);
				setState("input");
				break;
			}
		}
	};

	return (
		<div
			className={`min-h-screen bg-[#F3F2EE] dark:bg-[#1A1A1A] text-[#1A1A1A] dark:text-[#F3F2EE] font-sans selection:bg-[#1A1A1A] dark:selection:bg-[#F3F2EE] selection:text-[#F3F2EE] dark:selection:text-[#1A1A1A] flex items-center justify-center p-4 transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
		>
			{/* Background Grid Texture */}
			<div
				className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
				style={{
					backgroundImage:
						"linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
					backgroundSize: "20px 20px",
				}}
			/>

			<div className="relative z-10 w-full max-w-2xl">
				{/* Input State */}
				{state === "input" && (
					<div className="bg-white dark:bg-[#252525] border border-[#D1D1D1] dark:border-[#3A3A3A] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.05)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)] overflow-hidden">
						{/* Header */}
						<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Globe size={24} strokeWidth={1.5} />
								<div>
									<h1 className="text-lg font-medium tracking-tight">Website Setup</h1>
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666]">
										AI Assistant Configuration
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest">
								<Radio size={10} className="text-green-500 animate-pulse" />
								<span className="text-[#888] dark:text-[#666]">Ready</span>
							</div>
						</div>

						<div className="relative p-8">
							<div className="mb-8 text-center">
								<h2 className="mb-3 text-2xl font-medium tracking-tight">
									What&apos;s your website?
								</h2>
								<p className="font-mono text-sm text-[#555] dark:text-[#999]">
									We&apos;ll create an AI assistant trained on your website content.
								</p>
							</div>

							<form onSubmit={handleSubmit} className="space-y-6">
								<div>
									<label
										htmlFor="website-url"
										className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#777] block mb-2"
									>
										Website URL
									</label>
									<input
										id="website-url"
										type="text"
										value={websiteUrl}
										onChange={(e) => setWebsiteUrl(e.target.value)}
										placeholder="example.com"
										className="w-full h-14 px-4 text-lg font-mono bg-[#FAFAF9] dark:bg-[#1A1A1A] border-2 border-[#1A1A1A] dark:border-[#F3F2EE] outline-none focus:bg-white dark:focus:bg-[#252525] transition-colors placeholder:text-[#AAA] dark:placeholder:text-[#666]"
									/>
									{error && (
										<p className="mt-2 font-mono text-sm text-red-600 dark:text-red-400">{error}</p>
									)}
								</div>

								<button
									type="submit"
									className="w-full h-14 bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
								>
									Create AI Assistant
									<ChevronRight size={20} />
								</button>
							</form>

							<p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#777]">
								We&apos;ll analyze your website and set up everything automatically.
							</p>

							<button
								type="button"
								onClick={() => router.push("/dashboard")}
								className="block mx-auto mt-8 font-mono text-[10px] uppercase tracking-widest text-[#AAA] dark:text-[#666] hover:text-[#1A1A1A] dark:hover:text-[#F3F2EE] transition-colors cursor-pointer"
							>
								Skip for now
							</button>
						</div>
					</div>
				)}

				{/* Loading State */}
				{state === "loading" && (
					<div className="bg-white dark:bg-[#252525] border border-[#D1D1D1] dark:border-[#3A3A3A] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.05)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)] overflow-hidden">
						{/* Header */}
						<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<Loader2 size={24} strokeWidth={1.5} className="animate-spin" />
								<div>
									<h1 className="text-lg font-medium tracking-tight">System Initialization</h1>
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666] flex items-center gap-2">
										<Globe size={10} /> Target: {websiteUrl}
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								{platformInfo && (
									<span className="font-mono text-[9px] uppercase tracking-widest px-2 py-1 border border-current">
										{platformInfo.name}
									</span>
								)}
								<div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest">
									<Radio size={10} className="text-green-500 animate-pulse" />
									<span className="text-[#888] dark:text-[#666]">Live</span>
								</div>
							</div>
						</div>

						<div className="relative p-8">
							{/* Background Texture */}
							<div
								className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
								style={{
									backgroundImage:
										"linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
									backgroundSize: "20px 20px",
								}}
							/>

							{/* Progress Bar */}
							<div className="mb-8">
								<div className="flex justify-between items-center mb-2 font-mono text-[10px] uppercase tracking-widest">
									<span>Progress Status</span>
									<span className="font-bold">{progress}% Complete</span>
								</div>
								<div className="h-4 bg-[#F3F2EE] dark:bg-[#1A1A1A] border border-[#D1D1D1] dark:border-[#3A3A3A] p-[2px]">
									<motion.div
										initial={{ width: 0 }}
										animate={{ width: `${progress}%` }}
										transition={{ duration: 0.5, ease: "easeOut" }}
										className="h-full bg-[#1A1A1A] dark:bg-[#F3F2EE] relative overflow-hidden"
									>
										<div
											className="absolute inset-0 w-full h-full animate-[moveStripes_1s_linear_infinite]"
											style={{
												backgroundImage:
													"linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)",
												backgroundSize: "20px 20px",
											}}
										/>
									</motion.div>
								</div>
							</div>

							{/* Terminal-style Steps */}
							<div className="border border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A] p-4 font-mono text-xs relative mb-6">
								<div className="absolute top-0 left-0 p-2 text-[#888] dark:text-[#777] uppercase tracking-widest text-[9px] border-b border-r border-[#D1D1D1] dark:border-[#3A3A3A] bg-white dark:bg-[#252525] flex items-center gap-1">
									<Terminal size={10} /> Build Log
								</div>

								<div className="mt-6 space-y-3">
									{steps.map((step) => (
										<div
											key={step.id}
											className={`flex items-center gap-3 ${!step.done ? "opacity-70" : ""}`}
										>
											{step.done ? (
												<CheckCircle2
													size={14}
													className="text-green-600 dark:text-green-500 shrink-0"
												/>
											) : (
												<Loader2 size={14} className="animate-spin shrink-0" />
											)}
											<span className={step.done ? "text-[#555] dark:text-[#AAA]" : "font-bold"}>
												{!step.done && <span className="mr-1">{">"}</span>}
												{step.message}
											</span>
										</div>
									))}
								</div>
							</div>

							{/* Info Items & URLs Grid */}
							<div className="grid grid-cols-2 gap-4 font-mono text-xs">
								{/* Extracted Info */}
								{infoItems.length > 0 && (
									<div>
										<h3 className="uppercase tracking-widest text-[#888] dark:text-[#777] mb-3 text-[10px] flex items-center gap-1">
											<Crosshair size={10} /> Extracted Data
										</h3>
										<div className="space-y-2">
											{infoItems.map((item, i) => (
												<div
													key={i}
													className="flex justify-between border-b border-[#F3F2EE] dark:border-[#3A3A3A] pb-1"
												>
													<span className="text-[#888] dark:text-[#777]">{item.label}:</span>
													<span className="font-bold flex items-center gap-1">
														{item.label === "Brand color" ? (
															<>
																<span
																	className="w-3 h-3 border border-[#D1D1D1] dark:border-[#3A3A3A]"
																	style={{ backgroundColor: item.value }}
																/>
																{item.value}
															</>
														) : item.label === "Logo found" ? (
															<span className="text-green-600 dark:text-green-500 flex items-center gap-1">
																<CheckCircle2 size={10} /> Found
															</span>
														) : (
															item.value
														)}
													</span>
												</div>
											))}
										</div>
									</div>
								)}

								{/* URLs Found */}
								{urls.length > 0 && (
									<div>
										<h3 className="uppercase tracking-widest text-[#888] dark:text-[#777] mb-3 text-[10px] flex items-center gap-1">
											<ExternalLink size={10} /> Indexing Queue
										</h3>
										<div
											ref={urlListRef}
											className="bg-[#F3F2EE] dark:bg-[#1A1A1A] border border-[#D1D1D1] dark:border-[#3A3A3A] p-2 h-24 overflow-y-auto text-[10px] text-[#555] dark:text-[#999] space-y-1 scrollbar-thin"
										>
											{urls.map((item, i) => (
												<div key={i} className="truncate">
													{item.index}. {item.url}
												</div>
											))}
										</div>
									</div>
								)}
							</div>

							{/* Indexing progress */}
							{indexingUrl && (
								<div className="flex items-center gap-2 mt-4 font-mono text-[10px] text-[#888] dark:text-[#777]">
									<Loader2 className="w-3 h-3 animate-spin" />
									<span className="truncate">Indexing: {indexingUrl}</span>
								</div>
							)}
						</div>
					</div>
				)}

				{/* Complete State */}
				{state === "complete" && result && (
					<div className="bg-white dark:bg-[#252525] border border-[#D1D1D1] dark:border-[#3A3A3A] shadow-[20px_20px_0px_0px_rgba(26,26,26,0.05)] dark:shadow-[20px_20px_0px_0px_rgba(255,255,255,0.05)] overflow-hidden">
						{/* Header */}
						<div className="bg-[#1A1A1A] dark:bg-[#F3F2EE] text-[#F3F2EE] dark:text-[#1A1A1A] p-6 flex items-center justify-between">
							<div className="flex items-center gap-3">
								<CheckCircle2 size={24} strokeWidth={1.5} className="text-green-500" />
								<div>
									<h1 className="text-lg font-medium tracking-tight">Setup Complete</h1>
									<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#666]">
										Agent ID: {result.agentId.slice(0, 8)}...
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest">
								<Radio size={10} className="text-green-500 animate-pulse" />
								<span className="text-green-500">Online</span>
							</div>
						</div>

						<div className="relative p-8 text-center">
							{/* Background Texture */}
							<div
								className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
								style={{
									backgroundImage:
										"linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
									backgroundSize: "20px 20px",
								}}
							/>

							<div className="relative">
								<div className="inline-flex items-center justify-center w-20 h-20 mb-6 border-2 border-green-600 dark:border-green-500">
									<CheckCircle2 size={40} className="text-green-600 dark:text-green-500" />
								</div>

								<h2 className="mb-3 text-2xl font-medium tracking-tight">
									{result.agentName} is ready!
								</h2>

								<p className="font-mono text-sm text-[#555] dark:text-[#999]">
									Your AI assistant is now live and learning from your website.
								</p>

								{/* Auto-setup summary */}
								{autoSetupInfo && autoSetupInfo.triggers.length > 0 && (
									<div className="mt-6 p-4 text-left border border-[#D1D1D1] dark:border-[#3A3A3A] bg-[#FAFAF9] dark:bg-[#1A1A1A]">
										<p className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#777] mb-3">
											✨ Engagement Triggers Configured
										</p>
										<div className="flex flex-wrap gap-2">
											{autoSetupInfo.triggers.map((trigger, i) => (
												<span
													key={i}
													className="px-2 py-1 font-mono text-[10px] border border-[#1A1A1A] dark:border-[#F3F2EE]"
												>
													{trigger}
												</span>
											))}
										</div>
										<p className="mt-3 font-mono text-[9px] text-[#888] dark:text-[#777]">
											You can customize these in the Triggers page.
										</p>
									</div>
								)}

								<div className="flex items-center justify-center gap-2 mt-6 font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-[#777]">
									<Loader2 className="w-3 h-3 animate-spin" />
									<span>Preparing your setup summary...</span>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Shopify Connect Prompt Modal */}
			<ShopifyConnectPrompt
				open={showShopifyPrompt}
				onOpenChange={setShowShopifyPrompt}
				onConnect={() => {
					// Redirect to Shopify OAuth with return URL
					const returnUrl = result ? `/setup-complete?agent=${result.agentId}` : "/";
					router.push(`/integrations/shopify?return=${encodeURIComponent(returnUrl)}`);
				}}
				onSkip={() => {
					setShowShopifyPrompt(false);
					if (result) {
						setFadeOut(true);
						setTimeout(() => {
							router.push(`/setup-complete?agent=${result.agentId}`);
						}, 500);
					}
				}}
			/>

			{/* Platform Setup Wizard Modal */}
			{platformAction?.platform && (
				<PlatformSetupWizard
					open={showSetupWizard}
					onOpenChange={setShowSetupWizard}
					platform={platformAction.platform as "woocommerce" | "magento" | "bigcommerce"}
					agentId={result?.agentId || ""}
					onComplete={() => {
						setShowSetupWizard(false);
						if (result) {
							setFadeOut(true);
							setTimeout(() => {
								router.push(`/setup-complete?agent=${result.agentId}`);
							}, 500);
						}
					}}
					onSkip={() => {
						setShowSetupWizard(false);
						if (result) {
							setFadeOut(true);
							setTimeout(() => {
								router.push(`/setup-complete?agent=${result.agentId}`);
							}, 500);
						}
					}}
				/>
			)}
		</div>
	);
}
