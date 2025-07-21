import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TaskLoadingState } from "./task-loading-state";

// Mock the TextShimmer component
vi.mock("@/components/ui/text-shimmer", () => ({
	TextShimmer: ({
		children,
		className,
	}: {
		children: React.ReactNode;
		className?: string;
	}) => (
		<span className={className} data-testid="text-shimmer">
			{children}
		</span>
	),
}));

describe("TaskLoadingState", () => {
	it("should render default loading message", () => {
		render(<TaskLoadingState />);

		expect(screen.getByTestId("text-shimmer")).toHaveTextContent(
			"Working on task...",
		);
	});

	it("should render custom status message", () => {
		const customMessage = "Processing your request...";
		render(<TaskLoadingState statusMessage={customMessage} />);

		expect(screen.getByTestId("text-shimmer")).toHaveTextContent(customMessage);
	});

	it("should render with proper structure", () => {
		render(<TaskLoadingState statusMessage="Test message" />);

		// Check for Bot icon (from lucide-react)
		const botIcon = document.querySelector('svg[data-lucide="bot"]');
		expect(botIcon).toBeTruthy();

		// Check for Loader icon (from lucide-react)
		const loaderIcon = document.querySelector('svg[data-lucide="loader"]');
		expect(loaderIcon).toBeTruthy();

		// Check for TextShimmer component
		expect(screen.getByTestId("text-shimmer")).toBeTruthy();
	});

	it("should have proper CSS classes for layout", () => {
		const { container } = render(<TaskLoadingState statusMessage="Test" />);

		const mainContainer = container.firstChild as HTMLElement;
		expect(mainContainer).toHaveClass(
			"flex",
			"justify-start",
			"animate-in",
			"slide-in-from-left",
			"duration-300",
		);
	});

	it("should handle empty string status message", () => {
		render(<TaskLoadingState statusMessage="" />);

		expect(screen.getByTestId("text-shimmer")).toHaveTextContent(
			"Working on task...",
		);
	});

	it("should handle undefined status message", () => {
		render(<TaskLoadingState statusMessage={undefined} />);

		expect(screen.getByTestId("text-shimmer")).toHaveTextContent(
			"Working on task...",
		);
	});

	it("should render with accessible structure", () => {
		render(<TaskLoadingState statusMessage="Loading..." />);

		const loadingElement = screen.getByTestId("text-shimmer");
		expect(loadingElement).toHaveClass("text-sm");
	});
});
