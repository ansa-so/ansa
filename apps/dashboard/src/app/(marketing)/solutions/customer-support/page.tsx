import {
	ArrowRight,
	BarChart3,
	BookOpen,
	CheckCircle2,
	Clock,
	Globe,
	Headphones,
	Mail,
	MessageSquare,
	Send,
	Sparkles,
	ThumbsUp,
	TrendingUp,
	Users,
	Zap,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Title } from "@/components/ui/title";
import { getConfig } from "@/lib/runtime-config";

const features = [
	{
		icon: Clock,
		title: "24/7 Availability",
		description:
			"Never miss a customer inquiry. Your AI agent works around the clock, providing instant responses any time of day.",
	},
	{
		icon: Zap,
		title: "Instant Resolution",
		description:
			"Resolve common issues in seconds, not hours. AI handles FAQs, account questions, and troubleshooting automatically.",
	},
	{
		icon: Globe,
		title: "Multilingual Support",
		description:
			"Communicate with customers in their preferred language. Support 50+ languages without additional staffing.",
	},
	{
		icon: Users,
		title: "Seamless Handoff",
		description:
			"Complex issues are smoothly escalated to human agents with full conversation context preserved.",
	},
	{
		icon: Mail,
		title: "AI Email Responses",
		description:
			"Automatically respond to support emails 24/7. Your agent uses your knowledge base to craft accurate, helpful replies.",
	},
	{
		icon: Sparkles,
		title: "Auto-Learning from Email",
		description:
			"Forward email conversations to train your agent. It extracts Q&A pairs and adds them to your knowledge base automatically.",
	},
];

const stats = [
	{ value: "70%", label: "Ticket Deflection" },
	{ value: "<5s", label: "Average Response Time" },
	{ value: "95%", label: "Customer Satisfaction" },
	{ value: "24/7", label: "Availability" },
];

const useCases = [
	{
		title: "FAQ Automation",
		description:
			"Answer common questions about shipping, returns, pricing, and policies without human intervention.",
	},
	{
		title: "Order Tracking",
		description:
			"Let customers check order status, shipping updates, and delivery estimates instantly.",
	},
	{
		title: "Account Support",
		description: "Help users reset passwords, update information, and manage their accounts.",
	},
	{
		title: "Email Support Automation",
		description:
			"Let your AI agent handle incoming support emails with instant, accurate responses based on your docs.",
	},
];

export const metadata: Metadata = {
	title: "AI Customer Support Chatbot",
	description:
		"Deploy 24/7 AI-powered customer support that resolves tickets instantly. Reduce response times by 90%, increase CSAT, and scale support without hiring. Integrates with Zendesk, Intercom & more.",
	keywords: [
		"AI customer support",
		"customer service chatbot",
		"AI help desk",
		"automated support",
		"24/7 customer support",
		"Zendesk AI",
		"Intercom alternative",
	],
};

