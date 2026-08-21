/**
 * Shared confidence level utilities for consistent confidence interpretation
 * across dashboard and email components.
 *
 * Thresholds standardized at:
 * - High: ≥80%
 * - Medium: ≥50%
 * - Low: <50%
 */

export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Confidence score thresholds - single source of truth
 */
export const CONFIDENCE_THRESHOLDS = {
	HIGH: 80,
	MEDIUM: 50,
} as const;

export interface ConfidenceLevelConfig {
	id: ConfidenceLevel;
	label: string;
	color: string;
}

/**
 * Confidence level configurations for UI display
 */
export const CONFIDENCE_LEVELS: ConfidenceLevelConfig[] = [
	{ id: "high", label: "High", color: "text-green-600" },
	{ id: "medium", label: "Medium", color: "text-yellow-600" },
	{ id: "low", label: "Low", color: "text-red-600" },
];

/**
 * Get confidence level category based on score
 * @param score - Confidence score (0-100)
 * @returns Confidence level: "high", "medium", or "low"
 */
export function getConfidenceLevel(score: number | null | undefined): ConfidenceLevel | null {
	if (score === null || score === undefined) return null;

	if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "high";
	if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "medium";
	return "low";
}

/**
 * Get human-readable confidence label for display
 * @param score - Confidence score (0-100)
 * @returns Display label: "Excellent", "Good", or "Needs improvement"
 */
export function getConfidenceLabel(score: number | null | undefined): string | null {
	if (score === null || score === undefined) return null;

	if (score >= CONFIDENCE_THRESHOLDS.HIGH) return "Excellent";
	if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return "Good";
	return "Needs improvement";
}

/**
 * Get confidence level with display text
 * @param score - Confidence score (0-100)
 * @returns Object with level and label, or null
 */
export function getConfidenceInfo(score: number | null | undefined): {
	level: ConfidenceLevel;
	label: string;
	displayLabel: string;
	color: string;
} | null {
	const level = getConfidenceLevel(score);
	if (!level) return null;

	const config = CONFIDENCE_LEVELS.find((c) => c.id === level);
	if (!config) return null;

	const displayLabel = getConfidenceLabel(score);
	if (!displayLabel) return null;

	return {
		level,
		label: config.label,
		displayLabel,
		color: config.color,
	};
}
