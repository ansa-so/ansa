import type React from "react";

interface TypingIndicatorProps {
	userName?: string;
	primaryColor?: string;
}

export function TypingIndicator({
	userName = "Agent",
	primaryColor = "#3b82f6",
}: TypingIndicatorProps) {
	const styles = {
		container: {
			display: "flex",
			alignItems: "center",
			gap: "8px",
			padding: "8px 12px",
			marginBottom: "8px",
		} as React.CSSProperties,
		text: {
			fontSize: "11px",
			color: "#6b7280",
			fontStyle: "italic",
		} as React.CSSProperties,
		dotsContainer: {
			display: "flex",
			gap: "4px",
			alignItems: "center",
		} as React.CSSProperties,
		dot: {
			width: "4px",
			height: "4px",
			borderRadius: "50%",
			backgroundColor: primaryColor,
			opacity: 0.7,
		} as React.CSSProperties,
	};

	return (
		<div style={styles.container}>
			<span style={styles.text}>{userName} is typing</span>
			<div style={styles.dotsContainer}>
				<div style={{ ...styles.dot, animation: "bounce 700ms ease-in-out 0s infinite" }} />
				<div style={{ ...styles.dot, animation: "bounce 700ms ease-in-out 150ms infinite" }} />
				<div style={{ ...styles.dot, animation: "bounce 700ms ease-in-out 300ms infinite" }} />
			</div>
			<style>
				{`
					@keyframes bounce {
						0%, 60%, 100% { transform: translateY(0); }
						30% { transform: translateY(-3px); }
					}
				`}
			</style>
		</div>
	);
}
