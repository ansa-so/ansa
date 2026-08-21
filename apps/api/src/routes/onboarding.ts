import {
	agents,
	agentTools,
	and,
	eq,
	getDb,
	interfaceSettings,
	interfaceSettingsTranslations,
	shopifyShopAgents,
	shopifyShops,
	triggers,
	userSubscriptions,
	users,
} from "@ansa/db";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { seedDemoConversations } from "../../scripts/seed-demo-conversations.js";
import { chunkText } from "../lib/chunker";
import { config } from "../lib/config";
import { createEmbedding } from "../lib/embeddings";
import { getAgentLimit, getStorageLimit, hasEscalation } from "../lib/plans";
import { usageProvider } from "../lib/usage";

const onboardingRoute = new Hono();

// Real Chrome User-Agent to avoid Cloudflare blocks
const CHROME_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Full browser-like headers
const BROWSER_HEADERS = {
	"User-Agent": CHROME_USER_AGENT,
	Accept:
		"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
	"Accept-Language": "en-US,en;q=0.9",
	"Accept-Encoding": "gzip, deflate, br",
	"Cache-Control": "no-cache",
	Pragma: "no-cache",
	"Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
	"Sec-Ch-Ua-Mobile": "?0",
	"Sec-Ch-Ua-Platform": '"macOS"',
	"Sec-Fetch-Dest": "document",
	"Sec-Fetch-Mode": "navigate",
	"Sec-Fetch-Site": "none",
	"Sec-Fetch-User": "?1",
	"Upgrade-Insecure-Requests": "1",
};

// Fetch with retry and fallback to Jina Reader
async function fetchWithRetry(
	url: string,
	maxRetries = 2,
): Promise<{ html: string; usedJina: boolean }> {
	let lastError: Error | null = null;

	// Try direct fetch first
	for (let i = 0; i <= maxRetries; i++) {
		try {
			const response = await fetch(url, {
				headers: BROWSER_HEADERS,
				redirect: "follow",
			});

			if (response.ok) {
				return { html: await response.text(), usedJina: false };
			}

			// If blocked (403/503), retry with backoff
			if (response.status === 403 || response.status === 503) {
				if (i < maxRetries) {
					await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
					continue;
				}
			}

			lastError = new Error(`HTTP ${response.status}`);
		} catch (err) {
			lastError = err instanceof Error ? err : new Error(String(err));
			if (i < maxRetries) {
				await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
			}
		}
	}

	// Fallback: Try Jina Reader (can bypass Cloudflare)
	try {
		const jinaResponse = await fetch(`https://r.jina.ai/${encodeURIComponent(url)}`, {
			headers: {
				Accept: "text/html",
				"User-Agent": CHROME_USER_AGENT,
				"X-Return-Format": "html",
			},
		});

		if (jinaResponse.ok) {
			return { html: await jinaResponse.text(), usedJina: true };
		}
	} catch {
		// Jina also failed
	}

	throw lastError || new Error("Failed to fetch website - it may be blocking automated access");
}

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
}

// Extract meta content from HTML
function extractMeta(html: string, property: string): string | null {
	const ogMatch =
		html.match(
			new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
		) ||
		html.match(
			new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
		);
	if (ogMatch) return ogMatch[1];

	const nameMatch =
		html.match(
			new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
		) ||
		html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"));
	if (nameMatch) return nameMatch[1];

	return null;
}

// Extract title from HTML
function extractTitle(html: string): string | null {
	const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	if (!match) return null;

	const title = match[1].trim();

	// Filter out known placeholder/challenge page titles
	const invalidTitles = [
		"just a moment",
		"please wait",
		"checking your browser",
		"attention required",
		"access denied",
		"security check",
		"verifying",
		"loading",
		"redirecting",
		"one moment",
		"hold on",
	];

	const lowerTitle = title.toLowerCase();
	if (invalidTitles.some((invalid) => lowerTitle.includes(invalid))) {
		return null;
	}

	return title;
}

// Extract link href from HTML (for favicon, apple-touch-icon)
function extractLink(html: string, rel: string): string | null {
	const match =
		html.match(
			new RegExp(`<link[^>]+rel=["'][^"']*${rel}[^"']*["'][^>]+href=["']([^"']+)["']`, "i"),
		) ||
		html.match(
			new RegExp(`<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*${rel}[^"']*["']`, "i"),
		);
	return match ? match[1] : null;
}

// Extract brand/theme color from HTML - tries multiple sources
function extractBrandColor(html: string): string | null {
	// 1. theme-color meta tag (most common)
	const themeColor = extractMeta(html, "theme-color");
	if (themeColor && isValidColor(themeColor)) return themeColor;

	// 2. msapplication-TileColor (Windows tiles)
	const tileColor = extractMeta(html, "msapplication-TileColor");
	if (tileColor && isValidColor(tileColor)) return tileColor;

	// 3. msapplication-navbutton-color
	const navColor = extractMeta(html, "msapplication-navbutton-color");
	if (navColor && isValidColor(navColor)) return navColor;

	// 4. apple-mobile-web-app-status-bar-style doesn't give color, skip

	// 5. Look for manifest.json link and try to extract theme_color
	// (would require additional fetch, skip for now)

	// 6. Try to extract from inline CSS - look for common brand color patterns
	// Look for :root or body CSS variables like --primary, --brand, --accent
	const cssVarMatch = html.match(
		/--(?:primary|brand|accent|main)(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i,
	);
	if (cssVarMatch && isValidColor(cssVarMatch[1])) return cssVarMatch[1];

	// 7. Look for background-color on header/nav elements (common pattern)
	const headerBgMatch = html.match(
		/(?:header|nav|\.navbar|\.header)[^}]*background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/i,
	);
	if (headerBgMatch && isValidColor(headerBgMatch[1])) return headerBgMatch[1];

	return null;
}

// Validate color is a proper hex color (not white/black/gray)
function isValidColor(color: string): boolean {
	if (!color) return false;

	// Must be hex format
	const hex = color.replace("#", "").toLowerCase();
	if (!/^[0-9a-f]{3,6}$/.test(hex)) return false;

	// Expand 3-char hex to 6-char
	const fullHex = hex.length === 3 ? hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2] : hex;

	// Skip very light colors (likely backgrounds)
	const r = parseInt(fullHex.slice(0, 2), 16);
	const g = parseInt(fullHex.slice(2, 4), 16);
	const b = parseInt(fullHex.slice(4, 6), 16);

	// Skip if too light (likely white/near-white)
	if (r > 240 && g > 240 && b > 240) return false;

	// Skip if grayscale (r ≈ g ≈ b)
	const isGray = Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10;
	if (isGray) return false;

	return true;
}

// Supported language codes
const SUPPORTED_LANGUAGE_CODES = [
	"en",
	"es",
	"fr",
	"de",
	"it",
	"pt",
	"nl",
	"pl",
	"ru",
	"ja",
	"ko",
	"zh",
	"ar",
	"hi",
	"tr",
	"vi",
	"th",
	"id",
	"ms",
	"sv",
	"da",
	"no",
	"fi",
	"cs",
	"uk",
	"he",
] as const;

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

// Default messages per language
const LANGUAGE_MESSAGES: Record<
	SupportedLanguageCode,
	{
		initialMessage: (siteName: string) => string;
		suggestedMessages: string[];
		messagePlaceholder: string;
	}
