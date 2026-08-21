"use client";

import { Activity, ArrowRight, BarChart3, Globe, Lock, Mail, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth-client";
import { useConfig } from "@/lib/config-context";

export default function LoginPage() {
	const router = useRouter();
	const { isSelfHosted } = useConfig();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError("");
		setLoading(true);

		try {
			const result = await signIn.email({ email, password });
			if (result.error) {
				setError(result.error.message || "Login failed");
			} else {
				router.push("/dashboard");
				router.refresh();
			}
		} catch {
			setError("Login failed");
		} finally {
			setLoading(false);
		}
	};

	const handleOAuth = async (provider: "google" | "github") => {
		// For cloud users, redirect to choose-plan after OAuth (handles both new signups and existing users without a plan)
		// The authenticated-layout will redirect to dashboard if they already have a plan
		const callbackPath = isSelfHosted ? "/" : "/choose-plan";
		await signIn.social({ provider, callbackURL: `${window.location.origin}${callbackPath}` });
	};

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE] flex">
			{/* --- Left: Login Form --- */}
			<div className="w-full lg:w-1/2 flex flex-col justify-between p-8 md:p-16 lg:p-24 border-r border-[#D1D1D1] bg-white">
				{/* Logo / Header */}
				<div>
					<a href="/" className="inline-flex items-center gap-2 mb-12 group">
						<LogoIcon size="md" />
					</a>

					<h1 className="mb-4 text-4xl font-medium tracking-tight md:text-5xl">Welcome back.</h1>
					<p className="text-[#666] mb-8">Enter your credentials to access your workspace.</p>
				</div>

				{/* Form */}
				<div className="w-full max-w-md space-y-6">
					{/* Social Auth */}
					<div className="grid grid-cols-2 gap-3">
						<button
							type="button"
							onClick={() => handleOAuth("google")}
							className="flex items-center justify-center gap-3 bg-white border border-[#D1D1D1] p-4 text-sm font-bold uppercase tracking-widest hover:bg-[#F9F9F9] hover:border-[#1A1A1A] transition-colors group"
						>
							<svg className="w-5 h-5" viewBox="0 0 24 24">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
							Google
						</button>
						<button
							type="button"
							onClick={() => handleOAuth("github")}
							className="flex items-center justify-center gap-3 bg-white border border-[#D1D1D1] p-4 text-sm font-bold uppercase tracking-widest hover:bg-[#F9F9F9] hover:border-[#1A1A1A] transition-colors group"
						>
							<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
							</svg>
							GitHub
						</button>
					</div>

					<div className="relative flex items-center gap-4 py-2">
						<div className="h-px bg-[#D1D1D1] flex-1" />
						<span className="text-[10px] font-mono uppercase text-[#AAA]">Or login with email</span>
						<div className="h-px bg-[#D1D1D1] flex-1" />
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-1">
							<Label htmlFor="email" className="ml-1">
								Work Email
							</Label>
							<div className="relative">
								<Mail className="absolute left-4 top-4 text-[#AAA] z-10" size={16} />
								<Input
									id="email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="jane@company.com"
									className="pl-12"
									required
								/>
							</div>
						</div>

						<div className="space-y-1">
							<div className="flex items-center justify-between ml-1">
								<Label htmlFor="password">Password</Label>
								<a
									href="/forgot-password"
									className="text-[10px] font-mono uppercase text-foreground underline decoration-1 hover:text-[#555]"
								>
									Forgot Password?
								</a>
							</div>
							<div className="relative">
								<Lock className="absolute left-4 top-4 text-[#AAA] z-10" size={16} />
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder="••••••••"
									className="pl-12"
									required
								/>
							</div>
						</div>

						{error && (
							<div className="p-3 text-sm text-red-600 border border-red-200 bg-red-50">
								{error}
							</div>
						)}

						<Button variant="primary" type="submit" size="xl" disabled={loading} className="w-full">
							{loading ? "Logging in..." : "Log In"} <ArrowRight size={14} />
						</Button>
					</form>
				</div>

				{/* Footer Text */}
				<div className="text-xs text-[#888]">
					Don&apos;t have an account?{" "}
					<a
						href="/signup"
						className="font-bold underline text-foreground decoration-2 underline-offset-4"
					>
						Sign up
					</a>
				</div>
			</div>

			{/* --- Right: Status Visual (Hidden on mobile) --- */}
			<div className="hidden lg:flex w-1/2 bg-[#EAE9E5] flex-col justify-center p-24 relative overflow-hidden">
				{/* Abstract Background Grid */}
				<div
					className="absolute inset-0 pointer-events-none opacity-10"
					style={{
						backgroundImage:
							"linear-gradient(#AAA 1px, transparent 1px), linear-gradient(90deg, #AAA 1px, transparent 1px)",
						backgroundSize: "40px 40px",
					}}
				/>

				<div className="relative z-10 max-w-lg">
					{/* Floating Status Card */}
					<div className="bg-white border border-[#D1D1D1] p-8 shadow-2xl relative mb-12">
						<div className="flex justify-between items-center border-b border-[#F3F2EE] pb-4 mb-6">
							<div className="flex items-center gap-2">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
								<span className="font-mono text-xs uppercase tracking-widest text-[#555]">
									Systems Operational
								</span>
							</div>
							<Activity size={16} className="text-[#CCC]" />
						</div>

						<div className="space-y-6">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-[#F3F2EE] rounded-full flex items-center justify-center border border-[#E5E5E5]">
										<Zap size={14} className="text-foreground" />
									</div>
									<div>
										<div className="text-sm font-bold">Auto-Resolution</div>
										<div className="text-[10px] text-[#888] font-mono">Avg across customers</div>
									</div>
								</div>
								<div className="font-mono text-sm text-green-600">85%+</div>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-[#F3F2EE] rounded-full flex items-center justify-center border border-[#E5E5E5]">
										<Globe size={14} className="text-foreground" />
									</div>
									<div>
										<div className="text-sm font-bold">Languages</div>
										<div className="text-[10px] text-[#888] font-mono">Supported</div>
									</div>
								</div>
								<div className="font-mono text-sm">50+</div>
							</div>

							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div className="w-8 h-8 bg-[#F3F2EE] rounded-full flex items-center justify-center border border-[#E5E5E5]">
										<BarChart3 size={14} className="text-foreground" />
									</div>
									<div>
										<div className="text-sm font-bold">Response</div>
										<div className="text-[10px] text-[#888] font-mono">First reply</div>
									</div>
								</div>
								<div className="font-mono text-sm text-green-600">&lt;1s</div>
							</div>
						</div>
					</div>

					<div>
						<h2 className="mb-4 text-3xl font-medium">Monitor your autonomy.</h2>
						<p className="text-[#666] leading-relaxed max-w-sm">
							Log in to view real-time deflection rates, manage agent handoffs, and fine-tune your
							AI models.
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
