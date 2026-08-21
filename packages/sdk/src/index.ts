/**
 * Ansa SDK - JavaScript client for Ansa AI agents
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export interface AnsaConfig {
	/** Your Ansa API key (get it from dashboard) */
	apiKey: string;
	/** API base URL (default: https://api.ansa.so) */
	baseUrl?: string;
	/** Request timeout in milliseconds (default: 30000) */
	timeout?: number;
}

export interface Agent {
	id: string;
	name: string;
	systemPrompt: string;
	aiQuality: string;
	temperature: number;
	createdAt: string;
	updatedAt: string;
}

export interface Message {
	role: "user" | "assistant";
	content: string;
}

export interface ChatOptions {
	/** Conversation ID for multi-turn conversations */
	conversationId?: string;
	/** Whether to stream the response */
	stream?: boolean;
	/** Visitor metadata */
	metadata?: Record<string, unknown>;
}

export interface ChatResponse {
	message: string;
	conversationId: string;
	messageId: string;
	toolCalls?: ToolCall[];
}

export interface ToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
	result?: unknown;
}

export interface Conversation {
	id: string;
	agentId: string;
	messages: Message[];
	createdAt: string;
	updatedAt: string;
}

export interface StreamCallbacks {
	onToken?: (token: string) => void;
	onMessage?: (message: ChatResponse) => void;
	onToolCall?: (toolCall: ToolCall) => void;
	onError?: (error: Error) => void;
	onComplete?: () => void;
}

// ============================================================================
// Ansa Client
// ============================================================================

export class AnsaClient {
	private apiKey: string;
	private baseUrl: string;
	private timeout: number;

	constructor(config: AnsaConfig) {
		if (!config.apiKey) {
			throw new Error("Ansa API key is required");
		}
		this.apiKey = config.apiKey;
		this.baseUrl = config.baseUrl?.replace(/\/$/, "") || "https://api.ansa.so";
		this.timeout = config.timeout || 30000;
	}

	private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), this.timeout);

		try {
			const response = await fetch(`${this.baseUrl}${path}`, {
				method,
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${this.apiKey}`,
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new AnsaError(
					error.message || `Request failed with status ${response.status}`,
					response.status,
					error.code,
				);
			}

			return response.json();
		} finally {
			clearTimeout(timeoutId);
		}
	}

	// ==========================================================================
	// Chat
	// ==========================================================================

	/**
	 * Send a message to an agent and get a response
	 * @param agentId - The agent ID
	 * @param message - The user message
	 * @param options - Chat options
	 * @returns The agent's response
	 */
	async chat(agentId: string, message: string, options: ChatOptions = {}): Promise<ChatResponse> {
		return this.request<ChatResponse>("POST", `/chat/${agentId}`, {
			message,
			conversationId: options.conversationId,
			metadata: options.metadata,
		});
	}

	/**
	 * Stream a chat response from an agent
	 * @param agentId - The agent ID
	 * @param message - The user message
	 * @param callbacks - Streaming callbacks
	 * @param options - Chat options
	 */
	async chatStream(
		agentId: string,
		message: string,
		callbacks: StreamCallbacks,
		options: ChatOptions = {},
	): Promise<void> {
		const response = await fetch(`${this.baseUrl}/chat/${agentId}`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.apiKey}`,
				Accept: "text/event-stream",
			},
			body: JSON.stringify({
				message,
				conversationId: options.conversationId,
				metadata: options.metadata,
				stream: true,
			}),
		});

		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new AnsaError(
				error.message || `Request failed with status ${response.status}`,
				response.status,
				error.code,
			);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new AnsaError("No response body", 500);
		}

		const decoder = new TextDecoder();
		let buffer = "";
		let fullMessage = "";
		let conversationId = "";
		let messageId = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6);
						if (data === "[DONE]") {
							callbacks.onComplete?.();
							callbacks.onMessage?.({
								message: fullMessage,
								conversationId,
								messageId,
							});
							return;
						}

						try {
							const parsed = JSON.parse(data);
							if (parsed.token) {
								fullMessage += parsed.token;
								callbacks.onToken?.(parsed.token);
							}
							if (parsed.conversationId) {
								conversationId = parsed.conversationId;
							}
							if (parsed.messageId) {
								messageId = parsed.messageId;
							}
							if (parsed.toolCall) {
								callbacks.onToolCall?.(parsed.toolCall);
							}
						} catch {
							// Skip invalid JSON
						}
					}
				}
			}
		} catch (error) {
			callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
		}
	}

	// ==========================================================================
	// Agents
	// ==========================================================================

	/**
	 * Get all agents
	 * @returns List of agents
	 */
	async getAgents(): Promise<Agent[]> {
		return this.request<Agent[]>("GET", "/agents");
	}

	/**
	 * Get a specific agent
	 * @param agentId - The agent ID
	 * @returns The agent
	 */
	async getAgent(agentId: string): Promise<Agent> {
		return this.request<Agent>("GET", `/agents/${agentId}`);
	}

	// ==========================================================================
	// Conversations
	// ==========================================================================

	/**
	 * Get all conversations for an agent
	 * @param agentId - The agent ID
	 * @returns List of conversations
	 */
	async getConversations(agentId: string): Promise<Conversation[]> {
		return this.request<Conversation[]>("GET", `/conversations/${agentId}`);
	}

	/**
	 * Get a specific conversation
	 * @param conversationId - The conversation ID
	 * @returns The conversation with messages
	 */
	async getConversation(conversationId: string): Promise<Conversation> {
		return this.request<Conversation>("GET", `/conversations/detail/${conversationId}`);
	}
}

