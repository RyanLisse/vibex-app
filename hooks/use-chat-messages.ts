import { useCallback, useEffect, useRef, useState } from "react";
import type { GeminiAudioMessage } from "@/hooks/use-gemini-audio";

export interface UseChatMessagesOptions {
	autoScroll?: boolean;
	maxMessages?: number;
	onMessageAdded?: (message: GeminiAudioMessage) => void;
}

export function useChatMessages(options: UseChatMessagesOptions = {}) {
	const [messages, setMessages] = useState<GeminiAudioMessage[]>([]);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const { autoScroll = true, maxMessages = 1000 } = options;

	const addMessage = useCallback(
		(message: GeminiAudioMessage) => {
			setMessages((prev) => {
				const updated = [...prev, message];
				// Limit messages to prevent memory issues
				if (updated.length > maxMessages) {
					return updated.slice(-maxMessages);
				}
				return updated;
			});
			options.onMessageAdded?.(message);
		},
		[maxMessages, options],
	);

	const addMessages = useCallback(
		(newMessages: GeminiAudioMessage[]) => {
			setMessages((prev) => {
				const updated = [...prev, ...newMessages];
				if (updated.length > maxMessages) {
					return updated.slice(-maxMessages);
				}
				return updated;
			});
		},
		[maxMessages],
	);

	const clearMessages = useCallback(() => {
		setMessages([]);
	}, []);

	const removeMessage = useCallback((messageId: string) => {
		setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
	}, []);

	const updateMessage = useCallback(
		(messageId: string, updates: Partial<GeminiAudioMessage>) => {
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === messageId ? { ...msg, ...updates } : msg,
				),
			);
		},
		[],
	);

	// Auto-scroll functionality
	useEffect(() => {
		if (autoScroll && scrollAreaRef.current) {
			const scrollArea = scrollAreaRef.current;
			const shouldScroll =
				scrollArea.scrollTop >=
				scrollArea.scrollHeight - scrollArea.clientHeight - 100;

			if (shouldScroll) {
				scrollArea.scrollTop = scrollArea.scrollHeight;
			}
		}
	}, [autoScroll]);

	const scrollToBottom = useCallback(() => {
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
		}
	}, []);

	const scrollToMessage = useCallback((messageId: string) => {
		if (scrollAreaRef.current) {
			const messageElement = scrollAreaRef.current.querySelector(
				`[data-message-id="${messageId}"]`,
			);
			if (messageElement) {
				messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
			}
		}
	}, []);

	return {
		messages,
		scrollAreaRef,
		addMessage,
		addMessages,
		clearMessages,
		removeMessage,
		updateMessage,
		scrollToBottom,
		scrollToMessage,
	};
}
