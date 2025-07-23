/**
 * Real-Time Event Streaming System
 *
 * Provides real-time streaming of observability events with proper categorization,
 * filtering, and subscription management for live monitoring and debugging.
 */

import { EventEmitter } from "node:events";
import { and, desc, gte, inArray } from "drizzle-orm";
import { db } from "@/db/config";
import { observabilityEvents as observabilityEventsTable } from "@/db/schema";
import type {
	EventSeverity,
	ObservabilityEvent,
	ObservabilityEventType,
} from "./events";

// Event stream filter
export interface EventStreamFilter {
	types?: ObservabilityEventType[];
	severities?: EventSeverity[];
	sources?: string[];
	tags?: string[];
	executionId?: string;
	userId?: string;
	sessionId?: string;
	startTime?: Date;
	endTime?: Date;
}

// Event stream subscription
export interface EventStreamSubscription {
	id: string;
	filter: EventStreamFilter;
	callback: (event: ObservabilityEvent) => void;
	active: boolean;
	createdAt: Date;
}

// Real-time event stream manager
export class EventStreamManager extends EventEmitter {
	private static instance: EventStreamManager;
	private subscriptions: Map<string, EventStreamSubscription> = new Map();
	private eventBuffer: ObservabilityEvent[] = [];
	private readonly MAX_BUFFER_SIZE = 10_000;
	private pollingInterval: NodeJS.Timeout | null = null;
	private readonly POLLING_INTERVAL = 1000; // 1 second
	private lastPolledTimestamp: Date = new Date();

	private constructor() {
		super();
		this.setMaxListeners(1000); // Allow many subscriptions
		this.startEventPolling();
	}

	static getInstance(): EventStreamManager {
		if (!EventStreamManager.instance) {
			EventStreamManager.instance = new EventStreamManager();
		}
		return EventStreamManager.instance;
	}

	/**
	 * Subscribe to event stream with filter
	 */
	subscribe(
		filter: EventStreamFilter,
		callback: (event: ObservabilityEvent) => void,
	): string {
		const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		const subscription: EventStreamSubscription = {
			id: subscriptionId,
			filter,
			callback,
			active: true,
			createdAt: new Date(),
		};

		this.subscriptions.set(subscriptionId, subscription);

		// Send recent events that match the filter
		this.sendRecentEvents(subscription);

		return subscriptionId;
	}

	/**
	 * Unsubscribe from event stream
	 */
	unsubscribe(subscriptionId: string): boolean {
		const subscription = this.subscriptions.get(subscriptionId);
		if (subscription) {
			subscription.active = false;
			this.subscriptions.delete(subscriptionId);
			return true;
		}
		return false;
	}

	/**
	 * Get active subscriptions count
	 */
	getActiveSubscriptionsCount(): number {
		return Array.from(this.subscriptions.values()).filter((sub) => sub.active)
			.length;
	}

	/**
	 * Broadcast event to matching subscriptions
	 */
	broadcastEvent(event: ObservabilityEvent): void {
		// Add to buffer
		this.eventBuffer.push(event);

		// Trim buffer if too large
		if (this.eventBuffer.length > this.MAX_BUFFER_SIZE) {
			this.eventBuffer = this.eventBuffer.slice(-this.MAX_BUFFER_SIZE);
		}

		// Send to matching subscriptions
		for (const subscription of this.subscriptions.values()) {
			if (
				subscription.active &&
				this.eventMatchesFilter(event, subscription.filter)
			) {
				try {
					subscription.callback(event);
				} catch (error) {
					console.error(
						`Error in event stream callback for subscription ${subscription.id}:`,
						error,
					);
				}
			}
		}

		// Emit for other listeners
		this.emit("event", event);
	}

