"use client";

import { PageHeader, SectionHeader } from "@ansa/ui";
import { formatDuration } from "@ansa/utils";
import {
	Activity,
	BarChart3,
	CheckCircle,
	Clock,
	FileText,
	FormInput,
	Globe,
	Layout,
	Lock,
	MessageSquare,
	Radio,
	Terminal,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
	UserCheck,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
	Card,
	CardChartContent,
	CardChartHeader,
	CardMetricHeader,
	CardSectionHeader,
	CardValue,
	DataRow,
	FormRow,
	ToolRow,
	TriggerRow,
} from "@/components/analytics/brutalist";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { MetricDetailSheet, type MetricType } from "@/components/analytics/metric-detail-sheet";
import { SwipeableContainer } from "@/components/analytics/swipeable-container";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAgent } from "@/lib/agent-context";
import {
	type AnalyticsChannelData,
	type AnalyticsCountryData,
	type AnalyticsDailyData,
	type AnalyticsPageData,
	type AnalyticsSummary,
	type AnalyticsToolData,
	type AnalyticsTriggerData,
	type FormAnalyticsItem,
	getAnalyticsChannels,
	getAnalyticsCountries,
	getAnalyticsDaily,
	getAnalyticsPages,
	getAnalyticsSummary,
	getAnalyticsTools,
	getAnalyticsTriggers,
	getFormAnalytics,
	getHumanResponseTime,
	getResponseTime,
	getUsage,
	type HumanResponseTimeData,
	type ResponseTimeData,
	type UsageData,
} from "@/lib/api";
import { useConfig } from "@/lib/config-context";
import { cn } from "@/lib/utils";

// Country code to name mapping (common ones)
const countryNames: Record<string, string> = {
	US: "United States",
	GB: "United Kingdom",
	CA: "Canada",
	AU: "Australia",
	DE: "Germany",
	FR: "France",
	JP: "Japan",
	BR: "Brazil",
	IN: "India",
	NL: "Netherlands",
	ES: "Spain",
	IT: "Italy",
	MX: "Mexico",
	KR: "South Korea",
	SG: "Singapore",
	SE: "Sweden",
	NO: "Norway",
	DK: "Denmark",
	FI: "Finland",
	PL: "Poland",
	CH: "Switzerland",
	AT: "Austria",
	BE: "Belgium",
	IE: "Ireland",
	NZ: "New Zealand",
	PT: "Portugal",
	AR: "Argentina",
	CL: "Chile",
	CO: "Colombia",
	ZA: "South Africa",
	AE: "UAE",
	IL: "Israel",
	TH: "Thailand",
	VN: "Vietnam",
	PH: "Philippines",
	MY: "Malaysia",
	ID: "Indonesia",
	TW: "Taiwan",
	HK: "Hong Kong",
	CN: "China",
	RU: "Russia",
};

function getCountryName(code: string): string {
	return countryNames[code] || code;
}

// Country flag emoji from code
function getCountryFlag(code: string): string {
	if (!code || code.length !== 2) return "🌍";
	const codePoints = code
		.toUpperCase()
		.split("")
		.map((char) => 127397 + char.charCodeAt(0));
	return String.fromCodePoint(...codePoints);
}

// Calculate percentage change
function calculateChange(current: number, previous: number): number | null {
	if (previous === 0) return current > 0 ? 100 : null;
	return Math.round(((current - previous) / previous) * 100);
}

// Format change as trend string
function formatTrend(change: number | null): string | null {
	if (change === null) return null;
	return change >= 0 ? `+${change}%` : `${change}%`;
}

