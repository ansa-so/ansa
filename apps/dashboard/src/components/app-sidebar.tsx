"use client";

import {
	BarChart3,
	BookOpen,
	Bot,
	CheckCircle2,
	ChevronDown,
	Code,
	Database,
	HelpCircle,
	Inbox,
	Key,
	LayoutDashboard,
	LifeBuoy,
	LogOut,
	Mail,
	MessageCircle,
	MessageSquare,
	Receipt,
	Rocket,
	Send,
	Settings,
	Shield,
	ShoppingBag,
	Sparkles,
	Target,
	User,
	Users,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogoIcon } from "@/components/logo-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAgent } from "@/lib/agent-context";
import {
	checkAdminAccess,
	getAnalyticsLowConfidence,
	getAnalyticsTopQuestions,
	getConversationCounts,
	getNewSubmissionsCount,
	getUsage,
	type UsageData,
} from "@/lib/api";
import { signOut, useSession } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";
import { playNotificationSound } from "@/lib/notification-sound";
import { getConfig } from "@/lib/runtime-config";
import { useShopifyHref } from "@/lib/shopify-context";
import { cn } from "@/lib/utils";

// SidebarUserMenu component for avatar dropdown at bottom of sidebar
function SidebarUserMenu({
	isFreePlan,
	shopifyHref,
}: {
	isFreePlan: boolean;
	shopifyHref: (path: string) => string;
}) {
	const { data: session } = useSession();
	const router = useRouter();
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	const user = session?.user;
	const initials = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="flex items-center gap-3 w-full text-left hover:bg-[#E5E4E0] transition-colors p-1 -m-1 rounded-sm"
				>
					<div className="w-8 h-8 bg-[#D1D1D1] flex items-center justify-center font-bold text-xs border border-[#BBB]">
						{initials || <User className="w-4 h-4" />}
					</div>
					<div className="flex-1 overflow-hidden">
						<div className="text-xs font-bold truncate">{user?.name || "Account"}</div>
						<div className="font-mono text-[9px] text-[#666] truncate">{user?.email}</div>
					</div>
					<Settings size={14} className="text-[#888] hover:text-[#1A1A1A]" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-[280px]" side="top" align="start" sideOffset={8}>
				{/* Identity Card Section */}
				<div className="p-4 border-b border-[#D1D1D1] bg-[#FAFAF9]">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center font-bold text-xs border border-[#1A1A1A]">
							{initials || <User className="w-4 h-4" />}
						</div>
						<div className="flex-1 overflow-hidden">
							<h3 className="text-sm font-bold tracking-tight">{user?.name || "Account"}</h3>
							<div className="text-[10px] font-mono text-[#888] truncate mt-0.5">{user?.email}</div>
						</div>
					</div>
				</div>

				{/* Menu Actions */}
				<div className="py-2">
					{/* Group: Workspace */}
					<div className="px-4 py-2">
						<span className="text-[9px] font-mono uppercase text-[#888] tracking-widest">
							Workspace
						</span>
					</div>

					<button
						type="button"
						onClick={() => router.push(shopifyHref("/account"))}
						className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#F3F2EE] group transition-colors text-left"
					>
						<div className="flex items-center gap-3 text-sm">
							<Settings size={14} className="text-[#888] group-hover:text-[#1A1A1A]" />
							<span className="font-medium text-[#555] group-hover:text-[#1A1A1A]">
								Account Settings
							</span>
						</div>
					</button>

					{isFreePlan && (
						<button
							type="button"
							onClick={() => router.push(shopifyHref("/billing"))}
							className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#F3F2EE] group transition-colors text-left"
						>
							<div className="flex items-center gap-3 text-sm">
								<Sparkles size={14} className="text-[#888] group-hover:text-[#1A1A1A]" />
								<span className="font-medium text-[#555] group-hover:text-[#1A1A1A]">
									Upgrade Plan
								</span>
							</div>
						</button>
					)}

					<div className="h-px bg-[#F3F2EE] my-2 mx-4" />

					{/* Group: Interface Theme */}
					{/* <div className="flex items-center justify-between px-4 py-2">
            <span className="text-[9px] font-mono uppercase text-[#888] tracking-widest">
              Interface Theme
            </span>
          </div> */}

					{/* <div className="px-4 mb-3">
            <ThemeToggle variant="hardware" />
          </div>

          <div className="h-px bg-[#F3F2EE] my-2 mx-4" /> */}

					<button
						type="button"
						onClick={() => router.push(shopifyHref("/contact"))}
						className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#F3F2EE] group transition-colors text-left"
					>
						<div className="flex items-center gap-3 text-sm">
							<LifeBuoy size={14} className="text-[#888] group-hover:text-[#1A1A1A]" />
							<span className="font-medium text-[#555] group-hover:text-[#1A1A1A]">
								Support Center
							</span>
						</div>
					</button>

					<a
						href={docsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="w-full px-4 py-2 flex items-center justify-between hover:bg-[#F3F2EE] group transition-colors text-left block"
					>
						<div className="flex items-center gap-3 text-sm">
							<BookOpen size={14} className="text-[#888] group-hover:text-[#1A1A1A]" />
							<span className="font-medium text-[#555] group-hover:text-[#1A1A1A]">
								Documentation
							</span>
						</div>
					</a>
				</div>

				{/* Logout Footer */}
				<div className="p-2 border-t border-[#D1D1D1] bg-[#FAFAF9]">
					<button
						type="button"
						onClick={async () => {
							await signOut();
							router.push("/login");
						}}
						className="w-full flex items-center justify-center gap-2 bg-white border border-[#D1D1D1] py-2 text-xs font-bold uppercase text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors shadow-sm active:translate-y-[1px] active:shadow-none"
					>
						<LogOut size={12} /> Sign Out
					</button>
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function AppSidebar() {
	const pathname = usePathname();
	const { setOpenMobile, openMobile } = useSidebar();
	const { isSelfHosted } = useConfig();
	const { currentAgent } = useAgent();
	const shopifyHref = useShopifyHref();
	const [criticalIssuesCount, setCriticalIssuesCount] = useState<number>(0);
	const [escalatedCount, setEscalatedCount] = useState<number>(0);
	const [newSubmissionsCount, setNewSubmissionsCount] = useState<number>(0);
	const [usage, setUsage] = useState<UsageData | null>(null);
	const [isAdmin, setIsAdmin] = useState<boolean>(false);
	const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
		if (typeof window === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem("sidebar-open-groups") || "{}");
		} catch {
			return {};
		}
	});
	const prevEscalatedCountRef = useRef<number | null>(null);

	const toggleGroup = (title: string) => {
		setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
	};

	// Persist sidebar group states to localStorage
	useEffect(() => {
		localStorage.setItem("sidebar-open-groups", JSON.stringify(openGroups));
	}, [openGroups]);

	// Auto-expand the sidebar group containing the current page
	useEffect(() => {
		const pathToGroup: Record<string, string> = {
			"/answer-quality": "AI Performance",
			"/unanswered-questions": "AI Performance",
			"/needs-attention": "AI Performance",
			"/conversions": "Outcomes",
			"/resolutions": "Outcomes",
			"/submissions": "Outcomes",
			"/tools": "Automation",
			"/triggers": "Automation",
			"/chat": "Automation",
			"/setup-complete": "Channels",
			"/channels/embed": "Channels",
			"/channels/email": "Channels",
		};

		// Find which group the current path belongs to
		const groupToExpand = Object.entries(pathToGroup).find(
			([path]) => pathname === path || pathname.startsWith(`${path}/`),
		)?.[1];

		if (groupToExpand) {
			setOpenGroups((prev) => {
				if (prev[groupToExpand]) return prev;
				return { ...prev, [groupToExpand]: true };
			});
		}
	}, [pathname]);

	// Fetch critical issues count - refetch when navigating and poll every 60 seconds
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally refetch on navigation
	useEffect(() => {
		const fetchCriticalIssuesCount = async () => {
			if (!currentAgent) {
				setCriticalIssuesCount(0);
				setEscalatedCount(0);
				return;
			}

			try {
				// Fetch all data in parallel (same as needs-attention page)
				const [counts, lowConfidenceData, topQuestions] = await Promise.all([
					getConversationCounts(currentAgent.id),
					getAnalyticsLowConfidence(currentAgent.id),
					getAnalyticsTopQuestions(currentAgent.id, undefined, undefined, 10),
				]);

				// Check if escalated count increased and notify
				if (
					prevEscalatedCountRef.current !== null &&
					counts.escalated > prevEscalatedCountRef.current
				) {
					playNotificationSound();
					const newCount = counts.escalated - prevEscalatedCountRef.current;
					toast.info(
						newCount === 1
							? "New escalated conversation"
							: `${newCount} new escalated conversations`,
					);
				}
				prevEscalatedCountRef.current = counts.escalated;

				// Store escalated count for Conversations badge
				setEscalatedCount(counts.escalated);

				let criticalCount = 0;

				// Count critical issues (same logic as needs-attention page)
				// Issue 1: Escalated conversations >= 10
				if (counts.escalated >= 10) {
					criticalCount++;
				}

				// Issue 2: Low confidence questions >= 10
				if (lowConfidenceData.lowConfidenceCount >= 10) {
					criticalCount++;
				}

				// Issue 3: Knowledge gaps with total count >= 15
				const recurringUnanswered = topQuestions.questions.filter((q) => q.count >= 3);
				if (recurringUnanswered.length > 0) {
					const totalCount = recurringUnanswered.reduce((sum, q) => sum + q.count, 0);
					if (totalCount >= 15) {
						criticalCount++;
					}
				}

				setCriticalIssuesCount(criticalCount);
			} catch {
				// Silently fail - count will just show 0
				setCriticalIssuesCount(0);
				setEscalatedCount(0);
			}
		};

		// Initial fetch
		fetchCriticalIssuesCount();

		// Poll every 60 seconds
		const pollInterval = setInterval(fetchCriticalIssuesCount, 60000);

		return () => {
			clearInterval(pollInterval);
		};
	}, [pathname, currentAgent]);

	// Fetch usage data for non-self-hosted
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally refetch on navigation
	useEffect(() => {
		if (!isSelfHosted) {
			getUsage()
				.then((data) => setUsage(data))
				.catch(() => {
					// Silently fail
				});
		}
	}, [pathname, isSelfHosted]);

	// Fetch new submissions count since last seen
	// biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally refetch on navigation
	useEffect(() => {
		const fetchNewSubmissionsCount = async () => {
			if (!currentAgent) {
				setNewSubmissionsCount(0);
				return;
			}

			try {
				const lastSeenKey = `submissions-last-seen-${currentAgent.id}`;
				const lastSeen = localStorage.getItem(lastSeenKey);
				const count = await getNewSubmissionsCount(currentAgent.id, lastSeen || undefined);
				setNewSubmissionsCount(count);
				// Auto-expand Outcomes when there are new submissions
				if (count > 0) {
					setOpenGroups((prev) => ({ ...prev, Outcomes: true }));
				}
			} catch {
				setNewSubmissionsCount(0);
			}
		};
		fetchNewSubmissionsCount();
	}, [pathname, currentAgent]);

	// Fetch admin status once on mount
	useEffect(() => {
		checkAdminAccess()
			.then((result) => setIsAdmin(result.isAdmin))
			.catch(() => setIsAdmin(false));
	}, []);

	const isFreePlan = usage?.planId === "free";

	// Check if we're on the home page or team settings (no agent context)
	const isHomePage =
		pathname === "/" ||
		pathname === "/dashboard" ||
		pathname === "/team" ||
		pathname === "/billing" ||
		pathname === "/api-keys" ||
		pathname === "/agents/new" ||
		pathname === "/contact" ||
		pathname === "/admin" ||
		pathname.startsWith("/integrations");

	// Home page sidebar items (filter out Usage for self-hosted)
	const homeSidebarItems = [
		{ icon: Bot, label: "Agents", href: "/dashboard" },
		{ icon: Key, label: "API Keys", href: "/api-keys" },
		...(!isSelfHosted ? [{ icon: Receipt, label: "Billing", href: "/billing" }] : []),
		{ icon: Users, label: "Team Settings", href: "/team" },
		...(isAdmin ? [{ icon: Shield, label: "Admin", href: "/admin" }] : []),
	];

	// Integrations sidebar items (shown on home pages)
	const integrationItems = [
		{ icon: ShoppingBag, label: "Shopify", href: "/integrations/shopify" },
		{ icon: Mail, label: "Email Domains", href: "/integrations/email" },
	];

	// Agent-specific sidebar items
	const playgroundItems = [
		{ icon: LayoutDashboard, label: "Overview", href: "/overview" },
		{ icon: BarChart3, label: "Analytics", href: "/analytics" },
		{
			icon: MessageSquare,
			label: "Conversations",
			href: "/conversations",
			badge: escalatedCount,
			badgeTooltip: "Escalated conversations",
		},
		// { icon: MessageSquare, label: "Playground", href: "/chat" },
	];

	const aiPerformanceItems = [
		// { icon: BarChart3, label: "Analytics", href: "/analytics" },
		{ icon: BarChart3, label: "Answer Quality", href: "/answer-quality" },
		{ icon: HelpCircle, label: "Unanswered Questions", href: "/unanswered-questions" },
		{
			icon: Inbox,
			label: "Needs Attention",
			href: "/needs-attention",
			badge: criticalIssuesCount,
			badgeTooltip: "Critical issues",
		},
	];

	const outcomeItems = [
		{ icon: Target, label: "Conversions", href: "/conversions" },
		{ icon: CheckCircle2, label: "Resolutions", href: "/resolutions" },
		{
			icon: Send,
			label: "Submissions",
			href: "/submissions",
			badge: newSubmissionsCount,
			badgeTooltip: "New submissions",
		},
	];

	const channelItems = [
		{
			icon: Rocket,
			label: "Installation Guide",
			href: currentAgent ? `/setup-complete?agent=${currentAgent.id}` : "/setup-complete",
		},
		{ icon: Code, label: "Embed", href: "/channels/embed" },
		{ icon: Mail, label: "Email", href: "/channels/email" },
		{ icon: MessageCircle, label: "Messenger", href: "/channels/messenger" },
	];

	const automationItems = [
		{ icon: Wrench, label: "Tools", href: "/tools" },
		{ icon: Zap, label: "Triggers", href: "/triggers" },
		{ icon: MessageSquare, label: "Test & Debug", href: "/chat" },
	];

	const renderMenuItem = (item: {
		icon: React.ElementType;
		label: string;
		href: string;
		badge?: number;
		badgeTooltip?: string;
	}) => {
		const isActive = pathname === item.href;
		return (
			<Link
				key={item.href}
				href={shopifyHref(item.href)}
				onClick={() => setOpenMobile(false)}
				className={`relative px-5 py-2.5 flex items-center justify-between cursor-pointer transition-all border-l-2 ${
					isActive
						? "bg-white border-l-[#1A1A1A] text-[#1A1A1A]"
						: "border-l-transparent text-[#666] hover:bg-[#F3F2EE] hover:text-[#1A1A1A]"
				}`}
			>
				<div className="flex items-center gap-3">
					<item.icon
						size={16}
						strokeWidth={1.5}
						className={isActive ? "text-[#1A1A1A]" : "text-[#888]"}
					/>
					<span className={`text-xs ${isActive ? "font-bold" : "font-medium"}`}>{item.label}</span>
				</div>
				{item.badge !== undefined && item.badge > 0 && (
					<Tooltip>
						<TooltipTrigger asChild>
							<span className="bg-[#1A1A1A] text-white text-[9px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
								{item.badge > 99 ? "99+" : item.badge}
							</span>
						</TooltipTrigger>
						<TooltipContent>{item.badgeTooltip || "Count"}</TooltipContent>
					</Tooltip>
				)}
			</Link>
		);
	};

	const renderCollapsibleGroup = (
		title: string,
		items: {
			icon: React.ElementType;
			label: string;
			href: string;
			badge?: number;
			badgeTooltip?: string;
		}[],
	) => {
		const isOpen = openGroups[title] ?? false;
		return (
			<div key={title} className="mb-6">
				<button
					type="button"
					onClick={() => toggleGroup(title)}
					className="flex items-center justify-between w-full px-5 mb-2 cursor-pointer group"
				>
					<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] group-hover:text-[#1A1A1A] transition-colors">
						{title}
					</span>
					<ChevronDown
						size={12}
						className={cn("text-[#888] transition-transform", isOpen && "rotate-180")}
					/>
				</button>
				{isOpen && <div className="space-y-[1px]">{items.map(renderMenuItem)}</div>}
			</div>
		);
	};

	const renderSidebarContent = () => {
		// Home page sidebar - simplified navigation
		if (isHomePage) {
			return (
				<>
					<div className="mb-6">
						<div className="space-y-[1px]">{homeSidebarItems.map(renderMenuItem)}</div>
					</div>
					<div className="mb-6">
						<div className="flex items-center justify-between px-5 mb-2 cursor-pointer group">
							<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] group-hover:text-[#1A1A1A] transition-colors">
								Integrations
							</span>
						</div>
						<div className="space-y-[1px]">{integrationItems.map(renderMenuItem)}</div>
					</div>
				</>
			);
		}

		// Agent-specific sidebar - expanded shows collapsible groups
		return (
			<>
				<div className="mb-6">
					<div className="flex items-center justify-between px-5 mb-2 cursor-pointer group">
						<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] group-hover:text-[#1A1A1A] transition-colors">
							Main
						</span>
					</div>
					<div className="space-y-[1px]">{playgroundItems.map(renderMenuItem)}</div>
				</div>
				{renderCollapsibleGroup("AI Performance", aiPerformanceItems)}
				{renderCollapsibleGroup("Outcomes", outcomeItems)}
				{renderCollapsibleGroup("Automation", automationItems)}
				{renderCollapsibleGroup("Channels", channelItems)}
			</>
		);
	};

	// Mobile sidebar content
	const sidebarContent = (
		<>
			{/* Header */}
			<div className="h-16 flex items-center px-5 border-b border-[#D1D1D1] bg-[#EAE9E5]">
				<Link href={shopifyHref("/dashboard")} className="group">
					<LogoIcon size="sm" />
				</Link>
			</div>

			{/* Agent Selector */}
			<div className="p-3 border-b border-[#D1D1D1]">
				<Link
					href={shopifyHref("/dashboard")}
					className="w-full flex items-center justify-between bg-[#F3F2EE] border border-[#D1D1D1] px-3 py-2 hover:border-[#1A1A1A] hover:bg-white transition-all group"
				>
					<div className="flex items-center gap-2">
						<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
						<div className="flex flex-col">
							<span className="text-xs font-bold tracking-tight uppercase">
								{currentAgent?.name || "Select Agent"}
							</span>
							{currentAgent?.aiQuality && (
								<span className="font-mono text-[9px] text-[#666] uppercase tracking-wider">
									{(() => {
										const qualityNames: Record<string, string> = {
											fast: "Fast",
											balanced: "Balanced",
											high_quality: "High Quality",
										};
										return qualityNames[currentAgent.aiQuality] || "Balanced";
									})()}
								</span>
							)}
						</div>
					</div>
					<ChevronDown size={12} className="text-[#888] group-hover:text-[#1A1A1A]" />
				</Link>
			</div>

			{/* Navigation */}
			<div className="flex-1 py-4 overflow-y-auto">{renderSidebarContent()}</div>

			{/* Footer */}
			<div className="border-t border-[#D1D1D1] bg-[#F3F2EE]">
				{/* Knowledge & Settings - only show when not on home page */}
				{!isHomePage && (
					<div className="px-3 pt-3 space-y-[1px]">
						<Link
							href={shopifyHref("/ai-knowledge")}
							onClick={() => setOpenMobile(false)}
							className={`relative px-2 py-2 flex items-center gap-3 cursor-pointer transition-all rounded-sm ${
								pathname.startsWith("/ai-knowledge")
									? "bg-white text-[#1A1A1A]"
									: "text-[#666] hover:bg-[#E5E4E0] hover:text-[#1A1A1A]"
							}`}
						>
							<Database
								size={16}
								strokeWidth={1.5}
								className={pathname.startsWith("/ai-knowledge") ? "text-[#1A1A1A]" : "text-[#888]"}
							/>
							<span
								className={`text-xs ${pathname.startsWith("/ai-knowledge") ? "font-bold" : "font-medium"}`}
							>
								Knowledge
							</span>
						</Link>
						<Link
							href={shopifyHref("/settings")}
							onClick={() => setOpenMobile(false)}
							className={`relative px-2 py-2 flex items-center gap-3 cursor-pointer transition-all rounded-sm ${
								pathname.startsWith("/settings")
									? "bg-white text-[#1A1A1A]"
									: "text-[#666] hover:bg-[#E5E4E0] hover:text-[#1A1A1A]"
							}`}
						>
							<Settings
								size={16}
								strokeWidth={1.5}
								className={pathname.startsWith("/settings") ? "text-[#1A1A1A]" : "text-[#888]"}
							/>
							<span
								className={`text-xs ${pathname.startsWith("/settings") ? "font-bold" : "font-medium"}`}
							>
								Settings
							</span>
						</Link>
					</div>
				)}

				{/* Usage indicator */}
				{!isSelfHosted && usage && (
					<div className="px-3 pt-2">
						<Link
							href={shopifyHref("/billing")}
							onClick={() => setOpenMobile(false)}
							className="flex items-center gap-2 px-2 py-2 text-[#666] hover:text-[#1A1A1A] transition-colors"
						>
							<BarChart3 size={14} className="text-[#888]" />
							<div className="flex-1">
								<div className="flex items-center justify-between mb-1">
									<span className="font-mono text-[9px] uppercase text-[#888]">Usage</span>
									<span className="font-mono text-[9px] font-bold">
										{usage.percentUsed.toFixed(0)}%
									</span>
								</div>
								<div className="w-full h-1 bg-[#E5E5E5] overflow-hidden">
									<div
										className={cn(
											"h-full transition-all",
											usage.percentUsed >= 95
												? "bg-red-500"
												: usage.percentUsed >= 80
													? "bg-yellow-500"
													: "bg-green-500",
										)}
										style={{ width: `${Math.min(usage.percentUsed, 100)}%` }}
									/>
								</div>
							</div>
						</Link>
					</div>
				)}

				{/* User menu */}
				<div className="p-4">
					<SidebarUserMenu isFreePlan={!isSelfHosted && isFreePlan} shopifyHref={shopifyHref} />
				</div>
			</div>
		</>
	);

	return (
		<>
			{/* Desktop sidebar */}
			<aside className="w-[260px] bg-[#EAE9E5] border-r border-[#D1D1D1] flex-col h-screen sticky top-0 font-sans text-[#1A1A1A] z-30 flex-shrink-0 hidden md:flex">
				{sidebarContent}
			</aside>

			{/* Mobile sidebar */}
			<Sheet open={openMobile} onOpenChange={setOpenMobile}>
				<SheetContent side="left" className="w-[280px] p-0 bg-[#EAE9E5]">
					<SheetHeader className="sr-only">
						<SheetTitle>Navigation</SheetTitle>
						<SheetDescription>Main navigation menu</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col h-full text-[#1A1A1A]">{sidebarContent}</div>
				</SheetContent>
			</Sheet>
		</>
	);
}