// ============================================================================
// Errors
// ============================================================================

export class AnsaError extends Error {
	constructor(
		message: string,
		public statusCode: number,
		public code?: string,
	) {
		super(message);
		this.name = "AnsaError";
	}
}

// ============================================================================
// Widget Types
// ============================================================================

export interface WidgetConfig {
	agentId: string;
	apiUrl?: string;
	widgetUrl?: string;
}

export interface FormFieldOption {
	label: string;
	value: string;
}

export interface FormFieldValidation {
	required?: { value: boolean; message: string };
	minLength?: { value: number; message: string };
	maxLength?: { value: number; message: string };
	min?: { value: number; message: string };
	max?: { value: number; message: string };
	pattern?: { value: string; message: string };
}

export interface FormField {
	name: string;
	label: string;
	type:
		| "text"
		| "email"
		| "tel"
		| "number"
		| "textarea"
		| "select"
		| "multiselect"
		| "date"
		| "datetime";
	placeholder?: string;
	defaultValue?: string;
	options?: FormFieldOption[];
	validation?: FormFieldValidation;
	disabled?: boolean;
}

export interface FormSchema {
	fields: FormField[];
	title?: string;
	description?: string;
	submitButtonText?: string;
	successMessage?: string;
}

export interface ShowFormOptions {
	/** Callback when form is submitted. Receives form data. */
	onSubmit?: (data: Record<string, unknown>) => void | Promise<void>;
	/** Callback when form is cancelled/closed */
	onCancel?: () => void;
	/** If true, form data is also sent to the agent as a chat message */
	sendToAgent?: boolean;
}

/** Widget API exposed on window.ansa by the embed script */
interface AnsaWidgetAPI {
	open: (message?: string) => void;
	close: () => void;
	toggle: () => void;
	isOpen: () => boolean;
	showBubbles: (messages: string | string[], duration?: number) => void;
	hideBubbles: () => void;
	showForm: (form: string | FormSchema, options?: ShowFormOptions) => void;
	trigger: (eventName: string, data?: Record<string, unknown>) => void;
	identify: (identity: { userId?: string; userMetadata?: Record<string, unknown> }) => void;
	resetUser: () => void;
	isReady: () => boolean;
	getVisitorId: () => string;
}

// Command queue for operations before widget is ready
type QueuedCommand = () => void;
const commandQueue: QueuedCommand[] = [];
let queueProcessorStarted = false;

function getWidgetAPI(): AnsaWidgetAPI | null {
	if (typeof window === "undefined") return null;
	return (window as unknown as { ansa?: AnsaWidgetAPI }).ansa || null;
}

function processQueue(): void {
	const api = getWidgetAPI();
	if (api?.isReady()) {
		while (commandQueue.length > 0) {
			const command = commandQueue.shift();
			command?.();
		}
	} else {
		setTimeout(processQueue, 100);
	}
}

function enqueueOrExecute(command: () => void): void {
	const api = getWidgetAPI();
	if (api?.isReady()) {
		command();
	} else {
		commandQueue.push(command);
		if (!queueProcessorStarted) {
			queueProcessorStarted = true;
			processQueue();
		}
	}
}

// ============================================================================
// Widget Embed Helper
// ============================================================================

/**
 * Embed the Ansa chat widget on a page
 * @param config - Widget configuration
 */
