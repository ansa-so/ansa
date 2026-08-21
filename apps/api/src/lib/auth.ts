import { accounts, getDb, sessions, users, verifications } from "@ansa/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";
import { renderEmail } from "./email";

// A predictable session-signing secret lets anyone forge a session. Refuse to
// start rather than run in that state — this file is public, so any placeholder
// that ever shipped here is known to an attacker.
const authSecret = process.env.BETTER_AUTH_SECRET;
const PLACEHOLDER_SECRETS = new Set([
	"please-change-this-to-a-secure-random-secret-key",
	"change-me-to-a-secure-secret-at-least-32-chars",
]);

if (!authSecret || authSecret.length < 32 || PLACEHOLDER_SECRETS.has(authSecret)) {
	throw new Error(
		"BETTER_AUTH_SECRET must be set to a random value of at least 32 characters. " +
			"Generate one with: openssl rand -hex 32",
	);
}

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:3000";

export const auth = betterAuth({
	baseURL: process.env.API_URL || "http://localhost:3001",
	basePath: "/api/auth",
	database: drizzleAdapter(getDb(), {
		provider: "pg",
		schema: {
			user: users,
			session: sessions,
			account: accounts,
			verification: verifications,
		},
	}),
	emailAndPassword: {
		enabled: true,
		sendResetPassword: async ({ user, url }) => {
			if (!resend) {
				console.log(`[auth] Password reset for ${user.email}: ${url}`);
				return;
			}
			try {
				const html = await renderEmail("password-reset", { url });
				const result = await resend.emails.send({
					from: process.env.EMAIL_FROM || "Ansa <noreply@ansa.so>",
					to: user.email,
					subject: "Reset your password",
					html,
				});
				console.log(`[auth] Password reset email sent to ${user.email}:`, result);
			} catch (error) {
				console.error(`[auth] Failed to send password reset email to ${user.email}:`, error);
				throw error;
			}
		},
	},
	socialProviders: {
		google: {
			clientId: process.env.GOOGLE_CLIENT_ID || "",
			clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
		},
		github: {
			clientId: process.env.GITHUB_CLIENT_ID || "",
			clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
		},
	},
	plugins: [
		magicLink({
			sendMagicLink: async ({ email, url }) => {
				if (!resend) {
					console.log(`[auth] Magic link for ${email}: ${url}`);
					return;
				}
				try {
					const html = await renderEmail("magic-link", { url });
					const result = await resend.emails.send({
						from: process.env.EMAIL_FROM || "Ansa <noreply@ansa.so>",
						to: email,
						subject: "Sign in to Ansa",
						html,
					});
					console.log(`[auth] Magic link email sent to ${email}:`, result);
				} catch (error) {
					console.error(`[auth] Failed to send magic link email to ${email}:`, error);
					throw error;
				}
			},
		}),
	],
	trustedOrigins: [dashboardUrl],
	advanced: {
		crossSubDomainCookies: {
			enabled: false,
		},
		defaultCookieAttributes: {
			// Use SameSite=None to support Shopify embedded app (iframe context)
			// This is safe because we require Secure=true in production
			sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
			secure: process.env.NODE_ENV === "production",
		},
	},
});

export type Auth = typeof auth;
