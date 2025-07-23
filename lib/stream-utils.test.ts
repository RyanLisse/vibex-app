import { afterEach, beforeEach, describe, expect, it, spyOn, vi } from "vitest";
import {
	createTimeoutPromise,
	debounce,
	safeAsync,
	safeStreamCancel,
	safeWebSocketClose,
	withTimeout,
} from "./stream-utils";

describe("stream-utils", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {
			/* no-op */
		});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe("safeStreamCancel", () => {
		it("should handle null stream", async () => {
			await safeStreamCancel(null);
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should handle undefined stream", async () => {
			await safeStreamCancel(undefined);
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should cancel an unlocked stream", async () => {
			const mockReader = {
				cancel: vi.fn().mockResolvedValue(undefined),
				releaseLock: vi.fn(),
			};
			const mockStream = {
				locked: false,
				getReader: vi.fn().mockReturnValue(mockReader),
			} as unknown as ReadableStream;

			await safeStreamCancel(mockStream);

			expect(mockStream.getReader).toHaveBeenCalled();
			expect(mockReader.cancel).toHaveBeenCalled();
			expect(mockReader.releaseLock).toHaveBeenCalled();
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should handle locked stream", async () => {
			const mockStream = {
				locked: true,
			} as unknown as ReadableStream;

			await safeStreamCancel(mockStream);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Stream is locked, cannot cancel safely",
			);
		});

		it("should handle cancel error", async () => {
			const mockError = new Error("Cancel failed");
			const mockReader = {
				cancel: vi.fn().mockRejectedValue(mockError),
				releaseLock: vi.fn(),
			};
			const mockStream = {
				locked: false,
				getReader: vi.fn().mockReturnValue(mockReader),
			} as unknown as ReadableStream;

			await safeStreamCancel(mockStream);

			expect(mockReader.cancel).toHaveBeenCalled();
			expect(mockReader.releaseLock).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Error cancelling stream reader:",
				mockError,
			);
		});

		it("should handle releaseLock error", async () => {
			const mockError = new Error("Release lock failed");
			const mockReader = {
				cancel: vi.fn().mockResolvedValue(undefined),
				releaseLock: vi.fn().mockImplementation(() => {
					throw mockError;
				}),
			};
			const mockStream = {
				locked: false,
				getReader: vi.fn().mockReturnValue(mockReader),
			} as unknown as ReadableStream;

			await safeStreamCancel(mockStream);

			expect(mockReader.releaseLock).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				"Error releasing stream reader lock:",
				mockError,
			);
		});

		it("should handle getReader error", async () => {
			const mockError = new Error("Get reader failed");
			const mockStream = {
				locked: false,
				getReader: vi.fn().mockImplementation(() => {
					throw mockError;
				}),
			} as unknown as ReadableStream;

			await safeStreamCancel(mockStream);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error in safe stream cancel:",
				mockError,
			);
		});
	});

	describe("safeWebSocketClose", () => {
		it("should handle null WebSocket", () => {
			safeWebSocketClose(null);
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should handle undefined WebSocket", () => {
			safeWebSocketClose(undefined);
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should close open WebSocket", () => {
			const mockWs = {
				readyState: WebSocket.OPEN,
				close: vi.fn(),
			} as unknown as WebSocket;

			safeWebSocketClose(mockWs);

			expect(mockWs.close).toHaveBeenCalledWith(1000, "Normal closure");
			expect(consoleSpy).not.toHaveBeenCalled();
		});

		it("should close connecting WebSocket", () => {
			const mockWs = {
				readyState: WebSocket.CONNECTING,
				close: vi.fn(),
			} as unknown as WebSocket;

			safeWebSocketClose(mockWs);

			expect(mockWs.close).toHaveBeenCalledWith(1000, "Normal closure");
		});

		it("should not close already closed WebSocket", () => {
			const mockWs = {
				readyState: WebSocket.CLOSED,
				close: vi.fn(),
			} as unknown as WebSocket;

			safeWebSocketClose(mockWs);

			expect(mockWs.close).not.toHaveBeenCalled();
		});

		it("should not close already closing WebSocket", () => {
			const mockWs = {
				readyState: WebSocket.CLOSING,
				close: vi.fn(),
			} as unknown as WebSocket;

			safeWebSocketClose(mockWs);

			expect(mockWs.close).not.toHaveBeenCalled();
		});

		it("should handle close error", () => {
			const mockError = new Error("Close failed");
			const mockWs = {
				readyState: WebSocket.OPEN,
				close: vi.fn().mockImplementation(() => {
					throw mockError;
				}),
			} as unknown as WebSocket;

			safeWebSocketClose(mockWs);

			expect(consoleSpy).toHaveBeenCalledWith(
				"Error closing WebSocket:",
				mockError,
			);
		});
	});

	describe("createTimeoutPromise", () => {
		it("should reject after timeout with default message", async () => {
			const promise = createTimeoutPromise(10);

			await expect(promise).rejects.toThrow("Operation timed out");
		});

		it("should reject after timeout with custom message", async () => {
			const promise = createTimeoutPromise(10, "Custom timeout");

			await expect(promise).rejects.toThrow("Custom timeout");
		});

		it("should wait for the specified duration", async () => {
			const start = Date.now();

			try {
				await createTimeoutPromise(50);
			} catch {
				const elapsed = Date.now() - start;
				expect(elapsed).toBeGreaterThanOrEqual(45); // Allow for timing variance
			}
		});
	});

	describe("withTimeout", () => {
		it("should resolve if promise completes before timeout", async () => {
			const promise = Promise.resolve("success");
			const result = await withTimeout(promise, 100);
			expect(result).toBe("success");
		});

		it("should reject if promise exceeds timeout", async () => {
			const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));

			const result = withTimeout(slowPromise, 10);

			await expect(result).rejects.toThrow("Operation timed out");
		});

		it("should use custom timeout message", async () => {
			const slowPromise = new Promise((resolve) => setTimeout(resolve, 100));

			const result = withTimeout(slowPromise, 10, "Custom timeout");

			await expect(result).rejects.toThrow("Custom timeout");
		});

		it("should handle rejected promises", async () => {
			const errorPromise = Promise.reject(new Error("Original error"));
			await expect(withTimeout(errorPromise, 100)).rejects.toThrow(
				"Original error",
			);
		});

		it("should resolve fast promise before timeout", async () => {
			const result = await withTimeout(Promise.resolve("fast"), 1000);
			expect(result).toBe("fast");
		});
	});

	describe("safeAsync", () => {
		it("should return result on success", async () => {
			const fn = async () => "success";
			const result = await safeAsync(fn);
			expect(result).toBe("success");
		});

		it("should return undefined on error without fallback", async () => {
			const fn = () => {
				throw new Error("Test error");
			};
			const result = await safeAsync(fn);
			expect(result).toBeUndefined();
		});

		it("should return fallback on error", async () => {
			const fn = () => {
				throw new Error("Test error");
			};
			const result = await safeAsync(fn, "fallback");
			expect(result).toBe("fallback");
		});

		it("should log error with custom message", async () => {
			const error = new Error("Test error");
			const fn = () => {
				throw error;
			};

			await safeAsync(fn, undefined, "Custom error message");
			expect(consoleSpy).toHaveBeenCalledWith("Custom error message", error);
		});

		it("should not log error without custom message", async () => {
			const fn = () => {
				throw new Error("Test error");
			};

			await safeAsync(fn);
			expect(consoleSpy).not.toHaveBeenCalled();
		});
	});

	describe("debounce", () => {
		it("should debounce function calls", async () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 50);

			debouncedFn("a");
			debouncedFn("b");
			debouncedFn("c");

			expect(fn).not.toHaveBeenCalled();

			// Wait for debounce delay
			await new Promise((resolve) => setTimeout(resolve, 60));

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith("c");
		});

		it("should handle single call", async () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 50);

			debouncedFn("single");

			// Wait for debounce delay
			await new Promise((resolve) => setTimeout(resolve, 60));

			expect(fn).toHaveBeenCalledTimes(1);
			expect(fn).toHaveBeenCalledWith("single");
		});

		it("should handle zero wait", async () => {
			const fn = vi.fn();
			const debouncedFn = debounce(fn, 0);

			debouncedFn("instant");
			await new Promise((resolve) => setTimeout(resolve, 1));

			expect(fn).toHaveBeenCalledWith("instant");
		});
	});
});
