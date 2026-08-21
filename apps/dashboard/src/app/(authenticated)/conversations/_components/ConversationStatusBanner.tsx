"use client";

import { AlertTriangle } from "lucide-react";
import type { Conversation } from "@/lib/api";

interface ConversationStatusBannerProps {
	conversation: Conversation;
}

export function ConversationStatusBanner({ conversation }: ConversationStatusBannerProps) {
	// Priority 1: Escalated to human (only if not resolved/closed)
	if (
		conversation.hasEscalation &&
		conversation.status !== "closed" &&
		conversation.status !== "resolved"
	) {
		return (
			<div className="px-4 py-2 border-t-0 border-b border-x-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
				<div className="flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="text-[10px] text-amber-900 dark:text-amber-100">
						Escalated to human — This conversation requires attention
					</span>
				</div>
			</div>
		);
	}

	// Priority 2: Low confidence AI response (only if not escalated and not resolved/closed)
	if (
		conversation.confidenceLevel === "low" &&
		!conversation.hasEscalation &&
		conversation.status !== "closed" &&
		conversation.status !== "resolved"
	) {
		return (
			<div className="px-4 py-2 border-t-0 border-b border-x-0 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
				<div className="flex items-center gap-2">
					<AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="text-[10px] text-amber-900 dark:text-amber-100">
						AI responded with low confidence — Review recommended
					</span>
				</div>
			</div>
		);
	}

	// No status banner needed
	return null;
}