	/**
	 * Validates if event type matches filter criteria
	 */
	private matchesTypeFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		if (!filter.types || filter.types.length === 0) {
			return true;
		}
		return filter.types.includes(event.type);
	}

	/**
	 * Validates if event severity matches filter criteria
	 */
	private matchesSeverityFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		if (!filter.severities || filter.severities.length === 0) {
			return true;
		}
		return filter.severities.includes(event.severity);
	}

	/**
	 * Validates if event source matches filter criteria
	 */
	private matchesSourceFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		if (!filter.sources || filter.sources.length === 0) {
			return true;
		}
		return filter.sources.includes(event.source);
	}

	/**
	 * Validates if event tags match filter criteria
	 */
	private matchesTagsFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		if (!filter.tags || filter.tags.length === 0) {
			return true;
		}
		return filter.tags.some((tag) => event.tags.includes(tag));
	}

	/**
	 * Validates if event metadata matches filter criteria
	 */
	private matchesMetadataFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		// Execution ID filter
		if (
			filter.executionId &&
			event.metadata.executionId !== filter.executionId
		) {
			return false;
		}

		// User ID filter
		if (filter.userId && event.metadata.userId !== filter.userId) {
			return false;
		}

		// Session ID filter
		if (filter.sessionId && event.metadata.sessionId !== filter.sessionId) {
			return false;
		}

		return true;
	}

	/**
	 * Validates if event timestamp is within filter time range
	 */
	private matchesTimeRangeFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		if (filter.startTime && event.timestamp < filter.startTime) {
			return false;
		}

		if (filter.endTime && event.timestamp > filter.endTime) {
			return false;
		}

		return true;
	}

	/**
	 * Check if event matches all filter criteria
	 * Uses early return pattern and delegates to specialized validation methods
	 */
	private eventMatchesFilter(
		event: ObservabilityEvent,
		filter: EventStreamFilter,
	): boolean {
		return (
			this.matchesTypeFilter(event, filter) &&
			this.matchesSeverityFilter(event, filter) &&
			this.matchesSourceFilter(event, filter) &&
			this.matchesTagsFilter(event, filter) &&
			this.matchesMetadataFilter(event, filter) &&
			this.matchesTimeRangeFilter(event, filter)
		);
	}

	/**
	 * Send recent events to new subscription
	 */
	private async sendRecentEvents(
		subscription: EventStreamSubscription,
	): Promise<void> {
		try {
			// Get recent events from database that match the filter
			const recentEvents = await this.getRecentEventsFromDb(
				subscription.filter,
				50,
			);

			// Send each matching event
			for (const event of recentEvents) {
				if (
					subscription.active &&
					this.eventMatchesFilter(event, subscription.filter)
				) {
					try {
						subscription.callback(event);
					} catch (error) {
						console.error(
							`Error sending recent event to subscription ${subscription.id}:`,
							error,
						);
					}
				}
			}
		} catch (error) {
			console.error("Error sending recent events:", error);
		}
	}

	/**
	 * Get recent events from database with filter
	 */
	private async getRecentEventsFromDb(
		filter: EventStreamFilter,
		limit = 100,
	): Promise<ObservabilityEvent[]> {
		let query = db.select().from(observabilityEventsTable);

		const conditions = [];

		if (filter.types && filter.types.length > 0) {
			conditions.push(inArray(observabilityEventsTable.type, filter.types));
		}

		if (filter.severities && filter.severities.length > 0) {
			conditions.push(
				inArray(observabilityEventsTable.severity, filter.severities),
			);
		}

		if (filter.sources && filter.sources.length > 0) {
			conditions.push(inArray(observabilityEventsTable.source, filter.sources));
		}

		if (filter.startTime) {
			conditions.push(
				gte(observabilityEventsTable.timestamp, filter.startTime),
			);
		}

		if (conditions.length > 0) {
			query = query.where(and(...conditions));
		}

		const events = await query
			.orderBy(desc(observabilityEventsTable.timestamp))
			.limit(limit);

		return events.map((event) => ({
			id: event.id,
			type: event.type as ObservabilityEventType,
			severity: event.severity as EventSeverity,
			message: event.message,
			metadata: event.metadata || {},
			timestamp: event.timestamp,
			source: event.source,
			tags: event.tags || [],
		}));
	}

	/**
	 * Start polling for new events
	 */
	private startEventPolling(): void {
		this.pollingInterval = setInterval(async () => {
			try {
				await this.pollForNewEvents();
			} catch (error) {
				console.error("Error polling for new events:", error);
			}
		}, this.POLLING_INTERVAL);
	}

	/**
	 * Poll for new events from database
	 */
	private async pollForNewEvents(): Promise<void> {
		if (this.subscriptions.size === 0) return;

		try {
			const newEvents = await db
				.select()
				.from(observabilityEventsTable)
				.where(
					gte(observabilityEventsTable.timestamp, this.lastPolledTimestamp),
				)
				.orderBy(desc(observabilityEventsTable.timestamp))
				.limit(1000);

			if (newEvents.length > 0) {
				// Update last polled timestamp
				this.lastPolledTimestamp = new Date();

				// Process events in chronological order
				const sortedEvents = newEvents.reverse();

				for (const dbEvent of sortedEvents) {
					const event: ObservabilityEvent = {
						id: dbEvent.id,
						type: dbEvent.type as ObservabilityEventType,
						severity: dbEvent.severity as EventSeverity,
						message: dbEvent.message,
						metadata: dbEvent.metadata || {},
						timestamp: dbEvent.timestamp,
						source: dbEvent.source,
						tags: dbEvent.tags || [],
					};

					this.broadcastEvent(event);
				}
			}
		} catch (error) {
			console.error("Error polling for new events:", error);
		}
	}

	/**
	 * Stop event polling
	 */
	stopEventPolling(): void {
		if (this.pollingInterval) {
			clearInterval(this.pollingInterval);
			this.pollingInterval = null;
		}
	}

	/**
	 * Get buffered events
	 */
	getBufferedEvents(filter?: EventStreamFilter): ObservabilityEvent[] {
		if (!filter) return [...this.eventBuffer];

		return this.eventBuffer.filter((event) =>
			this.eventMatchesFilter(event, filter),
		);
	}

	/**
	 * Clear event buffer
	 */
	clearBuffer(): void {
		this.eventBuffer = [];
	}

	/**
	 * Get subscription statistics
	 */
	getSubscriptionStats(): {
		total: number;
		active: number;
		byType: Record<string, number>;
		bySeverity: Record<string, number>;
	} {
		const stats = {
			total: this.subscriptions.size,
			active: 0,
			byType: {} as Record<string, number>,
			bySeverity: {} as Record<string, number>,
		};

		for (const subscription of this.subscriptions.values()) {
			if (subscription.active) {
				stats.active++;

				// Count by types
				if (subscription.filter.types) {
					for (const type of subscription.filter.types) {
						stats.byType[type] = (stats.byType[type] || 0) + 1;
					}
				}

				// Count by severities
				if (subscription.filter.severities) {
					for (const severity of subscription.filter.severities) {
						stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
					}
				}
			}
		}

		return stats;
	}

	/**
	 * Enhanced event filtering with performance optimization
	 */
	subscribeWithAdvancedFilter(
		filter: EventStreamFilter & {
			aggregation?: {
				enabled: boolean;
				windowMs: number;
				groupBy: string[];
			};
			rateLimit?: {
				maxEventsPerSecond: number;
				burstSize: number;
			};
		},
		callback: (event: ObservabilityEvent | ObservabilityEvent[]) => void,
	): string {
		const subscriptionId = `adv_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		// Enhanced subscription with rate limiting and aggregation
		const enhancedCallback = this.createEnhancedCallback(filter, callback);

		const subscription: EventStreamSubscription = {
			id: subscriptionId,
			filter,
			callback: enhancedCallback,
			active: true,
			createdAt: new Date(),
		};

		this.subscriptions.set(subscriptionId, subscription);
		return subscriptionId;
	}

	/**
	 * Create enhanced callback with rate limiting and aggregation
	 */
	private createEnhancedCallback(
		filter: any,
		originalCallback: (
			event: ObservabilityEvent | ObservabilityEvent[],
		) => void,
	): (event: ObservabilityEvent) => void {
		let eventBuffer: ObservabilityEvent[] = [];
		let lastFlush = Date.now();
		let eventCount = 0;
		let lastSecond = Math.floor(Date.now() / 1000);

		return (event: ObservabilityEvent) => {
			const now = Date.now();
			const currentSecond = Math.floor(now / 1000);

			// Reset rate limit counter every second
			if (currentSecond !== lastSecond) {
				eventCount = 0;
				lastSecond = currentSecond;
			}

			// Apply rate limiting
			if (filter.rateLimit) {
				if (eventCount >= filter.rateLimit.maxEventsPerSecond) {
					return; // Drop event due to rate limit
				}
				eventCount++;
			}

			// Handle aggregation
			if (filter.aggregation?.enabled) {
				eventBuffer.push(event);

				// Flush buffer if window elapsed or buffer is full
				if (
					now - lastFlush >= filter.aggregation.windowMs ||
					eventBuffer.length >= 100
				) {
					if (eventBuffer.length > 0) {
						originalCallback(eventBuffer);
						eventBuffer = [];
						lastFlush = now;
					}
				}
			} else {
				// Send individual event
				originalCallback(event);
			}
		};
	}

	/**
	 * Get performance metrics for the streaming system
	 */
	getPerformanceMetrics(): {
		subscriptionsCount: number;
		eventsBuffered: number;
		eventsPerSecond: number;
		memoryUsage: number;
		pollingLatency: number;
	} {
		const memoryUsage = process.memoryUsage().heapUsed;

		// Calculate events per second (approximate)
		const recentEvents = this.eventBuffer.slice(-100);
		const timeSpan =
			recentEvents.length > 1
				? recentEvents[recentEvents.length - 1].timestamp.getTime() -
					recentEvents[0].timestamp.getTime()
				: 1000;
		const eventsPerSecond = recentEvents.length / (timeSpan / 1000);

		return {
			subscriptionsCount: this.subscriptions.size,
			eventsBuffered: this.eventBuffer.length,
			eventsPerSecond: Math.round(eventsPerSecond * 100) / 100,
			memoryUsage,
			pollingLatency: this.POLLING_INTERVAL,
		};
	}
}

// Convenience functions for common streaming patterns
export const eventStream = {
	manager: EventStreamManager.getInstance(),

	// Subscribe to all events
	subscribeToAll: (callback: (event: ObservabilityEvent) => void) =>
		EventStreamManager.getInstance().subscribe({}, callback),

	// Subscribe to errors only
	subscribeToErrors: (callback: (event: ObservabilityEvent) => void) =>
		EventStreamManager.getInstance().subscribe(
			{ severities: ["error", "critical"] },
			callback,
		),

	// Subscribe to specific execution
	subscribeToExecution: (
		executionId: string,
		callback: (event: ObservabilityEvent) => void,
	) => EventStreamManager.getInstance().subscribe({ executionId }, callback),

	// Unsubscribe
	unsubscribe: (subscriptionId: string) =>
		EventStreamManager.getInstance().unsubscribe(subscriptionId),
};
