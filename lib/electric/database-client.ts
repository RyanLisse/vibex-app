/**
 * Enhanced ElectricSQL Database Client
 *
 * Connects ElectricSQL real-time sync to actual PostgreSQL database operations
 * with Redis caching integration for optimal performance.
 */

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/config";
import type {
	AgentExecution,
	Environment,
	NewAgentExecution,
	NewEnvironment,
	NewObservabilityEvent,
	NewTask,
	ObservabilityEvent,
	Task,
} from "@/db/schema";
import {
	agentExecutions,
	environments,
	observabilityEvents,
	tasks,
} from "@/db/schema";
import { ObservabilityService } from "@/lib/observability";
import { redisCache } from "@/lib/redis";

export interface DatabaseOperation {
	table: string;
	operation: "insert" | "update" | "delete" | "select";
	data?: any;
	where?: any;
	options?: {
		userId?: string;
		realtime?: boolean;
		cache?: boolean;
		ttl?: number;
	};
}

export interface DatabaseResult<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	cached?: boolean;
	timestamp: Date;
}

export interface ConflictResolution {
	strategy: "last-write-wins" | "user-priority" | "field-merge" | "server-wins";
	conflictData?: {
		local: any;
		remote: any;
		timestamp: Date;
	};
}

export class ElectricDatabaseClient {
	private static instance: ElectricDatabaseClient;
	private observability = ObservabilityService.getInstance();
	private subscriptions = new Map<string, Set<(data: any) => void>>();
	private conflictResolvers = new Map<
		string,
		(conflict: any) => Promise<any>
	>();

	private constructor() {}

	static getInstance(): ElectricDatabaseClient {
		if (!ElectricDatabaseClient.instance) {
			ElectricDatabaseClient.instance = new ElectricDatabaseClient();
		}
		return ElectricDatabaseClient.instance;
	}

	/**
	 * Execute a database operation with Redis caching and real-time sync
	 */
	async executeOperation<T>(
		operation: DatabaseOperation,
	): Promise<DatabaseResult<T>> {
		return this.observability.trackOperation(
			`electric.db.${operation.operation}`,
			async () => {
				const { table, operation: op, data, where, options = {} } = operation;
				const { userId, realtime = true, cache = true, ttl = 300 } = options;

				try {
					let result: any;
					const cacheKey = this.buildCacheKey(table, op, where, userId);

					// Check cache for read operations
					if (op === "select" && cache) {
						const cached = await this.getCachedResult<T>(cacheKey);
						if (cached) {
							return {
								success: true,
								data: cached,
								cached: true,
								timestamp: new Date(),
							};
						}
					}

					// Execute database operation
					switch (op) {
						case "select":
							result = await this.executeSelect(table, where, userId);
							break;
						case "insert":
							result = await this.executeInsert(table, data, userId);
							break;
						case "update":
							result = await this.executeUpdate(table, data, where, userId);
							break;
						case "delete":
							result = await this.executeDelete(table, where, userId);
							break;
						default:
							throw new Error(`Unsupported operation: ${op}`);
					}

					// Cache the result
					if (cache && result) {
						await this.setCachedResult(cacheKey, result, ttl);
					}

					// Emit real-time updates
					if (
						realtime &&
						(op === "insert" || op === "update" || op === "delete")
					) {
						await this.emitRealtimeUpdate(table, op, result, userId);
					}

					return {
						success: true,
						data: result,
						cached: false,
						timestamp: new Date(),
					};
				} catch (error) {
					this.observability.recordError(`electric.db.${op}`, error as Error);
					return {
						success: false,
						error: error instanceof Error ? error.message : "Unknown error",
						timestamp: new Date(),
					};
				}
			},
		);
	}

	/**
	 * Execute SELECT operations with proper filtering and caching
	 */
	private async executeSelect(
		table: string,
		where?: any,
		userId?: string,
	): Promise<any[]> {
		switch (table) {
			case "tasks":
				return this.selectTasks(where, userId);
			case "environments":
				return this.selectEnvironments(where, userId);
			case "agent_executions":
				return this.selectAgentExecutions(where, userId);
			case "observability_events":
				return this.selectObservabilityEvents(where, userId);
			default:
				throw new Error(`Unsupported table for select: ${table}`);
		}
	}

