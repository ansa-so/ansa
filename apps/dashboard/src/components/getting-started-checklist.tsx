"use client";

import {
	BookOpen,
	Check,
	ChevronDown,
	ChevronUp,
	Code,
	ExternalLink,
	FileText,
	MessageSquare,
	Palette,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

interface ChecklistItem {
	id: string;
	title: string;
	description: string;
	href: string;
	docsHref?: string;
	icon: React.ReactNode;
	isComplete: boolean;
}

interface GettingStartedChecklistProps {
	agentId: string;
	hasWebSources?: boolean;
	hasFiles?: boolean;
	hasQASources?: boolean;
	hasCustomWidget?: boolean;
	hasTested?: boolean;
	hasTools?: boolean;
	onDismiss?: () => void;
}

const DOCS_BASE = "https://docs.ansa.so";

export function GettingStartedChecklist({
	agentId,
	hasWebSources = false,
	hasFiles = false,
	hasQASources = false,
	hasCustomWidget = false,
	hasTested = false,
	hasTools = false,
	onDismiss,
}: GettingStartedChecklistProps) {
	const [isMinimized, setIsMinimized] = useState(false);
	const [isDismissed, setIsDismissed] = useState(false);

	// Load persisted state from localStorage
	useEffect(() => {
		const dismissedKey = `checklist-dismissed-${agentId}`;
		setIsDismissed(localStorage.getItem(dismissedKey) === "true");
	}, [agentId]);

	const handleDismiss = () => {
		const dismissedKey = `checklist-dismissed-${agentId}`;
		localStorage.setItem(dismissedKey, "true");
		setIsDismissed(true);
		onDismiss?.();
	};

	// Build checklist items
	const items: ChecklistItem[] = [
		{
			id: "test",
			title: "Test your agent",
			description: "Send a message to see how your agent responds",
			href: `/chat?agent=${agentId}`,
			docsHref: `${DOCS_BASE}/quickstart`,
			icon: <MessageSquare className="w-4 h-4" />,
			isComplete: hasTested,
		},
		{
			id: "knowledge",
			title: "Add knowledge sources",
			description: "Upload files, add Q&A pairs, or crawl more web pages",
			href: `/web-sources?agent=${agentId}`,
			docsHref: `${DOCS_BASE}/agents/knowledge-base`,
			icon: <BookOpen className="w-4 h-4" />,
			isComplete: hasWebSources || hasFiles || hasQASources,
		},
		{
			id: "widget",
			title: "Customize your widget",
			description: "Change colors, messages, and appearance",
			href: `/widget?agent=${agentId}`,
			docsHref: `${DOCS_BASE}/widget/customization`,
			icon: <Palette className="w-4 h-4" />,
			isComplete: hasCustomWidget,
		},
		{
			id: "install",
			title: "Install on your website",
			description: "Deploy the chat widget on your site",
			href: `/setup-complete?agent=${agentId}`,
			docsHref: `${DOCS_BASE}/channels/embed`,
			icon: <Code className="w-4 h-4" />,
			isComplete: false, // Can't easily detect this
		},
		{
			id: "tools",
			title: "Connect an API",
			description: "Auto-discover an API endpoint for your agent",
			href: `/tools/discover?agent=${agentId}`,
			docsHref: `${DOCS_BASE}/tools/api-tools`,
			icon: <Zap className="w-4 h-4" />,
			isComplete: hasTools,
		},
	];

	const completedCount = items.filter((item) => item.isComplete).length;
	const progress = Math.round((completedCount / items.length) * 100);

	if (isDismissed) {
		return null;
	}

	return (
		<Card className="shadow-lg w-80 border-primary/20">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
							<Sparkles className="w-4 h-4 text-primary" />
						</div>
						<div>
							<CardTitle className="text-sm font-medium">Getting Started</CardTitle>
							<Text size="xs" className="text-muted-foreground">
								{completedCount} of {items.length} complete
							</Text>
						</div>
					</div>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							className="p-0 w-7 h-7"
							onClick={() => setIsMinimized(!isMinimized)}
						>
							{isMinimized ? (
								<ChevronUp className="w-4 h-4" />
							) : (
								<ChevronDown className="w-4 h-4" />
							)}
						</Button>
						<Button variant="ghost" size="sm" className="p-0 w-7 h-7" onClick={handleDismiss}>
							<X className="w-4 h-4" />
						</Button>
					</div>
				</div>

				{/* Progress bar */}
				<div className="mt-3">
					<div className="h-1.5 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full transition-all duration-300 bg-primary"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>
			</CardHeader>

			{!isMinimized && (
				<CardContent className="pt-0">
					<div className="space-y-2">
						{items.map((item) => (
							<Link
								key={item.id}
								href={item.href}
								className={`flex items-start gap-3 p-2 rounded-lg transition-colors hover:bg-muted/50 group ${
									item.isComplete ? "opacity-60" : ""
								}`}
							>
								<div
									className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 mt-0.5 ${
										item.isComplete
											? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
											: "bg-muted text-muted-foreground"
									}`}
								>
									{item.isComplete ? <Check className="w-3.5 h-3.5" /> : item.icon}
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<Text
											size="sm"
											className={`font-medium ${item.isComplete ? "line-through" : ""}`}
										>
											{item.title}
										</Text>
										{item.docsHref && (
											<a
												href={item.docsHref}
												target="_blank"
												rel="noopener noreferrer"
												className="transition-opacity opacity-0 group-hover:opacity-100"
												onClick={(e) => e.stopPropagation()}
											>
												<ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
											</a>
										)}
									</div>
									<Text size="xs" className="text-muted-foreground">
										{item.description}
									</Text>
								</div>
							</Link>
						))}
					</div>

					<div className="pt-3 mt-3 border-t">
						<a
							href={DOCS_BASE}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center justify-center gap-2 text-sm transition-colors text-muted-foreground hover:text-primary"
						>
							<FileText className="w-4 h-4" />
							View documentation
							<ExternalLink className="w-3 h-3" />
						</a>
					</div>
				</CardContent>
			)}
		</Card>
	);
}

// Helper function to mark checklist as tested (to be called when user sends first message)
export function markChecklistTested(agentId: string) {
	const testedKey = `checklist-tested-${agentId}`;
	localStorage.setItem(testedKey, "true");
}

// Helper function to check if checklist was tested
export function isChecklistTested(agentId: string): boolean {
	if (typeof window === "undefined") return false;
	const testedKey = `checklist-tested-${agentId}`;
	return localStorage.getItem(testedKey) === "true";
}

// Helper function to check if checklist was dismissed
export function isChecklistDismissed(agentId: string): boolean {
	if (typeof window === "undefined") return false;
	const dismissedKey = `checklist-dismissed-${agentId}`;
	return localStorage.getItem(dismissedKey) === "true";
}
