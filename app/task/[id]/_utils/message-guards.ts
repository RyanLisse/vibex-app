/**
 * Message type guards and utilities
 */

export interface BaseMessage {
	id: string;
	role: "user" | "assistant" | "system" | "tool";
	type: string;
	content?: string;
	data?: any;
	timestamp?: Date | string;
	status?: "pending" | "streaming" | "complete" | "error";
}

export interface ChatMessage extends BaseMessage {
	role: "user" | "assistant";
	type: "message";
	content: string;
}

export interface ShellMessage extends BaseMessage {
	role: "assistant";
	type: "local_shell_call" | "local_shell_call_output";
	data: {
		command?: string[];
		output?: string;
		exitCode?: number;
	};
}

export interface ToolMessage extends BaseMessage {
	role: "tool";
	type: "tool_call" | "tool_result";
	data: {
		name: string;
		input?: any;
		output?: any;
		error?: string;
	};
}

export interface StreamingMessage extends BaseMessage {
	status: "streaming";
	content: string;
}

/**
 * Type guard to check if message is a chat message
 */
export function isChatMessage(message: any): message is ChatMessage {
	return (
		message &&
		typeof message === "object" &&
		typeof message.id === "string" &&
		(message.role === "user" || message.role === "assistant") &&
		message.type === "message" &&
		typeof message.content === "string"
	);
}

/**
 * Type guard to check if message is a shell message
 */
export function isShellMessage(message: any): message is ShellMessage {
	return (
		message &&
		typeof message === "object" &&
		typeof message.id === "string" &&
		message.role === "assistant" &&
		(message.type === "local_shell_call" ||
			message.type === "local_shell_call_output") &&
		message.data &&
		typeof message.data === "object"
	);
}

/**
 * Type guard to check if message is a tool message
 */
export function isToolMessage(message: any): message is ToolMessage {
	return (
		message &&
		typeof message === "object" &&
		typeof message.id === "string" &&
		message.role === "tool" &&
		(message.type === "tool_call" || message.type === "tool_result") &&
		message.data &&
		typeof message.data === "object" &&
		typeof message.data.name === "string"
	);
}

/**
 * Type guard to check if message is streaming
 */
export function isStreamingMessage(message: any): message is StreamingMessage {
	return (
		message &&
		typeof message === "object" &&
		typeof message.id === "string" &&
		message.status === "streaming" &&
		typeof message.content === "string"
	);
}

/**
 * Filter messages to get only chat messages
 */
export function filterChatMessages(messages: BaseMessage[]): ChatMessage[] {
	return messages.filter(isChatMessage);
}

/**
 * Filter messages to get only shell messages
 */
export function filterShellMessages(messages: BaseMessage[]): ShellMessage[] {
	return messages.filter(isShellMessage);
}

/**
 * Filter messages to get only tool messages
 */
export function filterToolMessages(messages: BaseMessage[]): ToolMessage[] {
	return messages.filter(isToolMessage);
}

/**
 * Filter messages to get only streaming messages
 */
export function filterStreamingMessages(
	messages: BaseMessage[],
): StreamingMessage[] {
	return messages.filter(isStreamingMessage);
}

/**
 * Create a new message with proper structure
 */
export function createMessage(
	role: BaseMessage["role"],
	type: string,
	content?: string,
	data?: any,
): BaseMessage {
	return {
		id: crypto.randomUUID(),
		role,
		type,
		content,
		data,
		timestamp: new Date().toISOString(),
		status: "complete",
	};
}

/**
 * Update message with new data
 */
export function updateMessage(
	message: BaseMessage,
	updates: Partial<BaseMessage>,
): BaseMessage {
	return {
		...message,
		...updates,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Validate message structure
 */
export function validateMessage(message: any): message is BaseMessage {
	return (
		message &&
		typeof message === "object" &&
		typeof message.id === "string" &&
		typeof message.role === "string" &&
		typeof message.type === "string"
	);
}
