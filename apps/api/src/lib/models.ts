import { AI_QUALITY_TIERS, type AIQuality } from "@ansa/types";

/**
 * Default tier-to-model mappings
 * These can be overridden via environment variables for flexibility
 */
const DEFAULT_TIER_MODELS = {
	[AI_QUALITY_TIERS.FAST]: "gpt-4o-mini",
	[AI_QUALITY_TIERS.BALANCED]: "gpt-4o",
	[AI_QUALITY_TIERS.HIGH_QUALITY]: "claude-sonnet-4-20250514",
} as const;

/**
 * Resolve an AI quality tier to an actual model ID
 * Checks environment variables first, falls back to defaults
 */
export function resolveTierToModel(tier: AIQuality): string {
	switch (tier) {
		case AI_QUALITY_TIERS.FAST:
			return process.env.MODEL_FAST || DEFAULT_TIER_MODELS[AI_QUALITY_TIERS.FAST];
		case AI_QUALITY_TIERS.BALANCED:
			return process.env.MODEL_BALANCED || DEFAULT_TIER_MODELS[AI_QUALITY_TIERS.BALANCED];
		case AI_QUALITY_TIERS.HIGH_QUALITY:
			return process.env.MODEL_HIGH_QUALITY || DEFAULT_TIER_MODELS[AI_QUALITY_TIERS.HIGH_QUALITY];
		default:
			console.warn(`[models] Unknown tier: ${tier}, defaulting to BALANCED`);
			return process.env.MODEL_BALANCED || DEFAULT_TIER_MODELS[AI_QUALITY_TIERS.BALANCED];
	}
}

/**
 * Determine which provider to use based on model name
 */
export function getModelProvider(model: string): "anthropic" | "openai" | "google" | "ollama" {
	if (model.startsWith("claude-")) return "anthropic";
	if (model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3")) return "openai";
	if (model.startsWith("gemini-")) return "google";
	return "ollama"; // Default to Ollama for local/custom models
}

/**
 * Check if a model is available based on configured API keys
 */
export function isModelAvailable(model: string): boolean {
	const provider = getModelProvider(model);

	switch (provider) {
		case "anthropic":
			return !!process.env.ANTHROPIC_API_KEY;
		case "openai":
			return !!process.env.OPENAI_API_KEY;
		case "google":
			return !!process.env.GOOGLE_API_KEY;
		case "ollama":
			return !!process.env.OLLAMA_API_BASE;
		default:
			return false;
	}
}

/**
 * Get all available models for tier selection
 * This is used internally - users only see tier names
 */
export function getAvailableTierModels(): Record<AIQuality, string> {
	return {
		[AI_QUALITY_TIERS.FAST]: resolveTierToModel(AI_QUALITY_TIERS.FAST),
		[AI_QUALITY_TIERS.BALANCED]: resolveTierToModel(AI_QUALITY_TIERS.BALANCED),
		[AI_QUALITY_TIERS.HIGH_QUALITY]: resolveTierToModel(AI_QUALITY_TIERS.HIGH_QUALITY),
	};
}
