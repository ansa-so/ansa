"use client";

import {
	AlertCircle,
	AtSign,
	CheckCircle2,
	Copy,
	Lock,
	Mail,
	MessageSquare,
	RotateCcw,
	Save,
	Server,
	Shield,
	Sparkles,
	Terminal,
	ToggleLeft,
	ToggleRight,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useChannelSettings } from "@/app/(authenticated)/settings/channel-settings-context";
import { Input } from "@/components/ui/input";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import { getEmailSettings, updateEmailSettings } from "@/lib/api";

// --- BRUTALIST COMPONENTS ---

const UpgradeOverlay = () => (
	<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F3F2EE]/90 backdrop-blur-[2px]">
		<div className="bg-white border border-[#D1D1D1] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.08)] p-8 max-w-md text-center">
			<div className="inline-flex p-3 mb-4 border border-[#E5E5E5] bg-[#FAFAF9]">
				<Lock size={24} className="text-[#888]" />
			</div>
			<h3 className="mb-2 text-lg font-bold tracking-tight uppercase">Feature Locked</h3>
			<p className="text-xs text-[#555] mb-6 leading-relaxed">
				The Email Gateway is available on Growth plan and above. Upgrade to process inbound support
				emails automatically with your AI agent.
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

function CopyableField({
	label,
	value,
	description,
}: {
	label: string;
	value: string;
	description?: string;
}) {
	const handleCopy = () => {
		navigator.clipboard.writeText(value);
		toast.success("Copied to clipboard");
	};

	return (
		<div className="group">
			<div className="flex justify-between items-end mb-1.5">
				<span className="text-[9px] font-mono uppercase text-[#888]">{label}</span>
				<span className="text-[9px] font-mono text-green-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Active Endpoint
				</span>
			</div>
			<div className="flex items-center gap-2">
				<div className="flex-1 bg-[#F3F2EE] border border-[#D1D1D1] h-10 px-3 flex items-center font-mono text-xs text-[#555] select-all overflow-hidden">
					{value || <span className="text-[#CCC]">Not configured</span>}
				</div>
				<button
					type="button"
					onClick={handleCopy}
					className="h-10 px-4 bg-white border border-[#D1D1D1] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center gap-2"
				>
					<Copy size={12} /> <span className="text-[9px] font-bold uppercase">Copy</span>
				</button>
			</div>
			{description && <p className="text-[9px] text-[#888] mt-1.5 font-mono">{description}</p>}
		</div>
	);
}

