"use client";

import { ArrowRight, Facebook, Globe, Instagram, Mail, Smartphone, Terminal } from "lucide-react";
import Link from "next/link";

const CHANNELS = [
	{
		id: "IO_01",
		name: "Website Chat",
		desc: "Native on-site injection script for direct user interfacing.",
		icon: Globe,
		status: "active" as const,
		version: "v2.4.0",
	},
	{
		id: "IO_03",
		name: "Email Gateway",
		desc: "Async communication layer mimicking human support agents.",
		icon: Mail,
		status: "active" as const,
		version: "v3.0.0",
	},
	{
		id: "IO_05",
		name: "Messenger",
		desc: "Meta ecosystem integration for high-volume handling.",
		icon: Facebook,
		status: "active" as const,
		version: "ALPHA",
	},
	{
		id: "IO_02",
		name: "WhatsApp Business",
		desc: "Encrypted mobile protocol for 1:1 automated recovery.",
		icon: Smartphone,
		status: "pending" as const,
		version: "v1.1.2",
	},
	{
		id: "IO_04",
		name: "Instagram DM",
		desc: "Social signal interception and automated reply logic.",
		icon: Instagram,
		status: "pending" as const,
		version: "BETA",
	},
];

const StatusBadge = ({ status }: { status: string }) => (
	<div
		className={`border px-1.5 py-0.5 flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-wider ${
			status === "active"
				? "border-green-200 bg-green-50 text-green-700"
				: "border-gray-200 bg-gray-50 text-gray-500"
		}`}
	>
		<div
			className={`w-1.5 h-1.5 rounded-full ${status === "active" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
		/>
		{status === "active" ? "ONLINE" : "DEV_BUILD"}
	</div>
);

export function CommunicationGateways() {
	return (
		<div className="mb-20">
			<div className="flex items-end justify-between mb-8 border-b border-[#1A1A1A] pb-4">
				<div>
					<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase mb-2">
						<Terminal size={12} /> System_Architecture {"// Layer_01"}
					</div>
					<h2 className="text-3xl font-medium tracking-tight">Communication Gateways</h2>
				</div>
				<div className="hidden md:block text-[10px] font-mono text-[#555] text-right">
					Total Ports: {CHANNELS.length} <br />
					Active Nodes: {CHANNELS.filter((c) => c.status === "active").length}
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
				{CHANNELS.map((channel) => (
					<div
						key={channel.id}
						className="bg-white border border-[#D1D1D1] hover:border-[#1A1A1A] hover:shadow-[4px_4px_0px_0px_#1A1A1A] transition-all group flex flex-col justify-between min-h-[200px]"
					>
						{/* Header */}
						<div className="p-4 border-b border-[#F3F2EE] flex justify-between items-start">
							<div className="w-8 h-8 bg-[#FAFAF9] border border-[#E5E5E5] flex items-center justify-center text-[#1A1A1A] group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
								<channel.icon size={16} />
							</div>
							<StatusBadge status={channel.status} />
						</div>

						{/* Body */}
						<div className="flex-1 p-4">
							<div className="text-[9px] font-mono text-[#888] mb-1">{channel.id}</div>
							<h3 className="mb-2 text-sm font-bold uppercase">{channel.name}</h3>
							<p className="text-[10px] text-[#555] leading-relaxed">{channel.desc}</p>
						</div>

						{/* Footer / Action */}
						<div className="p-3 bg-[#FAFAF9] border-t border-[#E5E5E5] min-h-[39px]">
							<Link href="/signup" className="cursor-pointer">
								<button
									type="button"
									className="w-full flex items-center justify-between text-[9px] font-bold uppercase hover:underline cursor-pointer"
								>
									<span>{channel.status === "active" ? "Initialize" : ""}</span>
									{channel.status === "active" && <ArrowRight size={10} />}
								</button>
							</Link>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
