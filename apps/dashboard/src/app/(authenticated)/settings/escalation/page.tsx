"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
	AlertOctagon,
	ArrowRight,
	Bell,
	CheckCircle2,
	Clock,
	Headphones,
	Lock,
	MessageSquare,
	RotateCcw,
	Save,
	Sparkles,
	Tag,
	ToggleLeft,
	ToggleRight,
	User,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import {
	type EscalationSettings,
	getEscalationSettings,
	getTeamMembers,
	type TeamMember,
	updateEscalationSettings,
} from "@/lib/api";
import { type EscalationFormData, escalationSchema } from "../_lib/schemas";

// --- COMPONENTS ---

const TriggerCard = ({
	id,
	label,
	description,
	icon: Icon,
	selected,
	onSelect,
}: {
	id: string;
	label: string;
	description: string;
	icon: React.ElementType;
	selected: boolean;
	onSelect: (id: string) => void;
}) => (
	<button
		type="button"
		onClick={() => onSelect(id)}
		className={`w-full text-left relative border p-4 transition-all flex items-start gap-3 group ${
			selected
				? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] z-10"
				: "bg-[#FAFAF9] border-[#D1D1D1] hover:bg-white hover:border-[#888]"
		}`}
	>
		<div
			className={`p-1.5 border mt-0.5 ${
				selected
					? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
					: "bg-white text-[#555] border-[#E5E5E5]"
			}`}
		>
			<Icon size={14} />
		</div>
		<div>
			<h3
				className={`text-xs font-bold uppercase tracking-wide mb-1 ${
					selected ? "text-[#1A1A1A]" : "text-[#555]"
				}`}
			>
				{label}
			</h3>
			<p className="text-[10px] text-[#888] font-mono leading-tight">{description}</p>
		</div>
		{selected && <div className="absolute w-2 h-2 bg-green-500 rounded-full top-2 right-2" />}
	</button>
);

const SelectInput = ({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
}) => {
	const id = useId();
	return (
		<div className="group">
			<label
				htmlFor={id}
				className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors"
			>
				{label}
			</label>
			<div className="relative">
				<select
					id={id}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A] appearance-none cursor-pointer"
				>
					{options.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
				<div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#888]">
					<ArrowRight size={10} className="rotate-90" />
				</div>
			</div>
		</div>
	);
};

const UpgradeOverlay = () => (
	<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F3F2EE]/90 backdrop-blur-[2px]">
		<div className="bg-white border border-[#D1D1D1] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.08)] p-8 max-w-md text-center">
			<div className="inline-flex p-3 mb-4 border border-[#E5E5E5] bg-[#FAFAF9]">
				<Lock size={24} className="text-[#888]" />
			</div>
			<h3 className="mb-2 text-lg font-bold tracking-tight uppercase">Feature Locked</h3>
			<p className="text-xs text-[#555] mb-6 leading-relaxed">
				Human Escalation is available on Growth plan and above. Upgrade to allow users to request
				human assistance and manage escalations from the dashboard.
			</p>
			<Link
				href="/billing"
				className="inline-flex items-center gap-2 h-10 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors"
			>
				<Sparkles size={12} />
				Upgrade Plan
			</Link>
		</div>
	</div>
);

