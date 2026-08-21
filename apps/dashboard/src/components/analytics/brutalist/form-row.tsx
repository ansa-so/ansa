"use client";

interface FormRowProps {
	name: string;
	impressions: number;
	started: number;
	submitted: number;
	startRate: number;
	completionRate: number;
	avgTime: string;
}

export function FormRow({
	name,
	impressions,
	started,
	submitted,
	startRate,
	completionRate,
	avgTime,
}: FormRowProps) {
	return (
		<div className="grid grid-cols-7 gap-2 py-3 items-center text-xs hover:bg-[#F9F9F9] transition-colors">
			<div className="font-mono text-[#1A1A1A] bg-[#F3F2EE] px-2 py-1 border border-[#E5E5E5] truncate w-fit max-w-full">
				{name}
			</div>
			<div className="text-right font-mono">{impressions.toLocaleString()}</div>
			<div className="text-right font-mono">{started.toLocaleString()}</div>
			<div className="text-right font-mono">{submitted.toLocaleString()}</div>
			<div className="text-right">
				<span
					className={`font-mono font-bold ${startRate >= 50 ? "text-green-600" : startRate >= 25 ? "text-yellow-600" : "text-[#888]"}`}
				>
					{startRate}%
				</span>
			</div>
			<div className="text-right">
				<span
					className={`font-mono font-bold ${completionRate >= 70 ? "text-green-600" : completionRate >= 40 ? "text-yellow-600" : "text-[#888]"}`}
				>
					{completionRate}%
				</span>
			</div>
			<div className="text-right font-mono text-[#888]">{avgTime}</div>
		</div>
	);
}