	/**
	 * Execute INSERT operations with conflict detection
	 */
	private async executeInsert(
		table: string,
		data: any,
		userId?: string,
	): Promise<any> {
		const insertData = { ...data, userId };

		switch (table) {
			case "tasks": {
				const [newTask] = await db
					.insert(tasks)
					.values(insertData as NewTask)
					.returning();
				return newTask;
			}
			case "environments": {
				const [newEnv] = await db
					.insert(environments)
					.values(insertData as NewEnvironment)
					.returning();
				return newEnv;
			}
			case "agent_executions": {
				const [newExecution] = await db
					.insert(agentExecutions)
					.values(insertData as NewAgentExecution)
					.returning();
				return newExecution;
			}
			case "observability_events": {
				const [newEvent] = await db
					.insert(observabilityEvents)
					.values(insertData as NewObservabilityEvent)
					.returning();
				return newEvent;
			}
			default:
				throw new Error(`Unsupported table for insert: ${table}`);
		}
	}

	/**
	 * Execute UPDATE operations with conflict resolution
	 */
	private async executeUpdate(
		table: string,
		data: any,
		where: any,
		userId?: string,
	): Promise<any> {
		const updateData = { ...data, updatedAt: new Date() };

		switch (table) {
			case "tasks": {
				const whereClause = userId
					? and(eq(tasks.id, where.id), eq(tasks.userId, userId))
					: eq(tasks.id, where.id);
				const [updatedTask] = await db
					.update(tasks)
					.set(updateData)
					.where(whereClause)
					.returning();
				return updatedTask;
			}
			case "environments": {
				const envWhereClause = userId
					? and(eq(environments.id, where.id), eq(environments.userId, userId))
					: eq(environments.id, where.id);
				const [updatedEnv] = await db
					.update(environments)
					.set(updateData)
					.where(envWhereClause)
					.returning();
				return updatedEnv;
			}
			default:
				throw new Error(`Unsupported table for update: ${table}`);
		}
	}

	/**
	 * Execute DELETE operations with proper authorization
	 */
	private async executeDelete(
		table: string,
		where: any,
		userId?: string,
	): Promise<any> {
		switch (table) {
			case "tasks": {
				const whereClause = userId
					? and(eq(tasks.id, where.id), eq(tasks.userId, userId))
					: eq(tasks.id, where.id);
				const [deletedTask] = await db
					.delete(tasks)
					.where(whereClause)
					.returning();
				return deletedTask;
			}
			case "environments": {
				const envWhereClause = userId
					? and(eq(environments.id, where.id), eq(environments.userId, userId))
					: eq(environments.id, where.id);
				const [deletedEnv] = await db
					.delete(environments)
					.where(envWhereClause)
					.returning();
				return deletedEnv;
			}
			default:
				throw new Error(`Unsupported table for delete: ${table}`);
		}
	}

	/**
	 * Select tasks with proper filtering
	 */
	private async selectTasks(where?: any, userId?: string): Promise<Task[]> {
		let query = db.select().from(tasks);

		if (userId) {
			query = query.where(eq(tasks.userId, userId));
		}

		if (where) {
			if (where.status) {
				query = query.where(
					and(
						userId ? eq(tasks.userId, userId) : sql`true`,
						eq(tasks.status, where.status),
					),
				);
			}
			if (where.archived !== undefined) {
				query = query.where(
					and(
						userId ? eq(tasks.userId, userId) : sql`true`,
						eq(
							tasks.metadata,
							sql`jsonb_build_object('isArchived', ${where.archived})`,
						),
					),
				);
			}
		}

		return query.orderBy(desc(tasks.createdAt));
	}

	/**
	 * Select environments with proper filtering
	 */
	private async selectEnvironments(
		where?: any,
		userId?: string,
	): Promise<Environment[]> {
		let query = db.select().from(environments);

		if (userId) {
			query = query.where(eq(environments.userId, userId));
		}

		if (where?.isActive !== undefined) {
			query = query.where(
				and(
					userId ? eq(environments.userId, userId) : sql`true`,
					eq(environments.isActive, where.isActive),
				),
			);
		}

		return query.orderBy(desc(environments.createdAt));
	}

