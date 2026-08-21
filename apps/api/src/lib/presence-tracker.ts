interface Viewer {
	socketId: string;
	userId: string;
	userName?: string;
	role: "user" | "agent";
	lastSeen: number;
}

class PresenceTracker {
	// Map of conversationId -> viewers
	private presence = new Map<string, Map<string, Viewer>>();
	private cleanupInterval: NodeJS.Timeout | null = null;
	private readonly STALE_TIMEOUT = 30 * 1000; // 30 seconds

	constructor() {
		this.startCleanup();
	}

	addViewer(
		conversationId: string,
		socketId: string,
		userId: string,
		role: "user" | "agent",
		userName?: string,
	): void {
		if (!this.presence.has(conversationId)) {
			this.presence.set(conversationId, new Map());
		}

		const viewers = this.presence.get(conversationId)!;
		viewers.set(socketId, {
			socketId,
			userId,
			userName,
			role,
			lastSeen: Date.now(),
		});
	}

	removeViewer(socketId: string): void {
		// Remove viewer from all conversations
		for (const viewers of this.presence.values()) {
			viewers.delete(socketId);
		}
	}

	refreshViewer(conversationId: string, socketId: string): void {
		const viewers = this.presence.get(conversationId);
		if (viewers) {
			const viewer = viewers.get(socketId);
			if (viewer) {
				viewer.lastSeen = Date.now();
			}
		}
	}

	getViewers(
		conversationId: string,
	): Array<{ userId: string; userName?: string; role: "user" | "agent" }> {
		const viewers = this.presence.get(conversationId);
		if (!viewers) {
			return [];
		}

		const now = Date.now();
		const activeViewers: Array<{
			userId: string;
			userName?: string;
			role: "user" | "agent";
		}> = [];

		for (const viewer of viewers.values()) {
			// Only include viewers seen in last 30 seconds
			if (now - viewer.lastSeen < this.STALE_TIMEOUT) {
				activeViewers.push({
					userId: viewer.userId,
					userName: viewer.userName,
					role: viewer.role,
				});
			}
		}

		return activeViewers;
	}

	private startCleanup(): void {
		// Clean up stale viewers every 30 seconds
		this.cleanupInterval = setInterval(() => {
			const now = Date.now();

			for (const [conversationId, viewers] of this.presence.entries()) {
				for (const [socketId, viewer] of viewers.entries()) {
					if (now - viewer.lastSeen > this.STALE_TIMEOUT) {
						viewers.delete(socketId);
					}
				}

				// Remove empty conversation entries
				if (viewers.size === 0) {
					this.presence.delete(conversationId);
				}
			}
		}, 30000);
	}

	cleanup(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
	}
}

export const presenceTracker = new PresenceTracker();
