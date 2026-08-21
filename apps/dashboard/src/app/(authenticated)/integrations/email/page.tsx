"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertTriangle,
	ArrowRight,
	Check,
	CheckCircle2,
	Loader2,
	Lock,
	Plus,
	RefreshCw,
	Server,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
	createEmailDomain,
	getEmailDomainStatus,
	type ResendDomain,
	verifyEmailDomain,
} from "@/lib/api";

// --- COMPONENTS ---

function SecurityBadge({ status }: { status: "verified" | "not_started" | "pending" | string }) {
	if (status === "verified") {
		return (
			<span className="text-[9px] font-mono font-bold text-green-700 bg-green-50 border border-green-200 px-1.5 rounded-sm">
				PASS
			</span>
		);
	}
	if (status === "pending") {
		return (
			<span className="text-[9px] font-mono font-bold text-yellow-700 bg-yellow-50 border border-yellow-200 px-1.5 rounded-sm">
				PENDING
			</span>
		);
	}
	return (
		<span className="text-[9px] font-mono font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 rounded-sm">
			MISSING
		</span>
	);
}

function DnsRecordRow({
	record,
}: {
	record: { type: string; name: string; value: string; status?: string };
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		toast.success("Copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-[#F3F2EE] items-start hover:bg-[#FAFAF9] transition-colors group">
			{/* Type */}
			<div className="col-span-2">
				<span className="text-[10px] font-mono font-bold bg-[#1A1A1A] text-white px-2 py-1">
					{record.type}
				</span>
			</div>

			{/* Name */}
			<div className="col-span-4">
				<div className="text-[10px] text-[#888] font-mono uppercase mb-1">Host / Name</div>
				<div className="font-mono text-xs text-[#1A1A1A] bg-[#F3F2EE] px-2 py-1.5 break-all">
					{record.name}
				</div>
			</div>

			{/* Value */}
			<div className="col-span-4">
				<div className="text-[10px] text-[#888] font-mono uppercase mb-1">Value / Points To</div>
				<div className="font-mono text-xs text-[#555] bg-[#F3F2EE] px-2 py-1.5 break-all max-h-16 overflow-y-auto">
					{record.value}
				</div>
			</div>

			{/* Status & Copy */}
			<div className="flex flex-col items-end col-span-2 gap-2">
				<SecurityBadge status={record.status || "not_started"} />
				<button
					type="button"
					onClick={() => handleCopy(record.value)}
					className="text-[10px] font-bold uppercase text-[#888] hover:text-[#1A1A1A] transition-colors"
				>
					{copied ? <Check size={12} className="text-green-600" /> : "Copy"}
				</button>
			</div>
		</div>
	);
}

export default function EmailDomainConfigPage() {
	// Domain verification
	const [domainInput, setDomainInput] = useState("");
	const [domainVerifying, setDomainVerifying] = useState(false);
	const [domainInfo, setDomainInfo] = useState<ResendDomain | null>(null);

	// Inline verification result
	const [inlineVerifyResult, setInlineVerifyResult] = useState<{
		status: "idle" | "checking" | "verified" | "not_verified" | "error";
		domain?: ResendDomain | null;
		message?: string;
	}>({ status: "idle" });

	// Domain verification flow
	const handleCreateDomain = async () => {
		if (!domainInput.trim()) return;

		try {
			setDomainVerifying(true);
			const result = await createEmailDomain(domainInput.trim());
			setDomainInfo(result);
			setInlineVerifyResult({
				status: "not_verified",
				domain: result,
				message: "DNS records created. Add them to your domain and verify.",
			});
		} catch (error) {
			console.error("Failed to create domain:", error);
			toast.error(error instanceof Error ? error.message : "Failed to create domain");
		} finally {
			setDomainVerifying(false);
		}
	};

	const handleVerifyDomain = async () => {
		if (!domainInfo?.id) return;

		try {
			setDomainVerifying(true);
			const result = await verifyEmailDomain(domainInfo.id);
			setDomainInfo(result);
			if (result.status === "verified") {
				setInlineVerifyResult({ status: "verified", domain: result });
				toast.success("Domain verified successfully!");
			} else {
				toast.error("Domain not yet verified. Please check your DNS records.");
			}
		} catch (error) {
			console.error("Failed to verify domain:", error);
			toast.error(error instanceof Error ? error.message : "Failed to verify domain");
		} finally {
			setDomainVerifying(false);
		}
	};

	const handleCheckDomainStatus = async () => {
		if (!domainInput.trim()) return;

		try {
			setDomainVerifying(true);
			setInlineVerifyResult({ status: "checking" });
			const result = await getEmailDomainStatus(domainInput.trim());
			if (result) {
				setDomainInfo(result);
				if (result.status === "verified") {
					setInlineVerifyResult({ status: "verified", domain: result });
				} else {
					setInlineVerifyResult({
						status: "not_verified",
						domain: result,
						message: "DNS records pending verification.",
					});
				}
			} else {
				setInlineVerifyResult({
					status: "not_verified",
					message: `Domain "${domainInput.trim()}" is not registered. Click to set up.`,
				});
			}
		} catch (error) {
			console.error("Failed to check domain status:", error);
			setInlineVerifyResult({
				status: "error",
				message: error instanceof Error ? error.message : "Failed to check domain status",
			});
		} finally {
			setDomainVerifying(false);
		}
	};

	return (
		<div className="min-h-screen">
			<PageHeader
				title="Email Domains"
				icon={
					<span className="flex items-center gap-2">
						<span>Verify your domain to send email replies from your own address</span>
					</span>
				}
				action={
					<button
						type="button"
						onClick={() => setDomainInput("")}
						className="h-8 px-4 bg-[#1A1A1A] text-white text-[10px] font-bold uppercase hover:bg-[#333] flex items-center gap-2 shadow-lg"
					>
						<Plus size={12} /> Add Domain
					</button>
				}
			/>

			<div className="w-full p-8 space-y-8">
				{/* Verification Console */}
				<section className="bg-white border border-[#D1D1D1] shadow-sm p-6 relative overflow-hidden">
					{/* Technical Background Accent */}
					<div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-50 pointer-events-none" />

					<div className="relative z-10 flex items-start gap-4 mb-6">
						<div className="bg-[#1A1A1A] text-white p-3 border border-[#1A1A1A]">
							<Server size={18} />
						</div>
						<div>
							<h3 className="text-sm font-bold tracking-wide uppercase">Domain Verification</h3>
							<p className="text-xs text-[#555] max-w-lg mt-1">
								Add your custom domain so the AI can respond using your own domain instead of{" "}
								<span className="font-mono bg-[#F3F2EE] px-1 text-[10px]">mail.ansa.so</span>.
							</p>
						</div>
					</div>

					<div className="flex items-center gap-0">
						<div className="bg-[#F3F2EE] border border-[#D1D1D1] border-r-0 px-4 h-12 flex items-center font-mono text-xs text-[#888]">
							@
						</div>
						<input
							type="text"
							placeholder="yourdomain.com"
							value={domainInput}
							onChange={(e) => setDomainInput(e.target.value)}
							className="flex-1 h-12 border border-[#D1D1D1] px-4 text-sm font-mono focus:outline-none focus:border-[#1A1A1A] z-10"
						/>
						<button
							type="button"
							onClick={handleCheckDomainStatus}
							disabled={domainVerifying || !domainInput.trim()}
							className="h-12 bg-[#1A1A1A] text-white px-8 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors border border-[#1A1A1A] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{domainVerifying ? (
								<>
									<Loader2 size={14} className="animate-spin" /> Checking...
								</>
							) : (
								<>
									Check DNS <ArrowRight size={14} />
								</>
							)}
						</button>
					</div>
				</section>

				{/* Verification Status */}
				{inlineVerifyResult.status === "verified" && (
					<section className="flex items-center gap-4 p-4 border border-green-200 bg-green-50">
						<div className="p-2 bg-green-100 border border-green-200">
							<CheckCircle2 size={20} className="text-green-600" />
						</div>
						<div>
							<h4 className="text-sm font-bold text-green-800">Domain Verified!</h4>
							<p className="text-xs text-green-700">
								<strong>{domainInfo?.name}</strong> is verified. You can now send emails from this
								domain.
							</p>
						</div>
					</section>
				)}

				{inlineVerifyResult.status === "not_verified" && (
					<section className="flex items-center gap-4 p-4 border border-yellow-200 bg-yellow-50">
						<div className="p-2 bg-yellow-100 border border-yellow-200">
							<AlertTriangle size={20} className="text-yellow-600" />
						</div>
						<div className="flex-1">
							<h4 className="text-sm font-bold text-yellow-800">DNS Records Pending</h4>
							<p className="text-xs text-yellow-700">{inlineVerifyResult.message}</p>
						</div>
						{(!inlineVerifyResult.domain?.records ||
							inlineVerifyResult.domain.records.length === 0) && (
							<button
								type="button"
								onClick={handleCreateDomain}
								disabled={domainVerifying}
								className="h-10 bg-[#1A1A1A] text-white px-6 text-[10px] font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2 disabled:opacity-50"
							>
								{domainVerifying ? (
									<Loader2 size={12} className="animate-spin" />
								) : (
									<>
										<Plus size={12} /> Set up DNS
									</>
								)}
							</button>
						)}
					</section>
				)}

				{inlineVerifyResult.status === "error" && (
					<section className="flex items-center gap-4 p-4 border border-red-200 bg-red-50">
						<div className="p-2 bg-red-100 border border-red-200">
							<AlertTriangle size={20} className="text-red-600" />
						</div>
						<div>
							<h4 className="text-sm font-bold text-red-800">Error</h4>
							<p className="text-xs text-red-700">{inlineVerifyResult.message}</p>
						</div>
					</section>
				)}

				{/* DNS Records Table */}
				{inlineVerifyResult.domain?.records && inlineVerifyResult.domain.records.length > 0 && (
					<section className="bg-white border border-[#D1D1D1] shadow-sm flex flex-col">
						{/* Toolbar */}
						<div className="px-6 py-4 border-b border-[#F3F2EE] flex justify-between items-center bg-[#FAFAF9]">
							<h3 className="flex items-center gap-2 text-xs font-bold tracking-wide uppercase">
								<Lock size={14} className="text-[#888]" /> Required DNS Records
							</h3>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={handleVerifyDomain}
									disabled={domainVerifying}
									className="h-8 px-3 border border-[#D1D1D1] bg-white hover:bg-[#F9F9F9] flex items-center gap-2 text-[10px] font-bold uppercase text-[#555] disabled:opacity-50"
								>
									{domainVerifying ? (
										<Loader2 size={10} className="animate-spin" />
									) : (
										<RefreshCw size={10} />
									)}{" "}
									Verify Records
								</button>
							</div>
						</div>

						{/* Table Header */}
						<div className="grid grid-cols-12 gap-4 px-6 py-3 bg-[#F9F9F9] border-b border-[#D1D1D1] text-[9px] font-mono uppercase tracking-widest text-[#888]">
							<div className="col-span-2">Type</div>
							<div className="col-span-4">Host / Name</div>
							<div className="col-span-4">Value</div>
							<div className="col-span-2 text-right">Status</div>
						</div>

						{/* Table Body */}
						<div className="flex-1">
							{inlineVerifyResult.domain.records.map((record, i) => (
								<DnsRecordRow key={`${record.type}-${record.name}-${i}`} record={record} />
							))}
						</div>

						{/* Footer */}
						<div className="p-3 border-t border-[#D1D1D1] bg-[#FAFAF9] px-6 flex justify-between items-center">
							<span className="text-[10px] font-mono text-[#888] uppercase">
								{inlineVerifyResult.domain.records.length} Record
								{inlineVerifyResult.domain.records.length !== 1 ? "s" : ""} Required
							</span>
							<span className="text-[10px] text-[#555]">
								DNS changes may take up to 48 hours to propagate
							</span>
						</div>
					</section>
				)}

				{/* Agent Settings Link */}
				<Link href="/settings/channels/email">
					<section className="border border-[#D1D1D1] bg-[#FAFAF9] p-4 flex items-center justify-between group hover:bg-white hover:border-[#1A1A1A] transition-colors cursor-pointer">
						<div className="flex items-center gap-4">
							<div className="bg-white border border-[#D1D1D1] p-2 text-[#888] group-hover:text-[#1A1A1A]">
								<Settings size={16} />
							</div>
							<div>
								<h4 className="font-bold text-xs uppercase text-[#1A1A1A]">
									Configure Email Settings
								</h4>
								<p className="text-[10px] text-[#888] mt-0.5">
									Set up reply address, response formatting, and access control per agent.
								</p>
							</div>
						</div>
						<span className="text-[10px] font-bold uppercase flex items-center gap-2 border-b border-[#1A1A1A] pb-0.5">
							Manage Settings <ArrowRight size={10} />
						</span>
					</section>
				</Link>
			</div>
		</div>
	);
}
