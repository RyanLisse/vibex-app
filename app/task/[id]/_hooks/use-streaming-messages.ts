import { useCallback, useRef } from "react";
import type { StreamingMessage } from "@/app/task/[id]/_types/message-types";

interface UseStreamingMessagesProps {
	streamingMessages: Map<string, StreamingMessage>;
	onUpdate: (
		updater: React.SetStateAction<Map<string, StreamingMessage>>,
	) => void;
}

export function useStreamingMessages({
	streamingMessages,
	onUpdate,
}: UseStreamingMessagesProps) {
	const isUnmountedRef = useRef(false);

	const updateStreamingMessage = useCallback(
		(streamId: string, message: StreamingMessage) => {
			if (isUnmountedRef.current) {
				return;
			}

			onUpdate((prev) => {
				const newMap = new Map(prev);
				const existingMessage = newMap.get(streamId);

				if (existingMessage) {
					// Merge existing message with new data
					newMap.set(streamId, {
						...existingMessage,
						data: {
							...existingMessage.data,
							...message.data,
							text:
								(existingMessage.data.text || "") + (message.data.text || ""),
						},
					});
				} else {
					newMap.set(streamId, message);
				}

				return newMap;
			});
		},
		[onUpdate],
	);

	const removeStreamingMessage = useCallback(
		(streamId: string) => {
			if (isUnmountedRef.current) {
				return;
			}

			onUpdate((prev) => {
				const newMap = new Map(prev);
				newMap.delete(streamId);
				return newMap;
			});
		},
		[onUpdate],
	);

	const clearAllStreamingMessages = useCallback(() => {
		if (isUnmountedRef.current) {
			return;
		}
		onUpdate(new Map());
	}, [onUpdate]);

	const hasStreamingMessage = useCallback(
		(streamId: string) => streamingMessages.has(streamId),
		[streamingMessages],
	);

	const getStreamingMessage = useCallback(
		(streamId: string) => streamingMessages.get(streamId),
		[streamingMessages],
	);

	// Cleanup on unmount
	const markAsUnmounted = useCallback(() => {
		isUnmountedRef.current = true;
	}, []);

	return {
		updateStreamingMessage,
		removeStreamingMessage,
		clearAllStreamingMessages,
		hasStreamingMessage,
		getStreamingMessage,
		markAsUnmounted,
		streamingMessagesCount: streamingMessages.size,
	};
}
