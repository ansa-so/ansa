"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
	ArrowRight,
	CheckCircle2,
	Cpu,
	FileText,
	Globe,
	Layout,
	Loader2,
	RefreshCw,
	Settings,
	ShieldAlert,
	Terminal,
	X,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const webSourceSchema = z.object({
	name: z.string().min(1, "Name is required"),
	url: z.string().url("Must be a valid URL"),
	sourceType: z.enum(["individual", "sitemap", "crawl"]),
});

type WebSourceFormData = z.infer<typeof webSourceSchema>;

interface AddWebSourcePanelProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: WebSourceFormData) => Promise<void>;
	saving?: boolean;
}

type SourceType = "individual" | "sitemap" | "crawl";

const sourceTypeOptions: {
	value: SourceType;
	icon: React.ElementType;
	title: string;
	description: string;
}[] = [
	{
		value: "individual",
		icon: FileText,
		title: "Individual Page",
		description: "Fetches content from a single specific URL. No links are followed.",
	},
	{
		value: "sitemap",
		icon: Layout,
		title: "XML Sitemap",
		description: "Strict ingestion based on a standardized sitemap.xml file.",
	},
	{
		value: "crawl",
		icon: Globe,
		title: "Full Domain / Subpath",
		description: "Recursive crawl. Indexes all pages found under the target path.",
	},
];

