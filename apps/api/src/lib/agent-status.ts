import type { AgentStatus } from "@ansa/types";

interface AgentStatusInfo {
	status: AgentStatus;
	lastActivity: number;
}

class AgentStatusManager {
	private statuses = new Map<string, AgentStatusInfo>();
	private autoAwayInterval: NodeJS.Timeout | null = null;
	private readonly AUTO_AWAY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

	constructor() {
		// Start auto-away checker
		this.startAutoAwayChecker();
	}

	setStatus(agentId: string, status: AgentStatus): void {
		this.statuses.set(agentId, {
			status,
			lastActivity: Date.now(),
		});
	}

	getStatus(agentId: string): AgentStatus {
		const info = this.statuses.get(agentId);
		if (!info) {
			return "Away";
		}

		// Check if should be auto-away
		if (info.status === "Online" && Date.now() - info.lastActivity > this.AUTO_AWAY_TIMEOUT) {
			this.setStatus(agentId, "Away");
			return "Away";
		}

		return info.status;
	}

	refreshActivity(agentId: string): void {
		const info = this.statuses.get(agentId);
		if (info) {
			info.lastActivity = Date.now();
			// If was away, set back to online
			if (info.status === "Away") {
				info.status = "Online";
			}
		}
	}

	private startAutoAwayChecker(): void {
		// Check every minute for agents that should be auto-away
		this.autoAwayInterval = setInterval(() => {
			const now = Date.now();
			for (const [agentId, info] of this.statuses.entries()) {
				if (info.status === "Online" && now - info.lastActivity > this.AUTO_AWAY_TIMEOUT) {
					info.status = "Away";
					console.log(`Auto-away: Agent ${agentId}`);
				}
			}
		}, 60000); // Check every minute
	}

	cleanup(): void {
		if (this.autoAwayInterval) {
			clearInterval(this.autoAwayInterval);
		}
	}
}

export const agentStatusManager = new AgentStatusManager();
