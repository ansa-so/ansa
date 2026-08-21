/**
 * IframeWrapper - Thin wrapper for Widget.tsx when running in iframe mode
 *
 * Responsibilities:
 * - Parse config from URL hash (passed by embed.ts)
 * - Fetch full settings from API
 * - Listen for postMessage events from parent (triggers, forms, identity)
 * - Render Widget with proper props
 * - Handle onClose by posting ansa:close to parent
 */

import type { FormSchema } from "@ansa/types";
import { useCallback, useEffect, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Widget, type WidgetConfig } from "./Widget";
import "./index.css";

// Default settings used when no config is provided
// NOTE: Dark mode is currently disabled in Widget.tsx (DARK_MODE_ENABLED = false)
// Change theme back to "system" when re-enabling dark mode
const DEFAULT_CONFIG = {
	theme: "light" as const,
	primaryColor: "#3b82f6",
	chatBubbleColor: "#3b82f6",
	displayName: "AI Assistant",
	profilePicture: null,
	initialMessage: "Hello! How can I help you today?",
	suggestedMessages: [] as string[],
	messagePlaceholder: "Type a message...",
	footerMessage: null,
	dismissibleMessage: null,
};

interface HashConfig {
	agentId: string;
	apiUrl: string;
	theme?: "light" | "dark" | "system";
	primaryColor?: string;
	chatBubbleColor?: string;
	displayName?: string;
	profilePicture?: string | null;
	initialMessage?: string | null;
	suggestedMessages?: string[];
	messagePlaceholder?: string | null;
	footerMessage?: string | null;
	dismissibleMessage?: string | null;
	pageUrl?: string;
	pageDomain?: string;
	pagePath?: string;
	channel?: string;
	_debug?: boolean;
}

// Parse config from URL hash (passed by embed script)
function getConfigFromHash(): HashConfig {
	try {
		const hash = window.location.hash;
		if (!hash.startsWith("#config=")) {
			return { agentId: "", apiUrl: "http://localhost:3001" };
		}
		const configStr = decodeURIComponent(hash.slice(8));
		return JSON.parse(configStr);
	} catch {
		return { agentId: "", apiUrl: "http://localhost:3001" };
	}
}

interface ClientFormState {
	schema: FormSchema;
	title?: string;
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	onCancel?: () => void;
	sendToAgent?: boolean;
}

