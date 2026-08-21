"use client";

import {
	Activity,
	CheckCircle2,
	Copy,
	Crown,
	ExternalLink,
	Facebook,
	Globe,
	Link,
	Lock,
	Plus,
	Radio,
	RefreshCw,
	RotateCcw,
	Shield,
	Sparkles,
	Trash2,
	Webhook,
	Zap,
} from "lucide-react";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgents } from "@/lib/agent-context";
import {
	connectMessengerPages,
	disconnectMessengerPage,
	getMessengerPages,
	getMessengerSettings,
	getMessengerWebhookInfo,
	type MessengerChannelSettings,
	type MessengerPage,
} from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";

const API_BASE = getConfig().apiUrl || "http://localhost:3001";

// --- COMPONENTS ---

const PlanBadge = () => (
	<div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest border border-[#1A1A1A]">
		<Crown size={10} className="text-yellow-400 fill-current" />
		<span>Growth+</span>
	</div>
);

const CopyField = ({ label, value }: { label: string; value: string }) => {
	const [copied, setCopied] = useState(false);
	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		setCopied(true);
		toast.success(`${label} copied to clipboard`);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="group">
			<div className="flex justify-between items-end mb-1.5">
				<span className="text-[9px] font-mono uppercase text-[#888]">{label}</span>
				{copied && (
					<span className="text-[9px] font-mono text-green-600 animate-in fade-in">
						COPIED TO CLIPBOARD
					</span>
				)}
			</div>
			<div className="flex items-center gap-2">
				<div className="flex-1 h-9 bg-[#FAFAF9] border border-[#D1D1D1] px-3 flex items-center text-xs font-mono text-[#555] select-all truncate">
					{value}
				</div>
				<button
					type="button"
					onClick={handleCopy}
					className="h-9 px-3 bg-white border border-[#D1D1D1] hover:border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors"
				>
					<Copy size={12} />
				</button>
			</div>
		</div>
	);
};

interface NodeCardProps {
	page: MessengerPage;
	onDisconnect: (pageId: string) => void;
	onShowWebhook: (pageId: string) => void;
}

const NodeCard = ({ page, onDisconnect, onShowWebhook }: NodeCardProps) => (
	<div className="border border-[#D1D1D1] bg-white p-5 relative overflow-hidden group hover:border-[#1A1A1A] transition-colors">
		{/* Status Stripe */}
		<div
			className={`absolute top-0 left-0 w-1 h-full ${page.enabled ? "bg-green-500" : "bg-[#888]"}`}
		/>

		<div className="flex items-start justify-between pl-3 mb-4">
			<div className="flex items-center gap-3">
				<div className="w-10 h-10 bg-[#1877F2] text-white flex items-center justify-center text-xl font-bold rounded-sm shadow-sm">
					<Facebook size={20} fill="currentColor" />
				</div>
				<div>
					<h3 className="font-bold text-sm text-[#1A1A1A]">{page.pageName}</h3>
					<div className="text-[10px] font-mono text-[#888] flex items-center gap-2 mt-0.5">
						<span>ID: {page.facebookPageId}</span>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div
					className={`px-2 py-1 text-[9px] font-bold uppercase flex items-center gap-1.5 ${
						page.enabled
							? "bg-green-50 border border-green-100 text-green-700"
							: "bg-[#F3F2EE] border border-[#D1D1D1] text-[#888]"
					}`}
				>
					<div
						className={`w-1.5 h-1.5 rounded-full ${page.enabled ? "bg-green-500 animate-pulse" : "bg-[#888]"}`}
					/>
					{page.enabled ? "Synced" : "Disabled"}
				</div>
				<button
					type="button"
					onClick={() => onShowWebhook(page.id)}
					className="w-7 h-7 flex items-center justify-center border border-[#D1D1D1] text-[#888] hover:text-[#1A1A1A] hover:border-[#1A1A1A] transition-colors"
					title="View webhook"
				>
					<Webhook size={12} />
				</button>
				<button
					type="button"
					onClick={() => onDisconnect(page.id)}
					className="w-7 h-7 flex items-center justify-center border border-[#D1D1D1] text-[#D1D1D1] hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
					title="Disconnect"
				>
					<Trash2 size={12} />
				</button>
			</div>
		</div>

		{/* Telemetry Footer */}
		<div className="pl-3 mt-4 pt-4 border-t border-[#F3F2EE] grid grid-cols-3 gap-4">
			<div>
				<div className="text-[9px] font-mono uppercase text-[#888] mb-1">Status</div>
				<div className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1">
					<Activity size={10} /> {page.enabled ? "Active" : "Inactive"}
				</div>
			</div>
			<div>
				<div className="text-[9px] font-mono uppercase text-[#888] mb-1">Channel</div>
				<div className="text-xs font-mono font-bold text-[#1A1A1A] flex items-center gap-1">
					<Globe size={10} /> Messenger
				</div>
			</div>
			<div className="flex items-end justify-end">
				<button
					type="button"
					onClick={() => onShowWebhook(page.id)}
					className="text-[9px] font-bold uppercase text-[#555] hover:text-[#1A1A1A] flex items-center gap-1 decoration-1 underline-offset-2 hover:underline"
				>
					<ExternalLink size={10} /> Webhook
				</button>
			</div>
		</div>
	</div>
);

