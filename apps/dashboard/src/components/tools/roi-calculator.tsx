"use client";

import { Calculator, Clock, DollarSign, TrendingUp } from "lucide-react";
import { useId, useState } from "react";
import { EmailCapture } from "./email-capture";

const ANSA_PRO_MONTHLY = 29;

export function ROICalculator() {
	const [tickets, setTickets] = useState(500);
	const [handleTime, setHandleTime] = useState(8);
	const [hourlyCost, setHourlyCost] = useState(25);
	const [automationRate, setAutomationRate] = useState(70);

	const automatedTickets = Math.round(tickets * (automationRate / 100));
	const hoursPerMonth = Math.round((automatedTickets * handleTime) / 60);
	const monthlySavings = Math.round(hoursPerMonth * hourlyCost);
	const annualSavings = monthlySavings * 12;
	const paybackDays =
		monthlySavings > 0 ? Math.max(1, Math.round((ANSA_PRO_MONTHLY / monthlySavings) * 30)) : 0;
	const roi =
		monthlySavings > 0
			? Math.round(((monthlySavings - ANSA_PRO_MONTHLY) / ANSA_PRO_MONTHLY) * 100)
			: 0;

	return (
		<div>
			{/* Hero */}
			<div className="mb-16">
				<p className="text-xs font-mono uppercase tracking-widest text-[#888] mb-4">Free Tool</p>
				<h1 className="text-4xl md:text-6xl font-medium tracking-tight mb-6 leading-[0.95]">
					Shopify Chatbot
					<br />
					<span className="font-serif italic text-[#888]">ROI Calculator</span>
				</h1>
				<p className="text-sm text-[#666] max-w-xl leading-relaxed">
					Calculate how much time and money you could save by automating customer support with an AI
					chatbot. Enter your current support metrics below.
				</p>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
				{/* Inputs */}
				<div className="border border-[#D1D1D1] p-8 bg-white">
					<h2 className="text-xs font-mono uppercase tracking-widest text-[#888] mb-8 pb-3 border-b border-[#D1D1D1]">
						Your Support Metrics
					</h2>

					<div className="space-y-8">
						<InputSlider
							label="Monthly support tickets"
							value={tickets}
							onChange={setTickets}
							min={50}
							max={10000}
							step={50}
							format={(v) => v.toLocaleString()}
						/>
						<InputSlider
							label="Avg handle time (minutes)"
							value={handleTime}
							onChange={setHandleTime}
							min={1}
							max={30}
							step={1}
							format={(v) => `${v} min`}
						/>
						<InputSlider
							label="Hourly support cost ($)"
							value={hourlyCost}
							onChange={setHourlyCost}
							min={10}
							max={100}
							step={5}
							format={(v) => `$${v}`}
						/>
						<InputSlider
							label="Automatable tickets (%)"
							value={automationRate}
							onChange={setAutomationRate}
							min={20}
							max={95}
							step={5}
							format={(v) => `${v}%`}
						/>
					</div>
				</div>

				{/* Results */}
				<div className="space-y-4">
					<ResultCard
						icon={<Clock size={20} />}
						label="Time saved per month"
						value={`${hoursPerMonth.toLocaleString()} hours`}
						sublabel={`${automatedTickets.toLocaleString()} tickets automated`}
					/>
					<ResultCard
						icon={<DollarSign size={20} />}
						label="Money saved per month"
						value={`$${monthlySavings.toLocaleString()}`}
						sublabel={`vs $${ANSA_PRO_MONTHLY}/mo for Ansa Pro`}
						highlight
					/>
					<ResultCard
						icon={<TrendingUp size={20} />}
						label="Annual savings"
						value={`$${annualSavings.toLocaleString()}`}
						sublabel={`${roi.toLocaleString()}% ROI`}
					/>
					<ResultCard
						icon={<Calculator size={20} />}
						label="Payback period"
						value={paybackDays <= 1 ? "< 1 day" : `${paybackDays} days`}
						sublabel="Time to recoup Ansa Pro cost"
					/>
				</div>
			</div>

			<EmailCapture ctaText="Start saving — try Ansa free" />
		</div>
	);
}

function InputSlider({
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

function ResultCard({
	icon,
	label,
	value,
	sublabel,
	highlight,
}: {
	icon: React.ReactNode;
	label: string;
	value: string;
	sublabel: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={`p-6 border ${
				highlight ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white border-[#D1D1D1]"
			}`}
		>
			<div className="flex items-start gap-4">
				<div
					className={`p-2 border ${highlight ? "border-white/20 bg-white/10" : "border-[#D1D1D1]"}`}
				>
					{icon}
				</div>
				<div>
					<p
						className={`text-xs font-mono uppercase tracking-widest mb-1 ${highlight ? "text-[#888]" : "text-[#888]"}`}
					>
						{label}
					</p>
					<p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
					<p className={`text-xs mt-1 ${highlight ? "text-[#CCC]" : "text-[#666]"}`}>{sublabel}</p>
				</div>
			</div>
		</div>
	);
}
