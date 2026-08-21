"use client";

import {
	ArrowRight,
	BarChart3,
	BookOpen,
	Calendar,
	ChevronDown,
	ChevronRight,
	ClipboardList,
	Coins,
	LayoutTemplate,
	Link2,
	Mail,
	MessageCircle,
	MessageSquare,
	Package,
	Pencil,
	Plus,
	Search,
	ShoppingBag,
	Ticket,
	Trash2,
	UserPlus,
	Users,
	Wallet,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardSectionHeader, ToolRow } from "@/components/analytics/brutalist";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgent } from "@/lib/agent-context";
import { trackEvent } from "@/lib/analytics";
import {
	type AgentTool,
	type AnalyticsToolData,
	deleteTool,
	getAnalyticsTools,
	getToolLimits,
	installMarketplaceTool,
	listMarketplaceTools,
	listTools,
	TOOL_CATEGORY_LABELS,
	type ToolLimits,
	type ToolTemplate,
	updateTool,
} from "@/lib/api";

// Icon mapping for tool templates
const templateIconMap: Record<string, React.ElementType> = {
	search: Search,
	"book-open": BookOpen,
	link: Link2,
	coins: Coins,
	package: Package,
	mail: Mail,
	"message-square": MessageSquare,
	ticket: Ticket,
	"message-circle": MessageCircle,
	users: Users,
	"user-plus": UserPlus,
	calendar: Calendar,
	"calendar-plus": Calendar,
	"shopping-bag": ShoppingBag,
	wallet: Wallet,
	"clipboard-list": ClipboardList,
	wrench: Wrench,
};

function getTemplateIcon(iconName: string): React.ElementType {
	return templateIconMap[iconName] || Wrench;
}

const toolCategoryLabels: Record<string, string> = {
	all: "All",
	search: "Search",
	data: "Data",
	communication: "Communication",
	support: "Support",
	crm: "CRM",
	productivity: "Productivity",
	ecommerce: "E-commerce",
	forms: "Forms",
};

