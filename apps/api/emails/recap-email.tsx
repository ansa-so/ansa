import { Button, Column, Heading, Img, Link, Row, Section, Text } from "@react-email/components";
import { EmailLayout } from "./_layout";

export interface AgentStats {
	agentId: string;
	agentName: string;
	totalConversations: number;
	messagesReceived: number;
	avgResponseTime?: number;
	avgConfidenceScore?: number;
	previousAvgConfidenceScore?: number;
	feedbackScore?: { positive: number; negative: number };
	topPages?: { path: string; visits: number }[];
	conversionsByCountry?: { country: string; countryCode: string; conversions: number }[];
	toolUsage?: { toolName: string; usageCount: number }[];
	triggerStats?: { triggerName: string; firedCount: number; convertedCount: number }[];
	actionStats?: {
		toolName: string;
		executionCount: number;
		successCount: number;
		failureCount: number;
		conversionCount: number;
	}[];
	healthStatus: "healthy" | "improving" | "needs-attention" | "critical";
	healthReason?: string | null;
	unansweredCount: number;
	lowConfidenceCount: number;
	escalationCount: number;
	resolutionCount: number;
	submissionCount: number;
	topUnansweredQuestion?: string | null;
}

export interface RecapEmailProps {
	userName?: string;
	period: "daily" | "weekly";
	periodLabel: string;
	agents: AgentStats[];
	dashboardUrl: string;
}

// Style constants matching test2/page.tsx design
const styles = {
	container: {
		fontFamily:
			'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
		backgroundColor: "#F3F2EE",
		color: "#1A1A1A",
	},
	wrapper: {
		maxWidth: "600px",
		margin: "0 auto",
		backgroundColor: "#FFFFFF",
		border: "1px solid #D1D1D1",
	},
	header: {
		backgroundColor: "#1A1A1A",
		color: "#FFFFFF",
		padding: "30px",
	},
	section: {
		padding: "30px",
		borderBottom: "1px solid #F3F2EE",
	},
	sectionTitle: {
		fontSize: "12px",
		fontWeight: "bold" as const,
		textTransform: "uppercase" as const,
		margin: "0 0 20px 0",
		letterSpacing: "1px",
		color: "#1A1A1A",
	},
	statCard: {
		backgroundColor: "#FAFAF9",
		border: "1px solid #E5E5E5",
		padding: "15px",
		textAlign: "center" as const,
	},
	statNumber: {
		fontSize: "24px",
		fontWeight: "bold" as const,
		margin: 0,
		lineHeight: 1.2,
	},
	statLabel: {
		fontSize: "9px",
		textTransform: "uppercase" as const,
		color: "#888",
		marginTop: "5px",
		letterSpacing: "0.5px",
	},
	alertBox: {
		backgroundColor: "#FEF2F2",
		border: "1px solid #FECACA",
		padding: "20px",
		borderRadius: "4px",
	},
	button: {
		display: "inline-block" as const,
		backgroundColor: "#1A1A1A",
		color: "#FFFFFF",
		textDecoration: "none" as const,
		padding: "12px 24px",
		fontSize: "12px",
		fontWeight: "bold" as const,
		textTransform: "uppercase" as const,
		letterSpacing: "1px",
	},
	mono: {
		fontFamily: "Monaco, Consolas, 'Courier New', monospace",
		fontSize: "11px",
	},
	tableRow: {
		borderBottom: "1px dashed #E5E5E5",
		padding: "8px 0",
	},
	progressBarBg: {
		height: "6px",
		width: "100%",
		backgroundColor: "#F3F2EE",
		borderRadius: "3px",
		marginTop: "6px",
	},
};

function getStatusColor(status: AgentStats["healthStatus"]): string {
	switch (status) {
		case "healthy":
			return "#16A34A";
		case "improving":
			return "#EAB308";
		case "needs-attention":
			return "#EAB308";
		case "critical":
			return "#DC2626";
		default:
			return "#888";
	}
}

