import type { Metadata } from "next";
import { ROICalculator } from "@/components/tools/roi-calculator";

export const metadata: Metadata = {
	title: "Shopify Chatbot ROI Calculator — Free Tool",
	description:
		"Calculate how much time and money your Shopify store could save with an AI chatbot. Enter your support metrics and see instant ROI projections.",
	openGraph: {
		title: "Shopify Chatbot ROI Calculator - Ansa",
		description:
			"Free ROI calculator for Shopify customer support automation. See your projected time and cost savings instantly.",
	},
};

export default function ROICalculatorPage() {
	return <ROICalculator />;
}
