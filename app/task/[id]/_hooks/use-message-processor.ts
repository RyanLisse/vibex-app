import { useCallback } from "react";
import {
	IncomingMessage,
	StreamingMessage,
} from "@/app/task/[id]/_types/message-types";
import { useUpdateTask } from "@/lib/query/hooks";
import {
	isCompletedStreamMessage,
	isStreamingMessage,
	isValidIncomingMessage,
} from "../_utils/message-guards";

interface UseMessageProcessorProps {
	taskId: string;
	taskMessages: Array<{
		role: "user" | "assistant";
		type: string;
		data: Record<string, unknown>;
	}>;
	streamingMessages: Map<string, StreamingMessage>;
	setStreamingMessages: React.Dispatch<
		React.SetStateAction<Map<string, StreamingMessage>>
	>;
}

export function useMessageProcessor({
	taskId,
	taskMessages,
	streamingMessages,
	setStreamingMessages,
}: UseMessageProcessorProps) {
	const updateTaskMutation = useUpdateTask();

	const processStreamingMessage = useCallback(
		(
			message: IncomingMessage & {
				data: { isStreaming: true; streamId: string };
			},
		) => {
			const streamId = message.data.streamId;

			setStreamingMessages((prev) => {
				const newMap = new Map(prev);
				const existingMessage = newMap.get(streamId);

				if (existingMessage) {
					newMap.set(streamId, {
						...existingMessage,
						data: {
							...existingMessage.data,
							text:
								(existingMessage.data.text || "") + (message.data.text || ""),
							chunkIndex: message.data.chunkIndex,
							totalChunks: message.data.totalChunks,
						},
					});
				} else {
					newMap.set(streamId, message as StreamingMessage);
				}

				return newMap;
			});
		},
		[setStreamingMessages],
	);

	const processCompletedStream = useCallback(
		(
			message: IncomingMessage & {
				data: { streamId: string; isStreaming: false };
			},
		) => {
			const streamId = message.data.streamId;
			const streamingMessage = streamingMessages.get(streamId);

			if (streamingMessage) {
				updateTaskMutation.mutate({
					id: taskId,
					messages: [
						...taskMessages,
						{
							...streamingMessage,
							data: {
								...streamingMessage.data,
								text:
									(message.data.text as string) || streamingMessage.data.text,
								isStreaming: false,
							},
						} as {
							role: "user" | "assistant";
							type: string;
							data: Record<string, unknown>;
						},
					],
				});

				setStreamingMessages((prev) => {
					const newMap = new Map(prev);
					newMap.delete(streamId);
					return newMap;
				});
			}
		},
		[
			taskId,
			taskMessages,
			streamingMessages,
			updateTaskMutation,
			setStreamingMessages,
		],
	);

	const processRegularMessage = useCallback(
		(message: IncomingMessage) => {
			updateTaskMutation.mutate({
				id: taskId,
				messages: [
					...taskMessages,
					message as {
						role: "user" | "assistant";
						type: string;
						data: Record<string, unknown>;
					},
				],
			});
		},
		[taskId, taskMessages, updateTaskMutation],
	);

	const processMessage = useCallback(
		(message: unknown) => {
			if (!isValidIncomingMessage(message)) {
				return;
			}

			if (isStreamingMessage(message)) {
				processStreamingMessage(message);
			} else if (isCompletedStreamMessage(message)) {
				processCompletedStream(message);
			} else {
				processRegularMessage(message);
			}
		},
		[processStreamingMessage, processCompletedStream, processRegularMessage],
	);

	return { processMessage };
}
