import { OpenAI } from "openai";
import { ObservabilityService } from "../observability";
import { WASMServices } from "../wasm-services";

export interface EmbeddingResult {
	embedding: number[];
	tokenCount: number;
	model: string;
}

export interface EmbeddingBatch {
	texts: string[];
	embeddings: number[][];
	tokenCount: number;
	model: string;
}

export class EmbeddingService {
	private static instance: EmbeddingService;
	private openai: OpenAI;
	private observability = ObservabilityService.getInstance();
	private readonly MODEL = "text-embedding-3-small";
	private readonly DIMENSIONS = 1536;
	private readonly MAX_BATCH_SIZE = 100;
	private readonly MAX_TOKENS_PER_REQUEST = 8000;

	private constructor() {
		this.openai = new OpenAI({
			apiKey: process.env.OPENAI_API_KEY,
		});
	}

	static getInstance(): EmbeddingService {
		if (!EmbeddingService.instance) {
			EmbeddingService.instance = new EmbeddingService();
		}
		return EmbeddingService.instance;
	}

	/**
	 * Generate embedding for a single text
	 */
	async generateEmbedding(text: string): Promise<EmbeddingResult> {
		return this.observability.trackOperation("embedding.generate", async () => {
			// Try WASM first if available for better performance
			if (WASMServices.isAvailable()) {
				try {
					const wasmVectorSearch = await WASMServices.getVectorSearch();
					const embedding = await wasmVectorSearch.generateEmbedding(text);
					return {
						embedding,
						tokenCount: this.estimateTokenCount(text),
						model: "wasm-local",
					};
				} catch (error) {
					console.warn("WASM embedding failed, falling back to OpenAI:", error);
				}
			}

			// Fallback to OpenAI API
			const response = await this.openai.embeddings.create({
				model: this.MODEL,
				input: text,
				dimensions: this.DIMENSIONS,
			});

			const embedding = response.data[0].embedding;
			const tokenCount = response.usage.total_tokens;

			return {
				embedding,
				tokenCount,
				model: this.MODEL,
			};
		});
	}

	/**
	 * Generate embeddings for multiple texts in batches
	 */
	async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingBatch> {
		return this.observability.trackOperation("embedding.batch", async () => {
			if (texts.length === 0) {
				return {
					texts: [],
					embeddings: [],
					tokenCount: 0,
					model: this.MODEL,
				};
			}

			// Try WASM batch processing first
			if (WASMServices.isAvailable()) {
				try {
					const wasmVectorSearch = await WASMServices.getVectorSearch();
					const embeddings = await Promise.all(
						texts.map((text) => wasmVectorSearch.generateEmbedding(text))
					);

					return {
						texts,
						embeddings,
						tokenCount: texts.reduce((sum, text) => sum + this.estimateTokenCount(text), 0),
						model: "wasm-local",
					};
				} catch (error) {
					console.warn("WASM batch embedding failed, falling back to OpenAI:", error);
				}
			}

			// Process in batches to respect API limits
			const batches = this.createBatches(texts);
			const allEmbeddings: number[][] = [];
			let totalTokens = 0;

			for (const batch of batches) {
				const response = await this.openai.embeddings.create({
					model: this.MODEL,
					input: batch,
					dimensions: this.DIMENSIONS,
				});

				allEmbeddings.push(...response.data.map((item) => item.embedding));
				totalTokens += response.usage.total_tokens;

				// Rate limiting - wait between batches
				if (batches.length > 1) {
					await this.delay(100);
				}
			}

			return {
				texts,
				embeddings: allEmbeddings,
				tokenCount: totalTokens,
				model: this.MODEL,
			};
		});
	}

	/**
	 * Generate embedding for task content (title + description)
	 */
	async generateTaskEmbedding(task: {
		title: string;
		description?: string | null;
	}): Promise<EmbeddingResult> {
		const content = this.prepareTaskContent(task);
		return this.generateEmbedding(content);
	}

