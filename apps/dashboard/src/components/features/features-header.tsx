"use client";

import { Title } from "../ui/title";

export function FeaturesHeader() {
	return (
		<section className="mb-12 md:mb-24 md:mb-40 md:border-b border-[#D1D1D1] md:pb-24">
			<div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
				<div className="lg:col-span-8">
					<Title
						tag="h1"
						size="h1"
						className="text-6xl md:text-9xl leading-[0.85] font-medium tracking-tight mb-12"
					>
						System <br />
						<span className="font-serif italic text-[#999]">Capabilities.</span>
					</Title>
					<p className="text-xl md:text-2xl text-[#555] max-w-2xl font-light leading-relaxed">
						Ansa isn&apos;t just a chatbot. It&apos;s a complete autonomous AI layer that sits
						between your customers and your backlog.
					</p>
				</div>
				<div className="flex items-end justify-start lg:col-span-4 lg:justify-end">
					<div className="font-mono text-xs text-[#888] text-right space-y-2">
						<div className="border-b border-[#D1D1D1] pb-2 mb-2">SYSTEM METRICS</div>
						<div>
							AUTO-RESOLUTION: <span className="text-foreground">85%+</span>
						</div>
						<div>
							LANGUAGES: <span className="text-foreground">50+</span>
						</div>
						<div>
							RESPONSE: <span className="text-foreground">&lt;1s</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