> = {
	en: {
		initialMessage: (siteName) => `Hi! I'm the ${siteName} AI Assistant. How can I help you today?`,
		suggestedMessages: [
			"What services do you offer?",
			"Tell me more about your company",
			"How can I contact you?",
		],
		messagePlaceholder: "Type a message...",
	},
	es: {
		initialMessage: (siteName) =>
			`¡Hola! Soy el asistente de IA de ${siteName}. ¿En qué puedo ayudarte hoy?`,
		suggestedMessages: [
			"¿Qué servicios ofrecen?",
			"Cuéntame más sobre tu empresa",
			"¿Cómo puedo contactarlos?",
		],
		messagePlaceholder: "Escribe un mensaje...",
	},
	fr: {
		initialMessage: (siteName) =>
			`Bonjour ! Je suis l'assistant IA de ${siteName}. Comment puis-je vous aider aujourd'hui ?`,
		suggestedMessages: [
			"Quels services proposez-vous ?",
			"Parlez-moi de votre entreprise",
			"Comment puis-je vous contacter ?",
		],
		messagePlaceholder: "Tapez un message...",
	},
	de: {
		initialMessage: (siteName) =>
			`Hallo! Ich bin der KI-Assistent von ${siteName}. Wie kann ich Ihnen heute helfen?`,
		suggestedMessages: [
			"Welche Dienstleistungen bieten Sie an?",
			"Erzählen Sie mir mehr über Ihr Unternehmen",
			"Wie kann ich Sie kontaktieren?",
		],
		messagePlaceholder: "Nachricht eingeben...",
	},
	it: {
		initialMessage: (siteName) =>
			`Ciao! Sono l'assistente AI di ${siteName}. Come posso aiutarti oggi?`,
		suggestedMessages: [
			"Quali servizi offrite?",
			"Raccontami di più sulla vostra azienda",
			"Come posso contattarvi?",
		],
		messagePlaceholder: "Scrivi un messaggio...",
	},
	pt: {
		initialMessage: (siteName) =>
			`Olá! Sou o assistente de IA da ${siteName}. Como posso ajudá-lo hoje?`,
		suggestedMessages: [
			"Quais serviços vocês oferecem?",
			"Conte-me mais sobre sua empresa",
			"Como posso entrar em contato?",
		],
		messagePlaceholder: "Digite uma mensagem...",
	},
	nl: {
		initialMessage: (siteName) =>
			`Hallo! Ik ben de AI-assistent van ${siteName}. Hoe kan ik u vandaag helpen?`,
		suggestedMessages: [
			"Welke diensten bieden jullie aan?",
			"Vertel me meer over jullie bedrijf",
			"Hoe kan ik contact opnemen?",
		],
		messagePlaceholder: "Typ een bericht...",
	},
	pl: {
		initialMessage: (siteName) =>
			`Cześć! Jestem asystentem AI ${siteName}. Jak mogę Ci dzisiaj pomóc?`,
		suggestedMessages: [
			"Jakie usługi oferujecie?",
			"Opowiedz mi więcej o firmie",
			"Jak mogę się z wami skontaktować?",
		],
		messagePlaceholder: "Wpisz wiadomość...",
	},
	ru: {
		initialMessage: (siteName) => `Привет! Я AI-ассистент ${siteName}. Чем могу помочь сегодня?`,
		suggestedMessages: [
			"Какие услуги вы предлагаете?",
			"Расскажите больше о компании",
			"Как с вами связаться?",
		],
		messagePlaceholder: "Введите сообщение...",
	},
	ja: {
		initialMessage: (siteName) =>
			`こんにちは！${siteName}のAIアシスタントです。今日はどのようにお手伝いできますか？`,
		suggestedMessages: [
			"どのようなサービスを提供していますか？",
			"会社について教えてください",
			"連絡方法を教えてください",
		],
		messagePlaceholder: "メッセージを入力...",
	},
	ko: {
		initialMessage: (siteName) =>
			`안녕하세요! ${siteName} AI 어시스턴트입니다. 오늘 어떻게 도와드릴까요?`,
		suggestedMessages: [
			"어떤 서비스를 제공하나요?",
			"회사에 대해 알려주세요",
			"연락 방법이 어떻게 되나요?",
		],
		messagePlaceholder: "메시지를 입력하세요...",
	},
	zh: {
		initialMessage: (siteName) => `你好！我是${siteName}的AI助手。今天有什么可以帮助您的？`,
		suggestedMessages: ["你们提供什么服务？", "介绍一下你们公司", "如何联系你们？"],
		messagePlaceholder: "输入消息...",
	},
	ar: {
		initialMessage: (siteName) => `مرحباً! أنا مساعد ${siteName} الذكي. كيف يمكنني مساعدتك اليوم؟`,
		suggestedMessages: [
			"ما هي الخدمات التي تقدمونها؟",
			"أخبرني المزيد عن شركتكم",
			"كيف يمكنني التواصل معكم؟",
		],
		messagePlaceholder: "اكتب رسالة...",
	},
	hi: {
		initialMessage: (siteName) => `नमस्ते! मैं ${siteName} का AI सहायक हूं। आज मैं आपकी कैसे मदद कर सकता हूं?`,
		suggestedMessages: [
			"आप कौन सी सेवाएं प्रदान करते हैं?",
			"अपनी कंपनी के बारे में बताएं",
			"मैं आपसे कैसे संपर्क कर सकता हूं?",
		],
		messagePlaceholder: "संदेश लिखें...",
	},
	tr: {
		initialMessage: (siteName) =>
			`Merhaba! Ben ${siteName} AI asistanıyım. Bugün size nasıl yardımcı olabilirim?`,
		suggestedMessages: [
			"Hangi hizmetleri sunuyorsunuz?",
			"Şirketiniz hakkında bilgi verin",
			"Sizinle nasıl iletişime geçebilirim?",
		],
		messagePlaceholder: "Bir mesaj yazın...",
	},
	vi: {
		initialMessage: (siteName) =>
			`Xin chào! Tôi là trợ lý AI của ${siteName}. Tôi có thể giúp gì cho bạn hôm nay?`,
		suggestedMessages: [
			"Bạn cung cấp những dịch vụ gì?",
			"Cho tôi biết thêm về công ty của bạn",
			"Làm sao để liên hệ với bạn?",
		],
		messagePlaceholder: "Nhập tin nhắn...",
	},
	th: {
		initialMessage: (siteName) => `สวัสดี! ฉันคือผู้ช่วย AI ของ ${siteName} วันนี้ฉันช่วยอะไรคุณได้บ้าง?`,
		suggestedMessages: ["คุณให้บริการอะไรบ้าง?", "บอกฉันเพิ่มเติมเกี่ยวกับบริษัทของคุณ", "ฉันจะติดต่อคุณได้อย่างไร?"],
		messagePlaceholder: "พิมพ์ข้อความ...",
	},
	id: {
		initialMessage: (siteName) =>
			`Halo! Saya asisten AI ${siteName}. Bagaimana saya bisa membantu Anda hari ini?`,
		suggestedMessages: [
			"Layanan apa saja yang Anda tawarkan?",
			"Ceritakan lebih lanjut tentang perusahaan Anda",
			"Bagaimana cara menghubungi Anda?",
		],
		messagePlaceholder: "Ketik pesan...",
	},
	ms: {
		initialMessage: (siteName) =>
			`Hai! Saya pembantu AI ${siteName}. Bagaimana saya boleh membantu anda hari ini?`,
		suggestedMessages: [
			"Apakah perkhidmatan yang anda tawarkan?",
			"Beritahu saya lebih lanjut tentang syarikat anda",
			"Bagaimana saya boleh menghubungi anda?",
		],
		messagePlaceholder: "Taip mesej...",
	},
	sv: {
		initialMessage: (siteName) =>
			`Hej! Jag är ${siteName}s AI-assistent. Hur kan jag hjälpa dig idag?`,
		suggestedMessages: [
			"Vilka tjänster erbjuder ni?",
			"Berätta mer om ert företag",
			"Hur kan jag kontakta er?",
		],
		messagePlaceholder: "Skriv ett meddelande...",
	},
	da: {
		initialMessage: (siteName) =>
			`Hej! Jeg er ${siteName}s AI-assistent. Hvordan kan jeg hjælpe dig i dag?`,
		suggestedMessages: [
			"Hvilke tjenester tilbyder I?",
			"Fortæl mig mere om jeres virksomhed",
			"Hvordan kan jeg kontakte jer?",
		],
		messagePlaceholder: "Skriv en besked...",
	},
	no: {
		initialMessage: (siteName) =>
			`Hei! Jeg er ${siteName}s AI-assistent. Hvordan kan jeg hjelpe deg i dag?`,
		suggestedMessages: [
			"Hvilke tjenester tilbyr dere?",
			"Fortell meg mer om bedriften deres",
			"Hvordan kan jeg kontakte dere?",
		],
		messagePlaceholder: "Skriv en melding...",
	},
	fi: {
		initialMessage: (siteName) =>
			`Hei! Olen ${siteName}n tekoälyavustaja. Miten voin auttaa sinua tänään?`,
		suggestedMessages: [
			"Mitä palveluja tarjoatte?",
			"Kerro minulle lisää yrityksestänne",
			"Miten voin ottaa teihin yhteyttä?",
		],
		messagePlaceholder: "Kirjoita viesti...",
	},
	cs: {
		initialMessage: (siteName) => `Ahoj! Jsem AI asistent ${siteName}. Jak vám mohu dnes pomoci?`,
		suggestedMessages: [
			"Jaké služby nabízíte?",
			"Řekněte mi více o vaší společnosti",
			"Jak vás mohu kontaktovat?",
		],
		messagePlaceholder: "Napište zprávu...",
	},
	uk: {
		initialMessage: (siteName) => `Привіт! Я AI-асистент ${siteName}. Чим можу допомогти сьогодні?`,
		suggestedMessages: [
			"Які послуги ви пропонуєте?",
			"Розкажіть більше про вашу компанію",
			"Як з вами зв'язатися?",
		],
		messagePlaceholder: "Введіть повідомлення...",
	},
	he: {
		initialMessage: (siteName) =>
			`שלום! אני העוזר הדיגיטלי של ${siteName}. איך אוכל לעזור לך היום?`,
		suggestedMessages: [
			"אילו שירותים אתם מציעים?",
			"ספרו לי עוד על החברה שלכם",
			"איך אפשר ליצור איתכם קשר?",
		],
		messagePlaceholder: "הקלד הודעה...",
	},
};

