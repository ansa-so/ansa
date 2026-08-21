import { ArrowUpRight, CheckCircle2, Package, RefreshCcw, TrendingUp } from "lucide-react";

export function UseCasesSection() {
	const useCases = [
		{
			icon: Package,
			title: '"Where is my order?"',
			description:
				"Ansa instantly checks shipment status via Shopify/ShipStation and gives customers real-time updates without an agent.",
			tags: ["DHL", "FedEx", "USPS"],
			footer: null,
		},
		{
			icon: RefreshCcw,
			title: "Smart Returns",
			description:
				"Automate return eligibility checks based on purchase date and item type. Issue store credit or original payment refunds instantly.",
			tags: [],
			footer: (
				<div className="flex items-center gap-2 font-mono text-xs text-green-600">
					<CheckCircle2 size={12} /> Auto-Restock Inventory
				</div>
			),
		},
		{
			icon: TrendingUp,
			title: "Conversational Sales",
			description:
				'Turn support into revenue. Ansa suggests matching items (e.g., "Need socks with those shoes?") based on cart contents.',
			tags: [],
			footer: (
				<div className="bg-[#1A1A1A] text-white text-[10px] font-mono uppercase px-3 py-2 text-center">
					+15% Avg Order Value
				</div>
			),
		},
	];

	return (
		<section className="mb-32">
			<div className="flex flex-col items-end justify-between px-2 mb-16 md:flex-row">
				<h2 className="text-4xl font-light">
					Built for <br /> Merchants.
				</h2>
				<p className="text-[#666] max-w-xs text-right hidden md:block">
					Deep integration with Shopify's Admin API allows for powerful autonomous actions.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-8 md:grid-cols-3">
				{useCases.map((useCase, i) => (
					<div
						key={i}
						className="bg-white border border-[#D1D1D1] p-10 flex flex-col justify-between min-h-[400px] group hover:border-[#1A1A1A] transition-colors relative overflow-hidden"
					>
						<div className="absolute top-0 right-0 p-4 transition-opacity opacity-0 group-hover:opacity-100">
							<ArrowUpRight size={16} />
						</div>
						<div>
							<div className="w-12 h-12 bg-[#F3F2EE] rounded-full flex items-center justify-center mb-8 border border-[#E5E5E5]">
								<useCase.icon className="text-foreground" strokeWidth={1.5} />
							</div>
							<h3 className="mb-4 text-2xl font-medium">{useCase.title}</h3>
							<p className="text-[#666] leading-relaxed text-sm">{useCase.description}</p>
						</div>
						{useCase.tags.length > 0 && (
							<div className="mt-8 border-t border-[#F3F2EE] pt-4 flex gap-2">
								{useCase.tags.map((tag) => (
									<span
										key={tag}
										className="px-2 py-1 bg-[#F9F9F9] text-[10px] font-mono border border-[#E5E5E5] text-[#555]"
									>
										{tag}
									</span>
								))}
							</div>
						)}
						{useCase.footer && (
							<div className="mt-8 border-t border-[#F3F2EE] pt-4">{useCase.footer}</div>
						)}
					</div>
				))}
			</div>
		</section>
	);
}