export function AddWebSourcePanel({
	isOpen,
	onClose,
	onSubmit,
	saving = false,
}: AddWebSourcePanelProps) {
	const [isTesting, setIsTesting] = useState(false);
	const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");

	const form = useForm<WebSourceFormData>({
		resolver: zodResolver(webSourceSchema),
		defaultValues: {
			name: "",
			url: "",
			sourceType: "individual",
		},
	});

	const selectedSourceType = form.watch("sourceType");
	const url = form.watch("url");

	const handleTestConnection = async () => {
		if (!url) return;
		setIsTesting(true);
		setTestStatus("idle");
		// Simulate network request
		setTimeout(() => {
			setIsTesting(false);
			setTestStatus("success");
		}, 1500);
	};

	const handleSubmit = async (data: WebSourceFormData) => {
		await onSubmit(data);
		form.reset();
		setTestStatus("idle");
	};

	const handleClose = () => {
		form.reset();
		setTestStatus("idle");
		onClose();
	};

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Darkened Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 bg-[#1A1A1A]/20 backdrop-blur-sm z-40"
					/>

					{/* The Sliding Panel */}
					<motion.div
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className="fixed top-0 right-0 h-full w-[500px] bg-[#F3F2EE] border-l border-[#D1D1D1] shadow-[-20px_0px_40px_rgba(0,0,0,0.05)] z-50 flex flex-col font-sans text-[#1A1A1A]"
					>
						{/* --- HEADER --- */}
						<div className="h-20 bg-white border-b border-[#D1D1D1] flex items-center justify-between px-8 flex-shrink-0">
							<div>
								<div className="flex items-center gap-2 mb-1">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
									<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
										Ingestion Protocol
									</span>
								</div>
								<h2 className="text-xl font-medium tracking-tight">Add Web Source</h2>
							</div>
							<button
								type="button"
								onClick={handleClose}
								className="w-10 h-10 flex items-center justify-center border border-[#D1D1D1] hover:bg-[#1A1A1A] hover:text-white transition-colors"
							>
								<X size={18} />
							</button>
						</div>

						{/* --- MAIN SCROLLABLE AREA --- */}
						<form
							onSubmit={form.handleSubmit(handleSubmit)}
							className="flex flex-col flex-1 overflow-hidden"
						>
							<div className="flex-1 p-8 space-y-8 overflow-y-auto">
								{/* 1. Source Name Input */}
								<div>
									<label
										htmlFor="source-name"
										className="block font-mono text-[10px] uppercase tracking-widest text-[#888] mb-2 flex items-center gap-2"
									>
										<Terminal size={10} /> Source Identifier
									</label>
									<input
										id="source-name"
										type="text"
										placeholder="e.g. Marketing Site Main"
										{...form.register("name")}
										className="w-full bg-white border border-[#D1D1D1] p-3 text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors rounded-none placeholder:text-[#CCC] font-medium"
									/>
									{form.formState.errors.name && (
										<p className="mt-1 text-xs text-red-500">
											{form.formState.errors.name.message}
										</p>
									)}
								</div>

								{/* 2. Protocol Selection (Cards) */}
								<fieldset>
									<legend className="block font-mono text-[10px] uppercase tracking-widest text-[#888] mb-3 flex items-center gap-2">
										<Cpu size={10} /> Crawl Strategy
									</legend>
									<div className="grid grid-cols-1 gap-3">
										{sourceTypeOptions.map((option) => {
											const Icon = option.icon;
											const isSelected = selectedSourceType === option.value;
											return (
												<button
													key={option.value}
													type="button"
													onClick={() => form.setValue("sourceType", option.value)}
													className={`border p-4 cursor-pointer flex items-start gap-4 transition-all group relative text-left ${
														isSelected
															? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)]"
															: "bg-[#FAFAF9] border-[#D1D1D1] hover:border-[#888]"
													}`}
												>
													{/* Selection Indicator */}
													<div
														className={`absolute top-4 right-4 w-3 h-3 border flex items-center justify-center ${
															isSelected ? "border-[#1A1A1A]" : "border-[#D1D1D1]"
														}`}
													>
														{isSelected && <div className="w-1.5 h-1.5 bg-[#1A1A1A]" />}
													</div>

													<div
														className={`mt-0.5 ${isSelected ? "text-[#1A1A1A]" : "text-[#888]"}`}
													>
														<Icon size={18} strokeWidth={1.5} />
													</div>
													<div>
														<div className="mb-1 text-sm font-bold tracking-tight uppercase">
															{option.title}
														</div>
														<div className="text-xs text-[#555] leading-snug font-mono">
															{option.description}
														</div>
													</div>
												</button>
											);
										})}
									</div>
								</fieldset>

								{/* 3. URL Input & Test */}
								<div>
									<label
										htmlFor="source-url"
										className="block font-mono text-[10px] uppercase tracking-widest text-[#888] mb-2"
									>
										Target Endpoint
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												id="source-url"
												type="text"
												placeholder={
													selectedSourceType === "sitemap"
														? "https://example.com/sitemap.xml"
														: "https://example.com/docs"
												}
												{...form.register("url")}
												className="w-full bg-white border border-[#D1D1D1] p-3 pr-10 text-sm focus:outline-none focus:border-[#1A1A1A] font-mono placeholder:text-[#CCC]"
											/>
											<div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#CCC]">
												<Globe size={14} />
											</div>
										</div>
										<button
											type="button"
											onClick={handleTestConnection}
											disabled={!url || isTesting}
											className={`px-4 border text-[10px] font-bold uppercase tracking-wide flex items-center gap-2 transition-all min-w-[100px] justify-center ${
												testStatus === "success"
													? "bg-green-50 border-green-200 text-green-700"
													: testStatus === "error"
														? "bg-red-50 border-red-200 text-red-700"
														: "bg-[#EAE9E5] border-[#D1D1D1] text-[#555] hover:bg-white hover:border-[#1A1A1A] disabled:opacity-50"
											}`}
										>
											{isTesting ? (
												<RefreshCw size={12} className="animate-spin" />
											) : testStatus === "success" ? (
												<CheckCircle2 size={12} />
											) : (
												<Zap size={12} />
											)}
											{isTesting ? "PINGING..." : testStatus === "success" ? "VERIFIED" : "TEST"}
										</button>
									</div>
									{form.formState.errors.url && (
										<p className="mt-1 text-xs text-red-500">{form.formState.errors.url.message}</p>
									)}
									{/* Feedback Message */}
									{testStatus === "success" && (
										<div className="mt-2 bg-green-50 border-l-2 border-green-500 p-2 text-[10px] text-green-800 font-mono flex items-center gap-2">
											<span>STATUS: 200 OK</span>
											<span className="text-green-300">|</span>
											<span>LATENCY: 24ms</span>
										</div>
									)}
								</div>

								{/* 4. Advanced Settings */}
								<div className="border-t border-[#D1D1D1] pt-6">
									<div className="flex items-center justify-between mb-4">
										<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#888]">
											<Settings size={12} /> Advanced Configuration
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<span className="block text-[9px] font-bold uppercase text-[#555] mb-1">
												Max Depth
											</span>
											<Select defaultValue="2">
												<SelectTrigger className="h-9 bg-white border-[#D1D1D1] text-xs font-mono rounded-none focus:border-[#1A1A1A]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="1">Level 1 (Direct)</SelectItem>
													<SelectItem value="2">Level 2 (Standard)</SelectItem>
													<SelectItem value="3">Level 3 (Deep)</SelectItem>
												</SelectContent>
											</Select>
										</div>
										<div>
											<span className="block text-[9px] font-bold uppercase text-[#555] mb-1">
												Sync Frequency
											</span>
											<Select defaultValue="daily">
												<SelectTrigger className="h-9 bg-white border-[#D1D1D1] text-xs font-mono rounded-none focus:border-[#1A1A1A]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="daily">Daily</SelectItem>
													<SelectItem value="weekly">Weekly</SelectItem>
													<SelectItem value="manual">Manual Only</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>
								</div>

								{/* Authentication Warning */}
								<div className="bg-[#FAFAF9] border border-[#D1D1D1] p-3 flex items-start gap-3">
									<div className="mt-0.5 text-[#888]">
										<ShieldAlert size={14} />
									</div>
									<div>
										<div className="text-xs font-bold text-[#1A1A1A] mb-0.5 uppercase">
											Authentication Check
										</div>
										<div className="text-[10px] text-[#888] leading-snug font-mono">
											Target appears public. If content is gated, configure{" "}
											<span className="underline decoration-1 decoration-[#CCC] cursor-pointer hover:text-[#1A1A1A] hover:decoration-[#1A1A1A]">
												Auth Headers
											</span>
											.
										</div>
									</div>
								</div>
							</div>

							{/* --- FOOTER ACTIONS --- */}
							<div className="p-6 border-t border-[#D1D1D1] bg-white flex justify-between items-center flex-shrink-0">
								<button
									type="button"
									onClick={handleClose}
									className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-[#888] hover:text-[#1A1A1A] transition-colors"
								>
									Cancel
								</button>
								<button
									type="submit"
									disabled={saving}
									className="bg-[#1A1A1A] text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
								>
									{saving ? (
										<>
											<Loader2 size={14} className="animate-spin" />
											Adding...
										</>
									) : (
										<>
											Initialize Crawl <ArrowRight size={14} />
										</>
									)}
								</button>
							</div>
						</form>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
