/**
 * Time-Travel Replay API
 *
 * Manages replay sessions for step-by-step execution debugging.
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { timeTravelDebug } from "@/lib/time-travel/debug-service";

const CreateReplaySessionSchema = z.object({
	executionId: z.string().uuid(),
});

const UpdateReplaySessionSchema = z.object({
	sessionId: z.string(),
	currentStep: z.number().int().min(0).optional(),
	isPlaying: z.boolean().optional(),
	playbackSpeed: z.number().min(0.1).max(10).optional(),
});

const ReplayControlSchema = z.object({
	sessionId: z.string(),
	action: z.enum(["step_forward", "step_backward", "jump_to_step"]),
	stepNumber: z.number().int().min(0).optional(),
});

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = CreateReplaySessionSchema.parse(body);

		const session = await timeTravelDebug.createReplaySession(validatedData.executionId);

		return NextResponse.json({
			success: true,
			data: session,
		});
	} catch (error) {
		console.error("Error creating replay session:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request data",
					details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to create replay session",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function PUT(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = UpdateReplaySessionSchema.parse(body);

		const session = timeTravelDebug.updateReplaySession(validatedData.sessionId, {
			currentStep: validatedData.currentStep,
			isPlaying: validatedData.isPlaying,
			playbackSpeed: validatedData.playbackSpeed,
		});

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: "Replay session not found",
				},
				{ status: 404 }
			);
		}

		return NextResponse.json({
			success: true,
			data: session,
		});
	} catch (error) {
		console.error("Error updating replay session:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request data",
					details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to update replay session",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function PATCH(request: NextRequest) {
	try {
		const body = await request.json();
		const validatedData = ReplayControlSchema.parse(body);

		let session;

		switch (validatedData.action) {
			case "step_forward":
				session = timeTravelDebug.stepForward(validatedData.sessionId);
				break;
			case "step_backward":
				session = timeTravelDebug.stepBackward(validatedData.sessionId);
				break;
			case "jump_to_step":
				if (validatedData.stepNumber === undefined) {
					return NextResponse.json(
						{
							success: false,
							error: "stepNumber is required for jump_to_step action",
						},
						{ status: 400 }
					);
				}
				session = timeTravelDebug.jumpToStep(validatedData.sessionId, validatedData.stepNumber);
				break;
		}

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: "Replay session not found",
				},
				{ status: 404 }
			);
		}

		// Get current state
		const currentState = timeTravelDebug.getCurrentState(validatedData.sessionId);

		return NextResponse.json({
			success: true,
			data: {
				session,
				currentState,
			},
		});
	} catch (error) {
		console.error("Error controlling replay session:", error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{
					success: false,
					error: "Invalid request data",
					details: error.issues.map(issue => ({ field: issue.path.join("."), message: issue.message })),
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				success: false,
				error: "Failed to control replay session",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get("sessionId");

		if (!sessionId) {
			return NextResponse.json(
				{
					success: false,
					error: "sessionId is required",
				},
				{ status: 400 }
			);
		}

		const session = timeTravelDebug.getReplaySession(sessionId);

		if (!session) {
			return NextResponse.json(
				{
					success: false,
					error: "Replay session not found",
				},
				{ status: 404 }
			);
		}

		const currentState = timeTravelDebug.getCurrentState(sessionId);

		return NextResponse.json({
			success: true,
			data: {
				session,
				currentState,
			},
		});
	} catch (error) {
		console.error("Error getting replay session:", error);

		return NextResponse.json(
			{
				success: false,
				error: "Failed to get replay session",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const sessionId = searchParams.get("sessionId");

		if (!sessionId) {
			return NextResponse.json(
				{
					success: false,
					error: "sessionId is required",
				},
				{ status: 400 }
			);
		}

		const success = timeTravelDebug.destroySession(sessionId);

		return NextResponse.json({
			success,
			message: success ? "Session destroyed" : "Session not found",
		});
	} catch (error) {
		console.error("Error destroying replay session:", error);

		return NextResponse.json(
			{
				success: false,
				error: "Failed to destroy replay session",
				message: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
