/**
 * Shared Message Test Utilities
 *
 * Eliminates duplicate message test patterns by providing
 * reusable message objects, guards, and test utilities.
 */

import { expect, vi } from "vitest";

// Message test types
export interface TestMessage {
	id: string;
	type: "user" | "assistant" | "system" | "error" | "status" | "tool";
	content: string;
	timestamp: number;
	status: "complete" | "streaming" | "error" | "pending";
	tool?: {
		name: string;
		input: Record<string, any>;
		output?: string;
	};
}

/**
 * Base message factory for consistent test messages
 */
export class MessageTestFactory {
	private static counter = 0;

	static createBaseMessage(overrides: Partial<TestMessage> = {}): TestMessage {
		return {
			id: `msg-${++MessageTestFactory.counter}`,
			type: "user",
			content: "Test message",
			timestamp: Date.now(),
			status: "complete",
			...overrides,
		};
	}

	static createUserMessage(
		content = "User message",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "user",
			content,
			...overrides,
		});
	}

	static createAssistantMessage(
		content = "Assistant message",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "assistant",
			content,
			...overrides,
		});
	}

	static createSystemMessage(
		content = "System message",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "system",
			content,
			...overrides,
		});
	}

	static createErrorMessage(
		content = "Error occurred",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "error",
			status: "error",
			content,
			...overrides,
		});
	}

	static createStatusMessage(
		content = "Status update",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "status",
			content,
			...overrides,
		});
	}

	static createToolMessage(
		toolName = "file_read",
		input: Record<string, any> = { path: "/test.txt" },
		output = "Tool output",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			type: "tool",
			content: `Tool ${toolName} executed`,
			tool: {
				name: toolName,
				input,
				output,
			},
			...overrides,
		});
	}

	static createStreamingMessage(
		content = "Streaming...",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			status: "streaming",
			content,
			...overrides,
		});
	}

	static createPendingMessage(
		content = "Pending...",
		overrides: Partial<TestMessage> = {},
	): TestMessage {
		return MessageTestFactory.createBaseMessage({
			status: "pending",
			content,
			...overrides,
		});
	}
}

/**
 * Message array factories for common test scenarios
 */
export class MessageArrayFactory {
	/**
	 * Create a conversation with alternating user/assistant messages
	 */
	static createConversation(length = 4): TestMessage[] {
		const messages: TestMessage[] = [];

		for (let i = 0; i < length; i++) {
			const isUser = i % 2 === 0;
			messages.push(
				isUser
					? MessageTestFactory.createUserMessage(`User message ${i + 1}`)
					: MessageTestFactory.createAssistantMessage(
							`Assistant message ${i + 1}`,
						),
			);
		}

		return messages;
	}

	/**
	 * Create messages with different statuses
	 */
	static createMixedStatusMessages(): TestMessage[] {
		return [
			MessageTestFactory.createBaseMessage({ id: "msg-1", status: "complete" }),
			MessageTestFactory.createBaseMessage({
				id: "msg-2",
				status: "streaming",
			}),
			MessageTestFactory.createBaseMessage({ id: "msg-3", status: "complete" }),
			MessageTestFactory.createBaseMessage({ id: "msg-4", status: "error" }),
		];
	}

	/**
	 * Create messages with different types
	 */
	static createMixedTypeMessages(): TestMessage[] {
		return [
			MessageTestFactory.createUserMessage("User question"),
			MessageTestFactory.createAssistantMessage("Assistant response"),
			MessageTestFactory.createSystemMessage("System notification"),
			MessageTestFactory.createToolMessage(
				"file_read",
				{ path: "/test.txt" },
				"File content",
			),
			MessageTestFactory.createErrorMessage("Something went wrong"),
			MessageTestFactory.createStatusMessage("Processing..."),
		];
	}

