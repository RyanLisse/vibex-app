/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BugReportForm } from "@/components/features/bug-reporting/bug-report-form";
import { ImageAnnotationTools } from "@/components/features/bug-reporting/image-annotation-tools";
// Components to be implemented
import { QuickBugReportButton } from "@/components/features/bug-reporting/quick-bug-report-button";
import { ScreenshotCapture } from "@/components/features/bug-reporting/screenshot-capture";

// Types
	BugReport,
	ScreenshotData,
} from "@/src/schemas/enhanced-task-schemas";

// Mock the screen capture API
const mockGetDisplayMedia = vi.fn();
Object.defineProperty(global.navigator, "mediaDevices", {
	value: {
		getDisplayMedia: mockGetDisplayMedia,
	},
	writable: true,
});

// Mock canvas for image processing
const mockCanvas = {
	getContext: vi.fn(() => ({
		drawImage: vi.fn(),
		getImageData: vi.fn(),
		putImageData: vi.fn(),
		clearRect: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		fillText: vi.fn(),
	})),
	toBlob: vi.fn((callback) => {
		const blob = new Blob(["fake-image-data"], { type: "image/png" });
		callback(blob);
	}),
	width: 1920,
	height: 1080,
};

vi.spyOn(document, "createElement").mockImplementation((tagName) => {
	if (tagName === "canvas") {
		return mockCanvas as any;
	}
	return document.createElement.wrappedMethod(tagName);
});

