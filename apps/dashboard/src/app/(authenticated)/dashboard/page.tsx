"use client";

import { PageHeader } from "@ansa/ui";
import { formatDate } from "@ansa/utils";
import {
	Activity,
	ArrowRight,
	BarChart3,
	Bot,
	Box,
	ChevronDown,
	Database,
	Globe,
	MessageSquare,
	Plus,
	Settings,
	Terminal,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardActionFooter, CardStatusHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyCard } from "@/components/ui/empty-card";
import { MetricCell, MetricsGrid } from "@/components/ui/metrics-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { StatItem, StatsBar } from "@/components/ui/stats-bar";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { useAgents } from "@/lib/agent-context";
import { type AgentLimits, type AgentSummary, getAgentLimits, getAgentSummaries } from "@/lib/api";
import { useSession } from "@/lib/auth-client";

export default function HomePage() {
	const router = useRouter();
	const { data: session, isPending: sessionLoading } = useSession();
	const { currentAgent, setCurrentAgent } = useAgents();
	const [agents, setAgents] = useState<AgentSummary[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [limits, setLimits] = useState<AgentLimits | null>(null);

	useEffect(() => {
		if (session?.user) {
			Promise.all([
				getAgentSummaries().then(setAgents).catch(console.error),
				getAgentLimits().then(setLimits).catch(console.error),
			]).finally(() => setIsLoading(false));
		}
	}, [session?.user]);

	const handleAgentClick = (agentId: string) => {
		const agent = agents.find((a) => a.id === agentId);
		if (agent) {
			setCurrentAgent(agent);
			router.push(`/overview?agent=${agentId}`);
		}
	};

	// Calculate aggregate stats
	const totalConversations = agents.reduce((sum, a) => sum + a.stats.conversations, 0);
	const avgConfidence =
		agents.length > 0
			? Math.round(agents.reduce((sum, a) => sum + (a.stats.avgConfidence ?? 0), 0) / agents.length)
			: 0;
	const activeAgents = agents.filter((a) => a.stats.conversations > 0).length;

	const renderAgents = () => {
		return (
			<>
				{agents.map((agent) => (
					<Card
						key={agent.id}
						variant="brutalist"
						className={`flex flex-col group ${currentAgent?.id === agent.id ? "ring-1 ring-foreground" : ""}`}
					>
						{/* Status Header */}
						<CardStatusHeader>
							<StatusIndicator
								status={agent.stats.conversations > 0 ? "active" : "idle"}
								label={agent.stats.conversations > 0 ? "Active" : "Idle"}
							/>
							<span className="font-mono text-[10px] text-text-faint">
								ID: {agent.id.slice(0, 8).toUpperCase()}
							</span>
						</CardStatusHeader>

						{/* Main Info */}
						<div className="p-6 pb-8">
							<div className="flex items-start justify-between mb-6">
								<div>
									<Link
										href={`/overview?agent=${agent.id}`}
										onClick={() => {
											setCurrentAgent(agent);
										}}
										className="block"
									>
										<h3 className="mb-1 text-xl font-bold group-hover:underline decoration-1 underline-offset-4">
											{agent.name}
										</h3>
									</Link>
									<p className="font-mono text-xs text-text-subtle">
										Created {formatDate(agent.createdAt, { includeYear: false })}
									</p>
								</div>
								<div className="flex items-center justify-center w-10 h-10 border bg-muted border-border text-foreground">
									<Bot size={20} strokeWidth={1.5} />
								</div>
							</div>

							{/* Metrics Grid */}
							<MetricsGrid>
								<MetricCell
									icon={<MessageSquare size={12} />}
									label="Volume"
									value={agent.stats.conversations.toLocaleString()}
								/>
								<MetricCell
									icon={<Activity size={12} />}
									label="Confidence"
									value={agent.stats.avgConfidence !== null ? `${agent.stats.avgConfidence}%` : "—"}
									warning={agent.stats.avgConfidence !== null && agent.stats.avgConfidence < 50}
								/>
							</MetricsGrid>

							{/* Configuration Chips */}
							<div className="flex flex-wrap gap-2 mt-6">
								<Badge variant="chip">
									<Database size={10} /> {agent.stats.sourcesCount} Sources
								</Badge>
								<Badge variant="chip">
									<Wrench size={10} /> {agent.stats.toolsCount} Tools
								</Badge>
								<Badge variant="chip">
									<Zap size={10} /> {agent.stats.triggersCount} Triggers
								</Badge>
							</div>
						</div>

						{/* Action Footer */}
						<CardActionFooter>
							<button
								type="button"
								className="flex items-center justify-center flex-1 gap-2 py-4 text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer hover:bg-foreground hover:text-background"
								onClick={() => handleAgentClick(agent.id)}
							>
								<Terminal size={12} /> Enter Console
							</button>
							<Link
								href={`/analytics?agent=${agent.id}`}
								className="flex items-center justify-center transition-colors w-14 hover:bg-card text-text-subtle"
							>
								<BarChart3 size={16} />
							</Link>
							<Link
								href={`/settings?agent=${agent.id}`}
								className="flex items-center justify-center transition-colors w-14 hover:bg-card text-text-subtle"
							>
								<Settings size={16} />
							</Link>
						</CardActionFooter>
					</Card>
				))}

				{/* Add New Agent Card */}
				<EmptyCard label="Deploy New Agent" onClick={() => router.push("/onboarding")} />
			</>
		);
	};

	// Redirect to marketing homepage if not authenticated
	useEffect(() => {
		if (!sessionLoading && !session?.user) {
			router.push("/");
		}
	}, [sessionLoading, session?.user, router]);

	// Show loading while checking session
	if (sessionLoading || !session?.user) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin" />
			</div>
		);
	}

	if (isLoading) {
		return (
			<>
				<PageHeader
					title="Your Agents"
					icon={
						<span className="flex items-center gap-2">
							<span>Environment: Production</span>
							<span className="text-[#D1D1D1]">|</span>
							<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
							<span>All Systems Operational</span>
						</span>
					}
				/>
				<div className="p-8">
					<Skeleton className="w-full h-16 mb-12" />
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
						{[1, 2, 3].map((i) => (
							<Card key={i} variant="brutalist">
								<Skeleton className="w-full h-14" />
								<div className="p-6">
									<Skeleton className="w-48 h-6 mb-2" />
									<Skeleton className="w-32 h-4 mb-6" />
									<Skeleton className="w-full h-24 mb-6" />
									<div className="flex gap-2">
										<Skeleton className="w-20 h-6" />
										<Skeleton className="w-20 h-6" />
										<Skeleton className="w-20 h-6" />
									</div>
								</div>
								<Skeleton className="w-full h-14" />
							</Card>
						))}
					</div>
				</div>
			</>
		);
	}

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Your Agents"
				icon={
					<span className="flex items-center gap-2">
						<span>Environment: Production</span>
						<span className="text-[#D1D1D1]">|</span>
						<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<span>All Systems Operational</span>
					</span>
				}
				action={
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="gap-2 shadow-lg">
								<Plus className="w-4 h-4" />
								New Agent
								<ChevronDown className="w-4 h-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="p-0 w-72">
							{/* Header Label */}
							<div className="px-4 py-2 bg-[#FAFAF9] border-b border-[#F3F2EE]">
								<span className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
									Select Deployment Method
								</span>
							</div>

							{/* Option 1: Import from URL */}
							<button
								type="button"
								onClick={() => router.push("/onboarding")}
								className="w-full text-left px-4 py-4 hover:bg-[#F3F2EE] group transition-colors border-b border-[#F3F2EE] flex items-start gap-3 relative overflow-hidden"
							>
								<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A1A1A] -translate-x-full group-hover:translate-x-0 transition-transform" />
								<div className="w-8 h-8 bg-white border border-[#D1D1D1] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors flex-shrink-0">
									<Globe size={16} />
								</div>
								<div>
									<div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
										Import from URL
										<ArrowRight
											size={12}
											className="transition-all -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0"
										/>
									</div>
									<p className="text-[10px] text-[#555] font-mono mt-1 leading-snug">
										Crawler extracts knowledge from your website.
									</p>
								</div>
							</button>

							{/* Option 2: Blank Agent */}
							<button
								type="button"
								onClick={() => router.push("/agents/new")}
								className="w-full text-left px-4 py-4 hover:bg-[#F3F2EE] group transition-colors flex items-start gap-3 relative overflow-hidden"
							>
								<div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A1A1A] -translate-x-full group-hover:translate-x-0 transition-transform" />
								<div className="w-8 h-8 bg-white border border-[#D1D1D1] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors flex-shrink-0">
									<Box size={16} />
								</div>
								<div>
									<div className="font-bold text-sm text-[#1A1A1A] flex items-center gap-2">
										Initialize Blank Agent
									</div>
									<p className="text-[10px] text-[#555] font-mono mt-1 leading-snug">
										Start fresh. Upload files and Q&A pairs later.
									</p>
								</div>
							</button>
						</DropdownMenuContent>
					</DropdownMenu>
				}
			/>

			<div className="p-8">
				{/* Stats Bar */}
				{agents.length > 0 && (
					<StatsBar className="mb-12">
						<StatItem label="Total Agents" value={agents.length.toString().padStart(2, "0")} />
						<StatItem label="Active Agents" value={activeAgents.toString().padStart(2, "0")} />
						<StatItem label="Avg Confidence" value={`${avgConfidence}%`} />
						<StatItem
							label="Total Conversations"
							value={
								totalConversations > 1000
									? `${(totalConversations / 1000).toFixed(1)}k`
									: totalConversations.toString()
							}
						/>
					</StatsBar>
				)}

				{/* Agent Grid */}
				<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{renderAgents()}</div>
			</div>
		</div>
	);
}
