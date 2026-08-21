"use client";

import { Code2, Terminal, Webhook } from "lucide-react";
import Link from "next/link";
import { getConfig } from "@/lib/runtime-config";
import { Button } from "../ui/button";

export function DevelopersSection() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<section className="bg-[#1A1A1A] text-[#F3F2EE] border-b border-[#333]">
			<div className="grid grid-cols-1 lg:grid-cols-2 min-h-[600px]">
				{/* Left: Dev Content */}
				<div className="p-12 md:p-24 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-[#333]">
					<div className="inline-flex items-center gap-2 mb-8 font-mono text-xs text-green-400">
						<Terminal size={14} />
						<span>DEVELOPER_MODE: ON</span>
					</div>

					<h2 className="mb-8 text-5xl font-medium tracking-tight md:text-6xl">
						Built for <br /> Builders.
					</h2>
					<p className="text-lg text-[#888] leading-relaxed mb-12 max-w-md">
						Integrate via REST API, send form data via Webhooks, and embed with our JavaScript SDK.
						Build custom workflows with HTTP tools to connect any external API.
					</p>

					<div className="grid grid-cols-2 gap-8">
						<div>
							<div className="flex items-center gap-2 mb-2 text-lg font-bold text-white">
								<Webhook size={18} /> Webhooks
							</div>
							<p className="text-sm text-[#666]">Form submission webhooks.</p>
						</div>
						<div>
							<div className="flex items-center gap-2 mb-2 text-lg font-bold text-white">
								<Code2 size={18} /> Widget SDK
							</div>
							<p className="text-sm text-[#666]">JavaScript embed SDK.</p>
						</div>
					</div>

					<div className="mt-12">
						<Button
							variant="outline"
							size="xl"
							className="border-[#555] hover:border-white"
							asChild
						>
							<Link href={docsUrl}>Read API Docs</Link>
						</Button>
					</div>
				</div>

				{/* Right: Code Block Visual */}
				<div className="bg-[#0D0D0D] p-12 md:p-24 flex items-center justify-center font-mono text-xs overflow-hidden">
					<div className="w-full max-w-lg bg-[#151515] border border-[#333] rounded-lg shadow-2xl p-6 relative">
						<div className="flex gap-2 mb-6 border-b border-[#333] pb-4">
							<div className="flex items-center justify-center w-3 h-3 text-red-500 rounded-full bg-red-500/20">
								●
							</div>
							<div className="flex items-center justify-center w-3 h-3 text-yellow-500 rounded-full bg-yellow-500/20">
								●
							</div>
							<div className="flex items-center justify-center w-3 h-3 text-green-500 rounded-full bg-green-500/20">
								●
							</div>
						</div>

						<div className="space-y-2 text-[#CCC]">
							<div>
								<span className="text-neutral-700">1 </span>
								<span className="text-purple-400">import</span> {"{"} Ansa {"}"}{" "}
								<span className="text-purple-400">from</span>{" "}
								<span className="text-green-400">&apos;@ansa-so/sdk&apos;</span>;
							</div>
							<div>
								<span className="text-neutral-700">2 </span>
							</div>
							<div>
								<span className="text-neutral-700">3 </span>
								<span className="text-purple-400">const</span> ansa ={" "}
								<span className="text-purple-400">new</span>{" "}
								<span className="text-yellow-400">Ansa</span>({"{"}
							</div>
							<div>
								<span className="text-neutral-700">4 </span> apiKey: process.env.
								<span className="text-blue-400">ANSA_API_KEY</span>,
							</div>
							<div>
								<span className="text-neutral-700">5 </span>
								{"}"});
							</div>
							<div>
								<span className="text-neutral-700">6 </span>
							</div>
							<div>
								<span className="text-neutral-700">7 </span>
								<span className="text-neutral-500">{"// Start a conversation"}</span>
							</div>
							<div>
								<span className="text-neutral-700">8 </span>
								<span className="text-purple-400">const</span> response ={" "}
								<span className="text-purple-400">await</span> ansa.
								<span className="text-yellow-400">chat</span>({"{"}
							</div>
							<div>
								<span className="text-neutral-700">9 </span> agentId:{" "}
								<span className="text-green-400">&apos;agent_abc123&apos;</span>,
							</div>
							<div>
								<span className="text-neutral-700">10 </span> message:{" "}
								<span className="text-green-400">&apos;Hello!&apos;</span>,
							</div>
							<div>
								<span className="text-neutral-700">11 </span>
								{"}"});
							</div>
							<div>
								<span className="text-neutral-700">12 </span>
							</div>
							<div>
								<span className="text-neutral-700">13 </span>console.
								<span className="text-yellow-400">log</span>(response.message);
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
