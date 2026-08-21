"use client";

import { francAll } from "franc";
import { useCallback, useEffect, useRef, useState } from "react";

const MIN_CHARS_FOR_DETECTION = 25;
const DEBOUNCE_MS = 500;
const CONFIDENCE_THRESHOLD = 0.75;

/**
 * Hook to detect the language of input text with debouncing.
 * Uses the franc library for language detection.
 * @param text - The text to detect the language of
 * @returns Object with detectedLanguage (ISO 639-3 code or null) and isDetecting flag
 */
export function useLanguageDetection(text: string) {
	const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
	const [isDetecting, setIsDetecting] = useState(false);
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const detectLanguage = useCallback((inputText: string) => {
		// Too short to reliably detect
		if (!inputText || inputText.trim().length < MIN_CHARS_FOR_DETECTION) {
			setDetectedLanguage(null);
			setIsDetecting(false);
			return;
		}

		setIsDetecting(true);

		// francAll returns array of [code, score] sorted by score descending
		const results = francAll(inputText);
		let result: string | null = null;

		if (results.length > 0) {
			const [code, score] = results[0];
			// Only accept if not undetermined and confidence is above threshold
			if (code !== "und" && score >= CONFIDENCE_THRESHOLD) {
				result = code;
			}
		}

		setDetectedLanguage(result);
		setIsDetecting(false);
	}, []);

	useEffect(() => {
		// Clear previous timeout
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// Don't show detecting state for very short text
		if (!text || text.trim().length < MIN_CHARS_FOR_DETECTION) {
			setDetectedLanguage(null);
			setIsDetecting(false);
			return;
		}

		// Set detecting state immediately when text changes
		setIsDetecting(true);

		// Debounce the actual detection
		debounceRef.current = setTimeout(() => {
			detectLanguage(text);
		}, DEBOUNCE_MS);

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, [text, detectLanguage]);

	return { detectedLanguage, isDetecting };
}
