"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type ClusterInfo, getClusterInfo } from "@/lib/api";
import { isValidUUID } from "@/lib/cluster-utils";

/**
 * Custom hook for handling cluster filtering from URL parameters
 * Validates cluster ID, fetches cluster info, and handles errors
 */
export function useClusterFilter() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null);
	const [clusterLoading, setClusterLoading] = useState(false);
	const [clusterError, setClusterError] = useState(false);

	const clusterId = searchParams.get("cluster");
	const isValidClusterId = isValidUUID(clusterId);

	// Handle invalid cluster ID
	useEffect(() => {
		if (clusterId && !isValidClusterId) {
			console.error("Invalid cluster ID:", clusterId);
			// Remove invalid cluster parameter
			const params = new URLSearchParams(searchParams.toString());
			params.delete("cluster");
			router.replace(`${window.location.pathname}?${params.toString()}`);
		}
	}, [clusterId, isValidClusterId, router, searchParams]);

	// Fetch cluster info when cluster ID is provided
	useEffect(() => {
		if (!isValidClusterId || !clusterId) {
			setClusterInfo(null);
			return;
		}

		const fetchClusterInfo = async () => {
			setClusterLoading(true);
			setClusterError(false);
			try {
				const info = await getClusterInfo(clusterId);
				setClusterInfo(info);
			} catch (error) {
				console.error("Failed to fetch cluster info:", error);
				setClusterError(true);
				// Remove invalid cluster parameter
				const params = new URLSearchParams(searchParams.toString());
				params.delete("cluster");
				router.replace(`${window.location.pathname}?${params.toString()}`);
			} finally {
				setClusterLoading(false);
			}
		};

		fetchClusterInfo();
	}, [clusterId, isValidClusterId, router, searchParams]);

	return {
		clusterId: isValidClusterId ? clusterId : null,
		clusterInfo,
		clusterLoading,
		clusterError,
		isValidClusterId,
	};
}
