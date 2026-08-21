"use client";

import { Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getConfig } from "@/lib/runtime-config";
import { Title } from "../ui/title";

export function DevelopersCTA() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";
	return (
		<section className="bg-[#1A1A1A] text-[#F3F2EE] py-32 text-center relative overflow-hidden">
			<div className="relative z-10">
				<div className="inline-flex items-center gap-2 text-green-400 font-mono text-xs mb-6 border border-[#333] px-3 py-1 rounded-full bg-[#111]">
					<Zap size={12} />
					<span>FREE TIER AVAILABLE</span>
				</div>
				<Title tag="h2" size="h2" className="mb-8">
					Start building <br /> for free.
				</Title>
				<div className="flex justify-center gap-6">
					<Button
						type="button"
						variant="default"
						className="bg-white text-black px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#CCC] transition-colors w-auto h-auto"
						asChild
					>
						<Link href="/api-keys">Get API Keys</Link>
					</Button>
					<Button
						type="button"
						variant="outline"
						className="bg-transparent border border-[#555] px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#333] transition-colors w-auto h-auto"
						asChild
					>
						<Link href={docsUrl}>Read Documentation</Link>
					</Button>
				</div>
			</div>

			{/* Abstract Grid Background */}
			<div
				className="absolute inset-0 opacity-10"
				style={{
					backgroundImage:
						"linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)",
					backgroundSize: "40px 40px",
				}}
			/>
		</section>
	);
}
