/**
 * Task Cache Layer
 *
 * Provides caching for task queries to optimize performance
 * and reduce database load.
 */

import { LRUCache } from "lru-cache";
import { observability } from "@/lib/observability";

export interface CacheOptions {
	ttl?: number; // Time to live in milliseconds
	staleWhileRevalidate?: number; // Time to serve stale content while revalidating
	tags?: string[]; // Cache tags for invalidation
}

export interface CachedValue<T> {
	data: T;
	timestamp: number;
	ttl: number;
	staleWhileRevalidate?: number;
	tags: string[];
}

/**
 * In-memory LRU cache for tasks
 */
class TaskCache {
	private cache: LRUCache<string, CachedValue<any>>;
	private tagIndex: Map<string, Set<string>>; // tag -> cache keys

	constructor() {
		this.cache = new LRUCache({
			max: 500, // Maximum number of items
			ttl: 1000 * 60 * 5, // Default 5 minutes TTL
			updateAgeOnGet: true,
			updateAgeOnHas: false,
		});

		this.tagIndex = new Map();
	}

	/**
	 * Get value from cache
	 */
	async get<T>(key: string): Promise<T | null> {
		const cached = this.cache.get(key);

		if (!cached) {
			observability.metrics.customMetric.record(1, {
				metric_name: "cache_miss",
				unit: "count",
				category: "cache",
				cache_type: "task",
			});
			return null;
		}

		const now = Date.now();
		const age = now - cached.timestamp;

		// Check if expired
		if (age > cached.ttl) {
			this.cache.delete(key);
			observability.metrics.customMetric.record(1, {
				metric_name: "cache_expired",
				unit: "count",
				category: "cache",
				cache_type: "task",
			});
			return null;
		}

		// Check if stale but can be served
		if (cached.staleWhileRevalidate && age > cached.ttl - cached.staleWhileRevalidate) {
			observability.metrics.customMetric.record(1, {
				metric_name: "cache_stale_hit",
				unit: "count",
				category: "cache",
				cache_type: "task",
			});
		} else {
			observability.metrics.customMetric.record(1, {
				metric_name: "cache_hit",
				unit: "count",
				category: "cache",
				cache_type: "task",
			});
		}

		return cached.data as T;
	}

	/**
	 * Set value in cache
	 */
	async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
		const {
			ttl = 1000 * 60 * 5, // Default 5 minutes
			staleWhileRevalidate,
			tags = [],
		} = options;

		const cached: CachedValue<T> = {
			data: value,
			timestamp: Date.now(),
			ttl,
			staleWhileRevalidate,
			tags,
		};

		this.cache.set(key, cached);

		// Update tag index
		tags.forEach((tag) => {
			if (!this.tagIndex.has(tag)) {
				this.tagIndex.set(tag, new Set());
			}
			this.tagIndex.get(tag)!.add(key);
		});

		observability.metrics.customMetric.record(1, {
			metric_name: "cache_set",
			unit: "count",
			category: "cache",
			cache_type: "task",
		});
	}

	/**
	 * Invalidate cache by key
	 */
	async invalidate(key: string): Promise<void> {
		const cached = this.cache.get(key);
		if (cached) {
			// Remove from tag index
			cached.tags.forEach((tag) => {
				this.tagIndex.get(tag)?.delete(key);
			});
		}

		this.cache.delete(key);

		observability.metrics.customMetric.record(1, {
			metric_name: "cache_invalidate",
			unit: "count",
			category: "cache",
			cache_type: "task",
		});
	}

	/**
	 * Invalidate cache by tags
	 */
	async invalidateByTags(tags: string[]): Promise<void> {
		const keysToInvalidate = new Set<string>();

		tags.forEach((tag) => {
			const keys = this.tagIndex.get(tag);
			if (keys) {
				keys.forEach((key) => keysToInvalidate.add(key));
			}
		});

		keysToInvalidate.forEach((key) => {
			this.cache.delete(key);
		});

		// Clean up tag index
		tags.forEach((tag) => {
			this.tagIndex.delete(tag);
		});

		observability.metrics.customMetric.record(keysToInvalidate.size, {
			metric_name: "cache_invalidate_by_tag",
			unit: "count",
			category: "cache",
			cache_type: "task",
		});
	}

	/**
	 * Clear entire cache
	 */
	async clear(): Promise<void> {
		this.cache.clear();
		this.tagIndex.clear();

		observability.metrics.customMetric.record(1, {
			metric_name: "cache_clear",
			unit: "count",
			category: "cache",
			cache_type: "task",
		});
	}

	/**
	 * Get cache statistics
	 */
	getStats() {
		return {
			size: this.cache.size,
			maxSize: this.cache.max,
			tags: this.tagIndex.size,
		};
	}
}

