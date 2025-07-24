"use client";

import { useCallback, useState } from "react";

export interface TaskMessage {
	id: string;
	role: "user" | "assistant" | "system";
	type: "text" | "stream" | "tool_call" | "error";
	content: string;
	data?: Record<string, unknown>;
	timestamp: Date;
	streamId?: string;
	isComplete?: boolean;
}

export interface StreamingMessage {
	id: string;
	streamId: string;
	role: "assistant";
	type: "stream";
	content: string;
	data: {
		text: string;
		chunkIndex: number;
		totalChunks: number;
		isComplete: boolean;
	};
	timestamp: Date;
}

export interface UseTaskMessageProcessingOptions {
	taskId: string;
	onMessageReceived?: (message: TaskMessage) => void;
	onStreamComplete?: (message: TaskMessage) => void;
	onError?: (error: Error) => void;
}

export interface UseTaskMessageProcessingReturn {
	messages: TaskMessage[];
	streamingMessages: Map<string, StreamingMessage>;
	isProcessing: boolean;
	error: string | null;
	processMessage: (rawMessage: any) => void;
	addMessage: (message: Omit<TaskMessage, "id" | "timestamp">) => void;
	clearMessages: () => void;
	getMessageById: (id: string) => TaskMessage | undefined;
	getStreamingMessageById: (streamId: string) => StreamingMessage | undefined;
}

export function useTaskMessageProcessing(
	options: UseTaskMessageProcessingOptions
): UseTaskMessageProcessingReturn {
	const [messages, setMessages] = useState<TaskMessage[]>([]);
	const [streamingMessages, setStreamingMessages] = useState<Map<string, StreamingMessage>>(
		new Map()
	);
	const [isProcessing, setIsProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { taskId, onMessageReceived, onStreamComplete, onError } = options;

	const generateId = useCallback(() => {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	const generateStreamId = useCallback(() => {
		return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	const addMessage = useCallback(
		(message: Omit<TaskMessage, "id" | "timestamp">) => {
			const fullMessage: TaskMessage = {
				...message,
				id: generateId(),
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, fullMessage]);
			onMessageReceived?.(fullMessage);

			return fullMessage;
		},
		[generateId, onMessageReceived]
	);

	const processStreamingMessage = useCallback(
		(rawMessage: any) => {
			if (!rawMessage.data?.streamId) {
				console.warn("Streaming message missing streamId:", rawMessage);
				return;
			}

			const streamId = rawMessage.data.streamId;

			setStreamingMessages((prev) => {
				const newMap = new Map(prev);
				const existingMessage = newMap.get(streamId);

				if (existingMessage) {
					// Update existing streaming message
					const updatedMessage: StreamingMessage = {
						...existingMessage,
						content: existingMessage.content + (rawMessage.data.text || ""),
						data: {
							...existingMessage.data,
							text: existingMessage.data.text + (rawMessage.data.text || ""),
							chunkIndex: rawMessage.data.chunkIndex || existingMessage.data.chunkIndex,
							totalChunks: rawMessage.data.totalChunks || existingMessage.data.totalChunks,
							isComplete: rawMessage.data.isComplete || false,
						},
					};

					newMap.set(streamId, updatedMessage);

					// If stream is complete, move to regular messages
					if (updatedMessage.data.isComplete) {
						const finalMessage = addMessage({
							role: updatedMessage.role,
							type: "text",
							content: updatedMessage.content,
							data: updatedMessage.data,
							streamId: updatedMessage.streamId,
							isComplete: true,
						});

						onStreamComplete?.(finalMessage);

						// Remove from streaming messages
						newMap.delete(streamId);
					}
				} else {
					// Create new streaming message
					const newStreamingMessage: StreamingMessage = {
						id: generateId(),
						streamId,
						role: "assistant",
						type: "stream",
						content: rawMessage.data.text || "",
						data: {
							text: rawMessage.data.text || "",
							chunkIndex: rawMessage.data.chunkIndex || 0,
							totalChunks: rawMessage.data.totalChunks || 1,
							isComplete: rawMessage.data.isComplete || false,
						},
						timestamp: new Date(),
					};

					newMap.set(streamId, newStreamingMessage);
				}

				return newMap;
			});
		},
		[addMessage, generateId, onStreamComplete]
	);

	const processMessage = useCallback(
		(rawMessage: any) => {
			setIsProcessing(true);
			setError(null);

			try {
				// Validate message structure
				if (!rawMessage || typeof rawMessage !== "object") {
					throw new Error("Invalid message format");
				}

				// Handle different message types
				if (rawMessage.data?.isStreaming) {
					processStreamingMessage(rawMessage);
				} else {
					// Regular message
					const message: Omit<TaskMessage, "id" | "timestamp"> = {
						role: rawMessage.role || "assistant",
						type: rawMessage.type || "text",
						content: rawMessage.content || rawMessage.data?.text || "",
						data: rawMessage.data,
						streamId: rawMessage.data?.streamId,
						isComplete: rawMessage.data?.isComplete !== false,
					};

					addMessage(message);
				}
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Unknown error processing message");
				setError(error.message);
				onError?.(error);
			} finally {
				setIsProcessing(false);
			}
		},
		[processStreamingMessage, addMessage, onError]
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
		setStreamingMessages(new Map());
		setError(null);
	}, []);

	const getMessageById = useCallback(
		(id: string) => {
			return messages.find((msg) => msg.id === id);
		},
		[messages]
	);

	const getStreamingMessageById = useCallback(
		(streamId: string) => {
			return streamingMessages.get(streamId);
		},
		[streamingMessages]
	);

	return {
		messages,
		streamingMessages,
		isProcessing,
		error,
		processMessage,
		addMessage,
		clearMessages,
		getMessageById,
		getStreamingMessageById,
	};
}
