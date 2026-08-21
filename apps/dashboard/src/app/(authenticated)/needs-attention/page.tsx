"use client";

import { PageHeader } from "@ansa/ui";
import {
	Activity,
	AlertOctagon,
	AlertTriangle,
	ArrowRight,
	CheckCircle2,
	ChevronRight,
	Copy,
	Database,
	ExternalLink,
	Eye,
	FileText,
	Info,
	Plus,
	Terminal,
	X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ClusterFilterBadge } from "@/components/cluster-filter-badge";
import { PremiumGate } from "@/components/premium-gate";
import { Button } from "@/components/ui/button";
import { Card, CardMetricHeader, CardSectionHeader, CardValue } from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTag, type StatusTagVariant } from "@/components/ui/status-tag";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { useClusterFilter } from "@/hooks/use-cluster-filter";
import { useAgent } from "@/lib/agent-context";
import {
	getAnalyticsLowConfidence,
	getAnalyticsTopQuestions,
	getClusterConfidence,
	getConversationCounts,
	getUnansweredQuestions,
	type UnansweredCluster,
} from "@/lib/api";

type Severity = "critical" | "at-risk" | "needs-review";

interface Issue {
	id: string;
	severity: Severity;
	title: string;
	description: string;
	impact: string;
	count: number;
	actionLabel: string;
	actionType: "sheet" | "link";
	actionTarget: string;
	conversationIds?: string[];
	questions?: Array<{ content: string; count: number }>;
}

