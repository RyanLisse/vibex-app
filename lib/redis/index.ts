/**
 * Redis/Valkey Integration - Main Entry Point
 *
 * Provides a unified interface for all Redis/Valkey services including
 * caching, session management, pub/sub, distributed locks, and more.
 */

import { CacheService } from "./cache-service";
import {
	getRedisServiceConfig,
	redisFeatures,
	validateRedisEnvironment,
} from "./config";
import type { RedisHealthStatus, RedisServiceConfig } from "./types";

export class RedisService {
	private static instance: RedisService;
	private clientManager: RedisClientManager;
	private cacheService: CacheService;
	private pubsubService: PubSubService;
	private lockService: LockService;
	private rateLimitService: RateLimitService;
	private jobQueueService: JobQueueService;
	private metricsService: MetricsService;
	private sessionService: SessionService;
	private config: RedisServiceConfig;
	private observability = ObservabilityService.getInstance();
	private isInitialized = false;
	private healthCheckInterval?: NodeJS.Timeout;
	private metricsInterval?: NodeJS.Timeout;

	private constructor() {
		this.config = getRedisServiceConfig();
		this.clientManager = RedisClientManager.getInstance(this.config.redis);

		// Initialize services and set the Redis manager
		this.cacheService = CacheService.getInstance();
		this.cacheService.setRedisManager(this.clientManager);

		this.pubsubService = PubSubService.getInstance();
		this.lockService = LockService.getInstance();
		this.rateLimitService = RateLimitService.getInstance();
		this.jobQueueService = JobQueueService.getInstance();
		this.metricsService = MetricsService.getInstance();
		this.sessionService = SessionService.getInstance();
	}

	static getInstance(): RedisService {
		if (!RedisService.instance) {
			RedisService.instance = new RedisService();
		}
		return RedisService.instance;
	}

	async initialize(): Promise<void> {
		if (this.isInitialized) {
			return;
		}

		return this.observability.trackOperation(
			"redis.service.initialize",
			async () => {
				try {
					// Validate environment
					const validation = validateRedisEnvironment();
					if (!validation.isValid) {
						throw new Error(
							`Redis environment validation failed: ${validation.errors.join(", ")}`,
						);
					}

					// Initialize Redis client manager
					await this.clientManager.initialize();

					// Start monitoring if enabled
					if (this.config.monitoring.enableHealthChecks) {
						this.startHealthChecks();
					}

					if (this.config.monitoring.enableMetrics) {
						this.startMetricsCollection();
					}

					this.isInitialized = true;
					console.log("Redis service initialized successfully");

					// Log enabled features
					const enabledFeatures = Object.entries(redisFeatures)
						.filter(([, enabled]) => enabled)
						.map(([feature]) => feature);

					console.log("Redis features enabled:", enabledFeatures.join(", "));
				} catch (error) {
					console.error("Failed to initialize Redis service:", error);
					throw error;
				}
			},
		);
	}

	// Service Access
	get cache(): CacheService {
		this.ensureInitialized();
		return this.cacheService;
	}

	get pubsub(): PubSubService {
		this.ensureInitialized();
		return this.pubsubService;
	}

	get locks(): LockService {
		this.ensureInitialized();
		return this.lockService;
	}

	get rateLimit(): RateLimitService {
		this.ensureInitialized();
		return this.rateLimitService;
	}

	get jobQueue(): JobQueueService {
		this.ensureInitialized();
		return this.jobQueueService;
	}

	get metrics(): MetricsService {
		this.ensureInitialized();
		return this.metricsService;
	}

	get sessions(): SessionService {
		this.ensureInitialized();
		return this.sessionService;
	}

	// Client Manager Access
	get client(): RedisClientManager {
		this.ensureInitialized();
		return this.clientManager;
	}

	// Health and Monitoring
	async getHealthStatus(): Promise<RedisHealthStatus> {
		this.ensureInitialized();
		return this.clientManager.healthCheck();
	}

	async getMetrics(): Promise<{
		cache: any;
		connections: any;
		health: RedisHealthStatus;
	}> {
		this.ensureInitialized();

		const [cacheMetrics, healthStatus] = await Promise.all([
			this.cacheService.getMetrics(),
			this.clientManager.healthCheck(),
		]);

		const connectionMetrics = {
			total: this.clientManager.getConnectedClients().length,
			connected: this.clientManager.getConnectedClients(),
			timestamp: new Date(),
		};

		return {
			cache: cacheMetrics,
			connections: connectionMetrics,
			health: healthStatus,
		};
	}

	// Utility Methods
	async flushAll(): Promise<void> {
		this.ensureInitialized();
		await this.clientManager.flushAll();
		this.cacheService.resetMetrics();
		console.log("All Redis data flushed and metrics reset");
	}

	async shutdown(): Promise<void> {
		console.log("Shutting down Redis service...");

		// Stop monitoring
		if (this.healthCheckInterval) {
			clearInterval(this.healthCheckInterval);
		}
		if (this.metricsInterval) {
			clearInterval(this.metricsInterval);
		}

		// Cleanup all services
		await Promise.all([
			this.pubsubService.cleanup(),
			this.lockService.cleanup(),
			this.rateLimitService.cleanup(),
			this.jobQueueService.cleanup(),
			this.metricsService.cleanup(),
			this.sessionService.cleanup(),
		]);

		// Shutdown client manager last
		await this.clientManager.shutdown();

		this.isInitialized = false;
		console.log("Redis service shut down successfully");
	}

	// Configuration Access
	getConfig(): RedisServiceConfig {
		return { ...this.config };
	}

