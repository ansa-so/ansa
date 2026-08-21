"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	File,
	FileCode,
	FileSpreadsheet,
	FileText,
	Filter,
	Loader2,
	RefreshCw,
	Search,
	Trash2,
	UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { StorageLimitBanner } from "@/components/storage-limit-banner";
import { useAgent } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import { deleteDocument, getUsage, listDocuments, type UsageData, uploadDocument } from "@/lib/api";

interface Document {
	id: string;
	filename: string;
	mimeType: string;
	size: number;
	status?: "pending" | "processing" | "completed" | "failed";
	createdAt: string;
}

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

function getFileExtension(filename: string): string {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	return ext;
}

function FileIcon({ mimeType, filename }: { mimeType: string; filename: string }) {
	const ext = getFileExtension(filename);

	if (mimeType === "application/pdf" || ext === "pdf") {
		return <FileText size={14} className="text-red-600" />;
	}
	if (
		mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
		ext === "xlsx" ||
		ext === "xls" ||
		ext === "csv"
	) {
		return <FileSpreadsheet size={14} className="text-green-600" />;
	}
	if (mimeType === "application/json" || ext === "json") {
		return <FileCode size={14} className="text-yellow-600" />;
	}
	return <File size={14} className="text-[#888]" />;
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

// Document Row Component following test9 design
function DocumentRow({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
	const ext = getFileExtension(doc.filename);
	const isProcessing = doc.status === "processing" || doc.status === "pending";
	const isFailed = doc.status === "failed";

	return (
		<div
			className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#FAFAF9] transition-colors group relative ${
				isProcessing
					? "border-l-2 border-l-yellow-400"
					: isFailed
						? "border-l-2 border-l-red-400"
						: ""
			}`}
		>
			{/* Name & Type */}
			<div className="flex items-start col-span-5 gap-3">
				<div className="mt-0.5 w-8 h-8 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center rounded-sm">
					<FileIcon mimeType={doc.mimeType} filename={doc.filename} />
				</div>
				<div className="min-w-0">
					<div className="font-medium text-sm text-[#1A1A1A] mb-1 truncate">{doc.filename}</div>
					<div className="text-[10px] text-[#888] font-mono flex items-center gap-2">
						<span className="bg-[#F3F2EE] px-1 rounded-sm uppercase">{ext || "file"}</span>
						<span>•</span>
						<span className="truncate">{doc.id.slice(0, 8)}</span>
					</div>
				</div>
			</div>

			{/* Size */}
			<div className="col-span-2 text-center font-mono text-xs text-[#555]">
				{formatBytes(doc.size)}
			</div>

			{/* Date */}
			<div className="col-span-2 text-center">
				<div className="font-mono text-xs text-[#555]">
					{new Date(doc.createdAt).toLocaleDateString()}
				</div>
				<div className="text-[9px] text-[#888] uppercase tracking-wide">
					{formatRelativeTime(doc.createdAt)}
				</div>
			</div>

			{/* Status */}
			<div className="flex justify-center col-span-2">
				<StatusBadge status={doc.status} />
			</div>

			{/* Actions */}
			<div className="flex justify-end col-span-1 gap-2 transition-opacity opacity-0 group-hover:opacity-100">
				<button
					type="button"
					onClick={() => onDelete(doc.id)}
					className="p-1.5 border border-[#D1D1D1] bg-white hover:border-red-500 hover:text-red-500 transition-colors"
					title="Delete"
				>
					<Trash2 size={12} />
				</button>
			</div>
		</div>
	);
}

export default function FilesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [usage, setUsage] = useState<UsageData | null>(null);

	const fetchDocuments = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const [docs, usageData] = await Promise.all([listDocuments(currentAgent.id), getUsage()]);
			setDocuments(docs);
			setUsage(usageData);
		} catch (err) {
			console.error("Failed to fetch documents:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			setDocuments([]);
			fetchDocuments();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchDocuments]);

	const handleUpload = useCallback(
		async (file: File) => {
			if (!currentAgent) return;
			try {
				await uploadDocument(currentAgent.id, file);
				trackEvent("knowledge_added", {
					agentId: currentAgent.id,
					type: "file",
					fileType: file.name.split(".").pop() || "unknown",
					sizeBytes: file.size,
				});
				toast.success("File uploaded successfully");
				await fetchDocuments();
			} catch (err) {
				const message = err instanceof Error ? err.message : "Upload failed";
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
			}
		},
		[currentAgent, fetchDocuments],
	);

	const handleDelete = useCallback(
		async (id: string) => {
			if (!confirm("Delete this document?")) return;
			try {
				await deleteDocument(id);
				toast.success("Document deleted");
				await fetchDocuments();
			} catch (err) {
				console.error("Failed to delete:", err);
				toast.error("Failed to delete document");
			}
		},
		[fetchDocuments],
	);

	// Filter and paginate documents
	const filteredDocuments = useMemo(() => {
		if (!searchQuery.trim()) return documents;
		const query = searchQuery.toLowerCase();
		return documents.filter((doc) => doc.filename?.toLowerCase().includes(query));
	}, [documents, searchQuery]);

	const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
	const paginatedDocuments = useMemo(() => {
		const start = (currentPage - 1) * ITEMS_PER_PAGE;
		return filteredDocuments.slice(start, start + ITEMS_PER_PAGE);
	}, [filteredDocuments, currentPage]);

	// Reset to page 1 when search changes
	const prevSearchQuery = useRef(searchQuery);
	useEffect(() => {
		if (prevSearchQuery.current !== searchQuery) {
			setCurrentPage(1);
			prevSearchQuery.current = searchQuery;
		}
	}, [searchQuery]);

	const renderDocuments = () => {
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

		if (documents.length === 0) {
			return (
				<div className="flex flex-col items-center justify-center py-20">
					<FileText className="w-12 h-12 mb-4 text-[#D1D1D1]" />
					<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest mb-4">
						No documents uploaded yet
					</div>
				</div>
			);
		}

		if (filteredDocuments.length === 0) {
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
				{paginatedDocuments.map((doc) => (
					<DocumentRow key={doc.id} doc={doc} onDelete={handleDelete} />
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
	const totalSize = documents.reduce((acc, doc) => acc + doc.size, 0);
	const processingCount = documents.filter(
		(doc) => doc.status === "processing" || doc.status === "pending",
	).length;

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			<PageHeader
				title="Documents"
				subtitle="Upload files for your agent to reference"
				icon={
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>Total Files: {documents.length}</span>
					</div>
				}
			/>

			<div className="p-8 max-w-[1600px] mx-auto w-full space-y-6">
				<StorageLimitBanner />

				{/* --- STATS BANNER --- */}
				<div className="bg-white border border-[#D1D1D1] p-4 flex items-center gap-6 shadow-sm">
					<div className="flex items-center gap-3">
						<div className="bg-[#F3F2EE] p-2 border border-[#E5E5E5] text-[#1A1A1A]">
							<FileText size={16} />
						</div>
						<div>
							<div className="text-[10px] font-mono uppercase text-[#888] mb-0.5">
								Total Documents
							</div>
							<div className="text-lg font-bold">{documents.length}</div>
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
								{processingCount > 0 ? (
									<>
										{processingCount} Processing{" "}
										<span className="text-[10px] font-normal text-[#888] border border-[#E5E5E5] px-1 bg-[#F9F9F9]">
											IN PROGRESS
										</span>
									</>
								) : (
									<>
										All Indexed{" "}
										<span className="text-[10px] font-normal text-[#888] border border-[#E5E5E5] px-1 bg-[#F9F9F9]">
											READY
										</span>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* --- UPLOAD ZONE --- */}
				<label className="bg-[#FAFAF9] border-2 border-dashed border-[#D1D1D1] rounded-sm p-8 flex flex-col items-center justify-center text-center hover:border-[#1A1A1A] hover:bg-white transition-all cursor-pointer group">
					<input
						type="file"
						accept=".pdf,.docx,.txt,.json,.csv"
						onChange={(e) => {
							const file = e.target.files?.[0];
							if (file) handleUpload(file);
							e.target.value = "";
						}}
						className="hidden"
					/>
					<div className="w-12 h-12 bg-[#F3F2EE] border border-[#E5E5E5] flex items-center justify-center text-[#888] mb-4 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<UploadCloud size={20} />
					</div>
					<h3 className="mb-1 text-sm font-bold tracking-wide uppercase">Upload Documents</h3>
					<p className="text-xs text-[#888] font-mono mb-4">Drag & drop or click to select files</p>
					<div className="flex gap-2">
						{["PDF", "DOCX", "TXT", "JSON", "CSV"].map((fmt) => (
							<span
								key={fmt}
								className="text-[9px] border border-[#E5E5E5] bg-white px-1.5 py-0.5 text-[#AAA]"
							>
								{fmt}
							</span>
						))}
					</div>
				</label>

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
									placeholder="SEARCH FILES..."
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
								onClick={fetchDocuments}
								className="w-8 h-8 flex items-center justify-center border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] text-[#555]"
								title="Refresh"
							>
								<RefreshCw size={14} />
							</button>
						</div>
					</div>

					{/* Table Header */}
					<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div className="col-span-5">Filename / Type</div>
						<div className="col-span-2 text-center">Size</div>
						<div className="col-span-2 text-center">Uploaded</div>
						<div className="col-span-2 text-center">Indexing Status</div>
						<div className="col-span-1 text-right">Actions</div>
					</div>

					{/* Table Body */}
					<div className="flex-1">{renderDocuments()}</div>

					{/* Footer / Pagination */}
					<div className="p-3 border-t border-[#D1D1D1] flex justify-between items-center bg-[#FAFAF9] px-6">
						<span className="text-[10px] font-mono text-[#888] uppercase">
							Showing {paginatedDocuments.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}-
							{Math.min(currentPage * ITEMS_PER_PAGE, filteredDocuments.length)} of{" "}
							{filteredDocuments.length}
						</span>
						{renderPagination()}
					</div>
				</div>
			</div>
		</div>
	);
}
