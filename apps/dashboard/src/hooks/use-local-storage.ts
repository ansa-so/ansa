"use client";

import { useCallback, useEffect, useState } from "react";

export function useLocalStorage<T>(
	key: string,
	defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
	// Initialize with default value to avoid hydration mismatch
	const [value, setValue] = useState<T>(defaultValue);

	// Sync with localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(key);
			if (stored !== null) {
				setValue(JSON.parse(stored));
			}
		} catch {
			// Ignore errors (e.g., invalid JSON, localStorage unavailable)
		}
	}, [key]);

	// Update both state and localStorage
	const setStoredValue = useCallback(
		(newValue: T | ((prev: T) => T)) => {
			setValue((prev) => {
				const resolved = newValue instanceof Function ? newValue(prev) : newValue;
				try {
					localStorage.setItem(key, JSON.stringify(resolved));
				} catch {
					// Ignore errors (e.g., quota exceeded)
				}
				return resolved;
			});
		},
		[key],
	);

	return [value, setStoredValue];
}
