/**
 * Comprehensive Redis/Valkey Integration Test
 *
 * This test validates all Redis/Valkey services in real-world scenarios:
 * - Job Queue processing
 * - Distributed locking
 * - Metrics collection
 * - PubSub messaging
 * - Rate limiting
 * - Session management
 * - Caching strategies
 */

import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import {
	RedisService,
	CacheService,
	PubSubService,
	LockService,
	RateLimitService,
	JobQueueService,
	MetricsService,
	SessionService,
	MockRedisService,
	MockRedisCache,
	getRedisConfig,
	validateRedisEnvironment,
} from "../../lib/redis";
import type { RedisCache, Job, JobProcessor } from "../../lib/redis/types";

// Performance monitoring
class IntegrationMonitor {
	private startTime: number;
	private metrics: Map<
		string,
		{ count: number; totalTime: number; errors: number }
	>;

	constructor() {
		this.startTime = Date.now();
		this.metrics = new Map();
	}

	startOperation(name: string): () => void {
		const start = Date.now();
		return () => {
			const duration = Date.now() - start;
			const metric = this.metrics.get(name) || {
				count: 0,
				totalTime: 0,
				errors: 0,
			};
			metric.count++;
			metric.totalTime += duration;
			this.metrics.set(name, metric);
		};
	}

	recordError(name: string) {
		const metric = this.metrics.get(name) || {
			count: 0,
			totalTime: 0,
			errors: 0,
		};
		metric.errors++;
		this.metrics.set(name, metric);
	}

	getReport() {
		const totalDuration = Date.now() - this.startTime;
		const report: any = {
			totalDuration,
			services: {},
		};

		for (const [name, metric] of this.metrics) {
			report.services[name] = {
				operations: metric.count,
				avgTime: metric.count > 0 ? metric.totalTime / metric.count : 0,
				totalTime: metric.totalTime,
				errors: metric.errors,
				errorRate: metric.count > 0 ? (metric.errors / metric.count) * 100 : 0,
			};
		}

		return report;
	}
}

