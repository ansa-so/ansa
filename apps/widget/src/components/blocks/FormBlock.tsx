import { useCallback, useEffect, useState } from "react";
import { renderMarkdown } from "../../lib/format-message";
import type { TranslationStrings } from "../../lib/translations";
import type {
	BlockProps,
	FormField,
	FormHandlerContext,
	FormHandlerResult,
	FormPostAction,
	FormSchema,
} from "./types";

interface FormBlockProps extends BlockProps {
	// Schema can be provided directly or fetched from client
	schema?: FormSchema;
	formSchema?: FormSchema; // Legacy prop name
	toolId?: string;
	toolName?: string;
	executionMode?: "webhook" | "client" | "both";
	clientHandler?: string;
	toolArgs?: Record<string, unknown>; // AI-generated args for client schema
	formPostActions?: FormPostAction[];
	initialValues?: Record<string, unknown>;
	initialData?: Record<string, unknown>; // Legacy prop name
	storedData?: Record<string, unknown>;
	existingSubmission?: {
		id: string;
		status: string;
		submittedAt: number;
	};
	onSubmit: (
		data: Record<string, unknown>,
		fieldsCompleted: string[],
	) => Promise<FormHandlerResult>;
	onFieldsChanged?: (fieldsCompleted: string[]) => void;
	onFieldsChange?: (data: Record<string, unknown>, fieldsCompleted: string[]) => void; // Legacy callback
	onCancel?: () => void;
	translations?: TranslationStrings;
}

// Resolve template variables like {{user.email}} or {{context.field}}
function resolveDefaultValue(value: string | undefined, context: FormHandlerContext): string {
	if (!value) return "";

	return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
		const parts = path.trim().split(".");
		let current: unknown = context;

		for (const part of parts) {
			if (current && typeof current === "object" && part in current) {
				current = (current as Record<string, unknown>)[part];
			} else {
				return ""; // Path not found, return empty string
			}
		}

		return typeof current === "string" ? current : "";
	});
}

// Validate a field value against its validation rules
function validateField(field: FormField, value: unknown): string | null {
	const { validation } = field;
	if (!validation) return null;

	const strValue = typeof value === "string" ? value : "";
	const numValue = typeof value === "number" ? value : Number(value);

	if (validation.required?.value && !value) {
		return validation.required.message;
	}

	if (strValue && validation.minLength?.value && strValue.length < validation.minLength.value) {
		return validation.minLength.message;
	}

	if (strValue && validation.maxLength?.value && strValue.length > validation.maxLength.value) {
		return validation.maxLength.message;
	}

	if (typeof numValue === "number" && !Number.isNaN(numValue)) {
		if (validation.min?.value !== undefined && numValue < validation.min.value) {
			return validation.min.message;
		}
		if (validation.max?.value !== undefined && numValue > validation.max.value) {
			return validation.max.message;
		}
	}

	if (strValue && validation.pattern?.value) {
		const regex = new RegExp(validation.pattern.value);
		if (!regex.test(strValue)) {
			return validation.pattern.message;
		}
	}

	return null;
}

