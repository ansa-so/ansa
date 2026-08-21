"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
	variant?: "default" | "hardware";
}

export function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	// Prevent hydration mismatch
	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		if (variant === "hardware") {
			return (
				<div className="flex bg-[#F3F2EE] p-1 border border-[#E5E5E5]">
					<button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase bg-white shadow-sm text-[#1A1A1A] border border-[#D1D1D1]">
						<Sun size={12} /> Light
					</button>
					<button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase text-[#888]">
						<Moon size={12} /> Dark
					</button>
					<button className="flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase text-[#888]">
						<Monitor size={12} /> Auto
					</button>
				</div>
			);
		}
		return (
			<button
				className="bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-full flex items-center gap-0.5 transition-colors"
				aria-label="Toggle theme"
			>
				<div className="p-1 rounded-full transition-all bg-neutral-900 dark:bg-transparent shadow-sm dark:shadow-none">
					<Sun className="w-3 h-3 text-white dark:text-neutral-500" aria-hidden="true" />
				</div>
				<div className="p-1 rounded-full transition-all bg-transparent dark:bg-neutral-700 dark:shadow-sm">
					<Moon className="w-3 h-3 text-neutral-500 dark:text-white" aria-hidden="true" />
				</div>
			</button>
		);
	}

	const isDark = theme === "dark";
	const isSystem = theme === "system";

	if (variant === "hardware") {
		return (
			<div className="flex bg-[#F3F2EE] p-1 border border-[#E5E5E5]">
				<button
					type="button"
					onClick={() => setTheme("light")}
					className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase transition-all ${
						!isDark && !isSystem
							? "bg-white shadow-sm text-[#1A1A1A] border border-[#D1D1D1]"
							: "text-[#888] hover:text-[#555]"
					}`}
				>
					<Sun size={12} /> Light
				</button>
				<button
					type="button"
					onClick={() => setTheme("dark")}
					className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase transition-all ${
						isDark
							? "bg-[#1A1A1A] shadow-sm text-white border border-[#1A1A1A]"
							: "text-[#888] hover:text-[#555]"
					}`}
				>
					<Moon size={12} /> Dark
				</button>
				<button
					type="button"
					onClick={() => setTheme("system")}
					className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[9px] font-bold uppercase transition-all ${
						isSystem
							? "bg-white shadow-sm text-[#1A1A1A] border border-[#D1D1D1]"
							: "text-[#888] hover:text-[#555]"
					}`}
				>
					<Monitor size={12} /> Auto
				</button>
			</div>
		);
	}

	return (
		<button
			className="bg-neutral-200 dark:bg-neutral-800 p-0.5 rounded-full flex items-center gap-0.5 transition-colors hover:bg-neutral-300 dark:hover:bg-neutral-700"
			aria-label="Toggle theme"
			onClick={() => setTheme(isDark ? "light" : "dark")}
		>
			<div
				className={`p-1 rounded-full transition-all ${!isDark ? "bg-neutral-900 shadow-sm" : "bg-transparent"}`}
			>
				<Sun
					className={`w-3 h-3 ${!isDark ? "text-white" : "text-neutral-500"}`}
					aria-hidden="true"
				/>
			</div>
			<div
				className={`p-1 rounded-full transition-all ${isDark ? "bg-neutral-700 shadow-sm" : "bg-transparent"}`}
			>
				<Moon
					className={`w-3 h-3 ${isDark ? "text-white" : "text-neutral-500"}`}
					aria-hidden="true"
				/>
			</div>
		</button>
	);
}
