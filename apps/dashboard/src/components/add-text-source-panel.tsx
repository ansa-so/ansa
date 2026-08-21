"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import { FileText, Loader2, Save, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const textSourceSchema = z.object({
	title: z.string().min(1, "Title is required"),
	content: z.string().min(1, "Content is required"),
});

type TextSourceFormData = z.infer<typeof textSourceSchema>;

interface AddTextSourcePanelProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: { title: string; content: string }) => Promise<void>;
	saving?: boolean;
	mode?: "create" | "edit";
	initialData?: {
		title: string;
		content: string;
	};
}

export function AddTextSourcePanel({
	isOpen,
	onClose,
	onSubmit,
	saving = false,
	mode = "create",
	initialData,
}: AddTextSourcePanelProps) {
	const form = useForm<TextSourceFormData>({
		resolver: zodResolver(textSourceSchema),
		defaultValues: {
			title: "",
			content: "",
		},
	});

	// Reset form when initialData changes or panel opens
	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				form.reset({
					title: initialData.title,
					content: initialData.content,
				});
			} else {
				form.reset({
					title: "",
					content: "",
				});
			}
		}
	}, [isOpen, initialData, form]);

	const handleSubmit = async (data: TextSourceFormData) => {
		await onSubmit({ title: data.title, content: data.content });
	};

	const handleClose = () => {
		form.reset({ title: "", content: "" });
		onClose();
	};

	const title = form.watch("title");
	const content = form.watch("content");

	return (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={handleClose}
						className="fixed inset-0 bg-[#1A1A1A]/20 backdrop-blur-sm z-40"
					/>

					{/* Panel Container */}
					<motion.div
						initial={{ x: "100%" }}
						animate={{ x: 0 }}
						exit={{ x: "100%" }}
						transition={{ type: "spring", stiffness: 300, damping: 30 }}
						className="fixed top-0 right-0 h-full w-[600px] bg-[#F3F2EE] border-l border-[#D1D1D1] shadow-[-20px_0px_40px_rgba(0,0,0,0.05)] z-50 flex flex-col font-sans text-[#1A1A1A]"
					>
						{/* --- HEADER --- */}
						<div className="h-20 bg-white border-b border-[#D1D1D1] flex items-center justify-between px-8 flex-shrink-0">
							<div>
								<div className="flex items-center gap-2 mb-1">
									<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
									<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
										Knowledge Node
									</span>
								</div>
								<h2 className="text-xl font-medium tracking-tight">
									{mode === "create" ? "Add Text Source" : "Edit Text Source"}
								</h2>
							</div>
							<button
								type="button"
								onClick={handleClose}
								className="w-10 h-10 flex items-center justify-center border border-[#D1D1D1] hover:bg-[#1A1A1A] hover:text-white transition-colors"
							>
								<X size={18} />
							</button>
						</div>

						{/* --- SCROLLABLE CONTENT --- */}
						<Form {...form}>
							<form
								onSubmit={form.handleSubmit(handleSubmit)}
								className="flex flex-col flex-1 overflow-hidden"
							>
								<div className="flex-1 p-8 space-y-8 overflow-y-auto">
									{/* 1. TITLE */}
									<FormField
										control={form.control}
										name="title"
										render={({ field }) => (
											<FormItem>
												<label
													htmlFor="text-source-title"
													className="block font-mono text-[10px] uppercase tracking-widest text-[#888] mb-2 flex items-center gap-2"
												>
													<FileText size={10} /> Source Title
												</label>
												<div className="relative group">
													<FormControl>
														<Input
															id="text-source-title"
															placeholder="e.g. Company Policy Document"
															{...field}
															className="w-full bg-white border-[#D1D1D1] p-4 h-auto text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-[#CCC] font-medium rounded-none"
															autoFocus
														/>
													</FormControl>
													<div className="absolute transition-opacity -translate-y-1/2 opacity-0 right-3 top-1/2 group-hover:opacity-100">
														<span className="text-[9px] font-mono border border-[#E5E5E5] px-1.5 py-0.5 bg-[#F9F9F9] text-[#888]">
															REQUIRED
														</span>
													</div>
												</div>
												<p className="mt-2 text-[10px] text-[#888] font-mono leading-relaxed">
													A descriptive title to identify this text source.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* 2. CONTENT */}
									<FormField
										control={form.control}
										name="content"
										render={({ field }) => (
											<FormItem className="flex flex-col flex-1">
												<div className="flex items-end justify-between mb-2">
													<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
														<FileText size={10} /> Text Content
													</span>
													<span className="text-[10px] font-mono text-[#888]">
														{field.value?.length || 0} characters
													</span>
												</div>
												<FormControl>
													<Textarea
														placeholder="Enter your text content here...

This content will be indexed and used by your AI agent to answer questions. You can include:

• Product descriptions
• Policy documents
• FAQ content
• How-to guides
• Any other relevant text information"
														{...field}
														className="min-h-[350px] bg-white border-[#D1D1D1] p-4 text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-[#CCC] font-mono rounded-none resize-none"
													/>
												</FormControl>
												<p className="mt-2 text-[10px] text-[#888] font-mono leading-relaxed">
													The text content will be automatically chunked and indexed for semantic
													search.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								{/* --- FOOTER --- */}
								<div className="p-6 border-t border-[#D1D1D1] bg-white flex justify-between items-center flex-shrink-0 z-20">
									<button
										type="button"
										onClick={handleClose}
										className="px-6 py-3 text-xs font-bold uppercase tracking-widest text-[#888] hover:text-[#1A1A1A] transition-colors"
									>
										{mode === "create" ? "Discard Entry" : "Cancel"}
									</button>
									<div className="flex items-center gap-3">
										<div className="text-[10px] font-mono text-[#888] hidden sm:block">
											{title && content ? "Ready to Index" : "Missing Fields"}
										</div>
										<button
											type="submit"
											disabled={saving || !title || !content}
											className="bg-[#1A1A1A] text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] active:translate-y-[1px] active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
										>
											{saving ? (
												<>
													<Loader2 size={14} className="animate-spin" />
													Saving...
												</>
											) : (
												<>
													<Save size={14} /> Save to Index
												</>
											)}
										</button>
									</div>
								</div>
							</form>
						</Form>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}
