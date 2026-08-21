"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	ClipboardCheck,
	Layout,
	MoreHorizontal,
	RotateCcw,
	Save,
	Star,
	ThumbsUp,
	ToggleLeft,
	ToggleRight,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form, FormField } from "@/components/ui/form";
import { useAgent } from "@/lib/agent-context";
import { getInterfaceSettings, updateInterfaceSettings } from "@/lib/api";
import { type EmbedFormData, embedSchema } from "../_lib/schemas";

// --- BRUTALIST COMPONENTS ---

function FeatureCard({
	label,
	description,
	icon: Icon,
	active,
	onToggle,
	onPreview,
}: {
	label: string;
	description: string;
	icon: React.ComponentType<{ size?: number }>;
	active: boolean;
	onToggle: () => void;
	onPreview: () => void;
}) {
	return (
		<button
			type="button"
			onClick={() => {
				onToggle();
				onPreview();
			}}
			className={`group relative border p-5 cursor-pointer transition-all duration-200 text-left w-full ${
				active
					? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)]"
					: "bg-[#FAFAF9] border-[#D1D1D1] hover:border-[#888]"
			}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between mb-3">
				<div
					className={`p-2 border ${active ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#888] border-[#E5E5E5]"}`}
				>
					<Icon size={16} />
				</div>
				<div
					className={`transition-colors duration-300 ${active ? "text-[#1A1A1A]" : "text-[#D1D1D1]"}`}
				>
					{active ? (
						<ToggleRight size={28} strokeWidth={1.5} />
					) : (
						<ToggleLeft size={28} strokeWidth={1.5} />
					)}
				</div>
			</div>

			{/* Content */}
			<div>
				<h3
					className={`text-sm font-bold uppercase tracking-wide mb-1 ${active ? "text-[#1A1A1A]" : "text-[#555]"}`}
				>
					{label}
				</h3>
				<p className="text-xs text-[#888] font-mono leading-relaxed h-20">{description}</p>
			</div>

			{/* Status Footer */}
			<div
				className={`mt-4 pt-3 border-t flex items-center gap-2 text-[9px] font-mono uppercase ${
					active ? "border-[#F3F2EE] text-green-700" : "border-[#E5E5E5] text-[#CCC]"
				}`}
			>
				<div
					className={`w-1.5 h-1.5 rounded-full ${active ? "bg-green-500 animate-pulse" : "bg-[#E5E5E5]"}`}
				/>
				{active ? "Module Active" : "Disabled"}
			</div>
		</button>
	);
}

export default function FeaturesPage() {
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);
	const [previewMode, setPreviewMode] = useState<"feedback" | "csat">("feedback");

	const form = useForm<EmbedFormData>({
		resolver: zodResolver(embedSchema),
		defaultValues: {
			collectUserFeedback: true,
			showSatisfactionOnResolved: true,
		},
	});

	const {
		formState: { isDirty, isSubmitting },
	} = form;

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getInterfaceSettings(currentAgent.id);
			if (settings) {
				form.reset({
					collectUserFeedback: settings.collectUserFeedback ?? true,
					showSatisfactionOnResolved: settings.showSatisfactionOnResolved ?? true,
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

	const onSubmit = async (data: EmbedFormData) => {
		if (!currentAgent) return;
		try {
			await updateInterfaceSettings(currentAgent.id, {
				collectUserFeedback: data.collectUserFeedback,
				showSatisfactionOnResolved: data.showSatisfactionOnResolved,
			});
			await refetchAgents();
			form.reset(data);
		} catch (err) {
			console.error("Failed to update settings:", err);
			toast.error("Failed to save settings");
		}
	};

	if (loading) return null;

	const feedbackEnabled = form.watch("collectUserFeedback");
	const csatEnabled = form.watch("showSatisfactionOnResolved");
	const activeCount = [feedbackEnabled, csatEnabled].filter(Boolean).length;

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans"
			>
				{/* Header */}
				<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
					<div>
						<h1 className="text-xl font-medium tracking-tight">System Capabilities</h1>
						<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
							<span className="flex items-center gap-1">
								<Zap size={10} /> Module Config
							</span>
							<span className="text-[#D1D1D1]">|</span>
							<span>Active Modules: {activeCount}</span>
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
							<RotateCcw size={12} /> Reset
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
					{/* LEFT: FEATURE REGISTRY */}
					<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white">
						<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
							{/* Feature 1: Feedback */}
							<FormField
								control={form.control}
								name="collectUserFeedback"
								render={({ field }) => (
									<FeatureCard
										label="Response Feedback"
										description="Allows users to rate individual AI responses (Thumbs Up/Down) for RLHF training."
										icon={ThumbsUp}
										active={field.value ?? false}
										onToggle={() => field.onChange(!field.value)}
										onPreview={() => setPreviewMode("feedback")}
									/>
								)}
							/>

							{/* Feature 2: CSAT */}
							<FormField
								control={form.control}
								name="showSatisfactionOnResolved"
								render={({ field }) => (
									<FeatureCard
										label="Satisfaction Survey"
										description="Trigger a 1-5 star rating card when a conversation is marked as resolved."
										icon={ClipboardCheck}
										active={field.value ?? false}
										onToggle={() => field.onChange(!field.value)}
										onPreview={() => setPreviewMode("csat")}
									/>
								)}
							/>
						</div>

						{/* Enterprise Banner */}
						<div className="mt-8 border border-dashed border-[#D1D1D1] bg-[#FAFAF9] p-6 text-center">
							<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
								Looking for advanced modules?
							</div>
							<h3 className="text-sm font-bold uppercase text-[#1A1A1A] mb-4">
								SSO & Audit Logs Available on Enterprise
							</h3>
							<Link href="/billing">
								<button
									type="button"
									className="px-4 py-2 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:border-[#1A1A1A] transition-colors"
								>
									View License Options
								</button>
							</Link>
						</div>
					</div>

					{/* RIGHT: SIMULATION PREVIEW */}
					<div className="flex-1 bg-[#F3F2EE] flex items-center justify-center p-8 relative overflow-hidden min-h-[600px]">
						{/* Background Pattern */}
						<div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(#D1D1D1_1px,transparent_1px)] [background-size:16px_16px]" />

						<div className="absolute flex items-center gap-2 top-6 left-6">
							<Layout size={14} className="text-[#888]" />
							<span className="text-[10px] font-mono uppercase text-[#555]">
								Simulation: {previewMode === "feedback" ? "Response Rating" : "CSAT Survey"}
							</span>
						</div>

						{/* Device Frame */}
						<div className="w-[360px] bg-white border-2 border-[#1A1A1A] shadow-2xl rounded-lg overflow-hidden flex flex-col z-10">
							{/* Chat Header */}
							<div className="h-14 bg-[#1A1A1A] flex items-center px-4 justify-between">
								<div className="flex items-center gap-3">
									<div className="flex items-center justify-center w-8 h-8 text-xs font-bold text-white rounded-full bg-white/20">
										AI
									</div>
									<div className="text-xs font-bold text-white">Support Agent</div>
								</div>
								<MoreHorizontal size={16} className="text-white/50" />
							</div>

							{/* Chat Content */}
							<div className="p-4 bg-[#FAFAF9] min-h-[300px] flex flex-col justify-end space-y-4">
								{/* PREVIEW: FEEDBACK MODE */}
								{previewMode === "feedback" && (
									<>
										<div className="flex flex-row-reverse">
											<div className="bg-[#1A1A1A] text-white p-3 rounded-l-xl rounded-br-xl text-xs max-w-[80%]">
												How do I reset my API key?
											</div>
										</div>
										<div className="flex flex-col gap-1 items-start max-w-[85%]">
											<div className="flex items-end gap-2">
												<div className="w-6 h-6 bg-[#E5E5E5] rounded-full flex-shrink-0" />
												<div className="bg-white border border-[#E5E5E5] p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl text-xs text-[#555] shadow-sm">
													You can reset your key in the dashboard settings under "Security". Would
													you like a direct link?
												</div>
											</div>
											{/* The Feature Visual */}
											{feedbackEnabled ? (
												<div className="flex gap-2 pl-9">
													<div className="p-1 hover:bg-[#E5E5E5] rounded text-[#888] hover:text-[#1A1A1A] transition-colors cursor-pointer">
														<ThumbsUp size={12} />
													</div>
													<div className="p-1 hover:bg-[#E5E5E5] rounded text-[#888] hover:text-[#1A1A1A] transition-colors rotate-180 cursor-pointer">
														<ThumbsUp size={12} />
													</div>
												</div>
											) : (
												<div className="pl-9 text-[9px] font-mono text-[#CCC] italic">
													[Feedback Module Disabled]
												</div>
											)}
										</div>
									</>
								)}

								{/* PREVIEW: CSAT MODE */}
								{previewMode === "csat" && (
									<div className="flex flex-col items-center justify-center py-4 space-y-2">
										<div className="text-[10px] font-mono uppercase text-[#888] mb-2">
											Conversation Resolved
										</div>

										{csatEnabled ? (
											<div className="bg-white border border-[#D1D1D1] p-4 rounded-lg shadow-sm w-full text-center space-y-3">
												<div className="text-xs font-bold">How was your support experience?</div>
												<div className="flex justify-center gap-1 text-[#EAB308]">
													{[1, 2, 3, 4, 5].map((s) => (
														<Star key={s} size={16} fill="currentColor" />
													))}
												</div>
												<textarea
													className="w-full h-16 bg-[#FAFAF9] border border-[#F3F2EE] p-2 text-[10px] resize-none focus:outline-none"
													placeholder="Any additional feedback?"
													readOnly
												/>
												<div className="w-full bg-[#1A1A1A] text-white py-2 text-[10px] font-bold uppercase rounded-sm">
													Submit Review
												</div>
											</div>
										) : (
											<div className="border border-dashed border-[#CCC] p-4 w-full text-center text-[10px] text-[#888] font-mono">
												{`// CSAT Module Inactive //`}
												<br />
												No survey will be shown.
											</div>
										)}
									</div>
								)}
							</div>

							{/* Chat Input Placeholder */}
							<div className="h-12 bg-white border-t border-[#F3F2EE] px-4 flex items-center justify-between text-xs text-[#CCC]">
								<span>Type a message...</span>
							</div>
						</div>
					</div>
				</div>
			</form>
		</Form>
	);
}
