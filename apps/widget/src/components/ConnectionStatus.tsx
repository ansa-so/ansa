import type { ConnectionState } from "@ansa/types";
import type React from "react";

interface ConnectionStatusProps {
	connectionState: ConnectionState;
	onReconnect?: () => void;
	labels?: { reconnect?: string; disconnectedTap?: string };
}

export function ConnectionStatus({ connectionState, onReconnect, labels }: ConnectionStatusProps) {
	if (connectionState === "connected") return null;

	const isDisconnected = connectionState === "disconnected";

	const getMessage = () => {
		switch (connectionState) {
			case "connecting":
				return "Connecting...";
			case "reconnecting":
				return "Reconnecting...";
			case "disconnected":
				return labels?.disconnectedTap || "Disconnected. Tap to reconnect.";
			default:
				return "";
		}
	};

	const getColor = () => {
		switch (connectionState) {
			case "connecting":
			case "reconnecting":
				return "#f59e0b";
			case "disconnected":
				return "#ef4444";
			default:
				return "#6b7280";
		}
	};

	const bgColor = isDisconnected ? "#fef2f2" : "#fff3cd";
	const borderColor = isDisconnected ? "#fecaca" : "#ffd32a";
	const textColor = isDisconnected ? "#991b1b" : "#664d03";

	const styles = {
		container: {
			display: "flex",
			alignItems: "center",
			gap: "8px",
			padding: "8px 16px",
			backgroundColor: bgColor,
			borderBottom: `1px solid ${borderColor}`,
			fontSize: "13px",
			color: textColor,
			cursor: isDisconnected && onReconnect ? "pointer" : undefined,
		} as React.CSSProperties,
		dot: {
			width: "8px",
			height: "8px",
			borderRadius: "50%",
			flexShrink: 0,
			backgroundColor: getColor(),
			animation: connectionState === "reconnecting" ? "pulse 1.5s ease-in-out infinite" : undefined,
		} as React.CSSProperties,
		reconnectBtn: {
			marginLeft: "auto",
			padding: "2px 10px",
			borderRadius: "4px",
			border: `1px solid ${borderColor}`,
			background: "transparent",
			cursor: "pointer",
			fontSize: "12px",
			fontWeight: 500,
			color: textColor,
		} as React.CSSProperties,
	};

	const handleClick = () => {
		if (isDisconnected && onReconnect) onReconnect();
	};

	return (
		<div
			style={styles.container}
			onClick={handleClick}
			onKeyDown={(e) => e.key === "Enter" && handleClick()}
			role={isDisconnected && onReconnect ? "button" : undefined}
			tabIndex={isDisconnected && onReconnect ? 0 : undefined}
		>
			<div style={styles.dot} />
			<span>{getMessage()}</span>
			{isDisconnected && onReconnect && (
				<button
					type="button"
					style={styles.reconnectBtn}
					onClick={(e) => {
						e.stopPropagation();
						onReconnect();
					}}
				>
					{labels?.reconnect || "Reconnect"}
				</button>
			)}
			<style>
				{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
			</style>
		</div>
	);
}
