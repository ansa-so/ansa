import { render } from "@react-email/components";
import { createElement } from "react";
import { AgentReplyEmail } from "../../emails/agent-reply";
import { ContactFormEmail } from "../../emails/contact-form";
import EscalationNotificationEmail, {
	type EscalationNotificationEmailProps,
} from "../../emails/escalation-notification";
import { FormNotificationEmail } from "../../emails/form-notification";
import { MagicLinkEmail } from "../../emails/magic-link";
import { PasswordResetEmail } from "../../emails/password-reset";
import RefundEscalationEmail, {
	type RefundEscalationEmailProps,
} from "../../emails/refund-escalation";
import { TeamInvitationEmail } from "../../emails/team-invitation";

export type EmailTemplate =
	| "contact-form"
	| "password-reset"
	| "magic-link"
	| "team-invitation"
	| "agent-reply"
	| "form-notification"
	| "escalation-notification"
	| "refund-escalation";

export interface ContactFormVariables {
	email: string;
	userId?: string | null;
	agentId?: string | null;
	subject: string;
	message: string;
}

export interface PasswordResetVariables {
	url: string;
}

export interface MagicLinkVariables {
	url: string;
}

export interface TeamInvitationVariables {
	inviterName: string;
	inviteUrl: string;
}

export interface AgentReplyVariables {
	agentName: string;
	responseBody: string;
	disclaimerText?: string;
	signature?: string;
	originalMessage?: string;
	senderEmail?: string;
	originalDate?: string;
}

export interface FormNotificationVariables {
	formName: string;
	formData: Record<string, unknown>;
	submittedAt: string;
	dashboardUrl: string;
	conversationUrl?: string;
}

export function renderEmail(
	template: "contact-form",
	variables: ContactFormVariables,
): Promise<string>;
export function renderEmail(
	template: "password-reset",
	variables: PasswordResetVariables,
): Promise<string>;
export function renderEmail(template: "magic-link", variables: MagicLinkVariables): Promise<string>;
export function renderEmail(
	template: "team-invitation",
	variables: TeamInvitationVariables,
): Promise<string>;
export function renderEmail(
	template: "agent-reply",
	variables: AgentReplyVariables,
): Promise<string>;
export function renderEmail(
	template: "form-notification",
	variables: FormNotificationVariables,
): Promise<string>;
export function renderEmail(
	template: "escalation-notification",
	variables: EscalationNotificationEmailProps,
): Promise<string>;
export function renderEmail(
	template: "refund-escalation",
	variables: RefundEscalationEmailProps,
): Promise<string>;
export function renderEmail(
	template: EmailTemplate,
	variables:
		| ContactFormVariables
		| PasswordResetVariables
		| MagicLinkVariables
		| TeamInvitationVariables
		| AgentReplyVariables
		| FormNotificationVariables
		| EscalationNotificationEmailProps
		| RefundEscalationEmailProps,
): Promise<string> {
	switch (template) {
		case "contact-form":
			return render(createElement(ContactFormEmail, variables as ContactFormVariables));
		case "password-reset":
			return render(createElement(PasswordResetEmail, variables as PasswordResetVariables));
		case "magic-link":
			return render(createElement(MagicLinkEmail, variables as MagicLinkVariables));
		case "team-invitation":
			return render(createElement(TeamInvitationEmail, variables as TeamInvitationVariables));
		case "agent-reply":
			return render(createElement(AgentReplyEmail, variables as AgentReplyVariables));
		case "form-notification":
			return render(createElement(FormNotificationEmail, variables as FormNotificationVariables));
		case "escalation-notification":
			return render(
				createElement(EscalationNotificationEmail, variables as EscalationNotificationEmailProps),
			);
		case "refund-escalation":
			return render(createElement(RefundEscalationEmail, variables as RefundEscalationEmailProps));
		default:
			throw new Error(`Unknown email template: ${template}`);
	}
}
