"use client";

import { motion } from "framer-motion";
import {
	Bot,
	Calendar,
	CreditCard,
	LayoutGrid,
	Mail,
	MessageSquare,
	ShoppingBag,
	Slack,
	Zap,
} from "lucide-react";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

export function FeatureTools() {
	return (
		<section className="px-4 md:px-8 max-w-[1800px] mx-auto mb-10 md:mb-48">
			<div className="grid items-center grid-cols-1 gap-10 md:gap-24 lg:grid-cols-2">
				{/* Visual Side */}
				<div className="relative order-2 lg:order-1">
					{/* Glow */}
					<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[90%] bg-gradient-to-br from-stone-200 via-blue-100 to-orange-100 blur-[100px] opacity-60 pointer-events-none" />

					{/* Floating UI Elements */}
					<motion.div
						whileHover={{ y: -5, rotateZ: -1 }}
						transition={{ type: "spring", stiffness: 300, damping: 20 }}
						className="relative z-10 flex flex-col gap-4"
					>
						<div className="w-full h-full bg-[#F3F2EE] min-h-[350px] flex items-center justify-center relative overflow-hidden border border-[#D1D1D1] shadow-sm">
							{/* Background Grid */}
							<div
								className="absolute inset-0 pointer-events-none opacity-10"
								style={{
									backgroundImage:
										"linear-gradient(#1A1A1A 1px, transparent 1px), linear-gradient(90deg, #1A1A1A 1px, transparent 1px)",
									backgroundSize: "40px 40px",
								}}
							/>

							{/* Connecting Lines (SVG) */}
							<svg className="absolute inset-0 z-0 w-full h-full pointer-events-none">
								<line
									x1="50%"
									y1="50%"
									x2="20%"
									y2="25%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
								<line
									x1="50%"
									y1="50%"
									x2="80%"
									y2="25%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
								<line
									x1="50%"
									y1="50%"
									x2="20%"
									y2="75%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
								<line
									x1="50%"
									y1="50%"
									x2="80%"
									y2="75%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
								<line
									x1="50%"
									y1="50%"
									x2="50%"
									y2="15%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
								<line
									x1="50%"
									y1="50%"
									x2="50%"
									y2="85%"
									stroke="#D1D1D1"
									strokeWidth="1"
									strokeDasharray="4 4"
								/>
							</svg>

							{/* Central Agent Node */}
							<div className="relative z-20 flex flex-col items-center cursor-default group">
								<div className="w-20 h-20 bg-[#1A1A1A] text-white flex items-center justify-center shadow-xl border border-[#333] z-20">
									<Bot size={40} strokeWidth={1.5} />
								</div>
								<div className="bg-white border border-[#D1D1D1] px-3 py-1 mt-3 shadow-sm z-20 group-hover:border-[#1A1A1A] transition-colors">
									<span className="font-mono text-[10px] uppercase tracking-widest font-bold text-[#1A1A1A]">
										Ansa Core
									</span>
								</div>
								{/* Pulse Effect */}
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#1A1A1A] rounded-full opacity-5 animate-ping z-10" />
							</div>

							{/* Orbiting Tool Nodes */}
							{/* Slack (Top Left) */}
							<div className="absolute top-[15%] left-[15%] flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<Slack size={20} className="text-[#1A1A1A]" />
							</div>

							{/* Shopify (Top Right) */}
							<div className="absolute top-[15%] right-[15%] flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<ShoppingBag size={20} className="text-[#1A1A1A]" />
							</div>

							{/* Stripe (Bottom Left) */}
							<div className="absolute bottom-[15%] left-[15%] flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<CreditCard size={20} className="text-[#1A1A1A]" />
							</div>

							{/* Zendesk (Bottom Right) */}
							<div className="absolute bottom-[15%] right-[15%] flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<MessageSquare size={20} className="text-[#1A1A1A]" />
							</div>

							{/* Calendar (Top Center) */}
							<div className="absolute top-[8%] left-1/2 -translate-x-1/2 flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<Calendar size={20} className="text-[#1A1A1A]" />
							</div>

							{/* Mail (Bottom Center) */}
							<div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 flex flex-col items-center bg-white border border-[#D1D1D1] p-3 shadow-sm z-10 hover:border-[#1A1A1A] transition-colors hover:scale-110 duration-200 cursor-pointer">
								<Mail size={20} className="text-[#1A1A1A]" />
							</div>
						</div>
					</motion.div>
				</div>

				{/* Text Side */}
				<div className="order-1 lg:order-2">
					<h3 className="font-mono text-xs text-[#888] uppercase tracking-widest mb-2 md:mb-6">
						{"/// Action Platform"}
					</h3>
					<Title tag="h2" size="h3">
						Connect Your Tools.
					</Title>
					<Text size="subtitle" className="max-w-md mb-12">
						Move beyond simple Q&A. Ansa integrates directly with your stack to perform real-world
						actions on behalf of your customers.
					</Text>
					<ul className="space-y-3">
						<li className="flex items-start gap-3">
							<Slack size={18} className="text-[#1A1A1A] shrink-0 mt-1" />
							<span>
								Give AI superpowers with native integrations for Slack, Shopify, and more.
							</span>
						</li>
						<li className="flex items-start gap-3">
							<LayoutGrid size={18} className="text-[#1A1A1A] shrink-0 mt-1" />
							<span>Collect info via forms, book meetings, and process payments seamlessly.</span>
						</li>
						<li className="flex items-start gap-3">
							<Zap size={18} className="text-[#1A1A1A] shrink-0 mt-1" />
							<span>
								AI takes action, not just answers questions, enabling full-cycle automation.
							</span>
						</li>
					</ul>
					<div className="grid grid-cols-2 gap-6 mt-12 font-mono text-sm">
						<div className="border-l-2 border-[#D1D1D1] pl-4">
							<div className="mb-1 text-3xl font-bold">50+</div>
							<div className="text-[#888] text-[10px] uppercase">Existing Tools</div>
						</div>
						<div className="border-l-2 border-[#D1D1D1] pl-4">
							<div className="mb-1 text-3xl font-bold">+300</div>
							<div className="text-[#888] text-[10px] uppercase">Installations</div>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
