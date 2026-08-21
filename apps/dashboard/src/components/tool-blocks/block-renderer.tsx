"use client";

import { ButtonsBlock } from "./buttons-block";
import { applyFieldMappings, getValueByPath } from "./field-mapping";
import { ImageBlock } from "./image-block";
import { ProductCard } from "./product-card";
import { ProductCarousel } from "./product-carousel";
import { TableBlock } from "./table-block";
import { TextBlock } from "./text-block";
import type { ButtonData, ProductData, ToolBlock } from "./types";

interface BlockRendererProps {
	block: ToolBlock;
}

// Helper to extract items array using dataPath or heuristics
function extractItemsArray(
	result: unknown,
	displayConfig: { fieldMappings?: Record<string, string>; dataPath?: string },
): Record<string, unknown>[] {
	// If displayConfig has a dataPath, use it to find the array directly
	if (displayConfig.dataPath) {
		const resolved = getValueByPath(result, displayConfig.dataPath);
		if (Array.isArray(resolved)) {
			return resolved.map((item) => applyFieldMappings(item, displayConfig.fieldMappings));
		}
	}

	// If result is already an array
	if (Array.isArray(result)) {
		return result.map((item) => applyFieldMappings(item, displayConfig.fieldMappings));
	}

	// If result is an object, look for common array properties
	if (result && typeof result === "object") {
		const resultObj = result as Record<string, unknown>;
		// Keep in sync with widget BlockRenderer and server summarizeToolResultForLLM
		const commonArrayKeys = [
			"products",
			"items",
			"data",
			"results",
			"properties",
			"listings",
			"entries",
			"records",
			"hits",
		];
		for (const key of commonArrayKeys) {
			if (Array.isArray(resultObj[key]) && (resultObj[key] as unknown[]).length > 0) {
				return (resultObj[key] as unknown[]).map((item) =>
					applyFieldMappings(item, displayConfig.fieldMappings),
				);
			}
		}
		// Fallback: find any array of objects (relaxed: no title/name requirement)
		for (const value of Object.values(resultObj)) {
			if (Array.isArray(value) && value.length > 0) {
				const firstItem = value[0];
				if (firstItem && typeof firstItem === "object") {
					return value.map((item) => applyFieldMappings(item, displayConfig.fieldMappings));
				}
			}
		}
	}

	return [];
}

export function BlockRenderer({ block }: BlockRendererProps) {
	const { displayConfig, result } = block;

	// Tool error: show a visible error indicator
	if (block.isError) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-xs">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					className="shrink-0"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
				<span>
					<strong className="font-semibold">{block.toolName}</strong> failed
					{block.errorMessage ? `: ${block.errorMessage}` : ""}
				</span>
			</div>
		);
	}

	// Text type: render with template if available, otherwise let LLM response handle it
	if (displayConfig.type === "text") {
		if (displayConfig.textFallback) {
			return (
				<TextBlock
					data={result}
					template={displayConfig.textFallback}
					dataPath={displayConfig.dataPath}
					options={displayConfig.options}
				/>
			);
		}
		return null;
	}

	// Resolve dataPath to get the target data before applying field mappings
	let targetData: unknown = result;
	if (displayConfig.dataPath) {
		const resolved = getValueByPath(result, displayConfig.dataPath);
		if (resolved !== undefined) {
			// For single-item types, pick the first element if it resolved to an array
			targetData = Array.isArray(resolved) ? (resolved[0] ?? resolved) : resolved;
		}
	}

	// Apply field mappings to transform the result
	const mappedData = applyFieldMappings(targetData, displayConfig.fieldMappings);

	switch (displayConfig.type) {
		case "product_card": {
			const productData = mappedData as ProductData;
			return <ProductCard data={productData} options={displayConfig.options} />;
		}

		case "product_carousel":
		case "product_grid": {
			const products = extractItemsArray(result, displayConfig) as ProductData[];
			return <ProductCarousel products={products} options={displayConfig.options} />;
		}

		case "image": {
			const imageData = mappedData as { url?: string; alt?: string; caption?: string };
			return <ImageBlock data={imageData} />;
		}

		case "table": {
			const tableItems = extractItemsArray(result, displayConfig);
			const tableData = tableItems.length > 0 ? tableItems : mappedData;
			return (
				<TableBlock data={tableData as Record<string, unknown>} options={displayConfig.options} />
			);
		}

		case "buttons": {
			let buttons: ButtonData[] = [];
			if (Array.isArray(mappedData.buttons)) {
				buttons = mappedData.buttons as ButtonData[];
			} else if (Array.isArray(result)) {
				buttons = result as ButtonData[];
			}

			return <ButtonsBlock buttons={buttons} options={displayConfig.options} />;
		}

		case "custom": {
			return (
				<div className="rounded-lg border p-3 bg-gray-50 dark:bg-gray-800 text-xs">
					<pre className="whitespace-pre-wrap overflow-auto max-h-40">
						{JSON.stringify(mappedData, null, 2)}
					</pre>
				</div>
			);
		}

		case "form": {
			const formName = block.toolName || "Form";
			return (
				<div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-3 text-sm">
					<svg
						className="w-4 h-4 text-blue-600 dark:text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<span className="text-blue-700 dark:text-blue-300">Form presented: {formName}</span>
				</div>
			);
		}

		default:
			return null;
	}
}
