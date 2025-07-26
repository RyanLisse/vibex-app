import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { GeminiAudioChat } from "./gemini-audio-chat";

// Mock the hooks
// vi.mock("@/hooks/use-audio-chat-integration", () => ({
// 	useAudioChatIntegration: vi.fn(() => ({
// 		isConnected: false,
// 		isLoading: false,
// 		connectionError: null,
// 		isRecording: false,
// 		formattedDuration: "00:00",
// 		recordingError: null,
// 		isPlaying: false,
// 		playingMessageId: null,
// 		playbackError: null,
// 		messages: [],
// 		messageError: null,
// 		hasError: false,
// 		primaryError: null,
// 		connect: vi.fn(),
// 		disconnect: vi.fn(),
// 		sendMessage: vi.fn(),
// 		startRecording: vi.fn(),
// 		stopRecording: vi.fn(),
// 		playAudio: vi.fn(),
// 		clearMessages: vi.fn(),
// 		clearAllErrors: vi.fn(),
// 		scrollAreaRef: { current: null },
// 	})),
// }));

describe.skip("GeminiAudioChat", () => {
	it("renders with default props", () => {
		render(<GeminiAudioChat />);

		expect(screen.getByText("Gemini Audio Chat")).toBeTruthy();
		expect(screen.getByText("Disconnected")).toBeTruthy();
		expect(screen.getByText("No messages yet. Start a conversation!")).toBeTruthy();
	});

	it("shows loading state", () => {
		const mockHook = vi.fn(() => ({
			isConnected: false,
			isLoading: true,
			connectionError: null,
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [],
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		expect(screen.getByText("Connecting...")).toBeTruthy();
	});

	it("shows connected state", () => {
		const mockHook = vi.fn(() => ({
			isConnected: true,
			isLoading: false,
			connectionError: null,
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [],
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		expect(screen.getByText("Connected")).toBeTruthy();
	});

	it("handles connect/disconnect button clicks", async () => {
		const mockConnect = vi.fn();
		const mockDisconnect = vi.fn();

		const mockHook = vi.fn(() => ({
			isConnected: false,
			isLoading: false,
			connectionError: null,
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [],
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: mockConnect,
			disconnect: mockDisconnect,
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		// Find and click connect button
		const connectButton = screen.getByText("Connect");
		await userEvent.click(connectButton);

		expect(mockConnect).toHaveBeenCalled();
	});

	it("displays messages", () => {
		const mockMessages = [
			{
				id: "1",
				content: "Hello",
				role: "user" as const,
				timestamp: new Date("2024-01-01T12:00:00"),
			},
			{
				id: "2",
				content: "Hi there!",
				role: "assistant" as const,
				timestamp: new Date("2024-01-01T12:01:00"),
			},
		];

		const mockHook = vi.fn(() => ({
			isConnected: true,
			isLoading: false,
			connectionError: null,
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: mockMessages,
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		expect(screen.getByText("Hello")).toBeTruthy();
		expect(screen.getByText("Hi there!")).toBeTruthy();
	});

	it("shows recording state", () => {
		const mockHook = vi.fn(() => ({
			isConnected: true,
			isLoading: false,
			connectionError: null,
			isRecording: true,
			formattedDuration: "00:15",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [],
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		expect(screen.getByText("00:15")).toBeTruthy();
		expect(screen.getByText("Stop Recording")).toBeTruthy();
	});

	it("displays error states", () => {
		const mockHook = vi.fn(() => ({
			isConnected: false,
			isLoading: false,
			connectionError: new Error("Connection failed"),
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [],
			messageError: null,
			hasError: true,
			primaryError: new Error("Connection failed"),
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: vi.fn(),
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		expect(screen.getByText("Connection failed")).toBeTruthy();
	});

	it("handles clear messages button", async () => {
		const mockClearMessages = vi.fn();

		const mockHook = vi.fn(() => ({
			isConnected: true,
			isLoading: false,
			connectionError: null,
			isRecording: false,
			formattedDuration: "00:00",
			recordingError: null,
			isPlaying: false,
			playingMessageId: null,
			playbackError: null,
			messages: [
				{
					id: "1",
					content: "Test message",
					role: "user" as const,
					timestamp: new Date(),
				},
			],
			messageError: null,
			hasError: false,
			primaryError: null,
			connect: vi.fn(),
			disconnect: vi.fn(),
			sendMessage: vi.fn(),
			startRecording: vi.fn(),
			stopRecording: vi.fn(),
			playAudio: vi.fn(),
			clearMessages: mockClearMessages,
			clearAllErrors: vi.fn(),
			scrollAreaRef: { current: null },
		}));

		// vi.mocked(useAudioChatIntegration).mockImplementation(mockHook);

		render(<GeminiAudioChat />);

		// Find and click clear button
		const clearButton = screen.getByLabelText("Clear messages");
		await userEvent.click(clearButton);

		expect(mockClearMessages).toHaveBeenCalled();
	});
});
