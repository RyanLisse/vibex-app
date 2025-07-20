import { useEffect, useMemo, useRef } from "react";
import type { StreamingMessage } from "@/app/task/[id]/_types/message-types";
import type { Task } from "@/db/schema";
import { useUpdateTask } from "@/lib/query/hooks";
	filterChatMessages,
	filterShellMessages,
	hasStreamingMessages,
	isTaskInProgress,
} from "../_utils/message-utils";

interface UseOptimizedTaskDataProps {
	task: Task | undefined;
	streamingMessages: Map<string, StreamingMessage>;
}

interface UseOptimizedTaskDataReturn {
	regularMessages: Task["messages"];
	shellMessages: Task["messages"];
	hasStreamingMessages: boolean;
	isTaskInProgress: boolean;
}

/**
 * Optimized task data hook with improved performance
 * - Reduces unnecessary re-renders with shallow comparison
 * - Memoizes expensive computations
 * - Handles task state updates efficiently
 */
export function useOptimizedTaskData({
	task,
	streamingMessages,
}: UseOptimizedTaskDataProps): UseOptimizedTaskDataReturn {
	const updateTaskMutation = useUpdateTask();
	const previousTaskId = useRef<string | null>(null);
	const isFirstRender = useRef(true);

	// Mark task as viewed when component mounts or task changes
	useEffect(() => {
		if (task && (task.id !== previousTaskId.current || isFirstRender.current)) {
			updateTaskMutation.mutate({
				id: task.id,
				hasChanges: false,
			});
			previousTaskId.current = task.id;
			isFirstRender.current = false;
		}
	}, [task, updateTaskMutation]);

	// Memoize filtered messages with stable references
	const regularMessages = useMemo(() => {
		if (!task?.messages) {
			return [];
		}
		return filterChatMessages(task.messages);
	}, [task]);

	const shellMessages = useMemo(() => {
		if (!task?.messages) {
			return [];
		}
		return filterShellMessages(task.messages);
	}, [task]);

	// Memoize streaming state checks
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
