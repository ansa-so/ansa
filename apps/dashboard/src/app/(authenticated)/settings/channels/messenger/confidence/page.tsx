"use client";

import {
	Activity,
	AlertTriangle,
	Lock,
	RotateCcw,
	Save,
	Shield,
	ShieldAlert,
	ShieldCheck,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useChannelSettings } from "@/app/(authenticated)/settings/channel-settings-context";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgent } from "@/lib/agent-context";
import { getMessengerSettings, updateMessengerSettings } from "@/lib/api";

// --- BRUTALIST COMPONENTS ---

const UpgradeOverlay = () => (
	<div className="absolute inset-0 z-50 flex items-center justify-center bg-[#F3F2EE]/90 backdrop-blur-[2px]">
		<div className="bg-white border border-[#D1D1D1] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.08)] p-8 max-w-md text-center">
			<div className="inline-flex p-3 mb-4 border border-[#E5E5E5] bg-[#FAFAF9]">
				<Lock size={24} className="text-[#888]" />
			</div>
			<h3 className="mb-2 text-lg font-bold tracking-tight uppercase">Feature Locked</h3>
			<p className="text-xs text-[#555] mb-6 leading-relaxed">
				Facebook Messenger integration is available on Growth plan and above.
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

export default function MessengerConfidencePage() {
	const { currentAgent } = useAgent();
	const { messengerEnabled, isLoading: channelLoading } = useChannelSettings();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const [formData, setFormData] = useState({
		confidenceThreshold: 70,
		lowConfidenceAction: "nothing" as "nothing" | "escalate",
	});
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(true);
	const [isDirty, setIsDirty] = useState(false);

	// Redirect to main messenger channel page if messenger is not enabled
	useEffect(() => {
		if (!channelLoading && !messengerEnabled) {
			redirect("/settings/channels/messenger");
		}
	}, [channelLoading, messengerEnabled]);

	// Check if current plan has messenger channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasMessengerChannel =
		plansLoading || !currentPlanId
			? true
			: currentPlanId === "unlimited" || (currentPlan?.hasMessengerChannel ?? false);

	useEffect(() => {
		if (!currentAgent) return;

		const loadSettings = async () => {
			try {
				const settings = await getMessengerSettings(currentAgent.id);
				const action = settings.lowConfidenceAction;
				setFormData({
					confidenceThreshold: settings.confidenceThreshold ?? 70,
					lowConfidenceAction: (action === "nothing" || action === "escalate"
						? action
						: "nothing") as "nothing" | "escalate",
				});
			} catch (err) {
				console.error("Failed to load messenger settings:", err);
				toast.error("Failed to load settings");
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, [currentAgent]);

	const handleSave = async () => {
		if (!currentAgent) return;
		setSaving(true);
		try {
			await updateMessengerSettings(currentAgent.id, {
				confidenceThreshold: formData.confidenceThreshold,
				lowConfidenceAction: formData.lowConfidenceAction,
			});
			toast.success("Settings saved");
			setIsDirty(false);
		} catch (err) {
			console.error("Failed to save settings:", err);
			toast.error("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getMessengerSettings(currentAgent.id);
			const action = settings.lowConfidenceAction;
			setFormData({
				confidenceThreshold: settings.confidenceThreshold ?? 70,
				lowConfidenceAction: (action === "nothing" || action === "escalate" ? action : "nothing") as
					| "nothing"
					| "escalate",
			});
			setIsDirty(false);
		} catch (err) {
			console.error("Failed to reset settings:", err);
		} finally {
			setLoading(false);
		}
	};

	if (loading || !currentAgent) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] animate-pulse">
				<div className="h-16 border-b border-[#D1D1D1] bg-white" />
				<div className="p-8 space-y-4">
					<div className="h-48 bg-white border border-[#D1D1D1]" />
					<div className="h-64 bg-white border border-[#D1D1D1]" />
				</div>
			</div>
		);
	}

	return (
		<div className="relative min-h-screen bg-[#F3F2EE]">
			{/* LOCK OVERLAY */}
			{!planHasMessengerChannel && <UpgradeOverlay />}

			{/* HEADER BAR */}
			<div className="sticky top-0 z-30 flex items-center justify-between h-16 px-8 bg-white border-b border-[#D1D1D1]">
				<div className="flex items-center gap-3">
					<div className="p-2 border border-[#E5E5E5] bg-[#FAFAF9]">
						<Shield size={16} />
					</div>
					<div>
						<h1 className="text-sm font-bold tracking-tight uppercase">AI Confidence</h1>
						<p className="text-[10px] text-[#888] font-mono">
							Configure how the AI handles uncertain responses
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{isDirty && (
						<span className="text-[9px] font-mono text-[#888] px-2 py-1 border border-dashed border-[#CCC] bg-[#FAFAF9]">
							Unsaved changes
						</span>
					)}
					<button
						type="button"
						onClick={handleReset}
						disabled={!isDirty || saving}
						className="flex items-center gap-2 h-9 px-4 border border-[#D1D1D1] text-[9px] font-bold uppercase text-[#888] hover:text-[#1A1A1A] hover:border-[#1A1A1A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						<RotateCcw size={10} /> Reset
					</button>
					<button
						type="button"
						onClick={handleSave}
						disabled={!isDirty || saving}
						className="flex items-center gap-2 h-9 px-4 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
					>
						{saving ? (
							<>
								<div className="w-3 h-3 border rounded-full border-white/30 border-t-white animate-spin" />{" "}
								Saving
							</>
						) : (
							<>
								<Save size={10} /> Save Changes
							</>
						)}
					</button>
				</div>
			</div>

			<div className="p-8 space-y-8">
				{/* CONFIDENCE THRESHOLD */}
				<section className="bg-white border border-[#D1D1D1]">
					<div className="p-4 border-b border-[#F3F2EE] flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Activity size={14} />
							<h2 className="text-xs font-bold tracking-wide uppercase">Confidence Threshold</h2>
						</div>
						<div className="flex items-center gap-2 font-mono">
							<span className="text-[10px] text-[#888] uppercase">Cutoff Value:</span>
							<span className="text-lg font-bold bg-[#F3F2EE] px-2 py-0.5 border border-[#D1D1D1]">
								{formData.confidenceThreshold}%
							</span>
						</div>
					</div>

					<div className="p-6 space-y-6">
						{/* Custom Slider */}
						<div className="relative flex items-center h-12">
							{/* Track */}
							<div className="absolute w-full h-2 bg-[#F3F2EE] border border-[#E5E5E5] rounded-full overflow-hidden">
								<div
									className="h-full bg-[#1A1A1A] opacity-20"
									style={{ width: `${formData.confidenceThreshold}%` }}
								/>
								{/* Safe Zone Indicator */}
								<div className="absolute right-0 top-0 h-full w-[30%] bg-green-500/10 border-l border-green-500/20" />
							</div>

							{/* Slider Input */}
							<input
								type="range"
								min="0"
								max="100"
								value={formData.confidenceThreshold}
								onChange={(e) => {
									setFormData((prev) => ({
										...prev,
										confidenceThreshold: parseInt(e.target.value, 10),
									}));
									setIsDirty(true);
								}}
								className="absolute z-10 w-full h-full opacity-0 cursor-pointer"
							/>

							{/* Custom Thumb Visual */}
							<div
								className="absolute h-6 w-3 bg-[#1A1A1A] border-2 border-white shadow-md pointer-events-none transition-all duration-75 ease-out flex items-center justify-center"
								style={{ left: `calc(${formData.confidenceThreshold}% - 6px)` }}
							>
								<div className="w-0.5 h-3 bg-white/50" />
							</div>
						</div>

						<div className="flex justify-between text-[9px] font-mono uppercase text-[#888] mt-2">
							<span>0% (Allow all)</span>
							<span className="flex items-center gap-1 text-[#EAB308]">
								<AlertTriangle size={8} /> Recommended: 70%+
							</span>
							<span>100% (Block all)</span>
						</div>

						<div className="flex items-start gap-3 p-4 bg-[#FAFAF9] border border-[#E5E5E5]">
							<AlertTriangle size={14} className="text-[#888] mt-0.5" />
							<p className="text-[10px] text-[#888] font-mono leading-relaxed">
								When the AI&apos;s confidence score falls below this threshold, the configured
								action will be triggered. Higher values mean more responses will be flagged for
								review.
							</p>
						</div>
					</div>
				</section>

				{/* LOW CONFIDENCE ACTION */}
				<section className="bg-white border border-[#D1D1D1]">
					<div className="p-4 border-b border-[#F3F2EE] flex items-center gap-3">
						<Zap size={14} />
						<h2 className="text-xs font-bold tracking-wide uppercase">Low Confidence Action</h2>
					</div>

					<div className="p-4 space-y-2">
						<ActionCard
							id="nothing"
							label="Do Nothing"
							description="Send the AI response regardless of confidence. Best for general inquiries where accuracy isn't critical."
							icon={ShieldCheck}
							selected={formData.lowConfidenceAction === "nothing"}
							onSelect={(id) => {
								setFormData((prev) => ({
									...prev,
									lowConfidenceAction: id as "nothing" | "escalate",
								}));
								setIsDirty(true);
							}}
						/>
						<ActionCard
							id="escalate"
							label="Escalate to Human"
							description="Create an escalation ticket for human review. The user receives a message that their query is being reviewed."
							icon={ShieldAlert}
							selected={formData.lowConfidenceAction === "escalate"}
							onSelect={(id) => {
								setFormData((prev) => ({
									...prev,
									lowConfidenceAction: id as "nothing" | "escalate",
								}));
								setIsDirty(true);
							}}
						/>
					</div>
				</section>
			</div>
		</div>
	);
}
