// Application configuration
// Self-hosted mode disables billing/usage limits

export const config = {
	isSelfHosted: process.env.SELF_HOSTED === "true",

	// Default model for new agents and fallback
	defaultModel: process.env.DEFAULT_MODEL || "gpt-4o-mini",

	// Feature flags based on hosting mode
	features: {
		billing: process.env.SELF_HOSTED !== "true",
		usageLimits: process.env.SELF_HOSTED !== "true",
		analytics: process.env.SELF_HOSTED !== "true",
	},
};
