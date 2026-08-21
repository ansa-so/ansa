import type { Metadata } from "next";
import { ResponseTimeAnalyzer } from "@/components/tools/response-time-analyzer";

export const metadata: Metadata = {
	title: "Response Time Benchmarks — Free Tool",
	description:
		"Compare your customer support response time against industry benchmarks. See how your speed impacts CSAT scores and revenue across e-commerce, SaaS, and more.",
	openGraph: {
		title: "Response Time Benchmarks - Ansa",
		description:
			"Free tool to benchmark your support response time against industry standards. See the impact on CSAT and revenue.",
	},
};

export default function ResponseTimeAnalyzerPage() {
	return <ResponseTimeAnalyzer />;
}
