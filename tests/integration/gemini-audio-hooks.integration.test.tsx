import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAudioRecorder } from "../../hooks/use-audio-recorder";
import { useGeminiAudio } from "../../hooks/use-gemini-audio";

// Mock the Gemini session
vi.mock("@/lib/ai/gemini-realtime", () => ({
	GeminiRealtimeSession: vi.fn(() => ({
		connect: vi.fn(),
		disconnect: vi.fn(),
		sendAudio: vi.fn(),
		onMessage: vi.fn(),
		onError: vi.fn(),
		onAudioResponse: vi.fn(),
		offMessage: vi.fn(),
		offError: vi.fn(),
		offAudioResponse: vi.fn(),
		isConnected: vi.fn().mockReturnValue(false),
		convertToWav: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
	})),
}));

// Mock Web Audio API
global.AudioContext = vi.fn(() => ({
	createMediaStreamSource: vi.fn(),
	createScriptProcessor: vi.fn(() => ({
		connect: vi.fn(),
		disconnect: vi.fn(),
		onaudioprocess: null,
	})),
	destination: {},
	state: "running",
	suspend: vi.fn(),
	resume: vi.fn(),
	close: vi.fn(),
})) as any;

global.MediaRecorder = vi.fn(() => ({
	start: vi.fn(),
	stop: vi.fn(),
	pause: vi.fn(),
	resume: vi.fn(),
	state: "inactive",
	ondataavailable: null,
	onstop: null,
	onerror: null,
	stream: null,
	mimeType: "audio/webm",
})) as any;

// Mock getUserMedia
Object.defineProperty(navigator, "mediaDevices", {
	value: {
		getUserMedia: vi.fn().mockResolvedValue({
			getTracks: vi.fn().mockReturnValue([
				{
					stop: vi.fn(),
					kind: "audio",
					enabled: true,
				},
			]),
		}),
	},
	writable: true,
});

