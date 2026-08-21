"use client";

import { Box, Check, Copy, ExternalLink } from "lucide-react";
import Link from "next/dist/client/link";
import { useState } from "react";

const sdks = [{ name: "JavaScript/TypeScript", install: "npm install @ansa-so/sdk", icon: Box }];

export function SDKGrid() {
	const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

	const copyToClipboard = async (text: string, index: number) => {
		await navigator.clipboard.writeText(text);
		setCopiedIndex(index);
		setTimeout(() => setCopiedIndex(null), 2000);
	};

	return (
		<section className="mb-12 md:mb-32">
			<div className="flex items-end justify-between px-2 mb-12">
				<div>
					<h2 className="mb-4 text-4xl font-medium">Official SDKs.</h2>
					<p className="text-[#666]">Drop-in libraries for your stack.</p>
				</div>
				<a
					href="https://www.npmjs.com/package/@ansa-so/sdk"
					className="text-xs font-bold uppercase tracking-widest border-b border-[#1A1A1A] pb-1 hover:text-[#555] transition-colors"
				>
					View on npm
				</a>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-1 max-w-md gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{sdks.map((sdk, index) => (
					<div
						key={sdk.name}
						className="bg-white p-10 hover:bg-[#F9F9F9] transition-colors group cursor-pointer"
					>
						<div className="flex items-start justify-between mb-8">
							<sdk.icon
								size={28}
								strokeWidth={1.5}
								className="text-[#888] group-hover:text-foreground transition-colors"
							/>
							<Link
								href="https://www.npmjs.com/package/@ansa-so/sdk"
								target="_blank"
								rel="noopener noreferrer"
							>
								<ExternalLink size={16} className="text-[#CCC] group-hover:text-foreground" />
							</Link>
						</div>
						<h3 className="mb-4 text-lg font-bold">{sdk.name}</h3>
						<div className="bg-[#F3F2EE] border border-[#E5E5E5] p-3 rounded text-[10px] font-mono text-[#555] flex justify-between items-center group-hover:border-[#D1D1D1] transition-colors">
							{sdk.install}
							<button
								onClick={() => copyToClipboard(sdk.install, index)}
								className="p-1 hover:bg-[#E5E5E5] rounded transition-colors"
								aria-label="Copy to clipboard"
							>
								{copiedIndex === index ? (
									<Check size={10} className="text-green-600" />
								) : (
									<Copy size={10} className="text-[#AAA] group-hover:text-foreground" />
								)}
							</button>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
