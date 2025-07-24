/**
 * AI Embeddings API Route
 *
 * Provides endpoints for creating embeddings with various AI providers
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unifiedAI } from "@/lib/ai";
import { logger } from "@/lib/logging";

// Request schema
const EmbeddingRequestSchema = z.object({
	input: z.union([z.string(), z.array(z.string())]),
	model: z.string().optional().default("text-embedding-3-small"),
	provider: z.string().optional(),
	dimensions: z.number().optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = EmbeddingRequestSchema.parse(body);

		logger.info("AI embedding request", {
			model: validatedData.model,
			provider: validatedData.provider,
			inputType: Array.isArray(validatedData.input) ? "array" : "string",
			inputCount: Array.isArray(validatedData.input) ? validatedData.input.length : 1,
		});

		const result = await unifiedAI.createEmbedding({
			model: validatedData.model,
			input: validatedData.input,
			dimensions: validatedData.dimensions,
			provider: validatedData.provider,
		});

		logger.info("AI embedding response", {
			provider: result.provider,
			model: result.model,
			latency: result.latency,
			cached: result.cached,
			embeddingCount: result.data.data.length,
			usage: result.data.usage,
		});

		return NextResponse.json({
			...result.data,
			metadata: {
				provider: result.provider,
				model: result.model,
				latency: result.latency,
				cached: result.cached,
			},
		});
	} catch (error) {
		logger.error("AI embedding error", { error });

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: "Invalid request", details: error.errors },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 }
		);
	}
}
