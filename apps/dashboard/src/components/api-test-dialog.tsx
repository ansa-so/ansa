"use client";

import {
	Code,
	GalleryHorizontal,
	Grid3X3,
	Image,
	MousePointerClick,
	Pencil,
	Play,
	RectangleHorizontal,
	RefreshCw,
	Search,
	Table,
	Type,
	X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { JsonNode, type JsonValue, subtreeMatches } from "@/components/json-tree";
import { BlockRenderer } from "@/components/tool-blocks";
import type { DisplayConfig } from "@/components/tool-blocks/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { testToolHttp } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ApiTestDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	httpUrl: string;
	httpMethod: "GET" | "POST" | "PUT" | "DELETE";
	httpHeaders: Record<string, string>;
	inputSchema: {
		properties?: Record<string, { type: string; description?: string; default?: string }>;
		required?: string[];
	};
	onFieldSelect: (path: string, targetField: string) => void;
	/** Callback when a successful test response is received */
	onTestComplete?: (response: unknown) => void;
	/** Pre-fetched response data - skips the API test step */
	initialResponse?: unknown;
	/** Initial field mappings to pre-populate */
	initialMappings?: Record<string, string>;
	/** Whether the display type uses multiple items (carousel, grid, table) */
	isMultiItem?: boolean;
	/** Callback when array data path is detected from field selection */
	onDataPathDetected?: (dataPath: string) => void;
	/** Pre-set data path */
	initialDataPath?: string;
	/** Current display type - enables full configure mode when provided */
	displayType?: string;
	/** Callback when display type changes */
	onDisplayTypeChange?: (type: string) => void;
	/** Current text template for text display type */
	textTemplate?: string;
	/** Callback when text template changes */
	onTextTemplateChange?: (template: string) => void;
	/** Tool name for preview */
	toolName?: string;
}

// Resolve a field mapping expression against response data for preview
function resolvePreview(data: unknown, expression: string): string | null {
	if (!data || !expression) return null;

	function getValueByPath(obj: unknown, path: string): unknown {
		if (!obj || typeof obj !== "object") return undefined;
		const cleanPath = path.replace(/^\$\.?/, "");
		if (!cleanPath) return obj;
		const parts = cleanPath.split(".");
		let current: unknown = obj;
		for (const part of parts) {
			if (current === null || current === undefined) return undefined;
			if (typeof current !== "object") return undefined;
			const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
			if (arrayMatch) {
				const [, key, indexStr] = arrayMatch;
				current = (current as Record<string, unknown>)[key];
				if (Array.isArray(current)) current = current[parseInt(indexStr, 10)];
				else return undefined;
			} else {
				current = (current as Record<string, unknown>)[part];
			}
		}
		return current;
	}

	try {
		if (!expression.includes("{{")) {
			const fallbackMatch = expression.match(/^(.+?)\s*\|\|\s*(.+)$/);
			if (fallbackMatch) {
				const [, pathPart, defaultPart] = fallbackMatch;
				const value = getValueByPath(data, pathPart.trim());
				if (value !== undefined && value !== null && value !== "") return String(value);
				return defaultPart.trim();
			}
			const value = getValueByPath(data, expression);
			if (value !== undefined && value !== null) return String(value);
			return null;
		}
		const result = expression.replace(/\{\{(.+?)\}\}/g, (_, path) => {
			const value = getValueByPath(data, path.trim());
			return value !== undefined && value !== null ? String(value) : "";
		});
		const templateFallback = result.match(/^(.+?)\s*\|\|\s*(.+)$/);
		if (templateFallback) {
			const [, main, fallback] = templateFallback;
			return main.trim() || fallback.trim();
		}
		return result;
	} catch {
		return null;
	}
}

const DISPLAY_FIELDS = [
	{ key: "title", label: "Title", description: "Main title/name" },
	{ key: "description", label: "Description", description: "Item description" },
	{ key: "price", label: "Price", description: "Price value" },
	{ key: "image", label: "Image", description: "Image URL" },
	{ key: "url", label: "URL", description: "Link URL" },
];