export default function EmailSettingsPage() {
	const { currentAgent } = useAgent();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const { refetch: refetchChannelSettings } = useChannelSettings();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

	// Check if current plan has email channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasEmailChannel =
		plansLoading || !currentPlanId
			? true // Show content while loading
			: currentPlanId === "unlimited" || (currentPlan?.hasEmailChannel ?? false);

	// Email settings state
	const [emailFormData, setEmailFormData] = useState({
		enabled: true,
		replyAddress: "",
		displayName: "",
		alertContact: "",
		disclaimerEnabled: true,
		disclaimerText: "This response was composed by an AI assistant.",
		signature: "",
		subjectPrefix: "",
		includeOriginal: true,
		ccAddress: "",
		allowedDomains: [] as string[],
		blockedSenders: [] as string[],
		confidenceThreshold: 70,
		lowConfidenceAction: "nothing" as "nothing" | "escalate" | "forward",
		forwardToEmail: "",
		threadCreationMode: "subject" as "always" | "subject" | "sender",
	});

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getEmailSettings(currentAgent.id);
			if (settings) {
				setEmailFormData({
					enabled: settings.enabled ?? true,
					replyAddress: settings.replyAddress || "",
					displayName: settings.displayName || "",
					alertContact: settings.alertContact || "",
					disclaimerEnabled: settings.disclaimerEnabled ?? true,
					disclaimerText:
						settings.disclaimerText || "This response was composed by an AI assistant.",
					signature: settings.signature || "",
					subjectPrefix: settings.subjectPrefix || "",
					includeOriginal: settings.includeOriginal ?? true,
					ccAddress: settings.ccAddress || "",
					allowedDomains: settings.allowedDomains || [],
					blockedSenders: settings.blockedSenders || [],
					confidenceThreshold: settings.confidenceThreshold || 70,
					lowConfidenceAction:
						(settings.lowConfidenceAction as "nothing" | "escalate" | "forward") || "nothing",
					forwardToEmail: settings.forwardToEmail || "",
					threadCreationMode:
						(settings.threadCreationMode as "always" | "subject" | "sender") || "subject",
				});
			}
		} catch (err) {
			console.error("Failed to fetch email settings:", err);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		if (currentAgent) {
			fetchData();
		}
	}, [currentAgent, fetchData]);

	const handleSave = async () => {
		if (!currentAgent) return;
		setSaving(true);
		try {
			await updateEmailSettings(currentAgent.id, emailFormData);
			setIsDirty(false);
			// Refetch channel settings to update sidebar visibility
			await refetchChannelSettings();
		} catch (err) {
			console.error("Failed to save settings:", err);
			toast.error("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const updateField = <K extends keyof typeof emailFormData>(
		key: K,
		value: (typeof emailFormData)[K],
	) => {
		setEmailFormData((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	};

	if (loading || !currentAgent) return null;

	// Generate system email from agent ID
	const systemEmail = `agent-${currentAgent.id.slice(0, 12)}@mail.ansa.so`;

	return (
		<div className="relative flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Upgrade Overlay */}
			{!planHasEmailChannel && <UpgradeOverlay />}

			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Email Gateway</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Server size={10} /> Node ID: MAIL-01
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span
							className={
								!planHasEmailChannel
									? "text-[#EAB308] flex items-center gap-1"
									: emailFormData.enabled
										? "text-green-600"
										: "text-red-600"
							}
						>
							{!planHasEmailChannel ? (
								<>
									<Zap size={8} fill="currentColor" /> License Restriction
								</>
							) : emailFormData.enabled ? (
								"ONLINE"
							) : (
								"OFFLINE"
							)}
						</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => window.location.reload()}
						disabled={!isDirty || saving}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50"
					>
						<RotateCcw size={12} /> Revert
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={saving || !isDirty}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
					>
						<Save size={12} /> {saving ? "Saving..." : "Save Config"}
					</button>
				</div>
			</header>

			{/* Content Area */}
			<div className="flex-1 w-full p-8 mx-auto space-y-8 overflow-y-auto">
				{/* 1. Gateway Status (Master Switch) */}
				<section
					className={`border p-6 flex items-center justify-between transition-colors ${
						emailFormData.enabled
							? "bg-white border-[#1A1A1A] shadow-sm"
							: "bg-[#FAFAF9] border-[#D1D1D1]"
					}`}
				>
					<div className="flex items-start gap-4">
						<div
							className={`p-3 border ${
								emailFormData.enabled
									? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
									: "bg-white text-[#888] border-[#E5E5E5]"
							}`}
						>
							<Mail size={20} />
						</div>
						<div>
							<h3 className="mb-1 text-sm font-bold tracking-widest uppercase">
								Inbound Email Relay
							</h3>
							<p className="text-xs text-[#555] max-w-md leading-relaxed">
								When enabled, the AI will process emails sent to the routing address and reply
								automatically based on your Knowledge Base.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => updateField("enabled", !emailFormData.enabled)}
						className={`transition-colors duration-200 ${
							emailFormData.enabled ? "text-[#1A1A1A]" : "text-[#D1D1D1]"
						}`}
					>
						{emailFormData.enabled ? (
							<ToggleRight size={40} strokeWidth={1.5} />
						) : (
							<ToggleLeft size={40} strokeWidth={1.5} />
						)}
					</button>
				</section>

				{/* 2. Routing Coordinates */}
				<section
					className={`transition-opacity duration-300 ${
						emailFormData.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
					}`}
				>
					<div className="flex items-center gap-2 mb-4">
						<Terminal size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">Routing Coordinates</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<CopyableField
							label="System Inbound Address"
							value={systemEmail}
							description="Auto-forward emails to this address to trigger the agent."
						/>

						<div className="mt-6 pt-6 border-t border-[#F3F2EE]">
							<div className="group">
								<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
									Reply Email Address (Optional)
								</span>
								<div className="relative flex items-center">
									<div className="absolute left-3 text-[#888] pointer-events-none z-10">
										<Mail size={12} />
									</div>
									<Input
										type="email"
										value={emailFormData.replyAddress}
										onChange={(e) => updateField("replyAddress", e.target.value)}
										placeholder="support@yourdomain.com"
										className="h-10 p-0 pl-8 pr-3 font-mono text-xs"
									/>
								</div>
							</div>
						</div>

						<div className="mt-6 pt-6 border-t border-[#F3F2EE] flex gap-4">
							<div className="flex flex-1 gap-3 p-3 border border-blue-100 bg-blue-50">
								<Shield size={14} className="text-blue-600 mt-0.5" />
								<div>
									<div className="text-[9px] font-bold uppercase text-blue-800">
										DMARC / SPF Config
									</div>
									<p className="text-[10px] text-blue-700/80 leading-snug mt-1">
										To prevent your AI replies from landing in spam, add our DKIM records to your
										DNS.
										<button type="button" className="ml-1 font-bold underline">
											View DNS Records
										</button>
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* 3. Conversation Threading */}
				<section
					className={`transition-opacity duration-300 ${
						emailFormData.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
					}`}
				>
					<div className="flex items-center gap-2 mb-4">
						<MessageSquare size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">Conversation Threading</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<div className="group">
							<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block">
								Create New Conversation
							</span>
							<select
								value={emailFormData.threadCreationMode}
								onChange={(e) =>
									updateField(
										"threadCreationMode",
										e.target.value as "always" | "subject" | "sender",
									)
								}
								className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-colors"
							>
								<option value="always">Always (each email = new conversation)</option>
								<option value="subject">Same subject (group by sender + subject)</option>
								<option value="sender">Same sender (group all from same address)</option>
							</select>
							<p className="text-[9px] text-[#888] mt-1.5 font-mono">
								Controls how incoming emails are grouped into conversations.
							</p>
						</div>
					</div>
				</section>

				{/* 4. Packet Headers (Metadata) */}
				<section
					className={`transition-opacity duration-300 ${
						emailFormData.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
					}`}
				>
					<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
						{/* Left Col: Headers */}
						<div>
							<div className="flex items-center gap-2 mb-4">
								<AtSign size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Header Injection</h3>
							</div>
							<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm space-y-5 h-full">
								<div className="group">
									<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
										Sender Display Name
									</span>
									<Input
										value={emailFormData.displayName}
										onChange={(e) => updateField("displayName", e.target.value)}
										placeholder="e.g. Support Team"
										className="h-10 p-0 px-3 font-mono text-xs"
									/>
								</div>
								<div className="group">
									<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
										Subject Line Prefix
									</span>
									<Input
										value={emailFormData.subjectPrefix}
										onChange={(e) => updateField("subjectPrefix", e.target.value)}
										placeholder="e.g. [AI Support]"
										className="h-10 p-0 px-3 font-mono text-xs"
									/>
								</div>
								<div className="p-3 bg-[#FAFAF9] border border-[#E5E5E5]">
									<div className="text-[9px] font-mono uppercase text-[#888] mb-1">Preview</div>
									<div className="text-xs font-mono text-[#1A1A1A]">
										From:{" "}
										<span className="font-bold">{emailFormData.displayName || "AI Assistant"}</span>
										<br />
										Subject:{" "}
										<span className="font-bold">{emailFormData.subjectPrefix || "[Support]"}</span>{" "}
										Re: Order Status
									</div>
								</div>
							</div>
						</div>

						{/* Right Col: Observability */}
						<div>
							<div className="flex items-center gap-2 mb-4">
								<AlertCircle size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Observability</h3>
							</div>
							<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm space-y-5 h-full">
								<div className="group">
									<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
										CC: Loop Address (Optional)
									</span>
									<div className="relative flex items-center flex-1 w-full">
										<div className="absolute left-3 text-[#888] pointer-events-none z-10">
											<Mail size={12} />
										</div>
										<Input
											type="email"
											value={emailFormData.ccAddress}
											onChange={(e) => updateField("ccAddress", e.target.value)}
											placeholder="team@yourdomain.com"
											className="w-full h-10 p-0 pl-8 pr-3 font-mono text-xs"
										/>
									</div>
								</div>
								<div className="group">
									<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
										Delivery Failure Alert
									</span>
									<div className="relative flex items-center w-full">
										<div className="absolute left-3 text-[#888] pointer-events-none z-10">
											<AlertCircle size={12} />
										</div>
										<Input
											type="email"
											value={emailFormData.alertContact}
											onChange={(e) => updateField("alertContact", e.target.value)}
											placeholder="admin@yourdomain.com"
											className="w-full h-10 p-0 pl-8 pr-3 font-mono text-xs"
										/>
									</div>
								</div>
								{emailFormData.alertContact && (
									<div className="flex items-start gap-2 text-[9px] text-[#888] font-mono leading-relaxed pt-2">
										<CheckCircle2 size={12} className="text-green-600 mt-0.5 shrink-0" />
										<span>
											Verification email sent to <strong>{emailFormData.alertContact}</strong>.
											Please confirm to activate alerts.
										</span>
									</div>
								)}
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
