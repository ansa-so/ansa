"use client";

import { PageHeader } from "@ansa/ui";
import {
	AlertCircle,
	ArrowRight,
	CheckCircle2,
	Code,
	Copy,
	Layout,
	Maximize,
	Monitor,
	Package,
	ShoppingBag,
	Terminal,
	User,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useAgent } from "@/lib/agent-context";
import { useConfig } from "@/lib/config-context";

// --- COMPONENTS ---

interface ModeCardProps {
	id: string;
	label: string;
	description: string;
	icon: React.ComponentType<{ size?: number }>;
	active: boolean;
	onSelect: (id: string) => void;
}

const ModeCard = ({ id, label, description, icon: Icon, active, onSelect }: ModeCardProps) => (
	<button
		type="button"
		onClick={() => onSelect(id)}
		className={`flex-1 text-left relative border p-5 transition-all flex flex-col gap-3 group ${
			active
				? "bg-white border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,0.1)] z-10"
				: "bg-[#FAFAF9] border-[#D1D1D1] hover:bg-white hover:border-[#888]"
		}`}
	>
		<div
			className={`w-8 h-8 flex items-center justify-center border ${active ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#555] border-[#E5E5E5]"}`}
		>
			<Icon size={16} />
		</div>

		<div>
			<h3
				className={`text-xs font-bold uppercase tracking-wide mb-1 ${active ? "text-[#1A1A1A]" : "text-[#555]"}`}
			>
				{label}
			</h3>
			<p className="text-[10px] text-[#888] font-mono leading-relaxed">{description}</p>
		</div>

		{active && (
			<div className="absolute text-green-600 top-3 right-3">
				<CheckCircle2 size={14} />
			</div>
		)}
	</button>
);

interface CodeBlockProps {
	code: string;
	filename?: string;
}