const DIALOG_DISPLAY_TYPES = [
	{ value: "text", label: "Text", icon: Type },
	{ value: "product_card", label: "Card", icon: RectangleHorizontal },
	{ value: "product_carousel", label: "Carousel", icon: GalleryHorizontal },
	{ value: "product_grid", label: "Grid", icon: Grid3X3 },
	{ value: "table", label: "Table", icon: Table },
	{ value: "image", label: "Image", icon: Image },
	{ value: "buttons", label: "Buttons", icon: MousePointerClick },
	{ value: "custom", label: "Custom", icon: Code },
] as const;

export function ApiTestDialog({
	open,
	onOpenChange,
	httpUrl,
	httpMethod,
	httpHeaders,
	inputSchema,
	onFieldSelect,
	onTestComplete,
	initialResponse,
	initialMappings,
	isMultiItem,
	onDataPathDetected,
	initialDataPath,
	displayType,
	onDisplayTypeChange,
	textTemplate,
	onTextTemplateChange,
	toolName,
}: ApiTestDialogProps) {
	const isConfigureMode = !!onDisplayTypeChange;
	const [loading, setLoading] = useState(false);
	const [response, setResponse] = useState<{
		success: boolean;
		status?: number;
		data?: unknown;
		error?: string;
	} | null>(null);
	const [inputValues, setInputValues] = useState<Record<string, string>>({});
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [mappingTarget, setMappingTarget] = useState<string | null>(null);
	const [mappings, setMappings] = useState<Record<string, string>>(initialMappings || {});
	const [expanded, setExpanded] = useState<Record<string, boolean>>({});
	const [editingField, setEditingField] = useState<string | null>(null);
	const [editValue, setEditValue] = useState("");
	const [filterQuery, setFilterQuery] = useState("");
	const [dataPath, setDataPath] = useState<string | null>(initialDataPath || null);

	// Get the first item from the detected array, or the root response
	const previewData = useMemo(() => {
		if (!response?.data) return null;
		if (dataPath && isMultiItem) {
			// Traverse to the array using the dataPath
			let current: unknown = response.data;
			for (const part of dataPath.split(".")) {
				if (current && typeof current === "object") {
					current = (current as Record<string, unknown>)[part];
				} else {
					return response.data;
				}
			}
			if (Array.isArray(current) && current.length > 0) {
				return current[0];
			}
		}
		return response.data;
	}, [response?.data, dataPath, isMultiItem]);

	// Compute previews for all mapped fields
	const previews = useMemo(() => {
		if (!previewData) return {};
		const result: Record<string, string | null> = {};
		for (const [key, expr] of Object.entries(mappings)) {
			result[key] = resolvePreview(previewData, expr);
		}
		return result;
	}, [previewData, mappings]);

	// Compute leaf paths from response data for text template click-to-insert
	const dialogLeafPaths = useMemo(() => {
		if (!previewData) return [];
		const paths: string[] = [];
		const walk = (obj: unknown, prefix: string) => {
			if (obj === null || obj === undefined) return;
			if (Array.isArray(obj)) {
				if (obj.length > 0 && obj[0] && typeof obj[0] === "object") walk(obj[0], prefix);
				return;
			}
			if (typeof obj === "object") {
				for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
					const path = prefix ? `${prefix}.${key}` : key;
					if (value && typeof value === "object" && !Array.isArray(value)) walk(value, path);
					else if (
						Array.isArray(value) &&
						value.length > 0 &&
						value[0] &&
						typeof value[0] === "object"
					)
						walk(value[0], path);
					else paths.push(path);
				}
			}
		};
		walk(previewData, "");
		return paths;
	}, [previewData]);

	// Sync response state when initialResponse prop changes or dialog opens
	useEffect(() => {
		if (open && initialResponse) {
			setResponse({ success: true, status: 200, data: initialResponse });
		}
	}, [open, initialResponse]);

	// Sync mappings when initialMappings change
	useEffect(() => {
		if (initialMappings) {
			setMappings(initialMappings);
		}
	}, [initialMappings]);

	const inputProperties = inputSchema?.properties || {};

	// Pre-populate input values from schema defaults when dialog opens
	useEffect(() => {
		if (open && inputProperties) {
			const defaults: Record<string, string> = {};
			for (const [key, prop] of Object.entries(inputProperties)) {
				if (prop.default !== undefined && prop.default !== "") {
					defaults[key] = String(prop.default);
				}
			}
			if (Object.keys(defaults).length > 0) {
				setInputValues((prev) => {
					// Only fill in fields that don't already have a value
					const merged = { ...defaults };
					for (const [k, v] of Object.entries(prev)) {
						if (v) merged[k] = v;
					}
					return merged;
				});
			}
		}
	}, [open, inputProperties]);

	const handleTest = async () => {
		setLoading(true);
		setResponse(null);

		try {
			const input: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(inputValues)) {
				input[key] = value;
			}

			const result = await testToolHttp({
				url: httpUrl,
				method: httpMethod,
				headers: httpHeaders,
				input,
			});

			setResponse(result);
			if (result.success && result.data) {
				onTestComplete?.(result.data);
			}
		} catch (error) {
			setResponse({
				success: false,
				error: error instanceof Error ? error.message : "Request failed",
			});
		} finally {
			setLoading(false);
		}
	};

	const handleFieldClick = (path: string) => {
		setSelectedField(path);
		if (mappingTarget) {
			let effectivePath = path;

			// For multi-item displays, auto-detect array path from selections like "data[0].provider"
			if (isMultiItem) {
				const arrayMatch = path.match(/^(.+?)\[(\d+)\](?:\.(.+))?$/);
				if (arrayMatch) {
					const [, arrayPath, , relativePath] = arrayMatch;
					// Set the data path if not already set, or if it matches
					if (!dataPath || dataPath === arrayPath) {
						setDataPath(arrayPath);
						onDataPathDetected?.(arrayPath);
						effectivePath = relativePath || arrayPath;
					} else if (dataPath !== arrayPath) {
						// Different array — warn but still allow
						setDataPath(arrayPath);
						onDataPathDetected?.(arrayPath);
						effectivePath = relativePath || arrayPath;
					}
				} else if (dataPath && path.startsWith(`${dataPath}.`)) {
					// Already have a dataPath, and this path includes it — strip the prefix
					// e.g. dataPath="data", path="data.provider" → "provider"
					effectivePath = path.slice(dataPath.length + 1);
				}
			}

			const newMappings = { ...mappings, [mappingTarget]: effectivePath };
			setMappings(newMappings);
			onFieldSelect(effectivePath, mappingTarget);
			setMappingTarget(null);
		}
	};

	const handleToggle = (path: string) => {
		setExpanded((prev) => ({ ...prev, [path]: prev[path] === false }));
	};

	const handleApplyMappings = () => {
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle>
						{isConfigureMode ? "Test API & Configure Display" : "Test API & Map Fields"}
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 space-y-4 overflow-x-hidden overflow-y-auto">
					{/* Input Parameters - hide if we have initialResponse or after successful test */}
					{!initialResponse && !response?.success && Object.keys(inputProperties).length > 0 && (
						<div className="space-y-2">
							<Label className="font-mono text-xs text-gray-500 uppercase">
								Test Input Parameters
							</Label>
							<div className="grid grid-cols-2 gap-2">
								{Object.entries(inputProperties).map(([key, prop]) => (
									<div key={key}>
										<Label className="text-xs text-gray-600">{key}</Label>
										<Input
											placeholder={prop.description || key}
											value={inputValues[key] || ""}
											onChange={(e) =>
												setInputValues((prev) => ({ ...prev, [key]: e.target.value }))
											}
											className="h-8 text-sm"
										/>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Test Button - hide if we have initialResponse or after successful test */}
					{!initialResponse && !response?.success && (
						<Button onClick={handleTest} disabled={loading || !httpUrl} className="w-full">
							<Play className="w-4 h-4 mr-2" />
							{loading ? "Testing..." : "Send Test Request"}
						</Button>
					)}

					{/* Re-test bar - show after successful test (not for initialResponse) */}
					{!initialResponse && response?.success && (
						<div className="flex items-center justify-between p-3 bg-[#F3F2EE] border border-[#D1D1D1] rounded-md">
							<div className="flex items-center gap-2 text-sm">
								<span className="text-green-600">✓</span>
								<span className="text-[#555]">API Response ({response.status})</span>
							</div>
							<Button variant="outline" size="sm" onClick={() => setResponse(null)}>
								<RefreshCw className="w-3 h-3 mr-1" /> Re-test
							</Button>
						</div>
					)}

					{/* Display Type Selector - when in configure mode */}
					{response?.success && !response.error && isConfigureMode && (
						<div>
							<Label className="font-mono text-xs text-gray-500 uppercase">Display Type</Label>
							<div className="flex flex-wrap gap-2 mt-2">
								{DIALOG_DISPLAY_TYPES.map(({ value, label, icon: Icon }) => (
									<button
										key={value}
										type="button"
										onClick={() => onDisplayTypeChange?.(value)}
										className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase border transition-colors ${
											displayType === value
												? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
												: "bg-white border-[#D1D1D1] hover:border-[#1A1A1A]"
										}`}
									>
										<Icon size={14} />
										{label}
									</button>
								))}
							</div>
						</div>
					)}

					{/* Text Template - for text display type in configure mode (two-column with response tree) */}
					{response?.success &&
						!response.error &&
						isConfigureMode &&
						displayType === "text" &&
						onTextTemplateChange && (
							<div className="grid grid-cols-2 gap-4">
								{/* Response Tree (left column) */}
								<div className="space-y-2">
									<Label className="font-mono text-xs text-gray-500 uppercase">
										API Response ({response.status} ✓)
									</Label>
									<div className="relative">
										<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
										<Input
											value={filterQuery}
											onChange={(e) => setFilterQuery(e.target.value)}
											placeholder="Filter response..."
											className="h-7 pl-7 text-xs"
										/>
										{filterQuery && (
											<button
												type="button"
												onClick={() => setFilterQuery("")}
												className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
											>
												<X className="w-3 h-3" />
											</button>
										)}
									</div>
									<div className="bg-gray-50 border rounded-md p-3 max-h-[300px] overflow-auto text-sm font-mono">
										<JsonNode
											data={response.data as JsonValue}
											path=""
											onSelect={(path) => {
												setSelectedField(path);
												onTextTemplateChange(`${textTemplate || ""}{{${path}}}`);
											}}
											selectedField={selectedField}
											expanded={expanded}
											onToggle={handleToggle}
											filter={filterQuery}
										/>
									</div>
									<p className="text-xs text-blue-600">
										Click a field to insert it into the text template
									</p>
								</div>

								{/* Text Template (right column) */}
								<div className="space-y-2">
									<Label className="font-mono text-xs text-gray-500 uppercase">Text Template</Label>
									<Textarea
										value={textTemplate || ""}
										onChange={(e) => onTextTemplateChange(e.target.value)}
										placeholder="{{name}} — {{price}} per night ({{provider}})"
										rows={3}
										className="font-mono text-sm"
									/>
									<p className="text-[10px] text-[#888]">
										Use {"{{field}}"} to insert values. Leave blank to let the AI format the
										response.
									</p>
									{dialogLeafPaths.length > 0 && (
										<div className="p-3 bg-[#FAFAF9] border border-[#D1D1D1]">
											<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
												Available Fields — click to insert
											</div>
											<div className="flex flex-wrap gap-1.5">
												{dialogLeafPaths.map((path) => (
													<button
														key={path}
														type="button"
														onClick={() => onTextTemplateChange(`${textTemplate || ""}{{${path}}}`)}
														className="px-2 py-0.5 bg-white border border-[#D1D1D1] hover:border-[#1A1A1A] text-[10px] font-mono text-[#555] transition-colors"
													>
														{path}
													</button>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						)}

					{/* Error Response */}
					{response && (response.error || !response.success) && (
						<div className="space-y-2">
							<Label className="font-mono text-xs text-gray-500 uppercase">
								API Response {response.status ? `(${response.status})` : ""} ✗
							</Label>
							<div className="p-4 border border-red-200 rounded-md bg-red-50">
								<p className="text-sm font-medium text-red-600">
									{response.error || "Request failed"}
								</p>
								{response.data ? (
									<pre className="mt-2 text-xs text-red-500 overflow-auto max-h-[200px]">
										{JSON.stringify(response.data, null, 2)}
									</pre>
								) : null}
							</div>
						</div>
					)}

					{/* Success Response & Mapping - hide for text type in configure mode */}
					{response?.success && !response.error && (!isConfigureMode || displayType !== "text") && (
						<div className="grid grid-cols-2 gap-4">
							{/* Response Tree */}
							<div className="space-y-2">
								<Label className="font-mono text-xs text-gray-500 uppercase">
									API Response ({response.status} ✓)
								</Label>
								<div className="relative">
									<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
									<Input
										value={filterQuery}
										onChange={(e) => setFilterQuery(e.target.value)}
										placeholder="Filter response..."
										className="h-7 pl-7 text-xs"
									/>
									{filterQuery && (
										<button
											type="button"
											onClick={() => setFilterQuery("")}
											className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
										>
											<X className="w-3 h-3" />
										</button>
									)}
								</div>
								<div className="bg-gray-50 border rounded-md p-3 max-h-[300px] overflow-auto text-sm font-mono">
									<JsonNode
										data={response.data as JsonValue}
										path=""
										onSelect={handleFieldClick}
										selectedField={selectedField}
										expanded={expanded}
										onToggle={handleToggle}
										filter={filterQuery}
									/>
								</div>
								{mappingTarget && (
									<p className="text-xs text-blue-600">
										Click a field in the response to map it to &quot;{mappingTarget}&quot;
									</p>
								)}
							</div>

							{/* Field Mapping */}
							<div className="space-y-2">
								<Label className="font-mono text-xs text-gray-500 uppercase">Field Mappings</Label>
								{isMultiItem && dataPath && (
									<div className="flex items-center gap-2 p-2 text-xs bg-blue-50 border border-blue-200 rounded-md">
										<span className="text-blue-700">
											Iterating over{" "}
											<code className="font-mono bg-blue-100 px-1 rounded">{dataPath}</code> array —
											mappings apply to each item
										</span>
										<button
											type="button"
											onClick={() => {
												setDataPath(null);
												onDataPathDetected?.("");
											}}
											className="ml-auto text-blue-400 hover:text-blue-600"
										>
											<X className="w-3 h-3" />
										</button>
									</div>
								)}
								{isMultiItem && !dataPath && (
									<p className="text-[10px] text-amber-600">
										Select a field from an array item (e.g. data[0].name) to auto-detect the
										iteration path
									</p>
								)}
								<div className="space-y-2">
									{DISPLAY_FIELDS.map((field) => (
										<div
											key={field.key}
											className={cn(
												"p-2 border rounded-md bg-white",
												mappingTarget === field.key && "border-blue-500 bg-blue-50",
											)}
										>
											<div className="flex items-center gap-2">
												<div className="flex-1 min-w-0">
													<div className="text-sm font-medium">{field.label}</div>
													<div className="text-xs text-gray-500">{field.description}</div>
												</div>
												{mappings[field.key] && editingField !== field.key ? (
													<div className="flex-shrink-0">
														<div className="flex items-center gap-1">
															<code className="px-2 py-1 text-xs bg-gray-100 rounded max-w-[160px] truncate block">
																{mappings[field.key]}
															</code>
															<button
																type="button"
																onClick={() => {
																	setEditingField(field.key);
																	setEditValue(mappings[field.key]);
																}}
																className="text-gray-400 hover:text-blue-500"
																title="Edit expression"
															>
																<Pencil className="w-3 h-3" />
															</button>
															<button
																type="button"
																onClick={() => {
																	setMappings((prev) => {
																		const next = { ...prev };
																		delete next[field.key];
																		return next;
																	});
																}}
																className="text-gray-400 hover:text-red-500"
															>
																<X className="w-3 h-3" />
															</button>
														</div>
														{previews[field.key] != null && (
															<div
																className="mt-1 text-[10px] text-gray-500 truncate max-w-[220px]"
																title={previews[field.key]!}
															>
																→ {previews[field.key]}
															</div>
														)}
													</div>
												) : editingField !== field.key ? (
													<div className="flex items-center gap-1">
														<Button
															variant="outline"
															size="sm"
															onClick={() => setMappingTarget(field.key)}
															className="text-xs"
														>
															Select Field
														</Button>
														<Button
															variant="outline"
															size="sm"
															onClick={() => {
																setEditingField(field.key);
																setEditValue("");
															}}
															className="text-xs"
															title="Write a custom expression"
														>
															<Pencil className="w-3 h-3" />
														</Button>
													</div>
												) : null}
											</div>
											{editingField === field.key && (
												<div className="mt-2 space-y-1">
													<Input
														value={editValue}
														onChange={(e) => setEditValue(e.target.value)}
														placeholder="e.g. https://example.com/{{slug}} or price || $0.00"
														className="h-7 text-xs font-mono"
														autoFocus
														onKeyDown={(e) => {
															if (e.key === "Enter" && editValue.trim()) {
																const newMappings = { ...mappings, [field.key]: editValue.trim() };
																setMappings(newMappings);
																onFieldSelect(editValue.trim(), field.key);
																setEditingField(null);
															} else if (e.key === "Escape") {
																setEditingField(null);
															}
														}}
													/>
													<div className="flex items-center gap-1">
														<Button
															variant="outline"
															size="sm"
															className="h-6 text-[10px]"
															onClick={() => {
																if (editValue.trim()) {
																	const newMappings = {
																		...mappings,
																		[field.key]: editValue.trim(),
																	};
																	setMappings(newMappings);
																	onFieldSelect(editValue.trim(), field.key);
																}
																setEditingField(null);
															}}
														>
															Save
														</Button>
														<Button
															variant="ghost"
															size="sm"
															className="h-6 text-[10px]"
															onClick={() => setEditingField(null)}
														>
															Cancel
														</Button>
													</div>
													{editValue.trim() && previewData
														? (() => {
																const preview = resolvePreview(previewData, editValue.trim());
																return preview != null ? (
																	<p
																		className="text-[10px] text-emerald-600 truncate"
																		title={preview}
																	>
																		Preview: {preview}
																	</p>
																) : null;
															})()
														: null}
													<p className="text-[10px] text-gray-400">
														Use <code className="bg-gray-100 px-0.5">{"{{field.path}}"}</code> for
														templates, <code className="bg-gray-100 px-0.5">path || default</code>{" "}
														for fallbacks
													</p>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Live Preview - in configure mode */}
				{response?.success &&
					!response.error &&
					isConfigureMode &&
					(displayType !== "text" || textTemplate) && (
						<div className="px-1">
							<Label className="font-mono text-xs text-gray-500 uppercase">Preview</Label>
							<div className="border border-[#D1D1D1] rounded-lg bg-white p-4 mt-2">
								<BlockRenderer
									block={{
										type: "tool_result",
										toolName: toolName || "preview",
										result: response.data,
										displayConfig: {
											type: (displayType || "text") as DisplayConfig["type"],
											...(Object.keys(mappings).length > 0 && { fieldMappings: mappings }),
											...(dataPath && { dataPath }),
											...(displayType === "text" && textTemplate && { textFallback: textTemplate }),
										},
									}}
								/>
							</div>
							<p className="text-[10px] text-[#888] mt-1">
								This is how the tool result will appear in the chat widget.
							</p>
						</div>
					)}

				{/* Footer */}
				{response?.success &&
					!response.error &&
					(isConfigureMode ? (
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button variant="outline" onClick={() => onOpenChange(false)}>
								Cancel
							</Button>
							<Button onClick={handleApplyMappings}>Apply</Button>
						</div>
					) : (
						Object.keys(mappings).length > 0 && (
							<div className="flex justify-end gap-2 pt-4 border-t">
								<Button variant="outline" onClick={() => onOpenChange(false)}>
									Cancel
								</Button>
								<Button onClick={handleApplyMappings}>Apply Mappings</Button>
							</div>
						)
					))}
			</DialogContent>
		</Dialog>
	);
}
