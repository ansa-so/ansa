"use client";

import { PageHeader } from "@ansa/ui";
import {
	Activity,
	ArrowRight,
	CheckCircle2,
	Copy,
	Cpu,
	Crown,
	Database,
	GitMerge,
	Lock,
	Mail,
	Server,
	Settings,
	Sparkles,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { usePlansWithCurrent } from "@/hooks/use-plans";
import { useAgents } from "@/lib/agent-context";
import { type EmailChannelSettings, getEmailSettings } from "@/lib/api";
import { getConfig } from "@/lib/runtime-config";

const EMAIL_INBOUND_DOMAIN = getConfig().emailInboundDomain || "mail.ansa.so";

// --- COMPONENTS ---

const PlanBadge = () => (
	<div className="inline-flex items-center gap-1.5 px-2 py-1 bg-[#1A1A1A] text-white text-[9px] font-bold uppercase tracking-widest border border-[#1A1A1A]">
		<Crown size={10} className="text-yellow-400 fill-current" />
		<span>Growth+</span>
	</div>
);

interface EndpointTerminalProps {
	label: string;
	address: string;
	type?: "primary" | "secondary";
	locked?: boolean;
}

const EndpointTerminal = ({
	label,
	address,
	type = "primary",
	locked = false,
}: EndpointTerminalProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		if (locked) return;
		navigator.clipboard.writeText(address);
		setCopied(true);
		toast.success("Copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div
			className={`border p-5 relative overflow-hidden group transition-all ${
				locked
					? "bg-[#F3F2EE] border-[#D1D1D1] opacity-80"
					: type === "primary"
						? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
						: "bg-white border-[#D1D1D1] text-[#1A1A1A]"
			}`}
		>
			{/* Locked Overlay */}
			{locked && (
				<div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-10 flex items-center justify-center">
					<div className="bg-white border border-[#D1D1D1] px-3 py-1.5 shadow-sm flex items-center gap-2">
						<Lock size={12} className="text-[#555]" />
						<span className="text-[9px] font-bold uppercase text-[#1A1A1A]">
							Growth License Required
						</span>
					</div>
				</div>
			)}

			{/* Background decoration */}
			<div className="absolute top-0 right-0 p-3 pointer-events-none opacity-10">
				{type === "primary" ? <Server size={64} /> : <Database size={64} />}
			</div>

			<div
				className={`text-[9px] font-mono uppercase mb-2 flex items-center gap-2 ${type === "primary" ? "text-[#888]" : "text-[#888]"}`}
			>
				{type === "primary" ? (
					<Activity size={10} className="text-green-500" />
				) : (
					<GitMerge size={10} />
				)}
				{label}
			</div>

			<div
				className={`font-mono text-sm break-all pr-12 leading-relaxed ${type === "primary" ? "text-white" : "text-[#1A1A1A]"} ${locked ? "blur-sm select-none" : ""}`}
			>
				{locked ? "hidden-address-node-locked-by-admin" : address}
			</div>

			<button
				type="button"
				onClick={handleCopy}
				disabled={locked}
				className={`absolute bottom-4 right-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 border transition-all ${
					locked
						? "opacity-0"
						: type === "primary"
							? "border-white/20 hover:bg-white hover:text-[#1A1A1A]"
							: "border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white"
				}`}
			>
				{copied ? <CheckCircle2 size={10} /> : <Copy size={10} />}
				{copied ? "COPIED" : "COPY"}
			</button>
		</div>
	);
};

interface FlowStepProps {
	number: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ size?: number; className?: string }>;
	link?: string;
	linkText?: string;
}

const FlowStep = ({ number, title, description, icon: Icon, link, linkText }: FlowStepProps) => (
	<div className="flex items-start gap-4 p-4 border border-[#F3F2EE] bg-[#FAFAF9] hover:bg-white hover:border-[#D1D1D1] transition-colors group">
		<div className="flex flex-col items-center gap-1">
			<div className="w-6 h-6 bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-bold font-mono">
				{number}
			</div>
			<div className="w-px h-full bg-[#D1D1D1] group-last:hidden min-h-[40px]" />
		</div>
		<div>
			<div className="flex items-center gap-2 mb-1">
				<Icon size={14} className="text-[#555]" />
				<h3 className="text-xs font-bold tracking-wide uppercase">{title}</h3>
			</div>
			<p className="text-[10px] text-[#555] font-mono leading-relaxed max-w-sm">{description}</p>
			{link && linkText && (
				<Link
					href={link}
					className="inline-flex items-center gap-1 mt-2 text-[9px] font-bold uppercase text-[#1A1A1A] hover:underline"
				>
					{linkText} <ArrowRight size={8} />
				</Link>
			)}
		</div>
	</div>
);

