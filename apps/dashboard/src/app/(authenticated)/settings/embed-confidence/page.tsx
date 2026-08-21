"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	Activity,
	AlertTriangle,
	ArrowRight,
	GitBranch,
	HelpCircle,
	Lock,
	RotateCcw,
	Save,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Terminal,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Form, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import {
	getEscalationSettings,
	getInterfaceSettings,
	updateEscalationSettings,
	updateInterfaceSettings,
} from "@/lib/api";
import { type ConfidenceFormData, confidenceSchema } from "../_lib/schemas";

// --- BRUTALIST COMPONENTS ---

function ActionCard({
	id,
	label,
	description,
	icon: Icon,
	selected,
	onSelect,
	locked = false,
}: {
	id: string;
	label: string;
	description: string;
	icon: React.ElementType;
	selected: boolean;
	onSelect: (id: string) => void;
	locked?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={() => !locked && onSelect(id)}
			disabled={locked}
			className={`w-full text-left relative border p-4 transition-all flex items-start gap-4 group ${
				selected
					? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] z-10"
					: locked
						? "bg-[#F3F2EE] border-[#E5E5E5] opacity-70 cursor-not-allowed"
						: "bg-[#FAFAF9] border-[#D1D1D1] hover:bg-white hover:border-[#888]"
			}`}
		>
			<div
				className={`p-2 border ${
					selected
						? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
						: "bg-white text-[#555] border-[#E5E5E5]"
				}`}
			>
				<Icon size={16} />
			</div>

			<div className="flex-1">
				<div className="flex items-center justify-between mb-1">
					<h3
						className={`text-xs font-bold uppercase tracking-wide ${
							selected ? "text-[#1A1A1A]" : "text-[#555]"
						}`}
					>
						{label}
					</h3>
					{locked && <Lock size={12} className="text-[#888]" />}
				</div>
				<p className="text-[10px] text-[#888] font-mono leading-relaxed">{description}</p>
			</div>

			{/* Selection Indicator */}
			{selected && (
				<div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-l-[20px] border-t-[#1A1A1A] border-l-transparent">
					<div className="absolute -top-[16px] -left-[8px] w-1 h-1 bg-white rounded-full" />
				</div>
			)}
		</button>
	);
}

export default function EmbedConfidencePage() {
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const [loading, setLoading] = useState(true);
	const [escalationEnabled, setEscalationEnabled] = useState(false);

	// Simulation State
	const [simQuery, setSimQuery] = useState("");
	const [simScore, setSimScore] = useState<number | null>(null);

	// Check if current plan has escalation feature
	// Only evaluate once plans are loaded to avoid false negatives
	// "unlimited" planId is returned for self-hosted mode which has all features
	// If currentPlanId is null, plans haven't loaded yet so default to true
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasEscalation =
		plansLoading || !currentPlanId
			? true
			: currentPlanId === "unlimited" || (currentPlan?.hasEscalation ?? false);

	const form = useForm<ConfidenceFormData>({
		resolver: zodResolver(confidenceSchema),
		defaultValues: {
			widgetConfidenceThreshold: 50,
			widgetLowConfidenceAction: "respond",
			escalationNoticeMessage: null,
			userEscalationMessage: null,
			deescalationMessage: null,
		},
	});

	const {
		formState: { isDirty, isSubmitting },
	} = form;

	const threshold = form.watch("widgetConfidenceThreshold");
	const action = form.watch("widgetLowConfidenceAction");

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const [escalationSettings, interfaceSettings] = await Promise.all([
				getEscalationSettings(currentAgent.id),
				getInterfaceSettings(currentAgent.id),
			]);

			setEscalationEnabled(escalationSettings?.enabled ?? false);

			form.reset({
				widgetConfidenceThreshold: escalationSettings.widgetConfidenceThreshold || 50,
				widgetLowConfidenceAction: escalationSettings.widgetLowConfidenceAction || "respond",
				escalationNoticeMessage: interfaceSettings.escalationNoticeMessage || null,
				userEscalationMessage: interfaceSettings.userEscalationMessage || null,
				deescalationMessage: interfaceSettings.deescalationMessage || null,
			});
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [currentAgent, form]);

	useEffect(() => {
		if (currentAgent) {
			fetchData();
		}
	}, [currentAgent, fetchData]);

	const onSubmit = async (data: ConfidenceFormData) => {
		if (!currentAgent) return;
		try {
			await Promise.all([
				updateEscalationSettings(currentAgent.id, {
					widgetConfidenceThreshold: data.widgetConfidenceThreshold,
					widgetLowConfidenceAction: data.widgetLowConfidenceAction,
				}),
				updateInterfaceSettings(currentAgent.id, {
					escalationNoticeMessage: data.escalationNoticeMessage,
					userEscalationMessage: data.userEscalationMessage,
					deescalationMessage: data.deescalationMessage,
				}),
			]);
			await refetchAgents();
			form.reset(data);
		} catch (err) {
			console.error("Failed to update settings:", err);
			toast.error("Failed to save settings");
		}
	};

	// Mock Confidence Calculation for Simulator
	const runSimulation = () => {
		if (!simQuery) return;
		const randomScore = Math.floor(Math.random() * 100);
		setSimScore(randomScore);
	};

	const getStatusColor = (score: number) => {
		if (score >= threshold) return "text-green-600";
		return "text-red-600";
	};

	if (loading || plansLoading || !currentAgent) return null;

	return (
		<div className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Safety Protocols</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Shield size={10} /> Logic Gate Config
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>
							Current Safety Level:{" "}
							{threshold > 70 ? "STRICT" : threshold > 40 ? "BALANCED" : "PERMISSIVE"}
						</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => form.reset()}
						disabled={!isDirty || isSubmitting}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50"
					>
						<RotateCcw size={12} /> Revert
					</button>
					<button
						type="button"
						onClick={form.handleSubmit(onSubmit)}
						disabled={isSubmitting || !isDirty}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
					>
						<Save size={12} /> {isSubmitting ? "Saving..." : "Save Config"}
					</button>
				</div>
			</header>

			{/* Split Layout */}
			<Form {...form}>
				<form className="flex flex-col flex-1 overflow-hidden lg:flex-row">
					{/* --- LEFT: PROTOCOL TUNER --- */}
					<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white space-y-10">
						{/* 1. Threshold Slider */}
						<section>
							<div className="flex items-center justify-between mb-6">
								<div className="flex items-center gap-2">
									<Activity size={14} />
									<h3 className="text-xs font-bold tracking-widest uppercase">
										Confidence Threshold
									</h3>
								</div>
								<div className="flex items-center gap-2 font-mono">
									<span className="text-[10px] text-[#888] uppercase">Cutoff Value:</span>
									<span className="text-lg font-bold bg-[#F3F2EE] px-2 py-0.5 border border-[#D1D1D1]">
										{threshold}%
									</span>
								</div>
							</div>

							<FormField
								control={form.control}
								name="widgetConfidenceThreshold"
								render={({ field }) => (
									<div className="relative flex items-center h-12">
										{/* Track */}
										<div className="absolute w-full h-2 bg-[#F3F2EE] border border-[#E5E5E5] rounded-full overflow-hidden">
											<div
												className="h-full bg-[#1A1A1A] opacity-20"
												style={{ width: `${field.value}%` }}
											/>
											{/* Safe Zone Indicator */}
											<div className="absolute right-0 top-0 h-full w-[30%] bg-green-500/10 border-l border-green-500/20" />
										</div>

										{/* Slider Input */}
										<input
											type="range"
											min="0"
											max="100"
											value={field.value}
											onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
											className="absolute z-10 w-full h-full opacity-0 cursor-pointer"
										/>

										{/* Custom Thumb Visual */}
										<div
											className="absolute h-6 w-3 bg-[#1A1A1A] border-2 border-white shadow-md pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
											style={{ left: `calc(${field.value}% - 6px)` }}
										>
											<div className="w-0.5 h-3 bg-white/50" />
										</div>
									</div>
								)}
							/>

							<div className="flex justify-between text-[9px] font-mono uppercase text-[#888] mt-2">
								<span>0% (Unsafe)</span>
								<span className="flex items-center gap-1 text-[#EAB308]">
									<AlertTriangle size={8} /> Recommended: 50%+
								</span>
								<span>100% (Strict)</span>
							</div>
						</section>

						{/* 2. Low Confidence Action */}
						<section>
							<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#F3F2EE]">
								<GitBranch size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Fallback Routing</h3>
							</div>

							<FormField
								control={form.control}
								name="widgetLowConfidenceAction"
								render={({ field }) => (
									<div className="space-y-3">
										<ActionCard
											id="respond"
											label="Permissive Mode"
											description="Send the AI response anyway, but log it as 'Low Quality' for review."
											icon={Zap}
											selected={field.value === "respond"}
											onSelect={(val) => field.onChange(val)}
										/>

										<ActionCard
											id="escalate"
											label="Agent Escalation"
											description="Immediately route the conversation to a human agent queue."
											icon={Lock}
											selected={field.value === "escalate"}
											onSelect={(val) => planHasEscalation && field.onChange(val)}
											locked={!planHasEscalation}
										/>
									</div>
								)}
							/>

							{/* Upsell Banner */}
							{!planHasEscalation && (
								<div className="flex items-start gap-3 p-3 mt-4 border border-blue-100 bg-blue-50">
									<HelpCircle size={14} className="text-blue-600 mt-0.5" />
									<div>
										<div className="text-[10px] font-bold uppercase text-blue-800">
											Why is escalation locked?
										</div>
										<p className="text-[10px] text-blue-700/80 leading-snug">
											Live agent routing requires a <strong>Paid Plan</strong> infrastructure.
											<Link
												href="/billing"
												className="ml-1 font-bold underline hover:text-blue-900"
											>
												Upgrade License
											</Link>
										</p>
									</div>
								</div>
							)}
						</section>

						{/* 3. Escalation Messages (if enabled) */}
						{action === "escalate" && planHasEscalation && (
							<section>
								<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#F3F2EE]">
									<ArrowRight size={14} />
									<h3 className="text-xs font-bold tracking-widest uppercase">
										Escalation Messages
									</h3>
								</div>

								<div className="space-y-4">
									<FormField
										control={form.control}
										name="escalationNoticeMessage"
										render={({ field }) => (
											<div className="space-y-1.5">
												<Label>Auto-Escalation Notice</Label>
												<Textarea
													value={field.value || ""}
													onChange={(e) => field.onChange(e.target.value || null)}
													placeholder="We don't have an exact response to your question, but we've escalated your message to our team."
													className="h-20 font-mono text-xs resize-y"
													showCharCount
												/>
											</div>
										)}
									/>

									{escalationEnabled && (
										<>
											<FormField
												control={form.control}
												name="userEscalationMessage"
												render={({ field }) => (
													<div className="space-y-1.5">
														<Label>User Escalation Message</Label>
														<Textarea
															value={field.value || ""}
															onChange={(e) => field.onChange(e.target.value || null)}
															placeholder="The conversation has been escalated. A human will respond soon."
															className="h-20 font-mono text-xs resize-y"
															showCharCount
														/>
													</div>
												)}
											/>

											<FormField
												control={form.control}
												name="deescalationMessage"
												render={({ field }) => (
													<div className="space-y-1.5">
														<Label>De-escalation Message</Label>
														<Textarea
															value={field.value || ""}
															onChange={(e) => field.onChange(e.target.value || null)}
															placeholder="The conversation has been transferred to an AI."
															className="h-20 font-mono text-xs resize-y"
															showCharCount
														/>
													</div>
												)}
											/>
										</>
									)}
								</div>
							</section>
						)}
					</div>

					{/* --- RIGHT: DECISION MATRIX SIMULATOR --- */}
					<div className="flex-1 bg-[#F3F2EE] flex items-center justify-center p-8 relative overflow-hidden">
						<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-40 pointer-events-none" />

						<div className="absolute top-6 left-6 text-[10px] font-mono uppercase text-[#888] flex items-center gap-2">
							<Terminal size={12} /> Logic Gate Simulator
						</div>

						{/* Simulator Container */}
						<div className="w-full max-w-md bg-white border border-[#D1D1D1] shadow-xl p-6 relative">
							{/* Step 1: Input */}
							<div className="mb-8">
								<Label className="block mb-2">Test Query Input</Label>
								<div className="flex gap-2">
									<Input
										type="text"
										value={simQuery}
										onChange={(e) => setSimQuery(e.target.value)}
										placeholder="Type a vague question..."
										className="flex-1 font-mono text-xs"
									/>
									<button
										type="button"
										onClick={runSimulation}
										className="bg-[#1A1A1A] text-white px-4 text-[10px] font-bold uppercase tracking-widest hover:bg-[#333]"
									>
										Run Test
									</button>
								</div>
							</div>

							{/* Step 2: Visualizer */}
							{simScore !== null ? (
								<div className="border border-[#E5E5E5] bg-[#FAFAF9] p-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
									{/* Score Display */}
									<div className="flex items-center w-full gap-4 mb-6">
										<div className="flex-1 text-right text-[10px] font-mono uppercase text-[#888]">
											Query Score
										</div>
										<div className={`text-2xl font-bold font-mono ${getStatusColor(simScore)}`}>
											{simScore}%
										</div>
										<div className="flex-1 text-[10px] font-mono uppercase text-[#888]">
											Threshold: {threshold}%
										</div>
									</div>

									{/* Visual Path */}
									<div className="relative flex items-center justify-between w-full mb-6">
										<div
											className={`w-3 h-3 rounded-full ${getStatusColor(simScore).replace("text", "bg")}`}
										/>
										<div className="flex-1 h-px bg-[#D1D1D1] relative">
											{/* Animated Arrow */}
											<div
												className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1A1A1A] rounded-full animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]"
												style={{ left: "50%" }}
											/>
										</div>
										<div className="w-3 h-3 rounded-full bg-[#1A1A1A]" />
									</div>

									{/* Result Card */}
									<div
										className={`w-full p-4 border text-center ${
											simScore >= threshold
												? "bg-green-50 border-green-200 text-green-800"
												: "bg-red-50 border-red-200 text-red-800"
										}`}
									>
										<div className="flex items-center justify-center gap-2 mb-1">
											{simScore >= threshold ? (
												<ShieldCheck size={16} />
											) : (
												<ShieldAlert size={16} />
											)}
											<span className="text-xs font-bold tracking-wide uppercase">
												{simScore >= threshold ? "Gate Passed" : "Gate Blocked"}
											</span>
										</div>
										<p className="text-[10px] font-mono opacity-80">
											{simScore >= threshold
												? "System sends standard AI response."
												: `System executes fallback: ${action === "escalate" ? "HUMAN ESCALATE" : "SEND ANYWAY"}`}
										</p>
									</div>
								</div>
							) : (
								<div className="h-40 border border-dashed border-[#D1D1D1] flex items-center justify-center text-[10px] text-[#CCC] font-mono uppercase">
									Waiting for input...
								</div>
							)}
						</div>
					</div>
				</form>
			</Form>
		</div>
	);
}