export default function ToolsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [tools, setTools] = useState<AgentTool[]>([]);
	const [toolAnalytics, setToolAnalytics] = useState<AnalyticsToolData[]>([]);
	const [toolLimits, setToolLimits] = useState<ToolLimits | null>(null);
	const [templates, setTemplates] = useState<ToolTemplate[]>([]);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(false);
	const [installingTemplate, setInstallingTemplate] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchTools = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
		try {
			const [toolsData, analyticsData, limitsData, templatesData] = await Promise.all([
				listTools(currentAgent.id),
				getAnalyticsTools(currentAgent.id).catch(() => []),
				getToolLimits(currentAgent.id).catch(() => null),
				listMarketplaceTools().catch(() => []),
			]);
			setTools(toolsData);
			setToolAnalytics(analyticsData);
			setToolLimits(limitsData);
			setTemplates(templatesData);
		} catch (err) {
			console.error("Failed to fetch tools:", err);
			toast.error("Failed to load tools");
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchTools();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
		}
	}, [agentLoading, currentAgent, fetchTools]);

	// Computed values for templates
	const filteredTemplates =
		selectedCategory === "all"
			? templates
			: templates.filter((t) => t.category === selectedCategory);

	const templateCategories = ["all", ...new Set(templates.map((t) => t.category))];

	const handleInstallTemplate = async (template: ToolTemplate) => {
		if (!currentAgent) return;
		if (toolLimits && !toolLimits.canCreate) {
			toast.error("Tool limit reached. Upgrade your plan for more tools.");
			return;
		}

		// If template requires config, redirect to marketplace detail page
		if (template.requiredConfig && template.requiredConfig.length > 0) {
			window.location.href = `/marketplace/${template.slug}`;
			return;
		}

		setInstallingTemplate(template.slug);
		try {
			await installMarketplaceTool(template.slug, currentAgent.id);
			trackEvent("marketplace_tool_installed", {
				agentId: currentAgent.id,
				toolSlug: template.slug,
				toolName: template.name,
			});
			toast.success(`${template.name} installed successfully`);
			await fetchTools();
		} catch (err) {
			console.error("Failed to install template:", err);
			toast.error(err instanceof Error ? err.message : "Failed to install tool");
		} finally {
			setInstallingTemplate(null);
		}
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Delete this tool?")) return;

		try {
			await deleteTool(id);
			toast.success("Tool deleted");
			await fetchTools();
		} catch (err) {
			console.error("Failed to delete:", err);
			toast.error("Failed to delete tool");
		}
	};

	const handleToggleEnabled = async (tool: AgentTool) => {
		try {
			await updateTool(tool.id, { isEnabled: !tool.isEnabled });
			await fetchTools();
			toast.success(tool.isEnabled ? "Tool disabled" : "Tool enabled");
		} catch (err) {
			console.error("Failed to toggle:", err);
			toast.error("Failed to update tool");
		}
	};

	const renderTools = () => {
		if (loading) {
			return (
				<div>
					<div className="flex items-center justify-center py-12">
						<div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
					</div>
				</div>
			);
		}

		if (tools.length === 0) {
			return (
				<div className="py-12 text-center">
					<Wrench className="w-12 h-12 mx-auto mb-4 text-[#888]" />
					<h2 className="mb-2 text-lg font-medium">No tools configured</h2>
					<p className="text-[#888] text-sm mb-6 max-w-md mx-auto">
						Tools allow your agent to perform actions like fetching data from APIs or returning
						structured responses.
					</p>
					<div className="flex items-center justify-center gap-3">
						<Link
							href="/tools/discover"
							className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2 shadow-lg"
						>
							<Zap size={14} /> Auto-Discover API
						</Link>
						<Link
							href="/tools/new"
							className="px-6 h-10 text-xs font-bold uppercase tracking-widest border border-[#D1D1D1] bg-white hover:bg-[#F3F2EE] transition-colors inline-flex items-center gap-2"
						>
							<Plus size={14} /> Add Tool
						</Link>
					</div>
				</div>
			);
		}

		return (
			<div>
				{/* Table Header */}
				<div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-[#D1D1D1] bg-[#F3F2EE]">
					<div className="col-span-4 text-[9px] font-mono text-[#888] uppercase tracking-widest">
						Name
					</div>
					<div className="col-span-2 text-[9px] font-mono text-[#888] uppercase tracking-widest">
						Type
					</div>
					<div className="col-span-2 text-[9px] font-mono text-[#888] uppercase tracking-widest">
						Category
					</div>
					<div className="col-span-1 text-[9px] font-mono text-[#888] uppercase tracking-widest">
						Params
					</div>
					<div className="col-span-3 text-[9px] font-mono text-[#888] uppercase tracking-widest text-right">
						Actions
					</div>
				</div>
				{/* Table Body */}
				<div className="divide-y divide-[#F3F2EE]">
					{tools.map((tool) => (
						<div
							key={tool.id}
							className={`grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-[#FAFAFA] transition-colors ${!tool.isEnabled ? "opacity-50" : ""}`}
						>
							<div className="col-span-4">
								<div className="flex items-center gap-2">
									<Link
										href={`/tools/${tool.id}/edit`}
										className="font-bold text-sm text-[#1A1A1A] hover:text-[#555] transition-colors text-left"
									>
										{tool.name}
									</Link>
									{tool.integrationSource === "shopify" && (
										<span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase border border-[#95BF47] bg-[#95BF47]/10 text-[#5E8E3E]">
											<ShoppingBag className="w-3 h-3" />
											Shopify
										</span>
									)}
									{tool.system && !tool.integrationSource && (
										<span className="px-1.5 py-0.5 text-[9px] font-mono uppercase bg-[#F3F2EE] text-[#888] border border-[#D1D1D1]">
											System
										</span>
									)}
								</div>
								<p className="text-xs text-[#888] mt-1 line-clamp-1">{tool.description}</p>
							</div>
							<div className="col-span-2">
								<span className="px-2 py-1 text-[10px] font-mono uppercase bg-[#F3F2EE] border border-[#D1D1D1]">
									{tool.executionType}
								</span>
							</div>
							<div className="col-span-2">
								<span className="px-2 py-1 text-[10px] font-mono uppercase bg-[#F3F2EE] border border-[#D1D1D1]">
									{TOOL_CATEGORY_LABELS[tool.category] || tool.category}
								</span>
							</div>
							<div className="col-span-1 font-mono text-sm">
								{Object.keys(tool.inputSchema.properties || {}).length}
							</div>
							<div className="flex items-center justify-end col-span-3 gap-3">
								<CustomToggle
									checked={tool.isEnabled}
									onCheckedChange={() => handleToggleEnabled(tool)}
								/>
								<Link
									href={`/tools/${tool.id}/edit`}
									className="p-2 hover:bg-[#F3F2EE] transition-colors"
								>
									<Pencil className="w-4 h-4 text-[#888]" />
								</Link>
								{!tool.integrationSource && (
									<button
										type="button"
										onClick={() => handleDelete(tool.id)}
										className="p-2 hover:bg-[#F3F2EE] transition-colors"
									>
										<Trash2 className="w-4 h-4 text-red-500" />
									</button>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			{/* Custom Header */}
			<header className="h-20 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8">
				<div>
					<h1 className="text-2xl font-medium tracking-tight">Tools</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-1">
						<span>Tools Active: {tools.filter((t) => t.isEnabled).length}</span>
						{toolLimits && toolLimits.limit !== null && (
							<>
								<span className="text-[#D1D1D1]">|</span>
								<span>
									Usage: {toolLimits.current}/{toolLimits.limit}
								</span>
							</>
						)}
					</div>
				</div>

				<div className="flex items-center gap-3">
					<Link
						href="/tools/discover"
						className="px-6 h-10 text-xs font-bold uppercase tracking-widest border border-[#D1D1D1] bg-white hover:bg-[#F3F2EE] transition-colors flex items-center gap-2"
					>
						<Zap size={14} /> Auto-Discover
					</Link>
					<Link
						href="/marketplace"
						className="px-6 h-10 text-xs font-bold uppercase tracking-widest border border-[#D1D1D1] bg-white hover:bg-[#F3F2EE] transition-colors flex items-center gap-2"
					>
						Browse Marketplace
					</Link>
					{toolLimits !== null && !toolLimits.canCreate ? (
						<Link
							href="/billing"
							onClick={() => toast.error("Tool limit reached. Upgrade your plan for more tools.")}
							className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
						>
							<Plus size={14} /> Add Tool
						</Link>
					) : (
						<Link
							href="/tools/new"
							className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
						>
							<Plus size={14} /> Add Tool
						</Link>
					)}
				</div>
			</header>

			{/* Main Content */}
			<div className="p-8 space-y-8">
				{/* Collapse/Expand Templates Toggle */}
				{templates.length > 0 && (
					<button
						type="button"
						onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
						className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase hover:text-[#1A1A1A] transition-colors"
					>
						{isTemplatesExpanded ? (
							<>
								<ChevronDown size={12} />
								Hide Templates
							</>
						) : (
							<>
								<ChevronRight size={12} />
								Show Templates ({templates.length})
							</>
						)}
					</button>
				)}

				{/* Quick Start Templates Section */}
				{templates.length > 0 && isTemplatesExpanded && (
					<section className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<h3 className="flex items-center gap-2 mb-4 text-xs font-bold tracking-wide uppercase">
							<LayoutTemplate size={14} className="text-[#888]" /> Quick Start Templates
						</h3>

						{/* Category Filters */}
						<div className="flex flex-wrap gap-2 mb-4">
							{templateCategories.map((category) => (
								<button
									key={category}
									type="button"
									onClick={() => setSelectedCategory(category)}
									className={`text-[10px] font-bold uppercase px-3 py-1.5 border transition-colors ${
										selectedCategory === category
											? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
											: "bg-white text-[#555] border-[#D1D1D1] hover:border-[#1A1A1A]"
									}`}
								>
									{toolCategoryLabels[category] || category}
								</button>
							))}
						</div>

						{/* Template Grid */}
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
							{filteredTemplates.map((template) => {
								const IconComponent = getTemplateIcon(template.icon);
								const isInstalled = tools.some((t) => t.name === template.name);
								const isInstalling = installingTemplate === template.slug;

								return (
									<button
										key={template.slug}
										type="button"
										onClick={() => !isInstalled && !isInstalling && handleInstallTemplate(template)}
										disabled={isInstalled || isInstalling}
										className={`border border-[#D1D1D1] bg-[#FAFAF9] p-4 flex items-center justify-between hover:border-[#1A1A1A] hover:bg-white transition-all cursor-pointer group text-left w-full disabled:cursor-not-allowed ${isInstalled ? "opacity-50" : ""}`}
									>
										<div className="flex items-center min-w-0 gap-3">
											<div className="w-8 h-8 bg-white border border-[#D1D1D1] flex items-center justify-center text-[#1A1A1A] shrink-0">
												<IconComponent size={14} />
											</div>
											<div className="min-w-0">
												<span className="block text-sm font-medium truncate">{template.name}</span>
												<span className="text-[10px] text-[#888] block truncate mt-0.5">
													{isInstalled
														? "Already installed"
														: isInstalling
															? "Installing..."
															: template.description}
												</span>
											</div>
										</div>
										{!isInstalled && !isInstalling && (
											<ArrowRight
												size={14}
												className="text-[#CCC] group-hover:text-[#1A1A1A] -translate-x-2 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-2"
											/>
										)}
									</button>
								);
							})}
						</div>

						{filteredTemplates.length === 0 && (
							<div className="py-8 text-center text-[#888] font-mono text-xs">
								No templates in this category
							</div>
						)}
					</section>
				)}

				{/* Tools List */}
				<div className="border border-[#D1D1D1] bg-white">{renderTools()}</div>

				{/* Tool Analytics Section */}
				{toolAnalytics.length > 0 && (
					<div className="mt-12">
						<Card variant="section">
							<CardSectionHeader title="Tool Usage Analytics" icon={BarChart3} />
							<div className="overflow-x-auto">
								{/* Header */}
								<div className="grid grid-cols-12 gap-4 px-6 py-2 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
									<div className="col-span-4">Tool Name</div>
									<div className="col-span-2 text-center">Executions</div>
									<TooltipProvider>
										<Tooltip>
											<TooltipTrigger asChild>
												<div className="col-span-4 text-center border-b border-dashed cursor-help border-[#888] w-fit mx-auto">
													Success Rate
												</div>
											</TooltipTrigger>
											<TooltipContent>
												<p className="max-w-xs font-mono text-xs">
													Executions completed without errors
												</p>
											</TooltipContent>
										</Tooltip>
									</TooltipProvider>
									<div className="col-span-2 text-right">Avg Time</div>
								</div>
								{/* Rows */}
								<div className="px-6 divide-y divide-[#F3F2EE]">
									{[...toolAnalytics]
										.sort((a, b) => (b.executionCount ?? 0) - (a.executionCount ?? 0))
										.map((stat) => (
											<ToolRow
												key={stat.toolName}
												name={stat.toolName}
												executions={stat.executionCount ?? 0}
												success={Math.round(stat.successRate * 100)}
												time={stat.avgExecutionTimeMs}
											/>
										))}
								</div>
							</div>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