export default function CustomerSupportPage() {
	const docsUrl = getConfig().docsUrl || "https://docs.ansa.so";

	return (
		<div className="min-h-screen bg-background text-foreground font-sans selection:bg-[#1A1A1A] selection:text-[#F3F2EE]">
			{/* Hero */}
			<section className="px-4 md:px-8 pt-32 pb-24 border-b border-[#D1D1D1] max-w-[1800px] mx-auto">
				<div className="max-w-4xl mx-auto text-center">
					<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
						<Headphones size={12} />
						<span>Customer Support</span>
					</div>
					<Title tag="h1" size="h1">
						AI Support That <br />
						<span className="font-serif italic text-primary">Delights Customers</span>
					</Title>
					<Text tag="p" size="subtitle" className="max-w-2xl mx-auto mb-12">
						Your customers have questions at 3am. Now you have answers. Train an AI on your docs,
						plug in your tools, and finally stop repeating yourself.
					</Text>
					<div className="flex flex-wrap justify-center gap-4">
						<Button
							asChild
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors h-auto w-auto"
						>
							<Link href="/signup" className="inline-flex items-center gap-2">
								Get Started for Free
								<ArrowRight size={14} />
							</Link>
						</Button>
						<Button
							asChild
							variant="outline"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors h-auto w-auto"
						>
							<Link href="/contact">Talk to Sales</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* Stats */}
			<section className="bg-[#1A1A1A] text-white py-24">
				<div className="max-w-[1800px] mx-auto px-4 md:px-8">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#D1D1D1] border border-[#D1D1D1]">
						{stats.map((stat) => (
							<div
								key={stat.label}
								className="bg-[#1A1A1A] p-10 flex flex-col items-center justify-center text-center h-[200px]"
							>
								<div className="mb-2 text-5xl font-bold">{stat.value}</div>
								<div className="font-mono text-[10px] text-[#888] uppercase tracking-widest">
									{stat.label}
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Features */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="mb-16 text-center">
					<h2 className="max-w-2xl mx-auto mb-6 text-4xl font-light">
						Everything You Need for <br />
						World-Class Support
					</h2>
					<p className="text-xl text-[#666] max-w-2xl mx-auto">
						Build an AI support agent that handles inquiries instantly while maintaining the
						personal touch your customers expect.
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

			{/* AI That Learns With Your Team */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1800px] mx-auto">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div>
							<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
								<BookOpen size={12} />
								<span>Auto-Learning</span>
							</div>
							<h2 className="mb-6 text-4xl font-medium md:text-5xl">
								AI That Learns <br />
								<span className="text-[#999] font-serif italic">With Your Team</span>
							</h2>
							<p className="text-lg text-[#666] mb-8 leading-relaxed">
								Build your AI knowledge base transparently by simply adding an email as CC. When
								your team responds to customers, the AI learns from their expertise automatically.
							</p>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
									<span className="text-[#555]">
										CC your agent's learn address on any email thread
									</span>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
									<span className="text-[#555]">AI extracts Q&A pairs from the conversation</span>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
									<span className="text-[#555]">Knowledge base grows with every team response</span>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-foreground shrink-0" />
									<span className="text-[#555]">No manual data entry or training required</span>
								</div>
							</div>
						</div>
						<div className="relative">
							<div className="p-8 bg-white border border-[#D1D1D1]">
								<div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#D1D1D1]">
									<div className="flex items-center justify-center w-10 h-10 border border-[#D1D1D1] bg-white">
										<Mail className="w-5 h-5 text-foreground" />
									</div>
									<div>
										<div className="text-sm font-medium">New Email Thread</div>
										<div className="text-xs text-[#666]">Customer inquiry</div>
									</div>
								</div>
								<div className="space-y-3">
									<div className="p-3 bg-[#F3F2EE] border border-[#D1D1D1]">
										<div className="font-mono text-sm font-medium">To: support@company.com</div>
										<div className="font-mono text-sm text-foreground">
											CC: learn-abc123@mail.ansa.so
										</div>
									</div>
									<div className="p-3 border border-blue-200 bg-blue-50">
										<div className="mb-1 text-sm font-medium text-blue-800">Customer asks:</div>
										<div className="text-sm text-blue-700">
											&quot;How do I reset my password?&quot;
										</div>
									</div>
									<div className="p-3 border border-green-200 bg-green-50">
										<div className="mb-1 text-sm font-medium text-green-800">
											Your team responds:
										</div>
										<div className="text-sm text-green-700">
											&quot;Click Settings → Security → Reset Password...&quot;
										</div>
									</div>
									<div className="flex items-center gap-2 p-3 bg-[#1A1A1A] text-white">
										<Sparkles className="w-4 h-4" />
										<span className="text-sm font-medium">AI learned this Q&A automatically!</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Auto-Reply Section */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1800px] mx-auto">
					<div className="grid items-center gap-16 lg:grid-cols-2">
						<div className="order-2 lg:order-1">
							<div className="p-8 bg-white border border-[#D1D1D1]">
								<div className="flex items-center gap-3 pb-4 mb-4 border-b border-[#D1D1D1]">
									<div className="flex items-center justify-center w-10 h-10 bg-green-100 border border-green-200">
										<Send className="w-5 h-5 text-green-600" />
									</div>
									<div>
										<div className="text-sm font-medium">Auto-Reply Enabled</div>
										<div className="text-xs text-[#666]">AI responding on your behalf</div>
									</div>
								</div>
								<div className="space-y-3">
									<div className="p-3 border border-blue-200 bg-blue-50">
										<div className="mb-1 text-sm font-medium text-blue-800">Incoming email:</div>
										<div className="text-sm text-blue-700">
											&quot;What are your business hours?&quot;
										</div>
									</div>
									<div className="p-3 border border-green-200 bg-green-50">
										<div className="flex items-center gap-2 mb-1">
											<Sparkles className="w-3.5 h-3.5 text-green-600" />
											<div className="text-sm font-medium text-green-800">
												AI Response (sent automatically):
											</div>
										</div>
										<div className="text-sm text-green-700">
											&quot;We're open Monday-Friday, 9am-6pm EST. You can also reach us 24/7
											through our chat widget...&quot;
										</div>
									</div>
									<div className="flex items-center justify-between p-3 bg-[#F3F2EE] border border-[#D1D1D1]">
										<span className="text-sm text-[#666]">Response time</span>
										<span className="text-sm font-medium text-green-600">&lt;5 seconds</span>
									</div>
								</div>
							</div>
						</div>
						<div className="order-1 lg:order-2">
							<div className="inline-flex items-center gap-2 mb-8 text-[#555] font-mono text-xs uppercase tracking-widest border border-[#D1D1D1] px-3 py-1 bg-white">
								<Send size={12} />
								<span>Auto-Reply</span>
							</div>
							<h2 className="mb-6 text-4xl font-medium md:text-5xl">
								When You're Ready, <br />
								<span className="text-[#999] font-serif italic">Let AI Take Over</span>
							</h2>
							<p className="text-lg text-[#666] mb-8 leading-relaxed">
								Once your knowledge base is trained, forward incoming support emails to your agent's
								inbox. It will automatically respond with accurate, helpful answers—24/7, in
								seconds.
							</p>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 shrink-0" />
									<span className="text-[#555]">
										Forward support emails to your agent's address
									</span>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 shrink-0" />
									<span className="text-[#555]">
										AI responds instantly using your knowledge base
									</span>
								</div>
								<div className="flex items-start gap-3">
									<CheckCircle2 className="w-5 h-5 mt-0.5 text-green-600 shrink-0" />
									<span className="text-[#555]">
										Low-confidence responses can be forwarded for human review
									</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Analytics & Insights Section */}
			<section className="px-4 md:px-8 py-32 max-w-[1800px] mx-auto">
				<div className="grid items-center gap-16 lg:grid-cols-2">
					<div>
						<div className="inline-flex items-center gap-2 px-3 py-1 mb-8 font-mono text-xs tracking-widest uppercase border text-violet-700 border-violet-200 bg-violet-50">
							<BarChart3 size={12} />
							<span>Analytics & Insights</span>
						</div>
						<h2 className="mb-6 text-4xl font-medium md:text-5xl">
							Stay Confident With <br />
							<span className="text-[#999] font-serif italic">Real-Time Insights</span>
						</h2>
						<p className="text-lg text-[#666] mb-8 leading-relaxed">
							See exactly what's happening with your AI support. Track performance, monitor quality,
							and receive daily digest emails to stay informed without logging in.
						</p>
						<div className="space-y-6">
							<div className="flex items-start gap-3">
								<ThumbsUp className="w-5 h-5 mt-0.5 text-violet-600 shrink-0" />
								<div>
									<div className="mb-1 font-medium">User Feedback Score</div>
									<div className="text-sm text-[#666]">
										Customers rate AI responses with thumbs up/down. See satisfaction at a glance.
									</div>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<TrendingUp className="w-5 h-5 mt-0.5 text-violet-600 shrink-0" />
								<div>
									<div className="mb-1 font-medium">AI Confidence Score</div>
									<div className="text-sm text-[#666]">
										Every response includes a confidence level. Low confidence? Route to humans
										automatically.
									</div>
								</div>
							</div>
							<div className="flex items-start gap-3">
								<Mail className="w-5 h-5 mt-0.5 text-violet-600 shrink-0" />
								<div>
									<div className="mb-1 font-medium">Daily Digest Email</div>
									<div className="text-sm text-[#666]">
										Get a summary of conversations, trends, and issues delivered to your inbox every
										morning.
									</div>
								</div>
							</div>
						</div>
					</div>
					<div>
						<div className="p-8 bg-white border border-[#D1D1D1]">
							<div className="flex items-center justify-between pb-4 mb-4 border-b border-[#D1D1D1]">
								<div className="font-medium">Today's Performance</div>
								<span className="px-2 py-1 font-mono text-xs tracking-widest text-green-600 uppercase border border-green-200 bg-green-50">
									Live
								</span>
							</div>
							<div className="grid grid-cols-2 gap-4 mb-4">
								<div className="p-4 bg-[#F3F2EE] border border-[#D1D1D1]">
									<div className="text-xs text-[#666] mb-1 font-mono uppercase tracking-widest">
										Conversations
									</div>
									<div className="text-2xl font-bold">247</div>
								</div>
								<div className="p-4 bg-[#F3F2EE] border border-[#D1D1D1]">
									<div className="text-xs text-[#666] mb-1 font-mono uppercase tracking-widest">
										Avg Response
									</div>
									<div className="text-2xl font-bold">3.2s</div>
								</div>
							</div>
							<div className="space-y-3">
								<div className="flex items-center justify-between p-3 border border-green-200 bg-green-50">
									<div className="flex items-center gap-2">
										<ThumbsUp className="w-4 h-4 text-green-600" />
										<span className="text-sm">User Satisfaction</span>
									</div>
									<span className="text-sm font-medium text-green-600">94%</span>
								</div>
								<div className="flex items-center justify-between p-3 border bg-violet-50 border-violet-200">
									<div className="flex items-center gap-2">
										<TrendingUp className="w-4 h-4 text-violet-600" />
										<span className="text-sm">Avg Confidence</span>
									</div>
									<span className="text-sm font-medium text-violet-600">87%</span>
								</div>
								<div className="flex items-center justify-between p-3 border border-blue-200 bg-blue-50">
									<div className="flex items-center gap-2">
										<Zap className="w-4 h-4 text-blue-600" />
										<span className="text-sm">Auto-Resolved</span>
									</div>
									<span className="text-sm font-medium text-blue-600">78%</span>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Use Cases */}
			<section className="px-4 md:px-8 py-32 bg-[#EAE9E5] border-y border-[#D1D1D1]">
				<div className="max-w-[1800px] mx-auto">
					<div className="mb-16">
						<h2 className="mb-6 text-4xl font-light">
							Built for Real <br />
							Support Scenarios
						</h2>
						<p className="text-lg text-[#666] max-w-2xl">
							Handle the most common support requests automatically, freeing your team to focus on
							complex issues.
						</p>
					</div>
					<div className="grid gap-px md:grid-cols-2 bg-[#D1D1D1] border border-[#D1D1D1]">
						{useCases.map((useCase) => (
							<div
								key={useCase.title}
								className="flex gap-4 p-10 bg-white hover:bg-[#F9F9F9] transition-colors"
							>
								<CheckCircle2 className="w-6 h-6 text-foreground shrink-0 mt-0.5" />
								<div>
									<h3 className="mb-2 text-xl font-medium">{useCase.title}</h3>
									<p className="text-[#666]">{useCase.description}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="px-4 py-32 md:px-8">
				<div className="max-w-4xl mx-auto text-center">
					<div className="flex items-center justify-center w-16 h-16 mx-auto mb-8 border border-[#D1D1D1] bg-white">
						<MessageSquare className="w-8 h-8 text-foreground" />
					</div>
					<h2 className="mb-8 text-4xl font-medium tracking-tight md:text-6xl">
						Ready to Transform Your Support?
					</h2>
					<p className="text-lg text-[#666] mb-12 max-w-xl mx-auto">
						Join thousands of companies using Ansa to provide exceptional customer support at scale.
					</p>
					<div className="flex flex-wrap justify-center gap-4">
						<Link
							href="/signup"
							className="bg-[#1A1A1A] text-white px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#333] transition-colors inline-flex items-center gap-2"
						>
							Get Started Free
							<ArrowRight size={14} />
						</Link>
						<Link
							href={docsUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="bg-white border border-[#D1D1D1] px-8 py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#F9F9F9] transition-colors"
						>
							View Documentation
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
