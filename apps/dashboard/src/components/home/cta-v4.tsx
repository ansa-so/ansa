import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTAV4() {
	return (
		<section className="bg-[#1A1A1A] text-[#F3F2EE] py-32 text-center relative overflow-hidden border-t border-[#333]">
			<div className="relative z-10 max-w-4xl px-4 mx-auto">
				<h2 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9]">
					Ready to <br />
					<span className="font-serif italic text-[#999]">build?</span>
				</h2>
				<div className="flex flex-col justify-center gap-6 mt-16 sm:flex-row">
					<Button
						asChild
						className="bg-white text-black h-16 px-12 font-bold uppercase tracking-widest text-sm hover:scale-105 transition-transform shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] w-auto"
					>
						<a href="/signup">Start Building</a>
					</Button>
					<Button
						asChild
						variant="outline"
						className="border-2 border-[#555] text-[#F3F2EE] bg-transparent h-16 px-12 font-bold uppercase tracking-widest text-sm hover:bg-[#333] transition-colors w-auto"
					>
						<Link href="/pricing" className="inline-flex items-center gap-3">
							View Pricing <ArrowUpRight size={16} />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
