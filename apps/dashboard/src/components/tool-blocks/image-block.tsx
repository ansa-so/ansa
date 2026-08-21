"use client";

interface ImageBlockProps {
	data: { url?: string; alt?: string; caption?: string };
}

export function ImageBlock({ data }: ImageBlockProps) {
	if (!data.url) {
		return null;
	}

	return (
		<div className="rounded-lg overflow-hidden border bg-gray-50 dark:bg-gray-800">
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={data.url} alt={data.alt || "Image"} className="w-full max-w-sm object-contain" />
			{data.caption && (
				<p className="text-xs text-muted-foreground p-2 text-center">{data.caption}</p>
			)}
		</div>
	);
}