export function IframeWrapper() {
	const [hashConfig] = useState(() => getConfigFromHash());
	const [config, setConfig] = useState<WidgetConfig | null>(null);
	const [isWidgetOpen, setIsWidgetOpen] = useState(true);
	const [triggerMessage, setTriggerMessage] = useState<string | string[] | undefined>();
	const [triggerForm, setTriggerForm] = useState<
		{ toolId: string; message?: string; requestId?: string } | undefined
	>();
	const [clientForm, setClientForm] = useState<ClientFormState | undefined>();
	const [userIdentity, setUserIdentity] = useState<
		{ userId?: string; userMetadata?: Record<string, unknown> } | undefined
	>();

	const apiUrl = hashConfig.apiUrl || import.meta.env.VITE_API_URL || "http://localhost:3001";

	// Fetch full settings from API on mount
	useEffect(() => {
		if (!hashConfig.agentId) {
			console.warn("[Ansa Widget] No agentId provided");
			// Use defaults only when no agentId
			setConfig({
				apiUrl,
				agentId: "",
				...DEFAULT_CONFIG,
			});
			return;
		}

		// Fetch full settings from API - don't set config until we get a response
		fetch(`${apiUrl}/interface-settings/public/${hashConfig.agentId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to fetch settings");
				return res.json();
			})
			.then((data) => {
				// Set config only after API response
				setConfig({
					apiUrl,
					agentId: hashConfig.agentId,
					theme: data.theme || hashConfig.theme || DEFAULT_CONFIG.theme,
					primaryColor: data.primaryColor || hashConfig.primaryColor || DEFAULT_CONFIG.primaryColor,
					chatBubbleColor:
						data.chatBubbleColor || hashConfig.chatBubbleColor || DEFAULT_CONFIG.chatBubbleColor,
					displayName: data.displayName || hashConfig.displayName || DEFAULT_CONFIG.displayName,
					profilePicture:
						data.profilePicture ?? hashConfig.profilePicture ?? DEFAULT_CONFIG.profilePicture,
					initialMessage:
						data.initialMessage ?? hashConfig.initialMessage ?? DEFAULT_CONFIG.initialMessage,
					suggestedMessages:
						data.suggestedMessages ||
						hashConfig.suggestedMessages ||
						DEFAULT_CONFIG.suggestedMessages,
					messagePlaceholder:
						data.messagePlaceholder ??
						hashConfig.messagePlaceholder ??
						DEFAULT_CONFIG.messagePlaceholder,
					footerMessage:
						data.footerMessage ?? hashConfig.footerMessage ?? DEFAULT_CONFIG.footerMessage,
					dismissibleMessage:
						data.dismissibleMessage ??
						hashConfig.dismissibleMessage ??
						DEFAULT_CONFIG.dismissibleMessage,
					collectUserFeedback: data.collectUserFeedback ?? true,
					showSatisfactionOnResolved: data.showSatisfactionOnResolved ?? true,
					escalation: data.escalation ?? null,
					pageUrl: hashConfig.pageUrl,
					pageDomain: hashConfig.pageDomain,
					pagePath: hashConfig.pagePath,
					// Dashboard debug mode passthrough
					...(hashConfig.channel ? { channel: hashConfig.channel } : {}),
					...(hashConfig._debug ? { _debug: hashConfig._debug } : {}),
				});

				// Notify parent of primary color
				window.parent.postMessage(
					{ type: "ansa:style", data: { primaryColor: data.primaryColor } },
					"*",
				);
			})
			.catch((err) => {
				console.warn("[Ansa Widget] Failed to fetch interface settings:", err);
				// On error, fall back to hash config + defaults
				setConfig({
					apiUrl,
					agentId: hashConfig.agentId,
					theme: hashConfig.theme || DEFAULT_CONFIG.theme,
					primaryColor: hashConfig.primaryColor || DEFAULT_CONFIG.primaryColor,
					chatBubbleColor: hashConfig.chatBubbleColor || DEFAULT_CONFIG.chatBubbleColor,
					displayName: hashConfig.displayName || DEFAULT_CONFIG.displayName,
					profilePicture: hashConfig.profilePicture ?? DEFAULT_CONFIG.profilePicture,
					initialMessage: hashConfig.initialMessage ?? DEFAULT_CONFIG.initialMessage,
					suggestedMessages: hashConfig.suggestedMessages || DEFAULT_CONFIG.suggestedMessages,
					messagePlaceholder: hashConfig.messagePlaceholder ?? DEFAULT_CONFIG.messagePlaceholder,
					footerMessage: hashConfig.footerMessage ?? DEFAULT_CONFIG.footerMessage,
					dismissibleMessage: hashConfig.dismissibleMessage ?? DEFAULT_CONFIG.dismissibleMessage,
					pageUrl: hashConfig.pageUrl,
					pageDomain: hashConfig.pageDomain,
					pagePath: hashConfig.pagePath,
					// Dashboard debug mode passthrough
					...(hashConfig.channel ? { channel: hashConfig.channel } : {}),
					...(hashConfig._debug ? { _debug: hashConfig._debug } : {}),
				});
			});
	}, [hashConfig.agentId, apiUrl]);

	// Listen for messages from parent window (embed.ts)
	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const { type, data, isOpen } = event.data || {};

			switch (type) {
				case "ansa:visibility":
					if (typeof isOpen === "boolean") {
						setIsWidgetOpen(isOpen);
					}
					break;

				case "ansa:triggerMessage":
					if (data?.message) {
						setTriggerMessage(data.message);
					}
					break;

				case "ansa:triggerForm":
					if (data?.toolId) {
						setTriggerForm({
							toolId: data.toolId,
							message: data.message,
							requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
						});
					}
					break;

				case "ansa:showClientForm":
					if (data?.formId && data?.schema) {
						// Build initialValues from userIdentity
						const formInitialValues: Record<string, unknown> = {};
						const formFields = data.schema?.fields || [];
						for (const field of formFields) {
							if (userIdentity?.userMetadata?.[field.name] !== undefined) {
								formInitialValues[field.name] = userIdentity.userMetadata[field.name];
							}
						}

						setClientForm({
							schema: {
								fields: data.schema.fields,
								submitLabel: data.schema.submitButtonText,
							},
							title: data.schema.title,
							sendToAgent: data.sendToAgent ?? false,
						});
					}
					break;

				case "ansa:identityUpdate":
					setUserIdentity(data || {});
					// Set window.ansa.user for FormBlock template resolution
					(window as unknown as { ansa?: { user?: Record<string, unknown> } }).ansa = {
						...(window as unknown as { ansa?: { user?: Record<string, unknown> } }).ansa,
						user: data?.userMetadata,
					};
					break;
			}
		};

		window.addEventListener("message", handleMessage);
		return () => window.removeEventListener("message", handleMessage);
	}, [userIdentity]);

	// Handle close - notify parent
	const handleClose = useCallback(() => {
		window.parent.postMessage({ type: "ansa:close" }, "*");
	}, []);

	// Handle unread count change - notify parent
	const handleUnreadCountChange = useCallback((count: number) => {
		window.parent.postMessage({ type: "ansa:unread-count", count }, "*");
	}, []);

	// Clear trigger data after Widget has processed it
	useEffect(() => {
		if (triggerMessage) {
			const timer = setTimeout(() => setTriggerMessage(undefined), 100);
			return () => clearTimeout(timer);
		}
	}, [triggerMessage]);

	useEffect(() => {
		if (triggerForm) {
			const timer = setTimeout(() => setTriggerForm(undefined), 100);
			return () => clearTimeout(timer);
		}
	}, [triggerForm]);

	useEffect(() => {
		if (clientForm) {
			const timer = setTimeout(() => setClientForm(undefined), 100);
			return () => clearTimeout(timer);
		}
	}, [clientForm]);

	// Don't render until config is ready
	if (!config) {
		return (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					height: "100vh",
					backgroundColor: "#ffffff",
				}}
			>
				<div
					style={{
						width: "32px",
						height: "32px",
						border: "3px solid #e5e7eb",
						borderTopColor: "#9ca3af",
						borderRadius: "50%",
						animation: "spin 0.8s linear infinite",
					}}
				/>
				<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
			</div>
		);
	}

	return (
		<ErrorBoundary>
			<Widget
				config={config}
				onClose={handleClose}
				triggerMessage={triggerMessage}
				triggerForm={triggerForm}
				clientForm={clientForm}
				userIdentity={userIdentity}
				onUnreadCountChange={handleUnreadCountChange}
				isWidgetOpen={isWidgetOpen}
			/>
		</ErrorBoundary>
	);
}

export default IframeWrapper;
