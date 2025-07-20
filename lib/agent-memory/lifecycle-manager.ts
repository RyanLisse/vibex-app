/**
 * Agent Memory Lifecycle Manager
 *
 * Manages memory expiration, archival, and maintenance operations.
 */

import { observability } from "@/lib/observability";
import { memoryRepository } from "./repository";
import type {
	MemoryEntry,
	MemoryImportance,
	MemoryLifecycleEvent,
} from "./types";

export class MemoryLifecycleManager {
	private static instance: MemoryLifecycleManager;
	private lifecycleEvents: MemoryLifecycleEvent[] = [];
	private maintenanceInterval: NodeJS.Timeout | null = null;
	private readonly MAINTENANCE_INTERVAL = 60 * 60 * 1000; // 1 hour

	private constructor() {}

	static getInstance(): MemoryLifecycleManager {
		if (!MemoryLifecycleManager.instance) {
			MemoryLifecycleManager.instance = new MemoryLifecycleManager();
		}
		return MemoryLifecycleManager.instance;
	}

	/**
	 * Start automatic maintenance
	 */
	startMaintenance(): void {
		if (this.maintenanceInterval) {
			return;
		}

		// Run maintenance immediately
		this.runMaintenance().catch(console.error);

		// Schedule periodic maintenance
		this.maintenanceInterval = setInterval(() => {
			this.runMaintenance().catch(console.error);
		}, this.MAINTENANCE_INTERVAL);

		console.log("Memory lifecycle maintenance started");
	}

	/**
	 * Stop automatic maintenance
	 */
	stopMaintenance(): void {
		if (this.maintenanceInterval) {
			clearInterval(this.maintenanceInterval);
			this.maintenanceInterval = null;
			console.log("Memory lifecycle maintenance stopped");
		}
	}

	/**
	 * Run maintenance tasks
	 */
	async runMaintenance(): Promise<{
		expired: number;
		archived: number;
		optimized: number;
	}> {
		const startTime = Date.now();
		console.log("Running memory maintenance...");

		try {
			// Delete expired memories
			const expiredCount = await this.cleanupExpiredMemories();

			// Archive old memories
			const archivedCount = await this.archiveOldMemories();

			// Optimize memory importance
			const optimizedCount = await this.optimizeMemoryImportance();

			const duration = Date.now() - startTime;
			const results = {
				expired: expiredCount,
				archived: archivedCount,
				optimized: optimizedCount,
			};

			observability.metrics.recordOperation("memory_maintenance", duration);

			await observability.recordEvent("memory_maintenance_completed", {
				...results,
				duration,
			});

			console.log("Memory maintenance completed:", results);
			return results;
		} catch (error) {
			observability.recordError("memory_maintenance", error as Error);
			throw error;
		}
	}

	/**
	 * Clean up expired memories
	 */
	async cleanupExpiredMemories(): Promise<number> {
		try {
			const deletedCount = await memoryRepository.deleteExpired();

			if (deletedCount > 0) {
				this.recordLifecycleEvent({
					memoryId: "batch",
					eventType: "expired",
					timestamp: new Date(),
					metadata: { count: deletedCount },
				});
			}

			return deletedCount;
		} catch (error) {
			console.error("Failed to cleanup expired memories:", error);
			return 0;
		}
	}

	/**
	 * Archive old memories based on age and access patterns
	 */
	async archiveOldMemories(): Promise<number> {
		try {
			let totalArchived = 0;

			// Get all agent types
			const agentTypes = await this.getActiveAgentTypes();

			for (const agentType of agentTypes) {
				// Archive memories older than 30 days with low access
				const archived = await memoryRepository.archiveOldMemories(
					agentType,
					30,
				);
				totalArchived += archived;

				if (archived > 0) {
					this.recordLifecycleEvent({
						memoryId: "batch",
						eventType: "archived",
						timestamp: new Date(),
						metadata: {
							agentType,
							count: archived,
						},
					});
				}
			}

			return totalArchived;
		} catch (error) {
			console.error("Failed to archive old memories:", error);
			return 0;
		}
	}

	/**
	 * Optimize memory importance based on usage
	 */
	async optimizeMemoryImportance(): Promise<number> {
		try {
			let optimizedCount = 0;
			const agentTypes = await this.getActiveAgentTypes();

			for (const agentType of agentTypes) {
				// Get frequently accessed memories with low importance
				const frequentMemories = await memoryRepository.getMostAccessed(
					agentType,
					50,
				);

				for (const memory of frequentMemories) {
					// Increase importance if frequently accessed but low importance
					if (memory.accessCount > 10 && memory.importance < 5) {
						const newImportance = Math.min(
							10,
							memory.importance + Math.floor(memory.accessCount / 10),
						) as MemoryImportance;

						await memoryRepository.update(memory.id, {
							importance: newImportance,
						});

						optimizedCount++;
					}
				}

				// Get rarely accessed memories with high importance
				const oldMemories = await memoryRepository.search({
					agentType,
					importance: { min: 7 },
					orderBy: "access_frequency",
					limit: 50,
				});

				for (const memory of oldMemories) {
					// Decrease importance if rarely accessed
					const daysSinceAccess =
						(Date.now() - memory.lastAccessedAt.getTime()) /
						(1000 * 60 * 60 * 24);

					if (daysSinceAccess > 14 && memory.accessCount < 3) {
						const newImportance = Math.max(
							1,
							memory.importance - 2,
						) as MemoryImportance;

						await memoryRepository.update(memory.id, {
							importance: newImportance,
						});

						optimizedCount++;
					}
				}
			}

			return optimizedCount;
		} catch (error) {
			console.error("Failed to optimize memory importance:", error);
			return 0;
		}
	}