export default function EmailChannelPage() {
	const { currentAgent, isLoading: agentLoading } = useAgents();
	const { plans, currentPlanId, isLoading: plansLoading } = usePlansWithCurrent();
	const [loading, setLoading] = useState(true);
	const [settings, setSettings] = useState<EmailChannelSettings | null>(null);

	// Check if current plan has email channel access
	const currentPlan = plans.find((p) => p.id === currentPlanId);
	const planHasEmailChannel =
		plansLoading || !currentPlanId
			? true // Show content while loading
			: currentPlanId === "unlimited" || (currentPlan?.hasEmailChannel ?? false);

	// Load settings
	const loadSettings = useCallback(async () => {
		if (!currentAgent) return;

		try {
			setLoading(true);
			const data = await getEmailSettings(currentAgent.id);
			setSettings(data);
		} catch (error) {
			console.error("Failed to load email settings:", error);
		} finally {
			setLoading(false);
		}
	}, [currentAgent]);

	useEffect(() => {
		loadSettings();
	}, [loadSettings]);

	// Generate email addresses for display
	const agentEmailAddress =
		settings?.inboundAddress ||
		(currentAgent
			? `${currentAgent.slug}@${EMAIL_INBOUND_DOMAIN}`
			: `your-agent@${EMAIL_INBOUND_DOMAIN}`);

	// Use short ID format (12 chars without dashes) for learn address
	const shortId = currentAgent?.id.replace(/-/g, "").slice(0, 12) || "";
	const learnEmailAddress = shortId ? `learn-${shortId}@${EMAIL_INBOUND_DOMAIN}` : "";

	if (!currentAgent) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Email Gateway"
					subtitle="Process inbound emails with your AI agent"
					icon={<Mail size={12} />}
				/>
				<div className="p-8">
					<Text className="text-muted-foreground">Please create an agent first</Text>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Email Gateway"
					subtitle="Process inbound emails with your AI agent"
					icon={<Mail size={12} />}
				/>
				<div className="p-8 mx-auto space-y-8">
					<Skeleton className="h-40" />
					<div className="grid gap-6 md:grid-cols-2">
						<Skeleton className="h-64" />
						<Skeleton className="h-64" />
					</div>
					<Skeleton className="h-32" />
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			<PageHeader
				title="Email Gateway"
				subtitle="Process inbound emails with your AI agent"
				icon={<Mail size={12} />}
				badge={
					planHasEmailChannel ? (
						<span
							className={`inline-flex items-center gap-1.5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider border ${
								settings?.enabled
									? "bg-green-50 text-green-700 border-green-200"
									: "bg-[#F3F2EE] text-[#888] border-[#D1D1D1]"
							}`}
						>
							<span
								className={`w-1.5 h-1.5 rounded-full ${
									settings?.enabled ? "bg-green-500 animate-pulse" : "bg-[#888]"
								}`}
							/>
							{settings?.enabled ? "Online" : "Offline"}
						</span>
					) : undefined
				}
				action={
					planHasEmailChannel ? (
						<Link
							href="/settings/channels/email"
							className="h-9 px-4 bg-white border border-[#D1D1D1] text-[10px] font-bold uppercase hover:bg-[#F3F2EE] text-[#555] flex items-center gap-2"
						>
							<Settings size={12} /> Configure
						</Link>
					) : undefined
				}
			/>

			<div className="p-8 mx-auto space-y-8">
				{/* UPSELL ALERT (If not on Growth+) */}
				{!planHasEmailChannel && (
					<div className="relative flex items-start gap-4 p-4 overflow-hidden border border-yellow-200 bg-yellow-50">
						<div className="absolute top-0 right-0 p-4 pointer-events-none opacity-10">
							<Crown size={120} />
						</div>
						<div className="z-10 p-2 text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-sm">
							<Lock size={16} />
						</div>
						<div className="z-10">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="text-xs font-bold text-yellow-900 uppercase">
									Restricted Capability
								</h3>
								<PlanBadge />
							</div>
							<p className="text-[11px] text-yellow-800/80 max-w-xl leading-relaxed mb-3">
								The <strong>Email Gateway</strong> allows the AI to automatically process inbound
								support emails and route them via SMTP. This infrastructure is available exclusively
								on the Growth Plan and above.
							</p>
							<Link
								href="/billing"
								className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2 text-[9px] font-bold uppercase tracking-widest hover:bg-[#333]"
							>
								<Sparkles size={10} />
								Upgrade License
							</Link>
						</div>
					</div>
				)}

				{/* 1. Primary Ingress Endpoint */}
				<section
					className={
						!planHasEmailChannel ? "opacity-60 pointer-events-none select-none grayscale-[50%]" : ""
					}
				>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<Server size={14} />
							<h3 className="text-xs font-bold tracking-widest uppercase">
								Primary Ingress Endpoint
							</h3>
						</div>
						{!planHasEmailChannel && <PlanBadge />}
					</div>

					<div className="bg-white border border-[#D1D1D1] p-1 shadow-sm">
						<EndpointTerminal
							label="Agent Routing Address"
							address={agentEmailAddress}
							type="primary"
							locked={!planHasEmailChannel}
						/>
						<div className="p-3 bg-[#FAFAF9] text-[10px] text-[#555] font-mono flex items-center justify-between">
							<span>Forward customer emails here to trigger the AI agent.</span>
						</div>
					</div>
				</section>

				{/* 2. Operational Modules */}
				<section
					className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${!planHasEmailChannel ? "opacity-60 pointer-events-none select-none grayscale-[50%]" : ""}`}
				>
					{/* Module A: Training */}
					<div className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col">
						<div className="p-4 border-b border-[#F3F2EE] bg-[#FAFAF9] flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Database size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Knowledge Injection</h3>
							</div>
							{!planHasEmailChannel ? (
								<Lock size={10} className="text-[#888]" />
							) : (
								<div className="text-[9px] font-mono text-[#EAB308] border border-[#FEF08A] bg-[#FEFCE8] px-1.5 py-0.5">
									AUTO-LEARN
								</div>
							)}
						</div>

						<div className="flex flex-col flex-1 gap-4 p-5">
							<p className="text-[10px] text-[#555] font-mono leading-relaxed">
								Forward resolved email threads to automatically extract Q&A pairs and add them to
								your knowledge base.
							</p>
							<EndpointTerminal
								label="Training Uplink"
								address={learnEmailAddress}
								type="secondary"
								locked={!planHasEmailChannel}
							/>
							<Link
								href="/ai-knowledge/qa"
								className="text-[10px] font-bold uppercase text-[#1A1A1A] flex items-center gap-1 hover:underline"
							>
								View Knowledge Base <ArrowRight size={10} />
							</Link>
						</div>
					</div>

					{/* Module B: Response Logic */}
					<div className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col">
						<div className="p-4 border-b border-[#F3F2EE] bg-[#FAFAF9] flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Cpu size={14} />
								<h3 className="text-xs font-bold tracking-widest uppercase">Outbound Logic</h3>
							</div>
							{!planHasEmailChannel ? (
								<Lock size={10} className="text-[#888]" />
							) : (
								<div className="text-[9px] font-mono text-green-600 border border-green-200 bg-green-50 px-1.5 py-0.5">
									AUTOPILOT
								</div>
							)}
						</div>

						<div className="flex-1 p-5 space-y-4">
							<div className="flex items-start gap-3">
								<Zap size={16} className="mt-0.5 text-[#1A1A1A]" />
								<div>
									<div className="text-[10px] font-bold uppercase">Zero-Latency Response</div>
									<p className="text-[10px] text-[#888] font-mono">
										Customers receive answers 24/7 without queueing.
									</p>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Mail size={16} className="mt-0.5 text-[#1A1A1A]" />
								<div>
									<div className="text-[10px] font-bold uppercase">Reply Address</div>
									<p className="text-[10px] text-[#888] font-mono">
										Replies sent from:{" "}
										<span className="text-[#1A1A1A] bg-[#F3F2EE] px-1">
											{planHasEmailChannel ? settings?.replyAddress || "noreply@ansa.so" : "-"}
										</span>
									</p>
								</div>
							</div>
							<div className="pt-2 mt-auto">
								<Link
									href="/settings/channels/email"
									className="w-full h-8 border border-[#D1D1D1] text-[9px] font-bold uppercase hover:bg-[#1A1A1A] hover:text-white transition-colors flex items-center justify-center"
								>
									Configure Aliases
								</Link>
							</div>
						</div>
					</div>
				</section>

				{/* 3. Workflow Schematic */}
				<section
					className={
						!planHasEmailChannel ? "opacity-60 pointer-events-none select-none grayscale-[50%]" : ""
					}
				>
					<div className="flex items-center gap-2 mb-4 pt-4 border-t border-[#D1D1D1]">
						<GitMerge size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">System Signal Path</h3>
					</div>

					<div className="bg-white border border-[#D1D1D1] shadow-sm p-1">
						<div className="grid grid-cols-1 gap-0 md:grid-cols-3">
							<FlowStep
								number="01"
								title="Route Traffic"
								description="Configure your support inbox (Gmail/Outlook) to auto-forward incoming mail to the Agent Address."
								icon={ArrowRight}
							/>
							<FlowStep
								number="02"
								title="Neural Processing"
								description={`The Agent analyzes intent against the Knowledge Base. If confidence > ${settings?.confidenceThreshold || 70}%, a draft is generated.`}
								icon={Cpu}
								link="/settings/embed-confidence"
								linkText="Adjust Threshold"
							/>
							<FlowStep
								number="03"
								title="Loop Feedback"
								description="Review the Agent's replies. For low confidence queries, the system pauses for human review (HITL)."
								icon={Activity}
							/>
						</div>
					</div>
				</section>
			</div>
		</div>
	);
}
