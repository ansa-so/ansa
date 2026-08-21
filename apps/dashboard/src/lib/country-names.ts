/**
 * Gets the full country name from an ISO 3166-1 alpha-2 country code.
 * Uses the Intl.DisplayNames API for localized country names.
 * Returns "Unknown" if the code is not recognized or null.
 */
export function getCountryName(code: string | null | undefined): string {
	if (!code) {
		return "Unknown";
	}

	try {
		const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
		const name = displayNames.of(code.toUpperCase());
		return name || "Unknown";
	} catch {
		return "Unknown";
	}
}