describe("Gemini Audio Hooks Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("useGeminiAudio", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			expect(result.current.isConnected).toBe(false);
			expect(result.current.isLoading).toBe(false);
			expect(result.current.error).toBeNull();
			expect(result.current.messages).toEqual([]);
		});

		it("should connect to Gemini session", async () => {
			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			await act(async () => {
				await result.current.connect();
			});

			expect(result.current.isLoading).toBe(false);
		});

		it("should disconnect from Gemini session", async () => {
			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			await act(async () => {
				await result.current.disconnect();
			});

			expect(result.current.isConnected).toBe(false);
		});

		it("should handle connection errors", async () => {
			const mockSession = {
				connect: vi.fn().mockRejectedValue(new Error("Connection failed")),
				disconnect: vi.fn(),
				sendAudio: vi.fn(),
				onMessage: vi.fn(),
				onError: vi.fn(),
				onAudioResponse: vi.fn(),
				offMessage: vi.fn(),
				offError: vi.fn(),
				offAudioResponse: vi.fn(),
				isConnected: vi.fn().mockReturnValue(false),
				convertToWav: vi.fn(),
			};

			const { GeminiRealtimeSession } = await import(
				"@/lib/ai/gemini-realtime"
			);
			vi.mocked(GeminiRealtimeSession).mockReturnValue(mockSession as any);

			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			await act(async () => {
				await result.current.connect();
			});

			await waitFor(() => {
				expect(result.current.error).toBe("Connection failed");
			});
		});

		it("should send audio data", async () => {
			const mockSession = {
				connect: vi.fn(),
				disconnect: vi.fn(),
				sendAudio: vi.fn(),
				onMessage: vi.fn(),
				onError: vi.fn(),
				onAudioResponse: vi.fn(),
				offMessage: vi.fn(),
				offError: vi.fn(),
				offAudioResponse: vi.fn(),
				isConnected: vi.fn().mockReturnValue(true),
				convertToWav: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
			};

			const { GeminiRealtimeSession } = await import(
				"@/lib/ai/gemini-realtime"
			);
			vi.mocked(GeminiRealtimeSession).mockReturnValue(mockSession as any);

			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			const audioData = new Uint8Array(1024);
			audioData.fill(128);

			await act(async () => {
				await result.current.sendAudio(audioData);
			});

			expect(mockSession.sendAudio).toHaveBeenCalledWith(audioData);
		});

		it("should handle incoming messages", async () => {
			const mockSession = {
				connect: vi.fn(),
				disconnect: vi.fn(),
				sendAudio: vi.fn(),
				onMessage: vi.fn(),
				onError: vi.fn(),
				onAudioResponse: vi.fn(),
				offMessage: vi.fn(),
				offError: vi.fn(),
				offAudioResponse: vi.fn(),
				isConnected: vi.fn().mockReturnValue(false),
				convertToWav: vi.fn(),
			};

			const { GeminiRealtimeSession } = await import(
				"@/lib/ai/gemini-realtime"
			);
			vi.mocked(GeminiRealtimeSession).mockReturnValue(mockSession as any);

			const { result } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			// Simulate message handler being called
			const mockMessage = {
				type: "response",
				data: {
					text: "Hello, how can I help you?",
				},
			};

			// Get the message handler that was registered
			const messageHandler = mockSession.onMessage.mock.calls[0][0];

			await act(async () => {
				messageHandler(mockMessage);
			});

			expect(result.current.messages).toContain(mockMessage);
		});
	});

	describe("useAudioRecorder", () => {
		it("should initialize with default state", () => {
			const { result } = renderHook(() => useAudioRecorder());

			expect(result.current.isRecording).toBe(false);
			expect(result.current.audioData).toBeNull();
			expect(result.current.error).toBeNull();
			expect(result.current.isSupported).toBe(true);
		});

		it("should start recording", async () => {
			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
				audio: {
					sampleRate: 44_100,
					channelCount: 1,
					echoCancellation: true,
					noiseSuppression: true,
				},
			});
		});

		it("should stop recording", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				pause: vi.fn(),
				resume: vi.fn(),
				state: "recording",
				ondataavailable: null,
				onstop: null,
				onerror: null,
				stream: null,
				mimeType: "audio/webm",
			};

			vi.mocked(MediaRecorder).mockReturnValue(mockMediaRecorder as any);

			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			await act(async () => {
				result.current.stopRecording();
			});

			expect(mockMediaRecorder.stop).toHaveBeenCalled();
		});

		it("should handle recording errors", async () => {
			const mockGetUserMedia = vi
				.fn()
				.mockRejectedValue(new Error("Permission denied"));
			Object.defineProperty(navigator, "mediaDevices", {
				value: {
					getUserMedia: mockGetUserMedia,
				},
				writable: true,
			});

			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			await waitFor(() => {
				expect(result.current.error).toBe("Permission denied");
			});
		});

		it("should pause and resume recording", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				pause: vi.fn(),
				resume: vi.fn(),
				state: "recording",
				ondataavailable: null,
				onstop: null,
				onerror: null,
				stream: null,
				mimeType: "audio/webm",
			};

			vi.mocked(MediaRecorder).mockReturnValue(mockMediaRecorder as any);

			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			act(() => {
				result.current.pauseRecording();
			});

			expect(mockMediaRecorder.pause).toHaveBeenCalled();

			act(() => {
				result.current.resumeRecording();
			});

			expect(mockMediaRecorder.resume).toHaveBeenCalled();
		});

		it("should handle audio data availability", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				pause: vi.fn(),
				resume: vi.fn(),
				state: "recording",
				ondataavailable: null,
				onstop: null,
				onerror: null,
				stream: null,
				mimeType: "audio/webm",
			};

			vi.mocked(MediaRecorder).mockReturnValue(mockMediaRecorder as any);

			const { result } = renderHook(() => useAudioRecorder());

			await act(async () => {
				await result.current.startRecording();
			});

			// Simulate audio data being available
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });
			const mockEvent = { data: mockBlob };

			await act(async () => {
				if (mockMediaRecorder.ondataavailable) {
					mockMediaRecorder.ondataavailable(mockEvent as any);
				}
			});

			expect(result.current.audioData).toBe(mockBlob);
		});

		it("should check browser support", () => {
			const { result } = renderHook(() => useAudioRecorder());

			expect(result.current.isSupported).toBe(true);

			// Test with no MediaRecorder support
			const originalMediaRecorder = (global.MediaRecorder(
				global as any,
			).MediaRecorder = undefined);

			const { result: result2 } = renderHook(() => useAudioRecorder());

			expect(result2.current.isSupported).toBe(false);

			// Restore MediaRecorder
			global.MediaRecorder = originalMediaRecorder;
		});
	});

	describe("Integration between hooks", () => {
		it("should work together for complete audio flow", async () => {
			const mockSession = {
				connect: vi.fn(),
				disconnect: vi.fn(),
				sendAudio: vi.fn(),
				onMessage: vi.fn(),
				onError: vi.fn(),
				onAudioResponse: vi.fn(),
				offMessage: vi.fn(),
				offError: vi.fn(),
				offAudioResponse: vi.fn(),
				isConnected: vi.fn().mockReturnValue(true),
				convertToWav: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
			};

			const { GeminiRealtimeSession } = await import(
				"@/lib/ai/gemini-realtime"
			);
			vi.mocked(GeminiRealtimeSession).mockReturnValue(mockSession as any);

			const { result: geminiResult } = renderHook(() =>
				useGeminiAudio({
					apiKey: "test-api-key",
					voiceName: "Aoede",
				}),
			);

			const { result: recorderResult } = renderHook(() => useAudioRecorder());

			// Connect to Gemini
			await act(async () => {
				await geminiResult.current.connect();
			});

			// Start recording
			await act(async () => {
				await recorderResult.current.startRecording();
			});

			// Simulate audio data
			const _mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			await act(async () => {
				// Convert blob to Uint8Array (simplified)
				const audioData = new Uint8Array(1024);
				audioData.fill(128);

				// Send audio to Gemini
				await geminiResult.current.sendAudio(audioData);
			});

			expect(mockSession.sendAudio).toHaveBeenCalled();
		});
	});
});
