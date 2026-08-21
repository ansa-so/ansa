// Self-contained embed script - renders the chat widget directly (no iframe)
import { createRoot } from "react-dom/client";
import { io, type Socket } from "socket.io-client";
import { WIDGET_Z_INDEX } from "./lib/constants";
import { getTranslations } from "./lib/translations";
import { Widget, type WidgetConfig } from "./Widget";
import "./embed.css"; // Import CSS - will be processed by Vite and injected into Shadow DOM

declare const __ANSA_VERSION__: string;
declare const __ANSA_API_URL__: string;

// CSS placeholder that will be replaced by our Vite plugin at build time
const WIDGET_STYLES = "__ANSA_STYLES_PLACEHOLDER__";

const API_URL = __ANSA_API_URL__;

// Parse agentId, debug flag, and lang from script URL
function getScriptParams(): { agentId: string; debug: boolean; lang: string | null } | null {
	const scripts = document.querySelectorAll('script[src*="embed"]');
	for (const script of scripts) {
		const src = script.getAttribute("src");
		if (src && src.includes("embed")) {
			try {
				const url = new URL(src, window.location.href);
				const agentId = url.searchParams.get("agentId");
				const debug = url.searchParams.get("debug") === "1";
				const lang = url.searchParams.get("lang");

				if (agentId) {
					return { agentId: decodeURIComponent(agentId), debug, lang };
				}
			} catch {
				// Invalid URL, continue
			}
		}
	}
	return null;
}

// Debug logger - only logs if debug mode is enabled
function createLogger(debug: boolean) {
	return {
		log: (...args: unknown[]) => debug && console.log("[Ansa]", ...args),
		warn: (...args: unknown[]) => debug && console.warn("[Ansa]", ...args),
		error: (...args: unknown[]) => console.error("[Ansa]", ...args), // Always show errors
	};
}

// Detect the user's preferred language
// Priority: script URL lang param → data-lang attribute → html lang attribute → navigator.language
function detectLanguage(scriptLang: string | null): string {
	// 1. Check for lang query parameter in the script URL (e.g., embed.js?agentId=xxx&lang=fr)
	if (scriptLang) {
		return scriptLang.toLowerCase();
	}

	// 2. Check for data-lang attribute on the embed script
	const scripts = document.querySelectorAll('script[src*="embed"]');
	for (const script of scripts) {
		const dataLang = script.getAttribute("data-lang");
		if (dataLang) {
			return dataLang.toLowerCase();
		}
	}

	// 3. Check html lang attribute
	const htmlLang = document.documentElement.lang;
	if (htmlLang) {
		return htmlLang.toLowerCase();
	}

	// 4. Fall back to browser language
	const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage;
	if (browserLang) {
		return browserLang.toLowerCase();
	}

	return "en";
}

