"use client";

import { PageHeader } from "@ansa/ui";
import {
	Activity,
	ArrowRight,
	CheckCircle2,
	Copy,
	Edit3,
	Filter,
	HelpCircle,
	Mail,
	MessageSquare,
	Plus,
	RefreshCw,
	Search,
	Settings,
	Trash2,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AddQAPairPanel } from "@/components/add-qa-pair-panel";
import { StorageLimitBanner } from "@/components/storage-limit-banner";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import {
	createQaSource,
	deleteQaSource,
	getQaSource,
	listQaSources,
	type QaSource,
	updateQaSource,
} from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";

const ITEMS_PER_PAGE = 10;

// QA Row Component following test9 design
const QARow = ({
	item,
	onEdit,
	onDelete,
	formatSize,
}: {
	item: QaSource;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
	formatSize: (bytes: number) => string;
}) => (
	<div
		className="group grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#FAFAF9] transition-colors relative cursor-pointer"
		onClick={() => onEdit(item.id)}
		onKeyDown={(e) => e.key === "Enter" && onEdit(item.id)}
		role="button"
		tabIndex={0}
	>
		{/* Status Indicator Line */}
		<div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[#1A1A1A]" />

		{/* Question & Variants */}
		<div className="col-span-6">
			<div className="flex items-start gap-3">
				<div className="mt-1 text-[#888]">
					<MessageSquare size={14} />
				</div>
				<div className="flex-1 min-w-0">
					<div className="font-medium text-sm text-[#1A1A1A] mb-1 truncate">
						{item.questions[0]}
					</div>
					<div className="text-[10px] text-[#888] font-mono flex items-center gap-2 flex-wrap">
						<span className="bg-[#F3F2EE] border border-[#E5E5E5] px-1.5 rounded-sm">
							ID: {item.id.slice(0, 8)}
						</span>
						{item.questions.length > 1 && <span>+{item.questions.length - 1} variants</span>}
					</div>
				</div>
			</div>
		</div>

		{/* Size */}
		<div className="col-span-2 text-center font-mono text-xs text-[#555]">
			{item.size !== undefined ? formatSize(item.size) : "—"}
		</div>

		{/* Date */}
		<div className="col-span-2 text-center font-mono text-xs text-[#555]">
			{new Date(item.createdAt).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			})}
		</div>

		{/* Actions */}
		<div className="flex justify-end col-span-2 gap-2 transition-opacity opacity-0 group-hover:opacity-100">
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onEdit(item.id);
				}}
				className="p-1.5 border border-[#D1D1D1] bg-white hover:bg-[#1A1A1A] hover:text-white transition-colors"
			>
				<Edit3 size={12} />
			</button>
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					onDelete(item.id);
				}}
				className="p-1.5 border border-[#D1D1D1] bg-white hover:border-red-500 hover:text-red-500 transition-colors"
			>
				<Trash2 size={12} />
			</button>
		</div>
	</div>
);

