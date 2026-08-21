import { interpolateTemplate } from "./fieldMapping";
import type { BlockProps, DisplayConfig } from "./types";

interface CustomBlockProps extends BlockProps {
	data: Record<string, unknown>;
	options?: DisplayConfig["options"];
}

export function CustomBlock({ data, options, isDark }: CustomBlockProps) {
	const template = options?.template;

	if (!template) {
		// No template - render data as formatted text
		return (
			<pre
				style={{
					padding: "12px",
					borderRadius: "8px",
					backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
					color: isDark ? "#d1d5db" : "#374151",
					fontSize: "12px",
					overflow: "auto",
					marginBottom: "8px",
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
			>
				{JSON.stringify(data, null, 2)}
			</pre>
		);
	}

	const rendered = interpolateTemplate(template, data);

	// Render the interpolated template - supports basic HTML
	return (
		<div
			style={{
				padding: "12px",
				borderRadius: "8px",
				backgroundColor: isDark ? "#1f2937" : "#f3f4f6",
				color: isDark ? "#d1d5db" : "#374151",
				fontSize: "14px",
				marginBottom: "8px",
				whiteSpace: "pre-wrap",
			}}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: template is user-defined
			dangerouslySetInnerHTML={{ __html: rendered }}
		/>
	);
}
