"use client";

import { AlertTriangle, CheckCircle, Clock, TrendingUp, XCircle } from "lucide-react";
import { useState } from "react";
import { EmailCapture } from "./email-capture";

interface Benchmark {
	industry: string;
	email: string;
	liveChat: string;
	phone: string;
	avgMinutes: number;
	csatImpact: string;
	revenueNote: string;
}

const BENCHMARKS: Benchmark[] = [
	{
		industry: "E-commerce",
		email: "12 hours",
		liveChat: "1–3 min",
		phone: "2–5 min",
		avgMinutes: 120,
		csatImpact: "1% CSAT drop per 2 min wait",
		revenueNote: "53% of shoppers abandon carts if questions aren't answered quickly",
	},
	{
		industry: "SaaS",
		email: "24 hours",
		liveChat: "2–5 min",
		phone: "3–8 min",
		avgMinutes: 300,
		csatImpact: "Response time is #1 factor in B2B CSAT",
		revenueNote: "Fast response = 35% higher NPS on average",
	},
	{
		industry: "Financial Services",
		email: "48 hours",
		liveChat: "3–5 min",
		phone: "5–15 min",
		avgMinutes: 480,
		csatImpact: "Compliance delays compound wait times",
		revenueNote: "Customers switch providers after 2+ bad support experiences",
	},
	{
		industry: "Healthcare",
		email: "48+ hours",
		liveChat: "5–10 min",
		phone: "10–20 min",
		avgMinutes: 600,
		csatImpact: "Patient satisfaction tied directly to wait",
		revenueNote: "72% of patients prefer digital-first communication",
	},
	{
		industry: "Travel & Hospitality",
		email: "24 hours",
		liveChat: "2–5 min",
		phone: "5–15 min",
		avgMinutes: 360,
		csatImpact: "Urgency spikes during travel disruptions",
		revenueNote: "60% of travelers expect instant answers",
	},
	{
		industry: "Education / EdTech",
		email: "24–48 hours",
		liveChat: "3–8 min",
		phone: "5–10 min",
		avgMinutes: 420,
		csatImpact: "Student satisfaction drives retention",
		revenueNote: "Self-service reduces support load by 40%",
	},
];

function getGrade(
	userMinutes: number,
	benchmarkMinutes: number,
): { grade: "excellent" | "good" | "poor"; label: string } {
	const ratio = userMinutes / benchmarkMinutes;
	if (ratio <= 0.5) return { grade: "excellent", label: "Excellent — well below industry avg" };
	if (ratio <= 1.2) return { grade: "good", label: "Average — room to improve" };
	return { grade: "poor", label: "Below average — hurting CSAT & revenue" };
}

