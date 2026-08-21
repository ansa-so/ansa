import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Terms of Service",
	description:
		"Ansa's terms of service. Read our terms and conditions for using the AI agent platform.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
	return <>{children}</>;
}
