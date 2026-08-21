import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ConfidenceDistributionData, ConfidenceSummary } from "./api";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * Calculate trusted answer rate (percentage of high-confidence responses)
 * @param confidenceSummary - Summary of confidence statistics
 * @param confidenceDistribution - Distribution of confidence scores by bucket
 * @param threshold - Minimum confidence threshold (default: 70)
 * @returns Percentage (0-100) of responses with high confidence, or 0 if no responses
 */
export function calculateTrustedAnswerRate(
	confidenceSummary: ConfidenceSummary | null | undefined,
	confidenceDistribution: ConfidenceDistributionData[],
	threshold = 70,
): number {
	const totalResponses =
		(confidenceSummary?.totalWithConfidence || 0) +
		(confidenceSummary?.totalWithoutConfidence || 0);

	const highConfidenceCount = confidenceDistribution
		.filter((d) => d.bucket >= threshold)
		.reduce((sum, d) => sum + d.count, 0);

	return totalResponses > 0 ? Math.round((highConfidenceCount / totalResponses) * 100) : 0;
}

/**
 * Format a count number for display.
 * - Returns raw number if <= 999
 * - Returns abbreviated format (1.2k, 15.3k) if > 999
 */
export function formatCount(count: number): string {
	if (count <= 999) {
		return count.toString();
	}
	const thousands = count / 1000;
	// Use 1 decimal place, but remove trailing .0
	const formatted = thousands.toFixed(1).replace(/\.0$/, "");
	return `${formatted}k`;
}

/**
 * Format time to resolution in seconds to human-readable format.
 * - Returns "Xs" for times under 60 seconds
 * - Returns "Xm Ys" for times 60 seconds and above
 * Examples: "45s", "2m 34s", "15m 3s"
 */
export function formatTimeToResolution(seconds: number): string {
	if (seconds < 60) {
		return `${Math.round(seconds)}s`;
	}
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return `${minutes}m ${remainingSeconds}s`;
}
