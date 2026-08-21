"use client";

import { FileText } from "lucide-react";

export default function SubmissionsPage() {
	return (
		<div className="flex-1 p-8 overflow-y-auto bg-[#F9F9F9]">
			<div className="flex flex-col items-center justify-center h-full px-4 text-center">
				<div className="flex items-center justify-center w-16 h-16 mb-4 border bg-muted">
					<FileText className="w-6 h-6 text-muted-foreground" />
				</div>
				<p className="mb-2 text-sm font-bold tracking-wide uppercase">Select a submission</p>
				<div className="max-w-[280px] text-sm/relaxed leading-5 text-muted-foreground">
					When a user completes a form or action, you'll see the submitted data, execution status,
					and outcome details here.
				</div>
			</div>
		</div>
	);
}
