// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Real-time Task Updates WebSocket API Route
 *
 * Handles WebSocket connections for real-time task progress monitoring.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { observability } from "@/lib/observability";
	createApiErrorResponse,
	createApiSuccessResponse,
} from "@/src/schemas/api-routes";

// WebSocket connection manager
class RealTimeConnectionManager {
	private static connections = new Map<
		string,
		{
			userId: string;
			connectionId: string;
			subscriptions: string[];
			lastActivity: Date;
		}
	>();

	private static subscriptions = new Map<string, Set<string>>(); // subscriptionKey -> Set of connectionIds

	static addConnection(connectionId: string, userId: string) {
		RealTimeConnectionManager.connections.set(connectionId, {
			userId,
			connectionId,
			subscriptions: [],
			lastActivity: new Date(),
		});

		// Auto-subscribe to user's own tasks
		RealTimeConnectionManager.subscribe(connectionId, `user:${userId}`);

		return RealTimeConnectionManager.connections.get(connectionId);
	}

	static removeConnection(connectionId: string) {
		const connection = RealTimeConnectionManager.connections.get(connectionId);
		if (connection) {
			// Remove from all subscriptions
			connection.subscriptions.forEach((subscription) => {
				const subscribers =
					RealTimeConnectionManager.subscriptions.get(subscription);
				if (subscribers) {
					subscribers.delete(connectionId);
					if (subscribers.size === 0) {
						RealTimeConnectionManager.subscriptions.delete(subscription);
					}
				}
			});

			RealTimeConnectionManager.connections.delete(connectionId);
		}
	}

	static subscribe(connectionId: string, subscriptionKey: string) {
		const connection = RealTimeConnectionManager.connections.get(connectionId);
		if (!connection) {
			return false;
		}

		// Add to subscription
		if (!RealTimeConnectionManager.subscriptions.has(subscriptionKey)) {
			RealTimeConnectionManager.subscriptions.set(subscriptionKey, new Set());
		}
		RealTimeConnectionManager.subscriptions
			.get(subscriptionKey)
			?.add(connectionId);

		// Add to connection's subscriptions
		connection.subscriptions.push(subscriptionKey);
		connection.lastActivity = new Date();

		return true;
	}

	static unsubscribe(connectionId: string, subscriptionKey: string) {
		const connection = RealTimeConnectionManager.connections.get(connectionId);
		if (!connection) {
			return false;
		}

		// Remove from subscription
		const subscribers =
			RealTimeConnectionManager.subscriptions.get(subscriptionKey);
		if (subscribers) {
			subscribers.delete(connectionId);
			if (subscribers.size === 0) {
				RealTimeConnectionManager.subscriptions.delete(subscriptionKey);
			}
		}

		// Remove from connection's subscriptions
		connection.subscriptions = connection.subscriptions.filter(
			(sub) => sub !== subscriptionKey,
		);
		connection.lastActivity = new Date();

		return true;
	}

	static broadcast(subscriptionKey: string, _message: any) {
		const subscribers =
			RealTimeConnectionManager.subscriptions.get(subscriptionKey);
		if (!subscribers || subscribers.size === 0) {
			return 0;
		}

		let sentCount = 0;

		subscribers.forEach((connectionId) => {
			const connection =
				RealTimeConnectionManager.connections.get(connectionId);
			if (connection) {
				connection.lastActivity = new Date();
				sentCount++;
			}
		});

		return sentCount;
	}

	static getStats() {
		const totalConnections = RealTimeConnectionManager.connections.size;
		const totalSubscriptions = RealTimeConnectionManager.subscriptions.size;
		const activeConnections = Array.from(
			RealTimeConnectionManager.connections.values(),
		).filter(
			(conn) => Date.now() - conn.lastActivity.getTime() < 5 * 60 * 1000, // Active in last 5 minutes
		).length;

		const subscriptionBreakdown = {};
		RealTimeConnectionManager.subscriptions.forEach((subscribers, key) => {
			subscriptionBreakdown[key] = subscribers.size;
		});

		return {
			totalConnections,
			activeConnections,
			totalSubscriptions,
			subscriptionBreakdown,
		};
	}

	static cleanup() {
		// Remove stale connections (inactive for more than 30 minutes)
		const staleThreshold = 30 * 60 * 1000;
		const now = Date.now();

		const staleConnections = [];
		RealTimeConnectionManager.connections.forEach(
			(connection, connectionId) => {
				if (now - connection.lastActivity.getTime() > staleThreshold) {
					staleConnections.push(connectionId);
				}
			},
		);

		staleConnections.forEach((connectionId) => {
			RealTimeConnectionManager.removeConnection(connectionId);
		});

		return staleConnections.length;
	}
}

// Periodic cleanup (in real implementation, would use a proper scheduler)
setInterval(
	() => {
		RealTimeConnectionManager.cleanup();
	},
	5 * 60 * 1000,
); // Every 5 minutes

// Message types for real-time updates
const REALTIME_MESSAGE_TYPES = {
	TASK_CREATED: "task_created",
	TASK_UPDATED: "task_updated",
	TASK_COMPLETED: "task_completed",
	TASK_DELETED: "task_deleted",
	PROGRESS_UPDATED: "progress_updated",
	MILESTONE_REACHED: "milestone_reached",
	PR_STATUS_CHANGED: "pr_status_changed",
	KANBAN_MOVED: "kanban_moved",
	VOICE_TASK_CREATED: "voice_task_created",
	BUG_REPORT_CREATED: "bug_report_created",
	OVERDUE_ALERT: "overdue_alert",
	BLOCKED_ALERT: "blocked_alert",
};

