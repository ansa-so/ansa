"use client";

import { AlertTriangle, CheckCircle2, Info, Terminal } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme();

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group"
			toastOptions={{
				unstyled: true,
				classNames: {
					toast:
						"w-96 bg-white border-l-4 border-y border-r border-[#D1D1D1] shadow-[8px_8px_0px_0px_rgba(26,26,26,0.1)] relative overflow-hidden p-4 flex items-start gap-4",
					title: "text-xs font-bold text-[#1A1A1A] uppercase tracking-wide",
					description: "text-xs text-[#555] leading-relaxed mt-1",
					actionButton:
						"flex items-center gap-2 text-[10px] font-bold uppercase text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-colors border border-[#D1D1D1] px-3 py-1.5 mt-3",
					cancelButton:
						"flex items-center gap-2 text-[10px] font-bold uppercase text-[#888] hover:bg-[#F3F2EE] transition-colors border border-[#D1D1D1] px-3 py-1.5 mt-3",
					closeButton: "absolute top-2 right-2 text-[#CCC] hover:text-[#1A1A1A] transition-colors",
					success: "border-l-green-500",
					error: "border-l-red-500",
					warning: "border-l-yellow-500",
					info: "border-l-blue-500",
				},
			}}
			icons={{
				success: (
					<div className="w-10 h-10 bg-green-100 border border-[#F3F2EE] flex items-center justify-center text-green-900 flex-shrink-0">
						<CheckCircle2 size={18} strokeWidth={1.5} />
					</div>
				),
				error: (
					<div className="w-10 h-10 bg-red-100 border border-[#F3F2EE] flex items-center justify-center text-red-900 flex-shrink-0">
						<Terminal size={18} strokeWidth={1.5} />
					</div>
				),
				warning: (
					<div className="w-10 h-10 bg-yellow-100 border border-[#F3F2EE] flex items-center justify-center text-yellow-900 flex-shrink-0">
						<AlertTriangle size={18} strokeWidth={1.5} />
					</div>
				),
				info: (
					<div className="w-10 h-10 bg-blue-100 border border-[#F3F2EE] flex items-center justify-center text-blue-900 flex-shrink-0">
						<Info size={18} strokeWidth={1.5} />
					</div>
				),
			}}
			closeButton
			{...props}
		/>
	);
};

export { Toaster };
