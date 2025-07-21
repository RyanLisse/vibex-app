import { act, renderHook, waitFor } from "@testing-library/react";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
	test,
	vi,
} from "vitest";
import type { UseGeminiAudioOptions } from "./use-gemini-audio";
import { useGeminiAudio } from "./use-gemini-audio";

// Mock fetch
global.fetch = vi.fn();

describe("useGeminiAudio", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mock.useFakeTimers();
		const fetchMock = vi.fn(global.fetch);
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({}),
		});
	});

	afterEach(() => {
		mock.useRealTimers();
	});

	describe("initial state", () => {
		it("should initialize with default values", () => {
			const { result } = renderHook(() => useGeminiAudio());

			expect(result.current.isConnected).toBe(false);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.messages).toEqual([]);
			expect(result.current.error).toBeNull();
		});
	});

	describe("connect", () => {
		it("should create session and set connected state", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			await act(async () => {
				await result.current.connect();
			});

			expect(result.current.isConnected).toBe(true);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();

			const fetchCall = vi.fn(global.fetch).mock.calls[0];
			expect(fetchCall[0]).toBe("/api/ai/gemini/session");
			expect(fetchCall[1]).toEqual({
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: expect.stringContaining('"sessionId":"session-'),
			});
		});

		it("should include options when connecting", async () => {
			const options: UseGeminiAudioOptions = {
				voiceName: "en-US-Neural2-A",
				tools: [{ name: "calculator", description: "Performs calculations" }],
			};

			const { result } = renderHook(() => useGeminiAudio(options));

			await act(async () => {
				await result.current.connect();
			});

			const body = JSON.parse(vi.fn(global.fetch).mock.calls[0][1].body);
			expect(body.voiceName).toBe("en-US-Neural2-A");
			expect(body.tools).toEqual(options.tools);
		});

		it("should handle connection errors", async () => {
			const onError = vi.fn();
			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 500,
			});

			const { result } = renderHook(() => useGeminiAudio({ onError }));

			await act(async () => {
				await result.current.connect();
			});

			expect(result.current.isConnected).toBe(false);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBe("Failed to create session");
			expect(onError).toHaveBeenCalledWith(expect.any(Error));
		});

		it("should handle network errors", async () => {
			const onError = vi.fn();
			const networkError = new Error("Network error");
			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockRejectedValueOnce(networkError);

			const { result } = renderHook(() => useGeminiAudio({ onError }));

			await act(async () => {
				await result.current.connect();
			});

			expect(result.current.isConnected).toBe(false);
			expect(result.current.error).toBe("Network error");
			expect(onError).toHaveBeenCalledWith(networkError);
		});

		it("should set loading state during connection", async () => {
			let resolvePromise: (value: any) => void;
			const promise = new Promise((resolve) => {
				resolvePromise = resolve;
			});
			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockReturnValueOnce(promise);

			const { result } = renderHook(() => useGeminiAudio());

			const connectPromise = act(async () => {
				await result.current.connect();
			});

			expect(result.current.isLoading).toBe(true);

			resolvePromise?.({ ok: true, json: async () => ({}) });
			await connectPromise;

			expect(result.current.isLoading).toBe(false);
		});
	});

	describe("disconnect", () => {
		it("should delete session and update state", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			// First connect
			await act(async () => {
				await result.current.connect();
			});

			expect(result.current.isConnected).toBe(true);

			// Then disconnect
			await act(async () => {
				await result.current.disconnect();
			});

			expect(result.current.isConnected).toBe(false);

			const fetchMock = vi.fn(global.fetch);
			const disconnectCall = fetchMock.mock.calls[1];
			expect(disconnectCall[0]).toMatch(
				/\/api\/ai\/gemini\/session\?sessionId=session-/,
			);
			expect(disconnectCall[1]).toEqual({ method: "DELETE" });
		});

		it("should handle disconnect when not connected", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			await act(async () => {
				await result.current.disconnect();
			});

			expect(global.fetch).not.toHaveBeenCalled();
		});

		it("should handle disconnect errors gracefully", async () => {
			const consoleSpy = vi
				.spyOn(console, "error")
				.mockImplementation(() => {});
			const { result } = renderHook(() => useGeminiAudio());

			// Connect first
			await act(async () => {
				await result.current.connect();
			});

			// Mock error on disconnect
			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockRejectedValueOnce(new Error("Disconnect failed"));

			await act(async () => {
				await result.current.disconnect();
			});

			expect(consoleSpy).toHaveBeenCalledWith(
				"Failed to disconnect:",
				expect.any(Error),
			);

			consoleSpy.mockRestore();
		});
	});

	describe("sendMessage", () => {
		it("should send text message and add to messages", async () => {
			const onMessage = vi.fn();
			const { result } = renderHook(() => useGeminiAudio({ onMessage }));

			// Connect first
			await act(async () => {
				await result.current.connect();
			});

			await act(async () => {
				await result.current.sendMessage("Hello, Gemini!");
			});

			// Check user message was added
			expect(result.current.messages).toHaveLength(1);
			expect(result.current.messages[0]).toMatchObject({
				type: "text",
				content: "Hello, Gemini!",
				isUser: true,
			});
			expect(onMessage).toHaveBeenCalledWith(result.current.messages[0]);

			// Check API call
			const sendCall = vi.fn(global.fetch).mock.calls[1];
			expect(sendCall[0]).toBe("/api/ai/gemini/audio");
			expect(JSON.parse(sendCall[1].body)).toMatchObject({
				sessionId: expect.stringContaining("session-"),
				content: "Hello, Gemini!",
			});
		});

		it("should simulate AI response after sending message", async () => {
			const onMessage = vi.fn();
			const { result } = renderHook(() => useGeminiAudio({ onMessage }));

			await act(async () => {
				await result.current.connect();
			});

			await act(async () => {
				await result.current.sendMessage("Test message");
			});

			// Fast-forward to trigger simulated response
			act(() => {
				mock.advanceTimersByTime(1000);
			});

			await waitFor(() => {
				expect(result.current.messages).toHaveLength(2);
			});

			expect(result.current.messages[1]).toMatchObject({
				type: "text",
				content: expect.stringContaining("simulated response"),
				isUser: false,
			});
			expect(onMessage).toHaveBeenCalledTimes(2);
		});

		it("should throw error when not connected", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			await expect(
				act(async () => {
					await result.current.sendMessage("Hello");
				}),
			).rejects.toThrow("Not connected");
		});

		it("should handle send message errors", async () => {
			const onError = vi.fn();
			const { result } = renderHook(() => useGeminiAudio({ onError }));

			await act(async () => {
				await result.current.connect();
			});

			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 400,
			});

			await act(async () => {
				await result.current.sendMessage("Test");
			});

			expect(result.current.error).toBe("Failed to send message");
			expect(onError).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("sendAudio", () => {
		it("should send audio blob and add to messages", async () => {
			const onMessage = vi.fn();
			const { result } = renderHook(() => useGeminiAudio({ onMessage }));

			await act(async () => {
				await result.current.connect();
			});

			const audioBlob = new Blob(["audio data"], { type: "audio/webm" });
			const base64Audio = "data:audio/webm;base64,YXVkaW8gZGF0YQ==";

			// Mock FileReader
			const mockFileReader = {
				readAsDataURL: vi.fn(),
				onloadend: null as any,
				result: base64Audio,
			};
			global.FileReader = vi
				.fn()
				.mockImplementation(() => mockFileReader) as any;

			await act(async () => {
				const promise = result.current.sendAudio(audioBlob);
				// Trigger FileReader onloadend
				mockFileReader.onloadend();
				await promise;
			});

			expect(result.current.messages).toHaveLength(1);
			expect(result.current.messages[0]).toMatchObject({
				type: "audio",
				content: "Audio message",
				audioUrl: base64Audio,
				isUser: true,
			});
			expect(onMessage).toHaveBeenCalled();
		});

		it("should throw error when not connected", async () => {
			const { result } = renderHook(() => useGeminiAudio());
			const audioBlob = new Blob(["audio data"], { type: "audio/webm" });

			await expect(
				act(async () => {
					await result.current.sendAudio(audioBlob);
				}),
			).rejects.toThrow("Not connected");
		});

		it("should handle audio send errors", async () => {
			const onError = vi.fn();
			const { result } = renderHook(() => useGeminiAudio({ onError }));

			await act(async () => {
				await result.current.connect();
			});

			const audioBlob = new Blob(["audio data"], { type: "audio/webm" });
			const base64Audio = "data:audio/webm;base64,YXVkaW8gZGF0YQ==";

			const mockFileReader = {
				readAsDataURL: vi.fn(),
				onloadend: null as any,
				result: base64Audio,
			};
			global.FileReader = vi
				.fn()
				.mockImplementation(() => mockFileReader) as any;

			const fetchMock = vi.fn(global.fetch);
			fetchMock.mockResolvedValueOnce({
				ok: false,
				status: 400,
			});

			await act(async () => {
				const promise = result.current.sendAudio(audioBlob);
				mockFileReader.onloadend();
				await promise;
			});

			expect(result.current.error).toBe("Failed to send audio");
			expect(onError).toHaveBeenCalledWith(expect.any(Error));
		});
	});

	describe("clearMessages", () => {
		it("should clear all messages", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			await act(async () => {
				await result.current.connect();
				await result.current.sendMessage("Message 1");
				await result.current.sendMessage("Message 2");
			});

			expect(result.current.messages).toHaveLength(2);

			act(() => {
				result.current.clearMessages();
			});

			expect(result.current.messages).toHaveLength(0);
		});
	});

	describe("cleanup", () => {
		it("should disconnect on unmount", async () => {
			const { result, unmount } = renderHook(() => useGeminiAudio());

			await act(async () => {
				await result.current.connect();
			});

			unmount();

			const fetchMock = vi.fn(global.fetch);
			const disconnectCall = fetchMock.mock.calls[1];
			expect(disconnectCall[0]).toMatch(
				/\/api\/ai\/gemini\/session\?sessionId=/,
			);
			expect(disconnectCall[1]).toEqual({ method: "DELETE" });
		});

		it("should not attempt disconnect if not connected", () => {
			const { unmount } = renderHook(() => useGeminiAudio());

			unmount();

			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	describe("message handling", () => {
		it("should generate unique message IDs", async () => {
			const { result } = renderHook(() => useGeminiAudio());

			await act(async () => {
				await result.current.connect();
				await result.current.sendMessage("Message 1");
				await result.current.sendMessage("Message 2");
			});

			const messageIds = result.current.messages.map((m) => m.id);
			expect(new Set(messageIds).size).toBe(messageIds.length);
		});

		it("should include timestamps in messages", async () => {
			const { result } = renderHook(() => useGeminiAudio());
			const beforeTime = new Date();

			await act(async () => {
				await result.current.connect();
				await result.current.sendMessage("Test");
			});

			const afterTime = new Date();
			const messageTime = result.current.messages[0].timestamp;

			expect(messageTime >= beforeTime).toBe(true);
			expect(messageTime <= afterTime).toBe(true);
		});
	});
});
