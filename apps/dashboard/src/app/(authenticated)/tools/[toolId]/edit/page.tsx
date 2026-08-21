"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowRight,
	Box,
	ChevronDown,
	ChevronLeft,
	Code,
	Eye,
	GalleryHorizontal,
	Grid3X3,
	Image,
	LayoutTemplate,
	Lock,
	MousePointerClick,
	Play,
	Plus,
	RectangleHorizontal,
	RotateCcw,
	Save,
	Settings,
	ShoppingBag,
	Table,
	Terminal,
	Trash2,
	Type,
	Wrench,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ApiTestDialog } from "@/components/api-test-dialog";
import { FormBuilder, LEAD_CAPTURE_TEMPLATE } from "@/components/form-builder";
import { BlockRenderer } from "@/components/tool-blocks";
import { getValueByPath } from "@/components/tool-blocks/field-mapping";
import { Button } from "@/components/ui/button";
import { CustomToggle } from "@/components/ui/custom-toggle";
import { FieldNode } from "@/components/ui/field-node";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PipelineStep } from "@/components/ui/pipeline-step";
import { SectionHeader } from "@/components/ui/section-header";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import {
	type AgentTool,
	type DisplayConfig,
	type FormPostAction,
	type FormSchema,
	getTool,
	TOOL_CATEGORY_LABELS,
	type ToolCategory,
	type ToolInputSchema,
	updateTool,
} from "@/lib/api";

const toolSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100)
		.regex(/^[a-z_][a-z0-9_]*$/, "Name must be lowercase with underscores (e.g., get_weather)"),
	description: z.string().min(1, "Description is required").max(1000),
	inputSchemaJson: z.string().min(1, "Input schema is required"),
	executionType: z.enum(["mock", "http", "form"]),
	httpUrl: z.string().optional(),
	httpMethod: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
	httpHeadersJson: z.string().optional(),
	mockResponse: z.string().optional(),
	displayType: z.enum([
		"text",
		"product_card",
		"product_carousel",
		"product_grid",
		"image",
		"table",
		"buttons",
		"custom",
		"form",
	]),
	displayFieldMappingsJson: z.string().optional(),
	displayTextFallback: z.string().optional(),
	shopifyShowPrice: z.boolean().optional(),
	shopifyShowImage: z.boolean().optional(),
	shopifyShowAddToCart: z.boolean().optional(),
	shopifyMaxItems: z.number().optional(),
	shopifyCardStyle: z.enum(["compact", "detailed"]).optional(),
	formSchemaJson: z.string().optional(),
	formPostActionsJson: z.string().optional(),
	isEnabled: z.boolean(),
	allowAiSuggest: z.boolean(),
	countsAsConversion: z.boolean(),
	countsAsResolution: z.boolean(),
	category: z.enum([
		"lead_sales",
		"support_escalation",
		"feedback_survey",
		"account_user",
		"operations_internal",
		"custom",
	]),
});

type ToolFormData = z.infer<typeof toolSchema>;

const defaultInputSchema: ToolInputSchema = {
	type: "object",
	properties: {
		example_param: {
			type: "string",
			description: "An example parameter",
		},
	},
	required: ["example_param"],
};

const DISPLAY_TYPES = [
	{ value: "text", label: "Text", icon: Type },
	{ value: "product_card", label: "Card", icon: RectangleHorizontal },
	{ value: "product_carousel", label: "Carousel", icon: GalleryHorizontal },
	{ value: "product_grid", label: "Grid", icon: Grid3X3 },
	{ value: "table", label: "Table", icon: Table },
	{ value: "image", label: "Image", icon: Image },
	{ value: "buttons", label: "Buttons", icon: MousePointerClick },
	{ value: "custom", label: "Custom", icon: Code },
] as const;

