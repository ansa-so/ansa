"use client";

import { MarkdownEditor } from "@ansa/ui";
import "@ansa/ui/markdown-editor.css";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
	CornerDownRight,
	Loader2,
	MessageSquare,
	Plus,
	Save,
	Terminal,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const qaSourceSchema = z.object({
	questions: z
		.array(z.object({ value: z.string().min(1, "Question is required") }))
		.min(1, "At least one question is required"),
	answer: z.string().min(1, "Answer is required"),
});

type QaSourceFormData = z.infer<typeof qaSourceSchema>;

interface AddQAPairPanelProps {
	isOpen: boolean;
	onClose: () => void;
	onSubmit: (data: { questions: string[]; answer: string }) => Promise<void>;
	saving?: boolean;
	mode?: "create" | "edit";
	initialData?: {
		questions: string[];
		answer: string;
	};
}

export function AddQAPairPanel({
	isOpen,
	onClose,
	onSubmit,
	saving = false,
	mode = "create",
	initialData,
}: AddQAPairPanelProps) {
	const [isAddingVariant, setIsAddingVariant] = useState(false);

	const form = useForm<QaSourceFormData>({
		resolver: zodResolver(qaSourceSchema),
		defaultValues: {
			questions: [{ value: "" }],
			answer: "",
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "questions",
	});

	// Reset form when initialData changes or panel opens
	useEffect(() => {
		if (isOpen) {
			if (initialData) {
				form.reset({
					questions: initialData.questions.map((q) => ({ value: q })),
					answer: initialData.answer,
				});
			} else {
				form.reset({
					questions: [{ value: "" }],
					answer: "",
				});
			}
		}
	}, [isOpen, initialData, form]);

	const handleSubmit = async (data: QaSourceFormData) => {
		const questions = data.questions.map((q) => q.value);
		await onSubmit({ questions, answer: data.answer });
	};

	const handleClose = () => {
		form.reset({ questions: [{ value: "" }], answer: "" });
		setIsAddingVariant(false);
		onClose();
	};

	const question = form.watch("questions.0.value");
	const answer = form.watch("answer");

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
									{mode === "create" ? "Create Q&A Pair" : "Edit Q&A Pair"}
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
									{/* 1. PRIMARY TRIGGER (Question) */}
									<FormField
										control={form.control}
										name="questions.0.value"
										render={({ field }) => (
											<FormItem>
												<label
													htmlFor="primary-question"
													className="block font-mono text-[10px] uppercase tracking-widest text-[#888] mb-2 flex items-center gap-2"
												>
													<MessageSquare size={10} /> Primary Trigger
												</label>
												<div className="relative group">
													<FormControl>
														<Input
															id="primary-question"
															placeholder="e.g. How do I reset my password?"
															{...field}
															className="w-full bg-white border-[#D1D1D1] p-4 h-auto text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors placeholder:text-[#CCC] font-medium rounded-none"
															// biome-ignore lint/a11y/noAutofocus: input is created by the user clicking Add; focus follows the click
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
													The main question pattern used for semantic matching.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>

									{/* 2. VARIANTS (Alternative Phrasings) */}
									<div className="bg-[#FAFAF9] border border-[#D1D1D1] p-4">
										<div className="flex items-center justify-between mb-3">
											<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
												<CornerDownRight size={10} /> Variant Patterns
											</span>
											<span className="text-[10px] font-mono text-[#888]">
												{fields.length - 1} Variants
											</span>
										</div>

										{/* Variant List */}
										{fields.length > 1 && (
											<div className="mb-4 space-y-2">
												{fields.slice(1).map((field, index) => (
													<FormField
														key={field.id}
														control={form.control}
														name={`questions.${index + 1}.value`}
														render={({ field: inputField }) => (
															<FormItem>
																<div className="flex items-center gap-2 text-xs bg-white border border-[#E5E5E5] p-2 pl-3 group">
																	<span className="text-[#CCC] font-mono text-[10px]">
																		0{index + 1}
																	</span>
																	<FormControl>
																		<input
																			{...inputField}
																			className="flex-1 text-[#555] bg-transparent border-none focus:outline-none text-xs"
																			placeholder="Alternative phrasing..."
																		/>
																	</FormControl>
																	<button
																		type="button"
																		onClick={() => remove(index + 1)}
																		className="text-[#CCC] hover:text-red-500 transition-colors px-2"
																	>
																		<Trash2 size={12} />
																	</button>
																</div>
																<FormMessage />
															</FormItem>
														)}
													/>
												))}
											</div>
										)}

										{/* Add Variant Input */}
										{isAddingVariant ? (
											<div className="flex gap-2 duration-200 animate-in fade-in slide-in-from-top-1">
												<input
													type="text"
													placeholder="Type alternative phrasing..."
													className="flex-1 bg-white border border-[#1A1A1A] p-2 text-xs focus:outline-none"
													// biome-ignore lint/a11y/noAutofocus: input is created by the user clicking Add; focus follows the click
													autoFocus
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															e.preventDefault();
															const input = e.target as HTMLInputElement;
															if (input.value.trim()) {
																append({ value: input.value });
																input.value = "";
																setIsAddingVariant(false);
															}
														}
													}}
												/>
												<button
													type="button"
													onClick={(e) => {
														const input = (e.target as HTMLElement).parentElement?.querySelector(
															"input",
														);
														if (input?.value.trim()) {
															append({ value: input.value });
															input.value = "";
															setIsAddingVariant(false);
														}
													}}
													className="px-3 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase hover:bg-[#333]"
												>
													Add
												</button>
												<button
													type="button"
													onClick={() => setIsAddingVariant(false)}
													className="px-3 border border-[#D1D1D1] bg-white text-[10px] font-bold uppercase hover:bg-[#F3F2EE]"
												>
													<X size={12} />
												</button>
											</div>
										) : (
											<button
												type="button"
												onClick={() => setIsAddingVariant(true)}
												className="w-full border border-dashed border-[#BBB] bg-white p-2 text-[10px] font-mono uppercase text-[#888] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all flex items-center justify-center gap-2"
											>
												<Plus size={10} /> Add Question Variant
											</button>
										)}
									</div>

									{/* 3. ANSWER (Response Payload) */}
									<FormField
										control={form.control}
										name="answer"
										render={({ field }) => (
											<FormItem className="flex flex-col flex-1">
												<div className="flex items-end justify-between mb-2">
													<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
														<Terminal size={10} /> Response Payload
													</span>
												</div>
												<FormControl>
													<div className="relative flex-1 min-h-[250px] bg-white">
														<MarkdownEditor
															value={field.value}
															onChange={field.onChange}
															placeholder="# Enter answer here..."
															className="h-full min-h-[250px] bg-white"
															height={250}
														/>
													</div>
												</FormControl>
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
											{question && answer ? "Ready to Index" : "Missing Fields"}
										</div>
										<button
											type="submit"
											disabled={saving || !question || !answer}
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
