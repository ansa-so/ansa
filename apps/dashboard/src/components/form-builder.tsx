"use client";

import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { EmailRecipient, FormField, FormPostAction, FormSchema } from "@/lib/api";
import { getEmailRecipients } from "@/lib/api";

const FIELD_TYPES = [
	{ value: "text", label: "Text" },
	{ value: "email", label: "Email" },
	{ value: "tel", label: "Phone" },
	{ value: "number", label: "Number" },
	{ value: "textarea", label: "Long Text" },
	{ value: "select", label: "Dropdown" },
	{ value: "multiselect", label: "Multi-Select" },
	{ value: "date", label: "Date" },
	{ value: "datetime", label: "Date & Time" },
	{ value: "file", label: "File Upload" },
	{ value: "image", label: "Image Upload" },
] as const;

interface FormBuilderProps {
	value: FormSchema;
	onChange: (schema: FormSchema) => void;
	postActions: FormPostAction[];
	onPostActionsChange: (actions: FormPostAction[]) => void;
}

export function FormBuilder({
	value,
	onChange,
	postActions,
	onPostActionsChange,
}: FormBuilderProps) {
	const [expandedField, setExpandedField] = useState<number | null>(null);
	const [emailRecipients, setEmailRecipients] = useState<EmailRecipient[]>([]);

	// Fetch email recipients on mount
	useEffect(() => {
		getEmailRecipients()
			.then(setEmailRecipients)
			.catch((err) => console.error("Failed to fetch email recipients:", err));
	}, []);

	const addField = useCallback(() => {
		const newField: FormField = {
			name: `field_${value.fields.length + 1}`,
			label: `Field ${value.fields.length + 1}`,
			type: "text",
		};
		onChange({
			...value,
			fields: [...value.fields, newField],
		});
		setExpandedField(value.fields.length);
	}, [value, onChange]);

	const updateField = useCallback(
		(index: number, updates: Partial<FormField>) => {
			const newFields = [...value.fields];
			newFields[index] = { ...newFields[index], ...updates };
			onChange({ ...value, fields: newFields });
		},
		[value, onChange],
	);

	const removeField = useCallback(
		(index: number) => {
			const newFields = value.fields.filter((_, i) => i !== index);
			onChange({ ...value, fields: newFields });
			if (expandedField === index) {
				setExpandedField(null);
			} else if (expandedField !== null && expandedField > index) {
				setExpandedField(expandedField - 1);
			}
		},
		[value, onChange, expandedField],
	);

	const moveField = useCallback(
		(fromIndex: number, toIndex: number) => {
			if (toIndex < 0 || toIndex >= value.fields.length) return;
			const newFields = [...value.fields];
			const [removed] = newFields.splice(fromIndex, 1);
			newFields.splice(toIndex, 0, removed);
			onChange({ ...value, fields: newFields });
			setExpandedField(toIndex);
		},
		[value, onChange],
	);

	const updateOption = useCallback(
		(fieldIndex: number, optionIndex: number, updates: { label?: string; value?: string }) => {
			const field = value.fields[fieldIndex];
			if (!field.options) return;
			const newOptions = [...field.options];
			newOptions[optionIndex] = { ...newOptions[optionIndex], ...updates };
			updateField(fieldIndex, { options: newOptions });
		},
		[value.fields, updateField],
	);

	const addOption = useCallback(
		(fieldIndex: number) => {
			const field = value.fields[fieldIndex];
			const options = field.options || [];
			updateField(fieldIndex, {
				options: [
					...options,
					{ label: `Option ${options.length + 1}`, value: `option_${options.length + 1}` },
				],
			});
		},
		[value.fields, updateField],
	);

	const removeOption = useCallback(
		(fieldIndex: number, optionIndex: number) => {
			const field = value.fields[fieldIndex];
			if (!field.options) return;
			const newOptions = field.options.filter((_, i) => i !== optionIndex);
			updateField(fieldIndex, { options: newOptions });
		},
		[value.fields, updateField],
	);

	return (
		<div className="space-y-6">
			{/* Info banner for client-side forms */}
			<div className="p-3 border border-[#D1D1D1] bg-[#FAFAF9]">
				<p className="text-[10px] font-mono text-[#555]">
					<strong className="text-[#1A1A1A]">TIP:</strong> For dynamic client-side forms, use{" "}
					<code className="px-1 py-0.5 bg-white border border-[#D1D1D1] text-[9px]">
						window.ansa.registerFormSchema()
					</code>{" "}
					in JavaScript instead.
				</p>
			</div>

			{/* Form Fields */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
						Form Fields
					</h4>
					<button
						type="button"
						onClick={addField}
						className="text-[10px] font-bold uppercase tracking-wider border border-[#D1D1D1] px-3 py-1.5 bg-white hover:bg-[#F9F9F9] transition-colors flex items-center gap-1"
					>
						<Plus className="w-3 h-3" />
						Add Field
					</button>
				</div>

				{value.fields.length === 0 ? (
					<div className="py-8 text-center border border-dashed border-[#D1D1D1]">
						<p className="mb-2 text-[#888] text-xs">No fields yet</p>
						<button
							type="button"
							onClick={addField}
							className="text-[10px] font-bold uppercase tracking-wider border border-[#D1D1D1] px-3 py-1.5 bg-white hover:bg-[#F9F9F9] transition-colors inline-flex items-center gap-1"
						>
							<Plus className="w-3 h-3" />
							Add your first field
						</button>
					</div>
				) : (
					<div className="space-y-2">
						{value.fields.map((field, index) => (
							<div
								key={field.name}
								className={`border transition-colors ${
									expandedField === index
										? "border-[#1A1A1A] bg-[#FAFAF9]"
										: "border-[#D1D1D1] bg-white"
								}`}
							>
								{/* Field Header */}
								<div
									className="flex items-center gap-2 p-3 cursor-pointer"
									onClick={() => setExpandedField(expandedField === index ? null : index)}
									onKeyDown={(e) =>
										e.key === "Enter" && setExpandedField(expandedField === index ? null : index)
									}
								>
									<button
										type="button"
										className="cursor-grab text-[#888] hover:text-[#1A1A1A]"
										onMouseDown={(e) => e.stopPropagation()}
									>
										<GripVertical className="w-4 h-4" />
									</button>
									<div className="flex-1 min-w-0">
										<div className="font-medium truncate text-sm">{field.label || field.name}</div>
										<div className="flex items-center gap-2 text-[9px] font-mono text-[#888]">
											<span>{field.name}</span>
											<span>•</span>
											<span>
												{FIELD_TYPES.find((t) => t.value === field.type)?.label || field.type}
											</span>
											{field.validation?.required?.value && (
												<>
													<span>•</span>
													<span className="text-red-600">Required</span>
												</>
											)}
										</div>
									</div>
									<div className="flex items-center gap-1">
										<button
											type="button"
											className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#1A1A1A] disabled:opacity-30"
											disabled={index === 0}
											onClick={(e) => {
												e.stopPropagation();
												moveField(index, index - 1);
											}}
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M5 15l7-7 7 7"
												/>
											</svg>
										</button>
										<button
											type="button"
											className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#1A1A1A] disabled:opacity-30"
											disabled={index === value.fields.length - 1}
											onClick={(e) => {
												e.stopPropagation();
												moveField(index, index + 1);
											}}
										>
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										</button>
										<button
											type="button"
											className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-700"
											onClick={(e) => {
												e.stopPropagation();
												removeField(index);
											}}
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>

								{/* Field Editor (Expanded) */}
								{expandedField === index && (
									<div className="p-4 pt-0 space-y-4 border-t border-[#D1D1D1]">
										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
													Field Name
												</Label>
												<Input
													value={field.name}
													onChange={(e) =>
														updateField(index, {
															name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
														})
													}
													placeholder="field_name"
													className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
												/>
												<p className="text-[9px] text-[#888]">
													Used in form data (lowercase, underscores)
												</p>
											</div>
											<div className="space-y-2">
												<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
													Label
												</Label>
												<Input
													value={field.label}
													onChange={(e) => updateField(index, { label: e.target.value })}
													placeholder="Field Label"
													className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
												/>
											</div>
										</div>

										<div className="grid grid-cols-2 gap-4">
											<div className="space-y-2">
												<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
													Type
												</Label>
												<Select
													value={field.type}
													onValueChange={(v) =>
														updateField(index, { type: v as FormField["type"] })
													}
												>
													<SelectTrigger className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{FIELD_TYPES.map((type) => (
															<SelectItem key={type.value} value={type.value}>
																{type.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</div>
											<div className="space-y-2">
												<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
													Placeholder
												</Label>
												<Input
													value={field.placeholder || ""}
													onChange={(e) =>
														updateField(index, { placeholder: e.target.value || undefined })
													}
													placeholder="Enter placeholder text..."
													className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
												/>
											</div>
										</div>

										<div className="space-y-2">
											<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
												Default Value
											</Label>
											<Input
												value={field.defaultValue || ""}
												onChange={(e) =>
													updateField(index, { defaultValue: e.target.value || undefined })
												}
												placeholder="Default value or {{user.email}} template"
												className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
											/>
											<p className="text-[9px] text-[#888]">
												Use {"{{user.email}}"} or {"{{context.previousResult.field}}"} for dynamic
												values
											</p>
										</div>

										{/* Options for select/multiselect */}
										{(field.type === "select" || field.type === "multiselect") && (
											<div className="space-y-2">
												<div className="flex items-center justify-between">
													<Label className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
														Options
													</Label>
													<button
														type="button"
														onClick={() => addOption(index)}
														className="text-[9px] font-bold uppercase tracking-wider text-[#888] hover:text-[#1A1A1A] flex items-center gap-1"
													>
														<Plus className="w-3 h-3" />
														Add
													</button>
												</div>
												<div className="space-y-2">
													{(field.options || []).map((option, optIndex) => (
														<div key={optIndex} className="flex items-center gap-2">
															<Input
																value={option.label}
																onChange={(e) =>
																	updateOption(index, optIndex, { label: e.target.value })
																}
																placeholder="Label"
																className="flex-1 border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
															/>
															<Input
																value={option.value}
																onChange={(e) =>
																	updateOption(index, optIndex, { value: e.target.value })
																}
																placeholder="Value"
																className="flex-1 font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
															/>
															<button
																type="button"
																className="w-8 h-8 flex items-center justify-center text-red-600 hover:text-red-700"
																onClick={() => removeOption(index, optIndex)}
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													))}
													{(!field.options || field.options.length === 0) && (
														<p className="py-2 text-[9px] text-[#888]">
															No options yet. Add some options above.
														</p>
													)}
												</div>
											</div>
										)}

										{/* Validation */}
										<div className="p-3 space-y-3 rounded-lg bg-muted/30">
											<Label className="text-sm font-medium">Validation</Label>
											<div className="flex items-center gap-2">
												<Switch
													checked={field.validation?.required?.value ?? false}
													onCheckedChange={(checked) =>
														updateField(index, {
															validation: {
																...field.validation,
																required: checked
																	? { value: true, message: "This field is required" }
																	: undefined,
															},
														})
													}
												/>
												<Label className="font-normal">Required</Label>
											</div>

											{(field.type === "text" ||
												field.type === "textarea" ||
												field.type === "email" ||
												field.type === "tel") && (
												<div className="grid grid-cols-2 gap-3">
													<div className="space-y-1">
														<Label className="text-xs">Min Length</Label>
														<Input
															type="number"
															min={0}
															value={field.validation?.minLength?.value ?? ""}
															onChange={(e) =>
																updateField(index, {
																	validation: {
																		...field.validation,
																		minLength: e.target.value
																			? {
																					value: Number(e.target.value),
																					message: `Minimum ${e.target.value} characters`,
																				}
																			: undefined,
																	},
																})
															}
															placeholder="0"
														/>
													</div>
													<div className="space-y-1">
														<Label className="text-xs">Max Length</Label>
														<Input
															type="number"
															min={0}
															value={field.validation?.maxLength?.value ?? ""}
															onChange={(e) =>
																updateField(index, {
																	validation: {
																		...field.validation,
																		maxLength: e.target.value
																			? {
																					value: Number(e.target.value),
																					message: `Maximum ${e.target.value} characters`,
																				}
																			: undefined,
																	},
																})
															}
															placeholder="None"
														/>
													</div>
												</div>
											)}

											{field.type === "number" && (
												<div className="grid grid-cols-2 gap-3">
													<div className="space-y-1">
														<Label className="text-xs">Min Value</Label>
														<Input
															type="number"
															value={field.validation?.min?.value ?? ""}
															onChange={(e) =>
																updateField(index, {
																	validation: {
																		...field.validation,
																		min: e.target.value
																			? {
																					value: Number(e.target.value),
																					message: `Minimum value is ${e.target.value}`,
																				}
																			: undefined,
																	},
																})
															}
															placeholder="None"
														/>
													</div>
													<div className="space-y-1">
														<Label className="text-xs">Max Value</Label>
														<Input
															type="number"
															value={field.validation?.max?.value ?? ""}
															onChange={(e) =>
																updateField(index, {
																	validation: {
																		...field.validation,
																		max: e.target.value
																			? {
																					value: Number(e.target.value),
																					message: `Maximum value is ${e.target.value}`,
																				}
																			: undefined,
																	},
																})
															}
															placeholder="None"
														/>
													</div>
												</div>
											)}

											{(field.type === "text" ||
												field.type === "email" ||
												field.type === "tel") && (
												<div className="space-y-1">
													<Label className="text-xs">Pattern (Regex)</Label>
													<Input
														value={field.validation?.pattern?.value ?? ""}
														onChange={(e) =>
															updateField(index, {
																validation: {
																	...field.validation,
																	pattern: e.target.value
																		? { value: e.target.value, message: "Invalid format" }
																		: undefined,
																},
															})
														}
														placeholder="^[A-Za-z]+$"
														className="font-mono text-sm"
													/>
												</div>
											)}
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>

			{/* Form Settings */}
			<div className="p-4 space-y-4 border rounded-lg bg-muted/30">
				<h4 className="font-medium">Form Settings</h4>
				<div className="space-y-3">
					<div className="space-y-2">
						<Label>Introduction Text</Label>
						<Textarea
							value={value.introText || ""}
							onChange={(e) => onChange({ ...value, introText: e.target.value || undefined })}
							placeholder="Optional text displayed above the form (e.g., 'Please fill out the form below and we'll get back to you shortly.')"
							rows={2}
						/>
					</div>
					<div className="space-y-2">
						<Label>Submit Button Text</Label>
						<Input
							value={value.submitLabel || ""}
							onChange={(e) => onChange({ ...value, submitLabel: e.target.value || undefined })}
							placeholder="Submit"
						/>
					</div>
					<div className="space-y-2">
						<Label>Success Message</Label>
						<Textarea
							value={value.successMessage || ""}
							onChange={(e) => onChange({ ...value, successMessage: e.target.value || undefined })}
							placeholder="Thank you! Your form has been submitted."
							rows={2}
						/>
					</div>
					<div className="space-y-2">
						<Label>Error Message</Label>
						<Textarea
							value={value.errorMessage || ""}
							onChange={(e) => onChange({ ...value, errorMessage: e.target.value || undefined })}
							placeholder="Something went wrong. Please try again."
							rows={2}
						/>
					</div>
				</div>
			</div>

			{/* Submission Actions */}
			<div className="p-4 space-y-4 border rounded-lg bg-muted/30">
				<div className="flex items-center justify-between">
					<div>
						<h4 className="font-medium">Submission Actions</h4>
						<p className="mt-1 text-xs text-muted-foreground">
							Where to send form data when submitted
						</p>
					</div>
					<Select
						value=""
						onValueChange={(v) => {
							if (v === "slack") {
								onPostActionsChange([
									...postActions,
									{
										type: "slack",
										webhookUrl: "",
										messageTemplate: "New form submission:\n{{_toolName}}",
									},
								]);
							} else if (v === "webhook") {
								onPostActionsChange([...postActions, { type: "webhook", url: "" }]);
							} else if (v === "email") {
								// Default to current user if available
								const currentUserId = emailRecipients.find((r) => r.isCurrentUser)?.id;
								onPostActionsChange([
									...postActions,
									{ type: "email", recipientIds: currentUserId ? [currentUserId] : [] },
								]);
							}
						}}
					>
						<SelectTrigger className="w-[160px]">
							<SelectValue placeholder="Add action" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="email">Email Notification</SelectItem>
							<SelectItem value="slack">Slack</SelectItem>
							<SelectItem value="webhook">Webhook</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Default action - always saved to leads */}
				<div className="p-3 border rounded bg-background">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">Save to Submissions</span>
							<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
								Default
							</span>
						</div>
					</div>
					<p className="mt-1 text-xs text-muted-foreground">
						All form submissions are automatically saved and viewable in the Leads page.
					</p>
				</div>

				{/* Additional actions */}
				{postActions.length > 0 && (
					<div className="space-y-3">
						{postActions.map((action, index) => (
							<div
								key={`action-${action.type}-${index}`}
								className="p-3 border rounded bg-background"
							>
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">
										{action.type === "email"
											? "Email Notification"
											: action.type.charAt(0).toUpperCase() + action.type.slice(1)}
									</span>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										className="w-8 h-8"
										onClick={() => {
											const newActions = postActions.filter((_, i) => i !== index);
											onPostActionsChange(newActions);
										}}
									>
										<Trash2 className="w-4 h-4" />
									</Button>
								</div>

								{action.type === "slack" && (
									<div className="space-y-3">
										<div className="space-y-2">
											<Label>Slack Webhook URL</Label>
											<Input
												placeholder="https://hooks.slack.com/services/..."
												value={action.webhookUrl}
												onChange={(e) => {
													const newActions = [...postActions];
													newActions[index] = { ...action, webhookUrl: e.target.value };
													onPostActionsChange(newActions);
												}}
											/>
										</div>
										<div className="space-y-2">
											<Label>Message Template</Label>
											<Textarea
												placeholder="New {{_toolName}} submission:&#10;Name: {{name}}&#10;Email: {{email}}"
												value={action.messageTemplate}
												onChange={(e) => {
													const newActions = [...postActions];
													newActions[index] = { ...action, messageTemplate: e.target.value };
													onPostActionsChange(newActions);
												}}
												rows={4}
											/>
											<p className="text-xs text-muted-foreground">
												Use {"{{fieldName}}"} to insert form field values. {"{{_toolName}}"} inserts
												the tool name.
											</p>
										</div>
									</div>
								)}

								{action.type === "webhook" && (
									<div className="space-y-2">
										<Label>Webhook URL</Label>
										<Input
											placeholder="https://your-api.com/webhook"
											value={action.url}
											onChange={(e) => {
												const newActions = [...postActions];
												newActions[index] = { ...action, url: e.target.value };
												onPostActionsChange(newActions);
											}}
										/>
										<p className="text-xs text-muted-foreground">
											Form data will be POSTed to this URL as JSON.
										</p>
									</div>
								)}

								{action.type === "email" && (
									<div className="space-y-3">
										<div className="space-y-2">
											<Label>Send notification to</Label>
											{emailRecipients.length === 0 ? (
												<p className="text-sm text-muted-foreground">Loading recipients...</p>
											) : (
												<div className="space-y-2">
													{emailRecipients.map((recipient) => (
														<div key={recipient.id} className="flex items-center space-x-2">
															<Checkbox
																id={`recipient-${index}-${recipient.id}`}
																checked={action.recipientIds?.includes(recipient.id) ?? false}
																onCheckedChange={(checked) => {
																	const newActions = [...postActions];
																	const currentRecipients = action.recipientIds || [];
																	if (checked) {
																		newActions[index] = {
																			...action,
																			recipientIds: [...currentRecipients, recipient.id],
																		};
																	} else {
																		newActions[index] = {
																			...action,
																			recipientIds: currentRecipients.filter(
																				(id) => id !== recipient.id,
																			),
																		};
																	}
																	onPostActionsChange(newActions);
																}}
															/>
															<label
																htmlFor={`recipient-${index}-${recipient.id}`}
																className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
															>
																{recipient.isCurrentUser ? "Me" : recipient.name || "Team member"} (
																{recipient.email})
															</label>
														</div>
													))}
												</div>
											)}
										</div>
										<div className="space-y-2">
											<Label>Subject (optional)</Label>
											<Input
												placeholder="New form submission: {{_toolName}}"
												value={action.subject || ""}
												onChange={(e) => {
													const newActions = [...postActions];
													newActions[index] = { ...action, subject: e.target.value || undefined };
													onPostActionsChange(newActions);
												}}
											/>
											<p className="text-xs text-muted-foreground">
												Leave empty for default subject. Use {"{{_toolName}}"} to insert the form
												name.
											</p>
										</div>
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// Lead capture template
export const LEAD_CAPTURE_TEMPLATE: FormSchema = {
	fields: [
		{
			name: "name",
			label: "Full Name",
			type: "text",
			placeholder: "Enter your name",
			validation: {
				required: { value: true, message: "Name is required" },
			},
		},
		{
			name: "email",
			label: "Email Address",
			type: "email",
			placeholder: "you@example.com",
			validation: {
				required: { value: true, message: "Email is required" },
			},
		},
		{
			name: "company",
			label: "Company",
			type: "text",
			placeholder: "Your company name",
		},
		{
			name: "message",
			label: "Message",
			type: "textarea",
			placeholder: "How can we help you?",
		},
	],
	submitLabel: "Get in Touch",
	successMessage: "Thanks! We'll be in touch soon.",
	errorMessage: "Something went wrong. Please try again.",
};
