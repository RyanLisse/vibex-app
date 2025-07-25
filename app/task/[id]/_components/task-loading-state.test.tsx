import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { TaskLoadingState } from "./task-loading-state";

// Mock the TextShimmer component
// vi.mock("@/components/ui/text-shimmer", () => ({
// 	TextShimmer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
// <span className={className} data-testid="text-shimmer">
// {children}
// </span>
// ),
// }));

describe.skip("TaskLoadingState", () => {
	it("should render default loading message", () => {
		render(<TaskLoadingState />);

		expect(screen.getByTestId("text-shimmer").textContent).toContain("Working on task...");
	});

	it("should render custom status message", () => {
		const customMessage = "Processing your request...";
		render(<TaskLoadingState statusMessage={customMessage} />);

		expect(screen.getByTestId("text-shimmer").textContent).toContain(customMessage);
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
		expect(mainContainer?.classList.contains("flex")).toBe(true);
		expect(mainContainer?.classList.contains("justify-start")).toBe(true);
		expect(mainContainer?.classList.contains("animate-in")).toBe(true);
		expect(mainContainer?.classList.contains("slide-in-from-bottom-2")).toBe(true);
		expect(mainContainer?.classList.contains("duration-300")).toBe(true);
		expect(mainContainer?.classList.contains("pb-2")).toBe(true);
		expect(mainContainer?.classList.contains("relative")).toBe(true);
		expect(mainContainer?.classList.contains("w-full")).toBe(true);
	});

	it("should have animated avatar", () => {
		const { container } = render(<TaskLoadingState statusMessage="Test" />);

		const avatar = container.querySelector('[role="img"]') as HTMLElement;
		expect(avatar).toBeTruthy();
		expect(avatar?.classList.contains("relative")).toBe(true);
		expect(avatar?.classList.contains("flex")).toBe(true);
		expect(avatar?.classList.contains("h-9")).toBe(true);
		expect(avatar?.classList.contains("w-9")).toBe(true);
		expect(avatar?.classList.contains("shrink-0")).toBe(true);
	});

	it("should apply animate-spin to loader icon", () => {
		render(<TaskLoadingState statusMessage="Test" />);

		const loaderIcon = document.querySelector('svg[data-lucide="loader"]') as HTMLElement;
		expect(loaderIcon?.classList.contains("animate-spin")).toBe(true);
		expect(loaderIcon?.classList.contains("text-primary")).toBe(true);
	});

	it("should render message container with proper styles", () => {
		render(<TaskLoadingState statusMessage="Test" />);

		const messageContainer = screen.getByTestId("text-shimmer").parentElement as HTMLElement;
		expect(messageContainer?.classList.contains("ml-3")).toBe(true);
		expect(messageContainer?.classList.contains("flex")).toBe(true);
		expect(messageContainer?.classList.contains("flex-1")).toBe(true);
		expect(messageContainer?.classList.contains("flex-col")).toBe(true);
		expect(messageContainer?.classList.contains("gap-2")).toBe(true);
	});

	it("should apply proper styles to text shimmer", () => {
		render(<TaskLoadingState statusMessage="Loading..." />);

		const textShimmer = screen.getByTestId("text-shimmer") as HTMLElement;
		expect(textShimmer?.classList.contains("text-lg")).toBe(true);
	});

	it("should handle long status messages", () => {
		const longMessage =
			"This is a very long status message that might wrap to multiple lines when displayed in the component";
		render(<TaskLoadingState statusMessage={longMessage} />);

		expect(screen.getByTestId("text-shimmer").textContent).toContain(longMessage);
	});

	it("should handle empty status message", () => {
		render(<TaskLoadingState statusMessage="" />);

		expect(screen.getByTestId("text-shimmer").textContent).toBe("");
	});

	it("should handle special characters in status message", () => {
		const specialMessage = "Loading... 50% <complete> & processing!";
		render(<TaskLoadingState statusMessage={specialMessage} />);

		expect(screen.getByTestId("text-shimmer").textContent).toContain(specialMessage);
	});
});
