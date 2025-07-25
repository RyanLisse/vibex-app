/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QuickBugReportButton } from "./quick-bug-report-button";

// Mock the toast hook
vi.mock("@/hooks/use-toast", () => ({
	useToast: () => ({
		toast: vi.fn(),
	}),
}));

describe("QuickBugReportButton", () => {
	const mockOnScreenshotCaptured = vi.fn();
	const mockOnError = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Reset navigator.mediaDevices mock
		Object.defineProperty(navigator, "mediaDevices", {
			writable: true,
			value: {
				getDisplayMedia: vi.fn(),
			},
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Rendering", () => {
		it("should render the quick bug report button", () => {
			render(<QuickBugReportButton />);

			const button = screen.getByRole("button", { name: /quick bug report/i });
			expect(button).toBeInTheDocument();
			expect(button).toHaveClass("bg-red-600");
		});

		it("should render with custom className", () => {
			render(<QuickBugReportButton className="custom-class" />);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("custom-class");
		});

		it("should show camera icon", () => {
			render(<QuickBugReportButton />);

			const cameraIcon = screen.getByTestId("camera-icon");
			expect(cameraIcon).toBeInTheDocument();
		});
	});

	describe("Screenshot Capture Functionality", () => {
		it("should trigger screenshot capture when clicked", async () => {
			const mockStream = {
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
			};

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockResolvedValue(mockStream);

			render(<QuickBugReportButton onScreenshotCaptured={mockOnScreenshotCaptured} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(navigator.mediaDevices.getDisplayMedia).toHaveBeenCalledWith({
					video: { mediaSource: "screen" },
				});
			});
		});

		it("should show loading state during capture", async () => {
			const mockStream = {
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
			};

			// Create a promise that we can control
			let resolveCapture: (value: any) => void;
			const capturePromise = new Promise((resolve) => {
				resolveCapture = resolve;
			});

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockReturnValue(capturePromise);

			render(<QuickBugReportButton onScreenshotCaptured={mockOnScreenshotCaptured} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			// Should show loading state
			expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
			expect(button).toBeDisabled();

			// Resolve the capture
			resolveCapture!(mockStream);

			await waitFor(() => {
				expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
				expect(button).not.toBeDisabled();
			});
		});

		it("should call onScreenshotCaptured with blob when capture succeeds", async () => {
			const mockStream = {
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
			};

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockResolvedValue(mockStream);

			// Mock canvas and video elements
			const mockCanvas = document.createElement("canvas");
			const mockContext = {
				drawImage: vi.fn(),
			};
			mockCanvas.getContext = vi.fn().mockReturnValue(mockContext);
			mockCanvas.toBlob = vi.fn((callback) => {
				callback(new Blob(["test"], { type: "image/png" }));
			});

			vi.spyOn(document, "createElement").mockImplementation((tagName) => {
				if (tagName === "canvas") return mockCanvas;
				if (tagName === "video") {
					const video = document.createElement("video") as any;
					video.srcObject = null;
					video.play = vi.fn().mockResolvedValue(undefined);
					return video;
				}
				return document.createElement(tagName);
			});

			render(<QuickBugReportButton onScreenshotCaptured={mockOnScreenshotCaptured} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(mockOnScreenshotCaptured).toHaveBeenCalledWith(expect.any(Blob));
			});
		});
	});

	describe("Error Handling", () => {
		it("should handle permission denied error", async () => {
			const permissionError = new Error("Permission denied");
			permissionError.name = "NotAllowedError";

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockRejectedValue(permissionError);

			render(<QuickBugReportButton onError={mockOnError} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "permission_denied",
						message: expect.stringContaining("Permission denied"),
					})
				);
			});
		});

		it("should handle unsupported browser error", async () => {
			// Mock unsupported browser
			Object.defineProperty(navigator, "mediaDevices", {
				writable: true,
				value: undefined,
			});

			render(<QuickBugReportButton onError={mockOnError} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "unsupported_browser",
						message: expect.stringContaining("not supported"),
					})
				);
			});
		});

		it("should handle generic capture errors", async () => {
			const genericError = new Error("Generic error");

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockRejectedValue(genericError);

			render(<QuickBugReportButton onError={mockOnError} />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.objectContaining({
						type: "capture_failed",
						message: expect.stringContaining("Generic error"),
					})
				);
			});
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA attributes", () => {
			render(<QuickBugReportButton />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("aria-label", expect.stringContaining("bug report"));
		});

		it("should be keyboard accessible", () => {
			render(<QuickBugReportButton onScreenshotCaptured={mockOnScreenshotCaptured} />);

			const button = screen.getByRole("button");
			button.focus();

			expect(button).toHaveFocus();

			fireEvent.keyDown(button, { key: "Enter" });
			// Should trigger the same behavior as click
		});

		it("should indicate loading state to screen readers", async () => {
			const mockStream = {
				getTracks: () => [{ stop: vi.fn() }],
				getVideoTracks: () => [{ stop: vi.fn() }],
			};

			let resolveCapture: (value: any) => void;
			const capturePromise = new Promise((resolve) => {
				resolveCapture = resolve;
			});

			navigator.mediaDevices.getDisplayMedia = vi.fn().mockReturnValue(capturePromise);

			render(<QuickBugReportButton />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			// Should have aria-busy during loading
			expect(button).toHaveAttribute("aria-busy", "true");

			resolveCapture!(mockStream);

			await waitFor(() => {
				expect(button).toHaveAttribute("aria-busy", "false");
			});
		});
	});

	describe("Integration", () => {
		it("should work with different button variants", () => {
			render(<QuickBugReportButton variant="outline" />);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("border-red-600");
		});

		it("should handle disabled state", () => {
			render(<QuickBugReportButton disabled={true} />);

			const button = screen.getByRole("button");
			expect(button).toBeDisabled();

			fireEvent.click(button);
			expect(navigator.mediaDevices.getDisplayMedia).not.toHaveBeenCalled();
		});
	});
});
