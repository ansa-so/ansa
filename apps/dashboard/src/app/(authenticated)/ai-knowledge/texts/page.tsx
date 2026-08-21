"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	FileText,
	Filter,
	Loader2,
	Pencil,
	Plus,
	RefreshCw,
	Search,
	Trash2,
	Type,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AddTextSourcePanel } from "@/components/add-text-source-panel";
import { StorageLimitBanner } from "@/components/storage-limit-banner";
import { useAgent } from "@/lib/agent-context";
import {
	createTextSource,
	deleteTextSource,
	getTextSource,
	getUsage,
	listTextSources,
	type TextSource,
	type UsageData,
	updateTextSource,
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

function StatusBadge({ status }: { status?: string }) {
	if (status === "completed" || !status) {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700">
				<CheckCircle2 size={10} /> Indexed
			</span>
		);
	}
	if (status === "processing" || status === "pending") {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-700">
				<Loader2 size={10} className={status === "processing" ? "animate-spin" : ""} />
				{status === "processing" ? "Parsing" : "Pending"}
			</span>
		);
	}
	if (status === "failed") {
		return (
			<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-red-50 border border-red-200 text-red-700">
				<AlertCircle size={10} /> Error
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 bg-gray-50 border border-gray-200 text-gray-700">
			{status}
		</span>
	);
}

// Text Source Row Component following test9 design
function TextSourceRow({
	source,
	onEdit,
	onDelete,
}: {
	source: TextSource;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}) {
	return (
		<div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#FAFAF9] transition-colors group relative">
			{/* Title */}
			<div className="flex items-start col-span-5 gap-3">
				<div className="mt-0.5 w-8 h-8 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center rounded-sm">
					<Type size={14} className="text-[#888]" />
				</div>
				<div className="min-w-0">
					<div className="font-medium text-sm text-[#1A1A1A] mb-1 truncate">{source.title}</div>
					<div className="text-[10px] text-[#888] font-mono flex items-center gap-2">
						<span className="bg-[#F3F2EE] px-1 rounded-sm uppercase">TEXT</span>
						<span>•</span>
						<span className="truncate">{source.id.slice(0, 8)}</span>
					</div>
				</div>
			</div>

			{/* Size */}
			<div className="col-span-2 text-center font-mono text-xs text-[#555]">
				{source.size !== undefined ? formatBytes(source.size) : "—"}
			</div>

			{/* Date */}
			<div className="col-span-2 text-center">
				<div className="font-mono text-xs text-[#555]">
					{new Date(source.createdAt).toLocaleDateString()}
				</div>
				<div className="text-[9px] text-[#888] uppercase tracking-wide">
					{formatRelativeTime(source.createdAt)}
				</div>
			</div>

			{/* Status */}
			<div className="flex justify-center col-span-2">
				<StatusBadge status={source.status} />
			</div>

			{/* Actions */}
			<div className="flex justify-end col-span-1 gap-2 transition-opacity opacity-0 group-hover:opacity-100">
				<button
					type="button"
					onClick={() => onEdit(source.id)}
					className="p-1.5 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors"
					title="Edit"
				>
					<Pencil size={12} />
				</button>
				<button
					type="button"
					onClick={() => onDelete(source.id)}
					className="p-1.5 border border-[#D1D1D1] bg-white hover:border-red-500 hover:text-red-500 transition-colors"
					title="Delete"
				>
					<Trash2 size={12} />
				</button>
			</div>
		</div>
	);
}