	/**
	 * Create messages with timestamps for sorting tests
	 */
	static createTimestampedMessages(): TestMessage[] {
		return [
			MessageTestFactory.createBaseMessage({ id: "msg-1", timestamp: 3000 }),
			MessageTestFactory.createBaseMessage({ id: "msg-2", timestamp: 1000 }),
			MessageTestFactory.createBaseMessage({ id: "msg-3", timestamp: 2000 }),
		];
	}
}

/**
 * Message guard test patterns
 */
export class MessageGuardTests {
	static testMessageTypeGuard(
		guardFunction: (msg: TestMessage) => boolean,
		targetType: TestMessage["type"],
		messages: TestMessage[] = MessageArrayFactory.createMixedTypeMessages(),
	) {
		return () => {
			const targetMessages = messages.filter((msg) => msg.type === targetType);
			const otherMessages = messages.filter((msg) => msg.type !== targetType);

			// Should return true for target type
			targetMessages.forEach((msg) => {
				expect(guardFunction(msg)).toBe(true);
			});

			// Should return false for other types
			otherMessages.forEach((msg) => {
				expect(guardFunction(msg)).toBe(false);
			});
		};
	}

	static testMessageStatusGuard(
		guardFunction: (msg: TestMessage) => boolean,
		targetStatus: TestMessage["status"],
		messages: TestMessage[] = MessageArrayFactory.createMixedStatusMessages(),
	) {
		return () => {
			const targetMessages = messages.filter(
				(msg) => msg.status === targetStatus,
			);
			const otherMessages = messages.filter(
				(msg) => msg.status !== targetStatus,
			);

			// Should return true for target status
			targetMessages.forEach((msg) => {
				expect(guardFunction(msg)).toBe(true);
			});

			// Should return false for other statuses
			otherMessages.forEach((msg) => {
				expect(guardFunction(msg)).toBe(false);
			});
		};
	}
}

/**
 * Message utility test patterns
 */
export class MessageUtilTests {
	static testMessageFiltering(
		filterFunction: (messages: TestMessage[], criteria: any) => TestMessage[],
		testCases: Array<{
			messages: TestMessage[];
			criteria: any;
			expectedLength: number;
			description: string;
		}>,
	) {
		return testCases.map((testCase) => ({
			[testCase.description]: () => {
				const result = filterFunction(testCase.messages, testCase.criteria);
				expect(result).toHaveLength(testCase.expectedLength);
			},
		}));
	}

	static testMessageSorting(
		sortFunction: (
			messages: TestMessage[],
			order?: "asc" | "desc",
		) => TestMessage[],
		messages: TestMessage[] = MessageArrayFactory.createTimestampedMessages(),
	) {
		return {
			"should sort messages by timestamp ascending": () => {
				const sorted = sortFunction(messages);
				expect(sorted[0].id).toBe("msg-2");
				expect(sorted[1].id).toBe("msg-3");
				expect(sorted[2].id).toBe("msg-1");
			},
			"should sort messages by timestamp descending": () => {
				const sorted = sortFunction(messages, "desc");
				expect(sorted[0].id).toBe("msg-1");
				expect(sorted[1].id).toBe("msg-3");
				expect(sorted[2].id).toBe("msg-2");
			},
		};
	}

	static testMessageSearch(
		searchFunction: (messages: TestMessage[], id: string) => TestMessage | null,
		messages: TestMessage[] = MessageArrayFactory.createConversation(3),
	) {
		return {
			"should find message by id": () => {
				const message = searchFunction(messages, messages[1].id);
				expect(message?.id).toBe(messages[1].id);
			},
			"should return null for non-existing id": () => {
				const message = searchFunction(messages, "non-existing");
				expect(message).toBeNull();
			},
		};
	}
}

/**
 * Mock message handlers for testing
 */
export class MessageMockFactory {
	static createMessageHandler() {
		return {
			create: vi.fn(),
			update: vi.fn(),
			delete: vi.fn(),
			getById: vi.fn(),
			getAll: vi.fn(),
			filter: vi.fn(),
			sort: vi.fn(),
		};
	}

