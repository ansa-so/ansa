import {
	ArrowRight,
	CheckCircle2,
	Gift,
	Package,
	RefreshCw,
	Search,
	ShoppingBag,
	ShoppingCart,
	Star,
	Truck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { BreadcrumbSchema } from "@/components/seo/structured-data";
import { getConfig } from "@/lib/runtime-config";

const BASE_URL = getConfig().dashboardUrl || "https://ansa.so";

export const metadata: Metadata = {
	title: "AI for E-commerce Support & Sales",
	description:
		"Help shoppers find products, track orders, and get support instantly. Increase conversions and reduce cart abandonment with AI-powered shopping assistants.",
	keywords: [
		"ecommerce chatbot",
		"shopify AI chatbot",
		"ecommerce customer support",
		"AI shopping assistant",
		"order tracking automation",
		"cart abandonment AI",
		"product recommendation AI",
	],
	openGraph: {
		title: "AI for E-commerce Support & Sales - Ansa",
		description:
			"Increase conversions and reduce cart abandonment with AI-powered shopping assistants.",
	},
};

const features = [
	{
		icon: Search,
		title: "Product Discovery",
		description:
			"Help shoppers find exactly what they're looking for with conversational product search and recommendations.",
	},
	{
		icon: Truck,
		title: "Order Tracking",
		description:
			"Let customers check order status, shipping updates, and estimated delivery times instantly.",
	},
	{
		icon: RefreshCw,
		title: "Returns & Exchanges",
		description:
			"Automate return requests, exchanges, and refund inquiries with clear policies and instant processing.",
	},
	{
		icon: Star,
		title: "Personalized Recommendations",
		description: "Suggest products based on browsing history, preferences, and purchase patterns.",
	},
	{
		icon: Gift,
		title: "Promotions & Discounts",
		description:
			"Share active promotions, apply discount codes, and help customers maximize savings.",
	},
	{
		icon: ShoppingBag,
		title: "Shopify Integration",
		description:
			"Native Shopify integration for real-time inventory, orders, and customer data sync.",
	},
];

const stats = [
	{ value: "25%", label: "Increase in AOV" },
	{ value: "60%", label: "Support Automation" },
	{ value: "4.8", label: "Customer Rating" },
	{ value: "2x", label: "Faster Resolution" },
];

const useCases = [
	{
		title: "Pre-Purchase Questions",
		description:
			"Answer sizing, compatibility, and product questions to help customers buy with confidence.",
	},
	{
		title: "Cart Assistance",
		description: "Help customers complete checkout, apply discounts, and resolve payment issues.",
	},
	{
		title: "Post-Purchase Support",
		description:
			"Handle order modifications, tracking inquiries, and delivery updates automatically.",
	},
	{
		title: "Product Comparisons",
		description: "Help shoppers compare products and make informed decisions based on their needs.",
	},
];

export default function EcommercePage() {
	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			<BreadcrumbSchema
				items={[
					{ name: "Home", url: BASE_URL },
					{ name: "Solutions", url: `${BASE_URL}/solutions` },
					{ name: "E-commerce", url: `${BASE_URL}/solutions/ecommerce` },
				]}
			/>
			<MarketingHeader activePage="solutions" />

			{/* Hero */}
			<section className="px-4 md:px-8 pt-32 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<ShoppingCart size={12} />
						<span>E-commerce</span>
					</div>
					<h1 className="text-6xl md:text-8xl font-medium tracking-tight mb-8 leading-[0.9] max-w-2xl mx-auto">
						AI Shopping Assistant That <br />
						<span className="font-serif italic text-primary">Drives Sales</span>
					</h1>
					<p className="text-xl text-[#555] max-w-2xl mx-auto leading-relaxed mb-12">
						Help customers find products, track orders, and get support instantly. Increase
						conversions and reduce cart abandonment with AI.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Get Started for Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/shopify"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							Shopify Integration
						</Link>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="mb-32 max-w-[1800px] mx-auto px-4 md:px-8 py-16">
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
					{stats.map((stat) => (
						<div
							key={stat.label}
							className="bg-[#1A1A1A] text-white p-10 flex flex-col items-center justify-center text-center h-[200px]"
						>
							<div className="mb-2 text-5xl font-bold">{stat.value}</div>
							<div className="font-mono text-[10px] text-[#888] uppercase tracking-widest">
								{stat.label}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Features */}
			<section className="px-4 md:px-8 mb-32 max-w-[1800px] mx-auto">
				<div className="mb-12 text-center">
					<h2 className="mb-4 text-4xl font-light">Everything Your Store Needs</h2>
					<p className="text-lg text-[#666] max-w-2xl mx-auto">
						From product discovery to post-purchase support, create shopping experiences that
						convert browsers into loyal customers.
					</p>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
					{features.map((feature) => {
						const Icon = feature.icon;
						return (
							<div
								key={feature.title}
								className="bg-white p-10 flex flex-col justify-between hover:bg-[#F9F9F9] transition-colors group h-[280px]"
							>
								<div>
									<Icon
										size={32}
										className="mb-6 text-[#BBB] group-hover:text-foreground transition-colors"
										strokeWidth={1.5}
									/>
									<h3 className="mb-2 text-xl font-medium">{feature.title}</h3>
								</div>
								<p className="text-sm text-[#666] leading-relaxed">{feature.description}</p>
							</div>
						);
					})}
				</div>
			</section>

			{/* Use Cases */}
			<section className="px-4 md:px-8 mb-32 max-w-[1800px] mx-auto">
				<div className="mb-12">
					<h2 className="mb-4 text-4xl font-light">Built for the Entire Shopping Journey</h2>
					<p className="text-lg text-[#666]">
						Support customers at every stage, from discovery to delivery and beyond.
					</p>
				</div>
				<div className="grid gap-px bg-[#D1D1D1] border border-[#D1D1D1] md:grid-cols-2">
					{useCases.map((useCase) => (
						<div
							key={useCase.title}
							className="flex gap-4 p-8 bg-white hover:bg-[#F9F9F9] transition-colors"
						>
							<CheckCircle2 className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
							<div>
								<h3 className="mb-2 text-xl font-medium">{useCase.title}</h3>
								<p className="text-[#666] leading-relaxed">{useCase.description}</p>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* CTA */}
			<section className="bg-[#EAE9E5] py-32 text-center border-t border-[#D1D1D1]">
				<div className="max-w-2xl px-4 mx-auto">
					<div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border border-[#D1D1D1] bg-white">
						<Package className="w-8 h-8 text-foreground" />
					</div>
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">
						Ready to Boost Your Sales?
					</h2>
					<p className="text-[#666] mb-12 text-lg leading-relaxed max-w-xl mx-auto">
						Join e-commerce brands using Ansa to increase conversions and delight customers at every
						touchpoint.
					</p>
					<div className="flex flex-col justify-center gap-4 sm:flex-row">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:scale-105 transition-transform shadow-xl inline-flex items-center justify-center gap-2"
						>
							Get Started Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href="/shopify"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors inline-flex items-center justify-center"
						>
							Shopify Setup Guide
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
