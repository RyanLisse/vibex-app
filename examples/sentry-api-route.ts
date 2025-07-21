/**
 * Example API route with Sentry instrumentation
 */

import * as Sentry from "@sentry/nextjs";
import { enhancedObservability } from "@/lib/observability/enhanced";
	instrumentApiRoute,
	instrumentDatabaseOperation
} from "@/lib/sentry/instrumentation";

const logger = enhancedObservability.getLogger("api.example");

// Example request schema
const ExampleRequestSchema = z.object({
	userId: z.string(),
	action: z.enum(["fetch", "process", "analyze"]),
	data: z.any().optional(),
});

export async function POST(request: NextRequest) {
	return instrumentApiRoute("POST", "/api/example", async () => {
		try {
			// Parse and validate request
			const body = await request.json();
			const validatedData = ExampleRequestSchema.parse(body);

			// Set user context
			enhancedObservability.setUser({
				id: validatedData.userId,
			});

			// Add breadcrumb
Sentry.addBreadcrumb({
				message: `API Request: ${validatedData.action}`,
				category: "api",
				level: "info",
				data: validatedData,
			});

			// Process based on action
			let result: any;

			switch (validatedData.action) {
				case "fetch":
					result = await handleFetchAction(validatedData.userId);
					break;
				case "process":
					result = await handleProcessAction(
						validatedData.userId,
						validatedData.data,
					);
					break;
				case "analyze":
					result = await handleAnalyzeAction(validatedData.userId);
					break;
			}

			// Track success metric
			enhancedObservability.trackIncrement("api.example.success", 1, {
				action: validatedData.action,
				userId: validatedData.userId,
			});

			// Log successful operation
			logger.info(`Successfully processed ${validatedData.action} action`, {
				userId: validatedData.userId,
				resultCount: Array.isArray(result) ? result.length : 1,
			});

			return NextResponse.json({
				success: true,
				data: result,
				timestamp: new Date().toISOString(),
			});
		} catch (error) {
			// Log error
			logger.error("API request failed", error as Error);

			// Track error metric
			enhancedObservability.trackIncrement("api.example.error", 1, {
				errorType: (error as Error).name,
			});

			// Capture exception with context
Sentry.captureException(error, {
				tags: {
					api_route: "/api/example",
					method: "POST",
				},
			});

			if (error instanceof z.ZodError) {
				return NextResponse.json(
					{
						success: false,
						error: "Validation failed",
						details: error.errors,
					},
					{ status: 400 },
				);
			}

			return NextResponse.json(
				{
					success: false,
					error: "Internal server error",
					message:
						process.env.NODE_ENV === "development"
							? (error as Error).message
							: undefined,
				},
				{ status: 500 },
			);
		}
	});
}

async function handleFetchAction(userId: string) {
	return Sentry.startSpan(
		{
			op: "api.action.fetch",
			name: "Fetch User Tasks",
		},
		async (span) => {
			// Instrument database operation
			const userTasks = await instrumentDatabaseOperation(
				"select",
				"SELECT * FROM tasks WHERE userId = ?",
				async () => {
					const startTime = Date.now();
					const result = await db
						.select()
						.from(tasks)
						.where(eq(tasks.userId, userId))
						.limit(10);

					// Track query performance
					enhancedObservability.trackDistribution(
						"db.query.duration",
Date.now() - startTime,
						"millisecond",
						{ query: "fetch_user_tasks" },
					);

					return result;
				},
			);

			span?.setData("tasks.count", userTasks.length);
			span?.setData("user.id", userId);

			return userTasks;
		},
	);
}

async function handleProcessAction(userId: string, data: any) {
	return Sentry.startSpan(
		{
			op: "api.action.process",
			name: "Process User Data",
		},
		async (span) => {
			const timer = enhancedObservability.createTimer("api.process.duration", {
				userId,
			});

			try {
				// Simulate processing
				await new Promise((resolve) => setTimeout(resolve, 100));

				// Add processing breadcrumb
Sentry.addBreadcrumb({
					message: "Data processing completed",
					category: "processing",
					level: "info",
					data: {
						userId,
						dataSize: JSON.stringify(data).length,
					},
				});

				span?.setData("process.success", true);

				return {
					processed: true,
					timestamp: new Date().toISOString(),
				};
			} finally {
				timer.end();
			}
		},
	);
}

async function handleAnalyzeAction(userId: string) {
	return Sentry.startSpan(
		{
			op: "api.action.analyze",
			name: "Analyze User Activity",
		},
		async (span) => {
			// Perform multiple database queries with instrumentation
			const [taskCount, completedCount] = await Promise.all([
				instrumentDatabaseOperation(
					"count",
					"SELECT COUNT(*) FROM tasks WHERE userId = ?",
					async () => {
						const result = await db
							.select({ count: count() })
							.from(tasks)
							.where(eq(tasks.userId, userId));
						return result[0].count;
					},
				),
				instrumentDatabaseOperation(
					"count",
					"SELECT COUNT(*) FROM tasks WHERE userId = ? AND status = completed",
					async () => {
						const result = await db
							.select({ count: count() })
							.from(tasks)
							.where(
								and(eq(tasks.userId, userId), eq(tasks.status, "completed")),
							);
						return result[0].count;
					},
				),
			]);

			const completionRate =
				taskCount > 0 ? (completedCount / taskCount) * 100 : 0;

			// Track analysis metric
			enhancedObservability.trackGauge("user.completion.rate", completionRate, {
				userId,
			});

			span?.setData("tasks.total", taskCount);
			span?.setData("tasks.completed", completedCount);
			span?.setData("completion.rate", completionRate);

			return {
				totalTasks: taskCount,
				completedTasks: completedCount,
				completionRate: `${completionRate.toFixed(2)}%`,
			};
		},
	);
}
