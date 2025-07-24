import { afterEach, beforeEach, describe, expect, it, spyOn, test } from "vitest";
import type { IncomingMessage, StreamingMessage } from "./message-types";

describe("Message Types", () => {
	describe("StreamingMessage", () => {
		it("should accept valid streaming message with basic data", () => {
			const message: StreamingMessage = {
				role: "assistant",
				type: "text",
				data: {
					text: "Hello, world!",
					isStreaming: true,
					streamId: "stream-123",
				},
			};

			expect(message.role).toBe("assistant");
			expect(message.type).toBe("text");
			expect(message.data.text).toBe("Hello, world!");
			expect(message.data.isStreaming).toBe(true);
			expect(message.data.streamId).toBe("stream-123");
		});

		it("should accept streaming message with chunk progress", () => {
			const message: StreamingMessage = {
				role: "assistant",
				type: "text",
				data: {
					text: "Partial message...",
					isStreaming: true,
					streamId: "stream-456",
					chunkIndex: 2,
					totalChunks: 5,
				},
			};

			expect(message.data.chunkIndex).toBe(2);
			expect(message.data.totalChunks).toBe(5);
		});

		it("should accept user streaming message", () => {
			const message: StreamingMessage = {
				role: "user",
				type: "input",
				data: {
					text: "User is typing...",
					isStreaming: true,
				},
			};

			expect(message.role).toBe("user");
			expect(message.type).toBe("input");
		});

		it("should accept message with additional data properties", () => {
			const message: StreamingMessage = {
				role: "assistant",
				type: "code",
				data: {
					text: "const x = 1;",
					isStreaming: false,
					language: "javascript",
					fileName: "test.js",
					metadata: { timestamp: Date.now() },
				},
			};

			expect(message.data.language).toBe("javascript");
			expect(message.data.fileName).toBe("test.js");
			expect(message.data.metadata).toBeTruthy();
		});

		it("should accept minimal streaming message", () => {
			const message: StreamingMessage = {
				role: "assistant",
				type: "status",
				data: {},
			};

			expect(message.role).toBe("assistant");
			expect(message.type).toBe("status");
			expect(message.data).toEqual({});
		});
	});

	describe("IncomingMessage", () => {
		it("should accept valid incoming message with basic data", () => {
			const message: IncomingMessage = {
				role: "assistant",
				type: "response",
				data: {
					text: "Here is the response",
					isStreaming: false,
				},
			};

			expect(message.role).toBe("assistant");
			expect(message.type).toBe("response");
			expect(message.data.text).toBe("Here is the response");
			expect(message.data.isStreaming).toBe(false);
		});

		it("should accept incoming message with action data", () => {
			const message: IncomingMessage = {
				role: "assistant",
				type: "action",
				data: {
					call_id: "call-789",
					action: {
						command: ["npm", "install", "package"],
					},
					output: "Package installed successfully",
				},
			};

			expect(message.data.call_id).toBe("call-789");
			expect(message.data.action?.command).toEqual(["npm", "install", "package"]);
			expect(message.data.output).toBe("Package installed successfully");
		});

		it("should accept incoming message with streaming data", () => {
			const message: IncomingMessage = {
				role: "assistant",
				type: "stream",
				data: {
					text: "Streaming chunk...",
					isStreaming: true,
					streamId: "stream-incoming-123",
					chunkIndex: 0,
					totalChunks: 3,
				},
			};

			expect(message.data.streamId).toBe("stream-incoming-123");
			expect(message.data.chunkIndex).toBe(0);
			expect(message.data.totalChunks).toBe(3);
		});

		it("should accept user incoming message", () => {
			const message: IncomingMessage = {
				role: "user",
				type: "input",
				data: {
					text: "User input message",
				},
			};

			expect(message.role).toBe("user");
			expect(message.data.text).toBe("User input message");
		});

		it("should accept incoming message with all optional fields", () => {
			const message: IncomingMessage = {
				role: "assistant",
				type: "complex",
				data: {
					text: "Complex message",
					isStreaming: false,
					streamId: "stream-complex",
					chunkIndex: 5,
					totalChunks: 10,
					call_id: "call-complex-123",
					action: {
						command: ["git", "status"],
					},
					output: "On branch main",
					customField: "custom value",
					nestedData: {
						level1: {
							level2: "deep value",
						},
					},
				},
			};

			expect(message.data.text).toBe("Complex message");
			expect(message.data.customField).toBe("custom value");
			expect(message.data.nestedData).toBeTruthy();
		});

		it("should accept minimal incoming message", () => {
			const message: IncomingMessage = {
				role: "user",
				type: "ping",
				data: {},
			};

			expect(message.role).toBe("user");
			expect(message.type).toBe("ping");
			expect(message.data).toEqual({});
		});
	});

	describe("Type Compatibility", () => {
		it("should allow StreamingMessage to be used as IncomingMessage", () => {
			const streamingMessage: StreamingMessage = {
				role: "assistant",
				type: "text",
				data: {
					text: "Streaming text",
					isStreaming: true,
					streamId: "stream-123",
				},
			};

			// This should work since StreamingMessage is compatible with IncomingMessage
			const incomingMessage: IncomingMessage = streamingMessage;

			expect(incomingMessage.role).toBe("assistant");
			expect(incomingMessage.data.text).toBe("Streaming text");
		});

		it("should handle messages with different data shapes", () => {
			const messages: IncomingMessage[] = [
				{
					role: "user",
					type: "input",
					data: { text: "User message" },
				},
				{
					role: "assistant",
					type: "action",
					data: {
						call_id: "call-1",
						action: { command: ["ls", "-la"] },
						output: "file listing...",
					},
				},
				{
					role: "assistant",
					type: "stream",
					data: {
						text: "streaming...",
						isStreaming: true,
						streamId: "stream-1",
						chunkIndex: 0,
						totalChunks: 1,
					},
				},
			];

			expect(messages).toHaveLength(3);
			expect(messages[0].role).toBe("user");
			expect(messages[1].data.call_id).toBe("call-1");
			expect(messages[2].data.isStreaming).toBe(true);
		});
	});
});
