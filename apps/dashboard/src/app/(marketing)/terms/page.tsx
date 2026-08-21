"use client";

export default function TermsOfServicePage() {
	return (
		<div className="flex flex-col items-center flex-1 w-full">
			<div className="w-full max-w-6xl p-6 mx-auto space-y-12 md:p-8">
				<div className="space-y-4 text-center">
					<div className="flex justify-center">
						<span className="inline-flex items-center px-3 py-1 text-xs font-mono uppercase tracking-wider bg-white border border-[#D1D1D1] text-foreground shadow-sm">
							Legal Document
						</span>
					</div>
					<h1 className="text-5xl font-bold tracking-tight md:text-6xl text-foreground">
						Terms of Service
					</h1>
					<p className="text-sm font-mono text-[#666] tracking-wider">
						LAST UPDATED: DECEMBER 10, 2025
					</p>
				</div>

				<div className="space-y-8">
					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							1. Acceptance of Terms
						</h2>
						<p className="text-[#444] leading-relaxed">
							By accessing or using Ansa (&quot;Service&quot;), you agree to be bound by these Terms
							of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use
							the Service. We reserve the right to modify these Terms at any time, and your
							continued use of the Service constitutes acceptance of any changes.
						</p>
					</section>
					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							2. Description of Service
						</h2>
						<p className="text-[#444] leading-relaxed">
							Ansa is an AI agent platform that allows you to create, train, and deploy custom AI
							chatbots. The Service includes features for uploading knowledge sources, managing AI
							agents, embedding chat widgets, and accessing conversation analytics.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							3. Account Registration
						</h2>
						<p className="text-[#444] leading-relaxed mb-4">
							To use certain features of the Service, you must create an account. You agree to:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-[#444]">
							<li>Provide accurate, current, and complete information during registration</li>
							<li>Maintain and update your account information to keep it accurate</li>
							<li>Keep your password secure and confidential</li>
							<li>Be responsible for all activities that occur under your account</li>
							<li>Notify us immediately of any unauthorized use of your account</li>
						</ul>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							4. Acceptable Use
						</h2>
						<p className="text-[#444] mb-4">You agree not to use the Service to:</p>
						<ul className="pl-6 space-y-2 list-disc text-[#444]">
							<li>Violate any applicable laws, regulations, or third-party rights</li>
							<li>
								Upload, transmit, or distribute any content that is unlawful, harmful, threatening,
								abusive, harassing, defamatory, or otherwise objectionable
							</li>
							<li>Impersonate any person or entity or misrepresent your affiliation</li>
							<li>Interfere with or disrupt the Service or servers or networks connected to it</li>
							<li>
								Attempt to gain unauthorized access to any part of the Service or other systems
							</li>
							<li>Use the Service for any fraudulent or deceptive purpose</li>
							<li>
								Train AI agents to provide medical, legal, or financial advice without appropriate
								disclaimers
							</li>
							<li>
								Use automated means to access the Service without our express written permission
							</li>
						</ul>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							5. Content and Intellectual Property
						</h2>

						<h3 className="mb-2 font-mono text-lg tracking-wider uppercase text-foreground">
							5.1 Your Content
						</h3>
						<p className="text-[#444] leading-relaxed mb-4">
							You retain ownership of all content you upload to the Service (&quot;Your
							Content&quot;). By uploading content, you grant us a non-exclusive, worldwide,
							royalty-free license to use, process, and display Your Content solely to provide and
							improve the Service.
						</p>

						<h3 className="mb-2 font-mono text-lg tracking-wider uppercase text-foreground">
							5.2 Our Content
						</h3>
						<p className="text-[#444] leading-relaxed">
							The Service and its original content (excluding Your Content), features, and
							functionality are owned by Ansa and are protected by international copyright,
							trademark, and other intellectual property laws.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							6. AI-Generated Content
						</h2>
						<p className="text-[#444] leading-relaxed">
							The Service uses artificial intelligence to generate responses. While we strive for
							accuracy, AI-generated content may contain errors or inaccuracies. You acknowledge
							that: (a) AI responses should not be relied upon as professional advice; (b) you are
							responsible for reviewing and validating AI-generated content before use; (c) we do
							not guarantee the accuracy, completeness, or suitability of AI responses.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							7. Subscription and Payment
						</h2>
						<p className="text-[#444] leading-relaxed mb-4">
							Certain features of the Service require a paid subscription. By subscribing, you agree
							to:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-[#444]">
							<li>Pay all applicable fees as described in your selected plan</li>
							<li>
								Provide valid payment information and authorize us to charge your payment method
							</li>
							<li>Subscriptions automatically renew unless cancelled before the renewal date</li>
							<li>Refunds are provided in accordance with our refund policy</li>
						</ul>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							8. Usage Limits
						</h2>
						<p className="text-[#444] leading-relaxed">
							Each subscription plan includes specific usage limits (e.g., message counts, number of
							agents, storage). If you exceed your plan limits, you may need to upgrade to continue
							using the Service. We reserve the right to suspend or limit access if usage
							significantly exceeds your plan allowances.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							9. Branding Requirements
						</h2>
						<p className="text-[#444] leading-relaxed mb-4">
							Free plan users are required to display &quot;Powered by Ansa&quot; branding on all
							chat widgets deployed through the Service. You agree not to:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-[#444]">
							<li>Remove, hide, or obscure the Ansa branding on free plan widgets</li>
							<li>Modify the embed code or widget configuration to bypass branding requirements</li>
							<li>Use CSS, JavaScript, or any other means to hide or alter the branding</li>
							<li>Circumvent technical measures designed to enforce branding display</li>
						</ul>
						<p className="text-[#444] leading-relaxed mt-4">
							Violation of branding requirements may result in immediate suspension of your chat
							widget functionality and/or account termination. Paid plans include the option to
							remove or customize branding in accordance with your subscription tier.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							10. Termination
						</h2>
						<p className="text-[#444] leading-relaxed mb-4">
							We may terminate or suspend your account and access to the Service immediately,
							without prior notice, for any reason, including:
						</p>
						<ul className="pl-6 space-y-2 list-disc text-[#444]">
							<li>Breach of these Terms</li>
							<li>Non-payment of fees</li>
							<li>Conduct that we determine is harmful to other users or the Service</li>
							<li>Extended periods of inactivity</li>
						</ul>
						<p className="text-[#444] leading-relaxed mt-4">
							You may terminate your account at any time through your account settings. Upon
							termination, your right to use the Service will cease immediately.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							11. Disclaimer of Warranties
						</h2>
						<p className="text-[#444] leading-relaxed">
							THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT
							WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
							WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
							WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							12. Limitation of Liability
						</h2>
						<p className="text-[#444] leading-relaxed">
							TO THE MAXIMUM EXTENT PERMITTED BY LAW, ANSA SHALL NOT BE LIABLE FOR ANY INDIRECT,
							INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO
							LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE
							SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE
							(12) MONTHS PRECEDING THE CLAIM.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							13. Indemnification
						</h2>
						<p className="text-[#444] leading-relaxed">
							You agree to indemnify, defend, and hold harmless Ansa and its officers, directors,
							employees, and agents from any claims, damages, losses, liabilities, and expenses
							(including legal fees) arising from: (a) your use of the Service; (b) Your Content;
							(c) your violation of these Terms; or (d) your violation of any third-party rights.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							14. Governing Law
						</h2>
						<p className="text-[#444] leading-relaxed">
							These Terms shall be governed by and construed in accordance with the laws of the
							jurisdiction in which Ansa is incorporated, without regard to its conflict of law
							provisions. Any disputes arising from these Terms or the Service shall be resolved in
							the courts of that jurisdiction.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							15. Changes to Terms
						</h2>
						<p className="text-[#444] leading-relaxed">
							We reserve the right to modify these Terms at any time. We will notify you of material
							changes by posting the updated Terms on this page and updating the &quot;Last
							updated&quot; date. Your continued use of the Service after changes become effective
							constitutes acceptance of the modified Terms.
						</p>
					</section>

					<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
						<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
							16. Contact Us
						</h2>
						<p className="text-[#444] leading-relaxed">
							If you have any questions about these Terms of Service, please contact us at:
						</p>
						<div className="p-4 mt-4 bg-[#F9F9F9] border border-[#D1D1D1]">
							<p className="font-medium text-foreground">Ansa</p>
							<p className="text-[#444]">
								Email:{" "}
								<a href="mailto:legal@ansa.so" className="font-medium underline">
									legal@ansa.so
								</a>
							</p>
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}
