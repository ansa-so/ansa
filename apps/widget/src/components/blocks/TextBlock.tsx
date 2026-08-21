import { getValueByPath } from "./fieldMapping";
import type { BlockProps, DisplayConfig } from "./types";

interface TextBlockProps extends BlockProps {
	data: unknown;
	template: string;
	dataPath?: string;
	options?: DisplayConfig["options"];
}

/** Resolve a {{path}} template against data, supporting dataPath for arrays. */
function resolveTemplate(data: unknown, template: string, dataPath?: string): string[] {
	let items: unknown[];
	if (dataPath) {
		const resolved = getValueByPath(data, dataPath);
		items = Array.isArray(resolved) ? resolved : [resolved ?? data];
	} else if (Array.isArray(data)) {
		items = data;
	} else {
		items = [data];
	}

	return items.map((item) =>
		template.replace(/\{\{(.+?)\}\}/g, (_, path: string) => {
			const value = getValueByPath(item, path.trim());
			return value !== undefined && value !== null ? String(value) : "";
		}),
	);
}

export function TextBlock({ data, template, dataPath, isDark }: TextBlockProps) {
	if (!template) return null;

	const lines = resolveTemplate(data, template, dataPath);

	return (
		<div
			style={{
				borderRadius: "8px",
				border: `1px solid ${isDark ? "#374151" : "#E5E5E5"}`,
				backgroundColor: isDark ? "#1f2937" : "#FAFAF9",
				padding: "12px 16px",
				fontSize: "14px",
				color: isDark ? "#d1d5db" : "#1A1A1A",
				lineHeight: "1.6",
				whiteSpace: "pre-wrap",
			}}
		>
			{lines.map((line, i) => (
				<p
					key={`line-${i}`}
					style={{
						margin: i === 0 ? 0 : "4px 0 0 0",
					}}
				>
					{line}
				</p>
			))}
		</div>
	);
}
