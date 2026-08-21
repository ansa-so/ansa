"use client";

import { Info, X } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClusterInfo } from "@/lib/api";

interface ClusterFilterBadgeProps {
	clusterInfo: ClusterInfo | null;
	loading: boolean;
	clearUrl: string;
	maxLength?: number;
}

/**
 * Reusable badge component to display active cluster filter
 * Shows the representative question with a clear button
 */
export function ClusterFilterBadge({
	clusterInfo,
	loading,
	clearUrl,
	maxLength = 60,
}: ClusterFilterBadgeProps) {
	if (loading) {
		return <Skeleton className="h-8 w-48" />;
	}

	if (!clusterInfo) {
		return null;
	}

	const displayText = clusterInfo.representativeQuestion.substring(0, maxLength);
	const needsTruncation = clusterInfo.representativeQuestion.length > maxLength;

	return (
		<Badge variant="secondary" className="gap-2">
			<Info className="w-3 h-3" />
			Filtered by cluster: {displayText}
			{needsTruncation && "..."}
			<Button variant="ghost" size="sm" className="h-auto p-0 ml-1 -mr-1" asChild>
				<Link href={clearUrl}>
					<X className="w-3 h-3" />
				</Link>
			</Button>
		</Badge>
	);
}
