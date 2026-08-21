"use client";

import { motion } from "framer-motion";
import {
	ArrowLeft,
	CheckCircle2,
	Eye,
	EyeOff,
	Key,
	Lock,
	RefreshCw,
	ShieldAlert,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { LogoIcon } from "@/components/logo-icon";
import { resetPassword } from "@/lib/auth-client";

// --- SUB-COMPONENTS ---

const EntropyMeter = ({ password }: { password: string }) => {
	const length = password.length;
	let strength = 0;
	if (length > 0) strength = 1;
	if (length >= 8) strength = 2;
	if (length >= 12 && /[A-Z]/.test(password) && /[0-9]/.test(password)) strength = 3;

	const labels = ["EMPTY", "WEAK", "MODERATE", "STRONG"];
	const colors = ["bg-[#E5E5E5]", "bg-red-500", "bg-yellow-500", "bg-green-500"];

	return (
		<div className="mt-3 mb-6">
			<div className="flex justify-between items-end mb-1.5">
				<span className="text-[9px] font-mono font-bold uppercase text-[#888]">
					Key Entropy Level
				</span>
				<span
					className={`text-[9px] font-mono font-bold uppercase transition-colors ${
						strength === 3
							? "text-green-600"
							: strength === 2
								? "text-yellow-600"
								: strength === 1
									? "text-red-600"
									: "text-[#CCC]"
					}`}
				>
					{labels[strength]}
				</span>
			</div>
			<div className="flex gap-1 h-1.5">
				{[1, 2, 3].map((step) => (
					<div
						key={step}
						className={`flex-1 transition-all duration-300 ${step <= strength ? colors[strength] : "bg-[#F3F2EE]"}`}
					/>
				))}
			</div>
		</div>
	);
};

function ResetPasswordForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const token = searchParams.get("token");
	const error_param = searchParams.get("error");

	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [showPass, setShowPass] = useState(false);
	const [error, setError] = useState(
		error_param === "INVALID_TOKEN" ? "Invalid or expired reset link" : "",
	);
	const [success, setSuccess] = useState(false);
	const [loading, setLoading] = useState(false);

	const passwordsMatch = password && confirm && password === confirm;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (password !== confirm) {
			setError("Passwords do not match");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters");
			return;
		}

		if (!token) {
			setError("Invalid reset link");
			return;
		}

		setLoading(true);

		try {
			const result = await resetPassword({
				newPassword: password,
				token,
			});
			if (result.error) {
				setError(result.error.message || "Failed to reset password");
			} else {
				setSuccess(true);
				setTimeout(() => {
					router.push("/login");
				}, 2000);
			}
		} catch {
			setError("Failed to reset password");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-white border border-[#D1D1D1] shadow-2xl relative">
			{/* Technical Header */}
			<div className="bg-[#FAFAF9] p-5 border-b border-[#E5E5E5] flex justify-between items-center">
				<div className="flex items-center gap-2 text-[#1A1A1A]">
					<ShieldCheck size={16} />
					<h1 className="text-xs font-bold tracking-widest uppercase">Reset Credentials</h1>
				</div>
				<div className="flex items-center gap-1.5">
					{token ? (
						<>
							<span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
							<span className="text-[9px] font-mono text-[#888]">TOKEN VALID</span>
						</>
					) : (
						<>
							<span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
							<span className="text-[9px] font-mono text-[#888]">NO TOKEN</span>
						</>
					)}
				</div>
			</div>

			{/* Content Body */}
			<div className="p-8">
				{success ? (
					<div className="py-6 text-center">
						<div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 text-green-700 bg-green-100 border border-green-200 rounded-full">
							<CheckCircle2 size={24} />
						</div>
						<h3 className="text-lg font-bold text-[#1A1A1A] mb-2">Update Successful</h3>
						<p className="text-xs text-[#555] mb-6 leading-relaxed">
							Your password has been reset successfully. Redirecting to login...
						</p>
						<button
							onClick={() => router.push("/login")}
							className="w-full h-11 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest text-[10px] hover:bg-[#333] transition-colors"
						>
							Return to Login
						</button>
					</div>
				) : (
					<form onSubmit={handleSubmit}>
						<div className="mb-6">
							<p className="text-xs text-[#555] font-mono mb-4 border-l-2 border-[#E5E5E5] pl-3 py-1">
								Please define a new security key. Ensure compliance with the complexity meter below.
							</p>
						</div>

						{/* Password Field */}
						<div className="mb-2 space-y-4">
							<div className="group">
								<label
									htmlFor="new-password"
									className="text-[9px] font-mono uppercase font-bold text-[#1A1A1A] mb-1.5 block flex items-center gap-1"
								>
									New Password
								</label>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]">
										<Key size={14} />
									</div>
									<input
										id="new-password"
										type={showPass ? "text" : "password"}
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										className="w-full h-11 bg-[#FAFAF9] border border-[#D1D1D1] pl-9 pr-10 font-mono text-sm text-[#1A1A1A] focus:outline-none focus:border-[#1A1A1A] focus:bg-white transition-all shadow-inner"
										placeholder="Enter new key..."
									/>
									<button
										type="button"
										onClick={() => setShowPass(!showPass)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1A1A1A]"
									>
										{showPass ? <EyeOff size={14} /> : <Eye size={14} />}
									</button>
								</div>
							</div>

							{/* Entropy Visualizer */}
							<EntropyMeter password={password} />

							{/* Confirm Field */}
							<div className="group">
								<div className="flex justify-between mb-1.5">
									<label
										htmlFor="confirm-password"
										className="text-[9px] font-mono uppercase font-bold text-[#1A1A1A] block"
									>
										Confirm Password
									</label>
									{password && confirm && (
										<span
											className={`text-[9px] font-mono uppercase font-bold flex items-center gap-1 ${passwordsMatch ? "text-green-600" : "text-red-500"}`}
										>
											{passwordsMatch ? (
												<>
													<CheckCircle2 size={10} /> MATCH
												</>
											) : (
												"MISMATCH"
											)}
										</span>
									)}
								</div>
								<div className="relative">
									<div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#CCC]">
										<Lock size={14} />
									</div>
									<input
										id="confirm-password"
										type="password"
										value={confirm}
										onChange={(e) => setConfirm(e.target.value)}
										className={`w-full h-11 bg-[#FAFAF9] border pl-9 pr-4 font-mono text-sm text-[#1A1A1A] focus:outline-none focus:bg-white transition-all shadow-inner ${
											confirm && !passwordsMatch
												? "border-red-300 focus:border-red-500"
												: "border-[#D1D1D1] focus:border-[#1A1A1A]"
										}`}
										placeholder="Re-enter key..."
									/>
								</div>
							</div>
						</div>

						{/* Error Message */}
						{error && (
							<div className="flex items-center gap-2 p-3 mb-4 text-red-700 border border-red-200 bg-red-50">
								<ShieldAlert size={14} />
								<span className="font-mono text-xs">{error}</span>
							</div>
						)}

						{/* Submit Action */}
						<button
							type="submit"
							disabled={!passwordsMatch || password.length < 8 || loading || !token}
							className={`w-full h-12 mt-4 font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all border ${
								!passwordsMatch || password.length < 8 || !token
									? "bg-[#F3F2EE] text-[#CCC] border-[#E5E5E5] cursor-not-allowed"
									: "bg-[#1A1A1A] text-white border-[#1A1A1A] hover:bg-white hover:text-[#1A1A1A] shadow-sm"
							}`}
						>
							{loading ? (
								<div className="flex items-center gap-2">
									<RefreshCw size={14} className="animate-spin" /> UPDATING...
								</div>
							) : (
								<>
									Reset Password <ArrowLeft size={14} className="rotate-180" />
								</>
							)}
						</button>
					</form>
				)}
			</div>

			{/* Footer Status */}
			<div className="bg-[#FAFAF9] border-t border-[#E5E5E5] p-3 text-center">
				<Link
					href="/login"
					className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-[#888] hover:text-[#1A1A1A] uppercase tracking-wide"
				>
					<ArrowLeft size={10} /> Back to Login
				</Link>
			</div>
		</div>
	);
}

export default function ResetPasswordPage() {
	return (
		<div className="min-h-screen bg-[#F3F2EE] flex flex-col items-center justify-center font-sans relative overflow-hidden text-[#1A1A1A]">
			{/* Background Tech Texture */}
			<div
				className="absolute inset-0 z-0 opacity-[0.03]"
				style={{
					backgroundImage: "radial-gradient(#1A1A1A 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			/>

			{/* Top Branding */}
			<div className="absolute z-10 flex items-center gap-2 top-8 left-8">
				<Link href="/" className="flex items-center gap-2">
					<LogoIcon size="md" showSubtitle />
				</Link>
			</div>

			{/* Main Console */}
			<motion.div
				initial={{ opacity: 0, scale: 0.98 }}
				animate={{ opacity: 1, scale: 1 }}
				className="relative z-10 w-full max-w-[440px] px-4"
			>
				<Suspense
					fallback={
						<div className="bg-white border border-[#D1D1D1] shadow-2xl p-8">
							<div className="flex justify-center">
								<RefreshCw size={24} className="animate-spin text-[#888]" />
							</div>
						</div>
					}
				>
					<ResetPasswordForm />
				</Suspense>
			</motion.div>
		</div>
	);
}