function getStatusText(status: AgentStats["healthStatus"]): string {
	switch (status) {
		case "healthy":
			return "All Systems Operational";
		case "improving":
			return "Improving";
		case "needs-attention":
			return "Attention Required";
		case "critical":
			return "Critical - Action Required";
		default:
			return "Unknown";
	}
}

export function RecapEmail({
	userName,
	period,
	periodLabel,
	agents,
	dashboardUrl,
}: RecapEmailProps) {
	// Single agent mode - take the first (and should be only) agent
	const agent = agents[0];

	if (!agent) {
		return (
			<EmailLayout
				withPadding={false}
				preview={`Your ${period} recap: No agent data`}
				footer={
					<>
						You're receiving this because you enabled {period} recap emails.{" "}
						<Link href={`${dashboardUrl}/account`} className="text-gray-400 underline">
							Manage email preferences
						</Link>
					</>
				}
			>
				<Heading className="max-w-sm m-0 mb-2 font-medium text-gray-900 text-4xl leading-[0.95] tracking-tight">
					{period === "daily" ? "Daily" : "Weekly"} Recap
				</Heading>
				<Text className="m-0 mb-6 text-[#555] text-lg leading-relaxed">
					{userName ? `Hi ${userName},` : "Hi there,"}
					<br />
					No agent data available for this period.
				</Text>
			</EmailLayout>
		);
	}

	// No activity edge case
	if (agent.totalConversations === 0) {
		return (
			<EmailLayout
				preview={`Your ${period} recap: No new conversations`}
				footer={
					<>
						You're receiving this because you enabled {period} recap emails.{" "}
						<Link href={`${dashboardUrl}/account`} className="text-gray-400 underline">
							Manage email preferences
						</Link>
					</>
				}
			>
				<Heading className="max-w-sm m-0 mb-2 font-medium text-gray-900 text-4xl leading-[0.95] tracking-tight">
					{period === "daily" ? "Daily" : "Weekly"} Recap
				</Heading>
				<Text className="m-0 mb-6 font-mono text-[10px] tracking-widest text-gray-500 uppercase">
					{periodLabel}
				</Text>

				<Text className="m-0 mb-6 text-[#555] text-lg leading-relaxed">
					{userName ? `Hi ${userName},` : "Hi there,"}
					<br />
					No new conversations for <strong>{agent.agentName}</strong>{" "}
					{period === "daily" ? "yesterday" : "this week"}. Your agent is standing by and ready to
					help!
				</Text>

				<Section className="mt-8">
					<Button
						href={dashboardUrl}
						className="w-full px-6 py-3 font-medium text-center text-white no-underline bg-primary"
					>
						View Dashboard →
					</Button>
				</Section>
			</EmailLayout>
		);
	}

	const hasFailures = agent.actionStats?.some((a) => a.failureCount > 0);
	const totalActions = agent.actionStats?.reduce((sum, a) => sum + a.executionCount, 0) || 0;

	return (
		<EmailLayout
			preview={`Your ${period} recap for ${agent.agentName}: ${agent.totalConversations} conversations`}
			withPadding={false}
		>
			{/* --- 1. HEADER --- */}
			<Section
				style={{
					...styles.header,
					borderBottom: `4px solid ${getStatusColor(agent.healthStatus)}`,
				}}
			>
				<Row style={{ marginBottom: "20px" }}>
					<Column>
						<Text
							style={{
								fontWeight: "bold",
								fontSize: "18px",
								letterSpacing: "-0.5px",
								color: "#FFFFFF",
								margin: 0,
							}}
						>
							ANSA INTELLIGENCE
						</Text>
					</Column>
					<Column style={{ textAlign: "right" }}>
						<Text
							style={{
								...styles.mono,
								color: "#888",
								border: "1px solid #555",
								padding: "2px 6px",
								display: "inline-block",
								margin: 0,
							}}
						>
							LOG_DATE: {periodLabel.toUpperCase()}
						</Text>
					</Column>
				</Row>

				<Heading
					as="h1"
					style={{
						fontSize: "24px",
						margin: "0 0 10px 0",
						fontWeight: 500,
						color: "#FFFFFF",
					}}
				>
					{period === "daily" ? "Daily" : "Weekly"} Operational Briefing
				</Heading>

				<Text
					style={{
						...styles.mono,
						color: "#888",
						margin: "0 0 15px 0",
					}}
				>
					AGENT: {agent.agentName.toUpperCase()}
				</Text>

				<Row>
					<Column style={{ width: "auto" }}>
						<div
							style={{
								width: "8px",
								height: "8px",
								borderRadius: "50%",
								backgroundColor: getStatusColor(agent.healthStatus),
								display: "inline-block",
								marginRight: "10px",
							}}
						/>
					</Column>
					<Column>
						<Text
							style={{
								fontSize: "12px",
								color: "#E5E5E5",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
								margin: 0,
							}}
						>
							System Status: {getStatusText(agent.healthStatus)}
						</Text>
					</Column>
				</Row>
			</Section>

			{/* --- 2. EXECUTIVE SUMMARY --- */}
			<Section style={styles.section}>
				<Row>
					<Column style={{ width: "33.33%", paddingRight: "5px" }}>
						<div style={styles.statCard}>
							<Text style={styles.statNumber}>{agent.totalConversations}</Text>
							<Text style={styles.statLabel}>Conversations</Text>
						</div>
					</Column>
					<Column style={{ width: "33.33%", paddingLeft: "5px", paddingRight: "5px" }}>
						<div style={styles.statCard}>
							<Text style={{ ...styles.statNumber, color: "#16A34A" }}>
								{agent.submissionCount || 0}
							</Text>
							<Text style={styles.statLabel}>Submissions</Text>
						</div>
					</Column>
					<Column style={{ width: "33.33%", paddingLeft: "5px" }}>
						<div style={styles.statCard}>
							<Text
								style={{
									...styles.statNumber,
									color: agent.escalationCount > 0 ? "#DC2626" : "#1A1A1A",
								}}
							>
								{agent.escalationCount}
							</Text>
							<Text style={styles.statLabel}>Escalations</Text>
						</div>
					</Column>
				</Row>

				{/* Summary text */}
				<Text style={{ fontSize: "13px", lineHeight: "1.6", color: "#555", margin: "20px 0 0 0" }}>
					<strong>Summary:</strong>{" "}
					{agent.totalConversations > 50
						? "Traffic volume was high"
						: agent.totalConversations > 20
							? "Traffic volume was normal"
							: "Traffic volume was low"}
					{agent.avgConfidenceScore
						? (() => {
								const current = Math.round(agent.avgConfidenceScore);
								const previous = agent.previousAvgConfidenceScore
									? Math.round(agent.previousAvgConfidenceScore)
									: null;
								const delta = previous !== null ? current - previous : null;

								if (delta !== null && delta > 2) {
									return (
										<>
											{" "}
											with AI Confidence up from{" "}
											<span style={{ color: "#16A34A", fontWeight: "bold" }}>{previous}%</span> to{" "}
											<span style={{ color: "#16A34A", fontWeight: "bold" }}>{current}%</span>
										</>
									);
								} else if (delta !== null && delta < -2) {
									return (
										<>
											{" "}
											with AI Confidence down from{" "}
											<span style={{ color: "#DC2626", fontWeight: "bold" }}>{previous}%</span> to{" "}
											<span style={{ color: "#DC2626", fontWeight: "bold" }}>{current}%</span>
										</>
									);
								} else if (delta !== null) {
									return (
										<>
											{" "}
											with AI Confidence stable at{" "}
											<span style={{ color: "#16A34A", fontWeight: "bold" }}>{current}%</span>
										</>
									);
								} else {
									return (
										<>
											{" "}
											with AI Confidence at{" "}
											<span
												style={{ color: current >= 70 ? "#16A34A" : "#DC2626", fontWeight: "bold" }}
											>
												{current}%
											</span>
										</>
									);
								}
							})()
						: null}
					{agent.unansweredCount > 0 ? (
						<>
							. The system flagged {agent.unansweredCount} question
							{agent.unansweredCount > 1 ? "s" : ""} as "Unknown" which requires manual
							reinforcement.
						</>
					) : (
						<>. All queries were successfully answered.</>
					)}
					{agent.escalationCount > 0 && (
						<>
							{" "}
							{agent.escalationCount} conversation{agent.escalationCount > 1 ? "s were" : " was"}{" "}
							escalated to human support.
						</>
					)}
				</Text>
			</Section>

			{/* --- 3. CRITICAL ACTION ITEM (Knowledge Gap) --- */}
			{agent.topUnansweredQuestion && (
				<Section style={styles.section}>
					<Row style={{ marginBottom: "20px" }}>
						<Column style={{ width: "20px" }}>
							<Img
								src={`${dashboardUrl}/email-icons/brain.png`}
								width="16"
								height="16"
								alt="Knowledge Gap"
							/>
						</Column>
						<Column>
							<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>
								Detected Knowledge Gap
							</Text>
						</Column>
					</Row>

					<div style={styles.alertBox}>
						<Row>
							<Column style={{ width: "30px", verticalAlign: "top" }}>
								<Img
									src={`${dashboardUrl}/email-icons/warning.png`}
									width="18"
									height="18"
									alt="Warning"
								/>
							</Column>
							<Column>
								<Text
									style={{
										fontSize: "11px",
										fontWeight: "bold",
										color: "#991B1B",
										textTransform: "uppercase",
										margin: "0 0 5px 0",
									}}
								>
									Top Unanswered Query ({agent.unansweredCount} Occurrences)
								</Text>
								<Text
									style={{
										fontSize: "14px",
										fontFamily: "Georgia, serif",
										fontStyle: "italic",
										color: "#1A1A1A",
										margin: "0 0 10px 0",
									}}
								>
									"{agent.topUnansweredQuestion}"
								</Text>
								<Text style={{ fontSize: "12px", color: "#7F1D1D", margin: 0, lineHeight: "1.5" }}>
									The AI lacks a reference for this in the Vector DB. Adding this answer will
									improve confidence.
								</Text>
							</Column>
						</Row>
						<Section
							style={{ marginTop: "15px", borderTop: "1px solid #FECACA", paddingTop: "15px" }}
						>
							<Button
								href={`${dashboardUrl}/conversations?filters=low-confidence`}
								style={styles.button}
							>
								Teach AI this Answer →
							</Button>
						</Section>
					</div>
				</Section>
			)}

			{/* --- 4. TOOL EXECUTION LOG --- */}
			{agent.actionStats && agent.actionStats.length > 0 && (
				<Section style={styles.section}>
					<Row style={{ marginBottom: "20px" }}>
						<Column>
							<Row>
								<Column style={{ width: "20px" }}>
									<Img
										src={`${dashboardUrl}/email-icons/terminal.png`}
										width="16"
										height="16"
										alt="Terminal"
									/>
								</Column>
								<Column>
									<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>
										Tool Execution Log
									</Text>
								</Column>
							</Row>
						</Column>
						<Column style={{ textAlign: "right" }}>
							<Text
								style={{
									...styles.mono,
									backgroundColor: "#F3F2EE",
									padding: "2px 6px",
									display: "inline-block",
									margin: 0,
								}}
							>
								{totalActions} TOTAL CALLS
							</Text>
						</Column>
					</Row>

					<div
						style={{ backgroundColor: "#FAFAF9", border: "1px solid #E5E5E5", padding: "0 20px" }}
					>
						{agent.actionStats.map((action, index) => {
							const hasActionFailure = action.failureCount > 0;
							const isLast = index === agent.actionStats!.length - 1;
							return (
								<Row
									key={action.toolName}
									style={{
										...styles.tableRow,
										borderBottom: isLast ? "none" : "1px dashed #E5E5E5",
									}}
								>
									<Column style={{ width: "60%" }}>
										<Row>
											<Column style={{ width: "15px" }}>
												<div
													style={{
														width: "6px",
														height: "6px",
														backgroundColor: hasActionFailure ? "#DC2626" : "#16A34A",
														borderRadius: "50%",
														marginTop: "5px",
													}}
												/>
											</Column>
											<Column>
												<Text style={{ fontWeight: "bold", fontSize: "12px", margin: 0 }}>
													{action.toolName}
												</Text>
											</Column>
										</Row>
									</Column>
									<Column style={{ width: "40%", textAlign: "right" }}>
										<Text style={{ ...styles.mono, margin: 0 }}>
											<span style={{ color: "#16A34A" }}>{action.successCount} OK</span>
											{" | "}
											<span style={{ color: hasActionFailure ? "#DC2626" : "#CCC" }}>
												{action.failureCount} FAILED
											</span>
										</Text>
									</Column>
								</Row>
							);
						})}
					</div>

					{hasFailures && (
						<Text style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}>
							<span style={{ color: "#DC2626" }}>⚠ Alert:</span> Failures detected. Check API
							credentials and tool configurations.
						</Text>
					)}
				</Section>
			)}

			{/* --- 5. TRIGGER EFFICACY --- */}
			{agent.triggerStats && agent.triggerStats.length > 0 && (
				<Section style={styles.section}>
					<Row style={{ marginBottom: "20px" }}>
						<Column style={{ width: "20px" }}>
							<Img
								src={`${dashboardUrl}/email-icons/mouse-pointer.png`}
								width="16"
								height="16"
								alt="Triggers"
							/>
						</Column>
						<Column>
							<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>Trigger Efficacy</Text>
						</Column>
					</Row>

					{agent.triggerStats.map((trigger) => {
						const conversionRate =
							trigger.firedCount > 0
								? ((trigger.convertedCount / trigger.firedCount) * 100).toFixed(1)
								: "0.0";
						return (
							<Section key={trigger.triggerName} style={{ marginBottom: "15px" }}>
								<Row style={{ marginBottom: "4px" }}>
									<Column>
										<Text style={{ fontSize: "12px", fontWeight: "bold", margin: 0 }}>
											{trigger.triggerName}
										</Text>
									</Column>
									<Column style={{ textAlign: "right" }}>
										<Text style={{ ...styles.mono, margin: 0 }}>{conversionRate}% CONV</Text>
									</Column>
								</Row>
								<Text style={{ fontSize: "11px", color: "#555", margin: "0 0 6px 0" }}>
									{trigger.firedCount} Fired | {trigger.convertedCount} Converted
								</Text>
								<div style={styles.progressBarBg}>
									<div
										style={{
											height: "6px",
											width: `${Math.min(Number.parseFloat(conversionRate), 100)}%`,
											backgroundColor: "#1A1A1A",
											borderRadius: "3px",
										}}
									/>
								</div>
							</Section>
						);
					})}
				</Section>
			)}

			{/* --- 6. GEO & TOOLS (2 Column Layout) --- */}
			{((agent.conversionsByCountry && agent.conversionsByCountry.length > 0) ||
				(agent.toolUsage && agent.toolUsage.length > 0)) && (
				<Section style={styles.section}>
					<Row>
						{/* Column A: Geography */}
						{agent.conversionsByCountry && agent.conversionsByCountry.length > 0 && (
							<Column style={{ width: "48%", paddingRight: "2%", verticalAlign: "top" }}>
								<Row style={{ marginBottom: "15px" }}>
									<Column style={{ width: "20px" }}>
										<Img
											src={`${dashboardUrl}/email-icons/globe.png`}
											width="16"
											height="16"
											alt="Globe"
										/>
									</Column>
									<Column>
										<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>Origin</Text>
									</Column>
								</Row>
								<div
									style={{
										border: "1px solid #E5E5E5",
										backgroundColor: "#FAFAF9",
										padding: "10px",
									}}
								>
									{agent.conversionsByCountry.slice(0, 4).map((item, index) => (
										<Row
											key={item.countryCode}
											style={{
												...styles.tableRow,
												borderBottom:
													index === Math.min(agent.conversionsByCountry!.length - 1, 3)
														? "none"
														: "1px dashed #E5E5E5",
											}}
										>
											<Column>
												<Text style={{ fontSize: "12px", margin: 0 }}>{item.country}</Text>
											</Column>
											<Column style={{ textAlign: "right" }}>
												<Text style={{ fontWeight: "bold", fontSize: "12px", margin: 0 }}>
													{item.conversions}
												</Text>
											</Column>
										</Row>
									))}
								</div>
							</Column>
						)}

						{/* Column B: Tool Usage */}
						{agent.toolUsage && agent.toolUsage.length > 0 && (
							<Column style={{ width: "48%", paddingLeft: "2%", verticalAlign: "top" }}>
								<Row style={{ marginBottom: "15px" }}>
									<Column style={{ width: "20px" }}>
										<Img
											src={`${dashboardUrl}/email-icons/wrench.png`}
											width="16"
											height="16"
											alt="Tools"
										/>
									</Column>
									<Column>
										<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>Utility</Text>
									</Column>
								</Row>
								<div
									style={{
										border: "1px solid #E5E5E5",
										backgroundColor: "#FAFAF9",
										padding: "10px",
									}}
								>
									{agent.toolUsage.slice(0, 4).map((tool, index) => (
										<Row
											key={tool.toolName}
											style={{
												...styles.tableRow,
												borderBottom:
													index === Math.min(agent.toolUsage!.length - 1, 3)
														? "none"
														: "1px dashed #E5E5E5",
											}}
										>
											<Column>
												<Text style={{ ...styles.mono, margin: 0 }}>{tool.toolName}</Text>
											</Column>
											<Column style={{ textAlign: "right" }}>
												<Text style={{ fontWeight: "bold", fontSize: "12px", margin: 0 }}>
													{tool.usageCount}×
												</Text>
											</Column>
										</Row>
									))}
								</div>
							</Column>
						)}
					</Row>
				</Section>
			)}

			{/* --- 7. HIGH TRAFFIC NODES (Top Pages) --- */}
			{agent.topPages && agent.topPages.length > 0 && (
				<Section style={styles.section}>
					<Row style={{ marginBottom: "20px" }}>
						<Column style={{ width: "20px" }}>
							<Img
								src={`${dashboardUrl}/email-icons/file-text.png`}
								width="16"
								height="16"
								alt="Pages"
							/>
						</Column>
						<Column>
							<Text style={{ ...styles.sectionTitle, marginBottom: 0 }}>High Traffic Nodes</Text>
						</Column>
					</Row>

					<Row>
						{agent.topPages.slice(0, 3).map((page, index) => (
							<Column
								key={page.path}
								style={{
									width: "33.33%",
									paddingRight: index < 2 ? "5px" : "0",
									paddingLeft: index > 0 ? "5px" : "0",
								}}
							>
								<div
									style={{
										backgroundColor: "#FAFAF9",
										padding: "10px",
										border: "1px solid #E5E5E5",
									}}
								>
									<Text
										style={{
											fontSize: "10px",
											color: "#888",
											textTransform: "uppercase",
											margin: "0 0 5px 0",
										}}
									>
										{page.path.length > 15 ? `${page.path.slice(0, 15)}...` : page.path}
									</Text>
									<Text style={{ fontSize: "16px", fontWeight: "bold", margin: 0 }}>
										{page.visits}
									</Text>
									<Text style={{ fontSize: "10px", color: "#555", margin: "2px 0 0 0" }}>
										visits
									</Text>
								</div>
							</Column>
						))}
					</Row>
				</Section>
			)}

			{/* --- 8. FOOTER --- */}
			<Section
				style={{
					backgroundColor: "#FAFAF9",
					padding: "30px",
					textAlign: "center",
					borderTop: "1px solid #E5E5E5",
				}}
			>
				<Text
					style={{
						fontSize: "10px",
						textTransform: "uppercase",
						letterSpacing: "1px",
						marginBottom: "10px",
						color: "#888",
					}}
				>
					Generated by ANSA Autonomous Engine
				</Text>
				<Link
					href={`${dashboardUrl}/analytics`}
					style={{ color: "#1A1A1A", fontSize: "12px", textDecoration: "underline" }}
				>
					View Full Dashboard
				</Link>
				<Text style={{ marginTop: "20px", fontSize: "10px", color: "#AAA" }}>
					© 2026 ANSA Intelligence Inc.
				</Text>
				<Text className="text-[#AAA]">
					You're receiving this because you enabled {period} recap emails.{" "}
					<Link href={`${dashboardUrl}/account`} className="block text-gray-400 underline">
						Manage email preferences
					</Link>
				</Text>
			</Section>
		</EmailLayout>
	);
}

