"use client";

import { ProgressBar } from "./progress-bar";

interface ToolRowProps {
	name: string;
	executions: number | string;
	success: number;
	time: number | string;
}

export function ToolRow({ name, executions, success, time }: ToolRowProps) {
	return (
		<div className="grid grid-cols-12 gap-4 py-3 border-b border-[#F3F2EE] items-center text-xs hover:bg-[#F9F9F9] transition-colors">
			<div className="col-span-4 font-mono font-medium text-[#1A1A1A] truncate bg-[#F3F2EE] px-2 py-1 border border-[#E5E5E5] w-fit max-w-full">
				{name}
			</div>
			<div className="col-span-2 font-mono text-center">{executions}</div>
			<div className="col-span-4 px-4">
				<div className="flex justify-between text-[9px] mb-1 font-mono text-[#888]">
					<span>Success Rate</span>
					<span>{success}%</span>
				</div>
				<ProgressBar value={success} />
			</div>
			<div className="col-span-2 text-right font-mono text-[#888]">{time}ms</div>
		</div>
	);
}
