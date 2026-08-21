"use client";

import { PageHeader } from "@ansa/ui";
import { Cpu, DollarSign, MessageSquare, TrendingUp, Users, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Tooltip as RechartsTooltip,
	ResponsiveContainer,
	XAxis,
	YAxis,
} from "recharts";
import { type DateRange, DateRangeSelector } from "@/components/analytics/date-range-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import {
	type AdminKPIs,
	getAdminKPIs,
	getRecentAccounts,
	getTopAgents,
	type RecentAccount,
	type TopAgent,
} from "@/lib/api";

// Plan colors for chart
const PLAN_COLORS: Record<string, string> = {
	free: "#94a3b8",
	starter: "#3b82f6",
	growth: "#8b5cf6",
	pro: "#f59e0b",
	enterprise: "#10b981",
};

// Tier colors for chart
const TIER_COLORS: Record<string, string> = {
	balanced: "#3b82f6",
	high_quality: "#8b5cf6",
};

export default function AdminDashboardPage() {
	const [dateRange, setDateRange] = useState<DateRange>("30d");
	const [loading, setLoading] = useState(true);
	const [kpis, setKpis] = useState<AdminKPIs | null>(null);
	const [topAgents, setTopAgents] = useState<TopAgent[]>([]);
	const [recentAccounts, setRecentAccounts] = useState<RecentAccount[]>([]);

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
		setLoading(true);
		try {
			const { startDate, endDate } = getDateRange(dateRange);
			const [kpisData, agentsData, recentData] = await Promise.all([
				getAdminKPIs(startDate, endDate),
				getTopAgents(10),
				getRecentAccounts(5),
			]);
			setKpis(kpisData);
			setTopAgents(agentsData.agents);
			setRecentAccounts(recentData.accounts);
		} catch (err) {
			console.error("Failed to fetch admin KPIs:", err);
		} finally {
			setLoading(false);
		}
	}, [dateRange, getDateRange]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	// Format currency
	const formatCurrency = (cents: number) => {
		return `$${(cents / 100).toFixed(2)}`;
	};

	// Format large numbers
	const formatNumber = (num: number) => {
		if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
		return num.toLocaleString();
	};

	// Custom tooltip
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
							? new Date(label).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
								})
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

	// Skeleton loading
	const SkeletonContent = () => (
		<>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{[...Array(8)].map((_, i) => (
					<Card key={i}>
						<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
							<Skeleton className="w-24 h-4" />
							<Skeleton className="w-4 h-4" />
						</CardHeader>
						<CardContent>
							<Skeleton className="w-20 h-8 mb-1" />
							<Skeleton className="w-16 h-3" />
						</CardContent>
					</Card>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				{[...Array(4)].map((_, i) => (
					<Card key={i}>
						<CardHeader>
							<Skeleton className="w-40 h-5" />
						</CardHeader>
						<CardContent>
							<Skeleton className="h-[250px] w-full" />
						</CardContent>
					</Card>
				))}
			</div>
		</>
	);

	return (
		<div className="flex flex-col min-h-screen">
			<PageHeader
				title="Admin Dashboard"
				subtitle="Platform-wide business growth metrics"
				action={<DateRangeSelector value={dateRange} onChange={setDateRange} disabled={loading} />}
			/>

			<div className="p-8 space-y-6">
				{loading ? (
					<SkeletonContent />
				) : (
					<>
						{/* KPI Cards - Row 1: Users & Revenue */}
						<div>
							<Text className="mb-3 text-sm font-medium text-muted-foreground">
								Users & Revenue
							</Text>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">Total Users</CardTitle>
										<Users className="w-4 h-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">{formatNumber(kpis?.users.total ?? 0)}</div>
										<Text size="xs" className="text-muted-foreground">
											+{kpis?.users.newInPeriod ?? 0} new in period
										</Text>
									</CardContent>
								</Card>

								<Card className="bg-gradient-to-br from-green-500/5 to-transparent transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">MRR</CardTitle>
										<DollarSign className="w-4 h-4 text-green-600" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-green-600">
											${(kpis?.subscriptions.mrr ?? 0).toLocaleString()}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{kpis?.subscriptions.totalPaying ?? 0} paying users
										</Text>
									</CardContent>
								</Card>

								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">Free Users</CardTitle>
										<Users className="w-4 h-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{formatNumber(
												kpis?.subscriptions.byPlan.find((p) => p.planId === "free")?.count ?? 0,
											)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{(
												((kpis?.subscriptions.byPlan.find((p) => p.planId === "free")?.count ?? 0) /
													(kpis?.users.total || 1)) *
												100
											).toFixed(0)}
											% of total
										</Text>
									</CardContent>
								</Card>

								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">Conversations</CardTitle>
										<MessageSquare className="w-4 h-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{formatNumber(kpis?.conversations.inPeriod ?? 0)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{formatNumber(kpis?.conversations.messagesInPeriod ?? 0)} messages
										</Text>
									</CardContent>
								</Card>
							</div>
						</div>

						{/* KPI Cards - Row 2: LLM Usage */}
						<div>
							<Text className="mb-3 text-sm font-medium text-muted-foreground">LLM Usage</Text>
							<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<Card className="bg-gradient-to-br from-red-500/5 to-transparent transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">LLM Cost</CardTitle>
										<Cpu className="w-4 h-4 text-red-600" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold text-red-600">
											{formatCurrency(kpis?.llm.totalCostCents ?? 0)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{formatNumber(kpis?.llm.totalCalls ?? 0)} API calls
										</Text>
									</CardContent>
								</Card>

								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">Balanced Tier</CardTitle>
										<Zap className="w-4 h-4 text-blue-500" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{formatNumber(
												kpis?.llm.byTier.find((t) => t.tier === "balanced")?.calls ?? 0,
											)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{formatCurrency(
												kpis?.llm.byTier.find((t) => t.tier === "balanced")?.costCents ?? 0,
											)}
										</Text>
									</CardContent>
								</Card>

								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">High Quality Tier</CardTitle>
										<Zap className="w-4 h-4 text-purple-500" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{formatNumber(
												kpis?.llm.byTier.find((t) => t.tier === "high_quality")?.calls ?? 0,
											)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{formatCurrency(
												kpis?.llm.byTier.find((t) => t.tier === "high_quality")?.costCents ?? 0,
											)}
										</Text>
									</CardContent>
								</Card>

								<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
									<CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
										<CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
										<TrendingUp className="w-4 h-4 text-muted-foreground" />
									</CardHeader>
									<CardContent>
										<div className="text-2xl font-bold">
											{formatNumber(
												(kpis?.llm.totalInputTokens ?? 0) + (kpis?.llm.totalOutputTokens ?? 0),
											)}
										</div>
										<Text size="xs" className="text-muted-foreground">
											{formatNumber(kpis?.llm.totalInputTokens ?? 0)} in /{" "}
											{formatNumber(kpis?.llm.totalOutputTokens ?? 0)} out
										</Text>
									</CardContent>
								</Card>
							</div>
						</div>

						{/* Charts - Row 1 */}
						<div className="grid gap-4 lg:grid-cols-2">
							{/* User Growth Chart */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">User Growth</CardTitle>
								</CardHeader>
								<CardContent>
									{(kpis?.users.daily?.length ?? 0) === 0 ? (
										<Text className="py-8 text-center">No data available</Text>
									) : (
										<ResponsiveContainer width="100%" height={250}>
											<AreaChart data={kpis?.users.daily}>
												<defs>
													<linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
												<XAxis
													dataKey="date"
													tickFormatter={(value) =>
														new Date(value).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
														})
													}
													tick={{ fontSize: 10 }}
												/>
												<YAxis tick={{ fontSize: 10 }} />
												<RechartsTooltip content={<CustomTooltip />} />
												<Area
													type="monotone"
													dataKey="count"
													name="New Users"
													stroke="#3b82f6"
													fillOpacity={1}
													fill="url(#colorUsers)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									)}
								</CardContent>
							</Card>

							{/* Subscriptions by Plan Chart */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">Subscriptions by Plan</CardTitle>
								</CardHeader>
								<CardContent>
									{(kpis?.subscriptions.byPlan?.length ?? 0) === 0 ? (
										<Text className="py-8 text-center">No data available</Text>
									) : (
										<ResponsiveContainer width="100%" height={250}>
											<BarChart data={kpis?.subscriptions.byPlan}>
												<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
												<XAxis dataKey="name" tick={{ fontSize: 10 }} />
												<YAxis tick={{ fontSize: 10 }} />
												<RechartsTooltip />
												<Bar dataKey="count" name="Users" radius={[4, 4, 0, 0]}>
													{kpis?.subscriptions.byPlan.map((entry) => (
														<Cell
															key={`cell-${entry.planId}`}
															fill={PLAN_COLORS[entry.planId] || "#94a3b8"}
														/>
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Charts - Row 2 */}
						<div className="grid gap-4 lg:grid-cols-2">
							{/* Conversation Volume Chart */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">Conversation Volume</CardTitle>
								</CardHeader>
								<CardContent>
									{(kpis?.conversations.daily?.length ?? 0) === 0 ? (
										<Text className="py-8 text-center">No data available</Text>
									) : (
										<ResponsiveContainer width="100%" height={250}>
											<AreaChart data={kpis?.conversations.daily}>
												<defs>
													<linearGradient id="colorConvo" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
												<XAxis
													dataKey="date"
													tickFormatter={(value) =>
														new Date(value).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
														})
													}
													tick={{ fontSize: 10 }}
												/>
												<YAxis tick={{ fontSize: 10 }} />
												<RechartsTooltip content={<CustomTooltip />} />
												<Area
													type="monotone"
													dataKey="count"
													name="Conversations"
													stroke="#22c55e"
													fillOpacity={1}
													fill="url(#colorConvo)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									)}
								</CardContent>
							</Card>

							{/* LLM Cost by Tier Chart */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">LLM Cost by Tier</CardTitle>
								</CardHeader>
								<CardContent>
									{(kpis?.llm.dailyByTier?.length ?? 0) === 0 ? (
										<Text className="py-8 text-center">No data available</Text>
									) : (
										<ResponsiveContainer width="100%" height={250}>
											<AreaChart data={kpis?.llm.dailyByTier}>
												<defs>
													<linearGradient id="colorBalanced" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
													</linearGradient>
													<linearGradient id="colorHighQuality" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
														<stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
												<XAxis
													dataKey="date"
													tickFormatter={(value) =>
														new Date(value).toLocaleDateString("en-US", {
															month: "short",
															day: "numeric",
														})
													}
													tick={{ fontSize: 10 }}
												/>
												<YAxis
													tick={{ fontSize: 10 }}
													tickFormatter={(value) => `$${(value / 100).toFixed(0)}`}
												/>
												<RechartsTooltip
													formatter={(value, name) => [
														formatCurrency(Number(value) || 0),
														name === "balanced" ? "Balanced" : "High Quality",
													]}
												/>
												<Area
													type="monotone"
													dataKey="balanced"
													name="balanced"
													stackId="1"
													stroke="#3b82f6"
													fillOpacity={1}
													fill="url(#colorBalanced)"
												/>
												<Area
													type="monotone"
													dataKey="high_quality"
													name="high_quality"
													stackId="1"
													stroke="#8b5cf6"
													fillOpacity={1}
													fill="url(#colorHighQuality)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Recent Accounts */}
						<div>
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">Recent Accounts</CardTitle>
								</CardHeader>
								<CardContent>
									{recentAccounts.length === 0 ? (
										<Text className="py-8 text-center">No accounts found</Text>
									) : (
										<div className="overflow-x-auto">
											<table className="w-full text-sm">
												<thead>
													<tr className="border-b">
														<th className="py-2 font-medium text-left">Name</th>
														<th className="py-2 font-medium text-left">Email</th>
														<th className="py-2 font-medium text-left">Plan</th>
														<th className="py-2 font-medium text-right">Created</th>
													</tr>
												</thead>
												<tbody>
													{recentAccounts.map((account) => (
														<tr key={account.id} className="border-b last:border-0">
															<td className="py-3 font-medium">{account.name || "—"}</td>
															<td className="py-3 text-muted-foreground">{account.email}</td>
															<td className="py-3">
																<span className="px-2 py-1 text-xs rounded-full bg-muted">
																	{account.plan}
																</span>
															</td>
															<td className="py-3 text-right text-muted-foreground">
																{account.createdAt
																	? new Date(account.createdAt).toLocaleDateString("en-US", {
																			month: "short",
																			day: "numeric",
																			year: "numeric",
																		})
																	: "—"}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardContent>
							</Card>
						</div>

						{/* Tables */}
						<div className="grid gap-4 lg:grid-cols-2">
							{/* Top Agents */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">Top Agents by Usage</CardTitle>
								</CardHeader>
								<CardContent>
									{topAgents.length === 0 ? (
										<Text className="py-8 text-center">No agents found</Text>
									) : (
										<div className="overflow-x-auto">
											<table className="w-full text-sm">
												<thead>
													<tr className="border-b">
														<th className="py-2 font-medium text-left">Agent</th>
														<th className="py-2 font-medium text-left">Owner</th>
														<th className="py-2 font-medium text-right">Conversations</th>
													</tr>
												</thead>
												<tbody>
													{topAgents.map((agent) => (
														<tr key={agent.id} className="border-b last:border-0">
															<td className="py-3 font-medium">{agent.name}</td>
															<td className="py-3 text-muted-foreground">{agent.ownerEmail}</td>
															<td className="py-3 text-right">
																{agent.conversationCount.toLocaleString()}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardContent>
							</Card>

							{/* LLM Usage by Model */}
							<Card className="transition-all duration-300 hover:border-[#888] hover:shadow-lg">
								<CardHeader>
									<CardTitle className="text-base">LLM Usage by Model</CardTitle>
								</CardHeader>
								<CardContent>
									{(kpis?.llm.byModel?.length ?? 0) === 0 ? (
										<Text className="py-8 text-center">No model data available</Text>
									) : (
										<div className="overflow-x-auto">
											<table className="w-full text-sm">
												<thead>
													<tr className="border-b">
														<th className="py-2 font-medium text-left">Model</th>
														<th className="py-2 font-medium text-right">Calls</th>
														<th className="py-2 font-medium text-right">Tokens</th>
														<th className="py-2 font-medium text-right">Cost</th>
													</tr>
												</thead>
												<tbody>
													{kpis?.llm.byModel.map((model) => (
														<tr key={model.model} className="border-b last:border-0">
															<td className="py-3">
																<code className="px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800">
																	{model.model}
																</code>
															</td>
															<td className="py-3 text-right">{formatNumber(model.calls)}</td>
															<td className="py-3 text-right text-muted-foreground">
																{formatNumber(model.inputTokens + model.outputTokens)}
															</td>
															<td className="py-3 text-right font-medium">
																{formatCurrency(model.costCents)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</CardContent>
							</Card>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
