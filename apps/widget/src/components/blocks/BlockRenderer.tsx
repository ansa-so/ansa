import { useState } from "react";
import { ButtonsBlock } from "./ButtonsBlock";
import { CustomBlock } from "./CustomBlock";
import { applyFieldMappings, getValueByPath } from "./fieldMapping";
import { ImageBlock } from "./ImageBlock";
import { ProductCard } from "./ProductCard";
import { ProductCarousel } from "./ProductCarousel";
import { ProductGrid } from "./ProductGrid";
import { TableBlock } from "./TableBlock";
import { TextBlock } from "./TextBlock";
import type { BlockProps, ButtonData, ProductData, ToolBlock } from "./types";

interface BlockRendererProps extends BlockProps {
	block: ToolBlock;
	onAddToCart?: (variantId: string) => void;
	onButtonClick?: (action: string) => void;
}

// Helper to extract an array from the result, with dataPath support
function extractItemsArray(
	result: unknown,
	displayConfig: ToolBlock["displayConfig"],
): Record<string, unknown>[] {
	// If displayConfig has a dataPath, use it to find the array directly
	if (displayConfig.dataPath) {
		const resolved = getValueByPath(result, displayConfig.dataPath);
		if (Array.isArray(resolved)) {
			return resolved.map((item) => applyFieldMappings(item, displayConfig.fieldMappings));
		}
	}

	// If result is already an array, apply field mappings to each item
	if (Array.isArray(result)) {
		return result.map((item) => applyFieldMappings(item, displayConfig.fieldMappings));
	}

	// If result is an object, look for common array properties first (before field mapping)
	if (result && typeof result === "object") {
		const resultObj = result as Record<string, unknown>;

		// Check for common array property names (keep in sync with summarizeToolResultForLLM)
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

		// Try to find any array of objects in the result (relaxed: no title/name requirement)
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

// Collapsible debug panel for tool execution details (only visible in dashboard /chat with _debug)
function DebugPanel({ block, isDark }: { block: ToolBlock; isDark: boolean }) {
	const [open, setOpen] = useState(false);
	const { debugInfo } = block;
	if (!debugInfo) return null;

	const statusColor =
		debugInfo.statusCode && debugInfo.statusCode < 400
			? isDark
				? "#4ade80"
				: "#16a34a"
			: isDark
				? "#fca5a5"
				: "#dc2626";

	return (
		<div
			style={{
				marginTop: "6px",
				borderRadius: "8px",
				border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`,
				fontSize: "12px",
				fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
				overflow: "hidden",
			}}
		>
			<button
				type="button"
				onClick={() => setOpen(!open)}
				style={{
					display: "flex",
					alignItems: "center",
					gap: "6px",
					width: "100%",
					padding: "6px 10px",
					background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
					border: "none",
					cursor: "pointer",
					color: isDark ? "#9ca3af" : "#6b7280",
					fontSize: "12px",
					fontFamily: "inherit",
					textAlign: "left",
				}}
			>
				<span
					style={{
						transform: open ? "rotate(90deg)" : "rotate(0deg)",
						transition: "transform 0.15s",
						display: "inline-block",
					}}
				>
					▶
				</span>
				<span style={{ color: statusColor, fontWeight: 600 }}>{debugInfo.statusCode ?? "ERR"}</span>
				<span>{debugInfo.method}</span>
				<span style={{ opacity: 0.6 }}>·</span>
				<span>{debugInfo.executionTimeMs}ms</span>
			</button>
			{open && (
				<div
					style={{
						padding: "8px 10px",
						background: isDark ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.02)",
						display: "flex",
						flexDirection: "column",
						gap: "6px",
					}}
				>
					<div style={{ wordBreak: "break-all" }}>
						<span style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>URL: </span>
						{debugInfo.url}
					</div>
					<div>
						<span style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>Status: </span>
						<span style={{ color: statusColor }}>{debugInfo.statusCode ?? "Network error"}</span>
					</div>
					<div>
						<span style={{ color: isDark ? "#9ca3af" : "#6b7280" }}>Response:</span>
						<pre
							style={{
								marginTop: "4px",
								padding: "8px",
								borderRadius: "4px",
								background: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.05)",
								whiteSpace: "pre-wrap",
								wordBreak: "break-all",
								maxHeight: "200px",
								overflow: "auto",
								fontSize: "11px",
								lineHeight: "1.4",
								margin: "4px 0 0 0",
							}}
						>
							{debugInfo.rawResponse}
						</pre>
					</div>
				</div>
			)}
		</div>
	);
}

export function BlockRenderer({
	block,
	isDark,
	primaryColor,
	onAddToCart,
	onButtonClick,
}: BlockRendererProps) {
	const { displayConfig, result } = block;

	// Tool error: show a user-friendly error indicator
	if (block.isError) {
		return (
			<>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "8px",
						padding: "8px 12px",
						borderRadius: "8px",
						background: isDark ? "rgba(239,68,68,0.1)" : "rgba(239,68,68,0.06)",
						border: `1px solid ${isDark ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.2)"}`,
						color: isDark ? "#fca5a5" : "#b91c1c",
						fontSize: "13px",
					}}
				>
					<svg
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
						style={{ flexShrink: 0 }}
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
					<span>
						<strong>{block.toolName}</strong> could not be reached
					</span>
				</div>
				<DebugPanel block={block} isDark={isDark} />
			</>
		);
	}

	// Text type: render with template if available, otherwise let LLM response handle it
	if (displayConfig.type === "text") {
		if (displayConfig.textFallback) {
			return (
				<>
					<TextBlock
						data={result}
						template={displayConfig.textFallback}
						dataPath={displayConfig.dataPath}
						isDark={isDark}
						primaryColor={primaryColor}
					/>
					{block.debugInfo && <DebugPanel block={block} isDark={isDark} />}
				</>
			);
		}
		// No rich content, but show debug panel if present (debug mode)
		if (block.debugInfo) {
			return <DebugPanel block={block} isDark={isDark} />;
		}
		return null;
	}

	// Apply field mappings to transform the result
	const mappedData = applyFieldMappings(result, displayConfig.fieldMappings);

	let rendered: React.ReactNode = null;

	switch (displayConfig.type) {
		case "product_card": {
			const productData = mappedData as ProductData;
			rendered = (
				<ProductCard
					data={productData}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
					onAddToCart={onAddToCart}
				/>
			);
			break;
		}

		case "product_carousel": {
			const products = extractItemsArray(result, displayConfig) as ProductData[];
			rendered = (
				<ProductCarousel
					products={products}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
					onAddToCart={onAddToCart}
				/>
			);
			break;
		}

		case "product_grid": {
			const products = extractItemsArray(result, displayConfig) as ProductData[];
			rendered = (
				<ProductGrid
					products={products}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
					onAddToCart={onAddToCart}
				/>
			);
			break;
		}

		case "image": {
			const imageData = mappedData as { url?: string; alt?: string; caption?: string };
			rendered = <ImageBlock data={imageData} isDark={isDark} primaryColor={primaryColor} />;
			break;
		}

		case "table": {
			// For tables with dataPath or array responses, iterate properly
			const tableItems = extractItemsArray(result, displayConfig);
			const tableData = tableItems.length > 0 ? tableItems : mappedData;
			rendered = (
				<TableBlock
					data={tableData}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
				/>
			);
			break;
		}

		case "buttons": {
			let buttons: ButtonData[] = [];
			if (Array.isArray(mappedData.buttons)) {
				buttons = mappedData.buttons as ButtonData[];
			} else if (Array.isArray(result)) {
				buttons = result as ButtonData[];
			}

			rendered = (
				<ButtonsBlock
					buttons={buttons}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
					onButtonClick={onButtonClick}
				/>
			);
			break;
		}

		case "custom": {
			rendered = (
				<CustomBlock
					data={mappedData}
					options={displayConfig.options}
					isDark={isDark}
					primaryColor={primaryColor}
				/>
			);
			break;
		}

		default:
			break;
	}

	// Append debug panel after any successfully rendered block
	if (block.debugInfo) {
		return (
			<>
				{rendered}
				<DebugPanel block={block} isDark={isDark} />
			</>
		);
	}

	return rendered;
}
