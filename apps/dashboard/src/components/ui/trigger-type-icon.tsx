"use client";

import { Calendar, Clock, Globe, MousePointer, Scroll, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type TriggerIconType =
	| "exit_intent"
	| "time_on_page"
	| "scroll_depth"
	| "page_view"
	| "page_load"
	| "scheduled"
	| "custom_event"
	| "EXIT_INTENT"
	| "TIME_ON_PAGE"
	| "SCROLL_DEPTH"
	| "PAGE_VIEW"
	| "PAGE_LOAD"
	| "SCHEDULED"
	| "CUSTOM_EVENT";

interface TriggerTypeIconProps {
	type: TriggerIconType | string;
	size?: number;
	className?: string;
	showBox?: boolean;
}

const iconConfig: Record<string, { icon: typeof Zap; colorClass: string }> = {
	exit_intent: { icon: MousePointer, colorClass: "text-orange-600" },
	EXIT_INTENT: { icon: MousePointer, colorClass: "text-orange-600" },
	time_on_page: { icon: Clock, colorClass: "text-blue-600" },
	TIME_ON_PAGE: { icon: Clock, colorClass: "text-blue-600" },
	scroll_depth: { icon: Scroll, colorClass: "text-purple-600" },
	SCROLL_DEPTH: { icon: Scroll, colorClass: "text-purple-600" },
	page_view: { icon: Globe, colorClass: "text-green-600" },
	PAGE_VIEW: { icon: Globe, colorClass: "text-green-600" },
	page_load: { icon: Globe, colorClass: "text-green-600" },
	PAGE_LOAD: { icon: Globe, colorClass: "text-green-600" },
	scheduled: { icon: Calendar, colorClass: "text-pink-600" },
	SCHEDULED: { icon: Calendar, colorClass: "text-pink-600" },
	custom_event: { icon: Zap, colorClass: "text-yellow-600" },
	CUSTOM_EVENT: { icon: Zap, colorClass: "text-yellow-600" },
};

export function TriggerTypeIcon({
	type,
	size = 14,
	className,
	showBox = false,
}: TriggerTypeIconProps) {
	const config = iconConfig[type] || { icon: Zap, colorClass: "text-[#888]" };
	const Icon = config.icon;

	if (showBox) {
		return (
			<div
				className={cn(
					"w-6 h-6 bg-[#F3F2EE] border border-[#D1D1D1] flex items-center justify-center rounded-sm",
					className,
				)}
			>
				<Icon size={size} className={config.colorClass} />
			</div>
		);
	}

	return <Icon size={size} className={cn(config.colorClass, className)} />;
}
