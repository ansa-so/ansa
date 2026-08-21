"use client";

import { PageHeader, SectionHeader } from "@ansa/ui";
import {
	AlertCircle,
	CheckCircle,
	ChevronRight,
	Clock,
	HelpCircle,
	Lightbulb,
	ListChecks,
	Target,
	Users,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Card, CardMetricHeader, CardValue, SectionCard } from "@/components/analytics/brutalist";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { PremiumGate } from "@/components/premium-gate";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusTag } from "@/components/ui/status-tag";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgent } from "@/lib/agent-context";
import { getResolutionsData, type ResolutionsData } from "@/lib/api";
import { formatTimeToResolution } from "@/lib/utils";

export default function ResolutionsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const router = useRouter();
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState<ResolutionsData | null>(null);
	const [selectedCluster, setSelectedCluster] = useState<
		ResolutionsData["clusterBreakdown"][0] | null
	>(null);

	const getDateRange = useCallback((range: DateRange) => {
		const end = new Date();
		const start = new Date();
		const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : 90;
		start.setDate(start.getDate() - daysBack);
		return {
			startDate: start.toISOString().split("T")[0],
			endDate: end.toISOString().split("T")[0],
		};
	}, []);

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;

		setIsLoading(true);
		try {
			const { startDate, endDate } = getDateRange(dateRange);
			const result = await getResolutionsData(currentAgent.id, startDate, endDate);
			setData(result);
		} catch (error) {
			console.error("Failed to fetch resolutions data:", error);
		} finally {
			setIsLoading(false);
		}
	}, [currentAgent, dateRange, getDateRange]);

	useEffect(() => {
		if (currentAgent) {
			fetchData();
		}
	}, [currentAgent, fetchData]);

	const formatPercentage = (value: number) => {
		return `${Math.round(value)}%`;
	};

	const calculateTrend = (current: number, previous: number) => {
		if (previous === 0) return undefined;
		const percentChange = ((current - previous) / previous) * 100;
		if (Math.abs(percentChange) < 0.5) return undefined;
		return `${percentChange > 0 ? "+" : ""}${percentChange.toFixed(0)}%`;
	};

	const getStatusVariant = (status: "healthy" | "ok" | "at-risk") => {
		switch (status) {
			case "healthy":
				return "high";
			case "ok":
				return "medium";
			case "at-risk":
				return "low";
		}
	};

	const navigateWithFilter = (filter: string) => {
		router.push(`/conversations?${filter}`);
	};

	if (agentLoading) {
		return (
			<div className="min-h-screen">
				<PageHeader title="Resolutions" subtitle="Loading..." icon={<CheckCircle size={12} />} />
				<div className="p-8 space-y-8">
					<div className="grid gap-4 md:grid-cols-4">
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
					</div>
				</div>
			</div>
		);
	}

	if (!currentAgent) {
		return (
			<div className="flex items-center justify-center h-full">
				<Text>No agent selected</Text>
			</div>
		);
	}

	return (
		<>
			{/* Action Inspection Sheet */}
			<Sheet open={!!selectedCluster} onOpenChange={(open) => !open && setSelectedCluster(null)}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>Actions Used</SheetTitle>
						<SheetDescription>
							Resolution actions executed for: {selectedCluster?.label}
						</SheetDescription>
					</SheetHeader>
					<div className="mt-6">
						{selectedCluster?.actions && selectedCluster.actions.length > 0 ? (
							<>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Action Name</TableHead>
											<TableHead className="text-right">Executions</TableHead>
											<TableHead className="text-right">Success Rate</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{selectedCluster.actions.map((action, idx) => (
											<TableRow key={idx}>
												<TableCell className="font-medium">{action.actionName}</TableCell>
												<TableCell className="text-right">{action.executionCount}</TableCell>
												<TableCell className="text-right">
													{formatPercentage(action.successRate)}
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
								<div className="mt-6">
									<Text size="sm" className="mb-2 font-medium">
										Recent Examples
									</Text>
									<Text size="xs" className="text-muted-foreground">
										View recently resolved conversations using these actions
									</Text>
									<Button
										variant="outline"
										size="sm"
										className="mt-3"
										onClick={() => {
											setSelectedCluster(null);
											navigateWithFilter(
												`resolved=true&cluster=${selectedCluster?.clusterId || ""}`,
											);
										}}
									>
										View conversations
									</Button>
								</div>
							</>
						) : (
							<Text size="sm" className="text-muted-foreground">
								No actions executed for this cluster
							</Text>
						)}
					</div>
				</SheetContent>
			</Sheet>

			<div className="min-h-screen">
				<PageHeader
					title="Resolutions"
					subtitle="Conversations that concluded successfully without escalation"
					icon={<CheckCircle size={12} />}
					action={
						<DateRangeSelector value={dateRange} onChange={setDateRange} disabled={isLoading} />
					}
				/>

				<div className="p-8">
					{isLoading ? (
						<div className="grid gap-4 md:grid-cols-3">
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
						</div>
					) : data?.kpis.resolvedCount === 0 ? (
						<Empty>
							<EmptyMedia variant="icon">
								<AlertCircle className="w-6 h-6" />
							</EmptyMedia>
							<EmptyContent>
								<EmptyTitle>No resolutions yet</EmptyTitle>
								<EmptyDescription>
									Conversations aren't closing successfully without follow-ups or escalation in this
									period. Review AI performance to identify improvement opportunities.
								</EmptyDescription>
								<Button asChild className="mt-4">
									<Link href={`/needs-attention`}>View AI Performance</Link>
								</Button>
							</EmptyContent>
						</Empty>
					) : (
						<PremiumGate feature="analytics">
							<div className="space-y-8">
								{/* Section 1: KPI Cards */}
								<section>
									<SectionHeader title="Key Metrics" />
									<div className="grid gap-4 md:grid-cols-3">
										<Card variant="metric">
											<CardMetricHeader
												label="Resolved Conversations"
												icon={CheckCircle}
												trend={calculateTrend(
													data?.kpis.resolvedCount || 0,
													data?.kpis.previousResolvedCount || 0,
												)}
											/>
											<CardValue>{data?.kpis.resolvedCount || 0}</CardValue>
										</Card>

										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div>
														<Card variant="metric">
															<CardMetricHeader
																label="Resolution Rate"
																icon={Target}
																trend={calculateTrend(
																	data?.kpis.resolutionRate || 0,
																	data?.kpis.previousResolutionRate || 0,
																)}
															/>
															<CardValue>
																{formatPercentage(data?.kpis.resolutionRate || 0)}
															</CardValue>
														</Card>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p className="max-w-xs">
														Percentage of conversations with meaningful questions that were resolved
														without escalation or follow-up
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>

										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div>
														<Card variant="metric">
															<CardMetricHeader label="Avg Time to Resolution" icon={Clock} />
															<CardValue>
																{formatTimeToResolution(data?.kpis.avgTimeToResolution || 0)}
															</CardValue>
														</Card>
													</div>
												</TooltipTrigger>
												<TooltipContent>
													<p className="max-w-xs">
														Average time from the last meaningful question to successful resolution
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
								</section>

								{/* Section 2: Questions & Resolution (Cluster table) */}
								{data?.clusterBreakdown && data.clusterBreakdown.length > 0 && (
									<section>
										<SectionHeader title="Question Analysis" />
										<SectionCard title="Questions & Resolution" icon={HelpCircle}>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Question</TableHead>
														<TableHead className="text-right">Volume</TableHead>
														<TableHead className="text-right">Resolution Rate</TableHead>
														<TableHead className="text-center">Status</TableHead>
														<TableHead className="text-right">Actions</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{data.clusterBreakdown.map((cluster, idx) => (
														<TableRow key={idx}>
															<TableCell className="max-w-md">
																<Text className="font-medium truncate">{cluster.label}</Text>
															</TableCell>
															<TableCell className="text-right">{cluster.volume}</TableCell>
															<TableCell className="text-right">
																{formatPercentage(cluster.resolutionRate)}
															</TableCell>
															<TableCell className="text-center">
																<StatusTag
																	status={getStatusVariant(cluster.status)}
																	label={
																		cluster.status === "healthy"
																			? "Healthy"
																			: cluster.status === "ok"
																				? "OK"
																				: "At risk"
																	}
																/>
															</TableCell>
															<TableCell className="text-right">
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button variant="ghost" size="sm">
																			Actions
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={() =>
																				navigateWithFilter(`cluster=${cluster.clusterId || ""}`)
																			}
																		>
																			View conversations
																		</DropdownMenuItem>
																		<DropdownMenuItem asChild>
																			<Link
																				href={`/conversations/needs-attention?cluster=${cluster.clusterId || ""}`}
																			>
																				Improve answers
																			</Link>
																		</DropdownMenuItem>
																		<DropdownMenuItem asChild>
																			<Link href={`/ai-knowledge/qa?question=${cluster.label}`}>
																				Add knowledge
																			</Link>
																		</DropdownMenuItem>
																		<DropdownMenuItem onClick={() => setSelectedCluster(cluster)}>
																			Inspect actions
																		</DropdownMenuItem>
																	</DropdownMenuContent>
																</DropdownMenu>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</SectionCard>
									</section>
								)}

								{/* Section 4 & 5: Unresolved Reasons and Answer Confidence vs Resolution */}
								<section>
									<SectionHeader title="Resolution Breakdown" />
									<div className="grid gap-6 md:grid-cols-2">
										{data?.unresolvedReasons && (
											<SectionCard title="Unresolved Reasons" icon={XCircle}>
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Reason</TableHead>
															<TableHead className="text-right">Count</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{data.unresolvedReasons.lowConfidence > 0 && (
															<TableRow
																className="cursor-pointer hover:bg-muted/50"
																onClick={() => navigateWithFilter("confidence=low")}
															>
																<TableCell className="font-medium">Low confidence answer</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-2">
																		{data.unresolvedReasons.lowConfidence}
																		<ChevronRight className="w-4 h-4 text-muted-foreground" />
																	</div>
																</TableCell>
															</TableRow>
														)}
														{data.unresolvedReasons.noActionSucceeded > 0 && (
															<TableRow
																className="cursor-pointer hover:bg-muted/50"
																onClick={() => navigateWithFilter("action_failed=true")}
															>
																<TableCell className="font-medium">No action succeeded</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-2">
																		{data.unresolvedReasons.noActionSucceeded}
																		<ChevronRight className="w-4 h-4 text-muted-foreground" />
																	</div>
																</TableCell>
															</TableRow>
														)}
														{data.unresolvedReasons.userFollowUp > 0 && (
															<TableRow
																className="cursor-pointer hover:bg-muted/50"
																onClick={() => navigateWithFilter("has_followup=true")}
															>
																<TableCell className="font-medium">
																	User follow-up occurred
																</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-2">
																		{data.unresolvedReasons.userFollowUp}
																		<ChevronRight className="w-4 h-4 text-muted-foreground" />
																	</div>
																</TableCell>
															</TableRow>
														)}
														{data.unresolvedReasons.escalated > 0 && (
															<TableRow
																className="cursor-pointer hover:bg-muted/50"
																onClick={() => navigateWithFilter("escalated=true")}
															>
																<TableCell className="font-medium">Escalated to human</TableCell>
																<TableCell className="text-right">
																	<div className="flex items-center justify-end gap-2">
																		{data.unresolvedReasons.escalated}
																		<ChevronRight className="w-4 h-4 text-muted-foreground" />
																	</div>
																</TableCell>
															</TableRow>
														)}
													</TableBody>
												</Table>
											</SectionCard>
										)}

										{data?.confidenceBreakdown && data.confidenceBreakdown.length > 0 && (
											<SectionCard title="Answer Confidence vs Resolution" icon={Target}>
												<Table>
													<TableHeader>
														<TableRow>
															<TableHead>Confidence Range</TableHead>
															<TableHead className="text-right">Count</TableHead>
															<TableHead className="text-right">Resolution Rate</TableHead>
														</TableRow>
													</TableHeader>
													<TableBody>
														{data.confidenceBreakdown.map((item, idx) => (
															<TableRow key={idx}>
																<TableCell className="font-medium">{item.label}</TableCell>
																<TableCell className="text-right">{item.count}</TableCell>
																<TableCell className="text-right">
																	{formatPercentage(item.resolutionRate)}
																</TableCell>
															</TableRow>
														))}
													</TableBody>
												</Table>
											</SectionCard>
										)}
									</div>
								</section>

								{/* Section 6: Recently Resolved */}
								{data?.recentlyResolved && data.recentlyResolved.length > 0 && (
									<section>
										<SectionHeader title="Recent Activity" />
										<SectionCard title="Recently Resolved" icon={CheckCircle}>
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Question</TableHead>
														<TableHead>Resolution Action</TableHead>
														<TableHead className="text-right">Time</TableHead>
														<TableHead className="text-right">Confidence</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{data.recentlyResolved.slice(0, 10).map((item, idx) => (
														<TableRow
															key={idx}
															className="cursor-pointer hover:bg-muted/50"
															onClick={() => router.push(`/conversations/${item.conversationId}`)}
														>
															<TableCell className="max-w-md">
																<Text className="truncate">{item.questionText}</Text>
															</TableCell>
															<TableCell>
																{item.actionName ? (
																	<span className="font-mono text-[9px] border border-[#E5E5E5] dark:border-zinc-700 px-1.5 py-0.5 text-[#888] uppercase">
																		{item.actionName}
																	</span>
																) : (
																	<Text size="sm" className="text-muted-foreground">
																		High confidence
																	</Text>
																)}
															</TableCell>
															<TableCell className="text-right">
																{formatTimeToResolution(item.timeToResolution)}
															</TableCell>
															<TableCell className="text-right">
																{item.confidenceScore ? `${item.confidenceScore}%` : "—"}
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</SectionCard>
									</section>
								)}

								{/* Section 7: Resolution Funnel */}
								<section>
									<SectionHeader title="Funnel & Insights" />
									<SectionCard title="Resolution Funnel" icon={ListChecks}>
										<div className="p-6">
											<div className="space-y-3">
												<button
													type="button"
													onClick={() => navigateWithFilter("has_meaningful_question=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<Users className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Meaningful questions asked</Text>
															<Text size="xs" className="text-muted-foreground">
																Conversations with KB context retrieval
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{data?.funnelSteps.meaningfulQuestions || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("action_attempted=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<Target className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Action suggested / executed</Text>
															<Text size="xs" className="text-muted-foreground">
																AI attempted an action
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{data?.funnelSteps.actionAttempted || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("action_succeeded=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<CheckCircle className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Action succeeded</Text>
															<Text size="xs" className="text-muted-foreground">
																Action execution completed successfully
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{data?.funnelSteps.actionSucceeded || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("resolved=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900"
												>
													<div className="flex items-center gap-3">
														<CheckCircle className="w-5 h-5 text-green-600" />
														<div>
															<Text className="font-medium">No follow-up or escalation</Text>
															<Text size="xs" className="text-muted-foreground">
																Resolved successfully
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold text-green-600">
															{data?.funnelSteps.resolved || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>
											</div>
										</div>
									</SectionCard>

									{/* Section 8: Smart Recommendation */}
									{data?.topRecommendation && (
										<SectionCard
											title="Recommendation"
											icon={Lightbulb}
											className="border-2 border-blue-200 dark:border-blue-900"
										>
											<div className="p-6">
												<p className="mb-1 text-sm font-medium">{data.topRecommendation.title}</p>
												<p className="mb-4 text-sm text-muted-foreground">
													{data.topRecommendation.description}
												</p>
												<Button asChild>
													<Link href={data.topRecommendation.ctaHref}>
														{data.topRecommendation.ctaText}
													</Link>
												</Button>
											</div>
										</SectionCard>
									)}
								</section>
							</div>
						</PremiumGate>
					)}
				</div>
			</div>
		</>
	);
}
