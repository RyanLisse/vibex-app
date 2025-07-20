import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebhookTransport } from "@/lib/alerts/transport/webhook-transport";
	type AlertChannel,
	AlertChannelType,
	type AlertNotification,
	type CriticalError,
	CriticalErrorType,
} from "@/lib/alerts/types";

// Mock fetch
global.fetch = vi.fn();

describe("WebhookTransport", () => {
	let transport: WebhookTransport;
	let sampleChannel: AlertChannel;
	let sampleError: CriticalError;
	let sampleNotification: AlertNotification;

	beforeEach(() => {
		vi.clearAllMocks();

		transport = new WebhookTransport();

		sampleChannel = {
			type: AlertChannelType.WEBHOOK,
			name: "test-webhook",
			enabled: true,
			config: {
				url: "https://example.com/webhook",
				method: "POST",
				timeout: 30_000,
				retries: 3,
			},
			errorTypes: [CriticalErrorType.DATABASE_CONNECTION_FAILURE],
			priority: "high",
		};

		sampleError = {
			id: "test-error-123",
			timestamp: new Date("2024-01-01T12:00:00Z"),
			severity: "critical",
			type: CriticalErrorType.DATABASE_CONNECTION_FAILURE,
			message: "Test database connection failure",
			source: "test-service",
			metadata: { test: true },
			environment: "test",
			resolved: false,
			occurrenceCount: 1,
			lastOccurrence: new Date("2024-01-01T12:00:00Z"),
			firstOccurrence: new Date("2024-01-01T12:00:00Z"),
		};

		sampleNotification = {
			id: "test-notification-123",
			alertId: sampleError.id,
			channelType: AlertChannelType.WEBHOOK,
			channelName: sampleChannel.name,
			status: "pending",
			retryCount: 0,
			maxRetries: 3,
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("send", () => {
		it("should send webhook successfully", async () => {
			const mockResponse = {
				ok: true,
				status: 200,
				statusText: "OK",
			};
			(fetch as any).mockResolvedValue(mockResponse);

			await transport.send(sampleChannel, sampleError, sampleNotification);

			expect(fetch).toHaveBeenCalledWith(
				"https://example.com/webhook",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						"User-Agent": "ClaudeFlow-AlertSystem/1.0",
					}),
					body: expect.stringContaining("test-error-123"),
				}),
			);
		});

		it("should include authentication headers when configured", async () => {
			const channelWithAuth = {
				...sampleChannel,
				config: {
					...sampleChannel.config,
					authentication: {
						type: "bearer",
						token: "test-token-123",
					},
				},
			};

			const mockResponse = { ok: true, status: 200, statusText: "OK" };
			(fetch as any).mockResolvedValue(mockResponse);

			await transport.send(channelWithAuth, sampleError, sampleNotification);

			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						Authorization: "Bearer test-token-123",
					}),
				}),
			);
		});

		it("should retry on failure", async () => {
			const failResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			};
			const successResponse = { ok: true, status: 200, statusText: "OK" };

			(fetch as any)
				.mockResolvedValueOnce(failResponse)
				.mockResolvedValueOnce(successResponse);

			await transport.send(sampleChannel, sampleError, sampleNotification);

			expect(fetch).toHaveBeenCalledTimes(2);
		});

		it("should fail after max retries", async () => {
			const failResponse = {
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
			};
			(fetch as any).mockResolvedValue(failResponse);

			await expect(
				transport.send(sampleChannel, sampleError, sampleNotification),
			).rejects.toThrow("HTTP 500: Internal Server Error");

			expect(fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
		});

		it("should handle network errors", async () => {
			(fetch as any).mockRejectedValue(new Error("Network error"));

			await expect(
				transport.send(sampleChannel, sampleError, sampleNotification),
			).rejects.toThrow("Network error");
		});

		it("should include custom headers when configured", async () => {
			const channelWithHeaders = {
				...sampleChannel,
				config: {
					...sampleChannel.config,
					headers: {
						"X-Custom-Header": "custom-value",
						"X-Service": "alert-system",
					},
				},
			};

			const mockResponse = { ok: true, status: 200, statusText: "OK" };
			(fetch as any).mockResolvedValue(mockResponse);

			await transport.send(channelWithHeaders, sampleError, sampleNotification);

			expect(fetch).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					headers: expect.objectContaining({
						"X-Custom-Header": "custom-value",
						"X-Service": "alert-system",
					}),
				}),
			);
		});
	});

	describe("validateConfig", () => {
		it("should validate valid configuration", () => {
			const validConfig = {
				url: "https://example.com/webhook",
				method: "POST",
				timeout: 30_000,
			};

			const result = transport.validateConfig(validConfig);

			expect(result).toBe(true);
		});

		it("should reject missing URL", () => {
			const invalidConfig = {
				method: "POST",
			};

			const result = transport.validateConfig(invalidConfig);

			expect(result).toBe(false);
		});

		it("should reject invalid URL", () => {
			const invalidConfig = {
				url: "not-a-valid-url",
			};

			const result = transport.validateConfig(invalidConfig);

			expect(result).toBe(false);
		});

		it("should reject invalid method", () => {
			const invalidConfig = {
				url: "https://example.com/webhook",
				method: "INVALID",
			};

			const result = transport.validateConfig(invalidConfig);

			expect(result).toBe(false);
		});

		it("should reject invalid timeout", () => {
			const invalidConfig = {
				url: "https://example.com/webhook",
				timeout: 500, // Too small
			};

			const result = transport.validateConfig(invalidConfig);

			expect(result).toBe(false);
		});

		it("should validate bearer authentication", () => {
			const validConfig = {
				url: "https://example.com/webhook",
				authentication: {
					type: "bearer",
					token: "valid-token",
				},
			};

			const result = transport.validateConfig(validConfig);

			expect(result).toBe(true);
		});

		it("should reject invalid bearer authentication", () => {
			const invalidConfig = {
				url: "https://example.com/webhook",
				authentication: {
					type: "bearer",
					// Missing token
				},
			};

			const result = transport.validateConfig(invalidConfig);

			expect(result).toBe(false);
		});

		it("should validate basic authentication", () => {
			const validConfig = {
				url: "https://example.com/webhook",
				authentication: {
					type: "basic",
					username: "user",
					password: "pass",
				},
			};

			const result = transport.validateConfig(validConfig);

			expect(result).toBe(true);
		});

		it("should validate API key authentication", () => {
			const validConfig = {
				url: "https://example.com/webhook",
				authentication: {
					type: "api-key",
					apiKey: "key123",
					apiKeyHeader: "X-API-Key",
				},
			};

			const result = transport.validateConfig(validConfig);

			expect(result).toBe(true);
		});
	});

	describe("payload building", () => {
		it("should build correct payload structure", async () => {
			const mockResponse = { ok: true, status: 200, statusText: "OK" };
			(fetch as any).mockResolvedValue(mockResponse);

			await transport.send(sampleChannel, sampleError, sampleNotification);

			const call = (fetch as any).mock.calls[0];
			const payload = JSON.parse(call[1].body);

			expect(payload).toEqual({
				alert: {
					id: sampleError.id,
					timestamp: sampleError.timestamp.toISOString(),
					type: sampleError.type,
					severity: sampleError.severity,
					message: sampleError.message,
					source: sampleError.source,
					environment: sampleError.environment,
					resolved: sampleError.resolved,
					occurrenceCount: sampleError.occurrenceCount,
					metadata: sampleError.metadata,
				},
				notification: {
					id: sampleNotification.id,
					channel: sampleChannel.name,
					priority: sampleChannel.priority,
				},
				system: {
					name: "ClaudeFlow",
					version: "1.0.0",
					timestamp: expect.any(String),
				},
			});
		});
	});
});
