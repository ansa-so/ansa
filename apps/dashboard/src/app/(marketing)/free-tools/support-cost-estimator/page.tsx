import type { Metadata } from "next";
import { SupportCostEstimator } from "@/components/tools/support-cost-estimator";

export const metadata: Metadata = {
	title: "Support Cost Estimator — Free Tool",
	description:
		"Calculate your true customer support labor costs. Enter your team size, salaries, and time allocation to see your real support spend and cost per ticket.",
	openGraph: {
		title: "Support Cost Estimator - Ansa",
		description:
			"Free calculator to estimate your true customer support costs. See your monthly spend, cost per ticket, and potential AI savings.",
	},
};

export default function SupportCostEstimatorPage() {
	return <SupportCostEstimator />;
}
