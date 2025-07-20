
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorBoundary, useErrorBoundary } from "@/components/error-boundary";


// Mock console methods
const mockConsoleError = mock
	.spyOn(console, "error")
	.mockImplementation(() => {});
const mockConsoleWarn = mock
	.spyOn(console, "warn")
	.mockImplementation(() => {});

// Component that throws an error
const ThrowError = ({
	shouldThrow = false,
	error,
}: {
	shouldThrow?: boolean;
	error?: Error;
}) => {
	if (shouldThrow) {
		throw error || new Error("Test error");
	}
	return <div>No error</div>;
};

// Component that throws stream error

const ThrowStreamError = ({
	shouldThrow = false,
}: {
	shouldThrow?: boolean;
}) => {
	if (shouldThrow) {
		throw new Error("ReadableStream error occurred");
	}
	return <div>No stream error</div>;
};

describe("ErrorBoundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render children when no error occurs", () => {
		render(
			<ErrorBoundary>
				<div>Normal content</div>
			</ErrorBoundary>,
		);

		expect(screen.getByText("Normal content")).toBeInTheDocument();
	});

	it("should render default fallback UI when error occurs", () => {
		render(
			<ErrorBoundary>
				<ThrowError
					error={new Error("Test error message")}
					shouldThrow={true}
				/>
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByText("Test error message")).toBeInTheDocument();
		expect(screen.getByText("Try again")).toBeInTheDocument();
	});

	it("should render custom fallback component when provided", () => {
		const CustomFallback = ({
			error,
			resetError,
		}: {
			error: Error;
			resetError: () => void;
		}) => (
			<div>
				<h2>Custom Error</h2>
				<p>{error.message}</p>
				<button onClick={resetError}>Reset Custom</button>
			</div>
		);

		render(
			<ErrorBoundary fallback={CustomFallback}>
				<ThrowError error={new Error("Custom error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Custom Error")).toBeInTheDocument();
		expect(screen.getByText("Custom error")).toBeInTheDocument();
		expect(screen.getByText("Reset Custom")).toBeInTheDocument();
	});

	it("should reset error state when reset button is clicked", () => {
		const { rerender } = render(
			<ErrorBoundary>
				<ThrowError error={new Error("Test error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();

		const resetButton = screen.getByText("Try again");
		fireEvent.click(resetButton);

		// Re-render with no error
		rerender(
			<ErrorBoundary>
				<ThrowError shouldThrow={false} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("No error")).toBeInTheDocument();
	});

	it("should handle stream errors specially", () => {
		render(
			<ErrorBoundary>
				<ThrowStreamError shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(mockConsoleWarn).toHaveBeenCalledWith(
			"Stream error caught by ErrorBoundary:",
			"ReadableStream error occurred",
		);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it("should handle cancel errors specially", () => {
		render(
			<ErrorBoundary>
				<ThrowError
					error={new Error("cancel operation failed")}
					shouldThrow={true}
				/>
			</ErrorBoundary>,
		);

		expect(mockConsoleWarn).toHaveBeenCalledWith(
			"Stream error caught by ErrorBoundary:",
			"cancel operation failed",
		);
		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
	});

	it("should log normal errors to console.error", () => {
		render(
			<ErrorBoundary>
				<ThrowError error={new Error("Normal error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(mockConsoleError).toHaveBeenCalledWith(
			"ErrorBoundary caught an error:",
			expect.any(Error),
			expect.any(Object),
		);
	});

	it("should handle error without message", () => {
		render(
			<ErrorBoundary>
				<ThrowError error={new Error()} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(
			screen.getByText("An unexpected error occurred"),
		).toBeInTheDocument();
	});

	it("should handle custom fallback reset functionality", () => {
		const CustomFallback = ({
			error,
			resetError,
		}: {
			error: Error;
			resetError: () => void;
		}) => (
			<div>
				<h2>Custom Error Handler</h2>
				<button onClick={resetError}>Custom Reset</button>
			</div>
		);

		const { rerender } = render(
			<ErrorBoundary fallback={CustomFallback}>
				<ThrowError error={new Error("Custom error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Custom Error Handler")).toBeInTheDocument();

		const resetButton = screen.getByText("Custom Reset");
		fireEvent.click(resetButton);

		// Re-render with no error
		rerender(
			<ErrorBoundary fallback={CustomFallback}>
				<ThrowError shouldThrow={false} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("No error")).toBeInTheDocument();
	});

	it("should handle multiple error states", () => {
		const { rerender } = render(
			<ErrorBoundary>
				<ThrowError error={new Error("First error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("First error")).toBeInTheDocument();

		const resetButton = screen.getByText("Try again");
		fireEvent.click(resetButton);

		// Re-render with different error
		rerender(
			<ErrorBoundary>
				<ThrowError error={new Error("Second error")} shouldThrow={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Second error")).toBeInTheDocument();
	});

	it("should handle error boundary lifecycle correctly", () => {
		const TestComponent = ({ shouldError }: { shouldError: boolean }) => {
			if (shouldError) {
				throw new Error("Lifecycle error");
			}
			return <div>Working</div>;
		};

		const { rerender } = render(
			<ErrorBoundary>
				<TestComponent shouldError={false} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Working")).toBeInTheDocument();

		rerender(
			<ErrorBoundary>
				<TestComponent shouldError={true} />
			</ErrorBoundary>,
		);

		expect(screen.getByText("Something went wrong")).toBeInTheDocument();
		expect(screen.getByText("Lifecycle error")).toBeInTheDocument();
	});
});

describe("useErrorBoundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should provide captureError and resetError functions", () => {
		const { result } = renderHook(() => useErrorBoundary());

		expect(result.current.captureError).toBeDefined();
		expect(result.current.resetError).toBeDefined();
		expect(typeof result.current.captureError).toBe("function");
		expect(typeof result.current.resetError).toBe("function");
	});

	it("should not throw stream errors", () => {
		const { result } = renderHook(() => useErrorBoundary());

		act(() => {
			result.current.captureError(new Error("ReadableStream error"));
		});

		expect(mockConsoleWarn).toHaveBeenCalledWith(
			"Stream error captured but not thrown:",
			"ReadableStream error",
		);
	});

	it("should not throw cancel errors", () => {
		const { result } = renderHook(() => useErrorBoundary());

		act(() => {
			result.current.captureError(new Error("cancel operation"));
		});

		expect(mockConsoleWarn).toHaveBeenCalledWith(
			"Stream error captured but not thrown:",
			"cancel operation",
		);
	});

	it("should throw normal errors", () => {
		const { result } = renderHook(() => useErrorBoundary());

		expect(() => {
			act(() => {
				result.current.captureError(new Error("Normal error"));
			});
		}).toThrow("Normal error");
	});

	it("should reset error state", () => {
		const { result } = renderHook(() => useErrorBoundary());

		act(() => {
			result.current.resetError();
		});

		// Should not throw after reset
		expect(() => {
			act(() => {
				// This should not throw since we reset
			});
		}).not.toThrow();
	});

	it("should handle multiple error captures", () => {
		const { result } = renderHook(() => useErrorBoundary());

		// Stream error should not throw
		act(() => {
			result.current.captureError(new Error("ReadableStream error"));
		});

		// Cancel error should not throw
		act(() => {
			result.current.captureError(new Error("cancel error"));
		});

		// Normal error should throw
		expect(() => {
			act(() => {
				result.current.captureError(new Error("Normal error"));
			});
		}).toThrow("Normal error");
	});

	it("should handle error reset after capture", () => {
		const { result } = renderHook(() => useErrorBoundary());

		// Set error
		expect(() => {
			act(() => {
				result.current.captureError(new Error("Test error"));
			});
		}).toThrow("Test error");

		// Reset error
		act(() => {
			result.current.resetError();
		});

		// Should not throw after reset
		expect(() => {
			act(() => {
				// This should not throw since we reset
			});
		}).not.toThrow();
	});

	it("should handle concurrent error operations", () => {
		const { result } = renderHook(() => useErrorBoundary());

		// Multiple stream errors should not throw
		act(() => {
			result.current.captureError(new Error("ReadableStream error 1"));
			result.current.captureError(new Error("ReadableStream error 2"));
			result.current.captureError(new Error("cancel error"));
		});

		expect(mockConsoleWarn).toHaveBeenCalledTimes(3);
	});

	it("should handle error state transitions", () => {
		const { result } = renderHook(() => useErrorBoundary());

		// Capture stream error (should not throw)
		act(() => {
			result.current.captureError(new Error("ReadableStream error"));
		});

		// Reset
		act(() => {
			result.current.resetError();
		});

		// Capture normal error (should throw)
		expect(() => {
			act(() => {
				result.current.captureError(new Error("Normal error"));
			});
		}).toThrow("Normal error");
	});
});