	/**
	 * Generate embedding for agent memory content
	 */
	async generateMemoryEmbedding(memory: {
		contextKey: string;
		content: string;
		metadata?: any;
	}): Promise<EmbeddingResult> {
		const content = this.prepareMemoryContent(memory);
		return this.generateEmbedding(content);
	}

	/**
	 * Calculate cosine similarity between two embeddings
	 */
	calculateSimilarity(embedding1: number[], embedding2: number[]): number {
		if (embedding1.length !== embedding2.length) {
			throw new Error("Embeddings must have the same dimensions");
		}

		let dotProduct = 0;
		let norm1 = 0;
		let norm2 = 0;

		for (let i = 0; i < embedding1.length; i++) {
			dotProduct += embedding1[i] * embedding2[i];
			norm1 += embedding1[i] * embedding1[i];
			norm2 += embedding2[i] * embedding2[i];
		}

		const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
		return magnitude === 0 ? 0 : dotProduct / magnitude;
	}

	/**
	 * Find most similar embeddings using cosine similarity
	 */
	findSimilar(
		queryEmbedding: number[],
		candidateEmbeddings: Array<{ id: string; embedding: number[] }>,
		topK = 10,
		threshold = 0.7
	): Array<{ id: string; similarity: number }> {
		const similarities = candidateEmbeddings
			.map((candidate) => ({
				id: candidate.id,
				similarity: this.calculateSimilarity(queryEmbedding, candidate.embedding),
			}))
			.filter((result) => result.similarity >= threshold)
			.sort((a, b) => b.similarity - a.similarity)
			.slice(0, topK);

		return similarities;
	}

	/**
	 * Prepare task content for embedding
	 */
	private prepareTaskContent(task: { title: string; description?: string | null }): string {
		const parts = [task.title];
		if (task.description?.trim()) {
			parts.push(task.description.trim());
		}
		return parts.join(" ");
	}

	/**
	 * Prepare memory content for embedding
	 */
	private prepareMemoryContent(memory: {
		contextKey: string;
		content: string;
		metadata?: any;
	}): string {
		const parts = [memory.contextKey, memory.content];

		// Include relevant metadata if available
		if (memory.metadata?.tags) {
			parts.push(
				Array.isArray(memory.metadata.tags)
					? memory.metadata.tags.join(" ")
					: String(memory.metadata.tags)
			);
		}

		return parts.join(" ");
	}

	/**
	 * Create batches respecting token limits
	 */
	private createBatches(texts: string[]): string[][] {
		const batches: string[][] = [];
		let currentBatch: string[] = [];
		let currentTokens = 0;

		for (const text of texts) {
			const tokenCount = this.estimateTokenCount(text);

			if (
				currentBatch.length >= this.MAX_BATCH_SIZE ||
				currentTokens + tokenCount > this.MAX_TOKENS_PER_REQUEST
			) {
				if (currentBatch.length > 0) {
					batches.push(currentBatch);
					currentBatch = [];
					currentTokens = 0;
				}
			}

			currentBatch.push(text);
			currentTokens += tokenCount;
		}

		if (currentBatch.length > 0) {
			batches.push(currentBatch);
		}

		return batches;
	}

	/**
	 * Estimate token count for text (rough approximation)
	 */
	private estimateTokenCount(text: string): number {
		// Rough estimation: ~4 characters per token for English text
		return Math.ceil(text.length / 4);
	}

	/**
	 * Simple delay utility
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Validate embedding dimensions
	 */
	validateEmbedding(embedding: number[]): boolean {
		return (
			Array.isArray(embedding) &&
			embedding.length === this.DIMENSIONS &&
			embedding.every((val) => typeof val === "number" && !isNaN(val))
		);
	}

	/**
	 * Normalize embedding vector
	 */
	normalizeEmbedding(embedding: number[]): number[] {
		const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));

		if (magnitude === 0) {
			return embedding;
		}

		return embedding.map((val) => val / magnitude);
	}
}
