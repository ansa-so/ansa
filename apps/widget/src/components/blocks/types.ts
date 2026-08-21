// Local type definitions (duplicated from @ansa/types for build compatibility)

export interface FormFieldValidation {
	required?: { value: boolean; message: string };
	min?: { value: number; message: string };
	max?: { value: number; message: string };
	minLength?: { value: number; message: string };
	maxLength?: { value: number; message: string };
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
		| "datetime"
		| "file"
		| "image";
	placeholder?: string;
	description?: string;
	defaultValue?: string;
	options?: Array<{ label: string; value: string }>;
	validation?: FormFieldValidation;
}

export interface FormSchema {
	fields: FormField[];
	introText?: string;
	submitLabel?: string;
	successMessage?: string;
	errorMessage?: string;
}

export type FormExecutionMode = "webhook" | "client" | "both";

export type FormPostAction =
	| { type: "webhook"; url: string; headers?: Record<string, string> }
	| { type: "slack"; webhookUrl: string; messageTemplate: string };

export interface FormHandlerContext {
	user?: { id?: string; email?: string; name?: string };
	metadata?: Record<string, unknown>;
	visitorId?: string;
	conversationId?: string;
}

export interface FormHandlerResult {
	success: boolean;
	message?: string;
	data?: Record<string, unknown>;
}

export interface DisplayConfig {
	type:
		| "text"
		| "product_card"
		| "product_carousel"
		| "product_grid"
		| "image"
		| "table"
		| "buttons"
		| "form"
		| "custom";
	fieldMappings?: Record<string, string>;
	/** Path to the array in the response to iterate over (e.g. "data" or "results.items") */
	dataPath?: string;
	textFallback?: string;
	options?: {
		showPrice?: boolean;
		showImage?: boolean;
		showAddToCart?: boolean;
		columns?: Array<{ key: string; label: string; width?: string }>;
		buttonStyle?: "primary" | "secondary" | "outline";
		template?: string;
		maxItems?: number;
		viewMoreUrl?: string;
		cardStyle?: "compact" | "detailed";
	};
}

export interface ToolBlock {
	type: "tool_result";
	toolName: string;
	result: unknown;
	displayConfig: DisplayConfig;
	isError?: boolean;
	errorMessage?: string;
	debugInfo?: {
		url: string;
		method: string;
		statusCode: number | null;
		rawResponse: string;
		executionTimeMs: number;
	};
}

// Form-specific block
export interface FormBlock {
	type: "form";
	toolId: string;
	toolName: string;
	formSchema?: FormSchema; // Optional - can come from client
	executionMode: FormExecutionMode;
	clientHandler?: string;
	toolArgs?: Record<string, unknown>; // AI-generated args for client schema
	formPostActions?: FormPostAction[];
	initialValues?: Record<string, unknown>;
}

export interface ProductData {
	title?: string;
	price?: string;
	image?: string;
	url?: string;
	description?: string;
	variantId?: string;
}

export interface ButtonData {
	label: string;
	action?: string;
	url?: string;
}

export interface BlockProps {
	isDark: boolean;
	primaryColor: string;
}
