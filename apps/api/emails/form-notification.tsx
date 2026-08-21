import { Text } from "@react-email/components";
import {
	AlertBanner,
	BodyText,
	formatTimestamp,
	MetadataBox,
	MetadataRow,
	PrimaryButton,
	TitleWithIcon,
	TokenLinkBox,
} from "./_components";
import { EmailLayout } from "./_layout";

export interface FormNotificationEmailProps {
	formName: string;
	formData: Record<string, unknown>;
	dashboardUrl: string;
	conversationUrl?: string;
}

function formatFieldValue(value: unknown): string {
	if (value === null || value === undefined) {
		return "-";
	}
	if (typeof value === "boolean") {
		return value ? "Yes" : "No";
	}
	if (typeof value === "object") {
		return JSON.stringify(value);
	}
	return String(value);
}

function formatFieldName(key: string): string {
	// Convert camelCase or snake_case to Title Case
	return key
		.replace(/([A-Z])/g, " $1")
		.replace(/_/g, " ")
		.replace(/^\w/, (c) => c.toUpperCase())
		.trim();
}

export function FormNotificationEmail({
	formName,
	formData,
	dashboardUrl,
	conversationUrl,
}: FormNotificationEmailProps) {
	const fields = Object.entries(formData || {}).filter(
		([key]) => !key.startsWith("_"), // Filter out internal fields
	);
	const timestamp = new Date();

	return (
		<EmailLayout
			preview={`New form submission: ${formName || "Unknown"}`}
			headerTitle="Form Submission"
			headerCode={`[${(formName || "FORM").toUpperCase().replace(/\s+/g, "_")}]`}
			accentColor="#2563EB"
			footer="This email was sent because you set up email notifications for form submissions."
		>
			{/* Alert Banner */}
			<AlertBanner icon="file-text" variant="info">
				New Data Received
			</AlertBanner>

			{/* Title */}
			<TitleWithIcon icon="file-text">New Form Submission</TitleWithIcon>

			<BodyText>A new form submission has been received. Review the submitted data below.</BodyText>

			{/* Submission Metadata */}
			<MetadataBox title="Submission Details">
				<MetadataRow label="Form" value={formName} valueColor="#1A1A1A" />
				<MetadataRow icon="clock" label="Date" value={formatTimestamp(timestamp)} isLast />
			</MetadataBox>

			{/* Form Data */}
			<MetadataBox title="Submitted Data" icon="file-text">
				{fields.length > 0 ? (
					fields.map(([key, value], index) => (
						<MetadataRow
							key={key}
							label={formatFieldName(key)}
							value={formatFieldValue(value)}
							valueColor="#1A1A1A"
							isLast={index === fields.length - 1}
						/>
					))
				) : (
					<Text
						style={{
							margin: 0,
							color: "#6B7280",
							fontSize: "12px",
							fontStyle: "italic",
						}}
					>
						No data submitted
					</Text>
				)}
			</MetadataBox>

			{/* Primary Action Button */}
			<PrimaryButton href={dashboardUrl}>View in Dashboard →</PrimaryButton>

			{/* Conversation Link */}
			{conversationUrl && (
				<TokenLinkBox label="Or view the conversation directly:" url={conversationUrl} />
			)}
		</EmailLayout>
	);
}

// Preview props for React Email dev server
FormNotificationEmail.PreviewProps = {
	formName: "Contact Form",
	formData: {
		name: "John Doe",
		email: "john@example.com",
		message: "I'm interested in your product.",
		newsletter: true,
	},
	dashboardUrl: "https://ansa.so/dashboard/forms",
	conversationUrl: "https://ansa.so/dashboard/conversations/123",
} as FormNotificationEmailProps;

export default FormNotificationEmail;
