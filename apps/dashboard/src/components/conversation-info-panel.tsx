"use client";

import { formatRelativeTime } from "@ansa/utils";
import {
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Calendar,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Clock,
	Cpu,
	ExternalLink,
	Globe,
	Hash,
	Languages,
	Lightbulb,
	Loader2,
	Mail,
	MapPin,
	MessageSquare,
	Package,
	Phone,
	ShoppingBag,
	StickyNote,
	Tag,
	Terminal,
	User,
	UserRoundCog,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
	assignConversation,
	type ConversationEscalation,
	type ConversationUserInfo,
	type EscalationHistoryItem,
	getConversationUserInfo,
	getEscalationHistory,
	getTeamMembers,
	markConversationImproved,
	type TeamMember,
	updateConversationNote,
	updateConversationStatus,
	updateEscalationPriority,
} from "@/lib/api";
import { getCountryName } from "@/lib/country-names";
import { getLanguageName } from "@/lib/language-names";
import { getConfig } from "@/lib/runtime-config";
import { cn } from "@/lib/utils";
import { Title } from "./ui/title";

interface ConversationInfoPanelProps {
	conversationId: string | null;
	escalation?: ConversationEscalation | null;
	open: boolean;
	onClose: () => void;
	onConversationSelect?: (id: string) => void;
	onEscalationUpdate?: () => void;
	escalationEnabled?: boolean;
}

function formatDate(dateString: string | null | undefined): string {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatDateTime(dateString: string | null | undefined): string {
	if (!dateString) return "—";
	return new Date(dateString).toLocaleString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function formatResponseTime(
	startDate: string | null | undefined,
	endDate: string | null | undefined,
): string | null {
	if (!startDate || !endDate) return null;
	const start = new Date(startDate);
	const end = new Date(endDate);
	const diffMs = end.getTime() - start.getTime();
	if (diffMs < 0) return null;

	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) {
		return `${diffDays}d ${diffHours % 24}h`;
	}
	if (diffHours > 0) {
		return `${diffHours}h ${diffMins % 60}m`;
	}
	return `${diffMins}m`;
}

function formatCurrency(amount: string | null, currency: string | null): string {
	if (!amount) return "—";
	const num = Number.parseFloat(amount);
	if (Number.isNaN(num)) return amount;
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency || "USD",
	}).format(num);
}

function getChannelLabel(channel: string): string {
	const labels: Record<string, string> = {
		widget: "Chat Widget",
		email: "Email",
		iframe: "Embedded",
		api: "API",
		sms: "SMS",
		whatsapp: "WhatsApp",
	};
	return labels[channel] || channel;
}

function getStatusLabel(status: string): string {
	const labels: Record<string, string> = {
		open: "In Progress",
		pending: "Waiting on Customer",
		resolved: "Resolved",
	};
	return labels[status] || status;
}

function getStatusColor(status: string | null): string {
	if (!status) return "bg-gray-100 text-gray-800";
	const colors: Record<string, string> = {
		paid: "bg-green-100 text-green-800",
		pending: "bg-yellow-100 text-yellow-800",
		refunded: "bg-red-100 text-red-800",
		partially_refunded: "bg-orange-100 text-orange-800",
		fulfilled: "bg-green-100 text-green-800",
		partial: "bg-yellow-100 text-yellow-800",
		unfulfilled: "bg-gray-100 text-gray-800",
	};
	return colors[status] || "bg-gray-100 text-gray-800";
}

function InfoRow({
	icon: Icon,
	label,
	value,
	href,
}: {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: React.ReactNode;
	href?: string;
}) {
	if (!value || value === "—") return null;

	return (
		<div className="flex items-start gap-3 py-2">
			<Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
			<div className="flex-1 min-w-0">
				<div className="uppercase font-mono text-[10px] tracking-widest text-muted-foreground">
					{label}
				</div>
				{href ? (
					<a
						href={href}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 text-sm text-primary hover:underline"
					>
						{value}
						<ExternalLink className="w-3 h-3" />
					</a>
				) : (
					<div className="text-sm truncate">{value}</div>
				)}
			</div>
		</div>
	);
}

