"use client";

import {
	AlertOctagon,
	AlertTriangle,
	Clock,
	History,
	Hourglass,
	Mail,
	MessageSquare,
	RotateCcw,
	Save,
	Timer,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useChannelSettings } from "@/app/(authenticated)/settings/channel-settings-context";
import { useAgent } from "@/lib/agent-context";
import { getEscalationSettings, updateEscalationSettings } from "@/lib/api";

// --- COMPONENTS ---

const TimeInput = ({
	value,
	onChange,
	unit = "min",
}: {
	value: number;
	onChange: (value: number) => void;
	unit?: string;
}) => (
	<div className="relative group">
		<input
			type="number"
			value={value}
			onChange={(e) => onChange(parseInt(e.target.value, 10) || 1)}
			min={1}
			className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] pl-3 pr-12 text-sm font-mono font-bold focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-colors placeholder:text-[#CCC]"
		/>
		<div className="absolute right-0 top-0 h-full px-3 flex items-center justify-center bg-[#F3F2EE] border-l border-[#D1D1D1] text-[10px] font-mono text-[#888] uppercase select-none group-focus-within:border-[#1A1A1A] group-focus-within:text-[#1A1A1A]">
			{unit}
		</div>
	</div>
);

const PriorityRow = ({
	label,
	colorClass,
	icon: Icon,
	value,
	onChange,
	description,
}: {
	label: string;
	colorClass: string;
	icon: React.ElementType;
	value: number;
	onChange: (value: number) => void;
	description: string;
}) => (
	<div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-4 border-b border-[#F3F2EE] last:border-0 hover:bg-[#FAFAF9] transition-colors group">
		{/* Label Column */}
		<div className="flex items-center col-span-4 gap-3">
			<div className={`p-1.5 border ${colorClass} transition-transform group-hover:scale-110`}>
				<Icon size={14} />
			</div>
			<div>
				<div className="text-xs font-bold tracking-wide uppercase">{label}</div>
				<div className="text-[9px] text-[#888] font-mono">{description}</div>
			</div>
		</div>

		{/* Visual Bar Column (Hidden on mobile) */}
		<div className="hidden col-span-5 px-4 md:block">
			<div className="h-1.5 w-full bg-[#F3F2EE] rounded-full overflow-hidden flex relative">
				{/* Tick marks */}
				<div className="absolute w-px h-full left-1/4 bg-white/50" />
				<div className="absolute w-px h-full left-1/2 bg-white/50" />
				<div className="absolute w-px h-full left-3/4 bg-white/50" />

				{/* Visual representation of time (scaled to 8h max) */}
				<div
					className={`h-full opacity-50 ${colorClass.replace("text", "bg").replace("border", "bg")}`}
					style={{ width: `${Math.min((value / 480) * 100, 100)}%` }}
				/>
			</div>
		</div>

		{/* Input Column */}
		<div className="col-span-3">
			<TimeInput value={value} onChange={onChange} />
		</div>
	</div>
);

const LifecycleCard = ({
	label,
	icon: Icon,
	value,
	onChange,
	description,
}: {
	label: string;
	icon: React.ElementType;
	value: number;
	onChange: (value: number) => void;
	description: string;
}) => (
	<div className="bg-white border border-[#D1D1D1] p-5 shadow-sm flex flex-col h-full group hover:border-[#888] transition-colors relative overflow-hidden">
		{/* Decorative corner */}
		<div className="absolute top-0 right-0 w-8 h-8 bg-[#FAFAF9] -mr-4 -mt-4 rotate-45 border border-[#F3F2EE]" />

		<div className="relative z-10 flex items-start justify-between mb-4">
			<div className="flex items-center gap-2 text-[#555] group-hover:text-[#1A1A1A]">
				<Icon size={16} />
				<span className="text-xs font-bold tracking-widest uppercase">{label}</span>
			</div>
			<div className="text-[9px] font-mono text-[#CCC] group-hover:text-[#1A1A1A]">
				TTL PROTOCOL
			</div>
		</div>

		<div className="relative z-10 mb-4">
			<TimeInput value={value} onChange={onChange} />
		</div>

		<p className="text-[10px] text-[#888] font-mono leading-relaxed mt-auto relative z-10 border-t border-[#F3F2EE] pt-3">
			{description}
		</p>
	</div>
);

export default function ConversationsSettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const { emailEnabled } = useChannelSettings();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [sla, setSla] = useState({
		urgent: 30,
		high: 60,
		medium: 240,
		low: 480,
	});

	const [autoClose, setAutoClose] = useState({
		widget: 60,
		email: 2880,
	});

	const fetchData = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}

		try {
			const settingsData = await getEscalationSettings(currentAgent.id);

			setSla({
				urgent: settingsData.slaConfig?.urgent || 30,
				high: settingsData.slaConfig?.high || 60,
				medium: settingsData.slaConfig?.medium || 240,
				low: settingsData.slaConfig?.low || 480,
			});

			setAutoClose({
				widget: settingsData.widgetAutoCloseMinutes || 60,
				email: settingsData.emailAutoCloseMinutes || 2880,
			});
		} catch (error) {
			console.error("Failed to fetch settings:", error);
			toast.error("Failed to load settings");
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	const handleSave = async () => {
		if (!currentAgent) return;

		setSaving(true);
		try {
			await updateEscalationSettings(currentAgent.id, {
				slaConfig: {
					low: sla.low,
					medium: sla.medium,
					high: sla.high,
					urgent: sla.urgent,
				},
				widgetAutoCloseMinutes: autoClose.widget,
				emailAutoCloseMinutes: autoClose.email,
			});

			toast.success("Settings saved");
		} catch (error) {
			console.error("Failed to save settings:", error);
			toast.error("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		fetchData();
		toast.info("Settings reverted");
	};

	if (loading || !currentAgent) {
		return (
			<div className="min-h-screen bg-[#F3F2EE] flex items-center justify-center">
				<div className="text-[10px] font-mono uppercase text-[#888] tracking-widest">
					Loading configuration...
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* Header */}
			<header className="h-16 border-b border-[#D1D1D1] bg-white flex items-center justify-between px-8 sticky top-0 z-30">
				<div>
					<h1 className="text-xl font-medium tracking-tight">Time & Operations</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Clock size={10} /> SLA Matrix
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Conversation Lifecycle</span>
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
						disabled={saving}
						className="h-9 px-6 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
					>
						<Save size={12} /> {saving ? "Saving..." : "Commit Changes"}
					</button>
				</div>
			</header>

			{/* Content Area */}
			<div className="w-full p-8 mx-auto space-y-8">
				{/* 1. SLA Matrix */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<Timer size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">
							Target Response Velocity
						</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] shadow-sm">
						{/* Header Row */}
						<div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 bg-[#FAFAF9] border-b border-[#F3F2EE] text-[9px] font-mono uppercase text-[#888]">
							<div className="col-span-4">Priority Level</div>
							<div className="col-span-5">Relative Scale (8h Max)</div>
							<div className="col-span-3">Target Time</div>
						</div>

						{/* Matrix Rows */}
						<PriorityRow
							label="Urgent"
							description="Payment failures, outages, security alerts"
							icon={AlertOctagon}
							colorClass="bg-red-50 text-red-600 border-red-200"
							value={sla.urgent}
							onChange={(v) => setSla({ ...sla, urgent: v })}
						/>
						<PriorityRow
							label="High"
							description="Account access, shipping delays, refunds"
							icon={Zap}
							colorClass="bg-orange-50 text-orange-600 border-orange-200"
							value={sla.high}
							onChange={(v) => setSla({ ...sla, high: v })}
						/>
						<PriorityRow
							label="Medium"
							description="General product questions, inventory checks"
							icon={AlertTriangle}
							colorClass="bg-yellow-50 text-yellow-600 border-yellow-200"
							value={sla.medium}
							onChange={(v) => setSla({ ...sla, medium: v })}
						/>
						<PriorityRow
							label="Low"
							description="Feature requests, general feedback, spam"
							icon={Clock}
							colorClass="bg-[#F3F2EE] text-[#555] border-[#E5E5E5]"
							value={sla.low}
							onChange={(v) => setSla({ ...sla, low: v })}
						/>
					</div>
				</section>

				{/* 2. Lifecycle Settings */}
				<section>
					<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#E5E5E5]">
						<Hourglass size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">Session Lifecycle (TTL)</h3>
					</div>

					<div className={`grid grid-cols-1 gap-6 ${emailEnabled ? "md:grid-cols-2" : ""}`}>
						<LifecycleCard
							label="Widget Sessions"
							icon={MessageSquare}
							value={autoClose.widget}
							onChange={(v) => setAutoClose({ ...autoClose, widget: v })}
							description="Duration of inactivity before a chat widget session is marked 'Resolved' automatically."
						/>

						{emailEnabled && (
							<LifecycleCard
								label="Email Threads"
								icon={Mail}
								value={autoClose.email}
								onChange={(v) => setAutoClose({ ...autoClose, email: v })}
								description="Duration before an email thread awaiting customer reply is closed. (Default: 48h)"
							/>
						)}
					</div>

					{/* Info Note */}
					<div className="mt-4 flex items-start gap-3 text-[10px] text-[#888] font-mono p-3 border border-dashed border-[#D1D1D1] bg-[#FAFAF9]">
						<History size={12} className="mt-0.5 shrink-0" />
						<div>
							<strong>SYSTEM NOTE:</strong> Resolved conversations are archived but can be reopened
							if the user replies within the grace period (7 days). Metrics for SLA are calculated
							based on business hours.
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
