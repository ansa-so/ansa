import { Body, Head, Html, Img, Preview, Section, Tailwind, Text } from "@react-email/components";

// Base URL for email icons - update this to your dashboard URL
const EMAIL_ICONS_BASE_URL = process.env.DASHBOARD_URL || "https://ansa.so";

// Brand colors and design tokens for emails
export const emailTheme = {
	colors: {
		primary: "#1a1a1a",
		primaryForeground: "#ffffff",
		secondary: "#f3f4f6",
		secondaryForeground: "#374151",
		accent: "#f59e0b",
		accentForeground: "#ffffff",
		background: "#ffffff",
		foreground: "#111827",
		muted: "#6b7280",
		mutedForeground: "#9ca3af",
		border: "#e5e7eb",
		success: "#10b981",
		error: "#ef4444",
		warning: "#DC2626",
	},
	fonts: {
		sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
	},
	borderRadius: {
		sm: "4px",
		md: "6px",
		lg: "8px",
		xl: "12px",
	},
	spacing: {
		xs: "4px",
		sm: "8px",
		md: "16px",
		lg: "24px",
		xl: "32px",
	},
} as const;

// Helper to format timestamp
function formatTimestamp(date: Date): string {
	return date.toLocaleString("en-US", {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		timeZoneName: "short",
	});
}

// Generate a system reference ID
function generateSystemRef(): string {
	return `REF-${Date.now().toString(36).toUpperCase()}`;
}

export interface EmailLayoutProps {
	preview: string;
	// biome-ignore lint/suspicious/noExplicitAny: React types version mismatch workaround
	children: any;
	footer?: string | Element;
	// New props for security-focused design
	headerTitle?: string;
	headerCode?: string;
	accentColor?: string;
	showWarning?: boolean;
	warningText?: string;
	timestamp?: Date;
	withPadding?: boolean;
}