// Public API for sending real-time updates (used by other API routes)
export class TaskRealtimeNotifier {
	static async notifyTaskUpdate(
		taskId: string,
		userId: string,
		updateType: string,
		data: any,
	) {
		const message = {
			type: updateType,
			taskId,
			userId,
			data,
			timestamp: new Date().toISOString(),
		};

		// Broadcast to different subscription channels
		const channels = [`user:${userId}`, `task:${taskId}`];

		if (data.projectId) {
			channels.push(`project:${data.projectId}`);
		}

		if (data.assignee) {
			channels.push(`user:${data.assignee}`);
		}

		let totalSent = 0;
		channels.forEach((channel) => {
			totalSent += RealTimeConnectionManager.broadcast(channel, message);
		});

		// Record event
		await observability.events.collector.collectEvent(
			"realtime_notification",
			"debug",
			`Real-time update sent: ${updateType}`,
			{
				taskId,
				userId,
				updateType,
				channels,
				recipientCount: totalSent,
			},
			"api",
			["tasks", "realtime", updateType],
		);

		return totalSent;
	}

	static async notifyProgressUpdate(
		taskId: string,
		userId: string,
		progressData: any,
	) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.PROGRESS_UPDATED,
			{
				progress: progressData,
			},
		);
	}

	static async notifyMilestoneReached(
		taskId: string,
		userId: string,
		milestone: any,
	) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.MILESTONE_REACHED,
			{
				milestone,
			},
		);
	}

	static async notifyKanbanMove(taskId: string, userId: string, moveData: any) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.KANBAN_MOVED,
			{
				movement: moveData,
			},
		);
	}

	static async notifyPRStatusChange(
		taskId: string,
		userId: string,
		prData: any,
	) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.PR_STATUS_CHANGED,
			{
				pr: prData,
			},
		);
	}

	static async notifyOverdueAlert(
		taskId: string,
		userId: string,
		taskData: any,
	) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.OVERDUE_ALERT,
			{
				task: taskData,
				alertType: "overdue",
			},
		);
	}
}

/**
 * GET /api/tasks/realtime - Get real-time connection info and stats
 */
export async function GET(request: NextRequest) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.realtime.getStats");

	try {
		const { searchParams } = new URL(request.url);
		const includeStats = searchParams.get("stats") === "true";

		const response: any = {
			status: "active",
			messageTypes: REALTIME_MESSAGE_TYPES,
			endpoints: {
				connect: "/api/tasks/realtime/connect",
				subscribe: "/api/tasks/realtime/subscribe",
				unsubscribe: "/api/tasks/realtime/unsubscribe",
			},
		};

		if (includeStats) {
			response.stats = RealTimeConnectionManager.getStats();
		}

		span.setAttributes({
			"realtime.stats_requested": includeStats,
			"realtime.connections": response.stats?.totalConnections || 0,
		});

		return NextResponse.json(
			createApiSuccessResponse(response, "Real-time service status"),
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		return NextResponse.json(
			createApiErrorResponse(
				"Failed to get real-time stats",
				500,
				"REALTIME_STATS_ERROR",
			),
			{ status: 500 },
		);
	} finally {
		span.end();
	}
}

/**
 * POST /api/tasks/realtime - Simulate real-time connection (for testing)
 */
export async function POST(request: NextRequest) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.realtime.connect");

	try {
		const body = await request.json();
		const { userId, connectionId } = z
			.object({
				userId: z.string(),
				connectionId: z.string().optional(),
			})
			.parse(body);

		const finalConnectionId =
			connectionId ||
			`conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const connection = RealTimeConnectionManager.addConnection(
			finalConnectionId,
			userId,
		);

		span.setAttributes({
			"realtime.connection_id": finalConnectionId,
			"realtime.user_id": userId,
		});

		return NextResponse.json(
			createApiSuccessResponse(
				{
					connectionId: finalConnectionId,
					userId,
					subscriptions: connection?.subscriptions || [],
					status: "connected",
				},
				"Real-time connection established",
			),
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				createApiErrorResponse(
					"Validation failed",
					400,
					"VALIDATION_ERROR",
					error.issues,
				),
				{ status: 400 },
			);
		}

		return NextResponse.json(
			createApiErrorResponse(
				"Failed to establish connection",
				500,
				"CONNECTION_ERROR",
			),
			{ status: 500 },
		);
	} finally {
		span.end();
	}
}

/**
 * DELETE /api/tasks/realtime - Disconnect from real-time updates
 */
export async function DELETE(request: NextRequest) {
	const tracer = trace.getTracer("tasks-api");
	const span = tracer.startSpan("tasks.realtime.disconnect");

	try {
		const { searchParams } = new URL(request.url);
		const connectionId = searchParams.get("connectionId");

		if (!connectionId) {
			return NextResponse.json(
				createApiErrorResponse(
					"Connection ID is required",
					400,
					"MISSING_CONNECTION_ID",
				),
				{ status: 400 },
			);
		}

		RealTimeConnectionManager.removeConnection(connectionId);

		span.setAttributes({
			"realtime.connection_id": connectionId,
		});

		return NextResponse.json(
			createApiSuccessResponse(
				{ connectionId, status: "disconnected" },
				"Real-time connection closed",
			),
		);
	} catch (error) {
		span.recordException(error as Error);
		span.setStatus({ code: SpanStatusCode.ERROR });

		return NextResponse.json(
			createApiErrorResponse("Failed to disconnect", 500, "DISCONNECT_ERROR"),
			{ status: 500 },
		);
	} finally {
		span.end();
	}
}
