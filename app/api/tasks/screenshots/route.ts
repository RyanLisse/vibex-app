// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Screenshot Bug Reporting API Route
 *
 * Handles screenshot uploads and bug report creation with annotation data.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { db } from "@/db/config";
import { tasks } from "@/db/schema";
import { observability } from "@/lib/observability";
import {
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";
import { ScreenshotBugReportSchema } from "@/src/schemas/enhanced-task-schemas";

// File upload handling (mock implementation for now)
const uploadScreenshot = async (file: File): Promise<string> => {
	// In real implementation, would upload to cloud storage (S3, Cloudinary, etc.)
	const mockUrl = `https://storage.app.com/screenshots/${ulid()}.${file.name.split(".").pop()}`;
	return mockUrl;
};

/**
 * POST /api/tasks/screenshots - Create bug report with screenshot
 */
export async function POST(request: NextRequest) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.screenshots.create");

	try {
		const formData = await request.formData();
		const screenshot = formData.get("screenshot") as File;
		const bugReportData = JSON.parse(formData.get("bugReport") as string);

		// Validate bug report data
		const validatedData = ScreenshotBugReportSchema.parse(bugReportData);

		// Upload screenshot if provided
		let screenshotUrl: string | undefined;
		if (screenshot) {
			screenshotUrl = await uploadScreenshot(screenshot);
		}

		// Create enhanced task with screenshot data
		const newTask = {
			id: ulid(),
			title: validatedData.title,
			description: validatedData.description,
			status: "todo" as const,
			priority: validatedData.priority,
			userId: validatedData.userId,
			assignee: validatedData.assignee,
			labels: validatedData.labels,
			metadata: {
				type: "bug_report",
				screenshot: screenshotUrl
					? {
							url: screenshotUrl,
							annotations: validatedData.screenshot.annotations,
							timestamp: new Date().toISOString(),
						}
					: undefined,
				browserInfo: validatedData.browserInfo,
				reproductionSteps: validatedData.reproductionSteps,
				expectedBehavior: validatedData.expectedBehavior,
				actualBehavior: validatedData.actualBehavior,
			},
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const [createdTask] = await db.insert(tasks).values(newTask).returning();

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Bug report created with screenshot: ${createdTask.title}`,
			{
				taskId: createdTask.id,
				userId: createdTask.userId,
				hasScreenshot: !!screenshotUrl,
				annotationsCount: validatedData.screenshot.annotations.length,
			},
			"api",
			["tasks", "screenshot", "bug-report"],
		);

		span.setAttributes({
			"task.id": createdTask.id,
			"task.type": "bug_report",
			"screenshot.provided": !!screenshotUrl,
			"annotations.count": validatedData.screenshot.annotations.length,
		});

		return NextResponse.json(
			createApiSuccessResponse(
				{
					task: createdTask,
					screenshotUrl,
				},
				"Bug report created successfully",
			),
			{ status: 201 },
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		if (error instanceof z.ZodError) {
			const mappedIssues = error.issues.map(issue => ({
				field: issue.path.join('.') || 'unknown',
				message: issue.message
			}));
			return NextResponse.json(
				createApiErrorResponse("Validation failed", 400, mappedIssues),
				{
					status: 400,
				},
			);
		}

		observability.metrics.errorRate(1, "screenshot_api");

		return NextResponse.json(
			createApiErrorResponse(
				"Failed to create bug report",
				500,
				"CREATE_BUG_REPORT_ERROR",
			),
			{ status: 500 },
		);
	} finally {
		span.end();
	}
}

/**
 * GET /api/tasks/screenshots - Get tasks with screenshots
 */
export async function GET(request: NextRequest) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.screenshots.list");

	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		let query = db.select().from(tasks);

		if (userId) {
			query = query.where(eq(tasks.userId, userId));
		}

		// Filter for tasks with screenshot metadata
		const allTasks = await query;
		const screenshotTasks = allTasks.filter(
			(task) =>
				task.metadata &&
				typeof task.metadata === "object" &&
				"screenshot" in task.metadata,
		);

		span.setAttributes({
			"tasks.total": allTasks.length,
			"tasks.with_screenshots": screenshotTasks.length,
		});

		return NextResponse.json(
			createApiSuccessResponse(
				screenshotTasks,
				"Screenshot tasks retrieved successfully",
			),
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		return NextResponse.json(
			createApiErrorResponse(
				"Failed to fetch screenshot tasks",
				500,
				"FETCH_SCREENSHOTS_ERROR",
			),
			{ status: 500 },
		);
	} finally {
		span.end();
	}
}
