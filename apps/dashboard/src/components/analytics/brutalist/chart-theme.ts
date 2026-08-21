// Brutalist theme configuration for Recharts
export const brutalistChartTheme = {
	colors: {
		primary: "#2563EB", // Blue
		secondary: "#10B981", // Green
		tertiary: "#F59E0B", // Amber
		success: "#10B981", // Green (alias for secondary)
		text: "#1A1A1A",
		textMuted: "#888888",
		grid: "#E5E5E5",
		background: "#FAFAF9",
		border: "#D1D1D1",
	},
	gradients: {
		blue: {
			start: "rgba(37, 99, 235, 0.2)",
			end: "rgba(37, 99, 235, 0)",
		},
		green: {
			start: "rgba(16, 185, 129, 0.2)",
			end: "rgba(16, 185, 129, 0)",
		},
	},
	axis: {
		fontSize: 10,
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
		stroke: "#D1D1D1",
		tickColor: "#888888",
	},
	tooltip: {
		backgroundColor: "#FFFFFF",
		borderColor: "#D1D1D1",
		borderRadius: 0,
		fontSize: 12,
		fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
	},
} as const;

// Custom tooltip styles for Recharts
export const brutalistTooltipStyle = {
	backgroundColor: brutalistChartTheme.tooltip.backgroundColor,
	border: `1px solid ${brutalistChartTheme.tooltip.borderColor}`,
	borderRadius: brutalistChartTheme.tooltip.borderRadius,
	padding: "8px 12px",
	fontSize: brutalistChartTheme.tooltip.fontSize,
	fontFamily: brutalistChartTheme.tooltip.fontFamily,
	boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

// Axis tick style
export const brutalistAxisTickStyle = {
	fontSize: brutalistChartTheme.axis.fontSize,
	fontFamily: brutalistChartTheme.axis.fontFamily,
	fill: brutalistChartTheme.axis.tickColor,
};

// Grid stroke style
export const brutalistGridStyle = {
	stroke: brutalistChartTheme.colors.grid,
	strokeDasharray: "3 3",
};
