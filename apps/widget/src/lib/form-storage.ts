/**
 * Form state persistence using localStorage
 * Saves partial form data to restore if user closes widget mid-form
 */

const STORAGE_PREFIX = "ansa_form_";

interface FormStorageData {
	formData: Record<string, unknown>;
	fieldsCompleted: string[];
	startedAt: number;
	impressionAt?: number;
}

/**
 * Get the storage key for a form
 */
function getStorageKey(agentId: string, toolName: string): string {
	return `${STORAGE_PREFIX}${agentId}:${toolName}`;
}

/**
 * Save form data to localStorage
 */
export function saveFormData(
	agentId: string,
	toolName: string,
	formData: Record<string, unknown>,
	fieldsCompleted: string[],
	impressionAt?: number,
): void {
	const key = getStorageKey(agentId, toolName);
	const data: FormStorageData = {
		formData,
		fieldsCompleted,
		startedAt: Date.now(),
		impressionAt,
	};

	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.warn("[ansa] Failed to save form data to localStorage:", error);
	}
}

/**
 * Load form data from localStorage
 */
export function loadFormData(agentId: string, toolName: string): FormStorageData | null {
	const key = getStorageKey(agentId, toolName);

	try {
		const stored = localStorage.getItem(key);
		if (!stored) return null;

		const data = JSON.parse(stored) as FormStorageData;

		// Optional: expire old data (e.g., after 24 hours)
		const maxAge = 24 * 60 * 60 * 1000; // 24 hours
		if (Date.now() - data.startedAt > maxAge) {
			clearFormData(agentId, toolName);
			return null;
		}

		return data;
	} catch (error) {
		console.warn("[ansa] Failed to load form data from localStorage:", error);
		return null;
	}
}

/**
 * Clear form data from localStorage (called on successful submission)
 */
export function clearFormData(agentId: string, toolName: string): void {
	const key = getStorageKey(agentId, toolName);

	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.warn("[ansa] Failed to clear form data from localStorage:", error);
	}
}

/**
 * Track form impression (when form is first shown)
 */
export function trackFormImpression(agentId: string, toolName: string): number {
	const key = getStorageKey(agentId, toolName);
	const impressionAt = Date.now();

	try {
		const existing = localStorage.getItem(key);
		if (existing) {
			const data = JSON.parse(existing) as FormStorageData;
			if (!data.impressionAt) {
				data.impressionAt = impressionAt;
				localStorage.setItem(key, JSON.stringify(data));
			}
			return data.impressionAt;
		} else {
			// Create new entry with just impression
			const data: FormStorageData = {
				formData: {},
				fieldsCompleted: [],
				startedAt: impressionAt,
				impressionAt,
			};
			localStorage.setItem(key, JSON.stringify(data));
			return impressionAt;
		}
	} catch (error) {
		console.warn("[ansa] Failed to track form impression:", error);
		return impressionAt;
	}
}

/**
 * Get all stored form keys for cleanup
 */
export function getAllFormKeys(): string[] {
	const keys: string[] = [];
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(STORAGE_PREFIX)) {
				keys.push(key);
			}
		}
	} catch (error) {
		console.warn("[ansa] Failed to get form keys:", error);
	}
	return keys;
}

/**
 * Clear all stored form data (for cleanup)
 */
export function clearAllFormData(): void {
	const keys = getAllFormKeys();
	for (const key of keys) {
		try {
			localStorage.removeItem(key);
		} catch (error) {
			console.warn("[ansa] Failed to clear form key:", key, error);
		}
	}
}
