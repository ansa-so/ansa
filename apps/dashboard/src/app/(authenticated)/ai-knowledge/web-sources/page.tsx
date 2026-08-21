"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	ExternalLink,
	Eye,
	EyeOff,
	FileText,
	Filter,
	Globe,
	Loader2,
	Plus,
	RefreshCw,
	Search,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AddWebSourcePanel } from "@/components/add-web-source-panel";
import { StorageLimitBanner } from "@/components/storage-limit-banner";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useAgent } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import {
	createWebSource,
	deleteWebSource,
	deleteWebSourcePage,
	getWebSource,
	listWebSources,
	recrawlWebSource,
	recrawlWebSourcePage,
	toggleWebSourcePageExclusion,
	type WebSource,
	type WebSourcePage,
} from "@/lib/api";

const ITEMS_PER_PAGE = 10;

function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 7) return `${diffDays}d ago`;
	return date.toLocaleDateString();
}

function getStatusTimeLabel(status: string, updatedAt: string): string {
	const relativeTime = formatRelativeTime(updatedAt);
	switch (status) {
		case "completed":
			return relativeTime;
		case "crawling":
			return "Syncing...";
		case "pending":
			return "Queued";
		case "failed":
			return `Failed ${relativeTime}`;
		default:
			return relativeTime;
	}
}

function StatusBadge({ status }: { status: string }) {
	if (status === "completed") {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700">
				<CheckCircle2 size={10} /> Synced
			</span>
		);
	}
	if (status === "crawling" || status === "pending") {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700">
				<Loader2 size={10} className={status === "crawling" ? "animate-spin" : ""} />
				{status === "crawling" ? "Crawling" : "Pending"}
			</span>
		);
	}
	if (status === "failed") {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700">
				<AlertCircle size={10} /> Failed
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-gray-700">
			{status}
		</span>
	);
}