	getFeatures(): typeof redisFeatures {
		return { ...redisFeatures };
	}

	// Private Methods
	private ensureInitialized(): void {
		if (!this.isInitialized) {
			throw new Error(
				"Redis service not initialized. Call initialize() first.",
			);
		}
	}

	private startHealthChecks(): void {
		const interval = this.config.monitoring.healthCheckInterval;

		this.healthCheckInterval = setInterval(async () => {
			try {
				const health = await this.getHealthStatus();

				// Record health metrics
				this.observability.recordEvent("redis.health.overall", 1, {
					status: health.overall,
				});

				// Record individual client health
				Object.entries(health.clients).forEach(([clientName, clientHealth]) => {
					this.observability.recordEvent("redis.health.client", 1, {
						client: clientName,
						status: clientHealth.status,
						connected: clientHealth.connected.toString(),
					});

					if (clientHealth.responseTime) {
						this.observability.recordEvent(
							"redis.health.response_time",
							clientHealth.responseTime,
							{
								client: clientName,
							},
						);
					}
				});

				// Log warnings for unhealthy clients
				if (health.overall !== "healthy") {
					const unhealthyClients = Object.entries(health.clients)
						.filter(([, client]) => client.status === "unhealthy")
						.map(([name]) => name);

					console.warn(
						`Redis health check: ${health.overall} - Unhealthy clients: ${unhealthyClients.join(", ")}`,
					);
				}
			} catch (error) {
				console.error("Redis health check failed:", error);
				this.observability.recordError(
					"redis.health.check.error",
					error as Error,
				);
			}
		}, interval);
	}

	private startMetricsCollection(): void {
		const interval = this.config.monitoring.metricsInterval;

		this.metricsInterval = setInterval(async () => {
			try {
				const metrics = await this.getMetrics();

				// Record cache metrics
				const cacheMetrics = metrics.cache;
				this.observability.recordEvent("redis.cache.hits", cacheMetrics.hits);
				this.observability.recordEvent(
					"redis.cache.misses",
					cacheMetrics.misses,
				);
				this.observability.recordEvent(
					"redis.cache.hit_rate",
					cacheMetrics.hitRate,
				);
				this.observability.recordEvent(
					"redis.cache.operations",
					cacheMetrics.totalOperations,
				);
				this.observability.recordEvent(
					"redis.cache.errors",
					cacheMetrics.errors,
				);

				// Record connection metrics
				this.observability.recordEvent(
					"redis.connections.total",
					metrics.connections.total,
				);

				// Log metrics summary in development
				if (process.env.NODE_ENV === "development") {
					console.log("Redis metrics:", {
						cache: {
							hitRate: `${(cacheMetrics.hitRate * 100).toFixed(1)}%`,
							operations: cacheMetrics.totalOperations,
							errors: cacheMetrics.errors,
						},
						connections: metrics.connections.total,
						health: metrics.health.overall,
					});
				}
			} catch (error) {
				console.error("Redis metrics collection failed:", error);
				this.observability.recordError(
					"redis.metrics.collection.error",
					error as Error,
				);
			}
		}, interval);
	}
}

// Convenience exports
export const redisService = RedisService.getInstance();

// Lazy-loaded cache and client to avoid initialization issues
export function getRedisCache() {
	return redisService.cache;
}

export function getRedisClient() {
	return redisService.client;
}

// For backward compatibility, but these will throw if not initialized
export const redisCache = new Proxy({} as any, {
	get(target, prop) {
		return redisService.cache[prop as keyof typeof redisService.cache];
	},
});

export const redisClient = new Proxy({} as any, {
	get(target, prop) {
		return redisService.client[prop as keyof typeof redisService.client];
	},
});

// Initialize Redis service (call this in your app startup)
export async function initializeRedis(): Promise<void> {
	try {
		await redisService.initialize();
	} catch (error) {
		console.warn(
			"Redis initialization failed, falling back to mock Redis:",
			error,
		);
		// Fall back to mock Redis
		const { initializeMockRedis, mockRedisCache } = await import(
			"./mock-redis"
		);
		await initializeMockRedis();

		// Replace the cache with mock cache
		Object.defineProperty(redisService, "cache", {
			value: mockRedisCache,
			writable: false,
			configurable: true,
		});
		Object.defineProperty(redisService, "isInitialized", {
			value: true,
			writable: false,
			configurable: true,
		});
	}
}

// Graceful shutdown (call this in your app shutdown)
export async function shutdownRedis(): Promise<void> {
	await redisService.shutdown();
}

// Export all services
export { CacheService } from "./cache-service";
// Export configuration and utilities
export * from "./config";
export { JobQueueService } from "./job-queue-service";
export { LockService } from "./lock-service";
export { MetricsService } from "./metrics-service";
// Export mock implementations for testing
export { MockRedisCache, MockRedisService } from "./mock-redis";
export { PubSubService } from "./pubsub-service";
export { RateLimitService } from "./rate-limit-service";

export { RedisClientManager } from "./redis-client";
export { SessionService } from "./session-service";

export * from "./types";

// Convenience getters for individual services
export function getRedisPubSub() {
	return redisService.pubsub;
}

export function getRedisLocks() {
	return redisService.locks;
}

export function getRedisRateLimit() {
	return redisService.rateLimit;
}

export function getRedisJobQueue() {
	return redisService.jobQueue;
}

export function getRedisMetrics() {
	return redisService.metrics;
}

export function getRedisSessions() {
	return redisService.sessions;
}