// Detect if a color is light (needs dark text for contrast)
function isLightColor(hex: string): boolean {
	const color = hex.replace(/^#/, "");
	let r: number, g: number, b: number;
	if (color.length === 3) {
		r = Number.parseInt(color[0] + color[0], 16);
		g = Number.parseInt(color[1] + color[1], 16);
		b = Number.parseInt(color[2] + color[2], 16);
	} else {
		r = Number.parseInt(color.slice(0, 2), 16);
		g = Number.parseInt(color.slice(2, 4), 16);
		b = Number.parseInt(color.slice(4, 6), 16);
	}
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.7;
}

// Default contact form schema used when form tool has no schema configured
const DEFAULT_CONTACT_FORM_SCHEMA: FormSchema = {
	fields: [
		{
			name: "name",
			label: "Name",
			type: "text",
			placeholder: "Your name",
			validation: {
				required: { value: true, message: "Name is required" },
			},
		},
		{
			name: "email",
			label: "Email",
			type: "email",
			placeholder: "you@example.com",
			validation: {
				required: { value: true, message: "Email is required" },
			},
		},
		{
			name: "message",
			label: "Message",
			type: "textarea",
			placeholder: "How can we help?",
			validation: {
				required: { value: true, message: "Message is required" },
			},
		},
	],
	submitLabel: "Send Message",
	successMessage: "Thanks! We'll get back to you soon.",
	errorMessage: "Something went wrong. Please try again.",
};

export function FormBlock({
	schema,
	formSchema: formSchemaProp,
	toolId: _toolId,
	toolName: _toolName,
	isDark,
	primaryColor,
	clientHandler,
	toolArgs,
	initialValues = {},
	initialData,
	storedData = {},
	existingSubmission,
	onSubmit,
	onFieldsChanged,
	onFieldsChange,
	onCancel,
	translations: t,
}: FormBlockProps) {
	// Resolve legacy prop names
	const initialDataResolved = initialData || initialValues;
	const storedDataResolved = storedData;

	const [formData, setFormData] = useState<Record<string, unknown>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const [touched, setTouched] = useState<Record<string, boolean>>({});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submitResult, setSubmitResult] = useState<FormHandlerResult | null>(
		existingSubmission
			? {
					success: true,
					message: t?.forms.formSubmittedSuccessfully || "Form submitted successfully!",
				}
			: null,
	);

	// Client-side schema state
	const [clientSchema, setClientSchema] = useState<FormSchema | null>(null);
	const [schemaError, setSchemaError] = useState<string | null>(null);
	const [isLoadingSchema, setIsLoadingSchema] = useState(false);

	// Resolved schema: client schema > server schema > default contact form
	const resolvedSchema = clientSchema || schema || formSchemaProp || DEFAULT_CONTACT_FORM_SCHEMA;

	// Request schema from parent window if clientHandler is set
	useEffect(() => {
		if (!clientHandler) return;

		// Check if we're in an iframe
		if (window.parent === window) return;

		setIsLoadingSchema(true);
		const requestId = `schema_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

		// Listen for response
		const handleMessage = (event: MessageEvent) => {
			if (
				event.data?.type === "ansa:formSchemaResult" &&
				event.data?.data?.requestId === requestId
			) {
				setIsLoadingSchema(false);
				if (event.data.data.success && event.data.data.schema) {
					setClientSchema(event.data.data.schema);
				} else {
					setSchemaError(event.data.data.error || "Failed to load form schema");
				}
				window.removeEventListener("message", handleMessage);
			}
		};

		window.addEventListener("message", handleMessage);

		// Request schema from parent
		window.parent.postMessage(
			{
				type: "ansa:getFormSchema",
				data: {
					handlerName: clientHandler,
					toolArgs: toolArgs || {},
					conversationId: undefined, // Will be filled by parent
					requestId,
				},
			},
			"*",
		);

		// Timeout after 5 seconds
		const timeout = setTimeout(() => {
			setIsLoadingSchema(false);
			window.removeEventListener("message", handleMessage);
			// Fall back to server schema if available
			if (!schema && !formSchemaProp) {
				setSchemaError("Form schema request timed out");
			}
		}, 5000);

		return () => {
			clearTimeout(timeout);
			window.removeEventListener("message", handleMessage);
		};
	}, [clientHandler, toolArgs, schema, formSchemaProp]);

	// Track if we've already initialized to prevent re-initialization
	const [isInitialized, setIsInitialized] = useState(false);

	// Initialize form with default values, initial values, and stored data (only once)
	useEffect(() => {
		if (!resolvedSchema || isInitialized) return;

		const context: FormHandlerContext = {
			user: (window as unknown as { ansa?: { user?: Record<string, unknown> } }).ansa?.user,
		};

		const initial: Record<string, unknown> = {};
		for (const field of resolvedSchema.fields) {
			// Priority: storedData > initialValues > defaultValue
			if (storedDataResolved[field.name] !== undefined) {
				initial[field.name] = storedDataResolved[field.name];
			} else if (initialDataResolved[field.name] !== undefined) {
				initial[field.name] = initialDataResolved[field.name];
			} else if (field.defaultValue) {
				initial[field.name] = resolveDefaultValue(field.defaultValue, context);
			} else {
				initial[field.name] = field.type === "multiselect" ? [] : "";
			}
		}
		setFormData(initial);
		setIsInitialized(true);
	}, [resolvedSchema, initialDataResolved, storedDataResolved, isInitialized]);

	// Track completed fields
	useEffect(() => {
		const completed = Object.entries(formData)
			.filter(([_, value]) => {
				if (Array.isArray(value)) return value.length > 0;
				return value !== "" && value !== null && value !== undefined;
			})
			.map(([key]) => key);
		onFieldsChanged?.(completed);
		onFieldsChange?.(formData, completed);
	}, [formData, onFieldsChanged, onFieldsChange]);

	const handleChange = useCallback((name: string, value: unknown) => {
		setFormData((prev) => ({ ...prev, [name]: value }));
		// Clear error on change
		setErrors((prev) => {
			const next = { ...prev };
			delete next[name];
			return next;
		});
	}, []);

	const handleBlur = useCallback(
		(field: FormField) => {
			setTouched((prev) => ({ ...prev, [field.name]: true }));
			const error = validateField(field, formData[field.name]);
			if (error) {
				setErrors((prev) => ({ ...prev, [field.name]: error }));
			}
		},
		[formData],
	);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!resolvedSchema) return;

		// Validate all fields
		const newErrors: Record<string, string> = {};
		for (const field of resolvedSchema.fields) {
			const error = validateField(field, formData[field.name]);
			if (error) {
				newErrors[field.name] = error;
			}
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			// Mark all fields as touched
			const allTouched: Record<string, boolean> = {};
			for (const f of resolvedSchema.fields) {
				allTouched[f.name] = true;
			}
			setTouched(allTouched);
			return;
		}

		setIsSubmitting(true);
		try {
			// Calculate completed fields
			const completedFields = Object.entries(formData)
				.filter(([_, value]) => {
					if (Array.isArray(value)) return value.length > 0;
					return value !== "" && value !== null && value !== undefined;
				})
				.map(([key]) => key);
			const result = await onSubmit(formData, completedFields);
			setSubmitResult(result);
		} catch (error) {
			setSubmitResult({
				success: false,
				message: error instanceof Error ? error.message : "Submission failed",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	// Handle file input
	const handleFileChange = async (
		name: string,
		file: File | null,
		maxSize: number = 5 * 1024 * 1024,
	) => {
		if (!file) {
			handleChange(name, "");
			return;
		}

		if (file.size > maxSize) {
			setErrors((prev) => ({
				...prev,
				[name]: `File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
			}));
			return;
		}

		// Convert to base64
		const reader = new FileReader();
		reader.onload = () => {
			handleChange(name, reader.result);
		};
		reader.onerror = () => {
			setErrors((prev) => ({ ...prev, [name]: "Failed to read file" }));
		};
		reader.readAsDataURL(file);
	};

	// Show success/error message after submission
	if (submitResult) {
		return (
			<div
				className={`p-4 rounded-lg ${
					submitResult.success
						? isDark
							? "bg-green-900/30 border border-green-700"
							: "bg-green-50 border border-green-200"
						: isDark
							? "bg-red-900/30 border border-red-700"
							: "bg-red-50 border border-red-200"
				}`}
			>
				<p
					className={`text-sm ${
						submitResult.success
							? isDark
								? "text-green-300"
								: "text-green-700"
							: isDark
								? "text-red-300"
								: "text-red-700"
					}`}
				>
					{submitResult.message ||
						(submitResult.success
							? resolvedSchema?.successMessage ||
								t?.forms.formSubmittedSuccessfully ||
								"Form submitted successfully!"
							: resolvedSchema?.errorMessage ||
								t?.forms.somethingWentWrongTryAgain ||
								"Failed to submit form.")}
				</p>
			</div>
		);
	}

	const inputStyles = `w-full h-9 px-3 text-sm border transition-all focus:outline-none ${
		isDark
			? "bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-gray-500"
			: "bg-[#FAFAF9] border-[#E5E5E5] text-gray-900 placeholder-gray-500 focus:border-[#1A1A1A] focus:bg-white"
	}`;

	const labelStyles = `block text-[9px] font-mono uppercase mb-1 tracking-wide ${
		isDark ? "text-gray-400" : "text-[#888]"
	}`;

	const errorStyles = "text-xs text-red-500 mt-1";

	// Show loading state while fetching client schema
	if (isLoadingSchema) {
		return (
			<div
				className={`p-4 rounded-lg border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"}`}
			>
				<p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
					{t?.forms.loadingForm || "Loading form..."}
				</p>
			</div>
		);
	}

	// Show error if schema couldn't be loaded
	if (schemaError) {
		return (
			<div
				className={`p-4 rounded-lg ${isDark ? "bg-red-900/30 border border-red-700" : "bg-red-50 border border-red-200"}`}
			>
				<p className={`text-sm ${isDark ? "text-red-300" : "text-red-700"}`}>{schemaError}</p>
			</div>
		);
	}

	// No schema available
	if (!resolvedSchema) {
		return (
			<div
				className={`p-4 rounded-lg ${isDark ? "bg-yellow-900/30 border border-yellow-700" : "bg-yellow-50 border border-yellow-200"}`}
			>
				<p className={`text-sm ${isDark ? "text-yellow-300" : "text-yellow-700"}`}>
					Form configuration not available
				</p>
			</div>
		);
	}

	// Determine intro text: use schema's introText if available
	const introText = resolvedSchema?.introText;

	return (
		<form
			onSubmit={handleSubmit}
			className={`w-full relative overflow-hidden border p-5 ${
				isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-[#E5E5E5]"
			}`}
		>
			{/* Top Accent Line */}
			<div
				className={`absolute top-0 left-0 w-full h-1 ${isDark ? "bg-gray-600" : "bg-[#1A1A1A]"}`}
			/>

			{resolvedSchema?.title && (
				<div className="flex items-center gap-2 mb-2">
					<svg
						width="12"
						height="12"
						className={isDark ? "text-gray-400" : "text-[#888]"}
						fill="currentColor"
						viewBox="0 0 24 24"
					>
						<path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
					</svg>
					<h4
						className={`text-xs font-bold uppercase tracking-wide ${isDark ? "text-gray-200" : "text-[#1A1A1A]"}`}
					>
						{resolvedSchema.title}
					</h4>
				</div>
			)}
			{introText && (
				<p className={`text-sm mb-4 leading-relaxed ${isDark ? "text-gray-400" : "text-[#555]"}`}>
					{renderMarkdown(introText, isDark)}
				</p>
			)}
			<div className="space-y-3">
				{resolvedSchema.fields.map((field: FormField) => (
					<div key={field.name}>
						<label htmlFor={field.name} className={labelStyles}>
							{field.label}
							{field.validation?.required?.value && <span className="ml-1 text-red-500">*</span>}
						</label>

						{/* Text, Email, Tel, Number */}
						{["text", "email", "tel", "number"].includes(field.type) && (
							<input
								id={field.name}
								type={field.type}
								placeholder={field.placeholder}
								value={(formData[field.name] as string) || ""}
								onChange={(e) => handleChange(field.name, e.target.value)}
								onBlur={() => handleBlur(field)}
								className={inputStyles}
								style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
							/>
						)}

						{/* Textarea */}
						{field.type === "textarea" && (
							<textarea
								id={field.name}
								placeholder={field.placeholder}
								value={(formData[field.name] as string) || ""}
								onChange={(e) => handleChange(field.name, e.target.value)}
								onBlur={() => handleBlur(field)}
								rows={4}
								className={`${inputStyles} h-auto p-3`}
								style={
									{ "--tw-ring-color": primaryColor, minHeight: "60px" } as React.CSSProperties
								}
							/>
						)}

						{/* Select */}
						{field.type === "select" && (
							<select
								id={field.name}
								value={(formData[field.name] as string) || ""}
								onChange={(e) => handleChange(field.name, e.target.value)}
								onBlur={() => handleBlur(field)}
								className={inputStyles}
								style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
							>
								<option value="">{field.placeholder || "Select..."}</option>
								{field.options?.map((opt: { label: string; value: string }) => (
									<option key={opt.value} value={opt.value}>
										{opt.label}
									</option>
								))}
							</select>
						)}

						{/* Multiselect */}
						{field.type === "multiselect" && (
							<div className="space-y-2">
								{field.options?.map((opt: { label: string; value: string }) => (
									<label
										key={opt.value}
										className={`flex items-center gap-2 ${
											isDark ? "text-gray-200" : "text-gray-700"
										}`}
									>
										<input
											type="checkbox"
											checked={((formData[field.name] as string[]) || []).includes(opt.value)}
											onChange={(e) => {
												const current = (formData[field.name] as string[]) || [];
												if (e.target.checked) {
													handleChange(field.name, [...current, opt.value]);
												} else {
													handleChange(
														field.name,
														current.filter((v) => v !== opt.value),
													);
												}
											}}
											className="rounded"
											style={{ accentColor: primaryColor }}
										/>
										<span className="text-sm">{opt.label}</span>
									</label>
								))}
							</div>
						)}

						{/* Date */}
						{field.type === "date" && (
							<input
								id={field.name}
								type="date"
								value={(formData[field.name] as string) || ""}
								onChange={(e) => handleChange(field.name, e.target.value)}
								onBlur={() => handleBlur(field)}
								className={inputStyles}
								style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
							/>
						)}

						{/* Datetime */}
						{field.type === "datetime" && (
							<input
								id={field.name}
								type="datetime-local"
								value={(formData[field.name] as string) || ""}
								onChange={(e) => handleChange(field.name, e.target.value)}
								onBlur={() => handleBlur(field)}
								className={inputStyles}
								style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
							/>
						)}

						{/* File */}
						{field.type === "file" && (
							<input
								id={field.name}
								type="file"
								onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
								className={inputStyles}
							/>
						)}

						{/* Image */}
						{field.type === "image" && (
							<div>
								<input
									id={field.name}
									type="file"
									accept="image/*"
									onChange={(e) => handleFileChange(field.name, e.target.files?.[0] || null)}
									className={inputStyles}
								/>
								{(() => {
									const imageData = formData[field.name];
									return typeof imageData === "string" && imageData ? (
										<img src={imageData} alt="Preview" className="mt-2 rounded-lg max-h-32" />
									) : null;
								})()}
							</div>
						)}

						{/* Error message */}
						{touched[field.name] && errors[field.name] && (
							<p className={errorStyles}>{errors[field.name]}</p>
						)}
					</div>
				))}
			</div>

			<div className="flex gap-2 mt-4">
				{onCancel && (
					<button
						type="button"
						onClick={onCancel}
						className={`flex-1 h-9 text-[10px] font-bold uppercase rounded-md border transition-colors hover:opacity-90`}
						style={{
							backgroundColor: "transparent",
							color: isDark ? "#d1d5db" : "#4b5563",
							borderColor: isDark ? "#374151" : "#d1d5db",
						}}
					>
						{t?.forms.cancel || "Cancel"}
					</button>
				)}
				<button
					type="submit"
					disabled={isSubmitting}
					className={`${onCancel ? "flex-1" : "w-full"} h-9 text-[10px] font-bold uppercase shadow-md transition-colors ${
						isSubmitting ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
					} ${isDark ? "bg-gray-600 text-white" : "bg-[#1A1A1A] text-white"}`}
				>
					{isSubmitting
						? t?.forms.submitting || "Submitting..."
						: resolvedSchema.submitLabel || t?.forms.submitDetails || "Submit Details"}
				</button>
			</div>
		</form>
	);
}
