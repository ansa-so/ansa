"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ArrowDown,
	Bell,
	BookOpen,
	ChevronDown,
	ChevronRight,
	Clock,
	CreditCard,
	DollarSign,
	Eye,
	Hand,
	HelpCircle,
	LogOut,
	Mail,
	MessageCircle,
	MessageSquare,
	MousePointerClick,
	PlayCircle,
	Plus,
	ScrollText,
	ShoppingBag,
	ShoppingCart,
	Star,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { CodeBlock } from "@/components/code-block";
import { FormBuilder } from "@/components/form-builder";
import { TemplatesSection } from "@/components/triggers/templates-section";
import { TriggersTable } from "@/components/triggers/triggers-table";
import { CustomToggle } from "@/components/ui/custom-toggle";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAgents } from "@/lib/agent-context";
import {
	type AgentTool,
	type CreateToolData,
	type CreateTriggerData,
	createTool,
	createTrigger,
	deleteTrigger,
	type FormPostAction,
	type FormSchema,
	getMarketplaceTool,
	getTriggerStats,
	listTools,
	listTriggers,
	listTriggerTemplates,
	type ToolTemplateDetail,
	type Trigger,
	type TriggerActionType,
	type TriggerStats,
	type TriggerTemplate,
	type TriggerType,
	toggleTrigger,
	updateTrigger,
} from "@/lib/api";

const triggerSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional(),
	triggerType: z.enum(["time_on_page", "scroll_depth", "exit_intent", "page_view", "custom_event"]),
	actionType: z.enum(["open_chat", "show_form", "show_bubble"]),
	// Conditions
	timeOnPage: z.coerce.number().min(1).optional(),
	scrollDepth: z.coerce.number().min(1).max(100).optional(),
	page: z.string().optional(),
	event: z.string().optional(),
	// Action config
	message: z.string().optional(),
	toolId: z.string().optional(),
	duration: z.coerce.number().min(1).optional(),
	priority: z.coerce.number().default(0),
	isEnabled: z.boolean().default(true),
	triggerOnce: z.boolean().default(true),
});

type TriggerFormData = z.infer<typeof triggerSchema>;

const triggerTypeOptions: { value: TriggerType; label: string; icon: React.ElementType }[] = [
	{ value: "time_on_page", label: "Time on Page", icon: Clock },
	{ value: "scroll_depth", label: "Scroll Depth", icon: ScrollText },
	{ value: "exit_intent", label: "Exit Intent", icon: MousePointerClick },
	{ value: "page_view", label: "Page View", icon: Eye },
	{ value: "custom_event", label: "Custom Event", icon: Zap },
];

const actionTypeOptions: { value: TriggerActionType; label: string; icon: React.ElementType }[] = [
	{ value: "open_chat", label: "Open Chat", icon: MessageSquare },
	{ value: "show_form", label: "Show Form", icon: ScrollText },
	{ value: "show_bubble", label: "Show Bubble", icon: MessageSquare },
];

// Icon mapping for trigger templates
const templateIconMap: Record<string, React.ElementType> = {
	hand: Hand,
	"arrow-down": ArrowDown,
	"log-out": LogOut,
	"dollar-sign": DollarSign,
	"shopping-bag": ShoppingBag,
	bell: Bell,
	"shopping-cart": ShoppingCart,
	"credit-card": CreditCard,
	mail: Mail,
	"play-circle": PlayCircle,
	"message-circle": MessageCircle,
	"help-circle": HelpCircle,
	"book-open": BookOpen,
	star: Star,
	"trending-up": TrendingUp,
	zap: Zap,
};

function getTemplateIcon(iconName: string): React.ElementType {
	return templateIconMap[iconName] || Zap;
}

const categoryLabels: Record<string, string> = {
	all: "All",
	engagement: "Engagement",
	conversion: "Conversion",
	ecommerce: "E-commerce",
	"lead-generation": "Lead Generation",
	support: "Support",
	feedback: "Feedback",
};