export default function ToolEditPage() {
	const params = useParams();
	const router = useRouter();
	const toolId = params.toolId as string;
	useAgent(); // Ensure agent context is available

	const [tool, setTool] = useState<AgentTool | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [apiTestOpen, setApiTestOpen] = useState(false);
	const [formSchema, setFormSchema] = useState<FormSchema>({ fields: [] });
	const [formPostActions, setFormPostActions] = useState<FormPostAction[]>([]);
	const [testResponse, setTestResponse] = useState<unknown>(null);
	const [dataPath, setDataPath] = useState<string | null>(null);
	const [showAdvancedMappings, setShowAdvancedMappings] = useState(false);

	const form = useForm<ToolFormData>({
		resolver: zodResolver(toolSchema),
		defaultValues: {
			name: "",
			description: "",
			inputSchemaJson: JSON.stringify(defaultInputSchema, null, 2),
			executionType: "http",
			httpUrl: "",
			httpMethod: "GET",
			httpHeadersJson: "{}",
			mockResponse: '{"result": "example response"}',
			displayType: "text",
			displayFieldMappingsJson: "{}",
			displayTextFallback: "",
			shopifyShowPrice: true,
			shopifyShowImage: true,
			shopifyShowAddToCart: true,
			shopifyMaxItems: 10,
			shopifyCardStyle: "detailed",
			formSchemaJson: JSON.stringify({ fields: [] }, null, 2),
			formPostActionsJson: "[]",
			isEnabled: true,
			allowAiSuggest: true,
			countsAsConversion: false,
			countsAsResolution: false,
			category: "custom",
		},
	});

	const executionType = form.watch("executionType");
	const watchedDisplayType = form.watch("displayType");
	const watchedMockResponse = form.watch("mockResponse");

	// Auto-populate testResponse from mock data
	useEffect(() => {
		if (executionType === "mock" && watchedMockResponse) {
			try {
				setTestResponse(JSON.parse(watchedMockResponse));
			} catch {
				// Invalid JSON, ignore
			}
		}
	}, [executionType, watchedMockResponse]);

	// Compute leaf paths from testResponse for click-to-insert fields
	const leafPaths = useMemo(() => {
		const paths: string[] = [];
		const walk = (obj: unknown, prefix: string) => {
			if (obj === null || obj === undefined) return;
			if (Array.isArray(obj)) {
				if (obj.length > 0 && obj[0] && typeof obj[0] === "object") {
					walk(obj[0], prefix);
				}
				return;
			}
			if (typeof obj === "object") {
				for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
					const path = prefix ? `${prefix}.${key}` : key;
					if (value && typeof value === "object" && !Array.isArray(value)) {
						walk(value, path);
					} else if (
						Array.isArray(value) &&
						value.length > 0 &&
						value[0] &&
						typeof value[0] === "object"
					) {
						walk(value[0], path);
					} else {
						paths.push(path);
					}
				}
			}
		};
		if (testResponse) {
			if (dataPath) {
				const resolved = getValueByPath(testResponse, dataPath);
				const root = Array.isArray(resolved) ? resolved[0] : resolved;
				walk(root ?? testResponse, "");
			} else {
				walk(testResponse, "");
			}
		}
		return paths;
	}, [testResponse, dataPath]);

	// Parse current field mappings from form for visual display
	const currentFieldMappings = useMemo(() => {
		try {
			return JSON.parse(form.getValues("displayFieldMappingsJson") || "{}") as Record<
				string,
				string
			>;
		} catch {
			return {};
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [form.watch("displayFieldMappingsJson")]);

	const fetchTool = useCallback(async () => {
		if (!toolId) return;
		setLoading(true);
		try {
			const toolData = await getTool(toolId);
			setTool(toolData);

			const toolFormSchema = toolData.formSchema || { fields: [] };
			const toolPostActions = toolData.formPostActions || [];
			setFormSchema(toolFormSchema);
			setFormPostActions(toolPostActions);

			form.reset({
				name: toolData.name,
				description: toolData.description,
				inputSchemaJson: JSON.stringify(toolData.inputSchema, null, 2),
				executionType: toolData.executionType,
				httpUrl: toolData.httpUrl || "",
				httpMethod: (toolData.httpMethod as "GET" | "POST" | "PUT" | "DELETE") || "GET",
				httpHeadersJson: toolData.httpHeaders
					? JSON.stringify(toolData.httpHeaders, null, 2)
					: "{}",
				mockResponse: toolData.mockResponse || "",
				displayType: (toolData.displayConfig?.type as ToolFormData["displayType"]) || "text",
				displayFieldMappingsJson: toolData.displayConfig?.fieldMappings
					? JSON.stringify(toolData.displayConfig.fieldMappings, null, 2)
					: "{}",
				displayTextFallback: toolData.displayConfig?.textFallback || "",
				shopifyShowPrice: toolData.displayConfig?.options?.showPrice ?? true,
				shopifyShowImage: toolData.displayConfig?.options?.showImage ?? true,
				shopifyShowAddToCart: toolData.displayConfig?.options?.showAddToCart ?? true,
				shopifyMaxItems: toolData.displayConfig?.options?.maxItems ?? 10,
				shopifyCardStyle:
					(toolData.displayConfig?.options?.cardStyle as "compact" | "detailed") ?? "detailed",
				formSchemaJson: JSON.stringify(toolFormSchema, null, 2),
				formPostActionsJson: JSON.stringify(toolPostActions, null, 2),
				isEnabled: toolData.isEnabled,
				allowAiSuggest: toolData.allowAiSuggest,
				countsAsConversion: toolData.countsAsConversion,
				countsAsResolution: toolData.countsAsResolution,
				category: toolData.category,
			});
			// Restore dataPath from saved displayConfig
			if (toolData.displayConfig?.dataPath) {
				setDataPath(toolData.displayConfig.dataPath);
			}
		} catch (err) {
			console.error("Failed to load tool:", err);
			toast.error("Failed to load tool");
			router.push("/tools");
		} finally {
			setLoading(false);
		}
	}, [toolId, form, router]);

	useEffect(() => {
		fetchTool();
	}, [fetchTool]);

	const onSubmit = async (data: ToolFormData) => {
		if (!tool) return;
		setSaving(true);

		try {
			let inputSchema: ToolInputSchema;
			try {
				inputSchema = JSON.parse(data.inputSchemaJson);
				if (inputSchema.type !== "object" || !inputSchema.properties) {
					throw new Error("Invalid schema structure");
				}
			} catch {
				toast.error("Invalid input schema JSON");
				setSaving(false);
				return;
			}

			let httpHeaders: Record<string, string> | undefined;
			if (data.executionType === "http" && data.httpHeadersJson) {
				try {
					httpHeaders = JSON.parse(data.httpHeadersJson);
				} catch {
					toast.error("Invalid HTTP headers JSON");
					setSaving(false);
					return;
				}
			}

			let displayConfig = null;
			if (data.displayType !== "text") {
				let fieldMappings: Record<string, string> | undefined;
				if (data.displayFieldMappingsJson) {
					try {
						fieldMappings = JSON.parse(data.displayFieldMappingsJson);
					} catch {
						toast.error("Invalid field mappings JSON");
						setSaving(false);
						return;
					}
				}

				const options: Record<string, unknown> = {};
				const isProductDisplayType =
					data.displayType === "product_card" ||
					data.displayType === "product_carousel" ||
					data.displayType === "product_grid";

				if (isProductDisplayType && tool?.integrationSource === "shopify") {
					options.showPrice = data.shopifyShowPrice ?? true;
					options.showImage = data.shopifyShowImage ?? true;
					options.showAddToCart = data.shopifyShowAddToCart ?? true;
					options.maxItems = data.shopifyMaxItems ?? 10;
					options.cardStyle = data.shopifyCardStyle ?? "detailed";
				}

				displayConfig = {
					type: data.displayType,
					fieldMappings,
					...(dataPath && { dataPath }),
					textFallback: data.displayTextFallback || undefined,
					options: Object.keys(options).length > 0 ? options : undefined,
				};
			} else if (data.displayTextFallback) {
				// Text type with a template
				displayConfig = {
					type: "text" as const,
					textFallback: data.displayTextFallback,
				};
			}

			let parsedFormSchema: FormSchema | null = null;
			if (data.executionType === "form") {
				if (data.formSchemaJson) {
					try {
						parsedFormSchema = JSON.parse(data.formSchemaJson);
					} catch {
						toast.error("Invalid form schema JSON");
						setSaving(false);
						return;
					}
				}
			}

			const toolData = {
				name: data.name,
				description: data.description,
				inputSchema,
				executionType: data.executionType,
				httpUrl: data.executionType === "http" ? data.httpUrl : null,
				httpMethod: data.executionType === "http" ? data.httpMethod : null,
				httpHeaders: data.executionType === "http" ? httpHeaders : null,
				mockResponse: data.executionType === "mock" ? data.mockResponse : null,
				displayConfig: (data.executionType === "form"
					? { type: "form" }
					: displayConfig) as DisplayConfig | null,
				formSchema: data.executionType === "form" ? parsedFormSchema : null,
				formPostActions: data.executionType === "form" ? formPostActions : null,
				isEnabled: data.isEnabled,
				allowAiSuggest: data.allowAiSuggest,
				countsAsConversion: data.countsAsConversion,
				countsAsResolution: data.countsAsResolution,
				category: data.category,
			};

			await updateTool(tool.id, toolData);
			router.push("/tools");
		} catch (err) {
			console.error("Failed to save:", err);
			toast.error(err instanceof Error ? err.message : "Failed to save tool");
		} finally {
			setSaving(false);
		}
	};

	const postActionsList = useMemo(() => {
		return formPostActions.map((action, index) => ({
			id: `action_${index}`,
			type: action.type,
			label:
				action.type === "slack"
					? "Send to Slack"
					: action.type === "webhook"
						? "Webhook"
						: "Send Email",
			detail:
				action.type === "slack"
					? `Webhook: ${action.webhookUrl || "Not configured"}`
					: action.type === "webhook"
						? action.url || "No URL"
						: `To: ${action.recipientIds?.join(", ") || "No recipients"}`,
			enabled: true,
		}));
	}, [formPostActions]);

	if (loading) {
		return (
			<div className="flex min-h-screen bg-[#F3F2EE] items-center justify-center">
				<div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
			</div>
		);
	}

	if (!tool) {
		return (
			<div className="flex min-h-screen bg-[#F3F2EE] items-center justify-center">
				<div className="text-center">
					<Wrench className="w-12 h-12 mx-auto mb-4 text-[#888]" />
					<h2 className="mb-2 text-lg font-medium">Tool not found</h2>
					<Link href="/tools" className="text-[#1A1A1A] underline hover:no-underline text-sm">
						Back to Tools
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* --- MAIN CONTENT --- */}
			<main className="flex flex-col flex-1 min-w-0">
				{/* Header */}
				<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
					<div className="flex items-center gap-4">
						<Link href="/tools" className="p-2 hover:bg-[#F3F2EE] transition-colors rounded">
							<ChevronLeft size={16} className="text-[#555]" />
						</Link>
						<div>
							<h1 className="text-xl font-medium tracking-tight">Edit Tool: {tool.name}</h1>
							<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
								<span className="flex items-center gap-1">
									<Box size={10} /> Type: {tool.executionType}
								</span>
								{tool.integrationSource === "shopify" && (
									<>
										<span className="text-[#D1D1D1]">|</span>
										<span className="flex items-center gap-1 text-[#5E8E3E]">
											<ShoppingBag size={10} /> Shopify Integration
										</span>
									</>
								)}
								{tool.system && (
									<>
										<span className="text-[#D1D1D1]">|</span>
										<span className="flex items-center gap-1">
											<Lock size={8} /> System Protected
										</span>
									</>
								)}
							</div>
						</div>
					</div>

					<div className="flex gap-2">
						<Link
							href="/tools"
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
						>
							<RotateCcw size={12} /> Cancel
						</Link>
						<button
							type="button"
							onClick={form.handleSubmit(onSubmit)}
							disabled={saving}
							className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
						>
							<Save size={12} /> {saving ? "Saving..." : "Save Changes"}
						</button>
					</div>
				</header>

				{/* Content Area */}
				<Form {...form}>
					<form className="grid flex-1 w-full grid-cols-1 gap-6 p-8 mx-auto overflow-y-auto lg:grid-cols-12">
						{/* --- LEFT COL: MANIFEST & PIPELINE --- */}
						<div className="space-y-6 lg:col-span-4">
							{/* 1. Tool Manifest */}
							<section className="bg-white border border-[#D1D1D1] shadow-sm">
								<SectionHeader icon={Terminal} title="Module Manifest" />
								<div className="p-5 space-y-4">
									<FormField
										control={form.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
													Internal ID
												</FormLabel>
												<div className="relative">
													<FormControl>
														<Input
															{...field}
															disabled={tool.system || !!tool.integrationSource}
															className={`w-full h-9 border border-[#D1D1D1] px-3 font-mono text-xs ${
																tool.system || tool.integrationSource
																	? "bg-[#F3F2EE] text-[#555] cursor-not-allowed"
																	: "bg-white focus:border-[#1A1A1A]"
															}`}
														/>
													</FormControl>
													{(tool.system || tool.integrationSource) && (
														<Lock
															size={10}
															className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
														/>
													)}
												</div>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="executionType"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
													Execution Mode
												</FormLabel>
												<Select onValueChange={field.onChange} value={field.value}>
													<FormControl>
														<SelectTrigger className="w-full h-9 bg-white border border-[#D1D1D1] px-2 text-xs font-mono focus:outline-none focus:border-[#1A1A1A]">
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														<SelectItem value="form">Form (User Input)</SelectItem>
														<SelectItem value="http">HTTP (API Call)</SelectItem>
														<SelectItem value="mock">Mock (Static Response)</SelectItem>
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="description"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
													Description
												</FormLabel>
												<FormControl>
													<Textarea
														{...field}
														className="w-full h-20 bg-[#FAFAF9] border border-[#D1D1D1] p-2 text-xs font-mono resize-none focus:outline-none focus:border-[#1A1A1A]"
													/>
												</FormControl>
												<FormDescription className="text-[9px] text-[#888]">
													The LLM uses this to decide when to call the tool
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={form.control}
										name="category"
										render={({ field }) => (
											<FormItem>
												<FormLabel className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
													Category
												</FormLabel>
												<Select onValueChange={field.onChange} value={field.value}>
													<FormControl>
														<SelectTrigger className="w-full h-9 bg-white border border-[#D1D1D1] px-2 text-xs font-mono focus:outline-none focus:border-[#1A1A1A]">
															<SelectValue />
														</SelectTrigger>
													</FormControl>
													<SelectContent>
														{(Object.keys(TOOL_CATEGORY_LABELS) as ToolCategory[]).map((cat) => (
															<SelectItem key={cat} value={cat}>
																{TOOL_CATEGORY_LABELS[cat]}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</section>

							{/* 2. Execution Pipeline (Actions) - Only for Form type */}
							{executionType === "form" && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm">
									<SectionHeader
										icon={Zap}
										title="Post-Execution Pipeline"
										rightContent={
											<span className="text-[9px] font-mono text-[#888]">
												{postActionsList.length} action{postActionsList.length !== 1 ? "s" : ""}
											</span>
										}
									/>
									<div className="p-5 space-y-3">
										<div className="flex items-center gap-2 text-[9px] font-mono text-[#888] uppercase mb-2">
											<span>Input</span>
											<ArrowRight size={10} />
											<span>Process</span>
											<ArrowRight size={10} />
											<span>Output</span>
										</div>

										{postActionsList.length > 0 ? (
											postActionsList.map((action) => (
												<PipelineStep key={action.id} action={action} />
											))
										) : (
											<div className="border border-dashed border-[#D1D1D1] p-4 text-center text-[9px] font-mono text-[#AAA] uppercase">
												No post actions configured
											</div>
										)}

										<div className="border border-dashed border-[#D1D1D1] p-2 text-center text-[9px] font-mono text-[#AAA] uppercase">
											End of Stream
										</div>
									</div>
								</section>
							)}

							{/* Behavior Settings */}
							<section className="bg-white border border-[#D1D1D1] shadow-sm">
								<SectionHeader icon={Settings} title="Behavior Settings" />
								<div className="p-5 space-y-4">
									<FormField
										control={form.control}
										name="isEnabled"
										render={({ field }) => (
											<div className="flex items-center justify-between py-2">
												<div>
													<div className="text-xs font-medium">Tool Enabled</div>
													<div className="text-[9px] text-[#888]">Allow this tool to be used</div>
												</div>
												<CustomToggle checked={field.value} onCheckedChange={field.onChange} />
											</div>
										)}
									/>

									<FormField
										control={form.control}
										name="allowAiSuggest"
										render={({ field }) => (
											<div className="flex items-center justify-between py-2 border-t border-[#F3F2EE]">
												<div>
													<div className="text-xs font-medium">AI Can Suggest</div>
													<div className="text-[9px] text-[#888]">Let AI recommend this action</div>
												</div>
												<CustomToggle checked={field.value} onCheckedChange={field.onChange} />
											</div>
										)}
									/>

									<FormField
										control={form.control}
										name="countsAsConversion"
										render={({ field }) => (
											<div className="flex items-center justify-between py-2 border-t border-[#F3F2EE]">
												<div>
													<div className="text-xs font-medium">Counts as Conversion</div>
													<div className="text-[9px] text-[#888]">Track as business conversion</div>
												</div>
												<CustomToggle checked={field.value} onCheckedChange={field.onChange} />
											</div>
										)}
									/>

									<FormField
										control={form.control}
										name="countsAsResolution"
										render={({ field }) => (
											<div className="flex items-center justify-between py-2 border-t border-[#F3F2EE]">
												<div>
													<div className="text-xs font-medium">Counts as Resolution</div>
													<div className="text-[9px] text-[#888]">Mark conversation resolved</div>
												</div>
												<CustomToggle checked={field.value} onCheckedChange={field.onChange} />
											</div>
										)}
									/>
								</div>
							</section>
						</div>

						{/* --- RIGHT COL: SCHEMA & SETTINGS --- */}
						<div className="space-y-6 lg:col-span-8">
							{/* Form Configuration Section */}
							{executionType === "form" && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm min-h-[400px] flex flex-col">
									<SectionHeader
										icon={LayoutTemplate}
										title="Input Schema Definition"
										rightContent={
											<button
												type="button"
												onClick={() => {
													setFormSchema(LEAD_CAPTURE_TEMPLATE);
													form.setValue(
														"formSchemaJson",
														JSON.stringify(LEAD_CAPTURE_TEMPLATE, null, 2),
													);
												}}
												className="flex items-center gap-1 h-6 px-2 bg-white border border-[#D1D1D1] text-[9px] font-bold uppercase hover:bg-[#F3F2EE]"
											>
												Use Template
											</button>
										}
									/>
									<div className="flex-1 p-5 bg-[#FAFAF9]">
										{/* Preview of form fields */}
										{formSchema.fields.length > 0 && (
											<div className="mb-4 space-y-2">
												{formSchema.fields.slice(0, 3).map((field, index) => (
													<FieldNode
														key={field.name || index}
														field={{
															type: field.type,
															label: field.label,
															name: field.name,
															required: field.validation?.required?.value ?? false,
														}}
														readOnly
														showDeleteButton={false}
														showRequiredToggle={false}
													/>
												))}
												{formSchema.fields.length > 3 && (
													<div className="text-[9px] font-mono text-[#888] text-center py-2">
														+{formSchema.fields.length - 3} more fields
													</div>
												)}
											</div>
										)}

										<FormBuilder
											value={formSchema}
											onChange={(schema) => {
												setFormSchema(schema);
												form.setValue("formSchemaJson", JSON.stringify(schema, null, 2));
											}}
											postActions={formPostActions}
											onPostActionsChange={(actions) => {
												setFormPostActions(actions);
												form.setValue("formPostActionsJson", JSON.stringify(actions, null, 2));
											}}
										/>
									</div>
								</section>
							)}

							{/* HTTP Configuration */}
							{executionType === "http" && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm">
									<SectionHeader icon={Terminal} title="HTTP Configuration" />
									<div className="p-5 space-y-4">
										<div className="grid grid-cols-3 gap-4">
											<FormField
												control={form.control}
												name="httpMethod"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
															Method
														</FormLabel>
														<Select onValueChange={field.onChange} value={field.value}>
															<FormControl>
																<SelectTrigger className="border-[#D1D1D1] focus:border-[#1A1A1A]">
																	<SelectValue />
																</SelectTrigger>
															</FormControl>
															<SelectContent>
																<SelectItem value="GET">GET</SelectItem>
																<SelectItem value="POST">POST</SelectItem>
																<SelectItem value="PUT">PUT</SelectItem>
																<SelectItem value="DELETE">DELETE</SelectItem>
															</SelectContent>
														</Select>
														<FormMessage />
													</FormItem>
												)}
											/>

											<FormField
												control={form.control}
												name="httpUrl"
												render={({ field }) => (
													<FormItem className="col-span-2">
														<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
															URL
														</FormLabel>
														<FormControl>
															<Input
																{...field}
																placeholder="https://api.example.com/endpoint"
																className="border-[#D1D1D1] focus:border-[#1A1A1A]"
															/>
														</FormControl>
														<FormMessage />
													</FormItem>
												)}
											/>
										</div>

										<FormField
											control={form.control}
											name="httpHeadersJson"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
														Headers (JSON)
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															placeholder='{"Authorization": "Bearer ..."}'
															className="min-h-[80px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="inputSchemaJson"
											render={({ field }) => {
												let parsedSchema: {
													type?: string;
													properties?: Record<
														string,
														{
															type?: string;
															description?: string;
															default?: string;
															enum?: string[];
														}
													>;
													required?: string[];
												} = {};
												try {
													parsedSchema = JSON.parse(field.value || "{}");
												} catch {
													/* ignore */
												}
												const props = parsedSchema.properties || {};
												const requiredList = parsedSchema.required || [];
												const paramEntries = Object.entries(props);

												const updateSchema = (
													newProps: Record<
														string,
														{
															type?: string;
															description?: string;
															default?: string | null;
															enum?: string[];
														}
													>,
													newRequired: string[],
												) => {
													// Auto-inject default: null for optional params without an explicit default
													const normalizedProps = { ...newProps };
													for (const [key, prop] of Object.entries(normalizedProps)) {
														if (!newRequired.includes(key) && prop.default === undefined) {
															normalizedProps[key] = { ...prop, default: null };
														}
													}
													const updated = {
														...parsedSchema,
														type: "object",
														properties: normalizedProps,
														required: newRequired.length > 0 ? newRequired : undefined,
													};
													if (!updated.required) delete updated.required;
													field.onChange(JSON.stringify(updated, null, 2));
												};

												const handleRenameParam = (oldName: string, newName: string) => {
													if (!newName || newName === oldName) return;
													if (props[newName]) return; // prevent duplicates
													const newProps: typeof props = {};
													for (const [k, v] of Object.entries(props)) {
														newProps[k === oldName ? newName : k] = v;
													}
													const newRequired = requiredList.map((r) =>
														r === oldName ? newName : r,
													);
													updateSchema(newProps, newRequired);
												};

												const handleUpdateParam = (
													name: string,
													updates: Partial<{
														type: string;
														description: string;
														default: string | null;
													}>,
												) => {
													const newProps = { ...props };
													const existing = { ...newProps[name] };
													if (updates.type !== undefined) existing.type = updates.type;
													if (updates.description !== undefined)
														existing.description = updates.description || undefined;
													if (updates.default !== undefined) {
														if (updates.default === "" || updates.default === null) {
															delete existing.default;
														} else {
															existing.default = updates.default;
														}
													}
													newProps[name] = existing;
													updateSchema(newProps, requiredList);
												};

												const handleToggleRequired = (name: string) => {
													const isReq = requiredList.includes(name);
													const newRequired = isReq
														? requiredList.filter((r) => r !== name)
														: [...requiredList, name];
													updateSchema(props, newRequired);
												};

												const handleRemoveParam = (name: string) => {
													const newProps = { ...props };
													delete newProps[name];
													const newRequired = requiredList.filter((r) => r !== name);
													updateSchema(newProps, newRequired);
												};

												const handleAddParam = () => {
													let newName = "new_param";
													let counter = 1;
													while (props[newName]) {
														newName = `new_param_${counter++}`;
													}
													const newProps = {
														...props,
														[newName]: { type: "string", description: "" },
													};
													updateSchema(newProps, requiredList);
												};

												return (
													<FormItem>
														<div className="flex items-center justify-between">
															<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
																Input Parameters
															</FormLabel>
															<button
																type="button"
																onClick={handleAddParam}
																className="flex items-center gap-1 h-6 px-2 bg-white border border-[#D1D1D1] text-[9px] font-bold uppercase hover:bg-[#F3F2EE] transition-colors"
															>
																<Plus size={10} /> Add Field
															</button>
														</div>

														{/* Visual parameter editor */}
														{paramEntries.length > 0 ? (
															<div className="space-y-2">
																{paramEntries.map(([paramName, prop]) => {
																	const isRequired = requiredList.includes(paramName);
																	return (
																		<div
																			key={paramName}
																			className="p-3 bg-[#FAFAF9] border border-[#E5E5E5] space-y-2"
																		>
																			<div className="flex items-center gap-2">
																				<Input
																					defaultValue={paramName}
																					onBlur={(e) =>
																						handleRenameParam(paramName, e.target.value.trim())
																					}
																					className="h-7 w-[140px] font-mono text-xs bg-white border-[#D1D1D1] focus:border-[#1A1A1A]"
																					placeholder="param_name"
																				/>
																				<select
																					value={prop.type || "string"}
																					onChange={(e) =>
																						handleUpdateParam(paramName, { type: e.target.value })
																					}
																					className="h-7 px-2 text-[10px] font-mono bg-white border border-[#D1D1D1] focus:border-[#1A1A1A] focus:outline-none"
																				>
																					<option value="string">string</option>
																					<option value="number">number</option>
																					<option value="boolean">boolean</option>
																				</select>
																				<button
																					type="button"
																					onClick={() => handleToggleRequired(paramName)}
																					className={`text-[9px] font-mono uppercase px-1.5 py-0.5 border transition-colors cursor-pointer ${
																						isRequired
																							? "bg-[#FEE2E2] border-[#FCA5A5] text-[#991B1B] hover:bg-[#E0F2FE] hover:border-[#7DD3FC] hover:text-[#0369A1]"
																							: "bg-[#E0F2FE] border-[#7DD3FC] text-[#0369A1] hover:bg-[#FEE2E2] hover:border-[#FCA5A5] hover:text-[#991B1B]"
																					}`}
																					title={
																						isRequired
																							? "Click to make optional"
																							: "Click to make required"
																					}
																				>
																					{isRequired ? "required" : "optional"}
																				</button>
																				<button
																					type="button"
																					onClick={() => handleRemoveParam(paramName)}
																					className="ml-auto p-1 text-[#888] hover:text-red-600 hover:bg-red-50 rounded transition-colors"
																					title="Remove parameter"
																				>
																					<Trash2 size={12} />
																				</button>
																			</div>
																			<Input
																				value={prop.description || ""}
																				onChange={(e) =>
																					handleUpdateParam(paramName, {
																						description: e.target.value,
																					})
																				}
																				placeholder="Description (e.g. The product ID to look up)"
																				className="h-7 text-xs bg-white border-[#D1D1D1] focus:border-[#1A1A1A]"
																			/>
																			{!isRequired && (
																				<Input
																					value={prop.default || ""}
																					onChange={(e) =>
																						handleUpdateParam(paramName, {
																							default: e.target.value,
																						})
																					}
																					placeholder="Default value (leave empty for no default)"
																					className="h-7 text-xs font-mono bg-white border-[#D1D1D1] focus:border-[#1A1A1A]"
																				/>
																			)}
																		</div>
																	);
																})}
															</div>
														) : (
															<div className="border border-dashed border-[#D1D1D1] p-4 text-center text-[9px] font-mono text-[#AAA] uppercase">
																No parameters — click &quot;Add Field&quot; to create one
															</div>
														)}

														{/* Advanced: raw JSON toggle */}
														<details className="mt-3">
															<summary className="flex items-center gap-1 text-[10px] font-mono uppercase text-[#888] hover:text-[#555] cursor-pointer transition-colors">
																<ChevronDown size={12} />
																Advanced: Edit JSON
															</summary>
															<div className="mt-2">
																<FormControl>
																	<Textarea
																		{...field}
																		placeholder='{"type": "object", "properties": {...}}'
																		className="min-h-[150px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
																	/>
																</FormControl>
															</div>
														</details>

														<FormMessage />
													</FormItem>
												);
											}}
										/>
									</div>
								</section>
							)}

							{/* Mock Configuration */}
							{executionType === "mock" && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm">
									<SectionHeader icon={Terminal} title="Mock Configuration" />
									<div className="p-5 space-y-4">
										<FormField
											control={form.control}
											name="inputSchemaJson"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
														Input Schema (JSON)
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															placeholder='{"type": "object", "properties": {...}}'
															className="min-h-[120px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="mockResponse"
											render={({ field }) => (
												<FormItem>
													<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
														Mock Response
													</FormLabel>
													<FormControl>
														<Textarea
															{...field}
															placeholder='{"temperature": 72, "conditions": "sunny"}'
															className="min-h-[120px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
														/>
													</FormControl>
													<FormDescription className="text-[9px] text-[#888]">
														Use ${"{"}param{"}"} to include input values
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								</section>
							)}

							{/* Display Configuration - For HTTP/Mock types */}
							{(executionType === "http" || executionType === "mock") && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm">
									<SectionHeader icon={Eye} title="Display Configuration" />
									<div className="p-5 space-y-4">
										{/* Display Type Toggle Buttons */}
										<div>
											<span className="block text-[9px] font-mono uppercase text-[#888] mb-2">
												Display Type
											</span>
											<div className="flex flex-wrap gap-2">
												{DISPLAY_TYPES.map(({ value, label, icon: Icon }) => (
													<button
														key={value}
														type="button"
														onClick={() => form.setValue("displayType", value)}
														className={`flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase border transition-colors ${
															watchedDisplayType === value
																? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
																: "bg-white border-[#D1D1D1] hover:border-[#1A1A1A]"
														}`}
													>
														<Icon size={14} />
														{label}
													</button>
												))}
											</div>
											<p className="text-[9px] text-[#888] mt-1">
												How the tool&apos;s response will be displayed in the chat
											</p>
										</div>

										{/* Text Template - show for text display type when sample data available */}
										{watchedDisplayType === "text" && testResponse != null ? (
											<div>
												<label
													htmlFor="textTemplate"
													className="block text-[9px] font-mono uppercase text-[#888] mb-2"
												>
													Text Template
												</label>
												<FormField
													control={form.control}
													name="displayTextFallback"
													render={({ field }) => (
														<FormItem>
															<FormControl>
																<Textarea
																	id="textTemplate"
																	{...field}
																	placeholder="{{name}} — {{price}} per night ({{provider}})"
																	rows={3}
																	className="font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
																/>
															</FormControl>
															<FormDescription className="text-[9px] text-[#888]">
																Use {"{{field}}"} to insert values. Leave blank to let the AI format
																the response.
															</FormDescription>
														</FormItem>
													)}
												/>
												{leafPaths.length > 0 && (
													<div className="mt-3 p-3 bg-[#FAFAF9] border border-[#D1D1D1]">
														<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
															Available Fields — click to insert
														</div>
														<div className="flex flex-wrap gap-1.5">
															{leafPaths.map((path) => (
																<button
																	key={path}
																	type="button"
																	onClick={() =>
																		form.setValue(
																			"displayTextFallback",
																			`${form.getValues("displayTextFallback") || ""}{{${path}}}`,
																		)
																	}
																	className="px-2 py-0.5 bg-white border border-[#D1D1D1] hover:border-[#1A1A1A] text-[10px] font-mono text-[#555] transition-colors"
																>
																	{path}
																</button>
															))}
														</div>
													</div>
												)}
											</div>
										) : null}

										{/* Text fallback for text type without sample data */}
										{watchedDisplayType === "text" && testResponse == null ? (
											<FormField
												control={form.control}
												name="displayTextFallback"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
															Text Template
														</FormLabel>
														<FormControl>
															<Input
																{...field}
																placeholder="{{name}} — {{price}} (or leave blank for AI formatting)"
																className="border-[#D1D1D1] focus:border-[#1A1A1A]"
															/>
														</FormControl>
														<FormDescription className="text-[9px] text-[#888]">
															Test the API below to enable click-to-insert fields and live preview
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										) : null}

										{/* Field Mappings - show for non-text types */}
										{watchedDisplayType !== "text" && testResponse != null ? (
											<div>
												<span className="block text-[9px] font-mono uppercase text-[#888] mb-2">
													Field Mappings
												</span>
												<Button
													type="button"
													variant="outline"
													onClick={() => setApiTestOpen(true)}
													className="justify-start w-full"
												>
													<Settings className="w-4 h-4 mr-2" />
													Configure Field Mappings
												</Button>
												{Object.keys(currentFieldMappings).length > 0 && (
													<div className="mt-3 p-3 bg-[#FAFAF9] border border-[#D1D1D1]">
														<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
															Mapped Fields
														</div>
														<div className="space-y-1">
															{Object.entries(currentFieldMappings).map(
																([displayField, apiPath]) => (
																	<div
																		key={displayField}
																		className="flex items-center gap-2 text-xs"
																	>
																		<span className="font-medium capitalize">{displayField}:</span>
																		<code className="bg-[#F3F2EE] px-1.5 py-0.5 text-[#555]">
																			{apiPath}
																		</code>
																	</div>
																),
															)}
														</div>
													</div>
												)}

												{/* Advanced: raw JSON toggle */}
												<button
													type="button"
													onClick={() => setShowAdvancedMappings(!showAdvancedMappings)}
													className="mt-3 flex items-center gap-1 text-[10px] font-mono uppercase text-[#888] hover:text-[#555] transition-colors"
												>
													<ChevronDown
														size={12}
														className={`transition-transform ${showAdvancedMappings ? "rotate-180" : ""}`}
													/>
													Advanced: Edit JSON
												</button>
												{showAdvancedMappings && (
													<FormField
														control={form.control}
														name="displayFieldMappingsJson"
														render={({ field }) => (
															<FormItem className="mt-2">
																<FormControl>
																	<Textarea
																		{...field}
																		placeholder='{"title": "product_name", "price": "cost", "image": "image_url", "description": "summary"}'
																		className="min-h-[80px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
																	/>
																</FormControl>
																<FormDescription className="text-[9px] text-[#888]">
																	Map your API response fields to display fields (title, price,
																	image, description, url)
																</FormDescription>
																<FormMessage />
															</FormItem>
														)}
													/>
												)}
											</div>
										) : null}

										{/* Field Mappings fallback - no sample data */}
										{watchedDisplayType !== "text" && testResponse == null ? (
											<FormField
												control={form.control}
												name="displayFieldMappingsJson"
												render={({ field }) => (
													<FormItem>
														<FormLabel className="text-[9px] font-mono uppercase text-[#888]">
															Field Mappings (JSON)
														</FormLabel>
														<FormControl>
															<Textarea
																{...field}
																placeholder='{"title": "product_name", "price": "cost", "image": "image_url", "description": "summary"}'
																className="min-h-[80px] font-mono text-sm border-[#D1D1D1] focus:border-[#1A1A1A]"
															/>
														</FormControl>
														<FormDescription className="text-[9px] text-[#888]">
															Map your API response fields to display fields (title, price, image,
															description, url)
														</FormDescription>
														<FormMessage />
													</FormItem>
												)}
											/>
										) : null}

										{/* Test API / Configure Field Mappings button for HTTP type */}
										{executionType === "http" && (
											<div>
												<Button
													type="button"
													variant="outline"
													size="sm"
													onClick={() => setApiTestOpen(true)}
													disabled={!form.watch("httpUrl")}
												>
													<Play className="w-3 h-3 mr-1" />
													{testResponse != null
														? "Re-test API & Update Mappings"
														: "Test API & Configure Mappings"}
												</Button>
											</div>
										)}

										{/* ApiTestDialog */}
										<ApiTestDialog
											open={apiTestOpen}
											onOpenChange={setApiTestOpen}
											httpUrl={form.watch("httpUrl") || ""}
											httpMethod={form.watch("httpMethod") || "GET"}
											httpHeaders={(() => {
												try {
													return JSON.parse(form.watch("httpHeadersJson") || "{}");
												} catch {
													return {};
												}
											})()}
											inputSchema={(() => {
												try {
													return JSON.parse(form.watch("inputSchemaJson") || "{}");
												} catch {
													return { properties: {} };
												}
											})()}
											initialResponse={testResponse || undefined}
											initialMappings={currentFieldMappings}
											isMultiItem={["product_carousel", "product_grid", "table"].includes(
												watchedDisplayType,
											)}
											initialDataPath={dataPath || undefined}
											onDataPathDetected={(dp) => setDataPath(dp || null)}
											onTestComplete={(data) => setTestResponse(data)}
											displayType={watchedDisplayType}
											onDisplayTypeChange={(type) =>
												form.setValue("displayType", type as ToolFormData["displayType"])
											}
											textTemplate={form.watch("displayTextFallback") || ""}
											onTextTemplateChange={(template) =>
												form.setValue("displayTextFallback", template)
											}
											toolName={form.watch("name") || "preview"}
											onFieldSelect={(path, targetField) => {
												const mappings = (() => {
													try {
														return JSON.parse(form.getValues("displayFieldMappingsJson") || "{}");
													} catch {
														return {};
													}
												})();
												mappings[targetField] = path;
												form.setValue(
													"displayFieldMappingsJson",
													JSON.stringify(mappings, null, 2),
												);
												if (form.getValues("displayType") === "text") {
													form.setValue("displayType", "product_card");
												}
											}}
										/>

										{/* Live Preview */}
										{testResponse != null &&
											(watchedDisplayType !== "text" || form.watch("displayTextFallback")) && (
												<div>
													<span className="block text-[9px] font-mono uppercase text-[#888] mb-2">
														Preview
													</span>
													<div className="border border-[#D1D1D1] rounded-lg bg-white p-4">
														<BlockRenderer
															block={{
																type: "tool_result",
																toolName: form.watch("name") || "preview",
																result: testResponse,
																displayConfig: {
																	type: watchedDisplayType as DisplayConfig["type"],
																	...(Object.keys(currentFieldMappings).length > 0 && {
																		fieldMappings: currentFieldMappings,
																	}),
																	...(dataPath && { dataPath }),
																	...(watchedDisplayType === "text" &&
																		form.watch("displayTextFallback") && {
																			textFallback: form.watch("displayTextFallback"),
																		}),
																},
															}}
														/>
													</div>
													<p className="text-[10px] text-[#888] mt-1">
														This is how the tool result will appear in the chat widget.
													</p>
												</div>
											)}
									</div>
								</section>
							)}

							{/* Interface Parameters - For form type */}
							{executionType === "form" && formSchema.fields.length > 0 && (
								<section className="bg-white border border-[#D1D1D1] shadow-sm">
									<SectionHeader icon={Settings} title="Interface Parameters" />
									<div className="grid grid-cols-1 gap-6 p-5 md:grid-cols-2">
										<div>
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
												Intro Text
											</span>
											<Input
												value={formSchema.introText || ""}
												onChange={(e) =>
													setFormSchema({ ...formSchema, introText: e.target.value })
												}
												className="w-full h-9 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs focus:border-[#1A1A1A]"
											/>
										</div>
										<div>
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
												Submit Label
											</span>
											<Input
												value={formSchema.submitLabel || "Submit"}
												onChange={(e) =>
													setFormSchema({ ...formSchema, submitLabel: e.target.value })
												}
												className="w-full h-9 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs focus:border-[#1A1A1A]"
											/>
										</div>
										<div>
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
												Success Message
											</span>
											<Input
												value={formSchema.successMessage || ""}
												onChange={(e) =>
													setFormSchema({ ...formSchema, successMessage: e.target.value })
												}
												className="w-full h-9 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs focus:border-[#1A1A1A] text-green-700 bg-green-50/50"
											/>
										</div>
										<div>
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1 block">
												Error Message
											</span>
											<Input
												value={formSchema.errorMessage || ""}
												onChange={(e) =>
													setFormSchema({ ...formSchema, errorMessage: e.target.value })
												}
												className="w-full h-9 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs focus:border-[#1A1A1A] text-red-700 bg-red-50/50"
											/>
										</div>
									</div>
								</section>
							)}
						</div>
					</form>
				</Form>
			</main>
		</div>
	);
}
