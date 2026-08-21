"use client";

import {
	AlertTriangle,
	CheckCircle2,
	Eye,
	Globe,
	Mail,
	RotateCcw,
	Save,
	Shield,
	ShieldBan,
	ShieldCheck,
	ToggleLeft,
	ToggleRight,
	UserX,
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
	icon: React.ElementType;
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
	// biome-ignore lint/a11y/useKeyWithClickEvents: row click is a mouse affordance; the nested <button> is the keyboard control
	// biome-ignore lint/a11y/noStaticElementInteractions: same
	<div
		className="flex items-start justify-between mb-4 cursor-pointer group"
		onClick={() => onChange(!checked)}
	>
		<div className="flex-1 pr-4">
			<div className="text-[10px] font-bold uppercase mb-1 group-hover:text-[#1A1A1A] transition-colors">
				{label}
			</div>
			<div className="text-[10px] text-[#888] font-mono leading-snug">{description}</div>
		</div>
		<button
			type="button"
			className={`transition-colors ${checked ? "text-[#1A1A1A]" : "text-[#D1D1D1]"}`}
		>
			{checked ? (
				<ToggleRight size={32} strokeWidth={1.5} />
			) : (
				<ToggleLeft size={32} strokeWidth={1.5} />
			)}
		</button>
	</div>
);

const AccessRuleCard = ({
	type,
	entries,
	icon: Icon,
	emptyText,
}: {
	type: "allow" | "block";
	entries: string[];
	icon: React.ElementType;
	emptyText: string;
}) => (
	<div
		className={`border p-4 ${
			type === "allow" ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
		}`}
	>
		<div className="flex items-center gap-2 mb-3">
			<Icon size={12} className={type === "allow" ? "text-green-600" : "text-red-600"} />
			<span
				className={`text-[10px] font-bold uppercase ${
					type === "allow" ? "text-green-700" : "text-red-700"
				}`}
			>
				{type === "allow" ? "Allowlist Active" : "Blocklist Active"}
			</span>
		</div>
		{entries.length > 0 ? (
			<div className="space-y-1">
				{entries.slice(0, 5).map((entry, i) => (
					<div key={i} className="flex items-center gap-2 text-[10px] font-mono text-[#555]">
						<div
							className={`w-1.5 h-1.5 rounded-full ${
								type === "allow" ? "bg-green-500" : "bg-red-500"
							}`}
						/>
						{entry}
					</div>
				))}
				{entries.length > 5 && (
					<div className="text-[9px] text-[#888] font-mono mt-2">
						+{entries.length - 5} more entries
					</div>
				)}
			</div>
		) : (
			<div className="text-[10px] text-[#888] font-mono italic">{emptyText}</div>
		)}
	</div>
);

