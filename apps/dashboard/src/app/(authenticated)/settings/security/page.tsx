"use client";

import {
	Activity,
	AlertTriangle,
	CheckCircle2,
	Globe,
	Plus,
	RotateCcw,
	Save,
	Server,
	Shield,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useAgent } from "@/lib/agent-context";
import { getSecuritySettings, updateSecuritySettings } from "@/lib/api";

// --- COMPONENTS ---

const RateLimitPreset = ({
	label,
	value,
	active,
	onSelect,
}: {
	label: string;
	value: number;
	active: boolean;
	onSelect: (value: number) => void;
}) => (
	<button
		type="button"
		onClick={() => onSelect(value)}
		className={`flex-1 border p-3 text-left transition-all group ${
			active
				? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
				: "bg-white text-[#555] border-[#D1D1D1] hover:border-[#888]"
		}`}
	>
		<div className="text-[9px] font-mono uppercase opacity-70 mb-1">{label}</div>
		<div className="font-mono text-lg font-bold transition-transform origin-left group-hover:scale-105">
			{value} <span className="text-[10px] font-normal opacity-70">req/min</span>
		</div>
	</button>
);

const DomainRow = ({ domain, onDelete }: { domain: string; onDelete: () => void }) => (
	<div className="flex items-center justify-between p-3 bg-white border border-[#D1D1D1] group hover:border-[#1A1A1A] transition-colors">
		<div className="flex items-center gap-3">
			<div className="p-1.5 bg-[#F3F2EE] border border-[#E5E5E5] text-[#555]">
				<Globe size={14} />
			</div>
			<div>
				<div className="text-xs font-mono font-bold text-[#1A1A1A]">{domain}</div>
				<div className="flex items-center gap-1 text-[9px] text-green-600 font-mono uppercase mt-0.5">
					<CheckCircle2 size={8} /> Verified Origin
				</div>
			</div>
		</div>
		<button
			type="button"
			onClick={onDelete}
			className="text-[#D1D1D1] hover:text-red-600 hover:bg-red-50 p-2 transition-colors"
		>
			<Trash2 size={14} />
		</button>
	</div>
);

const WINDOW_PRESETS = [
	{ value: 60, label: "Per Minute" },
	{ value: 3600, label: "Per Hour" },
	{ value: 86400, label: "Per Day" },
];

