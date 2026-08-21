"use client";

import {
	ArrowRight,
	Building2,
	CheckCircle2,
	Headphones,
	Key,
	Lock,
	Server,
	Shield,
	Users,
	Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { getConfig } from "@/lib/runtime-config";

const features = [
	{
		icon: Shield,
		title: "SOC 2 Type II Compliant",
		description:
			"Enterprise-grade security with annual audits, penetration testing, and comprehensive compliance documentation.",
	},
	{
		icon: Lock,
		title: "SSO & SAML",
		description:
			"Integrate with your identity provider. Support for Okta, Azure AD, Google Workspace, and custom SAML.",
	},
	{
		icon: Server,
		title: "Dedicated Infrastructure",
		description:
			"Private cloud deployment options with dedicated resources, custom SLAs, and data residency controls.",
	},
	{
		icon: Key,
		title: "Role-Based Access",
		description:
			"Granular permissions and audit logs. Control who can access, edit, and deploy your AI agents.",
	},
	{
		icon: Users,
		title: "Dedicated Success Team",
		description:
			"Named account manager, priority support, and quarterly business reviews to ensure your success.",
	},
	{
		icon: Zap,
		title: "Custom Integrations",
		description:
			"Connect to your internal systems, databases, and APIs with custom-built integrations and webhooks.",
	},
];

const stats = [
	{ value: "99.99%", label: "Uptime SLA" },
	{ value: "SOC 2", label: "Certified" },
	{ value: "<1hr", label: "Support Response" },
	{ value: "GDPR", label: "Compliant" },
];

const benefits = [
	{
		title: "Unlimited Agents & Messages",
		description:
			"No caps on usage. Scale your AI deployment across teams and use cases without limits.",
	},
	{
		title: "Priority Model Access",
		description:
			"First access to new AI models and features. Dedicated capacity for consistent performance.",
	},
	{
		title: "Custom Training",
		description:
			"Work with our team to fine-tune responses for your specific industry and brand voice.",
	},
	{
		title: "Advanced Analytics",
		description:
			"Deep insights into conversations, sentiment analysis, and custom reporting dashboards.",
	},
];

export default function EnterprisePage() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div>
			{/* --- Hero Section --- */}
			<section className="mb-24 border-b border-[#D1D1D1] pb-24">
				<div className="grid items-center grid-cols-1 gap-16 lg:grid-cols-2">
					{/* Left: Copy */}
					<div>
						<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white rounded-full">
							<Building2 size={12} />
							<span>For Global Teams</span>
						</div>
						<Title tag="h1" size="h1">
							AI Built for <br />
							<span className="font-serif italic text-[#999]">Enterprise Scale.</span>
						</Title>
						<Text size="subtitle-lg" className="mb-12">
							Deploy AI agents with the security, compliance, and support your organization demands.
							Custom solutions for complex requirements.
						</Text>
						<div className="flex flex-col gap-4 sm:flex-row">
							<Link
								href="/contact"
								className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors flex items-center justify-center gap-2"
							>
								Contact Us
								<ArrowRight size={14} />
							</Link>
							<Link
								href="/pricing"
								className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors flex items-center justify-center gap-2"
							>
								View Pricing
							</Link>
						</div>
					</div>

					{/* Right: Security Visual */}
					<div className="relative h-[400px] bg-[#1A1A1A] p-8 flex items-center justify-center overflow-hidden">
						{/* Grid Background */}
						<div
							className="absolute inset-0 opacity-20"
							style={{
								backgroundImage:
									"linear-gradient(#444 1px, transparent 1px), linear-gradient(90deg, #444 1px, transparent 1px)",
								backgroundSize: "40px 40px",
							}}
						/>

						<div className="relative z-10 text-center">
							<Shield size={80} className="text-[#F3F2EE] mb-6 mx-auto" strokeWidth={1} />
							<div className="mb-2 font-mono text-xs tracking-widest text-green-500 uppercase">
								Enterprise Ready
							</div>
							<div className="text-4xl font-medium tracking-tighter text-white">
								SOC 2 Compliant
							</div>
						</div>

						{/* Animated Rings */}
						<div
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-[#333] rounded-full animate-ping opacity-20"
							style={{ animationDuration: "3s" }}
						/>
						<div
							className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border border-[#333] rounded-full animate-ping opacity-10"
							style={{ animationDuration: "4s" }}
						/>
					</div>
				</div>
			</section>

			{/* --- Stats Grid --- */}
			<section className="mb-32">
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

			{/* --- Features Grid --- */}
			<section className="mb-32">
				<div className="flex flex-col items-end justify-between px-2 mb-12 md:flex-row">
					<h2 className="text-4xl font-light">
						Enterprise-Grade <br /> Security & Compliance.
					</h2>
					<p className="text-[#666] text-right hidden md:block max-w-xs">
						Built from the ground up with enterprise requirements in mind.
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

			{/* --- Benefits Section --- */}
			<section className="mb-32">
				<div className="bg-[#EAE9E5] border border-[#D1D1D1] p-12 md:p-24">
					<h2 className="mb-12 text-4xl font-medium">Everything You Need to Scale</h2>
					<div className="grid gap-8 md:grid-cols-2">
						{benefits.map((benefit) => (
							<div key={benefit.title} className="flex gap-4">
								<CheckCircle2 className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
								<div>
									<h3 className="mb-2 text-xl font-bold">{benefit.title}</h3>
									<p className="text-[#666] leading-relaxed">{benefit.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* --- White Glove Service --- */}
			<section className="grid grid-cols-1 lg:grid-cols-2 border border-[#D1D1D1] bg-[#1A1A1A] text-[#F3F2EE] mb-32">
				<div className="p-12 md:p-24 border-b lg:border-b-0 lg:border-r border-[#333]">
					<Users size={48} className="mb-8 text-[#BBB]" strokeWidth={1} />
					<h3 className="mb-6 text-3xl font-medium">Dedicated Success Team.</h3>
					<p className="text-[#888] leading-relaxed max-w-md">
						You're not just buying software; you're hiring a team of AI experts. Every Enterprise
						plan includes a dedicated Technical Account Manager and Solutions Engineer.
					</p>
				</div>

				<div className="p-12 md:p-24">
					<div className="space-y-8">
						<div>
							<h4 className="mb-2 text-xl font-bold">Custom Model Tuning</h4>
							<p className="text-sm text-[#888]">
								We fine-tune models on your specific historical data to match your brand voice
								perfectly.
							</p>
						</div>
						<div>
							<h4 className="mb-2 text-xl font-bold">Quarterly Business Reviews</h4>
							<p className="text-sm text-[#888]">
								Deep dive analysis of your automation rates and ROI, with strategic roadmap
								planning.
							</p>
						</div>
						<div>
							<h4 className="mb-2 text-xl font-bold">Priority 24/7 Support</h4>
							<p className="text-sm text-[#888]">
								Direct Slack channel access to our engineering team with 15-minute response times
								for critical issues.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* --- Footer CTA --- */}
			<section className="bg-[#EAE9E5] py-32 text-center border border-[#D1D1D1] mb-32">
				<div className="max-w-2xl px-4 mx-auto">
					<div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 border border-[#D1D1D1] bg-white">
						<Headphones className="w-8 h-8 text-foreground" />
					</div>
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">
						Ready to Get Started?
					</h2>
					<p className="text-[#666] mb-12 text-lg leading-relaxed max-w-xl mx-auto">
						Talk to our enterprise team to learn how Ansa can transform your organization.
					</p>
					<div className="flex flex-col justify-center gap-6 sm:flex-row">
						<Button size="xl" asChild>
							<Link href="/signup">
								Start For Free
								<ArrowRight size={14} />
							</Link>
						</Button>
						<Button size="xl" variant="outline">
							<Link href={docsUrl}>View documentation</Link>
						</Button>
					</div>
				</div>
			</section>
		</div>
	);
}
