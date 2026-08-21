import {
	agents,
	agentTools,
	and,
	chatMessages,
	conversations,
	count,
	desc,
	documents,
	eq,
	getDb,
	gte,
	interfaceSettings,
	messageFeedback,
	ne,
	qaSources,
	shopifyShopAgents,
	shopifyShops,
	sql,
	textSources,
	triggers,
	userSubscriptions,
	webSourcePages,
	webSources,
} from "@ansa/db";
import { PERSONAS } from "@ansa/utils";
import { Hono } from "hono";
import { z } from "zod";
import { getAgentLimit, isSelfHosted } from "../lib/plans";
import { setAgentMetafield } from "../lib/shopify";
import { createShopifyToolDefinitions } from "../lib/shopify-tools";
import type { AuthVariables } from "../middleware/auth";

const agentsRoute = new Hono<{ Variables: AuthVariables }>();

// Generate URL-friendly slug from name
function generateSlug(name: string): string {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 50);
}

const createAgentSchema = z.object({
	name: z.string().min(1, "name required").max(100, "name too long"),
	aiQuality: z.enum(["balanced", "high_quality"]).default("balanced"),
	temperature: z.number().min(0).max(100).default(50),
	systemPrompt: z.string().min(1, "system prompt required").default("You are a helpful assistant."),
	persona: z
		.enum([
			"default",
			"urgent",
			"problem_solver",
			"consultant",
			"sales_expert",
			"playful",
			"inspirational",
			"engaging",
			"informative",
			"professional",
			"neutral",
			"custom",
		])
		.default("default"),
	isDefault: z.boolean().default(false),
});

const updateAgentSchema = z.object({
	name: z.string().min(1, "name required").max(100, "name too long").optional(),
	aiQuality: z.enum(["balanced", "high_quality"]).optional(),
	temperature: z.number().min(0).max(100).optional(),
	systemPrompt: z.string().min(1, "system prompt required").optional(),
	persona: z
		.enum([
			"default",
			"urgent",
			"problem_solver",
			"consultant",
			"sales_expert",
			"playful",
			"inspirational",
			"engaging",
			"informative",
			"professional",
			"neutral",
			"custom",
		])
		.optional(),
	isDefault: z.boolean().optional(),
});

// Helper to get userId from context
function getUserId(c: { get: (key: string) => unknown }): string | null {
	const user = c.get("user") as { id: string } | null;
	return user?.id ?? null;
}

// List agents for the authenticated user.
// When request comes from a Shopify session (shopDomain set), only return
// agents linked to that specific shop — prevents cross-store contamination.
agentsRoute.get("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();
	const shopDomain = c.get("shopDomain") as string | null;

	// When authenticated via Shopify, strictly scope to agents linked to this shop.
	// Returns empty if none linked — dashboard redirects to onboarding.
	if (shopDomain) {
		const [shop] = await db
			.select({ id: shopifyShops.id })
			.from(shopifyShops)
			.where(eq(shopifyShops.shopDomain, shopDomain))
			.limit(1);

		if (shop) {
			const shopAgents = await db
				.select({ agent: agents, isPrimary: shopifyShopAgents.isPrimary })
				.from(shopifyShopAgents)
				.innerJoin(agents, eq(agents.id, shopifyShopAgents.agentId))
				.where(eq(shopifyShopAgents.shopId, shop.id))
				.orderBy(desc(shopifyShopAgents.isPrimary), desc(agents.createdAt));

			return c.json(
				shopAgents.map((row) => ({
					...row.agent,
					hasShopifyConnection: true,
				})),
			);
		}

		return c.json([]);
	}

	// Non-Shopify auth: return all agents for the user
	const allAgents = await db
		.select()
		.from(agents)
		.where(eq(agents.userId, userId))
		.orderBy(desc(agents.isDefault), desc(agents.createdAt));

	// Get Shopify connections for all agents
	const shopifyConnections = await db
		.select({ agentId: shopifyShopAgents.agentId })
		.from(shopifyShopAgents);
	const connectedAgentIds = new Set(shopifyConnections.map((c) => c.agentId));

	const agentsWithShopify = allAgents.map((agent) => ({
		...agent,
		hasShopifyConnection: connectedAgentIds.has(agent.id),
	}));

	return c.json(agentsWithShopify);
});

