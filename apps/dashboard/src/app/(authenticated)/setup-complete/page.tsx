"use client";

import { PageHeader } from "@ansa/ui";
import {
	ArrowRight,
	CheckCircle2,
	Code,
	Copy,
	Database,
	ExternalLink,
	MessageSquare,
	Palette,
	Rocket,
	Settings,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import type { ShopifyShop } from "@/lib/api";
import { listShopifyShops } from "@/lib/api";
import { useConfig } from "@/lib/config-context";
import { getConfig } from "@/lib/runtime-config";

interface SetupData {
	agent: {
		id: string;
		name: string;
		slug: string;
		createdAt: string;
	};
	interfaceSettings: {
		displayName: string;
		profilePicture: string | null;
		primaryColor: string;
		widgetButtonColor: string;
		defaultLanguage: string;
	} | null;
	webSource: {
		id: string;
		url: string;
		name: string | null;
		status: string;
		pageCount: number;
	} | null;
	triggers: Array<{
		id: string;
		name: string;
		triggerType: string;
		actionType: string;
		isEnabled: boolean;
	}>;
}

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

// --- COMPONENTS ---

interface CodeBlockProps {
	code: string;
	filename?: string;
	onCopy?: () => void;
}

const CodeBlock = ({ code, filename = "index.html", onCopy }: CodeBlockProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		toast.success("Copied to clipboard");
		onCopy?.();
		setTimeout(() => setCopied(false), 2000);
	};

	const lines = code.split("\n");

	return (
		<div className="bg-[#1A1A1A] border border-[#1A1A1A] shadow-lg overflow-hidden">
			{/* Terminal Header */}
			<div className="bg-[#2A2A2A] px-3 py-2 flex items-center justify-between border-b border-[#333]">
				<div className="flex gap-1.5">
					<div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
					<div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
					<div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
				</div>
				<div className="text-[9px] font-mono text-[#888] uppercase">{filename}</div>
			</div>

			{/* Code Area */}
			<div className="relative p-4">
				<pre className="font-mono text-[11px] leading-loose text-[#E5E5E5] overflow-x-auto whitespace-pre-wrap break-all">
					{lines.map((line, i) => (
						<div key={`line-${i}-${line.slice(0, 20)}`}>
							<span className="text-[#555] select-none mr-3">{i + 1}</span>
							<span>{line}</span>
						</div>
					))}
				</pre>

				<button
					type="button"
					onClick={handleCopy}
					className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[10px] font-bold uppercase backdrop-blur-sm transition-colors flex items-center gap-2 border border-white/10"
				>
					{copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
};

interface StatCardProps {
	icon: React.ElementType;
	label: string;
	value: string | number;
	sublabel?: string;
	color?: string;
}

const StatCard = ({ icon: Icon, label, value, sublabel, color }: StatCardProps) => (
	<div className="border border-[#D1D1D1] bg-white p-4 flex items-start gap-3">
		<div
			className="flex items-center justify-center w-10 h-10 border"
			style={{
				backgroundColor: color ? `${color}15` : "#F3F2EE",
				borderColor: color || "#D1D1D1",
			}}
		>
			<Icon size={18} style={{ color: color || "#555" }} />
		</div>
		<div className="flex-1 min-w-0">
			<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-1">
				{label}
			</div>
			<div className="text-lg font-bold tracking-tight truncate">{value}</div>
			{sublabel && <div className="text-[10px] text-[#888] font-mono truncate">{sublabel}</div>}
		</div>
	</div>
);

interface NextStepCardProps {
	icon: React.ElementType;
	title: string;
	description: string;
	href: string;
	isPrimary?: boolean;
}

const NextStepCard = ({ icon: Icon, title, description, href, isPrimary }: NextStepCardProps) => (
	<Link
		href={href}
		className={`group block border p-5 transition-all ${
			isPrimary
				? "bg-[#1A1A1A] border-[#1A1A1A] text-white hover:opacity-90"
				: "bg-white border-[#D1D1D1] hover:border-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)]"
		}`}
	>
		<div className="flex items-start gap-4">
			<div
				className={`w-10 h-10 flex items-center justify-center border ${
					isPrimary
						? "bg-white/10 border-white/20"
						: "bg-[#F3F2EE] border-[#D1D1D1] group-hover:bg-[#1A1A1A] group-hover:border-[#1A1A1A]"
				}`}
			>
				<Icon
					size={18}
					className={isPrimary ? "text-white" : "text-[#555] group-hover:text-white"}
				/>
			</div>
			<div className="flex-1 min-w-0">
				<h3 className={`text-sm font-bold mb-1 ${isPrimary ? "text-white" : "text-[#1A1A1A]"}`}>
					{title}
				</h3>
				<p className={`text-[11px] font-mono ${isPrimary ? "text-white/70" : "text-[#888]"}`}>
					{description}
				</p>
			</div>
			<ArrowRight
				size={16}
				className={`shrink-0 mt-1 transition-transform group-hover:translate-x-1 ${
					isPrimary ? "text-white/50" : "text-[#888]"
				}`}
			/>
		</div>
	</Link>
);

function SetupCompleteContent() {
	const searchParams = useSearchParams();
	const { cdnUrl } = useConfig();
	const { currentAgent, setCurrentAgent, agents, isLoading: agentLoading } = useAgent();
	const [setupData, setSetupData] = useState<SetupData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [shopifyShop, setShopifyShop] = useState<ShopifyShop | null>(null);

	const agentId = searchParams.get("agent");

	// Check if user has a connected Shopify shop
	useEffect(() => {
		listShopifyShops()
			.then((shops) => {
				const active = shops.find((s) => s.status === "active");
				if (active) setShopifyShop(active);
			})
			.catch(() => {});
	}, []);

	// Set the current agent from URL param
	useEffect(() => {
		if (agentId && agents.length > 0) {
			const agent = agents.find((a) => a.id === agentId);
			if (agent && currentAgent?.id !== agentId) {
				setCurrentAgent(agent);
			}
		}
	}, [agentId, agents, currentAgent?.id, setCurrentAgent]);

	// Fetch setup data
	useEffect(() => {
		const fetchSetupData = async () => {
			// Wait for agent context to finish loading
			if (agentLoading) return;

			const targetAgentId = agentId || currentAgent?.id;
			if (!targetAgentId) {
				setError("No agent selected");
				setIsLoading(false);
				return;
			}

			try {
				const response = await fetch(`${API_BASE}/agents/${targetAgentId}/setup-summary`, {
					credentials: "include",
				});

				if (!response.ok) {
					throw new Error("Failed to fetch setup data");
				}

				const data = await response.json();
				setSetupData(data);
			} catch (err) {
				console.error("Error fetching setup data:", err);
				setError(err instanceof Error ? err.message : "Failed to load setup data");
			} finally {
				setIsLoading(false);
			}
		};

		fetchSetupData();
	}, [agentId, currentAgent?.id, agentLoading]);

	// Generate embed code
	// Generate embed code with timestamp for cache-busting
	const timestamp = Date.now();
	const embedScript = setupData
		? `<script src="${cdnUrl}/embed.js?agentId=${setupData.agent.id}&t=${timestamp}" defer></script>`
		: "";

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Setup Complete"
					subtitle="Loading your setup summary..."
					icon={<Rocket size={12} />}
				/>
				<div className="p-8 mx-auto space-y-8">
					<Skeleton className="h-32" />
					<Skeleton className="h-64" />
					<Skeleton className="h-48" />
				</div>
			</div>
		);
	}

	if (error || !setupData) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Setup Complete"
					subtitle="Something went wrong"
					icon={<Rocket size={12} />}
				/>
				<div className="max-w-5xl p-8 mx-auto">
					<div className="border border-[#D1D1D1] bg-white p-8 text-center">
						<p className="text-[#888] mb-4">{error || "Could not load setup data"}</p>
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 text-sm font-medium hover:opacity-90"
						>
							Go to Dashboard
							<ArrowRight size={14} />
						</Link>
					</div>
				</div>
			</div>
		);
	}

	const { agent, interfaceSettings, webSource, triggers } = setupData;
	const enabledTriggers = triggers.filter((t) => t.isEnabled);

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			<PageHeader
				title="Setup Complete"
				subtitle="Your AI assistant is ready to deploy"
				icon={<Rocket size={12} />}
			/>

			<div className="p-8 mx-auto space-y-8">
				{/* Success Banner */}
				<div className="flex items-center gap-4 p-3 border border-green-200 bg-green-50">
					<div className="flex items-center justify-center w-12 h-12 bg-green-100 border border-green-200 shrink-0">
						<CheckCircle2 size={24} className="text-green-600" />
					</div>
					<div>
						<h2 className="mb-1 text-lg font-bold text-green-900">{agent.name} is ready!</h2>
						<p className="font-mono text-[10px] font-mono text-green-700">
							Your AI assistant has been created and trained on your website content.
						</p>
					</div>
				</div>

				{/* Stats Grid */}
				<section>
					<h3 className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-[#888]">
						<Sparkles size={12} /> What We Set Up
					</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
						<StatCard
							icon={Database}
							label="Knowledge Base"
							value={webSource ? `${webSource.pageCount} pages` : "0 pages"}
							sublabel={webSource?.url}
							color="#808080"
						/>
						<StatCard
							icon={Zap}
							label="Triggers"
							value={`${enabledTriggers.length} active`}
							sublabel={
								enabledTriggers.length > 0
									? enabledTriggers
											.slice(0, 2)
											.map((t) => t.name)
											.join(", ")
									: "No triggers configured"
							}
							color="#808080"
						/>
						<StatCard
							icon={Palette}
							label="Theme"
							value={interfaceSettings?.displayName || agent.name}
							sublabel={`Primary: ${interfaceSettings?.primaryColor || "#808080"}`}
							color={"#808080"}
						/>
					</div>
				</section>

				{/* Triggers List */}
				{enabledTriggers.length > 0 && (
					<section className="border border-[#D1D1D1] bg-white p-6">
						<h3 className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-[#888]">
							<Zap size={12} /> Configured Triggers
						</h3>
						<div className="flex flex-wrap gap-2">
							{enabledTriggers.map((trigger) => (
								<span
									key={trigger.id}
									className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D1D1D1] bg-[#FAFAF9] text-xs font-mono"
								>
									<Zap size={10} className="text-amber-500" />
									{trigger.name}
								</span>
							))}
						</div>
						<p className="mt-3 text-[10px] text-[#888] font-mono">
							These triggers will automatically engage visitors based on their behavior.{" "}
							<Link href="/triggers" className="underline hover:text-[#1A1A1A]">
								Customize triggers →
							</Link>
						</p>
					</section>
				)}

				{/* Next Steps */}
				<section>
					<h3 className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-[#888]">
						<ArrowRight size={12} /> Post-Install Protocols
					</h3>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<NextStepCard
							icon={Palette}
							title="Customize Appearance"
							description="Change colors, messages, and branding to match your site."
							href="/settings/appearance"
						/>
						<NextStepCard
							icon={Database}
							title="Add More Content"
							description="Import additional pages or documents to expand knowledge."
							href="/ai-knowledge/web-sources"
						/>
						<NextStepCard
							icon={Zap}
							title="Auto-Discover API"
							description="Paste a URL and we'll create an API tool automatically."
							href="/tools/discover"
						/>
						<NextStepCard
							icon={MessageSquare}
							title="Test Your Assistant"
							description="Try out your AI assistant in the playground before going live."
							href={`/chat?agent=${agent.id}`}
						/>
					</div>
				</section>

				{/* Installation */}
				<section>
					<h3 className="flex items-center gap-2 mb-4 font-mono text-[10px] uppercase tracking-widest text-[#888]">
						<Code size={12} /> Install on Your Website
					</h3>

					{shopifyShop ? (
						<div className="border border-[#D1D1D1] bg-white p-6">
							<div className="flex items-start gap-4">
								<div className="flex items-center justify-center w-12 h-12 bg-[#96BF48]/10 border border-[#96BF48]/30 shrink-0">
									<svg
										width="24"
										height="24"
										viewBox="0 0 256 292"
										xmlns="http://www.w3.org/2000/svg"
									>
										<path
											d="M223.774 57.34c-.201-1.46-1.48-2.268-2.537-2.357-1.055-.088-23.383-1.743-23.383-1.743s-15.507-15.395-17.209-17.099c-1.703-1.703-5.029-1.185-6.32-.805-.183.053-3.388 1.046-8.68 2.678-5.18-14.906-14.322-28.604-30.405-28.604-.444 0-.901.018-1.358.044C129.31 3.407 123.644.779 118.75.779c-37.465 0-55.364 46.835-60.976 70.635-14.558 4.511-24.891 7.718-26.157 8.104-8.123 2.549-8.381 2.805-9.45 10.462C21.3 97.093.038 260.235.038 260.235l165.09 31.044 89.683-19.517S223.975 58.8 223.774 57.34"
											fill="#95BF47"
										/>
										<path
											d="M185.645 55.041c-1.055-.088-23.383-1.743-23.383-1.743s-15.507-15.395-17.209-17.099c-.637-.634-1.496-.959-2.394-1.099l-12.527 255.978 89.683-19.517S223.975 58.8 223.774 57.34c-.201-1.46-1.48-2.268-2.537-2.357"
											fill="#5E8E3E"
										/>
										<path
											d="M135.808 104.912l-11.09 32.926s-9.698-5.176-21.535-5.176c-17.418 0-18.304 10.927-18.304 13.684 0 15.038 39.2 20.8 39.2 56.024 0 27.713-17.577 45.558-41.277 45.558-28.44 0-42.984-17.7-42.984-17.7l7.615-25.16s14.95 12.835 27.565 12.835c8.243 0 11.596-6.49 11.596-11.232 0-19.616-32.16-20.491-32.16-52.724 0-27.129 19.472-53.382 58.778-53.382 15.145 0 22.596 4.347 22.596 4.347"
											fill="#FFF"
										/>
									</svg>
								</div>
								<div className="flex-1">
									<h4 className="text-sm font-bold text-[#1A1A1A] mb-1">
										Shopify Store: {shopifyShop.shopName || shopifyShop.shopDomain}
									</h4>
									<p className="text-[11px] text-[#888] font-mono mb-4">
										Enable the Ansa chat widget in your Shopify theme to make it visible on your
										storefront.
									</p>
									<a
										href={`https://${shopifyShop.shopDomain}/admin/themes/current/editor?context=apps&activateAppId=b175e95d60624d16c7d0ba4e2861f746/embed`}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity"
									>
										Enable Widget in Theme
										<ExternalLink size={14} />
									</a>
									<p className="mt-3 text-[10px] text-[#888] font-mono">
										This opens your theme editor with the Ansa embed pre-activated — just click{" "}
										<strong>Save</strong>.
									</p>
								</div>
							</div>
						</div>
					) : (
						<>
							<p className="text-sm text-[#555] mb-4">
								Add this code to your website's{" "}
								<code className="bg-[#F3F2EE] px-1.5 py-0.5 text-xs font-mono">&lt;head&gt;</code>{" "}
								section to deploy the chat widget:
							</p>
							<CodeBlock
								code={embedScript}
								filename="Add to <head>"
								onCopy={() => trackEvent("widget_code_copied", { agentId: agent.id })}
							/>
							<div className="flex flex-wrap gap-3 mt-4">
								<Link
									href="/channels/embed"
									className="inline-flex items-center gap-2 text-xs font-mono text-[#888] hover:text-[#1A1A1A] transition-colors"
								>
									<Settings size={12} />
									More installation options
									<ExternalLink size={10} />
								</Link>
							</div>
						</>
					)}
				</section>

				{/* Continue Button */}
				<div className="flex justify-center pt-4">
					<Link
						href="/overview"
						className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-3 text-sm font-bold hover:opacity-90 transition-opacity"
					>
						Continue to Dashboard
						<ArrowRight size={16} />
					</Link>
				</div>
			</div>
		</div>
	);
}

export default function SetupCompletePage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen bg-[#F3F2EE]">
					<PageHeader title="Setup Complete" subtitle="Loading..." icon={<Rocket size={12} />} />
					<div className="p-8 mx-auto space-y-8">
						<Skeleton className="h-32" />
						<Skeleton className="h-64" />
					</div>
				</div>
			}
		>
			<SetupCompleteContent />
		</Suspense>
	);
}
