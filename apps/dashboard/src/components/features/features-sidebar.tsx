"use client";

const sections = [
	{ id: "core", label: "01 Core Intelligence" },
	{ id: "realtime", label: "02 Real-Time" },
	{ id: "integrations", label: "03 Integrations" },
	{ id: "triggers", label: "04 Smart Triggers" },
	{ id: "handoff", label: "05 Human Handoff" },
	{ id: "forms", label: "06 Dynamic Forms" },
	{ id: "analytics", label: "07 Insights & Analytics" },
	{ id: "multichannel", label: "08 Multi-Channel" },
	{ id: "multilingual", label: "09 Multi-Language" },
];

interface FeaturesSidebarProps {
	activeSection: string;
}

export function FeaturesSidebar({ activeSection }: FeaturesSidebarProps) {
	return (
		<div className="hidden lg:block lg:col-span-3">
			<div className="sticky top-32 space-y-px bg-[#D1D1D1] border border-[#D1D1D1]">
				{sections.map((item) => (
					<a
						key={item.id}
						href={`#${item.id}`}
						className={`block p-4 text-xs font-mono uppercase tracking-widest transition-all ${
							activeSection === item.id
								? "bg-[#1A1A1A] text-white"
								: "bg-white text-[#555] hover:bg-[#1A1A1A] hover:text-white"
						}`}
					>
						{item.label}
					</a>
				))}
			</div>
		</div>
	);
}
