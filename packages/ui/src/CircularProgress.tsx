"use client";

export interface CircularProgressProps {
	/** Value from 0-100, or null to show empty state */
	value: number | null | undefined;
	/** Size in pixels (default: 18) */
	size?: number;
	/** Additional classes */
	className?: string;
}

export function CircularProgress({ value, size = 18, className = "" }: CircularProgressProps) {
	const strokeWidth = 2;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	// Calculate stroke dashoffset based on value
	const normalizedValue = value ?? 0;
	const progress = Math.min(Math.max(normalizedValue, 0), 100);
	const strokeDashoffset = circumference - (progress / 100) * circumference;

	// Grayscale gradient: lower confidence = lighter, higher = darker
	// Range from 30% to 80% opacity based on value
	const strokeOpacity = value != null ? 0.3 + (progress / 100) * 0.5 : 0.2;

	// Font size scales with component size
	const fontSize = Math.max(size * 0.35, 5);

	const displayText = value != null ? Math.round(value).toString() : "—";

	return (
		<div
			className={`relative inline-flex items-center justify-center ${className}`}
			style={{ width: size, height: size }}
		>
			<svg
				width={size}
				height={size}
				viewBox={`0 0 ${size} ${size}`}
				style={{ transform: "rotate(-90deg)" }}
			>
				{/* Track (background circle) */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					stroke="currentColor"
					style={{ opacity: 0.15 }}
				/>
				{/* Progress circle */}
				<circle
					cx={size / 2}
					cy={size / 2}
					r={radius}
					fill="none"
					strokeWidth={strokeWidth}
					strokeLinecap="round"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					stroke="currentColor"
					style={{
						opacity: strokeOpacity,
						transition: "stroke-dashoffset 0.3s ease",
					}}
				/>
			</svg>
			{/* Center text */}
			<span
				style={{
					position: "absolute",
					fontSize: `${fontSize}px`,
					lineHeight: 1,
					opacity: value != null ? 0.7 : 0.4,
					fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
					color: "currentColor",
				}}
			>
				{displayText}
			</span>
		</div>
	);
}
