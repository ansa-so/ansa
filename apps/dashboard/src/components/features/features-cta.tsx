"use client";

import Link from "next/link";
import { getConfig } from "@/lib/runtime-config";
import { Button } from "../ui/button";
import { Title } from "../ui/title";

export function FeaturesCTA() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<footer className="bg-[#1A1A1A] text-[#F3F2EE] py-32 px-4 text-center border-t border-[#333] mt-32">
			<Title tag="h2" size="h2" className="mb-8">
				Full power.
				<br />
				<span className="text-[#666] font-serif italic">Zero friction.</span>
			</Title>
			<div className="flex flex-col justify-center gap-6 md:flex-row">
				<Button
					type="button"
					variant="default"
					className="bg-white text-black px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#CCC] transition-colors w-auto h-auto"
					asChild
				>
					<Link href="/signup">Start For Free</Link>
				</Button>
				<Button
					type="button"
					variant="outline"
					className="bg-transparent border border-[#555] px-8 py-4 font-bold uppercase tracking-widest text-xs hover:bg-[#333] transition-colors w-auto h-auto"
				>
					<Link href={docsUrl}>View Documentation</Link>
				</Button>
			</div>
		</footer>
	);
}