const CodeBlock = ({ code, filename = "index.html (head)" }: CodeBlockProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = () => {
		navigator.clipboard.writeText(code);
		setCopied(true);
		toast.success("Copied to clipboard");
		setTimeout(() => setCopied(false), 2000);
	};

	const lines = code.split("\n");

	return (
		<div className="bg-[#1A1A1A] border border-[#1A1A1A] shadow-lg overflow-hidden group">
			{/* Terminal Header */}
			<div className="bg-[#2A2A2A] px-3 py-2 flex items-center justify-between border-b border-[#333]">
				<div className="flex gap-1.5">
					<div className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
					<div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
					<div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
				</div>
				<div className="text-[9px] font-mono text-[#888] uppercase">{filename}</div>
			</div>

			{/* Code Area */}
			<div className="relative p-4">
				<pre className="font-mono text-[11px] leading-loose text-[#E5E5E5] overflow-x-auto whitespace-pre-wrap break-all">
					{lines.map((line, i) => (
						<div key={`line-${i}-${line.slice(0, 20)}`}>
							<span className="text-[#555] select-none mr-3">{i + 1}</span>
							<span>{line}</span>
						</div>
					))}
				</pre>

				<button
					type="button"
					onClick={handleCopy}
					className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-[10px] font-bold uppercase backdrop-blur-sm transition-colors flex items-center gap-2 border border-white/10"
				>
					{copied ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
};

export default function EmbedChannelPage() {
	const { currentAgent, isLoading } = useAgent();
	const { widgetUrl, cdnUrl } = useConfig();
	const [embedType, setEmbedType] = useState<"bubble" | "iframe">("bubble");

	// Embed scripts with timestamp for cache-busting
	const timestamp = Date.now();
	const embedScript = `<script src="${cdnUrl}/embed.js?agentId=${currentAgent?.id || ""}&t=${timestamp}" defer></script>`;

	// Iframe embed
	const iframeConfig = {
		agentId: currentAgent?.id || "",
	};

	const iframeSrc = `${widgetUrl}/?mode=inline#config=${encodeURIComponent(JSON.stringify(iframeConfig))}`;
	const iframeEmbed = `<iframe
  src="${iframeSrc}"
  width="100%"
  height="600"
  style="border: none; border-radius: 12px;"
  allow="clipboard-write"
></iframe>`;

	const currentEmbedCode = embedType === "bubble" ? embedScript : iframeEmbed;

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Embed Widget"
					subtitle="Deploy your AI chat widget on any website"
					icon={<Code size={12} />}
				/>
				<div className="p-8 mx-auto space-y-8">
					<Skeleton className="h-32" />
					<Skeleton className="h-64" />
					<Skeleton className="h-40" />
				</div>
			</div>
		);
	}

	if (!currentAgent) {
		return (
			<div className="min-h-screen bg-[#F3F2EE]">
				<PageHeader
					title="Embed Widget"
					subtitle="Deploy your AI chat widget on any website"
					icon={<Code size={12} />}
				/>
				<div className="p-8">
					<Text className="text-muted-foreground">Please create an agent first</Text>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#F3F2EE]">
			<PageHeader
				title="Embed Widget"
				subtitle="Deploy your AI chat widget on any website"
				icon={<Code size={12} />}
			/>

			<div className="p-8 mx-auto space-y-8">
				{/* 1. Injection Mode */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<Layout size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">Injection Architecture</h3>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<ModeCard
							id="bubble"
							label="Overlay Mode (Floating)"
							description="Standard implementation. The widget floats above your content in the bottom-right corner."
							icon={Maximize}
							active={embedType === "bubble"}
							onSelect={(id) => setEmbedType(id as "bubble" | "iframe")}
						/>
						<ModeCard
							id="iframe"
							label="Inline Component (Embedded)"
							description="Embeds the chat interface directly into a specific container on your page."
							icon={Monitor}
							active={embedType === "iframe"}
							onSelect={(id) => setEmbedType(id as "bubble" | "iframe")}
						/>
					</div>
				</section>

				{/* 2. Payload Code */}
				<section>
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2">
							<Terminal size={14} />
							<h3 className="text-xs font-bold tracking-widest uppercase">Injection Payload</h3>
						</div>
						<div className="text-[9px] font-mono text-[#888] uppercase bg-[#F3F2EE] px-2 py-1 border border-[#E5E5E5]">
							Agent: {currentAgent.id.slice(0, 12)}...
						</div>
					</div>

					<CodeBlock
						code={currentEmbedCode}
						filename={
							embedType === "bubble" ? "index.html (before </body>)" : "index.html (component)"
						}
					/>

					<div className="flex items-start gap-3 p-4 mt-4 border border-yellow-100 bg-yellow-50">
						<AlertCircle size={14} className="text-yellow-600 mt-0.5 shrink-0" />
						<div>
							<div className="text-[10px] font-bold uppercase text-yellow-800">Developer Note</div>
							<p className="text-[10px] text-yellow-700/80 leading-snug">
								{embedType === "bubble"
									? "For Single Page Applications (React, Vue, Next.js), consider using our NPM Package instead of the script tag for better state management."
									: "The iframe will inherit styles from your page. Adjust width and height attributes as needed to fit your layout."}
							</p>
						</div>
					</div>
				</section>

				{/* 3. Shopify Native Integration */}
				<section>
					<div className="flex items-center gap-2 mb-4">
						<ShoppingBag size={14} />
						<h3 className="text-xs font-bold tracking-widest uppercase">
							Shopify Native Integration
						</h3>
					</div>

					<div className="bg-white border border-[#E5E5E5] p-6">
						<p className="text-sm text-[#555] mb-5">
							Running a Shopify store? Skip the manual embed and use our{" "}
							<strong>native Shopify integration</strong> for a seamless experience with automatic
							customer identification.
						</p>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
							<div className="flex items-start gap-3 p-4 bg-[#FAFAF9] border border-[#E5E5E5]">
								<div className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] text-white shrink-0">
									<User size={14} />
								</div>
								<div>
									<h4 className="text-[11px] font-bold uppercase text-[#1A1A1A] mb-1">
										Customer Context
									</h4>
									<p className="text-[10px] text-[#888] leading-relaxed">
										Automatically identify logged-in customers with their name, email, and account
										details.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3 p-4 bg-[#FAFAF9] border border-[#E5E5E5]">
								<div className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] text-white shrink-0">
									<Package size={14} />
								</div>
								<div>
									<h4 className="text-[11px] font-bold uppercase text-[#1A1A1A] mb-1">
										Order History
									</h4>
									<p className="text-[10px] text-[#888] leading-relaxed">
										Access order data, tracking info, and purchase history directly in
										conversations.
									</p>
								</div>
							</div>

							<div className="flex items-start gap-3 p-4 bg-[#FAFAF9] border border-[#E5E5E5]">
								<div className="w-8 h-8 flex items-center justify-center bg-[#1A1A1A] text-white shrink-0">
									<ShoppingBag size={14} />
								</div>
								<div>
									<h4 className="text-[11px] font-bold uppercase text-[#1A1A1A] mb-1">
										One-Click Install
									</h4>
									<p className="text-[10px] text-[#888] leading-relaxed">
										Install the widget directly from Shopify admin—no theme editing required.
									</p>
								</div>
							</div>
						</div>

						<Link
							href="/integrations/shopify"
							className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide hover:bg-[#333] transition-colors"
						>
							<ShoppingBag size={14} />
							Set Up Shopify Integration
							<ArrowRight size={14} />
						</Link>
					</div>
				</section>
			</div>
		</div>
	);
}