// Export singleton instance
export const taskCache = new TaskCache();

/**
 * Cache wrapper for async functions
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
	fn: T,
	keyGenerator: (...args: Parameters<T>) => string,
	options: CacheOptions = {}
): T {
	return (async (...args: Parameters<T>) => {
		const key = keyGenerator(...args);

		// Try to get from cache
		const cached = await taskCache.get(key);
		if (cached !== null) {
			return cached;
		}

		// Execute function and cache result
		const result = await fn(...args);
		await taskCache.set(key, result, options);

		return result;
	}) as T;
}

/**
 * React Query integration helpers
 */
export const cacheUtils = {
	/**
	 * Generate cache key for task queries
	 */
	taskQueryKey: (params: {
		userId?: string;
		status?: string;
		priority?: string;
		assignee?: string;
		labels?: string[];
		search?: string;
		page?: number;
		limit?: number;
	}) => {
		const parts = ["tasks"];

		if (params.userId) parts.push(`user:${params.userId}`);
		if (params.status) parts.push(`status:${params.status}`);
		if (params.priority) parts.push(`priority:${params.priority}`);
		if (params.assignee) parts.push(`assignee:${params.assignee}`);
		if (params.labels?.length) parts.push(`labels:${params.labels.sort().join(",")}`);
		if (params.search) parts.push(`search:${params.search}`);
		if (params.page) parts.push(`page:${params.page}`);
		if (params.limit) parts.push(`limit:${params.limit}`);

		return parts.join(":");
	},

	/**
	 * Generate cache tags for task
	 */
	taskCacheTags: (task: {
		id: string;
		userId: string;
		status: string;
		priority: string;
		assignee?: string;
		labels?: string[];
	}) => {
		const tags = [
			`task:${task.id}`,
			`user:${task.userId}`,
			`status:${task.status}`,
			`priority:${task.priority}`,
		];

		if (task.assignee) {
			tags.push(`assignee:${task.assignee}`);
		}

		if (task.labels) {
			task.labels.forEach((label) => tags.push(`label:${label}`));
		}

		return tags;
	},

	/**
	 * Invalidate task-related caches
	 */
	invalidateTaskCaches: async (task: {
		id: string;
		userId: string;
		status: string;
		priority: string;
		assignee?: string;
		labels?: string[];
	}) => {
		const tags = cacheUtils.taskCacheTags(task);
		await taskCache.invalidateByTags(tags);
	},
};

/**
 * Optimistic update helper
 */
export class OptimisticUpdate<T> {
	private rollbackData: Map<string, T> = new Map();

	/**
	 * Apply optimistic update
	 */
	async apply(key: string, updater: (current: T | null) => T): Promise<void> {
		const current = await taskCache.get<T>(key);
		this.rollbackData.set(key, current as T);

		const updated = updater(current);
		await taskCache.set(key, updated, { ttl: 1000 * 60 * 60 }); // 1 hour for optimistic updates
	}

	/**
	 * Commit optimistic update
	 */
	async commit(key: string, data: T, options?: CacheOptions): Promise<void> {
		this.rollbackData.delete(key);
		await taskCache.set(key, data, options);
	}

	/**
	 * Rollback optimistic update
	 */
	async rollback(key: string): Promise<void> {
		const original = this.rollbackData.get(key);
		if (original !== undefined) {
			await taskCache.set(key, original);
			this.rollbackData.delete(key);
		}
	}

	/**
	 * Clear all rollback data
	 */
	clear(): void {
		this.rollbackData.clear();
	}
}
