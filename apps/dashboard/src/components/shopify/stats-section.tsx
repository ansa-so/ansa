export function StatsSection() {
	const stats = [
		{ label: "Deflection Rate", val: "60%", sub: "Of tickets" },
		{ label: "Revenue Recovery", val: "$1.2M", sub: "Via automated upsells" },
		{ label: "Setup Time", val: "5m", sub: "One-click install" },
		{ label: "ROI", val: "15x", sub: "Payback in < 1 month" },
	];

	return (
		<section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#D1D1D1] border border-[#D1D1D1] mb-32">
			{stats.map((stat, i) => (
				<div
					key={i}
					className="bg-white p-12 text-center group hover:bg-[#F9F9F9] transition-colors cursor-default"
				>
					<div className="mb-2 text-4xl font-medium tracking-tighter transition-transform duration-300 ease-out md:text-5xl group-hover:scale-110">
						{stat.val}
					</div>
					<div className="font-mono text-xs text-[#888] uppercase tracking-widest mb-1">
						{stat.label}
					</div>
					<div className="text-[10px] text-[#CCC]">{stat.sub}</div>
				</div>
			))}
		</section>
	);
}