// Get all agents with summary stats
agentsRoute.get("/summary", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	try {
		// Get user's agents
		const userAgents = await db
			.select()
			.from(agents)
			.where(eq(agents.userId, userId))
			.orderBy(desc(agents.updatedAt));

		// Get summary stats for each agent
		const agentSummaries = await Promise.all(
			userAgents.map(async (agent) => {
				const sevenDaysAgo = new Date();
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

				// Get conversation and message counts
				const [statsResult] = await db
					.select({
						conversationCount: sql<number>`count(distinct ${conversations.id})`,
						messageCount: sql<number>`count(${chatMessages.id})`,
						avgConfidence: sql<number>`avg(${chatMessages.confidenceScore})`,
					})
					.from(conversations)
					.leftJoin(chatMessages, eq(chatMessages.conversationId, conversations.id))
					.where(
						and(eq(conversations.agentId, agent.id), gte(conversations.createdAt, sevenDaysAgo)),
					);

				// Get feedback stats
				const [feedbackResult] = await db
					.select({
						positiveCount: sql<number>`count(case when ${messageFeedback.feedback} = 'up' then 1 end)`,
						negativeCount: sql<number>`count(case when ${messageFeedback.feedback} = 'down' then 1 end)`,
					})
					.from(messageFeedback)
					.innerJoin(chatMessages, eq(messageFeedback.messageId, chatMessages.id))
					.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
					.where(
						and(eq(conversations.agentId, agent.id), gte(messageFeedback.createdAt, sevenDaysAgo)),
					);

				// Get knowledge source count (documents, text sources, QA sources, web sources)
				const [[docCount], [textCount], [qaCount], [webCount]] = await Promise.all([
					db
						.select({ count: sql<number>`count(*)` })
						.from(documents)
						.where(eq(documents.agentId, agent.id)),
					db
						.select({ count: sql<number>`count(*)` })
						.from(textSources)
						.where(eq(textSources.agentId, agent.id)),
					db
						.select({ count: sql<number>`count(*)` })
						.from(qaSources)
						.where(eq(qaSources.agentId, agent.id)),
					db
						.select({ count: sql<number>`count(*)` })
						.from(webSources)
						.where(eq(webSources.agentId, agent.id)),
				]);

				const totalSourcesCount =
					Number(docCount?.count || 0) +
					Number(textCount?.count || 0) +
					Number(qaCount?.count || 0) +
					Number(webCount?.count || 0);

				// Get tools count (all tools including system)
				const [toolsResult] = await db
					.select({
						count: sql<number>`count(*)`,
					})
					.from(agentTools)
					.where(eq(agentTools.agentId, agent.id));

				// Get triggers count
				const [triggersResult] = await db
					.select({
						count: sql<number>`count(*)`,
					})
					.from(triggers)
					.where(eq(triggers.agentId, agent.id));

				// Calculate feedback percentage
				const totalFeedback =
					Number(feedbackResult?.positiveCount || 0) + Number(feedbackResult?.negativeCount || 0);
				const feedbackScore =
					totalFeedback > 0
						? Math.round((Number(feedbackResult?.positiveCount || 0) / totalFeedback) * 100)
						: null;

				return {
					...agent,
					stats: {
						conversations: Number(statsResult?.conversationCount || 0),
						messages: Number(statsResult?.messageCount || 0),
						avgConfidence: statsResult?.avgConfidence
							? Math.round(Number(statsResult.avgConfidence))
							: null,
						feedbackScore,
						sourcesCount: totalSourcesCount,
						toolsCount: Number(toolsResult?.count || 0),
						triggersCount: Number(triggersResult?.count || 0),
					},
				};
			}),
		);

		return c.json(agentSummaries);
	} catch (error) {
		console.error("Failed to fetch agent summaries:", error);
		return c.json({ error: "Failed to fetch agent summaries" }, 500);
	}
});

