"use client";

import {
	Activity,
	Database,
	GitBranch,
	Globe2,
	MessageSquare,
	Package,
	Search,
	ShoppingCart,
	Terminal,
	Webhook,
	Zap,
} from "lucide-react";
import { getConfig } from "@/lib/runtime-config";

const integrations = [
	{ icon: MessageSquare, name: "Intercom" },
	{ icon: Search, name: "Zendesk" },
	{ icon: Database, name: "Salesforce" },
	{ icon: GitBranch, name: "Linear" },
	{ icon: Activity, name: "Jira" },
	{ icon: Zap, name: "Slack" },
	{ icon: Webhook, name: "Webhooks" },
	{ icon: Terminal, name: "API" },
];

export function IntegrationsSection() {
	return (
		<section id="integrations" className="scroll-mt-32">
			<div className="border-t border-[#1A1A1A] pt-4 mb-8 flex justify-between items-baseline">
				<h2 className="text-4xl font-medium md:text-5xl">Integrations</h2>
				<span className="font-mono text-xs text-[#888]">[03]</span>
			</div>

			{/* Shopify Featured Integration */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#D1D1D1] border border-[#D1D1D1] mb-px">
				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<ShoppingCart size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Shopify Native Integration</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Purpose-built for e-commerce. Instant access to orders, products, and customer data—no
						code required. Your AI becomes a shopping expert.
					</p>
					<div className="grid grid-cols-2 gap-2">
						{[
							"Order Lookup",
							"Product Search",
							"Customer History",
							"Refund Status",
							"Shipping Tracking",
							"Inventory Check",
						].map((feature) => (
							<div
								key={feature}
								className="px-3 py-2 border border-[#D1D1D1] text-xs font-mono text-center bg-white hover:bg-[#F3F2EE] transition-colors"
							>
								{feature}
							</div>
						))}
					</div>
				</div>

				<div className="h-full p-12 transition-colors bg-white hover:bg-white group">
					<div className="w-12 h-12 bg-[#EAE9E5] rounded-full flex items-center justify-center mb-8 group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
						<Package size={20} />
					</div>
					<h3 className="mb-4 text-2xl font-medium">Connect Your Tools</h3>
					<p className="text-[#666] leading-relaxed mb-8">
						Pre-built integrations for the tools you already use. CRMs, helpdesks, project
						management—all connected in minutes.
					</p>
					<div className="bg-white border border-[#D1D1D1] p-4 space-y-2">
						{[
							{ name: "Slack Channels", desc: "Send alerts & notifications", status: "2-WAY" },
							{ name: "Zendesk Tickets", desc: "Sync conversations to tickets", status: "AUTO" },
							{ name: "Salesforce", desc: "Push leads to CRM", status: "SYNC" },
						].map((item) => (
							<div
								key={item.name}
								className="flex items-center justify-between text-sm p-2 hover:bg-[#F3F2EE] transition-colors"
							>
								<div>
									<span className="font-medium">{item.name}</span>
									<span className="text-[#888] ml-2 text-xs">{item.desc}</span>
								</div>
								<span className="text-[10px] font-mono text-green-600">{item.status}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D1D1D1] border-x border-b border-[#D1D1D1]">
				{integrations.map((item) => (
					<div
						key={item.name}
						className="bg-white p-8 md:p-12 flex flex-col items-center justify-center gap-4 hover:bg-[#F3F2EE] transition-colors cursor-default group"
					>
						<item.icon className="w-8 h-8 text-[#CCC] group-hover:text-foreground transition-colors" />
						<span className="font-mono text-xs tracking-widest uppercase">{item.name}</span>
					</div>
				))}
			</div>

			<div className="bg-[#1A1A1A] text-white p-8 md:p-12 mt-px border border-[#D1D1D1] flex flex-col md:flex-row items-center justify-between gap-8">
				<div>
					<h4 className="mb-2 text-lg font-bold">Build Custom Integrations</h4>
					<p className="text-sm text-[#888]">
						Use our REST API and webhooks to connect any internal tool or build custom workflows.
					</p>
				</div>
				<div className="flex gap-4">
					<div className="bg-[#0A0A0A] border border-[#333] px-4 py-2 font-mono text-xs flex items-center gap-2">
						<span className="w-2 h-2 bg-green-500 rounded-full" />
						{getConfig().apiUrl || "api.ansa.so"}
					</div>
					<button
						type="button"
						className="text-xs font-bold underline uppercase decoration-2 underline-offset-4 text-white hover:text-[#888] transition-colors"
					>
						Read Docs
					</button>
				</div>
			</div>
		</section>
	);
}