export default function TextSourcesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [sources, setSources] = useState<TextSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [showPanel, setShowPanel] = useState(false);
	const [editing, setEditing] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [editingData, setEditingData] = useState<{ title: string; content: string } | undefined>(
		undefined,
	);

	const fetchSources = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const [data, usageData] = await Promise.all([listTextSources(currentAgent.id), getUsage()]);
			setSources(data);
			setUsage(usageData);
		} catch (err) {
			console.error("Failed to fetch text sources:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			setSources([]);
			setEditing(null);
			fetchSources();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSources]);

	const handleNew = () => {
		setEditing("new");
		setEditingData(undefined);
		setShowPanel(true);
	};

	const handleEdit = async (id: string) => {
		try {
			const source = await getTextSource(id);
			setEditing(id);
			setEditingData({ title: source.title, content: source.content || "" });
			setShowPanel(true);
		} catch (err) {
			console.error("Failed to load source:", err);
			toast.error("Failed to load text source");
		}
	};

	const handleClosePanel = () => {
		setShowPanel(false);
		setEditing(null);
		setEditingData(undefined);
	};

	const onSubmit = async (data: { title: string; content: string }) => {
		if (!currentAgent) return;
		setSaving(true);

		try {
			if (editing === "new") {
				await createTextSource(currentAgent.id, data.title, data.content);
				toast.success("Text source created");
			} else if (editing) {
				await updateTextSource(editing, data.title, data.content);
				toast.success("Text source updated");
			}
			handleClosePanel();
			await fetchSources();
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to save";
			if (message.includes("Storage limit")) {
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

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this text source?")) return;

		try {
			await deleteTextSource(id);
			toast.success("Text source deleted");
			await fetchSources();
		} catch (err) {
			console.error("Failed to delete:", err);
			toast.error("Failed to delete text source");
		}
	};

	// Filter and paginate sources
	const filteredSources = useMemo(() => {
		if (!searchQuery.trim()) return sources;
		const query = searchQuery.toLowerCase();
		return sources.filter((source) => source.title?.toLowerCase().includes(query));
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
					<FileText className="w-12 h-12 mb-4 text-[#D1D1D1]" />
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest mb-4">
						No text sources yet
					</div>
					<button
						type="button"
						onClick={handleNew}
						className="text-[10px] font-bold uppercase flex items-center gap-2 border border-[#D1D1D1] bg-white px-4 py-2 hover:bg-[#1A1A1A] hover:text-white transition-colors"
					>
						<Plus size={12} /> Add Text Source
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
					<TextSourceRow
						key={source.id}
						source={source}
						onEdit={handleEdit}
						onDelete={handleDelete}
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

	// Calculate stats
	const totalSize = sources.reduce((acc, s) => acc + (s.size || 0), 0);

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			<PageHeader
				title="Text Sources"
				subtitle="Add custom text snippets to your agent's knowledge base"
				icon={
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>Total Sources: {sources.length}</span>
					</div>
				}
				action={
					<button
						type="button"
						onClick={handleNew}
						className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
					>
						<Plus size={14} /> Add Text Source
					</button>
				}
			/>

			<div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
				<StorageLimitBanner />

				{/* --- STATS BANNER --- */}
				<div className="bg-white border border-[#D1D1D1] p-4 flex items-center gap-6 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="bg-[#F3F2EE] p-2 border border-[#E5E5E5] text-[#1A1A1A]">
							<Type size={16} />
						</div>
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">
								Total Text Sources
							</div>
							<div className="text-lg font-bold">{sources.length}</div>
						</div>
					</div>
					<div className="w-px h-8 bg-[#F3F2EE]" />
					<div className="flex items-center gap-3">
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">Storage Used</div>
							<div className="text-lg font-bold">
								{formatBytes(usage?.storageUsed ?? totalSize)}{" "}
								<span className="text-[#CCC] font-normal">
									/{" "}
									{usage?.storageLimit === -1 ? "Unlimited" : formatBytes(usage?.storageLimit ?? 0)}
								</span>
							</div>
						</div>
					</div>
					<div className="w-px h-8 bg-[#F3F2EE]" />
					<div className="flex items-center gap-3">
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">
								Indexing Status
							</div>
							<div className="flex items-center gap-2 text-lg font-bold">
								All Indexed{" "}
								<span className="text-[10px] font-normal text-[#888] border border-[#E5E5E5] px-1 bg-[#F9F9F9]">
									READY
								</span>
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
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={fetchSources}
								className="w-8 h-8 flex items-center justify-center border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] text-[#555]"
								title="Refresh"
							>
								<RefreshCw size={14} />
							</button>
						</div>
					</div>

					{/* Table Header */}
					<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div className="col-span-5">Title / Type</div>
						<div className="col-span-2 text-center">Size</div>
						<div className="col-span-2 text-center">Created</div>
						<div className="col-span-2 text-center">Indexing Status</div>
						<div className="col-span-1 text-right">Actions</div>
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

			{/* --- ADD/EDIT TEXT SOURCE PANEL --- */}
			<AddTextSourcePanel
				isOpen={showPanel}
				onClose={handleClosePanel}
				onSubmit={onSubmit}
				saving={saving}
				mode={editing === "new" ? "create" : "edit"}
				initialData={editingData}
			/>
		</div>
	);
}
