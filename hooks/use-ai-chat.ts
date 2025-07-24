/**
 * AI Chat Hook
 *
 * React hook for easy integration with the unified AI system
 */

import { useState, useCallback, useRef } from "react";
import { Message } from "@/lib/ai";

export interface UseAIChatOptions {
	model?: string;
	provider?: string;
	temperature?: number;
	maxTokens?: number;
	systemPrompt?: string;
	tools?: Array<{
		type: "function";
		function: {
			name: string;
			description: string;
			parameters: Record<string, any>;
		};
	}>;
	onError?: (error: Error) => void;
	onFinish?: (message: Message) => void;
}

export interface UseAIChatReturn {
	messages: Message[];
	input: string;
	isLoading: boolean;
	error: Error | null;
	metadata: {
		provider?: string;
		model?: string;
		latency?: number;
		cached?: boolean;
	} | null;

	// Actions
	setInput: (input: string) => void;
	sendMessage: (input?: string) => Promise<void>;
	sendMessageWithTools: (input: string, toolResults?: any[]) => Promise<void>;
	stop: () => void;
	reload: () => Promise<void>;
	clear: () => void;
	setMessages: (messages: Message[]) => void;
}

export function useAIChat(options: UseAIChatOptions = {}): UseAIChatReturn {
	const [messages, setMessages] = useState<Message[]>(() => {
		if (options.systemPrompt) {
			return [{ role: "system", content: options.systemPrompt }];
		}
		return [];
	});

	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);
	const [metadata, setMetadata] = useState<UseAIChatReturn["metadata"]>(null);

	const abortControllerRef = useRef<AbortController | null>(null);

	const sendMessage = useCallback(
		async (inputOverride?: string) => {
			const messageText = inputOverride ?? input;
			if (!messageText.trim() && messages.length === 0) return;

			setError(null);
			setIsLoading(true);

			// Add user message
			const userMessage: Message = { role: "user", content: messageText };
			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);
			setInput("");

			// Create abort controller
			abortControllerRef.current = new AbortController();

			try {
				const response = await fetch("/api/ai/chat", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						messages: updatedMessages,
						model: options.model,
						provider: options.provider,
						temperature: options.temperature,
						maxTokens: options.maxTokens,
						tools: options.tools,
						stream: true,
					}),
					signal: abortControllerRef.current.signal,
				});

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const reader = response.body?.getReader();
				const decoder = new TextDecoder();

				let assistantMessage: Message = { role: "assistant", content: "" };
				let hasReceivedMetadata = false;

				if (reader) {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						const chunk = decoder.decode(value, { stream: true });
						const lines = chunk.split("\n");

						for (const line of lines) {
							if (line.startsWith("data: ")) {
								const data = line.slice(6);

								if (data === "[DONE]") {
									setMessages([...updatedMessages, assistantMessage]);
									options.onFinish?.(assistantMessage);
									break;
								}

								try {
									const parsed = JSON.parse(data);

									if (parsed.type === "metadata") {
										setMetadata({
											provider: parsed.provider,
											model: parsed.model,
											latency: parsed.latency,
											cached: parsed.cached,
										});
										hasReceivedMetadata = true;
									} else if (parsed.type === "chunk") {
										// Handle text chunks
										if (parsed.choices?.[0]?.delta?.content) {
											assistantMessage.content += parsed.choices[0].delta.content;

											// Update messages with streaming content
											if (hasReceivedMetadata) {
												setMessages([...updatedMessages, assistantMessage]);
											}
										}

										// Handle tool calls
										if (parsed.choices?.[0]?.delta?.tool_calls) {
											if (!assistantMessage.tool_calls) {
												assistantMessage.tool_calls = [];
											}

											for (const toolCall of parsed.choices[0].delta.tool_calls) {
												if (toolCall.index !== undefined) {
													if (!assistantMessage.tool_calls[toolCall.index]) {
														assistantMessage.tool_calls[toolCall.index] = {
															id: toolCall.id || "",
															type: "function",
															function: { name: "", arguments: "" },
														};
													}

													const tc = assistantMessage.tool_calls[toolCall.index];
													if (toolCall.id) tc.id = toolCall.id;
													if (toolCall.function?.name) {
														tc.function.name = toolCall.function.name;
													}
													if (toolCall.function?.arguments) {
														tc.function.arguments += toolCall.function.arguments;
													}
												}
											}
										}
									} else if (parsed.type === "error") {
										throw new Error(parsed.error);
									}
								} catch (e) {
									// Ignore JSON parse errors for incomplete chunks
								}
							}
						}
					}
				}
			} catch (err) {
				if (err instanceof Error && err.name === "AbortError") {
					// Request was aborted
					return;
				}

				const error = err instanceof Error ? err : new Error("Unknown error");
				setError(error);
				options.onError?.(error);
			} finally {
				setIsLoading(false);
				abortControllerRef.current = null;
			}
		},
		[messages, input, options]
	);

	const sendMessageWithTools = useCallback(
		async (input: string, toolResults?: any[]) => {
			// If we have tool results, add them as tool messages
			if (toolResults && toolResults.length > 0) {
				const toolMessages: Message[] = toolResults.map((result) => ({
					role: "tool" as const,
					content: JSON.stringify(result.response),
					name: result.id,
				}));

				setMessages((prev) => [...prev, ...toolMessages]);
			}

			// Send the message
			await sendMessage(input);
		},
		[sendMessage]
	);

	const stop = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
	}, []);

	const reload = useCallback(async () => {
		if (messages.length < 2) return;

		// Remove last assistant message and resend last user message
		const lastUserMessageIndex = messages.findLastIndex((m) => m.role === "user");
		if (lastUserMessageIndex > 0) {
			const messagesWithoutLastAssistant = messages.slice(0, lastUserMessageIndex);
			const lastUserMessage = messages[lastUserMessageIndex];

			setMessages(messagesWithoutLastAssistant);
			await sendMessage(lastUserMessage.content);
		}
	}, [messages, sendMessage]);

	const clear = useCallback(() => {
		setMessages(options.systemPrompt ? [{ role: "system", content: options.systemPrompt }] : []);
		setInput("");
		setError(null);
		setMetadata(null);
	}, [options.systemPrompt]);

	return {
		messages,
		input,
		isLoading,
		error,
		metadata,
		setInput,
		sendMessage,
		sendMessageWithTools,
		stop,
		reload,
		clear,
		setMessages,
	};
}
