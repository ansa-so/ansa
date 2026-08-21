import type { Context } from "hono";
import { socketMetrics } from "../lib/socket-handlers.js";

/**
 * GET /admin/socket-metrics
 * Returns real-time Socket.IO metrics for monitoring
 */
export async function getSocketMetricsHandler(c: Context) {
	try {
		const response = {
			timestamp: new Date().toISOString(),
			uptime: process.uptime(),
			metrics: {
				activeConnections: socketMetrics.activeConnections,
				totalEvents: socketMetrics.totalEvents,
				eventCounts: socketMetrics.eventCounts,
				errors: socketMetrics.errors,
				reconnections: socketMetrics.reconnections,
			},
			health: {
				status: socketMetrics.activeConnections > 0 ? "healthy" : "idle",
				errorRate:
					socketMetrics.totalEvents > 0
						? `${((socketMetrics.errors / socketMetrics.totalEvents) * 100).toFixed(2)}%`
						: "0%",
				reconnectionRate:
					socketMetrics.activeConnections > 0
						? ((socketMetrics.reconnections / socketMetrics.activeConnections) * 100).toFixed(2) +
							"%"
						: "0%",
			},
		};

		return c.json(response);
	} catch (error) {
		console.error("[SocketMetrics] Error retrieving metrics:", error);
		return c.json({ error: "Failed to retrieve socket metrics" }, 500);
	}
}