// Preview props for React Email dev server
RecapEmail.PreviewProps = {
	userName: "John",
	period: "daily",
	periodLabel: "Yesterday",
	agents: [
		{
			agentId: "1",
			agentName: "Support Bot",
			totalConversations: 60,
			messagesReceived: 156,
			avgResponseTime: 45,
			avgConfidenceScore: 45,
			feedbackScore: { positive: 28, negative: 4 },
			topPages: [
				{ path: "/pricing", visits: 12 },
				{ path: "/getting-started", visits: 8 },
				{ path: "/contact", visits: 5 },
			],
			conversionsByCountry: [
				{ country: "United States", countryCode: "US", conversions: 18 },
				{ country: "United Kingdom", countryCode: "GB", conversions: 8 },
				{ country: "Germany", countryCode: "DE", conversions: 6 },
				{ country: "Canada", countryCode: "CA", conversions: 5 },
			],
			toolUsage: [
				{ toolName: "kb_search", usageCount: 89 },
				{ toolName: "create_ticket", usageCount: 34 },
				{ toolName: "check_order", usageCount: 22 },
			],
			triggerStats: [
				{ triggerName: "Welcome Popup", firedCount: 120, convertedCount: 28 },
				{ triggerName: "Exit Intent", firedCount: 45, convertedCount: 0 },
				{ triggerName: "Scroll 50%", firedCount: 80, convertedCount: 12 },
			],
			actionStats: [
				{
					toolName: "lead_form_submit",
					executionCount: 20,
					successCount: 18,
					failureCount: 2,
					conversionCount: 18,
				},
				{
					toolName: "book_demo_calendar",
					executionCount: 6,
					successCount: 6,
					failureCount: 0,
					conversionCount: 6,
				},
				{
					toolName: "send_email_transcript",
					executionCount: 40,
					successCount: 38,
					failureCount: 2,
					conversionCount: 0,
				},
			],
			healthStatus: "needs-attention",
			healthReason: "15 unanswered questions",
			unansweredCount: 15,
			lowConfidenceCount: 12,
			escalationCount: 8,
			resolutionCount: 45,
			submissionCount: 12,
			topUnansweredQuestion: "What is your refund policy for enterprise customers?",
		},
	],
	dashboardUrl: "https://app.example.com/dashboard",
} as RecapEmailProps;

export default RecapEmail;
