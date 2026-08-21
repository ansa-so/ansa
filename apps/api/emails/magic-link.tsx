import {
	BodyText,
	formatTimestamp,
	MetadataBox,
	MetadataRow,
	PrimaryButton,
	TitleWithIcon,
	TokenLinkBox,
} from "./_components";
import { EmailLayout } from "./_layout";

export interface MagicLinkEmailProps {
	url: string;
}

export function MagicLinkEmail({ url }: MagicLinkEmailProps) {
	const timestamp = new Date();

	return (
		<EmailLayout
			preview="Sign in to Ansa"
			headerTitle="ANSA Security"
			headerCode="[AUTH_LOGIN]"
			accentColor="#16A34A"
			showWarning={true}
			warningText="Never share this link. Ansa will never ask for your credentials via email or phone."
			footer="If you didn't request this, you can safely ignore this email."
		>
			{/* Title */}
			<TitleWithIcon icon="lock">Sign In Request</TitleWithIcon>

			<BodyText>
				A sign-in link was requested for your account. Click the button below to securely access
				your dashboard:
			</BodyText>

			{/* Request Metadata */}
			<MetadataBox title="Request Metadata">
				<MetadataRow icon="clock" label="Date" value={formatTimestamp(timestamp)} isLast />
			</MetadataBox>

			{/* Primary Action Button */}
			<PrimaryButton href={url}>Sign In Securely →</PrimaryButton>

			{/* Fallback Link */}
			<TokenLinkBox label="Or execute this token directly:" url={url} />
		</EmailLayout>
	);
}

// Preview props for React Email dev server
MagicLinkEmail.PreviewProps = {
	url: "https://ansa.so/auth/magic-link?token=abc123xyz",
} as MagicLinkEmailProps;

export default MagicLinkEmail;
