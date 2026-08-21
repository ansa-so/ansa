"use client";

import { ChevronLeft, ChevronRight, ExternalLink, ImageIcon, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { DisplayConfig, ProductData } from "./types";

/** Format a price value as currency. If it already has a symbol, leave it. */
function formatPrice(price: string | number): string {
	if (typeof price === "number") {
		return `$${price.toFixed(2)}`;
	}
	const trimmed = String(price).trim();
	if (!trimmed) return trimmed;
	// Already has a currency symbol or non-numeric chars → leave as-is
	if (/[^0-9.,\s-]/.test(trimmed)) return trimmed;
	const num = Number.parseFloat(trimmed.replace(/,/g, ""));
	if (Number.isNaN(num)) return trimmed;
	return `$${num.toFixed(2)}`;
}

function CarouselCard({
	data,
	options,
}: {
	data: ProductData;
	options?: DisplayConfig["options"];
}) {
	const [imgLoaded, setImgLoaded] = useState(false);
	const [imgError, setImgError] = useState(false);
	const showImage = options?.showImage !== false;
	const showPrice = options?.showPrice !== false;

	const imageSection =
		showImage && data.image && !imgError ? (
			<div className="relative w-full h-[140px] bg-[#FAFAF9] overflow-hidden border-b border-[#F3F2EE]">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={data.image}
					alt={data.title || "Product"}
					loading="lazy"
					onLoad={() => setImgLoaded(true)}
					onError={() => setImgError(true)}
					className="object-cover w-full h-full transition-all duration-500 mix-blend-multiply group-hover:scale-105"
					style={{ opacity: imgLoaded ? 1 : 0 }}
				/>
				{!imgLoaded && (
					<div className="absolute inset-0 flex items-center justify-center">
						<div className="w-6 h-6 border-2 border-gray-200 rounded-full border-t-gray-500 animate-spin" />
					</div>
				)}
			</div>
		) : showImage ? (
			<div className="relative w-full h-[140px] bg-[#FAFAF9] overflow-hidden border-b border-[#F3F2EE] flex items-center justify-center">
				<ImageIcon className="w-12 h-12 text-gray-300 stroke-1" />
			</div>
		) : null;

	const content = (
		<>
			{imageSection}
			<div className="p-3">
				{data.title && (
					<h4 className="font-bold text-xs text-[#1A1A1A] leading-tight truncate">{data.title}</h4>
				)}
				<div className="flex items-end justify-between mt-2">
					<div className="flex flex-col">
						{showPrice && data.price != null && (
							<>
								<span className="text-[8px] font-mono text-[#888] uppercase mb-0.5">Price</span>
								<span className="text-xs font-mono font-bold text-[#1A1A1A]">
									{formatPrice(data.price as string | number)}
								</span>
							</>
						)}
					</div>
					{data.url && (
						<span className="w-7 h-7 bg-[#1A1A1A] text-white flex items-center justify-center">
							<ExternalLink className="w-3.5 h-3.5" />
						</span>
					)}
				</div>
			</div>
			<div className="h-1 w-full bg-[#F3F2EE] group-hover:bg-[#1A1A1A] transition-colors duration-300" />
		</>
	);

	if (data.url) {
		return (
			<a
				href={data.url}
				target="_blank"
				rel="noopener noreferrer"
				className="group block border border-[#D1D1D1] hover:border-[#1A1A1A] bg-white overflow-hidden transition-colors no-underline text-inherit"
			>
				{content}
			</a>
		);
	}

	return (
		<div className="group border border-[#D1D1D1] hover:border-[#1A1A1A] bg-white overflow-hidden transition-colors">
			{content}
		</div>
	);
}

interface ProductCarouselProps {
	products: ProductData[];
	options?: DisplayConfig["options"];
}

export function ProductCarousel({ products, options }: ProductCarouselProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const maxItems = options?.maxItems ?? 10;
	const displayProducts = products.slice(0, maxItems);

	useEffect(() => {
		const updateScrollState = () => {
			if (!scrollRef.current) return;
			const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
			setCanScrollLeft(scrollLeft > 0);
			setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
		};
		updateScrollState();
		const el = scrollRef.current;
		if (el) {
			el.addEventListener("scroll", updateScrollState);
			return () => el.removeEventListener("scroll", updateScrollState);
		}
	}, []);

	const scroll = (direction: "left" | "right") => {
		if (!scrollRef.current) return;
		const firstCard = scrollRef.current.firstElementChild as HTMLElement | null;
		const cardWidth = firstCard ? firstCard.offsetWidth + 12 : 230;
		scrollRef.current.scrollBy({
			left: direction === "left" ? -cardWidth : cardWidth,
			behavior: "smooth",
		});
	};

	if (displayProducts.length === 0) {
		return null;
	}

	return (
		<div className="w-full">
			{/* Header */}
			<div className="flex items-center justify-between px-1 mb-3">
				<div className="flex items-center gap-2 text-[10px] font-mono text-[#888] uppercase tracking-widest">
					<ShoppingBag className="w-3 h-3" />
					<span>Recommendations ({displayProducts.length})</span>
				</div>
				{displayProducts.length > 1 && (
					<div className="flex gap-1">
						<button
							type="button"
							onClick={() => scroll("left")}
							disabled={!canScrollLeft}
							className="w-6 h-6 border border-[#E5E5E5] bg-white flex items-center justify-center disabled:opacity-40 hover:bg-[#FAFAF9] text-[#555]"
						>
							<ChevronLeft className="w-3.5 h-3.5" />
						</button>
						<button
							type="button"
							onClick={() => scroll("right")}
							disabled={!canScrollRight}
							className="w-6 h-6 border border-[#E5E5E5] bg-white flex items-center justify-center disabled:opacity-40 hover:bg-[#FAFAF9] text-[#555]"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					</div>
				)}
			</div>

			{/* Scrollable Cards */}
			<div
				ref={scrollRef}
				className="flex gap-3 px-1 pb-1 -mx-1 overflow-x-auto snap-x snap-mandatory"
				style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
			>
				{displayProducts.map((product, index) => (
					<div
						key={product.variantId || `${product.title}-${index}`}
						className="shrink-0 w-[calc(100%-24px)] max-w-[280px] min-w-[200px] snap-start"
					>
						<CarouselCard data={product} options={options} />
					</div>
				))}
				<div className="w-1 shrink-0" />
			</div>
		</div>
	);
}
