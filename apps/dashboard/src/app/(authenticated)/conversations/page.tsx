"use client";

import { MessageSquare } from "lucide-react";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";

export default function ConversationsPage() {
	return (
		<div className="flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-[#F3F2EE] dark:bg-zinc-950">
			<Empty variant="warm" className="h-full">
				<EmptyContent>
					<EmptyMedia variant="icon-warm">
						<MessageSquare />
					</EmptyMedia>
					<EmptyTitle>Select a conversation</EmptyTitle>
					<EmptyDescription variant="warm">
						Choose a conversation from the list to view messages.
					</EmptyDescription>
				</EmptyContent>
			</Empty>
		</div>
	);
}
