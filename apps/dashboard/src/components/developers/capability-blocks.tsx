"use client";

import { Globe, Webhook, Zap } from "lucide-react";

const webhookStatuses = ["pending", "webhook_success", "webhook_failed", "retrying..."];

export function CapabilityBlocks() {
	return (
		<section className="grid grid-cols-1 lg:grid-cols-3 border-t border-[#D1D1D1]">
			{/* Block 1: Webhooks */}
			<div className="p-12 md:p-24 border-b lg:border-b-0 lg:border-r border-[#D1D1D1] bg-[#EAE9E5]">
				<Webhook size={48} className="mb-8 text-foreground" strokeWidth={1} />
				<h3 className="mb-6 text-3xl font-medium">Form Webhooks.</h3>
				<p className="text-[#555] mb-12 max-w-md leading-relaxed">
					Receive form submissions in real-time via HTTP POST. Configure multiple webhooks, Slack
					notifications, and email alerts. Automatic retries with exponential backoff.
				</p>

				<div className="space-y-2 font-mono text-xs">
					{webhookStatuses.map((status, idx) => (
						<div
							key={status}
							className="flex items-center justify-between border-b border-[#D1D1D1] pb-2 text-[#444]"
						>
							<span>{status}</span>
							<div
								className={`w-1.5 h-1.5 rounded-full ${idx === 1 ? "bg-green-500" : idx === 2 ? "bg-red-500" : idx === 3 ? "bg-yellow-500" : "bg-gray-400"}`}
							/>
						</div>
					))}
				</div>
			</div>

			{/* Block 2: Embeddable UI */}
			<div className="p-12 bg-white md:p-24">
				<Globe size={48} className="mb-8 text-foreground" strokeWidth={1} />
				<h3 className="mb-6 text-3xl font-medium">Headless or Hosted.</h3>
				<p className="text-[#555] mb-12 max-w-md leading-relaxed">
					Use our REST API to build a custom chat UI, or drop in our JavaScript widget for instant
					deployment. Control programmatically via the window API.
				</p>

				<div className="bg-[#1A1A1A] p-6 text-[#F3F2EE] font-mono text-xs rounded-lg shadow-xl">
					<div className="mb-2 text-gray-500">{"<!-- Embed Widget -->"}</div>
					<div className="mb-4">
						<span className="text-blue-400">&lt;script</span>{" "}
						<span className="text-yellow-400">src</span>=
						<span className="text-green-400">
							&quot;https://cdn.ansa.so/embed.js?agentId=...&quot;
						</span>
						<span className="text-blue-400">&gt;&lt;/script&gt;</span>
					</div>
					<div className="mb-2 text-gray-500">{"// Control Widget"}</div>
					<div className="text-purple-400">ansa.open();</div>
					<div className="text-purple-400">
						ansa.identify({"{"} userId: ... {"}"});
					</div>
					<div className="text-purple-400">ansa.showForm(form);</div>
				</div>
			</div>

			{/* Block 3: Tools & Automation */}
			<div className="p-12 md:p-24 bg-[#EAE9E5]">
				<Zap size={48} className="mb-8 text-foreground" strokeWidth={1} />
				<h3 className="mb-6 text-3xl font-medium">Tools & Automation.</h3>
				<p className="text-[#555] mb-12 max-w-md leading-relaxed">
					Connect any external API with HTTP tools. Trigger workflows based on user behavior, time,
					or custom events. Build sophisticated automations without code.
				</p>

				<div className="bg-[#1A1A1A] p-6 text-[#F3F2EE] font-mono text-xs rounded-lg shadow-xl">
					<div className="mb-2 text-purple-400">{"// HTTP Tool Example"}</div>
					<div className="mb-4 text-[#888]">POST /tools/http</div>
					<div className="text-blue-400">{"{"}</div>
					<div className="pl-4">
						<span className="text-yellow-400">"url"</span>:{" "}
						<span className="text-green-400">"https://api.stripe.com"</span>,
					</div>
					<div className="pl-4">
						<span className="text-yellow-400">"method"</span>:{" "}
						<span className="text-green-400">"POST"</span>,
					</div>
					<div className="pl-4">
						<span className="text-yellow-400">"trigger"</span>:{" "}
						<span className="text-green-400">"exit_intent"</span>
					</div>
					<div className="text-blue-400">{"}"}</div>
				</div>
			</div>
		</section>
	);
}
