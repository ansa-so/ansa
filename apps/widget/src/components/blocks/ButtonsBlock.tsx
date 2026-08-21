import type { BlockProps, ButtonData, DisplayConfig } from "./types";

interface ButtonsBlockProps extends BlockProps {
	buttons: ButtonData[];
	options?: DisplayConfig["options"];
	onButtonClick?: (action: string) => void;
}

export function ButtonsBlock({
	buttons,
	options,
	isDark,
	primaryColor,
	onButtonClick,
}: ButtonsBlockProps) {
	if (!buttons || buttons.length === 0) {
		return null;
	}

	const buttonStyle = options?.buttonStyle || "primary";

	const getButtonStyles = (style: string) => {
		switch (style) {
			case "primary":
				return {
					backgroundColor: primaryColor,
					color: "white",
					border: "none",
				};
			case "secondary":
				return {
					backgroundColor: isDark ? "#374151" : "#e5e7eb",
					color: isDark ? "#f3f4f6" : "#1f2937",
					border: "none",
				};
			default:
				return {
					backgroundColor: "transparent",
					color: primaryColor,
					border: `1px solid ${primaryColor}`,
				};
		}
	};

	const styles = getButtonStyles(buttonStyle);

	return (
		<div
			style={{
				display: "flex",
				flexWrap: "wrap",
				gap: "8px",
				marginBottom: "8px",
			}}
		>
			{buttons.map((button, index) => {
				const isLink = !!button.url;
				const commonStyles = {
					...styles,
					padding: "10px 16px",
					borderRadius: "8px",
					cursor: "pointer",
					fontSize: "13px",
					fontWeight: 500,
					textDecoration: "none",
					display: "inline-block",
					textAlign: "center" as const,
				};

				if (isLink) {
					return (
						<a
							key={index}
							href={button.url}
							target="_blank"
							rel="noopener noreferrer"
							style={commonStyles}
						>
							{button.label}
						</a>
					);
				}

				return (
					<button
						key={index}
						type="button"
						onClick={() => button.action && onButtonClick?.(button.action)}
						style={commonStyles}
					>
						{button.label}
					</button>
				);
			})}
		</div>
	);
}