// Get agent limits for the authenticated user
agentsRoute.get("/limits", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	// Self-hosted mode has no limits
	if (process.env.SELF_HOSTED === "true") {
		const db = getDb();
		const [agentCount] = await db
			.select({ count: count() })
			.from(agents)
			.where(eq(agents.userId, userId));

		return c.json({
			current: agentCount?.count ?? 0,
			limit: null,
			planId: "self-hosted",
			canCreate: true,
		});
	}

	const db = getDb();

	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const limit = getAgentLimit(planId);

	const [agentCount] = await db
		.select({ count: count() })
		.from(agents)
		.where(eq(agents.userId, userId));

	return c.json({
		current: agentCount?.count ?? 0,
		limit,
		planId,
		canCreate: limit === -1 || (agentCount?.count ?? 0) < limit,
		billingProvider: subscription?.billingProvider ?? null,
	});
});

// DEPRECATED: Get supported models - replaced by AI Quality tiers
// This endpoint is kept for backward compatibility but returns empty array
// Use AI Quality tiers (balanced, high_quality) instead
agentsRoute.get("/models", async (c) => {
	// Return empty array - models are now abstracted behind AI Quality tiers
	return c.json([]);
});

// Get setup summary for an agent (used on post-onboarding page)
agentsRoute.get("/:id/setup-summary", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	// Get agent
	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)));

	if (!agent) {
		return c.json({ error: "agent not found" }, 404);
	}

	// Get interface settings
	const [settings] = await db
		.select()
		.from(interfaceSettings)
		.where(eq(interfaceSettings.agentId, id));

	// Get web source with page count
	const webSourcesResult = await db
		.select()
		.from(webSources)
		.where(eq(webSources.agentId, id))
		.orderBy(desc(webSources.createdAt))
		.limit(1);

	let webSourceWithCount = null;
	if (webSourcesResult.length > 0) {
		const webSource = webSourcesResult[0];
		// Count pages for this web source
		const [pageCountResult] = await db
			.select({ count: sql<number>`count(*)` })
			.from(webSourcePages)
			.where(
				and(eq(webSourcePages.webSourceId, webSource.id), eq(webSourcePages.status, "crawled")),
			);

		webSourceWithCount = {
			id: webSource.id,
			url: webSource.url,
			name: webSource.name,
			status: webSource.status,
			pageCount: Number(pageCountResult?.count || 0),
		};
	}

	// Get triggers
	const agentTriggers = await db
		.select({
			id: triggers.id,
			name: triggers.name,
			triggerType: triggers.triggerType,
			actionType: triggers.actionType,
			isEnabled: triggers.isEnabled,
		})
		.from(triggers)
		.where(eq(triggers.agentId, id))
		.orderBy(desc(triggers.createdAt));

	return c.json({
		agent: {
			id: agent.id,
			name: agent.name,
			slug: agent.slug,
			createdAt: agent.createdAt,
		},
		interfaceSettings: settings
			? {
					displayName: settings.displayName,
					profilePicture: settings.profilePicture,
					primaryColor: settings.primaryColor,
					widgetButtonColor: settings.widgetButtonColor,
					defaultLanguage: settings.defaultLanguage,
				}
			: null,
		webSource: webSourceWithCount,
		triggers: agentTriggers,
	});
});

// Get single agent by ID (must belong to user)
agentsRoute.get("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)));

	if (!agent) {
		return c.json({ error: "agent not found" }, 404);
	}

	return c.json(agent);
});

// Get agent by slug (for public chat embeds - no auth required)
agentsRoute.get("/by-slug/:slug", async (c) => {
	const slug = c.req.param("slug");
	const db = getDb();

	const [agent] = await db.select().from(agents).where(eq(agents.slug, slug));

	if (!agent) {
		return c.json({ error: "agent not found" }, 404);
	}

	// Return limited info for public access
	return c.json({
		id: agent.id,
		name: agent.name,
		slug: agent.slug,
	});
});

