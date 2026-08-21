import { ProductCard } from "./ProductCard";
import type { BlockProps, DisplayConfig, ProductData } from "./types";

interface ProductGridProps extends BlockProps {
	products: ProductData[];
	options?: DisplayConfig["options"];
	onAddToCart?: (variantId: string) => void;
}

export function ProductGrid({
	products,
	options,
	isDark,
	primaryColor,
	onAddToCart,
}: ProductGridProps) {
	if (!products || products.length === 0) {
		return null;
	}

	const maxItems = options?.maxItems ?? 10;
	const viewMoreUrl = options?.viewMoreUrl;
	const displayProducts = products.slice(0, maxItems);
	const hasMore = products.length > maxItems;

	const colors = {
		textMuted: isDark ? "#9CA3AF" : "#888888",
		viewMoreBorder: isDark ? "#4b5563" : "#d1d5db",
		viewMoreBg: isDark ? "#1f2937" : "#f9fafb",
		viewMoreText: isDark ? "#9ca3af" : "#6b7280",
	};

	return (
		<div style={{ marginBottom: "8px" }}>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					fontSize: "10px",
					fontFamily: "monospace",
					color: colors.textMuted,
					textTransform: "uppercase",
					letterSpacing: "0.1em",
					paddingLeft: "4px",
					marginBottom: "12px",
				}}
			>
				<svg
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="3" y="3" width="7" height="7" />
					<rect x="14" y="3" width="7" height="7" />
					<rect x="3" y="14" width="7" height="7" />
					<rect x="14" y="14" width="7" height="7" />
				</svg>
				<span>Results ({displayProducts.length})</span>
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
					gap: "12px",
					marginBottom: hasMore && viewMoreUrl ? "12px" : "0",
				}}
			>
				{displayProducts.map((product, index) => (
					<div key={product.variantId || product.url || index} style={{ width: "100%" }}>
						<ProductCard
							data={product}
							options={options}
							isDark={isDark}
							primaryColor={primaryColor}
							onAddToCart={onAddToCart}
							fullWidth
						/>
					</div>
				))}
			</div>
			{hasMore && viewMoreUrl && (
				<a
					href={viewMoreUrl}
					target="_blank"
					rel="noopener noreferrer"
					style={{
						display: "inline-flex",
						alignItems: "center",
						gap: "6px",
						padding: "8px 12px",
						border: `1px dashed ${colors.viewMoreBorder}`,
						backgroundColor: colors.viewMoreBg,
						color: colors.viewMoreText,
						textDecoration: "none",
						fontSize: "12px",
						fontWeight: 500,
						transition: "border-color 0.15s, background-color 0.15s",
					}}
				>
					View {products.length - maxItems} more products
					<svg
						width="14"
						height="14"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
				</a>
			)}
		</div>
	);
}