export default function EscalationSettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
	const [settingsLoading, setSettingsLoading] = useState(true);
	const [isSaving, setIsSaving] = useState(false);

	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasEscalation =
		plansLoading || !currentPlanId
			? true
			: currentPlanId === "unlimited" || (currentPlan?.hasEscalation ?? false);

	const form = useForm<EscalationFormData>({
		resolver: zodResolver(escalationSchema),
		defaultValues: {
			enabled: false,
			showButtonsAfter: "first_ai_response",
			notificationMethod: "none",
			emailAddresses: "",
			slackWebhookUrl: "",
			webhookUrl: "",
			defaultPriority: "medium",
			defaultAssigneeId: "",
		},
	});

	const enabled = form.watch("enabled");
	const notificationMethod = form.watch("notificationMethod");
	const showButtonsAfter = form.watch("showButtonsAfter");
	const defaultPriority = form.watch("defaultPriority");
	const defaultAssigneeId = form.watch("defaultAssigneeId");
	const emailAddresses = form.watch("emailAddresses");
	const slackWebhookUrl = form.watch("slackWebhookUrl");
	const webhookUrl = form.watch("webhookUrl");

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setSettingsLoading(true);
		try {
			const [escalationSettings, membersData] = await Promise.all([
				getEscalationSettings(currentAgent.id),
				getTeamMembers(),
			]);

			setTeamMembers(membersData);

			form.reset({
				enabled: escalationSettings.enabled,
				showButtonsAfter: escalationSettings.showButtonsAfter,
				notificationMethod: escalationSettings.notificationMethod,
				emailAddresses: escalationSettings.notificationConfig?.emailAddresses?.join(", ") || "",
				slackWebhookUrl: escalationSettings.notificationConfig?.slackWebhookUrl || "",
				webhookUrl: escalationSettings.notificationConfig?.webhookUrl || "",
				defaultPriority: escalationSettings.defaultPriority,
				defaultAssigneeId: escalationSettings.defaultAssigneeId || "",
			});
		} catch (err) {
			console.error("Failed to fetch settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setSettingsLoading(false);
		}
	}, [currentAgent, form]);

	useEffect(() => {
		if (currentAgent) {
			fetchData();
		}
	}, [currentAgent, fetchData]);

	const handleSave = async () => {
		if (!currentAgent) return;
		const data = form.getValues();

		setIsSaving(true);
		try {
			const notificationConfig: EscalationSettings["notificationConfig"] = {};
			if (data.notificationMethod === "email" && data.emailAddresses) {
				notificationConfig.emailAddresses = data.emailAddresses
					.split(",")
					.map((e) => e.trim())
					.filter(Boolean);
			}
			if (data.notificationMethod === "slack" && data.slackWebhookUrl) {
				notificationConfig.slackWebhookUrl = data.slackWebhookUrl;
			}
			if (data.notificationMethod === "webhook" && data.webhookUrl) {
				notificationConfig.webhookUrl = data.webhookUrl;
			}

			await updateEscalationSettings(currentAgent.id, {
				enabled: data.enabled,
				showButtonsAfter: data.showButtonsAfter,
				notificationMethod: data.notificationMethod,
				notificationConfig,
				defaultPriority: data.defaultPriority,
				defaultAssigneeId: data.defaultAssigneeId || null,
			});
			toast.success("Configuration saved");
		} catch (err) {
			console.error("Failed to save:", err);
			toast.error("Failed to save settings");
		} finally {
			setIsSaving(false);
		}
	};

	const handleReset = () => {
		fetchData();
		toast.info("Settings reverted");
	};

	if (settingsLoading || plansLoading || !currentAgent) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
				<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest">
					Loading configuration...
				</div>
			</div>
		);
	}

	const triggerOptions: {
		id: string;
		label: string;
		description: string;
		icon: React.ElementType;
	}[] = [
		{
			id: "first_ai_response",
			label: "After First Response",
			description: "Button appears after the AI responds once.",
			icon: MessageSquare,
		},
		{
			id: "every_ai_response",
			label: "After Every Response",
			description: "Button shows after each AI message.",
			icon: Clock,
		},
		{
			id: "on_low_confidence",
			label: "Low Confidence",
			description: "Only when AI confidence drops below threshold.",
			icon: AlertOctagon,
		},
		{
			id: "on_human_request",
			label: "Human Keywords",
			description: "When user asks for human/agent explicitly.",
			icon: User,
		},
		{
			id: "on_any_signal",
			label: "Any Signal",
			description: "Trigger on any escalation signal detected.",
			icon: Zap,
		},
		{
			id: "never",
			label: "Never (API Only)",
			description: "No button shown, handle via API/SDK.",
			icon: Lock,
		},
	];

	const notificationOptions = [
		{ value: "none", label: "None (Dashboard only)" },
		{ value: "email", label: "Email Broadcast" },
		{ value: "slack", label: "Slack Webhook" },
		{ value: "webhook", label: "Custom Webhook" },
	];

	const priorityOptions = [
		{ value: "low", label: "Low" },
		{ value: "medium", label: "Medium" },
		{ value: "high", label: "High" },
		{ value: "urgent", label: "Urgent" },
	];

	const assigneeOptions = [
		{ value: "", label: "Unassigned" },
		...teamMembers.map((m) => ({ value: m.memberId, label: m.email })),
	];

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE] relative">
			{!planHasEscalation && <UpgradeOverlay />}

			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Live Agent Protocol</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Headphones size={10} /> Human Escalation
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span className={enabled ? "text-green-600" : "text-[#888]"}>
							{enabled ? "SYSTEM ARMED" : "DISARMED"}
						</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={handleReset}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
					>
						<RotateCcw size={12} /> Revert
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
					>
						<Save size={12} /> {isSaving ? "Saving..." : "Save Config"}
					</button>
				</div>
			</header>

			<div className="w-full p-8 mx-auto space-y-8">
				<section
					className={`border p-6 flex items-center justify-between transition-colors ${
						enabled ? "bg-white border-[#1A1A1A] shadow-sm" : "bg-[#FAFAF9] border-[#D1D1D1]"
					}`}
				>
					<div className="flex items-start gap-4">
						<div
							className={`p-3 border ${
								enabled
									? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
									: "bg-white text-[#888] border-[#E5E5E5]"
							}`}
						>
							<Headphones size={20} />
						</div>
						<div>
							<h3 className="mb-1 text-sm font-bold tracking-widest uppercase">
								Human Interceptor
							</h3>
							<p className="text-xs text-[#555] max-w-md leading-relaxed">
								Enables the "Talk to Human" capability. When triggered, the AI pauses generation and
								routes the session to your inbox for manual handling.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => form.setValue("enabled", !enabled)}
						className={`transition-colors duration-200 ${
							enabled ? "text-[#1A1A1A]" : "text-[#D1D1D1]"
						}`}
					>
						{enabled ? (
							<ToggleRight size={40} strokeWidth={1.5} />
						) : (
							<ToggleLeft size={40} strokeWidth={1.5} />
						)}
					</button>
				</section>

				<div
					className={`space-y-8 transition-all duration-300 ${
						enabled ? "opacity-100 translate-y-0" : "opacity-40 translate-y-4 pointer-events-none"
					}`}
				>
					<section>
						<div className="flex items-center gap-2 mb-4">
							<Zap size={14} />
							<h3 className="text-xs font-bold tracking-widest uppercase">Injection Logic</h3>
						</div>

						<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
							<span className="text-[9px] font-mono uppercase text-[#888] mb-4 block">
								When should the escalation button appear?
							</span>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
								{triggerOptions.map((opt) => (
									<TriggerCard
										key={opt.id}
										id={opt.id}
										label={opt.label}
										description={opt.description}
										icon={opt.icon}
										selected={showButtonsAfter === opt.id}
										onSelect={(id) =>
											form.setValue(
												"showButtonsAfter",
												id as EscalationFormData["showButtonsAfter"],
											)
										}
									/>
								))}
							</div>
						</div>
					</section>

					<section className="grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<div className="flex items-center gap-2 mb-4">
								<Bell size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Alert Dispatch</h3>
							</div>
							<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm h-full flex flex-col justify-between">
								<div className="space-y-4">
									<SelectInput
										label="Primary Notification Channel"
										value={notificationMethod}
										options={notificationOptions}
										onChange={(v) =>
											form.setValue(
												"notificationMethod",
												v as EscalationFormData["notificationMethod"],
											)
										}
									/>

									{notificationMethod === "email" && (
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Email Addresses
											</span>
											<Input
												value={emailAddresses}
												onChange={(e) => form.setValue("emailAddresses", e.target.value)}
												placeholder="support@example.com, team@example.com"
												className="h-10 p-0 px-3 font-mono text-xs"
											/>
										</div>
									)}

									{notificationMethod === "slack" && (
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Slack Webhook URL
											</span>
											<Input
												value={slackWebhookUrl}
												onChange={(e) => form.setValue("slackWebhookUrl", e.target.value)}
												placeholder="https://hooks.slack.com/services/..."
												className="h-10 p-0 px-3 font-mono text-xs"
											/>
										</div>
									)}

									{notificationMethod === "webhook" && (
										<div className="group">
											<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
												Webhook URL
											</span>
											<Input
												value={webhookUrl}
												onChange={(e) => form.setValue("webhookUrl", e.target.value)}
												placeholder="https://your-server.com/webhook"
												className="h-10 p-0 px-3 font-mono text-xs"
											/>
										</div>
									)}

									<div className="p-3 bg-[#FAFAF9] border border-[#E5E5E5] space-y-2">
										<div className="flex items-center justify-between text-[10px] font-mono">
											<span className="text-[#555]">Dashboard Inbox</span>
											<span className="flex items-center gap-1 font-bold text-green-600 uppercase">
												<CheckCircle2 size={8} /> Active
											</span>
										</div>
										<div className="flex items-center justify-between text-[10px] font-mono">
											<span className="text-[#555]">
												{notificationMethod === "none"
													? "External Channel"
													: notificationMethod === "email"
														? `Email (${emailAddresses.split(",")[0] || "..."})`
														: notificationMethod === "slack"
															? "Slack Integration"
															: "Custom Webhook"}
											</span>
											<span
												className={`flex items-center gap-1 uppercase ${
													notificationMethod !== "none" ? "text-green-600 font-bold" : "text-[#CCC]"
												}`}
											>
												{notificationMethod !== "none" ? (
													<>
														<CheckCircle2 size={8} /> Active
													</>
												) : (
													<>
														<div className="w-1.5 h-1.5 bg-[#CCC] rounded-full" /> Idle
													</>
												)}
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>

						<div>
							<div className="flex items-center gap-2 mb-4">
								<Tag size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">
									Ticket Initialization
								</h3>
							</div>
							<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm h-full space-y-5">
								<SelectInput
									label="Default Priority Level"
									value={defaultPriority}
									options={priorityOptions}
									onChange={(v) =>
										form.setValue("defaultPriority", v as EscalationFormData["defaultPriority"])
									}
								/>
								<SelectInput
									label="Auto-Assignee"
									value={defaultAssigneeId}
									options={assigneeOptions}
									onChange={(v) => form.setValue("defaultAssigneeId", v)}
								/>
								<div className="text-[9px] text-[#888] font-mono pt-2 border-t border-[#F3F2EE]">
									* Rules are applied immediately upon escalation.
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