// Get language messages with fallback to English
function getLanguageMessages(
	languageCode: string,
): (typeof LANGUAGE_MESSAGES)[SupportedLanguageCode] {
	// Normalize language code (e.g., "en-US" -> "en")
	const baseCode = languageCode.split("-")[0].toLowerCase() as SupportedLanguageCode;

	if (SUPPORTED_LANGUAGE_CODES.includes(baseCode)) {
		return LANGUAGE_MESSAGES[baseCode];
	}

	return LANGUAGE_MESSAGES.en;
}

// Extract language info from HTML
interface LanguageInfo {
	primaryLanguage: string;
	alternateLanguages: string[];
}

function extractLanguageInfo(html: string): LanguageInfo {
	const result: LanguageInfo = {
		primaryLanguage: "en",
		alternateLanguages: [],
	};

	// 1. Extract primary language from <html lang="...">
	const htmlLangMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
	if (htmlLangMatch) {
		result.primaryLanguage = htmlLangMatch[1].split("-")[0].toLowerCase();
	}

	// 2. Extract from Content-Language meta tag
	if (result.primaryLanguage === "en") {
		const contentLangMatch = html.match(
			/<meta[^>]+http-equiv=["']content-language["'][^>]+content=["']([^"']+)["']/i,
		);
		if (contentLangMatch) {
			result.primaryLanguage = contentLangMatch[1].split("-")[0].toLowerCase();
		}
	}

	// 3. Extract alternate languages from hreflang tags
	const hreflangRegex = /<link[^>]+hreflang=["']([^"']+)["'][^>]*>/gi;
	const hreflangMatches = html.matchAll(hreflangRegex);

	const altLanguages = new Set<string>();
	for (const match of hreflangMatches) {
		const lang = match[1].split("-")[0].toLowerCase();
		// Skip x-default and the primary language
		if (lang !== "x" && lang !== result.primaryLanguage) {
			altLanguages.add(lang);
		}
	}

	result.alternateLanguages = Array.from(altLanguages).filter((lang) =>
		SUPPORTED_LANGUAGE_CODES.includes(lang as SupportedLanguageCode),
	);

	// Validate primary language is supported
	if (!SUPPORTED_LANGUAGE_CODES.includes(result.primaryLanguage as SupportedLanguageCode)) {
		result.primaryLanguage = "en";
	}

	return result;
}

// Extract domain name from URL
function extractDomainName(url: string): string {
	try {
		const hostname = new URL(url).hostname;
		const domain = hostname.replace(/^www\./, "");
		const name = domain.split(".")[0];
		return name.charAt(0).toUpperCase() + name.slice(1);
	} catch {
		return "My Website";
	}
}

// Resolve relative URL to absolute
function resolveUrl(baseUrl: string, relativeUrl: string): string {
	try {
		return new URL(relativeUrl, baseUrl).href;
	} catch {
		return relativeUrl;
	}
}

// Validate that an image URL is accessible and returns an actual image
async function validateImageUrl(url: string): Promise<boolean> {
	if (!url) return false;

	try {
		const response = await fetch(url, {
			method: "HEAD",
			headers: { "User-Agent": CHROME_USER_AGENT },
		});

		if (!response.ok) return false;

		// Check content-type is an image
		const contentType = response.headers.get("content-type") || "";
		if (contentType.startsWith("image/")) return true;

		// Some servers don't return content-type on HEAD, try GET with range
		if (!contentType) {
			const getResponse = await fetch(url, {
				method: "GET",
				headers: {
					"User-Agent": CHROME_USER_AGENT,
					Range: "bytes=0-0",
				},
			});
			const getContentType = getResponse.headers.get("content-type") || "";
			return getContentType.startsWith("image/");
		}

		return false;
	} catch {
		return false;
	}
}

// Get image dimensions using sharp (fetches only first 16KB for metadata)
async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
	try {
		const response = await fetch(url, {
			headers: {
				"User-Agent": CHROME_USER_AGENT,
				Range: "bytes=0-16384", // First 16KB usually enough for image metadata
			},
		});

		if (!response.ok) return null;

		const arrayBuffer = await response.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Import sharp dynamically
		const sharp = (await import("sharp")).default;
		const metadata = await sharp(buffer).metadata();

		return {
			width: metadata.width || 0,
			height: metadata.height || 0,
		};
	} catch {
		return null;
	}
}

// Score image suitability for widget button icon
// Prefers 100-400px square-ish images, penalizes very large/small or rectangular logos
function scoreImageForIcon(width: number, height: number): number {
	if (width === 0 || height === 0) return 0;

	const avgSize = (width + height) / 2;
	const aspectRatio = Math.max(width, height) / Math.min(width, height);

	let score = 0;

	// Size score: prefer 100-400px average dimension
	if (avgSize >= 100 && avgSize <= 400) {
		score += 100; // Ideal size range
	} else if (avgSize > 400) {
		// Penalize very large images (e.g., og:image often 1200x630)
		score += Math.max(0, 100 - (avgSize - 400) / 10);
	} else {
		// Smaller images get lower score (e.g., 16x16 favicon = 16 points)
		score += avgSize;
	}

	// Aspect ratio score: prefer square (1:1) or nearly square
	// Penalize rectangular images (e.g., 1200x630 has ratio 1.9)
	score -= (aspectRatio - 1) * 50;

	return Math.max(0, score);
}

// Non-HTML file extensions to exclude
const NON_HTML_EXTENSIONS = [
	// Images
	"jpg",
	"jpeg",
	"png",
	"gif",
	"svg",
	"webp",
	"ico",
	"bmp",
	"tiff",
	"avif",
	// Styles & Scripts
	"css",
	"js",
	"mjs",
	"ts",
	"jsx",
	"tsx",
	"map",
	"scss",
	"sass",
	"less",
	// Documents
	"pdf",
	"doc",
	"docx",
	"xls",
	"xlsx",
	"ppt",
	"pptx",
	"odt",
	"ods",
	"odp",
	// Archives
	"zip",
	"rar",
	"7z",
	"tar",
	"gz",
	"bz2",
	// Media
	"mp3",
	"mp4",
	"avi",
	"mov",
	"wmv",
	"flv",
	"webm",
	"mkv",
	"wav",
	"ogg",
	"m4a",
	"m4v",
	// Fonts
	"woff",
	"woff2",
	"ttf",
	"otf",
	"eot",
	// Data
	"json",
	"xml",
	"csv",
	"txt",
	"yaml",
	"yml",
	// Other
	"exe",
	"dmg",
	"pkg",
	"deb",
	"rpm",
	"apk",
	"ipa",
];

// Extract links from HTML
function extractLinks(html: string, baseUrl: string): string[] {
	const base = new URL(baseUrl);
	const links: string[] = [];
	const hrefRegex = /href=["']([^"']+)["']/g;
	const extensionPattern = new RegExp(`\\.(${NON_HTML_EXTENSIONS.join("|")})$`, "i");

	for (const match of html.matchAll(hrefRegex)) {
		try {
			const href = match[1];

			// Skip anchors, javascript, mailto, tel links
			if (
				href.startsWith("#") ||
				href.startsWith("javascript:") ||
				href.startsWith("mailto:") ||
				href.startsWith("tel:")
			) {
				continue;
			}

			const linkUrl = new URL(href, base.origin);

			// Only same domain
			if (linkUrl.hostname !== base.hostname) {
				continue;
			}

			// Skip URLs with hash fragments
			if (linkUrl.hash) {
				linkUrl.hash = "";
			}

			// Skip non-HTML file extensions
			if (extensionPattern.test(linkUrl.pathname)) {
				continue;
			}

			// Skip common non-page paths
			const pathname = linkUrl.pathname.toLowerCase();
			if (
				pathname.includes("/assets/") ||
				pathname.includes("/static/") ||
				pathname.includes("/images/") ||
				pathname.includes("/img/") ||
				pathname.includes("/css/") ||
				pathname.includes("/js/") ||
				pathname.includes("/fonts/") ||
				pathname.includes("/media/") ||
				pathname.includes("/downloads/") ||
				pathname.includes("/_next/") ||
				pathname.includes("/wp-content/uploads/")
			) {
				continue;
			}

			links.push(linkUrl.href);
		} catch {
			// Ignore invalid URLs
		}
	}

	return [...new Set(links)];
}

// Common important paths to probe during onboarding
const IMPORTANT_PATHS = [
	"/pricing",
	"/faq",
	"/about",
	"/about-us",
	"/contact",
	"/contact-us",
	"/support",
	"/help",
	"/features",
	"/products",
	"/services",
	"/terms",
	"/privacy",
	"/blog",
];

// E-commerce specific paths
const ECOMMERCE_PATHS = ["/cart", "/checkout", "/basket", "/shop", "/store", "/collections"];

// Probe paths in parallel with concurrency limit
async function probeImportantPaths(
	baseUrl: string,
	paths: string[],
	maxConcurrent = 5,
	timeoutMs = 2000,
): Promise<{ path: string; exists: boolean; url: string }[]> {
	const base = new URL(baseUrl);
	const results: { path: string; exists: boolean; url: string }[] = [];

	// Process in batches of maxConcurrent
	for (let i = 0; i < paths.length; i += maxConcurrent) {
		const batch = paths.slice(i, i + maxConcurrent);
		const batchPromises = batch.map(async (path) => {
			const url = new URL(path, base.origin).href;
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), timeoutMs);

				const response = await fetch(url, {
					method: "HEAD",
					headers: { "User-Agent": CHROME_USER_AGENT },
					signal: controller.signal,
					redirect: "follow",
				});

				clearTimeout(timeout);
				return { path, exists: response.ok, url };
			} catch {
				return { path, exists: false, url };
			}
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(...batchResults);
	}

	return results;
}

