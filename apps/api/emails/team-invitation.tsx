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

export interface TeamInvitationEmailProps {
	inviterName: string;
	inviteUrl: string;
	teamName?: string;
}

export function TeamInvitationEmail({
	inviterName,
	inviteUrl,
	teamName,
}: TeamInvitationEmailProps) {
	const timestamp = new Date();

	return (
		<EmailLayout
			preview="You've been invited to join a team on Ansa"
			headerTitle="Team Invitation"
			headerCode="[INVITE]"
			accentColor="#8B5CF6"
			footer="This invitation expires in 7 days."
		>
			{/* Alert Banner */}
			<AlertBanner icon="success" variant="info">
				You've Been Invited
			</AlertBanner>

			{/* Title */}
			<TitleWithIcon icon="success">Team Invitation</TitleWithIcon>

			<BodyText>
				<strong>{inviterName}</strong> has invited you to join{" "}
				{teamName ? <strong>{teamName}</strong> : "their team"} on Ansa. Accept the invitation to
				start collaborating.
			</BodyText>

			{/* Invitation Details */}
			<MetadataBox title="Invitation Details">
				<MetadataRow label="Invited by" value={inviterName} valueColor="#1A1A1A" />
				{teamName && <MetadataRow label="Team" value={teamName} valueColor="#1A1A1A" />}
				<MetadataRow icon="clock" label="Date" value={formatTimestamp(timestamp)} isLast />
			</MetadataBox>

			{/* Primary Action Button */}
			<PrimaryButton href={inviteUrl}>Accept Invitation →</PrimaryButton>

			{/* Fallback Link */}
			<TokenLinkBox label="Or open the invitation link directly:" url={inviteUrl} />
		</EmailLayout>
	);
}

export default TeamInvitationEmail;
