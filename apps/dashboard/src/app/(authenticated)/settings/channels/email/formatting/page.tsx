"use client";

import {
	AlertCircle,
	CheckCircle2,
	Eye,
	Hash,
	PenTool,
	Quote,
	RotateCcw,
	Save,
	Server,
	ToggleLeft,
	ToggleRight,
} from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useChannelSettings } from "@/app/(authenticated)/settings/channel-settings-context";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgent } from "@/lib/agent-context";
import { getEmailSettings, updateEmailSettings } from "@/lib/api";

// --- COMPONENTS ---

const ConfigSection = ({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	children: React.ReactNode;
}) => (
	<div className="bg-white border border-[#D1D1D1] shadow-sm mb-6 last:mb-0">
		<div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
			<Icon size={14} className="text-[#555]" />
			<h3 className="text-xs font-bold tracking-widest uppercase">{title}</h3>
		</div>
		<div className="p-5">{children}</div>
	</div>
);

const ToggleControl = ({
	label,
	checked,
	onChange,
	description,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	description: string;
}) => (
	<button
		type="button"
		className="flex items-start justify-between w-full mb-4 text-left cursor-pointer group"
		onClick={() => onChange(!checked)}
	>
		<div className="flex-1 pr-4">
			<div className="text-[10px] font-bold uppercase mb-1 group-hover:text-[#1A1A1A] transition-colors">
				{label}
			</div>
			<div className="text-[10px] text-[#888] font-mono leading-snug">{description}</div>
		</div>
		<span className={`transition-colors ${checked ? "text-[#1A1A1A]" : "text-[#D1D1D1]"}`}>
			{checked ? (
				<ToggleRight size={32} strokeWidth={1.5} />
			) : (
				<ToggleLeft size={32} strokeWidth={1.5} />
			)}
		</span>
	</button>
);

