/**
 * Strip quoted text from email replies.
 * Handles common email reply patterns:
 * - Lines starting with ">" (standard quote markers)
 * - "On [date], [sender] wrote:" patterns (iOS/Mac/Gmail)
 * - Outlook-style separators
 * If the result is empty after stripping, returns the original text.
 */
export function stripQuotedText(text: string): string {
	if (!text) return text;

	const lines = text.split("\n");
	const cleanLines: string[] = [];

	for (const line of lines) {
		// Stop at "On ... wrote:" pattern (common in iOS/Mac/Gmail replies)
		if (/^>?\s*On\s+.+wrote:\s*$/i.test(line)) {
			break;
		}

		// Stop at Outlook-style separator
		if (
			/^-{2,}.*Original Message.*-{2,}$/i.test(line) ||
			/^_{2,}$/.test(line.trim()) ||
			/^From:\s+.+$/i.test(line)
		) {
			break;
		}

		// Skip lines that start with ">" (quoted text)
		if (line.startsWith(">")) {
			continue;
		}

		cleanLines.push(line);
	}

	const result = cleanLines.join("\n").trim();

	// If stripping left nothing, return original text
	return result || text;
}

/**
 * Extract plain text from HTML email body
 */
export function extractPlainText(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}
