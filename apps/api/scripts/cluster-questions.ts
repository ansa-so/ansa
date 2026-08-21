/**
 * Question Clustering Job
 *
 * This script performs semantic clustering of user questions to identify
 * patterns in what drives conversions. It uses pgvector's KNN capabilities
 * to find similar questions and groups them into clusters.
 *
 * Run via: tsx apps/api/scripts/cluster-questions.ts
 * Or schedule as a daily cron job
 */

import { fileURLToPath } from "node:url";
import {
	agents,
	chatMessages,
	conversations,
	eq,
	getDb,
	gte,
	inArray,
	questionClusters,
	sql,
	turnEvents,
	turns,
} from "@ansa/db";

// Clustering parameters
const SIMILARITY_THRESHOLD = 0.85; // Cosine similarity threshold (0-1)
const ROLLING_WINDOW_DAYS = 90; // Analyze last 90 days
const MIN_CLUSTER_SIZE = 2; // Minimum questions to form a cluster

interface QuestionData {
	id: string;
	content: string;
	embedding: number[];
	conversationId: string;
	turnId: string;
	hasConversion: boolean;
	confidenceScore: number | null;
	createdAt: Date;
}

interface Cluster {
	questions: QuestionData[];
	centroid: number[];
	representativeQuestionId: string;
	mostRecentQuestionId: string;
	highestConvertingQuestionId: string | null;
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) return 0;

	let dotProduct = 0;
	let normA = 0;
	let normB = 0;

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}

	if (normA === 0 || normB === 0) return 0;
	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Calculate centroid of a group of vectors
function calculateCentroid(vectors: number[][]): number[] {
	if (vectors.length === 0) return [];

	const dimensions = vectors[0].length;
	const centroid = new Array(dimensions).fill(0);

	for (const vector of vectors) {
		for (let i = 0; i < dimensions; i++) {
			centroid[i] += vector[i];
		}
	}

	for (let i = 0; i < dimensions; i++) {
		centroid[i] /= vectors.length;
	}

	return centroid;
}

// Find the question closest to the centroid
function findRepresentativeQuestion(questions: QuestionData[], centroid: number[]): string {
	let bestId = questions[0].id;
	let bestSimilarity = -1;

	for (const question of questions) {
		const similarity = cosineSimilarity(question.embedding, centroid);
		if (similarity > bestSimilarity) {
			bestSimilarity = similarity;
			bestId = question.id;
		}
	}

	return bestId;
}

