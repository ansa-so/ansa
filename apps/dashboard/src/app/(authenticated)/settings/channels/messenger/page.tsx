"use client";

import {
	CheckCircle2,
	Lock,
	MessageCircle,
	RotateCcw,
	Save,
	Server,
	Sparkles,
	ToggleLeft,
	ToggleRight,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
				Facebook Messenger integration is available on Growth plan and above. Upgrade to connect
				your Facebook Pages and let your AI agent respond to messages.
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

export default function MessengerSettingsPage() {
	const { currentAgent } = useAgent();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const { refetch: refetchChannelSettings } = useChannelSettings();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [isDirty, setIsDirty] = useState(false);

	// Check if current plan has messenger channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasMessengerChannel =
		plansLoading || !currentPlanId
			? true // Show content while loading
			: currentPlanId === "unlimited" || (currentPlan?.hasMessengerChannel ?? false);

	// Messenger settings state
	const [formData, setFormData] = useState({
		enabled: true,
	});

	const fetchData = useCallback(async () => {
		if (!currentAgent) return;
		setLoading(true);
		try {
			const settings = await getMessengerSettings(currentAgent.id);
			if (settings) {
				setFormData({
					enabled: settings.enabled ?? true,
				});
			}
		} catch (err) {
			console.error("Failed to fetch messenger settings:", err);
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

	const updateField = <K extends keyof typeof formData>(key: K, value: (typeof formData)[K]) => {
		setFormData((prev) => ({ ...prev, [key]: value }));
		setIsDirty(true);
	};

	const handleSave = async () => {
		if (!currentAgent) return;
		setSaving(true);
		try {
			await updateMessengerSettings(currentAgent.id, formData);
			toast.success("Settings saved");
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

	if (loading || !currentAgent) return null;

	return (
		<div className="relative flex flex-col min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans">
			{/* Upgrade Overlay */}
			{!planHasMessengerChannel && <UpgradeOverlay />}

			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Messenger Channel</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Server size={10} /> Node ID: MSG-01
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span
							className={
								!planHasMessengerChannel
									? "text-[#EAB308] flex items-center gap-1"
									: formData.enabled
										? "text-green-600"
										: "text-red-600"
							}
						>
							{!planHasMessengerChannel ? (
								<>
									<Zap size={8} fill="currentColor" /> License Restriction
								</>
							) : formData.enabled ? (
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
				{/* 1. Channel Status (Master Switch) */}
				<section
					className={`border p-6 flex items-center justify-between transition-colors ${
						formData.enabled
							? "bg-white border-[#1A1A1A] shadow-sm"
							: "bg-[#FAFAF9] border-[#D1D1D1]"
					}`}
				>
					<div className="flex items-start gap-4">
						<div
							className={`p-3 border ${
								formData.enabled
									? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
									: "bg-white text-[#888] border-[#E5E5E5]"
							}`}
						>
							<MessageCircle size={20} />
						</div>
						<div>
							<h3 className="mb-1 text-sm font-bold tracking-widest uppercase">
								Facebook Messenger Relay
							</h3>
							<p className="text-xs text-[#555] max-w-md leading-relaxed">
								When enabled, the AI will process messages sent to your connected Facebook Pages and
								reply automatically based on your Knowledge Base.
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={() => updateField("enabled", !formData.enabled)}
						className={`transition-colors duration-200 ${
							formData.enabled ? "text-[#1A1A1A]" : "text-[#D1D1D1]"
						}`}
					>
						{formData.enabled ? (
							<ToggleRight size={40} strokeWidth={1.5} />
						) : (
							<ToggleLeft size={40} strokeWidth={1.5} />
						)}
					</button>
				</section>

				{/* 2. How It Works */}
				<section
					className={`transition-opacity duration-300 ${
						formData.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
					}`}
				>
					<div className="flex items-center gap-2 mb-4">
						<CheckCircle2 size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">How It Works</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<p className="text-xs text-[#555] leading-relaxed">
							When enabled, your AI agent will automatically respond to messages sent to your
							connected Facebook Pages. Messages are processed in real-time and responses are sent
							back via the Messenger API. Connect your Pages from the{" "}
							<Link href="/channels/messenger" className="font-bold underline">
								Messenger channel page
							</Link>
							.
						</p>
					</div>
				</section>

				{/* 3. Additional Settings */}
				<section
					className={`transition-opacity duration-300 ${
						formData.enabled ? "opacity-100" : "opacity-50 pointer-events-none"
					}`}
				>
					<div className="flex items-center gap-2 mb-4">
						<Server size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">Additional Settings</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] shadow-sm divide-y divide-[#F3F2EE]">
						<Link
							href="/settings/channels/messenger/confidence"
							className="flex items-center justify-between p-4 hover:bg-[#FAFAF9] transition-colors"
						>
							<div>
								<div className="text-xs font-bold">AI Confidence</div>
								<p className="text-[10px] text-[#888] font-mono">
									Configure how the AI handles uncertain responses
								</p>
							</div>
							<div className="text-[#888]">→</div>
						</Link>
						<Link
							href="/channels/messenger"
							className="flex items-center justify-between p-4 hover:bg-[#FAFAF9] transition-colors"
						>
							<div>
								<div className="text-xs font-bold">Connected Pages</div>
								<p className="text-[10px] text-[#888] font-mono">
									Manage your connected Facebook Pages
								</p>
							</div>
							<div className="text-[#888]">→</div>
						</Link>
					</div>
				</section>
			</div>
		</div>
	);
}
