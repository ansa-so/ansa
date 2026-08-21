import { francAll } from "franc";

// Map ISO 639-3 codes to full language names
const LANGUAGE_NAMES: Record<string, string> = {
	eng: "English",
	spa: "Spanish",
	fra: "French",
	deu: "German",
	ita: "Italian",
	por: "Portuguese",
	nld: "Dutch",
	rus: "Russian",
	zho: "Chinese",
	jpn: "Japanese",
	kor: "Korean",
	ara: "Arabic",
	hin: "Hindi",
	ben: "Bengali",
	tur: "Turkish",
	vie: "Vietnamese",
	tha: "Thai",
	pol: "Polish",
	ukr: "Ukrainian",
	ces: "Czech",
	ron: "Romanian",
	hun: "Hungarian",
	ell: "Greek",
	heb: "Hebrew",
	swe: "Swedish",
	dan: "Danish",
	nor: "Norwegian",
	fin: "Finnish",
	ind: "Indonesian",
	msa: "Malay",
	fil: "Filipino",
	cat: "Catalan",
	hrv: "Croatian",
	srp: "Serbian",
	slk: "Slovak",
	slv: "Slovenian",
	bul: "Bulgarian",
	lit: "Lithuanian",
	lav: "Latvian",
	est: "Estonian",
	fas: "Persian",
	urd: "Urdu",
	tam: "Tamil",
	tel: "Telugu",
	mar: "Marathi",
	guj: "Gujarati",
	kan: "Kannada",
	mal: "Malayalam",
	pan: "Punjabi",
	nep: "Nepali",
	sin: "Sinhala",
	mya: "Burmese",
	khm: "Khmer",
	lao: "Lao",
	afr: "Afrikaans",
	swa: "Swahili",
	amh: "Amharic",
	hau: "Hausa",
	yor: "Yoruba",
	ibo: "Igbo",
	zul: "Zulu",
	xho: "Xhosa",
};

// Minimum confidence threshold for language detection (0-1 scale)
const CONFIDENCE_THRESHOLD = 0.75;
// Minimum text length for reliable detection
const MIN_TEXT_LENGTH = 25;

/**
 * Detects the language of the given text.
 * Returns the ISO 639-3 language code, or null if undetermined or confidence is too low.
 */
export function detectLanguage(text: string): string | null {
	if (!text || text.trim().length < MIN_TEXT_LENGTH) {
		// Too short to reliably detect
		return null;
	}

	const results = francAll(text);

	// francAll returns an array of [code, score] sorted by score descending
	if (results.length === 0) {
		return null;
	}

	const [code, score] = results[0];

	// Return null if undetermined or confidence is below threshold
	if (code === "und" || score < CONFIDENCE_THRESHOLD) {
		return null;
	}

	return code;
}

/**
 * Gets the full language name from an ISO 639-3 code.
 * Returns "Unknown" if the code is not recognized.
 */
export function getLanguageName(code: string | null): string {
	if (!code) {
		return "Unknown";
	}
	return LANGUAGE_NAMES[code] || "Unknown";
}
