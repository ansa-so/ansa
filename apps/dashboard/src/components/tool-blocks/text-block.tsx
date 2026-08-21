"use client";

import { getValueByPath } from "./field-mapping";
import type { DisplayConfig } from "./types";

interface TextBlockProps {
	data: unknown;
	template: string;
	dataPath?: string;
	options?: DisplayConfig["options"];
}

/** Resolve a {{path}} template against data, supporting dataPath for arrays. */
function resolveTemplate(data: unknown, template: string, dataPath?: string): string[] {
	// If dataPath resolves to an array, produce one line per item
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

export function TextBlock({ data, template, dataPath }: TextBlockProps) {
	if (!template) return null;

	const lines = resolveTemplate(data, template, dataPath);

	return (
		<div className="rounded-lg border border-[#E5E5E5] bg-[#FAFAF9] px-4 py-3 text-sm text-[#1A1A1A] space-y-1">
			{lines.map((line, i) => (
				<p key={`line-${i}`} className="leading-relaxed whitespace-pre-wrap">
					{line}
				</p>
			))}
		</div>
	);
}
