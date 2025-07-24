import type { StreamingMessage, StreamProgress } from "@/app/task/[id]/_types/task-types";
import type { Task } from "@/types/task";

/**
 * Filters messages to get only chat messages (user/assistant interactions)
 */
export function filterChatMessages(messages: Task["messages"]): Task["messages"] {
	if (!messages) return [];
	return messages.filter((message) => message.role === "user" || message.role === "assistant");
}

/**
 * Filters messages to get only shell/system messages
 */
export function filterShellMessages(messages: Task["messages"]): Task["messages"] {
	if (!messages) return [];
	return messages.filter((message) => message.type === "shell" || message.type === "system");
}

/**
 * Checks if there are any streaming messages
 */
export function hasStreamingMessages(streamingMessages: Map<string, StreamingMessage>): boolean {
	return streamingMessages.size > 0;
}

/**
 * Checks if a task is currently in progress
 */
export function isTaskInProgress(task: Task): boolean {
	return task.status === "running" || task.status === "pending";
}

/**
 * Gets repository URL from repository data
 */
export function getRepositoryUrl(repository?: { url?: string } | string): string | undefined {
	if (typeof repository === "string") {
		return repository;
	}
	return repository?.url;
}

/**
 * Extracts text content from message data
 */
export function getMessageText(data: Record<string, unknown>): string {
	if (typeof data.text === "string") {
		return data.text;
	}
	if (typeof data.content === "string") {
		return data.content;
	}
	if (typeof data.message === "string") {
		return data.message;
	}
	return "";
}

/**
 * Generates a unique key for a message
 */
export function getMessageKey(message: { id?: string; type: string }, index: number): string {
	return message.id || `${message.type}-${index}`;
}

/**
 * Gets stream progress from a streaming message
 */
export function getStreamProgress(message: StreamingMessage): StreamProgress | undefined {
	const data = message.data;
	if (typeof data.progress === "object" && data.progress !== null) {
		return data.progress as StreamProgress;
	}
	return undefined;
}
