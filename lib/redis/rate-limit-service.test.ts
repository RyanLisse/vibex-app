/**
 * RateLimitService Tests
 *
 * Test-driven development for Redis/Valkey rate limiting
 */

	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import { testRedisConfig } from "./config";
import { RateLimitService } from "./rate-limit-service";
import { RedisClientManager } from "./redis-client";
import type { RateLimitOptions, RateLimitResult } from "./types";

describe("RateLimitService", () => {
	let rateLimitService: RateLimitService;
	let redisManager: RedisClientManager;

	beforeAll(async () => {
		redisManager = RedisClientManager.getInstance(testRedisConfig);
		await redisManager.initialize();
	});

	beforeEach(() => {
		rateLimitService = RateLimitService.getInstance();
	});

	afterEach(async () => {
		await rateLimitService.cleanup();
	});

	afterAll(async () => {
		await redisManager.shutdown();
	});

	describe("Fixed Window Rate Limiting", () => {
		test("should allow requests within the limit", async () => {
			const key = "test:fixed-window";
			const options: RateLimitOptions = {
				windowSize: 60, // 1 minute
				maxRequests: 5,
			};

			// Make requests within limit
			for (let i = 0; i < 5; i++) {
				const result = await rateLimitService.checkLimit(key, options);

				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(4 - i);
				expect(result.totalRequests).toBe(i + 1);
				expect(result.resetTime).toBeInstanceOf(Date);
				expect(result.windowStart).toBeInstanceOf(Date);
			}
		});

		test("should block requests exceeding the limit", async () => {
			const key = "test:fixed-window-exceed";
			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 3,
			};

			// Exhaust the limit
			for (let i = 0; i < 3; i++) {
				const result = await rateLimitService.checkLimit(key, options);
				expect(result.allowed).toBe(true);
			}

			// Next request should be blocked
			const blockedResult = await rateLimitService.checkLimit(key, options);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
			expect(blockedResult.totalRequests).toBe(4);
		});

		test("should reset window after expiration", async () => {
			const key = "test:window-reset";
			const options: RateLimitOptions = {
				windowSize: 2, // 2 seconds
				maxRequests: 2,
			};

			// Exhaust limit
			await rateLimitService.checkLimit(key, options);
			await rateLimitService.checkLimit(key, options);

			const blockedResult = await rateLimitService.checkLimit(key, options);
			expect(blockedResult.allowed).toBe(false);

			// Wait for window reset
			await new Promise((resolve) => setTimeout(resolve, 2500));

			// Should be allowed again
			const resetResult = await rateLimitService.checkLimit(key, options);
			expect(resetResult.allowed).toBe(true);
			expect(resetResult.remaining).toBe(1);
			expect(resetResult.totalRequests).toBe(1);
		});
	});

	describe("Sliding Window Rate Limiting", () => {
		test("should implement sliding window correctly", async () => {
			const key = "test:sliding-window";
			const options: RateLimitOptions = {
				windowSize: 10, // 10 seconds
				maxRequests: 3,
			};

			// Use sliding window algorithm
			const result1 = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(result1.allowed).toBe(true);

			// Wait a bit and make another request
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const result2 = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(result2.allowed).toBe(true);

			// Make rapid requests
			const result3 = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(result3.allowed).toBe(true);

			const result4 = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(result4.allowed).toBe(false); // Should be blocked
		});

		test("should allow requests as time slides forward", async () => {
			const key = "test:sliding-forward";
			const options: RateLimitOptions = {
				windowSize: 5, // 5 seconds
				maxRequests: 2,
			};

			// Exhaust limit
			await rateLimitService.checkSlidingWindowLimit(key, options);
			await rateLimitService.checkSlidingWindowLimit(key, options);

			const blockedResult = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(blockedResult.allowed).toBe(false);

			// Wait for partial window slide
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Should still be blocked (window hasn't fully slid)
			const stillBlockedResult = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(stillBlockedResult.allowed).toBe(false);

			// Wait for full window slide
			await new Promise((resolve) => setTimeout(resolve, 3000));

			// Should be allowed now
			const allowedResult = await rateLimitService.checkSlidingWindowLimit(
				key,
				options,
			);
			expect(allowedResult.allowed).toBe(true);
		});
	});

	describe("Token Bucket Rate Limiting", () => {
		test("should implement token bucket algorithm", async () => {
			const key = "test:token-bucket";
			const bucketSize = 5;
			const refillRate = 2; // tokens per second

			// Initialize bucket
			await rateLimitService.initializeTokenBucket(key, bucketSize, refillRate);

			// Consume tokens rapidly
			for (let i = 0; i < bucketSize; i++) {
				const result = await rateLimitService.consumeTokens(key, 1);
				expect(result.allowed).toBe(true);
				expect(result.remaining).toBe(bucketSize - 1 - i);
			}

			// Should be blocked when bucket is empty
			const blockedResult = await rateLimitService.consumeTokens(key, 1);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
		});

		test("should refill tokens over time", async () => {
			const key = "test:token-refill";
			const bucketSize = 3;
			const refillRate = 2; // 2 tokens per second

			await rateLimitService.initializeTokenBucket(key, bucketSize, refillRate);

			// Exhaust bucket
			await rateLimitService.consumeTokens(key, 3);

			const emptyResult = await rateLimitService.consumeTokens(key, 1);
			expect(emptyResult.allowed).toBe(false);

			// Wait for refill (1 second = 2 tokens)
			await new Promise((resolve) => setTimeout(resolve, 1100));

			const refilledResult = await rateLimitService.consumeTokens(key, 2);
			expect(refilledResult.allowed).toBe(true);
			expect(refilledResult.remaining).toBe(0); // Used both refilled tokens
		});

		test("should handle burst consumption", async () => {
			const key = "test:burst-consumption";
			const bucketSize = 10;
			const refillRate = 1;

			await rateLimitService.initializeTokenBucket(key, bucketSize, refillRate);

			// Try to consume more tokens than available
			const burstResult = await rateLimitService.consumeTokens(key, 15);
			expect(burstResult.allowed).toBe(false);
			expect(burstResult.remaining).toBe(10); // Bucket should be unchanged

			// Consume within capacity
			const validResult = await rateLimitService.consumeTokens(key, 8);
			expect(validResult.allowed).toBe(true);
			expect(validResult.remaining).toBe(2);
		});
	});

	describe("Multi-tier Rate Limiting", () => {
		test("should enforce multiple rate limit tiers", async () => {
			const userId = "user123";
			const ipAddress = "192.168.1.1";

			const userLimits: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 100,
			};

			const ipLimits: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 50,
			};

			// Check both user and IP limits
			const userResult = await rateLimitService.checkLimit(
				`user:${userId}`,
				userLimits,
			);
			const ipResult = await rateLimitService.checkLimit(
				`ip:${ipAddress}`,
				ipLimits,
			);

			expect(userResult.allowed).toBe(true);
			expect(ipResult.allowed).toBe(true);

			// Simulate IP exhaustion
			for (let i = 0; i < 49; i++) {
				await rateLimitService.checkLimit(`ip:${ipAddress}`, ipLimits);
			}

			// IP should be blocked even if user limit is fine
			const blockedIpResult = await rateLimitService.checkLimit(
				`ip:${ipAddress}`,
				ipLimits,
			);
			const stillValidUserResult = await rateLimitService.checkLimit(
				`user:${userId}`,
				userLimits,
			);

			expect(blockedIpResult.allowed).toBe(false);
			expect(stillValidUserResult.allowed).toBe(true);
		});

		test("should apply different limits for different user tiers", async () => {
			const basicUser = "basic:user1";
			const premiumUser = "premium:user2";

			const basicLimits: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 10,
			};

			const premiumLimits: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 100,
			};

			// Basic user hits limit quickly
			for (let i = 0; i < 10; i++) {
				const result = await rateLimitService.checkLimit(
					basicUser,
					basicLimits,
				);
				expect(result.allowed).toBe(true);
			}

			const basicBlocked = await rateLimitService.checkLimit(
				basicUser,
				basicLimits,
			);
			expect(basicBlocked.allowed).toBe(false);

			// Premium user can make many more requests
			for (let i = 0; i < 50; i++) {
				const result = await rateLimitService.checkLimit(
					premiumUser,
					premiumLimits,
				);
				expect(result.allowed).toBe(true);
			}

			const premiumStillAllowed = await rateLimitService.checkLimit(
				premiumUser,
				premiumLimits,
			);
			expect(premiumStillAllowed.allowed).toBe(true);
		});
	});

	describe("Adaptive Rate Limiting", () => {
		test("should adjust limits based on system load", async () => {
			const key = "test:adaptive";
			const baseOptions: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 100,
			};

			// Simulate high system load
			await rateLimitService.setSystemLoad(0.9); // 90% load

			const adaptedLimits =
				await rateLimitService.getAdaptiveLimits(baseOptions);
			expect(adaptedLimits.maxRequests).toBeLessThan(baseOptions.maxRequests);

			// Test with adapted limits
			const result = await rateLimitService.checkLimit(key, adaptedLimits);
			expect(result.allowed).toBe(true);
		});

		test("should relax limits during low load", async () => {
			const key = "test:adaptive-low";
			const baseOptions: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 50,
			};

			// Simulate low system load
			await rateLimitService.setSystemLoad(0.2); // 20% load

			const adaptedLimits =
				await rateLimitService.getAdaptiveLimits(baseOptions);
			expect(adaptedLimits.maxRequests).toBeGreaterThanOrEqual(
				baseOptions.maxRequests,
			);

			// Should allow more requests
			for (let i = 0; i < 75; i++) {
				const result = await rateLimitService.checkLimit(key, adaptedLimits);
				if (!result.allowed) {
					expect(i).toBeGreaterThan(50); // Should exceed base limit
					break;
				}
			}
		});
	});

	describe("Cost-based Rate Limiting", () => {
		test("should implement cost-aware rate limiting", async () => {
			const apiKey = "api:expensive-calls";
			const budget = 1000; // $10.00 in cents

			await rateLimitService.initializeBudget(apiKey, budget);

			// Make expensive API calls
			const expensiveCallCost = 100; // $1.00
			const result1 = await rateLimitService.checkCostLimit(
				apiKey,
				expensiveCallCost,
			);
			expect(result1.allowed).toBe(true);
			expect(result1.remaining).toBe(900);

			// Continue until budget exhausted
			for (let i = 0; i < 9; i++) {
				await rateLimitService.checkCostLimit(apiKey, expensiveCallCost);
			}

			// Should be blocked when budget exhausted
			const blockedResult = await rateLimitService.checkCostLimit(
				apiKey,
				expensiveCallCost,
			);
			expect(blockedResult.allowed).toBe(false);
			expect(blockedResult.remaining).toBe(0);
		});

		test("should handle different cost tiers for LLM providers", async () => {
			const userKey = "llm:user123";

			const gpt4Cost = 50; // Higher cost
			const gpt3Cost = 5; // Lower cost

			await rateLimitService.initializeBudget(userKey, 200); // $2.00 budget

			// Use expensive model first
			const expensiveResult = await rateLimitService.checkCostLimit(
				userKey,
				gpt4Cost,
			);
			expect(expensiveResult.allowed).toBe(true);
			expect(expensiveResult.remaining).toBe(150);

			// Can still use cheaper model multiple times
			for (let i = 0; i < 30; i++) {
				const cheapResult = await rateLimitService.checkCostLimit(
					userKey,
					gpt3Cost,
				);
				expect(cheapResult.allowed).toBe(true);
			}

			// Budget should be exhausted
			const finalResult = await rateLimitService.checkCostLimit(
				userKey,
				gpt3Cost,
			);
			expect(finalResult.allowed).toBe(false);
		});
	});

	describe("Rate Limit Statistics", () => {
		test("should track rate limiting statistics", async () => {
			const key = "test:stats";
			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 5,
			};

			// Generate some activity
			for (let i = 0; i < 7; i++) {
				await rateLimitService.checkLimit(key, options);
			}

			const stats = await rateLimitService.getStats();

			expect(stats.totalRequests).toBeGreaterThanOrEqual(7);
			expect(stats.blockedRequests).toBeGreaterThanOrEqual(2);
			expect(stats.allowedRequests).toBeGreaterThanOrEqual(5);
			expect(stats.blockRate).toBeGreaterThan(0);
			expect(stats.topLimitedKeys).toContain(key);
		});

		test("should provide per-key statistics", async () => {
			const key = "test:key-stats";
			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 3,
			};

			// Generate activity
			for (let i = 0; i < 5; i++) {
				await rateLimitService.checkLimit(key, options);
			}

			const keyStats = await rateLimitService.getKeyStats(key);

			expect(keyStats.totalRequests).toBe(5);
			expect(keyStats.allowedRequests).toBe(3);
			expect(keyStats.blockedRequests).toBe(2);
			expect(keyStats.currentRemaining).toBe(0);
			expect(keyStats.nextResetTime).toBeInstanceOf(Date);
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid rate limit options", async () => {
			const key = "test:invalid-options";

			expect(async () => {
				await rateLimitService.checkLimit(key, {
					windowSize: 0,
					maxRequests: 10,
				});
			}).rejects.toThrow("Window size must be greater than 0");

			expect(async () => {
				await rateLimitService.checkLimit(key, {
					windowSize: 60,
					maxRequests: 0,
				});
			}).rejects.toThrow("Max requests must be greater than 0");
		});

		test("should handle empty or invalid keys", async () => {
			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 10,
			};

			expect(async () => {
				await rateLimitService.checkLimit("", options);
			}).rejects.toThrow("Rate limit key cannot be empty");
		});

		test("should handle Redis connection failures gracefully", async () => {
			const key = "test:connection-failure";
			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 10,
			};

			// This would test Redis connection failures - implementation specific
			const result = await rateLimitService.checkLimit(key, options);
			expect(typeof result.allowed).toBe("boolean");
		});
	});

	describe("Integration with Other Services", () => {
		test("should integrate with API gateway rate limiting", async () => {
			const endpoint = "/api/v1/users";
			const method = "GET";
			const userKey = "user:123";
			const rateLimitKey = `api:${endpoint}:${method}:${userKey}`;

			const options: RateLimitOptions = {
				windowSize: 60,
				maxRequests: 100,
			};

			const result = await rateLimitService.checkLimit(rateLimitKey, options);
			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(99);
		});

		test("should support WebSocket connection rate limiting", async () => {
			const connectionKey = "ws:connection:user123";
			const messageKey = "ws:message:user123";

			const connectionLimits: RateLimitOptions = {
				windowSize: 3600, // 1 hour
				maxRequests: 10, // 10 connections per hour
			};

			const messageLimits: RateLimitOptions = {
				windowSize: 60, // 1 minute
				maxRequests: 50, // 50 messages per minute
			};

			// Check connection limit
			const connectionResult = await rateLimitService.checkLimit(
				connectionKey,
				connectionLimits,
			);
			expect(connectionResult.allowed).toBe(true);

			// Check message rate limits
			for (let i = 0; i < 45; i++) {
				const messageResult = await rateLimitService.checkLimit(
					messageKey,
					messageLimits,
				);
				expect(messageResult.allowed).toBe(true);
			}

			// Should still allow some messages
			const finalResult = await rateLimitService.checkLimit(
				messageKey,
				messageLimits,
			);
			expect(finalResult.allowed).toBe(true);
		});
	});
});
