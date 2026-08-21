"use client";

import { PageHeader, SectionHeader } from "@ansa/ui";
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowRight,
	Brain,
	CheckCircle2,
	MessageSquare,
	Terminal,
	X,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import {
	GettingStartedChecklist,
	isChecklistDismissed,
	isChecklistTested,
} from "@/components/getting-started-checklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardMetricHeader, CardValue } from "@/components/ui/card";
import { DataLog } from "@/components/ui/data-log";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgent } from "@/lib/agent-context";
import {
	getAnalyticsLowConfidence,
	getAnalyticsOutcomes,
	getAnalyticsResolvedQuestions,
	getAnalyticsSummary,
	getAnalyticsTopQuestions,
	getConfidenceDistribution,
	getConfidenceSummary,
	getConversationCounts,
	getInterfaceSettings,
	listConversations,
	listDocuments,
	listQaSources,
	listTextSources,
	listTools,
	listTriggers,
	listWebSources,
} from "@/lib/api";
import { calculateTrustedAnswerRate, cn } from "@/lib/utils";

interface OverviewStats {
	// AI Health
	trustedAnswerRate: number;
	avgConfidence: number;
	unansweredCount: number;
	lowConfidenceCount: number;

	// Activity
	conversations: number;
	conversationsTrend: number;
	messages: number;
	messagesTrend: number;
	outcomes: number;
	outcomesTrend: number;

	// Learning Loop (7 days)
	newQuestions: number;
	resolvedQuestions: number;
	confidenceDelta: number;
	topQuestions: string[];
}

