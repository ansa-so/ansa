"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export type MetricType =
	| "conversations"
	| "messages"
	| "confidence"
	| "aiReadiness"
	| "feedback"
	| "slaCompliance";

interface MetricDetailSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	metric: MetricType | null;
	children: React.ReactNode;
}

const metricTitles: Record<MetricType, string> = {
	conversations: "Conversations",
	messages: "Messages",
	confidence: "Confidence Score",
	aiReadiness: "Trusted Answer Rate",
	feedback: "Feedback",
	slaCompliance: "SLA Compliance",
};

export function MetricDetailSheet({
	open,
	onOpenChange,
	metric,
	children,
}: MetricDetailSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
				<SheetHeader className="pb-2">
					<SheetTitle>{metric ? metricTitles[metric] : ""}</SheetTitle>
				</SheetHeader>
				<ScrollArea className="h-[calc(70vh-4rem)]">
					<div className="px-1 pb-6">{children}</div>
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}