export function ResponseTimeAnalyzer() {
	const [selectedIndustry, setSelectedIndustry] = useState(0);
	const [responseTime, setResponseTime] = useState(30);
	const [unit, setUnit] = useState<"minutes" | "hours">("minutes");

	const benchmark = BENCHMARKS[selectedIndustry];
	const userMinutes = unit === "hours" ? responseTime * 60 : responseTime;
	const { grade, label } = getGrade(userMinutes, benchmark.avgMinutes);

	const GradeIcon =
		grade === "excellent" ? CheckCircle : grade === "good" ? AlertTriangle : XCircle;
	const gradeColor =
		grade === "excellent"
			? "text-green-700"
			: grade === "good"
				? "text-yellow-700"
				: "text-red-700";
	const gradeBg =
		grade === "excellent"
			? "bg-green-50 border-green-200"
			: grade === "good"
				? "bg-yellow-50 border-yellow-200"
				: "bg-red-50 border-red-200";

	return (
		<div>
			{/* Hero */}
			<div className="mb-16">
				<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-4">Free Tool</p>
				<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.95]">
					Response Time
					<br />
					<span className="font-serif italic text-[#888]">Benchmarks</span>
				</h1>
				<p className="text-sm text-[#666] max-w-xl leading-relaxed">
					How does your support response time compare to industry standards? Slow responses directly
					impact CSAT scores and revenue.
				</p>
			</div>

			{/* Industry selector + your time */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
				<div className="border border-[#D1D1D1] p-8 bg-white">
					<h2 className="text-xs font-mono uppercase tracking-widest text-[#888] mb-6 pb-3 border-b border-[#D1D1D1]">
						Your Details
					</h2>

					<div className="mb-8">
						<span className="text-sm font-medium mb-3 block">Industry</span>
						<div className="grid grid-cols-2 gap-2">
							{BENCHMARKS.map((b, i) => (
								<button
									key={b.industry}
									type="button"
									onClick={() => setSelectedIndustry(i)}
									className={`px-4 py-3 text-xs font-mono uppercase tracking-widest border transition-colors text-left ${
										i === selectedIndustry
											? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
											: "border-[#D1D1D1] hover:border-[#888]"
									}`}
								>
									{b.industry}
								</button>
							))}
						</div>
					</div>

					<div>
						<label htmlFor="yourAvgResponseTime" className="text-sm font-medium mb-3 block">
							Your avg response time
						</label>
						<div className="flex gap-3">
							<input
								id="yourAvgResponseTime"
								type="number"
								value={responseTime}
								onChange={(e) => setResponseTime(Math.max(1, Number(e.target.value)))}
								className="flex-1 px-4 py-3 border border-[#D1D1D1] text-sm font-mono bg-transparent focus:outline-none focus:border-[#1A1A1A] transition-colors"
								min={1}
							/>
							<div className="flex border border-[#D1D1D1]">
								<button
									type="button"
									onClick={() => setUnit("minutes")}
									className={`px-4 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
										unit === "minutes" ? "bg-[#1A1A1A] text-white" : "hover:bg-[#F3F2EE]"
									}`}
								>
									Min
								</button>
								<button
									type="button"
									onClick={() => setUnit("hours")}
									className={`px-4 py-3 text-xs font-mono uppercase tracking-widest border-l border-[#D1D1D1] transition-colors ${
										unit === "hours" ? "bg-[#1A1A1A] text-white" : "hover:bg-[#F3F2EE]"
									}`}
								>
									Hr
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Grade card */}
				<div className="space-y-4">
					<div className={`p-6 border ${gradeBg}`}>
						<div className="flex items-start gap-4">
							<GradeIcon size={24} className={gradeColor} />
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									Your Score
								</p>
								<p className={`text-lg font-bold ${gradeColor}`}>{label}</p>
								<p className="text-xs text-[#666] mt-2">
									Your response time:{" "}
									{userMinutes >= 60
										? `${(userMinutes / 60).toFixed(1)} hours`
										: `${userMinutes} min`}
									{" · "}Industry avg:{" "}
									{benchmark.avgMinutes >= 60
										? `${(benchmark.avgMinutes / 60).toFixed(1)} hours`
										: `${benchmark.avgMinutes} min`}
								</p>
							</div>
						</div>
					</div>

					<div className="p-6 border border-[#D1D1D1] bg-white">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-[#D1D1D1]">
								<TrendingUp size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									CSAT Impact
								</p>
								<p className="text-sm font-medium">{benchmark.csatImpact}</p>
							</div>
						</div>
					</div>

					<div className="p-6 border border-[#D1D1D1] bg-white">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-[#D1D1D1]">
								<Clock size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									Revenue Impact
								</p>
								<p className="text-sm font-medium">{benchmark.revenueNote}</p>
							</div>
						</div>
					</div>

					<div className="p-6 bg-[#1A1A1A] text-white border border-[#1A1A1A]">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-white/20 bg-white/10">
								<Clock size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									With Ansa AI
								</p>
								<p className="text-2xl font-bold tracking-tight">&lt; 1 minute</p>
								<p className="text-xs text-[#CCC] mt-1">24/7 instant responses, no queue</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Benchmark table */}
			<div className="border border-[#D1D1D1] bg-white mb-12">
				<div className="p-6 border-b border-[#D1D1D1]">
					<h2 className="text-xs font-mono uppercase tracking-widest text-[#888]">
						Industry Benchmarks — Average Response Times
					</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-[#D1D1D1] text-left">
								<th className="p-4 text-xs font-mono uppercase tracking-widest text-[#888] font-normal">
									Industry
								</th>
								<th className="p-4 text-xs font-mono uppercase tracking-widest text-[#888] font-normal">
									Email
								</th>
								<th className="p-4 text-xs font-mono uppercase tracking-widest text-[#888] font-normal">
									Live Chat
								</th>
								<th className="p-4 text-xs font-mono uppercase tracking-widest text-[#888] font-normal">
									Phone
								</th>
							</tr>
						</thead>
						<tbody>
							{BENCHMARKS.map((b, i) => (
								<tr
									key={b.industry}
									className={`border-b border-[#D1D1D1] last:border-0 ${
										i === selectedIndustry ? "bg-[#F3F2EE]" : ""
									}`}
								>
									<td className="p-4 font-medium">{b.industry}</td>
									<td className="p-4 font-mono text-[#666]">{b.email}</td>
									<td className="p-4 font-mono text-[#666]">{b.liveChat}</td>
									<td className="p-4 font-mono text-[#666]">{b.phone}</td>
								</tr>
							))}
							<tr className="bg-[#1A1A1A] text-white">
								<td className="p-4 font-medium">Ansa AI</td>
								<td className="p-4 font-mono">&lt; 1 min</td>
								<td className="p-4 font-mono">&lt; 10 sec</td>
								<td className="p-4 font-mono">Instant</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<EmailCapture ctaText="Achieve <1min response time with Ansa" />
		</div>
	);
}
