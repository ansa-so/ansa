import { getDb, sql } from "@ansa/db";
import type { VectorSearchResult } from "@ansa/types";
import { createQueryEmbedding } from "./embeddings";

/** Minimum cosine similarity to include a result (0-1 scale) */
const MIN_SCORE_THRESHOLD = 0.3;

/** Drop results when score drops by more than this ratio vs the top result */
const SCORE_DROP_RATIO = 0.4;

/** Minimum content overlap ratio to consider two chunks duplicates */
const DEDUP_OVERLAP_THRESHOLD = 0.6;

export interface VectorSearchMeta {
	latencyMs: number;
	candidateCount: number;
	postFilterCount: number;
}

export interface VectorSearchResponse {
	results: VectorSearchResult[];
	meta: VectorSearchMeta;
}

export interface VectorClient {
	search(query: string, agentId: string, limit?: number): Promise<VectorSearchResponse>;
}

/**
 * Check if two chunks have significant content overlap.
 * Uses trigram-like comparison: splits into words, checks intersection ratio.
 */
function chunksOverlap(a: string, b: string): boolean {
	const wordsA = new Set(a.toLowerCase().split(/\s+/));
	const wordsB = new Set(b.toLowerCase().split(/\s+/));
	const smaller = Math.min(wordsA.size, wordsB.size);
	if (smaller === 0) return false;
	let overlap = 0;
	for (const w of wordsA) {
		if (wordsB.has(w)) overlap++;
	}
	return overlap / smaller >= DEDUP_OVERLAP_THRESHOLD;
}

/**
 * Apply score-gap cutoff: drop results where the score drops significantly
 * relative to the top result. Prevents low-relevance chunks from diluting context.
 */
function applyScoreGapCutoff(results: VectorSearchResult[]): VectorSearchResult[] {
	if (results.length <= 1) return results;
	const topScore = results[0].score;
	const cutoff = topScore * (1 - SCORE_DROP_RATIO);
	return results.filter((r) => r.score >= cutoff);
}

/**
 * Remove near-duplicate chunks (from overlapping windows).
 * Keeps the higher-scored chunk when two overlap significantly.
 */
function deduplicateChunks(results: VectorSearchResult[]): VectorSearchResult[] {
	const kept: VectorSearchResult[] = [];
	for (const result of results) {
		const isDuplicate = kept.some((k) => chunksOverlap(k.content, result.content));
		if (!isDuplicate) {
			kept.push(result);
		}
	}
	return kept;
}

export class VectorSearchClient implements VectorClient {
	async search(query: string, agentId: string, limit = 10): Promise<VectorSearchResponse> {
		const start = performance.now();
		const db = getDb();
		const embedding = await createQueryEmbedding(query);

		// Skip vector search if embeddings are unavailable
		if (!embedding || embedding.length === 0) {
			return {
				results: [],
				meta: {
					latencyMs: Math.round(performance.now() - start),
					candidateCount: 0,
					postFilterCount: 0,
				},
			};
		}

		const embeddingStr = `[${embedding.join(",")}]`;

		// Search all chunk tables with source titles for attribution
		const results = await db.execute<{
			id: string;
			content: string;
			score: number;
			source_type: string;
			source_title: string | null;
			source_id: string;
		}>(sql`
      (SELECT dc.id, dc.content, 1 - (dc.embedding <=> ${embeddingStr}::vector) as score,
              'document' as source_type, d.filename as source_title, d.id as source_id
       FROM document_chunks dc
       JOIN documents d ON dc.document_id = d.id
       WHERE dc.embedding IS NOT NULL AND d.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT tsc.id, tsc.content, 1 - (tsc.embedding <=> ${embeddingStr}::vector) as score,
              'text' as source_type, ts.title as source_title, ts.id as source_id
       FROM text_source_chunks tsc
       JOIN text_sources ts ON tsc.text_source_id = ts.id
       WHERE tsc.embedding IS NOT NULL AND ts.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT qsc.id, qsc.content, 1 - (qsc.embedding <=> ${embeddingStr}::vector) as score,
              'qa' as source_type, 'Q&A' as source_title, qs.id as source_id
       FROM qa_source_chunks qsc
       JOIN qa_sources qs ON qsc.qa_source_id = qs.id
       WHERE qsc.embedding IS NOT NULL AND qs.agent_id = ${agentId}::uuid)
      UNION ALL
      (SELECT wspc.id, wspc.content, 1 - (wspc.embedding <=> ${embeddingStr}::vector) as score,
              'web' as source_type, COALESCE(wsp.title, wsp.url) as source_title, ws.id as source_id
       FROM web_source_page_chunks wspc
       JOIN web_source_pages wsp ON wspc.web_source_page_id = wsp.id
       JOIN web_sources ws ON wsp.web_source_id = ws.id
       WHERE wspc.embedding IS NOT NULL AND ws.agent_id = ${agentId}::uuid AND wsp.status = 'crawled')
      ORDER BY score DESC
      LIMIT ${limit}
    `);

		const candidateCount = (results as unknown as unknown[]).length;

		// Pipeline: threshold → score-gap cutoff → deduplication
		let filtered: VectorSearchResult[] = (
			results as unknown as {
				id: string;
				content: string;
				score: number;
				source_type: string;
				source_title: string | null;
				source_id: string;
			}[]
		)
			.filter((r) => Number(r.score) >= MIN_SCORE_THRESHOLD)
			.map(
				(r): VectorSearchResult => ({
					id: r.id,
					content: r.content,
					score: Number(r.score),
					sourceType: r.source_type as "document" | "text" | "qa" | "web",
					...(r.source_title ? { sourceTitle: r.source_title } : {}),
					sourceId: r.source_id,
				}),
			);

		filtered = applyScoreGapCutoff(filtered);
		filtered = deduplicateChunks(filtered);

		const latencyMs = Math.round(performance.now() - start);
		return {
			results: filtered,
			meta: { latencyMs, candidateCount, postFilterCount: filtered.length },
		};
	}
}

export const vectorClient = new VectorSearchClient();
