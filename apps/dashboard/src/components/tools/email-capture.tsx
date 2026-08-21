"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface EmailCaptureProps {
	ctaText: string;
	ctaHref?: string;
}

export function EmailCapture({ ctaText, ctaHref = "/signup" }: EmailCaptureProps) {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!email) return;
		// For now, redirect to signup with email prefilled
		window.location.href = `${ctaHref}?email=${encodeURIComponent(email)}`;
		setSubmitted(true);
	}

	if (submitted) {
		return (
			<div className="bg-[#1A1A1A] text-white p-6 text-center">
				<p className="text-sm font-mono uppercase tracking-widest">Redirecting...</p>
			</div>
		);
	}

	return (
		<div className="bg-[#1A1A1A] text-white p-8 mt-12">
			<div className="flex flex-col items-center gap-6 text-center">
				<p className="text-xs font-mono uppercase tracking-widest text-[#888]">Get started</p>
				<h3 className="text-2xl md:text-3xl font-medium tracking-tight">{ctaText}</h3>
				<form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
					<input
						type="email"
						placeholder="you@company.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						className="flex-1 px-4 py-3 bg-transparent border border-[#555] text-white text-sm font-mono placeholder:text-[#666] focus:outline-none focus:border-white transition-colors"
						required
					/>
					<button
						type="submit"
						className="px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform inline-flex items-center gap-2 justify-center"
					>
						Start Free <ArrowUpRight size={14} />
					</button>
				</form>
				<p className="text-[10px] text-[#666] font-mono">
					No credit card required. Free plan available.
				</p>
			</div>
		</div>
	);
}

export function ToolCTA({ text, href = "/signup" }: { text: string; href?: string }) {
	return (
		<Link
			href={href}
			className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)]"
		>
			{text} <ArrowUpRight size={14} />
		</Link>
	);
}