export default function OverviewPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [isLoading, setIsLoading] = useState(true);
	const [hasData, setHasData] = useState(false);
	const [stats, setStats] = useState<OverviewStats | null>(null);
	const [hasKnowledge, setHasKnowledge] = useState(false);
	const [hasTriggers, setHasTriggers] = useState(false);
	const [hasTools, setHasTools] = useState(false);
	const [hasPlaygroundConversations, setHasPlaygroundConversations] = useState(false);
	const [dismissedOnboarding, setDismissedOnboarding] = useState({
		knowledge: false,
		trigger: false,
		widget: false,
		tools: false,
	});

	// Getting started checklist state
	const [checklistData, setChecklistData] = useState<{
		hasWebSources: boolean;
		hasFiles: boolean;
		hasQASources: boolean;
		hasCustomWidget: boolean;
		hasTested: boolean;
		showChecklist: boolean;
	}>({
		hasWebSources: false,
		hasFiles: false,
		hasQASources: false,
		hasCustomWidget: false,
		hasTested: false,
		showChecklist: false,
	});

	useEffect(() => {
		if (!currentAgent) return;

		const fetchOverviewData = async () => {
			setIsLoading(true);
			try {
				// Check if agent has any real conversations (exclude demo and playground)
				const conversationsResponse = await listConversations({
					agentId: currentAgent.id,
					limit: 50,
				});

				const hasRealConversations =
					conversationsResponse.conversations.filter(
						(conv) => conv.channel !== "playground" && !conv.visitorId?.startsWith("demo_visitor_"),
					).length > 0;

				setHasData(hasRealConversations);

				// Check for onboarding completion
				const hasPlayground = conversationsResponse.conversations.some(
					(conv) => conv.channel === "playground",
				);
				setHasPlaygroundConversations(hasPlayground);

				// Check for knowledge sources and triggers in parallel
				const [documents, textSources, qaSources, webSources, triggers, tools] = await Promise.all([
					listDocuments(currentAgent.id),
					listTextSources(currentAgent.id),
					listQaSources(currentAgent.id),
					listWebSources(currentAgent.id),
					listTriggers(currentAgent.id),
					listTools(currentAgent.id).catch(() => []),
				]);

				const hasAnySources =
					(documents?.documents?.length ?? 0) > 0 ||
					(textSources?.length ?? 0) > 0 ||
					(qaSources?.length ?? 0) > 0 ||
					(webSources?.length ?? 0) > 0;

				setHasKnowledge(hasAnySources);
				setHasTriggers((triggers?.length ?? 0) > 0);
				setHasTools((tools?.length ?? 0) > 0);

				// Update checklist data if not dismissed
				if (!isChecklistDismissed(currentAgent.id)) {
					// Fetch interface settings to check widget customization
					const interfaceSettings = await getInterfaceSettings(currentAgent.id).catch(() => null);
					const hasCustomWidget = interfaceSettings
						? interfaceSettings.primaryColor !== "#3b82f6" || !!interfaceSettings.profilePicture
						: false;

					setChecklistData({
						hasWebSources: (webSources?.length ?? 0) > 0,
						hasFiles: (documents?.documents?.length ?? 0) > 0,
						hasQASources: (qaSources?.length ?? 0) > 0 || (textSources?.length ?? 0) > 0,
						hasCustomWidget,
						hasTested: isChecklistTested(currentAgent.id),
						showChecklist: true,
					});
				}

				// Always fetch analytics data (will show 0s for new agents, demo data for onboarding)
				// Fetch analytics data
				const now = new Date();
				const daysBack = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
				const startDate = new Date(now);
				startDate.setDate(startDate.getDate() - daysBack);

				const startDateStr = startDate.toISOString().split("T")[0];
				const endDateStr = now.toISOString().split("T")[0];

				// Calculate previous period for trends
				const prevStartDate = new Date(startDate);
				prevStartDate.setDate(prevStartDate.getDate() - daysBack);
				const prevStartDateStr = prevStartDate.toISOString().split("T")[0];
				const prevEndDateStr = startDate.toISOString().split("T")[0];

				// Fetch all data in parallel
				const [
					summary,
					prevSummary,
					confidenceSummary,
					conversationCounts,
					lowConfidenceData,
					outcomesData,
					topQuestionsData,
					distributionData,
				] = await Promise.all([
					getAnalyticsSummary(currentAgent.id, startDateStr, endDateStr),
					getAnalyticsSummary(currentAgent.id, prevStartDateStr, prevEndDateStr),
					getConfidenceSummary(currentAgent.id, startDateStr, endDateStr),
					getConversationCounts(),
					getAnalyticsLowConfidence(currentAgent.id, startDateStr, endDateStr),
					getAnalyticsOutcomes(currentAgent.id, startDateStr, endDateStr),
					getAnalyticsTopQuestions(currentAgent.id, startDateStr, endDateStr, 5),
					getConfidenceDistribution(currentAgent.id, startDateStr, endDateStr),
				]);

				// Calculate trends
				const conversationsTrend =
					prevSummary.totalConversations > 0
						? Math.round(
								((summary.totalConversations - prevSummary.totalConversations) /
									prevSummary.totalConversations) *
									100,
							)
						: summary.totalConversations > 0
							? 100
							: 0;

				const messagesTrend =
					prevSummary.totalMessages > 0
						? Math.round(
								((summary.totalMessages - prevSummary.totalMessages) / prevSummary.totalMessages) *
									100,
							)
						: summary.totalMessages > 0
							? 100
							: 0;

				const outcomesTrend = 0; // TODO: Calculate from previous period outcomes

				// Calculate trusted answer rate (percentage of high-confidence responses ≥70%)
				const trustedAnswerRate = calculateTrustedAnswerRate(confidenceSummary, distributionData);

				// Get 7-day data for learning loop
				const sevenDaysAgo = new Date(now);
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
				const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

				const [sevenDaySummary, sevenDayResolved, prevSevenDayConfidence] = await Promise.all([
					getAnalyticsSummary(currentAgent.id, sevenDaysAgoStr, endDateStr),
					getAnalyticsResolvedQuestions(currentAgent.id, sevenDaysAgoStr, endDateStr),
					getConfidenceSummary(currentAgent.id, prevStartDateStr, sevenDaysAgoStr),
				]);

				const confidenceDelta =
					confidenceSummary.avgConfidence && prevSevenDayConfidence.avgConfidence
						? Math.round(confidenceSummary.avgConfidence - prevSevenDayConfidence.avgConfidence)
						: 0;

				setStats({
					trustedAnswerRate,
					avgConfidence: confidenceSummary.avgConfidence ?? 0,
					unansweredCount: conversationCounts.escalated || 0,
					lowConfidenceCount: lowConfidenceData.lowConfidenceCount,
					conversations: summary.totalConversations,
					conversationsTrend,
					messages: summary.totalMessages,
					messagesTrend,
					outcomes: outcomesData.outcomeCount,
					outcomesTrend,
					newQuestions: sevenDaySummary.totalConversations,
					resolvedQuestions: sevenDayResolved.resolvedCount,
					confidenceDelta,
					topQuestions: topQuestionsData.questions.map((q) => q.content).slice(0, 5),
				});
			} catch (error) {
				console.error("Failed to fetch overview data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchOverviewData();
	}, [currentAgent, dateRange]);

	if (isLoading) {
		return (
			<div className="min-h-screen">
				<div className="flex items-center justify-between px-8 py-5 bg-white border-b border-[#D1D1D1]">
					<div>
						<Skeleton className="w-32 mb-2 h-7" />
						<Skeleton className="w-48 h-4" />
					</div>
					<Skeleton className="w-64 h-9" />
				</div>
				<div className="p-8 space-y-8">
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
					</div>
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
						<Skeleton className="h-56" />
						<Skeleton className="h-56" />
					</div>
					<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
					</div>
					<Skeleton className="h-48 lg:col-span-2" />
				</div>
			</div>
		);
	}

	// Dismiss handler for onboarding cards
	const handleDismissOnboarding = (type: "knowledge" | "trigger" | "widget" | "tools") => {
		if (!currentAgent) return;
		localStorage.setItem(`ansa:dismissed-onboarding-${type}:${currentAgent.id}`, "true");
		setDismissedOnboarding((prev) => ({ ...prev, [type]: true }));
	};

	// Determine risks (onboarding cards first for new users)
	const risks = [];

	// Add onboarding risks at the top if not completed and not dismissed
	if (!hasData) {
		if (!hasKnowledge && !dismissedOnboarding.knowledge) {
			risks.push({
				id: "onboarding-knowledge",
				severity: "onboarding" as const,
				icon: "🔵",
				title: "Review your knowledge base",
				description: "Your AI needs quality knowledge to answer questions accurately",
				action: "Add knowledge sources",
				href: `/knowledge-ai/sources`,
				dismissible: true,
				onDismiss: () => handleDismissOnboarding("knowledge"),
			});
		}
		if (!hasTriggers && !dismissedOnboarding.trigger) {
			risks.push({
				id: "onboarding-trigger",
				severity: "onboarding" as const,
				icon: "🔵",
				title: "Configure your first trigger",
				description: "Proactively engage visitors at the right moment",
				action: "Create a trigger",
				href: `/triggers`,
				dismissible: true,
				onDismiss: () => handleDismissOnboarding("trigger"),
			});
		}
		if (!hasPlaygroundConversations && !dismissedOnboarding.widget) {
			risks.push({
				id: "onboarding-widget",
				severity: "onboarding" as const,
				icon: "🔵",
				title: "Test your AI assistant",
				description: "See how your agent responds before going live",
				action: "Test in playground",
				href: `/chat`,
				dismissible: true,
				onDismiss: () => handleDismissOnboarding("widget"),
			});
		}
		if (!hasTools && !dismissedOnboarding.tools) {
			risks.push({
				id: "onboarding-tools",
				severity: "onboarding" as const,
				icon: "🔵",
				title: "Connect an API",
				description: "Let your agent fetch live data by auto-discovering an API endpoint",
				action: "Auto-Discover API",
				href: `/tools/discover`,
				dismissible: true,
				onDismiss: () => handleDismissOnboarding("tools"),
			});
		}
	}

	// Add actual risks below onboarding cards
	if (stats && stats.unansweredCount > 0) {
		risks.push({
			id: "unanswered",
			severity: "high" as const,
			icon: "🔴",
			title: `${stats.unansweredCount} unanswered questions`,
			description: "Users asked questions your AI couldn't answer",
			action: "Review now",
			href: `/conversations?tab=escalated`,
		});
	}
	if (stats && stats.lowConfidenceCount > 0) {
		risks.push({
			id: "low-confidence",
			severity: "medium" as const,
			icon: "🟠",
			title: `${stats.lowConfidenceCount} low-confidence answers`,
			description: "These answers may reduce trust",
			action: "Improve answers",
			href: `/conversations?tab=low-confidence`,
		});
	}

	// Take top 3 risks by severity
	const topRisks = risks.slice(0, 3);

	// Smart next action
	const getNextAction = () => {
		if (stats?.unansweredCount && stats.unansweredCount > 10) {
			return {
				title: "Review unanswered questions to improve trust",
				description:
					"Review unanswered questions to improve trust and reduce follow-up conversations.",
				action: "Go to Unanswered Questions",
				href: `/conversations?filter=escalated`,
			};
		}

		if (stats?.lowConfidenceCount && stats.lowConfidenceCount > 10) {
			return {
				title: "Improve low-confidence answers",
				description: "Review and improve answers with low confidence scores to build user trust.",
				action: "Go to Low Confidence Answers",
				href: `/conversations?tab=low-confidence`,
			};
		}

		if (!hasTools) {
			return {
				title: "Connect an API with Auto-Discover",
				description:
					"Paste a URL and we'll create a tool automatically — let your agent fetch live data from any API.",
				action: "Auto-Discover API",
				href: `/tools/discover`,
			};
		}

		return {
			title: "Add more knowledge sources",
			description: "Expand your AI's knowledge base to answer more questions confidently.",
			action: "Go to Knowledge",
			href: `/ai-knowledge`,
		};
	};

	const nextAction = getNextAction();

	return (
		<div className="relative min-h-screen">
			{/* Getting Started Checklist - Floating bottom-right */}
			{currentAgent && checklistData.showChecklist && (
				<div className="fixed z-10 bottom-4 right-4">
					<GettingStartedChecklist
						agentId={currentAgent.id}
						hasWebSources={checklistData.hasWebSources}
						hasFiles={checklistData.hasFiles}
						hasQASources={checklistData.hasQASources}
						hasCustomWidget={checklistData.hasCustomWidget}
						hasTested={checklistData.hasTested}
						hasTools={hasTools}
						onDismiss={() => setChecklistData((prev) => ({ ...prev, showChecklist: false }))}
					/>
				</div>
			)}

			<PageHeader
				title="Overview"
				icon={
					<span className="flex items-center gap-2">
						<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>AI Engine: Online</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Last Sync: Just now</span>
					</span>
				}
				action={<DateRangeSelector value={dateRange} onChange={setDateRange} />}
			/>

			<div className="p-8 space-y-8">
				{/* AI Health Status */}
				<div className="space-y-4">
					<SectionHeader title="AI Health Status" icon={<Activity size={14} />} />

					<div className="grid gap-4 lg:grid-cols-3">
						<Card variant="metric">
							<CardMetricHeader label="Trusted Answer Rate" icon={CheckCircle2} />
							<CardValue>
								{stats?.trustedAnswerRate != null ? `${stats.trustedAnswerRate}%` : "0%"}
							</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								High-confidence answers (≥70%)
							</div>
						</Card>

						<Card variant="metric">
							<CardMetricHeader label="Avg Confidence" icon={Zap} />
							<CardValue>
								{stats?.avgConfidence != null ? `${stats.avgConfidence}%` : "0%"}
							</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								Across all answers
							</div>
						</Card>

						<Card variant="metric" className="border-l-4 border-l-red-500">
							<CardMetricHeader label="Unanswered" icon={AlertTriangle} />
							<CardValue>{stats?.unansweredCount ?? 0}</CardValue>
							<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
								Requires knowledge update
							</div>
						</Card>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
					{/* Immediate Risks */}
					{topRisks.length > 0 && (
						<div className="space-y-4">
							<SectionHeader title="Immediate Risks" icon={<AlertTriangle size={14} />} />

							{topRisks.map((risk) => (
								<div
									key={risk.id}
									className={cn(
										"border p-5 flex items-start justify-between",
										risk.severity === "high" && "bg-red-50 border-red-200 text-red-900",
										risk.severity === "medium" && "bg-orange-50 border-orange-200 text-orange-900",
										risk.severity === "onboarding" && "bg-blue-50 border-blue-200 text-blue-900",
									)}
								>
									<div className="flex gap-4">
										<div
											className={cn(
												"mt-0.5",
												risk.severity === "high" && "text-red-600",
												risk.severity === "medium" && "text-orange-600",
												risk.severity === "onboarding" && "text-blue-600",
											)}
										>
											<AlertCircle size={20} />
										</div>
										<div>
											<div className="flex items-center gap-2 mb-1">
												<span
													className={cn(
														"text-[9px] font-bold uppercase px-1.5 border",
														risk.severity === "high" && "border-red-300 bg-red-100 text-red-700",
														risk.severity === "medium" &&
															"border-orange-300 bg-orange-100 text-orange-700",
														risk.severity === "onboarding" &&
															"border-blue-300 bg-blue-100 text-blue-700",
													)}
												>
													{risk.severity === "onboarding" ? "setup" : risk.severity}
												</span>
												<h3 className="text-sm font-bold">{risk.title}</h3>
											</div>
											<p className="max-w-md mb-4 text-xs opacity-80">{risk.description}</p>
											<Link
												href={risk.href}
												className="text-[10px] font-bold uppercase flex items-center gap-2 border-b border-current pb-0.5 hover:opacity-70 transition-opacity w-fit"
											>
												{risk.action} <ArrowRight size={10} />
											</Link>
										</div>
									</div>
									{risk.dismissible && (
										<Button
											variant="ghost"
											size="sm"
											className="w-6 h-6 p-0 hover:bg-transparent"
											onClick={risk.onDismiss}
										>
											<X className="w-4 h-4 opacity-50 hover:opacity-100" />
										</Button>
									)}
								</div>
							))}
						</div>
					)}

					{/* Recent Activity */}
					<div className="mt-6 space-y-4 lg:col-span-2">
						<SectionHeader title="Recent Activity" icon={<Activity size={14} />} />

						<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
							<Card variant="metric">
								<CardMetricHeader
									label="Conversations"
									icon={MessageSquare}
									trend={
										stats && stats.conversationsTrend !== 0
											? `${stats.conversationsTrend > 0 ? "+" : ""}${stats.conversationsTrend}%`
											: null
									}
								/>
								<CardValue>{stats?.conversations ?? 0}</CardValue>
								<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
									Total sessions initiated
								</div>
							</Card>

							<Card variant="metric">
								<CardMetricHeader
									label="Messages Processed"
									icon={Terminal}
									trend={
										stats && stats.messagesTrend !== 0
											? `${stats.messagesTrend > 0 ? "+" : ""}${stats.messagesTrend}%`
											: null
									}
								/>
								<CardValue>{stats?.messages ?? 0}</CardValue>
								<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
									User & AI interactions
								</div>
							</Card>

							<Card variant="metric">
								<CardMetricHeader
									label="Outcomes Reached"
									icon={CheckCircle2}
									trend={
										stats && stats.outcomesTrend !== 0
											? `${stats.outcomesTrend > 0 ? "+" : ""}${stats.outcomesTrend}%`
											: null
									}
								/>
								<CardValue>{String(stats?.outcomes ?? 0).padStart(2, "0")}</CardValue>
								<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
									Successful resolutions
								</div>
							</Card>
						</div>
					</div>

					{/* Top Questions */}
					{stats && stats.topQuestions.length > 0 && (
						<DataLog
							title="Top Questions Log"
							icon={MessageSquare}
							items={stats.topQuestions}
							emptyMessage="No questions yet"
							footerAction={{
								label: "View All Conversations",
								href: "/conversations",
							}}
						/>
					)}

					{/* Learning Loop Snapshot */}
					{stats &&
						(stats.newQuestions > 0 ||
							stats.resolvedQuestions > 0 ||
							stats.confidenceDelta !== 0) && (
							<div className="bg-white border border-[#D1D1D1] shadow-sm hover:border-[#1A1A1A] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,0.1)] transition-all flex flex-col">
								<div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
									<h3 className="text-xs font-bold tracking-wide uppercase">Learning Loop</h3>
									<Brain size={12} className="text-[#888]" />
								</div>
								<div className="flex-1 p-0">
									<div className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F2EE] hover:bg-[#F9F9F9] text-sm font-mono text-[#555]">
										<span className="text-[#CCC] w-4 text-right tabular-nums">01</span>
										<span className="text-2xl font-medium tracking-tighter text-[#1A1A1A]">
											{stats?.newQuestions ?? 0}
										</span>
										<span>new questions asked</span>
									</div>
									<div className="flex items-center gap-3 px-4 py-3 border-b border-[#F3F2EE] hover:bg-[#F9F9F9] text-sm font-mono text-[#555]">
										<span className="text-[#CCC] w-4 text-right tabular-nums">02</span>
										<span
											className={cn(
												"text-2xl font-medium tracking-tighter",
												stats?.resolvedQuestions === 0 ? "text-yellow-600" : "text-[#1A1A1A]",
											)}
										>
											{stats?.resolvedQuestions ?? 0}
										</span>
										<span>
											questions resolved
											{stats?.resolvedQuestions === 0 && " ⚠️"}
										</span>
									</div>
									<div className="flex items-center gap-3 px-4 py-3 hover:bg-[#F9F9F9] text-sm font-mono text-[#555]">
										<span className="text-[#CCC] w-4 text-right tabular-nums">03</span>
										<span>Avg confidence</span>
										{stats && stats.confidenceDelta !== 0 && (
											<span
												className={cn(
													"text-[10px] font-mono font-bold px-1.5 py-0.5",
													stats.confidenceDelta > 0
														? "bg-green-100 text-green-700"
														: "bg-red-100 text-red-700",
												)}
											>
												{stats.confidenceDelta > 0 ? "+" : ""}
												{stats.confidenceDelta}%
											</span>
										)}
										<span>
											{stats ? stats.avgConfidence - stats.confidenceDelta : 0}% →{" "}
											{stats?.avgConfidence ?? 0}%
										</span>
									</div>
								</div>
								<div className="p-3 border-t border-[#D1D1D1] mt-auto">
									<Link
										href="/analytics"
										className="text-[10px] font-bold uppercase flex items-center gap-2 hover:text-[#555] transition-colors"
									>
										See Improvements <ArrowRight size={10} />
									</Link>
								</div>
							</div>
						)}

					{/* Smart Next Action */}
					<Card
						variant="brutalist"
						className="lg:col-span-2 shadow-[8px_8px_0px_0px_rgba(26,26,26,0.05)]"
					>
						<CardContent className="p-4">
							<div className="flex items-start gap-6">
								<div className="flex-1 space-y-4">
									<div className="flex items-center gap-2">
										<span className="text-[9px] font-bold uppercase px-1.5 border border-[#1A1A1A] bg-[#1A1A1A] text-white">
											recommended
										</span>
										<h3 className="text-lg font-medium tracking-tight">Next Step</h3>
									</div>
									<p className="text-sm text-[#666] max-w-xl">{nextAction.description}</p>
									<Link
										href={nextAction.href}
										className="inline-flex items-center gap-2 text-[10px] font-bold uppercase border-b border-[#1A1A1A] pb-0.5 hover:opacity-70 transition-opacity"
									>
										{nextAction.action} <ArrowRight size={10} />
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
