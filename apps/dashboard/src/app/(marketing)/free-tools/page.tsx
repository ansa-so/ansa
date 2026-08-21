import { ArrowUpRight, Calculator, Clock, DollarSign } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Free Support Tools",
	description:
		"Free calculators and benchmarks for customer support teams. Calculate your support ROI, estimate costs, and compare response times against industry standards.",
	openGraph: {
		title: "Free Customer Support Tools - Ansa",
		description:
			"Free calculators and benchmarks for customer support teams. ROI calculator, cost estimator, and response time analyzer.",
	},
};

const tools = [
	{
		title: "Shopify Chatbot ROI Calculator",
		description:
			"Calculate how much time and money you could save by automating customer support with an AI chatbot.",
		href: "/free-tools/roi-calculator",
		icon: Calculator,
		tags: ["Shopify", "ROI", "Automation"],
	},
	{
		title: "Support Cost Estimator",
		description:
			"Most companies underestimate their true support costs. Calculate your actual support labor spend.",
		href: "/free-tools/support-cost-estimator",
		icon: DollarSign,
		tags: ["Costs", "Labor", "Budget"],
	},
	{
		title: "Response Time Benchmarks",
		description:
			"How does your support response time compare to industry standards? Check your score and its impact on revenue.",
		href: "/free-tools/response-time-analyzer",
		icon: Clock,
		tags: ["Benchmarks", "CSAT", "Speed"],
	},
];

export default function ToolsIndexPage() {
	return (
		<div>
			{/* Hero */}
			<div className="mb-16">
				<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-4">Free Tools</p>
				<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.95]">
					Support team
					<br />
					<span className="font-serif italic text-[#888]">calculators</span>
				</h1>
				<p className="text-sm text-[#666] max-w-xl leading-relaxed">
					Free tools to help you understand your support costs, benchmark your performance, and
					calculate the ROI of AI automation.
				</p>
			</div>

			{/* Tool cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
				{tools.map((tool) => {
					const Icon = tool.icon;
					return (
						<Link
							key={tool.href}
							href={tool.href}
							className="group border border-[#D1D1D1] bg-white p-8 hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-colors"
						>
							<div className="p-3 border border-[#D1D1D1] group-hover:border-white/20 group-hover:bg-white/10 w-fit mb-6 transition-colors">
								<Icon size={24} />
							</div>
							<h2 className="text-lg font-bold mb-3">{tool.title}</h2>
							<p className="text-sm text-[#666] group-hover:text-[#CCC] mb-6 leading-relaxed transition-colors">
								{tool.description}
							</p>
							<div className="flex items-center justify-between">
								<div className="flex gap-2">
									{tool.tags.map((tag) => (
										<span
											key={tag}
											className="text-[9px] font-mono uppercase tracking-widest border border-[#D1D1D1] group-hover:border-white/20 px-2 py-1 transition-colors"
										>
											{tag}
										</span>
									))}
								</div>
								<ArrowUpRight
									size={16}
									className="opacity-0 group-hover:opacity-100 transition-opacity"
								/>
							</div>
						</Link>
					);
				})}
			</div>
		</div>
	);
}
