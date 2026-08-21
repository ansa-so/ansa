"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface SwipeableContainerProps {
	children: React.ReactNode[];
	className?: string;
}

export function SwipeableContainer({ children, className }: SwipeableContainerProps) {
	const [emblaRef, emblaApi] = useEmblaCarousel({
		align: "start",
		containScroll: "trimSnaps",
	});
	const [selectedIndex, setSelectedIndex] = useState(0);

	const onSelect = useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on("select", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, onSelect]);

	const scrollTo = useCallback(
		(index: number) => {
			if (!emblaApi) return;
			emblaApi.scrollTo(index);
		},
		[emblaApi],
	);

	return (
		<div className={cn("relative", className)}>
			<div className="overflow-hidden" ref={emblaRef}>
				<div className="flex">
					{children.map((child, index) => (
						<div key={index} className="min-w-0 flex-[0_0_100%] px-1">
							{child}
						</div>
					))}
				</div>
			</div>

			{/* Dot indicators */}
			<div className="flex justify-center gap-2 mt-4 pb-2">
				{children.map((_, index) => (
					<button
						key={index}
						type="button"
						onClick={() => scrollTo(index)}
						className={cn(
							"w-2 h-2 rounded-full transition-all",
							selectedIndex === index ? "bg-primary w-4" : "bg-muted-foreground/30",
						)}
						aria-label={`Go to slide ${index + 1}`}
					/>
				))}
			</div>
		</div>
	);
}
