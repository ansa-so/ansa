"use client";

import { Globe, Mail, MessageCircle, Zap } from "lucide-react";

export function MultiChannelSection() {
	return (
		<section id="multichannel" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Multi-Channel</h2>
				<span className="font-mono text-xs text-[#888]">[08]</span>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{/* Feature Card 1: Omnichannel Deployment */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Globe size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">One AI, Everywhere</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Meet customers where they are. Deploy your AI across web, mobile, Slack, email, and
						more—all from one platform.
					</p>

					<div className="grid grid-cols-2 gap-2">
						{[
							{ name: "Website Widget", available: true },
							{ name: "Iframe", available: true },
							{ name: "Email", available: true },
							{ name: "Slack", available: false },
							{ name: "API", available: false },
							{ name: "SMS", available: false },
							{ name: "WhatsApp", available: false },
							{ name: "Messenger", available: false },
							{ name: "Mobile App", available: false },
						].map((channel) => (
							<div
								key={channel.name}
								className={`px-3 py-2 border border-[#D1D1D1] text-xs font-mono text-center bg-white transition-colors relative group/channel ${
									channel.available ? "hover:bg-[#F3F2EE]" : "opacity-40 cursor-default"
								}`}
							>
								{channel.name}
								{!channel.available && (
									<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[#1A1A1A] text-white text-[10px] rounded opacity-0 group-hover/channel:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
										Coming Soon
									</div>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Feature Card 2: Email Channel */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Mail size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Email Channel</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						AI-powered email support. Automatic replies, intelligent threading, and seamless
						escalation when confidence is low.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						{[
							{ name: "Smart Threading", desc: "By sender, subject, or always new", mode: "AUTO" },
							{ name: "Custom Signatures", desc: "Brand-consistent replies", mode: "ON" },
							{ name: "Domain Allowlist", desc: "Filter spam & control access", mode: "ACTIVE" },
							{ name: "Low Confidence", desc: "Forward to human or escalate", mode: "ROUTE" },
						].map((item) => (
							<div
								key={item.name}
								className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors"
							>
								<div>
									<span className="font-medium">{item.name}</span>
									<span className="text-[#888] ml-2 text-xs hidden sm:inline">{item.desc}</span>
								</div>
								<span className="text-[10px] font-mono text-green-600">{item.mode}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{/* Feature Card 3: Seamless Context */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Zap size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Seamless Context</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Conversations flow naturally across channels. Start on web, continue in Slack, finish
						via email—your AI remembers everything.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 font-mono text-[10px] text-[#888] space-y-2">
						<div className="flex justify-between">
							<span>Customer starts on Website</span>
							<span className="text-blue-500">→ CONTEXT SAVED</span>
						</div>
						<div className="flex justify-between">
							<span>Continues via Email</span>
							<span className="text-green-500">→ HISTORY LOADED</span>
						</div>
						<div className="flex justify-between">
							<span>Resolves in Slack</span>
							<span className="text-purple-500">→ SEAMLESS</span>
						</div>
					</div>
				</div>

				{/* Feature Card 4: Widget Customization */}
				<div className="bg-white p-12 hover:bg-white transition-colors group h-full">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<MessageCircle size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Embeddable Widget</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Drop-in chat widget for any website. Customize colors, position, and behavior to match
						your brand perfectly.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4">
						<div className="flex items-center gap-4 mb-4">
							<div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
							<div>
								<div className="text-sm font-medium">Acme Support</div>
								<div className="text-[10px] text-green-600">● Online</div>
							</div>
						</div>
						<div className="space-y-2 text-[10px] font-mono">
							<div className="flex justify-between text-[#888]">
								<span>Position</span>
								<span className="text-[#1A1A1A]">Bottom Right</span>
							</div>
							<div className="flex justify-between text-[#888]">
								<span>Theme</span>
								<span className="text-[#1A1A1A]">Auto (Light/Dark)</span>
							</div>
							<div className="flex justify-between text-[#888]">
								<span>Mobile</span>
								<span className="text-green-600">RESPONSIVE</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
