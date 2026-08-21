import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Cookie Policy",
	description:
		"Ansa's cookie policy. Learn what cookies are, how we use them, and your choices regarding cookies.",
};

export default function CookiePolicyPage() {
	return (
		<div className="container max-w-4xl px-8 py-12 mx-auto md:px-16">
			<div className="mb-16">
				<div className="inline-flex items-center gap-2 border border-[#D1D1D1] px-3 py-1 bg-white rounded-full mb-6">
					<span className="font-mono text-[10px] uppercase tracking-widest text-[#888]">
						Legal Document
					</span>
				</div>
				<h1 className="mb-4 text-5xl font-medium tracking-tight md:text-6xl text-foreground">
					Cookie Policy
				</h1>
				<p className="text-[#666] font-mono text-sm">Last updated: February 9, 2026</p>
			</div>

			<div className="space-y-12">
				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<p className="text-[#444] leading-relaxed">
						This Cookies Policy explains what Cookies are and how We use them. You should read this
						policy so You can understand what type of cookies We use, or the information We collect
						using Cookies and how that information is used.
					</p>
					<p className="mt-4 text-[#444] leading-relaxed">
						Cookies do not typically contain any information that personally identifies a user, but
						personal information that We store about You may be linked to the information stored in
						and obtained from Cookies. For further information on how We use, store and keep your
						personal data secure, see our Privacy Policy.
					</p>
					<p className="mt-4 text-[#444] leading-relaxed">
						We do not store sensitive personal information, such as mailing addresses, account
						passwords, etc. in the Cookies We use.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
						Interpretation and Definitions
					</h2>

					<h3 className="mb-3 text-lg font-bold text-foreground">Interpretation</h3>
					<p className="text-[#444] leading-relaxed mb-6">
						The words whose initial letters are capitalized have meanings defined under the
						following conditions. The following definitions shall have the same meaning regardless
						of whether they appear in singular or in plural.
					</p>

					<h3 className="mb-3 text-lg font-bold text-foreground">Definitions</h3>
					<p className="mb-4 text-[#444]">For the purposes of this Cookies Policy:</p>
					<ul className="pl-6 space-y-3 list-disc text-[#444]">
						<li>
							<strong className="text-foreground">Company</strong> (referred to as either &quot;the
							Company&quot;, &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in this Cookies
							Policy) refers to CosmicStudio LLC, which operates Ansa.
						</li>
						<li>
							<strong className="text-foreground">Cookies</strong> means small files that are placed
							on Your computer, mobile device or any other device by a website, containing details
							of your browsing history on that website among its many uses.
						</li>
						<li>
							<strong className="text-foreground">Website</strong> refers to Ansa, accessible from{" "}
							<a href="https://ansa.so" className="font-medium underline text-foreground">
								https://ansa.so
							</a>
							.
						</li>
						<li>
							<strong className="text-foreground">You</strong> means the individual accessing or
							using the Website, or a company, or any legal entity on behalf of which such
							individual is accessing or using the Website, as applicable.
						</li>
					</ul>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-6 text-2xl font-bold tracking-tight text-foreground">
						The Use of the Cookies
					</h2>

					<h3 className="mb-3 text-lg font-bold text-foreground">Type of Cookies We Use</h3>
					<p className="mb-4 text-[#444] leading-relaxed">
						Cookies can be &quot;Persistent&quot; or &quot;Session&quot; Cookies. Persistent Cookies
						remain on your personal computer or mobile device when You go offline, while Session
						Cookies are deleted as soon as You close your web browser.
					</p>
					<p className="mb-6 text-[#444] leading-relaxed">
						Where required by law, We will request your consent before using Cookies that are not
						strictly necessary. Strictly necessary Cookies are used to provide the Website and
						cannot be switched off in our systems.
					</p>
					<p className="mb-6 text-[#444] leading-relaxed">
						We use both session and persistent Cookies for the purposes set out below:
					</p>

					<div className="space-y-6">
						<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
							<h4 className="mb-2 font-bold text-foreground">Necessary / Essential Cookies</h4>
							<p className="text-[#444] text-sm mb-1">
								<strong>Type:</strong> Session Cookies
							</p>
							<p className="text-[#444] text-sm mb-2">
								<strong>Administered by:</strong> Us
							</p>
							<p className="text-[#444] leading-relaxed">
								These Cookies are essential to provide You with services available through the
								Website and to enable You to use some of its features. They help to authenticate
								users and prevent fraudulent use of user accounts. Without these Cookies, the
								services that You have asked for cannot be provided, and We only use these Cookies
								to provide You with those services.
							</p>
						</div>

						<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
							<h4 className="mb-2 font-bold text-foreground">Consent / Preferences Cookies</h4>
							<p className="text-[#444] text-sm mb-1">
								<strong>Type:</strong> Persistent Cookies
							</p>
							<p className="text-[#444] text-sm mb-2">
								<strong>Administered by:</strong> Us
							</p>
							<p className="text-[#444] leading-relaxed">
								These Cookies (or similar technologies) store your cookie preferences/consent
								choices.
							</p>
						</div>

						<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
							<h4 className="mb-2 font-bold text-foreground">Functionality Cookies</h4>
							<p className="text-[#444] text-sm mb-1">
								<strong>Type:</strong> Persistent Cookies
							</p>
							<p className="text-[#444] text-sm mb-2">
								<strong>Administered by:</strong> Us
							</p>
							<p className="text-[#444] leading-relaxed">
								These Cookies allow Us to remember choices You make when You use the Website, such
								as remembering your login details or language preference. The purpose of these
								Cookies is to provide You with a more personal experience and to avoid You having to
								re-enter your preferences every time You use the Website.
							</p>
						</div>

						<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
							<h4 className="mb-2 font-bold text-foreground">Tracking and Performance Cookies</h4>
							<p className="text-[#444] text-sm mb-1">
								<strong>Type:</strong> Persistent Cookies
							</p>
							<p className="text-[#444] text-sm mb-2">
								<strong>Administered by:</strong> Third Parties
							</p>
							<p className="text-[#444] leading-relaxed">
								These Cookies are used to track information about traffic to the Website and how
								users use the Website. The information gathered via these Cookies may directly or
								indirectly identify you as an individual visitor. This is because the information
								collected is typically linked to a pseudonymous identifier associated with the
								device you use to access the Website. We may also use these Cookies to test new
								pages, features or functionality of the Website to see how our users react to them.
							</p>
						</div>

						<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
							<h4 className="mb-2 font-bold text-foreground">Social Media Cookies</h4>
							<p className="text-[#444] text-sm mb-1">
								<strong>Type:</strong> Persistent Cookies
							</p>
							<p className="text-[#444] text-sm mb-2">
								<strong>Administered by:</strong> Third Parties
							</p>
							<p className="text-[#444] leading-relaxed">
								In addition to Our own Cookies, We may also use various third party plug-ins from
								social media networking websites to report usage statistics of the Website and to
								provide social media features. These third party plug-ins may store Cookies. We do
								not control these Social Media Cookies. Please refer to the relevant social media
								networking website&apos;s privacy policies for information about their cookies.
							</p>
						</div>
					</div>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						Your Choices Regarding Cookies
					</h2>
					<p className="mb-4 text-[#444] leading-relaxed">
						If You prefer to avoid the use of Cookies on the Website, first You must disable the use
						of Cookies in your browser and then delete the Cookies saved in your browser associated
						with the Website. You may use this option for preventing the use of Cookies at any time.
					</p>
					<p className="mb-4 text-[#444] leading-relaxed">
						If You do not accept Our Cookies, You may experience some inconvenience in your use of
						the Website and some features may not function properly.
					</p>
					<p className="mb-4 text-[#444] leading-relaxed">
						If You&apos;d like to delete Cookies or instruct your web browser to delete or refuse
						Cookies, please visit the help pages of your web browser:
					</p>
					<ul className="pl-6 space-y-3 list-disc text-[#444]">
						<li>
							<strong className="text-foreground">Chrome:</strong>{" "}
							<a
								href="https://support.google.com/accounts/answer/32050"
								className="underline break-all text-foreground"
								target="_blank"
								rel="noopener noreferrer"
							>
								support.google.com/accounts/answer/32050
							</a>
						</li>
						<li>
							<strong className="text-foreground">Microsoft Edge:</strong>{" "}
							<a
								href="https://support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
								className="underline break-all text-foreground"
								target="_blank"
								rel="noopener noreferrer"
							>
								support.microsoft.com/microsoft-edge/delete-cookies-in-microsoft-edge
							</a>
						</li>
						<li>
							<strong className="text-foreground">Firefox:</strong>{" "}
							<a
								href="https://support.mozilla.org/en-US/kb/delete-cookies-remove-info-websites-stored"
								className="underline break-all text-foreground"
								target="_blank"
								rel="noopener noreferrer"
							>
								support.mozilla.org/en-US/kb/delete-cookies-remove-info-websites-stored
							</a>
						</li>
						<li>
							<strong className="text-foreground">Safari:</strong>{" "}
							<a
								href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
								className="underline break-all text-foreground"
								target="_blank"
								rel="noopener noreferrer"
							>
								support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471
							</a>
						</li>
					</ul>
					<p className="mt-4 text-[#444] leading-relaxed">
						For any other web browser, please visit your web browser&apos;s official web pages.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">
						Changes to This Cookies Policy
					</h2>
					<p className="leading-relaxed text-[#444]">
						We may update this Cookies Policy from time to time. The &quot;Last updated&quot; date
						at the top indicates when it was last revised.
					</p>
				</section>

				<section className="bg-white border border-[#D1D1D1] p-8 md:p-12 shadow-sm">
					<h2 className="mb-4 text-2xl font-bold tracking-tight text-foreground">Contact Us</h2>
					<p className="leading-relaxed text-[#444] mb-6">
						If you have any questions about this Cookies Policy, You can contact us:
					</p>
					<div className="p-6 border border-[#D1D1D1] bg-[#F9F9F9]">
						<p className="mb-1 font-bold text-foreground">Ansa</p>
						<p className="text-[#444]">
							Email:{" "}
							<a href="mailto:legal@ansa.so" className="font-medium underline text-foreground">
								legal@ansa.so
							</a>
						</p>
					</div>
				</section>
			</div>
		</div>
	);
}
