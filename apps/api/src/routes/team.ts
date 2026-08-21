import { randomBytes } from "node:crypto";
import { and, eq, getDb, teamInvitations, teamMembers, users } from "@ansa/db";
import { Hono } from "hono";
import { Resend } from "resend";
import { renderEmail } from "../lib/email";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const team = new Hono();

// Generate a unique invitation token
function generateToken(): string {
	return randomBytes(32).toString("hex");
}

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// Get team context - returns the user's role and team info
team.get("/context", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Check if user is a member of someone else's team
	const membership = await db
		.select({
			id: teamMembers.id,
			ownerId: teamMembers.ownerId,
			role: teamMembers.role,
			ownerEmail: users.email,
			ownerName: users.name,
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.ownerId, users.id))
		.where(eq(teamMembers.memberId, userId))
		.limit(1);

	if (membership.length > 0) {
		// User is a member of someone else's team
		const teamOwnerId = membership[0].ownerId;

		// Get all team members (including owner)
		const members = await db
			.select({
				id: teamMembers.id,
				memberId: teamMembers.memberId,
				role: teamMembers.role,
				createdAt: teamMembers.createdAt,
				email: users.email,
				name: users.name,
			})
			.from(teamMembers)
			.innerJoin(users, eq(teamMembers.memberId, users.id))
			.where(eq(teamMembers.ownerId, teamOwnerId));

		// Get owner info
		const [owner] = await db
			.select({ id: users.id, email: users.email, name: users.name })
			.from(users)
			.where(eq(users.id, teamOwnerId))
			.limit(1);

		return c.json({
			role: membership[0].role,
			isOwner: false,
			owner: owner,
			members: members,
		});
	}

	// User is an owner (or not part of any team yet)
	const members = await db
		.select({
			id: teamMembers.id,
			memberId: teamMembers.memberId,
			role: teamMembers.role,
			createdAt: teamMembers.createdAt,
			email: users.email,
			name: users.name,
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.memberId, users.id))
		.where(eq(teamMembers.ownerId, userId));

	return c.json({
		role: "owner",
		isOwner: true,
		owner: null,
		members: members,
	});
});

// Get email notification recipients (current user + team members)
// Used for form post-action email configuration
team.get("/email-recipients", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Get current user
	const [currentUser] = await db
		.select({ id: users.id, email: users.email, name: users.name })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	if (!currentUser) {
		return c.json({ error: "User not found" }, 404);
	}

	// Get team members (if user is an owner)
	const members = await db
		.select({
			id: users.id,
			email: users.email,
			name: users.name,
		})
		.from(teamMembers)
		.innerJoin(users, eq(teamMembers.memberId, users.id))
		.where(eq(teamMembers.ownerId, userId));

	// Return current user first, then team members
	const recipients = [
		{ id: currentUser.id, email: currentUser.email, name: currentUser.name, isCurrentUser: true },
		...members.map((m) => ({ id: m.id, email: m.email, name: m.name, isCurrentUser: false })),
	];

	return c.json(recipients);
});

// Get team members (users who belong to current user's team)
team.get("/members", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Check if user is a member of someone else's team
	const membership = await db
		.select({
			ownerId: teamMembers.ownerId,
			role: teamMembers.role,
		})
		.from(teamMembers)
		.where(eq(teamMembers.memberId, userId))
		.limit(1);

	const allMembers: Array<{
		id: string;
		memberId: string;
		role: string;
		createdAt: Date;
		email: string;
		name: string | null;
	}> = [];

	if (membership.length > 0) {
		// User is a team member - get all members including owner
		const teamOwnerId = membership[0].ownerId;

		// Get the owner
		const [owner] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
			})
			.from(users)
			.where(eq(users.id, teamOwnerId))
			.limit(1);

		// Get all team members
		const teamMembersList = await db
			.select({
				id: teamMembers.id,
				memberId: teamMembers.memberId,
				role: teamMembers.role,
				createdAt: teamMembers.createdAt,
				email: users.email,
				name: users.name,
			})
			.from(teamMembers)
			.innerJoin(users, eq(teamMembers.memberId, users.id))
			.where(eq(teamMembers.ownerId, teamOwnerId));

		// Add owner to the list
		if (owner) {
			allMembers.push({
				id: `owner-${owner.id}`, // Unique ID for owner entry
				memberId: owner.id,
				role: "owner",
				createdAt: new Date(), // Owners don't have a join date in this context
				email: owner.email,
				name: owner.name,
			});
		}

		// Add all team members
		allMembers.push(...teamMembersList);
	} else {
		// User is the owner - get current user and team members
		const [currentUser] = await db
			.select({
				id: users.id,
				email: users.email,
				name: users.name,
			})
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		// Get team members
		const teamMembersList = await db
			.select({
				id: teamMembers.id,
				memberId: teamMembers.memberId,
				role: teamMembers.role,
				createdAt: teamMembers.createdAt,
				email: users.email,
				name: users.name,
			})
			.from(teamMembers)
			.innerJoin(users, eq(teamMembers.memberId, users.id))
			.where(eq(teamMembers.ownerId, userId));

		// Add current user (owner) to the list
		if (currentUser) {
			allMembers.push({
				id: `owner-${currentUser.id}`,
				memberId: currentUser.id,
				role: "owner",
				createdAt: new Date(),
				email: currentUser.email,
				name: currentUser.name,
			});
		}

		// Add team members
		allMembers.push(...teamMembersList);
	}

	// Sort alphabetically by name (fallback to email if name is null)
	allMembers.sort((a, b) => {
		const aName = (a.name || a.email).toLowerCase();
		const bName = (b.name || b.email).toLowerCase();
		return aName.localeCompare(bName);
	});

	return c.json(allMembers);
});