// Get default agent for user
agentsRoute.get("/default/config", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [agent] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.userId, userId), eq(agents.isDefault, true)));

	if (!agent) {
		// Return first agent if no default
		const [firstAgent] = await db.select().from(agents).where(eq(agents.userId, userId)).limit(1);
		if (!firstAgent) {
			return c.json({ error: "no agents configured" }, 404);
		}
		return c.json(firstAgent);
	}

	return c.json(agent);
});

// Create agent
agentsRoute.post("/", async (c) => {
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = createAgentSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const { name, aiQuality, temperature, systemPrompt, persona, isDefault } = parsed.data;

	const db = getDb();

	// Check agent limit based on user's plan
	const [subscription] = await db
		.select()
		.from(userSubscriptions)
		.where(eq(userSubscriptions.userId, userId))
		.limit(1);

	const planId = subscription?.planId ?? "free";
	const agentLimit = getAgentLimit(planId);

	const [agentCount] = await db
		.select({ count: count() })
		.from(agents)
		.where(eq(agents.userId, userId));

	if (agentLimit !== -1 && (agentCount?.count ?? 0) >= agentLimit) {
		return c.json(
			{
				error: `You've reached your limit of ${agentLimit} agent${agentLimit === 1 ? "" : "s"}. Please upgrade your plan to create more agents.`,
				code: "AGENT_LIMIT_REACHED",
				limit: agentLimit,
				current: agentCount?.count ?? 0,
			},
			403,
		);
	}

	// Generate unique slug
	let slug = generateSlug(name);
	let slugSuffix = 0;
	let slugExists = true;

	while (slugExists) {
		const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
		const [existing] = await db
			.select({ id: agents.id })
			.from(agents)
			.where(eq(agents.slug, checkSlug));
		if (!existing) {
			slug = checkSlug;
			slugExists = false;
		} else {
			slugSuffix++;
		}
	}

	// If setting as default, unset other defaults for this user
	if (isDefault) {
		await db.update(agents).set({ isDefault: false }).where(eq(agents.userId, userId));
	}

	const [agent] = await db
		.insert(agents)
		.values({
			userId,
			name,
			slug,
			aiQuality,
			temperature,
			systemPrompt,
			persona,
			isDefault,
		})
		.returning();

	// Create default interface settings for this agent
	await db.insert(interfaceSettings).values({
		agentId: agent.id,
		displayName: name,
	});

	// Create built-in satisfaction survey tool (system tool)
	await db.insert(agentTools).values({
		agentId: agent.id,
		name: "satisfaction_survey",
		description: "Customer satisfaction survey shown after conversation resolution",
		inputSchema: {
			type: "object",
			properties: {},
			required: [],
		},
		executionType: "form",
		formSchema: {
			fields: [
				{
					name: "rating",
					label: "How satisfied are you with the resolution?",
					type: "select",
					options: [
						{ label: "⭐⭐⭐⭐⭐ Very Satisfied", value: "5" },
						{ label: "⭐⭐⭐⭐ Satisfied", value: "4" },
						{ label: "⭐⭐⭐ Neutral", value: "3" },
						{ label: "⭐⭐ Dissatisfied", value: "2" },
						{ label: "⭐ Very Dissatisfied", value: "1" },
					],
					validation: {
						required: { value: true, message: "Please select a rating" },
					},
				},
				{
					name: "feedback",
					label: "Any additional feedback? (optional)",
					type: "textarea",
				},
			],
			introText: "Thank you for contacting us! We'd love to hear about your experience.",
			submitLabel: "Submit Feedback",
			successMessage: "Thank you for your feedback!",
		},
		isEnabled: true,
		allowAiSuggest: false,
		countsAsConversion: false,
		countsAsResolution: false,
		category: "feedback_survey",
		system: true,
	});

	// When creating an agent from Shopify context, link it to the current shop only.
	// Never auto-link to ALL shops — that causes cross-store contamination.
	const shopDomain = c.get("shopDomain") as string | null;
	if (shopDomain) {
		try {
			const [shop] = await db
				.select()
				.from(shopifyShops)
				.where(and(eq(shopifyShops.shopDomain, shopDomain), eq(shopifyShops.status, "active")))
				.limit(1);

			if (shop) {
				// Check if this shop already has a primary agent
				const [existingPrimary] = await db
					.select()
					.from(shopifyShopAgents)
					.where(and(eq(shopifyShopAgents.shopId, shop.id), eq(shopifyShopAgents.isPrimary, true)))
					.limit(1);

				if (!existingPrimary) {
					await db.insert(shopifyShopAgents).values({
						shopId: shop.id,
						agentId: agent.id,
						isPrimary: true,
					});

					if (shop.accessToken) {
						try {
							await setAgentMetafield(
								{ shop: shop.shopDomain, accessToken: shop.accessToken },
								agent.id,
							);
						} catch (err) {
							console.error(`Failed to set agent metafield for ${shop.shopDomain}:`, err);
						}
					}

					try {
						const shopifyTools = createShopifyToolDefinitions({
							shopId: shop.id,
							shopDomain: shop.shopDomain,
							agentId: agent.id,
						});
						await db.insert(agentTools).values(shopifyTools as (typeof agentTools.$inferInsert)[]);
						console.log(
							`[agents] Linked agent ${agent.id} to shop ${shop.shopDomain} with ${shopifyTools.length} tools`,
						);
					} catch (err) {
						console.error(`Failed to create Shopify tools for ${shop.shopDomain}:`, err);
					}
				}
			}
		} catch (err) {
			console.error("Failed to link agent to Shopify shop:", err);
		}
	}

	return c.json(agent);
});

