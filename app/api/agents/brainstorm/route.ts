import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApiErrorResponse, createApiSuccessResponse } from "@/src/schemas/api-routes";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Brainstorm request schema
const BrainstormRequestSchema = z.object({
	topic: z.string().min(1, "Topic is required"),
	context: z.string().optional(),
	maxIdeas: z.number().min(1).max(20).default(5),
	creativeLevel: z.enum(["conservative", "balanced", "creative"]).default("balanced"),
});

/**
 * POST /api/agents/brainstorm
 * Generate brainstorming ideas using AI agents
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { topic, context, maxIdeas, creativeLevel } = BrainstormRequestSchema.parse(body);

		// Simulate brainstorming process
		const ideas = Array.from({ length: maxIdeas }, (_, i) => ({
			id: `idea-${i + 1}`,
			title: `Creative idea ${i + 1} for ${topic}`,
			description: `This is a ${creativeLevel} brainstormed idea about ${topic}${context ? ` considering ${context}` : ""}.`,
			category: ["innovation", "improvement", "solution", "enhancement"][i % 4],
			confidence: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
			createdAt: new Date().toISOString(),
		}));

		const response = {
			topic,
			context,
			creativeLevel,
			ideas,
			generatedAt: new Date().toISOString(),
			metadata: {
				totalIdeas: ideas.length,
				avgConfidence: ideas.reduce((sum, idea) => sum + idea.confidence, 0) / ideas.length,
			},
		};

		return NextResponse.json(
			createApiSuccessResponse(response, "Brainstorming completed successfully")
		);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return NextResponse.json(
				createApiErrorResponse(
					"Validation failed",
					400,
					error.issues.map((issue) => ({
						field: issue.path.join("."),
						message: issue.message,
					}))
				),
				{ status: 400 }
			);
		}

		return NextResponse.json(createApiErrorResponse("Internal server error", 500), { status: 500 });
	}
}

/**
 * GET /api/agents/brainstorm
 * Get brainstorming capabilities and configuration
 */
export async function GET() {
	const capabilities = {
		supportedTopics: ["business", "technology", "creative", "problem-solving"],
		creativeLevels: ["conservative", "balanced", "creative"],
		maxIdeasPerSession: 20,
		features: [
			"contextual-awareness",
			"confidence-scoring",
			"category-classification",
			"idea-ranking",
		],
		version: "1.0.0",
	};

	return NextResponse.json(
		createApiSuccessResponse(capabilities, "Brainstorming agent capabilities")
	);
}
