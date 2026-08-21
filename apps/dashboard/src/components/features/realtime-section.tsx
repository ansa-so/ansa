"use client";

import { Radio, Users, Zap } from "lucide-react";

export function RealtimeSection() {
	return (
		<section id="realtime" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Real-Time</h2>
				<span className="font-mono text-xs text-[#888]">[02]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: WebSocket Live Sync */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Zap size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">WebSocket Live Sync</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Instant message delivery with sub-100ms latency. No polling, no delays—just real-time
						conversations that feel natural.
					</p>

					{/* Live Sync Visual */}
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-xs font-mono text-[#888]">CONNECTION</span>
							<span className="flex items-center gap-2 text-xs font-mono text-green-600">
								<span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
								LIVE
							</span>
						</div>
						<div className="border-t border-[#D1D1D1] pt-3 space-y-2">
							<div className="flex justify-between text-xs">
								<span className="text-[#666]">Latency</span>
								<span className="font-mono text-[#1A1A1A]">47ms</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-[#666]">Messages/sec</span>
								<span className="font-mono text-[#1A1A1A]">∞</span>
							</div>
							<div className="flex justify-between text-xs">
								<span className="text-[#666]">Reconnection</span>
								<span className="font-mono text-green-600">AUTO</span>
							</div>
						</div>
					</div>
				</div>

				{/* Feature Card 2: Typing & Presence */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Users size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Typing & Presence</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						See who&apos;s viewing conversations in real-time. Typing indicators show when AI or
						agents are composing responses.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-3">
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
								AI
							</div>
							<div className="flex-1">
								<div className="text-sm font-medium">Ansa is typing</div>
								<div className="flex gap-1 mt-1">
									<span
										className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce"
										style={{ animationDelay: "0ms" }}
									/>
									<span
										className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce"
										style={{ animationDelay: "150ms" }}
									/>
									<span
										className="w-1.5 h-1.5 bg-[#888] rounded-full animate-bounce"
										style={{ animationDelay: "300ms" }}
									/>
								</div>
							</div>
						</div>
						<div className="border-t border-[#D1D1D1] pt-3">
							<div className="text-[10px] font-mono text-[#888] flex items-center gap-2">
								<Radio size={12} className="text-green-500" />
								<span>2 agents viewing this conversation</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Streaming Response Banner */}
			<div className="bg-[#1A1A1A] text-white p-8 md:p-12 mt-px border border-[#D1D1D1] flex flex-col md:flex-row items-center justify-between gap-8">
				<div>
					<h4 className="mb-2 text-lg font-bold">Streaming AI Responses</h4>
					<p className="text-sm text-[#888]">
						Watch AI responses appear word-by-word. No waiting for complete responses—customers stay
						engaged while the AI thinks.
					</p>
				</div>
				<div className="bg-[#0A0A0A] border border-[#333] px-6 py-4 font-mono text-sm flex items-center gap-3 min-w-[280px]">
					<span className="text-green-400">▶</span>
					<span className="text-white">Streaming response</span>
					<span className="w-2 h-4 bg-white animate-pulse" />
				</div>
			</div>
		</section>
	);
}
