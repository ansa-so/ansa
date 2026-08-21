"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { GripVertical, MessageSquare, Play, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import { getInterfaceSettings, updateInterfaceSettings } from "@/lib/api";
import { type MessagesFormData, messagesSchema } from "../_lib/schemas";

// --- BRUTALIST COMPONENTS ---

function SectionHeader({ title, description }: { title: string; description?: string }) {
	return (
		<div className="mb-4">
			<div className="flex items-center gap-2 mb-1">
				<div className="w-1 h-3 bg-[#1A1A1A]" />
				<h3 className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]">{title}</h3>
			</div>
			{description && <p className="text-[10px] text-[#888] font-mono pl-3">{description}</p>}
		</div>
	);
}

function ListItem({
	index,
	value,
	onChange,
	onDelete,
	type,
}: {
	index: number;
	value: string;
	onChange: (value: string) => void;
	onDelete: () => void;
	type: "text" | "bubble";
}) {
	return (
		<div className="flex items-center gap-2 group">
			<div className="w-6 flex flex-col items-center justify-center text-[#D1D1D1] cursor-grab active:cursor-grabbing">
				<GripVertical size={12} />
			</div>
			<div className="text-[9px] font-mono text-[#888] w-4">{index < 10 ? `0${index}` : index}</div>
			<div className="relative flex-1">
				<input
					type="text"
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={`w-full bg-white border border-[#D1D1D1] px-3 text-xs focus:outline-none focus:border-[#1A1A1A] transition-colors ${
						type === "bubble" ? "h-10 rounded-full text-center" : "h-10 font-mono"
					}`}
				/>
			</div>
			<button
				type="button"
				onClick={onDelete}
				className="w-8 h-8 flex items-center justify-center text-[#D1D1D1] hover:text-red-600 hover:bg-red-50 transition-colors"
			>
				<Trash2 size={12} />
			</button>
		</div>
	);
}

