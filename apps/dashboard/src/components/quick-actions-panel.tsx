"use client";

import {
	ArrowLeft,
	Command,
	Database,
	Globe,
	Layout,
	Loader2,
	MessageSquare,
	Play,
	Terminal,
	UserCog,
	X,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { type AgentTool, executeToolManually, listTools } from "@/lib/api";

interface QuickActionsPanelProps {
	agentId: string | null;
	conversationId: string | null;
	userMetadata?: Record<string, unknown> | null;
	open: boolean;
	onClose: () => void;
}

// Protocol badge component
function ProtocolBadge({ type, method }: { type: string; method?: string }) {
	let colors = "bg-[#F3F2EE] text-[#555] border-[#D1D1D1]";

	if (type === "HTTP") colors = "bg-blue-50 text-blue-700 border-blue-200";
	if (type === "FORM") colors = "bg-purple-50 text-purple-700 border-purple-200";

	return (
		<div
			className={`flex items-center gap-1 px-1.5 py-0.5 border text-[9px] font-mono font-bold uppercase tracking-tight ${colors}`}
		>
			<span>{type}</span>
			{method && <span className="opacity-50">/</span>}
			{method && <span>{method}</span>}
		</div>
	);
}

// Get icon for tool based on name/type
function getToolIcon(tool: AgentTool) {
	const name = tool.name.toLowerCase();
	if (name.includes("customer") || name.includes("user")) return UserCog;
	if (name.includes("product") || name.includes("search")) return Globe;
	if (name.includes("order") || name.includes("data")) return Database;
	if (name.includes("form") || name.includes("survey")) return MessageSquare;
	if (name.includes("handoff") || name.includes("escalat")) return UserCog;
	if (name.includes("layout") || name.includes("ui")) return Layout;
	return Database;
}

// Action card component
function ActionCard({ tool, onSelect }: { tool: AgentTool; onSelect: (tool: AgentTool) => void }) {
	const Icon = getToolIcon(tool);
	const type = tool.executionType === "http" ? "HTTP" : "FORM";
	const method = tool.executionType === "http" ? "GET" : "UI";

	return (
		<button
			type="button"
			onClick={() => onSelect(tool)}
			className="group flex flex-col bg-white border border-[#D1D1D1] p-3 hover:border-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] transition-all cursor-pointer relative overflow-hidden w-full text-left"
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-2">
				<div className="flex items-center gap-2">
					<div className="text-[#1A1A1A] opacity-60 group-hover:opacity-100 transition-opacity">
						<Icon size={14} />
					</div>
					<span className="text-[13px] font-mono font-bold text-[#1A1A1A] group-hover:underline decoration-1 underline-offset-2">
						{tool.name}
					</span>
				</div>
				<ProtocolBadge type={type} method={method} />
			</div>

			{/* Description */}
			<p className="text-[10px] text-[#555] leading-relaxed mb-3 pr-4 line-clamp-2">
				{tool.description}
			</p>

			{/* Footer / Action */}
			<div className="mt-auto pt-2 border-t border-[#F3F2EE] flex justify-between items-center opacity-60 group-hover:opacity-100 transition-opacity">
				<div className="text-[9px] font-mono text-[#888] uppercase tracking-wider">
					{tool.executionType}
				</div>
				<div className="flex items-center gap-1 text-[9px] font-bold uppercase text-[#1A1A1A]">
					Run <Play size={8} fill="currentColor" />
				</div>
			</div>

			{/* Hover Effect */}
			<div className="absolute top-0 left-0 w-0.5 h-full bg-[#1A1A1A] opacity-0 group-hover:opacity-100 transition-opacity" />
		</button>
	);
}

export function QuickActionsPanel({
	agentId,
	conversationId,
	userMetadata,
	open,
	onClose,
}: QuickActionsPanelProps) {
	const [tools, setTools] = useState<AgentTool[]>([]);
	const [loading, setLoading] = useState(false);
	const [selectedTool, setSelectedTool] = useState<AgentTool | null>(null);
	const [formValues, setFormValues] = useState<Record<string, string>>({});
	const [executing, setExecuting] = useState(false);
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState("All");

	const fetchTools = useCallback(async () => {
		if (!agentId) return;

		setLoading(true);
		try {
			const data = await listTools(agentId);
			// Filter to only enabled tools that are useful for humans (http and form types)
			const usableTools = data.filter(
				(tool) =>
					tool.isEnabled && (tool.executionType === "http" || tool.executionType === "form"),
			);
			setTools(usableTools);
		} catch (err) {
			console.error("Failed to fetch tools:", err);
		} finally {
			setLoading(false);
		}
	}, [agentId]);

	useEffect(() => {
		if (open && agentId) {
			fetchTools();
		}
	}, [open, agentId, fetchTools]);

	// Filter tools based on search and active filter
	const filteredTools = useMemo(() => {
		return tools.filter((tool) => {
			const matchesSearch =
				search === "" ||
				tool.name.toLowerCase().includes(search.toLowerCase()) ||
				tool.description?.toLowerCase().includes(search.toLowerCase());

			const matchesFilter =
				activeFilter === "All" ||
				(activeFilter === "HTTP" && tool.executionType === "http") ||
				(activeFilter === "Form" && tool.executionType === "form");

			return matchesSearch && matchesFilter;
		});
	}, [tools, search, activeFilter]);

	// Pre-fill form values from user metadata when selecting a tool
	const handleSelectTool = (tool: AgentTool) => {
		setSelectedTool(tool);

		// Pre-fill values from user metadata if available
		const prefilled: Record<string, string> = {};
		if (tool.inputSchema?.properties) {
			for (const [key, _prop] of Object.entries(tool.inputSchema.properties)) {
				// Try to match field names with metadata
				if (userMetadata) {
					const metadataValue = userMetadata[key] || userMetadata[key.toLowerCase()];
					if (metadataValue !== undefined) {
						prefilled[key] = String(metadataValue);
					}
				}
				// Also check for common field mappings
				if (!prefilled[key] && userMetadata) {
					if (key === "email" || key === "customer_email" || key === "userEmail") {
						prefilled[key] = String(userMetadata.email || "");
					}
					if (key === "name" || key === "customer_name" || key === "userName") {
						prefilled[key] = String(userMetadata.name || "");
					}
					if (key === "phone" || key === "customer_phone") {
						prefilled[key] = String(userMetadata.phone || "");
					}
				}
			}
		}
		setFormValues(prefilled);
	};

	const handleExecuteTool = async () => {
		if (!selectedTool || !conversationId) return;

		setExecuting(true);
		try {
			const result = await executeToolManually(
				selectedTool.id,
				conversationId,
				formValues,
				userMetadata || undefined,
			);

			if (result.success) {
				toast.success(`Tool "${selectedTool.name}" executed successfully`);
				setSelectedTool(null);
				setFormValues({});
				onClose(); // Close panel so user sees the result in conversation
			} else {
				toast.error(result.errorMessage || "Tool execution failed");
			}
		} catch (err) {
			console.error("Failed to execute tool:", err);
			toast.error(err instanceof Error ? err.message : "Failed to execute tool");
		} finally {
			setExecuting(false);
		}
	};

	const renderToolForm = () => {
		if (!selectedTool) return null;

		const { inputSchema } = selectedTool;
		if (!inputSchema?.properties) {
			return (
				<div className="p-4 text-center border border-dashed border-[#D1D1D1] text-[#888]">
					<div className="text-[10px] font-mono uppercase">No input parameters required</div>
				</div>
			);
		}

		return (
			<div className="space-y-4">
				{Object.entries(inputSchema.properties).map(([key, prop]) => {
					const isRequired = inputSchema.required?.includes(key);
					const value = formValues[key] || "";

					// Render select for enum types
					if (prop.enum && prop.enum.length > 0) {
						return (
							<div key={key} className="space-y-1.5">
								<Label className="text-[10px] font-mono uppercase text-[#555]">
									{key}
									{isRequired && <span className="ml-1 text-red-500">*</span>}
								</Label>
								{prop.description && (
									<Text size="xs" className="text-[#888] text-[9px]">
										{prop.description}
									</Text>
								)}
								<Select
									value={value}
									onValueChange={(v) => setFormValues({ ...formValues, [key]: v })}
								>
									<SelectTrigger className="h-9 border-[#D1D1D1] text-xs font-mono focus:border-[#1A1A1A] focus:ring-0">
										<SelectValue placeholder={`Select ${key}`} />
									</SelectTrigger>
									<SelectContent>
										{prop.enum.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						);
					}

					// Render textarea for long text
					if (prop.type === "string" && key.includes("description")) {
						return (
							<div key={key} className="space-y-1.5">
								<Label className="text-[10px] font-mono uppercase text-[#555]">
									{key}
									{isRequired && <span className="ml-1 text-red-500">*</span>}
								</Label>
								{prop.description && (
									<Text size="xs" className="text-[#888] text-[9px]">
										{prop.description}
									</Text>
								)}
								<Textarea
									value={value}
									onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
									placeholder={prop.description || `Enter ${key}`}
									className="border-[#D1D1D1] text-xs font-mono focus:border-[#1A1A1A] focus:ring-0"
								/>
							</div>
						);
					}

					// Default to input
					return (
						<div key={key} className="space-y-1.5">
							<Label className="text-[10px] font-mono uppercase text-[#555]">
								{key}
								{isRequired && <span className="ml-1 text-red-500">*</span>}
							</Label>
							{prop.description && (
								<Text size="xs" className="text-[#888] text-[9px]">
									{prop.description}
								</Text>
							)}
							<Input
								type={prop.type === "number" ? "number" : "text"}
								value={value}
								onChange={(e) => setFormValues({ ...formValues, [key]: e.target.value })}
								placeholder={prop.description || `Enter ${key}`}
								className="h-9 border-[#D1D1D1] text-xs font-mono focus:border-[#1A1A1A] focus:ring-0"
							/>
						</div>
					);
				})}
			</div>
		);
	};

	if (!open) return null;

	return (
		<div className="w-[380px] h-full bg-[#F3F2EE] border-l border-[#D1D1D1] flex flex-col font-sans text-[#1A1A1A] shadow-xl">
			{/* --- 1. HEADER --- */}
			<div className="h-14 flex items-center justify-between px-5 bg-white border-b border-[#D1D1D1]">
				<div className="flex items-center gap-2">
					<Terminal size={14} />
					<h2 className="text-xs font-bold tracking-widest uppercase">Command Registry</h2>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="text-[#888] hover:text-[#1A1A1A] transition-colors"
				>
					<X size={16} />
				</button>
			</div>

			{selectedTool ? (
				<>
					{/* Tool Detail Header */}
					<div className="p-4 bg-[#FAFAF9] border-b border-[#D1D1D1]">
						<button
							type="button"
							onClick={() => setSelectedTool(null)}
							className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#888] hover:text-[#1A1A1A] transition-colors mb-3"
						>
							<ArrowLeft size={12} />
							Back to registry
						</button>
						<div className="flex items-center gap-2 mb-2">
							<span className="text-sm font-bold text-[#1A1A1A]">{selectedTool.name}</span>
							<ProtocolBadge
								type={selectedTool.executionType === "http" ? "HTTP" : "FORM"}
								method={selectedTool.executionType === "http" ? "GET" : "UI"}
							/>
						</div>
						<p className="text-[10px] text-[#555] leading-relaxed">{selectedTool.description}</p>
					</div>

					{/* Tool Form */}
					<div className="flex-1 p-4 overflow-y-auto">
						<div className="text-[9px] font-mono uppercase text-[#888] mb-3">Input Parameters</div>
						{renderToolForm()}
					</div>

					{/* Execute Footer */}
					<div className="p-4 bg-white border-t border-[#D1D1D1]">
						<Button
							onClick={handleExecuteTool}
							disabled={executing}
							className="w-full h-10 bg-[#1A1A1A] text-white hover:bg-[#333] font-mono text-xs uppercase tracking-wider"
						>
							{executing ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Executing...
								</>
							) : (
								<>
									<Play size={12} className="mr-2" fill="currentColor" />
									Execute Command
								</>
							)}
						</Button>
					</div>
				</>
			) : (
				<>
					{/* --- 2. SEARCH / FILTER --- */}
					<div className="p-4 bg-[#FAFAF9] border-b border-[#D1D1D1]">
						<div className="relative group">
							<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888] group-focus-within:text-[#1A1A1A]">
								<Command size={12} />
							</div>
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Filter executables..."
								className="w-full h-9 bg-white border border-[#D1D1D1] pl-8 pr-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A] focus:shadow-sm transition-all"
							/>
						</div>
						<div className="flex gap-2 pb-1 mt-3 overflow-x-auto no-scrollbar">
							{["All", "HTTP", "Form"].map((tag) => (
								<button
									key={tag}
									type="button"
									onClick={() => setActiveFilter(tag)}
									className={`px-2 py-1 border text-[9px] font-bold uppercase whitespace-nowrap transition-colors ${
										activeFilter === tag
											? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
											: "bg-white text-[#555] border-[#D1D1D1] hover:border-[#888]"
									}`}
								>
									{tag}
								</button>
							))}
						</div>
					</div>

					{/* --- 3. TOOLS LIST --- */}
					<div className="flex-1 p-4 space-y-3 overflow-y-auto">
						{loading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-5 h-5 animate-spin text-[#888]" />
							</div>
						) : (
							<>
								{/* Section Label */}
								<div className="flex items-center justify-between text-[9px] font-mono uppercase text-[#888] mb-2 px-1">
									<span>Available Modules</span>
									<span>{filteredTools.length} Total</span>
								</div>

								{filteredTools.map((tool) => (
									<ActionCard key={tool.id} tool={tool} onSelect={handleSelectTool} />
								))}

								{filteredTools.length === 0 && !loading && (
									<div className="p-8 text-center border border-dashed border-[#D1D1D1] text-[#888]">
										<Terminal className="w-6 h-6 mx-auto mb-2 opacity-50" />
										<div className="text-[10px] font-mono uppercase">No modules found</div>
										<div className="text-[9px] mt-1">
											{tools.length === 0
												? "Add HTTP or Form tools to your agent"
												: "Try adjusting your search or filter"}
										</div>
									</div>
								)}
							</>
						)}
					</div>

					{/* --- 4. FOOTER --- */}
					<div className="p-3 bg-white border-t border-[#D1D1D1] text-[9px] font-mono text-[#888] flex justify-between uppercase">
						<span>Agent Tools</span>
						<span className="flex items-center gap-1 text-green-600">
							<Zap size={8} fill="currentColor" /> System Ready
						</span>
					</div>
				</>
			)}
		</div>
	);
}