// Simple greedy clustering based on similarity threshold
function clusterQuestions(questions: QuestionData[]): Cluster[] {
	const clusters: Cluster[] = [];
	const assigned = new Set<string>();

	// Sort by creation date (newest first) to prioritize recent questions
	const sortedQuestions = [...questions].sort(
		(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
	);

	for (const question of sortedQuestions) {
		if (assigned.has(question.id)) continue;

		// Start a new cluster
		const clusterQuestions: QuestionData[] = [question];
		assigned.add(question.id);

		// Find similar questions
		for (const other of sortedQuestions) {
			if (assigned.has(other.id)) continue;

			const similarity = cosineSimilarity(question.embedding, other.embedding);
			if (similarity >= SIMILARITY_THRESHOLD) {
				clusterQuestions.push(other);
				assigned.add(other.id);
			}
		}

		// Only create cluster if meets minimum size
		if (clusterQuestions.length >= MIN_CLUSTER_SIZE) {
			const embeddings = clusterQuestions.map((q) => q.embedding);
			const centroid = calculateCentroid(embeddings);
			const representativeQuestionId = findRepresentativeQuestion(clusterQuestions, centroid);

			// Find most recent question
			const mostRecent = [...clusterQuestions].sort(
				(a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
			)[0];

			// Find highest converting question (if any have conversions)
			const withConversions = clusterQuestions.filter((q) => q.hasConversion);
			const highestConverting =
				withConversions.length > 0
					? withConversions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
					: null;

			clusters.push({
				questions: clusterQuestions,
				centroid,
				representativeQuestionId,
				mostRecentQuestionId: mostRecent.id,
				highestConvertingQuestionId: highestConverting?.id || null,
			});
		}
	}

	return clusters;
}

// Main clustering function for a single agent
async function clusterQuestionsForAgent(agentId: string) {
	const db = getDb();

	console.log(`\nProcessing agent: ${agentId}`);

	// Calculate date range (rolling 90 days)
	const endDate = new Date();
	const startDate = new Date();
	startDate.setDate(startDate.getDate() - ROLLING_WINDOW_DAYS);

	// Fetch user messages with embeddings from the rolling window
	const userMessages = await db
		.select({
			id: chatMessages.id,
			content: chatMessages.content,
			embedding: chatMessages.embedding,
			conversationId: chatMessages.conversationId,
			createdAt: chatMessages.createdAt,
		})
		.from(chatMessages)
		.innerJoin(conversations, eq(chatMessages.conversationId, conversations.id))
		.where(
			sql`${conversations.agentId} = ${agentId}
          AND ${chatMessages.role} = 'user'
          AND ${chatMessages.embedding} IS NOT NULL
          AND ${chatMessages.createdAt} >= ${startDate.toISOString()}
          AND ${chatMessages.createdAt} <= ${endDate.toISOString()}`,
		);

	if (userMessages.length === 0) {
		console.log(`No messages with embeddings found for agent ${agentId}`);
		return;
	}

	console.log(`Found ${userMessages.length} user messages with embeddings`);

	// Get turns and conversion data for these messages (exclude escalation intents)
	const messageIds = userMessages.map((m) => m.id);
	const turnsData = await db
		.select({
			messageId: turns.userMessageId,
			turnId: turns.id,
			confidenceScore: sql<number | null>`
        (SELECT confidence_score FROM retrieval_traces WHERE turn_id = ${turns.id} LIMIT 1)
      `,
		})
		.from(turns)
		.where(sql`${inArray(turns.userMessageId, messageIds)} AND ${turns.escalationIntent} IS NULL`);

	if (turnsData.length === 0) {
		console.log(`No turns found for messages in agent ${agentId}`);
		return;
	}

	const turnMap = new Map(turnsData.map((t) => [t.messageId, t]));

	// Check which turns have conversions
	const turnIds = turnsData.map((t) => t.turnId);
	const conversions = await db
		.select({ turnId: turnEvents.turnId })
		.from(turnEvents)
		.where(inArray(turnEvents.turnId, turnIds));

	const conversionTurnIds = new Set(conversions.map((c) => c.turnId));

	// Build question data with conversion info
	const questions: QuestionData[] = userMessages
		.map((msg) => {
			const turn = turnMap.get(msg.id);
			if (!turn || !msg.embedding) return null;

			// Parse embedding from database (stored as vector type)
			let embedding: number[];
			try {
				if (typeof msg.embedding === "string") {
					embedding = JSON.parse(msg.embedding);
				} else if (Array.isArray(msg.embedding)) {
					embedding = msg.embedding;
				} else {
					return null;
				}
			} catch {
				return null;
			}

			return {
				id: msg.id,
				content: msg.content,
				embedding,
				conversationId: msg.conversationId,
				turnId: turn.turnId,
				hasConversion: conversionTurnIds.has(turn.turnId),
				confidenceScore: turn.confidenceScore,
				createdAt: msg.createdAt,
			};
		})
		.filter((q): q is QuestionData => q !== null);

	console.log(`Processed ${questions.length} questions for clustering`);

	// Perform clustering
	const clusters = clusterQuestions(questions);

	console.log(`Created ${clusters.length} clusters`);

	// Delete old clusters for this agent
	await db.delete(questionClusters).where(eq(questionClusters.agentId, agentId));

	// Save new clusters
	for (const cluster of clusters) {
		const conversionCount = cluster.questions.filter((q) => q.hasConversion).length;
		const conversationCount = cluster.questions.length;
		const conversionRate = Math.round((conversionCount / conversationCount) * 10000); // Store as basis points

		const avgConfidence =
			cluster.questions.reduce((sum, q) => sum + (q.confidenceScore || 0), 0) /
			cluster.questions.length;

		await db.insert(questionClusters).values({
			agentId,
			clusterDate: new Date(),
			windowDays: ROLLING_WINDOW_DAYS,
			representativeQuestionId: cluster.representativeQuestionId,
			memberQuestionIds: cluster.questions.map((q) => q.id),
			conversationCount,
			conversionCount,
			conversionRate,
			avgConfidenceScore: Math.round(avgConfidence),
			mostRecentQuestionId: cluster.mostRecentQuestionId,
			highestConvertingQuestionId: cluster.highestConvertingQuestionId,
		});
	}

	console.log(`Saved ${clusters.length} clusters for agent ${agentId}`);
}

// Main execution
async function main(options?: { batchLimit?: number; agentId?: string }) {
	const db = getDb();

	console.log("Starting question clustering job...");
	console.log(`Date: ${new Date().toISOString()}`);
	console.log(`Window: ${ROLLING_WINDOW_DAYS} days`);
	console.log(`Similarity threshold: ${SIMILARITY_THRESHOLD}`);
	if (options?.batchLimit) {
		console.log(`Batch limit: ${options.batchLimit} agents`);
	}

	try {
		// Get all agents or specific agent
		let allAgents: { id: string }[];
		if (options?.agentId) {
			allAgents = await db
				.select({ id: agents.id })
				.from(agents)
				.where(eq(agents.id, options.agentId));
			if (allAgents.length === 0) {
				throw new Error(`Agent ${options.agentId} not found`);
			}
		} else {
			allAgents = await db.select({ id: agents.id }).from(agents);
		}

		// Apply batch limit if specified
		const agentsToProcess = options?.batchLimit
			? allAgents.slice(0, options.batchLimit)
			: allAgents;

		console.log(`\nFound ${allAgents.length} total agents`);
		console.log(`Processing ${agentsToProcess.length} agents`);

		// Process each agent
		for (const agent of agentsToProcess) {
			try {
				await clusterQuestionsForAgent(agent.id);
			} catch (error) {
				console.error(`Error processing agent ${agent.id}:`, error);
				// Continue with other agents
			}
		}

		console.log("\n✅ Clustering job completed successfully");
	} catch (error) {
		console.error("\n❌ Clustering job failed:", error);
		process.exit(1);
	}
}

// Run if executed directly (ES module way)
const isMainModule =
	import.meta.url === `file://${process.argv[1]}` ||
	fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
	// Default to processing 50 agents per run to avoid overload
	main({ batchLimit: 50 })
		.then(() => process.exit(0))
		.catch((error) => {
			console.error("Fatal error:", error);
			process.exit(1);
		});
}

export { clusterQuestionsForAgent, main };