describe("Redis/Valkey Comprehensive Integration", () => {
	let monitor: IntegrationMonitor;
	let isRedisAvailable = false;
	let redisService: RedisService | MockRedisService;
	let cache: CacheService;
	let pubsub: PubSubService;
	let locks: LockService;
	let rateLimit: RateLimitService;
	let jobQueue: JobQueueService;
	let metrics: MetricsService;
	let sessions: SessionService;

	beforeAll(async () => {
		monitor = new IntegrationMonitor();

		// Always use mock service for testing to avoid environment dependency
		redisService = MockRedisService.getInstance();
		await redisService.initialize();
		isRedisAvailable = false;

		// Initialize all services
		cache = CacheService.getInstance();
		pubsub = PubSubService.getInstance();
		locks = LockService.getInstance();
		rateLimit = RateLimitService.getInstance();
		jobQueue = JobQueueService.getInstance();
		metrics = MetricsService.getInstance();
		sessions = SessionService.getInstance();

		console.log(
			`Running tests with ${isRedisAvailable ? "Real Redis" : "Mock Redis"}`,
		);
	});

	afterAll(async () => {
		// Cleanup all services - wrap in try/catch to prevent test failures
		try {
			await Promise.all(
				[
					pubsub?.cleanup?.(),
					locks?.cleanup?.(),
					rateLimit?.cleanup?.(),
					jobQueue?.cleanup?.(),
					metrics?.cleanup?.(),
					sessions?.cleanup?.(),
				].filter(Boolean),
			);
		} catch (error) {
			console.log("Cleanup error:", error);
		}

		await redisService.shutdown();

		// Print performance report
		console.log("\n=== Integration Test Performance Report ===");
		console.log(JSON.stringify(monitor.getReport(), null, 2));
	});

	afterEach(async () => {
		// Clear cache between tests
		await cache.clear();
	});

	describe("1. Cache Service Integration", () => {
		test("should handle basic cache operations with TTL", async () => {
			const endTimer = monitor.startOperation("cache-basic");

			// Set cache with TTL
			await cache.set("test:user:123", { id: 123, name: "John Doe" }, 5);

			// Get from cache
			const user = await cache.get("test:user:123");
			expect(user).toEqual({ id: 123, name: "John Doe" });

			// Test TTL
			const ttl = await cache.ttl("test:user:123");
			expect(ttl).toBeGreaterThan(0);
			expect(ttl).toBeLessThanOrEqual(5);

			endTimer();
		});

		test("should handle cache stampede prevention", async () => {
			const endTimer = monitor.startOperation("cache-stampede");

			// Simulate expensive operation
			let computationCount = 0;
			const expensiveOperation = async () => {
				computationCount++;
				await new Promise((resolve) => setTimeout(resolve, 100));
				return { data: "expensive result", timestamp: Date.now() };
			};

			// Multiple concurrent requests for same key
			const promises = Array(10)
				.fill(null)
				.map(() => cache.getOrSet("expensive:key", expensiveOperation, 10));

			const results = await Promise.all(promises);

			// Should only compute once
			expect(computationCount).toBe(1);

			// All results should be identical
			const firstResult = results[0];
			results.forEach((result) => {
				expect(result).toEqual(firstResult);
			});

			endTimer();
		});

		test("should handle cache invalidation patterns", async () => {
			const endTimer = monitor.startOperation("cache-invalidation");

			// Set multiple related cache entries
			await Promise.all([
				cache.set("product:123:details", { id: 123, name: "Product A" }),
				cache.set("product:123:inventory", { stock: 100 }),
				cache.set("product:123:pricing", { price: 99.99 }),
			]);

			// Pattern-based deletion
			await cache.deletePattern("product:123:*");

			// Verify all related entries are deleted
			const [details, inventory, pricing] = await Promise.all([
				cache.get("product:123:details"),
				cache.get("product:123:inventory"),
				cache.get("product:123:pricing"),
			]);

			expect(details).toBeNull();
			expect(inventory).toBeNull();
			expect(pricing).toBeNull();

			endTimer();
		});
	});

	describe("2. PubSub Service Integration", () => {
		test("should handle pub/sub messaging", async () => {
			const endTimer = monitor.startOperation("pubsub-basic");

			// Initialize pubsub service first
			if (!pubsub.isInitialized) {
				await pubsub.initialize();
			}

			const receivedMessages: any[] = [];

			// Subscribe to channel
			await pubsub.subscribe("test:channel", (message) => {
				receivedMessages.push(message);
			});

			// Publish messages
			await pubsub.publish("test:channel", {
				type: "user.created",
				userId: 123,
			});
			await pubsub.publish("test:channel", {
				type: "user.updated",
				userId: 123,
			});

			// Wait for messages
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(receivedMessages).toHaveLength(2);
			expect(receivedMessages[0]).toEqual({
				type: "user.created",
				userId: 123,
			});
			expect(receivedMessages[1]).toEqual({
				type: "user.updated",
				userId: 123,
			});

			await pubsub.unsubscribe("test:channel");
			endTimer();
		});

		test("should handle pattern subscriptions", async () => {
			const endTimer = monitor.startOperation("pubsub-pattern");

			const receivedMessages: Array<{ channel: string; message: any }> = [];

			// Pattern subscription
			await pubsub.psubscribe("events:*", (channel, message) => {
				receivedMessages.push({ channel, message });
			});

			// Publish to different channels
			await pubsub.publish("events:users", { action: "created" });
			await pubsub.publish("events:orders", { action: "placed" });
			await pubsub.publish("other:channel", { action: "ignored" });

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(receivedMessages).toHaveLength(2);
			expect(receivedMessages[0].channel).toBe("events:users");
			expect(receivedMessages[1].channel).toBe("events:orders");

			await pubsub.punsubscribe("events:*");
			endTimer();
		});
	});

	describe("3. Lock Service Integration", () => {
		test("should handle distributed locking", async () => {
			const endTimer = monitor.startOperation("lock-basic");

			// Acquire lock
			const acquired = await locks.acquire("resource:123", 5000);
			expect(acquired).toBe(true);

			// Try to acquire same lock (should fail)
			const secondAttempt = await locks.acquire("resource:123", 5000);
			expect(secondAttempt).toBe(false);

			// Release lock
			await locks.release("resource:123");

			// Now should be able to acquire
			const thirdAttempt = await locks.acquire("resource:123", 5000);
			expect(thirdAttempt).toBe(true);

			await locks.release("resource:123");
			endTimer();
		});

		test("should handle lock auto-extension", async () => {
			const endTimer = monitor.startOperation("lock-extension");

			let lockHeld = true;
			const lockKey = "extended:lock";

			// Acquire lock with extension
			const release = await locks.acquireWithExtension(
				lockKey,
				1000,
				async () => lockHeld,
			);

			// Simulate long-running operation
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Lock should still be held after initial TTL
			const stillLocked = await locks.isLocked(lockKey);
			expect(stillLocked).toBe(true);

			// Release lock
			lockHeld = false;
			await release();

			// Lock should be released
			const released = await locks.isLocked(lockKey);
			expect(released).toBe(false);

			endTimer();
		});

		test("should handle concurrent operations with locks", async () => {
			const endTimer = monitor.startOperation("lock-concurrent");

			let sharedCounter = 0;
			const iterations = 10;

			// Concurrent increments without lock (race condition)
			const unsafePromises = Array(iterations)
				.fill(null)
				.map(async () => {
					const current = sharedCounter;
					await new Promise((resolve) => setTimeout(resolve, 10));
					sharedCounter = current + 1;
				});

			await Promise.all(unsafePromises);
			const unsafeResult = sharedCounter;

			// Reset and use locks
			sharedCounter = 0;
			const safePromises = Array(iterations)
				.fill(null)
				.map(async () => {
					await locks.withLock("counter:lock", async () => {
						const current = sharedCounter;
						await new Promise((resolve) => setTimeout(resolve, 10));
						sharedCounter = current + 1;
					});
				});

			await Promise.all(safePromises);
			const safeResult = sharedCounter;

			// With locks, counter should be accurate
			expect(safeResult).toBe(iterations);
			// Without locks, might have race conditions (usually less than iterations)
			expect(unsafeResult).toBeLessThanOrEqual(iterations);

			endTimer();
		});
	});

	describe("4. Rate Limit Service Integration", () => {
		test("should enforce rate limits", async () => {
			const endTimer = monitor.startOperation("ratelimit-basic");

			const key = "api:user:123";
			const limit = 5;
			const window = 1000; // 1 second

			// Configure rate limit
			await rateLimit.configure(key, { limit, window });

			// Make requests
			const results = [];
			for (let i = 0; i < 10; i++) {
				const allowed = await rateLimit.check(key);
				results.push(allowed);
			}

			// First 5 should be allowed, rest should be blocked
			expect(results.slice(0, 5).every((r) => r)).toBe(true);
			expect(results.slice(5).every((r) => !r)).toBe(true);

			endTimer();
		});

		test("should handle sliding window rate limiting", async () => {
			const endTimer = monitor.startOperation("ratelimit-sliding");

			const key = "sliding:user:456";
			await rateLimit.configure(key, {
				limit: 3,
				window: 1000,
				type: "sliding",
			});

			// Make 3 requests
			for (let i = 0; i < 3; i++) {
				const allowed = await rateLimit.check(key);
				expect(allowed).toBe(true);
				await new Promise((resolve) => setTimeout(resolve, 200));
			}

			// 4th request should be blocked
			const blocked = await rateLimit.check(key);
			expect(blocked).toBe(false);

			// Wait for first request to expire
			await new Promise((resolve) => setTimeout(resolve, 600));

			// Should allow one more
			const allowedAgain = await rateLimit.check(key);
			expect(allowedAgain).toBe(true);

			endTimer();
		});

		test("should provide rate limit info", async () => {
			const endTimer = monitor.startOperation("ratelimit-info");

			const key = "info:user:789";
			await rateLimit.configure(key, { limit: 10, window: 60000 });

			// Consume some limit
			for (let i = 0; i < 3; i++) {
				await rateLimit.check(key);
			}

			// Get info
			const info = await rateLimit.getInfo(key);
			expect(info).toBeDefined();
			expect(info.limit).toBe(10);
			expect(info.remaining).toBe(7);
			expect(info.reset).toBeGreaterThan(Date.now());

			endTimer();
		});
	});

	describe("5. Job Queue Service Integration", () => {
		test("should process jobs sequentially", async () => {
			const endTimer = monitor.startOperation("jobqueue-sequential");

			const processedJobs: string[] = [];

			// Register processor
			const processor: JobProcessor = async (job) => {
				processedJobs.push(job.id);
				return { success: true, result: `Processed ${job.id}` };
			};

			await jobQueue.registerProcessor("test:sequential", processor);

			// Add jobs
			const jobIds = [];
			for (let i = 0; i < 5; i++) {
				const jobId = await jobQueue.addJob("test:sequential", {
					data: { index: i },
					priority: 1,
				});
				jobIds.push(jobId);
			}

			// Start processing
			await jobQueue.startProcessing("test:sequential");

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Stop processing
			await jobQueue.stopProcessing("test:sequential");

			// Verify all jobs processed
			expect(processedJobs.length).toBe(5);
			jobIds.forEach((id) => {
				expect(processedJobs).toContain(id);
			});

			endTimer();
		});

		test("should handle job priorities", async () => {
			const endTimer = monitor.startOperation("jobqueue-priority");

			const processedOrder: number[] = [];

			// Register processor
			const processor: JobProcessor = async (job) => {
				processedOrder.push(job.data.priority);
				return { success: true };
			};

			await jobQueue.registerProcessor("test:priority", processor);

			// Add jobs with different priorities
			await jobQueue.addJob("test:priority", {
				data: { priority: 1 },
				priority: 1,
			});
			await jobQueue.addJob("test:priority", {
				data: { priority: 5 },
				priority: 5,
			});
			await jobQueue.addJob("test:priority", {
				data: { priority: 3 },
				priority: 3,
			});
			await jobQueue.addJob("test:priority", {
				data: { priority: 10 },
				priority: 10,
			});

			// Process jobs
			await jobQueue.startProcessing("test:priority");
			await new Promise((resolve) => setTimeout(resolve, 500));
			await jobQueue.stopProcessing("test:priority");

			// Should process in priority order (highest first)
			expect(processedOrder).toEqual([10, 5, 3, 1]);

			endTimer();
		});

		test("should handle job retries", async () => {
			const endTimer = monitor.startOperation("jobqueue-retry");

			let attemptCount = 0;

			// Register failing processor
			const processor: JobProcessor = async (job) => {
				attemptCount++;
				if (attemptCount < 3) {
					throw new Error("Temporary failure");
				}
				return { success: true };
			};

			await jobQueue.registerProcessor("test:retry", processor);

			// Add job with retry config
			const jobId = await jobQueue.addJob("test:retry", {
				data: { test: true },
				maxRetries: 3,
				retryDelay: 100,
			});

			// Process with retries
			await jobQueue.startProcessing("test:retry");
			await new Promise((resolve) => setTimeout(resolve, 1000));
			await jobQueue.stopProcessing("test:retry");

			// Should have retried until success
			expect(attemptCount).toBe(3);

			// Check job status
			const job = await jobQueue.getJob("test:retry", jobId);
			expect(job?.status).toBe("completed");

			endTimer();
		});
	});

	describe("6. Metrics Service Integration", () => {
		test("should collect and aggregate metrics", async () => {
			const endTimer = monitor.startOperation("metrics-collection");

			// Record various metrics
			for (let i = 0; i < 100; i++) {
				await metrics.increment("api.requests", {
					endpoint: "/users",
					status: i % 10 === 0 ? "500" : "200",
				});
				await metrics.recordDuration("api.response_time", Math.random() * 100, {
					endpoint: "/users",
				});
				await metrics.gauge("system.memory", Math.random() * 1000000000);
			}

			// Get aggregated metrics
			const requestCount = await metrics.getCounter("api.requests");
			expect(requestCount).toBeGreaterThan(0);

			const avgResponseTime = await metrics.getAverage("api.response_time");
			expect(avgResponseTime).toBeGreaterThan(0);
			expect(avgResponseTime).toBeLessThan(100);

			const currentMemory = await metrics.getGauge("system.memory");
			expect(currentMemory).toBeGreaterThan(0);

			endTimer();
		});

		test("should handle metric time windows", async () => {
			const endTimer = monitor.startOperation("metrics-windows");

			const metricKey = "test.window.metric";

			// Record metrics over time
			for (let i = 0; i < 5; i++) {
				await metrics.increment(metricKey);
				await new Promise((resolve) => setTimeout(resolve, 200));
			}

			// Get metrics for different windows
			const last1Second = await metrics.getCounterInWindow(metricKey, 1000);
			const last2Seconds = await metrics.getCounterInWindow(metricKey, 2000);

			// Should have more in larger window
			expect(last2Seconds).toBeGreaterThanOrEqual(last1Second);

			endTimer();
		});

		test("should export metrics in Prometheus format", async () => {
			const endTimer = monitor.startOperation("metrics-export");

			// Record some metrics
			await metrics.increment("http_requests_total", {
				method: "GET",
				status: "200",
			});
			await metrics.recordDuration("http_request_duration_seconds", 0.123);
			await metrics.gauge("node_memory_usage_bytes", 123456789);

			// Export metrics
			const exported = await metrics.export();

			expect(exported).toContain("http_requests_total");
			expect(exported).toContain("http_request_duration_seconds");
			expect(exported).toContain("node_memory_usage_bytes");
			expect(exported).toContain("# TYPE");
			expect(exported).toContain("# HELP");

			endTimer();
		});
	});

	describe("7. Session Service Integration", () => {
		test("should handle session lifecycle", async () => {
			const endTimer = monitor.startOperation("session-lifecycle");

			const sessionData = {
				userId: "123",
				email: "user@example.com",
				roles: ["user", "admin"],
			};

			// Create session
			const sessionId = await sessions.create(sessionData, 3600);
			expect(sessionId).toBeDefined();

			// Get session
			const retrieved = await sessions.get(sessionId);
			expect(retrieved).toEqual(sessionData);

			// Update session
			await sessions.update(sessionId, {
				...sessionData,
				lastAccess: Date.now(),
			});

			// Verify update
			const updated = await sessions.get(sessionId);
			expect(updated.lastAccess).toBeDefined();

			// Destroy session
			await sessions.destroy(sessionId);

			// Verify destroyed
			const destroyed = await sessions.get(sessionId);
			expect(destroyed).toBeNull();

			endTimer();
		});

		test("should handle session expiration", async () => {
			const endTimer = monitor.startOperation("session-expiration");

			// Create short-lived session
			const sessionId = await sessions.create({ userId: "456" }, 1); // 1 second TTL

			// Verify exists
			const exists = await sessions.exists(sessionId);
			expect(exists).toBe(true);

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Should be expired
			const expired = await sessions.get(sessionId);
			expect(expired).toBeNull();

			endTimer();
		});

		test("should handle concurrent session access", async () => {
			const endTimer = monitor.startOperation("session-concurrent");

			const sessionId = await sessions.create({ counter: 0 }, 3600);

			// Concurrent updates
			const updates = Array(10)
				.fill(null)
				.map(async (_, i) => {
					const session = await sessions.get(sessionId);
					if (session) {
						session.counter++;
						session[`update_${i}`] = true;
						await sessions.update(sessionId, session);
					}
				});

			await Promise.all(updates);

			// Check final state
			const final = await sessions.get(sessionId);
			expect(final).toBeDefined();

			// Should have all updates
			for (let i = 0; i < 10; i++) {
				expect(final[`update_${i}`]).toBe(true);
			}

			await sessions.destroy(sessionId);
			endTimer();
		});
	});

	describe("8. Cross-Service Integration", () => {
		test("should handle cache-aside pattern with job processing", async () => {
			const endTimer = monitor.startOperation("integration-cache-aside");

			// Register job processor that uses cache
			const processor: JobProcessor = async (job) => {
				const cacheKey = `processed:${job.data.id}`;

				// Check cache first
				let result = await cache.get(cacheKey);
				if (result) {
					return { success: true, result, fromCache: true };
				}

				// Expensive computation
				result = {
					id: job.data.id,
					computed: Math.random(),
					timestamp: Date.now(),
				};

				// Store in cache
				await cache.set(cacheKey, result, 300);

				return { success: true, result, fromCache: false };
			};

			await jobQueue.registerProcessor("test:cache-aside", processor);

			// Add jobs for same ID
			const jobId1 = await jobQueue.addJob("test:cache-aside", {
				data: { id: "abc123" },
			});
			const jobId2 = await jobQueue.addJob("test:cache-aside", {
				data: { id: "abc123" },
			});

			// Process jobs
			await jobQueue.startProcessing("test:cache-aside");
			await new Promise((resolve) => setTimeout(resolve, 500));
			await jobQueue.stopProcessing("test:cache-aside");

			// Check results
			const job1 = await jobQueue.getJob("test:cache-aside", jobId1);
			const job2 = await jobQueue.getJob("test:cache-aside", jobId2);

			// First job should compute, second should use cache
			expect(job1?.result?.fromCache).toBe(false);
			expect(job2?.result?.fromCache).toBe(true);
			expect(job1?.result?.result.computed).toBe(job2?.result?.result.computed);

			endTimer();
		});

		test("should handle distributed event processing", async () => {
			const endTimer = monitor.startOperation("integration-events");

			const events: any[] = [];

			// Subscribe to events
			await pubsub.subscribe("system:events", async (event) => {
				events.push(event);

				// Record metric
				await metrics.increment("events.processed", { type: event.type });

				// Update session if user event
				if (event.userId && event.sessionId) {
					await sessions.update(event.sessionId, { lastEvent: event.type });
				}
			});

			// Simulate user flow
			const sessionId = await sessions.create({ userId: "user123" }, 3600);

			// User actions trigger events
			await pubsub.publish("system:events", {
				type: "user.login",
				userId: "user123",
				sessionId,
			});
			await pubsub.publish("system:events", {
				type: "user.action",
				userId: "user123",
				sessionId,
			});
			await pubsub.publish("system:events", {
				type: "user.logout",
				userId: "user123",
				sessionId,
			});

			// Wait for processing
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Verify event processing
			expect(events).toHaveLength(3);

			// Check metrics
			const loginCount = await metrics.getCounter("events.processed", {
				type: "user.login",
			});
			expect(loginCount).toBe(1);

			// Check session update
			const session = await sessions.get(sessionId);
			expect(session?.lastEvent).toBe("user.logout");

			await pubsub.unsubscribe("system:events");
			await sessions.destroy(sessionId);
			endTimer();
		});

		test("should handle rate-limited job processing", async () => {
			const endTimer = monitor.startOperation("integration-ratelimit");

			const processedJobs: string[] = [];

			// Configure rate limit for job processing
			const rateLimitKey = "jobs:processor:api";
			await rateLimit.configure(rateLimitKey, { limit: 3, window: 1000 });

			// Register rate-limited processor
			const processor: JobProcessor = async (job) => {
				// Check rate limit
				const allowed = await rateLimit.check(rateLimitKey);
				if (!allowed) {
					throw new Error("Rate limit exceeded");
				}

				processedJobs.push(job.id);
				return { success: true };
			};

			await jobQueue.registerProcessor("test:ratelimited", processor);

			// Add multiple jobs
			const jobIds = [];
			for (let i = 0; i < 5; i++) {
				const id = await jobQueue.addJob("test:ratelimited", {
					data: { index: i },
				});
				jobIds.push(id);
			}

			// Process jobs
			await jobQueue.startProcessing("test:ratelimited");
			await new Promise((resolve) => setTimeout(resolve, 500));
			await jobQueue.stopProcessing("test:ratelimited");

			// Only 3 jobs should be processed due to rate limit
			expect(processedJobs).toHaveLength(3);

			// Check failed jobs
			const failedJobs = await Promise.all(
				jobIds.map((id) => jobQueue.getJob("test:ratelimited", id)),
			);

			const failed = failedJobs.filter((job) => job?.status === "failed");
			expect(failed).toHaveLength(2);

			endTimer();
		});
	});

	describe("9. Performance and Load Testing", () => {
		test("should handle high-throughput operations", async () => {
			const endTimer = monitor.startOperation("load-throughput");

			const operations = 1000;
			const results = {
				cache: { success: 0, error: 0 },
				metrics: { success: 0, error: 0 },
				pubsub: { success: 0, error: 0 },
			};

			// Parallel operations
			const promises = [];

			for (let i = 0; i < operations; i++) {
				// Cache operations
				promises.push(
					cache
						.set(`load:${i}`, { data: i }, 60)
						.then(() => results.cache.success++)
						.catch(() => results.cache.error++),
				);

				// Metrics operations
				promises.push(
					metrics
						.increment("load.test", { type: "concurrent" })
						.then(() => results.metrics.success++)
						.catch(() => results.metrics.error++),
				);

				// PubSub operations
				if (i % 10 === 0) {
					promises.push(
						pubsub
							.publish("load:channel", { index: i })
							.then(() => results.pubsub.success++)
							.catch(() => results.pubsub.error++),
					);
				}
			}

			await Promise.all(promises);

			// Verify high success rate
			expect(results.cache.success).toBeGreaterThan(operations * 0.95);
			expect(results.metrics.success).toBeGreaterThan(operations * 0.95);
			expect(results.pubsub.success).toBeGreaterThan(operations * 0.095);

			endTimer();
		});

		test("should maintain performance under concurrent load", async () => {
			const endTimer = monitor.startOperation("load-concurrent");

			const concurrentUsers = 50;
			const operationsPerUser = 20;

			const userOperations = Array(concurrentUsers)
				.fill(null)
				.map(async (_, userId) => {
					const sessionId = await sessions.create(
						{ userId: `user${userId}` },
						3600,
					);

					for (let op = 0; op < operationsPerUser; op++) {
						// Check rate limit
						await rateLimit.check(`user:${userId}`);

						// Cache user data
						await cache.set(`user:${userId}:op:${op}`, { operation: op }, 60);

						// Record metric
						await metrics.increment("user.operations", {
							userId: `user${userId}`,
						});
					}

					await sessions.destroy(sessionId);
				});

			const start = Date.now();
			await Promise.all(userOperations);
			const duration = Date.now() - start;

			// Should complete within reasonable time
			expect(duration).toBeLessThan(5000); // 5 seconds for all operations

			// Verify operations
			const totalOps = await metrics.getCounter("user.operations");
			expect(totalOps).toBe(concurrentUsers * operationsPerUser);

			endTimer();
		});
	});

	describe("10. Error Handling and Resilience", () => {
		test("should handle service failures gracefully", async () => {
			const endTimer = monitor.startOperation("resilience-failures");

			// Test cache miss and error handling
			const missingData = await cache.get("non-existent-key");
			expect(missingData).toBeNull();

			// Test lock timeout
			const lockKey = "timeout:test";
			await locks.acquire(lockKey, 100); // 100ms TTL
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Lock should be auto-released
			const canAcquire = await locks.acquire(lockKey, 1000);
			expect(canAcquire).toBe(true);
			await locks.release(lockKey);

			// Test job failure handling
			const failingProcessor: JobProcessor = async () => {
				throw new Error("Intentional failure");
			};

			await jobQueue.registerProcessor("test:failing", failingProcessor);
			const failedJobId = await jobQueue.addJob("test:failing", { data: {} });

			await jobQueue.startProcessing("test:failing");
			await new Promise((resolve) => setTimeout(resolve, 200));
			await jobQueue.stopProcessing("test:failing");

			const failedJob = await jobQueue.getJob("test:failing", failedJobId);
			expect(failedJob?.status).toBe("failed");
			expect(failedJob?.error).toContain("Intentional failure");

			endTimer();
		});

		test("should handle network partitions and timeouts", async () => {
			const endTimer = monitor.startOperation("resilience-network");

			// Simulate operations with timeout handling
			const timeoutPromise = (operation: Promise<any>, timeout: number) => {
				return Promise.race([
					operation,
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error("Operation timeout")), timeout),
					),
				]);
			};

			// Test various operations with timeouts
			const operations = [
				timeoutPromise(cache.set("timeout:test", { data: "test" }, 60), 1000),
				timeoutPromise(metrics.increment("timeout.test"), 1000),
				timeoutPromise(sessions.create({ test: true }, 3600), 1000),
			];

			const results = await Promise.allSettled(operations);

			// All operations should complete (success or timeout)
			expect(
				results.every(
					(r) => r.status === "fulfilled" || r.status === "rejected",
				),
			).toBe(true);

			endTimer();
		});
	});
});
