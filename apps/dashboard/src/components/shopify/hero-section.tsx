import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";

const SHOPIFY_APP_STORE_URL = "https://apps.shopify.com/ansa";

export function HeroSection() {
	return (
		<section className="mb-24 border-b border-[#D1D1D1] pb-24">
			<div className="grid items-center grid-cols-1 gap-16 lg:grid-cols-2">
				{/* Left: Copy */}
				<div>
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white rounded-full">
						<span className="w-2 h-2 bg-[#95BF47] rounded-full" />
						<span>Shopify Plus Partner</span>
					</div>
					<h1 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9]">
						Automate your <br />
						<span className="font-serif italic text-[#999]">Storefront.</span>
					</h1>
					<p className="text-xl text-[#555] max-w-lg leading-relaxed mb-12">
						Connect Ansa to Shopify in one click. Instantly resolve "Where is my order?" tickets,
						process refunds, and recommend products without human intervention.
					</p>
					<div className="flex flex-col gap-4 sm:flex-row">
						<Link href={SHOPIFY_APP_STORE_URL} target="_blank" rel="noopener noreferrer">
							<Button size="xl" variant="primary">
								Install on Shopify
							</Button>
						</Link>
					</div>
				</div>

				{/* Right: "Live Order" Visual */}
				<div className="relative flex justify-center p-6 overflow-visible lg:justify-end rounded-2xl">
					{/* Background Image */}
					<Image src="/home/hero-bg.jpg" alt="" fill className="object-cover -z-10" priority />
					{/* Abstract Order Card */}
					<div className="relative z-10 w-full max-w-md overflow-hidden border border-[#D1D1D1] shadow-[12px_12px_0px_0px_rgba(26,26,26,0.05)]">
						<Image
							src="/shopify-screenshot.png"
							alt="Shopify integration screenshot"
							width={800}
							height={600}
							className="w-full h-auto"
						/>
					</div>
				</div>
			</div>
		</section>
	);
}
