import { Heading, Img, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_layout";

export interface RefundEscalationEmailProps {
	agentName: string;
	orderNumber: string;
	amount: number;
	currency: string;
	reason: string;
	customerName?: string;
	customerEmail?: string;
	customerPhone?: string;
	dashboardUrl: string;
}

function formatCurrency(amount: number, currency: string): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: currency,
	}).format(amount);
}

export function RefundEscalationEmail({
	agentName,
	orderNumber,
	amount,
	currency,
	reason,
	customerName,
	customerEmail,
	customerPhone,
	dashboardUrl,
}: RefundEscalationEmailProps) {
	return (
		<EmailLayout
			preview={`💰 Refund Request - Order ${orderNumber}`}
			headerTitle="Refund Request"
			headerCode={`ORDER: ${orderNumber}`}
			accentColor="#F59E0B"
			footer="This email was sent because you're configured to receive refund escalation notifications."
		>
			{/* Alert Banner */}
			<Section
				style={{
					backgroundColor: "#FFFBEB",
					border: "1px solid #FCD34D",
					padding: "12px 16px",
					marginBottom: "20px",
				}}
			>
				<table cellPadding="0" cellSpacing="0">
					<tr>
						<td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
							<Img src={`${dashboardUrl}/email-icons/dollar.png`} width="16" height="16" alt="" />
						</td>
						<td style={{ verticalAlign: "middle" }}>
							<Text
								style={{
									margin: 0,
									color: "#92400E",
									fontSize: "12px",
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Refund Review Required
							</Text>
						</td>
					</tr>
				</table>
			</Section>

			{/* Title with Icon */}
			<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "24px" }}>
				<tr>
					<td style={{ verticalAlign: "middle", paddingRight: "12px" }}>
						<Img src={`${dashboardUrl}/email-icons/dollar.png`} width="28" height="28" alt="" />
					</td>
					<td style={{ verticalAlign: "middle" }}>
						<Heading
							style={{
								margin: 0,
								color: "#1A1A1A",
								fontSize: "24px",
								fontWeight: 600,
								lineHeight: 1.2,
							}}
						>
							New Refund Request
						</Heading>
					</td>
				</tr>
			</table>

			<Text
				style={{
					margin: "0 0 24px 0",
					color: "#555555",
					fontSize: "15px",
					lineHeight: 1.6,
				}}
			>
				A customer has requested a refund that requires your approval. Please review and respond
				promptly.
			</Text>

			{/* Refund Details Section */}
			<Section
				style={{
					backgroundColor: "#FAFAFA",
					border: "1px solid #E5E5E5",
					padding: "14px 16px",
					marginBottom: "24px",
				}}
			>
				<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "12px" }}>
					<tr>
						<td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
							<Img src={`${dashboardUrl}/email-icons/terminal.png`} width="14" height="14" alt="" />
						</td>
						<td style={{ verticalAlign: "middle" }}>
							<Text
								style={{
									margin: 0,
									color: "#1A1A1A",
									fontSize: "11px",
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Refund Details
							</Text>
						</td>
					</tr>
				</table>

				{/* Order Number Row */}
				<table
					cellPadding="0"
					cellSpacing="0"
					width="100%"
					style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: "8px", marginBottom: "8px" }}
				>
					<tr>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Order</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text
								style={{
									margin: 0,
									color: "#1A1A1A",
									fontSize: "12px",
									fontFamily: "monospace",
									fontWeight: 600,
								}}
							>
								{orderNumber}
							</Text>
						</td>
					</tr>
				</table>

				{/* Amount Row */}
				<table
					cellPadding="0"
					cellSpacing="0"
					width="100%"
					style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: "8px", marginBottom: "8px" }}
				>
					<tr>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Amount</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text style={{ margin: 0, color: "#DC2626", fontSize: "14px", fontWeight: 700 }}>
								{formatCurrency(amount, currency)}
							</Text>
						</td>
					</tr>
				</table>

				{/* Agent Row */}
				<table
					cellPadding="0"
					cellSpacing="0"
					width="100%"
					style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: "8px", marginBottom: "8px" }}
				>
					<tr>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Agent</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text style={{ margin: 0, color: "#1A1A1A", fontSize: "12px" }}>{agentName}</Text>
						</td>
					</tr>
				</table>

				{/* Reason Row */}
				<table cellPadding="0" cellSpacing="0" width="100%">
					<tr>
						<td>
							<Text style={{ margin: "0 0 4px 0", color: "#6B7280", fontSize: "12px" }}>
								Reason
							</Text>
							<Text style={{ margin: 0, color: "#1A1A1A", fontSize: "13px", lineHeight: 1.5 }}>
								{reason}
							</Text>
						</td>
					</tr>
				</table>
			</Section>

			{/* Customer Contact Section */}
			{(customerName || customerEmail || customerPhone) && (
				<Section
					style={{
						backgroundColor: "#F0FDF4",
						border: "1px solid #86EFAC",
						padding: "14px 16px",
						marginBottom: "24px",
					}}
				>
					<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "12px" }}>
						<tr>
							<td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
								<Img src={`${dashboardUrl}/email-icons/user.png`} width="14" height="14" alt="" />
							</td>
							<td style={{ verticalAlign: "middle" }}>
								<Text
									style={{
										margin: 0,
										color: "#166534",
										fontSize: "11px",
										fontWeight: 600,
										textTransform: "uppercase",
										letterSpacing: "0.5px",
									}}
								>
									Customer Contact
								</Text>
							</td>
						</tr>
					</table>

					{customerName && (
						<table
							cellPadding="0"
							cellSpacing="0"
							width="100%"
							style={{
								borderBottom: "1px solid #BBF7D0",
								paddingBottom: "8px",
								marginBottom: "8px",
							}}
						>
							<tr>
								<td style={{ verticalAlign: "middle" }}>
									<Text style={{ margin: 0, color: "#166534", fontSize: "12px" }}>Name</Text>
								</td>
								<td style={{ verticalAlign: "middle", textAlign: "right" }}>
									<Text style={{ margin: 0, color: "#1A1A1A", fontSize: "12px", fontWeight: 500 }}>
										{customerName}
									</Text>
								</td>
							</tr>
						</table>
					)}

					{customerEmail && (
						<table
							cellPadding="0"
							cellSpacing="0"
							width="100%"
							style={{
								borderBottom: customerPhone ? "1px solid #BBF7D0" : "none",
								paddingBottom: "8px",
								marginBottom: customerPhone ? "8px" : "0",
							}}
						>
							<tr>
								<td style={{ verticalAlign: "middle" }}>
									<Text style={{ margin: 0, color: "#166534", fontSize: "12px" }}>Email</Text>
								</td>
								<td style={{ verticalAlign: "middle", textAlign: "right" }}>
									<Link
										href={`mailto:${customerEmail}`}
										style={{ color: "#2563EB", fontSize: "12px", textDecoration: "none" }}
									>
										{customerEmail}
									</Link>
								</td>
							</tr>
						</table>
					)}

					{customerPhone && (
						<table cellPadding="0" cellSpacing="0" width="100%">
							<tr>
								<td style={{ verticalAlign: "middle" }}>
									<Text style={{ margin: 0, color: "#166534", fontSize: "12px" }}>Phone</Text>
								</td>
								<td style={{ verticalAlign: "middle", textAlign: "right" }}>
									<Link
										href={`tel:${customerPhone}`}
										style={{ color: "#2563EB", fontSize: "12px", textDecoration: "none" }}
									>
										{customerPhone}
									</Link>
								</td>
							</tr>
						</table>
					)}
				</Section>
			)}

			{/* Action Button */}
			<Section style={{ textAlign: "center", marginBottom: "24px" }}>
				<Link
					href={`${dashboardUrl}/integrations/shopify`}
					style={{
						display: "inline-block",
						backgroundColor: "#F59E0B",
						color: "#FFFFFF",
						padding: "12px 24px",
						fontSize: "14px",
						fontWeight: 600,
						textDecoration: "none",
						borderRadius: "6px",
					}}
				>
					Review Refund Request →
				</Link>
			</Section>

			<Text
				style={{
					margin: 0,
					color: "#9CA3AF",
					fontSize: "12px",
					textAlign: "center",
				}}
			>
				You can approve or reject this request from your Shopify integration dashboard.
			</Text>
		</EmailLayout>
	);
}

export default RefundEscalationEmail;
