"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertCircle,
	CheckCircle2,
	HelpCircle,
	MessageSquare,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { PremiumGate } from "@/components/premium-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardMetricHeader,
	CardSectionHeader,
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
import { getUnansweredQuestions, type UnansweredQuestionsData } from "@/lib/api";

function calculateChange(current: number, previous: number): number | null {
	if (previous === 0) return current > 0 ? 100 : null;
	return Math.round(((current - previous) / previous) * 100);
}

function ChangeIndicator({ change }: { change: number | null }) {
	if (change === null) return null;
	const isPositive = change >= 0;
	const isImprovement = !isPositive; // For unanswered questions, decrease is improvement
	return (
		<span
			className={`flex items-center text-xs ${isImprovement ? "text-green-600" : "text-red-600"}`}
		>
			{isPositive ? (
				<TrendingUp className="w-3 h-3 mr-1" />
			) : (
				<TrendingDown className="w-3 h-3 mr-1" />
			)}
			{isPositive ? "+" : ""}
			{change}%
		</span>
	);
}

function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

export default function UnansweredQuestionsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const router = useRouter();
	const [dateRange, setDateRange] = useState<DateRange>("7d");
	const [loading, setLoading] = useState(true);
	const [data, setData] = useState<UnansweredQuestionsData | null>(null);

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
			const result = await getUnansweredQuestions(currentAgent.id, startDate, endDate);
			setData(result);
		} catch (err) {
			console.error("Failed to fetch unanswered questions data:", err);
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

	const unansweredChange = data?.summary
		? calculateChange(data.summary.unansweredCount, data.summary.previousUnansweredCount)
		: null;

	const percentageChange = data?.summary
		? calculateChange(data.summary.unansweredPercentage, data.summary.previousUnansweredPercentage)
		: null;

	const meaningfulQuestionsChange = data?.summary
		? calculateChange(data.summary.meaningfulQuestions, data.summary.previousMeaningfulQuestions)
		: null;

	const hasUnansweredQuestions = data && data.summary.unansweredCount > 0;

	return (
		<div className="flex flex-col min-h-screen">
			<PageHeader
				title="Unanswered Questions"
				subtitle="Questions the AI could not confidently answer"
				icon={<HelpCircle size={12} />}
				action={<DateRangeSelector value={dateRange} onChange={setDateRange} disabled={loading} />}
			/>

			<div className="p-8">
				{loading ? (
					<div className="flex-1 space-y-6">
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
							{[1, 2, 3, 4].map((i) => (
								<Skeleton key={i} className="h-32" />
							))}
						</div>
					</div>
				) : !hasUnansweredQuestions ? (
					<div className="flex items-center justify-center flex-1 p-8">
						<Empty>
							<EmptyMedia variant="icon">
								<CheckCircle2 className="w-12 h-12 text-green-600" />
							</EmptyMedia>
							<EmptyContent>
								<EmptyTitle>No unanswered questions</EmptyTitle>
								<EmptyDescription>
									Great work! The AI is answering all questions confidently in the selected period.
								</EmptyDescription>
								<Button asChild className="mt-4">
									<Link href="/answer-quality">View Answer Quality</Link>
								</Button>
							</EmptyContent>
						</Empty>
					</div>
				) : (
					<PremiumGate feature="analytics">
						<div className="flex-1 space-y-6">
							{/* KPI Cards */}
							<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
								<Card variant="metric" className="border-l-4 border-l-orange-500">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="Unanswered Questions" icon={HelpCircle} />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>Questions with confidence below threshold</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<CardValue>{data.summary.unansweredCount}</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										<ChangeIndicator change={unansweredChange} />
									</div>
								</Card>

								<Card variant="metric">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="% Unanswered" icon={AlertCircle} />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>Percentage of meaningful questions that were unanswered</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<CardValue>{data.summary.unansweredPercentage}%</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										<ChangeIndicator change={percentageChange} />
									</div>
								</Card>

								<Card variant="metric">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="Top Cluster" icon={MessageSquare} />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>Most frequent unanswered question cluster</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									{data.summary.topCluster ? (
										<>
											<div className="text-lg font-medium tracking-tight text-[#1A1A1A] truncate">
												{data.summary.topCluster.name}
											</div>
											<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
												{data.summary.topCluster.volume} questions
											</div>
										</>
									) : (
										<div className="text-sm text-[#888]">No clusters</div>
									)}
								</Card>

								<Card variant="metric">
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div>
													<CardMetricHeader label="Meaningful Questions" icon={MessageSquare} />
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p>Total questions with confidence scores</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<CardValue>{data.summary.meaningfulQuestions}</CardValue>
									<div className="mt-2 text-[9px] text-[#888] font-mono uppercase">
										<ChangeIndicator change={meaningfulQuestionsChange} />
									</div>
								</Card>
							</div>

							{/* Unanswered Questions by Cluster */}
							{data.clusters.length > 0 && (
								<Card variant="section" className="overflow-hidden">
									<CardSectionHeader title="Unanswered Questions by Cluster" icon={MessageSquare} />
									<CardContent className="p-0">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Question Cluster</TableHead>
													<TableHead className="text-right">Volume</TableHead>
													<TableHead className="text-right">% Unanswered</TableHead>
													<TableHead className="text-right">Last Seen</TableHead>
													<TableHead className="text-right">Priority</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{data.clusters.map((cluster) => (
													<TableRow key={cluster.clusterId}>
														<TableCell className="font-medium max-w-[400px]">
															<div className="truncate">{cluster.representativeQuestion}</div>
															<Text size="sm" className="text-muted-foreground">
																{cluster.volume} of {cluster.totalVolume} questions
															</Text>
														</TableCell>
														<TableCell className="text-right">{cluster.volume}</TableCell>
														<TableCell className="text-right">
															<Badge variant="outline">{cluster.unansweredPercentage}%</Badge>
														</TableCell>
														<TableCell className="text-sm text-right text-muted-foreground">
															{formatDate(cluster.lastSeen)}
														</TableCell>
														<TableCell className="text-right">
															<Badge
																variant={
																	cluster.priority === "high"
																		? "destructive"
																		: cluster.priority === "medium"
																			? "default"
																			: "secondary"
																}
															>
																{cluster.priority === "high"
																	? "High"
																	: cluster.priority === "medium"
																		? "Medium"
																		: "Low"}
															</Badge>
														</TableCell>
														<TableCell className="text-right">
															<div className="flex justify-end gap-2">
																<Button variant="ghost" size="sm" asChild>
																	<Link href={`/conversations?cluster=${cluster.clusterId}`}>
																		View
																	</Link>
																</Button>
																<Button variant="ghost" size="sm" asChild>
																	<Link
																		href={`/ai-knowledge/qa?question=${encodeURIComponent(cluster.representativeQuestion)}`}
																	>
																		Add Knowledge
																	</Link>
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</CardContent>
								</Card>
							)}

							{/* Recent Unanswered Questions */}
							{data.recentQuestions.length > 0 && (
								<Card variant="section" className="overflow-hidden">
									<CardSectionHeader
										title="Recent Unanswered Questions"
										icon={HelpCircle}
										action={
											<TooltipProvider>
												<Tooltip>
													<TooltipTrigger asChild>
														<button
															type="button"
															className="text-[#888] hover:text-[#1A1A1A] transition-colors"
														>
															<AlertCircle size={14} />
														</button>
													</TooltipTrigger>
													<TooltipContent side="left" className="max-w-[240px]">
														<p className="text-xs">
															Questions the AI couldn't answer confidently due to low confidence
															scores or missing knowledge.
														</p>
													</TooltipContent>
												</Tooltip>
											</TooltipProvider>
										}
									/>
									<div className="overflow-x-auto">
										{/* Header */}
										<div className="grid grid-cols-12 gap-2 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
											<div className="col-span-6">Question</div>
											<div className="col-span-4">Cluster</div>
											<div className="col-span-2 text-right">Last Asked</div>
										</div>
										{/* Rows */}
										<div className="divide-y divide-[#F3F2EE]">
											{data.recentQuestions.slice(0, 10).map((question) => (
												<button
													type="button"
													key={question.questionText}
													className="grid grid-cols-12 gap-2 px-6 py-3 w-full text-left hover:bg-[#F9F9F9] transition-colors cursor-pointer group"
													onClick={() =>
														router.push(`/conversations/${question.conversationIds[0]}`)
													}
												>
													<div className="col-span-6 font-medium text-sm text-[#1A1A1A] truncate group-hover:underline decoration-[#D1D1D1] underline-offset-4">
														{question.questionText}
													</div>
													<div className="flex items-center col-span-4 gap-2">
														<span
															className={`text-[9px] font-bold uppercase px-1.5 border ${
																question.count > 5
																	? "border-red-300 bg-red-50 text-red-700"
																	: question.count > 2
																		? "border-yellow-300 bg-yellow-50 text-yellow-700"
																		: "border-[#D1D1D1] bg-white text-[#666]"
															}`}
														>
															{question.count}×
														</span>
														<span className="text-sm text-[#888] truncate font-mono">
															{question.cluster}
														</span>
													</div>
													<div className="col-span-2 text-right text-sm text-[#888] font-mono">
														{formatDate(question.lastAskedAt)}
													</div>
												</button>
											))}
										</div>
									</div>
								</Card>
							)}

							{/* Suggested Knowledge Additions */}
							{data.suggestedKnowledge.length > 0 && (
								<Card variant="section" className="overflow-hidden border-l-4 border-l-blue-500">
									<CardSectionHeader title="Suggested Knowledge Additions" icon={HelpCircle} />
									<CardContent className="p-4">
										<div className="space-y-3">
											{data.suggestedKnowledge.map((suggestion) => (
												<div
													key={suggestion.clusterId}
													className="flex items-center justify-between p-3 transition-colors border rounded-lg bg-card hover:bg-accent/50"
												>
													<div className="flex-1 min-w-0">
														<Text className="font-medium truncate">
															{suggestion.representativeQuestion}
														</Text>
														<Text size="sm" className="text-muted-foreground">
															{suggestion.volume} unanswered questions
														</Text>
													</div>
													<Button variant="ghost" size="sm" asChild>
														<Link
															href={`/ai-knowledge/qa?question=${encodeURIComponent(suggestion.representativeQuestion)}`}
														>
															Add Knowledge
														</Link>
													</Button>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}
						</div>
					</PremiumGate>
				)}
			</div>
		</div>
	);
}
