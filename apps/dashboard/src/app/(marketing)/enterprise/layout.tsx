import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Enterprise AI Solutions - Ansa",
	description:
		"Enterprise-grade AI agents with advanced security, dedicated support, and custom integrations. Built for scale, designed for compliance.",
};

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
	return children;
}