(() => {
	const params = getScriptParams();

	if (!params) {
		console.error("[Ansa] Missing required URL param: agentId is required");
		return;
	}

	const { agentId, debug, lang } = params;
	const apiUrl = API_URL;
	const log = createLogger(debug);

	// Audio notification for new messages - pleasant chime sound
	// Using AudioContext for reliable cross-browser playback
	let audioContext: AudioContext | null = null;

	function playNotificationSound() {
		try {
			// Create AudioContext on first play (requires user interaction)
			if (!audioContext) {
				audioContext = new (
					window.AudioContext ||
					(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
				)();
			}

			const now = audioContext.currentTime;

			// Create a pleasant two-tone chime
			const playTone = (frequency: number, startTime: number, duration: number, volume: number) => {
				const oscillator = audioContext!.createOscillator();
				const gainNode = audioContext!.createGain();

				oscillator.connect(gainNode);
				gainNode.connect(audioContext!.destination);

				oscillator.type = "sine";
				oscillator.frequency.setValueAtTime(frequency, startTime);

				// Soft attack and decay for a gentle chime
				gainNode.gain.setValueAtTime(0, startTime);
				gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
				gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

				oscillator.start(startTime);
				oscillator.stop(startTime + duration);
			};

			// Play a pleasant ascending two-note chime (G5 -> C6)
			playTone(784, now, 0.15, 0.2); // G5
			playTone(1047, now + 0.1, 0.2, 0.15); // C6
		} catch (err) {
			log.log("Error playing notification sound:", err);
		}
	}

	// Detect initial language
	let currentLanguage = detectLanguage(lang);
	log.log("Detected language:", currentLanguage);

	// console.log("[Ansa] Config:", { apiUrl, agentId, debug, language: currentLanguage });

	// Expose version globally
	(window as unknown as { __ansa_version: string }).__ansa_version = __ANSA_VERSION__;

	// Prevent multiple initializations
	if ((window as unknown as { __ansa_initialized?: boolean }).__ansa_initialized) {
		log.log("Already initialized, skipping");
		return;
	}
	(window as unknown as { __ansa_initialized?: boolean }).__ansa_initialized = true;

	// Capture page info from current window
	const currentPathname = window.location.pathname.replace(/\/$/, "") || "/";
	const currentPageUrl = `${window.location.origin}${currentPathname}`;

	// Default config (matches database schema defaults, will be replaced with API settings)
	const defaultConfig: WidgetConfig = {
		apiUrl,
		agentId,
		theme: "system",
		primaryColor: "#3b82f6",
		chatBubbleColor: "#3b82f6",
		displayName: "AI Assistant",
		profilePicture: null,
		initialMessage: "Hello! How can I help you today?",
		suggestedMessages: [],
		messagePlaceholder: "Type a message...",
		footerMessage: null,
		dismissibleMessage: null,
		// Page tracking - auto-captured from current window
		pageUrl: currentPageUrl,
		pageDomain: window.location.hostname,
		pagePath: currentPathname,
	};

	const WIDGET_OPEN_KEY = `ansa-widget-open-${agentId}`;

	// Fetch unread count from server
	async function fetchUnreadCount(visitorId: string): Promise<number> {
		try {
			const response = await fetch(
				`${apiUrl}/chat/unread/${agentId}?visitorId=${encodeURIComponent(visitorId)}`,
			);
			if (response.ok) {
				const data = await response.json();
				return Number(data.unreadCount) || 0;
			}
		} catch (err) {
			// Silently fail - will show 0 unread
		}
		return 0;
	}

	// Mark conversation as seen on server
	async function markConversationSeen(conversationId: string): Promise<void> {
		try {
			await fetch(`${apiUrl}/chat/seen/${conversationId}`, { method: "POST" });
		} catch (err) {
			// Silently fail
		}
	}

	function initWidget() {
		let isOpen = false;
		try {
			isOpen = localStorage.getItem(WIDGET_OPEN_KEY) === "true";
		} catch {}

		let reactRoot: ReturnType<typeof createRoot> | null = null;
		let settingsFetched = false;
		let triggersLoaded = false;
		let triggersLoading = false;
		let config: WidgetConfig = defaultConfig;

		// Button customization (fetched separately for fast page load)
		let buttonConfig: {
			widgetButtonColor: string;
			widgetButtonIcon: string | null;
			widgetButtonIconType: "upload" | "url" | "emoji" | null;
			widgetButtonBorderRadius: string;
		} = {
			widgetButtonColor: "#3b82f6",
			widgetButtonIcon: null,
			widgetButtonIconType: null,
			widgetButtonBorderRadius: "28px",
		};

		log.log("Creating widget container");

		// Create widget container with Shadow DOM for CSS isolation
		const container = document.createElement("div");
		container.id = "ansa-widget-container";
		// Override Shopify theme CSS that hides empty divs (div:empty { display: none })
		container.style.cssText = `display: block !important; position: fixed !important; z-index: ${WIDGET_Z_INDEX} !important;`;
		document.body.appendChild(container);

		const shadow = container.attachShadow({ mode: "open" });

		// Inject Tailwind CSS into shadow DOM (compiled and inlined at build time)
		const tailwindStyle = document.createElement("style");
		tailwindStyle.textContent = WIDGET_STYLES;
		shadow.appendChild(tailwindStyle);

		// Add widget-specific styles on top
		const widgetStyle = document.createElement("style");
		widgetStyle.textContent = `
			:host {
				display: block !important;
				position: fixed !important;
				z-index: ${WIDGET_Z_INDEX} !important;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			}

			* {
				box-sizing: border-box;
			}

			.ansa-root {
				position: fixed;
				bottom: 20px;
				right: 20px;
				font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			}

			.ansa-toggle {
				width: 56px;
				height: 56px;
				border-radius: 28px;
				background: #3b82f6;
				border: none;
				cursor: pointer;
				display: flex;
				align-items: center;
				justify-content: flex-start;
				color: white;
				box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
				transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
				overflow: visible;
				padding-left: 2px;
			}

			.ansa-toggle:hover {
				box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
			}

			.ansa-toggle.expanded {
				width: 170px;
			}

			.ansa-hover-label {
				font-size: 14px;
				font-weight: 500;
				white-space: nowrap;
				opacity: 0;
				transform: translateX(-8px);
				transition: opacity 0.3s ease 0.1s, transform 0.3s ease 0.1s;
				padding-right: 16px;
				padding-left: 4px;
			}

			.ansa-toggle.expanded .ansa-hover-label {
				opacity: 1;
				transform: translateX(0);
			}

			.ansa-chat-container {
				position: absolute;
				bottom: 70px;
				right: 0;
				width: 380px;
				height: 600px;
				max-height: calc(100vh - 100px);
				border-radius: 24px;
				overflow: hidden;
				box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
				background: #FAFAF9;
				display: none;
				transition: height 0.3s ease-in-out, width 0.3s ease-in-out;
				border: 1px solid rgba(255, 255, 255, 0.5);
			}

			.ansa-chat-container.open {
				display: flex;
				align-items: center;
				justify-content: center;
			}

			.ansa-loader {
				width: 40px;
				height: 40px;
				border: 3px solid #e5e7eb;
				border-top-color: #3b82f6;
				border-radius: 50%;
				animation: ansa-spin 0.8s linear infinite;
			}

			@keyframes ansa-spin {
				to { transform: rotate(360deg); }
			}

			@keyframes ansa-bubble-appear {
				from {
					opacity: 0;
					transform: translateY(10px) scale(0.95);
				}
				to {
					opacity: 1;
					transform: translateY(0) scale(1);
				}
			}

			@keyframes ansa-icon-rotate-in {
				from { transform: rotate(-90deg); opacity: 0; }
				to { transform: rotate(0deg); opacity: 1; }
			}

			@keyframes ansa-icon-rotate-out {
				from { transform: rotate(0deg); opacity: 1; }
				to { transform: rotate(90deg); opacity: 0; }
			}

			@keyframes ansa-icon-scale-in {
				from { transform: scale(0); opacity: 0; }
				to { transform: scale(1); opacity: 1; }
			}

			@keyframes ansa-icon-scale-out {
				from { transform: scale(1); opacity: 1; }
				to { transform: scale(0); opacity: 0; }
			}

			.ansa-bubbles-container {
				position: absolute;
				bottom: 70px;
				right: 0;
				display: flex;
				flex-direction: column;
				align-items: flex-end;
				gap: 8px;
			}

			.ansa-trigger-bubble {
				position: relative;
				background: white;
				padding: 16px;
				border-radius: 16px;
				box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 10px rgba(0, 0, 0, 0.08);
				width: 300px;
				cursor: pointer;
				animation: ansa-bubble-appear 0.25s ease-out;
				border: 1px solid rgba(0, 0, 0, 0.05);
			}

			.ansa-trigger-bubble-close {
				position: absolute;
				top: 12px;
				right: 12px;
				background: none;
				border: none;
				cursor: pointer;
				padding: 4px;
				color: #9ca3af;
				line-height: 1;
				transition: color 0.15s;
				z-index: 1;
			}

			.ansa-trigger-bubble-close:hover {
				color: #1f2937;
			}

			.ansa-trigger-bubble-content {
				display: flex;
				gap: 12px;
				padding-right: 20px;
			}

			.ansa-trigger-bubble-avatar {
				flex-shrink: 0;
				position: relative;
				align-self: flex-start;
			}

			.ansa-trigger-bubble-avatar-circle {
				width: 40px;
				height: 40px;
				border-radius: 50%;
				background: #1a1a1a;
				display: flex;
				align-items: center;
				justify-content: center;
				color: white;
				font-size: 16px;
				font-weight: 600;
				overflow: hidden;
			}

			.ansa-trigger-bubble-avatar-circle img {
				width: 100%;
				height: 100%;
				object-fit: cover;
			}

			.ansa-trigger-bubble-online-dot {
				position: absolute;
				bottom: 0;
				right: 0;
				width: 12px;
				height: 12px;
				background: #22c55e;
				border: 2px solid white;
				border-radius: 50%;
			}

			.ansa-trigger-bubble-text {
				flex: 1;
				min-width: 0;
			}

			.ansa-trigger-bubble-greeting {
				font-size: 14px;
				font-weight: 600;
				color: #111827;
				margin: 0 0 4px 0;
				line-height: 1.3;
			}

			.ansa-trigger-bubble-message {
				font-size: 14px;
				color: #4b5563;
				line-height: 1.5;
				margin: 0;
				overflow-wrap: break-word;
			}

			.ansa-trigger-bubble-cta {
				font-size: 14px;
				font-weight: 600;
				color: #000000;
				margin: 8px 0 0 0;
				cursor: pointer;
				display: flex;
				align-items: center;
				gap: 6px;
				transition: color 0.15s;
			}

			.ansa-trigger-bubble-cta:hover {
				color: #4b5563;
			}

			.ansa-trigger-bubble-cta-arrow {
				transition: transform 0.15s;
			}

			.ansa-trigger-bubble-cta:hover .ansa-trigger-bubble-cta-arrow {
				transform: translateX(2px);
			}

			.ansa-trigger-bubble-tail {
				position: absolute;
				bottom: -6px;
				right: 24px;
				width: 12px;
				height: 12px;
				background: white;
				border-right: 1px solid rgba(0, 0, 0, 0.05);
				border-bottom: 1px solid rgba(0, 0, 0, 0.05);
				transform: rotate(45deg);
			}

			.ansa-unread-badge {
				position: absolute;
				top: -4px;
				right: -4px;
				width: 12px;
				height: 12px;
				display: none;
			}

			.ansa-unread-badge.visible {
				display: flex;
			}

			.ansa-unread-badge-ping {
				position: absolute;
				inline-size: 100%;
				block-size: 100%;
				background: #f87171;
				border-radius: 50%;
				opacity: 0.75;
				animation: ansa-ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
			}

			.ansa-unread-badge-dot {
				position: relative;
				display: inline-flex;
				border-radius: 50%;
				width: 12px;
				height: 12px;
				background: #ef4444;
			}

			.ansa-icon-container {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 52px;
				height: 52px;
				flex-shrink: 0;
				transition: transform 0.2s ease;
			}

			.ansa-icon-container.close-icon:hover {
				transform: rotate(90deg);
			}

		.ansa-icon-container.closing {
			animation: ansa-icon-rotate-out 0.3s ease-out forwards;
		}

		.ansa-icon-container.opening {
			animation: ansa-icon-rotate-in 0.3s ease-out forwards;
		}

		.ansa-icon-container.chat-closing {
			animation: ansa-icon-scale-out 0.3s ease-out forwards;
		}

		.ansa-icon-container.chat-opening {
			animation: ansa-icon-scale-in 0.3s ease-out forwards;
			}

			.ansa-toggle:active {
				transform: scale(0.95);
			}

			@media (max-width: 768px) {
				.ansa-chat-container {
					position: fixed !important;
					bottom: 10px !important;
					right: 10px !important;
					left: 10px !important;
					top: 10px !important;
					width: auto !important;
					height: calc(100vh - 20px) !important;
					max-height: calc(100vh - 20px) !important;
					border-radius: 12px !important;
					background: transparent !important;
					box-shadow: none !important;
				}

				.ansa-root {
					right: 16px;
					bottom: 16px;
				}
			}
		`;
		shadow.appendChild(widgetStyle);

		// Create root element inside shadow DOM
		const root = document.createElement("div");
		root.className = "ansa-root";
		shadow.appendChild(root);

		// Create toggle button
		const button = document.createElement("button");
		button.className = "ansa-toggle";
		button.style.position = "relative"; // For badge positioning
		button.style.opacity = "0"; // Hidden until config is loaded
		button.style.transition = "opacity 0.2s ease-in-out, width 0.15s ease-in-out";
		root.appendChild(button);

		// Create close icon (X)
		const closeIcon = document.createElement("div");
		closeIcon.className = "ansa-icon-container close-icon";
		closeIcon.style.display = "none";
		closeIcon.style.width = "52px";
		closeIcon.style.height = "52px";
		closeIcon.style.flexShrink = "0";
		closeIcon.style.alignItems = "center";
		closeIcon.style.justifyContent = "center";
		closeIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
		button.appendChild(closeIcon);

		// Create chat icon (default or custom)
		const chatIcon = document.createElement("div");
		chatIcon.className = "ansa-icon-container";
		chatIcon.style.width = "52px";
		chatIcon.style.height = "52px";
		chatIcon.style.display = "flex";
		chatIcon.style.flexShrink = "0";
		chatIcon.style.alignItems = "center";
		chatIcon.style.justifyContent = "center";
		if (buttonConfig.widgetButtonIcon && buttonConfig.widgetButtonIconType) {
			// Custom icon
			if (buttonConfig.widgetButtonIconType === "emoji") {
				chatIcon.innerHTML = `<span style="font-size: 24px; line-height: 1;">${buttonConfig.widgetButtonIcon}</span>`;
			} else {
				chatIcon.innerHTML = `<img src="${buttonConfig.widgetButtonIcon}" alt="Chat" style="width: 28px; height: 28px; object-fit: contain;" />`;
			}
		} else {
			// Default chat icon
			chatIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      `;
		}
		button.appendChild(chatIcon);

		// Create hover label for "Chat with us" text (translated)
		const hoverLabel = document.createElement("span");
		hoverLabel.className = "ansa-hover-label";
		hoverLabel.textContent = getTranslations(currentLanguage).buttons.chatWithUs;
		button.appendChild(hoverLabel);

		// Add hover event listeners for pill animation
		let isWidgetOpen = false;
		let hoverAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

		button.addEventListener("mouseenter", () => {
			if (!isWidgetOpen) {
				// Clear any pending timeout
				if (hoverAnimationTimeout) {
					clearTimeout(hoverAnimationTimeout);
					hoverAnimationTimeout = null;
				}
				// Hide overflow during expansion to prevent badge from being cut off during animation
				button.style.overflow = "hidden";
				button.classList.add("expanded");
				// Restore overflow after animation completes
				hoverAnimationTimeout = setTimeout(() => {
					button.style.overflow = "visible";
				}, 300);
			}
		});
		button.addEventListener("mouseleave", () => {
			// Clear any pending timeout
			if (hoverAnimationTimeout) {
				clearTimeout(hoverAnimationTimeout);
				hoverAnimationTimeout = null;
			}
			// Hide overflow during collapse animation
			button.style.overflow = "hidden";
			button.classList.remove("expanded");
			// Restore overflow after animation completes
			hoverAnimationTimeout = setTimeout(() => {
				button.style.overflow = "visible";
			}, 300);
		});

		// Create unread badge with layered structure
		const unreadBadge = document.createElement("span");
		unreadBadge.className = "ansa-unread-badge";
		const pingLayer = document.createElement("span");
		pingLayer.className = "ansa-unread-badge-ping";
		const dotLayer = document.createElement("span");
		dotLayer.className = "ansa-unread-badge-dot";
		unreadBadge.appendChild(pingLayer);
		unreadBadge.appendChild(dotLayer);
		button.appendChild(unreadBadge);

		// Function to toggle button icon with animation
		function renderToggleButton(isOpen: boolean) {
			// Update the isWidgetOpen state for hover animation
			isWidgetOpen = isOpen;
			// Collapse button when opening widget
			if (isOpen) {
				button.classList.remove("expanded");
			}

			// Apply custom button color and border radius
			button.style.background = buttonConfig.widgetButtonColor;
			button.style.borderRadius = buttonConfig.widgetButtonBorderRadius;

			if (isOpen) {
				// Animate chat icon out, then show close icon
				chatIcon.classList.remove("chat-opening");
				chatIcon.classList.add("chat-closing");
				setTimeout(() => {
					chatIcon.style.display = "none";
					closeIcon.style.display = "flex";
					closeIcon.classList.remove("closing");
					closeIcon.classList.add("opening");
					// Remove animation class after it completes to allow hover effects
					setTimeout(() => {
						closeIcon.classList.remove("opening");
					}, 300);
				}, 150);
			} else {
				// Animate close icon out, then show chat icon
				closeIcon.classList.remove("opening");
				closeIcon.classList.add("closing");
				setTimeout(() => {
					closeIcon.style.display = "none";
					chatIcon.style.display = "flex";
					chatIcon.classList.remove("chat-closing");
					chatIcon.classList.add("chat-opening");
					// Remove animation class after it completes
					setTimeout(() => {
						chatIcon.classList.remove("chat-opening");
					}, 300);
				}, 150);
			}
		}

		// Initial state (chat icon visible)
		chatIcon.style.display = "flex";
		closeIcon.style.display = "none";

		// Track unread count
		let unreadCount = 0;

		// Fetch unread count from server on load
		const visitorIdKey = "ansa-visitor-id";
		let currentVisitorId: string | null = null;
		try {
			currentVisitorId = localStorage.getItem(visitorIdKey);
		} catch {}

		if (currentVisitorId && !isOpen) {
			fetchUnreadCount(currentVisitorId).then((count) => {
				if (count > 0) {
					unreadCount = count;
					updateUnreadBadge(count);
				}
			});
		}

		// Persistent socket connection for listening when widget is closed
		let persistentSocket: Socket | null = null;
		let conversationIdForSocket: string | null = null;
		let isConversationResolved = false;

		function initPersistentSocket() {
			if (persistentSocket) return;

			persistentSocket = io(`${apiUrl}/conversations`, {
				transports: ["websocket", "polling"],
				reconnection: true,
				reconnectionDelay: 1000,
				reconnectionDelayMax: 30000,
				reconnectionAttempts: Infinity,
			});

			persistentSocket.on("connect", () => {
				log.log("[Socket] Connected:", persistentSocket?.id);
				// Only join conversation if widget is CLOSED and we have an active conversation
				// When widget is open, Widget's own socket handles the connection
				if (conversationIdForSocket && !isConversationResolved && !isOpen) {
					persistentSocket?.emit("join-conversation", {
						conversationId: conversationIdForSocket,
						userId: undefined,
					});
				}
			});

			// Listen for new messages from agents - ONLY for unread badge when widget is closed
			persistentSocket.on("message_start", (_data) => {
				log.log("[Socket] New message from agent (persistent socket)");
				// Only increment unread count if widget is closed
				if (!isOpen) {
					unreadCount++;
					updateUnreadBadge(unreadCount);
					playNotificationSound();
				}
			});

			// Listen for complete messages from human agents
			persistentSocket.on("message_complete", (_data) => {
				log.log("[Socket] Complete message from agent (persistent socket)");
				// Only increment unread count if widget is closed
				if (!isOpen) {
					unreadCount++;
					updateUnreadBadge(unreadCount);
					playNotificationSound();
				}
			});
		}

		function updateConversationState(conversationId: string | null, resolved: boolean) {
			conversationIdForSocket = conversationId;
			isConversationResolved = resolved;

			// Only connect socket if we have an active (non-resolved) conversation
			if (conversationId && !resolved) {
				if (!persistentSocket) {
					initPersistentSocket();
				} else if (persistentSocket.connected) {
					// If widget is closed, join the conversation for background updates
					// If widget is open, Widget's own socket is handling it, so leave this conversation
					if (isOpen) {
						persistentSocket.emit("leave-conversation", { conversationId });
					} else {
						persistentSocket.emit("join-conversation", {
							conversationId,
							userId: undefined,
						});
					}
				}
			} else if (resolved && persistentSocket) {
				// Disconnect socket if conversation is resolved
				persistentSocket.disconnect();
				persistentSocket = null;
			}
		}

		function updateUnreadBadge(count: number) {
			// When widget is closed, we track unread count via persistent socket
			// Ignore Widget's scroll-based unread count when closed
			if (!isOpen) {
				// Only update if count > 0 (don't let Widget reset our count)
				if (count > 0) {
					unreadCount = count;
				}
				// Always show badge if we have unread messages
				if (unreadCount > 0) {
					unreadBadge.classList.add("visible");
				}
				return;
			}
			// Widget is open - use its unread count
			unreadCount = count;
			if (count > 0) {
				unreadBadge.classList.add("visible");
			} else {
				unreadBadge.classList.remove("visible");
			}
		}

		// Create chat container
		const chatContainer = document.createElement("div");
		chatContainer.className = "ansa-chat-container";
		root.appendChild(chatContainer);

		// Create trigger bubbles container (for show_bubble action)
		const bubblesContainer = document.createElement("div");
		bubblesContainer.className = "ansa-bubbles-container";
		root.appendChild(bubblesContainer);

		function showTriggerBubble(message: string, duration?: number) {
			log.log("showTriggerBubble called:", { message, duration, isOpen });
			const bubble = document.createElement("div");
			bubble.className = "ansa-trigger-bubble";

			// Get display name for avatar initial
			const displayName = config.displayName || "A";
			const initial = displayName.charAt(0).toUpperCase();
			const profilePicture = config.profilePicture;
			const avatarContent = profilePicture
				? `<img src="${profilePicture}" alt="${displayName}">`
				: initial;

			// Get greeting from translations
			const translations = getTranslations(currentLanguage);
			const greeting = translations.triggers?.greeting || "Hi there! 👋";

			// Get CTA text from translations
			const ctaText = translations.triggers?.startConversation || "Start a conversation";

			bubble.innerHTML = `
        <button class="ansa-trigger-bubble-close" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="ansa-trigger-bubble-content">
          <div class="ansa-trigger-bubble-avatar">
            <div class="ansa-trigger-bubble-avatar-circle">${avatarContent}</div>
            <div class="ansa-trigger-bubble-online-dot"></div>
          </div>
          <div class="ansa-trigger-bubble-text">
            <p class="ansa-trigger-bubble-greeting">${greeting}</p>
            <p class="ansa-trigger-bubble-message">${message}</p>
            <p class="ansa-trigger-bubble-cta">${ctaText}<span class="ansa-trigger-bubble-cta-arrow">→</span></p>
          </div>
        </div>
        <div class="ansa-trigger-bubble-tail"></div>
      `;

			// Close button click handler
			const closeBtn = bubble.querySelector(".ansa-trigger-bubble-close");
			if (closeBtn) {
				closeBtn.addEventListener("click", (e) => {
					e.stopPropagation();
					bubble.remove();
				});
			}

			// Click bubble to open chat
			bubble.addEventListener("click", () => {
				bubble.remove();
				openWidget(message);
			});

			bubblesContainer.appendChild(bubble);
			log.log("Bubble appended to container");

			// Auto-hide after duration (in seconds)
			if (duration && duration > 0) {
				setTimeout(() => {
					bubble.remove();
				}, duration * 1000);
			}
		}

		function hideAllBubbles() {
			bubblesContainer.innerHTML = "";
		}

		// Create loader
		const loader = document.createElement("div");
		loader.className = "ansa-loader";
		chatContainer.appendChild(loader);

		// React mount point
		const reactMountPoint = document.createElement("div");
		reactMountPoint.style.cssText = "width: 100%; height: 100%; display: none;";
		chatContainer.appendChild(reactMountPoint);

		// Current trigger message (set when opening via trigger)
		let currentTriggerMessage: string | string[] | undefined;
		// Current trigger form (set when opening via show_form trigger)
		let currentTriggerForm: { toolId: string; message?: string; requestId?: string } | undefined;
		// Client-side form (set when showing a form with schema)
		interface ClientFormSchema {
			title?: string;
			fields: Array<{
				name: string;
				label: string;
				type: string;
				placeholder?: string;
				options?: Array<{ label: string; value: string }>;
				validation?: {
					required?: { value: boolean; message: string };
					minLength?: { value: number; message: string };
					maxLength?: { value: number; message: string };
					pattern?: { value: string; message: string };
				};
			}>;
			submitButtonText?: string;
		}
		let currentClientForm:
			| {
					schema: ClientFormSchema;
					onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
					onCancel?: () => void;
					sendToAgent?: boolean;
			  }
			| undefined;

		function handleFirstMessage() {
			// Track conversion for the last fired trigger
			if (lastFiredTrigger) {
				trackTriggerEvent(lastFiredTrigger, "converted");
				lastFiredTrigger = null; // Only track once
			}
		}

		function renderWidget() {
			if (!reactRoot) {
				reactRoot = createRoot(reactMountPoint);
			}
			loader.style.display = "none";
			reactMountPoint.style.display = "block";

			// Get current user identity from global
			const currentUserIdentity = (
				window as unknown as {
					__ansa_user_identity?: { userId?: string; userMetadata?: Record<string, unknown> };
				}
			).__ansa_user_identity;

			reactRoot.render(
				<Widget
					config={config}
					onClose={closeWidget}
					triggerMessage={currentTriggerMessage}
					triggerForm={currentTriggerForm}
					clientForm={
						currentClientForm
							? {
									schema: {
										fields: currentClientForm.schema.fields.map((f) => ({
											name: f.name,
											label: f.label,
											type: f.type as
												| "text"
												| "email"
												| "tel"
												| "number"
												| "textarea"
												| "select"
												| "multiselect"
												| "date"
												| "datetime"
												| "file"
												| "image",
											placeholder: f.placeholder,
											options: f.options,
											validation: f.validation,
										})),
										submitLabel: currentClientForm.schema.submitButtonText,
									},
									title: currentClientForm.schema.title,
									onSubmit: currentClientForm.onSubmit,
									onCancel: currentClientForm.onCancel,
									sendToAgent: currentClientForm.sendToAgent,
								}
							: undefined
					}
					userIdentity={currentUserIdentity}
					onFirstMessage={handleFirstMessage}
					onUnreadCountChange={updateUnreadBadge}
					onMessageReceived={() => playNotificationSound()}
					isWidgetOpen={isOpen}
				/>,
			);
			// Clear trigger data after React has processed the render
			// Use setTimeout to ensure React 18's concurrent rendering has captured the props
			setTimeout(() => {
				currentTriggerMessage = undefined;
				currentTriggerForm = undefined;
				currentClientForm = undefined;
			}, 0);
		}

		// Listen for conversation state updates from Widget
		window.addEventListener("message", (event) => {
			if (event.data?.type === "ansa:conversation-state") {
				const { conversationId, isResolved } = event.data;
				updateConversationState(conversationId, isResolved);

				// Mark as seen if widget is open
				if (isOpen && conversationId) {
					markConversationSeen(conversationId);
				}
			}

			// Handle expand/collapse from Widget
			if (event.data?.type === "ansa:expand") {
				const { isExpanded } = event.data;
				if (isExpanded) {
					chatContainer.style.height = "calc(100vh - 100px)";
					chatContainer.style.width = "550px";
				} else {
					chatContainer.style.height = "600px";
					chatContainer.style.width = "380px";
				}
			}
		});

		async function fetchSettingsAndRender(forceRefetch = false) {
			if (settingsFetched && !forceRefetch) {
				renderWidget();
				return;
			}

			// Show loader
			loader.style.display = "block";
			reactMountPoint.style.display = "none";

			try {
				log.log("Fetching settings from API with language:", currentLanguage);
				// Include language parameter for localized content
				const url = new URL(`${apiUrl}/interface-settings/public/${agentId}`);
				if (currentLanguage) {
					url.searchParams.set("lang", currentLanguage);
				}
				const res = await fetch(url.toString());
				if (res.ok) {
					const settings = await res.json();
					log.log("Got settings from API:", settings);
					// Use API settings, preserving page tracking from defaultConfig
					config = {
						apiUrl,
						agentId,
						theme: settings.theme || defaultConfig.theme,
						primaryColor: settings.primaryColor || defaultConfig.primaryColor,
						chatBubbleColor: settings.chatBubbleColor || defaultConfig.chatBubbleColor,
						displayName: settings.displayName || defaultConfig.displayName,
						profilePicture: settings.profilePicture ?? defaultConfig.profilePicture,
						initialMessage: settings.initialMessage ?? defaultConfig.initialMessage,
						suggestedMessages: settings.suggestedMessages || defaultConfig.suggestedMessages,
						messagePlaceholder: settings.messagePlaceholder ?? defaultConfig.messagePlaceholder,
						footerMessage: settings.footerMessage ?? defaultConfig.footerMessage,
						dismissibleMessage: settings.dismissibleMessage ?? defaultConfig.dismissibleMessage,
						collectUserFeedback: settings.collectUserFeedback ?? true,
						showSatisfactionOnResolved: settings.showSatisfactionOnResolved ?? true,
						// Escalation settings
						escalation: settings.escalation ?? null,
						// Preserve page tracking from defaultConfig
						pageUrl: defaultConfig.pageUrl,
						pageDomain: defaultConfig.pageDomain,
						pagePath: defaultConfig.pagePath,
						// Language for localized escalation messages
						language: currentLanguage,
					};
				} else {
					log.warn("Failed to fetch settings, using defaults");
				}
			} catch (err) {
				log.warn("Error fetching settings:", err);
			}

			settingsFetched = true;
			renderWidget();
		}

		async function openWidget(triggerMessage?: string | string[]) {
			isOpen = true;
			currentTriggerMessage = triggerMessage;
			// Hide any trigger bubbles when opening chat
			hideAllBubbles();
			// Hide unread badge when widget is open
			unreadBadge.classList.remove("visible");
			// Reset unread count when opening
			unreadCount = 0;

			// Mark conversation as seen on server
			if (conversationIdForSocket) {
				markConversationSeen(conversationIdForSocket);
			}

			// Make persistent socket leave the conversation - Widget's socket will handle it
			if (persistentSocket?.connected && conversationIdForSocket) {
				persistentSocket.emit("leave-conversation", { conversationId: conversationIdForSocket });
			}

			try {
				localStorage.setItem(WIDGET_OPEN_KEY, "true");
			} catch {}
			chatContainer.classList.add("open");

			// Update button to show close icon
			renderToggleButton(true);

			// Fetch settings on first open, then render
			await fetchSettingsAndRender();
		}

		function closeWidget() {
			isOpen = false;

			// Ensure persistent socket is initialized for background updates
			if (conversationIdForSocket && !isConversationResolved) {
				if (!persistentSocket) {
					initPersistentSocket();
					// Socket will join conversation in connect handler since isOpen is now false
				} else if (persistentSocket.connected) {
					persistentSocket.emit("join-conversation", {
						conversationId: conversationIdForSocket,
						userId: undefined,
					});
				} else {
					// Socket exists but not connected - will join when it reconnects via connect handler
					// The connect handler checks !isOpen, which is now false, so it will join
					log.log("[Socket] Socket exists but not connected, will join on reconnect");
				}
			}

			try {
				localStorage.setItem(WIDGET_OPEN_KEY, "false");
			} catch {}
			chatContainer.classList.remove("open");

			// Update button to show chat icon
			renderToggleButton(false);

			// Show badge if there are unread messages
			updateUnreadBadge(unreadCount);

			// Re-render widget with isOpen=false so it knows visibility changed
			if (settingsFetched) {
				renderWidget();
			}
		}

		button.onclick = () => {
			if (isOpen) {
				closeWidget();
			} else {
				openWidget();
			}
		};

		// Expose public API
		(window as unknown as { ansa: AnsaAPI }).ansa = {
			open: openWidget,
			close: closeWidget,
			toggle: () => button.click(),
			isOpen: () => isOpen,
			isReady: () => true,
			showBubbles: (messages: string | string[], duration?: number) => {
				if (isOpen) return; // Don't show bubbles when widget is already open
				const messageArray = Array.isArray(messages) ? messages : [messages];
				messageArray.forEach((msg) => {
					showTriggerBubble(msg || "👋 Need help?", duration);
				});
			},
			hideBubbles: hideAllBubbles,
			showForm: (
				form: string | ClientFormSchema,
				options?: {
					onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
					onCancel?: () => void;
					sendToAgent?: boolean;
				},
			) => {
				if (typeof form === "string") {
					// Server-side form by name/ID - add requestId to force re-render
					currentTriggerForm = {
						toolId: form,
						requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
					};
					openWidget();
				} else {
					// Client-side form with schema
					currentClientForm = {
						schema: form,
						onSubmit: options?.onSubmit,
						onCancel: options?.onCancel,
						sendToAgent: options?.sendToAgent,
					};
					openWidget();
				}
			},
			trigger: (eventName: string, data?: Record<string, unknown>) => {
				const customEvent = new CustomEvent(eventName, { detail: data });
				window.dispatchEvent(customEvent);
			},
			identify: (identity: { userId?: string; userMetadata?: Record<string, unknown> }) => {
				// Store for form context - will be used by Widget component
				(window as unknown as { __ansa_user_identity?: typeof identity }).__ansa_user_identity =
					identity;
				// Trigger re-render to pass updated identity to Widget
				renderWidget();
			},
			resetUser: () => {
				(window as unknown as { __ansa_user_identity?: unknown }).__ansa_user_identity = undefined;
				// Trigger re-render to clear identity from Widget
				renderWidget();
			},
			getVisitorId: () => {
				const key = "ansa-visitor-id";
				try {
					let id = localStorage.getItem(key);
					if (!id) {
						id = `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
						localStorage.setItem(key, id);
					}
					return id;
				} catch {
					return `v_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
				}
			},
			setLanguage: async (languageCode: string) => {
				log.log("Setting language to:", languageCode);
				currentLanguage = languageCode.toLowerCase();
				// Re-fetch settings with new language and force re-render
				settingsFetched = false;
				await fetchSettingsAndRender(true);
			},
			getLanguage: () => currentLanguage,
			setTheme: (theme: "light" | "dark" | "system") => {
				// Dark mode is currently disabled - ignore dark/system requests
				// To re-enable: set DARK_MODE_ENABLED = true in Widget.tsx
				if (theme !== "light") {
					log.warn("Dark mode is currently disabled. Theme locked to 'light'.");
				}
				log.log("Setting theme to:", "light");
				config = { ...config, theme: "light" };
				renderWidget();
			},
			// Dark mode disabled - always return "light"
			// To re-enable: return config.theme || "system"
			getTheme: () => "light",
			showBubblesOnScroll: (
				bubbles: Array<{ message: string; scrollPercent: number; duration?: number }>,
			) => {
				if (isOpen) return; // Don't show bubbles when widget is already open

				const shownBubbles = new Set<number>();

				const handleScroll = () => {
					const scrollTop = window.scrollY || document.documentElement.scrollTop;
					const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
					const scrollPercent = (scrollTop / scrollHeight) * 100;

					bubbles.forEach((bubble, index) => {
						if (!shownBubbles.has(index) && scrollPercent >= bubble.scrollPercent) {
							showTriggerBubble(bubble.message, bubble.duration);
							shownBubbles.add(index);
						}
					});

					// Remove listener if all bubbles shown or widget opened
					if (shownBubbles.size === bubbles.length || isOpen) {
						window.removeEventListener("scroll", handleScroll);
					}
				};

				window.addEventListener("scroll", handleScroll);
				// Check immediately in case already scrolled
				handleScroll();
			},
		};

		// Type definition for ansa API
		interface AnsaAPI {
			open: (message?: string | string[]) => void;
			close: () => void;
			toggle: () => void;
			isOpen: () => boolean;
			isReady: () => boolean;
			showBubbles: (messages: string | string[], duration?: number) => void;
			hideBubbles: () => void;
			showForm: (
				form: string | ClientFormSchema,
				options?: {
					onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
					onCancel?: () => void;
					sendToAgent?: boolean;
				},
			) => void;
			trigger: (eventName: string, data?: Record<string, unknown>) => void;
			identify: (identity: { userId?: string; userMetadata?: Record<string, unknown> }) => void;
			resetUser: () => void;
			getVisitorId: () => string;
			setLanguage: (languageCode: string) => Promise<void>;
			getLanguage: () => string;
			setTheme: (theme: "light" | "dark" | "system") => void;
			getTheme: () => string;
			showBubblesOnScroll: (
				bubbles: Array<{ message: string; scrollPercent: number; duration?: number }>,
			) => void;
		}

		// ========== TRIGGER SYSTEM ==========
		const TRIGGERS_FIRED_KEY = `ansa-triggers-fired-${agentId}`;

		interface TriggerConditions {
			timeOnPage?: number;
			scrollDepth?: number;
			page?: string;
			event?: string;
			eventData?: Record<string, unknown>;
		}

		interface TriggerActionConfig {
			message?: string;
			toolId?: string;
			duration?: number;
		}

		interface Trigger {
			id: string;
			name: string;
			triggerType: "time_on_page" | "scroll_depth" | "exit_intent" | "page_view" | "custom_event";
			conditions: TriggerConditions;
			actionType: "open_chat" | "show_form" | "show_bubble";
			actionConfig: TriggerActionConfig;
			triggerOnce: boolean;
			priority: number;
		}

		let triggers: Trigger[] = [];
		let firedTriggers: Set<string> = new Set();
		let triggerCleanupFns: Array<() => void> = [];
		let maxScrollDepth = 0;
		// Track last trigger execution time to prevent rapid succession
		let lastTriggerTime = 0;
		const MIN_TRIGGER_DELAY = 3000; // 3 seconds between triggers

		function loadFiredTriggers(): Set<string> {
			try {
				const stored = localStorage.getItem(TRIGGERS_FIRED_KEY);
				if (stored) {
					return new Set(JSON.parse(stored));
				}
			} catch {}
			return new Set();
		}

		function saveFiredTriggers() {
			try {
				localStorage.setItem(TRIGGERS_FIRED_KEY, JSON.stringify([...firedTriggers]));
			} catch {}
		}

		function matchesPagePattern(pattern: string): boolean {
			const currentPath = window.location.pathname;
			const regexPattern = pattern
				.replace(/\*\*/g, ".*")
				.replace(/\*/g, "[^/]*")
				.replace(/\//g, "\\/");
			try {
				const regex = new RegExp(`^${regexPattern}$`);
				return regex.test(currentPath);
			} catch {
				return currentPath === pattern;
			}
		}

		// Session ID for tracking
		function getSessionId(): string {
			try {
				let sessionId = sessionStorage.getItem("ansa_session_id");
				if (!sessionId) {
					sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
					sessionStorage.setItem("ansa_session_id", sessionId);
				}
				return sessionId;
			} catch {
				return "unknown";
			}
		}

		// Track last fired trigger for conversion tracking
		let lastFiredTrigger: Trigger | null = null;

		// Track trigger events to the API
		async function trackTriggerEvent(trigger: Trigger, eventType: "fired" | "converted") {
			try {
				await fetch(`${apiUrl}/triggers/event`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						agentId,
						triggerId: trigger.id,
						triggerName:
							trigger.name || trigger.actionConfig.message?.slice(0, 50) || trigger.triggerType,
						triggerType: trigger.triggerType,
						actionType: trigger.actionType,
						eventType,
						sessionId: getSessionId(),
						pagePath: window.location.pathname,
					}),
				});
			} catch (error) {
				log.warn("Failed to track trigger event:", error);
			}
		}

		function executeTriggerAction(trigger: Trigger) {
			if (trigger.triggerOnce && firedTriggers.has(trigger.id)) {
				return;
			}

			// Enforce minimum delay between triggers
			const now = Date.now();
			if (now - lastTriggerTime < MIN_TRIGGER_DELAY) {
				log.log("Trigger skipped - too soon after last trigger");
				return;
			}
			lastTriggerTime = now;

			firedTriggers.add(trigger.id);
			saveFiredTriggers();

			// Track the trigger firing
			trackTriggerEvent(trigger, "fired");
			lastFiredTrigger = trigger;

			log.log("Executing trigger action:", trigger.actionType, trigger.actionConfig);

			switch (trigger.actionType) {
				case "open_chat":
					log.log("Action: open_chat");
					openWidget(trigger.actionConfig.message);
					break;
				case "show_bubble":
					log.log("Action: show_bubble, isOpen:", isOpen);
					// Don't show bubbles when widget is already open
					if (!isOpen) {
						showTriggerBubble(
							trigger.actionConfig.message || "👋 Need help?",
							trigger.actionConfig.duration,
						);
					} else {
						log.log("Bubble skipped - widget is open");
					}
					break;
				case "show_form":
					if (trigger.actionConfig.toolId) {
						currentTriggerForm = {
							toolId: trigger.actionConfig.toolId,
							message: trigger.actionConfig.message,
						};
						openWidget();
					}
					break;
			}
		}

		function setupTriggers() {
			triggerCleanupFns.forEach((fn) => {
				fn();
			});
			triggerCleanupFns = [];
			firedTriggers = loadFiredTriggers();
			log.log("Previously fired:", [...firedTriggers]);
			maxScrollDepth = 0;

			const sortedTriggers = [...triggers].sort((a, b) => b.priority - a.priority);
			log.log("Setting up", sortedTriggers.length, "triggers");

			for (const trigger of sortedTriggers) {
				if (trigger.triggerOnce && firedTriggers.has(trigger.id)) {
					log.log(`Skipping "${trigger.name}" - already fired`);
					continue;
				}

				if (trigger.conditions.page && !matchesPagePattern(trigger.conditions.page)) {
					log.log(`Skipping "${trigger.name}" - page doesn't match`);
					continue;
				}

				switch (trigger.triggerType) {
					case "time_on_page": {
						const delay = (trigger.conditions.timeOnPage || 30) * 1000;
						log.log(`Setting up "${trigger.name}" for ${trigger.conditions.timeOnPage}s`);
						const timeoutId = setTimeout(() => {
							log.log(`"${trigger.name}" FIRING!`);
							executeTriggerAction(trigger);
						}, delay);
						triggerCleanupFns.push(() => clearTimeout(timeoutId));
						break;
					}

					case "scroll_depth": {
						const targetDepth = trigger.conditions.scrollDepth || 50;
						log.log(`Setting up scroll trigger for ${targetDepth}%`);
						const scrollHandler = () => {
							const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
							const currentScroll = window.scrollY;
							const currentDepth = scrollHeight > 0 ? (currentScroll / scrollHeight) * 100 : 0;
							if (currentDepth > maxScrollDepth) {
								maxScrollDepth = currentDepth;
							}
							if (maxScrollDepth >= targetDepth) {
								log.log(`Scroll trigger fired at ${maxScrollDepth.toFixed(0)}%`);
								executeTriggerAction(trigger);
								window.removeEventListener("scroll", scrollHandler);
							}
						};
						window.addEventListener("scroll", scrollHandler, { passive: true });
						triggerCleanupFns.push(() => window.removeEventListener("scroll", scrollHandler));
						break;
					}

					case "exit_intent": {
						log.log("Setting up exit intent trigger");
						const exitHandler = (e: MouseEvent) => {
							if (e.clientY <= 0) {
								log.log("Exit intent trigger fired");
								executeTriggerAction(trigger);
								document.removeEventListener("mouseout", exitHandler);
							}
						};
						document.addEventListener("mouseout", exitHandler);
						triggerCleanupFns.push(() => document.removeEventListener("mouseout", exitHandler));
						break;
					}

					case "page_view": {
						log.log("Page view trigger fired");
						executeTriggerAction(trigger);
						break;
					}

					case "custom_event": {
						const eventName = trigger.conditions.event;
						if (!eventName) break;
						log.log(`Setting up custom event trigger for "${eventName}"`);
						const customEventHandler = ((e: CustomEvent) => {
							if (trigger.conditions.eventData) {
								const eventData = e.detail || {};
								const matches = Object.entries(trigger.conditions.eventData).every(
									([key, value]) => eventData[key] === value,
								);
								if (!matches) return;
							}
							log.log(`Custom event trigger fired: ${eventName}`);
							executeTriggerAction(trigger);
						}) as EventListener;
						window.addEventListener(eventName, customEventHandler);
						triggerCleanupFns.push(() => window.removeEventListener(eventName, customEventHandler));
						break;
					}
				}
			}
		}

		async function fetchTriggers() {
			// Prevent duplicate fetches
			if (triggersLoading || triggersLoaded) {
				log.log("Already loading/loaded, skipping");
				return;
			}

			triggersLoading = true;
			log.log("Fetching from:", `${apiUrl}/triggers/widget/${agentId}`);
			try {
				const url = `${apiUrl}/triggers/widget/${agentId}`;
				const response = await fetch(url);
				if (response.ok) {
					triggers = await response.json();
					log.log("Loaded:", triggers);
					setupTriggers();
					triggersLoaded = true;
				} else {
					log.warn("Failed to fetch:", response.status);
				}
			} catch (error) {
				log.warn("Error fetching:", error);
			} finally {
				triggersLoading = false;
			}
		}

		// Fetch lightweight button config on page load
		async function fetchButtonConfig() {
			try {
				log.log(
					"Fetching button config from:",
					`${apiUrl}/interface-settings/widget-button/${agentId}`,
				);
				const response = await fetch(`${apiUrl}/interface-settings/widget-button/${agentId}`);
				if (response.ok) {
					const config = await response.json();
					buttonConfig = config;
					log.log("Loaded button config:", buttonConfig);
					// Re-render button with new config
					renderToggleButton(isOpen);
				} else {
					log.warn("Failed to fetch button config, using defaults");
				}
			} catch (error) {
				log.warn("Error fetching button config:", error);
			} finally {
				// Show button after config is loaded (or failed to load)
				button.style.opacity = "1";
			}
		}

		// Fetch button config on init (lightweight API call)
		fetchButtonConfig();

		// Fetch triggers on init (non-blocking)
		fetchTriggers();

		// ========== SPA NAVIGATION DETECTION ==========
		// Re-evaluate triggers when URL changes (for single-page applications)
		let lastPathname = window.location.pathname;

		function handleNavigationChange() {
			const newPathname = window.location.pathname;
			if (newPathname !== lastPathname) {
				log.log("URL changed:", lastPathname, "→", newPathname);
				lastPathname = newPathname;

				// Re-evaluate triggers for new page
				if (triggersLoaded) {
					setupTriggers();
				}
			}
		}

		// Listen for browser back/forward navigation
		window.addEventListener("popstate", handleNavigationChange);

		// Intercept pushState and replaceState for SPA frameworks
		const originalPushState = history.pushState.bind(history);
		const originalReplaceState = history.replaceState.bind(history);

		history.pushState = (...args) => {
			originalPushState(...args);
			handleNavigationChange();
		};

		history.replaceState = (...args) => {
			originalReplaceState(...args);
			handleNavigationChange();
		};

		// ========== END TRIGGER SYSTEM ==========

		// Auto-open if previously open
		if (isOpen) {
			openWidget();
		}
	}

	// Wait for DOM, then init widget
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initWidget);
	} else {
		initWidget();
	}
})();