	/**
	 * Set memory expiration
	 */
	async setExpiration(memoryId: string, expiresAt: Date | null): Promise<void> {
		try {
			await memoryRepository.update(memoryId, { expiresAt });

			this.recordLifecycleEvent({
				memoryId,
				eventType: "updated",
				timestamp: new Date(),
				metadata: { expiresAt },
			});
		} catch (error) {
			console.error("Failed to set memory expiration:", error);
			throw error;
		}
	}

	/**
	 * Extend memory lifetime
	 */
	async extendLifetime(
		memoryId: string,
		additionalDays: number,
	): Promise<void> {
		try {
			const memory = await memoryRepository.findById(memoryId);
			if (!memory) {
				throw new Error(`Memory ${memoryId} not found`);
			}

			let newExpiresAt: Date | null = null;

			if (memory.expiresAt) {
				newExpiresAt = new Date(memory.expiresAt);
				newExpiresAt.setDate(newExpiresAt.getDate() + additionalDays);
			}

			await this.setExpiration(memoryId, newExpiresAt);
		} catch (error) {
			console.error("Failed to extend memory lifetime:", error);
			throw error;
		}
	}

	/**
	 * Promote memory (increase importance and remove expiration)
	 */
	async promoteMemory(
		memoryId: string,
		newImportance?: MemoryImportance,
	): Promise<void> {
		try {
			const memory = await memoryRepository.findById(memoryId);
			if (!memory) {
				throw new Error(`Memory ${memoryId} not found`);
			}

			const updates = {
				importance:
					newImportance ||
					(Math.min(10, memory.importance + 3) as MemoryImportance),
				expiresAt: null,
			};

			await memoryRepository.update(memoryId, updates);

			this.recordLifecycleEvent({
				memoryId,
				eventType: "updated",
				timestamp: new Date(),
				metadata: { promoted: true, ...updates },
			});
		} catch (error) {
			console.error("Failed to promote memory:", error);
			throw error;
		}
	}

	/**
	 * Get lifecycle events
	 */
	getLifecycleEvents(filter?: {
		memoryId?: string;
		eventType?: MemoryLifecycleEvent["eventType"];
		since?: Date;
	}): MemoryLifecycleEvent[] {
		let events = [...this.lifecycleEvents];

		if (filter?.memoryId) {
			events = events.filter((e) => e.memoryId === filter.memoryId);
		}
		if (filter?.eventType) {
			events = events.filter((e) => e.eventType === filter.eventType);
		}
		if (filter?.since) {
			events = events.filter((e) => e.timestamp >= filter.since);
		}

		return events;
	}

	/**
	 * Calculate memory retention policy
	 */
	calculateRetentionDays(memory: MemoryEntry): number {
		// Base retention days by type
		const baseRetention: Record<string, number> = {
			conversation: 7,
			task_execution: 14,
			user_preference: 365,
			learned_pattern: 90,
			error_resolution: 60,
			context_summary: 3,
			knowledge_base: 180,
			skill_acquisition: 120,
		};

		let retentionDays = baseRetention[memory.metadata.type] || 30;

		// Adjust based on importance
		retentionDays *= 1 + (memory.importance - 5) * 0.2;

		// Adjust based on access frequency
		if (memory.accessCount > 20) {
			retentionDays *= 1.5;
		} else if (memory.accessCount > 10) {
			retentionDays *= 1.2;
		}

		// Cap retention
		return Math.min(Math.round(retentionDays), 730); // Max 2 years
	}

	/**
	 * Get memory health report
	 */
	async getHealthReport(agentType?: string): Promise<{
		totalMemories: number;
		expiringMemories: number;
		archivedMemories: number;
		averageAge: number;
		storageUtilization: number;
		recommendations: string[];
	}> {
		const stats = await memoryRepository.getStats(agentType);

		// Get expiring memories count
		const expiringMemories = await memoryRepository.search({
			agentType,
			includeExpired: false,
			limit: 1000,
		});

		const expiringCount = expiringMemories.filter(
			(m) =>
				m.expiresAt &&
				m.expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000,
		).length;

		// Get archived memories count
		const archivedCount = expiringMemories.filter(
			(m) => m.metadata.accessPattern === "archived",
		).length;

		// Calculate average age
		const ages = expiringMemories.map(
			(m) => (Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24),
		);
		const averageAge =
			ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;

		// Generate recommendations
		const recommendations: string[] = [];

		if (stats.totalCount > 10_000) {
			recommendations.push(
				"Consider archiving old memories to improve performance",
			);
		}

		if (expiringCount > stats.totalCount * 0.2) {
			recommendations.push(
				"Many memories are expiring soon, review retention policies",
			);
		}

		if (stats.averageImportance < 3) {
			recommendations.push(
				"Low average importance, consider cleaning up low-value memories",
			);
		}

		return {
			totalMemories: stats.totalCount,
			expiringMemories: expiringCount,
			archivedMemories: archivedCount,
			averageAge: Math.round(averageAge),
			storageUtilization: stats.storageSize,
			recommendations,
		};
	}

	/**
	 * Record lifecycle event
	 */
	private recordLifecycleEvent(event: MemoryLifecycleEvent): void {
		this.lifecycleEvents.push(event);

		// Keep only recent events
		if (this.lifecycleEvents.length > 1000) {
			this.lifecycleEvents = this.lifecycleEvents.slice(-1000);
		}
	}

	/**
	 * Get active agent types
	 */
	private async getActiveAgentTypes(): Promise<string[]> {
		// This would query distinct agent types from the database
		// For now, return a placeholder
		return ["orchestrator", "task_executor", "workflow_orchestrator"];
	}
}

// Export singleton instance
export const memoryLifecycleManager = MemoryLifecycleManager.getInstance();
