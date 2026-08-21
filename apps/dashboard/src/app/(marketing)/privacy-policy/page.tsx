import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy Policy",
	description:
		"Ansa's privacy policy. Learn how we collect, use, and protect your data when using our AI agent platform.",
};

export default function PrivacyPolicyPage() {
	return (
		<div className="container max-w-4xl px-8 py-12 mx-auto md:px-16">
			<div className="mb-16">
				<div className="inline-flex items-center gap-2 border border-[#D1D1D1] px-3 py-1 bg-white rounded-full mb-6">
					<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
						Legal Document
					</span>
				</div>
				<h1 className="mb-4 text-5xl font-medium tracking-tight md:text-6xl text-foreground">
					Privacy Policy
				</h1>
				<p className="text-[#666] font-mono text-sm">Last updated: December 7, 2025</p>
			</div>

			<div className="space-y-12">
				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						1. Introduction
					</h2>
					<p className="text-[#444] leading-relaxed">
						Welcome to Ansa (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed
						to protecting your privacy and personal information. This Privacy Policy explains how we
						collect, use, disclose, and safeguard your information when you use our AI-powered chat
						platform and related services.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
						2. Information We Collect
					</h2>

					<h3 className="mb-3 font-mono text-sm text-lg font-bold tracking-wider uppercase text-foreground">
						2.1 Information You Provide
					</h3>
					<ul className="pl-6 space-y-3 list-disc text-[#444] mb-6">
						<li>
							<strong className="text-foreground">Account Information:</strong> When you create an
							account, we collect your name, email address, and authentication credentials.
						</li>
						<li>
							<strong className="text-foreground">Chat Content:</strong> Messages you send through
							our platform, including conversations with AI agents.
						</li>
						<li>
							<strong className="text-foreground">Knowledge Sources:</strong> Documents, text
							sources, and Q&A content you upload to train your agents.
						</li>
						<li>
							<strong className="text-foreground">Payment Information:</strong> Billing details
							processed securely through our payment provider (Stripe).
						</li>
					</ul>

					<h3 className="mb-3 font-mono text-sm text-lg font-bold tracking-wider uppercase text-foreground">
						2.2 Information Collected Automatically
					</h3>
					<ul className="pl-6 space-y-3 list-disc text-[#444]">
						<li>
							<strong className="text-foreground">Usage Data:</strong> Message counts, feature
							usage, and interaction patterns.
						</li>
						<li>
							<strong className="text-foreground">Device Information:</strong> Browser type,
							operating system, and device identifiers.
						</li>
						<li>
							<strong className="text-foreground">Log Data:</strong> IP addresses, access times, and
							pages viewed.
						</li>
						<li>
							<strong className="text-foreground">Cookies:</strong> Session cookies for
							authentication and preferences.
						</li>
					</ul>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						3. How We Use Your Information
					</h2>
					<p className="mb-4 text-[#444]">
						We use the collected information for the following purposes:
					</p>
					<ul className="pl-6 space-y-2 list-disc text-[#444]">
						<li>To provide and maintain our services</li>
						<li>To process your transactions and manage your subscription</li>
						<li>To personalize your experience and improve our AI agents</li>
						<li>To communicate with you about updates, security alerts, and support</li>
						<li>To monitor usage and enforce our terms of service</li>
						<li>To detect and prevent fraud or abuse</li>
						<li>To comply with legal obligations</li>
					</ul>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						4. Data Storage and Security
					</h2>
					<p className="mb-4 leading-relaxed text-[#444]">
						We implement industry-standard security measures to protect your data:
					</p>
					<ul className="pl-6 space-y-2 list-disc text-[#444]">
						<li>All data is encrypted in transit using TLS/SSL</li>
						<li>Sensitive data is encrypted at rest</li>
						<li>We use secure cloud infrastructure with regular security audits</li>
						<li>Access to personal data is restricted to authorized personnel only</li>
						<li>Regular backups ensure data integrity and availability</li>
					</ul>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						5. Data Sharing and Disclosure
					</h2>
					<p className="mb-4 text-[#444]">
						We do not sell your personal information. We may share your data with:
					</p>
					<ul className="pl-6 space-y-3 list-disc text-[#444]">
						<li>
							<strong className="text-foreground">Service Providers:</strong> Third-party services
							that help us operate our platform (e.g., cloud hosting, payment processing, AI model
							providers).
						</li>
						<li>
							<strong className="text-foreground">AI Model Providers:</strong> Your chat messages
							are sent to AI providers (such as Anthropic) to generate responses. These providers
							have their own privacy policies.
						</li>
						<li>
							<strong className="text-foreground">Legal Requirements:</strong> When required by law,
							court order, or to protect our rights and safety.
						</li>
						<li>
							<strong className="text-foreground">Business Transfers:</strong> In connection with a
							merger, acquisition, or sale of assets.
						</li>
					</ul>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						6. Your Rights and Choices
					</h2>
					<p className="mb-4 text-[#444]">
						Depending on your location, you may have the following rights:
					</p>
					<ul className="pl-6 space-y-3 list-disc text-[#444]">
						<li>
							<strong className="text-foreground">Access:</strong> Request a copy of your personal
							data
						</li>
						<li>
							<strong className="text-foreground">Correction:</strong> Update or correct inaccurate
							information
						</li>
						<li>
							<strong className="text-foreground">Deletion:</strong> Request deletion of your
							account and associated data
						</li>
						<li>
							<strong className="text-foreground">Portability:</strong> Receive your data in a
							portable format
						</li>
						<li>
							<strong className="text-foreground">Opt-out:</strong> Unsubscribe from marketing
							communications
						</li>
						<li>
							<strong className="text-foreground">Restriction:</strong> Limit how we process your
							data
						</li>
					</ul>
					<p className="mt-4 text-[#444]">
						To exercise these rights, please contact us at{" "}
						<a href="mailto:privacy@ansa.so" className="font-medium underline text-foreground">
							privacy@ansa.so
						</a>
						.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						7. Data Retention
					</h2>
					<p className="leading-relaxed text-[#444]">
						We retain your personal data for as long as your account is active or as needed to
						provide services. Chat history and conversation data are retained according to your
						preferences. You can delete conversations at any time. When you delete your account, we
						will delete or anonymize your personal data within 30 days, except where we are required
						to retain it for legal purposes.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						8. Cookies and Tracking
					</h2>
					<p className="mb-4 leading-relaxed text-[#444]">
						We use essential cookies for authentication and session management. We do not use
						third-party advertising cookies. You can configure your browser to refuse cookies, but
						this may limit your ability to use our services.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						9. Children&apos;s Privacy
					</h2>
					<p className="leading-relaxed text-[#444]">
						Our services are not intended for children under 13 years of age. We do not knowingly
						collect personal information from children under 13. If you believe we have collected
						information from a child under 13, please contact us immediately.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						10. International Data Transfers
					</h2>
					<p className="leading-relaxed text-[#444]">
						Your information may be transferred to and processed in countries other than your own.
						We ensure appropriate safeguards are in place to protect your data in accordance with
						this Privacy Policy and applicable laws.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						11. Changes to This Policy
					</h2>
					<p className="leading-relaxed text-[#444]">
						We may update this Privacy Policy from time to time. We will notify you of any material
						changes by posting the new policy on this page and updating the &quot;Last updated&quot;
						date. Your continued use of our services after changes become effective constitutes
						acceptance of the updated policy.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">12. Contact Us</h2>
					<p className="leading-relaxed text-[#444] mb-6">
						If you have questions or concerns about this Privacy Policy or our data practices,
						please contact us at:
					</p>
					<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
						<p className="mb-1 font-bold text-foreground">Ansa</p>
						<p className="text-[#444]">
							Email:{" "}
							<a href="mailto:privacy@ansa.so" className="font-medium underline text-foreground">
								privacy@ansa.so
							</a>
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
