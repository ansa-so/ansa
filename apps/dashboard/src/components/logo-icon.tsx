"use client";

interface LogoIconProps {
	className?: string;
	showSubtitle?: boolean;
	size?: "sm" | "md" | "lg";
}

export function LogoIcon({ className = "", showSubtitle = false, size = "sm" }: LogoIconProps) {
	const sizeClasses = {
		sm: "w-6 h-6 text-sm",
		md: "w-8 h-8 text-lg",
		lg: "w-10 h-10 text-xl",
	};

	return (
		<div className={`flex flex-col ${className}`}>
			<div className="flex items-center gap-2">
				<div
					className={`${sizeClasses[size]} bg-[#1A1A1A] text-white flex items-center justify-center font-bold rounded-sm`}
				>
					A
				</div>
				<span className={`${size === "sm" ? "text-sm" : "text-lg"} font-bold tracking-tight`}>
					ANSA
				</span>
			</div>
			{showSubtitle && (
				<div className="text-[10px] font-mono text-[#888] uppercase tracking-widest ml-1 mt-0.5">
					INTELLIGENCE INC.
				</div>
			)}
		</div>
	);
}
