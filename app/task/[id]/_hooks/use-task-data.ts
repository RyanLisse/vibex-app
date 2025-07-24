import { useEffect, useMemo } from "react";
import type { StreamingMessage, Task } from "@/db/schema";
import { useUpdateTask } from "@/lib/query/hooks";
import {
	filterChatMessages,
	filterShellMessages,
	hasStreamingMessages,
	isTaskInProgress,
} from "../_utils/message-utils";

interface UseTaskDataProps {
	task: Task | undefined;
	streamingMessages: Map<string, StreamingMessage>;
}

interface UseTaskDataReturn {
	regularMessages: Task["messages"];
	shellMessages: Task["messages"];
	hasStreamingMessages: boolean;
	isTaskInProgress: boolean;
}

export function useTaskData({ task, streamingMessages }: UseTaskDataProps): UseTaskDataReturn {
	const updateTaskMutation = useUpdateTask();

	// Mark task as viewed when component mounts
	useEffect(() => {
		if (task) {
			updateTaskMutation.mutate({
				id: task.id,
				hasChanges: false,
			});
		}
	}, [task, updateTaskMutation]);

	// Memoize filtered messages to prevent unnecessary re-renders
	const regularMessages = useMemo(() => {
		if (!task?.messages) {
			return [];
		}
		return filterChatMessages(task.messages);
	}, [task?.messages]);

	const shellMessages = useMemo(() => {
		if (!task?.messages) {
			return [];
		}
		return filterShellMessages(task.messages);
	}, [task?.messages]);

	const hasStreamingMessagesValue = useMemo(() => {
		return hasStreamingMessages(streamingMessages);
	}, [streamingMessages]);

	const isTaskInProgressValue = useMemo(() => {
		return task ? isTaskInProgress(task) : false;
	}, [task]);

	return {
		regularMessages,
		shellMessages,
		hasStreamingMessages: hasStreamingMessagesValue,
		isTaskInProgress: isTaskInProgressValue,
	};
}
