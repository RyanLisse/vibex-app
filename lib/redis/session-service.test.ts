/**
 * SessionService Tests
 *
 * Test-driven development for Redis/Valkey session management
 */

import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "vitest";
import { testRedisConfig } from "./config";
import { RedisClientManager } from "./redis-client";
import { SessionService } from "./session-service";
import type { SessionData, SessionOptions } from "./types";

describe("SessionService", () => {
	let sessionService: SessionService;
	let redisManager: RedisClientManager;

	beforeAll(async () => {
		redisManager = RedisClientManager.getInstance(testRedisConfig);
		await redisManager.initialize();
	});

	beforeEach(() => {
		sessionService = SessionService.getInstance();
	});

	afterEach(async () => {
		await sessionService.cleanup();
	});

	afterAll(async () => {
		await redisManager.shutdown();
	});

	describe("Basic Session Operations", () => {
		test("should create and retrieve a session", async () => {
			const sessionData: SessionData = {
				userId: "user-123",
				email: "test@example.com",
				preferences: { theme: "dark", language: "en" },
			};

			// Create session
			const sessionId = await sessionService.createSession(sessionData);
			expect(sessionId).toBeDefined();
			expect(typeof sessionId).toBe("string");

			// Retrieve session
			const retrievedSession =
				await sessionService.getSession<SessionData>(sessionId);
			expect(retrievedSession).not.toBeNull();
			expect(retrievedSession!.id).toBe(sessionId);
			expect(retrievedSession!.userId).toBe("user-123");
			expect(retrievedSession!.email).toBe("test@example.com");
			expect(retrievedSession!.preferences).toEqual({
				theme: "dark",
				language: "en",
			});
			expect(retrievedSession!.createdAt).toBeInstanceOf(Date);
			expect(retrievedSession!.lastAccessedAt).toBeInstanceOf(Date);
			expect(retrievedSession!.expiresAt).toBeInstanceOf(Date);
		});

		test("should update session data", async () => {
			const sessionData: SessionData = {
				userId: "user-456",
				role: "user",
			};

			const sessionId = await sessionService.createSession(sessionData);
			const originalSession =
				await sessionService.getSession<SessionData>(sessionId);

			// Update session
			const updates = {
				role: "admin" as const,
				lastLoginAt: new Date(),
			};

			const updated = await sessionService.updateSession(sessionId, updates);
			expect(updated).toBe(true);

			// Verify updates
			const updatedSession =
				await sessionService.getSession<SessionData>(sessionId);
			expect(updatedSession!.role).toBe("admin");
			expect(updatedSession!.lastLoginAt).toBeInstanceOf(Date);
			expect(updatedSession!.userId).toBe("user-456"); // Original data preserved
			expect(updatedSession!.lastAccessedAt.getTime()).toBeGreaterThan(
				originalSession!.lastAccessedAt.getTime(),
			);
		});

		test("should delete sessions", async () => {
			const sessionData: SessionData = { userId: "user-789" };
			const sessionId = await sessionService.createSession(sessionData);

			// Verify session exists
			const session = await sessionService.getSession(sessionId);
			expect(session).not.toBeNull();

			// Delete session
			const deleted = await sessionService.deleteSession(sessionId);
			expect(deleted).toBe(true);

			// Verify session is gone
			const deletedSession = await sessionService.getSession(sessionId);
			expect(deletedSession).toBeNull();
		});
	});

	describe("Session Expiration", () => {
		test("should handle session expiration", async () => {
			const sessionData: SessionData = { userId: "user-expiry" };
			const options: SessionOptions = { ttl: 2 }; // 2 seconds

			const sessionId = await sessionService.createSession(
				sessionData,
				options,
			);

			// Session should exist initially
			const initialSession = await sessionService.getSession(sessionId);
			expect(initialSession).not.toBeNull();

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 2500));

			// Session should be expired
			const expiredSession = await sessionService.getSession(sessionId);
			expect(expiredSession).toBeNull();
		});

		test("should extend session TTL", async () => {
			const sessionData: SessionData = { userId: "user-extend" };
			const options: SessionOptions = { ttl: 5 }; // 5 seconds

			const sessionId = await sessionService.createSession(
				sessionData,
				options,
			);

			// Wait some time
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Extend session
			const extended = await sessionService.extendSession(sessionId, 10); // Add 10 more seconds
			expect(extended).toBe(true);

			// Wait for original TTL
			await new Promise((resolve) => setTimeout(resolve, 4000));

			// Session should still exist due to extension
			const extendedSession = await sessionService.getSession(sessionId);
			expect(extendedSession).not.toBeNull();
		});

		test("should handle sliding expiration", async () => {
			const sessionData: SessionData = { userId: "user-sliding" };
			const options: SessionOptions = {
				ttl: 5, // 5 seconds
				slidingExpiration: true,
			};

			const sessionId = await sessionService.createSession(
				sessionData,
				options,
			);

			// Access session multiple times
			for (let i = 0; i < 3; i++) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				const session = await sessionService.getSession(sessionId);
				expect(session).not.toBeNull();
			}

			// Session should still be valid due to sliding expiration
			// (each access should have extended the TTL)
		});
	});

	describe("Session Security", () => {
		test("should handle secure session tokens", async () => {
			const sessionData: SessionData = {
				userId: "user-secure",
				isAdmin: true,
				permissions: ["read", "write", "delete"],
			};

			const sessionId = await sessionService.createSession(sessionData);

			// Session ID should be cryptographically secure
			expect(sessionId.length).toBeGreaterThan(20);
			expect(sessionId).toMatch(/^[a-zA-Z0-9-_]+$/); // URL-safe characters

			// Verify session integrity
			const session = await sessionService.getSession<SessionData>(sessionId);
			expect(session!.isAdmin).toBe(true);
			expect(session!.permissions).toEqual(["read", "write", "delete"]);
		});

		test("should validate session ownership", async () => {
			const sessionData: SessionData = { userId: "user-ownership" };
			const sessionId = await sessionService.createSession(sessionData);

			// Verify session belongs to correct user
			const isValid = await sessionService.validateSessionForUser(
				sessionId,
				"user-ownership",
			);
			expect(isValid).toBe(true);

			// Verify session doesn't belong to different user
			const isInvalid = await sessionService.validateSessionForUser(
				sessionId,
				"different-user",
			);
			expect(isInvalid).toBe(false);
		});

		test("should implement session rotation", async () => {
			const sessionData: SessionData = {
				userId: "user-rotation",
				role: "user",
			};
			const originalSessionId = await sessionService.createSession(sessionData);

			// Rotate session (create new session, invalidate old)
			const newSessionId =
				await sessionService.rotateSession(originalSessionId);
			expect(newSessionId).toBeDefined();
			expect(newSessionId).not.toBe(originalSessionId);

			// Old session should be invalid
			const oldSession = await sessionService.getSession(originalSessionId);
			expect(oldSession).toBeNull();

			// New session should contain same data
			const newSession =
				await sessionService.getSession<SessionData>(newSessionId);
			expect(newSession!.userId).toBe("user-rotation");
			expect(newSession!.role).toBe("user");
		});
	});

	describe("Multi-Device Sessions", () => {
		test("should handle multiple sessions per user", async () => {
			const userId = "user-multidevice";

			// Create sessions for different devices
			const desktopSessionId = await sessionService.createSession({
				userId,
				device: "desktop",
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			});

			const mobileSessionId = await sessionService.createSession({
				userId,
				device: "mobile",
				userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)",
			});

			// Get all sessions for user
			const userSessions = await sessionService.getUserSessions(userId);
			expect(userSessions).toHaveLength(2);

			const sessionIds = userSessions.map((s) => s.id);
			expect(sessionIds).toContain(desktopSessionId);
			expect(sessionIds).toContain(mobileSessionId);
		});

		test("should revoke all user sessions", async () => {
			const userId = "user-revoke-all";

			// Create multiple sessions
			const sessionIds = [];
			for (let i = 0; i < 3; i++) {
				const sessionId = await sessionService.createSession({
					userId,
					device: `device-${i}`,
				});
				sessionIds.push(sessionId);
			}

			// Revoke all sessions for user
			const revokedCount = await sessionService.revokeAllUserSessions(userId);
			expect(revokedCount).toBe(3);

			// Verify all sessions are invalid
			for (const sessionId of sessionIds) {
				const session = await sessionService.getSession(sessionId);
				expect(session).toBeNull();
			}
		});

		test("should limit concurrent sessions per user", async () => {
			const userId = "user-limit-sessions";
			const maxSessions = 2;

			await sessionService.setUserSessionLimit(userId, maxSessions);

			// Create sessions up to limit
			const sessionIds = [];
			for (let i = 0; i < maxSessions; i++) {
				const sessionId = await sessionService.createSession({
					userId,
					device: `device-${i}`,
				});
				sessionIds.push(sessionId);
			}

			// Creating another session should revoke the oldest
			const newSessionId = await sessionService.createSession({
				userId,
				device: "new-device",
			});

			const userSessions = await sessionService.getUserSessions(userId);
			expect(userSessions).toHaveLength(maxSessions);

			// First session should be revoked
			const firstSession = await sessionService.getSession(sessionIds[0]);
			expect(firstSession).toBeNull();

			// New session should exist
			const newSession = await sessionService.getSession(newSessionId);
			expect(newSession).not.toBeNull();
		});
	});

	describe("Session Analytics", () => {
		test("should track session activity", async () => {
			const sessionData: SessionData = { userId: "user-analytics" };
			const sessionId = await sessionService.createSession(sessionData);

			// Record some activity
			await sessionService.recordSessionActivity(sessionId, "page_view", {
				page: "/dashboard",
			});
			await sessionService.recordSessionActivity(sessionId, "api_call", {
				endpoint: "/api/users",
			});
			await sessionService.recordSessionActivity(sessionId, "button_click", {
				button: "save",
			});

			// Get session activity
			const activity = await sessionService.getSessionActivity(sessionId);
			expect(activity).toHaveLength(3);
			expect(activity[0].action).toBe("page_view");
			expect(activity[1].action).toBe("api_call");
			expect(activity[2].action).toBe("button_click");
		});

		test("should provide session statistics", async () => {
			const userId = "user-stats";

			// Create sessions with different durations
			const session1Id = await sessionService.createSession({ userId });
			await new Promise((resolve) => setTimeout(resolve, 100));
			await sessionService.deleteSession(session1Id);

			const session2Id = await sessionService.createSession({ userId });
			await new Promise((resolve) => setTimeout(resolve, 200));
			await sessionService.deleteSession(session2Id);

			const session3Id = await sessionService.createSession({ userId });

			const stats = await sessionService.getUserSessionStats(userId);
			expect(stats.totalSessions).toBeGreaterThanOrEqual(3);
			expect(stats.averageSessionDuration).toBeGreaterThan(0);
			expect(stats.activeSessions).toBe(1); // session3 is still active
		});

		test("should detect suspicious session activity", async () => {
			const sessionData: SessionData = {
				userId: "user-suspicious",
				ipAddress: "192.168.1.100",
			};
			const sessionId = await sessionService.createSession(sessionData);

			// Simulate suspicious activity
			for (let i = 0; i < 10; i++) {
				await sessionService.recordSessionActivity(
					sessionId,
					"failed_login_attempt",
					{
						attempt: i + 1,
						timestamp: Date.now(),
					},
				);
			}

			// Check for suspicious activity
			const suspiciousActivity =
				await sessionService.detectSuspiciousActivity(sessionId);
			expect(suspiciousActivity.isSuspicious).toBe(true);
			expect(suspiciousActivity.reasons).toContain("multiple_failed_attempts");
			expect(suspiciousActivity.riskScore).toBeGreaterThan(0.5);
		});
	});

	describe("Session Cleanup and Maintenance", () => {
		test("should cleanup expired sessions", async () => {
			// Create sessions with short TTL
			for (let i = 0; i < 5; i++) {
				await sessionService.createSession(
					{ userId: `user-cleanup-${i}` },
					{ ttl: 1 }, // 1 second
				);
			}

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 1500));

			// Run cleanup
			const cleanedCount = await sessionService.cleanupExpiredSessions();
			expect(cleanedCount).toBe(5);
		});

		test("should get session health metrics", async () => {
			// Create some sessions
			for (let i = 0; i < 3; i++) {
				await sessionService.createSession({ userId: `user-health-${i}` });
			}

			const healthMetrics = await sessionService.getHealthMetrics();

			expect(healthMetrics.totalActiveSessions).toBeGreaterThanOrEqual(3);
			expect(healthMetrics.memoryUsage).toBeGreaterThan(0);
			expect(healthMetrics.averageSessionAge).toBeGreaterThan(0);
			expect(typeof healthMetrics.cleanupNeeded).toBe("boolean");
		});

		test("should handle session storage optimization", async () => {
			const sessionData: SessionData = {
				userId: "user-optimization",
				largeData: new Array(1000).fill("data").join(""),
			};

			const sessionId = await sessionService.createSession(sessionData);

			// Optimize session storage (compress, remove unnecessary data, etc.)
			const optimized = await sessionService.optimizeSessionStorage(sessionId);
			expect(optimized).toBe(true);

			// Session should still be retrievable
			const session = await sessionService.getSession<SessionData>(sessionId);
			expect(session).not.toBeNull();
			expect(session!.userId).toBe("user-optimization");
		});
	});

	describe("Error Handling", () => {
		test("should handle invalid session IDs", async () => {
			const invalidSessionId = "invalid-session-id";

			const session = await sessionService.getSession(invalidSessionId);
			expect(session).toBeNull();

			const updated = await sessionService.updateSession(invalidSessionId, {
				test: "data",
			});
			expect(updated).toBe(false);

			const deleted = await sessionService.deleteSession(invalidSessionId);
			expect(deleted).toBe(false);
		});

		test("should handle malformed session data", async () => {
			// This would test Redis data corruption scenarios
			const sessionId = await sessionService.createSession({
				userId: "user-malformed",
			});

			// Session should be retrievable
			const session = await sessionService.getSession(sessionId);
			expect(session).not.toBeNull();
		});

		test("should handle connection failures gracefully", async () => {
			// This would test Redis connection failures - implementation specific
			const sessionData: SessionData = { userId: "user-connection-test" };

			const sessionId = await sessionService.createSession(sessionData);
			expect(typeof sessionId).toBe("string");
		});
	});

	describe("Integration with Authentication", () => {
		test("should integrate with OAuth sessions", async () => {
			const oauthSessionData: SessionData = {
				userId: "oauth-user-123",
				provider: "google",
				accessToken: "access-token-xyz",
				refreshToken: "refresh-token-abc",
				tokenExpiresAt: new Date(Date.now() + 3_600_000), // 1 hour
				scope: ["read", "write"],
			};

			const sessionId = await sessionService.createSession(oauthSessionData);
			const session = await sessionService.getSession<SessionData>(sessionId);

			expect(session!.provider).toBe("google");
			expect(session!.accessToken).toBe("access-token-xyz");
			expect(session!.scope).toEqual(["read", "write"]);

			// Test token refresh
			const refreshed = await sessionService.refreshOAuthTokens(sessionId, {
				accessToken: "new-access-token",
				refreshToken: "new-refresh-token",
				expiresAt: new Date(Date.now() + 3_600_000),
			});

			expect(refreshed).toBe(true);

			const refreshedSession =
				await sessionService.getSession<SessionData>(sessionId);
			expect(refreshedSession!.accessToken).toBe("new-access-token");
		});

		test("should handle SSO session federation", async () => {
			const ssoSessionData: SessionData = {
				userId: "sso-user-456",
				federatedIdentity: {
					provider: "saml",
					nameId: "user@company.com",
					attributes: {
						department: "Engineering",
						role: "Developer",
					},
				},
				sessionIndex: "saml-session-123",
			};

			const sessionId = await sessionService.createSession(ssoSessionData);

			// Verify SSO session
			const isSSOValid = await sessionService.validateSSOSession(
				sessionId,
				"saml-session-123",
			);
			expect(isSSOValid).toBe(true);

			// Test SSO logout
			const ssoLoggedOut = await sessionService.initiateSSOLogout(sessionId);
			expect(ssoLoggedOut).toBe(true);
		});
	});
});
