"use client";

import { ArrowRight, Key, Terminal } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getConfig } from "@/lib/runtime-config";
import { Text } from "../ui/text";

export function DevelopersHero() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";
	return (
		<div className="flex flex-col justify-between h-full md:pr-12 lg:col-span-5">
			<div>
				<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest">
					<Terminal size={14} />
					<span>v2.1 Stable</span>
				</div>
				<h1 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9]">
					Build with <br />
					<span className="font-serif italic text-[#999]">Intelligence.</span>
				</h1>
				<Text tag="p" size="subtitle" className="mb-12">
					A headless, API-first engine for automated support. Real-time WebSocket connections,
					built-in RAG vector search, multi-model support, and programmable workflows.
				</Text>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<Button variant="primary" className="justify-between group" size="xl" asChild>
					<Link href={docsUrl}>
						Read the Docs{" "}
						<ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
					</Link>
				</Button>
				<Button variant="outline" className="justify-between" size="xl" asChild>
					<Link href="/settings/api-keys">
						Get API Key <Key size={14} />
					</Link>
				</Button>
			</div>
		</div>
	);
}
