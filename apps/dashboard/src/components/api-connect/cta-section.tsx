"use client";

import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { getConfig } from "@/lib/runtime-config";
import { Button } from "../ui/button";

export function CtaSection() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<section className="text-center py-16 border-t border-[#D1D1D1]">
			<div className="inline-flex items-center justify-center w-16 h-16 bg-[#FEF3C7] border border-[#F59E0B] mb-8">
				<Zap className="text-[#F59E0B]" size={32} />
			</div>

			<h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-4">
				Ready to connect your API?
			</h2>
			<p className="text-lg text-[#555] max-w-xl mx-auto mb-8">
				Start with our free tier. No credit card required.
			</p>

			<div className="flex flex-col gap-4 sm:flex-row justify-center">
				<Link href="/tools/discover">
					<Button size="xl" variant="primary">
						Try Auto-Discovery <ArrowRight size={16} className="ml-2" />
					</Button>
				</Link>
				<Link href={docsUrl}>
					<Button size="xl" variant="outline">
						View Documentation
					</Button>
				</Link>
			</div>
		</section>
	);
}
