import { useState } from "react";
import type { BlockProps, DisplayConfig, ProductData } from "./types";

/** Format a price value as currency. If it already has a symbol, leave it. */
function formatPrice(price: string | number): string {
	// Handle numbers directly
	if (typeof price === "number") {
		return `$${price.toFixed(2)}`;
	}
	const trimmed = String(price).trim();
	if (!trimmed) return trimmed;
	// Already has a currency symbol or letters (e.g. "$29.99", "€10", "USD 5")
	if (/[^0-9.,\s-]/.test(trimmed)) return trimmed;
	// Parse as number and format
	const num = Number.parseFloat(trimmed.replace(/,/g, ""));
	if (Number.isNaN(num)) return trimmed;
	return `$${num.toFixed(2)}`;
}

interface ProductCardProps extends BlockProps {
	data: ProductData;
	options?: DisplayConfig["options"];
	onAddToCart?: (variantId: string) => void;
	fullWidth?: boolean;
}

export function ProductCard({
	data,
	options,
	isDark,
	primaryColor,
	onAddToCart,
	fullWidth,
}: ProductCardProps) {
	const [isHovered, setIsHovered] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const showImage = options?.showImage !== false;
	const showPrice = options?.showPrice !== false;
	const showAddToCart = options?.showAddToCart === true && data.variantId;
	const isCompact = options?.cardStyle === "compact";
	const imageHeight = isCompact ? 140 : 180;

	// Theme-aware colors (matches carousel editorial style)
	const colors = {
		border: isDark ? "#374151" : "#D1D1D1",
		borderHover: isDark ? "#9CA3AF" : "#1A1A1A",
		cardBg: isDark ? "#1f2937" : "#FFFFFF",
		imageBg: isDark ? "#374151" : "#FAFAF9",
		text: isDark ? "#F3F4F6" : "#1A1A1A",
		textMuted: isDark ? "#9CA3AF" : "#888888",
		textSecondary: isDark ? "#D1D5DB" : "#555555",
		accentBar: isDark ? "#374151" : "#F3F2EE",
		accentBarHover: isDark ? "#9CA3AF" : "#1A1A1A",
		badgeBg: isDark ? "rgba(55, 65, 81, 0.9)" : "rgba(255, 255, 255, 0.9)",
		badgeBorder: isDark ? "#4B5563" : "#E5E5E5",
	};

	const ImageSection =
		showImage && data.image && !imageError ? (
			<div
				style={{
					position: "relative",
					width: "100%",
					height: `${imageHeight}px`,
					backgroundColor: colors.imageBg,
					overflow: "hidden",
					borderBottom: `1px solid ${isDark ? "#374151" : "#F3F2EE"}`,
				}}
			>
				{/* SKU Badge - top left */}
				{data.variantId && (
					<span
						style={{
							position: "absolute",
							top: "8px",
							left: "8px",
							zIndex: 10,
							backgroundColor: colors.badgeBg,
							backdropFilter: "blur(4px)",
							border: `1px solid ${colors.badgeBorder}`,
							padding: "2px 6px",
							fontSize: "8px",
							fontFamily: "monospace",
							color: colors.textSecondary,
							textTransform: "uppercase",
							pointerEvents: "none",
						}}
					>
						{data.variantId.slice(0, 12)}
					</span>
				)}

				{/* Loading spinner */}
				{!imageLoaded && (
					<div
						style={{
							position: "absolute",
							inset: 0,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<div
							style={{
								width: "24px",
								height: "24px",
								border: `2px solid ${isDark ? "#4b5563" : "#e5e7eb"}`,
								borderTopColor: primaryColor,
								borderRadius: "50%",
								animation: "spin 1s linear infinite",
							}}
						/>
					</div>
				)}

				<img
					src={data.image}
					alt={data.title || "Product"}
					loading="lazy"
					onLoad={() => setImageLoaded(true)}
					onError={() => setImageError(true)}
					style={{
						width: "100%",
						height: "100%",
						objectFit: "cover",
						mixBlendMode: "multiply",
						opacity: imageLoaded ? 1 : 0,
						transition: "opacity 0.2s, transform 0.5s",
						transform: isHovered ? "scale(1.05)" : "scale(1)",
					}}
				/>

				{/* Hover overlay */}
				<div
					style={{
						position: "absolute",
						inset: 0,
						backgroundColor: isHovered ? "rgba(26, 26, 26, 0.05)" : "transparent",
						transition: "background-color 0.2s",
						pointerEvents: "none",
					}}
				/>
			</div>
		) : showImage ? (
			// Placeholder when no image
			<div
				style={{
					position: "relative",
					width: "100%",
					height: `${imageHeight}px`,
					backgroundColor: colors.imageBg,
					overflow: "hidden",
					borderBottom: `1px solid ${isDark ? "#374151" : "#F3F2EE"}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<svg
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke={colors.textMuted}
					strokeWidth="1"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<polyline points="21 15 16 10 5 21" />
				</svg>
			</div>
		) : null;

	const cardContent = (
		<>
			{ImageSection}

			{/* Details Body */}
			<div style={{ padding: "12px" }}>
				{data.title && (
					<h4
						style={{
							margin: 0,
							fontWeight: 700,
							fontSize: "13px",
							color: colors.text,
							lineHeight: 1.3,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{data.title}
					</h4>
				)}

				{data.description && (
					<p
						style={{
							margin: "4px 0 0",
							fontSize: "11px",
							color: colors.textMuted,
							lineHeight: 1.4,
							display: "-webkit-box",
							WebkitLineClamp: 2,
							WebkitBoxOrient: "vertical",
							overflow: "hidden",
						}}
					>
						{data.description}
					</p>
				)}

				<div
					style={{
						display: "flex",
						alignItems: "flex-end",
						justifyContent: "space-between",
						marginTop: "8px",
					}}
				>
					<div style={{ display: "flex", flexDirection: "column" }}>
						{showPrice && data.price != null && (
							<>
								<span
									style={{
										fontSize: "8px",
										fontFamily: "monospace",
										color: colors.textMuted,
										textTransform: "uppercase",
										marginBottom: "2px",
									}}
								>
									Unit Price
								</span>
								<span
									style={{
										fontSize: "13px",
										fontFamily: "monospace",
										fontWeight: 700,
										color: colors.text,
									}}
								>
									{formatPrice(data.price as string | number)}
								</span>
							</>
						)}
					</div>

					{/* Action button */}
					{showAddToCart && data.variantId && onAddToCart ? (
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								onAddToCart(data.variantId!);
							}}
							style={{
								width: "28px",
								height: "28px",
								backgroundColor: colors.text,
								color: colors.cardBg,
								border: "none",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: "pointer",
								transition: "background-color 0.2s",
							}}
						>
							{/* Plus icon */}
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
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
						</button>
					) : data.url ? (
						<span
							style={{
								width: "28px",
								height: "28px",
								backgroundColor: colors.text,
								color: colors.cardBg,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							{/* Arrow up right icon */}
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
								<line x1="7" y1="17" x2="17" y2="7" />
								<polyline points="7 7 17 7 17 17" />
							</svg>
						</span>
					) : null}
				</div>
			</div>

			{/* Bottom Accent Bar */}
			<div
				style={{
					height: "4px",
					width: "100%",
					backgroundColor: isHovered ? colors.accentBarHover : colors.accentBar,
					transition: "background-color 0.3s",
				}}
			/>
		</>
	);

	const cardStyle: React.CSSProperties = {
		width: fullWidth ? "100%" : undefined,
		maxWidth: fullWidth ? "100%" : "280px",
		backgroundColor: colors.cardBg,
		border: `1px solid ${isHovered ? colors.borderHover : colors.border}`,
		transition: "border-color 0.2s",
		position: "relative",
		userSelect: "none",
		overflow: "hidden",
		marginBottom: "8px",
	};

	if (data.url) {
		return (
			<a
				href={data.url}
				target="_blank"
				rel="noopener noreferrer"
				style={{ ...cardStyle, textDecoration: "none", color: "inherit", display: "block" }}
				onMouseEnter={() => setIsHovered(true)}
				onMouseLeave={() => setIsHovered(false)}
			>
				{cardContent}
			</a>
		);
	}

	return (
		// biome-ignore lint/a11y/useSemanticElements: product card is visually a card, not a fieldset
		<div
			role="group"
			style={cardStyle}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			{cardContent}
		</div>
	);
}