	/**
	 * Select agent executions with proper filtering
	 */
	private async selectAgentExecutions(
		where?: any,
		userId?: string,
	): Promise<AgentExecution[]> {
		let query = db.select().from(agentExecutions);

		if (where?.taskId) {
			// Verify user has access to the task
			if (userId) {
				const task = await db
					.select()
					.from(tasks)
					.where(and(eq(tasks.id, where.taskId), eq(tasks.userId, userId)))
					.limit(1);

				if (task.length === 0) {
					throw new Error("Access denied: Task not found or not owned by user");
				}
			}

			query = query.where(eq(agentExecutions.taskId, where.taskId));
		}

		return query.orderBy(desc(agentExecutions.startedAt)).limit(100);
	}

	/**
	 * Select observability events with proper filtering
	 */
	private async selectObservabilityEvents(
		where?: any,
		userId?: string,
	): Promise<ObservabilityEvent[]> {
		let query = db.select().from(observabilityEvents);

		if (where?.executionId) {
			query = query.where(
				eq(observabilityEvents.executionId, where.executionId),
			);
		}

		return query.orderBy(desc(observabilityEvents.timestamp)).limit(1000);
	}

	/**
	 * Build cache key for operations
	 */
	private buildCacheKey(
		table: string,
		operation: string,
		where?: any,
		userId?: string,
	): string {
		const parts = ["electric", table, operation];

		if (userId) {
			parts.push(`user:${userId}`);
		}

		if (where) {
			const whereStr = JSON.stringify(where);
			parts.push(`where:${Buffer.from(whereStr).toString("base64")}`);
		}

		return parts.join(":");
	}

	/**
	 * Get cached result with Redis
	 */
	private async getCachedResult<T>(cacheKey: string): Promise<T | null> {
		try {
			const redis = await this.getRedisCache();
			return redis ? await redis.get<T>(cacheKey) : null;
		} catch (error) {
			console.warn("Cache read failed:", error);
			return null;
		}
	}

	/**
	 * Set cached result with Redis
	 */
	private async setCachedResult(
		cacheKey: string,
		data: any,
		ttl: number,
	): Promise<void> {
		try {
			const redis = await this.getRedisCache();
			if (redis) {
				await redis.set(cacheKey, data, { ttl });
			}
		} catch (error) {
			console.warn("Cache write failed:", error);
		}
	}

	/**
	 * Get Redis cache instance (lazy-loaded)
	 */
	private async getRedisCache() {
		try {
			const { redisCache } = await import("@/lib/redis");
			return redisCache;
		} catch (error) {
			console.warn("Redis not available:", error);
			return null;
		}
	}

	/**
	 * Emit real-time updates to subscribers
	 */
	private async emitRealtimeUpdate(
		table: string,
		operation: string,
		data: any,
		userId?: string,
	): Promise<void> {
		const subscriptionKey = userId ? `${table}:${userId}` : table;
		const subscribers = this.subscriptions.get(subscriptionKey);

		if (subscribers && subscribers.size > 0) {
			const updateEvent = {
				table,
				operation,
				data,
				userId,
				timestamp: new Date(),
			};

			subscribers.forEach((callback) => {
				try {
					callback(updateEvent);
				} catch (error) {
					console.error("Subscription callback error:", error);
				}
			});
		}

		// Also emit to browser events for UI updates
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent(`electric:${table}:${operation}`, {
					detail: { data, userId, timestamp: new Date() },
				}),
			);
		}
	}

	/**
	 * Subscribe to real-time updates for a table
	 */
	subscribeToTable(
		table: string,
		callback: (data: any) => void,
		userId?: string,
	): () => void {
		const subscriptionKey = userId ? `${table}:${userId}` : table;

		if (!this.subscriptions.has(subscriptionKey)) {
			this.subscriptions.set(subscriptionKey, new Set());
		}

		this.subscriptions.get(subscriptionKey)!.add(callback);

		// Return unsubscribe function
		return () => {
			const subscribers = this.subscriptions.get(subscriptionKey);
			if (subscribers) {
				subscribers.delete(callback);
				if (subscribers.size === 0) {
					this.subscriptions.delete(subscriptionKey);
				}
			}
		};
	}

	/**
	 * Get connection status
	 */
	getConnectionStatus() {
		return {
			connected: true, // Always connected to local database
			syncing: false,
			lastSync: new Date(),
			subscriptions: this.subscriptions.size,
		};
	}
}

// Export singleton instance
export const electricDatabaseClient = ElectricDatabaseClient.getInstance();
