import type { Metadata } from "next";
import { CookieBanner } from "@/components/cookie-banner";
import { Footer } from "@/components/footer";
import { MarketingChatWidget } from "@/components/marketing-chat-widget";
import { MarketingHeader } from "@/components/marketing-header";
import { ScrollProgressBar } from "@/components/scroll-progress-bar";

export const metadata: Metadata = {
	title: "Ansa - AI Agents for Customer Support & Sales",
	description:
		"Build AI agents that resolve 80%+ of support tickets automatically. No-code dashboard or SDK/API. Train on your docs, connect Shopify & 20+ tools. Start free, paid plans from $38/mo.",
};

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
	return (
		<>
			<MarketingHeader />
			<ScrollProgressBar />
			<main className="px-4 pt-32 md:px-8 max-w-[1800px] mx-auto">{children}</main>
			<Footer />
			<CookieBanner />
			<MarketingChatWidget />
		</>
	);
}