// Attention Guidance Section Component
function AttentionGuidanceSection({
	conversationId,
	channel,
	needsAttention,
	minConfidence,
	confidenceLevel,
	escalation,
	status,
	escalationEnabled,
	onMarkImproved,
	isMarkingImproved,
}: {
	conversationId: string;
	channel: string;
	needsAttention: boolean | null;
	resolution: "ai_handled" | "human_handled" | "improved" | null;
	minConfidence: number | null;
	confidenceLevel: "high" | "medium" | "low" | null;
	escalation?: ConversationEscalation | null;
	status: string;
	escalationEnabled?: boolean;
	onMarkImproved: () => Promise<void>;
	isMarkingImproved: boolean;
}) {
	// Determine what action is needed
	const isEscalated = !!escalation && escalation.status !== "resolved" && status !== "closed";
	const isLowConfidence = confidenceLevel === "low" || confidenceLevel === "medium";
	const isEmailChannel = channel === "email";
	const isWidgetOrIframe = channel === "widget" || channel === "iframe";

	// Priority 1: Escalated - needs human response
	if (isEscalated && escalationEnabled) {
		return (
			<div className="rounded-lg border p-2.5 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
				<div className="flex items-start gap-2">
					<UserRoundCog className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="text-sm font-medium text-orange-800 dark:text-orange-200">
							Respond to Customer
						</div>
						<div className="text-[11px] text-orange-600 dark:text-orange-400 mt-0.5">
							{escalation?.escalationSource === "user_request"
								? "Customer requested human assistance"
								: escalation?.escalationSource === "low_confidence"
									? "AI confidence was too low to respond"
									: "Escalated for human review"}
						</div>
						<div className="flex items-center gap-2 mt-2">
							<Button
								size="sm"
								variant="outline"
								className="text-[10px] bg-white border-orange-300 h-7 hover:bg-orange-100 dark:border-orange-700 dark:bg-orange-900 dark:hover:bg-orange-800"
								onClick={() => {
									// Scroll to the message composer
									const composer = document.querySelector('[data-composer="true"]');
									if (composer) {
										composer.scrollIntoView({ behavior: "smooth", block: "center" });
										const textarea = composer.querySelector("textarea");
										if (textarea) textarea.focus();
									}
								}}
							>
								<ArrowRight className="w-2 h-2 mr-1" />
								Reply
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Priority 2: Email with low confidence - needs human reply
	if (isEmailChannel && isLowConfidence) {
		return (
			<div className="rounded-lg border p-2.5 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
				<div className="flex items-start gap-2">
					<Mail className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<div className="text-sm font-medium text-amber-800 dark:text-amber-200 leading-[1.2]">
								Review Email Response
							</div>
							{minConfidence !== null && (
								<Badge
									variant="outline"
									className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300 whitespace-nowrap"
								>
									{Math.round(minConfidence)}% confidence
								</Badge>
							)}
						</div>
						<div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
							AI response confidence is low. Please review and reply if needed.
						</div>
						<div className="mt-4">
							<Button
								size="sm"
								variant="outline"
								className="text-xs bg-white h-7 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:hover:bg-amber-800"
								onClick={() => {
									const composer = document.querySelector('[data-composer="true"]');
									if (composer) {
										composer.scrollIntoView({ behavior: "smooth", block: "center" });
										const textarea = composer.querySelector("textarea");
										if (textarea) textarea.focus();
									}
								}}
							>
								<ArrowRight className="w-3 h-3 mr-1" />
								Reply
							</Button>
							<Button
								size="sm"
								variant="ghost"
								className="mt-2 text-xs h-7 text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300"
								onClick={onMarkImproved}
								disabled={isMarkingImproved}
							>
								{isMarkingImproved ? (
									<Loader2 className="w-3 h-3 mr-1 animate-spin" />
								) : (
									<CheckCircle className="w-3 h-3 mr-1" />
								)}
								Mark as Handled
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Priority 3: Widget/Iframe with low confidence - train better response
	if (isWidgetOrIframe && isLowConfidence && needsAttention) {
		return (
			<div className="w-full bg-white dark:bg-zinc-900 border border-[#EAB308] shadow-[4px_4px_0px_0px_rgba(234,179,8,0.2)] font-sans text-[#1A1A1A] dark:text-zinc-100 relative overflow-hidden group">
				{/* Status Header */}
				<div className="flex items-center justify-between px-4 py-2 bg-[#EAB308] text-[#422006]">
					<div className="flex items-center gap-2">
						<AlertTriangle size={12} strokeWidth={2.5} />
						<span className="text-[10px] font-bold uppercase tracking-widest">
							Training Required
						</span>
					</div>
					<div className="text-[9px] font-mono opacity-80">CODE: LOW_CONF</div>
				</div>

				{/* Technical Context */}
				<div className="p-5">
					<div className="flex items-start gap-3 mb-4">
						<div className="mt-0.5 text-[#EAB308]">
							<Cpu size={16} />
						</div>
						<div>
							<h3 className="mb-1 text-xs font-bold tracking-wide uppercase">Model Uncertainty</h3>
							<p className="text-[10px] text-[#555] dark:text-zinc-400 font-mono leading-relaxed">
								The AI generated a response with{" "}
								<span className="font-bold text-[#1A1A1A] dark:text-zinc-100">
									{minConfidence !== null ? Math.round(minConfidence) : 50}% confidence
								</span>
								, falling below the safety threshold of 70%.
							</p>
						</div>
					</div>

					{/* Metric Visualization */}
					<div className="bg-[#FEFCE8] dark:bg-amber-950/50 border border-[#FEF08A] dark:border-amber-800 p-2 mb-5 flex items-center justify-between">
						<div className="text-[9px] font-mono text-[#854D0E] dark:text-amber-300 uppercase">
							Score vs Threshold
						</div>
						<div className="flex items-center gap-2 font-mono text-[10px] font-bold">
							<span className="text-red-600 dark:text-red-400">
								{minConfidence !== null ? (minConfidence / 100).toFixed(2) : "0.50"}
							</span>
							<span className="text-[#CA8A04]">{`<`}</span>
							<span className="text-green-700 dark:text-green-400">0.70</span>
						</div>
					</div>

					{/* Command Actions */}
					<div className="space-y-2">
						{/* Primary Action */}
						<Link
							href={`/ai-knowledge/qa?conversationId=${conversationId}`}
							className="w-full bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 h-9 text-[9px] font-bold uppercase tracking-widest hover:bg-[#333] dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group-hover:shadow-md"
						>
							<Terminal size={10} /> Patch Knowledge Base
						</Link>

						{/* Secondary Action */}
						<button
							className="w-full bg-white dark:bg-zinc-900 text-[#1A1A1A] dark:text-zinc-100 border border-[#D1D1D1] dark:border-zinc-700 h-9 text-[9px] font-bold uppercase tracking-widest hover:bg-[#F3F2EE] dark:hover:bg-zinc-800 hover:text-green-700 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={onMarkImproved}
							disabled={isMarkingImproved}
						>
							{isMarkingImproved ? (
								<Loader2 size={10} className="animate-spin" />
							) : (
								<CheckCircle size={10} />
							)}
							Mark as Correct
						</button>
					</div>
				</div>

				{/* Decorative striped bar at bottom */}
				<div className="h-1 w-full bg-[url('https://www.transparenttextures.com/patterns/diagonal-stripes.png')] opacity-20" />
			</div>
		);
	}

	// Default: needs attention but no specific action - show alert with mark as good option
	if (needsAttention) {
		return (
			<div className="rounded-lg border p-2.5 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
				<div className="flex items-start gap-2">
					<AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2">
							<div className="text-sm font-medium text-amber-800 dark:text-amber-200">
								Needs Review
							</div>
							{minConfidence !== null && (
								<Badge
									variant="outline"
									className="text-xs border-amber-300 text-amber-700 dark:border-amber-600 dark:text-amber-300"
								>
									{Math.round(minConfidence)}% confidence
								</Badge>
							)}
						</div>
						<div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
							This conversation was flagged for human review.
						</div>
						<div className="flex items-center gap-2 mt-2">
							<Button
								size="sm"
								variant="outline"
								className="text-xs bg-white h-7 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:hover:bg-amber-800"
								onClick={onMarkImproved}
								disabled={isMarkingImproved}
							>
								{isMarkingImproved ? (
									<Loader2 className="w-3 h-3 mr-1 animate-spin" />
								) : (
									<CheckCircle className="w-3 h-3 mr-1" />
								)}
								Mark as Not Needing Attention
							</Button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return null;
}

export function ConversationInfoPanel({
	conversationId,
	escalation,
	open,
	onClose,
	onConversationSelect,
	onEscalationUpdate,
	escalationEnabled = true,
}: ConversationInfoPanelProps) {
	const [data, setData] = useState<ConversationUserInfo | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [otherConvosOpen, setOtherConvosOpen] = useState(false);
	const [internalNote, setInternalNote] = useState("");
	const [noteSaving, setNoteSaving] = useState(false);
	const [noteChanged, setNoteChanged] = useState(false);
	const [isMarkingImproved, setIsMarkingImproved] = useState(false);
	const [escalationHistory, setEscalationHistory] = useState<EscalationHistoryItem[]>([]);

	useEffect(() => {
		if (!conversationId || !open) {
			setData(null);
			setEscalationHistory([]);
			return;
		}

		async function fetchData() {
			setLoading(true);
			setError(null);
			try {
				const [info, members, history] = await Promise.all([
					getConversationUserInfo(conversationId!),
					getTeamMembers(),
					getEscalationHistory(conversationId!).catch(() => ({ history: [] })), // Gracefully handle if no history
				]);
				setData(info);
				setTeamMembers(members);
				setInternalNote(info.conversation.internalNote || "");
				setNoteChanged(false);
				setEscalationHistory(history.history);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load info");
			} finally {
				setLoading(false);
			}
		}

		fetchData();
	}, [conversationId, open]);

	const handleStatusChange = async (status: string) => {
		if (!conversationId || !data) return;
		try {
			await updateConversationStatus(conversationId, status as "open" | "pending" | "resolved");
			setData({
				...data,
				conversation: { ...data.conversation, status },
			});
		} catch (err) {
			console.error("Failed to update status:", err);
		}
	};

	const handleAssigneeChange = async (assigneeId: string) => {
		if (!conversationId || !data) return;
		try {
			await assignConversation(conversationId, assigneeId === "unassigned" ? null : assigneeId);
			const newAssignee =
				assigneeId === "unassigned" ? null : teamMembers.find((m) => m.memberId === assigneeId);
			setData({
				...data,
				conversation: {
					...data.conversation,
					assignee: newAssignee
						? { id: newAssignee.memberId, name: newAssignee.name, email: newAssignee.email }
						: null,
				},
			});
		} catch (err) {
			console.error("Failed to assign:", err);
		}
	};

	const handlePriorityChange = async (priority: "low" | "medium" | "high" | "urgent") => {
		if (!escalation?.id) return;
		try {
			await updateEscalationPriority(escalation.id, priority);
			onEscalationUpdate?.();
		} catch (err) {
			console.error("Failed to update priority:", err);
		}
	};

	const handleNoteSave = async () => {
		if (!conversationId || !data) return;
		setNoteSaving(true);
		try {
			await updateConversationNote(conversationId, internalNote || null);
			setData({
				...data,
				conversation: { ...data.conversation, internalNote: internalNote || null },
			});
			setNoteChanged(false);
		} catch (err) {
			console.error("Failed to save note:", err);
		} finally {
			setNoteSaving(false);
		}
	};

	const handleMarkImproved = async () => {
		if (!conversationId || !data) return;
		setIsMarkingImproved(true);
		try {
			const result = await markConversationImproved(conversationId);
			setData({
				...data,
				conversation: {
					...data.conversation,
					needsAttention: result.needsAttention,
					resolution: result.resolution as "ai_handled" | "human_handled" | "improved" | null,
				},
			});
		} catch (err) {
			console.error("Failed to mark as improved:", err);
		} finally {
			setIsMarkingImproved(false);
		}
	};

	// Get display name from metadata
	const getDisplayName = (): string => {
		if (data?.user.metadata?.name && typeof data.user.metadata.name === "string") {
			return data.user.metadata.name;
		}
		if (data?.user.metadata?.firstName && typeof data.user.metadata.firstName === "string") {
			return data.user.metadata.firstName;
		}
		if (data?.shopify?.customer) {
			const fullName =
				`${data.shopify.customer.firstName || ""} ${data.shopify.customer.lastName || ""}`.trim();
			if (fullName) return fullName;
		}
		if (data?.user.email) return data.user.email;
		if (data?.user.visitorId) return data.user.visitorId;
		return "Unknown User";
	};

	const displayName = getDisplayName();

	if (!open) return null;

	return (
		<div className="w-[320px] border-l border-[#D1D1D1] dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full">
			<Button
				variant="ghost"
				size="icon"
				className="absolute z-10 h-7 w-7 right-2 top-2"
				onClick={onClose}
			>
				<X className="w-4 h-4" />
			</Button>

			<ScrollArea className="flex-1">
				{loading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
					</div>
				) : error ? (
					<div className="p-4 text-sm text-center text-destructive">{error}</div>
				) : data ? (
					<div className="py-6 space-y-5">
						{/* User Header */}
						<div className="flex items-center gap-3 px-6">
							<div className="flex items-center justify-center w-10 h-10 bg-[#F3F2EE] shrink-0 border border-[#F3F2EE]">
								<User className="w-5 h-5 text-muted-foreground" />
							</div>
							<div className="min-w-0">
								<div className="text-sm font-medium truncate">{displayName}</div>
								{(() => {
									const email =
										data.user.email ||
										(typeof data.user.metadata?.email === "string"
											? data.user.metadata.email
											: null);
									return email ? (
										<div className="text-xs truncate text-muted-foreground">{email}</div>
									) : null;
								})()}
							</div>
						</div>

						{/* User Metadata */}
						{(() => {
							// Check if there are any metadata entries to display (excluding email and name)
							const displayableMetadata = data.user.metadata
								? Object.entries(data.user.metadata).filter(
										([key, value]) =>
											key !== "email" && key !== "name" && value !== null && value !== undefined,
									)
								: [];

							if (displayableMetadata.length === 0) return null;

							const firstTwo = displayableMetadata.slice(0, 2);
							const rest = displayableMetadata.slice(2);

							return (
								<div className="px-6">
									{/* First 2 items in grid boxes */}
									{firstTwo.length > 0 && (
										<div className="grid grid-cols-2 gap-2 mb-3">
											{firstTwo.map(([key, value]) => {
												let displayValue: string;
												if (typeof value === "object") {
													displayValue = JSON.stringify(value);
												} else {
													displayValue = String(value);
												}
												return (
													<div key={key} className="p-2 border border-[#F3F2EE] bg-[#FAFAF9]">
														<div className="text-[9px] font-mono text-[#888] uppercase mb-1">
															{key.replace(/([A-Z])/g, " $1").trim()}
														</div>
														<div className="text-xs font-bold truncate">{displayValue}</div>
													</div>
												);
											})}
										</div>
									)}
									{/* Remaining items in list style */}
									{rest.length > 0 && (
										<div className="space-y-1">
											{rest.map(([key, value]) => {
												let displayValue: string;
												if (typeof value === "object") {
													displayValue = JSON.stringify(value);
												} else {
													displayValue = String(value);
												}

												return (
													<div key={key} className="flex items-start gap-3 py-2">
														<Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
														<div className="flex-1 min-w-0">
															<div className="font-mono text-[10px] tracking-widest uppercase capitalize text-muted-foreground">
																{key.replace(/([A-Z])/g, " $1").trim()}
															</div>
															<div className="text-sm truncate">{displayValue}</div>
														</div>
													</div>
												);
											})}
										</div>
									)}
								</div>
							);
						})()}

						{/* Quick Resolution Actions */}
						{conversationId &&
							(data.conversation.status === "open" || data.conversation.status === "pending") &&
							!escalation && (
								<div className="flex gap-3 px-6">
									{/* Resolve Action */}
									<button
										className="flex-1 bg-[#1A1A1A] dark:bg-zinc-100 text-white dark:text-zinc-900 h-9 text-[9px] font-bold uppercase tracking-widest hover:bg-[#333] dark:hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 shadow-sm border border-[#1A1A1A] dark:border-zinc-100"
										onClick={() => handleStatusChange("resolved")}
									>
										<CheckCircle className="w-3 h-3" /> Resolve
									</button>

									{/* Escalate Action */}
									{escalationEnabled && (
										<button
											className="flex-1 bg-white dark:bg-zinc-900 text-[#1A1A1A] dark:text-zinc-100 h-9 text-[9px] font-bold uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-800 transition-colors flex items-center justify-center gap-2 border border-[#D1D1D1] dark:border-zinc-700"
											onClick={async () => {
												if (!conversationId) return;
												try {
													const response = await fetch(
														`${getConfig().apiUrl || "https://api.ansa.so"}/escalations`,
														{
															method: "POST",
															headers: { "Content-Type": "application/json" },
															credentials: "include",
															body: JSON.stringify({
																conversationId,
																source: "user_request",
															}),
														},
													);
													if (!response.ok) throw new Error("Failed to escalate");
													// Reload data to show escalation
													window.location.reload();
												} catch (err) {
													console.error("Failed to escalate:", err);
												}
											}}
										>
											<AlertTriangle className="w-3 h-3" /> Escalate
										</button>
									)}
								</div>
							)}

						<Separator className="bg-[#F3F2EE]" />

						{/* Status & Assignee */}
						<div className="px-6 space-y-3">
							<div>
								<div className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mb-1.5">
									Status
								</div>
								<Select value={data.conversation.status} onValueChange={handleStatusChange}>
									<SelectTrigger className="w-full h-8 text-xs">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="open">In Progress</SelectItem>
										<SelectItem value="pending">Waiting on Customer</SelectItem>
										<SelectItem value="resolved">Resolved</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1.5">
									Assignee
								</div>
								<Select
									value={data.conversation.assignee?.id || "unassigned"}
									onValueChange={handleAssigneeChange}
								>
									<SelectTrigger className="w-full h-8 text-xs">
										<SelectValue placeholder="Unassigned" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="unassigned">Unassigned</SelectItem>
										{teamMembers.map((member) => (
											<SelectItem key={member.memberId} value={member.memberId}>
												{member.name || member.email}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{escalation && (
								<div>
									<div className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground mb-1.5">
										Priority
									</div>
									<Select value={escalation.priority} onValueChange={handlePriorityChange}>
										<SelectTrigger className="w-full h-8 text-xs">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="low">
												<Badge variant="secondary" className="text-xs">
													Low
												</Badge>
											</SelectItem>
											<SelectItem value="medium">
												<Badge variant="secondary" className="text-xs text-yellow-600">
													Medium
												</Badge>
											</SelectItem>
											<SelectItem value="high">
												<Badge variant="secondary" className="text-xs text-orange-600">
													High
												</Badge>
											</SelectItem>
											<SelectItem value="urgent">
												<Badge variant="secondary" className="text-xs text-red-600">
													Urgent
												</Badge>
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}
						</div>

						<Separator className="bg-[#F3F2EE]" />

						{/* Conversation Info */}
						<div className="px-6">
							{/* <h3 className="mb-2 text-xs font-medium text-muted-foreground">Details</h3> */}
							<Title tag="h3" size="h5" className="mb-2">
								Details
							</Title>
							<div className="space-y-1">
								<InfoRow
									icon={Globe}
									label="Channel"
									value={getChannelLabel(data.conversation.channel)}
								/>
								<InfoRow
									icon={Hash}
									label="Messages"
									value={`${data.conversation.messageCount} messages`}
								/>
								<InfoRow
									icon={Calendar}
									label="Started"
									value={formatRelativeTime(data.conversation.createdAt)}
								/>
								{data.conversation.firstHumanResponseAt && (
									<InfoRow
										icon={Clock}
										label="First Response"
										value={formatResponseTime(
											data.conversation.createdAt,
											data.conversation.firstHumanResponseAt,
										)}
									/>
								)}
								<InfoRow
									icon={MapPin}
									label="Country"
									value={getCountryName(data.conversation.countryCode)}
								/>
								<InfoRow
									icon={Languages}
									label="Language"
									value={getLanguageName(data.conversation.language)}
								/>
								{data.conversation.pageDomain && (
									<InfoRow icon={Globe} label="Website" value={data.conversation.pageDomain} />
								)}
								<InfoRow
									icon={Globe}
									label="Page"
									value={data.conversation.pagePath || data.conversation.pageUrl}
									href={data.conversation.pageUrl || undefined}
								/>
							</div>
						</div>

						{/* SLA Information */}
						{escalation && (
							<>
								<Separator className="bg-[#F3F2EE]" />
								<div className="px-6">
									<Title tag="h3" size="h5" className="mb-2 gap-1.5 flex items-center">
										Escalation
									</Title>
									<div className="space-y-1">
										<InfoRow
											icon={Calendar}
											label="Escalated"
											value={formatDateTime(escalation.escalatedAt)}
										/>
										{escalation.firstResponseAt ? (
											<div className="flex items-start gap-3 py-2">
												<CheckCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="text-xs text-muted-foreground">Responded</div>
													<div className="text-sm">
														{formatResponseTime(escalation.escalatedAt, escalation.firstResponseAt)}
														{escalation.slaDeadline && (
															<span
																className={cn(
																	"ml-1.5 text-xs",
																	new Date(escalation.firstResponseAt) <=
																		new Date(escalation.slaDeadline)
																		? "text-green-600"
																		: "text-red-600",
																)}
															>
																(
																{new Date(escalation.firstResponseAt) <=
																new Date(escalation.slaDeadline)
																	? "within SLA"
																	: "SLA breached"}
																)
															</span>
														)}
													</div>
												</div>
											</div>
										) : escalation.slaBrokenAt ? (
											<div className="flex items-start gap-3 py-2">
												<AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="text-xs text-muted-foreground">SLA Breached</div>
													<div className="text-sm text-red-600">
														{formatResponseTime(escalation.slaDeadline, escalation.slaBrokenAt)}{" "}
														overdue
													</div>
												</div>
											</div>
										) : escalation.slaDeadline ? (
											<div className="flex items-start gap-3 py-2">
												<Clock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="text-xs text-muted-foreground">SLA Deadline</div>
													<div className="text-sm">{formatDateTime(escalation.slaDeadline)}</div>
												</div>
											</div>
										) : null}
										{escalation?.escalationSource && (
											<div className="flex items-start gap-3 py-1">
												<Lightbulb className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div className="flex-1 min-w-0">
													<div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
														Escalation Source
													</div>
													<div className="text-sm">
														{escalation.escalationSource === "user_request" &&
															"User requested help"}
														{escalation.escalationSource === "low_confidence" &&
															"AI confidence too low"}
														{escalation.escalationSource === "form" && "Form submission"}
													</div>
												</div>
											</div>
										)}
										{data.conversation.confidenceLevel && (
											<div className="flex items-start gap-3 py-1">
												{data.conversation.confidenceLevel === "high" && (
													<CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
												)}
												{data.conversation.confidenceLevel === "medium" && (
													<AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
												)}
												{data.conversation.confidenceLevel === "low" && (
													<AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
												)}
												<div className="flex-1 min-w-0">
													<div className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
														AI Confidence
													</div>
													<div className="flex items-center gap-2 text-sm">
														<span className="capitalize">{data.conversation.confidenceLevel}</span>
														{data.conversation.minConfidence !== null && (
															<span className="text-xs text-muted-foreground">
																({Math.round(data.conversation.minConfidence)}%)
															</span>
														)}
													</div>
												</div>
											</div>
										)}
									</div>
									{escalationHistory.length > 0 && (
										<div className="mt-4 bg-[#FAFAF9] p-4 -mx-6 px-6">
											<h4 className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-4 flex justify-between items-center">
												History{" "}
												<span className="bg-[#E5E5E5] px-1.5 rounded-sm text-[9px]">
													{escalationHistory.length}
												</span>
											</h4>
											<div className="space-y-3">
												{escalationHistory.map((item) => (
													<div
														key={item.id}
														className={cn(
															"relative py-1 pl-3 border-l-2",
															item.status === "resolved"
																? "border-green-500"
																: item.status === "open"
																	? "border-orange-400"
																	: "border-muted",
														)}
													>
														<div
															className={cn(
																"absolute -left-[5px] top-0 w-2.5 h-2.5 border-2 border-[#FAFAF9] rounded-full",
																item.status === "resolved"
																	? "bg-green-500"
																	: item.status === "open"
																		? "bg-orange-400"
																		: "bg-muted",
															)}
														/>
														<div
															className={cn(
																"text-xs font-bold mb-0.5",
																item.status === "resolved"
																	? "text-green-700"
																	: item.status === "open"
																		? "text-orange-700"
																		: "text-muted-foreground",
															)}
														>
															{item.status === "resolved"
																? "De-escalated"
																: `Escalated (${item.priority})`}
														</div>
														<div className="text-[10px] text-[#888] font-mono">
															{formatDateTime(item.escalatedAt)}
															{item.escalatedBy?.id && (
																<span className="ml-1">
																	by {item.escalatedBy.name || item.escalatedBy.email}
																</span>
															)}
															{!item.escalatedBy?.id &&
																item.escalationSource === "user_request" && (
																	<span className="ml-1">by widget user</span>
																)}
														</div>
														{item.status === "resolved" && item.resolvedBy?.id && (
															<div className="text-[10px] text-[#888] font-mono">
																De-escalated by {item.resolvedBy.name || item.resolvedBy.email}
															</div>
														)}
														{item.resolutionNote && (
															<div className="p-2 mt-1 text-xs border rounded bg-white/50">
																<span className="font-medium">Note:</span> {item.resolutionNote}
															</div>
														)}
													</div>
												))}
											</div>
										</div>
									)}
								</div>
							</>
						)}

						{/* Attention Guidance */}
						{conversationId && (
							<div className="px-6">
								<AttentionGuidanceSection
									conversationId={conversationId}
									channel={data.conversation.channel}
									needsAttention={data.conversation.needsAttention}
									resolution={data.conversation.resolution}
									minConfidence={data.conversation.minConfidence}
									confidenceLevel={data.conversation.confidenceLevel}
									escalation={escalation}
									status={data.conversation.status}
									escalationEnabled={escalationEnabled}
									onMarkImproved={handleMarkImproved}
									isMarkingImproved={isMarkingImproved}
								/>
							</div>
						)}

						{/* Other Conversations */}
						{data.user.email && data.otherConversations.length > 0 && (
							<>
								<Separator className="bg-[#F3F2EE]" />
								<div className="px-6">
									<Collapsible open={otherConvosOpen} onOpenChange={setOtherConvosOpen}>
										<CollapsibleTrigger className="w-full">
											<h4 className="font-mono text-[10px] uppercase tracking-widest text-[#888] mb-4 flex justify-between items-center">
												<span className="flex items-center gap-1.5">
													<MessageSquare size={12} />
													Other Conversations
												</span>
												<span className="flex items-center gap-2">
													<span className="bg-[#E5E5E5] dark:bg-zinc-700 px-1.5 rounded-sm text-[9px]">
														{data.otherConversations.length}
													</span>
													{otherConvosOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
												</span>
											</h4>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<div className="space-y-3">
												{data.otherConversations.map((conv) => (
													<button
														key={conv.id}
														type="button"
														onClick={() => onConversationSelect?.(conv.id)}
														className={cn(
															"relative py-1 pl-3 border-l-2 w-full text-left hover:bg-[#FAFAF9] dark:hover:bg-zinc-800 transition-colors group",
															conv.status === "open"
																? "border-green-500"
																: conv.status === "pending"
																	? "border-orange-400"
																	: "border-muted",
														)}
													>
														<div
															className={cn(
																"absolute -left-[5px] top-0 w-2.5 h-2.5 border-2 border-white dark:border-zinc-900 rounded-full",
																conv.status === "open"
																	? "bg-green-500"
																	: conv.status === "pending"
																		? "bg-orange-400"
																		: "bg-muted",
															)}
														/>
														<div
															className={cn(
																"text-xs font-bold mb-0.5 truncate group-hover:underline",
																conv.status === "open"
																	? "text-green-700 dark:text-green-400"
																	: conv.status === "pending"
																		? "text-orange-700 dark:text-orange-400"
																		: "text-muted-foreground",
															)}
														>
															{conv.title || "Untitled"}
														</div>
														<div className="text-[10px] text-[#888] dark:text-zinc-500 font-mono">
															{formatDate(conv.createdAt)}
															<span className="ml-2 uppercase">{getStatusLabel(conv.status)}</span>
														</div>
													</button>
												))}
											</div>
										</CollapsibleContent>
									</Collapsible>
								</div>
							</>
						)}

						{/* Internal Note */}

						<Separator className="bg-[#F3F2EE]" />
						<div className="px-6">
							<h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
								<StickyNote className="h-3.5 w-3.5" />
								Internal Note
							</h3>
							<Textarea
								value={internalNote}
								onChange={(e) => {
									setInternalNote(e.target.value);
									setNoteChanged(true);
								}}
								placeholder="Add a note about this conversation..."
								className="min-h-[80px] text-sm"
							/>
							{noteChanged && (
								<Button size="sm" onClick={handleNoteSave} disabled={noteSaving} className="mt-2">
									{noteSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null}
									Save
								</Button>
							)}
						</div>

						{/* Shopify Customer */}
						{data.shopify?.customer && (
							<>
								<Separator className="bg-[#F3F2EE]" />
								<div className="px-6">
									<h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
										<ShoppingBag className="h-3.5 w-3.5" />
										Shopify Customer
									</h3>
									<div className="space-y-1">
										<InfoRow icon={Mail} label="Email" value={data.shopify.customer.email} />
										<InfoRow icon={Phone} label="Phone" value={data.shopify.customer.phone} />
										<InfoRow
											icon={Package}
											label="Total Orders"
											value={data.shopify.customer.ordersCount?.toString()}
										/>
										<InfoRow
											icon={ShoppingBag}
											label="Lifetime Value"
											value={formatCurrency(
												data.shopify.customer.totalSpent,
												data.shopify.customer.currency,
											)}
										/>
										<InfoRow
											icon={Calendar}
											label="Customer Since"
											value={formatDate(data.shopify.customer.createdAt)}
										/>
										{data.shopify.customer.tags && data.shopify.customer.tags.length > 0 && (
											<div className="flex items-start gap-3 py-2">
												<Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div className="flex-1">
													<div className="text-xs text-muted-foreground">Tags</div>
													<div className="flex flex-wrap gap-1 mt-1">
														{data.shopify.customer.tags.map((tag) => (
															<Badge key={tag} variant="secondary" className="text-xs">
																{tag}
															</Badge>
														))}
													</div>
												</div>
											</div>
										)}
										{data.shopify.customer.note && (
											<div className="flex items-start gap-3 py-2">
												<MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
												<div className="flex-1">
													<div className="text-xs text-muted-foreground">Note</div>
													<div className="text-sm">{data.shopify.customer.note}</div>
												</div>
											</div>
										)}
									</div>
								</div>
							</>
						)}

						{/* Shopify Orders */}
						{data.shopify?.orders && data.shopify.orders.length > 0 && (
							<>
								<Separator className="bg-[#F3F2EE]" />
								<div className="px-6">
									<h3 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
										<Package className="h-3.5 w-3.5" />
										Recent Orders
									</h3>
									<div className="space-y-2">
										{data.shopify.orders.map((order) => (
											<div key={order.id} className="p-2.5 rounded-lg border bg-muted/30">
												<div className="flex items-center justify-between mb-2">
													<span className="text-sm font-medium">{order.orderNumber}</span>
													<span className="text-sm">
														{formatCurrency(order.totalPrice, order.currency)}
													</span>
												</div>
												<div className="flex flex-wrap items-center gap-2">
													<Badge
														variant="outline"
														className={cn("text-xs", getStatusColor(order.financialStatus))}
													>
														{order.financialStatus || "unknown"}
													</Badge>
													{order.fulfillmentStatus && (
														<Badge
															variant="outline"
															className={cn("text-xs", getStatusColor(order.fulfillmentStatus))}
														>
															{order.fulfillmentStatus}
														</Badge>
													)}
												</div>
												<div className="mt-2 text-xs text-muted-foreground">
													{formatDate(order.createdAt)}
												</div>
												{order.trackingUrl && (
													<a
														href={order.trackingUrl}
														target="_blank"
														rel="noopener noreferrer"
														className="flex items-center gap-1 mt-1 text-xs text-primary hover:underline"
													>
														Track shipment
														<ExternalLink className="w-3 h-3" />
													</a>
												)}
											</div>
										))}
									</div>
								</div>
							</>
						)}
					</div>
				) : null}
			</ScrollArea>
		</div>
	);
}