// Detect e-commerce platform from HTML using strict patterns to avoid false positives
function detectEcommercePlatform(
	html: string,
	url: string,
): {
	platform: "shopify" | "woocommerce" | "magento" | "bigcommerce" | "generic" | null;
	isEcommerce: boolean;
} {
	const lowerUrl = url.toLowerCase();

	// Shopify detection - strict patterns that are unique to Shopify
	const shopifyPatterns = [
		/cdn\.shopify\.com\/s\/files/i, // Shopify CDN asset paths
		/Shopify\.shop\s*=/i, // Shopify JS namespace
		/\.myshopify\.com/i, // Shopify subdomain
		/name=["']shopify-checkout/i, // Shopify checkout meta tag
		/<meta[^>]+name=["']generator["'][^>]+content=["']Shopify/i, // Generator meta tag
		/data-shopify/i, // Shopify data attributes
		/ShopifyAnalytics/i, // Shopify analytics
		/shopify-section/i, // Shopify section classes
	];

	if (
		shopifyPatterns.some((pattern) => pattern.test(html)) ||
		lowerUrl.includes(".myshopify.com")
	) {
		return { platform: "shopify", isEcommerce: true };
	}

	// WooCommerce detection - strict patterns unique to WooCommerce/WordPress
	const wooPatterns = [
		/wp-content\/plugins\/woocommerce\//i, // WooCommerce plugin path
		/wc_add_to_cart_params/i, // WooCommerce JS global
		/woocommerce_params/i, // WooCommerce JS params
		/\/wp-json\/wc\//i, // WooCommerce REST API
		/<body[^>]+class=["'][^"']*woocommerce/i, // WooCommerce body class
		/class=["'][^"']*woocommerce-/i, // WooCommerce CSS classes
		/data-product_id/i, // WooCommerce product data attribute
	];

	if (wooPatterns.some((pattern) => pattern.test(html))) {
		return { platform: "woocommerce", isEcommerce: true };
	}

	// Magento detection - strict patterns unique to Magento
	const magentoPatterns = [
		/data-mage-init/i, // Magento JS initialization
		/Mage\.Cookies/i, // Magento cookie handling
		/mage\/cookies/i, // Magento RequireJS module
		/\/static\/version\d+\/frontend\//i, // Magento static asset versioning
		/require\s*\(\s*\[['"]mage\//i, // Magento RequireJS require
		/Magento_[A-Z]/i, // Magento module naming convention
		/\/pub\/static\/frontend\//i, // Magento public static path
	];

	if (magentoPatterns.some((pattern) => pattern.test(html))) {
		return { platform: "magento", isEcommerce: true };
	}

	// BigCommerce detection - strict patterns unique to BigCommerce
	const bigCommercePatterns = [
		/cdn\d*\.bigcommerce\.com/i, // BigCommerce CDN
		/\.mybigcommerce\.com/i, // BigCommerce subdomain
		/BCData\s*=/i, // BigCommerce JS global
		/\/api\/storefront\//i, // BigCommerce Storefront API
		/data-cart-item-add/i, // BigCommerce cart attribute
		/stencil-/i, // BigCommerce Stencil theme
	];

	if (
		bigCommercePatterns.some((pattern) => pattern.test(html)) ||
		lowerUrl.includes(".mybigcommerce.com")
	) {
		return { platform: "bigcommerce", isEcommerce: true };
	}

	// Generic e-commerce detection is now path-based (checked via pageCategories)
	// We don't use broad string matching anymore to avoid false positives
	return { platform: null, isEcommerce: false };
}

// Categorize discovered paths for trigger creation
interface PageCategories {
	hasPricing: boolean;
	hasContact: boolean;
	hasFaq: boolean;
	hasSupport: boolean;
	hasCart: boolean;
	hasCheckout: boolean;
	pricingUrl?: string;
	contactUrl?: string;
	faqUrl?: string;
	supportUrl?: string;
	cartUrl?: string;
	checkoutUrl?: string;
}

function categorizeDiscoveredPaths(
	probeResults: { path: string; exists: boolean; url: string }[],
): PageCategories {
	const existing = probeResults.filter((r) => r.exists);

	const findPath = (patterns: string[]): string | undefined => {
		const found = existing.find((r) => patterns.some((p) => r.path.toLowerCase().includes(p)));
		return found?.url;
	};

	return {
		hasPricing: !!findPath(["/pricing"]),
		hasContact: !!findPath(["/contact"]),
		hasFaq: !!findPath(["/faq"]),
		hasSupport: !!findPath(["/support", "/help"]),
		hasCart: !!findPath(["/cart", "/basket"]),
		hasCheckout: !!findPath(["/checkout"]),
		pricingUrl: findPath(["/pricing"]),
		contactUrl: findPath(["/contact"]),
		faqUrl: findPath(["/faq"]),
		supportUrl: findPath(["/support", "/help"]),
		cartUrl: findPath(["/cart", "/basket"]),
		checkoutUrl: findPath(["/checkout"]),
	};
}

const setupSchema = z.object({
	websiteUrl: z.string().url("Please enter a valid URL"),
});

// POST /onboarding/setup - Create agent from website with streaming progress
onboardingRoute.post("/setup", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = setupSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { websiteUrl } = parsed.data;
	const db = getDb();

	// Check agent limit
	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const agentLimit = getAgentLimit(planId);

	const existingAgents = await db.select().from(agents).where(eq(agents.userId, userId));

	if (agentLimit !== -1 && existingAgents.length >= agentLimit) {
		return c.json(
			{
				error: `You've reached your limit of ${agentLimit} agent${agentLimit === 1 ? "" : "s"}.`,
				code: "AGENT_LIMIT_REACHED",
			},
			403,
		);
	}

	// Check storage limit
	const usageData = await usageProvider.getUsage(userId);
	const storageLimit = getStorageLimit(usageData.planId);
	if (storageLimit !== -1 && usageData.storageUsed >= storageLimit) {
		return c.json(
			{
				error: "Storage limit reached. Please upgrade your plan or delete existing content.",
				code: "STORAGE_LIMIT_REACHED",
			},
			403,
		);
	}

	// Stream progress events
	return streamSSE(c, async (stream) => {
		const sendEvent = async (type: string, data: Record<string, unknown>) => {
			await stream.writeSSE({ data: JSON.stringify({ type, ...data }) });
		};

		try {
			// Step 1: Connecting to website
			await sendEvent("step", { step: "connecting", message: "Connecting to website..." });
			await new Promise((r) => setTimeout(r, 500));

			const { html } = await fetchWithRetry(websiteUrl);
			await sendEvent("step", { step: "connecting", message: "Connected!", done: true });
			await new Promise((r) => setTimeout(r, 300));

			// Step 2: Extracting website info
			await sendEvent("step", { step: "extracting", message: "Extracting website information..." });
			await new Promise((r) => setTimeout(r, 400));

			const siteName =
				extractMeta(html, "og:site_name") ||
				extractTitle(html)
					?.split(/[|\-–—]/)[0]
					.trim() ||
				extractDomainName(websiteUrl);

			await sendEvent("info", { label: "Site name", value: siteName });
			await new Promise((r) => setTimeout(r, 300));

			// Try to find a valid profile picture and button icon from multiple sources
			let profilePicture: string | null = null;
			let buttonIcon: string | null = null;

			const imageCandidates = [
				extractMeta(html, "og:image"),
				extractLink(html, "apple-touch-icon"),
				extractLink(html, "apple-touch-icon-precomposed"),
				extractLink(html, "icon"),
				extractLink(html, "shortcut icon"),
				// Common favicon paths as fallback
				resolveUrl(websiteUrl, "/apple-touch-icon.png"),
				resolveUrl(websiteUrl, "/favicon-32x32.png"),
				resolveUrl(websiteUrl, "/favicon.ico"),
			].filter(Boolean) as string[];

			// Send progress event
			await sendEvent("step", { step: "analyzing_logos", message: "Analyzing logos..." });
			await new Promise((r) => setTimeout(r, 200));

			// Process all candidates in parallel for efficiency
			const candidateResults = await Promise.allSettled(
				imageCandidates.map(async (candidate) => {
					let imageUrl = candidate;
					if (!imageUrl.startsWith("http")) {
						imageUrl = resolveUrl(websiteUrl, imageUrl);
					}

					// Validate the image is accessible
					const isValid = await validateImageUrl(imageUrl);
					if (!isValid) return null;

					// Get dimensions and score for button icon suitability
					const dimensions = await getImageDimensions(imageUrl);
					const score = dimensions ? scoreImageForIcon(dimensions.width, dimensions.height) : 0;

					return {
						url: imageUrl,
						originalCandidate: candidate,
						dimensions,
						score,
						isFavicon: imageUrl.includes("favicon.ico"),
					};
				}),
			);

			// Filter successful results and sort by score for button icon
			const validImages = candidateResults
				.filter(
					(
						result,
					): result is PromiseFulfilledResult<{
						url: string;
						originalCandidate: string;
						dimensions: { width: number; height: number } | null;
						score: number;
						isFavicon: boolean;
					}> => result.status === "fulfilled" && result.value !== null,
				)
				.map((result) => result.value)
				.sort((a, b) => b.score - a.score);

			// Select profile picture (original logic: prefer og:image or first valid non-favicon)
			for (const img of validImages) {
				if (img.originalCandidate === imageCandidates[0]) {
					// og:image found, use it
					profilePicture = img.url;
					break;
				}
				if (!img.isFavicon) {
					profilePicture = img.url;
					break;
				}
			}

			// Fallback to any valid image if no og:image or apple-touch-icon found
			if (!profilePicture && validImages.length > 0) {
				profilePicture = validImages[0].url;
			}

			// Select button icon (highest score, which prefers 100-400px square logos)
			if (validImages.length > 0) {
				buttonIcon = validImages[0].url;
			}

			if (profilePicture) {
				await sendEvent("info", { label: "Logo found", value: profilePicture });
				await new Promise((r) => setTimeout(r, 300));
			}

			if (buttonIcon && buttonIcon !== profilePicture) {
				await sendEvent("info", { label: "Button icon", value: buttonIcon });
				await new Promise((r) => setTimeout(r, 300));
			}

			const themeColor = extractBrandColor(html);
			if (themeColor) {
				await sendEvent("info", { label: "Brand color", value: themeColor });
				await new Promise((r) => setTimeout(r, 300));
			}

			// Detect website language(s)
			const languageInfo = extractLanguageInfo(html);
			const languageMessages = getLanguageMessages(languageInfo.primaryLanguage);

			await sendEvent("info", {
				label: "Language detected",
				value: languageInfo.primaryLanguage.toUpperCase(),
			});
			await new Promise((r) => setTimeout(r, 300));

			if (languageInfo.alternateLanguages.length > 0) {
				await sendEvent("info", {
					label: "Additional languages",
					value: languageInfo.alternateLanguages.map((l) => l.toUpperCase()).join(", "),
				});
				await new Promise((r) => setTimeout(r, 300));
			}

			// Detect e-commerce platform
			const platformInfo = detectEcommercePlatform(html, websiteUrl);
			if (platformInfo.isEcommerce) {
				const platformNames: Record<string, string> = {
					shopify: "Shopify",
					woocommerce: "WooCommerce",
					magento: "Magento",
					bigcommerce: "BigCommerce",
					generic: "E-commerce",
				};
				await sendEvent("platform", {
					platform: platformInfo.platform,
					name: platformNames[platformInfo.platform || "generic"],
				});
				await sendEvent("info", {
					label: "Platform detected",
					value: platformNames[platformInfo.platform || "generic"],
				});
				await new Promise((r) => setTimeout(r, 300));
			}

			await sendEvent("step", {
				step: "extracting",
				message: "Website info extracted!",
				done: true,
			});
			await new Promise((r) => setTimeout(r, 300));

			// Step 3: Finding pages to crawl (includes path probing)
			await sendEvent("step", { step: "finding", message: "Discovering important pages..." });
			await new Promise((r) => setTimeout(r, 400));

			// Always probe both standard and e-commerce paths to detect generic e-commerce via cart/checkout
			const pathsToProbe = [...IMPORTANT_PATHS, ...ECOMMERCE_PATHS];

			const probeResults = await probeImportantPaths(websiteUrl, pathsToProbe);
			const discoveredPaths = probeResults.filter((r) => r.exists);
			const pageCategories = categorizeDiscoveredPaths(probeResults);

			// Determine if site is e-commerce (either by platform detection or path detection)
			const isEcommerce =
				platformInfo.isEcommerce || pageCategories.hasCart || pageCategories.hasCheckout;

			// Send discovered paths event
			if (discoveredPaths.length > 0) {
				await sendEvent("discovered_paths", {
					paths: discoveredPaths.map((p) => ({
						path: p.path,
						url: p.url,
					})),
					categories: pageCategories,
				});

				// Show discovered important pages
				for (const p of discoveredPaths.slice(0, 5)) {
					await sendEvent("info", {
						label: `Found ${p.path}`,
						value: "✓",
					});
					await new Promise((r) => setTimeout(r, 150));
				}
			}

			// Extract links from homepage
			const links = extractLinks(html, websiteUrl);

			// Build prioritized page list:
			// 1. Homepage
			// 2. FAQ/Help/Support pages (best for Q&A content)
			// 3. Other discovered important paths
			// 4. Links from homepage
			const prioritizedUrls: string[] = [websiteUrl];

			// Add FAQ/support pages first (best knowledge base content)
			const faqSupportPaths = discoveredPaths.filter((p) =>
				["/faq", "/help", "/support"].some((s) => p.path.toLowerCase().includes(s)),
			);
			for (const p of faqSupportPaths) {
				if (!prioritizedUrls.includes(p.url)) {
					prioritizedUrls.push(p.url);
				}
			}

			// Add other discovered paths
			for (const p of discoveredPaths) {
				if (!prioritizedUrls.includes(p.url)) {
					prioritizedUrls.push(p.url);
				}
			}

			// Add homepage links
			for (const link of links) {
				if (!prioritizedUrls.includes(link)) {
					prioritizedUrls.push(link);
				}
			}

			const pageUrls = prioritizedUrls.slice(0, 20); // Limit to 20 for onboarding

			// Show URLs being found one by one
			for (let i = 0; i < Math.min(pageUrls.length, 8); i++) {
				await sendEvent("url", { url: pageUrls[i], index: i + 1, total: pageUrls.length });
				await new Promise((r) => setTimeout(r, 150));
			}

			if (pageUrls.length > 8) {
				await sendEvent("url", {
					url: `...and ${pageUrls.length - 8} more pages`,
					index: pageUrls.length,
					total: pageUrls.length,
				});
			}

			await new Promise((r) => setTimeout(r, 300));
			await sendEvent("step", {
				step: "finding",
				message: `Found ${pageUrls.length} pages!`,
				done: true,
			});
			await new Promise((r) => setTimeout(r, 300));

			// Step 4: Creating AI assistant
			await sendEvent("step", { step: "creating", message: "Creating your AI assistant..." });
			await new Promise((r) => setTimeout(r, 500));

			const agentName = `${siteName} AI Assistant`;

			// Generate unique slug
			let slug = generateSlug(agentName);
			let slugSuffix = 0;
			let slugExists = true;

			while (slugExists) {
				const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
				const [existing] = await db
					.select({ id: agents.id })
					.from(agents)
					.where(eq(agents.slug, checkSlug));
				if (!existing) {
					slug = checkSlug;
					slugExists = false;
				} else {
					slugSuffix++;
				}
			}

			// Create the agent
			const [agent] = await db
				.insert(agents)
				.values({
					userId,
					name: agentName,
					slug,
					aiQuality: "balanced",
					temperature: 50,
					systemPrompt: `You are a helpful AI assistant for ${siteName}. Answer questions based on the website content and help visitors find the information they need.`,
					isDefault: existingAgents.length === 0,
				})
				.returning();

			// Link agent to current Shopify shop if in Shopify context
			const onboardingShopDomain = (c.get as (key: string) => unknown)("shopDomain") as
				| string
				| null;
			if (onboardingShopDomain) {
				try {
					const [shop] = await db
						.select({ id: shopifyShops.id })
						.from(shopifyShops)
						.where(
							and(
								eq(shopifyShops.shopDomain, onboardingShopDomain),
								eq(shopifyShops.status, "active"),
							),
						)
						.limit(1);

					if (shop) {
						await db.insert(shopifyShopAgents).values({
							shopId: shop.id,
							agentId: agent.id,
							isPrimary: true,
						});
						console.log(`[onboarding] Linked agent ${agent.id} to shop ${onboardingShopDomain}`);
					}
				} catch (err) {
					console.error("[onboarding] Failed to link agent to shop:", err);
				}
			}

			// Create interface settings with profile picture and language-specific messages
			const [createdSettings] = await db
				.insert(interfaceSettings)
				.values({
					agentId: agent.id,
					displayName: agentName,
					profilePicture: profilePicture,
					primaryColor: themeColor || "#3b82f6",
					chatBubbleColor: themeColor || "#3b82f6",
					widgetButtonColor: themeColor || "#3b82f6",
					widgetButtonIcon: buttonIcon,
					widgetButtonIconType: buttonIcon ? "url" : null,
					defaultLanguage: languageInfo.primaryLanguage,
					initialMessage: languageMessages.initialMessage(siteName),
					suggestedMessages: languageMessages.suggestedMessages,
					messagePlaceholder: languageMessages.messagePlaceholder,
				})
				.returning();

			// Send customization info
			if (themeColor) {
				await sendEvent("info", { label: "Widget styled", value: themeColor });
				await new Promise((r) => setTimeout(r, 200));
			}

			if (buttonIcon) {
				await sendEvent("info", { label: "Button customized", value: "✓" });
				await new Promise((r) => setTimeout(r, 200));
			}

			// Create translations for alternate languages detected on the site
			if (languageInfo.alternateLanguages.length > 0) {
				const translationValues = languageInfo.alternateLanguages.map((langCode) => {
					const langMessages = getLanguageMessages(langCode);
					return {
						interfaceSettingsId: createdSettings.id,
						languageCode: langCode,
						displayName: agentName, // Keep display name same across languages
						initialMessage: langMessages.initialMessage(siteName),
						suggestedMessages: langMessages.suggestedMessages,
						messagePlaceholder: langMessages.messagePlaceholder,
					};
				});

				await db.insert(interfaceSettingsTranslations).values(translationValues);
			}

			await sendEvent("info", { label: "Assistant name", value: agentName });
			await new Promise((r) => setTimeout(r, 300));

			// Create built-in satisfaction survey tool (system tool)
			await db.insert(agentTools).values({
				agentId: agent.id,
				name: "satisfaction_survey",
				description: "Customer satisfaction survey shown after conversation resolution",
				inputSchema: {
					type: "object",
					properties: {},
					required: [],
				},
				executionType: "form",
				formSchema: {
					fields: [
						{
							name: "rating",
							label: "How satisfied are you with the resolution?",
							type: "select",
							options: [
								{ label: "⭐⭐⭐⭐⭐ Very Satisfied", value: "5" },
								{ label: "⭐⭐⭐⭐ Satisfied", value: "4" },
								{ label: "⭐⭐⭐ Neutral", value: "3" },
								{ label: "⭐⭐ Dissatisfied", value: "2" },
								{ label: "⭐ Very Dissatisfied", value: "1" },
							],
							validation: {
								required: { value: true, message: "Please select a rating" },
							},
						},
						{
							name: "feedback",
							label: "Any additional feedback? (optional)",
							type: "textarea",
						},
					],
					introText: "Thank you for contacting us! We'd love to hear about your experience.",
					submitLabel: "Submit Feedback",
					successMessage: "Thank you for your feedback!",
				},
				isEnabled: true,
				allowAiSuggest: false,
				countsAsConversion: false,
				countsAsResolution: false,
				category: "feedback_survey",
				system: true,
			});

			await sendEvent("step", { step: "creating", message: "AI assistant created!", done: true });
			await new Promise((r) => setTimeout(r, 300));

			// Step 5: Auto-create triggers and forms based on discovered pages
			await sendEvent("step", { step: "setting_up", message: "Setting up engagement triggers..." });
			await new Promise((r) => setTimeout(r, 300));

			const createdTriggers: string[] = [];
			let contactFormToolId: string | null = null;

			// Create contact form tool if /contact page was found
			if (pageCategories.hasContact) {
				const [formTool] = await db
					.insert(agentTools)
					.values({
						agentId: agent.id,
						name: "contact_form",
						description: "Collect contact information from visitors",
						inputSchema: {
							type: "object",
							properties: {
								name: { type: "string", description: "Full name" },
								email: { type: "string", description: "Email address" },
								message: { type: "string", description: "Message" },
							},
							required: ["name", "email"],
						},
						executionType: "form",
						formSchema: {
							fields: [
								{
									name: "name",
									label: "Full Name",
									type: "text",
									placeholder: "Your name",
									validation: { required: { value: true, message: "Name is required" } },
								},
								{
									name: "email",
									label: "Email Address",
									type: "email",
									placeholder: "you@example.com",
									validation: { required: { value: true, message: "Email is required" } },
								},
								{
									name: "message",
									label: "Message",
									type: "textarea",
									placeholder: "How can we help?",
								},
							],
							submitLabel: "Send Message",
							successMessage: "Thanks! We'll get back to you soon.",
						},
						isEnabled: true,
					})
					.returning();

				contactFormToolId = formTool.id;
				createdTriggers.push("Contact form");

				// Create human handoff form for users without escalation access
				// This provides an alternative way for users to contact support
				if (!hasEscalation(planId)) {
					// Get user email for notification
					const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
					const userEmail = user?.email;

					if (userEmail) {
						await db.insert(agentTools).values({
							agentId: agent.id,
							name: "human_handoff_form",
							description:
								"Use when user wants to speak to a human, talk to someone, needs human assistance, or requests to contact support. Show this form to collect their information so the team can follow up.",
							inputSchema: {
								type: "object",
								properties: {
									name: { type: "string", description: "Full name" },
									email: { type: "string", description: "Email address" },
									message: { type: "string", description: "Message or request" },
								},
								required: ["name", "email", "message"],
							},
							executionType: "form",
							formSchema: {
								fields: [
									{
										name: "name",
										label: "Your Name",
										type: "text",
										placeholder: "Your name",
										validation: { required: { value: true, message: "Name is required" } },
									},
									{
										name: "email",
										label: "Email Address",
										type: "email",
										placeholder: "you@example.com",
										validation: { required: { value: true, message: "Email is required" } },
									},
									{
										name: "message",
										label: "How can we help?",
										type: "textarea",
										placeholder: "Please describe your question or issue...",
										validation: { required: { value: true, message: "Message is required" } },
									},
								],
								submitLabel: "Send Request",
								successMessage: "Thank you! Our team will get back to you soon.",
							},
							isEnabled: true,
							system: true,
						} as any);
						createdTriggers.push("Human handoff form");
					}
				}
			}

			// Create pricing page exit intent trigger
			if (pageCategories.hasPricing) {
				await db.insert(triggers).values({
					agentId: agent.id,
					name: "Pricing Page Exit Intent",
					description: "Engage visitors about to leave the pricing page",
					triggerType: "exit_intent",
					conditions: { page: "*pricing*" },
					actionType: "open_chat",
					actionConfig: { message: "Have questions about pricing? I'm here to help!" },
					triggerOnce: true,
					isEnabled: true,
					priority: 10,
				});
				createdTriggers.push("Pricing exit intent");
			}

			// Create contact page engagement trigger
			if (pageCategories.hasContact && contactFormToolId) {
				await db.insert(triggers).values({
					agentId: agent.id,
					name: "Contact Page Form",
					description: "Show contact form after time on contact page",
					triggerType: "time_on_page",
					conditions: { page: "*contact*", timeOnPage: 15 },
					actionType: "show_form",
					actionConfig: { toolId: contactFormToolId },
					triggerOnce: true,
					isEnabled: true,
					priority: 5,
				});
				createdTriggers.push("Contact page form");
			}

			// Create cart abandonment trigger for e-commerce (detected by platform or cart/checkout paths)
			if (isEcommerce && (pageCategories.hasCart || pageCategories.hasCheckout)) {
				await db.insert(triggers).values({
					agentId: agent.id,
					name: "Cart Abandonment",
					description: "Engage visitors about to leave checkout",
					triggerType: "exit_intent",
					conditions: { page: "*cart*|*checkout*|*basket*" },
					actionType: "open_chat",
					actionConfig: { message: "Need help completing your order? I can assist!" },
					triggerOnce: true,
					isEnabled: true,
					priority: 20,
				});
				createdTriggers.push("Cart abandonment");
			}

			// Create default welcome trigger (time on page)
			await db.insert(triggers).values({
				agentId: agent.id,
				name: "Welcome Message",
				description: "Welcome visitors after they've been on the site",
				triggerType: "time_on_page",
				conditions: { timeOnPage: 30 },
				actionType: "show_bubble",
				actionConfig: {
					message: `👋 Hi! Need any help? I'm here to answer your questions.`,
					duration: 5000,
				},
				triggerOnce: true,
				isEnabled: true,
				priority: 0,
			});
			createdTriggers.push("Welcome message");

			// Determine platform action for frontend
			const platformAction =
				platformInfo.platform === "shopify"
					? {
							action: "oauth" as const,
							provider: "shopify" as const,
							installUrl: "/integrations/shopify",
						}
					: platformInfo.platform &&
							["woocommerce", "magento", "bigcommerce"].includes(platformInfo.platform)
						? { action: "setup_wizard" as const, platform: platformInfo.platform }
						: { action: "none" as const };

			// Send auto-setup completion event
			await sendEvent("auto_setup", {
				triggers: createdTriggers,
				hasContactForm: !!contactFormToolId,
				isEcommerce,
				platformAction,
			});

			await sendEvent("step", {
				step: "setting_up",
				message: `Created ${createdTriggers.length} engagement triggers!`,
				done: true,
			});
			await new Promise((r) => setTimeout(r, 300));

			// Step 6: Indexing content (start in background, but show progress)
			await sendEvent("step", { step: "indexing", message: "Starting to index content..." });

			// Import web sources
			const { webSources, webSourcePages, webSourcePageChunks } = await import("@ansa/db");

			const [source] = await db
				.insert(webSources)
				.values({
					agentId: agent.id,
					url: websiteUrl,
					sourceType: "crawl",
					name: new URL(websiteUrl).hostname,
					maxPages: 100,
					status: "pending",
				})
				.returning();

			// Create page entries
			for (const url of pageUrls) {
				await db.insert(webSourcePages).values({
					webSourceId: source.id,
					url,
					status: "pending",
				});
			}

			// Index first few pages synchronously for immediate usability
			const pagesToIndex = pageUrls.slice(0, 3);
			let indexed = 0;

			for (const pageUrl of pagesToIndex) {
				try {
					await sendEvent("indexing", {
						url: pageUrl,
						current: indexed + 1,
						total: pagesToIndex.length,
					});

					const pageResponse = await fetch(`https://r.jina.ai/${encodeURIComponent(pageUrl)}`, {
						headers: {
							Accept: "text/plain",
							"User-Agent": CHROME_USER_AGENT,
						},
					});

					if (pageResponse.ok) {
						const content = await pageResponse.text();
						const contentSize = Buffer.byteLength(content, "utf-8");

						// Find the page record
						const [pageRecord] = await db
							.select()
							.from(webSourcePages)
							.where(eq(webSourcePages.url, pageUrl))
							.limit(1);

						if (pageRecord) {
							await db
								.update(webSourcePages)
								.set({
									title: pageUrl,
									content,
									contentSize,
									status: "crawled",
									lastCrawledAt: new Date(),
								})
								.where(eq(webSourcePages.id, pageRecord.id));

							// Create embeddings
							const chunks = chunkText(content);
							for (let i = 0; i < chunks.length; i++) {
								const embedding = await createEmbedding(chunks[i]);
								await db.insert(webSourcePageChunks).values({
									webSourcePageId: pageRecord.id,
									content: chunks[i],
									chunkIndex: i,
									embedding,
								});
							}
						}
					}
					indexed++;
				} catch (error) {
					console.error(`[onboarding] Failed to index ${pageUrl}:`, error);
				}
			}

			await sendEvent("step", {
				step: "indexing",
				message: `Indexed ${indexed} pages! Rest will continue in background.`,
				done: true,
			});
			await new Promise((r) => setTimeout(r, 300));

			// Start background crawl for remaining pages
			(async () => {
				try {
					await db
						.update(webSources)
						.set({ status: "crawling" })
						.where(eq(webSources.id, source.id));

					const remainingPages = await db
						.select()
						.from(webSourcePages)
						.where(eq(webSourcePages.status, "pending"));

					for (const page of remainingPages) {
						try {
							const pageResponse = await fetch(
								`https://r.jina.ai/${encodeURIComponent(page.url)}`,
								{
									headers: {
										Accept: "text/plain",
										"User-Agent": CHROME_USER_AGENT,
									},
								},
							);

							if (!pageResponse.ok) continue;

							const content = await pageResponse.text();
							const contentSize = Buffer.byteLength(content, "utf-8");

							await db
								.update(webSourcePages)
								.set({
									title: page.url,
									content,
									contentSize,
									status: "crawled",
									lastCrawledAt: new Date(),
								})
								.where(eq(webSourcePages.id, page.id));

							const chunks = chunkText(content);
							for (let i = 0; i < chunks.length; i++) {
								const embedding = await createEmbedding(chunks[i]);
								await db.insert(webSourcePageChunks).values({
									webSourcePageId: page.id,
									content: chunks[i],
									chunkIndex: i,
									embedding,
								});
							}
						} catch (error) {
							await db
								.update(webSourcePages)
								.set({
									status: "failed",
									errorMessage: error instanceof Error ? error.message : "Unknown error",
								})
								.where(eq(webSourcePages.id, page.id));
						}
					}

					await db
						.update(webSources)
						.set({ status: "completed", lastCrawledAt: new Date() })
						.where(eq(webSources.id, source.id));
				} catch (error) {
					await db
						.update(webSources)
						.set({
							status: "failed",
							errorMessage: error instanceof Error ? error.message : "Unknown error",
						})
						.where(eq(webSources.id, source.id));
				}
			})();

			// Seed demo conversations for new users
			try {
				const countryCode = c.req.header("cf-ipcountry") || null;
				await seedDemoConversations(agent.id, countryCode);
				console.log("[onboarding] Demo conversations seeded successfully");
			} catch (error) {
				// Don't fail onboarding if demo conversations fail
				console.error("[onboarding] Failed to seed demo conversations:", error);
			}

			// Final: Complete
			await sendEvent("complete", {
				agentId: agent.id,
				agentName,
				profilePicture,
				platformAction,
			});
		} catch (error) {
			console.error("[onboarding] Setup failed:", error);
			await sendEvent("error", {
				message: error instanceof Error ? error.message : "Failed to set up AI assistant",
			});
		}
	});
});

// Schema for platform configuration
const configurePlatformSchema = z.object({
	platform: z.enum(["woocommerce", "magento", "bigcommerce"]),
	agentId: z.string().uuid(),
	credentials: z.object({
		storeUrl: z.string().url("Please enter a valid store URL"),
		apiKey: z.string().min(1, "API key is required"),
		apiSecret: z.string().optional(), // Required for WooCommerce, optional for others
	}),
});

// Platform-specific API configurations
const platformApiConfigs = {
	woocommerce: {
		testEndpoint: (storeUrl: string) => `${storeUrl}/wp-json/wc/v3/orders?per_page=1`,
		authType: "basic" as const, // Uses consumer key:secret as basic auth
		orderLookupConfig: (storeUrl: string) => ({
			httpUrl: `${storeUrl}/wp-json/wc/v3/orders`,
			httpMethod: "GET" as const,
			queryParam: "search", // WooCommerce uses search param for order number
		}),
	},
	magento: {
		testEndpoint: (storeUrl: string) => `${storeUrl}/rest/V1/orders?searchCriteria[pageSize]=1`,
		authType: "bearer" as const, // Uses Integration Access Token
		orderLookupConfig: (storeUrl: string) => ({
			httpUrl: `${storeUrl}/rest/V1/orders`,
			httpMethod: "GET" as const,
			queryParam:
				"searchCriteria[filter_groups][0][filters][0][field]=increment_id&searchCriteria[filter_groups][0][filters][0][value]",
		}),
	},
	bigcommerce: {
		testEndpoint: (storeUrl: string) => `${storeUrl}/v2/orders?limit=1`,
		authType: "x-auth-token" as const, // Uses X-Auth-Token header
		orderLookupConfig: (storeUrl: string) => ({
			httpUrl: `${storeUrl}/v2/orders`,
			httpMethod: "GET" as const,
			queryParam: "id", // BigCommerce uses order ID
		}),
	},
};

// POST /onboarding/configure-platform - Configure e-commerce platform credentials and create tools
onboardingRoute.post("/configure-platform", async (c) => {
	const userId = (c.get as (key: string) => unknown)("userId") as string | undefined;
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = configurePlatformSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { platform, agentId, credentials } = parsed.data;
	const db = getDb();

	// Verify the agent belongs to this user
	const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);

	if (!agent || agent.userId !== userId) {
		return c.json({ error: "Agent not found" }, 404);
	}

	const platformConfig = platformApiConfigs[platform];
	const testUrl = platformConfig.testEndpoint(credentials.storeUrl);

	// Build headers based on platform auth type
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
	};

	if (platformConfig.authType === "basic") {
		// WooCommerce uses Basic Auth with consumer key:secret
		const authString = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret || ""}`).toString(
			"base64",
		);
		headers.Authorization = `Basic ${authString}`;
	} else if (platformConfig.authType === "bearer") {
		// Magento uses Bearer token
		headers.Authorization = `Bearer ${credentials.apiKey}`;
	} else if (platformConfig.authType === "x-auth-token") {
		// BigCommerce uses X-Auth-Token header
		headers["X-Auth-Token"] = credentials.apiKey;
	}

	// Test the connection
	try {
		const testResponse = await fetch(testUrl, {
			method: "GET",
			headers,
		});

		if (!testResponse.ok) {
			const errorText = await testResponse.text();
			console.error(
				`[configure-platform] API test failed for ${platform}:`,
				testResponse.status,
				errorText,
			);
			return c.json(
				{
					error: "Failed to connect to store API. Please check your credentials.",
					details:
						testResponse.status === 401
							? "Invalid API credentials"
							: `API returned ${testResponse.status}`,
				},
				400,
			);
		}
	} catch (error) {
		console.error(`[configure-platform] Connection error for ${platform}:`, error);
		return c.json(
			{
				error: "Could not connect to store. Please check the URL and try again.",
			},
			400,
		);
	}

	// Create the order lookup tool
	const orderConfig = platformConfig.orderLookupConfig(credentials.storeUrl);

	const platformNames: Record<string, string> = {
		woocommerce: "WooCommerce",
		magento: "Magento",
		bigcommerce: "BigCommerce",
	};

	await db.insert(agentTools).values({
		agentId,
		name: "lookup_order",
		description: `Look up an order by order number or ID from ${platformNames[platform]}. Use this when a customer asks about their order status, tracking, or order details.`,
		inputSchema: {
			type: "object",
			properties: {
				order_number: {
					type: "string",
					description: "The order number or ID provided by the customer",
				},
			},
			required: ["order_number"],
		},
		executionType: "http",
		httpUrl: orderConfig.httpUrl,
		httpMethod: orderConfig.httpMethod,
		httpHeaders: headers,
		displayConfig: {
			type: "card",
			fieldMappings: [
				{ jsonPath: "$.id", label: "Order ID" },
				{ jsonPath: "$.status", label: "Status" },
				{ jsonPath: "$.total", label: "Total" },
				{ jsonPath: "$.date_created", label: "Date" },
			],
			textFallback: "Order details retrieved successfully",
		},
		isEnabled: true,
	} as any);

	// Create product inquiry form tool
	await db.insert(agentTools).values({
		agentId,
		name: "product_inquiry_form",
		description:
			"Collect product inquiries from customers interested in learning more about products",
		inputSchema: {
			type: "object",
			properties: {
				name: { type: "string", description: "Customer name" },
				email: { type: "string", description: "Customer email" },
				product_name: { type: "string", description: "Product they are inquiring about" },
				message: { type: "string", description: "Their question or inquiry" },
			},
			required: ["name", "email", "product_name", "message"],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{ name: "name", label: "Your Name", type: "text", required: true },
				{ name: "email", label: "Email Address", type: "email", required: true },
				{ name: "product_name", label: "Product Name", type: "text", required: true },
				{ name: "message", label: "Your Question", type: "textarea", required: true },
			],
			submitLabel: "Submit Inquiry",
			successMessage: "Thank you for your inquiry! We'll get back to you soon.",
		},
		isEnabled: true,
	} as any);

	// Create back in stock notification form
	await db.insert(agentTools).values({
		agentId,
		name: "back_in_stock_form",
		description:
			"Allow customers to sign up for back-in-stock notifications for out-of-stock products",
		inputSchema: {
			type: "object",
			properties: {
				email: { type: "string", description: "Customer email for notification" },
				product_name: { type: "string", description: "Product they want to be notified about" },
				product_url: { type: "string", description: "URL of the product page" },
			},
			required: ["email", "product_name"],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{ name: "email", label: "Email Address", type: "email", required: true },
				{ name: "product_name", label: "Product Name", type: "text", required: true },
				{ name: "product_url", label: "Product URL (optional)", type: "text", required: false },
			],
			submitLabel: "Notify Me",
			successMessage: "You'll be notified when this product is back in stock!",
		},
		isEnabled: true,
	} as any);

	// Create product page assistant trigger
	await db.insert(triggers).values({
		agentId,
		name: "Product Page Assistant",
		description: "Offer help on product pages",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 20, page: "*product*" },
		actionType: "show_bubble",
		actionConfig: {
			message: "👋 Have questions about this product? I can help!",
			duration: 5000,
		},
		triggerOnce: true,
		isEnabled: true,
		priority: 10,
	});

	// Create checkout assistance trigger
	await db.insert(triggers).values({
		agentId,
		name: "Checkout Assistance",
		description: "Offer help during checkout",
		triggerType: "time_on_page",
		conditions: { timeOnPage: 30, page: "*checkout*" },
		actionType: "show_bubble",
		actionConfig: {
			message: "Need any help with checkout? I'm here to assist!",
			duration: 5000,
		},
		triggerOnce: true,
		isEnabled: true,
		priority: 15,
	});

	return c.json({
		success: true,
		message: `${platformNames[platform]} connected successfully!`,
		toolsCreated: ["order_lookup", "product_inquiry_form", "back_in_stock_form"],
		triggersCreated: ["Product Page Assistant", "Checkout Assistance"],
	});
});

export { onboardingRoute };