// Update agent
agentsRoute.put("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const rawBody = await c.req.json();
	const parsed = updateAgentSchema.safeParse(rawBody);

	if (!parsed.success) {
		return c.json({ error: parsed.error.issues[0].message }, 400);
	}

	const db = getDb();

	const [existing] = await db
		.select()
		.from(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)));

	if (!existing) {
		return c.json({ error: "agent not found" }, 404);
	}

	// If setting as default, unset other defaults for this user
	if (parsed.data.isDefault) {
		await db.update(agents).set({ isDefault: false }).where(eq(agents.userId, userId));
	}

	// If name changed, update slug
	let newSlug = existing.slug;
	if (parsed.data.name && parsed.data.name !== existing.name) {
		const slug = generateSlug(parsed.data.name);
		let slugSuffix = 0;
		let slugExists = true;

		while (slugExists) {
			const checkSlug = slugSuffix > 0 ? `${slug}-${slugSuffix}` : slug;
			const [existingSlug] = await db
				.select({ id: agents.id })
				.from(agents)
				.where(and(eq(agents.slug, checkSlug), ne(agents.id, id)));
			if (!existingSlug) {
				newSlug = checkSlug;
				slugExists = false;
			} else {
				slugSuffix++;
			}
		}
	}

	const [updated] = await db
		.update(agents)
		.set({
			...parsed.data,
			slug: newSlug,
			updatedAt: new Date(),
		})
		.where(eq(agents.id, id))
		.returning();

	return c.json(updated);
});

// Delete agent
agentsRoute.delete("/:id", async (c) => {
	const id = c.req.param("id");
	const userId = getUserId(c);
	if (!userId) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const db = getDb();

	const [deleted] = await db
		.delete(agents)
		.where(and(eq(agents.id, id), eq(agents.userId, userId)))
		.returning();

	if (!deleted) {
		return c.json({ error: "agent not found" }, 404);
	}

	return c.json({ deleted: true });
});

// Get available personas
agentsRoute.get("/personas/list", async (c) => {
	return c.json({ personas: Object.values(PERSONAS) });
});

export { agentsRoute };
