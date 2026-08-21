/**
 * Product context utilities for Shopify URL parsing and variant normalization
 */

// Color normalization map - fuzzy matching for common color names
const COLOR_MAPS: Record<string, string[]> = {
	red: ["red", "crimson", "burgundy", "ruby", "scarlet", "maroon"],
	blue: ["blue", "navy", "royal", "azure", "cobalt", "sapphire"],
	green: ["green", "emerald", "olive", "forest", "lime", "sage"],
	yellow: ["yellow", "gold", "lemon", "mustard", "amber"],
	orange: ["orange", "tangerine", "rust", "coral"],
	purple: ["purple", "violet", "plum", "lavender", "mauve"],
	pink: ["pink", "rose", "blush", "fuchsia", "magenta"],
	brown: ["brown", "tan", "beige", "khaki", "taupe", "chocolate"],
	black: ["black", "ebony", "charcoal", "onyx"],
	white: ["white", "ivory", "cream", "pearl", "snow"],
	gray: ["gray", "grey", "silver", "slate", "ash"],
};

// Size normalization map - fuzzy matching for common size variations
const SIZE_MAPS: Record<string, string[]> = {
	"extra-small": ["xs", "extra small", "extra-small", "x-small"],
	small: ["s", "small", "sm"],
	medium: ["m", "medium", "med", "md"],
	large: ["l", "large", "lg"],
	"extra-large": ["xl", "extra large", "extra-large", "x-large"],
	"2x-large": ["xxl", "2xl", "2x", "xx-large", "2x-large"],
	"3x-large": ["xxxl", "3xl", "3x", "xxx-large", "3x-large"],
};

/**
 * Normalize a color name to include all variations for fuzzy matching
 * Falls back to exact match if not in mapping
 */
export function normalizeColor(color: string): string[] {
	const normalized = color.toLowerCase().trim();

	// Check if the input matches any key or variation
	for (const [key, variations] of Object.entries(COLOR_MAPS)) {
		if (variations.some((v) => v.toLowerCase() === normalized)) {
			return variations;
		}
	}

	// Fallback to exact match
	return [normalized];
}

/**
 * Normalize a size to include all variations for fuzzy matching
 * Falls back to exact match if not in mapping
 */
export function normalizeSize(size: string): string[] {
	const normalized = size.toLowerCase().trim();

	// Check if the input matches any key or variation
	for (const [key, variations] of Object.entries(SIZE_MAPS)) {
		if (variations.some((v) => v.toLowerCase() === normalized)) {
			return variations;
		}
	}

	// Fallback to exact match
	return [normalized];
}

/**
 * Extract Shopify product handle from a URL path
 * Supports patterns:
 * - /products/{handle}
 * - /collections/{collection}/products/{handle}
 * Returns null if no product handle found
 */
export function extractShopifyProductHandle(url: string): string | null {
	try {
		// Handle both full URLs and just paths
		const path = url.startsWith("http") ? new URL(url).pathname : url;

		// Match /products/{handle} or /collections/{collection}/products/{handle}
		const productMatch = path.match(/\/products\/([^/?#]+)/);
		if (productMatch?.[1]) {
			return productMatch[1];
		}

		return null;
	} catch (error) {
		// Invalid URL, return null
		return null;
	}
}

/**
 * Build a human-readable product description for the system prompt
 */
export function formatProductContext(
	product: {
		title: string;
		description?: string | null;
		productType?: string | null;
		vendor?: string | null;
		variants?: Array<{
			title: string;
			price: string;
			inventoryQuantity: number;
			option1?: string;
			option2?: string;
			option3?: string;
		}> | null;
	},
	currency = "USD",
): string {
	let context = `Product: ${product.title}`;

	if (product.vendor) {
		context += `\nVendor: ${product.vendor}`;
	}

	if (product.productType) {
		context += `\nType: ${product.productType}`;
	}

	if (product.description) {
		// Strip HTML tags from description
		const plainDescription = product.description.replace(/<[^>]*>/g, "").trim();
		if (plainDescription) {
			context += `\nDescription: ${plainDescription.substring(0, 500)}${plainDescription.length > 500 ? "..." : ""}`;
		}
	}

	// Group variants by their options
	if (product.variants && product.variants.length > 0) {
		context += `\n\nAvailable Variants (${product.variants.length}):`;

		// Extract unique colors/sizes/options
		const colors = new Set<string>();
		const sizes = new Set<string>();
		const prices = new Set<string>();

		for (const variant of product.variants) {
			if (variant.option1) colors.add(variant.option1);
			if (variant.option2) sizes.add(variant.option2);
			if (variant.option3) sizes.add(variant.option3);
			prices.add(variant.price);
		}

		if (colors.size > 0) {
			context += `\nColors: ${Array.from(colors).join(", ")}`;
		}
		if (sizes.size > 0) {
			context += `\nSizes: ${Array.from(sizes).join(", ")}`;
		}
		if (prices.size === 1) {
			context += `\nPrice: ${currency} ${Array.from(prices)[0]}`;
		} else if (prices.size > 1) {
			const priceArray = Array.from(prices).sort(
				(a, b) => Number.parseFloat(a) - Number.parseFloat(b),
			);
			context += `\nPrice Range: ${currency} ${priceArray[0]} - ${priceArray[priceArray.length - 1]}`;
			context += `\nVariant Prices: ${product.variants!.map((v) => `${v.title}: ${currency} ${v.price}`).join(", ")}`;
		}

		// Show in-stock count
		const inStockCount = product.variants.filter((v) => v.inventoryQuantity > 0).length;
		context += `\n${inStockCount} of ${product.variants.length} variants in stock`;
	}

	return context;
}