export default function NeedsAttentionPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { clusterId, clusterInfo, clusterLoading, isValidClusterId } = useClusterFilter();
	const searchParams = useSearchParams();

	// Read date range and reason from URL params (passed from answer-quality page)
	const fromDate = searchParams.get("from") ?? undefined;
	const toDate = searchParams.get("to") ?? undefined;
	const reason = searchParams.get("reason");

	const [loading, setLoading] = useState(true);
	const [issues, setIssues] = useState<Issue[]>([]);
	const [clusters, setClusters] = useState<UnansweredCluster[]>([]);
	const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);

	useEffect(() => {
		if (!currentAgent) return;
		if (clusterId && !isValidClusterId) return;
		// Wait for cluster info to load if we have a cluster filter
		if (clusterId && clusterLoading) return;

		const fetchIssues = async () => {
			setLoading(true);
			// Use cluster's agentId if available (cluster may belong to different agent than currently selected)
			const effectiveAgentId = clusterInfo?.agentId || currentAgent.id;
			try {
				// Fetch all data in parallel, using date range if provided from answer-quality page
				const [counts, lowConfidenceData, topQuestions, unansweredData] = await Promise.all([
					getConversationCounts(effectiveAgentId, clusterId ?? undefined),
					getAnalyticsLowConfidence(effectiveAgentId, fromDate, toDate, clusterId ?? undefined),
					getAnalyticsTopQuestions(effectiveAgentId, fromDate, toDate, 10, clusterId ?? undefined),
					getUnansweredQuestions(effectiveAgentId, fromDate, toDate, clusterId ?? undefined),
				]);

				// If coming from answer-quality with a low-confidence cluster, also fetch cluster confidence stats
				let clusterConfidenceData = null;
				if (clusterId && reason === "low-confidence-cluster") {
					try {
						clusterConfidenceData = await getClusterConfidence(clusterId, fromDate, toDate);
					} catch (err) {
						console.error("Failed to fetch cluster confidence:", err);
					}
				}

				// Sort clusters by priority and limit to 10
				const priorityOrder = { high: 0, medium: 1, low: 2 };
				const sortedClusters = [...unansweredData.clusters]
					.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
					.slice(0, 10);
				setClusters(sortedClusters);

				const derivedIssues: Issue[] = [];

				// Issue 1: Escalated conversations
				if (counts.escalated > 0) {
					derivedIssues.push({
						id: "escalated",
						severity:
							counts.escalated >= 10
								? "critical"
								: counts.escalated >= 5
									? "at-risk"
									: "needs-review",
						title: "Escalated conversations require attention",
						description: `${counts.escalated} conversation${counts.escalated !== 1 ? "s" : ""} have been escalated and need human attention.`,
						impact: "Blocking customer resolutions",
						count: counts.escalated,
						actionLabel: "View Escalations",
						actionType: "link",
						actionTarget: `/conversations?tab=escalated${isValidClusterId && clusterId ? `&cluster=${clusterId}` : ""}`,
					});
				}

				// Issue 2: Low confidence questions (from standard API)
				if (lowConfidenceData.lowConfidenceCount > 0) {
					derivedIssues.push({
						id: "low-confidence",
						severity:
							lowConfidenceData.lowConfidenceCount >= 10
								? "critical"
								: lowConfidenceData.lowConfidenceCount >= 5
									? "at-risk"
									: "needs-review",
						title: "Questions with low confidence answers",
						description: `${lowConfidenceData.lowConfidenceCount} question${lowConfidenceData.lowConfidenceCount !== 1 ? "s" : ""} received low confidence responses from the AI.`,
						impact: "Degrading answer quality",
						count: lowConfidenceData.lowConfidenceCount,
						actionLabel: "Improve Answers",
						actionType: "sheet",
						actionTarget: "low-confidence-detail",
						conversationIds: lowConfidenceData.conversationIds,
					});
				} else if (
					// If no low confidence from standard API but we have cluster confidence data showing issues
					clusterConfidenceData &&
					clusterConfidenceData.avgConfidence !== null &&
					clusterConfidenceData.avgConfidence < 70 &&
					clusterConfidenceData.volume > 0
				) {
					// Add an issue based on cluster confidence data
					derivedIssues.push({
						id: "low-confidence-cluster",
						severity:
							clusterConfidenceData.avgConfidence < 40
								? "critical"
								: clusterConfidenceData.avgConfidence < 55
									? "at-risk"
									: "needs-review",
						title: "Low confidence answer cluster",
						description: `This question cluster has an average confidence of ${clusterConfidenceData.avgConfidence}% across ${clusterConfidenceData.volume} response${clusterConfidenceData.volume !== 1 ? "s" : ""}.`,
						impact: "Degrading answer quality for this topic",
						count: clusterConfidenceData.volume,
						actionLabel: "View Conversations",
						actionType: "link",
						actionTarget: `/conversations?cluster=${clusterId}`,
						conversationIds: clusterConfidenceData.conversationIds,
					});
				} else if (
					// Fallback: If we came from answer-quality page with low-confidence reason but no specific issues found,
					// still show a helpful issue to investigate the cluster
					reason === "low-confidence-cluster" &&
					clusterId
				) {
					derivedIssues.push({
						id: "investigate-cluster",
						severity: "needs-review",
						title: "Review this question cluster",
						description:
							"This cluster was flagged for low confidence answers. Review conversations to identify knowledge gaps.",
						impact: "Potential answer quality issues",
						count: clusterConfidenceData?.volume || 0,
						actionLabel: "View Conversations",
						actionType: "link",
						actionTarget: `/conversations?cluster=${clusterId}`,
						conversationIds: clusterConfidenceData?.conversationIds || [],
					});
				}

				// Issue 3: Unanswered / recurring questions (no knowledge coverage)
				const recurringUnanswered = topQuestions.questions.filter((q) => q.count >= 3);
				if (recurringUnanswered.length > 0) {
					const totalCount = recurringUnanswered.reduce((sum, q) => sum + q.count, 0);
					derivedIssues.push({
						id: "knowledge-gaps",
						severity: totalCount >= 15 ? "critical" : totalCount >= 8 ? "at-risk" : "needs-review",
						title: "Knowledge gaps detected",
						description: `${recurringUnanswered.length} question pattern${recurringUnanswered.length !== 1 ? "s" : ""} are being asked repeatedly.`,
						impact: "High volume without clear answers",
						count: totalCount,
						actionLabel: "Add Knowledge",
						actionType: "sheet",
						actionTarget: "knowledge-gaps-detail",
						questions: recurringUnanswered,
					});
				}

				// Sort by severity (critical first), then by count
				const severityOrder: Record<Severity, number> = {
					critical: 0,
					"at-risk": 1,
					"needs-review": 2,
				};
				derivedIssues.sort(
					(a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.count - a.count,
				);

				setIssues(derivedIssues);
			} catch (error) {
				console.error("Failed to fetch issues:", error);
			} finally {
				setLoading(false);
			}
		};

		fetchIssues();
	}, [
		currentAgent,
		clusterId,
		isValidClusterId,
		fromDate,
		toDate,
		reason,
		clusterInfo,
		clusterLoading,
	]);

	const severityCounts = useMemo(() => {
		return {
			critical: issues.filter((i) => i.severity === "critical").length,
			atRisk: issues.filter((i) => i.severity === "at-risk").length,
			needsReview: issues.filter((i) => i.severity === "needs-review").length,
		};
	}, [issues]);

	const handleIssueAction = (issue: Issue) => {
		if (issue.actionType === "sheet") {
			setSelectedIssue(issue);
			setSheetOpen(true);
		}
		// Link actions are handled by the Link component
	};

	const getSeverityIcon = (severity: Severity) => {
		switch (severity) {
			case "critical":
				return <AlertTriangle className="w-4 h-4" />;
			case "at-risk":
				return <Info className="w-4 h-4" />;
			case "needs-review":
				return <CheckCircle2 className="w-4 h-4" />;
		}
	};

	const getSeverityVariant = (severity: Severity): StatusTagVariant => {
		switch (severity) {
			case "critical":
				return "critical";
			case "at-risk":
				return "warning";
			case "needs-review":
				return "info";
		}
	};

	const getSeverityLabel = (severity: Severity): string => {
		switch (severity) {
			case "critical":
				return "Critical";
			case "at-risk":
				return "At Risk";
			case "needs-review":
				return "Needs Review";
		}
	};

	if (loading) {
		return (
			<div className="flex flex-col gap-6 p-6">
				<div className="space-y-2">
					<Skeleton className="w-64 h-8" />
					<Skeleton className="h-4 w-96" />
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
				<Skeleton className="h-96" />
			</div>
		);
	}

	if (issues.length === 0) {
		return (
			<div className="flex flex-col min-h-screen">
				<PageHeader
					title="Needs Attention"
					subtitle={
						isValidClusterId && clusterInfo
							? `Issues for cluster: "${clusterInfo.representativeQuestion}"`
							: "Issues currently hurting AI performance and outcomes"
					}
					icon={<AlertTriangle size={12} />}
				/>
				<div className="p-6">
					{isValidClusterId && (
						<div className="flex items-center gap-2 mb-4">
							<ClusterFilterBadge
								clusterInfo={clusterInfo}
								loading={clusterLoading}
								clearUrl="/needs-attention"
							/>
						</div>
					)}
					<Empty className="my-16">
						<EmptyContent>
							<EmptyMedia variant="icon">
								<CheckCircle2 />
							</EmptyMedia>
							<EmptyTitle>
								{isValidClusterId ? "No issues in this cluster" : "Nothing needs attention"}
							</EmptyTitle>
							<EmptyDescription>
								{isValidClusterId && reason
									? `This cluster was flagged for low confidence answers${fromDate && toDate ? ` between ${fromDate} and ${toDate}` : ""}, but no actionable issues were found. The AI may have already improved, or the questions don't meet the threshold for attention.`
									: isValidClusterId
										? "This question cluster has no items requiring attention."
										: "Your AI is performing well. No critical issues detected at this time."}
							</EmptyDescription>
							{isValidClusterId && reason && (
								<Button asChild className="mt-4" variant="outline">
									<Link href="/answer-quality">Back to Answer Quality</Link>
								</Button>
							)}
							<Button
								asChild
								className={reason ? "mt-2" : "mt-4"}
								variant={isValidClusterId && !reason ? "outline" : "default"}
							>
								<Link href={isValidClusterId ? "/needs-attention" : "/analytics"}>
									{isValidClusterId ? "View All Issues" : "View AI Performance"}
								</Link>
							</Button>
						</EmptyContent>
					</Empty>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen">
			<PageHeader
				title="Needs Attention"
				subtitle={
					isValidClusterId && clusterInfo
						? `Issues for cluster: "${clusterInfo.representativeQuestion}"`
						: "Issues currently hurting AI performance and outcomes"
				}
				icon={<AlertTriangle size={12} />}
			/>

			<div className="p-6">
				{isValidClusterId && (
					<div className="flex items-center gap-2 mb-4">
						<ClusterFilterBadge
							clusterInfo={clusterInfo}
							loading={clusterLoading}
							clearUrl="/needs-attention"
						/>
					</div>
				)}

				<PremiumGate feature="analytics">
					{/* Summary Cards */}
					<div className="grid gap-4 md:grid-cols-3">
						<Card variant="metric" className="border-l-4 border-l-red-500">
							<CardMetricHeader label="Critical Issues" icon={AlertTriangle} />
							<CardValue>{severityCounts.critical}</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								Blocking resolutions or conversions
							</div>
						</Card>

						<Card variant="metric">
							<CardMetricHeader label="At Risk" icon={Info} />
							<CardValue>{severityCounts.atRisk}</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								Degrading performance trends
							</div>
						</Card>

						<Card variant="metric">
							<CardMetricHeader label="Needs Review" icon={CheckCircle2} />
							<CardValue>{severityCounts.needsReview}</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								Early warning signals
							</div>
						</Card>
					</div>

					{/* Issues Table */}
					<div className="mt-6">
						<Card variant="section" className="overflow-hidden">
							<CardSectionHeader title="Prioritized Issues" icon={AlertTriangle} />
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="w-[100px]">Severity</TableHead>
										<TableHead>Issue</TableHead>
										<TableHead>Impact</TableHead>
										<TableHead className="text-right">Action</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{issues.map((issue) => (
										<TableRow key={issue.id}>
											<TableCell>
												<StatusTag
													status={getSeverityVariant(issue.severity)}
													label={getSeverityLabel(issue.severity)}
													icon={getSeverityIcon(issue.severity)}
												/>
											</TableCell>
											<TableCell>
												<div className="flex flex-col gap-1">
													<span className="font-medium">{issue.title}</span>
													<span className="text-sm text-muted-foreground">{issue.description}</span>
												</div>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{issue.impact}
											</TableCell>
											<TableCell className="text-right">
												<div className="flex justify-end">
													{issue.actionType === "link" ? (
														<Button asChild size="sm">
															<Link href={issue.actionTarget}>{issue.actionLabel}</Link>
														</Button>
													) : (
														<Button size="sm" onClick={() => handleIssueAction(issue)}>
															{issue.actionLabel}
														</Button>
													)}
												</div>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</Card>

						{/* Common Issues (Clusters) */}
						{!isValidClusterId && (
							<div className="mt-6">
								<Card variant="section" className="overflow-hidden">
									<CardSectionHeader title="Common Issues" icon={Info} />
									<div className="p-4">
										{loading ? (
											<div className="space-y-3">
												<Skeleton className="w-full h-16" />
												<Skeleton className="w-full h-16" />
												<Skeleton className="w-full h-16" />
											</div>
										) : clusters.length === 0 ? (
											<p className="text-sm text-muted-foreground">No clusters available</p>
										) : (
											<div className="space-y-2">
												{clusters.map((cluster) => (
													<Link
														key={cluster.clusterId}
														href={`/needs-attention?cluster=${cluster.clusterId}`}
														className="block w-full p-3 text-left transition-colors border rounded-lg hover:bg-muted/50"
													>
														<div className="flex items-start justify-between gap-3">
															<div className="flex-1 min-w-0">
																<div className="text-sm font-medium truncate">
																	{cluster.representativeQuestion}
																</div>
																<div className="flex items-center gap-2 mt-1">
																	<StatusTag
																		status={
																			cluster.priority === "high"
																				? "critical"
																				: cluster.priority === "medium"
																					? "warning"
																					: "info"
																		}
																		label={cluster.priority}
																	/>
																	<span className="text-xs text-muted-foreground">
																		{cluster.volume} questions
																	</span>
																</div>
															</div>
															<ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
														</div>
													</Link>
												))}
											</div>
										)}
									</div>
								</Card>
							</div>
						)}

						{/* Issue Detail Sheet */}
						<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
							<SheetContent className="p-0 overflow-y-auto bg-[#F3F2EE] border-l border-[#D1D1D1] sm:max-w-[500px]">
								{selectedIssue && (
									<div className="flex flex-col h-full font-sans text-[#1A1A1A]">
										{/* --- 1. DIAGNOSTIC HEADER --- */}
										<div className="h-16 bg-white border-b border-[#D1D1D1] flex items-center justify-between px-6 flex-shrink-0">
											<div className="flex items-center gap-3">
												<div
													className={`p-1.5 flex items-center justify-center border ${
														selectedIssue.severity === "critical"
															? "bg-red-50 text-red-600 border-red-200"
															: selectedIssue.severity === "at-risk"
																? "bg-amber-50 text-amber-600 border-amber-200"
																: "bg-blue-50 text-blue-600 border-blue-200"
													}`}
												>
													<AlertOctagon size={16} />
												</div>
												<div>
													<div className="flex items-center gap-2 mb-0.5">
														<span className="text-sm font-bold tracking-wide uppercase">
															Diagnostic Report
														</span>
														<span
															className={`text-[9px] font-mono text-white px-1.5 py-0.5 ${
																selectedIssue.severity === "critical"
																	? "bg-red-600"
																	: selectedIssue.severity === "at-risk"
																		? "bg-amber-600"
																		: "bg-blue-600"
															}`}
														>
															{getSeverityLabel(selectedIssue.severity).toUpperCase()}
														</span>
													</div>
													<div className="font-mono text-[9px] text-[#888]">
														ID: {selectedIssue.id.toUpperCase()}
													</div>
												</div>
											</div>
											<button
												type="button"
												onClick={() => setSheetOpen(false)}
												className="w-8 h-8 flex items-center justify-center border border-transparent hover:border-[#D1D1D1] hover:bg-[#FAFAF9] transition-all"
											>
												<X size={16} />
											</button>
										</div>

										{/* --- 2. SCROLLABLE CONTENT --- */}
										<div className="flex-1 p-6 space-y-6 overflow-y-auto">
											{/* Context Block */}
											<div className="bg-white border border-[#D1D1D1] p-5 shadow-sm">
												<div className="flex items-center gap-2 mb-2 text-[10px] font-mono uppercase text-[#888]">
													<Terminal size={12} /> System Analysis
												</div>
												<h3 className="mb-2 text-lg font-medium leading-tight">
													{selectedIssue.title}
												</h3>
												<p className="text-xs text-[#555] leading-relaxed border-l-2 border-[#F3F2EE] pl-3">
													{selectedIssue.id === "low-confidence" &&
														"The generative model is producing answers with confidence scores below the safety threshold (<70%). This indicates potential hallucinations or vague responses."}
													{selectedIssue.id === "knowledge-gaps" &&
														'Multiple customers are asking similar questions repeatedly, but the AI lacks clear, confident source material. This creates a "resolution void" in the conversation flow.'}
												</p>
											</div>

											{/* Metrics Grid */}
											<div className="grid grid-cols-2 gap-4">
												<div className="bg-[#FAFAF9] border border-[#D1D1D1] p-3">
													<div className="text-[9px] font-mono uppercase text-[#888] mb-1">
														{selectedIssue.id === "low-confidence"
															? "Total Incidents"
															: "Total Occurrences"}
													</div>
													<div className="font-mono text-xl font-bold">{selectedIssue.count}</div>
												</div>
												<div className="bg-[#FAFAF9] border border-[#D1D1D1] p-3">
													<div className="text-[9px] font-mono uppercase text-[#888] mb-1">
														{selectedIssue.id === "low-confidence"
															? "Quality Impact"
															: "System Impact"}
													</div>
													<div
														className={`font-mono font-bold ${
															selectedIssue.id === "low-confidence"
																? "text-sm mt-1 text-orange-600 uppercase"
																: `text-sm mt-1 ${
																		selectedIssue.severity === "critical"
																			? "text-red-600"
																			: selectedIssue.severity === "at-risk"
																				? "text-amber-600"
																				: "text-blue-600"
																	} uppercase`
														}`}
													>
														{selectedIssue.id === "low-confidence"
															? "DEGRADING_QUALITY"
															: selectedIssue.id === "escalated"
																? "BLOCKING_RESOLUTIONS"
																: selectedIssue.id === "knowledge-gaps"
																	? "HIGH_VOLUME_NO_ANSWERS"
																	: selectedIssue.impact.toUpperCase().replace(/ /g, "_")}
													</div>
												</div>
											</div>

											{/* Pattern Trace Table - for knowledge gaps */}
											{selectedIssue.questions && selectedIssue.questions.length > 0 && (
												<div>
													<div className="flex items-center justify-between mb-3">
														<div className="text-[10px] font-mono uppercase text-[#888] flex items-center gap-2">
															<Activity size={12} /> Pattern Trace Log
														</div>
														<span className="text-[9px] font-mono text-[#888]">
															{selectedIssue.questions.length} CLUSTERS FOUND
														</span>
													</div>

													<div className="bg-white border border-[#D1D1D1] shadow-sm">
														<div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#FAFAF9] border-b border-[#F3F2EE] text-[9px] font-mono uppercase tracking-widest text-[#888]">
															<div className="col-span-9">Query Pattern</div>
															<div className="col-span-3 text-right">Frequency</div>
														</div>

														{selectedIssue.questions.slice(0, 7).map((q) => (
															<Link
																key={q.content}
																href={`/ai-knowledge/qa?question=${encodeURIComponent(q.content)}`}
																className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#F3F2EE] last:border-0 hover:bg-[#FEFCE8] transition-colors group cursor-pointer"
															>
																<div className="col-span-9 font-mono text-xs text-[#1A1A1A] truncate flex items-center gap-2">
																	{q.content}
																	<span className="opacity-0 group-hover:opacity-100 text-[#CCC] hover:text-[#1A1A1A]">
																		<Copy size={10} />
																	</span>
																</div>
																<div className="col-span-3 text-xs font-bold text-right">
																	{q.count}
																</div>
															</Link>
														))}
													</div>
												</div>
											)}

											{/* Session Trace Log - for low confidence */}
											{selectedIssue.conversationIds &&
												selectedIssue.conversationIds.length > 0 && (
													<div>
														<div className="flex items-center justify-between mb-3">
															<div className="text-[10px] font-mono uppercase text-[#888] flex items-center gap-2">
																<Activity size={12} /> Affected Session Trace
															</div>
															<Link
																href={`/conversations?confidence=low${isValidClusterId && clusterId ? `&cluster=${clusterId}` : ""}`}
																className="text-[9px] font-bold uppercase text-[#1A1A1A] flex items-center gap-1 hover:underline"
															>
																View All {selectedIssue.conversationIds.length}{" "}
																<ArrowRight size={8} />
															</Link>
														</div>

														<div className="bg-white border border-[#D1D1D1] shadow-sm">
															<div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#FAFAF9] border-b border-[#F3F2EE] text-[9px] font-mono uppercase tracking-widest text-[#888]">
																<div className="col-span-6">Session ID</div>
																<div className="col-span-3 text-center">Status</div>
																<div className="col-span-3 text-right">Audit</div>
															</div>

															{selectedIssue.conversationIds.slice(0, 5).map((id) => (
																<Link
																	key={id}
																	href={`/conversations/${id}${isValidClusterId && clusterId ? `?cluster=${clusterId}` : ""}`}
																	className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-[#F3F2EE] last:border-0 hover:bg-[#FEFCE8] transition-colors group cursor-pointer items-center"
																>
																	<div className="col-span-6 font-mono text-xs text-[#1A1A1A] flex items-center gap-2">
																		<FileText size={10} className="text-[#CCC]" />
																		sess_{id.slice(0, 8)}
																	</div>
																	<div className="col-span-3 flex justify-center">
																		<span className="text-[9px] font-bold font-mono bg-red-50 text-red-600 border border-red-100 px-1.5">
																			LOW
																		</span>
																	</div>
																	<div className="col-span-3 flex justify-end">
																		<span className="opacity-0 group-hover:opacity-100 text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white p-1 transition-all">
																			<ExternalLink size={10} />
																		</span>
																	</div>
																</Link>
															))}
														</div>
													</div>
												)}
										</div>

										{/* --- 3. ACTION FOOTER --- */}
										<div className="p-5 border-t border-[#D1D1D1] bg-white z-10">
											{selectedIssue.id === "knowledge-gaps" && (
												<div className="flex items-start gap-3 mb-4">
													<div className="mt-0.5 text-[#1A1A1A]">
														<Database size={14} />
													</div>
													<div>
														<div className="text-xs font-bold uppercase mb-0.5">
															Recommended Resolution
														</div>
														<p className="text-[10px] text-[#555] max-w-sm">
															Create a new knowledge base entry addressing these specific query
															patterns to resolve the gap.
														</p>
													</div>
												</div>
											)}

											{selectedIssue.id === "knowledge-gaps" && (
												<Button
													asChild
													className="w-full bg-[#1A1A1A] text-white h-11 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none"
												>
													<Link
														href={
															selectedIssue.questions && selectedIssue.questions.length > 0
																? `/ai-knowledge/qa?question=${encodeURIComponent(selectedIssue.questions[0].content)}`
																: "/ai-knowledge/qa"
														}
													>
														<Plus size={14} /> Initialize Knowledge Patch
													</Link>
												</Button>
											)}

											{selectedIssue.id === "low-confidence" && (
												<div className="space-y-3">
													<div className="flex items-center gap-2 text-[10px] font-mono uppercase text-[#888]">
														<Terminal size={10} /> Remediation Protocols
													</div>

													<Button
														asChild
														className="w-full bg-[#1A1A1A] text-white h-11 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none"
													>
														<Link
															href={`/conversations?tab=low-confidence${isValidClusterId && clusterId ? `&cluster=${clusterId}` : ""}`}
														>
															<Eye size={14} /> Batch Review Protocol
														</Link>
													</Button>

													<Button
														asChild
														variant="outline"
														className="w-full bg-white text-[#1A1A1A] border border-[#D1D1D1] h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#F3F2EE] hover:border-[#888] transition-colors flex items-center justify-center gap-2"
													>
														<Link href="/ai-knowledge">
															<Plus size={14} /> Inject Knowledge Patch
														</Link>
													</Button>
												</div>
											)}
										</div>
									</div>
								)}
							</SheetContent>
						</Sheet>
					</div>
				</PremiumGate>
			</div>
		</div>
	);
}
