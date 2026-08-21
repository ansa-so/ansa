"use client";

import { motion } from "framer-motion";
import {
	AlertTriangle,
	ArrowLeft,
	Database,
	Home,
	ServerCrash,
	Terminal,
	Unplug,
} from "lucide-react";
import Link from "next/link";
import { LogoIcon } from "@/components/logo-icon";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { getConfig } from "@/lib/runtime-config";

export default function NotFoundPage() {
	// Fake technical data for the terminal look
	const timestamp = new Date().toISOString();
	const path = typeof window !== "undefined" ? window.location.pathname : "/unknown/path";
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div className="min-h-screen bg-[#F3F2EE] text-[#1A1A1A] font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE] overflow-x-hidden flex flex-col">
			{/* --- Simple Nav --- */}
			<nav className="w-full z-40 bg-[#F3F2EE]/90 backdrop-blur-sm border-b border-[#D1D1D1] h-16 px-4 md:px-8 flex items-center justify-between">
				<div className="flex items-center gap-2">
					<LogoIcon size="sm" />
					<span className="font-mono text-[10px] bg-[#EAE9E5] border border-[#D1D1D1] px-2 py-0.5 rounded-full uppercase text-[#555]">
						System Error
					</span>
				</div>
				<Link
					href="/"
					className="font-mono text-xs uppercase tracking-widest hover:text-[#555] flex items-center gap-2"
				>
					<ArrowLeft size={14} /> Return Home
				</Link>
			</nav>

			<main className="flex items-center justify-center flex-1 p-4 md:p-8">
				<div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center border border-[#D1D1D1] bg-white p-8 md:p-16 shadow-[20px_20px_0px_0px_rgba(26,26,26,0.05)] relative overflow-hidden">
					{/* Background Tech Pattern */}
					<div
						className="absolute inset-0 pointer-events-none opacity-10"
						style={{
							backgroundImage:
								"linear-gradient(#D1D1D1 1px, transparent 1px), linear-gradient(90deg, #D1D1D1 1px, transparent 1px)",
							backgroundSize: "40px 40px",
						}}
					/>

					{/* Left Column: Text & Terminal */}
					<div className="relative z-10">
						<div className="inline-flex items-center gap-2 px-3 py-1 mb-6 font-mono text-xs tracking-widest text-red-600 uppercase border border-red-200 bg-red-50 animate-pulse">
							<AlertTriangle size={12} />
							<span>Critical Failure</span>
						</div>

						<Title size="h1" tag="h1" className="font-mono">
							404.
							<br />
							Lost.
						</Title>
						<Text size="subtitle" className="mb-12">
							The requested resource could not be located in the knowledge graph. The link may be
							broken or the page has been removed.
						</Text>

						{/* "Terminal" Error Log Box */}
						<div className="bg-[#1A1A1A] text-[#F3F2EE] p-6 font-mono text-xs border-t-4 border-red-500 shadow-xl mb-12 relative overflow-hidden">
							<div className="flex items-center gap-2 mb-4 text-[#888] uppercase tracking-widest border-b border-[#333] pb-2">
								<Terminal size={12} /> System Log Output
							</div>
							<div className="space-y-2">
								<div>
									<span className="text-red-400">ERROR:</span> 404_NOT_FOUND
								</div>
								<div>
									<span className="text-purple-300">REQUEST_URI:</span> "{path}"
								</div>
								<div>
									<span className="text-blue-300">TIMESTAMP:</span> {timestamp}
								</div>
								<div>
									<span className="text-yellow-300">STATUS:</span> ORPHANED_NODE_EXCEPTION
								</div>
								<div className="text-[#555] mt-2">
									{"// Initiating recovery protocol... failed."}
								</div>
							</div>
							{/* Scanline effect */}
							<div
								className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-full w-full pointer-events-none animate-[scan_4s_linear_infinite]"
								style={{ backgroundSize: "100% 4px" }}
							/>
						</div>

						{/* Recovery CTAs */}
						<div className="flex flex-col gap-4 sm:flex-row">
							<Button variant="default" asChild size="xl">
								<Link href="/">
									<Home size={16} /> Return to Dashboard
								</Link>
							</Button>
							<Button variant="outline" asChild size="xl">
								<Link href={docsUrl}>View Documentation</Link>
							</Button>
						</div>
					</div>

					{/* Right Column: Abstract Broken System Visual */}
					<div className="relative z-10 hidden lg:flex items-center justify-center h-full min-h-[400px]">
						<div className="relative w-full max-w-md aspect-square">
							{/* Central Broken Connection */}
							<motion.div
								initial={{ opacity: 0, scale: 0.9 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.8 }}
								className="absolute z-20 flex flex-col items-center text-red-500 -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2"
							>
								<div className="relative">
									<Unplug size={64} strokeWidth={1.5} />
									<motion.div
										animate={{ opacity: [0, 1, 0] }}
										transition={{ duration: 2, repeat: Infinity }}
										className="absolute top-0 left-0 w-full h-full bg-red-500 blur-xl opacity-20 -z-10"
									/>
								</div>
								<span className="px-2 py-1 mt-4 font-mono text-xs tracking-widest uppercase border border-red-200 bg-red-50">
									Connection Severed
								</span>
							</motion.div>

							{/* Floating disconnected Nodes */}
							<div className="absolute top-0 left-0 p-6 bg-white border border-[#D1D1D1] shadow-sm flex flex-col items-center text-[#888] opacity-50">
								<Database size={32} strokeWidth={1} className="mb-2" />
								<span className="font-mono text-[10px] uppercase">Origin</span>
							</div>

							<div className="absolute bottom-0 right-0 p-6 bg-white border border-[#D1D1D1] shadow-sm flex flex-col items-center text-[#888] opacity-50">
								<ServerCrash size={32} strokeWidth={1} className="mb-2" />
								<span className="font-mono text-[10px] uppercase">Destination</span>
							</div>

							{/* Broken dash lines connecting them */}
							<svg
								className="absolute inset-0 w-full h-full -z-10"
								xmlns="http://www.w3.org/2000/svg"
							>
								<line
									x1="10%"
									y1="20%"
									x2="40%"
									y2="40%"
									stroke="#D1D1D1"
									strokeWidth="2"
									strokeDasharray="8 8"
								/>
								<line
									x1="60%"
									y1="60%"
									x2="90%"
									y2="80%"
									stroke="#D1D1D1"
									strokeWidth="2"
									strokeDasharray="8 8"
								/>

								{/* "Void" circle in middle */}
								<circle
									cx="50%"
									cy="50%"
									r="40"
									fill="transparent"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
									opacity="0.5"
								/>
							</svg>
						</div>
					</div>
				</div>
			</main>

			{/* Simplified Footer */}
			<footer className="bg-[#F3F2EE] text-[#1A1A1A] py-4 px-8 flex justify-between items-center text-[10px] font-mono border-t border-[#D1D1D1] uppercase tracking-widest text-[#888]">
				<div>© {new Date().getFullYear()} COSMICSTUDIO LLC</div>
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
					System Status: Degraded
				</div>
			</footer>
		</div>
	);
}
