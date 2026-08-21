/**
 * JSONPath-like value extraction supporting dot notation and array indexing.
 * Paths like "product.name", "data[0].title", "$.items[2].price"
 */
export function getValueByPath(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== "object") return undefined;
	const cleanPath = path.replace(/^\$\.?/, "");
	if (!cleanPath) return obj;
	const parts = cleanPath.split(".");
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
		if (arrayMatch) {
			const [, key, indexStr] = arrayMatch;
			current = (current as Record<string, unknown>)[key];
			if (Array.isArray(current)) {
				current = current[parseInt(indexStr, 10)];
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
	if (!expression.includes("{{")) {
		const fallbackMatch = expression.match(/^(.+?)\s*\|\|\s*(.+)$/);
		if (fallbackMatch) {
			const [, pathPart, defaultPart] = fallbackMatch;
			const value = getValueByPath(data, pathPart.trim());
			if (value !== undefined && value !== null && value !== "") return value;
			return defaultPart.trim();
		}
		return getValueByPath(data, expression);
	}
	const result = expression.replace(/\{\{(.+?)\}\}/g, (_, path) => {
		const value = getValueByPath(data, path.trim());
		return value !== undefined && value !== null ? String(value) : "";
	});
	const templateFallback = result.match(/^(.+?)\s*\|\|\s*(.+)$/);
	if (templateFallback) {
		const [, main, fallback] = templateFallback;
		return main.trim() || fallback.trim();
	}
	return result;
}

// Apply field mappings to transform tool result data
export function applyFieldMappings(
	data: unknown,
	mappings?: Record<string, string>,
): Record<string, unknown> {
	if (!mappings || Object.keys(mappings).length === 0) {
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
