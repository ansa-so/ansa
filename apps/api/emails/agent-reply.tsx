import { Container, Hr, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_layout";

export interface AgentReplyEmailProps {
	agentName: string;
	responseBody: string;
	disclaimerText?: string;
	signature?: string;
	originalMessage?: string;
	senderEmail?: string;
	originalDate?: string;
}

export function AgentReplyEmail({
	agentName,
	responseBody,
	disclaimerText,
	signature,
	originalMessage,
	senderEmail,
	originalDate,
}: AgentReplyEmailProps) {
	return (
		<EmailLayout
			preview={responseBody?.slice(0, 100) || "Agent response"}
			footer={`Powered by Ansa AI • ${agentName}`}
		>
			{/* Main response body */}
			<Section className="mb-6">
				<Text className="m-0 leading-relaxed text-gray-800 whitespace-pre-wrap">
					{responseBody}
				</Text>
			</Section>

			{/* AI Disclaimer */}
			{disclaimerText && (
				<Section className="p-3 mb-6 border-l-4 border-gray-300 rounded bg-gray-50">
					<Text className="m-0 text-sm italic text-gray-500">{disclaimerText}</Text>
				</Section>
			)}

			{/* Signature */}
			{signature && (
				<Section className="mb-6">
					<Hr className="my-4 border-gray-200" />
					{/* biome-ignore lint/security/noDangerouslySetInnerHtml: owner-configured HTML email signature */}
					<Text className="m-0 text-gray-600" dangerouslySetInnerHTML={{ __html: signature }} />
				</Section>
			)}

			{/* Original message quote */}
			{originalMessage && (
				<Section className="mt-8">
					<Hr className="my-4 border-gray-200" />
					<Text className="m-0 mb-2 text-sm text-gray-500">
						On {originalDate || "a previous date"}, {senderEmail || "you"} wrote:
					</Text>
					<Container className="pl-4 border-l-2 border-gray-300">
						<Text className="m-0 text-sm text-gray-500 whitespace-pre-wrap">{originalMessage}</Text>
					</Container>
				</Section>
			)}
		</EmailLayout>
	);
}

export default AgentReplyEmail;
