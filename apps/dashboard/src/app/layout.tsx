import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Suspense } from "react";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/structured-data";
import { Toaster } from "@/components/ui/sonner";
import { ConfigProvider } from "@/lib/config-context";
import { readServerConfig } from "@/lib/runtime-config";
import { ShopifyProvider } from "@/lib/shopify-context";
import "./globals.css";

const BASE_URL = readServerConfig().dashboardUrl;

// const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-sans" });
// const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
// const sourceCodePro = Source_Code_Pro({ subsets: ["latin"], variable: "--font-code" });

export const metadata: Metadata = {
	title: {
		template: "%s | Ansa",
		default: "Ansa - Build AI Agents for Support, Sales & More",
	},
	description:
		"Build AI agents that resolve 80%+ of support tickets automatically. SDK/API or no-code dashboard. Train on your docs, connect any tool. Start free, Pro from $29/mo.",
	keywords: [
		"AI agents",
		"conversational AI",
		"AI chatbot platform",
		"AI API",
		"chat SDK",
		"conversational AI API",
		"AI agent SDK",
		"AI customer support",
		"AI sales assistant",
		"e-commerce chatbot",
		"lead generation AI",
		"documentation chatbot",
		"RAG",
		"knowledge base AI",
		"no-code AI builder",
		"intercom alternative",
		"zendesk alternative",
		"drift alternative",
		"freshdesk alternative",
		"free AI chatbot",
		"AI ticket automation",
		"conversational AI platform",
		"AI resolution",
		"SaaS support tool",
		"enterprise AI support",
		"self-hosted AI chatbot",
	],
	authors: [{ name: "Ansa" }],
	creator: "Ansa",
	metadataBase: new URL(BASE_URL),
	openGraph: {
		type: "website",
		locale: "en_US",
		siteName: "Ansa",
		title: "Ansa - AI Agents for Customer Support & Sales",
		description:
			"Build AI agents that resolve 80%+ of support tickets. SDK/API or no-code. Train on your docs, connect any tool. Pro from $29/mo.",
		images: [
			{
				url: "/og-image.png",
				width: 1200,
				height: 630,
				alt: "Ansa - AI Agents for Customer Support & Sales",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "Ansa - AI Agents for Customer Support & Sales",
		description:
			"Build AI agents that resolve 80%+ of support tickets. SDK/API or no-code. Pro from $29/mo.",
		creator: "@ansa_ai",
		images: ["/og-image.png"],
	},
	robots: {
		index: true,
		follow: true,
	},
};

function Loading() {
	return (
		<div className="flex items-center justify-center min-h-screen">
			<div className="w-8 h-8 border-b-2 border-gray-900 rounded-full animate-spin" />
		</div>
	);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	const serverConfig = readServerConfig();

	return (
		<html lang="en" className="h-full" suppressHydrationWarning>
			<head>
				{/*
				  Installs window.__ANSA_CONFIG__ before any application code runs.
				  The file is written at container start, so the same image serves
				  any environment instead of having URLs compiled into the bundle.
				*/}
				{/**
				 * The query string breaks clients out of the previously cached localhost
				 * configuration. The response itself is no-store (see next.config.ts), so
				 * future deployments do not need another version bump.
				 */}
				<script src="/runtime-config.js?v=2" async={false} defer={false} />
				{serverConfig.shopifyClientId && (
					<script
						src={`https://cdn.shopify.com/shopifycloud/app-bridge.js?apiKey=${serverConfig.shopifyClientId}`}
						async={false}
						defer={false}
					/>
				)}
				<OrganizationSchema />
				<WebSiteSchema />
			</head>
			<body className={"h-full selection:bg-[#1A1A1A] selection:text-[#F3F2EE] overflow-x-hidden"}>
				<PostHogProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="light"
						enableSystem
						disableTransitionOnChange
					>
						<ConfigProvider>
							<Suspense fallback={<Loading />}>
								<ShopifyProvider>
									<div className="relative z-10 h-full">
										<Suspense fallback={<Loading />}>{children}</Suspense>
									</div>
									<Toaster position="top-right" />
								</ShopifyProvider>
							</Suspense>
						</ConfigProvider>
					</ThemeProvider>
				</PostHogProvider>
			</body>
		</html>
	);
}
