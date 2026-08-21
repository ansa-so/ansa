/**
 * Shared AI health status utilities for consistent health calculation
 * across dashboard and email components.
 *
 * Health status is determined by:
 * - Average confidence score
 * - Unanswered question count
 * - Escalation count
 */

export type AIHealthStatus = "healthy" | "improving" | "needs-attention";

export interface AIHealthStats {
	avgConfidence: number | null | undefined;
	unansweredCount: number;
	escalationCount?: number;
}

export interface AIHealthConfig {
	id: AIHealthStatus;
	label: string;
	color: string;
}

/**
 * Health status configurations for UI display
 */
export const HEALTH_STATUSES: AIHealthConfig[] = [
	{ id: "healthy", label: "Healthy", color: "text-green-600" },
	{ id: "improving", label: "Improving", color: "text-yellow-600" },
	{ id: "needs-attention", label: "Needs Attention", color: "text-red-600" },
];

/**
 * Calculate AI health status based on performance metrics
 * @param stats - Object containing avgConfidence, unansweredCount, and escalationCount
 * @returns Health status: "healthy", "improving", or "needs-attention"
 */
export function calculateAIHealthStatus(stats: AIHealthStats): AIHealthStatus {
	const avgConfidence = stats.avgConfidence ?? 0;
	const unansweredCount = stats.unansweredCount ?? 0;
	const escalationCount = stats.escalationCount ?? 0;

	// Needs Attention: Low confidence OR high unanswered rate OR many escalations
	if (avgConfidence < 50 || unansweredCount > 20 || escalationCount > 5) {
		return "needs-attention";
	}

	// Healthy: Good confidence AND low unanswered AND few escalations
	if (avgConfidence >= 70 && unansweredCount < 5 && escalationCount < 3) {
		return "healthy";
	}

	// Improving: In between
	return "improving";
}

/**
 * Generate human-readable reason for health status
 * @param stats - Object containing performance metrics
 * @param status - Current health status (optional, will be calculated if not provided)
 * @returns Explanation text for the health status
 */
export function getHealthReason(stats: AIHealthStats, status?: AIHealthStatus): string | null {
	const healthStatus = status || calculateAIHealthStatus(stats);

	if (healthStatus !== "needs-attention") {
		return null;
	}

	const avgConfidence = stats.avgConfidence ?? 0;
	const unansweredCount = stats.unansweredCount ?? 0;
	const escalationCount = stats.escalationCount ?? 0;

	// Prioritize reasons
	const reasons: string[] = [];

	if (unansweredCount > 20) {
		reasons.push(`${unansweredCount} unanswered questions`);
	}

	if (avgConfidence < 50) {
		reasons.push("Low confidence trend");
	}

	if (escalationCount > 5) {
		reasons.push(`${escalationCount} escalations`);
	}

	// Return the most critical reason (first one)
	return reasons[0] || null;
}

/**
 * Get health status with full configuration
 * @param stats - Object containing performance metrics
 * @returns Object with status, label, color, and reason
 */
export function getHealthInfo(stats: AIHealthStats): {
	status: AIHealthStatus;
	label: string;
	color: string;
	reason: string | null;
} {
	const status = calculateAIHealthStatus(stats);
	const config = HEALTH_STATUSES.find((h) => h.id === status);
	const reason = getHealthReason(stats, status);

	return {
		status,
		label: config?.label || "Unknown",
		color: config?.color || "text-gray-600",
		reason,
	};
}
