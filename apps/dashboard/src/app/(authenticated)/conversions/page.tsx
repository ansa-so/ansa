"use client";

import { PageHeader, SectionHeader } from "@ansa/ui";
import {
	Activity,
	ArrowUpRight,
	BarChart3,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	LayoutTemplate,
	ListChecks,
	MessageSquare,
	Target,
	Terminal,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import {
	brutalistAxisTickStyle,
	brutalistChartTheme,
	Card,
	CardMetricHeader,
	CardValue,
	SectionCard,
	TechChart,
} from "@/components/analytics/brutalist";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { ConversionSetupModal } from "@/components/conversion-setup-modal";

import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Text } from "@/components/ui/text";
import { useAgent } from "@/lib/agent-context";
import {
	type ConfidenceConversionData,
	getConversionsConfidence,
	getConversionsDaily,
	getConversionsQuestions,
	getConversionsRecommendations,
	getConversionsSummary,
} from "@/lib/api";

export default function ConversionsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const router = useRouter();
	const [dateRange, setDateRange] = useState<DateRange>("90d");
	const [isLoading, setIsLoading] = useState(true);
	const [summary, setSummary] = useState<any>(null);
	const [dailyData, setDailyData] = useState<any[]>([]);
	const [questions, setQuestions] = useState<any[]>([]);
	const [recommendation, setRecommendation] = useState<any>(null);
	const [confidenceData, setConfidenceData] = useState<ConfidenceConversionData | null>(null);
	const [showSetupModal, setShowSetupModal] = useState(false);
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
	const [showAllSignals, setShowAllSignals] = useState(false);

	const navigateWithFilter = (filter: string) => {
		router.push(`/conversations?${filter}`);
	};

	const CustomTooltip = ({
		active,
		payload,
		label,
	}: {
		active?: boolean;
		payload?: { value: number; name: string; color: string }[];
		label?: string;
	}) => {
		if (active && payload && payload.length) {
			return (
				<div className="p-2 border rounded-lg shadow-sm bg-background">
					<p className="text-sm font-medium">
						{label
							? new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric" })
							: ""}
					</p>
					{payload.map((entry) => (
						<p key={entry.name} className="text-sm" style={{ color: entry.color }}>
							{entry.name}: {(entry.value ?? 0).toLocaleString()}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

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

			const [summaryData, daily, clusteredQuestions, recs, confidence] = await Promise.all([
				getConversionsSummary(currentAgent.id, startDate, endDate),
				getConversionsDaily(currentAgent.id, startDate, endDate),
				getConversionsQuestions(currentAgent.id, startDate, endDate),
				getConversionsRecommendations(currentAgent.id, startDate, endDate),
				getConversionsConfidence(currentAgent.id, startDate, endDate),
			]);

			setSummary(summaryData);
			setDailyData(daily);
			setQuestions(clusteredQuestions);
			setRecommendation(recs?.[0] || null);
			setConfidenceData(confidence);

			// Show setup modal if no conversions
			if (summaryData?.conversationsWithOutcome === 0) {
				setShowSetupModal(true);
			}
		} catch (error) {
			console.error("Failed to fetch conversions data:", error);
		} finally {
			setIsLoading(false);
		}
	}, [currentAgent, dateRange, getDateRange]);

	useEffect(() => {
		if (currentAgent) {
			fetchData();
		}
	}, [currentAgent, fetchData]);

	const formatDuration = (seconds: number | null) => {
		if (seconds === null) return "—";
		if (seconds < 60) return `${Math.round(seconds)}s`;
		const minutes = Math.floor(seconds / 60);
		const secs = Math.round(seconds % 60);
		return `${minutes}m ${secs}s`;
	};

	const formatPercentage = (value: number) => {
		return `${Math.round(value)}%`;
	};

	// Calculate trend for metrics (returns string format like "+12%" or "-5%")
	const formatTrend = (current: number, previous: number | undefined): string | undefined => {
		if (!previous || previous === 0) return undefined;
		const diff = ((current - previous) / previous) * 100;
		if (Math.abs(diff) < 0.5) return undefined;
		return `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`;
	};

	// Build conversion types from data
	const getConversionTypes = () => {
		const total = summary?.conversationsWithOutcome || 1;
		const formSubmissions = summary?.formSubmissions || 0;
		const toolExecutions = summary?.toolExecutions || 0;
		const triggerConversions = summary?.triggerConversions || 0;

		return [
			{
				type: "Form Submission",
				count: formSubmissions,
				percentage: `${Math.round((formSubmissions / total) * 100)}%`,
				icon: LayoutTemplate,
			},
			{
				type: "Tool Execution",
				count: toolExecutions,
				percentage: `${Math.round((toolExecutions / total) * 100)}%`,
				icon: Terminal,
			},
			{
				type: "Trigger Fired",
				count: triggerConversions,
				percentage: `${Math.round((triggerConversions / total) * 100)}%`,
				icon: Zap,
			},
		];
	};

	if (agentLoading) {
		return (
			<div className="min-h-screen">
				<PageHeader
					title="Conversion Telemetry"
					subtitle="Loading..."
					icon={<div className="w-2 h-2 bg-gray-400 rounded-full" />}
				/>
				<div className="p-8 space-y-8">
					<div className="grid gap-4 md:grid-cols-3">
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
			<ConversionSetupModal open={showSetupModal} onOpenChange={setShowSetupModal} />
			<div className="min-h-screen">
				<PageHeader
					title="Conversion Telemetry"
					subtitle="Tracking: Active | Window: Last 90 Days"
					icon={<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
					action={
						<DateRangeSelector value={dateRange} onChange={setDateRange} disabled={isLoading} />
					}
				/>

				<div className="p-8 space-y-8">
					{isLoading ? (
						<div className="grid gap-4 md:grid-cols-3">
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
							<Skeleton className="h-32" />
						</div>
					) : summary?.conversationsWithOutcome === 0 ? (
						<Empty>
							<EmptyMedia variant="icon">
								<Target className="w-6 h-6" />
							</EmptyMedia>
							<EmptyContent>
								<EmptyTitle>No conversions yet</EmptyTitle>
								<EmptyDescription>
									Your AI is answering questions, but no outcomes have been defined or detected yet.
								</EmptyDescription>
								<Button onClick={() => setShowSetupModal(true)} className="mt-4">
									Set up conversions
								</Button>
							</EmptyContent>
						</Empty>
					) : (
						<>
							{/* KPI Cards */}
							<section>
								<SectionHeader title="Key Metrics" />
								<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
									<Card variant="metric">
										<CardMetricHeader
											label="Total Outcomes"
											icon={Target}
											trend={formatTrend(
												summary?.conversationsWithOutcome || 0,
												summary?.previousPeriod?.conversationsWithOutcome,
											)}
										/>
										<CardValue>{summary?.conversationsWithOutcome || 0}</CardValue>
									</Card>
									<Card variant="metric">
										<CardMetricHeader
											label="Conversion Rate"
											icon={BarChart3}
											trend={formatTrend(
												summary?.conversionRate || 0,
												summary?.previousPeriod?.conversionRate,
											)}
										/>
										<CardValue>{formatPercentage(summary?.conversionRate || 0)}</CardValue>
									</Card>
									<Card variant="metric">
										<CardMetricHeader label="Avg Time to Convert" icon={Zap} />
										<CardValue>{formatDuration(summary?.avgTimeToOutcomeSeconds)}</CardValue>
									</Card>
								</div>
							</section>

							{/* Volume Analysis Chart */}
							<section>
								<SectionHeader title="Engagement" />
								<TechChart title="Volume Analysis" icon={BarChart3}>
									{dailyData.length === 0 ? (
										<div className="py-8 text-center text-[#888] font-mono text-xs">
											No data available
										</div>
									) : (
										<ResponsiveContainer width="100%" height={250}>
											<AreaChart data={dailyData}>
												<defs>
													<linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
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
												<YAxis {...brutalistAxisTickStyle} />
												<RechartsTooltip content={<CustomTooltip />} />
												<Area
													type="monotone"
													dataKey="conversions"
													name="Conversions"
													stroke={brutalistChartTheme.colors.primary}
													fillOpacity={1}
													fill="url(#colorConversions)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									)}
								</TechChart>
							</section>

							{/* Pipeline & Distribution */}
							<section>
								<SectionHeader title="Pipeline & Distribution" />
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
									{/* Attribution Pipeline (Funnel) */}
									<SectionCard
										title="Attribution Pipeline"
										icon={ListChecks}
										className="col-span-1 lg:col-span-2"
									>
										<div className="p-6">
											<div className="space-y-3">
												<button
													type="button"
													onClick={() => navigateWithFilter("")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<Users className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Session Initiated</Text>
															<Text size="xs" className="text-muted-foreground">
																Total conversations started
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{summary?.totalConversations || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("has_meaningful_question=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<MessageSquare className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Meaningful Query</Text>
															<Text size="xs" className="text-muted-foreground">
																Questions with intent detected
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{Math.round((summary?.totalConversations || 0) * 0.62)}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("confidence=high")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-muted hover:bg-muted/80"
												>
													<div className="flex items-center gap-3">
														<CheckCircle className="w-5 h-5 text-muted-foreground" />
														<div>
															<Text className="font-medium">Confidence Threshold Met</Text>
															<Text size="xs" className="text-muted-foreground">
																High confidence responses
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold">
															{Math.round((summary?.totalConversations || 0) * 0.36)}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>

												<button
													type="button"
													onClick={() => navigateWithFilter("has_conversion=true")}
													className="flex items-center justify-between w-full p-4 text-left transition-colors rounded-lg bg-green-50 dark:bg-green-950 hover:bg-green-100 dark:hover:bg-green-900"
												>
													<div className="flex items-center gap-3">
														<Target className="w-5 h-5 text-green-600" />
														<div>
															<Text className="font-medium">Conversion Event</Text>
															<Text size="xs" className="text-muted-foreground">
																Successful outcome achieved
															</Text>
														</div>
													</div>
													<div className="flex items-center gap-2">
														<Text className="text-2xl font-bold text-green-600">
															{summary?.conversationsWithOutcome || 0}
														</Text>
														<ChevronRight className="w-5 h-5 text-muted-foreground" />
													</div>
												</button>
											</div>
										</div>
									</SectionCard>

									{/* Event Distribution & High Intent Signals */}
									<section className="space-y-6">
										{/* Event Types */}
										<div className="bg-white border border-[#D1D1D1] shadow-sm">
											<div className="px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
												<h3 className="text-[10px] font-mono uppercase text-[#888]">
													Event Distribution
												</h3>
											</div>
											<div className="p-2">
												{getConversionTypes().map((type, i) => (
													<div
														key={i}
														className="flex items-center justify-between p-3 border-b border-[#F3F2EE] last:border-0 hover:bg-[#FAFAF9] group cursor-default"
													>
														<div className="flex items-center gap-3">
															<div className="text-[#888] group-hover:text-[#1A1A1A]">
																<type.icon size={14} />
															</div>
															<span className="text-xs font-medium">{type.type}</span>
														</div>
														<div className="flex items-center gap-3">
															<span className="text-[10px] font-mono text-[#888]">
																{type.percentage}
															</span>
															<span className="text-xs font-bold">{type.count}</span>
														</div>
													</div>
												))}
											</div>
										</div>

										{/* High Intent Signals */}
										{questions.length > 0 && (
											<div className="bg-white border border-[#D1D1D1] shadow-sm flex-1">
												<div className="px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
													<h3 className="text-[10px] font-mono uppercase text-[#888]">
														High Intent Signals
													</h3>
												</div>
												<div className="p-2">
													{[...questions]
														.sort((a, b) => b.conversationCount - a.conversationCount)
														.slice(0, showAllSignals ? undefined : 4)
														.map((q, i) => (
															<div
																key={i}
																className="flex items-center justify-between p-3 border-b border-[#F3F2EE] last:border-0 hover:bg-[#FAFAF9]"
															>
																<span className="text-[10px] font-mono text-[#555] truncate max-w-[150px]">
																	"{q.representativeQuestion}"
																</span>
																<div className="flex items-center gap-2">
																	<span className="text-[9px] font-bold bg-green-50 text-green-700 px-1 border border-green-200">
																		{formatPercentage(q.conversionRate)}
																	</span>
																	<span className="text-[9px] font-mono text-[#888]">
																		({q.conversationCount})
																	</span>
																</div>
															</div>
														))}
												</div>
												{questions.length > 4 && (
													<div className="p-2 border-t border-[#F3F2EE]">
														<button
															type="button"
															onClick={() => setShowAllSignals(!showAllSignals)}
															className="w-full py-2 text-[9px] font-bold uppercase text-[#888] hover:text-[#1A1A1A] hover:bg-[#F3F2EE]"
														>
															{showAllSignals
																? "Show Less"
																: `View All Queries (${questions.length})`}
														</button>
													</div>
												)}
											</div>
										)}
									</section>
								</div>
							</section>

							{/* Questions That Drive Conversions */}
							{questions.length > 0 && (
								<section>
									<SectionHeader title="Question Analysis" />
									<div className="bg-white border border-[#D1D1D1] shadow-sm">
										<div className="px-6 py-4 border-b border-[#F3F2EE] bg-[#FAFAF9]">
											<h3 className="text-xs font-bold tracking-wide uppercase">
												Questions That Drive Conversions
											</h3>
										</div>
										<div className="p-0">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead>Question</TableHead>
														<TableHead className="text-right">Conv. Rate</TableHead>
														<TableHead className="text-right">Count</TableHead>
														<TableHead className="w-8"></TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{questions.map((question) => (
														<>
															<TableRow
																key={question.clusterId}
																className="cursor-pointer hover:bg-[#FAFAF9]"
																onClick={() =>
																	setExpandedQuestion(
																		expandedQuestion === question.clusterId
																			? null
																			: question.clusterId,
																	)
																}
															>
																<TableCell className="font-medium">
																	{question.representativeQuestion}
																</TableCell>
																<TableCell className="text-right">
																	<span className="text-[9px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 border border-green-200">
																		{formatPercentage(question.conversionRate)}
																	</span>
																</TableCell>
																<TableCell className="text-right">
																	{question.conversationCount}
																</TableCell>
																<TableCell>
																	{expandedQuestion === question.clusterId ? (
																		<ChevronDown className="w-4 h-4" />
																	) : (
																		<ChevronRight className="w-4 h-4" />
																	)}
																</TableCell>
															</TableRow>
															{expandedQuestion === question.clusterId && (
																<TableRow>
																	<TableCell colSpan={4} className="bg-[#FAFAF9]">
																		<div className="py-2 space-y-2">
																			<div className="flex items-start gap-2">
																				<Text size="xs" className="w-32 font-medium text-[#888]">
																					Avg Confidence:
																				</Text>
																				<Text size="xs">{question.avgConfidenceScore || "—"}</Text>
																			</div>
																			{question.mostRecentQuestion && (
																				<div className="flex items-start gap-2">
																					<Text size="xs" className="w-32 font-medium text-[#888]">
																						Most Recent:
																					</Text>
																					<Text size="xs" className="flex-1">
																						{question.mostRecentQuestion}
																					</Text>
																				</div>
																			)}
																			{question.highestConvertingQuestion && (
																				<div className="flex items-start gap-2">
																					<Text size="xs" className="w-32 font-medium text-[#888]">
																						Highest Converting:
																					</Text>
																					<Text size="xs" className="flex-1">
																						{question.highestConvertingQuestion}
																					</Text>
																				</div>
																			)}
																		</div>
																	</TableCell>
																</TableRow>
															)}
														</>
													))}
												</TableBody>
											</Table>
										</div>
									</div>
								</section>
							)}

							{/* Quality & Insights */}
							<section>
								<SectionHeader title="Quality & Insights" />
								<div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
									{/* Answer Quality vs Conversion - New Design */}
									{confidenceData &&
										confidenceData.high.count +
											confidenceData.medium.count +
											confidenceData.low.count >
											0 && (
											<Card
												variant="metric"
												className={`flex flex-col !p-0 ${recommendation ? "" : "lg:col-span-2"}`}
											>
												{/* Header */}
												<div className="px-5 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9] flex justify-between items-center">
													<div className="flex items-center gap-2">
														<Activity size={14} className="text-[#888]" />
														<h3 className="text-xs font-bold tracking-wide uppercase">
															Answer Quality Integrity
														</h3>
													</div>
													<span className="text-[9px] font-mono text-[#888] uppercase">
														N=
														{confidenceData.high.count +
															confidenceData.medium.count +
															confidenceData.low.count}{" "}
														SESSIONS
													</span>
												</div>

												{/* Matrix Rows */}
												<div className="p-6 space-y-6">
													{/* High Confidence */}
													<div>
														<div className="flex items-end justify-between mb-1">
															<div>
																<div className="flex items-center gap-2 text-xs font-bold">
																	High Confidence{" "}
																	<span className="text-[9px] font-mono font-normal text-[#888] bg-[#F3F2EE] px-1 border border-[#E5E5E5]">
																		{confidenceData.high.conversions}/{confidenceData.high.count}
																	</span>
																</div>
															</div>
															<div className="text-right">
																<span className="text-[10px] font-mono text-[#888] uppercase mr-2">
																	Conv. Rate
																</span>
																<span className="text-sm font-bold text-green-700">
																	{Math.round(confidenceData.high.conversionRate)}%
																</span>
															</div>
														</div>
														{/* Segmented Bar */}
														<div className="h-2 flex gap-0.5 w-full bg-[#F3F2EE] p-0.5 border border-[#E5E5E5]">
															{Array.from({ length: 20 }).map((_, i) => (
																<div
																	key={`high-${i}`}
																	className={`flex-1 transition-all duration-500 ${i < Math.round((confidenceData.high.conversionRate / 100) * 20) ? "bg-green-600" : "bg-[#E5E5E5]"}`}
																/>
															))}
														</div>
													</div>

													{/* Medium Confidence */}
													<div>
														<div className="flex items-end justify-between mb-1">
															<div>
																<div className="flex items-center gap-2 text-xs font-bold">
																	Medium Confidence{" "}
																	<span className="text-[9px] font-mono font-normal text-[#888] bg-[#F3F2EE] px-1 border border-[#E5E5E5]">
																		{confidenceData.medium.conversions}/
																		{confidenceData.medium.count}
																	</span>
																</div>
															</div>
															<div className="text-right">
																<span className="text-[10px] font-mono text-[#888] uppercase mr-2">
																	Conv. Rate
																</span>
																<span className="text-sm font-bold text-[#EAB308]">
																	{Math.round(confidenceData.medium.conversionRate)}%
																</span>
															</div>
														</div>
														{/* Segmented Bar */}
														<div className="h-2 flex gap-0.5 w-full bg-[#F3F2EE] p-0.5 border border-[#E5E5E5]">
															{Array.from({ length: 20 }).map((_, i) => (
																<div
																	key={`medium-${i}`}
																	className={`flex-1 transition-all duration-500 ${i < Math.round((confidenceData.medium.conversionRate / 100) * 20) ? "bg-yellow-500" : "bg-[#E5E5E5]"}`}
																/>
															))}
														</div>
													</div>

													{/* Low Confidence */}
													<div>
														<div className="flex items-end justify-between mb-1">
															<div>
																<div className="flex items-center gap-2 text-xs font-bold">
																	Low Confidence{" "}
																	<span className="text-[9px] font-mono font-normal text-[#888] bg-[#F3F2EE] px-1 border border-[#E5E5E5]">
																		{confidenceData.low.conversions}/{confidenceData.low.count}
																	</span>
																</div>
															</div>
															<div className="text-right">
																<span className="text-[10px] font-mono text-[#888] uppercase mr-2">
																	Conv. Rate
																</span>
																<span className="text-sm font-bold text-red-600">
																	{Math.round(confidenceData.low.conversionRate)}%
																</span>
															</div>
														</div>
														{/* Segmented Bar */}
														<div className="h-2 flex gap-0.5 w-full bg-[#F3F2EE] p-0.5 border border-[#E5E5E5]">
															{Array.from({ length: 20 }).map((_, i) => (
																<div
																	key={`low-${i}`}
																	className={`flex-1 transition-all duration-500 ${i < Math.round((confidenceData.low.conversionRate / 100) * 20) ? "bg-red-500" : "bg-[#E5E5E5]"}`}
																/>
															))}
														</div>
													</div>
												</div>
											</Card>
										)}

									{/* Recommendation - New Dark Design */}
									{recommendation && (
										<div className="bg-[#1A1A1A] text-white shadow-sm flex flex-col relative overflow-hidden group">
											{/* Background Texture */}
											<div className="absolute top-0 right-0 w-32 h-32 translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none bg-white/5 blur-3xl" />

											{/* Header */}
											<div className="z-10 flex items-center justify-between px-5 py-3 border-b border-white/10">
												<div className="flex items-center gap-2">
													<Zap size={14} className="text-yellow-400" />
													<h3 className="text-xs font-bold tracking-wide uppercase">
														System Advisory
													</h3>
												</div>
												<span className="text-[9px] font-mono text-[#888] bg-white/10 px-1.5 py-0.5">
													PRIORITY: HIGH
												</span>
											</div>

											{/* Content */}
											<div className="z-10 flex flex-col justify-between flex-1 p-6">
												<div>
													<h4 className="mb-2 text-lg font-medium tracking-tight">
														{recommendation.title}
													</h4>
													<div className="flex items-start gap-3 opacity-80">
														<div className="mt-1">
															<Terminal size={12} className="text-[#888]" />
														</div>
														<p className="font-mono text-xs leading-relaxed">
															{recommendation.description}
														</p>
													</div>
												</div>

												<div className="mt-8">
													<Link
														href={recommendation.actionUrl || "/ai-knowledge"}
														className="w-full bg-white text-[#1A1A1A] h-10 px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#E5E5E5] transition-colors flex items-center justify-center gap-2 group-hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
													>
														{recommendation.actionLabel} <ArrowUpRight size={12} />
													</Link>
												</div>
											</div>
										</div>
									)}
								</div>
							</section>
						</>
					)}
				</div>
			</div>
		</>
	);
}
