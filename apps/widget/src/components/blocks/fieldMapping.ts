/**
 * Simple JSONPath-like value extraction
 * Supports paths like "$.product.name" or "product.name" or just "name"
 */
export function getValueByPath(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== "object") return undefined;

	// Remove leading $. if present
	const cleanPath = path.replace(/^\$\.?/, "");
	if (!cleanPath) return obj;

	const parts = cleanPath.split(".");
	let current: unknown = obj;

	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;

		// Handle array indexing like [0]
		const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
		if (arrayMatch) {
			const [, key, indexStr] = arrayMatch;
			const index = parseInt(indexStr, 10);
			current = (current as Record<string, unknown>)[key];
			if (Array.isArray(current)) {
				current = current[index];
			} else {
				return undefined;
			}
		} else {
			current = (current as Record<string, unknown>)[part];
		}
	}

	return current;
}

/**
 * Resolve a single field mapping expression.
 * Supports:
 *   - Simple path: "product.name"
 *   - Path with fallback: "product.price || $19.99"
 *   - Template expression: "https://example.com/{{product.slug}}"
 *   - Mixed: "{{product.name}} || Unknown Product"
 */
function resolveFieldExpression(data: unknown, expression: string): unknown {
	// Check for fallback syntax: "path || default" (only when no template braces)
	if (!expression.includes("{{")) {
		const fallbackMatch = expression.match(/^(.+?)\s*\|\|\s*(.+)$/);
		if (fallbackMatch) {
			const [, pathPart, defaultPart] = fallbackMatch;
			const value = getValueByPath(data, pathPart.trim());
			if (value !== undefined && value !== null && value !== "") {
				return value;
			}
			return defaultPart.trim();
		}
		// Simple path
		return getValueByPath(data, expression);
	}

	// Template expression: contains {{ }}
	const result = expression.replace(/\{\{(.+?)\}\}/g, (_, path) => {
		const value = getValueByPath(data, path.trim());
		return value !== undefined && value !== null ? String(value) : "";
	});
	// Support fallback after template: "{{path}} || default"
	const templateFallback = result.match(/^(.+?)\s*\|\|\s*(.+)$/);
	if (templateFallback) {
		const [, main, fallback] = templateFallback;
		return main.trim() || fallback.trim();
	}
	return result;
}

/**
 * Apply field mappings to transform tool result data
 * into the expected shape for display components
 */
export function applyFieldMappings(
	data: unknown,
	mappings?: Record<string, string>,
): Record<string, unknown> {
	if (!mappings || Object.keys(mappings).length === 0) {
		// No mappings - return data as-is if it's an object
		if (data && typeof data === "object" && !Array.isArray(data)) {
			return data as Record<string, unknown>;
		}
		return { data };
	}

	const result: Record<string, unknown> = {};
	for (const [targetField, expression] of Object.entries(mappings)) {
		result[targetField] = resolveFieldExpression(data, expression);
	}
	return result;
}

/**
 * Simple {{field}} template interpolation
 */
export function interpolateTemplate(template: string, data: Record<string, unknown>): string {
	return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
		const value = getValueByPath(data, path);
		return value !== undefined && value !== null ? String(value) : "";
	});
}
