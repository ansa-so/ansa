import { Star } from "lucide-react";

// TODO: Replace placeholder reviews with real customer testimonials before launch
const reviews = [
	{
		name: "Sarah M.",
		store: "Velvet & Vine",
		category: "Fashion & Apparel",
		rating: 5,
		text: "We were drowning in WISMO tickets. Installed Ansa on a Friday, by Monday our ticket volume dropped 40%. The product recommendations are surprisingly good too — customers actually buy what it suggests.",
	},
	{
		name: "Marcus J.",
		store: "PeakForm Athletics",
		category: "Sports & Fitness",
		rating: 5,
		text: "Honestly skeptical of AI support tools after trying two others. Ansa is different — it actually understands our return policy and handles exchanges without us touching anything. Paid for itself in week one.",
	},
	{
		name: "Rachel T.",
		store: "The Candle Library",
		category: "Home & Lifestyle",
		rating: 5,
		text: "Our customers message at 2am asking about scent profiles and shipping times. Ansa handles it all. We went from 6hr average response time to instant. Reviews on our store have never been better.",
	},
	{
		name: "David K.",
		store: "Grounded Coffee Co.",
		category: "Food & Beverage",
		rating: 5,
		text: "Setup took maybe 3 minutes. It pulled in all our products, subscription options, even our FAQ. First day live it resolved 28 conversations without any help from us. Best app we've installed this year.",
	},
];

function Stars({ count }: { count: number }) {
	return (
		<div className="flex gap-0.5">
			{Array.from({ length: count }).map((_, i) => (
				<Star key={i} size={12} className="fill-[#1A1A1A] text-[#1A1A1A]" />
			))}
		</div>
	);
}

export function ReviewsSection() {
	return (
		<section className="mb-32">
			<div className="flex flex-col items-end justify-between px-2 mb-16 md:flex-row">
				<h2 className="text-4xl font-light">
					Trusted by <br /> Merchants.
				</h2>
				<p className="text-[#666] max-w-xs text-right hidden md:block">
					Stores of all sizes use Ansa to automate support and drive revenue.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-px bg-[#D1D1D1] border border-[#D1D1D1] md:grid-cols-2">
				{reviews.map((review, i) => (
					<div
						key={i}
						className="bg-white p-10 flex flex-col justify-between group hover:bg-[#F9F9F9] transition-colors"
					>
						<div>
							<Stars count={review.rating} />
							<p className="mt-4 text-sm leading-relaxed text-[#333]">
								&ldquo;{review.text}&rdquo;
							</p>
						</div>
						<div className="mt-8 pt-4 border-t border-[#F3F2EE]">
							<div className="text-sm font-medium">{review.name}</div>
							<div className="font-mono text-[10px] uppercase tracking-widest text-[#888] mt-1">
								{review.store} · {review.category}
							</div>
						</div>
					</div>
				))}
			</div>
		</section>
	);
}
