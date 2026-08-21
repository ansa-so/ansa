"use client";

import {
	Activity,
	AlertTriangle,
	Check,
	CheckCircle2,
	Code,
	CreditCard,
	Database,
	ExternalLink,
	Link2,
	Link as LinkIcon,
	Loader2,
	MessageSquare,
	MoreHorizontal,
	Package,
	Paintbrush,
	Plus,
	RefreshCw,
	Server,
	Settings,
	ShieldAlert,
	ShieldCheck,
	ShoppingBag,
	Trash2,
	Unlink,
	Wallet,
	X,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAgents } from "@/lib/agent-context";
import {
	disconnectShopifyShop,
	getShopifyShop,
	installShopifyWidget,
	linkAgentToShop,
	listRefundRequests,
	listShopifyShops,
	processRefundRequest,
	retryRefundRequest,
	type ShopifyRefundRequest,
	type ShopifyShop,
	type ShopifyShopAgent,
	syncShopifyShop,
	syncShopifyTools,
	unlinkAgentFromShop,
	updateShopAgentSettings,
} from "@/lib/api";

// --- STATUS BADGE COMPONENT ---
const StatusBadge = ({ status }: { status: string }) => {
	const isActive = status === "active" || status === "connected";
	return (
		<div
			className={`flex items-center gap-1.5 px-2 py-1 border text-[9px] font-mono font-bold uppercase tracking-wide ${
				isActive
					? "bg-green-50 border-green-200 text-green-700"
					: "bg-red-50 border-red-200 text-red-700"
			}`}
		>
			<div
				className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-green-500" : "bg-red-500"} animate-pulse`}
			/>
			{isActive ? "Uplink Active" : "Connection Lost"}
		</div>
	);
};

// --- STAT CELL COMPONENT ---
const StatCell = ({ label, value }: { label: string; value: string | number }) => (
	<div className="flex flex-col">
		<span className="text-[9px] text-[#888] font-mono uppercase mb-0.5">{label}</span>
		<span className="text-sm font-bold text-[#1A1A1A]">{value}</span>
	</div>
);

// --- CAPABILITY CARD COMPONENT ---
const CapabilityCard = ({
	icon: Icon,
	title,
	code,
	description,
}: {
	icon: React.ComponentType<{ size?: number }>;
	title: string;
	code: string;
	description: string;
}) => (
	<div className="bg-white border border-[#D1D1D1] p-5 shadow-sm hover:border-[#1A1A1A] transition-all group h-full flex flex-col">
		<div className="flex items-start justify-between mb-4">
			<div className="w-8 h-8 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
				<Icon size={14} />
			</div>
			<div className="text-[9px] font-mono font-bold text-[#888] bg-[#FAFAF9] px-1.5 py-0.5 border border-[#E5E5E5]">
				{code}
			</div>
		</div>

		<div className="mt-auto">
			<h3 className="font-bold text-sm uppercase tracking-wide mb-2 text-[#1A1A1A]">{title}</h3>
			<p className="text-xs text-[#555] leading-relaxed">{description}</p>
		</div>
	</div>
);

// Shopify App Store listing URL - installation must be initiated from Shopify (requirement 2.3.1)
const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ansa";

