/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { VoiceRecorder } from "./voice-recorder";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

describe("VoiceRecorder", () => {
	const mockOnRecordingComplete = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset MediaRecorder mock
		global.MediaRecorder = vi.fn().mockImplementation(() => ({
			start: vi.fn(),
			stop: vi.fn(),
			pause: vi.fn(),
			resume: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			state: "inactive",
			mimeType: "audio/webm",
		}));

		// Reset navigator.mediaDevices mock
		Object.defineProperty(navigator, "mediaDevices", {
			writable: true,
			value: {
				getUserMedia: vi.fn().mockResolvedValue({
					getTracks: () => [{ stop: vi.fn() }],
					getAudioTracks: () => [{ stop: vi.fn() }],
				}),
			},
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Rendering", () => {
		it("should render voice recorder with start button", () => {
			render(<VoiceRecorder />);

			const startButton = screen.getByRole("button", { name: /start recording/i });
			expect(startButton).toBeInTheDocument();
			expect(startButton).toHaveClass("bg-red-600");
		});

		it("should render with custom className", () => {
			render(<VoiceRecorder className="custom-class" />);

			const container = screen.getByTestId("voice-recorder");
			expect(container).toHaveClass("custom-class");
		});

		it("should show microphone icon", () => {
			render(<VoiceRecorder />);

			const micIcon = screen.getByTestId("microphone-icon");
			expect(micIcon).toBeInTheDocument();
		});
	});

	describe("Recording Functionality", () => {
		it("should start recording when start button is clicked", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "inactive",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

			const startButton = screen.getByRole("button", { name: /start recording/i });
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
					audio: true,
				});
				expect(mockMediaRecorder.start).toHaveBeenCalled();
			});
		});

		it("should show recording state when recording", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "recording",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /stop recording/i })).toBeInTheDocument();
				expect(screen.getByTestId("recording-indicator")).toBeInTheDocument();
			});
		});

		it("should show recording duration", async () => {
			vi.useFakeTimers();

			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "recording",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(screen.getByTestId("recording-duration")).toBeInTheDocument();
			});

			// Advance timer by 5 seconds
			vi.advanceTimersByTime(5000);

			await waitFor(() => {
				expect(screen.getByTestId("recording-duration")).toHaveTextContent("0:05");
			});

			vi.useRealTimers();
		});

		it("should stop recording when stop button is clicked", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "recording",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder />);

			// Start recording first
			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /stop recording/i })).toBeInTheDocument();
			});

			// Stop recording
			const stopButton = screen.getByRole("button", { name: /stop recording/i });
			fireEvent.click(stopButton);

			expect(mockMediaRecorder.stop).toHaveBeenCalled();
		});

		it("should call onRecordingComplete with audio blob", async () => {
			const mockBlob = new Blob(["audio data"], { type: "audio/webm" });
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn((event, callback) => {
					if (event === "dataavailable") {
						// Simulate data available event
						setTimeout(() => callback({ data: mockBlob }), 100);
					}
					if (event === "stop") {
						// Simulate stop event
						setTimeout(() => callback(), 150);
					}
				}),
				removeEventListener: vi.fn(),
				state: "inactive",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder onRecordingComplete={mockOnRecordingComplete} />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				const stopButton = screen.getByRole("button", { name: /stop recording/i });
				fireEvent.click(stopButton);
			});

			await waitFor(
				() => {
					expect(mockOnRecordingComplete).toHaveBeenCalledWith(
						expect.any(Blob),
						expect.any(Number) // duration
					);
				},
				{ timeout: 1000 }
			);
		});
	});

	describe("Error Handling", () => {
		it("should handle microphone permission denied", async () => {
			const permissionError = new Error("Permission denied");
			permissionError.name = "NotAllowedError";

			navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(permissionError);

			render(<VoiceRecorder onError={mockOnError} />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "permission_denied",
						message: expect.stringContaining("microphone permission"),
					})
				);
			});
		});

		it("should handle unsupported browser", async () => {
			// Mock unsupported browser
			Object.defineProperty(navigator, "mediaDevices", {
				writable: true,
				value: undefined,
			});

			render(<VoiceRecorder onError={mockOnError} />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "unsupported_browser",
						message: expect.stringContaining("not supported"),
					})
				);
			});
		});

		it("should handle MediaRecorder not supported", async () => {
			global.MediaRecorder = undefined as any;

			render(<VoiceRecorder onError={mockOnError} />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "unsupported_browser",
						message: expect.stringContaining("MediaRecorder"),
					})
				);
			});
		});

		it("should handle recording errors", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn((event, callback) => {
					if (event === "error") {
						setTimeout(() => callback({ error: new Error("Recording failed") }), 100);
					}
				}),
				removeEventListener: vi.fn(),
				state: "inactive",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder onError={mockOnError} />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(
				() => {
					expect(mockOnError).toHaveBeenCalledWith(
						expect.objectContaining({
							type: "recording_failed",
							message: expect.stringContaining("Recording failed"),
						})
					);
				},
				{ timeout: 1000 }
			);
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<VoiceRecorder />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-label", expect.stringContaining("voice"));
		});

		it("should indicate recording state to screen readers", async () => {
			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "recording",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(button).toHaveAttribute("aria-pressed", "true");
			});
		});

		it("should be keyboard accessible", () => {
			render(<VoiceRecorder />);

			const button = screen.getByRole("button");
			button.focus();

			expect(button).toHaveFocus();

			fireEvent.keyDown(button, { key: "Enter" });
			// Should trigger the same behavior as click
		});
	});

	describe("Audio Quality Settings", () => {
		it("should use high quality audio settings", async () => {
			render(<VoiceRecorder quality="high" />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
					audio: {
						sampleRate: 44100,
						channelCount: 2,
						echoCancellation: true,
						noiseSuppression: true,
					},
				});
			});
		});

		it("should use standard quality by default", async () => {
			render(<VoiceRecorder />);

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			await waitFor(() => {
				expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
					audio: true,
				});
			});
		});
	});

	describe("Integration", () => {
		it("should work with different button variants", () => {
			render(<VoiceRecorder variant="outline" />);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("border-red-600");
		});

		it("should handle disabled state", () => {
			render(<VoiceRecorder disabled />);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();

			fireEvent.click(button);
			expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
		});

		it("should handle maximum recording duration", async () => {
			vi.useFakeTimers();

			const mockMediaRecorder = {
				start: vi.fn(),
				stop: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				state: "recording",
			};

			global.MediaRecorder = vi.fn().mockImplementation(() => mockMediaRecorder);

			render(<VoiceRecorder maxDuration={5000} />); // 5 seconds max

			const startButton = screen.getByRole("button");
			fireEvent.click(startButton);

			// Advance timer beyond max duration
			vi.advanceTimersByTime(6000);

			await waitFor(() => {
				expect(mockMediaRecorder.stop).toHaveBeenCalled();
			});

			vi.useRealTimers();
		});
	});
});