export function EmailLayout({
	preview,
	children,
	footer,
	headerTitle,
	headerCode,
	accentColor = "#16A34A",
	showWarning,
	warningText = "Never share this link. Ansa will never ask for your password via email or phone.",
	timestamp,
	withPadding = true,
}: EmailLayoutProps) {
	const hasSecurityHeader = headerTitle || headerCode;
	const systemRef = generateSystemRef();

	return (
		<Html>
			<Preview>{preview}</Preview>
			<Tailwind
				config={{
					theme: {
						extend: {
							colors: {
								// Root-level colors (use: bg-primary, text-primary, etc.)
								primary: emailTheme.colors.primary,
								"primary-foreground": emailTheme.colors.primaryForeground,
								secondary: emailTheme.colors.secondary,
								"secondary-foreground": emailTheme.colors.secondaryForeground,
								accent: emailTheme.colors.accent,
								"accent-foreground": emailTheme.colors.accentForeground,
								muted: emailTheme.colors.muted,
								"muted-foreground": emailTheme.colors.mutedForeground,
								border: emailTheme.colors.border,
								success: emailTheme.colors.success,
								error: emailTheme.colors.error,
							},
						},
					},
				}}
			>
				<Head>
					<style>{`
            *, *::before, *::after {
              box-sizing: border-box;
            }
          `}</style>
				</Head>
				<Body className="mx-auto my-0 text-[#1A1A1A] bg-[#F3F2EE] p-5 font-sans leading-relaxed text-gray-800">
					<table
						role="presentation"
						cellPadding={0}
						cellSpacing={0}
						width={600}
						align="center"
						style={{
							width: "600px",
							margin: "0 auto",
							boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
							border: "1px solid #D1D1D1",
							backgroundColor: "#ffffff",
						}}
					>
						<tr>
							<td width="100%" style={{ width: "100%" }}>
								{/* Security Header */}
								{hasSecurityHeader && (
									<Section
										style={{
											backgroundColor: "#1A1A1A",
											padding: "20px 25px",
											borderBottom: `4px solid ${accentColor}`,
										}}
									>
										<table width="100%" cellPadding="0" cellSpacing="0" style={{ margin: 0 }}>
											<tr>
												<td style={{ verticalAlign: "middle" }}>
													<table cellPadding="0" cellSpacing="0">
														<tr>
															<td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
																<Img
																	src={`${EMAIL_ICONS_BASE_URL}/email-icons/shield-check.png`}
																	width="20"
																	height="20"
																	alt=""
																/>
															</td>
															<td style={{ verticalAlign: "middle" }}>
																<Text
																	style={{
																		margin: 0,
																		color: "#FFFFFF",
																		fontSize: "13px",
																		fontWeight: 600,
																		letterSpacing: "0.5px",
																		textTransform: "uppercase",
																	}}
																>
																	{headerTitle}
																</Text>
															</td>
														</tr>
													</table>
												</td>
												{headerCode && (
													<td style={{ verticalAlign: "middle", textAlign: "right" }}>
														<Text
															style={{
																margin: 0,
																color: "#9CA3AF",
																fontSize: "11px",
																fontFamily: "monospace",
															}}
														>
															{headerCode}
														</Text>
													</td>
												)}
											</tr>
										</table>
									</Section>
								)}

								<table
									role="presentation"
									cellPadding={0}
									cellSpacing={0}
									width="100%"
									style={{ width: "100%", textAlign: "center" }}
								>
									<tr>
										<td>
											{/* Main Content */}
											<section
												className={`border-b border-[#D1D1D1] bg-white text-left ${withPadding ? "p-6" : ""}`}
											>
												{children}

												{/* Footer */}
												{footer && !hasSecurityHeader && (
													<div className="pt-4 text-xs leading-[1.2] text-left">
														{footer as React.ReactNode}
													</div>
												)}

												{/* Timestamp Section */}
												{timestamp && (
													<Section
														style={{
															backgroundColor: "#FAFAFA",
															border: "1px solid #E5E5E5",
															padding: "12px 16px",
															marginTop: "24px",
														}}
													>
														<table cellPadding="0" cellSpacing="0">
															<tr>
																<td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
																	<Img
																		src={`${EMAIL_ICONS_BASE_URL}/email-icons/clock.png`}
																		width="14"
																		height="14"
																		alt=""
																	/>
																</td>
																<td style={{ verticalAlign: "middle" }}>
																	<Text
																		style={{
																			margin: 0,
																			color: "#6B7280",
																			fontSize: "12px",
																			fontFamily: "monospace",
																		}}
																	>
																		{formatTimestamp(timestamp)}
																	</Text>
																</td>
															</tr>
														</table>
													</Section>
												)}

												{/* Warning Section */}
												{showWarning && (
													<Section
														style={{
															backgroundColor: "#FEF2F2",
															border: "1px solid #FECACA",
															padding: "14px 16px",
															marginTop: "20px",
														}}
													>
														<table cellPadding="0" cellSpacing="0">
															<tr>
																<td
																	style={{
																		verticalAlign: "top",
																		paddingRight: "10px",
																		paddingTop: "2px",
																	}}
																>
																	<Img
																		src={`${EMAIL_ICONS_BASE_URL}/email-icons/warning.png`}
																		width="16"
																		height="16"
																		alt=""
																	/>
																</td>
																<td style={{ verticalAlign: "middle" }}>
																	<Text
																		style={{
																			margin: 0,
																			color: "#991B1B",
																			fontSize: "12px",
																			lineHeight: "1.4",
																		}}
																	>
																		{warningText}
																	</Text>
																</td>
															</tr>
														</table>
													</Section>
												)}
											</section>

											{/* Styled Footer for Security Emails */}
											{hasSecurityHeader && (
												<Section
													style={{
														backgroundColor: "#FAFAFA",
														padding: "16px 25px",
														borderTop: "1px solid #E5E5E5",
													}}
												>
													<table width="100%" cellPadding="0" cellSpacing="0">
														<tr>
															<td>
																<Text
																	style={{
																		margin: 0,
																		color: "#9CA3AF",
																		fontSize: "10px",
																		textTransform: "uppercase",
																		letterSpacing: "0.5px",
																		lineHeight: "1.3",
																		textAlign: "left",
																	}}
																>
																	{typeof footer === "string"
																		? footer
																		: "Automated security notification"}
																</Text>
															</td>
															<td style={{ textAlign: "right" }}>
																<Text
																	style={{
																		margin: 0,
																		color: "#D1D5DB",
																		fontSize: "9px",
																		fontFamily: "monospace",
																		lineHeight: "1.3",
																		whiteSpace: "nowrap",
																	}}
																>
																	{systemRef}
																</Text>
															</td>
														</tr>
													</table>
												</Section>
											)}
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</Body>
			</Tailwind>
		</Html>
	);
}

export default EmailLayout;
