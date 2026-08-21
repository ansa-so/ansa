import { Text } from "@react-email/components";
import {
	AlertBanner,
	BodyText,
	formatTimestamp,
	MetadataBox,
	MetadataRow,
	TitleWithIcon,
	TranscriptBox,
} from "./_components";
import { EmailLayout } from "./_layout";

export interface ContactFormEmailProps {
	email: string;
	userId?: string | null;
	agentId?: string | null;
	subject: string;
	message: string;
}

export function ContactFormEmail({
	email,
	userId,
	agentId,
	subject,
	message,
}: ContactFormEmailProps) {
	const timestamp = new Date();

	return (
		<EmailLayout
			preview={`New contact form submission: ${subject}`}
			headerTitle="Contact Form"
			headerCode="[SUPPORT]"
			accentColor="#F59E0B"
			footer="This email was sent from the Ansa contact form."
		>
			{/* Alert Banner */}
			<AlertBanner icon="file-text" variant="warning">
				New Message Received
			</AlertBanner>

			{/* Title */}
			<TitleWithIcon icon="file-text">Contact Form Submission</TitleWithIcon>

			<BodyText>
				A new message has been submitted through the contact form. Review the details below.
			</BodyText>

			{/* Submission Metadata */}
			<MetadataBox title="Submission Details">
				<MetadataRow label="From" value={email} valueColor="#1A1A1A" />
				<MetadataRow label="Subject" value={subject} valueColor="#1A1A1A" />
				{userId && <MetadataRow label="User ID" value={userId} valueColor="#6B7280" />}
				{agentId && <MetadataRow label="Agent ID" value={agentId} valueColor="#6B7280" />}
				<MetadataRow icon="clock" label="Date" value={formatTimestamp(timestamp)} isLast />
			</MetadataBox>

			{/* Message Content */}
			<Text
				style={{
					margin: "0 0 8px 0",
					color: "#555555",
					fontSize: "11px",
				}}
			>
				Message content:
			</Text>
			<TranscriptBox>{message}</TranscriptBox>
		</EmailLayout>
	);
}

// Preview props for React Email dev server
ContactFormEmail.PreviewProps = {
	email: "john@example.com",
	userId: "user_123",
	agentId: "agent_456",
	subject: "Question about pricing plans",
	message:
		"Hi there,\n\nI'm interested in upgrading to the Pro plan but I have a few questions about the features included. Could you please provide more details about the API limits and priority support?\n\nThanks!",
} as ContactFormEmailProps;

export default ContactFormEmail;
