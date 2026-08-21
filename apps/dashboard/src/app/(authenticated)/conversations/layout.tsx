"use client";
import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ClusterFilterBadge } from "@/components/cluster-filter-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useClusterFilter } from "@/hooks/use-cluster-filter";
import type { Conversation } from "@/lib/api";
import { useConversationList } from "@/lib/conversation-list-context";
import { ConversationFilters, ConversationListItem } from "./_components";
export default function ConversationsLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const { clusterId, clusterInfo, clusterLoading } = useClusterFilter();
	const {
		conversations,
		loading,
		loadingMore,
		hasMore,
		offset,
		filterCounts,
		activeTab,
		selectedChannels,
		selectedConfidenceLevels,
		selectedFeedback,
		actionStatus,
		resolved,
		hasMeaningfulQuestion,
		hasConversion,
		setActiveTab,
		setSelectedChannels,
		setSelectedConfidenceLevels,
		setSelectedFeedback,
		setClusterId,
		setActionStatus,
		setResolved,
		setHasMeaningfulQuestion,
		setHasConversion,
		fetchConversations,
	} = useConversationList();
	const sentinelRef = useRef<HTMLDivElement>(null);
	const selectedId =
		pathname.startsWith("/conversations/") && pathname !== "/conversations"
			? pathname.split("/")[2]
			: null;
	useEffect(() => {
		setClusterId(clusterId);
	}, [clusterId, setClusterId]);
	useEffect(() => {
		if (!sentinelRef.current || !hasMore || loadingMore || loading) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasMore && !loadingMore) {
					fetchConversations(offset, false);
				}
			},
			{ threshold: 0.1 },
		);
		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [hasMore, loadingMore, loading, offset, fetchConversations]);
	const renderConversationList = () => {
		if (loading) {
			return (
				<div className="flex items-center justify-center h-32">
					{" "}
					<Loader2 className="w-6 h-6 animate-spin text-[#888]" />{" "}
				</div>
			);
		}
		if (conversations.length === 0) {
			return (
				<div className="flex items-center justify-center h-32 text-sm text-[#888]">
					No conversations
				</div>
			);
		}
		return (
			<>
				{" "}
				{conversations.map((convo: Conversation) => (
					<ConversationListItem
						key={convo.id}
						conversation={convo}
						isSelected={selectedId === convo.id}
						onClick={() => router.push(`/conversations/${convo.id}`)}
					/>
				))}{" "}
				<div ref={sentinelRef} className="h-4" />{" "}
				{loadingMore && (
					<div className="flex items-center justify-center p-4">
						{" "}
						<Loader2 className="w-5 h-5 animate-spin text-[#888]" />{" "}
					</div>
				)}{" "}
			</>
		);
	};
	return (
		<div className="flex flex-col h-full overflow-hidden bg-[#F3F2EE] dark:bg-zinc-950">
			{" "}
			{clusterId && (
				<div className="flex items-center gap-2 p-4 border-b border-[#D1D1D1] dark:border-zinc-800 bg-white dark:bg-zinc-900">
					{" "}
					<ClusterFilterBadge
						clusterInfo={clusterInfo}
						loading={clusterLoading}
						clearUrl="/conversations"
					/>{" "}
				</div>
			)}{" "}
			<div className="flex flex-1 overflow-hidden">
				{" "}
				{/* Thread list - test7 style with 380px width */}
				<div className="flex flex-col border-r border-[#D1D1D1] dark:border-zinc-800 w-[380px] bg-white dark:bg-zinc-900">
					{" "}
					<ConversationFilters
						activeTab={activeTab}
						onTabChange={setActiveTab}
						selectedChannels={selectedChannels}
						onChannelsChange={setSelectedChannels}
						selectedConfidenceLevels={selectedConfidenceLevels}
						onConfidenceLevelsChange={setSelectedConfidenceLevels}
						selectedFeedback={selectedFeedback}
						onFeedbackChange={setSelectedFeedback}
						filterCounts={filterCounts}
						actionStatus={actionStatus}
						onActionStatusChange={setActionStatus}
						resolved={resolved}
						onResolvedChange={setResolved}
						hasMeaningfulQuestion={hasMeaningfulQuestion}
						onHasMeaningfulQuestionChange={setHasMeaningfulQuestion}
						hasConversion={hasConversion}
						onHasConversionChange={setHasConversion}
					/>{" "}
					<ScrollArea className="flex-1">{renderConversationList()}</ScrollArea>{" "}
				</div>{" "}
				{/* Main chat area */}
				{children}
			</div>{" "}
		</div>
	);
}
