"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Activity, AlertTriangle, Bot, Cpu, Save, Terminal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { HardwareSwitch } from "@/components/ui/hardware-switch";
import { Input } from "@/components/ui/input";
import { ModeSelector } from "@/components/ui/mode-selector";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { Title } from "@/components/ui/title";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { INSTRUCTIONS } from "@/lib/agent";
import { useAgent } from "@/lib/agent-context";
import { deleteAgent, updateAgent } from "@/lib/api";
import { type AgentFormData, agentSchema } from "../_lib/schemas";

export default function GeneralSettingsPage() {
	const router = useRouter();
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const { currentPlanId } = usePlansWithCurrent();
	const [isDeleting, setIsDeleting] = useState(false);
	const [selectedInstruction, setSelectedInstruction] = useState("");

	const agentForm = useForm<AgentFormData>({
		resolver: zodResolver(agentSchema),
		defaultValues: {
			name: "",
			aiQuality: "balanced",
			temperature: 50,
			systemPrompt: "You are a helpful assistant.",
			persona: "default",
			isDefault: false,
		},
	});

	const temperature = agentForm.watch("temperature");
	const { isDirty: agentDirty, isSubmitting: agentSubmitting } = agentForm.formState;

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (agentDirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [agentDirty]);

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		try {
			agentForm.reset({
				name: currentAgent.name,
				aiQuality: (currentAgent.aiQuality || "balanced") as "balanced" | "high_quality",
				temperature: currentAgent.temperature,
				systemPrompt: currentAgent.systemPrompt,
				persona: currentAgent.persona || "default",
				isDefault: currentAgent.isDefault ?? false,
			});
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		}
	}, [agentForm, currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchData();
		}
	}, [agentLoading, currentAgent, fetchData]);

	const onAgentSubmit = async (data: AgentFormData) => {
		if (!currentAgent) return;
		try {
			await updateAgent(currentAgent.id, {
				name: data.name,
				aiQuality: data.aiQuality,
				temperature: data.temperature,
				systemPrompt: data.systemPrompt,
				persona: data.persona,
				isDefault: data.isDefault,
			});
			await refetchAgents();
		} catch (err) {
			console.error("Failed to save agent:", err);
			toast.error("Failed to save settings");
		}
	};

	if (!currentAgent) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<Bot className="w-12 h-12 mb-4 text-muted-foreground" />
				<Title tag="h2" size="xl" className="mb-2">
					No Agent Selected
				</Title>
				<Text className="mb-6 text-muted-foreground">Create an AI agent to access settings.</Text>
				<Button onClick={() => router.push("/onboarding")} className="mb-3">
					Set up from website
				</Button>
				<button
					type="button"
					onClick={() => router.push("/agents/new")}
					className="text-sm underline text-muted-foreground hover:text-foreground"
				>
					or create a blank agent
				</button>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">General Settings</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Agent Active
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>ID: {currentAgent?.id?.slice(0, 8).toUpperCase()}</span>
						{currentAgent?.hasShopifyConnection && (
							<>
								<span className="text-[#D1D1D1]">|</span>
								<span className="text-green-700">Shopify Connected</span>
							</>
						)}
					</div>
				</div>

				<button
					type="submit"
					form="agent-form"
					disabled={agentSubmitting || !agentDirty}
					className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
				>
					<Save size={12} /> {agentSubmitting ? "Saving..." : "Save Changes"}
				</button>
			</header>

			<div className="w-full p-8 mx-auto space-y-8">
				<Form {...agentForm}>
					<form
						id="agent-form"
						onSubmit={agentForm.handleSubmit(onAgentSubmit)}
						className="space-y-8"
					>
						{/* Agent Identity Section */}
						<Card variant="brutalist">
							<CardHeader variant="brutalist">
								<CardTitle icon={<Cpu size={14} />}>Agent Identity</CardTitle>
							</CardHeader>
							<CardContent className="pt-6 space-y-6">
								<div className="grid grid-cols-1 gap-6 md:grid-cols-2">
									<FormField
										control={agentForm.control}
										name="name"
										render={({ field }) => (
											<FormItem>
												<span className="text-[10px] font-mono uppercase text-[#888] block mb-2">
													Display Name
												</span>
												<FormControl>
													<Input
														placeholder="My Assistant"
														className="h-10 bg-[#FAFAF9] border-[#D1D1D1] px-3 text-sm font-medium focus:border-[#1A1A1A] focus:bg-white"
														{...field}
													/>
												</FormControl>
												<p className="text-[10px] text-[#888]">
													Visible to users in the chat header.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>

									<FormField
										control={agentForm.control}
										name="aiQuality"
										render={({ field }) => (
											<FormItem>
												<span className="text-[10px] font-mono uppercase text-[#888] block mb-2">
													Compute Model
												</span>
												<FormControl>
													<ModeSelector
														value={field.value}
														onChange={field.onChange}
														options={[
															{ label: "Balanced", value: "balanced" },
															{
																label: "High Precision",
																value: "high_quality",
																disabled: currentPlanId === "free" || currentPlanId === "starter",
																badge:
																	currentPlanId === "free" || currentPlanId === "starter"
																		? "Pro"
																		: undefined,
															},
														]}
													/>
												</FormControl>
												<p className="text-[10px] text-[#888]">
													High Precision is reserved to paid account.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>

								<FormField
									control={agentForm.control}
									name="isDefault"
									render={({ field }) => (
										<HardwareSwitch
											label="Set as Default Agent"
											description="This agent config will be used for all new incoming sessions."
											checked={field.value}
											onChange={field.onChange}
										/>
									)}
								/>
							</CardContent>
						</Card>

						{/* Response Behavior Section */}
						<Card variant="brutalist">
							<CardHeader variant="brutalist">
								<CardTitle icon={<Activity size={14} />}>Response Behavior</CardTitle>
							</CardHeader>
							<CardContent className="pt-6 space-y-8">
								{/* Temperature Slider */}
								<FormField
									control={agentForm.control}
									name="temperature"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-end justify-between mb-2">
												<span className="text-[10px] font-mono uppercase text-[#888]">
													Creativity Index (Temperature)
												</span>
												<div className="text-xs font-bold font-mono border border-[#E5E5E5] px-2 py-0.5 bg-[#FAFAF9]">
													{(temperature / 100).toFixed(2)}
												</div>
											</div>
											<FormControl>
												<Slider
													variant="brutalist"
													min={0}
													max={100}
													step={1}
													value={[field.value]}
													onValueChange={(value) => field.onChange(value[0])}
												/>
											</FormControl>
											<div className="flex justify-between mt-2 text-[9px] font-mono text-[#888] uppercase">
												<span>Strict (0.0)</span>
												<span>Balanced (0.5)</span>
												<span>Creative (1.0)</span>
											</div>
										</FormItem>
									)}
								/>

								{/* System Prompt */}
								<div className="space-y-2">
									<div className="flex items-end justify-between">
										<span className="text-[10px] font-mono uppercase text-[#888]">
											Core Directive (System Prompt)
										</span>
										<Select
											value={selectedInstruction}
											onValueChange={(value) => {
												setSelectedInstruction(value);
												const instruction = INSTRUCTIONS.find((i) => i.name === value);
												if (instruction) {
													agentForm.setValue("systemPrompt", instruction.content, {
														shouldDirty: true,
													});
												}
											}}
										>
											<SelectTrigger className="w-auto h-6 text-[9px] font-bold uppercase text-[#555] hover:text-[#1A1A1A] border-none bg-transparent shadow-none px-0 gap-1">
												<Terminal size={10} />
												<SelectValue placeholder="Load Template" />
											</SelectTrigger>
											<SelectContent>
												{INSTRUCTIONS.map((instruction) => (
													<SelectItem key={instruction.name} value={instruction.name}>
														{instruction.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
									<FormField
										control={agentForm.control}
										name="systemPrompt"
										render={({ field }) => (
											<FormItem>
												<div className="relative">
													<FormControl>
														<Textarea
															placeholder="You are a helpful assistant..."
															className="min-h-[128px] resize-y"
															{...field}
															onChange={(e) => {
																field.onChange(e);
																setSelectedInstruction("");
															}}
														/>
													</FormControl>
												</div>
												<p className="text-[10px] text-[#888]">
													Define the persona, constraints, and operational boundaries of the AI.
												</p>
												<FormMessage />
											</FormItem>
										)}
									/>
								</div>
							</CardContent>
						</Card>

						{/* Danger Zone */}
						<section className="relative flex flex-col items-center justify-between gap-6 p-6 overflow-hidden border border-red-200 bg-red-50/30 md:flex-row">
							{/* Warning stripes pattern */}
							<div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#ef4444,#ef4444_10px,#fee2e2_10px,#fee2e2_20px)] opacity-50" />

							<div className="flex items-start gap-4">
								<div className="p-2 text-red-600 bg-white border border-red-100 rounded-sm">
									<AlertTriangle size={20} />
								</div>
								<div>
									<h3 className="mb-1 text-sm font-bold text-red-900 uppercase">
										Termination Protocol
									</h3>
									<p className="max-w-md text-xs leading-relaxed text-red-700/80">
										Permanently delete this agent and all associated conversation logs. This action
										cannot be undone.
									</p>
								</div>
							</div>

							<AlertDialog>
								<AlertDialogTrigger asChild>
									<button
										type="button"
										disabled={isDeleting}
										className="bg-white border border-red-200 text-red-600 px-4 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
									>
										<Trash2 size={12} /> {isDeleting ? "Deleting..." : "Delete Agent"}
									</button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
										<AlertDialogDescription>
											This action cannot be undone. This will permanently delete the agent
											<strong> &quot;{currentAgent?.name}&quot;</strong> and all associated data.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											className="text-white bg-destructive hover:bg-destructive/90"
											onClick={async () => {
												if (!currentAgent) return;
												setIsDeleting(true);
												try {
													await deleteAgent(currentAgent.id);
													await refetchAgents();
													toast.success("Agent deleted successfully");
													router.push("/dashboard");
												} catch (err) {
													console.error("Failed to delete agent:", err);
													toast.error("Failed to delete agent");
												} finally {
													setIsDeleting(false);
												}
											}}
										>
											Delete Agent
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						</section>
					</form>
				</Form>
			</div>
		</div>
	);
}
