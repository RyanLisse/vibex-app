// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Task Attachments API Route
 *
 * Handles file uploads for task attachments including screenshots and other files.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { type NextRequest, NextResponse } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { db } from "@/db/config";
import { taskAttachments } from "@/db/schema";
import { handleRouteError } from "@/lib/api/error-handlers";
import { observability } from "@/lib/observability";
import { storageService } from "@/lib/services/storage";
import { createApiErrorResponse, createApiSuccessResponse } from "@/src/schemas/api-routes";

// Request validation schema
const AttachmentUploadSchema = z.object({
	attachmentType: z.enum(["screenshot", "document", "image", "video", "other"]),
	annotations: z.array(z.any()).optional(),
	metadata: z.record(z.string()).optional(),
});

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * POST /api/tasks/[id]/attachments - Upload attachment for a task
 */
export async function POST(request: NextRequest, context: RouteParams) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.attachments.upload");

	try {
		const { id: taskId } = await context.params;

		const formData = await request.formData();
		const file = formData.get("file") as File;
		const requestData = JSON.parse(formData.get("data") as string);

		// Validate request data
		const validatedData = AttachmentUploadSchema.parse(requestData);

		if (!file) {
			return NextResponse.json(createApiErrorResponse("File is required", 400), {
				status: 400,
			});
		}

		span.setAttributes({
			"task.id": taskId,
			"attachment.type": validatedData.attachmentType,
			"attachment.size": file.size,
			"attachment.mimetype": file.type,
		});

		let fileUrl: string;

		// Handle different attachment types
		if (validatedData.attachmentType === "screenshot") {
			fileUrl = await storageService.uploadScreenshot(file, taskId, validatedData.annotations);
		} else {
			const uploadResult = await storageService.uploadAttachment(
				file,
				taskId,
				validatedData.attachmentType
			);
			fileUrl = uploadResult.url;
		}

		// Create attachment record
		const attachmentId = ulid();
		const newAttachment = {
			id: attachmentId,
			taskId: taskId,
			fileName: file.name,
			fileUrl: fileUrl,
			fileType: file.type,
			fileSize: file.size,
			attachmentType: validatedData.attachmentType,
			metadata: {
				...validatedData.metadata,
				annotations: validatedData.annotations,
				uploadedAt: new Date().toISOString(),
			},
			uploadedBy: request.headers.get("x-user-id") || "system",
			createdAt: new Date(),
		};

		const [createdAttachment] = await db.insert(taskAttachments).values(newAttachment).returning();

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Attachment uploaded for task: ${taskId}`,
			{
				taskId: taskId,
				attachmentId: createdAttachment.id,
				attachmentType: validatedData.attachmentType,
				fileSize: file.size,
				fileType: file.type,
			},
			"api",
			["tasks", "attachments", "upload"]
		);

		observability.metrics.customMetric.record(file.size, {
			metric_name: "task_attachment_size",
			unit: "bytes",
			category: "tasks",
			attachment_type: validatedData.attachmentType,
		});

		return NextResponse.json(
			createApiSuccessResponse(
				{
					attachment: createdAttachment,
				},
				"Attachment uploaded successfully"
			),
			{ status: 201 }
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		if (error instanceof z.ZodError) {
			const mappedIssues = error.issues.map((issue) => ({
				field: issue.path.join(".") || "unknown",
				message: issue.message,
			}));
			return NextResponse.json(createApiErrorResponse("Validation failed", 400, mappedIssues), {
				status: 400,
			});
		}

		observability.metrics.errorRate.record(1, {
			error_type: "attachment_upload_error",
			component: "tasks",
		});

		return NextResponse.json(createApiErrorResponse("Failed to upload attachment", 500), {
			status: 500,
		});
	} finally {
		span.end();
	}
}

/**
 * GET /api/tasks/[id]/attachments - Get all attachments for a task
 */
export async function GET(request: NextRequest, context: RouteParams) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.attachments.list");

	try {
		const { id: taskId } = await context.params;

		span.setAttribute("task.id", taskId);

		// Get attachments from database
		const attachments = await db
			.select()
			.from(taskAttachments)
			.where(eq(taskAttachments.taskId, taskId))
			.orderBy(desc(taskAttachments.createdAt));

		// Get storage metadata for each attachment
		const attachmentsWithMetadata = await Promise.all(
			attachments.map(async (attachment) => {
				const metadata = await storageService.getMetadata(attachment.fileUrl);
				return {
					...attachment,
					storageMetadata: metadata,
				};
			})
		);

		return NextResponse.json(
			createApiSuccessResponse(
				{
					attachments: attachmentsWithMetadata,
					count: attachments.length,
				},
				"Attachments retrieved successfully"
			)
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		observability.metrics.errorRate.record(1, {
			error_type: "attachment_list_error",
			component: "tasks",
		});

		return NextResponse.json(createApiErrorResponse("Failed to retrieve attachments", 500), {
			status: 500,
		});
	} finally {
		span.end();
	}
}

/**
 * DELETE /api/tasks/[id]/attachments/[attachmentId] - Delete an attachment
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.attachments.delete");

	try {
		const { id: taskId } = await context.params;
		const url = new URL(request.url);
		const attachmentId = url.pathname.split("/").pop();

		if (!attachmentId) {
			return NextResponse.json(createApiErrorResponse("Attachment ID is required", 400), {
				status: 400,
			});
		}

		span.setAttributes({
			"task.id": taskId,
			"attachment.id": attachmentId,
		});

		// Get attachment record
		const attachment = await db
			.select()
			.from(taskAttachments)
			.where(and(eq(taskAttachments.id, attachmentId), eq(taskAttachments.taskId, taskId)))
			.limit(1);

		if (attachment.length === 0) {
			return NextResponse.json(createApiErrorResponse("Attachment not found", 404), {
				status: 404,
			});
		}

		// Delete from storage
		await storageService.delete(attachment[0].fileUrl);

		// Delete from database
		await db.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId));

		// Record event
		await observability.events.collector.collectEvent(
			"user_action",
			"info",
			`Attachment deleted from task: ${taskId}`,
			{
				taskId: taskId,
				attachmentId: attachmentId,
				attachmentType: attachment[0].attachmentType,
			},
			"api",
			["tasks", "attachments", "delete"]
		);

		return NextResponse.json(
			createApiSuccessResponse(
				{
					deleted: true,
					attachmentId: attachmentId,
				},
				"Attachment deleted successfully"
			)
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		observability.metrics.errorRate.record(1, {
			error_type: "attachment_delete_error",
			component: "tasks",
		});

		return NextResponse.json(createApiErrorResponse("Failed to delete attachment", 500), {
			status: 500,
		});
	} finally {
		span.end();
	}
}

// Import missing dependencies
import { and, desc, eq } from "drizzle-orm";
