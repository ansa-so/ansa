import { Heading, Img, Link, Section, Text } from "@react-email/components";

// Base URL for email icons
export const EMAIL_ICONS_BASE_URL = process.env.DASHBOARD_URL || "https://ansa.so";

// Helper to format timestamp
export function formatTimestamp(date: Date): string {
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

/**
 * Title with Icon component
 * Used for main headings with an icon on the left
 */
export interface TitleWithIconProps {
	icon: string;
	iconSize?: number;
	children: React.ReactNode;
}

export function TitleWithIcon({ icon, iconSize = 28, children }: TitleWithIconProps) {
	return (
		<table cellPadding="0" cellSpacing="0" style={{ marginBottom: "24px" }}>
			<tr>
				<td style={{ verticalAlign: "middle", paddingRight: "12px" }}>
					<Img
						src={`${EMAIL_ICONS_BASE_URL}/email-icons/${icon}.png`}
						width={iconSize}
						height={iconSize}
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
						{children}
					</Heading>
				</td>
			</tr>
		</table>
	);
}

/**
 * Metadata Box component
 * Used for displaying request metadata, escalation details, etc.
 */
export interface MetadataBoxProps {
	title: string;
	icon?: string;
	children: React.ReactNode;
}

export function MetadataBox({ title, icon = "terminal", children }: MetadataBoxProps) {
	return (
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
						<Img
							src={`${EMAIL_ICONS_BASE_URL}/email-icons/${icon}.png`}
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
							{title}
						</Text>
					</td>
				</tr>
			</table>
			{children}
		</Section>
	);
}

/**
 * Metadata Row component
 * Used inside MetadataBox for label/value pairs
 */
export interface MetadataRowProps {
	icon?: string;
	label: string;
	value: string | React.ReactNode;
	valueColor?: string;
	isLast?: boolean;
}

export function MetadataRow({
	icon,
	label,
	value,
	valueColor = "#6B7280",
	isLast = false,
}: MetadataRowProps) {
	return (
		<table
			cellPadding="0"
			cellSpacing="0"
			width="100%"
			style={{
				borderBottom: isLast ? "none" : "1px solid #E5E5E5",
				paddingBottom: isLast ? "0" : "8px",
				marginBottom: isLast ? "0" : "8px",
			}}
		>
			<tr>
				{icon && (
					<td style={{ verticalAlign: "middle", paddingRight: "8px", width: "22px" }}>
						<Img
							src={`${EMAIL_ICONS_BASE_URL}/email-icons/${icon}.png`}
							width="14"
							height="14"
							alt=""
						/>
					</td>
				)}
				<td style={{ verticalAlign: "middle" }}>
					<Text
						style={{
							margin: 0,
							color: "#6B7280",
							fontSize: "12px",
						}}
					>
						{label}
					</Text>
				</td>
				<td style={{ verticalAlign: "middle", textAlign: "right" }}>
					<Text
						style={{
							margin: 0,
							color: valueColor,
							fontSize: "12px",
							fontFamily: "monospace",
						}}
					>
						{value}
					</Text>
				</td>
			</tr>
		</table>
	);
}

/**
 * Alert Banner component
 * Used for urgent alerts at the top of email content
 */
export interface AlertBannerProps {
	icon?: string;
	children: React.ReactNode;
	variant?: "error" | "warning" | "info";
}

export function AlertBanner({ icon = "warning", children, variant = "error" }: AlertBannerProps) {
	const colors = {
		error: { bg: "#FEF2F2", border: "#FCA5A5", text: "#991B1B" },
		warning: { bg: "#FFFBEB", border: "#FCD34D", text: "#92400E" },
		info: { bg: "#EFF6FF", border: "#93C5FD", text: "#1E40AF" },
	};

	const { bg, border, text } = colors[variant];

	return (
		<Section
			style={{
				backgroundColor: bg,
				border: `1px solid ${border}`,
				padding: "12px 16px",
				marginBottom: "20px",
			}}
		>
			<table cellPadding="0" cellSpacing="0">
				<tr>
					<td style={{ verticalAlign: "middle", paddingRight: "10px" }}>
						<Img
							src={`${EMAIL_ICONS_BASE_URL}/email-icons/${icon}.png`}
							width="16"
							height="16"
							alt=""
						/>
					</td>
					<td style={{ verticalAlign: "middle" }}>
						<Text
							style={{
								margin: 0,
								color: text,
								fontSize: "12px",
								fontWeight: 600,
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							{children}
						</Text>
					</td>
				</tr>
			</table>
		</Section>
	);
}

/**
 * Transcript Box component
 * Used for displaying message previews, quotes, etc.
 */
export interface TranscriptBoxProps {
	label?: string;
	children: React.ReactNode;
}

export function TranscriptBox({ label, children }: TranscriptBoxProps) {
	return (
		<>
			{label && (
				<Text
					style={{
						margin: "0 0 8px 0",
						color: "#555555",
						fontSize: "11px",
					}}
				>
					{label}
				</Text>
			)}
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
					"{children}"
				</Text>
			</Section>
		</>
	);
}

/**
 * Primary Button component
 * Styled action button
 */
export interface PrimaryButtonProps {
	href: string;
	children: React.ReactNode;
	variant?: "default" | "danger";
}

export function PrimaryButton({ href, children, variant = "default" }: PrimaryButtonProps) {
	const bgColor = variant === "danger" ? "#DC2626" : "#1A1A1A";

	return (
		<Section style={{ textAlign: "center", margin: "32px 0" }}>
			<a
				href={href}
				style={{
					display: "inline-block",
					backgroundColor: bgColor,
					color: "#FFFFFF",
					padding: "14px 32px",
					fontSize: "13px",
					fontWeight: 600,
					textDecoration: "none",
					textTransform: "uppercase",
					letterSpacing: "1px",
				}}
			>
				{children}
			</a>
		</Section>
	);
}

/**
 * Token Link Box component
 * Used for displaying fallback URLs
 */
export interface TokenLinkBoxProps {
	label?: string;
	url: string;
}

export function TokenLinkBox({
	label = "Or execute this token directly:",
	url,
}: TokenLinkBoxProps) {
	return (
		<>
			<Text
				style={{
					margin: "24px 0 8px 0",
					color: "#555555",
					fontSize: "11px",
				}}
			>
				{label}
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
						lineHeight: "1.3",
					}}
				>
					{url}
				</Link>
			</Section>
		</>
	);
}

/**
 * Body Text component
 * Standard paragraph text
 */
export interface BodyTextProps {
	children: React.ReactNode;
}

export function BodyText({ children }: BodyTextProps) {
	return (
		<Text
			style={{
				margin: "0 0 24px 0",
				color: "#555555",
				fontSize: "15px",
				lineHeight: 1.6,
			}}
		>
			{children}
		</Text>
	);
}