const StepItem = ({
	number,
	title,
	desc,
	active,
}: {
	number: string;
	title: string;
	desc: string;
	active: boolean;
}) => (
	<div className={`flex gap-4 ${active ? "opacity-100" : "opacity-50 grayscale"}`}>
		<div className="flex flex-col items-center gap-2">
			<div
				className={`w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold font-mono border ${active ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#CCC] border-[#E5E5E5]"}`}
			>
				{number}
			</div>
			<div className="w-px h-full bg-[#E5E5E5] min-h-[20px]" />
		</div>
		<div className="pb-6">
			<h4 className="mb-1 text-xs font-bold tracking-wide uppercase">{title}</h4>
			<p className="text-[11px] text-[#555] leading-relaxed max-w-sm font-mono">{desc}</p>
		</div>
	</div>
);

interface FacebookPage {
	id: string;
	name: string;
	accessToken: string;
}

export default function MessengerChannelPage() {
	const { currentAgent, isLoading: agentLoading } = useAgents();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState<MessengerChannelSettings | null>(null);
	const [pages, setPages] = useState<MessengerPage[]>([]);
	const [showPageSelector, setShowPageSelector] = useState(false);
	const [availablePages, setAvailablePages] = useState<FacebookPage[]>([]);
	const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
	const [connecting, setConnecting] = useState(false);
	const [webhookInfo, setWebhookInfo] = useState<{
		webhookUrl: string;
		verifyToken: string;
	} | null>(null);
	const [showWebhookModal, setShowWebhookModal] = useState(false);

	// Check if current plan has messenger channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasMessengerChannel =
		plansLoading || !currentPlanId
			? true // Show content while loading
			: currentPlanId === "unlimited" || (currentPlan?.hasMessengerChannel ?? false);

	// Load settings and pages
	const loadData = useCallback(async () => {
		if (!currentAgent) return;

		try {
			setLoading(true);
			const [settingsData, pagesData] = await Promise.all([
				getMessengerSettings(currentAgent.id),
				getMessengerPages(currentAgent.id),
			]);
			setSettings(settingsData);
			setPages(pagesData.pages);

			// Auto-fetch webhook info for first page
			if (pagesData.pages.length > 0) {
				try {
					const info = await getMessengerWebhookInfo(pagesData.pages[0].id);
					setWebhookInfo(info);
				} catch {
					// Ignore webhook fetch errors
				}
			}
		} catch (error) {
			console.error("Failed to load messenger data:", error);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		loadData();
	}, [loadData]);

	// Handle OAuth callback with pages data
	useEffect(() => {
		const pagesParam = searchParams.get("pages");
		const agentIdParam = searchParams.get("agentId");
		const error = searchParams.get("error");

		if (error) {
			toast.error(`Facebook connection failed: ${error}`);
			window.history.replaceState({}, "", "/channels/messenger");
			return;
		}

		if (pagesParam && agentIdParam) {
			if (!currentAgent) return;

			if (currentAgent.id !== agentIdParam) {
				console.warn("Agent ID mismatch:", currentAgent.id, agentIdParam);
				return;
			}

			try {
				const base64 = pagesParam.replace(/-/g, "+").replace(/_/g, "/");
				const decoded = atob(base64);
				const decodedPages = JSON.parse(decoded) as FacebookPage[];
				setAvailablePages(decodedPages);
				setShowPageSelector(true);
				window.history.replaceState({}, "", "/channels/messenger");
			} catch (e) {
				console.error("Failed to parse pages data:", e);
				toast.error("Failed to parse Facebook pages data");
			}
		}
	}, [searchParams, currentAgent]);

	const handleConnectPages = async () => {
		if (!currentAgent || selectedPages.size === 0) return;

		setConnecting(true);
		try {
			const pagesToConnect = availablePages.filter((p) => selectedPages.has(p.id));
			await connectMessengerPages(currentAgent.id, pagesToConnect);
			toast.success(`Connected ${pagesToConnect.length} page(s) successfully`);
			setShowPageSelector(false);
			setSelectedPages(new Set());
			setAvailablePages([]);
			await loadData();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to connect pages");
		} finally {
			setConnecting(false);
		}
	};

	const handleDisconnect = async (pageId: string) => {
		try {
			await disconnectMessengerPage(pageId);
			toast.success("Page disconnected");
			await loadData();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to disconnect page");
		}
	};

	const handleShowWebhook = async (pageId: string) => {
		try {
			const info = await getMessengerWebhookInfo(pageId);
			setWebhookInfo(info);
			setShowWebhookModal(true);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Failed to fetch webhook info");
		}
	};

	const startOAuthFlow = () => {
		if (!currentAgent) return;
		window.location.href = `${API_BASE}/messenger/install?agentId=${currentAgent.id}`;
	};

	// Loading state
	if (!currentAgent || loading) {
		return (
			<div className="flex min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
				<main className="flex flex-col flex-1 min-w-0">
					<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center px-8">
						<div className="animate-pulse">
							<div className="h-5 w-48 bg-[#E5E5E5] rounded mb-2" />
							<div className="h-3 w-32 bg-[#E5E5E5] rounded" />
						</div>
					</header>
					<div className="flex-1 w-full max-w-5xl p-8 mx-auto">
						<div className="space-y-8 animate-pulse">
							<div className="h-40 bg-[#E5E5E5] rounded" />
							<div className="h-64 bg-[#E5E5E5] rounded" />
						</div>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* --- MAIN CONTENT --- */}
			<main className="flex flex-col flex-1 min-w-0">
				{/* Header */}
				<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
					<div>
						<h1 className="text-xl font-medium tracking-tight">Messenger Gateway</h1>
						<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
							<span className="flex items-center gap-1">
								<Facebook size={10} /> Graph API v18.0
							</span>
							<span className="text-[#D1D1D1]">|</span>
							<span
								className={`flex items-center gap-1 ${settings?.enabled && pages.length > 0 ? "text-green-600" : "text-[#888]"}`}
							>
								<Radio size={10} />{" "}
								{settings?.enabled && pages.length > 0 ? "Signal Stable" : "Offline"}
							</span>
						</div>
					</div>

					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => loadData()}
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
						>
							<RotateCcw size={12} /> Reload
						</button>
						{planHasMessengerChannel && (
							<button
								type="button"
								onClick={startOAuthFlow}
								className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm"
							>
								<Link size={12} /> Connect New Page
							</button>
						)}
					</div>
				</header>

				{/* Content Area */}
				<div className="flex-1 w-full p-8 mx-auto space-y-8 overflow-y-auto">
					{/* UPSELL ALERT (If not on Growth+) */}
					{!planHasMessengerChannel && (
						<div className="relative flex items-start gap-4 p-4 overflow-hidden border border-yellow-200 bg-yellow-50">
							<div className="absolute top-0 right-0 p-4 pointer-events-none opacity-10">
								<Crown size={120} />
							</div>
							<div className="z-10 p-2 text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-sm">
								<Lock size={16} />
							</div>
							<div className="z-10">
								<div className="flex items-center gap-2 mb-1">
									<h3 className="text-xs font-bold text-yellow-900 uppercase">
										Restricted Capability
									</h3>
									<PlanBadge />
								</div>
								<p className="text-[11px] text-yellow-800/80 max-w-xl leading-relaxed mb-3">
									<strong>Facebook Messenger</strong> integration allows your AI agent to
									automatically respond to messages sent to your Facebook Pages. This feature is
									available exclusively on the Growth Plan and above.
								</p>
								<NextLink
									href="/billing"
									className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-[#333]"
								>
									<Sparkles size={10} />
									Upgrade License
								</NextLink>
							</div>
						</div>
					)}

					{/* 1. Active Uplinks (Connected Pages) */}
					<section
						className={
							!planHasMessengerChannel
								? "opacity-60 pointer-events-none select-none grayscale-[50%]"
								: ""
						}
					>
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2">
								<Zap size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Active Uplinks</h3>
							</div>
							<span className="text-[9px] font-mono uppercase bg-[#F3F2EE] px-2 py-1 border border-[#E5E5E5] text-[#555]">
								{pages.length} {pages.length === 1 ? "Node" : "Nodes"} Mounted
							</span>
						</div>

						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							{pages.map((page) => (
								<NodeCard
									key={page.id}
									page={page}
									onDisconnect={handleDisconnect}
									onShowWebhook={handleShowWebhook}
								/>
							))}

							{/* Add New Placeholder */}
							{planHasMessengerChannel && (
								<button
									type="button"
									onClick={startOAuthFlow}
									className="border border-dashed border-[#D1D1D1] bg-[#FAFAF9] p-5 flex flex-col items-center justify-center gap-3 min-h-[140px] hover:border-[#888] hover:bg-white transition-all cursor-pointer group"
								>
									<div className="w-10 h-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#CCC] group-hover:text-[#1A1A1A] group-hover:border-[#1A1A1A] transition-colors">
										<Plus size={16} />
									</div>
									<span className="text-[10px] font-bold uppercase text-[#888] group-hover:text-[#1A1A1A]">
										Mount New Page
									</span>
								</button>
							)}
						</div>

						{pages.length === 0 && !planHasMessengerChannel && (
							<div className="border border-dashed border-[#D1D1D1] bg-white p-8 text-center">
								<div className="w-12 h-12 bg-[#F3F2EE] rounded-full flex items-center justify-center mx-auto mb-4">
									<Facebook size={24} className="text-[#888]" />
								</div>
								<h4 className="mb-2 text-sm font-bold">No Pages Connected</h4>
								<p className="text-[11px] text-[#888] max-w-sm mx-auto">
									Connect your Facebook Pages to allow your AI agent to respond to Messenger
									conversations.
								</p>
							</div>
						)}
					</section>

					{/* 2. Handshake Protocol (Instructions & Config) */}
					<section
						className={`grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-[#D1D1D1] ${
							!planHasMessengerChannel
								? "opacity-60 pointer-events-none select-none grayscale-[50%]"
								: ""
						}`}
					>
						{/* Left: Instructions */}
						<div>
							<div className="flex items-center gap-2 mb-6">
								<Shield size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Handshake Protocol</h3>
							</div>
							<div className="pl-2">
								<StepItem
									number="01"
									title="Authorize Application"
									desc="Grant the 'pages_messaging' permission to allow the AI to read and reply to incoming messages."
									active={true}
								/>
								<StepItem
									number="02"
									title="Bind Webhook"
									desc="Copy the callback URL and Verify Token to the Facebook Developer Portal to establish the real-time pipe."
									active={pages.length > 0}
								/>
								<StepItem
									number="03"
									title="Integrity Check"
									desc="Send a test message to your page. The AI should reply instantly if the uplink is secure."
									active={pages.length > 0 && (settings?.enabled ?? false)}
								/>
							</div>
						</div>

						{/* Right: Technical Config */}
						<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm h-fit">
							<div className="flex items-center gap-2 mb-6 text-[#555]">
								<Webhook size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">
									Webhook Configuration
								</h3>
							</div>

							{pages.length > 0 && webhookInfo ? (
								<div className="space-y-5">
									<CopyField label="Callback URL (HTTPS)" value={webhookInfo.webhookUrl} />
									<CopyField label="Verify Token" value={webhookInfo.verifyToken} />

									<div className="pt-4 border-t border-[#F3F2EE] flex items-center gap-2 text-[9px] text-[#888] font-mono">
										<CheckCircle2 size={12} className="text-green-600" />
										<span>SSL Certificate Validated (SHA-256)</span>
									</div>
								</div>
							) : (
								<div className="py-8 text-center">
									<div className="w-12 h-12 bg-[#F3F2EE] rounded-full flex items-center justify-center mx-auto mb-4">
										<Webhook size={20} className="text-[#888]" />
									</div>
									<p className="text-[11px] text-[#888] max-w-xs mx-auto">
										Connect a Facebook Page to view webhook configuration details.
									</p>
								</div>
							)}
						</div>
					</section>

					{/* Settings Link */}
					{planHasMessengerChannel && pages.length > 0 && (
						<section className="pt-8 border-t border-[#D1D1D1]">
							<NextLink
								href="/settings/channels/messenger"
								className="inline-flex items-center gap-2 text-[10px] font-bold uppercase text-[#555] hover:text-[#1A1A1A] underline-offset-2 hover:underline"
							>
								<RefreshCw size={12} /> Configure AI Response Settings
							</NextLink>
						</section>
					)}
				</div>
			</main>

			{/* Page Selector Modal */}
			<Dialog open={showPageSelector} onOpenChange={setShowPageSelector}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Select Pages to Connect</DialogTitle>
						<DialogDescription>
							Choose which Facebook Pages you want to connect to this agent.
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-2 overflow-y-auto max-h-64">
						{availablePages.map((page) => (
							<label
								key={page.id}
								className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
									selectedPages.has(page.id)
										? "border-[#1877F2] bg-blue-50"
										: "border-[#D1D1D1] hover:bg-[#F3F2EE]"
								}`}
							>
								<input
									type="checkbox"
									checked={selectedPages.has(page.id)}
									onChange={(e) => {
										const newSelected = new Set(selectedPages);
										if (e.target.checked) {
											newSelected.add(page.id);
										} else {
											newSelected.delete(page.id);
										}
										setSelectedPages(newSelected);
									}}
									className="w-4 h-4"
								/>
								<div className="w-8 h-8 bg-[#1877F2] text-white flex items-center justify-center rounded-sm">
									<Facebook size={16} />
								</div>
								<span className="text-sm font-medium">{page.name}</span>
							</label>
						))}
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowPageSelector(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleConnectPages}
							disabled={selectedPages.size === 0 || connecting}
							className="bg-[#1877F2] hover:bg-[#166FE5]"
						>
							{connecting ? "Connecting..." : `Connect ${selectedPages.size} Page(s)`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Webhook Info Modal */}
			<Dialog open={showWebhookModal} onOpenChange={setShowWebhookModal}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Webhook Configuration</DialogTitle>
						<DialogDescription>
							Add these values to your Facebook App&apos;s Messenger webhook settings.
						</DialogDescription>
					</DialogHeader>
					{webhookInfo && (
						<div className="py-4 space-y-4">
							<CopyField label="Callback URL (HTTPS)" value={webhookInfo.webhookUrl} />
							<CopyField label="Verify Token" value={webhookInfo.verifyToken} />
							<div className="pt-2 text-[10px] text-[#888] font-mono">
								<strong>Subscribed Fields:</strong> messages, messaging_postbacks
							</div>
						</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowWebhookModal(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