// Web Source Row Component following test9 design
const WebSourceRow = ({
	source,
	isExpanded,
	onToggleExpand,
	onRecrawl,
	onDelete,
	loadingPages,
	sourcePages,
	onToggleExclusion,
	onDeletePage,
	onViewContent,
	onRecrawlPage,
	refreshingPageId,
}: {
	source: WebSource;
	isExpanded: boolean;
	onToggleExpand: (id: string) => void;
	onRecrawl: (id: string, e: React.MouseEvent) => void;
	onDelete: (id: string, e: React.MouseEvent) => void;
	loadingPages: string | null;
	sourcePages: Record<string, WebSourcePage[]>;
	onToggleExclusion: (sourceId: string, page: WebSourcePage) => void;
	onDeletePage: (sourceId: string, pageId: string) => void;
	onViewContent: (page: WebSourcePage) => void;
	onRecrawlPage: (sourceId: string, pageId: string, e: React.MouseEvent) => void;
	refreshingPageId: string | null;
}) => (
	<>
		{/* biome-ignore lint/a11y/useSemanticElements: Cannot use button here due to nested buttons */}
		<div
			className="group grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#FAFAF9] transition-colors relative cursor-pointer w-full text-left"
			onClick={() => onToggleExpand(source.id)}
			onKeyDown={(e) => e.key === "Enter" && onToggleExpand(source.id)}
			role="button"
			tabIndex={0}
		>
			{/* Status Indicator Line */}
			<div
				className={`absolute left-0 top-0 bottom-0 w-1 ${
					source.status === "crawling" || source.status === "pending"
						? "bg-yellow-400"
						: source.status === "failed"
							? "bg-red-500"
							: "bg-transparent group-hover:bg-[#1A1A1A]"
				}`}
			/>

			{/* Source Name & URL */}
			<div className="col-span-6">
				<div className="flex items-start gap-3">
					{isExpanded ? (
						<ChevronDown size={14} className="text-[#888]" />
					) : (
						<ChevronRight size={14} className="text-[#888]" />
					)}
					<div className="mt-0.5 text-[#1A1A1A]">
						<Globe size={14} />
					</div>
					<div className="flex-1 min-w-0">
						<div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
							{source.name}
							<a
								href={source.url}
								target="_blank"
								rel="noopener noreferrer"
								className="text-[#CCC] hover:text-[#1A1A1A]"
								onClick={(e) => e.stopPropagation()}
							>
								<ExternalLink size={10} />
							</a>
						</div>
						<div className="text-[10px] text-[#888] font-mono mt-0.5 truncate max-w-[200px]">
							{source.url}
						</div>
					</div>
				</div>
			</div>

			{/* Pages Count */}
			<div className="col-span-1 text-center">
				<span className="font-mono text-xs bg-[#F3F2EE] border border-[#E5E5E5] px-1.5 py-0.5 rounded-sm text-[#555]">
					{source.pageCount ?? 0}
				</span>
			</div>

			{/* Size */}
			<div className="col-span-2 text-center font-mono text-xs text-[#555]">
				{formatBytes(source.totalSize ?? 0)}
			</div>

			{/* Status */}
			<div className="flex flex-col items-start col-span-1">
				<StatusBadge status={source.status} />
				<span className="text-[9px] text-[#888] font-mono mt-1">
					{getStatusTimeLabel(source.status, source.updatedAt)}
				</span>
			</div>

			{/* Actions */}
			<div className="flex justify-end col-span-2 gap-2 transition-opacity opacity-0 group-hover:opacity-100">
				<button
					type="button"
					onClick={(e) => onRecrawl(source.id, e)}
					disabled={source.status === "crawling"}
					className="p-1.5 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50"
				>
					<RefreshCw size={12} className={source.status === "crawling" ? "animate-spin" : ""} />
				</button>
				<button
					type="button"
					onClick={(e) => onDelete(source.id, e)}
					className="p-1.5 border border-[#D1D1D1] bg-white hover:border-red-500 hover:text-red-500 transition-colors"
				>
					<Trash2 size={12} />
				</button>
			</div>
		</div>

		{/* Expanded Pages */}
		{isExpanded && (
			<div className="bg-[#FAFAF9] border-b border-[#D1D1D1]">
				{source.status === "failed" ? (
					<div className="flex items-center gap-2 p-4 pl-16 font-mono text-xs text-red-700">
						<AlertCircle size={14} /> Error Log: {source.errorMessage || "Unknown error occurred"}
					</div>
				) : loadingPages === source.id ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="w-4 h-4 text-[#888] animate-spin" />
					</div>
				) : sourcePages[source.id]?.length === 0 ? (
					<div className="py-8 text-center text-[10px] font-mono uppercase text-[#888] tracking-widest">
						No pages crawled yet
					</div>
				) : (
					<div className="divide-y divide-[#E5E5E5]">
						{sourcePages[source.id]?.map((page) => (
							<div
								key={page.id}
								className={`grid grid-cols-12 gap-4 px-6 py-3 pl-16 items-center text-sm ${
									page.isExcluded ? "opacity-50" : ""
								} hover:bg-[#F3F2EE] transition-colors`}
							>
								<div className="min-w-0 col-span-6">
									<div className="font-medium text-xs text-[#1A1A1A] truncate">
										{page.title || page.url}
									</div>
									<div className="text-[10px] text-[#888] font-mono truncate">{page.url}</div>
								</div>
								<div className="col-span-1 font-mono text-[10px] text-[#555] text-center">
									{formatBytes(page.contentSize)}
								</div>
								<div className="col-span-2">
									<StatusBadge status={page.status} />
								</div>
								<div className="col-span-1 font-mono text-[10px] text-[#888] text-center">
									{page.lastCrawledAt ? new Date(page.lastCrawledAt).toLocaleDateString() : "-"}
								</div>
								<div className="flex justify-end col-span-2 gap-1">
									<button
										type="button"
										onClick={() => onViewContent(page)}
										disabled={!page.content}
										className="p-1 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-30"
									>
										<FileText size={10} />
									</button>
									<button
										type="button"
										onClick={(e) => onRecrawlPage(source.id, page.id, e)}
										disabled={refreshingPageId === page.id}
										className="p-1 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors disabled:opacity-50"
									>
										<RefreshCw
											size={10}
											className={refreshingPageId === page.id ? "animate-spin" : ""}
										/>
									</button>
									<button
										type="button"
										onClick={() => onToggleExclusion(source.id, page)}
										className="p-1 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors"
									>
										{page.isExcluded ? <EyeOff size={10} /> : <Eye size={10} />}
									</button>
									<button
										type="button"
										onClick={() => onDeletePage(source.id, page.id)}
										className="p-1 border border-[#D1D1D1] bg-white hover:border-red-500 hover:text-red-500 transition-colors"
									>
										<Trash2 size={10} />
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		)}
	</>
);

export default function WebSourcesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [sources, setSources] = useState<WebSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [showAddPanel, setShowAddPanel] = useState(false);
	const [saving, setSaving] = useState(false);
	const [expandedSource, setExpandedSource] = useState<string | null>(null);
	const [sourcePages, setSourcePages] = useState<Record<string, WebSourcePage[]>>({});
	const [loadingPages, setLoadingPages] = useState<string | null>(null);
	const [viewingContent, setViewingContent] = useState<WebSourcePage | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [refreshingPageId, setRefreshingPageId] = useState<string | null>(null);

	const fetchSources = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const data = await listWebSources(currentAgent.id);
			setSources(data);
		} catch (err) {
			console.error("Failed to fetch web sources:", err);
			toast.error("Failed to load web sources");
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			// Clear previous agent's data when switching agents
			setSources([]);
			setSourcePages({});
			setExpandedSource(null);
			fetchSources();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSources]);

	const toggleExpanded = async (sourceId: string) => {
		if (expandedSource === sourceId) {
			setExpandedSource(null);
			return;
		}

		setExpandedSource(sourceId);

		// Load pages if not already loaded
		if (!sourcePages[sourceId]) {
			setLoadingPages(sourceId);
			try {
				const data = await getWebSource(sourceId);
				setSourcePages((prev) => ({ ...prev, [sourceId]: data.pages }));
			} catch (err) {
				console.error("Failed to load pages:", err);
				toast.error("Failed to load pages");
			} finally {
				setLoadingPages(null);
			}
		}
	};

	const handleAddSource = async (data: {
		name: string;
		url: string;
		sourceType: "individual" | "sitemap" | "crawl";
	}) => {
		if (!currentAgent) return;
		setSaving(true);

		try {
			await createWebSource(currentAgent.id, data.name, data.url, data.sourceType);
			trackEvent("knowledge_added", {
				agentId: currentAgent.id,
				type: "web",
				sourceType: data.sourceType,
			});
			setShowAddPanel(false);
			await fetchSources();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to add web source";
			if (message.includes("Storage limit") || message.includes("Web source limit")) {
				toast.error(message, {
					action: {
						label: "Upgrade",
						onClick: () => {
							window.location.href = "/billing";
						},
					},
				});
			} else {
				toast.error(message);
			}
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!confirm("Delete this web source and all its pages?")) return;

		try {
			await deleteWebSource(id);
			await fetchSources();
		} catch (err) {
			console.error("Failed to delete:", err);
			toast.error("Failed to delete web source");
		}
	};

	const handleRecrawl = async (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			await recrawlWebSource(id);
			toast.success("Recrawl started");
			await fetchSources();
		} catch (err) {
			console.error("Failed to recrawl:", err);
			toast.error("Failed to start recrawl");
		}
	};

	const handleToggleExclusion = async (sourceId: string, page: WebSourcePage) => {
		try {
			await toggleWebSourcePageExclusion(sourceId, page.id, !page.isExcluded);
			setSourcePages((prev) => ({
				...prev,
				[sourceId]: prev[sourceId].map((p) =>
					p.id === page.id ? { ...p, isExcluded: !p.isExcluded } : p,
				),
			}));
			toast.success(page.isExcluded ? "Page included" : "Page excluded");
		} catch (err) {
			console.error("Failed to toggle exclusion:", err);
			toast.error("Failed to update page");
		}
	};

	const handleDeletePage = async (sourceId: string, pageId: string) => {
		if (!confirm("Delete this page?")) return;

		try {
			await deleteWebSourcePage(sourceId, pageId);
			setSourcePages((prev) => ({
				...prev,
				[sourceId]: prev[sourceId].filter((p) => p.id !== pageId),
			}));
		} catch (err) {
			console.error("Failed to delete page:", err);
			toast.error("Failed to delete page");
		}
	};

	const handleRecrawlPage = async (sourceId: string, pageId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setRefreshingPageId(pageId);
		try {
			await recrawlWebSourcePage(sourceId, pageId);
			toast.success("Page refreshed");
			// Refresh the pages for this source
			const data = await getWebSource(sourceId);
			setSourcePages((prev) => ({
				...prev,
				[sourceId]: data.pages,
			}));
		} catch (err) {
			console.error("Failed to recrawl page:", err);
			toast.error("Failed to refresh page");
		} finally {
			setRefreshingPageId(null);
		}
	};

	// Filter and paginate sources
	const filteredSources = useMemo(() => {
		if (!searchQuery.trim()) return sources;
		const query = searchQuery.toLowerCase();
		return sources.filter(
			(source) =>
				source.name?.toLowerCase().includes(query) || source.url?.toLowerCase().includes(query),
		);
	}, [sources, searchQuery]);

	const totalPages = Math.ceil(filteredSources.length / ITEMS_PER_PAGE);
	const paginatedSources = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredSources.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredSources, currentPage]);

	// Reset to page 1 when search changes
	const prevSearchQuery = useRef(searchQuery);
	useEffect(() => {
		if (prevSearchQuery.current !== searchQuery) {
			setCurrentPage(1);
			prevSearchQuery.current = searchQuery;
		}
	}, [searchQuery]);

	const renderSources = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center py-20">
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest">
						Loading...
					</div>
				</div>
			);
		}

		if (!currentAgent) {
			return (
				<div className="flex items-center justify-center py-20">
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest">
						No agent selected. Please select or create an agent.
					</div>
				</div>
			);
		}

		if (sources.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-20">
					<Globe className="w-12 h-12 mb-4 text-[#D1D1D1]" />
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest mb-4">
						No web sources yet
					</div>
					<button
						type="button"
						onClick={() => setShowAddPanel(true)}
						className="text-[10px] font-bold uppercase flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 hover:bg-[#1A1A1A] hover:text-white transition-colors"
					>
						<Plus size={12} /> Add Web Source
					</button>
				</div>
			);
		}

		if (filteredSources.length === 0) {
			return (
				<div className="flex items-center justify-center py-20">
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest">
						No results found for &quot;{searchQuery}&quot;
					</div>
				</div>
			);
		}

		return (
			<>
				{paginatedSources.map((source) => (
					<WebSourceRow
						key={source.id}
						source={source}
						isExpanded={expandedSource === source.id}
						onToggleExpand={toggleExpanded}
						onRecrawl={handleRecrawl}
						onDelete={handleDelete}
						loadingPages={loadingPages}
						sourcePages={sourcePages}
						onToggleExclusion={handleToggleExclusion}
						onDeletePage={handleDeletePage}
						onViewContent={setViewingContent}
						onRecrawlPage={handleRecrawlPage}
						refreshingPageId={refreshingPageId}
					/>
				))}
			</>
		);
	};

	// Generate pagination buttons
	const renderPagination = () => {
		if (totalPages <= 1) return null;

		const pages: (number | "...")[] = [];
		if (totalPages <= 5) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 3) {
				pages.push(1, 2, 3, "...", totalPages);
			} else if (currentPage >= totalPages - 2) {
				pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
			} else {
				pages.push(1, "...", currentPage, "...", totalPages);
			}
		}

		return (
			<div className="flex gap-2">
				{pages.map((page, idx) =>
					page === "..." ? (
						<span
							key={`ellipsis-before-${pages[idx + 1]}`}
							className="flex items-center text-[#888] text-[10px] px-2"
						>
							...
						</span>
					) : (
						<button
							type="button"
							key={page}
							onClick={() => setCurrentPage(page)}
							className={`w-8 h-8 flex items-center justify-center border border-[#D1D1D1] text-xs font-bold transition-colors ${
								currentPage === page
									? "bg-[#1A1A1A] text-white"
									: "bg-white hover:bg-[#1A1A1A] hover:text-white"
							}`}
						>
							{page}
						</button>
					),
				)}
				{currentPage < totalPages && (
					<button
						type="button"
						onClick={() => setCurrentPage(currentPage + 1)}
						className="w-8 h-8 flex items-center justify-center border border-[#D1D1D1] bg-white text-xs font-bold hover:bg-[#1A1A1A] hover:text-white"
					>
						<ArrowRight size={12} />
					</button>
				)}
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			<PageHeader
				title="Web Sources"
				subtitle="Add websites to train your agent with web content"
				icon={
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>Total Sources: {sources.length}</span>
					</div>
				}
				action={
					<button
						type="button"
						onClick={() => setShowAddPanel(true)}
						className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
					>
						<Plus size={14} /> Add Web Source
					</button>
				}
			/>

			<div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
				<StorageLimitBanner />

				{/* --- CRAWLER STATS BANNER --- */}
				<div className="bg-white border border-[#D1D1D1] p-4 flex items-center gap-6 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="bg-[#F3F2EE] p-2 border border-[#E5E5E5] text-[#1A1A1A]">
							<Globe size={16} />
						</div>
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">
								Total Indexed Pages
							</div>
							<div className="text-lg font-bold">
								{sources.reduce((acc, s) => acc + (s.pageCount || 0), 0).toLocaleString()}
							</div>
						</div>
					</div>
					<div className="w-px h-8 bg-[#F3F2EE]" />
					<div className="flex items-center gap-3">
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">Storage Used</div>
							<div className="text-lg font-bold">
								{formatBytes(sources.reduce((acc, s) => acc + (s.totalSize || 0), 0))}
							</div>
						</div>
					</div>
					<div className="w-px h-8 bg-[#F3F2EE]" />
					<div className="flex items-center gap-3">
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">
								Next Scheduled Crawl
							</div>
							<div className="flex items-center gap-2 text-lg font-bold">
								{sources.some((s) => s.status === "crawling" || s.status === "pending") ? (
									<>
										Now{" "}
										<span className="text-[10px] font-normal text-[#888] border border-[#E5E5E5] px-1 bg-[#F9F9F9]">
											IN PROGRESS
										</span>
									</>
								) : (
									<>
										Manual{" "}
										<span className="text-[10px] font-normal text-[#888] border border-[#E5E5E5] px-1 bg-[#F9F9F9]">
											TRIGGER
										</span>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* --- DATA TABLE --- */}
				<div className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col min-h-[500px]">
					{/* Toolbar */}
					<div className="px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]">
						<div className="flex items-center gap-3">
							<div className="relative">
								<Search
									size={12}
									className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#888]"
								/>
								<input
									type="text"
									placeholder="SEARCH SOURCES..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="h-9 pl-9 pr-4 bg-white border border-[#D1D1D1] text-[10px] font-mono focus:outline-none focus:border-[#1A1A1A] w-64 uppercase placeholder:normal-case"
								/>
							</div>
							<div className="w-px h-4 bg-[#D1D1D1] mx-2" />
							<div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#555]">
								<Filter size={10} />
								<span>Sort: Newest</span>
							</div>
						</div>
					</div>

					{/* Table Header */}
					<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div className="col-span-6">Source Domain / URL</div>
						<div className="col-span-1 text-center">Pages Indexed</div>
						<div className="col-span-2 text-center">Total Size</div>
						<div className="col-span-1">Crawl Status</div>
						<div className="col-span-2 text-right">Actions</div>
					</div>

					{/* Table Body */}
					<div className="flex-1">{renderSources()}</div>

					{/* Footer / Pagination */}
					<div className="p-3 border-t border-[#D1D1D1] flex justify-between items-center bg-[#FAFAF9] px-6">
						<span className="text-[10px] font-mono text-[#888] uppercase">
							Showing {paginatedSources.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
							{Math.min(currentPage * ITEMS_PER_PAGE, filteredSources.length)} of{" "}
							{filteredSources.length}
						</span>
						{renderPagination()}
					</div>
				</div>
			</div>

			{/* --- ADD WEB SOURCE PANEL --- */}
			<AddWebSourcePanel
				isOpen={showAddPanel}
				onClose={() => setShowAddPanel(false)}
				onSubmit={handleAddSource}
				saving={saving}
			/>

			{/* Content Viewer Dialog */}
			<Dialog open={viewingContent !== null} onOpenChange={() => setViewingContent(null)}>
				<DialogContent className="max-w-4xl max-h-[80vh]">
					<DialogHeader>
						<DialogTitle>{viewingContent?.title || "Page Content"}</DialogTitle>
						<DialogDescription className="truncate">{viewingContent?.url}</DialogDescription>
					</DialogHeader>
					<div className="overflow-auto max-h-[60vh] p-4 bg-[#F9F9F9] border border-[#D1D1D1] font-mono text-sm whitespace-pre-wrap">
						{viewingContent?.content || "No content available"}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
