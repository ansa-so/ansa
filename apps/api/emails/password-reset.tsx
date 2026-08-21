import { Button, Heading, Img, Link, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_layout";

const EMAIL_ICONS_BASE_URL = process.env.DASHBOARD_URL || "https://ansa.so";

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

export interface PasswordResetEmailProps {
	url: string;
}

export function PasswordResetEmail({ url }: PasswordResetEmailProps) {
	const timestamp = new Date();

	return (
		<EmailLayout
			preview="Reset your Ansa password"
			headerTitle="ANSA Security"
			headerCode="[AUTH_RESET]"
			accentColor="#16A34A"
			showWarning={true}
			footer="If you didn't request this, you can safely ignore this email."
		>
			{/* Title with Lock Icon */}
			<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "24px" }}>
				<tr>
					<td style={{ verticalAlign: "middle", paddingRight: "12px" }}>
						<Img
							src={`${EMAIL_ICONS_BASE_URL}/email-icons/lock.png`}
							width="28"
							height="28"
							alt=""
						/>
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
							Credential Reset Request
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
				A password reset was requested for your account. Click the button below to set a new
				password:
			</Text>

			{/* Request Metadata Section */}
			<Section
				style={{
					backgroundColor: "#FAFAFA",
					border: "1px solid #E5E5E5",
					padding: "14px 16px",
					marginBottom: "24px",
				}}
			>
				<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "10px" }}>
					<tr>
						<td style={{ verticalAlign: "middle", paddingRight: "8px" }}>
							<Img
								src={`${EMAIL_ICONS_BASE_URL}/email-icons/terminal.png`}
								width="14"
								height="14"
								alt=""
							/>
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
								Request Metadata
							</Text>
						</td>
					</tr>
				</table>
				<table cellPadding="0" cellSpacing="0" width="100%">
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
								}}
							>
								Date
							</Text>
						</td>
						<td style={{ verticalAlign: "middle", textAlign: "right" }}>
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

			<Section style={{ textAlign: "center", margin: "32px 0" }}>
				<Button
					href={url}
					style={{
						display: "inline-block",
						backgroundColor: "#1A1A1A",
						color: "#FFFFFF",
						padding: "14px 32px",
						fontSize: "13px",
						fontWeight: 600,
						textDecoration: "none",
						textTransform: "uppercase",
						letterSpacing: "1px",
					}}
				>
					Reset Password →
				</Button>
			</Section>

			{/* Token URL Section */}
			<Text
				style={{
					margin: "24px 0 8px 0",
					color: "#555555",
					fontSize: "11px",
				}}
			>
				Or execute this token directly:
			</Text>
			<Section
				style={{
					backgroundColor: "#FAFAFA",
					border: "1px solid #E5E5E5",
					padding: "12px 16px",
				}}
			>
				<Link
					href={url}
					style={{
						color: "#1A1A1A",
						fontSize: "12px",
						fontFamily: "monospace",
						textDecoration: "none",
						wordBreak: "break-all",
					}}
				>
					{url}
				</Link>
			</Section>
		</EmailLayout>
	);
}

// Preview props for React Email dev server
PasswordResetEmail.PreviewProps = {
	url: "https://ansa.so/reset-password?token=abc123xyz",
} as PasswordResetEmailProps;

export default PasswordResetEmail;
