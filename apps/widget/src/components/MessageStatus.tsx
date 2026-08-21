import type { DeliveryStatus } from "@ansa/types";
import type React from "react";

interface MessageStatusProps {
	status: DeliveryStatus;
	primaryColor?: string;
	onRetry?: () => void;
	failedLabel?: string;
}

export function MessageStatus({
	status,
	primaryColor = "#3b82f6",
	onRetry,
	failedLabel,
}: MessageStatusProps) {
	const styles = {
		container: {
			display: "inline-flex",
			alignItems: "center",
			marginLeft: "4px",
		} as React.CSSProperties,
		checkmark: {
			width: "14px",
			height: "14px",
			color: status === "delivered" ? primaryColor : "#9ca3af",
		} as React.CSSProperties,
	};

	if (status === "failed") {
		return (
			<div
				style={{ ...styles.container, cursor: onRetry ? "pointer" : undefined, gap: "4px" }}
				onClick={onRetry}
				onKeyDown={(e) => e.key === "Enter" && onRetry?.()}
				role={onRetry ? "button" : undefined}
				tabIndex={onRetry ? 0 : undefined}
			>
				<svg
					style={{ width: "14px", height: "14px", color: "#ef4444" }}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				{failedLabel && <span style={{ fontSize: "11px", color: "#ef4444" }}>{failedLabel}</span>}
			</div>
		);
	}

	if (status === "sending") {
		return (
			<div style={styles.container}>
				<svg style={styles.checkmark} fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
				</svg>
			</div>
		);
	}

	// Delivered - double checkmark
	return (
		<div style={styles.container}>
			<svg style={styles.checkmark} fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
			</svg>
			<svg
				style={{ ...styles.checkmark, marginLeft: "-8px" }}
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
			</svg>
		</div>
	);
}
