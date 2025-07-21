/**
 * Task Real-time Notifier
 *
 * Utility class for sending real-time task updates via WebSocket connections.
 * This class is used by API routes to notify connected clients about task changes.
 */

import { SpanStatusCode, trace } from "@opentelemetry/api";
import { observability } from "@/lib/observability";

// Real-time message types
export const REALTIME_MESSAGE_TYPES = {
	TASK_CREATED: "task_created",
	TASK_UPDATED: "task_updated",
	TASK_DELETED: "task_deleted",
	TASK_STATUS_CHANGED: "task_status_changed",
	PROGRESS_UPDATED: "progress_updated",
	MILESTONE_REACHED: "milestone_reached",
	KANBAN_MOVED: "kanban_moved",
	PR_STATUS_CHANGED: "pr_status_changed",
	OVERDUE_ALERT: "overdue_alert",
	BLOCKED_ALERT: "blocked_alert",
};

// WebSocket connection manager (simplified for now)
class ConnectionManager {
	private connections = new Map<string, Set<WebSocket>>();

	addConnection(userId: string, ws: WebSocket) {
		if (!this.connections.has(userId)) {
			this.connections.set(userId, new Set());
		}
		this.connections.get(userId)?.add(ws);
	}

	removeConnection(userId: string, ws: WebSocket) {
		this.connections.get(userId)?.delete(ws);
		if (this.connections.get(userId)?.size === 0) {
			this.connections.delete(userId);
		}
	}

	getUserConnections(userId: string): Set<WebSocket> {
		return this.connections.get(userId) || new Set();
	}

	broadcast(message: any) {
		for (const connections of this.connections.values()) {
			for (const ws of connections) {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(message));
				}
			}
		}
	}
}

const connectionManager = new ConnectionManager();

// Public API for sending real-time updates (used by other API routes)
export class TaskRealtimeNotifier {
	static async notifyTaskUpdate(
		taskId: string,
		userId: string,
		updateType: string,
		data: any,
	) {
		const tracer = trace.getTracer("task-realtime-notifier");
		const span = tracer.startSpan("notify_task_update");

		try {
			span.setAttributes({
				"task.id": taskId,
				"user.id": userId,
				"update.type": updateType,
			});

			const message = {
				type: updateType,
				taskId,
				userId,
				timestamp: new Date().toISOString(),
				data,
			};

			// Get user connections and send message
			const userConnections = connectionManager.getUserConnections(userId);

			for (const ws of userConnections) {
				if (ws.readyState === WebSocket.OPEN) {
					ws.send(JSON.stringify(message));
				}
			}

			// Log the notification
			observability.logger.info("Real-time task update sent", {
				taskId,
				userId,
				updateType,
				connectionCount: userConnections.size,
			});

			span.setStatus({ code: SpanStatusCode.OK });
			return { success: true, connectionCount: userConnections.size };
		} catch (error) {
			span.recordException(error as Error);
			span.setStatus({ code: SpanStatusCode.ERROR });

			observability.logger.error("Failed to send real-time task update", {
				taskId,
				userId,
				updateType,
				error: error instanceof Error ? error.message : String(error),
			});

			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			span.end();
		}
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
			},
		);
	}

	static async notifyBlockedAlert(
		taskId: string,
		userId: string,
		taskData: any,
	) {
		return TaskRealtimeNotifier.notifyTaskUpdate(
			taskId,
			userId,
			REALTIME_MESSAGE_TYPES.BLOCKED_ALERT,
			{
				task: taskData,
			},
		);
	}
}

// Export connection manager for use in WebSocket route
export { connectionManager };
