"use client";

import { Cpu, HelpCircle, PackageSearch, Truck, Zap } from "lucide-react";
import Link from "next/link";
import { getConfig } from "@/lib/runtime-config";

const TOOLS = [
	{
		id: "MOD_KNB",
		name: "Knowledge Retrieval",
		desc: "Semantic search across brand documentation and policies.",
		icon: HelpCircle,
		type: "SUPPORT",
		docPath: "/agents/knowledge-base",
	},
	{
		id: "MOD_TRK",
		name: "WISMO Automation",
		desc: "Real-time API calls to logistics providers for status updates.",
		icon: Truck,
		type: "LOGISTICS",
		docPath: "/tools/http-tools",
	},
	{
		id: "MOD_REC",
		name: "Product Recommendation Engine",
		desc: "Neural matching of user intent to SKU inventory attributes.",
		icon: PackageSearch,
		type: "SALES",
		docPath: "/integrations/shopify",
	},
	{
		id: "MOD_ENG",
		name: "Proactive Engagement",
		desc: "Heuristic triggers to initiate contact based on user action.",
		icon: Zap,
		type: "BEHAVIOR",
		docPath: "/widget/triggers",
	},
];

export function OperationalModules() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div>
			<div className="flex items-end justify-between mb-8 border-b border-[#1A1A1A] pb-4">
				<div>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mb-2">
						<Cpu size={12} /> System_Architecture {"// Layer_02"}
					</div>
					<h2 className="text-3xl font-medium tracking-tight">Operational Modules</h2>
				</div>
				<div className="hidden md:block text-[10px] font-mono text-[#555] text-right">
					Installed Packages: {TOOLS.length} <br />
					Update Policy: AUTO
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#D1D1D1] bg-white">
				{TOOLS.map((tool, index) => (
					<div
						key={tool.id}
						className={`p-8 border-b md:border-b-0 border-[#D1D1D1] hover:bg-[#FAFAF9] transition-colors group relative ${
							index !== TOOLS.length - 1 ? "md:border-r" : ""
						}`}
					>
						{/* Technical Tag */}
						<div className="absolute top-4 right-4 text-[9px] font-mono border border-[#E5E5E5] px-1.5 py-0.5 text-[#888] uppercase bg-white">
							TYPE: {tool.type}
						</div>

						<div className="mb-6 transition-opacity opacity-40 group-hover:opacity-100">
							<tool.icon size={28} strokeWidth={1.5} />
						</div>

						<h3 className="flex items-center gap-2 mb-2 text-sm font-bold tracking-wide uppercase">
							{tool.name}
						</h3>

						<p className="text-xs text-[#555] leading-relaxed mb-6 font-mono">{tool.desc}</p>

						<Link
							href={`${docsUrl}${tool.docPath}`}
							target="_blank"
							className="flex items-center gap-2 text-[10px] font-bold uppercase group-hover:translate-x-1 transition-transform cursor-pointer"
						>
							<div className="w-1.5 h-1.5 bg-[#1A1A1A]" />
							Read Documentation
						</Link>
					</div>
				))}
			</div>
		</div>
	);
}
