const OPENAI_EMBEDDING_MODEL = "text-embedding-3-small";
const OLLAMA_MODEL = "nomic-embed-text";
const EMBEDDING_DIMENSIONS = 1536;
const BATCH_SIZE = 2048; // OpenAI supports up to 2048 inputs per request

const isSelfHosted = process.env.SELF_HOSTED === "true";
const useOllama = isSelfHosted && process.env.OLLAMA_API_BASE && !process.env.OPENAI_API_KEY;

export async function createEmbedding(text: string): Promise<number[]> {
	const embeddings = await createEmbeddings([text]);
	return embeddings[0];
}

async function createOllamaEmbedding(text: string): Promise<number[]> {
	const baseUrl = process.env.OLLAMA_API_BASE?.replace(/\/v1\/?$/, "") || "http://localhost:11434";

	try {
		const response = await fetch(`${baseUrl}/api/embeddings`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: OLLAMA_MODEL,
				prompt: text,
			}),
		});

		if (!response.ok) {
			console.warn(`Ollama embeddings error: ${response.statusText}. Skipping vector search.`);
			return []; // Return empty - will skip vector search
		}

		const data = (await response.json()) as { embedding: number[] };
		if (data.embedding.length === 0) return [];
		if (data.embedding.length > EMBEDDING_DIMENSIONS) {
			throw new Error(
				`Ollama embedding has ${data.embedding.length} dimensions; expected at most ${EMBEDDING_DIMENSIONS}`,
			);
		}

		// pgvector columns use 1536 dimensions. Zero-padding preserves cosine similarity.
		return data.embedding.concat(
			Array.from({ length: EMBEDDING_DIMENSIONS - data.embedding.length }, () => 0),
		);
	} catch (error) {
		console.warn(`Ollama embeddings unavailable: ${error}. Skipping vector search.`);
		return []; // Return empty - will skip vector search
	}
}

async function createOpenAIEmbeddings(texts: string[]): Promise<number[][]> {
	const results: number[][] = [];
	const apiKey = process.env.OPENAI_API_KEY;

	if (!apiKey) {
		throw new Error("OPENAI_API_KEY is required for embeddings");
	}

	for (let i = 0; i < texts.length; i += BATCH_SIZE) {
		const batch = texts.slice(i, i + BATCH_SIZE);

		const response = await fetch("https://api.openai.com/v1/embeddings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model: OPENAI_EMBEDDING_MODEL,
				input: batch,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`OpenAI embeddings API error: ${response.status} - ${error}`);
		}

		const data = (await response.json()) as {
			data: Array<{ embedding: number[]; index: number }>;
		};

		// OpenAI returns embeddings sorted by index, but let's be safe
		const sortedEmbeddings = data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);

		results.push(...sortedEmbeddings);
	}

	return results;
}

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
	if (useOllama) {
		// Ollama doesn't support batch embeddings, process one at a time
		const results: number[][] = [];
		for (const text of texts) {
			const embedding = await createOllamaEmbedding(text);
			results.push(embedding);
		}
		return results;
	}

	return createOpenAIEmbeddings(texts);
}

export async function createQueryEmbedding(query: string): Promise<number[]> {
	if (useOllama) {
		return createOllamaEmbedding(query);
	}

	const results = await createOpenAIEmbeddings([query]);
	return results[0];
}
