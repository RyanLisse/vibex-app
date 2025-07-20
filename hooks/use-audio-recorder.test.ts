	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
	test,
} from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";

// Mock MediaRecorder
class MockMediaRecorder {
	state = "inactive";
	ondataavailable: ((event: any) => void) | null = null;
	onstop: (() => void) | null = null;
	onerror: ((error: any) => void) | null = null;

	constructor(
		public stream: MediaStream,
		public options?: any,
	) {}

	start() {
		this.state = "recording";
	}

	stop() {
		this.state = "inactive";
		if (this.ondataavailable) {
			this.ondataavailable({
				data: new Blob(["audio data"], { type: "audio/webm" }),
			});
		}
		if (this.onstop) {
			this.onstop();
		}
	}

	pause() {
		this.state = "paused";
	}

	resume() {
		this.state = "recording";
	}
}

// Mock getUserMedia
const mockGetUserMedia = vi.fn();

// Setup global mocks
global.MediaRecorder = MockMediaRecorder as any;
global.navigator = {
	...global.navigator,
	mediaDevices: {
		getUserMedia: mockGetUserMedia,
	},
} as any;

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();


describe("useAudioRecorder", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [{ stop: vi.fn() }],
		});
	});


	it("should initialize with default state", () => {
		const { result } = renderHook(() => useAudioRecorder());

		expect(result.current.isRecording).toBe(false);
		expect(result.current.isPaused).toBe(false);
		expect(result.current.audioBlob).toBeNull();
		expect(result.current.audioUrl).toBeNull();
		expect(result.current.recordingTime).toBe(0);
		expect(result.current.error).toBeNull();
	});

	it("should start recording successfully", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true });
		expect(result.current.isRecording).toBe(true);
		expect(result.current.error).toBeNull();
	});

	it("should stop recording and create audio blob", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			await result.current.stopRecording();
		});

		expect(result.current.isRecording).toBe(false);
		expect(result.current.audioBlob).toBeTruthy();
		expect(result.current.audioUrl).toBe("blob:mock-url");
	});

	it("should pause and resume recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		act(() => {
			result.current.pauseRecording();
		});

		expect(result.current.isPaused).toBe(true);
		expect(result.current.isRecording).toBe(true);

		act(() => {
			result.current.resumeRecording();
		});

		expect(result.current.isPaused).toBe(false);
		expect(result.current.isRecording).toBe(true);
	});

	it("should handle permission denied error", async () => {
		mockGetUserMedia.mockRejectedValueOnce(
			new DOMException("Permission denied"),
		);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.error).toBe("Microphone permission denied");
		expect(result.current.isRecording).toBe(false);
	});

	it("should handle device not found error", async () => {
		mockGetUserMedia.mockRejectedValueOnce(new DOMException("NotFoundError"));

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.error).toBe("No microphone found");
	});

	it("should track recording time", async () => {
		mock.useFakeTimers();
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.recordingTime).toBe(0);

		act(() => {
			mock.advanceTimersByTime(1000);
		});

		expect(result.current.recordingTime).toBe(1);

		act(() => {
			mock.advanceTimersByTime(2000);
		});

		expect(result.current.recordingTime).toBe(3);

		await act(async () => {
			await result.current.stopRecording();
		});

		mock.useRealTimers();
	});

	it("should clear recording", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			await result.current.stopRecording();
		});

		expect(result.current.audioBlob).toBeTruthy();
		expect(result.current.audioUrl).toBeTruthy();

		act(() => {
			result.current.clearRecording();
		});

		expect(result.current.audioBlob).toBeNull();
		expect(result.current.audioUrl).toBeNull();
		expect(result.current.recordingTime).toBe(0);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
	});

	it("should handle custom audio constraints", async () => {
		const customConstraints = {
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				sampleRate: 48_000,
			},
		};

		const { result } = renderHook(() => useAudioRecorder(customConstraints));

		await act(async () => {
			await result.current.startRecording();
		});

		expect(mockGetUserMedia).toHaveBeenCalledWith(customConstraints.audio);
	});

	it("should handle maximum recording duration", async () => {
		mock.useFakeTimers();
		const { result } = renderHook(() => useAudioRecorder({ maxDuration: 5 }));

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.isRecording).toBe(true);

		act(() => {
			mock.advanceTimersByTime(6000); // 6 seconds
		});

		expect(result.current.isRecording).toBe(false);
		expect(result.current.recordingTime).toBe(5);

		mock.useRealTimers();
	});

	it("should download audio file", async () => {
		// Mock document.createElement and click
		const mockAnchor = {
			href: "",
			download: "",
			click: vi.fn(),
		};
		spyOn(document, "createElement").mockReturnValue(mockAnchor as any);

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			await result.current.stopRecording();
		});

		act(() => {
			result.current.downloadAudio("my-recording.webm");
		});

		expect(mockAnchor.href).toBe("blob:mock-url");
		expect(mockAnchor.download).toBe("my-recording.webm");
		expect(mockAnchor.click).toHaveBeenCalled();
	});

	it("should get audio duration", async () => {
		// Mock Audio constructor
		const mockAudio = {
			src: "",
			addEventListener: vi.fn((event, callback) => {
				if (event === "loadedmetadata") {
					mockAudio.duration = 10.5;
					callback();
				}
			}),
			duration: 0,
		};
		global.Audio = vi.fn(() => mockAudio) as any;

		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			await result.current.stopRecording();
		});

		const duration = await act(async () => {
			return await result.current.getAudioDuration();
		});

		expect(duration).toBe(10.5);
	});

	it("should handle MediaRecorder error", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		// Simulate MediaRecorder error
		act(() => {
			if (result.current.mediaRecorder?.onerror) {
				result.current.mediaRecorder.onerror(new Error("Recording failed"));
			}
		});

		expect(result.current.error).toBe("Recording failed");
		expect(result.current.isRecording).toBe(false);
	});

	it("should handle different audio formats", async () => {
		const { result } = renderHook(() =>
			useAudioRecorder({
				mimeType: "audio/mp4",
			}),
		);

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.mediaRecorder?.options).toEqual(
			expect.objectContaining({ mimeType: "audio/mp4" }),
		);
	});

	it("should check if recording is supported", () => {
		const { result } = renderHook(() => useAudioRecorder());

		expect(result.current.isSupported).toBe(true);

		// Test when MediaRecorder is not supported
		const originalMediaRecorder = global.MediaRecorder;
		global.MediaRecorder = undefined as any;

		const { result: unsupportedResult } = renderHook(() => useAudioRecorder());
		expect(unsupportedResult.current.isSupported).toBe(false);

		global.MediaRecorder = originalMediaRecorder;
	});

	it("should handle stream cleanup on unmount", async () => {
		const mockStop = vi.fn();
		mockGetUserMedia.mockResolvedValue({
			getTracks: () => [{ stop: mockStop }],
		});

		const { result, unmount } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		unmount();

		expect(mockStop).toHaveBeenCalled();
	});

	it("should convert blob to base64", async () => {
		const { result } = renderHook(() => useAudioRecorder());

		await act(async () => {
			await result.current.startRecording();
		});

		await act(async () => {
			await result.current.stopRecording();
		});

		// Mock FileReader
		const mockFileReader = {
			readAsDataURL: vi.fn(),
			onload: null as any,
			result: "data:audio/webm;base64,mockBase64Data",
		};
		global.FileReader = vi.fn(() => mockFileReader) as any;

		const base64Promise = result.current.getAudioBase64();

		// Trigger onload
		act(() => {
			if (mockFileReader.onload) {
				mockFileReader.onload({ target: { result: mockFileReader.result } });
			}
		});

		const base64 = await base64Promise;
		expect(base64).toBe("data:audio/webm;base64,mockBase64Data");
	});

	it("should handle recording with visualization data", async () => {
		const { result } = renderHook(() =>
			useAudioRecorder({
				enableVisualization: true,
			}),
		);

		await act(async () => {
			await result.current.startRecording();
		});

		expect(result.current.analyser).toBeTruthy();
		expect(result.current.visualizationData).toBeTruthy();
	});
});
