"use client";

import {
	Activity,
	AlertTriangle,
	ArrowRight,
	Forward,
	GitBranch,
	Lock,
	RotateCcw,
	Save,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Terminal,
	Zap,
} from "lucide-react";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useChannelSettings } from "@/app/(authenticated)/settings/channel-settings-context";
import { Input } from "@/components/ui/input";
import { useAgent } from "@/lib/agent-context";
import { getEmailSettings, updateEmailSettings } from "@/lib/api";

// --- BRUTALIST COMPONENTS ---

function ActionCard({
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
}) {
	return (
		<button
			type="button"
			onClick={() => onSelect(id)}
			className={`w-full text-left relative border p-4 transition-all flex items-start gap-4 group ${
				selected
					? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] z-10"
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

export default function EmailConfidencePage() {
	const { currentAgent } = useAgent();
	const { emailEnabled, isLoading: channelLoading } = useChannelSettings();
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
	const [isDirty, setIsDirty] = useState(false);

	// Redirect to main email channel page if email is not enabled
	useEffect(() => {
		if (!channelLoading && !emailEnabled) {
			redirect("/settings/channels/email");
		}
	}, [channelLoading, emailEnabled]);

	// Simulation State
	const [simQuery, setSimQuery] = useState("");
	const [simScore, setSimScore] = useState<number | null>(null);

	useEffect(() => {
		if (!currentAgent) return;

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
	}, [currentAgent]);

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

	const updateField = <K extends keyof typeof emailFormData>(
		key: K,
		value: (typeof emailFormData)[K],
	) => {
		setEmailFormData((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	};

	// Mock Confidence Calculation for Simulator
	const runSimulation = () => {
		if (!simQuery) return;
		const randomScore = Math.floor(Math.random() * 100);
		setSimScore(randomScore);
	};

	const getStatusColor = (score: number) => {
		if (score >= emailFormData.confidenceThreshold) return "text-green-600";
		return "text-red-600";
	};

	const getActionLabel = (action: string) => {
		switch (action) {
			case "nothing":
				return "SEND ANYWAY";
			case "escalate":
				return "HUMAN ESCALATE";
			case "forward":
				return "FORWARD FOR REVIEW";
			default:
				return action.toUpperCase();
		}
	};

	if (loading || !currentAgent) return null;

	const threshold = emailFormData.confidenceThreshold;

	return (
		<div className="flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Email Safety Protocols</h1>
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

						<div className="relative flex items-center h-12">
							{/* Track */}
							<div className="absolute w-full h-2 bg-[#F3F2EE] border border-[#E5E5E5] rounded-full overflow-hidden">
								<div
									className="h-full bg-[#1A1A1A] opacity-20"
									style={{ width: `${threshold}%` }}
								/>
								{/* Safe Zone Indicator */}
								<div className="absolute right-0 top-0 h-full w-[30%] bg-green-500/10 border-l border-green-500/20" />
							</div>

							{/* Slider Input */}
							<input
								type="range"
								min="0"
								max="100"
								value={threshold}
								onChange={(e) => updateField("confidenceThreshold", parseInt(e.target.value, 10))}
								className="absolute z-10 w-full h-full opacity-0 cursor-pointer"
							/>

							{/* Custom Thumb Visual */}
							<div
								className="absolute h-6 w-3 bg-[#1A1A1A] border-2 border-white shadow-md pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
								style={{ left: `calc(${threshold}% - 6px)` }}
							>
								<div className="w-0.5 h-3 bg-white/50" />
							</div>
						</div>

						<div className="flex justify-between text-[9px] font-mono uppercase text-[#888] mt-2">
							<span>0% (Unsafe)</span>
							<span className="flex items-center gap-1 text-[#EAB308]">
								<AlertTriangle size={8} /> Recommended: 70%+
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

						<div className="space-y-3">
							<ActionCard
								id="nothing"
								label="Permissive Mode"
								description="Send the AI response anyway, but log it as 'Low Quality' for review."
								icon={Zap}
								selected={emailFormData.lowConfidenceAction === "nothing"}
								onSelect={(val) =>
									updateField("lowConfidenceAction", val as "nothing" | "escalate" | "forward")
								}
							/>

							<ActionCard
								id="escalate"
								label="Human Escalation"
								description="Immediately route the email to a human agent queue for manual response."
								icon={Lock}
								selected={emailFormData.lowConfidenceAction === "escalate"}
								onSelect={(val) =>
									updateField("lowConfidenceAction", val as "nothing" | "escalate" | "forward")
								}
							/>

							<ActionCard
								id="forward"
								label="Forward for Review"
								description="Forward the email to a specified address for human review before responding."
								icon={Forward}
								selected={emailFormData.lowConfidenceAction === "forward"}
								onSelect={(val) =>
									updateField("lowConfidenceAction", val as "nothing" | "escalate" | "forward")
								}
							/>
						</div>
					</section>

					{/* 3. Forward Email (if forward selected) */}
					{emailFormData.lowConfidenceAction === "forward" && (
						<section>
							<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#F3F2EE]">
								<ArrowRight size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Forward Destination</h3>
							</div>

							<div className="group">
								<span className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block group-focus-within:text-[#1A1A1A] transition-colors">
									Forward to Email Address
								</span>
								<Input
									type="email"
									value={emailFormData.forwardToEmail}
									onChange={(e) => updateField("forwardToEmail", e.target.value)}
									placeholder="support@yourcompany.com"
									className="h-10 p-0 px-3 font-mono text-xs"
								/>
							</div>
						</section>
					)}
				</div>

				{/* --- RIGHT: DECISION MATRIX SIMULATOR --- */}
				<div className="flex-1 bg-[#F3F2EE] flex items-center justify-center p-8 relative overflow-hidden">
					<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-40 pointer-events-none" />

					<div className="absolute top-6 left-6 text-[10px] font-mono uppercase text-[#888] flex items-center gap-2">
						<Terminal size={12} /> Email Logic Gate Simulator
					</div>

					{/* Simulator Container */}
					<div className="w-full max-w-md bg-white border border-[#D1D1D1] shadow-xl p-6 relative">
						{/* Step 1: Input */}
						<div className="mb-8">
							<span className="text-[9px] font-mono uppercase text-[#888] mb-2 block">
								Test Email Subject
							</span>
							<div className="flex gap-2">
								<input
									type="text"
									value={simQuery}
									onChange={(e) => setSimQuery(e.target.value)}
									placeholder="Type a vague email subject..."
									className="flex-1 h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 text-xs font-mono focus:outline-none focus:border-[#1A1A1A]"
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
										Email Score
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
										{simScore >= threshold ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
										<span className="text-xs font-bold tracking-wide uppercase">
											{simScore >= threshold ? "Gate Passed" : "Gate Blocked"}
										</span>
									</div>
									<p className="text-[10px] font-mono opacity-80">
										{simScore >= threshold
											? "System sends standard AI email response."
											: `System executes fallback: ${getActionLabel(emailFormData.lowConfidenceAction)}`}
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
			</div>
		</div>
	);
}
