/**
 * AI Models API Route
 *
 * Provides endpoints for listing and discovering AI models
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ModelCapability, unifiedAI } from "@/lib/ai";
import { logger } from "@/lib/logging";

// Query parameter schema
const ListModelsSchema = z.object({
	provider: z.string().optional(),
	capabilities: z.string().optional(), // comma-separated list
});

const FindBestModelSchema = z.object({
	capabilities: z.string(), // comma-separated list, required
	maxCost: z.string().optional(),
	minContext: z.string().optional(),
	preferredProvider: z.string().optional(),
});

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);

		// Check if this is a "find best model" request
		if (searchParams.has("capabilities") && searchParams.get("findBest") === "true") {
			// Find best model request
			const params = FindBestModelSchema.parse({
				capabilities: searchParams.get("capabilities"),
				maxCost: searchParams.get("maxCost"),
				minContext: searchParams.get("minContext"),
				preferredProvider: searchParams.get("preferredProvider"),
			});

			const capabilities = params.capabilities
				.split(",")
				.map((cap) => cap.trim())
				.filter((cap) => ModelCapability.safeParse(cap).success);

			const bestModel = await unifiedAI.findBestModel({
				capabilities: capabilities as any[],
				maxCostPer1kTokens: params.maxCost ? Number.parseFloat(params.maxCost) : undefined,
				minContextWindow: params.minContext ? Number.parseInt(params.minContext) : undefined,
				preferredProvider: params.preferredProvider,
			});

			if (!bestModel) {
				return NextResponse.json(
					{ error: "No model found matching requirements" },
					{ status: 404 }
				);
			}

			return NextResponse.json(bestModel);
		}

		// List models request
		const params = ListModelsSchema.parse({
			provider: searchParams.get("provider"),
			capabilities: searchParams.get("capabilities"),
		});

		const capabilities = params.capabilities
			? params.capabilities
					.split(",")
					.map((cap) => cap.trim())
					.filter((cap) => ModelCapability.safeParse(cap).success)
			: undefined;

		const models = await unifiedAI.listModels({
			provider: params.provider,
			capabilities: capabilities as any[],
		});

		logger.info("Listed AI models", {
			count: models.length,
			provider: params.provider,
			capabilities,
		});

		// Group models by provider
		const modelsByProvider = models.reduce(
			(acc, model) => {
				if (!acc[model.provider]) {
					acc[model.provider] = [];
				}
				acc[model.provider].push(model);
				return acc;
			},
			{} as Record<string, typeof models>
		);

		return NextResponse.json({
			models,
			modelsByProvider,
			total: models.length,
		});
	} catch (error) {
		logger.error("AI models error", { error });

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

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();

		// Get specific model information
		if (body.modelId) {
			const model = await unifiedAI.getModel(body.modelId, body.provider);

			if (!model) {
				return NextResponse.json({ error: "Model not found" }, { status: 404 });
			}

			return NextResponse.json(model);
		}

		return NextResponse.json({ error: "Model ID required" }, { status: 400 });
	} catch (error) {
		logger.error("AI model lookup error", { error });

		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Internal server error" },
			{ status: 500 }
		);
	}
}