export function embedWidget(config: WidgetConfig): void {
	if (typeof window === "undefined") {
		console.warn("embedWidget can only be called in a browser environment");
		return;
	}

	// Set global config
	(window as unknown as { __ansa_config: WidgetConfig }).__ansa_config = {
		agentId: config.agentId,
		apiUrl: config.apiUrl || "https://api.ansa.so",
		url: config.widgetUrl || "https://widget.ansa.so",
	} as WidgetConfig & { url: string };

	// Load embed script
	const script = document.createElement("script");
	script.src = `${config.widgetUrl || "https://widget.ansa.so"}/embed.js`;
	script.async = true;
	document.body.appendChild(script);
}

// ============================================================================
// Widget Control Functions
// ============================================================================

/**
 * Open the widget chat
 * @param initMessage - Optional initial message to send
 */
export function openWidget(initMessage?: string): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.open(initMessage);
	});
}

/**
 * Close the widget chat
 */
export function closeWidget(): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.close();
	});
}

/**
 * Toggle the widget open/closed state
 */
export function toggleWidget(): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.toggle();
	});
}

/**
 * Check if the widget is currently open
 * @returns true if widget is open, false otherwise
 */
export function isWidgetOpen(): boolean {
	const api = getWidgetAPI();
	return api?.isReady() ? api.isOpen() : false;
}

/**
 * Check if the widget is ready
 * @returns true if widget is initialized and ready
 */
export function isWidgetReady(): boolean {
	const api = getWidgetAPI();
	return api?.isReady() ?? false;
}

/**
 * Show bubble message(s) near the widget button
 * @param messages - Single message or array of messages to display
 * @param duration - Optional duration in seconds before auto-hide
 * @example
 * showBubbles('Need help?');
 * showBubbles(['Any questions?', "I'm here to help!"]);
 */
export function showBubbles(messages: string | string[], duration?: number): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.showBubbles(messages, duration);
	});
}

/**
 * Hide all bubble messages
 */
export function hideBubbles(): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.hideBubbles();
	});
}

/**
 * Show a form in the widget
 * @param form - Tool name/ID (server-side) or FormSchema (client-side)
 * @param options - Optional callbacks and settings
 * @example
 * // Server-side form (fetched from DB by tool name)
 * showForm('contact_form');
 *
 * // Client-side with callback
 * showForm({
 *   title: 'Get a Quote',
 *   fields: [
 *     { name: 'email', label: 'Email', type: 'email' },
 *     { name: 'budget', label: 'Budget', type: 'select', options: [{ label: '$1k', value: '1000' }] }
 *   ]
 * }, {
 *   onSubmit: (data) => fetch('/api/quote', { method: 'POST', body: JSON.stringify(data) })
 * });
 *
 * // Send form data to agent as chat message
 * showForm({ fields: [...] }, { sendToAgent: true });
 */
export function showForm(form: string | FormSchema, options?: ShowFormOptions): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.showForm(form, options);
	});
}

/**
 * Trigger a custom event (for custom_event triggers)
 * @param eventName - The event name
 * @param data - Optional event data
 */
export function triggerEvent(eventName: string, data?: Record<string, unknown>): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.trigger(eventName, data);
	});
}

/**
 * Identify a user for the widget
 * @param identity - User identity with optional userId and metadata
 */
export function identify(identity: {
	userId?: string;
	userMetadata?: Record<string, unknown>;
}): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.identify(identity);
	});
}

/**
 * Clear user identity
 */
export function clearIdentity(): void {
	enqueueOrExecute(() => {
		getWidgetAPI()?.resetUser();
	});
}

/**
 * Get the anonymous visitor ID
 * @returns The visitor ID string or null if not available
 */
export function getVisitorId(): string | null {
	const api = getWidgetAPI();
	if (!api?.isReady()) return null;
	try {
		return api.getVisitorId();
	} catch {
		return null;
	}
}

// ============================================================================
// Factory function
// ============================================================================

/**
 * Create a new Ansa client
 * @param config - Client configuration
 * @returns A new AnsaClient instance
 */
export function createClient(config: AnsaConfig): AnsaClient {
	return new AnsaClient(config);
}

// Default export
export default {
	createClient,
	embedWidget,
	openWidget,
	closeWidget,
	toggleWidget,
	isWidgetOpen,
	isWidgetReady,
	showBubbles,
	hideBubbles,
	showForm,
	triggerEvent,
	identify,
	clearIdentity,
	getVisitorId,
	AnsaClient,
	AnsaError,
};
