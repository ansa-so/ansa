"use client";

import {
	ArrowLeft,
	ArrowRight,
	Check,
	ChevronDown,
	ChevronUp,
	GalleryHorizontal,
	Loader2,
	Lock,
	RectangleHorizontal,
	RefreshCw,
	Search,
	Settings,
	Table,
	Trash2,
	Type,
	Undo2,
	X,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiTestDialog } from "@/components/api-test-dialog";
import { JsonNode, type JsonValue } from "@/components/json-tree";
import { BlockRenderer } from "@/components/tool-blocks";
import type { DisplayConfig } from "@/components/tool-blocks/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	analyzeApiUrl,
	createToolFromDiscovery,
	type DetectedParam,
	type DiscoveryResult,
} from "@/lib/api";

// Display type options with icons
const DISPLAY_TYPES = [
	{ value: "text", label: "Text", icon: Type },
	{ value: "product_card", label: "Card", icon: RectangleHorizontal },
	{ value: "product_carousel", label: "Carousel", icon: GalleryHorizontal },
	{ value: "table", label: "Table", icon: Table },
] as const;

type Step = "url" | "review" | "configure";

export default function DiscoverApiPage() {
	const router = useRouter();
	const { currentAgent } = useAgent();

	const [step, setStep] = useState<Step>("url");
	const [url, setUrl] = useState("");
	const [method, setMethod] = useState<"GET" | "POST">("GET");
	const [showHeaders, setShowHeaders] = useState(false);
	const [headers, setHeaders] = useState<Record<string, string>>({});
	const [headerKey, setHeaderKey] = useState("");
	const [headerValue, setHeaderValue] = useState("");

	const [analyzing, setAnalyzing] = useState(false);
	const [refetching, setRefetching] = useState(false);
	const [result, setResult] = useState<DiscoveryResult | null>(null);

	// Editable fields from discovery
	const [params, setParams] = useState<DetectedParam[]>([]);
	const [baseUrlTemplate, setBaseUrlTemplate] = useState("");
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [displayType, setDisplayType] = useState("text");
	const [fieldMappings, setFieldMappings] = useState<Record<string, string>>({});
	const [dataPath, setDataPath] = useState<string | null>(null);
	const [textTemplate, setTextTemplate] = useState("");
	const [fieldSearch, setFieldSearch] = useState("");
	const [treeExpanded, setTreeExpanded] = useState<Record<string, boolean>>({});
	const [selectedField, setSelectedField] = useState<string | null>(null);
	const [apiTestOpen, setApiTestOpen] = useState(false);

	const handleTreeToggle = useCallback((path: string) => {
		setTreeExpanded((prev) => ({ ...prev, [path]: prev[path] === false }));
	}, []);

	const handleFieldSelect = useCallback((path: string) => {
		setSelectedField(path);
		setTextTemplate((prev) => `${prev}{{${path}}}`);
	}, []);

	// Compute the effective URL template from base + param states
	const effectiveUrlTemplate = useMemo(() => {
		let template = baseUrlTemplate;
		for (const param of params) {
			if (param.hardcoded) {
				template = template.replace(param.placeholder, param.originalValue);
			} else if (param.removed) {
				if (param.isQueryParam) {
					const qIndex = template.indexOf("?");
					if (qIndex !== -1) {
						const base = template.substring(0, qIndex);
						const queryString = template.substring(qIndex + 1);
						const pairs = queryString
							.split("&")
							.filter((pair) => !pair.includes(`=${param.placeholder}`));
						template = pairs.length > 0 ? `${base}?${pairs.join("&")}` : base;
					}
				} else {
					template = template.replace(`/${param.placeholder}`, "");
				}
			}
		}
		return template;
	}, [baseUrlTemplate, params]);

	// Check if the sample response is valid JSON (not an error/non-JSON response)
	const isResponseJson = useMemo(() => {
		if (!result?.sampleResponse) return false;
		const resp = result.sampleResponse as Record<string, unknown>;
		return !resp._warning;
	}, [result]);

	// Pre-populate field mappings from discovery suggestions
	useEffect(() => {
		if (result?.suggestedDisplayConfig?.fieldMappings) {
			setFieldMappings(result.suggestedDisplayConfig.fieldMappings as Record<string, string>);
		}
	}, [result]);

	const [saving, setSaving] = useState(false);

	const handleAddHeader = () => {
		if (headerKey && headerValue) {
			setHeaders((prev) => ({ ...prev, [headerKey]: headerValue }));
			setHeaderKey("");
			setHeaderValue("");
		}
	};

	const handleRemoveHeader = (key: string) => {
		setHeaders((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});
	};

	const handleAnalyze = async () => {
		if (!url) {
			toast.error("Please enter a URL");
			return;
		}

		// Auto-prepend https:// if no protocol is specified
		let normalizedUrl = url.trim();
		if (!normalizedUrl.match(/^https?:\/\//i)) {
			normalizedUrl = `https://${normalizedUrl}`;
		}

		try {
			new URL(normalizedUrl);
		} catch {
			toast.error("Please enter a valid URL");
			return;
		}

		// Update the URL state with the normalized version
		setUrl(normalizedUrl);

		setAnalyzing(true);
		try {
			const discoveryResult = await analyzeApiUrl(normalizedUrl, {
				method,
				headers: Object.keys(headers).length > 0 ? headers : undefined,
			});

			setResult(discoveryResult);
			setParams(discoveryResult.detectedParams);
			setBaseUrlTemplate(discoveryResult.urlTemplate);
			setName(discoveryResult.suggestedName);
			setDescription(discoveryResult.suggestedDescription);
			setDisplayType(discoveryResult.suggestedDisplayConfig.type);

			setStep("review");
		} catch (err) {
			console.error("Analysis failed:", err);
			toast.error(err instanceof Error ? err.message : "Failed to analyze API");
		} finally {
			setAnalyzing(false);
		}
	};

	const handleRefetch = async () => {
		// Build a concrete URL by replacing placeholders with values
		let concreteUrl = effectiveUrlTemplate;
		for (const param of params) {
			if (!param.removed && !param.hardcoded) {
				concreteUrl = concreteUrl.replace(
					param.placeholder,
					param.defaultValue || param.originalValue,
				);
			}
		}

		setRefetching(true);
		try {
			const discoveryResult = await analyzeApiUrl(concreteUrl, {
				method,
				headers: Object.keys(headers).length > 0 ? headers : undefined,
			});

			// Update only the sample response — keep user's param/name/description edits
			setResult((prev) => ({
				...discoveryResult,
				// Preserve existing display config suggestions if user hasn't changed
				suggestedDisplayConfig:
					prev?.suggestedDisplayConfig ?? discoveryResult.suggestedDisplayConfig,
			}));
			toast.success("API response updated");
		} catch (err) {
			console.error("Refetch failed:", err);
			toast.error(err instanceof Error ? err.message : "Failed to refetch API");
		} finally {
			setRefetching(false);
		}
	};

	const handleParamNameChange = (index: number, newName: string) => {
		setParams((prev) => {
			const updated = [...prev];
			const oldPlaceholder = updated[index].placeholder;
			const newPlaceholder = `\${${newName}}`;
			updated[index] = { ...updated[index], name: newName, placeholder: newPlaceholder };

			// Update base URL template
			setBaseUrlTemplate((prev) => prev.replace(oldPlaceholder, newPlaceholder));

			return updated;
		});
	};

	const handleHardcodeParam = (index: number) => {
		setParams((prev) => {
			const updated = [...prev];
			const param = updated[index];
			updated[index] = { ...param, hardcoded: !param.hardcoded, removed: false };
			return updated;
		});
	};

	const handleRemoveParam = (index: number) => {
		setParams((prev) => {
			const updated = [...prev];
			const param = updated[index];
			updated[index] = {
				...param,
				removed: !param.removed,
				hardcoded: false,
				defaultValue: undefined,
			};
			return updated;
		});
	};

	const handleDefaultValueChange = (index: number, value: string) => {
		setParams((prev) => {
			const updated = [...prev];
			updated[index] = { ...updated[index], defaultValue: value || undefined };
			return updated;
		});
	};

	const handleSave = async () => {
		if (!currentAgent) {
			toast.error("No agent selected");
			return;
		}

		if (!name.match(/^[a-z_][a-z0-9_]*$/)) {
			toast.error("Tool name must be lowercase with underscores (e.g., get_property)");
			return;
		}

		setSaving(true);
		try {
			const activeParams = params.filter((p) => !p.removed && !p.hardcoded);
			const inputSchema = {
				type: "object" as const,
				properties: Object.fromEntries(
					activeParams.map((p) => [
						p.name,
						{
							type: "string",
							description: `${p.type === "numeric_id" ? "ID" : p.type} for ${p.name.replace(/_/g, " ")}`,
							...(p.defaultValue ? { default: p.defaultValue } : {}),
						},
					]),
				),
				required: activeParams.filter((p) => !p.defaultValue).map((p) => p.name),
			};

			await createToolFromDiscovery({
				agentId: currentAgent.id,
				urlTemplate: effectiveUrlTemplate,
				method,
				headers: Object.keys(headers).length > 0 ? headers : undefined,
				name,
				description,
				inputSchema,
				displayConfig: {
					type: displayType,
					...(Object.keys(fieldMappings).length > 0 && { fieldMappings }),
					...(dataPath && { dataPath }),
					...(textTemplate && { textFallback: textTemplate }),
					...result?.suggestedDisplayConfig?.options,
				},
			});

			toast.success("Tool created successfully!");
			router.push("/tools");
		} catch (err) {
			console.error("Failed to create tool:", err);
			toast.error(err instanceof Error ? err.message : "Failed to create tool");
		} finally {
			setSaving(false);
		}
	};

	const renderUrlStep = () => (
		<div className="space-y-6">
			<div>
				<label
					htmlFor="apiUrl"
					className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2"
				>
					API URL
				</label>
				<Input
					id="apiUrl"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://api.example.com/products/123"
					className="font-mono"
				/>
				<p className="text-xs text-[#888] mt-2">
					Enter a sample URL with real parameter values. We'll detect the parameters automatically.
				</p>
			</div>

			<div className="flex items-center gap-4">
				<div>
					<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
						Method
					</span>
					<div className="flex border border-[#D1D1D1]">
						<button
							type="button"
							onClick={() => setMethod("GET")}
							className={`px-4 py-2 text-xs font-bold uppercase ${method === "GET" ? "bg-[#1A1A1A] text-white" : "bg-white text-[#888] hover:bg-[#F3F2EE]"}`}
						>
							GET
						</button>
						<button
							type="button"
							onClick={() => setMethod("POST")}
							className={`px-4 py-2 text-xs font-bold uppercase border-l border-[#D1D1D1] ${method === "POST" ? "bg-[#1A1A1A] text-white" : "bg-white text-[#888] hover:bg-[#F3F2EE]"}`}
						>
							POST
						</button>
					</div>
				</div>
			</div>

			<div>
				<button
					type="button"
					onClick={() => setShowHeaders(!showHeaders)}
					className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#888] hover:text-[#1A1A1A]"
				>
					{showHeaders ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
					Headers (Optional)
				</button>

				{showHeaders && (
					<div className="mt-4 space-y-3 p-4 border border-[#D1D1D1] bg-[#FAFAF9]">
						{Object.entries(headers).map(([key, value]) => (
							<div key={key} className="flex items-center gap-2">
								<code className="text-xs bg-[#F3F2EE] px-2 py-1 border border-[#D1D1D1]">
									{key}
								</code>
								<span className="text-[#888]">=</span>
								<code className="text-xs bg-[#F3F2EE] px-2 py-1 border border-[#D1D1D1] flex-1 truncate">
									{value.substring(0, 30)}...
								</code>
								<button
									type="button"
									onClick={() => handleRemoveHeader(key)}
									className="text-xs text-red-500 hover:underline"
								>
									Remove
								</button>
							</div>
						))}

						<div className="flex gap-2">
							<Input
								value={headerKey}
								onChange={(e) => setHeaderKey(e.target.value)}
								placeholder="Header name (e.g., Authorization)"
								className="flex-1 text-sm"
							/>
							<Input
								value={headerValue}
								onChange={(e) => setHeaderValue(e.target.value)}
								placeholder="Value (e.g., Bearer ...)"
								className="flex-1 text-sm"
							/>
							<Button
								type="button"
								variant="outline"
								onClick={handleAddHeader}
								disabled={!headerKey || !headerValue}
							>
								Add
							</Button>
						</div>
					</div>
				)}
			</div>

			<div className="flex justify-end pt-4">
				<Button onClick={handleAnalyze} disabled={analyzing || !url}>
					{analyzing ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Analyzing...
						</>
					) : (
						<>
							Analyze API <ArrowRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>
			</div>
		</div>
	);

	const renderReviewStep = () => (
		<div className="space-y-6">
			{/* Detected Parameters */}
			<div>
				<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-3">
					Detected Parameters
				</span>
				{params.length > 0 ? (
					<div className="space-y-3">
						{params.map((param, index) => (
							<div
								key={index}
								className={`p-3 border border-[#D1D1D1] transition-colors ${
									param.removed || param.hardcoded ? "bg-[#F3F2EE] opacity-60" : "bg-[#FAFAF9]"
								}`}
							>
								<div className="flex items-center gap-4">
									{param.removed || param.hardcoded ? (
										<span className="font-mono text-sm text-[#888]">{param.name}</span>
									) : (
										<Input
											id="detectedParameters"
											value={param.name}
											onChange={(e) => handleParamNameChange(index, e.target.value)}
											className="w-1/3 font-mono text-sm bg-white min-w-1/3"
										/>
									)}
									<span className="text-[10px] font-mono uppercase px-2 py-1 bg-[#F3F2EE] border border-[#D1D1D1]">
										{param.type}
									</span>
									{param.hardcoded && (
										<span className="text-[10px] font-mono uppercase px-2 py-1 bg-[#FEF3C7] border border-[#FCD34D] text-[#92400E]">
											hardcoded
										</span>
									)}
									{param.removed && (
										<span className="text-[10px] font-mono uppercase px-2 py-1 bg-[#FEE2E2] border border-[#FCA5A5] text-[#991B1B]">
											removed
										</span>
									)}
									{param.defaultValue && !param.removed && !param.hardcoded && (
										<span className="text-[10px] font-mono uppercase px-2 py-1 bg-[#E0F2FE] border border-[#7DD3FC] text-[#0369A1]">
											optional
										</span>
									)}
									<div className="flex items-center gap-1 ml-auto">
										{param.removed || param.hardcoded ? (
											<button
												type="button"
												onClick={() =>
													param.removed ? handleRemoveParam(index) : handleHardcodeParam(index)
												}
												className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#888] hover:text-[#1A1A1A] hover:bg-[#E5E5E5] transition-colors"
												title="Restore parameter"
											>
												<Undo2 size={12} /> Restore
											</button>
										) : (
											<>
												<button
													type="button"
													onClick={() => handleHardcodeParam(index)}
													className="whitespace-nowrap flex items-center gap-1.5 px-2 py-1 rounded text-xs text-[#888] hover:text-[#92400E] hover:bg-[#FEF3C7] transition-colors"
													title="This is not a variable — always use the original value"
												>
													<Lock size={12} /> Not a variable
												</button>
												<button
													type="button"
													onClick={() => handleRemoveParam(index)}
													className="p-1.5 rounded text-[#888] hover:text-red-600 hover:bg-red-50 transition-colors"
													title="Remove parameter completely"
												>
													<Trash2 size={14} />
												</button>
											</>
										)}
									</div>
								</div>
								{param.hardcoded && (
									<p className="text-xs text-[#888] mt-2">
										Always using: <code className="bg-[#F3F2EE] px-1">{param.originalValue}</code>
									</p>
								)}
								{param.removed && (
									<p className="text-xs text-[#888] mt-2">
										This parameter has been removed from the URL.
									</p>
								)}
								{!param.removed && !param.hardcoded && (
									<div className="mt-2">
										<Input
											value={param.defaultValue ?? ""}
											onChange={(e) => handleDefaultValueChange(index, e.target.value)}
											placeholder="Default value (leave empty for required)"
											className="h-8 font-mono text-xs"
										/>
									</div>
								)}

								{!param.removed && (
									<div className="overflow-hidden ellipsis line-clamp-3">
										<span className="text-xs text-[#888]">
											Original:{" "}
											<code className="bg-[#F3F2EE] px-1 whitespace-nowrap">
												{param.originalValue}
											</code>
										</span>
									</div>
								)}
							</div>
						))}
					</div>
				) : (
					<p className="text-sm text-[#888] italic">
						No parameters detected. The URL will be used as-is.
					</p>
				)}
			</div>

			{/* URL Template Preview */}
			<div>
				<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
					URL Template
				</span>
				<code className="block p-3 bg-[#1A1A1A] text-[#4ADE80] font-mono text-sm overflow-x-auto">
					{effectiveUrlTemplate}
				</code>
			</div>

			{/* Sample Response */}
			{result?.sampleResponse !== null && result?.sampleResponse !== undefined ? (
				<div>
					<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
						Sample Response
					</span>
					<pre className="p-3 bg-[#1A1A1A] text-[#E5E5E5] font-mono text-xs overflow-x-auto max-h-48 overflow-y-auto">
						{JSON.stringify(result.sampleResponse, null, 2)}
					</pre>
				</div>
			) : null}

			<div className="flex justify-between pt-4">
				<Button variant="outline" onClick={() => setStep("url")}>
					<ArrowLeft className="w-4 h-4 mr-2" /> Back
				</Button>
				<div className="flex gap-2">
					<Button variant="outline" onClick={handleRefetch} disabled={refetching}>
						{refetching ? (
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
						) : (
							<RefreshCw className="w-4 h-4 mr-2" />
						)}
						Refetch API
					</Button>
					<Button onClick={() => setStep("configure")} disabled={!isResponseJson}>
						Configure Tool <ArrowRight className="w-4 h-4 ml-2" />
					</Button>
				</div>
			</div>
			{!isResponseJson && result?.sampleResponse != null && (
				<p className="text-xs text-right text-red-500">
					The API response is not JSON. Update the URL or parameters and refetch.
				</p>
			)}
		</div>
	);

	const renderConfigureStep = () => (
		<div className="space-y-6">
			<div>
				<label
					htmlFor="toolName"
					className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2"
				>
					Tool Name
				</label>
				<Input
					id="toolName"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="get_product"
					className="font-mono"
				/>
				<p className="text-xs text-[#888] mt-1">Lowercase with underscores</p>
			</div>

			<div>
				<label
					htmlFor="description"
					className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2"
				>
					Description
				</label>
				<Textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					placeholder="Retrieve property details including price, availability, and amenities for a vacation rental listing."
					rows={3}
				/>
				<p className="text-xs text-[#888] mt-1">
					Explain when the AI should use this tool. Be specific about what data it returns and when
					it's useful.
				</p>
				<div className="mt-3 p-3 bg-[#F9F9F7] border border-[#E8E8E4] rounded-md space-y-2">
					<p className="text-[10px] font-mono uppercase tracking-widest text-[#888] font-bold">
						Good examples
					</p>
					<ul className="space-y-1.5 text-xs text-[#666]">
						<li className="flex gap-2">
							<span className="text-[#888] shrink-0">→</span>
							<span>
								"Look up a product by ID and return its name, price, stock status, and description.
								Use when a customer asks about a specific product."
							</span>
						</li>
						<li className="flex gap-2">
							<span className="text-[#888] shrink-0">→</span>
							<span>
								"Check real-time order status including shipping updates and estimated delivery
								date. Use when a customer asks where their order is."
							</span>
						</li>
						<li className="flex gap-2">
							<span className="text-[#888] shrink-0">→</span>
							<span>
								"Search available appointments by date and location. Use when a visitor wants to
								book or check availability."
							</span>
						</li>
					</ul>
					<p className="text-[10px] text-[#999] mt-2">
						Tip: Include <em>what data is returned</em> and <em>when the AI should call it</em>.
					</p>
					<div className="mt-2 pt-2 border-t border-[#E8E8E4]">
						<p className="text-[10px] font-mono uppercase tracking-widest text-[#888] font-bold mb-1.5">
							Depends on another tool?
						</p>
						<p className="text-xs text-[#666]">
							If this tool needs data from another tool (e.g. a placeId from Google Maps), say so in
							the description. The AI will call the other tool first automatically.
						</p>
						<div className="mt-1.5 flex gap-2 text-xs text-[#666]">
							<span className="text-[#888] shrink-0">→</span>
							<span>
								"Search vacation rentals by location. Requires a Google Maps{" "}
								<code className="bg-[#EEEEE9] px-1 py-0.5 text-[11px] font-mono">placeId</code> —
								use the geocode tool first to resolve a destination name into a placeId before
								calling this tool."
							</span>
						</div>
					</div>
				</div>
			</div>

			<div>
				<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
					Display Type
				</span>
				<div className="flex flex-wrap gap-2">
					{DISPLAY_TYPES.map(({ value, label, icon: Icon }) => (
						<button
							key={value}
							type="button"
							onClick={() => setDisplayType(value)}
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

			{/* Text Template - show for text display type */}
			{displayType === "text" && result?.sampleResponse != null ? (
				<div>
					<label
						htmlFor="textTemplate"
						className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2"
					>
						Text Template
					</label>
					<Textarea
						id="textTemplate"
						value={textTemplate}
						onChange={(e) => setTextTemplate(e.target.value)}
						placeholder="{{name}} — {{price}} per night ({{provider}})"
						rows={3}
						className="font-mono text-sm"
					/>
					<p className="text-[10px] text-[#888] mt-1">
						Use {"{{field}}"} to insert values. Leave blank to let the AI format the response.
					</p>
					{result?.sampleResponse != null && (
						<div className="mt-3 p-3 bg-[#FAFAF9] border border-[#D1D1D1]">
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
								Response — click a field to insert
							</div>
							<div className="relative mb-2">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#aaa]" />
								<input
									type="text"
									value={fieldSearch}
									onChange={(e) => setFieldSearch(e.target.value)}
									placeholder="Search response…"
									className="w-full h-7 pl-7 pr-7 bg-white border border-[#D1D1D1] text-xs font-mono focus:outline-none focus:border-[#1A1A1A] placeholder:text-[#aaa]"
								/>
								{fieldSearch && (
									<button
										type="button"
										onClick={() => setFieldSearch("")}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#555]"
									>
										<X className="w-3 h-3" />
									</button>
								)}
							</div>
							<div className="bg-white border border-[#D1D1D1] p-3 max-h-[300px] overflow-auto text-sm font-mono">
								<JsonNode
									data={result.sampleResponse as JsonValue}
									path=""
									onSelect={handleFieldSelect}
									selectedField={selectedField}
									expanded={treeExpanded}
									onToggle={handleTreeToggle}
									filter={fieldSearch || undefined}
								/>
							</div>
							<p className="text-[10px] text-blue-600 mt-1.5">
								Click a field to insert it into the text template
							</p>
						</div>
					)}
				</div>
			) : null}

			{/* Field Mappings - show for card/carousel/table types */}
			{displayType !== "text" &&
			result?.sampleResponse !== null &&
			result?.sampleResponse !== undefined ? (
				<div>
					<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
						Field Mappings
					</span>
					<Button
						variant="outline"
						onClick={() => setApiTestOpen(true)}
						className="justify-start w-full"
					>
						<Settings className="w-4 h-4 mr-2" />
						Configure Field Mappings
					</Button>
					{Object.keys(fieldMappings).length > 0 && (
						<div className="mt-3 p-3 bg-[#FAFAF9] border border-[#D1D1D1]">
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">Mapped Fields</div>
							<div className="space-y-1">
								{Object.entries(fieldMappings).map(([displayField, apiPath]) => (
									<div key={displayField} className="flex items-center gap-2 text-xs">
										<span className="font-medium capitalize">{displayField}:</span>
										<code className="bg-[#F3F2EE] px-1.5 py-0.5 text-[#555]">{apiPath}</code>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			) : null}

			{/* Live Preview */}
			{result?.sampleResponse != null && (displayType !== "text" || textTemplate) && (
				<div>
					<span className="block text-xs font-mono uppercase tracking-widest text-[#888] mb-2">
						Preview
					</span>
					<div className="border border-[#D1D1D1] rounded-lg bg-white p-4">
						<BlockRenderer
							block={{
								type: "tool_result",
								toolName: name || "preview",
								result: result.sampleResponse,
								displayConfig: {
									type: displayType as DisplayConfig["type"],
									...(Object.keys(fieldMappings).length > 0 && { fieldMappings }),
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

			<div className="flex justify-between pt-4">
				<Button variant="outline" onClick={() => setStep("review")}>
					<ArrowLeft className="w-4 h-4 mr-2" /> Back
				</Button>
				<Button onClick={handleSave} disabled={saving}>
					{saving ? (
						<>
							<Loader2 className="w-4 h-4 mr-2 animate-spin" />
							Creating...
						</>
					) : (
						<>
							<Check className="w-4 h-4 mr-2" /> Create Tool
						</>
					)}
				</Button>
			</div>
		</div>
	);

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			<header className="h-20 border-b border-[#D1D1D1] bg-white flex items-center px-8">
				<Link
					href="/tools"
					className="flex items-center gap-2 text-[#888] hover:text-[#1A1A1A] mr-6"
				>
					<ArrowLeft size={16} />
				</Link>
				<div>
					<div className="flex items-center gap-2">
						<Zap className="w-5 h-5 text-[#F59E0B]" />
						<h1 className="text-xl font-medium">Auto-Discover API</h1>
					</div>
					<p className="text-xs text-[#888] mt-0.5">
						Paste a URL and we'll create a tool automatically
					</p>
				</div>
			</header>

			<div className="p-8 mx-auto">
				{/* Progress Steps */}
				<div className="flex items-center gap-4 mb-8">
					{[
						{ key: "url", label: "1. Enter URL" },
						{ key: "review", label: "2. Review" },
						{ key: "configure", label: "3. Configure" },
					].map((s, i) => (
						<div key={s.key} className="flex items-center gap-2">
							<div
								className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
									step === s.key
										? "bg-[#1A1A1A] text-white"
										: ["review", "configure"].indexOf(step) >
												["url", "review", "configure"].indexOf(s.key)
											? "bg-[#4ADE80] text-white"
											: "bg-[#D1D1D1] text-[#888]"
								}`}
							>
								{["review", "configure"].indexOf(step) >
								["url", "review", "configure"].indexOf(s.key) ? (
									<Check size={14} />
								) : (
									i + 1
								)}
							</div>
							<span
								className={`text-xs font-mono uppercase ${step === s.key ? "text-[#1A1A1A]" : "text-[#888]"}`}
							>
								{s.label}
							</span>
							{i < 2 && <div className="w-8 h-px bg-[#D1D1D1]" />}
						</div>
					))}
				</div>

				{/* Step Content */}
				<div className="bg-white border border-[#D1D1D1] p-6">
					{step === "url" && renderUrlStep()}
					{step === "review" && renderReviewStep()}
					{step === "configure" && renderConfigureStep()}
				</div>
			</div>

			{/* Field Mapping Dialog */}
			<ApiTestDialog
				open={apiTestOpen}
				onOpenChange={setApiTestOpen}
				httpUrl={url}
				httpMethod={method}
				httpHeaders={headers}
				inputSchema={{ properties: {}, required: [] }}
				initialResponse={result?.sampleResponse}
				initialMappings={fieldMappings}
				isMultiItem={["product_carousel", "product_grid", "table"].includes(displayType)}
				initialDataPath={dataPath || undefined}
				onDataPathDetected={(dp) => setDataPath(dp || null)}
				displayType={displayType}
				onDisplayTypeChange={(type) => setDisplayType(type)}
				textTemplate={textTemplate}
				onTextTemplateChange={(template) => setTextTemplate(template)}
				toolName={name || "preview"}
				onFieldSelect={(path, targetField) => {
					setFieldMappings((prev) => ({ ...prev, [targetField]: path }));
				}}
			/>
		</div>
	);
}