export default function SecuritySettingsPage() {
	const { currentAgent, isLoading: agentLoading } = useAgent();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const [messageLimit, setMessageLimit] = useState(100);
	const [messageLimitWindow, setMessageLimitWindow] = useState(60);
	const [domains, setDomains] = useState<string[]>([]);
	const [newDomain, setNewDomain] = useState("");
	const [isAdding, setIsAdding] = useState(false);

	const fetchData = useCallback(async () => {
		if (!currentAgent) {
			setLoading(false);
			return;
		}

		try {
			const settings = await getSecuritySettings(currentAgent.id);
			setMessageLimit(settings.messageLimit || 100);
			setMessageLimitWindow(settings.messageLimitWindow || 60);
			setDomains(settings.allowedDomains || []);
		} catch (err) {
			console.error("Failed to fetch settings:", err);
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
			await updateSecuritySettings(currentAgent.id, {
				messageLimit,
				messageLimitWindow,
				allowedDomains: domains.filter((d) => d.trim()),
			});
			toast.success("Security settings saved");
		} catch (err) {
			console.error("Failed to save:", err);
			toast.error("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = () => {
		fetchData();
		toast.info("Settings reverted");
	};

	const handleAddDomain = () => {
		if (newDomain.trim()) {
			setDomains([...domains, newDomain.trim()]);
			setNewDomain("");
			setIsAdding(false);
		}
	};

	const handleRemoveDomain = (index: number) => {
		setDomains(domains.filter((_, i) => i !== index));
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
					<h1 className="text-xl font-medium tracking-tight">Network Security</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Shield size={10} /> Firewall Active
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Rate Limiting + CORS</span>
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
						<Save size={12} /> {saving ? "Saving..." : "Commit Rules"}
					</button>
				</div>
			</header>

			{/* Content Area */}
			<div className="w-full p-8 mx-auto space-y-8">
				{/* 1. Rate Limiting (Traffic Control) */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<Activity size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">
							Traffic Control (Rate Limiting)
						</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] p-6 shadow-sm">
						<div className="flex items-end justify-between mb-4">
							<p className="text-xs text-[#555] max-w-md">
								Define the maximum number of messages a single IP address can send within a specific
								time window to prevent abuse.
							</p>
							<div className="text-[9px] font-mono uppercase bg-[#F3F2EE] px-2 py-1 border border-[#E5E5E5] text-[#888]">
								Current Load: Low
							</div>
						</div>

						{/* Manual Inputs */}
						<div className="grid grid-cols-12 gap-4 mb-6">
							<div className="col-span-8">
								<label
									htmlFor="messageCap"
									className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block"
								>
									Message Cap
								</label>
								<div className="relative">
									<input
										id="messageCap"
										type="number"
										value={messageLimit}
										onChange={(e) => setMessageLimit(parseInt(e.target.value, 10) || 1)}
										min={1}
										className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 font-mono text-sm font-bold focus:outline-none focus:border-[#1A1A1A]"
									/>
									<div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#888]">
										MSGS
									</div>
								</div>
							</div>
							<div className="col-span-4">
								<label
									htmlFor="timeWindow"
									className="text-[9px] font-mono uppercase text-[#888] mb-1.5 block"
								>
									Time Window
								</label>
								<select
									id="timeWindow"
									value={messageLimitWindow}
									onChange={(e) => setMessageLimitWindow(parseInt(e.target.value, 10))}
									className="w-full h-10 bg-[#FAFAF9] border border-[#D1D1D1] px-3 font-mono text-xs focus:outline-none focus:border-[#1A1A1A] appearance-none cursor-pointer"
								>
									{WINDOW_PRESETS.map((preset) => (
										<option key={preset.value} value={preset.value}>
											{preset.label}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Quick Presets */}
						<div className="flex gap-2">
							<RateLimitPreset
								label="Strict"
								value={20}
								active={messageLimit === 20}
								onSelect={setMessageLimit}
							/>
							<RateLimitPreset
								label="Standard"
								value={100}
								active={messageLimit === 100}
								onSelect={setMessageLimit}
							/>
							<RateLimitPreset
								label="High Vol"
								value={500}
								active={messageLimit === 500}
								onSelect={setMessageLimit}
							/>
						</div>
					</div>
				</section>

				{/* 2. Access Control List (Domains) */}
				<section>
					<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#E5E5E5]">
						<Server size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">
							Origin Access Control (CORS)
						</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] shadow-sm">
						{/* List Header */}
						<div className="bg-[#FAFAF9] border-b border-[#F3F2EE] px-4 py-2 flex justify-between items-center">
							<div className="text-[9px] font-mono uppercase text-[#888]">Allowed Hosts</div>
							<div className="text-[9px] font-mono uppercase text-[#888]">
								{domains.length} Active Rules
							</div>
						</div>

						{/* List Content */}
						<div className="p-4 space-y-2 bg-[#FAFAF9]">
							{domains.map((domain, i) => (
								<DomainRow key={i} domain={domain} onDelete={() => handleRemoveDomain(i)} />
							))}

							{/* Add New State */}
							{isAdding ? (
								<div className="flex items-center gap-2 duration-200 animate-in fade-in slide-in-from-top-2">
									<div className="flex-1 bg-white border border-[#1A1A1A] h-10 flex items-center px-3 shadow-sm">
										<span className="text-[#CCC] mr-1 text-xs">https://</span>
										<input
											// biome-ignore lint/a11y/noAutofocus: input is revealed by an explicit user action; focus follows the click
											autoFocus
											type="text"
											value={newDomain}
											onChange={(e) => setNewDomain(e.target.value)}
											placeholder="subdomain.example.com"
											className="flex-1 font-mono text-xs outline-none text-[#1A1A1A] placeholder:text-[#E5E5E5]"
											onKeyDown={(e) => e.key === "Enter" && handleAddDomain()}
										/>
									</div>
									<button
										type="button"
										onClick={handleAddDomain}
										className="h-10 px-4 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase hover:bg-[#333]"
									>
										Confirm
									</button>
									<button
										type="button"
										onClick={() => {
											setIsAdding(false);
											setNewDomain("");
										}}
										className="h-10 w-10 flex items-center justify-center border border-[#D1D1D1] bg-white hover:bg-[#F3F2EE]"
									>
										✕
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setIsAdding(true)}
									className="w-full h-10 border border-dashed border-[#D1D1D1] bg-white text-[10px] font-bold uppercase text-[#888] hover:text-[#1A1A1A] hover:border-[#888] transition-colors flex items-center justify-center gap-2"
								>
									<Plus size={12} /> Whitelist New Origin
								</button>
							)}
						</div>

						{/* Warning Footer */}
						<div className="flex items-start gap-3 px-4 py-3 border-t border-yellow-100 bg-yellow-50">
							<AlertTriangle size={14} className="text-yellow-600 mt-0.5" />
							<div>
								<div className="text-[10px] font-bold uppercase text-yellow-800">Security Note</div>
								<p className="text-[10px] text-yellow-700/80 leading-snug">
									Leaving the whitelist empty allows <strong>all domains</strong> to embed your
									widget. This is not recommended for production environments.
								</p>
							</div>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
