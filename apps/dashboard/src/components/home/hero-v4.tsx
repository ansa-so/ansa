import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Text } from "../ui/text";
import { Title } from "../ui/title";

function ArcadeEmbed() {
	return (
		<div
			style={{
				position: "relative",
				paddingBottom: "calc(56.22254758418741% + 41px)",
				height: "0",
				width: "100%",
			}}
		>
			<iframe
				src="https://demo.arcade.software/nViYMqOjVAR2D1cb8BOI?embed&embed_mobile=tab&embed_desktop=inline&show_copy_link=true"
				title="Customize Chat Widget Design and Automate Engagement Triggers"
				frameBorder="0"
				loading="lazy"
				allowFullScreen
				allow="clipboard-write"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					colorScheme: "light",
				}}
			/>
		</div>
	);
}

export function HeroV4() {
	return (
		<section className="px-4 md:px-8 max-w-[1800px] mx-auto mb-20 md:mb-32 relative">
			{/* Editorial Headline */}
			<div className="relative z-20 max-w-4xl mx-auto mb-2 text-center md:mb-24">
				<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
					<Sparkles size={12} />
					<span>The Autonomous AI Layer</span>
				</div>
				<Title tag="h1" size="h1" className="text-6xl md:text-9xl leading-[0.9] tracking-tight">
					AI Agents for <br />
					<span className="font-serif italic text-[#999]">Support & Sales</span>
				</Title>
				<p className="sr-only">No-Code or API</p>
				<Text size="subtitle" className="mx-auto mb-10">
					Build AI agents that answer questions, capture leads, and handle support—trained on your
					content, connected to your tools.
				</Text>
				<div className="flex flex-col justify-center gap-4 sm:flex-row">
					<Button variant="primary" size="xl" asChild>
						<Link href="/signup" className="inline-flex items-center gap-2">
							Start For Free <ArrowRight size={14} />
						</Link>
					</Button>
					<Button asChild size="xl" variant="outline">
						<Link href="/pricing" className="inline-flex items-center gap-2">
							View Pricing
						</Link>
					</Button>
				</div>
			</div>

			{/* THE HERO VISUAL */}
			<div className="relative max-w-5xl mx-auto">
				<ArcadeEmbed />
			</div>
		</section>
	);
}