// --- CONNECTION TERMINAL COMPONENT ---
const ConnectionTerminal = () => {
	return (
		<div className="bg-white border border-[#D1D1D1] p-0 shadow-sm relative overflow-hidden">
			{/* Terminal Header */}
			<div className="h-10 border-b border-[#F3F2EE] bg-[#FAFAF9] flex items-center justify-between px-4">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 rounded-full bg-[#D1D1D1]" />
					<span className="font-mono text-[10px] uppercase text-[#888]">Protocol: OAuth 2.0</span>
				</div>
				<div className="font-mono text-[10px] uppercase text-[#888]">Port: 443 (Secure)</div>
			</div>

			{/* Main Interaction Area */}
			<div className="flex flex-col items-center gap-12 p-8 md:flex-row">
				{/* Visual: Bridge Diagram */}
				<div className="flex items-center justify-center flex-1 w-full gap-4 md:justify-start">
					{/* Node */}
					<div className="text-center">
						<div className="w-16 h-16 bg-[#1A1A1A] text-white flex items-center justify-center border border-[#1A1A1A] shadow-lg mb-3">
							<div className="text-xl font-bold">A</div>
						</div>
						<div className="font-mono text-[10px] uppercase text-[#555]">System Core</div>
					</div>

					{/* Connection Line */}
					<div className="flex-1 h-px bg-[#D1D1D1] relative min-w-[60px] max-w-[120px]">
						<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-[#D1D1D1] p-1.5 text-[#CCC]">
							<Link2 size={12} />
						</div>
					</div>

					{/* Shopify Node */}
					<div className="text-center">
						<div className="w-16 h-16 bg-white text-[#96bf48] flex items-center justify-center border border-[#D1D1D1] shadow-sm mb-3">
							<ShoppingBag size={24} />
						</div>
						<div className="font-mono text-[10px] uppercase text-[#555]">Storefront</div>
					</div>
				</div>

				{/* Controls */}
				<div className="flex-1 w-full max-w-md">
					<h2 className="mb-2 text-xl font-medium tracking-tight text-[#1A1A1A]">
						Establish Connection
					</h2>
					<p className="text-xs text-[#555] mb-6">
						Install Ansa from the Shopify App Store to sync products, orders, and customer data.
					</p>

					<div className="space-y-4">
						<a
							href={SHOPIFY_APP_STORE_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full bg-[#1A1A1A] text-white p-3 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors shadow-lg flex items-center justify-center gap-2"
						>
							Install from Shopify App Store <ExternalLink size={14} />
						</a>

						<div className="flex justify-center gap-4 text-[10px] text-[#888]">
							<span className="flex items-center gap-1">
								<ShieldCheck size={10} /> Data Encrypted
							</span>
							<span className="flex items-center gap-1">
								<CheckCircle2 size={10} /> Official Partner
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

const FEATURES = [
	{
		icon: Database,
		code: "SYNC.CATALOG",
		title: "Catalog Ingestion",
		description:
			"Auto-syncs products, orders, and inventory levels in real-time. Enables precise product recommendations.",
	},
	{
		icon: Code,
		code: "FE.WIDGET",
		title: "Frontend Injection",
		description:
			"Deploys the chat interface to your storefront with a single click. No theme code editing required.",
	},
	{
		icon: MessageSquare,
		code: "AI.QA",
		title: "Semantic Search",
		description:
			"Enables the AI to answer questions about shipping, returns, and product details using store data.",
	},
	{
		icon: Wallet,
		code: "OPS.REFUND",
		title: "Order Management",
		description:
			"Allows the AI to process refunds, check order status, and cancel items based on your policy.",
	},
	{
		icon: Zap,
		code: "AUTO.RULES",
		title: "Automation Logic",
		description:
			"Set thresholds for auto-approving returns or escalating high-value tickets automatically.",
	},
	{
		icon: Package,
		code: "UI.DISPLAY",
		title: "Inventory Vis.",
		description:
			"Renders rich product cards, carousels, and 'Add to Cart' buttons directly in the chat window.",
	},
];

import { formatDate, formatRelativeTime } from "@ansa/utils";

function formatCurrency(amount: number, currency: string = "USD"): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency,
	}).format(amount / 100);
}

export default function ShopifyIntegrationPage() {
	const { agents } = useAgents();
	const [shops, setShops] = useState<ShopifyShop[]>([]);
	const [loading, setLoading] = useState(true);

	const [selectedShop, setSelectedShop] = useState<
		(ShopifyShop & { agents: ShopifyShopAgent[] }) | null
	>(null);
	const [showLinkAgentDialog, setShowLinkAgentDialog] = useState(false);
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [selectedAgent, setSelectedAgent] = useState<string>("");
	const [refundLimit, setRefundLimit] = useState<string>("");
	const [autoRefundEnabled, setAutoRefundEnabled] = useState(false);
	const [saving, setSaving] = useState(false);
	const hasAutoOpenedLinkDialog = useRef(false);
	const [syncing, setSyncing] = useState<string | null>(null);
	const [installingWidget, setInstallingWidget] = useState<string | null>(null);

	// Refund requests
	const [refundRequests, setRefundRequests] = useState<ShopifyRefundRequest[]>([]);
	const [failedRefunds, setFailedRefunds] = useState<ShopifyRefundRequest[]>([]);
	const [loadingRefunds, setLoadingRefunds] = useState(false);
	const [processingRefund, setProcessingRefund] = useState<string | null>(null);
	const [retryingRefund, setRetryingRefund] = useState<string | null>(null);

	const fetchShops = useCallback(async () => {
		setLoading(true);
		try {
			const data = await listShopifyShops();
			setShops(data);
		} catch (err) {
			console.error("Failed to fetch shops:", err);
			toast.error("Failed to load Shopify shops");
		} finally {
			setLoading(false);
		}
	}, []);

	const fetchRefundRequests = useCallback(async () => {
		setLoadingRefunds(true);
		try {
			const [pending, failed] = await Promise.all([
				listRefundRequests("pending"),
				listRefundRequests("failed"),
			]);
			setRefundRequests(pending);
			setFailedRefunds(failed);
		} catch (err) {
			console.error("Failed to fetch refund requests:", err);
		} finally {
			setLoadingRefunds(false);
		}
	}, []);

	const router = useRouter();
	const searchParams = useSearchParams();

	useEffect(() => {
		fetchShops();
		fetchRefundRequests();
	}, [fetchShops, fetchRefundRequests]);

	// Handle OAuth success - auto-show link agent dialog for newly connected shop
	useEffect(() => {
		const success = searchParams.get("success");
		const setup = searchParams.get("setup");
		const shopDomainParam = searchParams.get("shop");

		if ((success === "true" || setup === "true") && shopDomainParam && shops.length > 0) {
			// Find the newly connected shop by domain
			const newShop = shops.find(
				(s) => s.shopDomain.toLowerCase() === shopDomainParam.toLowerCase(),
			);

			if (newShop) {
				// Load shop details and open link agent dialog
				getShopifyShop(newShop.id)
					.then((details) => {
						setSelectedShop(details);
						setShowLinkAgentDialog(true);
					})
					.catch((err) => {
						console.error("Failed to fetch shop details:", err);
					});

				// Clear URL params to prevent re-triggering on refresh
				router.replace("/integrations/shopify");
			}
		}
	}, [searchParams, shops, router]);

	// Auto-select shop when only one is connected
	useEffect(() => {
		if (shops.length === 1 && !selectedShop && !loading) {
			getShopifyShop(shops[0].id)
				.then((details) => {
					setSelectedShop(details);
				})
				.catch((err) => {
					console.error("Failed to fetch shop details:", err);
				});
		}
	}, [shops, selectedShop, loading]);

	// Auto-open link agent dialog when shop has no agents connected (once per page load)
	useEffect(() => {
		if (
			selectedShop &&
			selectedShop.agents.length === 0 &&
			!showLinkAgentDialog &&
			!hasAutoOpenedLinkDialog.current
		) {
			hasAutoOpenedLinkDialog.current = true;
			setShowLinkAgentDialog(true);
		}
	}, [selectedShop, showLinkAgentDialog]);

	// Get agents that aren't already linked to this shop
	const availableAgents = agents.filter(
		(agent) => !selectedShop?.agents.some((sa) => sa.agentId === agent.id),
	);

	// Auto-select agent when only one is available
	useEffect(() => {
		if (showLinkAgentDialog && availableAgents.length === 1 && !selectedAgent) {
			const agent = availableAgents[0];
			setSelectedAgent(agent.id);
		}
	}, [showLinkAgentDialog, availableAgents, selectedAgent]);

	const handleSelectShop = async (shop: ShopifyShop) => {
		try {
			const details = await getShopifyShop(shop.id);
			setSelectedShop(details);
		} catch (err) {
			console.error("Failed to fetch shop details:", err);
			toast.error("Failed to load shop details");
		}
	};

	const handleSync = async (shopId: string) => {
		setSyncing(shopId);
		try {
			await syncShopifyShop(shopId);
			toast.success("Sync started! This may take a few minutes.");
			await fetchShops();
		} catch (err) {
			console.error("Sync failed:", err);
			toast.error("Failed to start sync");
		} finally {
			setSyncing(null);
		}
	};

	const handleSyncTools = async (shopId: string, force = false) => {
		setSyncing(shopId);
		try {
			const result = await syncShopifyTools(shopId, force);
			if (force && result.updated > 0) {
				toast.success(`Recreated Shopify tools for ${result.updated} agents`);
			} else if (result.created > 0) {
				toast.success(`Created ${result.created} Shopify tools for linked agents`);
			} else if (result.skipped > 0) {
				toast.info(
					"Tools already exist for all linked agents. Use 'Recreate Tools' to update them.",
				);
			} else {
				toast.info("No agents linked to this shop");
			}
		} catch (err) {
			console.error("Sync tools failed:", err);
			toast.error(err instanceof Error ? err.message : "Failed to sync tools");
		} finally {
			setSyncing(null);
		}
	};

	const handleInstallWidget = async (shopId: string) => {
		setInstallingWidget(shopId);
		try {
			await installShopifyWidget(shopId);
			// Find shop domain for the theme editor link
			const shop = shops.find((s) => s.id === shopId);
			if (shop) {
				toast.success("Enable the Ansa embed in your theme editor.", {
					action: {
						label: "Open Theme Editor",
						onClick: () =>
							window.open(
								`https://${shop.shopDomain}/admin/themes/current/editor?context=apps&activateAppId=b175e95d60624d16c7d0ba4e2861f746/embed`,
								"_blank",
							),
					},
					duration: 10000,
				});
			} else {
				toast.success("Widget installed successfully!");
			}
			await fetchShops();
		} catch (err) {
			console.error("Install widget failed:", err);
			if (err && typeof err === "object" && "reconnectUrl" in err) {
				toast.error("Shopify access expired. Redirecting to reconnect...", { duration: 3000 });
				setTimeout(() => {
					const url = (err as { reconnectUrl: string }).reconnectUrl;
					// Use top-level window to escape Shopify admin iframe
					const target = window.top ?? window;
					target.location.href = url;
				}, 1500);
			} else {
				toast.error(err instanceof Error ? err.message : "Failed to install widget");
			}
		} finally {
			setInstallingWidget(null);
		}
	};

	const handleDisconnect = async (shopId: string) => {
		if (
			!confirm(
				"Are you sure you want to disconnect this Shopify store? This will remove all synced data.",
			)
		) {
			return;
		}
		try {
			await disconnectShopifyShop(shopId);
			toast.success("Shop disconnected");
			setSelectedShop(null);
			await fetchShops();
		} catch (err) {
			console.error("Disconnect failed:", err);
			toast.error("Failed to disconnect shop");
		}
	};

	const handleLinkAgent = async () => {
		if (!selectedShop || !selectedAgent) return;

		setSaving(true);
		try {
			const limitInCents = refundLimit ? Math.round(parseFloat(refundLimit) * 100) : null;
			await linkAgentToShop(selectedShop.id, selectedAgent, limitInCents);
			setShowLinkAgentDialog(false);
			setSelectedAgent("");
			setRefundLimit("");
			// Refresh shop details
			const details = await getShopifyShop(selectedShop.id);
			setSelectedShop(details);

			// Prompt merchant to enable the widget in their theme editor
			toast.success(
				"Agent linked! Enable the Ansa widget in your theme editor to show it on your storefront.",
				{
					action: {
						label: "Open Theme Editor",
						onClick: () =>
							window.open(
								`https://${selectedShop.shopDomain}/admin/themes/current/editor?context=apps&activateAppId=b175e95d60624d16c7d0ba4e2861f746/embed`,
								"_blank",
							),
					},
					duration: 10000,
				},
			);
		} catch (err) {
			console.error("Failed to link agent:", err);
			toast.error("Failed to link agent");
		} finally {
			setSaving(false);
		}
	};

	const handleUnlinkAgent = async (agentId: string) => {
		if (!selectedShop) return;

		try {
			await unlinkAgentFromShop(selectedShop.id, agentId);
			// Refresh shop details
			const details = await getShopifyShop(selectedShop.id);
			setSelectedShop(details);
		} catch (err) {
			console.error("Failed to unlink agent:", err);
			toast.error("Failed to unlink agent");
		}
	};

	const handleUpdateAgentSettings = async (agentId: string, newLimit: string) => {
		if (!selectedShop) return;

		setSaving(true);
		try {
			const limitInCents = newLimit ? Math.round(parseFloat(newLimit) * 100) : null;
			await updateShopAgentSettings(selectedShop.id, agentId, limitInCents);
			toast.success("Refund settings updated");
			setShowSettingsDialog(false);
			// Refresh shop details
			const details = await getShopifyShop(selectedShop.id);
			setSelectedShop(details);
		} catch (err) {
			console.error("Failed to update settings:", err);
			toast.error("Failed to update settings");
		} finally {
			setSaving(false);
		}
	};

	const handleProcessRefund = async (requestId: string, action: "approve" | "reject") => {
		setProcessingRefund(requestId);
		try {
			await processRefundRequest(requestId, action);
			toast.success(action === "approve" ? "Refund approved and processed" : "Refund rejected");
			await fetchRefundRequests();
		} catch (err) {
			console.error("Failed to process refund:", err);
			toast.error("Failed to process refund request");
		} finally {
			setProcessingRefund(null);
		}
	};

	const handleRetryRefund = async (requestId: string) => {
		setRetryingRefund(requestId);
		try {
			const result = await retryRefundRequest(requestId);
			if (result.success) {
				toast.success("Refund processed successfully!");
				await fetchRefundRequests();
			} else {
				toast.error(result.message || "Retry failed");
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to retry refund";
			toast.error(message);
		} finally {
			setRetryingRefund(null);
		}
	};

	const getAgentName = (agentId: string) => {
		const agent = agents.find((a) => a.id === agentId);
		return agent?.name || "Unknown Agent";
	};

	const hasShops = shops.length > 0;

	return (
		<>
			<div className="flex min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
				{/* --- MAIN CONTENT --- */}
				<main className="flex flex-col flex-1 min-w-0">
					{/* Header */}
					<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
						<div>
							<h1 className="text-xl font-medium tracking-tight">Commerce Data Bridge</h1>
							<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
								<span className="flex items-center gap-1">
									<Server size={10} /> Provider: Shopify
								</span>
								<span className="text-[#D1D1D1]">|</span>
								<span className="flex items-center gap-1">
									<Activity size={10} /> API Version: 2025-10
								</span>
								<span className="text-[#D1D1D1]">|</span>
								<span className="flex items-center gap-1">
									<div
										className={`w-1.5 h-1.5 rounded-full ${hasShops ? "bg-green-500" : "bg-[#D1D1D1]"}`}
									/>
									{hasShops ? "Connected" : "Not Connected"}
								</span>
							</div>
						</div>

						{hasShops && (
							<a
								href={SHOPIFY_APP_STORE_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm"
							>
								<Plus size={12} /> Establish New Uplink
							</a>
						)}
					</header>

					{/* Content Scroll */}
					<div className="flex-1 w-full p-8 mx-auto space-y-8 overflow-y-auto">
						{/* Loading State */}
						{loading && (
							<div className="flex items-center justify-center py-16">
								<Loader2 className="w-8 h-8 animate-spin text-[#888]" />
							</div>
						)}

						{/* Connection Terminal - Show when no shops connected */}
						{!hasShops && !loading && (
							<>
								<ConnectionTerminal />

								{/* Capabilities Grid */}
								<div>
									<div className="flex items-center gap-2 mb-4 opacity-60">
										<Zap size={14} />
										<h3 className="text-xs font-bold tracking-widest uppercase">
											System Capabilities
										</h3>
										<span className="text-[10px] font-mono text-[#888]">6 MODULES AVAILABLE</span>
									</div>

									<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
										{FEATURES.map((feature) => (
											<CapabilityCard
												key={feature.code}
												icon={feature.icon}
												code={feature.code}
												title={feature.title}
												description={feature.description}
											/>
										))}
									</div>
								</div>
							</>
						)}

						{/* 1. Connected Stores (Data Nodes) */}
						{hasShops && !loading && (
							<section>
								<div className="flex items-center gap-2 mb-4 opacity-60">
									<Database size={14} />
									<h3 className="text-xs font-bold tracking-widest uppercase">
										Active Data Nodes ({shops.length})
									</h3>
								</div>

								<div className="space-y-4">
									{shops.map((shop) => (
										<button
											type="button"
											key={shop.id}
											className="w-full text-left bg-white border border-[#D1D1D1] shadow-sm relative group overflow-hidden cursor-pointer hover:border-[#1A1A1A] transition-colors"
											onClick={() => handleSelectShop(shop)}
										>
											{/* Technical Header Stripe */}
											<div
												className={`h-1 w-full ${shop.status === "active" ? "bg-[#16A34A]" : "bg-red-500"}`}
											/>

											<div className="flex flex-col items-start justify-between gap-6 p-5 md:flex-row md:items-center">
												{/* Store Identity */}
												<div className="flex items-center gap-4 min-w-[300px]">
													<div className="w-12 h-12 bg-[#95BF47]/10 border border-[#95BF47]/30 flex items-center justify-center text-[#95BF47]">
														<ShoppingBag size={20} />
													</div>
													<div>
														<div className="flex items-center gap-2 mb-1">
															<h3 className="text-sm font-bold text-[#1A1A1A]">
																{shop.shopName || shop.shopDomain}
															</h3>
															<StatusBadge status={shop.status} />
														</div>
														<div className="text-[10px] font-mono text-[#888] flex items-center gap-1">
															<LinkIcon size={10} /> {shop.shopDomain}
														</div>
													</div>
												</div>

												{/* Telemetry Grid */}
												<div className="flex-1 grid grid-cols-4 gap-4 border-l border-[#F3F2EE] pl-6">
													<StatCell
														label="Total Orders"
														value={shop.ordersCount?.toLocaleString() || "—"}
													/>
													<StatCell
														label="Customer Base"
														value={shop.customersCount?.toLocaleString() || "—"}
													/>
													<StatCell
														label="SKU Count"
														value={shop.productsCount?.toLocaleString() || "—"}
													/>
													<div className="flex flex-col">
														<span className="text-[9px] text-[#888] font-mono uppercase mb-0.5">
															Last Sync
														</span>
														<span className="text-xs font-mono text-[#555] flex items-center gap-1 mt-0.5">
															<Activity size={10} className="text-green-600" />
															{shop.lastSyncAt
																? formatRelativeTime(shop.lastSyncAt, { verbose: true })
																: "Never"}
														</span>
													</div>
												</div>

												{/* Actions */}
												<div className="flex items-center gap-2 pl-6 border-l border-[#F3F2EE]">
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleSync(shop.id);
														}}
														disabled={syncing === shop.id}
														className="p-2 hover:bg-[#F3F2EE] text-[#555] rounded-sm transition-colors disabled:opacity-50"
														title="Force Sync"
													>
														<RefreshCw
															size={14}
															className={syncing === shop.id ? "animate-spin" : ""}
														/>
													</button>
													<DropdownMenu>
														<DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
															<button
																type="button"
																className="p-2 hover:bg-[#F3F2EE] text-[#555] rounded-sm transition-colors"
															>
																<MoreHorizontal size={14} />
															</button>
														</DropdownMenuTrigger>
														<DropdownMenuContent align="end">
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	handleInstallWidget(shop.id);
																}}
																disabled={installingWidget === shop.id}
															>
																<Code
																	className={`w-4 h-4 mr-2 ${installingWidget === shop.id ? "animate-pulse" : ""}`}
																/>
																Install Widget
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	handleSync(shop.id);
																}}
																disabled={syncing === shop.id}
															>
																<RefreshCw
																	className={`w-4 h-4 mr-2 ${syncing === shop.id ? "animate-spin" : ""}`}
																/>
																Sync Data
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	handleSyncTools(shop.id);
																}}
																disabled={syncing === shop.id}
															>
																<Zap
																	className={`w-4 h-4 mr-2 ${syncing === shop.id ? "animate-pulse" : ""}`}
																/>
																Sync Tools
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	handleSyncTools(shop.id, true);
																}}
																disabled={syncing === shop.id}
															>
																<RefreshCw
																	className={`w-4 h-4 mr-2 ${syncing === shop.id ? "animate-spin" : ""}`}
																/>
																Recreate Tools
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	window.open(`https://${shop.shopDomain}/admin`, "_blank");
																}}
															>
																<ExternalLink className="w-4 h-4 mr-2" />
																Open Admin
															</DropdownMenuItem>
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	window.open(
																		`https://${shop.shopDomain}/admin/themes/current/editor?context=apps&activateAppId=b175e95d60624d16c7d0ba4e2861f746/embed`,
																		"_blank",
																	);
																}}
															>
																<Paintbrush className="w-4 h-4 mr-2" />
																Enable in Theme
															</DropdownMenuItem>
															<DropdownMenuSeparator />
															<DropdownMenuItem
																onClick={(e) => {
																	e.stopPropagation();
																	handleDisconnect(shop.id);
																}}
																className="text-red-600"
															>
																<Trash2 className="w-4 h-4 mr-2" />
																Disconnect
															</DropdownMenuItem>
														</DropdownMenuContent>
													</DropdownMenu>
												</div>
											</div>

											{/* Timestamp Footer */}
											<div className="bg-[#FAFAF9] px-5 py-2 border-t border-[#E5E5E5] flex justify-between items-center text-[9px] font-mono text-[#888] uppercase">
												<span>
													Last Handshake:{" "}
													{shop.lastSyncAt
														? formatRelativeTime(shop.lastSyncAt, { verbose: true })
														: "Never"}
												</span>
												<span>Node ID: {shop.id.slice(0, 12)}</span>
											</div>
										</button>
									))}
								</div>
							</section>
						)}

						{/* 2. Linked Agents (Authorization) */}
						{selectedShop && (
							<section>
								<div className="flex items-center gap-2 mb-4 opacity-60">
									<ShieldAlert size={14} />
									<h3 className="text-xs font-bold tracking-widest uppercase">
										Authorized Neural Operators — {selectedShop.shopName || selectedShop.shopDomain}
									</h3>
								</div>

								<div className="bg-white border border-[#D1D1D1]">
									{selectedShop.agents.length === 0 ? (
										<div className="py-8 text-center">
											<div className="w-12 h-12 mx-auto mb-4 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center">
												<Link2 size={20} className="text-[#888]" />
											</div>
											<div className="text-sm text-[#555]">No agents linked to this store</div>
											<div className="mt-1 text-xs text-[#888]">
												Link an agent to enable AI-powered support for this store
											</div>
											<button
												type="button"
												onClick={() => setShowLinkAgentDialog(true)}
												disabled={availableAgents.length === 0}
												className="mt-4 h-9 px-4 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<Plus size={12} /> Authorize Agent
											</button>
										</div>
									) : (
										<>
											{/* Table Header */}
											<div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#FAFAF9] border-b border-[#E5E5E5] text-[9px] font-bold uppercase text-[#555] tracking-wider">
												<div className="col-span-4">Agent Identification</div>
												<div className="col-span-4">Write Permissions (Refunds)</div>
												<div className="col-span-3">Authorization Timestamp</div>
												<div className="col-span-1 text-right">Config</div>
											</div>

											{/* Rows */}
											{selectedShop.agents.map((shopAgent) => (
												<div
													key={shopAgent.id}
													className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-[#F3F2EE] items-center text-xs group hover:bg-[#FAFAF9] transition-colors"
												>
													<div className="flex items-center col-span-4 gap-2 font-medium">
														<div className="w-2 h-2 bg-[#1A1A1A] rounded-full" />
														{getAgentName(shopAgent.agentId)}
													</div>
													<div className="col-span-4">
														{shopAgent.refundAutoApproveLimit ? (
															<span className="font-mono text-[10px] bg-green-50 text-green-700 px-2 py-1 w-fit border border-green-200 uppercase">
																Auto-Approve ≤ {formatCurrency(shopAgent.refundAutoApproveLimit)}
															</span>
														) : (
															<span className="font-mono text-[10px] bg-yellow-50 text-yellow-700 px-2 py-1 w-fit border border-yellow-200 uppercase">
																Manual Approval Required
															</span>
														)}
													</div>
													<div className="col-span-3 font-mono text-[#888] text-[10px]">
														{formatDate(shopAgent.createdAt, { includeTime: true })}
													</div>
													<div className="col-span-1 text-right">
														<DropdownMenu>
															<DropdownMenuTrigger asChild>
																<button
																	type="button"
																	className="text-[#888] hover:text-[#1A1A1A] transition-colors"
																>
																	<MoreHorizontal size={14} className="ml-auto" />
																</button>
															</DropdownMenuTrigger>
															<DropdownMenuContent align="end">
																<DropdownMenuItem
																	onClick={() => {
																		setSelectedAgent(shopAgent.agentId);
																		const hasLimit =
																			shopAgent.refundAutoApproveLimit &&
																			shopAgent.refundAutoApproveLimit > 0;
																		setAutoRefundEnabled(!!hasLimit);
																		setRefundLimit(
																			hasLimit && shopAgent.refundAutoApproveLimit
																				? (shopAgent.refundAutoApproveLimit / 100).toString()
																				: "",
																		);
																		setShowSettingsDialog(true);
																	}}
																>
																	<Settings className="w-4 h-4 mr-2" />
																	Settings
																</DropdownMenuItem>
																<DropdownMenuSeparator />
																<DropdownMenuItem
																	onClick={() => handleUnlinkAgent(shopAgent.agentId)}
																	className="text-red-600"
																>
																	<Unlink className="w-4 h-4 mr-2" />
																	Unlink Agent
																</DropdownMenuItem>
															</DropdownMenuContent>
														</DropdownMenu>
													</div>
												</div>
											))}

											{/* Add Agent Action */}
											<button
												type="button"
												onClick={() => setShowLinkAgentDialog(true)}
												disabled={availableAgents.length === 0}
												className="w-full px-5 py-3 bg-[#FAFAF9] text-[10px] font-bold uppercase text-[#1A1A1A] hover:bg-[#F3F2EE] cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											>
												<Plus size={10} /> Authorize Another Agent
											</button>
										</>
									)}
								</div>
							</section>
						)}

						{/* 3. Refund Console (Transaction Approval Queue) */}
						{hasShops && !loading && (
							<>
								<section>
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2 opacity-60">
											<CreditCard size={14} />
											<h3 className="text-xs font-bold tracking-widest uppercase">
												Transaction Approval Queue
											</h3>
										</div>
										<span className="bg-[#1A1A1A] text-white text-[9px] font-mono px-2 py-0.5">
											BUFFER:{" "}
											{refundRequests.length > 0 ? `${refundRequests.length} PENDING` : "EMPTY"}
										</span>
									</div>

									{loadingRefunds ? (
										<div className="flex items-center justify-center py-8">
											<Loader2 className="w-6 h-6 animate-spin text-[#888]" />
										</div>
									) : refundRequests.length === 0 ? (
										<div className="w-full h-48 bg-[#FAFAF9] border border-dashed border-[#D1D1D1] flex flex-col items-center justify-center text-center relative overflow-hidden">
											{/* Scanning Line Animation */}
											<div className="absolute top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#1A1A1A]/20 to-transparent animate-[scan_3s_linear_infinite]" />

											<div className="w-10 h-10 bg-white border border-[#E5E5E5] flex items-center justify-center mb-3">
												<CheckCircle2 size={18} className="text-[#CCC]" />
											</div>
											<h4 className="text-xs font-bold uppercase text-[#555] mb-1">Queue Idle</h4>
											<p className="text-[10px] font-mono text-[#888]">
												No pending refund requests detected in the buffer.
											</p>
										</div>
									) : (
										<div className="bg-white border border-[#D1D1D1]">
											{/* Table Header */}
											<div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#FAFAF9] border-b border-[#E5E5E5] text-[9px] font-bold uppercase text-[#555] tracking-wider">
												<div className="col-span-1">Order</div>
												<div className="col-span-1">Amount</div>
												<div className="col-span-3">Customer</div>
												<div className="col-span-3">Reason</div>
												<div className="col-span-2">Requested</div>
												<div className="col-span-2 text-right">Actions</div>
											</div>

											{/* Rows */}
											{refundRequests.map((request) => (
												<div
													key={request.id}
													className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-[#F3F2EE] items-center text-xs group hover:bg-[#FAFAF9] transition-colors"
												>
													<div className="col-span-1 font-mono font-medium text-[#1A1A1A]">
														{request.orderName || request.shopifyOrderId || "-"}
													</div>
													<div className="col-span-1 font-mono font-bold text-[#1A1A1A]">
														{formatCurrency(request.amount, request.currency)}
													</div>
													<div className="col-span-3">
														<div className="font-medium text-[#1A1A1A]">
															{request.customerName || "-"}
														</div>
														<div className="text-[10px] text-[#888] truncate">
															{request.customerEmail || "-"}
														</div>
														{request.customerPhone && (
															<div className="text-[10px] text-[#888]">{request.customerPhone}</div>
														)}
													</div>
													<div className="col-span-3 text-[#555] line-clamp-2">
														{request.reason || "No reason provided"}
													</div>
													<div className="col-span-2 font-mono text-[#888] text-[10px]">
														{formatDate(request.createdAt, { includeTime: true })}
													</div>
													<div className="flex items-center justify-end col-span-2 gap-2">
														{request.conversationId ? (
															<Link
																href={`/conversations/${request.conversationId}`}
																className="h-8 w-8 flex items-center justify-center border border-[#E5E5E5] bg-white hover:bg-[#FAFAF9] text-[#555] transition-colors"
																title="View conversation"
															>
																<MessageSquare size={14} />
															</Link>
														) : (
															<div
																className="h-8 w-8 flex items-center justify-center border border-[#E5E5E5] bg-[#FAFAF9] text-[#CCC] cursor-not-allowed"
																title="No conversation linked"
															>
																<MessageSquare size={14} />
															</div>
														)}
														<button
															type="button"
															onClick={() => handleProcessRefund(request.id, "approve")}
															disabled={processingRefund === request.id}
															className="h-8 w-8 flex items-center justify-center border border-[#9AE6B4] bg-[#F0FFF4] hover:bg-[#C6F6D5] text-[#276749] transition-colors disabled:opacity-50"
														>
															{processingRefund === request.id ? (
																<Loader2 size={14} className="animate-spin" />
															) : (
																<Check size={14} />
															)}
														</button>
														<button
															type="button"
															onClick={() => handleProcessRefund(request.id, "reject")}
															disabled={processingRefund === request.id}
															className="h-8 w-8 flex items-center justify-center border border-[#FEB2B2] bg-[#FFF5F5] hover:bg-[#FED7D7] text-[#C53030] transition-colors disabled:opacity-50"
														>
															<X size={14} />
														</button>
													</div>
												</div>
											))}
										</div>
									)}
								</section>

								{/* Failed Refunds Section */}
								{failedRefunds.length > 0 && (
									<section className="mt-8">
										<div className="flex items-center justify-between mb-4">
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 bg-[#FFF5F5] border border-[#FEB2B2] flex items-center justify-center">
													<AlertTriangle size={14} className="text-[#C53030]" />
												</div>
												<h3 className="font-bold text-sm uppercase tracking-wider text-[#C53030]">
													Failed Refunds
												</h3>
											</div>
											<span className="bg-[#C53030] text-white text-[9px] font-mono px-2 py-0.5">
												{failedRefunds.length} FAILED
											</span>
										</div>

										<div className="bg-white border border-[#FEB2B2]">
											{/* Table Header */}
											<div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#FFF5F5] border-b border-[#FEB2B2] text-[9px] font-bold uppercase text-[#C53030] tracking-wider">
												<div className="col-span-2">Order</div>
												<div className="col-span-2">Amount</div>
												<div className="col-span-4">Error</div>
												<div className="col-span-2">Retries</div>
												<div className="col-span-2 text-right">Actions</div>
											</div>

											{/* Rows */}
											{failedRefunds.map((request) => {
												const canRetry = request.retryCount < 3;
												const cooldownActive = request.lastRetryAt
													? Date.now() - new Date(request.lastRetryAt).getTime() < 60000
													: false;

												return (
													<div
														key={request.id}
														className="grid grid-cols-12 gap-4 px-5 py-4 border-b border-[#FED7D7] items-center text-xs group hover:bg-[#FFF5F5] transition-colors"
													>
														<div className="col-span-2 font-mono font-medium text-[#1A1A1A]">
															{request.orderName || request.shopifyOrderId}
														</div>
														<div className="col-span-2 font-mono font-bold text-[#C53030]">
															{formatCurrency(request.amount, request.currency)}
														</div>
														<div
															className="col-span-4 text-[#C53030] text-[10px] line-clamp-2"
															title={request.errorMessage || undefined}
														>
															{request.errorMessage || "Unknown error"}
														</div>
														<div className="col-span-2 font-mono text-[#888] text-[10px]">
															{request.retryCount}/3 attempts
														</div>
														<div className="flex items-center justify-end col-span-2 gap-2">
															{canRetry ? (
																<button
																	type="button"
																	onClick={() => handleRetryRefund(request.id)}
																	disabled={retryingRefund === request.id || cooldownActive}
																	className="h-8 px-3 flex items-center justify-center gap-1.5 border border-[#F6AD55] bg-[#FFFAF0] hover:bg-[#FEEBC8] text-[#C05621] text-[10px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
																	title={
																		cooldownActive
																			? "Please wait 1 minute between retries"
																			: undefined
																	}
																>
																	{retryingRefund === request.id ? (
																		<Loader2 size={12} className="animate-spin" />
																	) : (
																		<RefreshCw size={12} />
																	)}
																	{cooldownActive ? "Wait..." : "Retry"}
																</button>
															) : (
																<span className="text-[10px] text-[#888] font-mono">
																	Max retries
																</span>
															)}
														</div>
													</div>
												);
											})}
										</div>
										<p className="text-[10px] text-[#888] mt-2 font-mono">
											Failed refunds can be retried up to 3 times. After that, please process
											manually in Shopify admin.
										</p>
									</section>
								)}
							</>
						)}
					</div>
				</main>
			</div>

			{/* Link Agent Dialog */}
			<Dialog open={showLinkAgentDialog} onOpenChange={setShowLinkAgentDialog}>
				<DialogContent className="bg-white border border-[#D1D1D1]">
					<DialogHeader>
						<DialogTitle className="text-[#1A1A1A] font-medium">Link Agent to Store</DialogTitle>
						<DialogDescription className="text-[#555]">
							{agents.length === 0
								? "You need to create an agent before linking it to your store."
								: `Select an agent to handle customer support for ${selectedShop?.shopName || selectedShop?.shopDomain}`}
						</DialogDescription>
					</DialogHeader>
					{agents.length === 0 ? (
						<div className="py-6">
							<div className="space-y-4 text-center">
								<div className="w-12 h-12 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center mx-auto">
									<Plus size={20} className="text-[#888]" />
								</div>
								<div>
									<p className="text-sm text-[#555] mb-4">
										Create your first AI agent to start handling customer support for your Shopify
										store.
									</p>
									<Link
										href="/agents/new"
										className="inline-flex items-center gap-2 h-10 px-4 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
									>
										<Plus size={14} />
										Create Agent
									</Link>
								</div>
							</div>
						</div>
					) : (
						<>
							<div className="py-4 space-y-4">
								<div className="space-y-2">
									<label
										htmlFor="link-agent-select"
										className="block font-mono text-[10px] uppercase tracking-widest text-[#888]"
									>
										Agent
									</label>
									<Select value={selectedAgent} onValueChange={setSelectedAgent}>
										<SelectTrigger
											id="link-agent-select"
											className="bg-[#FAFAF9] border-[#D1D1D1] focus:border-[#1A1A1A]"
										>
											<SelectValue placeholder="Select an agent" />
										</SelectTrigger>
										<SelectContent>
											{availableAgents.map((agent) => (
												<SelectItem key={agent.id} value={agent.id}>
													{agent.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<DialogFooter>
								<button
									type="button"
									onClick={() => setShowLinkAgentDialog(false)}
									className="h-10 px-4 border border-[#D1D1D1] bg-white text-xs font-bold uppercase tracking-widest hover:bg-[#FAFAF9] text-[#555] transition-colors"
								>
									Cancel
								</button>
								<button
									type="button"
									onClick={handleLinkAgent}
									disabled={!selectedAgent || saving}
									className="h-10 px-4 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
								>
									{saving && <Loader2 size={14} className="animate-spin" />}
									Link Agent
								</button>
							</DialogFooter>
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Edit Settings Dialog */}
			<Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
				<DialogContent className="bg-white border border-[#D1D1D1]">
					<DialogHeader>
						<DialogTitle className="text-[#1A1A1A] font-medium">Refund Settings</DialogTitle>
						<DialogDescription className="text-[#555]">
							Configure refund handling for {getAgentName(selectedAgent)}
						</DialogDescription>
					</DialogHeader>
					<div className="py-4 space-y-4">
						{/* Auto-Refund Toggle */}
						<div className="flex items-center justify-between p-4 bg-[#FAFAF9] border border-[#E5E5E5]">
							<div className="space-y-1">
								<label
									htmlFor="auto-refund-toggle"
									className="block font-medium text-sm text-[#1A1A1A]"
								>
									Enable Auto-Refund
								</label>
								<p className="text-[10px] text-[#888]">
									Automatically process small refunds without manual approval
								</p>
							</div>
							<Switch
								id="auto-refund-toggle"
								checked={autoRefundEnabled}
								onCheckedChange={(checked) => {
									setAutoRefundEnabled(checked);
									if (!checked) setRefundLimit("");
								}}
							/>
						</div>

						{/* Limit Input (conditional) */}
						{autoRefundEnabled && (
							<div className="space-y-2">
								<label
									htmlFor="edit-refund-limit"
									className="block font-mono text-[10px] uppercase tracking-widest text-[#888]"
								>
									Auto-Approve Limit
								</label>
								<div className="relative">
									<span className="absolute -translate-y-1/2 left-3 top-1/2 text-[#888] font-mono">
										$
									</span>
									<Input
										id="edit-refund-limit"
										type="number"
										placeholder="50.00"
										value={refundLimit}
										onChange={(e) => setRefundLimit(e.target.value)}
										className="pl-7 bg-[#FAFAF9] border-[#D1D1D1] focus:border-[#1A1A1A] font-mono"
										step="0.01"
										min="0"
									/>
								</div>
								<p className="text-[10px] text-[#888]">
									Refunds at or below this amount will be automatically approved.
								</p>
							</div>
						)}

						{/* Security Note */}
						{autoRefundEnabled && (
							<div className="p-3 bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
								<strong>Security:</strong> Auto-refunds only process when the customer&apos;s
								submitted email matches the original order email. Mismatched emails always require
								manual review.
							</div>
						)}
					</div>
					<DialogFooter>
						<button
							type="button"
							onClick={() => setShowSettingsDialog(false)}
							className="h-10 px-4 border border-[#D1D1D1] bg-white text-xs font-bold uppercase tracking-widest hover:bg-[#FAFAF9] text-[#555] transition-colors"
						>
							Cancel
						</button>
						<button
							type="button"
							onClick={() =>
								handleUpdateAgentSettings(selectedAgent, autoRefundEnabled ? refundLimit : "")
							}
							disabled={saving}
							className="h-10 px-4 bg-[#1A1A1A] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
						>
							{saving && <Loader2 size={14} className="animate-spin" />}
							Save Changes
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
