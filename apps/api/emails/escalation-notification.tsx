import { Heading, Img, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_layout";

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

export interface EscalationNotificationEmailProps {
	agentName: string;
	priority: string;
	source: string;
	conversationPreview?: string;
	dashboardUrl: string;
	conversationUrl: string;
}

function getPriorityColor(priority: string): string {
	switch (priority) {
		case "urgent":
			return "#dc2626"; // red-600
		case "high":
			return "#ea580c"; // orange-600
		case "medium":
			return "#ca8a04"; // yellow-600
		case "low":
			return "#16a34a"; // green-600
		default:
			return "#6b7280"; // gray-500
	}
}

function formatSource(source: string): string {
	switch (source) {
		case "user_request":
			return "User requested human support";
		case "low_confidence":
			return "Auto-escalated due to low confidence";
		case "form":
			return "Form submission triggered escalation";
		default:
			return source;
	}
}

export function EscalationNotificationEmail({
	agentName,
	priority,
	source,
	conversationPreview,
	dashboardUrl,
	conversationUrl,
}: EscalationNotificationEmailProps) {
	const priorityColor = getPriorityColor(priority);
	const timestamp = new Date();

	return (
		<EmailLayout
			preview={`🚨 New escalation request - ${agentName}`}
			headerTitle="System Interrupt"
			headerCode={`PRIORITY: ${priority?.toUpperCase() || "UNKNOWN"}`}
			accentColor="#DC2626"
			footer="This email was sent because you're configured to receive escalation notifications."
		>
			{/* Alert Banner */}
			<Section
				style={{
					backgroundColor: "#FEF2F2",
					border: "1px solid #FCA5A5",
					padding: "12px 16px",
					marginBottom: "20px",
				}}
			>
				<table cellPadding="0" cellSpacing="0">
					<tr>
						<td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
							<Img src={`${dashboardUrl}/email-icons/warning.png`} width="16" height="16" alt="" />
						</td>
						<td style={{ verticalAlign: "middle" }}>
							<Text
								style={{
									margin: 0,
									color: "#991B1B",
									fontSize: "12px",
									fontWeight: 600,
									textTransform: "uppercase",
									letterSpacing: "0.5px",
								}}
							>
								Human Intervention Required
							</Text>
						</td>
					</tr>
				</table>
			</Section>

			{/* Title with Icon */}
			<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "24px" }}>
				<tr>
					<td style={{ verticalAlign: "middle", paddingRight: "12px" }}>
						<Img src={`${dashboardUrl}/email-icons/warning.png`} width="28" height="28" alt="" />
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
							New Escalation Request
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
				A customer is waiting for human assistance. Please respond as soon as possible.
			</Text>

			{/* Escalation Metadata Section */}
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
								Escalation Details
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
							<Text
								style={{ margin: 0, color: "#1A1A1A", fontSize: "12px", fontFamily: "monospace" }}
							>
								{agentName}
							</Text>
						</td>
					</tr>
				</table>

				{/* Priority Row */}
				<table
					cellPadding="0"
					cellSpacing="0"
					width="100%"
					style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: "8px", marginBottom: "8px" }}
				>
					<tr>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Priority</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text
								style={{
									margin: 0,
									color: priorityColor,
									fontSize: "12px",
									fontFamily: "monospace",
									fontWeight: 600,
								}}
							>
								{priority?.toUpperCase() || "UNKNOWN"}
							</Text>
						</td>
					</tr>
				</table>

				{/* Reason Row */}
				<table
					cellPadding="0"
					cellSpacing="0"
					width="100%"
					style={{ borderBottom: "1px solid #E5E5E5", paddingBottom: "8px", marginBottom: "8px" }}
				>
					<tr>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Reason</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text
								style={{ margin: 0, color: "#1A1A1A", fontSize: "12px", fontFamily: "monospace" }}
							>
								{formatSource(source)}
							</Text>
						</td>
					</tr>
				</table>

				{/* Date Row */}
				<table cellPadding="0" cellSpacing="0" width="100%">
					<tr>
						<td style={{ verticalAlign: "middle", paddingRight: "8px", width: "22px" }}>
							<Img src={`${dashboardUrl}/email-icons/clock.png`} width="14" height="14" alt="" />
						</td>
						<td style={{ verticalAlign: "middle" }}>
							<Text style={{ margin: 0, color: "#6B7280", fontSize: "12px" }}>Date</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
							<Text
								style={{ margin: 0, color: "#6B7280", fontSize: "12px", fontFamily: "monospace" }}
							>
								{formatTimestamp(timestamp)}
							</Text>
						</td>
					</tr>
				</table>
			</Section>

			{/* Conversation Preview */}
			{conversationPreview && (
				<>
					<Text
						style={{
							margin: "0 0 8px 0",
							color: "#555555",
							fontSize: "11px",
						}}
					>
						Last message (context):
					</Text>
					<Section
						style={{
							backgroundColor: "#FAFAF9",
							border: "1px solid #E5E5E5",
							borderLeft: "3px solid #1A1A1A",
							padding: "15px",
							marginBottom: "24px",
						}}
					>
						<Text
							style={{
								margin: 0,
								color: "#1A1A1A",
								fontSize: "14px",
								fontStyle: "italic",
								lineHeight: 1.5,
							}}
						>
							"
							{conversationPreview.length > 200
								? `${conversationPreview.substring(0, 200)}...`
								: conversationPreview}
							"
						</Text>
					</Section>
				</>
			)}

			{/* Primary Action Button */}
			<Section style={{ textAlign: "center", margin: "32px 0" }}>
				<a
					href={dashboardUrl}
					style={{
						display: "inline-block",
						backgroundColor: "#DC2626",
						color: "#FFFFFF",
						padding: "14px 32px",
						fontSize: "13px",
						fontWeight: 600,
						textDecoration: "none",
						textTransform: "uppercase",
						letterSpacing: "1px",
					}}
				>
					Intercept Session Now →
				</a>
			</Section>

			{/* Fallback Link */}
			<Text
				style={{
					margin: "24px 0 8px 0",
					color: "#555555",
					fontSize: "11px",
				}}
			>
				Or open the conversation directly:
			</Text>
			<Section
				style={{
					backgroundColor: "#FAFAFA",
					border: "1px solid #E5E5E5",
					padding: "12px 16px",
				}}
			>
				<a
					href={conversationUrl}
					style={{
						color: "#1A1A1A",
						fontSize: "12px",
						fontFamily: "monospace",
						textDecoration: "none",
						wordBreak: "break-all",
					}}
				>
					{conversationUrl}
				</a>
			</Section>
		</EmailLayout>
	);
}

// Preview props for React Email dev server
EscalationNotificationEmail.PreviewProps = {
	agentName: "Support Bot",
	priority: "high",
	source: "user_request",
	conversationPreview:
		"Customer is asking about refund policy and seems frustrated with the response time.",
	dashboardUrl: "https://ansa.so/",
	conversationUrl: "https://ansa.so/conversations/123",
} as EscalationNotificationEmailProps;

export default EscalationNotificationEmail;