export default function AnalyticsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { isSelfHosted } = useConfig();
	const isMobile = useIsMobile();
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [loading, setLoading] = useState(true);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const hasLoadedOnce = useRef(false);
	const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
	const [previousSummary, setPreviousSummary] = useState<AnalyticsSummary | null>(null);
	const [dailyData, setDailyData] = useState<AnalyticsDailyData[]>([]);
	const [countryData, setCountryData] = useState<AnalyticsCountryData[]>([]);
	const [channelData, setChannelData] = useState<AnalyticsChannelData[]>([]);
	const [toolData, setToolData] = useState<AnalyticsToolData[]>([]);
	const [triggerData, setTriggerData] = useState<AnalyticsTriggerData[]>([]);
	const [pageData, setPageData] = useState<AnalyticsPageData[]>([]);
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [responseTime, setResponseTime] = useState<ResponseTimeData | null>(null);
	const [humanResponseTime, setHumanResponseTime] = useState<HumanResponseTimeData | null>(null);
	const [formAnalytics, setFormAnalytics] = useState<FormAnalyticsItem[]>([]);

	// Bottom sheet state for metric details
	const [sheetOpen, setSheetOpen] = useState(false);
	const [selectedMetric, setSelectedMetric] = useState<MetricType | null>(null);

	const isFreePlan = !isSelfHosted && usage?.planId === "free";

	const openMetricSheet = (metric: MetricType) => {
		if (!isMobile) return;
		setSelectedMetric(metric);
		setSheetOpen(true);
	};

	// Fetch usage data for plan checking
	useEffect(() => {
		if (!isSelfHosted) {
			getUsage().then(setUsage).catch(console.error);
		}
	}, [isSelfHosted]);

	const getDateRangeValues = useCallback((range: DateRange) => {
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

	const getPreviousDateRange = useCallback(
		(range: DateRange) => {
			const { startDate, endDate } = getDateRangeValues(range);
			const start = new Date(startDate);
			const end = new Date(endDate);
			const diff = end.getTime() - start.getTime();
			const prevEnd = new Date(start.getTime() - 1);
			const prevStart = new Date(prevEnd.getTime() - diff);
			return {
				startDate: prevStart.toISOString().split("T")[0],
				endDate: prevEnd.toISOString().split("T")[0],
			};
		},
		[getDateRangeValues],
	);

	const fetchAnalytics = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}

		// Use isRefreshing for subsequent loads to keep header visible
		if (!hasLoadedOnce.current) {
			setLoading(true);
		} else {
			setIsRefreshing(true);
		}
		try {
			const { startDate, endDate } = getDateRangeValues(dateRange);
			const { startDate: prevStartDate, endDate: prevEndDate } = getPreviousDateRange(dateRange);

			// Core analytics - these should always work
			const [
				summaryData,
				previousSummaryData,
				daily,
				countries,
				channels,
				tools,
				triggersAnalytics,
				pages,
			] = await Promise.all([
				getAnalyticsSummary(currentAgent.id, startDate, endDate),
				getAnalyticsSummary(currentAgent.id, prevStartDate, prevEndDate),
				getAnalyticsDaily(currentAgent.id, startDate, endDate),
				getAnalyticsCountries(currentAgent.id, startDate, endDate),
				getAnalyticsChannels(currentAgent.id, startDate, endDate),
				getAnalyticsTools(currentAgent.id, startDate, endDate),
				getAnalyticsTriggers(currentAgent.id, startDate, endDate),
				getAnalyticsPages(currentAgent.id, startDate, endDate),
			]);

			setSummary(summaryData);
			setPreviousSummary(previousSummaryData);
			setDailyData(daily);
			setCountryData(countries);
			setChannelData(channels);
			setToolData(tools);
			setTriggerData(triggersAnalytics);
			setPageData(pages);

			// Optional new analytics - fetch separately so they don't break the page
			try {
				const responseTimeData = await getResponseTime(currentAgent.id, startDate, endDate);
				setResponseTime(responseTimeData);
			} catch (err) {
				console.error("Failed to fetch response time:", err);
				setResponseTime(null);
			}

			try {
				const humanResponseTimeData = await getHumanResponseTime(
					currentAgent.id,
					startDate,
					endDate,
				);
				setHumanResponseTime(humanResponseTimeData);
			} catch (err) {
				console.error("Failed to fetch human response time:", err);
				setHumanResponseTime(null);
			}

			try {
				const formAnalyticsData = await getFormAnalytics(currentAgent.id, startDate, endDate);
				setFormAnalytics(formAnalyticsData);
			} catch (err) {
				console.error("Failed to fetch form analytics:", err);
				setFormAnalytics([]);
			}
		} catch (err) {
			console.error("Failed to fetch analytics:", err);
		} finally {
			hasLoadedOnce.current = true;
			setLoading(false);
			setIsRefreshing(false);
		}
	}, [currentAgent, dateRange, getDateRangeValues, getPreviousDateRange]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchAnalytics();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchAnalytics]);

	// Calculate changes for summary cards
	const conversationsChange =
		summary && previousSummary
			? calculateChange(summary.totalConversations, previousSummary.totalConversations)
			: null;
	const messagesChange =
		summary && previousSummary
			? calculateChange(summary.totalMessages, previousSummary.totalMessages)
			: null;

	// Skeleton loading component for content sections
	const SkeletonContent = () => (
		<div className="space-y-12">
			{/* Overview Skeleton */}
			<section>
				<div className="h-4 w-32 bg-[#E5E5E5] mb-4" />
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
					{[...Array(5)].map((_, i) => (
						<div key={i} className="bg-white border border-[#D1D1D1] p-5 min-h-[120px]">
							<Skeleton className="w-24 h-3 mb-4" />
							<Skeleton className="w-16 h-8 mb-2" />
							<Skeleton className="w-20 h-3" />
						</div>
					))}
				</div>
			</section>

			{/* Charts Skeleton */}
			<section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
				{[...Array(2)].map((_, i) => (
					<div key={i} className="bg-white border border-[#D1D1D1] h-72">
						<div className="p-4 border-b border-[#F3F2EE] bg-[#FAFAF9]">
							<Skeleton className="w-40 h-4" />
						</div>
						<div className="p-4">
							<Skeleton className="w-full h-48" />
						</div>
					</div>
				))}
			</section>

			{/* Table Skeleton */}
			<div className="bg-white border border-[#D1D1D1]">
				<div className="px-6 py-4 border-b border-[#F3F2EE] bg-[#FAFAF9]">
					<Skeleton className="w-32 h-4" />
				</div>
				<div className="px-6 py-4 space-y-3">
					{[...Array(4)].map((_, i) => (
						<Skeleton key={i} className="w-full h-8" />
					))}
				</div>
			</div>
		</div>
	);

	if (!currentAgent && !loading) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] p-8">
				<Empty className="my-16">
					<EmptyContent>
						<EmptyMedia variant="icon">
							<BarChart3 />
						</EmptyMedia>
						<EmptyTitle>No agent selected</EmptyTitle>
						<EmptyDescription>Select an agent to view analytics.</EmptyDescription>
					</EmptyContent>
				</Empty>
			</div>
		);
	}

	const showSkeleton = loading || isRefreshing;

	// Custom tooltip for charts - brutalist styled
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
				<div style={brutalistTooltipStyle}>
					<p className="text-xs font-mono font-medium text-[#1A1A1A] mb-1">
						{label
							? new Date(label).toLocaleDateString("en-US", { month: "short", day: "numeric" })
							: ""}
					</p>
					{payload.map((entry) => (
						<p key={entry.name} className="font-mono text-xs" style={{ color: entry.color }}>
							{entry.name}: {(entry.value ?? 0).toLocaleString()}
						</p>
					))}
				</div>
			);
		}
		return null;
	};

	// Render sheet content based on selected metric
	const renderSheetContent = () => {
		switch (selectedMetric) {
			case "conversations":
				return (
					<div className="space-y-4">
						<div className="py-2 text-center">
							<div className="text-3xl font-medium tracking-tighter text-[#1A1A1A]">
								{(summary?.totalConversations ?? 0).toLocaleString()}
							</div>
							<Text className="text-[#888] font-mono text-xs uppercase">Total conversations</Text>
							{conversationsChange !== null && (
								<span
									className={`text-xs font-mono ${conversationsChange >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{formatTrend(conversationsChange)}
								</span>
							)}
						</div>
						{dailyData.length > 0 && (
							<ResponsiveContainer width="100%" height={200}>
								<AreaChart data={dailyData}>
									<defs>
										<linearGradient id="colorConvSheet" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor={brutalistChartTheme.colors.primary}
												stopOpacity={0.2}
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
										tick={brutalistAxisTickStyle}
									/>
									<YAxis tick={brutalistAxisTickStyle} />
									<RechartsTooltip content={<CustomTooltip />} />
									<Area
										type="monotone"
										dataKey="conversations"
										name="Conversations"
										stroke={brutalistChartTheme.colors.primary}
										fillOpacity={1}
										fill="url(#colorConvSheet)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</div>
				);
			case "messages":
				return (
					<div className="space-y-4">
						<div className="py-2 text-center">
							<div className="text-3xl font-medium tracking-tighter text-[#1A1A1A]">
								{(summary?.totalMessages ?? 0).toLocaleString()}
							</div>
							<Text className="text-[#888] font-mono text-xs uppercase">Total messages</Text>
							{messagesChange !== null && (
								<span
									className={`text-xs font-mono ${messagesChange >= 0 ? "text-green-600" : "text-red-600"}`}
								>
									{formatTrend(messagesChange)}
								</span>
							)}
						</div>
						{dailyData.length > 0 && (
							<ResponsiveContainer width="100%" height={200}>
								<AreaChart data={dailyData}>
									<defs>
										<linearGradient id="colorMsgSheet" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor={brutalistChartTheme.colors.secondary}
												stopOpacity={0.2}
											/>
											<stop
												offset="95%"
												stopColor={brutalistChartTheme.colors.secondary}
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
										tick={brutalistAxisTickStyle}
									/>
									<YAxis tick={brutalistAxisTickStyle} />
									<RechartsTooltip content={<CustomTooltip />} />
									<Area
										type="monotone"
										dataKey="messages"
										name="Messages"
										stroke={brutalistChartTheme.colors.secondary}
										fillOpacity={1}
										fill="url(#colorMsgSheet)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</div>
				);
			case "feedback":
				return (
					<div className="space-y-4">
						<div className="py-2 text-center">
							<div className="text-3xl font-medium tracking-tighter text-[#1A1A1A]">
								{summary && summary.thumbsUp + summary.thumbsDown > 0
									? `${Math.round(summary.feedbackRatio * 100)}%`
									: "N/A"}
							</div>
							<Text className="text-[#888] font-mono text-xs uppercase">
								Positive feedback rate
							</Text>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="p-4 text-center border border-green-200 bg-green-50">
								<ThumbsUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
								<div className="text-2xl font-bold text-green-600">{summary?.thumbsUp || 0}</div>
								<Text size="sm" className="font-mono text-xs text-green-600 uppercase">
									Positive
								</Text>
							</div>
							<div className="p-4 text-center border border-red-200 bg-red-50">
								<ThumbsDown className="w-6 h-6 mx-auto mb-2 text-red-600" />
								<div className="text-2xl font-bold text-red-600">{summary?.thumbsDown || 0}</div>
								<Text size="sm" className="font-mono text-xs text-red-600 uppercase">
									Negative
								</Text>
							</div>
						</div>
					</div>
				);
			case "slaCompliance":
				return (
					<div className="space-y-4">
						<div className="py-2 text-center">
							<div className="text-3xl font-medium tracking-tighter text-[#1A1A1A]">
								{humanResponseTime?.slaCompliance.respondedCount
									? `${humanResponseTime.slaCompliance.complianceRate}%`
									: "N/A"}
							</div>
							<Text className="text-[#888] font-mono text-xs uppercase">SLA Compliance Rate</Text>
						</div>
						{humanResponseTime?.complianceTimeSeries &&
							humanResponseTime.complianceTimeSeries.length > 0 && (
								<ResponsiveContainer width="100%" height={200}>
									<AreaChart data={humanResponseTime.complianceTimeSeries}>
										<defs>
											<linearGradient id="colorSlaSheet" x1="0" y1="0" x2="0" y2="1">
												<stop
													offset="5%"
													stopColor={brutalistChartTheme.colors.secondary}
													stopOpacity={0.2}
												/>
												<stop
													offset="95%"
													stopColor={brutalistChartTheme.colors.secondary}
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
											tick={brutalistAxisTickStyle}
										/>
										<YAxis domain={[0, 100]} tick={brutalistAxisTickStyle} />
										<RechartsTooltip
											formatter={(value) => [`${value}%`, "Compliance"]}
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
											dataKey="complianceRate"
											stroke={brutalistChartTheme.colors.secondary}
											fillOpacity={1}
											fill="url(#colorSlaSheet)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							)}
					</div>
				);
			default:
				return null;
		}
	};

	// Section components for reuse
	const OverviewSection = () => (
		<div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-5">
			<Card variant="metric" onClick={() => openMetricSheet("conversations")}>
				<CardMetricHeader
					label="Conversations"
					icon={MessageSquare}
					trend={formatTrend(conversationsChange)}
				/>
				<CardValue>{(summary?.totalConversations ?? 0).toLocaleString()}</CardValue>
			</Card>
			<Card variant="metric" onClick={() => openMetricSheet("messages")}>
				<CardMetricHeader label="Messages" icon={Terminal} trend={formatTrend(messagesChange)} />
				<CardValue>{(summary?.totalMessages ?? 0).toLocaleString()}</CardValue>
			</Card>
			<Card variant="metric">
				<CardMetricHeader label="Avg Msgs/Conv" icon={Activity} />
				<CardValue>{summary?.avgMessagesPerConversation || 0}</CardValue>
			</Card>
			<Card variant="metric">
				<CardMetricHeader label="Avg Response" icon={Clock} />
				<CardValue>
					{responseTime ? formatDuration(responseTime.avgResponseTimeMs) : "N/A"}
				</CardValue>
				<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
					{responseTime?.totalPairs || 0} responses
				</div>
			</Card>
			<div className="relative">
				<Card
					variant="metric"
					onClick={!isFreePlan ? () => openMetricSheet("feedback") : undefined}
				>
					<CardMetricHeader label="Feedback Score" icon={ThumbsUp} />
					<CardValue className={cn({ "opacity-50 blur-sm": isFreePlan })}>
						{summary && summary.thumbsUp + summary.thumbsDown > 0
							? `${Math.round(summary.feedbackRatio * 100)}%`
							: "N/A"}
					</CardValue>
					<div
						className={cn("flex items-center gap-2 mt-2 text-[9px] text-[#888] font-mono", {
							"opacity-50 blur-sm": isFreePlan,
						})}
					>
						<ThumbsUp size={10} />
						{summary?.thumbsUp || 0}
						<ThumbsDown size={10} className="ml-1" />
						{summary?.thumbsDown || 0}
					</div>
				</Card>
				{isFreePlan && (
					<div className="absolute top-[30px] inset-0 flex flex-col items-center justify-center bg-[#F3F2EE]/10">
						<Lock className="w-5 h-5 mb-2 text-[#888]" />
						<Text size="sm" className="font-mono text-xs">
							Upgrade to see
						</Text>
						<Link href="/billing">
							<Button variant="outline" size="sm" className="mt-2 text-[10px] font-mono uppercase">
								Upgrade
							</Button>
						</Link>
					</div>
				)}
			</div>
		</div>
	);

	const EngagementSection = () => (
		<div className="grid gap-4 lg:grid-cols-2">
			{/* Conversations Chart */}
			<Card variant="chart" className="relative">
				<CardChartHeader title="Conversations Over Time" icon={MessageSquare} />
				<CardChartContent>
					<div className={isFreePlan ? "opacity-50 blur-sm" : ""}>
						{dailyData.length === 0 ? (
							<div className="py-8 text-center text-[#888] font-mono text-xs">
								No data available
							</div>
						) : (
							<ResponsiveContainer width="100%" height={250}>
								<AreaChart data={dailyData}>
									<defs>
										<linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
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
										dataKey="conversations"
										name="Conversations"
										stroke={brutalistChartTheme.colors.primary}
										fillOpacity={1}
										fill="url(#colorConversations)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardChartContent>
				{isFreePlan && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F3F2EE]/10">
						<Lock className="w-5 h-5 mb-2 text-[#888]" />
						<span className="font-mono text-xs">Upgrade to see</span>
						<Link href="/billing">
							<Button variant="outline" size="sm" className="mt-2 text-[10px] font-mono uppercase">
								Upgrade
							</Button>
						</Link>
					</div>
				)}
			</Card>

			{/* Messages Chart */}
			<Card variant="chart" className="relative">
				<CardChartHeader title="Messages Over Time" icon={Terminal} />
				<CardChartContent>
					<div className={isFreePlan ? "opacity-50 blur-sm" : ""}>
						{dailyData.length === 0 ? (
							<div className="py-8 text-center text-[#888] font-mono text-xs">
								No data available
							</div>
						) : (
							<ResponsiveContainer width="100%" height={250}>
								<AreaChart data={dailyData}>
									<defs>
										<linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
											<stop
												offset="5%"
												stopColor={brutalistChartTheme.colors.success}
												stopOpacity={0.3}
											/>
											<stop
												offset="95%"
												stopColor={brutalistChartTheme.colors.success}
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
										dataKey="messages"
										name="Messages"
										stroke={brutalistChartTheme.colors.success}
										fillOpacity={1}
										fill="url(#colorMessages)"
									/>
								</AreaChart>
							</ResponsiveContainer>
						)}
					</div>
				</CardChartContent>
				{isFreePlan && (
					<div className="absolute inset-0 flex flex-col items-center justify-center bg-[#F3F2EE]/10">
						<Lock className="w-5 h-5 mb-2 text-[#888]" />
						<span className="font-mono text-xs">Upgrade to see</span>
						<Link href="/billing">
							<Button variant="outline" size="sm" className="mt-2 text-[10px] font-mono uppercase">
								Upgrade
							</Button>
						</Link>
					</div>
				)}
			</Card>
		</div>
	);

	const FormSection = () =>
		formAnalytics.length > 0 ? (
			<Card variant="section">
				<CardSectionHeader title="Form Analytics" icon={FormInput} />
				<div className="overflow-x-auto">
					{/* Header */}
					<div className="grid grid-cols-7 gap-2 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div>Form Name</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right">
										<span className="border-b border-dashed cursor-help border-[#888]">
											Impressions
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">
										Number of times the form was displayed
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right">
										<span className="border-b border-dashed cursor-help border-[#888]">
											Started
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">
										Users who started filling out the form
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<div className="text-right">Submitted</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right">
										<span className="border-b border-dashed cursor-help border-[#888]">
											Start Rate
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">% of impressions where users started</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right">
										<span className="border-b border-dashed cursor-help border-[#888]">
											Completion
										</span>
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">
										% of started forms that were completed
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<div className="text-right">Avg Time</div>
					</div>
					{/* Rows */}
					<div className="px-6 divide-y divide-[#F3F2EE]">
						{formAnalytics.map((form) => (
							<FormRow
								key={form.toolId}
								name={form.toolName}
								impressions={form.impressionCount ?? 0}
								started={form.startedCount ?? 0}
								submitted={form.submissionCount ?? 0}
								startRate={Math.round(form.startRate)}
								completionRate={Math.round(form.completionRate)}
								avgTime={
									form.avgCompletionTimeSeconds
										? `${Math.round(form.avgCompletionTimeSeconds)}s`
										: "N/A"
								}
							/>
						))}
					</div>
				</div>
			</Card>
		) : null;

	const HumanResponseSection = () =>
		humanResponseTime &&
		(humanResponseTime.responseTime.totalConversations > 0 ||
			humanResponseTime.slaCompliance.totalEscalations > 0) ? (
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
					{/* Avg Human Response Time */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<Card variant="metric">
										<CardMetricHeader label="Avg Response Time" icon={Clock} />
										<CardValue>
											{humanResponseTime.responseTime.avgResponseTimeMs > 0
												? formatDuration(humanResponseTime.responseTime.avgResponseTimeMs)
												: "N/A"}
										</CardValue>
										<div className="mt-2 text-[9px] text-[#888] font-mono">
											{humanResponseTime.responseTime.totalConversations} conversations
										</div>
									</Card>
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs font-mono text-xs">
								<p>Average time from conversation start to first human agent response</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					{/* Median Response Time */}
					<Card variant="metric">
						<CardMetricHeader label="Median Response" icon={Clock} />
						<CardValue>
							{humanResponseTime.responseTime.medianResponseTimeMs > 0
								? formatDuration(humanResponseTime.responseTime.medianResponseTimeMs)
								: "N/A"}
						</CardValue>
						<div className="mt-2 text-[9px] text-[#888] font-mono">50th percentile</div>
					</Card>

					{/* SLA Compliance */}
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<div>
									<Card
										variant="metric"
										onClick={() => openMetricSheet("slaCompliance")}
										className={
											humanResponseTime.slaCompliance.complianceRate >= 80
												? "border-[#22c55e]/30"
												: humanResponseTime.slaCompliance.complianceRate < 50
													? "border-[#ef4444]/30"
													: ""
										}
									>
										<CardMetricHeader label="SLA Compliance" icon={CheckCircle} />
										<CardValue>
											{humanResponseTime.slaCompliance.respondedCount > 0
												? `${humanResponseTime.slaCompliance.complianceRate}%`
												: "N/A"}
										</CardValue>
										<div className="mt-2 text-[9px] text-[#888] font-mono">
											{humanResponseTime.slaCompliance.withinSlaCount} of{" "}
											{humanResponseTime.slaCompliance.respondedCount} within SLA
										</div>
									</Card>
								</div>
							</TooltipTrigger>
							<TooltipContent className="max-w-xs font-mono text-xs">
								<p>Percentage of escalations responded to within SLA deadline</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>

					{/* SLA Breaches */}
					<Card variant="metric">
						<CardMetricHeader label="SLA Breaches" icon={UserCheck} />
						<CardValue>
							{humanResponseTime.slaCompliance.breachedCount +
								humanResponseTime.slaCompliance.unrespondedBreachedCount}
						</CardValue>
						<div className="mt-2 text-[9px] text-[#888] font-mono">
							{humanResponseTime.slaCompliance.unrespondedBreachedCount} still unresponded
						</div>
					</Card>
				</div>

				<div className="grid gap-4 lg:grid-cols-2">
					{/* SLA Compliance Over Time */}
					<Card variant="chart">
						<CardChartHeader title="SLA Compliance Over Time" icon={TrendingUp} />
						<CardChartContent>
							{humanResponseTime.complianceTimeSeries.length === 0 ? (
								<div className="py-8 text-center text-[#888] font-mono text-xs">
									No SLA compliance data yet
								</div>
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<AreaChart data={humanResponseTime.complianceTimeSeries}>
										<defs>
											<linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
												<stop
													offset="5%"
													stopColor={brutalistChartTheme.colors.success}
													stopOpacity={0.3}
												/>
												<stop
													offset="95%"
													stopColor={brutalistChartTheme.colors.success}
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
											contentStyle={brutalistTooltipStyle}
											formatter={(value, name) => {
												if (name === "complianceRate") return [`${value}%`, "Compliance"];
												return [value, name];
											}}
											labelFormatter={(label) =>
												new Date(String(label)).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
												})
											}
										/>
										<Area
											type="monotone"
											dataKey="complianceRate"
											name="complianceRate"
											stroke={brutalistChartTheme.colors.success}
											fillOpacity={1}
											fill="url(#colorCompliance)"
										/>
									</AreaChart>
								</ResponsiveContainer>
							)}
						</CardChartContent>
					</Card>

					{/* Response Time Distribution */}
					<Card variant="chart">
						<CardChartHeader title="Response Time Distribution" icon={BarChart3} />
						<CardChartContent>
							{humanResponseTime.responseTimeDistribution.length === 0 ? (
								<div className="py-8 text-center text-[#888] font-mono text-xs">
									No response time data yet
								</div>
							) : (
								<ResponsiveContainer width="100%" height={200}>
									<BarChart data={humanResponseTime.responseTimeDistribution} layout="vertical">
										<XAxis type="number" {...brutalistAxisTickStyle} />
										<YAxis
											dataKey="bucket"
											type="category"
											{...brutalistAxisTickStyle}
											width={70}
										/>
										<RechartsTooltip contentStyle={brutalistTooltipStyle} />
										<Bar dataKey="count" name="Conversations" radius={0}>
											{humanResponseTime.responseTimeDistribution.map((entry) => (
												<Cell
													key={`cell-${entry.bucket}`}
													fill={
														entry.bucket === "< 5 min"
															? "#22c55e"
															: entry.bucket === "5-15 min"
																? "#84cc16"
																: entry.bucket === "15-30 min"
																	? "#eab308"
																	: entry.bucket === "30-60 min"
																		? "#f97316"
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
				</div>
			</div>
		) : null;

	const ToolsSection = () => (
		<Card variant="section">
			<CardSectionHeader title="Tool Usage" icon={Wrench} />
			{toolData.length === 0 ? (
				<div className="py-8 text-center text-[#888] font-mono text-xs">
					No tool usage data available
				</div>
			) : (
				<div className="overflow-x-auto">
					{/* Header */}
					<div className="grid grid-cols-4 gap-2 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div>Tool Name</div>
						<div className="text-right">Executions</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right border-b border-dashed cursor-help border-[#888] w-fit ml-auto">
										Success Rate
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">Executions completed without errors</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<div className="text-right">Avg Time</div>
					</div>
					{/* Rows */}
					<div className="px-6 divide-y divide-[#F3F2EE]">
						{[...toolData]
							.sort((a, b) => (b.executionCount ?? 0) - (a.executionCount ?? 0))
							.map((tool) => (
								<ToolRow
									key={tool.toolName}
									name={tool.toolName}
									executions={tool.executionCount ?? 0}
									success={Math.round(tool.successRate * 100)}
									time={tool.avgExecutionTimeMs}
								/>
							))}
					</div>
				</div>
			)}
		</Card>
	);

	const TriggersSection = () => (
		<Card variant="section">
			<CardSectionHeader title="Trigger Performance" icon={Zap} />
			{triggerData.length === 0 ? (
				<div className="py-8 text-center text-[#888] font-mono text-xs">
					No trigger data available
				</div>
			) : (
				<div className="overflow-x-auto">
					{/* Header */}
					<div className="grid grid-cols-6 gap-2 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
						<div>Trigger</div>
						<div>Type</div>
						<div className="text-right">Fired</div>
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<div className="text-right border-b border-dashed cursor-help border-[#888] w-fit ml-auto">
										Converted
									</div>
								</TooltipTrigger>
								<TooltipContent>
									<p className="max-w-xs font-mono text-xs">
										User sent a message after trigger shown
									</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<div className="text-right">Conv. Rate</div>
						<div className="text-right">Status</div>
					</div>
					{/* Rows */}
					<div className="px-6 divide-y divide-[#F3F2EE]">
						{triggerData.map((trigger) => (
							<TriggerRow
								key={trigger.triggerId || trigger.triggerName}
								name={trigger.triggerName}
								type={trigger.triggerType.replace(/_/g, " ")}
								fired={trigger.firedCount ?? 0}
								converted={trigger.convertedCount ?? 0}
								conversionRate={trigger.conversionRate}
								status={trigger.isEnabled ? "active" : "inactive"}
							/>
						))}
					</div>
				</div>
			)}
		</Card>
	);

	const ChannelsSection = () => (
		<Card variant="section">
			<CardSectionHeader title="Conversations by Channel" icon={Radio} />
			{channelData.length === 0 ? (
				<div className="py-8 text-center text-[#888] font-mono text-xs">
					No channel data available
				</div>
			) : (
				<div className="space-y-1">
					{channelData.map((channel) => (
						<DataRow
							key={channel.channel}
							label={channel.channel}
							value={(channel.conversationCount ?? 0).toLocaleString()}
						/>
					))}
				</div>
			)}
		</Card>
	);

	const CountriesSection = () => (
		<Card variant="section">
			<CardSectionHeader title="Conversations by Country" icon={Globe} />
			{countryData.length === 0 ? (
				<div className="py-8 text-center text-[#888] font-mono text-xs">
					No country data available
				</div>
			) : (
				<div className="space-y-1">
					{countryData.slice(0, 12).map((country) => (
						<DataRow
							key={country.countryCode}
							icon={<span className="text-lg">{getCountryFlag(country.countryCode)}</span>}
							label={getCountryName(country.countryCode)}
							value={(country.conversationCount ?? 0).toLocaleString()}
						/>
					))}
				</div>
			)}
		</Card>
	);

	const PagesSection = () => {
		const [showAllPages, setShowAllPages] = useState(false);
		const displayedPages = showAllPages ? pageData : pageData.slice(0, 10);

		return (
			<Card variant="section">
				<CardSectionHeader title="Conversations by Page" icon={FileText} />
				{pageData.length === 0 ? (
					<div className="py-8 text-center text-[#888] font-mono text-xs">
						No page data available
					</div>
				) : (
					<div className="overflow-x-auto">
						{/* Header */}
						<div className="grid grid-cols-2 gap-2 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
							<div>Page</div>
							<div className="text-right">Conversations</div>
						</div>
						{/* Rows */}
						<div className="px-6 divide-y divide-[#F3F2EE]">
							{displayedPages.map((page) => (
								<div
									key={`${page.pageDomain}${page.pagePath}`}
									className="grid grid-cols-2 gap-2 py-3 text-sm"
								>
									<div className="flex flex-col">
										<span className="text-[10px] text-[#888] font-mono">{page.pageDomain}</span>
										<span className="font-mono font-medium text-[#1A1A1A]">
											{page.pagePath || "/"}
										</span>
									</div>
									<div className="text-right font-mono text-[#888]">
										{(page.conversationCount ?? 0).toLocaleString()}
									</div>
								</div>
							))}
						</div>
						{/* Show More / Show Less Button */}
						{pageData.length > 10 && (
							<button
								type="button"
								onClick={() => setShowAllPages(!showAllPages)}
								className="w-full py-3 text-[10px] font-mono font-bold uppercase tracking-widest text-[#888] hover:text-[#1A1A1A] hover:bg-[#F9F9F9] transition-colors border-t border-[#F3F2EE]"
							>
								{showAllPages ? "Show Less" : `Show More (${pageData.length - 10} more)`}
							</button>
						)}
					</div>
				)}
			</Card>
		);
	};

	// Mobile layout with swipeable sections and accordion
	const MobileContent = () => (
		<SwipeableContainer>
			{/* Group 1: Overview + Engagement */}
			<div className="space-y-4">
				<Accordion type="multiple" defaultValue={["overview", "engagement"]} className="space-y-2">
					<AccordionItem value="overview" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Overview
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<OverviewSection />
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="engagement" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Engagement
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<EngagementSection />
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>

			{/* Group 2: Forms + Human Response */}
			<div className="space-y-4">
				<Accordion type="multiple" defaultValue={["forms"]} className="space-y-2">
					{formAnalytics.length > 0 && (
						<AccordionItem value="forms" className="border border-[#D1D1D1] bg-[#F3F2EE]">
							<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
								Form Performance
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4">
								<FormSection />
							</AccordionContent>
						</AccordionItem>
					)}
					{humanResponseTime &&
						(humanResponseTime.responseTime.totalConversations > 0 ||
							humanResponseTime.slaCompliance.totalEscalations > 0) && (
							<AccordionItem
								value="human-response"
								className="border border-[#D1D1D1] bg-[#F3F2EE]"
							>
								<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
									Human Response Time
								</AccordionTrigger>
								<AccordionContent className="px-4 pb-4">
									<HumanResponseSection />
								</AccordionContent>
							</AccordionItem>
						)}
				</Accordion>
			</div>

			{/* Group 4: Tools + Triggers */}
			<div className="space-y-4">
				<Accordion type="multiple" defaultValue={["tools"]} className="space-y-2">
					<AccordionItem value="tools" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Tool Usage
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<ToolsSection />
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="triggers" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Trigger Performance
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<TriggersSection />
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>

			{/* Group 5: Channels + Countries + Pages */}
			<div className="space-y-4">
				<Accordion type="multiple" defaultValue={["channels"]} className="space-y-2">
					<AccordionItem value="channels" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Channels
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<ChannelsSection />
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="countries" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Countries
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<CountriesSection />
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="pages" className="border border-[#D1D1D1] bg-[#F3F2EE]">
						<AccordionTrigger className="px-4 font-mono text-[11px] uppercase tracking-widest text-[#888] hover:no-underline">
							Pages
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">
							<PagesSection />
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</SwipeableContainer>
	);

	// Desktop layout (original)
	const DesktopContent = () => (
		<div className="space-y-8">
			{/* Overview Section */}
			<div>
				<SectionHeader title="Overview" icon={<Layout className="w-4 h-4" />} />
				<OverviewSection />
			</div>

			{/* Engagement Charts */}
			<div>
				<SectionHeader title="Engagement" icon={<Activity className="w-4 h-4" />} />
				<EngagementSection />
			</div>

			{/* Form Analytics */}
			{formAnalytics.length > 0 && (
				<div>
					<SectionHeader title="Form Performance" icon={<FormInput className="w-4 h-4" />} />
					<FormSection />
				</div>
			)}

			{/* Human Response Time */}
			{humanResponseTime &&
				(humanResponseTime.responseTime.totalConversations > 0 ||
					humanResponseTime.slaCompliance.totalEscalations > 0) && (
					<div>
						<SectionHeader title="Human Response Time" icon={<UserCheck className="w-4 h-4" />} />
						<HumanResponseSection />
					</div>
				)}

			{/* Tools */}
			<div>
				<SectionHeader title="Tools & Triggers" icon={<Terminal className="w-4 h-4" />} />
				<div className="grid gap-4 lg:grid-cols-2">
					<ToolsSection />
					<TriggersSection />
				</div>
			</div>

			{/* Distribution */}
			<div>
				<SectionHeader title="Distribution" icon={<Globe className="w-4 h-4" />} />
				<div className="grid gap-4 lg:grid-cols-3">
					<ChannelsSection />
					<CountriesSection />
					<PagesSection />
				</div>
			</div>
		</div>
	);

	return (
		<>
			<div className="min-h-screen">
				<PageHeader
					title="Analytics"
					subtitle="Track conversations and user engagement metrics"
					icon={<BarChart3 size={12} />}
					action={
						<DateRangeSelector value={dateRange} onChange={setDateRange} disabled={showSkeleton} />
					}
				/>

				<div className="p-8 space-y-8">
					{showSkeleton ? <SkeletonContent /> : isMobile ? <MobileContent /> : <DesktopContent />}
				</div>
			</div>

			{/* Bottom sheet for metric details (mobile only) */}
			<MetricDetailSheet open={sheetOpen} onOpenChange={setSheetOpen} metric={selectedMetric}>
				{renderSheetContent()}
			</MetricDetailSheet>
		</>
	);
}
