"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, Cpu, RotateCcw, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PersonaSelector } from "@/components/persona-selector";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { useAgent } from "@/lib/agent-context";
import { updateAgent } from "@/lib/api";
import { type AgentFormData, agentSchema } from "../_lib/schemas";

export default function PersonalitySettingsPage() {
	const router = useRouter();
	const { currentAgent, refetchAgents, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);

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
		if (!currentAgent) {
			setLoading(false);
			return;
		}
		setLoading(true);
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
		} finally {
			setLoading(false);
		}
	}, [agentForm, currentAgent]);

	useEffect(() => {
		if (!agentLoading && currentAgent) {
			fetchData();
		} else if (!agentLoading && !currentAgent) {
			setLoading(false);
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

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<Text className="text-muted-foreground">Loading...</Text>
			</div>
		);
	}

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
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Cognitive Drivers</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Sparkles size={10} /> Personality Module
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Active: {agentForm.watch("persona") || "default"}</span>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => agentForm.reset()}
						disabled={!agentDirty || agentSubmitting}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase tracking-widest hover:bg-[#F3F2EE] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<RotateCcw size={12} /> Reset
					</button>
					<button
						type="submit"
						form="personality-form"
						disabled={agentSubmitting || !agentDirty}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Save size={12} /> {agentSubmitting ? "Saving..." : "Save Changes"}
					</button>
				</div>
			</header>

			<div className="p-8 max-w-[1400px] mx-auto">
				<Form {...agentForm}>
					<form
						id="personality-form"
						onSubmit={agentForm.handleSubmit(onAgentSubmit)}
						className="space-y-8"
					>
						{/* Section Header */}
						<div className="flex items-center gap-2">
							<Cpu size={14} />
							<h3 className="text-xs font-bold tracking-widest uppercase">Available Modules</h3>
						</div>

						<FormField
							control={agentForm.control}
							name="persona"
							render={({ field }) => (
								<FormItem>
									<FormControl>
										<PersonaSelector
											value={field.value}
											onChange={(value) => {
												field.onChange(value);
											}}
											onSystemPromptChange={(prompt) => {
												agentForm.setValue("systemPrompt", prompt, { shouldDirty: true });
											}}
											disabled={agentSubmitting}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>
			</div>
		</div>
	);
}
