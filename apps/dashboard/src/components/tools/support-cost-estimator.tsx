"use client";

import { DollarSign, TrendingDown, Users } from "lucide-react";
import { useId, useState } from "react";
import { EmailCapture } from "./email-capture";

export function SupportCostEstimator() {
	const [teamSize, setTeamSize] = useState(5);
	const [avgSalary, setAvgSalary] = useState(50000);
	const [supportPercent, setSupportPercent] = useState(40);
	const [ticketsPerMonth, setTicketsPerMonth] = useState(800);

	const monthlySalaryTotal = (teamSize * avgSalary) / 12;
	const monthlySupportCost = Math.round(monthlySalaryTotal * (supportPercent / 100));
	const annualSupportCost = monthlySupportCost * 12;
	const costPerTicket =
		ticketsPerMonth > 0 ? (monthlySupportCost / ticketsPerMonth).toFixed(2) : "0.00";

	// Ansa savings estimate (assume 70% automation)
	const ansaSavings = Math.round(monthlySupportCost * 0.7);
	const costWithAnsa = monthlySupportCost - ansaSavings;

	return (
		<div>
			{/* Hero */}
			<div className="mb-16">
				<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-4">Free Tool</p>
				<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.95]">
					Support Cost
					<br />
					<span className="font-serif italic text-[#888]">Estimator</span>
				</h1>
				<p className="text-sm text-[#666] max-w-xl leading-relaxed">
					Most companies underestimate their true support costs. Calculate your actual support labor
					spend and see where AI automation can reduce it.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Inputs */}
				<div className="border border-[#D1D1D1] p-8 bg-white">
					<h2 className="text-xs font-mono uppercase tracking-widest text-[#888] mb-8 pb-3 border-b border-[#D1D1D1]">
						Your Team Details
					</h2>

					<div className="space-y-8">
						<InputField
							label="Support team size"
							value={teamSize}
							onChange={setTeamSize}
							min={1}
							max={100}
							step={1}
							format={(v) => `${v} people`}
						/>
						<InputField
							label="Average annual salary ($)"
							value={avgSalary}
							onChange={setAvgSalary}
							min={20000}
							max={150000}
							step={5000}
							format={(v) => `$${v.toLocaleString()}`}
						/>
						<InputField
							label="% of time on support"
							value={supportPercent}
							onChange={setSupportPercent}
							min={10}
							max={100}
							step={5}
							format={(v) => `${v}%`}
						/>
						<InputField
							label="Tickets per month"
							value={ticketsPerMonth}
							onChange={setTicketsPerMonth}
							min={50}
							max={20000}
							step={50}
							format={(v) => v.toLocaleString()}
						/>
					</div>
				</div>

				{/* Results */}
				<div className="space-y-4">
					<div className="p-6 border border-[#D1D1D1] bg-white">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-[#D1D1D1]">
								<DollarSign size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									Monthly support labor cost
								</p>
								<p className="text-2xl font-bold tracking-tight tabular-nums">
									${monthlySupportCost.toLocaleString()}
								</p>
								<p className="text-xs text-[#666] mt-1">
									${annualSupportCost.toLocaleString()}/year
								</p>
							</div>
						</div>
					</div>

					<div className="p-6 border border-[#D1D1D1] bg-white">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-[#D1D1D1]">
								<Users size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									Cost per ticket
								</p>
								<p className="text-2xl font-bold tracking-tight tabular-nums">${costPerTicket}</p>
								<p className="text-xs text-[#666] mt-1">Industry avg: $2–$15 per ticket</p>
							</div>
						</div>
					</div>

					{/* Savings highlight */}
					<div className="p-6 bg-[#1A1A1A] text-white border border-[#1A1A1A]">
						<div className="flex items-start gap-4">
							<div className="p-2 border border-white/20 bg-white/10">
								<TrendingDown size={20} />
							</div>
							<div>
								<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-1">
									With Ansa (70% automation)
								</p>
								<p className="text-2xl font-bold tracking-tight tabular-nums">
									${costWithAnsa.toLocaleString()}/mo
								</p>
								<p className="text-xs text-[#CCC] mt-1">
									Save ${ansaSavings.toLocaleString()}/mo · ${(ansaSavings * 12).toLocaleString()}
									/year
								</p>
							</div>
						</div>
					</div>

					{/* Breakdown */}
					<div className="p-6 border border-[#D1D1D1] bg-white">
						<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-4">
							Cost Breakdown
						</p>
						<div className="space-y-3">
							<BreakdownRow
								label="Total team salary"
								value={`$${Math.round(teamSize * avgSalary).toLocaleString()}/yr`}
							/>
							<BreakdownRow label="Support allocation" value={`${supportPercent}%`} />
							<BreakdownRow
								label="Support labor cost"
								value={`$${annualSupportCost.toLocaleString()}/yr`}
								bold
							/>
						</div>
					</div>
				</div>
			</div>

			<EmailCapture ctaText="Reduce this cost with Ansa" />
		</div>
	);
}

function InputField({
	label,
	value,
	onChange,
	min,
	max,
	step,
	format,
}: {
	label: string;
	value: number;
	onChange: (v: number) => void;
	min: number;
	max: number;
	step: number;
	format: (v: number) => string;
}) {
	const id = useId();
	return (
		<div>
			<div className="flex items-center justify-between mb-3">
				<label htmlFor={id} className="text-sm font-medium">
					{label}
				</label>
				<span className="text-sm font-mono font-bold tabular-nums">{format(value)}</span>
			</div>
			<input
				id={id}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="w-full h-1 bg-[#D1D1D1] appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#1A1A1A] [&::-webkit-slider-thumb]:cursor-pointer"
			/>
			<div className="flex justify-between mt-1 text-[10px] text-[#888] font-mono">
				<span>{format(min)}</span>
				<span>{format(max)}</span>
			</div>
		</div>
	);
}

function BreakdownRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
	return (
		<div
			className={`flex justify-between items-center text-sm ${bold ? "font-bold pt-2 border-t border-[#D1D1D1]" : "text-[#666]"}`}
		>
			<span>{label}</span>
			<span className="font-mono tabular-nums">{value}</span>
		</div>
	);
}
