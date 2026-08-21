import { Hono } from "hono";
import { Resend } from "resend";
import { renderEmail } from "../lib/email";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to get user from context
function getUser(c: unknown): { id: string; email: string } | null {
	const ctx = c as { get: (key: string) => unknown };
	const user = ctx.get("user") as { id: string; email: string } | null;
	return user ?? null;
}

export const contactRoute = new Hono();

contactRoute.post("/", async (c) => {
	const user = getUser(c);

	const { email, agentId, subject, description } = await c.req.json();

	if (!email || !subject || !description) {
		return c.json({ error: "Email, subject, and description are required" }, 400);
	}

	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(email)) {
		return c.json({ error: "Invalid email format" }, 400);
	}

	// Validate lengths
	if (subject.length > 200) {
		return c.json({ error: "Subject is too long" }, 400);
	}

	if (description.length < 10 || description.length > 5000) {
		return c.json({ error: "Description must be between 10 and 5000 characters" }, 400);
	}

	// Treat "none" as no agent selected
	const actualAgentId = agentId && agentId !== "none" ? agentId : null;

	try {
		// If Resend is configured, send the email
		if (resend) {
			const html = await renderEmail("contact-form", {
				email,
				userId: user?.id,
				agentId: actualAgentId,
				subject,
				message: description.replace(/\n/g, "<br />"),
			});

			await resend.emails.send({
				from: process.env.EMAIL_FROM || "Ansa <noreply@ansa.so>",
				to: ["support@ansa.so"],
				replyTo: email,
				subject: `[Contact Form] ${subject}`,
				html,
			});
		} else {
			// Log the contact form submission if email is not configured
			console.log("[contact] New contact form submission:", {
				email,
				userId: user?.id ?? "anonymous",
				agentId: actualAgentId,
				subject,
				description: `${description.substring(0, 100)}...`,
			});
		}

		return c.json({ success: true });
	} catch (error) {
		console.error("[contact] Failed to send email:", error);
		return c.json({ error: "Failed to send message" }, 500);
	}
});
