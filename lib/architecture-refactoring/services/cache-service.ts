/**
 * Cache Service
 * Provides caching functionality for analysis results
 */

import type { CacheInterface } from "../types";
import { Logger } from "./logger";

interface CacheEntry<T> {
	value: T;
	expiry: number;
}

export class CacheService implements CacheInterface {
	private cache: Map<string, CacheEntry<any>> = new Map();
	private logger: Logger;

	constructor() {
		this.logger = new Logger("CacheService");
	}

	async get<T>(key: string): Promise<T | null> {
		const entry = this.cache.get(key);

		if (!entry) {
			this.logger.debug(`Cache miss: ${key}`);
			return null;
		}

		if (Date.now() > entry.expiry) {
			this.logger.debug(`Cache expired: ${key}`);
			this.cache.delete(key);
			return null;
		}

		this.logger.debug(`Cache hit: ${key}`);
		return entry.value as T;
	}

	async set<T>(key: string, value: T, ttl = 3600000): Promise<void> {
		const expiry = Date.now() + ttl;
		this.cache.set(key, { value, expiry });
		this.logger.debug(`Cache set: ${key}`, { ttl });
	}

	async delete(key: string): Promise<void> {
		const deleted = this.cache.delete(key);
		if (deleted) {
			this.logger.debug(`Cache deleted: ${key}`);
		}
	}

	async clear(): Promise<void> {
		const size = this.cache.size;
		this.cache.clear();
		this.logger.info("Cache cleared", { entriesRemoved: size });
	}

	/**
	 * Get cache statistics
	 */
	getStats(): {
		size: number;
		entries: string[];
		memoryUsage: number;
	} {
		const entries = Array.from(this.cache.keys());
		const memoryUsage = this.estimateMemoryUsage();

		return {
			size: this.cache.size,
			entries,
			memoryUsage,
		};
	}

	/**
	 * Estimate memory usage of cache
	 */
	private estimateMemoryUsage(): number {
		let totalSize = 0;

		for (const [key, entry] of this.cache.entries()) {
			// Rough estimation
			totalSize += key.length * 2; // UTF-16
			totalSize += JSON.stringify(entry.value).length * 2;
			totalSize += 16; // overhead for expiry number
		}

		return totalSize;
	}

	/**
	 * Clean up expired entries
	 */
	async cleanup(): Promise<number> {
		const now = Date.now();
		let removed = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiry) {
				this.cache.delete(key);
				removed++;
			}
		}

		if (removed > 0) {
			this.logger.info("Cache cleanup completed", { entriesRemoved: removed });
		}

		return removed;
	}

	/**
	 * Check if key exists and is not expired
	 */
	async has(key: string): Promise<boolean> {
		const value = await this.get(key);
		return value !== null;
	}

	/**
	 * Get multiple values at once
	 */
	async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
		const results = new Map<string, T | null>();

		for (const key of keys) {
			results.set(key, await this.get<T>(key));
		}

		return results;
	}

	/**
	 * Set multiple values at once
	 */
	async setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
		for (const { key, value, ttl } of entries) {
			await this.set(key, value, ttl);
		}
	}

	/**
	 * Get or set a value with a factory function
	 */
	async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
		const cached = await this.get<T>(key);
		if (cached !== null) {
			return cached;
		}

		const value = await factory();
		await this.set(key, value, ttl);
		return value;
	}
}
