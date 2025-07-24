"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GeminiAudioMessage {
	id: string;
	type: "text" | "audio";
	content: string;
	audioUrl?: string;
	isUser: boolean;
	timestamp: Date;
}

export interface UseGeminiAudioOptions {
	voiceName?: string;
	tools?: Array<{ name: string; description: string }>;
	onMessage?: (message: GeminiAudioMessage) => void;
	onError?: (error: Error) => void;
}

export interface UseGeminiAudioReturn {
	isConnected: boolean;
	isLoading: boolean;
	messages: GeminiAudioMessage[];
	error: string | null;
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	sendMessage: (content: string) => Promise<void>;
	sendAudio: (audioBlob: Blob) => Promise<void>;
	clearMessages: () => void;
}

export function useGeminiAudio(options: UseGeminiAudioOptions = {}): UseGeminiAudioReturn {
	const [isConnected, setIsConnected] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [messages, setMessages] = useState<GeminiAudioMessage[]>([]);
	const [error, setError] = useState<string | null>(null);
	const sessionIdRef = useRef<string | null>(null);

	const { voiceName, tools, onMessage, onError } = options;

	const generateId = useCallback(() => {
		return Math.random().toString(36).substr(2, 9);
	}, []);

	const generateSessionId = useCallback(() => {
		return `session-${Math.random().toString(36).substr(2, 9)}`;
	}, []);

	const addMessage = useCallback(
		(message: Omit<GeminiAudioMessage, "id" | "timestamp">) => {
			const fullMessage: GeminiAudioMessage = {
				...message,
				id: generateId(),
				timestamp: new Date(),
			};

			setMessages((prev) => [...prev, fullMessage]);
			onMessage?.(fullMessage);

			return fullMessage;
		},
		[generateId, onMessage]
	);

	const handleError = useCallback(
		(err: Error, message: string) => {
			setError(message);
			setIsLoading(false);
			onError?.(err);
		},
		[onError]
	);

	const connect = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const sessionId = generateSessionId();
			sessionIdRef.current = sessionId;

			const response = await fetch("/api/ai/gemini/session", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					sessionId,
					voiceName,
					tools,
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to create session");
			}

			setIsConnected(true);
			setIsLoading(false);
		} catch (err) {
			const error = err instanceof Error ? err : new Error("Unknown error");
			handleError(error, error.message);
		}
	}, [generateSessionId, voiceName, tools, handleError]);

	const disconnect = useCallback(async () => {
		if (!sessionIdRef.current) return;

		try {
			await fetch(`/api/ai/gemini/session?sessionId=${sessionIdRef.current}`, {
				method: "DELETE",
			});
		} catch (err) {
			console.error("Failed to disconnect:", err);
		} finally {
			setIsConnected(false);
			sessionIdRef.current = null;
		}
	}, []);

	const sendMessage = useCallback(
		async (content: string) => {
			if (!isConnected || !sessionIdRef.current) {
				throw new Error("Not connected");
			}

			// Add user message
			addMessage({
				type: "text",
				content,
				isUser: true,
			});

			try {
				const response = await fetch("/api/ai/gemini/audio", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						sessionId: sessionIdRef.current,
						content,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to send message");
				}

				// Simulate AI response after a delay
				setTimeout(() => {
					addMessage({
						type: "text",
						content: `This is a simulated response to: "${content}"`,
						isUser: false,
					});
				}, 1000);
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Unknown error");
				handleError(error, "Failed to send message");
			}
		},
		[isConnected, addMessage, handleError]
	);

	const sendAudio = useCallback(
		async (audioBlob: Blob) => {
			if (!isConnected || !sessionIdRef.current) {
				throw new Error("Not connected");
			}

			try {
				// Convert blob to base64
				const base64Audio = await new Promise<string>((resolve, reject) => {
					const reader = new FileReader();
					reader.onloadend = () => resolve(reader.result as string);
					reader.onerror = reject;
					reader.readAsDataURL(audioBlob);
				});

				// Add user audio message
				addMessage({
					type: "audio",
					content: "Audio message",
					audioUrl: base64Audio,
					isUser: true,
				});

				const response = await fetch("/api/ai/gemini/audio", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						sessionId: sessionIdRef.current,
						audioData: base64Audio,
					}),
				});

				if (!response.ok) {
					throw new Error("Failed to send audio");
				}

				// Simulate AI response
				setTimeout(() => {
					addMessage({
						type: "text",
						content: "I received your audio message.",
						isUser: false,
					});
				}, 1000);
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Unknown error");
				handleError(error, "Failed to send audio");
			}
		},
		[isConnected, addMessage, handleError]
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (isConnected && sessionIdRef.current) {
				disconnect();
			}
		};
	}, [isConnected, disconnect]);

	return {
		isConnected,
		isLoading,
		messages,
		error,
		connect,
		disconnect,
		sendMessage,
		sendAudio,
		clearMessages,
	};
}
