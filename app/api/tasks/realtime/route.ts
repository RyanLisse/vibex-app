// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Real-time Task Updates WebSocket API Route
 *
 * Handles WebSocket connections for real-time task progress monitoring.
 */

import { type NextRequest, NextResponse } from "next/server";
import { observability } from "@/lib/observability";
import {
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
		if (connection && !connection.subscriptions.includes(subscriptionKey)) {
			connection.subscriptions.push(subscriptionKey);

			if (!RealTimeConnectionManager.subscriptions.has(subscriptionKey)) {
				RealTimeConnectionManager.subscriptions.set(subscriptionKey, new Set());
			}
			RealTimeConnectionManager.subscriptions
				.get(subscriptionKey)
				?.add(connectionId);
		}
	}

	static getSubscribers(subscriptionKey: string): string[] {
		return Array.from(
			RealTimeConnectionManager.subscriptions.get(subscriptionKey) || [],
		);
	}
}

export async function GET(request: NextRequest) {
	try {
		// This would typically upgrade to WebSocket
		// For now, return connection instructions
		return NextResponse.json({
			message: "WebSocket endpoint",
			instructions: "Connect using ws:// protocol",
		});
	} catch (error) {
		observability.logger.error("WebSocket connection error", error as Error);
		return createApiErrorResponse("Failed to establish connection", 500);
	}
}
