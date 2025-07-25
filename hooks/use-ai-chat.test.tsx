/**
 * AI Chat Hook Tests
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAIChat } from "./use-ai-chat";

// Mock fetch
global.fetch = vi.fn();

describe("useAIChat", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should initialize with empty messages", () => {
		const { result } = renderHook(() => useAIChat());

		expect(result.current.messages).toHaveLength(0);
		expect(result.current.input).toBe("");
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("should initialize with system prompt", () => {
		const { result } = renderHook(() => useAIChat({ systemPrompt: "You are a helpful assistant" }));

		expect(result.current.messages).toHaveLength(1);
		expect(result.current.messages[0]).toEqual({
			role: "system",
			content: "You are a helpful assistant",
		});
	});

	it("should update input", () => {
		const { result } = renderHook(() => useAIChat());

		act(() => {
			result.current.setInput("Hello, AI!");
		});

		expect(result.current.input).toBe("Hello, AI!");
	});

	it("should send message and handle response", async () => {
		const mockResponse = {
			ok: true,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(
						new TextEncoder().encode(
							'data: {"type":"metadata","provider":"openai","model":"gpt-3.5-turbo","latency":100}\n\n'
						)
					);
					controller.enqueue(
						new TextEncoder().encode(
							'data: {"type":"chunk","choices":[{"delta":{"content":"Hello!"}}]}\n\n'
						)
					);
					controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
					controller.close();
				},
			}),
		};

		(global.fetch as any).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() => useAIChat());

		act(() => {
			result.current.setInput("Hello");
		});

		await act(async () => {
			await result.current.sendMessage();
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(2);
			expect(result.current.messages[0]).toEqual({
				role: "user",
				content: "Hello",
			});
			expect(result.current.messages[1]).toEqual({
				role: "assistant",
				content: "Hello!",
			});
			expect(result.current.metadata).toEqual({
				provider: "openai",
				model: "gpt-3.5-turbo",
				latency: 100,
			});
		});
	});

	it("should handle errors", async () => {
		const mockError = new Error("API Error");
		(global.fetch as any).mockRejectedValueOnce(mockError);

		const onError = vi.fn();
		const { result } = renderHook(() => useAIChat({ onError }));

		act(() => {
			result.current.setInput("Test");
		});

		await act(async () => {
			await result.current.sendMessage();
		});

		await waitFor(() => {
			expect(result.current.error).toBe(mockError);
			expect(onError).toHaveBeenCalledWith(mockError);
		});
	});

	it("should handle tool calls in responses", async () => {
		const mockResponse = {
			ok: true,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(
						new TextEncoder().encode(
							'data: {"type":"metadata","provider":"openai","model":"gpt-4"}\n\n'
						)
					);
					controller.enqueue(
						new TextEncoder().encode(
							'data: {"type":"chunk","choices":[{"delta":{"tool_calls":[{"index":0,"id":"call_123","type":"function","function":{"name":"get_weather","arguments":"{\\"location\\":\\"London\\"}"}}]}}]}\n\n'
						)
					);
					controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
					controller.close();
				},
			}),
		};

		(global.fetch as any).mockResolvedValueOnce(mockResponse);

		const { result } = renderHook(() =>
			useAIChat({
				tools: [
					{
						type: "function",
						function: {
							name: "get_weather",
							description: "Get weather",
							parameters: {},
						},
					},
				],
			})
		);

		act(() => {
			result.current.setInput("What's the weather in London?");
		});

		await act(async () => {
			await result.current.sendMessage();
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(2);
			const assistantMessage = result.current.messages[1];
			expect(assistantMessage.tool_calls).toBeDefined();
			expect(assistantMessage.tool_calls![0].function.name).toBe("get_weather");
		});
	});

	it("should stop streaming", async () => {
		const abortError = new Error("AbortError");
		abortError.name = "AbortError";

		(global.fetch as any).mockRejectedValueOnce(abortError);

		const { result } = renderHook(() => useAIChat());

		act(() => {
			result.current.setInput("Test");
		});

		const sendPromise = act(async () => {
			await result.current.sendMessage();
		});

		act(() => {
			result.current.stop();
		});

		await sendPromise;

		// Should not set error for abort
		expect(result.current.error).toBeNull();
	});

	it("should reload last message", async () => {
		const { result } = renderHook(() => useAIChat());

		// Set up initial messages
		act(() => {
			result.current.setMessages([
				{ role: "user", content: "First message" },
				{ role: "assistant", content: "First response" },
				{ role: "user", content: "Second message" },
				{ role: "assistant", content: "Second response" },
			]);
		});

		const mockResponse = {
			ok: true,
			body: new ReadableStream({
				start(controller) {
					controller.enqueue(
						new TextEncoder().encode(
							'data: {"type":"chunk","choices":[{"delta":{"content":"New response"}}]}\n\n'
						)
					);
					controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
					controller.close();
				},
			}),
		};

		(global.fetch as any).mockResolvedValueOnce(mockResponse);

		await act(async () => {
			await result.current.reload();
		});

		await waitFor(() => {
			expect(result.current.messages).toHaveLength(4);
			expect(result.current.messages[3].content).toBe("New response");
		});
	});

	it("should clear messages", () => {
		const { result } = renderHook(() =>
			useAIChat({
				systemPrompt: "System prompt",
			})
		);

		act(() => {
			result.current.setMessages([
				{ role: "system", content: "System prompt" },
				{ role: "user", content: "User message" },
				{ role: "assistant", content: "Assistant response" },
			]);
			result.current.setInput("Some input");
		});

		act(() => {
			result.current.clear();
		});

		expect(result.current.messages).toHaveLength(1);
		expect(result.current.messages[0]).toEqual({
			role: "system",
			content: "System prompt",
		});
		expect(result.current.input).toBe("");
		expect(result.current.error).toBeNull();
		expect(result.current.metadata).toBeNull();
	});
});
