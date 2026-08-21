import type { MetadataRoute } from "next";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: [
					"/api/",
					"/dashboard/",
					"/settings/",
					"/onboarding/",
					"/checkout-success/",
					"/invite/",
					"/setup-complete/",
				],
			},
		],
		sitemap: `${BASE_URL}/sitemap.xml`,
	};
}
