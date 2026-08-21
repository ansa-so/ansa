"use client";

import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Key, Lock, Mail, ShieldCheck, Terminal, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { LogoIcon } from "@/components/logo-icon";
import { forgetPassword } from "@/lib/auth-client";

// --- COMPONENTS ---

const StatusIndicator = ({ status }: { status: string }) => {
	const config: Record<string, { color: string; text: string }> = {
		idle: { color: "bg-gray-400", text: "SYSTEM STANDBY" },
		sending: { color: "bg-yellow-400 animate-pulse", text: "TRANSMITTING..." },
		success: { color: "bg-green-500", text: "LINK SENT" },
		error: { color: "bg-red-500", text: "ERROR: TRANSMISSION FAILED" },
	};

	const current = config[status] || config.idle;

	return (
		<div className="flex items-center gap-2 mb-6 bg-[#FAFAF9] border border-[#E5E5E5] px-3 py-1.5 w-fit rounded-sm shadow-sm">
			<div className={`w-2 h-2 rounded-full ${current.color}`} />
			<span className="text-[10px] font-mono font-bold uppercase text-[#555] tracking-widest">
				{current.text}
			</span>
		</div>
	);
};

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState("");
	const [status, setStatus] = useState("idle"); // idle, sending, success, error
	const [error, setError] = useState("");

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!email) return;

		setStatus("sending");
		setError("");

		try {
			const result = await forgetPassword({
				email,
				redirectTo: `${window.location.origin}/reset-password`,
			});
			if (result.error) {
				setError(result.error.message || "Failed to send reset email");
				setStatus("error");
			} else {
				setStatus("success");
			}
		} catch {
			setError("Failed to send reset email");
			setStatus("error");
		}
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE] flex flex-col items-center justify-center font-sans relative overflow-hidden text-[#1A1A1A]">
			{/* Background Grid Pattern */}
			<div
				className="absolute inset-0 z-0 opacity-[0.03]"
				style={{
					backgroundImage:
						"linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>

			{/* Top Navigation / Brand */}
			<div className="absolute z-10 top-8 left-8">
				<Link href="/" className="block">
					<LogoIcon size="md" showSubtitle />
				</Link>
			</div>

			{/* --- MAIN CARD: RECOVERY CONSOLE --- */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="relative z-10 w-full max-w-[480px] px-4"
			>
				<div className="bg-white border border-[#D1D1D1] shadow-2xl relative overflow-hidden">
					{/* Header Bar */}
					<div className="bg-[#1A1A1A] text-white p-6 border-b border-[#333] flex justify-between items-start">
						<div>
							<h1 className="flex items-center gap-2 text-xl font-bold tracking-wide uppercase">
								<Key size={18} className="text-[#E5E5E5]" /> Credential Recovery
							</h1>
							<p className="text-[11px] font-mono text-[#888] mt-2 leading-relaxed max-w-[280px]">
								Initiate secure protocol to reset access privileges. An authentication token will be
								dispatched to your registered comms channel.
							</p>
						</div>
						<ShieldCheck size={24} className="text-[#333]" />
					</div>

					{/* Content Area */}
					<div className="p-8">
						<StatusIndicator status={status} />

						{status === "success" ? (
							<div className="py-8 text-center">
								<div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 text-green-600 border border-green-200 rounded-full bg-green-50">
									<Mail size={28} />
								</div>
								<h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Transmission Complete</h3>
								<p className="text-sm text-[#555] mb-6">
									We have sent a secure recovery link to{" "}
									<span className="font-bold text-[#1A1A1A]">{email}</span>.
								</p>
								<p className="text-xs text-[#888] font-mono mb-8">
									Check your inbox and spam folder.
								</p>
								<Link
									href="/login"
									className="w-full h-12 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-[#333] transition-all"
								>
									Return to Login <ArrowRight size={14} />
								</Link>
							</div>
						) : (
							<form onSubmit={handleSubmit} className="space-y-6">
								{/* Email Input */}
								<div className="space-y-2 group">
									<div className="flex justify-between">
										<label
											htmlFor="reset-email"
											className="text-[10px] font-mono uppercase font-bold text-[#1A1A1A] flex items-center gap-1"
										>
											<Terminal size={10} /> Target Identity (Email)
										</label>
										<span className="text-[9px] font-mono text-[#AAA] opacity-0 group-focus-within:opacity-100 transition-opacity">
											REQUIRED FIELD
										</span>
									</div>
									<div className="relative">
										<input
											id="reset-email"
											type="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											placeholder="user@enterprise.com"
											className="w-full h-14 bg-[#FAFAF9] border border-[#D1D1D1] px-4 font-mono text-sm text-[#1A1A1A] placeholder:text-[#CCC] focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-all shadow-inner"
											// biome-ignore lint/a11y/noAutofocus: sole field on a single-purpose form the user navigated to deliberately
											autoFocus
											required
										/>
										<div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#1A1A1A] animate-pulse opacity-20" />
									</div>
								</div>

								{/* Error Message */}
								{error && (
									<div className="text-xs font-mono text-red-600 bg-red-50 border border-red-200 px-3 py-2">
										{error}
									</div>
								)}

								{/* Action Button */}
								<button
									type="submit"
									disabled={!email || status === "sending"}
									className={`w-full h-14 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all border ${
										!email || status === "sending"
											? "bg-[#F3F2EE] text-[#CCC] border-[#E5E5E5] cursor-not-allowed"
											: "bg-[#1A1A1A] text-white border-[#1A1A1A] hover:bg-white hover:text-[#1A1A1A] hover:shadow-lg"
									}`}
								>
									{status === "sending" ? (
										<>
											Processing{" "}
											<div className="w-3 h-3 border-2 border-[#CCC] border-t-transparent rounded-full animate-spin" />
										</>
									) : (
										<>
											Transmit Recovery Link <Zap size={14} />
										</>
									)}
								</button>
							</form>
						)}
					</div>

					{/* Footer Bar */}
					<div className="bg-[#FAFAF9] border-t border-[#E5E5E5] p-4 flex justify-between items-center text-[10px] font-mono text-[#888]">
						<Link
							href="/login"
							className="flex items-center gap-1 hover:text-[#1A1A1A] transition-colors uppercase font-bold"
						>
							<ArrowLeft size={10} /> Abort / Return to Login
						</Link>
						<span>SECURE CONNECTION: TLS 1.3</span>
					</div>
				</div>

				{/* Bottom Security Note */}
				<div className="mt-6 text-center">
					<div className="inline-flex items-center gap-2 px-3 py-1 bg-[#EAE9E5] rounded-full border border-[#D1D1D1] text-[9px] font-mono text-[#555] uppercase tracking-wide">
						<Lock size={10} /> Authorized Personnel Only
					</div>
				</div>
			</motion.div>
		</div>
	);
}