// Get pending invitations
team.get("/invitations", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const invitations = await db
		.select()
		.from(teamInvitations)
		.where(and(eq(teamInvitations.inviterId, userId), eq(teamInvitations.status, "pending")));

	return c.json(invitations);
});

// Send invitation
team.post("/invite", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { email, role = "member" } = await c.req.json();

	if (!email) {
		return c.json({ error: "Email is required" }, 400);
	}

	const db = getDb();

	// Check if user is already a team member
	const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

	if (existingUser.length > 0) {
		const existingMember = await db
			.select()
			.from(teamMembers)
			.where(and(eq(teamMembers.ownerId, userId), eq(teamMembers.memberId, existingUser[0].id)))
			.limit(1);

		if (existingMember.length > 0) {
			return c.json({ error: "User is already a team member" }, 400);
		}
	}

	// Check for existing pending invitation
	const existingInvitation = await db
		.select()
		.from(teamInvitations)
		.where(
			and(
				eq(teamInvitations.inviterId, userId),
				eq(teamInvitations.email, email),
				eq(teamInvitations.status, "pending"),
			),
		)
		.limit(1);

	if (existingInvitation.length > 0) {
		return c.json({ error: "Invitation already sent to this email" }, 400);
	}

	// Create invitation
	const token = generateToken();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

	// Get inviter info for the email
	const [inviter] = await db
		.select({ name: users.name, email: users.email })
		.from(users)
		.where(eq(users.id, userId))
		.limit(1);

	const [invitation] = await db
		.insert(teamInvitations)
		.values({
			inviterId: userId,
			email,
			token,
			role,
			expiresAt,
		})
		.returning();

	const inviteUrl = `${process.env.DASHBOARD_URL}/invite/${token}`;

	// Send invitation email
	if (resend) {
		try {
			const html = await renderEmail("team-invitation", {
				inviterName: inviter?.name || inviter?.email || "Someone",
				inviteUrl,
			});

			await resend.emails.send({
				from: process.env.EMAIL_FROM || "Ansa <noreply@ansa.so>",
				to: [email],
				subject: `You've been invited to join a team on Ansa`,
				html,
			});
			console.log(`[team] Invitation email sent to ${email}`);
		} catch (err) {
			console.error("[team] Failed to send invitation email:", err);
			// Don't fail the request if email fails - invitation is still created
		}
	} else {
		console.log(`[team] Resend not configured. Invitation URL: ${inviteUrl}`);
	}

	return c.json({
		invitation,
		inviteUrl,
		message: "Invitation sent successfully",
	});
});

// Accept invitation
team.post("/accept/:token", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { token } = c.req.param();
	const db = getDb();

	// Find the invitation
	const [invitation] = await db
		.select()
		.from(teamInvitations)
		.where(eq(teamInvitations.token, token))
		.limit(1);

	if (!invitation) {
		return c.json({ error: "Invalid invitation" }, 404);
	}

	if (invitation.status !== "pending") {
		return c.json({ error: "Invitation is no longer valid" }, 400);
	}

	if (new Date() > invitation.expiresAt) {
		await db
			.update(teamInvitations)
			.set({ status: "expired" })
			.where(eq(teamInvitations.id, invitation.id));
		return c.json({ error: "Invitation has expired" }, 400);
	}

	// Verify the email matches the current user
	const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
	if (!user || user.email !== invitation.email) {
		return c.json({ error: "This invitation was sent to a different email address" }, 403);
	}

	// Add user as team member
	await db.insert(teamMembers).values({
		ownerId: invitation.inviterId,
		memberId: userId,
		role: invitation.role,
	});

	// Update invitation status
	await db
		.update(teamInvitations)
		.set({ status: "accepted", acceptedAt: new Date() })
		.where(eq(teamInvitations.id, invitation.id));

	return c.json({ message: "Invitation accepted successfully" });
});

// Cancel/revoke invitation
team.delete("/invitations/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { id } = c.req.param();
	const db = getDb();

	const result = await db
		.delete(teamInvitations)
		.where(and(eq(teamInvitations.id, id), eq(teamInvitations.inviterId, userId)))
		.returning();

	if (result.length === 0) {
		return c.json({ error: "Invitation not found" }, 404);
	}

	return c.json({ message: "Invitation cancelled" });
});

// Remove team member
team.delete("/members/:id", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { id } = c.req.param();
	const db = getDb();

	const result = await db
		.delete(teamMembers)
		.where(and(eq(teamMembers.id, id), eq(teamMembers.ownerId, userId)))
		.returning();

	if (result.length === 0) {
		return c.json({ error: "Team member not found" }, 404);
	}

	return c.json({ message: "Team member removed" });
});

// Get invitation by token (for accept page)
team.get("/invitation/:token", async (c) => {
	const { token } = c.req.param();
	const db = getDb();

	const [invitation] = await db
		.select({
			id: teamInvitations.id,
			email: teamInvitations.email,
			role: teamInvitations.role,
			status: teamInvitations.status,
			expiresAt: teamInvitations.expiresAt,
			inviterName: users.name,
			inviterEmail: users.email,
		})
		.from(teamInvitations)
		.innerJoin(users, eq(teamInvitations.inviterId, users.id))
		.where(eq(teamInvitations.token, token))
		.limit(1);

	if (!invitation) {
		return c.json({ error: "Invalid invitation" }, 404);
	}

	return c.json(invitation);
});

export { team };
