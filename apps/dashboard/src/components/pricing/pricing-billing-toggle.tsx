"use client";

interface PricingBillingToggleProps {
	isAnnual: boolean;
	setIsAnnual: (value: boolean) => void;
}

export function PricingBillingToggle({ isAnnual, setIsAnnual }: PricingBillingToggleProps) {
	return (
		<div className="flex justify-center mt-8">
			<div className="inline-flex items-center gap-6 border border-[#D1D1D1] p-2 bg-white">
				<button
					type="button"
					className={`text-xs font-bold uppercase tracking-widest cursor-pointer px-4 py-2 transition-colors ${
						!isAnnual ? "bg-[#1A1A1A] text-white" : "text-[#888]"
					}`}
					onClick={() => setIsAnnual(false)}
				>
					Monthly
				</button>
				<button
					type="button"
					className={`text-xs font-bold uppercase tracking-widest cursor-pointer px-4 py-2 transition-colors ${
						isAnnual ? "bg-[#1A1A1A] text-white" : "text-[#888]"
					}`}
					onClick={() => setIsAnnual(true)}
				>
					Yearly (Save 17%)
				</button>
			</div>
		</div>
	);
}
