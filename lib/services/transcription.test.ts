/**
 * @vitest-environment jsdom
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TranscriptionService } from "./transcription";

// Mock Google Generative AI
vi.mock("@google/generative-ai", () => ({
	GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
		getGenerativeModel: vi.fn().mockReturnValue({
			generateContent: vi.fn().mockResolvedValue({
				response: {
					text: () => "This is a transcribed text from audio",
				},
			}),
		}),
	})),
}));

// Mock fetch for OpenAI fallback
global.fetch = vi.fn();

describe("TranscriptionService", () => {
	let service: TranscriptionService;
	const mockApiKey = "test-google-api-key";

	beforeEach(() => {
		vi.clearAllMocks();
		process.env.GOOGLE_AI_API_KEY = mockApiKey;
		service = new TranscriptionService();
	});

	afterEach(() => {
		delete process.env.GOOGLE_AI_API_KEY;
		delete process.env.OPENAI_API_KEY;
	});

	describe("transcribeWithGemini", () => {
		it("should transcribe audio successfully with Gemini", async () => {
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			const result = await service.transcribeWithGemini({
				audioBlob: mockBlob,
				language: "en",
				format: "text",
			});

			expect(result).toEqual({
				text: "This is a transcribed text from audio",
				language: "en",
			});
		});

		it("should handle JSON format response", async () => {
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });
			const mockJsonResponse = {
				text: "Transcribed text",
				duration: 5.5,
				language: "en",
				segments: [
					{ start: 0, end: 2.5, text: "Transcribed", confidence: 0.95 },
					{ start: 2.5, end: 5.5, text: "text", confidence: 0.98 },
				],
			};

			const mockModel = {
				generateContent: vi.fn().mockResolvedValue({
					response: {
						text: () => JSON.stringify(mockJsonResponse),
					},
				}),
			};

			vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
				() =>
					({
						getGenerativeModel: vi.fn().mockReturnValue(mockModel),
					}) as any
			);

			service = new TranscriptionService();

			const result = await service.transcribeWithGemini({
				audioBlob: mockBlob,
				language: "en",
				format: "json",
			});

			expect(result).toEqual(mockJsonResponse);
		});

		it("should throw error when no API key is configured", async () => {
			delete process.env.GOOGLE_AI_API_KEY;
			service = new TranscriptionService();

			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			await expect(
				service.transcribeWithGemini({
					audioBlob: mockBlob,
					language: "en",
					format: "text",
				})
			).rejects.toThrow("Google AI API key not configured");
		});

		it("should handle transcription errors gracefully", async () => {
			const mockModel = {
				generateContent: vi.fn().mockRejectedValue(new Error("API Error")),
			};

			vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
				() =>
					({
						getGenerativeModel: vi.fn().mockReturnValue(mockModel),
					}) as any
			);

			service = new TranscriptionService();
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			await expect(
				service.transcribeWithGemini({
					audioBlob: mockBlob,
					language: "en",
					format: "text",
				})
			).rejects.toThrow("Transcription failed: API Error");
		});
	});

	describe("transcribe", () => {
		it("should use Gemini when available", async () => {
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			const result = await service.transcribe({
				audioBlob: mockBlob,
				language: "en",
			});

			expect(result.text).toBe("This is a transcribed text from audio");
			expect(GoogleGenerativeAI).toHaveBeenCalledWith(mockApiKey);
		});

		it("should fallback to Whisper when Gemini fails", async () => {
			process.env.OPENAI_API_KEY = "test-openai-key";

			// Make Gemini fail
			const mockModel = {
				generateContent: vi.fn().mockRejectedValue(new Error("Gemini Error")),
			};

			vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
				() =>
					({
						getGenerativeModel: vi.fn().mockReturnValue(mockModel),
					}) as any
			);

			// Mock Whisper response
			const mockWhisperResponse = {
				ok: true,
				text: async () => "Whisper transcription",
			};
			vi.mocked(fetch).mockResolvedValueOnce(mockWhisperResponse as any);

			service = new TranscriptionService();
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			const result = await service.transcribe({
				audioBlob: mockBlob,
				language: "en",
			});

			expect(result.text).toBe("Whisper transcription");
			expect(fetch).toHaveBeenCalledWith(
				"https://api.openai.com/v1/audio/transcriptions",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: "Bearer test-openai-key",
					},
				})
			);
		});

		it("should throw error when no transcription service is available", async () => {
			delete process.env.GOOGLE_AI_API_KEY;
			delete process.env.OPENAI_API_KEY;
			service = new TranscriptionService();

			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });

			await expect(
				service.transcribe({
					audioBlob: mockBlob,
					language: "en",
				})
			).rejects.toThrow("No transcription service available");
		});
	});

	describe("extractTaskFromTranscription", () => {
		it("should extract task details with Gemini", async () => {
			const mockTaskData = {
				title: "Fix login bug",
				description: "The login form is not validating email correctly",
				priority: "high",
				dueDate: "2024-12-31",
				assignee: "john@example.com",
				labels: ["bug", "urgent"],
			};

			const mockModel = {
				generateContent: vi.fn().mockResolvedValue({
					response: {
						text: () => JSON.stringify(mockTaskData),
					},
				}),
			};

			vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
				() =>
					({
						getGenerativeModel: vi.fn().mockReturnValue(mockModel),
					}) as any
			);

			service = new TranscriptionService();

			const result = await service.extractTaskFromTranscription(
				"Fix the login bug, it's urgent and assign it to John"
			);

			expect(result).toEqual(mockTaskData);
		});

		it("should handle extraction errors with fallback", async () => {
			const mockModel = {
				generateContent: vi.fn().mockRejectedValue(new Error("Extraction failed")),
			};

			vi.mocked(GoogleGenerativeAI).mockImplementationOnce(
				() =>
					({
						getGenerativeModel: vi.fn().mockReturnValue(mockModel),
					}) as any
			);

			service = new TranscriptionService();

			const transcription = "This is a long transcription that should be truncated";
			const result = await service.extractTaskFromTranscription(transcription);

			expect(result).toEqual({
				title: transcription.slice(0, 100),
				description: transcription,
				priority: "medium",
			});
		});

		it("should use simple extraction when no Gemini client", async () => {
			delete process.env.GOOGLE_AI_API_KEY;
			service = new TranscriptionService();

			const shortTranscription = "Short task";
			const result = await service.extractTaskFromTranscription(shortTranscription);

			expect(result).toEqual({
				title: shortTranscription,
				description: undefined,
				priority: "medium",
			});
		});
	});

	describe("blobToBase64", () => {
		it("should convert blob to base64 string", async () => {
			const mockData = "test data";
			const mockBlob = new Blob([mockData], { type: "text/plain" });

			// Mock FileReader
			const mockReadAsDataURL = vi.fn();
			const mockReader = {
				readAsDataURL: mockReadAsDataURL,
				onloadend: null as any,
				onerror: null as any,
				result: `data:text/plain;base64,${btoa(mockData)}`,
			};

			global.FileReader = vi.fn().mockImplementation(() => mockReader) as any;

			// Trigger the conversion
			const resultPromise = service["blobToBase64"](mockBlob);

			// Simulate FileReader completion
			mockReadAsDataURL.mockImplementation(() => {
				setTimeout(() => {
					if (mockReader.onloadend) {
						mockReader.onloadend({} as any);
					}
				}, 0);
			});
			mockReadAsDataURL(mockBlob);

			const result = await resultPromise;
			expect(result).toBe(btoa(mockData));
		});

		it("should handle FileReader errors", async () => {
			const mockBlob = new Blob(["test"], { type: "text/plain" });

			const mockReader = {
				readAsDataURL: vi.fn(),
				onloadend: null as any,
				onerror: null as any,
			};

			global.FileReader = vi.fn().mockImplementation(() => mockReader) as any;

			const resultPromise = service["blobToBase64"](mockBlob);

			// Simulate FileReader error
			mockReader.readAsDataURL = vi.fn().mockImplementation(() => {
				setTimeout(() => {
					if (mockReader.onerror) {
						mockReader.onerror(new Error("Read error"));
					}
				}, 0);
			});
			mockReader.readAsDataURL(mockBlob);

			await expect(resultPromise).rejects.toThrow("Read error");
		});
	});
});