export default function EmailAccessPage() {
	const { currentAgent } = useAgent();
	const { emailEnabled, isLoading: channelLoading } = useChannelSettings();
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	// Redirect to main email channel page if email is not enabled
	useEffect(() => {
		if (!channelLoading && !emailEnabled) {
			redirect("/settings/channels/email");
		}
	}, [channelLoading, emailEnabled]);

	const [allowedDomains, setAllowedDomains] = useState("");
	const [blockedSenders, setBlockedSenders] = useState("");
	const [strictMode, setStrictMode] = useState(false);

	useEffect(() => {
		if (!currentAgent || channelLoading) return;

		const loadSettings = async () => {
			try {
				const settings = await getEmailSettings(currentAgent.id);
				setAllowedDomains((settings.allowedDomains || []).join(", "));
				setBlockedSenders((settings.blockedSenders || []).join(", "));
				// Strict mode: if allowedDomains is set, we're in strict mode
				setStrictMode((settings.allowedDomains || []).length > 0);
			} catch (err) {
				console.error("Failed to load settings:", err);
				toast.error("Failed to load settings");
			} finally {
				setLoading(false);
			}
		};

		loadSettings();
	}, [currentAgent, channelLoading]);

	const handleSave = async () => {
		if (!currentAgent) return;
		setSaving(true);
		try {
			await updateEmailSettings(currentAgent.id, {
				allowedDomains: allowedDomains
					.split(",")
					.map((d) => d.trim())
					.filter(Boolean),
				blockedSenders: blockedSenders
					.split(",")
					.map((s) => s.trim())
					.filter(Boolean),
			});
			toast.success("Access rules saved");
		} catch (err) {
			console.error("Failed to save:", err);
			toast.error("Failed to save settings");
		} finally {
			setSaving(false);
		}
	};

	const handleReset = async () => {
		if (!currentAgent) return;
		try {
			const settings = await getEmailSettings(currentAgent.id);
			setAllowedDomains((settings.allowedDomains || []).join(", "));
			setBlockedSenders((settings.blockedSenders || []).join(", "));
			setStrictMode((settings.allowedDomains || []).length > 0);
			toast.info("Settings reverted");
		} catch (err) {
			console.error("Failed to reload:", err);
		}
	};

	// Parse entries for preview
	const allowedEntries = allowedDomains
		.split(",")
		.map((d) => d.trim())
		.filter(Boolean);
	const blockedEntries = blockedSenders
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

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
					<h1 className="text-xl font-medium tracking-tight">Access Gateway</h1>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mt-0.5">
						<span className="flex items-center gap-1">
							<Shield size={10} /> Security Config
						</span>
						<span className="text-[#D1D1D1]">|</span>
						<span>Channel: EMAIL</span>
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
						<Save size={12} /> {saving ? "Saving..." : "Save Config"}
					</button>
				</div>
			</header>

			{/* Split Layout */}
			<div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
				{/* --- LEFT: CONFIGURATION --- */}
				<div className="flex-1 overflow-y-auto p-8 border-r border-[#D1D1D1] bg-white">
					{/* Access Mode */}
					<ConfigSection title="Access Mode" icon={Shield}>
						<ToggleControl
							label="Domain Restriction Mode"
							description="When enabled, only emails from specified domains will be processed. All others are ignored."
							checked={strictMode}
							onChange={setStrictMode}
						/>
						{strictMode && (
							<div className="mt-2 p-3 bg-[#FAFAF9] border border-[#E5E5E5] flex items-start gap-2">
								<AlertTriangle size={12} className="text-amber-600 mt-0.5" />
								<p className="text-[10px] text-[#555] font-mono">
									Strict mode active. Emails from unlisted domains will be silently dropped.
								</p>
							</div>
						)}
					</ConfigSection>

					{/* Allowlist */}
					<ConfigSection title="Domain Allowlist" icon={ShieldCheck}>
						<div className="mb-4 last:mb-0">
							<Label className="mb-1.5 block">Allowed Sender Domains</Label>
							<Textarea
								value={allowedDomains}
								onChange={(e) => setAllowedDomains(e.target.value)}
								placeholder="customer.com, partner.org, trusted-vendor.io"
								className="h-24 p-3 text-xs font-mono resize-none"
							/>
							<p className="text-[9px] text-[#888] font-mono mt-1.5">
								Comma-separated list of domains. Leave empty to allow all domains (blocklist only).
							</p>
						</div>
					</ConfigSection>

					{/* Blocklist */}
					<ConfigSection title="Sender Blocklist" icon={ShieldBan}>
						<div className="mb-4 last:mb-0">
							<Label className="mb-1.5 block">Blocked Senders</Label>
							<Textarea
								value={blockedSenders}
								onChange={(e) => setBlockedSenders(e.target.value)}
								placeholder="spam@example.com, noreply@competitor.com, marketing@"
								className="h-24 p-3 text-xs font-mono resize-none"
							/>
							<p className="text-[9px] text-[#888] font-mono mt-1.5">
								Comma-separated. Supports full emails or partial matches (e.g., @domain.com).
							</p>
						</div>
						<div className="mt-4 p-3 bg-[#FAFAF9] border border-[#E5E5E5] flex items-start gap-2">
							<CheckCircle2 size={12} className="text-green-600 mt-0.5" />
							<p className="text-[10px] text-[#555] font-mono">
								Blocklist is always active and takes precedence over the allowlist.
							</p>
						</div>
					</ConfigSection>
				</div>

				{/* --- RIGHT: PREVIEW --- */}
				<div className="flex-[1.2] bg-[#F3F2EE] relative flex flex-col p-8 overflow-hidden">
					<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/graphy.png')] opacity-40 pointer-events-none" />

					<div className="text-[10px] font-mono uppercase text-[#888] flex items-center gap-2 mb-6 relative z-10">
						<Eye size={12} /> Access Policy Preview
					</div>

					<div className="flex-1 space-y-6 relative z-10">
						{/* Policy Status Card */}
						<div className="bg-white border border-[#D1D1D1] shadow-sm p-6">
							<div className="flex items-center gap-3 mb-4">
								<div
									className={`p-2 border ${
										strictMode
											? "bg-amber-50 border-amber-200 text-amber-600"
											: "bg-green-50 border-green-200 text-green-600"
									}`}
								>
									{strictMode ? <Shield size={16} /> : <Globe size={16} />}
								</div>
								<div>
									<div className="text-xs font-bold uppercase tracking-wide">
										{strictMode ? "Restricted Access" : "Open Access"}
									</div>
									<div className="text-[10px] text-[#888] font-mono">
										{strictMode
											? "Only whitelisted domains accepted"
											: "All senders accepted (blocklist applied)"}
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#F3F2EE]">
								<div className="text-center p-3 bg-[#FAFAF9]">
									<div className="text-2xl font-bold text-[#1A1A1A]">{allowedEntries.length}</div>
									<div className="text-[9px] font-mono uppercase text-[#888]">Allowed Domains</div>
								</div>
								<div className="text-center p-3 bg-[#FAFAF9]">
									<div className="text-2xl font-bold text-[#1A1A1A]">{blockedEntries.length}</div>
									<div className="text-[9px] font-mono uppercase text-[#888]">Blocked Entries</div>
								</div>
							</div>
						</div>

						{/* Access Rules Visualization */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<AccessRuleCard
								type="allow"
								entries={allowedEntries}
								icon={ShieldCheck}
								emptyText="No domains specified (all allowed)"
							/>
							<AccessRuleCard
								type="block"
								entries={blockedEntries}
								icon={UserX}
								emptyText="No senders blocked"
							/>
						</div>

						{/* Simulation Panel */}
						<div className="bg-white border border-[#D1D1D1] shadow-sm">
							<div className="flex items-center gap-2 px-4 py-3 border-b border-[#F3F2EE] bg-[#FAFAF9]">
								<Mail size={14} className="text-[#555]" />
								<h3 className="text-xs font-bold tracking-widest uppercase">
									Incoming Email Simulation
								</h3>
							</div>
							<div className="p-4 space-y-3">
								<div className="flex items-center justify-between p-3 border border-[#E5E5E5] bg-[#FAFAF9]">
									<div className="flex items-center gap-3">
										<Mail size={14} className="text-[#888]" />
										<div>
											<div className="text-xs font-mono">customer@partner.org</div>
											<div className="text-[9px] text-[#888]">Support inquiry</div>
										</div>
									</div>
									<div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-green-600">
										<CheckCircle2 size={12} /> Accepted
									</div>
								</div>

								<div className="flex items-center justify-between p-3 border border-[#E5E5E5] bg-[#FAFAF9]">
									<div className="flex items-center gap-3">
										<Mail size={14} className="text-[#888]" />
										<div>
											<div className="text-xs font-mono">spam@malicious.net</div>
											<div className="text-[9px] text-[#888]">Suspicious content</div>
										</div>
									</div>
									<div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-red-600">
										<ShieldBan size={12} /> Blocked
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
