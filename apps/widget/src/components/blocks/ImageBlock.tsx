import type { BlockProps } from "./types";

interface ImageBlockProps extends BlockProps {
	data: {
		url?: string;
		alt?: string;
		caption?: string;
	};
}

export function ImageBlock({ data, isDark }: ImageBlockProps) {
	if (!data.url) {
		return null;
	}

	return (
		<div style={{ marginBottom: "8px" }}>
			<img
				src={data.url}
				alt={data.alt || "Image"}
				style={{
					maxWidth: "100%",
					borderRadius: "8px",
					display: "block",
				}}
			/>
			{data.caption && (
				<p
					style={{
						margin: "4px 0 0",
						fontSize: "12px",
						color: isDark ? "#9ca3af" : "#6b7280",
						textAlign: "center",
					}}
				>
					{data.caption}
				</p>
			)}
		</div>
	);
}
