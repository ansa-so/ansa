import { agents, and, emailChannelSettings, eq, formSubmissions, getDb, triggers } from "@ansa/db";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Tenant-scoping helpers.
 *
 * Every record in this system is owned through its agent: `X.agentId ->
 * agents.userId`. Filtering a query by an id taken from the request without
 * also joining that chain lets any caller read or modify another tenant's data.
 *
 * These throw 404 rather than 403 on purpose — a 403 confirms that the id
 * exists, which is itself a small leak.
 */

/** The authenticated user id, or 401 if the request carries no session. */
export function requireUserId(c: Context): string {
	const user = c.get("user") as { id: string } | null | undefined;
	if (!user?.id) {
		throw new HTTPException(401, { message: "Unauthorized" });
	}
	return user.id;
}

/** Confirm `agentId` belongs to `userId`. */
export async function requireOwnedAgent(agentId: string, userId: string): Promise<void> {
	const db = getDb();
	const [agent] = await db
		.select({ id: agents.id })
		.from(agents)
		.where(and(eq(agents.id, agentId), eq(agents.userId, userId)))
		.limit(1);

	if (!agent) {
		throw new HTTPException(404, { message: "Agent not found" });
	}
}

/** Confirm `triggerId` belongs to an agent owned by `userId`. */
export async function requireOwnedTrigger(triggerId: string, userId: string): Promise<void> {
	const db = getDb();
	const [row] = await db
		.select({ id: triggers.id })
		.from(triggers)
		.innerJoin(agents, eq(triggers.agentId, agents.id))
		.where(and(eq(triggers.id, triggerId), eq(agents.userId, userId)))
		.limit(1);

	if (!row) {
		throw new HTTPException(404, { message: "Trigger not found" });
	}
}

/** Confirm a form submission belongs to an agent owned by `userId`. */
export async function requireOwnedFormSubmission(
	submissionId: string,
	userId: string,
): Promise<void> {
	const db = getDb();
	const [row] = await db
		.select({ id: formSubmissions.id })
		.from(formSubmissions)
		.innerJoin(agents, eq(formSubmissions.agentId, agents.id))
		.where(and(eq(formSubmissions.id, submissionId), eq(agents.userId, userId)))
		.limit(1);

	if (!row) {
		throw new HTTPException(404, { message: "Submission not found" });
	}
}

/**
 * Confirm `domain` is the sending domain of a reply address this user configured.
 *
 * All tenants share one Resend account, so `resend.domains.list()` returns every
 * customer's sending domain and its DNS records. Without this check an
 * authenticated user can enumerate other tenants' domains, and trigger
 * verification against them.
 */
export async function requireOwnedEmailDomain(domain: string, userId: string): Promise<void> {
	const db = getDb();
	const rows = await db
		.select({ replyAddress: emailChannelSettings.replyAddress })
		.from(emailChannelSettings)
		.innerJoin(agents, eq(emailChannelSettings.agentId, agents.id))
		.where(eq(agents.userId, userId));

	const needle = `@${domain.toLowerCase()}`;
	const owned = rows.some((r) => r.replyAddress?.toLowerCase().endsWith(needle));

	if (!owned) {
		throw new HTTPException(404, { message: "Domain not found" });
	}
}
