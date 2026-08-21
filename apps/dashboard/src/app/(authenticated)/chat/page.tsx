"use client";

import { PageHeader } from "@ansa/ui";
import { MessageSquare } from "lucide-react";
import { useEffect } from "react";
import { markChecklistTested } from "@/components/getting-started-checklist";
import { Text } from "@/components/ui/text";
import { useAgent } from "@/lib/agent-context";
import { useConfig } from "@/lib/config-context";

export default function ChatPage() {
	const { currentAgent, isLoading } = useAgent();
	const { widgetUrl, apiUrl } = useConfig();

	// Mark as tested when visiting the chat page with an agent
	useEffect(() => {
		if (currentAgent?.id) {
			markChecklistTested(currentAgent.id);
		}
	}, [currentAgent?.id]);

	if (isLoading) {
		return (
			<div className="flex flex-col h-full">
				<PageHeader
					title="Chat"
					subtitle="Test your agent's responses"
					icon={<MessageSquare size={12} />}
				/>
				<div className="flex items-center justify-center flex-1">
					<Text className="text-muted-foreground">Loading...</Text>
				</div>
			</div>
		);
	}

	if (!currentAgent) {
		return (
			<div className="flex flex-col h-full">
				<PageHeader
					title="Chat"
					subtitle="Test your agent's responses"
					icon={<MessageSquare size={12} />}
				/>
				<div className="flex items-center justify-center flex-1">
					<Text className="text-muted-foreground">Please create an agent first</Text>
				</div>
			</div>
		);
	}

	const iframeConfig = {
		agentId: currentAgent.id,
		apiUrl,
		channel: "dashboard",
		_debug: true,
	};

	const iframeSrc = `${widgetUrl}/#config=${encodeURIComponent(JSON.stringify(iframeConfig))}`;

	return (
		<div className="flex flex-col h-full">
			<PageHeader
				title="Chat"
				subtitle="Test your agent's responses"
				icon={<MessageSquare size={12} />}
			/>
			<div className="flex-1 p-4 min-h-0">
				<iframe
					src={iframeSrc}
					className="w-full h-full rounded-xl border-0 shadow-lg"
					title="Chat Widget Preview"
					sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
				/>
			</div>
		</div>
	);
}
