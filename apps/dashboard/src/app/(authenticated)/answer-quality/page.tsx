"use client";

import { PageHeader, SectionHeader } from "@ansa/ui";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	BarChart3,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	MessageSquare,
	Target,
	TrendingUp,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	Cell,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import {
	brutalistAxisTickStyle,
	brutalistChartTheme,
	brutalistTooltipStyle,
} from "@/components/analytics/brutalist";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { PremiumGate } from "@/components/premium-gate";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardChartContent,
	CardChartHeader,
	CardMetricHeader,
	CardValue,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgent } from "@/lib/agent-context";
import {
	type AnswerQualityCluster,
	type AnswerQualityHotspot,
	type ConfidenceDistributionData,
	type ConfidenceOverTimeData,
	type ConfidenceSummary,
	getAnswerQualityClusters,
	getAnswerQualityHotspots,
	getConfidenceDistribution,
	getConfidenceOverTime,
	getConfidenceSummary,
} from "@/lib/api";
import { calculateTrustedAnswerRate } from "@/lib/utils";

export default function AnswerQualityPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [dateRange, setDateRange] = useState<DateRange>("7d");
	const [loading, setLoading] = useState(true);
	const [clusters, setClusters] = useState<AnswerQualityCluster[]>([]);
	const [hotspots, setHotspots] = useState<AnswerQualityHotspot[]>([]);
	const [expandedCluster, setExpandedCluster] = useState<string | null>(null);
	const [confidenceSummary, setConfidenceSummary] = useState<ConfidenceSummary | null>(null);
	const [confidenceDistribution, setConfidenceDistribution] = useState<
		ConfidenceDistributionData[]
	>([]);
	const [confidenceOverTime, setConfidenceOverTime] = useState<ConfidenceOverTimeData[]>([]);

	const getDateRange = useCallback((range: DateRange) => {
		const end = new Date();
		const start = new Date();
		switch (range) {
			case "7d":
				start.setDate(start.getDate() - 7);
				break;
			case "30d":
				start.setDate(start.getDate() - 30);
				break;
			case "90d":
				start.setDate(start.getDate() - 90);
				break;
		}
		return {
			startDate: start.toISOString().split("T")[0],
			endDate: end.toISOString().split("T")[0],
		};
	}, []);

	const fetchData = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const { startDate, endDate } = getDateRange(dateRange);

			const [clustersData, hotspotsData, confSummary, confDistribution, confOverTime] =
				await Promise.all([
					getAnswerQualityClusters(currentAgent.id, startDate, endDate),
					getAnswerQualityHotspots(currentAgent.id, startDate, endDate),
					getConfidenceSummary(currentAgent.id, startDate, endDate),
					getConfidenceDistribution(currentAgent.id, startDate, endDate),
					getConfidenceOverTime(currentAgent.id, startDate, endDate),
				]);

			setClusters(clustersData.clusters);
			setHotspots(hotspotsData.hotspots);
			setConfidenceSummary(confSummary);
			setConfidenceDistribution(confDistribution);
			setConfidenceOverTime(confOverTime);
		} catch (err) {
			console.error("Failed to fetch answer quality data:", err);
		} finally {
			setLoading(false);
		}
	}, [currentAgent, dateRange, getDateRange]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchData();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchData]);

	if (agentLoading || loading) {
		return (
			<div className="flex-1 bg-[#F3F2EE] min-h-screen">
				<PageHeader title="Answer Quality" />
				<div className="p-8 space-y-6">
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
						<Skeleton className="h-[120px]" />
						<Skeleton className="h-[120px]" />
						<Skeleton className="h-[120px]" />
						<Skeleton className="h-[120px]" />
					</div>
					<Skeleton className="h-[400px]" />
				</div>
			</div>
		);
	}

	if (!currentAgent) {
		return (
			<div className="flex-1 bg-[#F3F2EE] min-h-screen">
				<PageHeader title="Answer Quality" />
				<div className="p-8">
					<Empty>
						<EmptyContent>
							<EmptyMedia variant="icon">
								<MessageSquare />
							</EmptyMedia>
							<EmptyTitle>No agent selected</EmptyTitle>
							<EmptyDescription>Select an agent to view answer quality metrics.</EmptyDescription>
						</EmptyContent>
					</Empty>
				</div>
			</div>
		);
	}

	const hasData =
		confidenceSummary &&
		(confidenceSummary.totalWithConfidence > 0 || confidenceSummary.totalWithoutConfidence > 0);

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Answer Quality"
				subtitle="How confident and reliable the AI's answers are"
				action={<DateRangeSelector value={dateRange} onChange={setDateRange} />}
			/>

			<div className="p-8 space-y-6">
				{!hasData ? (
					<Empty>
						<EmptyContent>
							<EmptyMedia variant="icon">
								<CheckCircle2 />
							</EmptyMedia>
							<EmptyTitle>No answer quality data yet</EmptyTitle>
							<EmptyDescription>
								Answer confidence appears after the AI responds to real user questions with
								knowledge base context.
							</EmptyDescription>
							<Button asChild className="mt-4">
								<Link href="/conversations">View Conversations</Link>
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<PremiumGate feature="analytics">
						<div className="space-y-6">
							{/* Metric Cards */}
							<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
								{/* Trusted Answer Rate */}
								<Card variant="metric" className="border-l-4 border-l-green-500">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="Trusted Answer Rate" icon={Zap} />
												</div>
											</TooltipTrigger>
											<TooltipContent className="max-w-xs">
												<p>
													Percentage of responses where AI had high confidence (70%+) in its answer.
													Higher scores mean your knowledge base is well-equipped to handle queries
													autonomously.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<CardValue>
										{(() => {
											const aiReadinessPercent = calculateTrustedAnswerRate(
												confidenceSummary,
												confidenceDistribution,
											);
											const totalResponses =
												(confidenceSummary?.totalWithConfidence || 0) +
												(confidenceSummary?.totalWithoutConfidence || 0);
											return totalResponses === 0 ? "N/A" : `${aiReadinessPercent}%`;
										})()}
									</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										{(() => {
											const highConfidenceCount = confidenceDistribution
												.filter((d) => d.bucket >= 70)
												.reduce((sum, d) => sum + d.count, 0);
											return `${highConfidenceCount} high-confidence responses`;
										})()}
									</div>
								</Card>

								{/* Avg Confidence */}
								<Card variant="metric">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="Avg Confidence" icon={Target} />
												</div>
											</TooltipTrigger>
											<TooltipContent className="max-w-xs">
												<p>
													Confidence measures how well the AI's response is grounded in your
													knowledge base. Higher scores mean the answer is well-supported by your
													sources.
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<CardValue>
										{confidenceSummary && confidenceSummary.avgConfidence !== null
											? `${confidenceSummary.avgConfidence}%`
											: "N/A"}
									</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										{confidenceSummary?.totalWithConfidence || 0} responses tracked
									</div>
								</Card>

								{/* Confidence Range */}
								<Card variant="metric">
									<CardMetricHeader label="Confidence Range" icon={BarChart3} />
									<CardValue>
										{confidenceSummary &&
										confidenceSummary.minConfidence !== null &&
										confidenceSummary.maxConfidence !== null
											? `${confidenceSummary.minConfidence}% - ${confidenceSummary.maxConfidence}%`
											: "N/A"}
									</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										Min to max scores
									</div>
								</Card>

								{/* No Context */}
								<Card
									variant="metric"
									className={
										confidenceSummary && confidenceSummary.totalWithoutConfidence > 5
											? "border-l-4 border-l-red-500"
											: ""
									}
								>
									<CardMetricHeader label="No Context" icon={MessageSquare} />
									<CardValue
										className={
											confidenceSummary && confidenceSummary.totalWithoutConfidence > 5
												? "text-red-600"
												: ""
										}
									>
										{confidenceSummary?.totalWithoutConfidence || 0}
									</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										No matching knowledge base entries
									</div>
								</Card>
							</div>

							{/* Charts */}
							<div className="grid gap-4 lg:grid-cols-2">
								{/* Confidence Distribution */}
								<Card variant="chart">
									<CardChartHeader title="Confidence Score Distribution" icon={Target} />
									<CardChartContent>
										{confidenceDistribution.every((d) => d.count === 0) ? (
											<div className="py-8 text-center text-[#888] font-mono text-xs">
												No confidence data available yet
											</div>
										) : (
											<ResponsiveContainer width="100%" height={250}>
												<BarChart data={confidenceDistribution} layout="vertical">
													<XAxis type="number" {...brutalistAxisTickStyle} />
													<YAxis
														dataKey="range"
														type="category"
														{...brutalistAxisTickStyle}
														width={50}
													/>
													<RechartsTooltip contentStyle={brutalistTooltipStyle} />
													<Bar dataKey="count" name="Responses" radius={0}>
														{confidenceDistribution.map((entry) => (
															<Cell
																key={`cell-${entry.bucket}`}
																fill={
																	entry.bucket >= 70
																		? "#22c55e"
																		: entry.bucket >= 40
																			? "#eab308"
																			: "#ef4444"
																}
															/>
														))}
													</Bar>
												</BarChart>
											</ResponsiveContainer>
										)}
									</CardChartContent>
								</Card>

								{/* Confidence Over Time */}
								<Card variant="chart">
									<CardChartHeader title="Avg Confidence Over Time" icon={TrendingUp} />
									<CardChartContent>
										{confidenceOverTime.length === 0 ? (
											<div className="py-8 text-center text-[#888] font-mono text-xs">
												No confidence data available yet
											</div>
										) : (
											<ResponsiveContainer width="100%" height={250}>
												<AreaChart data={confidenceOverTime}>
													<defs>
														<linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
															<stop
																offset="5%"
																stopColor={brutalistChartTheme.colors.primary}
																stopOpacity={0.3}
															/>
															<stop
																offset="95%"
																stopColor={brutalistChartTheme.colors.primary}
																stopOpacity={0}
															/>
														</linearGradient>
													</defs>
													<XAxis
														dataKey="date"
														tickFormatter={(value) =>
															new Date(value).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
															})
														}
														{...brutalistAxisTickStyle}
													/>
													<YAxis domain={[0, 100]} {...brutalistAxisTickStyle} />
													<RechartsTooltip
														formatter={(value) => [`${value}%`, "Confidence"]}
														labelFormatter={(label) =>
															new Date(String(label)).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
															})
														}
														contentStyle={brutalistTooltipStyle}
													/>
													<Area
														type="monotone"
														dataKey="avgConfidence"
														name="Confidence"
														stroke={brutalistChartTheme.colors.primary}
														fillOpacity={1}
														fill="url(#colorConfidence)"
													/>
												</AreaChart>
											</ResponsiveContainer>
										)}
									</CardChartContent>
								</Card>
							</div>

							{/* Low Confidence Hotspots */}
							{hotspots.length > 0 && (
								<div className="w-full bg-[#FEFCE8] border border-[#EAB308] shadow-sm font-sans text-[#1A1A1A] relative overflow-hidden">
									{/* Header Strip */}
									<div className="flex items-center justify-between px-4 py-3 border-b border-[#EAB308] bg-[#FEF9C3]">
										<div className="flex items-center gap-3">
											<div className="bg-[#EAB308] text-[#713F12] p-1 border border-[#CA8A04]">
												<AlertTriangle size={14} strokeWidth={2.5} />
											</div>
											<div>
												<h3 className="text-xs font-bold uppercase tracking-widest text-[#713F12] flex items-center gap-2">
													Knowledge Gaps Detected
												</h3>
												<div className="text-[9px] font-mono text-[#854D0E]">
													ERR_CODE: LOW_CONF_CLUSTER
												</div>
											</div>
										</div>

										<div className="flex items-center gap-4 text-[9px] font-mono uppercase text-[#A16207]">
											<span className="flex items-center gap-1">
												<Activity size={10} /> Impact: High
											</span>
											<span className="w-px h-3 bg-[#EAB308]" />
											<span>
												{hotspots.length} Cluster{hotspots.length !== 1 ? "s" : ""} Flagged
											</span>
										</div>
									</div>

									{/* Description */}
									<div className="px-6 py-4 flex items-start gap-3 border-b border-[#EAB308]/30">
										<p className="text-xs text-[#713F12] font-mono leading-relaxed max-w-3xl">
											High-volume questions with sub-optimal confidence scores ({"<"}70%). Review
											and improve knowledge base coverage to increase answer quality.
										</p>
									</div>

									{/* Data Table */}
									<div className="bg-white mx-6 mb-6 border border-[#EAB308]/50 shadow-sm mt-4">
										{/* Table Header */}
										<div className="grid grid-cols-12 gap-4 px-4 py-2 bg-[#FAFAFA] border-b border-[#E5E5E5] text-[9px] font-mono uppercase tracking-widest text-[#888]">
											<div className="col-span-5">Question Cluster</div>
											<div className="col-span-2 text-center">Query Volume</div>
											<div className="col-span-2 text-center">Avg Confidence</div>
											<div className="col-span-3 text-right">Action</div>
										</div>

										{/* Table Rows */}
										<div>
											{hotspots.map((hotspot) => (
												<div
													key={hotspot.clusterId}
													className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-[#F3F2EE] last:border-0 hover:bg-[#FEFCE8] transition-colors group"
												>
													{/* Question */}
													<div className="col-span-5">
														<div className="font-medium text-sm text-[#1A1A1A] mb-0.5 truncate">
															{hotspot.representativeQuestion}
														</div>
														<div className="text-[9px] font-mono text-[#888]">
															CLUS-{hotspot.clusterId.slice(0, 6).toUpperCase()}
														</div>
													</div>

													{/* Volume */}
													<div className="col-span-2 text-center font-mono text-xs text-[#555]">
														{hotspot.volume}
													</div>

													{/* Score */}
													<div className="flex justify-center col-span-2">
														<span
															className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
																hotspot.avgConfidence < 50
																	? "bg-red-50 text-red-700 border-red-200"
																	: "bg-yellow-50 text-yellow-700 border-yellow-200"
															}`}
														>
															{hotspot.avgConfidence}%
														</span>
													</div>

													{/* Action */}
													<div className="flex justify-end col-span-3">
														<Link
															href={`/needs-attention?cluster=${hotspot.clusterId}&from=${getDateRange(dateRange).startDate}&to=${getDateRange(dateRange).endDate}&reason=low-confidence-cluster`}
															className="flex items-center gap-2 text-[10px] font-bold uppercase bg-white border border-[#D1D1D1] px-3 py-1.5 hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all group-hover:border-[#EAB308]"
														>
															<Target size={10} /> Improve <ArrowRight size={10} />
														</Link>
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							)}

							{/* Questions by Answer Quality */}
							{clusters.length > 0 && (
								<div className="space-y-4">
									<SectionHeader
										title="Questions by Answer Quality"
										icon={<BarChart3 size={14} />}
									/>
									<Card variant="section" className="overflow-hidden">
										<div>
											{/* Table Header */}
											<div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9] text-[10px] font-mono uppercase tracking-widest text-[#888]">
												<div className="col-span-5">Question Cluster</div>
												<div className="col-span-1 text-right">Volume</div>
												<div className="col-span-2 text-right">Avg Confidence</div>
												<div className="col-span-2 text-right">% Low Conf.</div>
												<div className="col-span-1 text-right">Status</div>
												<div className="col-span-1" />
											</div>

											{/* Table Body */}
											{clusters.map((cluster) => (
												<div key={cluster.clusterId}>
													<button
														type="button"
														className="w-full grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-center hover:bg-[#F9F9F9] transition-colors group cursor-pointer text-left"
														onClick={() =>
															setExpandedCluster(
																expandedCluster === cluster.clusterId ? null : cluster.clusterId,
															)
														}
													>
														<div className="col-span-5 font-medium text-sm text-[#1A1A1A] truncate group-hover:underline decoration-[#D1D1D1] underline-offset-4">
															{cluster.representativeQuestion}
														</div>
														<div className="col-span-1 font-mono text-sm text-right">
															{cluster.volume}
														</div>
														<div className="col-span-2 text-right">
															<span
																className={`text-[9px] font-bold uppercase px-1.5 border ${
																	cluster.avgConfidence >= 70
																		? "border-green-300 bg-green-50 text-green-700"
																		: cluster.avgConfidence >= 40
																			? "border-yellow-300 bg-yellow-50 text-yellow-700"
																			: "border-red-300 bg-red-50 text-red-700"
																}`}
															>
																{cluster.avgConfidence}%
															</span>
														</div>
														<div className="col-span-2 text-right text-sm font-mono text-[#666]">
															{cluster.lowConfidencePercentage}%
														</div>
														<div className="col-span-1 text-right">
															<span
																className={`text-[9px] font-bold uppercase px-1.5 border ${
																	cluster.status === "healthy"
																		? "border-green-300 bg-green-50 text-green-700"
																		: cluster.status === "at-risk"
																			? "border-yellow-300 bg-yellow-50 text-yellow-700"
																			: "border-red-300 bg-red-50 text-red-700"
																}`}
															>
																{cluster.status === "healthy"
																	? "Healthy"
																	: cluster.status === "at-risk"
																		? "At Risk"
																		: "Poor"}
															</span>
														</div>
														<div className="col-span-1 flex justify-end text-[#888] group-hover:text-[#1A1A1A]">
															{expandedCluster === cluster.clusterId ? (
																<ChevronDown className="w-4 h-4" />
															) : (
																<ChevronRight className="w-4 h-4" />
															)}
														</div>
													</button>

													{expandedCluster === cluster.clusterId && (
														<div className="px-6 py-4 bg-[#FAFAF9] border-b border-[#F3F2EE]">
															<div className="flex items-center gap-2">
																<span className="text-[10px] font-mono uppercase tracking-widest text-[#888]">
																	Actions:
																</span>
																<div className="flex gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		asChild
																		className="text-xs h-7"
																	>
																		<Link href={`/conversations?cluster=${cluster.clusterId}`}>
																			View conversations
																		</Link>
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		asChild
																		className="text-xs h-7"
																	>
																		<Link
																			href={`/needs-attention?cluster=${cluster.clusterId}&from=${getDateRange(dateRange).startDate}&to=${getDateRange(dateRange).endDate}&reason=answer-quality`}
																		>
																			Improve answers
																		</Link>
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		asChild
																		className="text-xs h-7"
																	>
																		<Link href={`/ai-knowledge`}>Add knowledge</Link>
																	</Button>
																</div>
															</div>
														</div>
													)}
												</div>
											))}
										</div>
									</Card>
								</div>
							)}
						</div>
					</PremiumGate>
				)}
			</div>
		</div>
	);
}