export default function MessagesPage() {
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);

	const form = useForm<MessagesFormData>({
		resolver: zodResolver(messagesSchema),
		defaultValues: {
			initialMessage: "Hello! How can I help you today?",
			suggestedMessages: [],
			messagePlaceholder: "Type a message...",
			dismissibleMessage: null,
			welcomeBubbles: [],
		},
	});

	const {
		formState: { isDirty, isSubmitting },
	} = form;

	const {
		fields: suggestedFields,
		append: appendSuggested,
		remove: removeSuggested,
	} = useFieldArray({
		control: form.control,
		name: "suggestedMessages",
	});

	const {
		fields: welcomeFields,
		append: appendWelcome,
		remove: removeWelcome,
	} = useFieldArray({
		control: form.control,
		name: "welcomeBubbles",
	});

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getInterfaceSettings(currentAgent.id);
			if (settings) {
				form.reset({
					initialMessage: settings.initialMessage || null,
					suggestedMessages: settings.suggestedMessages?.map((msg) => ({ value: msg })) || [],
					messagePlaceholder: settings.messagePlaceholder || null,
					dismissibleMessage: settings.dismissibleMessage || null,
					welcomeBubbles: settings.welcomeBubbles?.map((msg) => ({ value: msg })) || [],
				});
			}
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [currentAgent, form]);

	useEffect(() => {
		if (currentAgent) fetchData();
	}, [currentAgent, fetchData]);

	const onSubmit = async (data: MessagesFormData) => {
		if (!currentAgent) return;
		try {
			await updateInterfaceSettings(currentAgent.id, {
				initialMessage: data.initialMessage,
				suggestedMessages: data.suggestedMessages?.filter((m) => m.value).map((m) => m.value) || [],
				messagePlaceholder: data.messagePlaceholder,
				dismissibleMessage: data.dismissibleMessage,
				welcomeBubbles: data.welcomeBubbles?.filter((m) => m.value).map((m) => m.value) || [],
			});
			await refetchAgents();
			form.reset(data);
		} catch (err) {
			console.error("Failed to update settings:", err);
			toast.error("Failed to save settings");
		}
	};

	if (loading) return null;

	const initialMsg = form.watch("initialMessage") || "";
	const placeholder = form.watch("messagePlaceholder") || "Type a message...";
	const suggestions = suggestedFields.map(
		(_, i) => form.watch(`suggestedMessages.${i}.value`) || "",
	);
	const bubbles = welcomeFields.map((_, i) => form.watch(`welcomeBubbles.${i}.value`) || "");

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans"
			>
				{/* Header */}
				<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
					<div>
						<h1 className="text-xl font-medium tracking-tight">Interaction Protocols</h1>
						<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
							<span className="flex items-center gap-1">
								<MessageSquare size={10} /> Default Scripts
							</span>
							<span className="text-[#D1D1D1]">|</span>
							<span>Lang: EN-US</span>
						</div>
					</div>
					<div className="flex items-center gap-3">
						{isDirty && (
							<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase">
								<span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
								Unsaved Changes
							</div>
						)}
						<button
							type="button"
							onClick={() => form.reset()}
							disabled={!isDirty || isSubmitting}
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<RotateCcw size={12} /> Revert
						</button>
						<button
							type="submit"
							disabled={isSubmitting || !isDirty}
							className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
						>
							<Save size={12} /> {isSubmitting ? "Saving..." : "Save Config"}
						</button>
					</div>
				</header>

				{/* Split Layout */}
				<div className="flex flex-col flex-1 overflow-hidden lg:flex-row">
					{/* LEFT: EDITOR PANEL */}
					<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white space-y-10">
						{/* 1. Handshake Protocol */}
						<section>
							<SectionHeader
								title="Handshake Protocol"
								description="The first message sent when the chat window opens."
							/>
							<div className="space-y-6">
								<FormField
									control={form.control}
									name="initialMessage"
									render={({ field }) => (
										<FormItem>
											<Label>Initial Message Payload</Label>
											<Textarea
												value={field.value || ""}
												onChange={field.onChange}
												placeholder="Hello! How can I help you today?"
												showCharCount
												className="h-24 p-3 font-mono text-xs resize-y"
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="messagePlaceholder"
									render={({ field }) => (
										<FormItem>
											<Label>User Input Placeholder</Label>
											<Input
												value={field.value || ""}
												onChange={field.onChange}
												placeholder="Type a message..."
												showCharCount
												className="h-10 px-3 font-mono text-xs"
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="dismissibleMessage"
									render={({ field }) => (
										<FormItem>
											<Label>Dismissible Banner (Optional)</Label>
											<Textarea
												value={field.value || ""}
												onChange={field.onChange}
												placeholder="Optional banner message users can dismiss"
												showCharCount
												className="h-24 p-3 font-mono text-xs resize-y"
											/>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
						</section>

						{/* 2. User Intent Triggers */}
						<section>
							<div className="flex items-end justify-between mb-4">
								<SectionHeader
									title="User Intent Triggers"
									description="Quick reply options shown to guide the user."
								/>
								{suggestedFields.length < 5 && (
									<button
										type="button"
										onClick={() => appendSuggested({ value: "" })}
										className="text-[9px] font-bold uppercase flex items-center gap-1 bg-[#F3F2EE] border border-[#E5E5E5] px-2 py-1 hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
									>
										<Plus size={10} /> Add Trigger
									</button>
								)}
							</div>
							<div className="space-y-2 border-t border-[#F3F2EE] pt-4">
								{suggestedFields.map((field, index) => (
									<FormField
										key={field.id}
										control={form.control}
										name={`suggestedMessages.${index}.value`}
										render={({ field: formField }) => (
											<ListItem
												index={index + 1}
												value={formField.value}
												onChange={formField.onChange}
												onDelete={() => removeSuggested(index)}
												type="text"
											/>
										)}
									/>
								))}
								{suggestedFields.length === 0 && (
									<div className="text-[10px] text-[#CCC] font-mono text-center py-4 border border-dashed border-[#E5E5E5]">
										No triggers configured.
									</div>
								)}
							</div>
						</section>

						{/* 3. Proactive Signals (Bubbles) */}
						<section>
							<div className="flex items-end justify-between mb-4">
								<SectionHeader
									title="Proactive Signals (Bubbles)"
									description="Floating messages shown before the chat is opened."
								/>
								{welcomeFields.length < 5 && (
									<button
										type="button"
										onClick={() => appendWelcome({ value: "" })}
										className="text-[9px] font-bold uppercase flex items-center gap-1 bg-[#F3F2EE] border border-[#E5E5E5] px-2 py-1 hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
									>
										<Plus size={10} /> Add Bubble
									</button>
								)}
							</div>
							<div className="space-y-2 border-t border-[#F3F2EE] pt-4">
								{welcomeFields.map((field, index) => (
									<FormField
										key={field.id}
										control={form.control}
										name={`welcomeBubbles.${index}.value`}
										render={({ field: formField }) => (
											<ListItem
												index={index + 1}
												value={formField.value}
												onChange={formField.onChange}
												onDelete={() => removeWelcome(index)}
												type="bubble"
											/>
										)}
									/>
								))}
								{welcomeFields.length === 0 && (
									<div className="text-[10px] text-[#CCC] font-mono text-center py-4 border border-dashed border-[#E5E5E5]">
										No bubbles configured.
									</div>
								)}
							</div>
						</section>
					</div>

					{/* RIGHT: LIVE SIMULATION */}
					<div className="flex-[0.8] bg-[#F3F2EE] flex items-center justify-center p-8 relative overflow-hidden min-h-[700px]">
						<div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#D1D1D1_1px,transparent_1px)] [background-size:16px_16px]" />

						<div className="text-[9px] font-mono uppercase text-[#888] absolute top-6 left-6 flex items-center gap-2">
							<Play size={10} /> Simulation Preview
						</div>

						{/* Mock Website Context */}
						<div className="w-[360px] h-[640px] bg-white border-2 border-[#1A1A1A] shadow-2xl relative flex flex-col z-10">
							{/* Fake Header */}
							<div className="h-12 border-b border-[#F3F2EE] flex items-center px-4 gap-4">
								<div className="w-4 h-4 bg-[#1A1A1A]" />
								<div className="flex justify-end flex-1 gap-2">
									<div className="w-12 h-2 bg-[#F3F2EE]" />
									<div className="w-12 h-2 bg-[#F3F2EE]" />
								</div>
							</div>

							{/* Fake Content */}
							<div className="flex-1 p-6 space-y-4 bg-white opacity-30">
								<div className="h-8 w-3/4 bg-[#1A1A1A]" />
								<div className="h-4 w-full bg-[#E5E5E5]" />
								<div className="h-4 w-5/6 bg-[#E5E5E5]" />
							</div>

							{/* Widget Preview */}
							<div className="absolute z-10 flex flex-col items-end gap-3 bottom-4 right-4">
								{/* Welcome Bubbles */}
								{bubbles.length > 0 && (
									<div className="flex flex-col items-end gap-2 mb-2">
										{bubbles.filter(Boolean).map((b) => (
											<div
												key={b}
												className="bg-white border border-[#E5E5E5] px-4 py-2 rounded-full shadow-sm text-xs text-[#555]"
											>
												{b}
											</div>
										))}
									</div>
								)}

								{/* Chat Window */}
								<div className="w-[300px] bg-white border border-[#D1D1D1] shadow-xl rounded-lg overflow-hidden flex flex-col">
									<div className="h-12 bg-[#1A1A1A] text-white flex items-center px-4 text-xs font-bold">
										Support Agent
									</div>

									<div className="p-4 bg-[#FAFAF9] space-y-4 max-h-[280px] overflow-y-auto">
										{/* Initial Message */}
										<div className="flex gap-2">
											<div className="w-6 h-6 bg-[#E5E5E5] rounded-full shrink-0" />
											<div className="bg-white border border-[#E5E5E5] p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs text-[#555] shadow-sm leading-relaxed">
												{initialMsg || "..."}
											</div>
										</div>

										{/* Suggested Actions */}
										{suggestions.filter(Boolean).length > 0 && (
											<div className="pl-8 space-y-2">
												{suggestions.filter(Boolean).map((s) => (
													<div
														key={s}
														className="w-full text-left p-2 bg-white border border-[#D1D1D1] text-[10px] text-[#1A1A1A] rounded"
													>
														{s}
													</div>
												))}
											</div>
										)}
									</div>

									{/* Input Placeholder */}
									<div className="h-10 bg-white border-t border-[#F3F2EE] px-3 flex items-center text-xs text-[#CCC] font-mono">
										{placeholder}
									</div>
								</div>

								{/* Launcher */}
								<div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center text-white shadow-lg">
									<MessageSquare size={20} />
								</div>
							</div>
						</div>
					</div>
				</div>
			</form>
		</Form>
	);
}