// Email Auto-Learn Box Component
const EmailAutoLearnBox = ({
	emailAddress,
	isEnabled = true,
}: {
	emailAddress: string;
	isEnabled?: boolean;
}) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		if (!isEnabled) return;
		navigator.clipboard.writeText(emailAddress);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="w-full">
			{/* Container: Industrial Panel Style */}
			<div className="bg-white border border-[#D1D1D1] transition-all hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] relative overflow-hidden group">
				<div className="flex flex-col items-stretch md:flex-row">
					{/* Left: Icon & Status Module */}
					<div className="bg-[#FAFAF9] border-b md:border-b-0 md:border-r border-[#E5E5E5] p-6 flex flex-col items-center justify-center min-w-[140px] relative">
						<div className="relative">
							{/* Glowing Backlayer */}
							<div className="absolute inset-0 transition-opacity duration-500 bg-blue-100 rounded-full opacity-0 blur-xl group-hover:opacity-100" />

							{/* Technical Icon */}
							<div className="relative z-10 w-12 h-12 bg-[#1A1A1A] text-white flex items-center justify-center shadow-md">
								<Mail size={24} strokeWidth={1.5} />
							</div>

							{/* Live Indicator Dot */}
							<div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 border-2 border-[#FAFAF9] rounded-full">
								<span className="absolute inset-0 bg-green-400 rounded-full opacity-75 animate-ping" />
							</div>
						</div>

						<div className="mt-4 flex items-center gap-1.5">
							<Activity size={12} className="text-green-600 animate-pulse" />
							<span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#555]">
								Listener Active
							</span>
						</div>
					</div>

					{/* Middle: Content & Data Field */}
					<div className="flex flex-col justify-center flex-1 p-6">
						{/* Header Label */}
						<div className="flex items-center gap-2 mb-2">
							<span className="bg-[#1A1A1A] text-white text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wider">
								Auto-Learn Protocol
							</span>
						</div>

						{/* Description */}
						<h3 className="text-sm font-bold text-[#1A1A1A] mb-1">Email Ingestion Stream</h3>
						<p className="text-xs text-[#555] font-mono leading-relaxed mb-4 max-w-lg">
							Forward support threads to this unique endpoint. The system will parse content and
							auto-populate Q&A entries.
						</p>

						{/* The "Terminal" Input Field */}
						<div className="flex items-center group/field">
							<div className="flex-1 h-10 bg-[#FAFAF9] border border-[#D1D1D1] border-r-0 flex items-center px-3 font-mono text-xs text-[#1A1A1A] overflow-hidden whitespace-nowrap relative">
								<span className="mr-2 select-none opacity-40">TO:</span>
								<span className={isEnabled ? "" : "blur-sm select-none"}>
									{isEnabled ? emailAddress : "learn-XXXX@mail.ansa.so"}
								</span>
								{/* Scanline Effect */}
								{isEnabled && (
									<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent w-10 -skew-x-12 translate-x-[-100%] group-hover/field:animate-[shimmer_1s_infinite]" />
								)}
							</div>

							{isEnabled ? (
								<button
									type="button"
									onClick={handleCopy}
									className="h-10 px-4 border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 active:translate-y-0.5"
								>
									{copied ? (
										<span className="flex items-center gap-2 text-[10px] font-bold uppercase">
											<CheckCircle2 size={12} /> Copied
										</span>
									) : (
										<span className="flex items-center gap-2 text-[10px] font-bold uppercase">
											<Copy size={12} /> Copy Endpoint
										</span>
									)}
								</button>
							) : (
								<Link
									href="/billing"
									className="h-10 px-4 border border-[#1A1A1A] bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors flex items-center gap-2 active:translate-y-0.5"
								>
									<span className="flex items-center gap-2 text-[10px] font-bold uppercase">
										<Zap size={12} /> Upgrade Plan
									</span>
								</Link>
							)}
						</div>
					</div>

					{/* Right: Config Action */}
					<Link
						href="/channels/email"
						className="border-t md:border-t-0 md:border-l border-[#D1D1D1] p-4 flex flex-col justify-center items-center gap-2 min-w-[120px] bg-[#FAFAF9] hover:bg-[#F3F2EE] transition-colors cursor-pointer group/config"
					>
						<div className="w-8 h-8 rounded-full border border-[#D1D1D1] flex items-center justify-center text-[#555] group-hover/config:border-[#1A1A1A] group-hover/config:text-[#1A1A1A] group-hover/config:rotate-90 transition-all duration-300">
							<Settings size={14} />
						</div>
						<span className="text-[9px] font-bold uppercase text-[#555] group-hover/config:text-[#1A1A1A] transition-colors">
							Configure
						</span>
					</Link>
				</div>

				{/* Decorative Corner Screws */}
				<div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full border border-[#CCC] flex items-center justify-center">
					<div className="w-full h-px bg-[#CCC] rotate-45" />
				</div>
				<div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full border border-[#CCC] flex items-center justify-center">
					<div className="w-full h-px bg-[#CCC] rotate-45" />
				</div>
				<div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full border border-[#CCC] flex items-center justify-center">
					<div className="w-full h-px bg-[#CCC] rotate-45" />
				</div>
				<div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full border border-[#CCC] flex items-center justify-center">
					<div className="w-full h-px bg-[#CCC] rotate-45" />
				</div>
			</div>
		</div>
	);
};

export default function QaSourcesPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const searchParams = useSearchParams();
	const hasProcessedQuestionParam = useRef(false);
	const [sources, setSources] = useState<QaSource[]>([]);
	const [loading, setLoading] = useState(true);
	const [editing, setEditing] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [currentPage, setCurrentPage] = useState(1);
	const [editingData, setEditingData] = useState<
		{ questions: string[]; answer: string } | undefined
	>(undefined);

	// Check if current plan has email channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const hasEmailChannel =
		plansLoading || !currentPlanId
			? false // Hide while loading
			: currentPlanId === "unlimited" || (currentPlan?.hasEmailChannel ?? false);

	const fetchSources = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const data = await listQaSources(currentAgent.id);
			setSources(data);
		} catch (err) {
			console.error("Failed to fetch Q&A sources:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			// Clear previous agent's data when switching agents
			setSources([]);
			// Don't clear editing state if there's a question parameter to process
			const questionParam = searchParams.get("question");
			if (!questionParam) {
				setEditing(null);
				setEditingData(undefined);
			}
			fetchSources();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchSources, searchParams]);

	// Handle pre-filling question from URL parameter
	useEffect(() => {
		const questionParam = searchParams.get("question");
		if (questionParam && !hasProcessedQuestionParam.current && !editing) {
			hasProcessedQuestionParam.current = true;
			const decodedQuestion = decodeURIComponent(questionParam);
			setEditing("new");
			setEditingData({
				questions: [decodedQuestion],
				answer: "",
			});
		}
	}, [searchParams, editing]);

	const handleNew = () => {
		setEditing("new");
		setEditingData(undefined);
	};

	const handleEdit = async (id: string) => {
		try {
			const source = await getQaSource(id);
			setEditing(id);
			setEditingData({
				questions: source.questions,
				answer: source.answer,
			});
		} catch (err) {
			console.error("Failed to load source:", err);
		}
	};

	const handleCancel = () => {
		setEditing(null);
		setEditingData(undefined);
	};

	const handleSubmit = async (data: { questions: string[]; answer: string }) => {
		if (!currentAgent) return;
		setSaving(true);

		try {
			if (editing === "new") {
				await createQaSource(currentAgent.id, data.questions, data.answer);
				trackEvent("knowledge_added", {
					agentId: currentAgent.id,
					type: "qa",
					questionCount: data.questions.length,
				});
				toast.success("Q&A created");
			} else if (editing) {
				await updateQaSource(editing, data.questions, data.answer);
				toast.success("Q&A updated");
			}
			setEditing(null);
			setEditingData(undefined);
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
		if (!confirm("Delete this Q&A?")) return;

		try {
			await deleteQaSource(id);
			await fetchSources();
		} catch (err) {
			console.error("Failed to delete:", err);
		}
	};

	const formatSize = (bytes: number) => {
		if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
		if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${bytes} B`;
	};

	// Filter and paginate sources
	const filteredSources = useMemo(() => {
		if (!searchQuery.trim()) return sources;
		const query = searchQuery.toLowerCase();
		return sources.filter(
			(source) =>
				source.questions.some((q) => q?.toLowerCase().includes(query)) ||
				source.answer?.toLowerCase().includes(query),
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
		if (loading || agentLoading) {
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
				<Empty className="my-8">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<HelpCircle />
						</EmptyMedia>
						<EmptyTitle>No Q&A sources yet</EmptyTitle>
						<EmptyDescription>
							Add question-answer pairs to train your AI with specific responses.
						</EmptyDescription>
					</EmptyContent>
				</Empty>
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
					<QARow
						key={source.id}
						item={source}
						onEdit={handleEdit}
						onDelete={handleDelete}
						formatSize={formatSize}
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
				title="Q&A Sources"
				subtitle="Add question and answer pairs to provide accurate responses for common queries"
				icon={
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>Total Entries: {sources.length}</span>
					</div>
				}
				action={
					<button
						type="button"
						onClick={handleNew}
						className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
					>
						<Plus size={14} /> Add Q&A Pair
					</button>
				}
			/>

			<div className="w-full p-8 space-y-6">
				<StorageLimitBanner />

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
									placeholder="SEARCH QUESTIONS..."
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
						<div className="col-span-6">Query Pattern / Variants</div>
						<div className="col-span-2 text-center">Size</div>
						<div className="col-span-2 text-center">Date Created</div>
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

				{/* --- SYSTEM ALERT (Email Auto-Learn) --- */}
				{currentAgent && (
					<EmailAutoLearnBox
						emailAddress={`learn-${currentAgent.id.replace(/-/g, "").slice(0, 12)}@${getConfig().emailInboundDomain || "mail.ansa.so"}`}
						isEnabled={hasEmailChannel}
					/>
				)}
			</div>

			{/* --- EDIT/CREATE PANEL --- */}
			<AddQAPairPanel
				isOpen={!!editing}
				onClose={handleCancel}
				onSubmit={handleSubmit}
				saving={saving}
				mode={editing === "new" ? "create" : "edit"}
				initialData={editingData}
			/>
		</div>
	);
}
