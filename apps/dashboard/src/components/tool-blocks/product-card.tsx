"use client";

import { ExternalLink, ImageIcon } from "lucide-react";
import { useState } from "react";
import type { DisplayConfig, ProductData } from "./types";

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

interface ProductCardProps {
	data: ProductData;
	options?: DisplayConfig["options"];
}

export function ProductCard({ data, options }: ProductCardProps) {
	const [imgLoaded, setImgLoaded] = useState(false);
	const [imgError, setImgError] = useState(false);
	const showPrice = options?.showPrice !== false;
	const showImage = options?.showImage !== false;

	const content = (
		<>
			{showImage && data.image && !imgError ? (
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
				<div className="w-full h-[140px] bg-[#FAFAF9] border-b border-[#F3F2EE] flex items-center justify-center">
					<ImageIcon className="w-12 h-12 text-gray-300 stroke-1" />
				</div>
			) : null}

			<div className="p-3">
				{data.title && (
					<h4 className="font-bold text-xs text-[#1A1A1A] leading-tight truncate">{data.title}</h4>
				)}
				{data.description && (
					<p className="text-[10px] text-[#888] mt-1 line-clamp-2 leading-tight">
						{data.description}
					</p>
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
				className="group block max-w-[280px] border border-[#D1D1D1] hover:border-[#1A1A1A] bg-white overflow-hidden transition-colors no-underline text-inherit"
			>
				{content}
			</a>
		);
	}

	return (
		<div className="group max-w-[280px] border border-[#D1D1D1] hover:border-[#1A1A1A] bg-white overflow-hidden transition-colors">
			{content}
		</div>
	);
}
