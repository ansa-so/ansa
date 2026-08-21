"use client";

import { AlertCircle, ArrowRight, FormInput, Settings, TrendingUp, Wrench, X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
	Dialog,
	DialogContent,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";

interface ConversionSetupModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function ConversionSetupModal({ open, onOpenChange }: ConversionSetupModalProps) {
	const router = useRouter();

	const conversionTypes = [
		{
			icon: FormInput,
			title: "Form Submissions",
			description: "Track when users complete lead gen, support, or custom forms.",
			action: "Set up forms",
			href: `/tools`,
			type: "INPUT",
		},
		{
			icon: TrendingUp,
			title: "Behavioral Triggers",
			description: "Measure engagement via automated actions triggered by conversation patterns.",
			action: "Configure triggers",
			href: `/triggers`,
			type: "EVENT",
		},
		{
			icon: Wrench,
			title: "Tool Executions",
			description: "Count successful API calls or tool usage that provide value to users.",
			action: "Add tools",
			href: `/tools`,
			type: "FUNCTION",
		},
	];

	const handleNavigate = (href: string) => {
		router.push(href);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPortal>
				<DialogOverlay className="bg-[#1A1A1A]/40 backdrop-blur-sm" />
				<DialogContent className="p-0 gap-0 border-0 bg-transparent shadow-none max-w-[800px] [&>button]:hidden">
					<DialogTitle className="sr-only">No Conversions Detected</DialogTitle>
					<div className="bg-[#F3F2EE] dark:bg-zinc-900 border border-[#D1D1D1] dark:border-zinc-700 shadow-[20px_20px_0px_0px_rgba(26,26,26,0.2)] dark:shadow-[20px_20px_0px_0px_rgba(0,0,0,0.4)] flex flex-col font-sans text-[#1A1A1A] dark:text-white">
						{/* Header */}
						<div className="flex justify-between items-start p-8 border-b border-[#D1D1D1] dark:border-zinc-700 bg-white dark:bg-zinc-900 relative overflow-hidden">
							{/* Decorative Warning Strip */}
							<div className="absolute top-0 left-0 w-full h-1 bg-yellow-400" />

							<div>
								<div className="flex items-center gap-2 mb-2">
									<div className="flex items-center justify-center p-1 text-yellow-700 bg-yellow-100 border border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-800">
										<AlertCircle size={14} />
									</div>
									<span className="font-mono text-[10px] uppercase tracking-widest text-[#888] dark:text-zinc-500">
										System Alert: Code 404
									</span>
								</div>
								<h2 className="text-2xl font-medium tracking-tight">No Conversions Detected</h2>
								<p className="text-sm text-[#555] dark:text-zinc-400 mt-2 max-w-lg leading-relaxed">
									The AI is active, but no value outcomes have been defined. Configure a conversion
									stream to measure ROI and success rates.
								</p>
							</div>

							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="p-2 hover:bg-[#F3F2EE] dark:hover:bg-zinc-800 border border-transparent hover:border-[#D1D1D1] dark:hover:border-zinc-600 transition-colors"
							>
								<X size={20} />
							</button>
						</div>

						{/* Body / Module Selector */}
						<div className="p-8 bg-[#FAFAF9] dark:bg-zinc-950">
							<div className="mb-4 text-[10px] font-mono uppercase text-[#888] dark:text-zinc-500 flex items-center gap-2">
								<Settings size={10} /> Available Modules
							</div>

							<div className="grid grid-cols-1 gap-3">
								{conversionTypes.map((type) => {
									const Icon = type.icon;
									return (
										<button
											type="button"
											key={type.title}
											onClick={() => handleNavigate(type.href)}
											className="bg-white dark:bg-zinc-900 border border-[#D1D1D1] dark:border-zinc-700 p-5 flex items-center gap-6 group hover:border-[#1A1A1A] dark:hover:border-zinc-500 hover:shadow-md transition-all cursor-pointer text-left w-full"
										>
											<div className="w-12 h-12 bg-[#F3F2EE] dark:bg-zinc-800 border border-[#E5E5E5] dark:border-zinc-700 flex items-center justify-center text-[#1A1A1A] dark:text-white group-hover:bg-[#1A1A1A] group-hover:text-white transition-colors">
												<Icon size={20} strokeWidth={1.5} />
											</div>
											<div className="flex-1">
												<div className="flex items-center gap-2 mb-1">
													<h3 className="text-sm font-bold tracking-wide uppercase">
														{type.title}
													</h3>
													<span className="text-[9px] font-mono border border-[#E5E5E5] dark:border-zinc-700 px-1 bg-[#F9F9F9] dark:bg-zinc-800 text-[#888] dark:text-zinc-500">
														TYPE: {type.type}
													</span>
												</div>
												<p className="text-xs text-[#555] dark:text-zinc-400 font-mono leading-snug">
													{type.description}
												</p>
											</div>
											<span className="h-9 px-4 border border-[#D1D1D1] dark:border-zinc-700 text-[10px] font-bold uppercase group-hover:bg-[#1A1A1A] group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-[#1A1A1A] transition-colors flex items-center gap-2">
												{type.action.split(" ").pop()} <ArrowRight size={10} />
											</span>
										</button>
									);
								})}
							</div>
						</div>

						{/* Footer / Terminal */}
						<div className="p-4 bg-[#1A1A1A] dark:bg-black text-white flex items-center justify-between">
							<div className="flex items-center gap-2 text-[10px] font-mono">
								<div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
								<span>Tracking Daemon: Standby</span>
							</div>
							<button
								type="button"
								onClick={() => onOpenChange(false)}
								className="text-[10px] font-bold uppercase text-[#888] hover:text-white transition-colors"
							>
								Dismiss Warning
							</button>
						</div>
					</div>
				</DialogContent>
			</DialogPortal>
		</Dialog>
	);
}