export default function EmailFormattingPage() {
	const { currentAgent } = useAgent();
	const { emailEnabled, isLoading: channelLoading } = useChannelSettings();
	const [isDirty, setIsDirty] = useState(false);
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
		allowedDomains: "",
		blockedSenders: "",
		confidenceThreshold: 70,
		lowConfidenceAction: "nothing" as "nothing" | "escalate" | "forward",
		forwardToEmail: "",
		threadCreationMode: "always" as "always" | "subject" | "sender",
	});
	const [emailSaving, setEmailSaving] = useState(false);
	const [loading, setLoading] = useState(true);

	// Redirect to main email channel page if email is not enabled
	useEffect(() => {
		if (!channelLoading && !emailEnabled) {
			redirect("/settings/channels/email");
		}
	}, [channelLoading, emailEnabled]);

	useEffect(() => {
		if (!currentAgent || channelLoading) return;

		const loadEmailSettings = async () => {
			try {
				const emailSettings = await getEmailSettings(currentAgent.id);
				setEmailFormData({
					enabled: emailSettings.enabled ?? true,
					replyAddress: emailSettings.replyAddress || "",
					displayName: emailSettings.displayName || "",
					alertContact: emailSettings.alertContact || "",
					disclaimerEnabled: emailSettings.disclaimerEnabled,
					disclaimerText: emailSettings.disclaimerText || "",
					signature: emailSettings.signature || "",
					subjectPrefix: emailSettings.subjectPrefix || "",
					includeOriginal: emailSettings.includeOriginal,
					ccAddress: emailSettings.ccAddress || "",
					allowedDomains: (emailSettings.allowedDomains || []).join(", "),
					blockedSenders: (emailSettings.blockedSenders || []).join(", "),
					confidenceThreshold: emailSettings.confidenceThreshold ?? 70,
					lowConfidenceAction: (emailSettings.lowConfidenceAction ?? "nothing") as
						| "nothing"
						| "escalate"
						| "forward",
					forwardToEmail: emailSettings.forwardToEmail || "",
					threadCreationMode: (emailSettings.threadCreationMode ?? "always") as
						| "always"
						| "subject"
						| "sender",
				});
			} catch (err) {
				console.error("Failed to load email settings:", err);
				toast.error("Failed to load email settings");
			} finally {
				setLoading(false);
			}
		};

		loadEmailSettings();
	}, [currentAgent, channelLoading]);

	const updateField = <K extends keyof typeof emailFormData>(
		key: K,
		value: (typeof emailFormData)[K],
	) => {
		setEmailFormData((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	};

	const handleEmailSave = async () => {
		if (!currentAgent) return;
		setEmailSaving(true);
		try {
			await updateEmailSettings(currentAgent.id, {
				enabled: emailFormData.enabled,
				replyAddress: emailFormData.replyAddress || null,
				displayName: emailFormData.displayName,
				alertContact: emailFormData.alertContact || null,
				disclaimerEnabled: emailFormData.disclaimerEnabled,
				disclaimerText: emailFormData.disclaimerText || null,
				signature: emailFormData.signature || null,
				subjectPrefix: emailFormData.subjectPrefix || null,
				includeOriginal: emailFormData.includeOriginal,
				ccAddress: emailFormData.ccAddress || null,
				allowedDomains: emailFormData.allowedDomains
					.split(",")
					.map((d) => d.trim())
					.filter(Boolean),
				blockedSenders: emailFormData.blockedSenders
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
				confidenceThreshold: emailFormData.confidenceThreshold,
				lowConfidenceAction: emailFormData.lowConfidenceAction,
				forwardToEmail: emailFormData.forwardToEmail || null,
				threadCreationMode: emailFormData.threadCreationMode,
			});
			toast.success("Email settings saved");
			setIsDirty(false);
		} catch (err) {
			console.error("Failed to save:", err);
			toast.error("Failed to save settings");
		} finally {
			setEmailSaving(false);
		}
	};

	if (loading || !currentAgent) return null;

	return (
		<div className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Response Synthesizer</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Server size={10} /> Template Config
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Channel: EMAIL</span>
					</div>
				</div>

				<div className="flex gap-2">
					<button
						type="button"
						onClick={() => window.location.reload()}
						disabled={!isDirty || emailSaving}
						className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2 disabled:opacity-50"
					>
						<RotateCcw size={12} /> Revert
					</button>
					<button
						type="button"
						onClick={handleEmailSave}
						disabled={emailSaving || !isDirty}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
					>
						<Save size={12} /> {emailSaving ? "Saving..." : "Save Config"}
					</button>
				</div>
			</header>

			{/* Split Layout */}
			<div className="flex flex-col flex-1 overflow-hidden lg:flex-row">
				{/* --- LEFT: CONFIGURATION --- */}
				<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white">
					{/* 1. Disclaimer Module */}
					<ConfigSection title="Transparency Layer" icon={AlertCircle}>
						<ToggleControl
							label="AI Composition Disclaimer"
							description="Appends a notice to the footer indicating the response was generated automatically."
							checked={emailFormData.disclaimerEnabled}
							onChange={(checked) => updateField("disclaimerEnabled", checked)}
						/>
						<div className="mt-4">
							<Label className="flex items-center gap-1 mb-2">
								<Hash size={10} /> Disclaimer Text
							</Label>
							<Textarea
								value={emailFormData.disclaimerText}
								onChange={(e) => updateField("disclaimerText", e.target.value)}
								disabled={!emailFormData.disclaimerEnabled}
								showCharCount
								className="h-24 p-3 text-xs font-mono resize-none text-[#555]"
							/>
						</div>
					</ConfigSection>

					{/* 2. Threading Module */}
					<ConfigSection title="Thread Context" icon={Quote}>
						<ToggleControl
							label="Quote Original Message"
							description="Includes the customer's previous email in the reply body to maintain conversation context."
							checked={emailFormData.includeOriginal}
							onChange={(checked) => updateField("includeOriginal", checked)}
						/>
						<div className="mt-2 p-3 bg-[#FAFAF9] border border-[#E5E5E5] flex items-start gap-2">
							<CheckCircle2 size={12} className="text-green-600 mt-0.5" />
							<p className="text-[10px] text-[#555] font-mono">
								Standard email client citation format (e.g. {`>`}) will be applied automatically.
							</p>
						</div>
					</ConfigSection>

					<ConfigSection title="Sign-Off Block" icon={PenTool}>
						<Label className="flex items-center gap-1 mb-2">
							<Hash size={10} /> Global Signature
						</Label>
						<Textarea
							value={emailFormData.signature}
							onChange={(e) => updateField("signature", e.target.value)}
							placeholder="Best regards,&#10;The Support Team"
							showCharCount
							className="h-24 p-3 text-xs font-mono resize-none text-[#555]"
						/>
					</ConfigSection>
				</div>

				{/* --- RIGHT: LIVE PREVIEW --- */}
				<div className="flex-[1.2] bg-[#F3F2EE] relative flex items-center justify-center p-8 overflow-hidden">
					<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-40 pointer-events-none" />

					<div className="absolute top-6 left-6 text-[10px] font-mono uppercase text-[#888] flex items-center gap-2">
						<Eye size={12} /> Output Simulation: Gmail (Web)
					</div>

					{/* Mock Email Client Window */}
					<div className="w-full max-w-lg bg-white border border-[#D1D1D1] shadow-2xl flex flex-col min-h-[500px]">
						{/* Email Header */}
						<div className="border-b border-[#F3F2EE] p-6 pb-4">
							<div className="mb-4 text-xl font-bold">Re: Issue with my recent order #8821</div>
							<div className="flex items-start gap-3">
								<div className="w-10 h-10 bg-[#1A1A1A] text-white flex items-center justify-center rounded-sm font-bold text-xs">
									AI
								</div>
								<div className="flex-1">
									<div className="flex justify-between">
										<span className="text-sm font-bold">
											{emailFormData.displayName || "AI Assistant"}
										</span>
										<span className="text-xs text-[#888]">10:42 AM</span>
									</div>
									<div className="text-xs text-[#555]">to me</div>
								</div>
							</div>
						</div>

						{/* Email Body */}
						<div className="p-6 flex-1 text-sm text-[#1A1A1A] leading-relaxed space-y-4 font-sans">
							<p>Hi there,</p>
							<p>
								Thanks for reaching out! I've checked the status of order #8821, and it looks like
								it was shipped yesterday via FedEx.
							</p>
							<p>
								Here is your tracking number:{" "}
								<span className="font-mono bg-[#F3F2EE] px-1">1234-5678-9012</span>. You should
								receive it by Friday.
							</p>

							{/* Dynamic Signature */}
							{emailFormData.signature && (
								<div className="pt-4 mt-4 whitespace-pre-wrap text-[#555]">
									{emailFormData.signature}
								</div>
							)}

							{/* Dynamic Disclaimer */}
							{emailFormData.disclaimerEnabled && emailFormData.disclaimerText && (
								<div className="pt-6 mt-2">
									<div className="text-[10px] text-[#888] italic border-t border-[#F3F2EE] pt-2">
										{emailFormData.disclaimerText}
									</div>
								</div>
							)}

							{/* Dynamic Quoted Text */}
							{emailFormData.includeOriginal && (
								<div className="mt-8 pt-4 border-t border-[#D1D1D1]">
									<div className="text-xs text-[#888] mb-2">
										On Mon, Jan 19, 2026 at 9:30 AM, Customer wrote:
									</div>
									<div className="border-l-2 border-[#D1D1D1] pl-3 text-[#555] italic">
										{`>`} Can you tell me where my order #8821 is? It's been 3 days since I placed
										it.
									</div>
								</div>
							)}
						</div>

						{/* Footer Mockup */}
						<div className="h-12 bg-[#FAFAF9] border-t border-[#F3F2EE] flex items-center px-4 gap-4">
							<button
								type="button"
								className="px-4 py-1.5 border border-[#D1D1D1] bg-white text-xs font-bold rounded-sm shadow-sm hover:border-[#1A1A1A] transition-colors"
							>
								Reply
							</button>
							<button
								type="button"
								className="px-4 py-1.5 border border-transparent text-[#555] text-xs font-bold hover:text-[#1A1A1A]"
							>
								Forward
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