describe("Screenshot Bug Reporting Feature", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("QuickBugReportButton", () => {
		it("should render the quick bug report button", () => {
			expect(() => {
				render(<QuickBugReportButton onCapture={vi.fn()} />);
			}).not.toThrow();

			expect(screen.getByText(/quick bug report/i)).toBeInTheDocument();
		});

		it("should trigger screenshot capture when clicked", async () => {
			const mockOnCapture = vi.fn();

			render(<QuickBugReportButton onCapture={mockOnCapture} />);

			const button = screen.getByText(/quick bug report/i);
			await userEvent.click(button);

			expect(mockOnCapture).toHaveBeenCalled();
		});

		it("should show loading state during capture", async () => {
			const mockOnCapture = vi.fn(
				() => new Promise((resolve) => setTimeout(resolve, 100)),
			);

			render(<QuickBugReportButton onCapture={mockOnCapture} />);

			const button = screen.getByText(/quick bug report/i);
			await userEvent.click(button);

			expect(screen.getByText(/capturing/i)).toBeInTheDocument();
		});
	});

	describe("ScreenshotCapture", () => {
		it("should capture screenshot using getDisplayMedia API", async () => {
			const mockStream = {
				getVideoTracks: () => [{ stop: vi.fn() }],
			};
			mockGetDisplayMedia.mockResolvedValue(mockStream);

			const mockOnCapture = vi.fn();

			render(<ScreenshotCapture onCapture={mockOnCapture} />);

			const captureButton = screen.getByText(/capture screenshot/i);
			await userEvent.click(captureButton);

			expect(mockGetDisplayMedia).toHaveBeenCalledWith({
				video: {
					mediaSource: "screen",
				},
			});

			await waitFor(() => {
				expect(mockOnCapture).toHaveBeenCalledWith(
					expect.objectContaining({
						id: expect.any(String),
						imageBlob: expect.any(Blob),
						timestamp: expect.any(Date),
						annotations: [],
					}),
				);
			});
		});

		it("should handle permission denied error", async () => {
			mockGetDisplayMedia.mockRejectedValue(new Error("Permission denied"));

			const mockOnError = vi.fn();

			render(<ScreenshotCapture onCapture={vi.fn()} onError={mockOnError} />);

			const captureButton = screen.getByText(/capture screenshot/i);
			await userEvent.click(captureButton);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.stringContaining("Permission denied"),
				);
			});
		});

		it("should handle unsupported browser error", async () => {
			// Mock missing API
			Object.defineProperty(global.navigator, "mediaDevices", {
				value: undefined,
				writable: true,
			});

			const mockOnError = vi.fn();

			render(<ScreenshotCapture onCapture={vi.fn()} onError={mockOnError} />);

			const captureButton = screen.getByText(/capture screenshot/i);
			await userEvent.click(captureButton);

			await waitFor(() => {
				expect(mockOnError).toHaveBeenCalledWith(
					expect.stringContaining("not supported"),
				);
			});
		});
	});

	describe("ImageAnnotationTools", () => {
		const mockScreenshotData: ScreenshotData = {
			id: "test-screenshot",
			imageBlob: new Blob(["fake-image"], { type: "image/png" }),
			timestamp: new Date(),
			annotations: [],
		};

		it("should render annotation tools", () => {
			render(
				<ImageAnnotationTools
					onAnnotationsChange={vi.fn()}
					screenshot={mockScreenshotData}
				/>,
			);

			expect(screen.getByText(/arrow/i)).toBeInTheDocument();
			expect(screen.getByText(/text/i)).toBeInTheDocument();
			expect(screen.getByText(/highlight/i)).toBeInTheDocument();
			expect(screen.getByText(/rectangle/i)).toBeInTheDocument();
		});

		it("should add arrow annotation when arrow tool is selected and canvas is clicked", async () => {
			const mockOnAnnotationsChange = vi.fn();

			render(
				<ImageAnnotationTools
					onAnnotationsChange={mockOnAnnotationsChange}
					screenshot={mockScreenshotData}
				/>,
			);

			// Select arrow tool
			const arrowTool = screen.getByText(/arrow/i);
			await userEvent.click(arrowTool);

			// Click on canvas
			const canvas = screen.getByRole("img", { name: /screenshot/i });
			fireEvent.click(canvas, { clientX: 100, clientY: 50 });

			expect(mockOnAnnotationsChange).toHaveBeenCalledWith([
				expect.objectContaining({
					type: "arrow",
					position: { x: 100, y: 50 },
					data: expect.any(Object),
				}),
			]);
		});

		it("should add text annotation with custom text", async () => {
			const mockOnAnnotationsChange = vi.fn();

			render(
				<ImageAnnotationTools
					onAnnotationsChange={mockOnAnnotationsChange}
					screenshot={mockScreenshotData}
				/>,
			);

			// Select text tool
			const textTool = screen.getByText(/text/i);
			await userEvent.click(textTool);

			// Click on canvas
			const canvas = screen.getByRole("img", { name: /screenshot/i });
			fireEvent.click(canvas, { clientX: 200, clientY: 100 });

			// Enter text in prompt
			window.prompt = vi.fn().mockReturnValue("Bug description");

			await waitFor(() => {
				expect(mockOnAnnotationsChange).toHaveBeenCalledWith([
					expect.objectContaining({
						type: "text",
						position: { x: 200, y: 100 },
						data: "Bug description",
					}),
				]);
			});
		});

		it("should clear all annotations when clear button is clicked", async () => {
			const mockOnAnnotationsChange = vi.fn();

			render(
				<ImageAnnotationTools
					onAnnotationsChange={mockOnAnnotationsChange}
					screenshot={mockScreenshotData}
				/>,
			);

			const clearButton = screen.getByText(/clear/i);
			await userEvent.click(clearButton);

			expect(mockOnAnnotationsChange).toHaveBeenCalledWith([]);
		});
	});

	describe("BugReportForm", () => {
		const mockScreenshotData: ScreenshotData = {
			id: "test-screenshot",
			imageBlob: new Blob(["fake-image"], { type: "image/png" }),
			timestamp: new Date(),
			annotations: [
				{
					type: "arrow",
					position: { x: 100, y: 50 },
					data: { direction: "down" },
				},
			],
		};

		it("should render bug report form with screenshot preview", () => {
			render(
				<BugReportForm onSubmit={vi.fn()} screenshot={mockScreenshotData} />,
			);

			expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
			expect(screen.getByText(/screenshot preview/i)).toBeInTheDocument();
		});

		it("should validate required fields", async () => {
			const mockOnSubmit = vi.fn();

			render(
				<BugReportForm
					onSubmit={mockOnSubmit}
					screenshot={mockScreenshotData}
				/>,
			);

			const submitButton = screen.getByText(/create bug report/i);
			await userEvent.click(submitButton);

			expect(screen.getByText(/title is required/i)).toBeInTheDocument();
			expect(mockOnSubmit).not.toHaveBeenCalled();
		});

		it("should submit bug report with correct data", async () => {
			const mockOnSubmit = vi.fn();

			render(
				<BugReportForm
					onSubmit={mockOnSubmit}
					screenshot={mockScreenshotData}
				/>,
			);

			// Fill form
			await userEvent.type(
				screen.getByLabelText(/title/i),
				"Button not working",
			);
			await userEvent.type(
				screen.getByLabelText(/description/i),
				"The submit button does not respond to clicks",
			);
			await userEvent.selectOptions(screen.getByLabelText(/priority/i), "high");

			// Submit
			const submitButton = screen.getByText(/create bug report/i);
			await userEvent.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Button not working",
					description: "The submit button does not respond to clicks",
					priority: "high",
					screenshot: mockScreenshotData,
					tags: ["bug"],
				}),
			);
		});

		it("should auto-tag as bug and set appropriate priority", async () => {
			const mockOnSubmit = vi.fn();

			render(
				<BugReportForm
					onSubmit={mockOnSubmit}
					screenshot={mockScreenshotData}
				/>,
			);

			// Fill minimal form
			await userEvent.type(screen.getByLabelText(/title/i), "Test bug");
			await userEvent.type(
				screen.getByLabelText(/description/i),
				"Test description",
			);

			// Submit
			const submitButton = screen.getByText(/create bug report/i);
			await userEvent.click(submitButton);

			expect(mockOnSubmit).toHaveBeenCalledWith(
				expect.objectContaining({
					tags: expect.arrayContaining(["bug"]),
				}),
			);
		});
	});

	describe("Integration Tests", () => {
		it("should complete full bug reporting workflow", async () => {
			const mockCreateTask = vi.fn();

			// Mock successful screenshot capture
			const mockStream = {
				getVideoTracks: () => [{ stop: vi.fn() }],
			};
			mockGetDisplayMedia.mockResolvedValue(mockStream);

			// This would be a full page component combining all the above
			const BugReportingWorkflow = () => (
				<div>
					<QuickBugReportButton
						onCapture={(screenshot) => {
							// Would open bug report form with screenshot
							mockCreateTask({
								title: "Auto-generated bug report",
								description: "Generated from screenshot",
								screenshot,
								creationMethod: "bug_report",
							});
						}}
					/>
				</div>
			);

			render(<BugReportingWorkflow />);

			const quickReportButton = screen.getByText(/quick bug report/i);
			await userEvent.click(quickReportButton);

			await waitFor(() => {
				expect(mockCreateTask).toHaveBeenCalledWith(
					expect.objectContaining({
						creationMethod: "bug_report",
						screenshot: expect.any(Object),
					}),
				);
			});
		});
	});
});
