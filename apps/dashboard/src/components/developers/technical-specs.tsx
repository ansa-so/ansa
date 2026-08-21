"use client";

const specs = [
	{
		label: "Uptime SLA",
		value: "99.99%",
	},
	{
		label: "Rate Limit",
		value: "5k",
		unit: "req/min",
	},
	{
		label: "Avg Latency",
		value: "120ms",
	},
	{
		label: "Data Regions",
		value: "US/EU",
	},
];

export function TechnicalSpecs() {
	return (
		<section className="py-24 border-t border-[#D1D1D1] grid grid-cols-2 md:grid-cols-4 gap-8 px-4 md:px-0">
			{specs.map((spec) => (
				<div key={spec.label} className="text-center">
					<div className="font-mono text-xs text-[#888] uppercase tracking-widest mb-2">
						{spec.label}
					</div>
					<div className="text-3xl font-medium">
						{spec.value} {spec.unit && <span className="text-sm text-[#888]">{spec.unit}</span>}
					</div>
				</div>
			))}
		</section>
	);
}