export default function TriggersPage() {
	const { currentAgent } = useAgents();
	const [triggers, setTriggers] = useState<Trigger[]>([]);
	const [triggerStats, setTriggerStats] = useState<Record<string, TriggerStats>>({});
	const [tools, setTools] = useState<AgentTool[]>([]);
	const [templates, setTemplates] = useState<TriggerTemplate[]>([]);
	const [selectedCategory, setSelectedCategory] = useState<string>("all");
	const [isTemplatesExpanded, setIsTemplatesExpanded] = useState(true);
	const [isLoading, setIsLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingTrigger, setEditingTrigger] = useState<Trigger | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Search and filter state for new design
	const [searchValue, setSearchValue] = useState("");
	const [activeFilter, setActiveFilter] = useState("all");

	// Inline form creation state
	const [isCreatingNewForm, setIsCreatingNewForm] = useState(false);
	const [formTemplate, setFormTemplate] = useState<ToolTemplateDetail | null>(null);
	const [newFormSchema, setNewFormSchema] = useState<FormSchema>({
		fields: [],
		submitLabel: "Submit",
		successMessage: "Thank you!",
		errorMessage: "Something went wrong.",
	});
	const [newFormPostActions, setNewFormPostActions] = useState<FormPostAction[]>([]);
	const [newFormName, setNewFormName] = useState("");

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const form = useForm<TriggerFormData>({
		resolver: zodResolver(triggerSchema) as any,
		defaultValues: {
			name: "",
			description: "",
			triggerType: "time_on_page",
			actionType: "open_chat",
			timeOnPage: 30,
			scrollDepth: undefined,
			page: "",
			event: "",
			message: "",
			toolId: "",
			duration: 10,
			priority: 0,
			isEnabled: true,
		},
	});

	const watchTriggerType = form.watch("triggerType");
	const watchActionType = form.watch("actionType");
	const watchEvent = form.watch("event");
	const watchMessage = form.watch("message");
	const watchTimeOnPage = form.watch("timeOnPage");
	const watchScrollDepth = form.watch("scrollDepth");
	const watchPage = form.watch("page");

	// Generate equivalent JS code for triggers
	const getEquivalentCode = () => {
		const lines: string[] = [];

		// Action code
		let actionCode = "";
		if (watchActionType === "open_chat") {
			actionCode = watchMessage ? `window.ansa.open("${watchMessage}");` : "window.ansa.open();";
		} else if (watchActionType === "show_bubble") {
			actionCode = `window.ansa.showBubble("xxx");`;
		} else if (watchActionType === "show_form") {
			actionCode = `window.ansa.showForm("contact_form");`;
		}

		switch (watchTriggerType) {
			case "time_on_page":
				lines.push(`// Open chat after ${watchTimeOnPage || 30} seconds`);
				lines.push(`setTimeout(() => {`);
				lines.push(`  ${actionCode}`);
				lines.push(`}, ${(watchTimeOnPage || 30) * 1000});`);
				break;
			case "scroll_depth":
				lines.push(`// Open chat when user scrolls to ${watchScrollDepth || 50}%`);
				lines.push(`let maxScroll = 0;`);
				lines.push(`window.addEventListener("scroll", function handler() {`);
				lines.push(
					`  const depth = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;`,
				);
				lines.push(`  if (depth > maxScroll) maxScroll = depth;`);
				lines.push(`  if (maxScroll >= ${watchScrollDepth || 50}) {`);
				lines.push(`    ${actionCode}`);
				lines.push(`    window.removeEventListener("scroll", handler);`);
				lines.push(`  }`);
				lines.push(`});`);
				break;
			case "exit_intent":
				lines.push(`// Open chat when user moves mouse to leave page`);
				lines.push(`document.addEventListener("mouseout", function handler(e) {`);
				lines.push(`  if (e.clientY <= 0) {`);
				lines.push(`    ${actionCode}`);
				lines.push(`    document.removeEventListener("mouseout", handler);`);
				lines.push(`  }`);
				lines.push(`});`);
				break;
			case "page_view":
				lines.push(`// Open chat on page load${watchPage ? ` (on ${watchPage})` : ""}`);
				lines.push(actionCode);
				break;
			case "custom_event": {
				const eventName = watchEvent || "my_event";
				lines.push(`// Dispatch a custom event to trigger the action`);
				lines.push(`window.ansa.trigger("${eventName}");`);
				lines.push(``);
				lines.push(`// Or call directly:`);
				lines.push(actionCode);
				break;
			}
		}

		return lines.join("\n");
	};

	const loadTriggers = useCallback(async () => {
		if (!currentAgent?.id) return;
		try {
			setIsLoading(true);
			const [triggersData, toolsData, statsData, templatesData] = await Promise.all([
				listTriggers(currentAgent.id),
				listTools(currentAgent.id),
				getTriggerStats(currentAgent.id).catch(() => ({})),
				listTriggerTemplates().catch(() => []),
			]);
			setTriggers(triggersData);
			setTools(toolsData.filter((t) => t.executionType === "form"));
			setTriggerStats(statsData);
			setTemplates(templatesData);
			// Collapse templates section if user already has triggers
			setIsTemplatesExpanded(triggersData.length === 0);
		} catch (error) {
			console.error("Failed to load triggers:", error);
			toast.error("Failed to load triggers");
		} finally {
			setIsLoading(false);
		}
	}, [currentAgent?.id]);

	useEffect(() => {
		loadTriggers();
	}, [loadTriggers]);

	const openCreateDialog = () => {
		setEditingTrigger(null);
		form.reset({
			name: "",
			description: "",
			triggerType: "time_on_page",
			actionType: "open_chat",
			timeOnPage: 30,
			scrollDepth: undefined,
			page: "",
			event: "",
			message: "",
			toolId: "",
			duration: 10,
			priority: 0,
			isEnabled: true,
			triggerOnce: true,
		});
		// Reset inline form state
		setIsCreatingNewForm(false);
		setFormTemplate(null);
		setIsDialogOpen(true);
	};

	const openTemplateDialog = async (template: TriggerTemplate) => {
		setEditingTrigger(null);
		form.reset({
			name: template.name,
			description: template.description,
			triggerType: template.triggerType,
			actionType: template.actionType,
			timeOnPage: template.conditions.timeOnPage,
			scrollDepth: template.conditions.scrollDepth,
			page: template.conditions.page || "",
			event: template.conditions.event || "",
			message: template.actionConfig.message || "",
			toolId: template.actionConfig.toolId || "",
			duration: template.actionConfig.duration || 10,
			priority: 0,
			isEnabled: true,
			triggerOnce: template.triggerOnce ?? true,
		});

		// If this template requires a form, fetch the form template from marketplace
		if (template.actionType === "show_form" && template.formTemplateSlug) {
			try {
				const formTpl = await getMarketplaceTool(template.formTemplateSlug);
				setFormTemplate(formTpl);
				setNewFormSchema(
					formTpl.formSchema || {
						fields: [],
						submitLabel: "Submit",
						successMessage: "Thank you!",
						errorMessage: "Something went wrong.",
					},
				);
				setNewFormName(formTpl.name);
				setNewFormPostActions([]);
				setIsCreatingNewForm(true);
			} catch (e) {
				console.error("Failed to load form template:", e);
				setIsCreatingNewForm(false);
				setFormTemplate(null);
			}
		} else {
			setIsCreatingNewForm(false);
			setFormTemplate(null);
		}

		setIsDialogOpen(true);
	};

	// Computed values for templates
	const categories = ["all", ...new Set(templates.map((t) => t.category))];

	const openEditDialog = (trigger: Trigger) => {
		setEditingTrigger(trigger);
		form.reset({
			name: trigger.name,
			description: trigger.description || "",
			triggerType: trigger.triggerType,
			actionType: trigger.actionType,
			timeOnPage: trigger.conditions.timeOnPage,
			scrollDepth: trigger.conditions.scrollDepth,
			page: trigger.conditions.page || "",
			event: trigger.conditions.event || "",
			message: trigger.actionConfig.message || "",
			toolId: trigger.actionConfig.toolId || "",
			duration: trigger.actionConfig.duration || 10,
			priority: trigger.priority,
			isEnabled: trigger.isEnabled,
			triggerOnce: trigger.triggerOnce ?? true,
		});
		// Reset inline form state when editing
		setIsCreatingNewForm(false);
		setFormTemplate(null);
		setIsDialogOpen(true);
	};

	const handleSubmit = async (data: TriggerFormData) => {
		if (!currentAgent?.id) return;

		setIsSubmitting(true);
		try {
			let toolId = data.toolId;

			// If creating a new form inline, create the form tool first
			if (isCreatingNewForm && data.actionType === "show_form" && formTemplate) {
				if (newFormSchema.fields.length === 0) {
					toast.error("Please add at least one field to the form");
					setIsSubmitting(false);
					return;
				}

				const toolData: CreateToolData = {
					agentId: currentAgent.id,
					name: newFormName.toLowerCase().replace(/\s+/g, "_"),
					description: formTemplate.toolDescription || `Form: ${newFormName}`,
					inputSchema: formTemplate.inputSchema || { type: "object", properties: {}, required: [] },
					executionType: "form",
					formSchema: newFormSchema,
					formPostActions: newFormPostActions.length > 0 ? newFormPostActions : undefined,
				};

				const newTool = await createTool(toolData);
				toolId = newTool.id;
				toast.success("Form created successfully");
			}

			const triggerData: CreateTriggerData = {
				name: data.name,
				description: data.description,
				triggerType: data.triggerType,
				conditions: {},
				actionType: data.actionType,
				actionConfig: {},
				priority: data.priority,
				isEnabled: data.isEnabled,
				triggerOnce: data.triggerOnce,
			};

			// Set conditions based on trigger type
			if (data.triggerType === "time_on_page" && data.timeOnPage) {
				triggerData.conditions.timeOnPage = data.timeOnPage;
			}
			if (data.triggerType === "scroll_depth" && data.scrollDepth) {
				triggerData.conditions.scrollDepth = data.scrollDepth;
			}
			if (data.page) {
				triggerData.conditions.page = data.page;
			}
			if (data.triggerType === "custom_event" && data.event) {
				triggerData.conditions.event = data.event;
			}

			// Set action config based on action type
			if (data.message) {
				triggerData.actionConfig.message = data.message;
			}
			if (data.actionType === "show_form" && toolId) {
				triggerData.actionConfig.toolId = toolId;
			}
			if (data.actionType === "show_bubble" && data.duration) {
				triggerData.actionConfig.duration = data.duration;
			}

			if (editingTrigger) {
				await updateTrigger(editingTrigger.id, triggerData);
			} else {
				await createTrigger(currentAgent.id, triggerData);
			}

			setIsDialogOpen(false);
			// Reset inline form state
			setIsCreatingNewForm(false);
			setFormTemplate(null);
			setNewFormSchema({
				fields: [],
				submitLabel: "Submit",
				successMessage: "Thank you!",
				errorMessage: "Something went wrong.",
			});
			setNewFormPostActions([]);
			setNewFormName("");
			loadTriggers();
		} catch (error) {
			console.error("Failed to save trigger:", error);
			toast.error(editingTrigger ? "Failed to update trigger" : "Failed to create trigger");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleToggle = async (trigger: Trigger) => {
		try {
			await toggleTrigger(trigger.id);
			loadTriggers();
			toast.success(`Trigger ${trigger.isEnabled ? "disabled" : "enabled"}`);
		} catch (error) {
			console.error("Failed to toggle trigger:", error);
			toast.error("Failed to toggle trigger");
		}
	};

	const handleDelete = async (trigger: Trigger) => {
		if (!confirm(`Are you sure you want to delete "${trigger.name}"?`)) return;

		try {
			await deleteTrigger(trigger.id);
			loadTriggers();
			toast.success("Trigger deleted");
		} catch (error) {
			console.error("Failed to delete trigger:", error);
			toast.error("Failed to delete trigger");
		}
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE] flex flex-col">
			{/* Custom Header */}
			<header className="h-20 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 shrink-0">
				<div>
					<h1 className="text-2xl font-medium tracking-tight">Triggers</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-1">
						<span>Logic Engine: Online</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Active Listeners: {triggers.filter((t) => t.isEnabled).length}</span>
					</div>
				</div>

				<button
					type="button"
					onClick={openCreateDialog}
					className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-lg"
				>
					<Plus size={14} /> Create Trigger
				</button>
			</header>

			<div className="flex-1 p-8 overflow-y-auto">
				<div className="max-w-[1600px] mx-auto space-y-8">
					{/* Collapse/Expand Templates Toggle */}
					{templates.length > 0 && (
						<button
							type="button"
							onClick={() => setIsTemplatesExpanded(!isTemplatesExpanded)}
							className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase hover:text-[#1A1A1A] transition-colors"
						>
							{isTemplatesExpanded ? (
								<>
									<ChevronDown size={12} />
									Hide Templates
								</>
							) : (
								<>
									<ChevronRight size={12} />
									Show Templates ({templates.length})
								</>
							)}
						</button>
					)}

					{/* Templates Section */}
					{templates.length > 0 && isTemplatesExpanded && (
						<TemplatesSection
							templates={templates}
							categories={categories}
							categoryLabels={categoryLabels}
							selectedCategory={selectedCategory}
							onCategoryChange={setSelectedCategory}
							onTemplateSelect={openTemplateDialog}
							getTemplateIcon={getTemplateIcon}
						/>
					)}

					{/* Triggers Table or Empty State */}
					{isLoading ? (
						<div className="bg-white border border-[#D1D1D1] shadow-sm">
							<div className="flex items-center justify-center py-12">
								<div className="w-8 h-8 border-4 border-[#1A1A1A] border-t-transparent rounded-full animate-spin" />
							</div>
						</div>
					) : triggers.length === 0 ? (
						<div className="bg-white border border-[#D1D1D1] shadow-sm py-12 text-center">
							<Zap className="w-12 h-12 mx-auto mb-4 text-[#888]" />
							<h2 className="mb-2 text-lg font-medium">No triggers yet</h2>
							<p className="text-[#888] text-sm mb-6">
								Create your first trigger to proactively engage visitors
							</p>
							<button
								type="button"
								onClick={openCreateDialog}
								className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
							>
								<Plus size={14} /> Create Trigger
							</button>
						</div>
					) : (
						<TriggersTable
							triggers={triggers}
							stats={triggerStats}
							onEdit={openEditDialog}
							onDelete={handleDelete}
							onToggle={handleToggle}
							isLoading={isLoading}
							searchValue={searchValue}
							onSearchChange={setSearchValue}
							activeFilter={activeFilter}
							onFilterChange={setActiveFilter}
						/>
					)}
				</div>
			</div>

			<Dialog
				open={isDialogOpen}
				onOpenChange={(open) => {
					setIsDialogOpen(open);
					if (!open) {
						// Reset inline form state when closing
						setIsCreatingNewForm(false);
						setFormTemplate(null);
						setNewFormSchema({
							fields: [],
							submitLabel: "Submit",
							successMessage: "Thank you!",
							errorMessage: "Something went wrong.",
						});
						setNewFormPostActions([]);
						setNewFormName("");
					}
				}}
			>
				<DialogContent
					className={`max-h-[90vh] overflow-y-auto border-[#D1D1D1] bg-white ${isCreatingNewForm ? "max-w-4xl" : "max-w-2xl"}`}
				>
					<DialogHeader className="border-b border-[#F3F2EE] pb-4">
						<DialogTitle className="text-xl font-medium tracking-tight">
							{editingTrigger ? "Edit Trigger" : "Create Trigger"}
						</DialogTitle>
						<DialogDescription className="text-[10px] font-mono text-[#888] uppercase">
							Configure when and how to engage your visitors
						</DialogDescription>
					</DialogHeader>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className="pt-4 space-y-6">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
											Name
										</FormLabel>
										<FormControl>
											<Input
												placeholder="Welcome Message"
												{...field}
												className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="description"
								render={({ field }) => (
									<FormItem>
										<FormLabel className="text-[9px] font-mono uppercase tracking-widest text-[#888]">
											Description
										</FormLabel>
										<FormControl>
											<Textarea
												placeholder="Optional description of what this trigger does"
												{...field}
												className="border-[#D1D1D1] focus:border-[#1A1A1A] focus:ring-0"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="triggerType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Trigger Type</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select trigger type" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{triggerTypeOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															<div className="flex items-center gap-2">
																<option.icon className="w-4 h-4" />
																{option.label}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>

								<FormField
									control={form.control}
									name="actionType"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Action</FormLabel>
											<Select onValueChange={field.onChange} defaultValue={field.value}>
												<FormControl>
													<SelectTrigger>
														<SelectValue placeholder="Select action" />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													{actionTypeOptions.map((option) => (
														<SelectItem key={option.value} value={option.value}>
															<div className="flex items-center gap-2">
																<option.icon className="w-4 h-4" />
																{option.label}
															</div>
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{/* Condition fields based on trigger type */}
							{watchTriggerType === "time_on_page" && (
								<FormField
									control={form.control}
									name="timeOnPage"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Time on Page (seconds)</FormLabel>
											<FormControl>
												<Input type="number" min={1} {...field} />
											</FormControl>
											<FormDescription>
												Trigger after the visitor has been on the page for this many seconds
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{watchTriggerType === "scroll_depth" && (
								<FormField
									control={form.control}
									name="scrollDepth"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Scroll Depth (%)</FormLabel>
											<FormControl>
												<Input type="number" min={1} max={100} {...field} />
											</FormControl>
											<FormDescription>
												Trigger when the visitor has scrolled this percentage of the page
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{watchTriggerType === "custom_event" && (
								<FormField
									control={form.control}
									name="event"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Event Name</FormLabel>
											<FormControl>
												<Input placeholder="add_to_cart" {...field} />
											</FormControl>
											<FormDescription>The custom event name to listen for</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<FormField
								control={form.control}
								name="page"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Page URL Pattern (optional)</FormLabel>
										<FormControl>
											<Input placeholder="/pricing/*" {...field} />
										</FormControl>
										<FormDescription>
											Only trigger on pages matching this pattern (supports * wildcard)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							{/* Action config fields based on action type */}
							{(watchActionType === "open_chat" || watchActionType === "show_bubble") && (
								<FormField
									control={form.control}
									name="message"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Message</FormLabel>
											<FormControl>
												<Textarea placeholder="Hi! 👋 Can I help you with anything?" {...field} />
											</FormControl>
											<FormDescription>
												{watchActionType === "open_chat"
													? "The initial message to show when opening the chat"
													: "The message to display in the bubble notification"}
											</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							{watchActionType === "show_form" && (
								<>
									{!editingTrigger && isCreatingNewForm && formTemplate ? (
										// Inline form creation mode
										<div className="space-y-4">
											<div className="p-4 border rounded-lg bg-muted/50">
												<div className="flex items-center justify-between mb-4">
													<div>
														<h4 className="font-medium">Creating: {formTemplate.name}</h4>
														<p className="text-sm text-muted-foreground">
															{formTemplate.description}
														</p>
													</div>
													<button
														type="button"
														onClick={() => {
															setIsCreatingNewForm(false);
															setFormTemplate(null);
														}}
														className="text-[10px] font-bold uppercase tracking-wider text-[#888] hover:text-[#1A1A1A]"
													>
														Use existing form
													</button>
												</div>
												<div className="space-y-4">
													<div className="space-y-2">
														<Label>Form Name</Label>
														<Input
															value={newFormName}
															onChange={(e) => setNewFormName(e.target.value)}
															placeholder="My Form"
														/>
													</div>
													<FormBuilder
														value={newFormSchema}
														onChange={setNewFormSchema}
														postActions={newFormPostActions}
														onPostActionsChange={setNewFormPostActions}
													/>
												</div>
											</div>
										</div>
									) : (
										// Existing form selector
										<FormField
											control={form.control}
											name="toolId"
											render={({ field }) => (
												<FormItem>
													<FormLabel>Form</FormLabel>
													<Select onValueChange={field.onChange} defaultValue={field.value}>
														<FormControl>
															<SelectTrigger>
																<SelectValue placeholder="Select a form" />
															</SelectTrigger>
														</FormControl>
														<SelectContent>
															{tools.length === 0 ? (
																<SelectItem value="__none__" disabled>
																	No forms available
																</SelectItem>
															) : (
																tools.map((tool) => (
																	<SelectItem key={tool.id} value={tool.id}>
																		{tool.name}
																	</SelectItem>
																))
															)}
														</SelectContent>
													</Select>
													<FormDescription>
														Select a form tool to display when this trigger fires
													</FormDescription>
													<FormMessage />
												</FormItem>
											)}
										/>
									)}
									<FormField
										control={form.control}
										name="message"
										render={({ field }) => (
											<FormItem>
												<FormLabel>Message Above Form (Optional)</FormLabel>
												<FormControl>
													<Textarea
														placeholder="Please fill out this form to get started..."
														{...field}
													/>
												</FormControl>
												<FormDescription>
													A message to display above the form when it appears
												</FormDescription>
												<FormMessage />
											</FormItem>
										)}
									/>
								</>
							)}

							{watchActionType === "show_bubble" && (
								<FormField
									control={form.control}
									name="duration"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Duration (seconds)</FormLabel>
											<FormControl>
												<Input type="number" min={1} {...field} />
											</FormControl>
											<FormDescription>How long to show the bubble notification</FormDescription>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}

							<FormField
								control={form.control}
								name="priority"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Priority</FormLabel>
										<FormControl>
											<Input type="number" {...field} />
										</FormControl>
										<FormDescription>
											Higher priority triggers are evaluated first (0 = lowest)
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="triggerOnce"
								render={({ field }) => (
									<FormItem className="flex items-center justify-between p-4 border border-[#D1D1D1] bg-[#FAFAF9]">
										<div className="space-y-0.5">
											<FormLabel className="text-sm font-medium">Trigger Once</FormLabel>
											<FormDescription className="text-[10px] text-[#888]">
												Only trigger once per visitor session
											</FormDescription>
										</div>
										<FormControl>
											<CustomToggle
												checked={field.value ?? true}
												onCheckedChange={field.onChange}
											/>
										</FormControl>
									</FormItem>
								)}
							/>

							{watchTriggerType === "custom_event" && (
								<div className="p-4 border border-[#D1D1D1] bg-[#FAFAF9]">
									<div className="mb-2 text-[9px] font-mono uppercase tracking-widest text-[#888]">
										Equivalent JavaScript Code
									</div>
									<CodeBlock code={getEquivalentCode()} language="javascript" showHeader={false} />
								</div>
							)}

							<details className="border border-[#D1D1D1] bg-[#FAFAF9]">
								<summary className="p-4 text-[9px] font-mono uppercase tracking-widest text-[#888] cursor-pointer hover:text-[#1A1A1A]">
									View JavaScript Code
								</summary>
								<div className="px-4 pb-4">
									<CodeBlock code={getEquivalentCode()} language="javascript" />
								</div>
							</details>

							<DialogFooter className="border-t border-[#F3F2EE] pt-4 gap-2">
								<button
									type="button"
									onClick={() => setIsDialogOpen(false)}
									className="px-6 h-10 text-xs font-bold uppercase tracking-widest border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={isSubmitting}
									className="bg-[#1A1A1A] text-white px-6 h-10 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isSubmitting
										? "Saving..."
										: editingTrigger
											? "Update Trigger"
											: "Create Trigger"}
								</button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
