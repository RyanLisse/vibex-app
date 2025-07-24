/**
 * AI Chat API Route
 *
 * Provides a unified chat endpoint that works with all AI providers
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { unifiedAI } from "@/lib/ai";
import { logger } from "@/lib/logging";

// Request schema
const ChatRequestSchema = z.object({
	messages: z.array(
		z.object({
			role: z.enum(["system", "user", "assistant", "function", "tool"]),
			content: z.string(),
			name: z.string().optional(),
			function_call: z
				.object({
					name: z.string(),
					arguments: z.string(),
				})
				.optional(),
			tool_calls: z
				.array(
					z.object({
						id: z.string(),
						type: z.enum(["function"]),
						function: z.object({
							name: z.string(),
							arguments: z.string(),
						}),
					})
				)
				.optional(),
		})
	),
	model: z.string().optional(),
	provider: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	maxTokens: z.number().optional(),
	stream: z.boolean().optional().default(false),
	tools: z
		.array(
			z.object({
				type: z.enum(["function"]),
				function: z.object({
					name: z.string(),
					description: z.string(),
					parameters: z.record(z.any()),
				}),
			})
		)
		.optional(),
	toolChoice: z
		.union([
			z.literal("auto"),
			z.literal("none"),
			z.literal("required"),
			z.object({
				type: z.enum(["function"]),
				function: z.object({ name: z.string() }),
			}),
		])
		.optional(),
	responseFormat: z
		.object({
			type: z.enum(["text", "json_object"]),
		})
		.optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = ChatRequestSchema.parse(body);

		// Log the request
		logger.info("AI chat request", {
			model: validatedData.model,
			provider: validatedData.provider,
			messageCount: validatedData.messages.length,
			stream: validatedData.stream,
		});

		// Handle streaming response
		if (validatedData.stream) {
			const encoder = new TextEncoder();
			const stream = new ReadableStream({
				async start(controller) {
					try {
						const result = await unifiedAI.createStreamingCompletion({
							model: validatedData.model || "gpt-3.5-turbo",
							messages: validatedData.messages,
							temperature: validatedData.temperature,
							maxTokens: validatedData.maxTokens,
							tools: validatedData.tools,
							toolChoice: validatedData.toolChoice,
							responseFormat: validatedData.responseFormat,
							provider: validatedData.provider,
						});

						// Send metadata first
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "metadata",
									provider: result.provider,
									model: result.model,
									latency: result.latency,
								})}\n\n`
							)
						);

						// Stream the response
						for await (const chunk of result.data) {
							const data = JSON.stringify({
								type: "chunk",
								...chunk,
							});
							controller.enqueue(encoder.encode(`data: ${data}\n\n`));
						}

						// Send done signal
						controller.enqueue(encoder.encode("data: [DONE]\n\n"));
						controller.close();
					} catch (error) {
						logger.error("Streaming error", { error });
						controller.enqueue(
							encoder.encode(
								`data: ${JSON.stringify({
									type: "error",
									error: error instanceof Error ? error.message : "Unknown error",
								})}\n\n`
							)
						);
						controller.close();
					}
				},
			});

			return new Response(stream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}

		// Handle non-streaming response
		const result = await unifiedAI.createCompletion({
			model: validatedData.model || "gpt-3.5-turbo",
			messages: validatedData.messages,
			temperature: validatedData.temperature,
			maxTokens: validatedData.maxTokens,
			tools: validatedData.tools,
			toolChoice: validatedData.toolChoice,
			responseFormat: validatedData.responseFormat,
			provider: validatedData.provider,
		});

		logger.info("AI chat response", {
			provider: result.provider,
			model: result.model,
			latency: result.latency,
			cached: result.cached,
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
		logger.error("AI chat error", { error });

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
