import { useEffect, useRef, useState } from "react";
import type { BlockProps, DisplayConfig, ProductData } from "./types";

/** Format a price value as currency. If it already has a symbol, leave it. */
function formatPrice(price: string | number): string {
	if (typeof price === "number") {
		return `$${price.toFixed(2)}`;
	}
	const trimmed = String(price).trim();
	if (!trimmed) return trimmed;
	if (/[^0-9.,\s-]/.test(trimmed)) return trimmed;
	const num = Number.parseFloat(trimmed.replace(/,/g, ""));
	if (Number.isNaN(num)) return trimmed;
	return `$${num.toFixed(2)}`;
}

interface ProductCarouselProps extends BlockProps {
	products: ProductData[];
	options?: DisplayConfig["options"];
	onAddToCart?: (variantId: string) => void;
}

// Inline ProductCard component with new editorial design
function CarouselProductCard({
	data,
	options,
	isDark,
	primaryColor,
	onAddToCart,
}: {
	data: ProductData;
	options?: DisplayConfig["options"];
	isDark: boolean;
	primaryColor: string;
	onAddToCart?: (variantId: string) => void;
}) {
	const [isHovered, setIsHovered] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const showImage = options?.showImage !== false;
	const showPrice = options?.showPrice !== false;
	const showAddToCart = options?.showAddToCart === true && data.variantId;

	// Theme-aware colors (ready for isDark when enabled)
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
					height: "140px",
					backgroundColor: colors.imageBg,
					overflow: "hidden",
					borderBottom: "1px solid #F3F2EE",
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
					height: "140px",
					backgroundColor: colors.imageBg,
					overflow: "hidden",
					borderBottom: "1px solid #F3F2EE",
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
							fontSize: "12px",
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
										fontSize: "12px",
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

			{/* Bottom Status Bar */}
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
		width: "100%",
		backgroundColor: colors.cardBg,
		border: `1px solid ${isHovered ? colors.borderHover : colors.border}`,
		transition: "border-color 0.2s",
		position: "relative",
		userSelect: "none",
		overflow: "hidden",
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

export function ProductCarousel({
	products,
	options,
	isDark,
	primaryColor,
	onAddToCart,
}: ProductCarouselProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const maxItems = options?.maxItems ?? 10;
	const viewMoreUrl = options?.viewMoreUrl;
	const displayProducts = products.slice(0, maxItems);
	const hasMore = products.length > maxItems;

	// Theme-aware colors
	const colors = {
		text: isDark ? "#F3F4F6" : "#1A1A1A",
		textMuted: isDark ? "#9CA3AF" : "#888888",
		buttonBorder: isDark ? "#4B5563" : "#E5E5E5",
		buttonBg: isDark ? "#1f2937" : "#FFFFFF",
		buttonHoverBg: isDark ? "#374151" : "#FAFAF9",
		buttonText: isDark ? "#D1D5DB" : "#555555",
		viewMoreBorder: isDark ? "#4b5563" : "#d1d5db",
		viewMoreBg: isDark ? "#1f2937" : "#f9fafb",
		viewMoreText: isDark ? "#9ca3af" : "#6b7280",
	};

	useEffect(() => {
		const updateScrollState = () => {
			if (!scrollRef.current) return;
			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
		};

		updateScrollState();
		const scrollElement = scrollRef.current;
		if (scrollElement) {
			scrollElement.addEventListener("scroll", updateScrollState);
			return () => scrollElement.removeEventListener("scroll", updateScrollState);
		}
	}, []);

	const scroll = (direction: "left" | "right") => {
		if (!scrollRef.current) return;
		// Get actual card width dynamically
		const firstCard = scrollRef.current.firstElementChild as HTMLElement | null;
		const cardWidth = firstCard ? firstCard.offsetWidth + 12 : 230; // card + gap
		const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
		scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
	};

	if (!products || products.length === 0) {
		return null;
	}

	return (
		<div style={{ width: "100%" }}>
			{/* Header with controls */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					paddingLeft: "4px",
					paddingRight: "4px",
					marginBottom: "12px",
				}}
			>
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
					}}
				>
					{/* Shopping bag icon */}
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
						<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
						<line x1="3" y1="6" x2="21" y2="6" />
						<path d="M16 10a4 4 0 0 1-8 0" />
					</svg>
					<span>Recommendations ({displayProducts.length})</span>
				</div>

				{displayProducts.length > 1 && (
					<div style={{ display: "flex", gap: "4px" }}>
						<button
							type="button"
							onClick={() => scroll("left")}
							disabled={!canScrollLeft}
							aria-label="Previous product"
							style={{
								width: "24px",
								height: "24px",
								border: `1px solid ${colors.buttonBorder}`,
								backgroundColor: colors.buttonBg,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: canScrollLeft ? "pointer" : "default",
								opacity: canScrollLeft ? 1 : 0.4,
								color: colors.buttonText,
								padding: 0,
							}}
						>
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
								<polyline points="15 18 9 12 15 6" />
							</svg>
						</button>
						<button
							type="button"
							onClick={() => scroll("right")}
							disabled={!canScrollRight}
							aria-label="Next product"
							style={{
								width: "24px",
								height: "24px",
								border: `1px solid ${colors.buttonBorder}`,
								backgroundColor: colors.buttonBg,
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								cursor: canScrollRight ? "pointer" : "default",
								opacity: canScrollRight ? 1 : 0.4,
								color: colors.buttonText,
								padding: 0,
							}}
						>
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
								<polyline points="9 18 15 12 9 6" />
							</svg>
						</button>
					</div>
				)}
			</div>

			{/* Carousel Container - full width with negative margin trick */}
			<div
				ref={scrollRef}
				className="scrollbar-hide"
				style={{
					display: "flex",
					gap: "12px",
					overflowX: "auto",
					paddingBottom: "4px",
					paddingLeft: "4px",
					paddingRight: "4px",
					marginLeft: "-4px",
					marginRight: "-4px",
					scrollSnapType: "x mandatory",
					WebkitOverflowScrolling: "touch",
					scrollbarWidth: "none",
					msOverflowStyle: "none",
				}}
			>
				{displayProducts.map((product, index) => (
					<div
						key={product.variantId || index}
						style={{
							flexShrink: 0,
							width: "calc(100% - 24px)",
							maxWidth: "280px",
							minWidth: "200px",
							scrollSnapAlign: "start",
						}}
					>
						<CarouselProductCard
							data={product}
							options={options}
							isDark={isDark}
							primaryColor={primaryColor}
							onAddToCart={onAddToCart}
						/>
					</div>
				))}

				{/* View More card */}
				{hasMore && viewMoreUrl && (
					<div
						style={{
							flexShrink: 0,
							width: "calc(100% - 24px)",
							maxWidth: "280px",
							minWidth: "200px",
							scrollSnapAlign: "start",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<a
							href={viewMoreUrl}
							target="_blank"
							rel="noopener noreferrer"
							style={{
								display: "flex",
								flexDirection: "column",
								alignItems: "center",
								justifyContent: "center",
								gap: "8px",
								width: "100%",
								height: "100%",
								minHeight: "180px",
								border: `2px dashed ${colors.viewMoreBorder}`,
								backgroundColor: colors.viewMoreBg,
								color: colors.viewMoreText,
								textDecoration: "none",
								fontSize: "14px",
								fontWeight: 500,
								textAlign: "center",
								transition: "border-color 0.15s, background-color 0.15s",
							}}
						>
							<svg
								width="24"
								height="24"
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
							<span>View {products.length - maxItems} more</span>
						</a>
					</div>
				)}

				{/* Spacer to allow last item to be fully visible */}
				<div style={{ flexShrink: 0, width: "4px" }} />
			</div>
		</div>
	);
}