	static createMessageStream() {
		return {
			send: vi.fn(),
			close: vi.fn(),
			onMessage: vi.fn(),
			onError: vi.fn(),
			isConnected: vi.fn().mockReturnValue(true),
		};
	}

	static createMessageValidator() {
		return {
			validate: vi.fn(),
			isValid: vi.fn(),
			getErrors: vi.fn(),
		};
	}
}

/**
 * Standard message test scenarios
 */
export class MessageTestScenarios {
	/**
	 * Test message validation scenarios
	 */
	static getValidationTests(validateFunction: (msg: any) => boolean) {
		const baseMessage = MessageTestFactory.createBaseMessage();

		return {
			"should validate correct message": () => {
				expect(validateFunction(baseMessage)).toBe(true);
			},
			"should reject message without id": () => {
				const invalidMessage = { ...baseMessage, id: undefined };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message without type": () => {
				const invalidMessage = { ...baseMessage, type: undefined };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message without content": () => {
				const invalidMessage = { ...baseMessage, content: undefined };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message without timestamp": () => {
				const invalidMessage = { ...baseMessage, timestamp: undefined };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message without status": () => {
				const invalidMessage = { ...baseMessage, status: undefined };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message with invalid type": () => {
				const invalidMessage = { ...baseMessage, type: "invalid" };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
			"should reject message with invalid status": () => {
				const invalidMessage = { ...baseMessage, status: "invalid" };
				expect(validateFunction(invalidMessage)).toBe(false);
			},
		};
	}

	/**
	 * Test message creation scenarios
	 */
	static getCreationTests(createFunction: (data: any) => TestMessage) {
		return {
			"should create valid message": () => {
				const message = createFunction({
					type: "user",
					content: "Test message",
				});

				expect(message.id).toBeDefined();
				expect(message.type).toBe("user");
				expect(message.content).toBe("Test message");
				expect(message.timestamp).toBeDefined();
				expect(message.status).toBe("complete");
			},
			"should create message with custom status": () => {
				const message = createFunction({
					type: "assistant",
					content: "Streaming...",
					status: "streaming",
				});

				expect(message.status).toBe("streaming");
			},
			"should create tool message": () => {
				const message = createFunction({
					type: "tool",
					content: "Tool executed",
					tool: {
						name: "file_read",
						input: { path: "/test.txt" },
						output: "File content",
					},
				});

				expect(message.type).toBe("tool");
				expect(message.tool).toBeDefined();
				expect(message.tool?.name).toBe("file_read");
			},
		};
	}

	/**
	 * Test message update scenarios
	 */
	static getUpdateTests(
		updateFunction: (
			msg: TestMessage,
			updates: Partial<TestMessage>,
		) => TestMessage,
	) {
		const baseMessage = MessageTestFactory.createBaseMessage();

		return {
			"should update message content": () => {
				const updatedMessage = updateFunction(baseMessage, {
					content: "Updated content",
				});

				expect(updatedMessage.content).toBe("Updated content");
				expect(updatedMessage.id).toBe(baseMessage.id);
			},
			"should update message status": () => {
				const updatedMessage = updateFunction(baseMessage, {
					status: "streaming",
				});

				expect(updatedMessage.status).toBe("streaming");
			},
			"should update multiple fields": () => {
				const updatedMessage = updateFunction(baseMessage, {
					content: "New content",
					status: "error",
					type: "error",
				});

				expect(updatedMessage.content).toBe("New content");
				expect(updatedMessage.status).toBe("error");
				expect(updatedMessage.type).toBe("error");
			},
		};
	}
}

// Re-export commonly used factories for convenience
export const createMessage = MessageTestFactory.createBaseMessage;
export const createUserMessage = MessageTestFactory.createUserMessage;
export const createAssistantMessage = MessageTestFactory.createAssistantMessage;
export const createToolMessage = MessageTestFactory.createToolMessage;
export const createConversation = MessageArrayFactory.createConversation;
