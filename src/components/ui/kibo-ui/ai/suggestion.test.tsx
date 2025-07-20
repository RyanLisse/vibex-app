import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AISuggestion, AISuggestions } from "./suggestion";

// Mock dependencies
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, className, onClick, ...props }: any) => (
		<button className={className} onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/scroll-area", () => ({
	ScrollArea: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="scroll-area" {...props}>
			{children}
		</div>
	),
	ScrollBar: ({ className, orientation }: any) => (
		<div
			className={className}
			data-orientation={orientation}
			data-testid="scroll-bar"
		/>
	),
}));

vi.mock("@/lib/utils", () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("AISuggestions", () => {
	it("should render children within ScrollArea", () => {
		render(
			<AISuggestions>
				<div>Suggestion 1</div>
				<div>Suggestion 2</div>
			</AISuggestions>,
		);

		expect(screen.getByTestId("scroll-area")).toBeInTheDocument();
		expect(screen.getByText("Suggestion 1")).toBeInTheDocument();
		expect(screen.getByText("Suggestion 2")).toBeInTheDocument();
	});

	it("should apply default classes", () => {
		render(<AISuggestions>Content</AISuggestions>);

		const scrollArea = screen.getByTestId("scroll-area");
		expect(scrollArea).toHaveClass(
			"w-full",
			"overflow-x-auto",
			"whitespace-nowrap",
		);
	});

	it("should apply custom className to container", () => {
		render(<AISuggestions className="custom-class">Content</AISuggestions>);

		const container = screen.getByText("Content").parentElement;
		expect(container).toHaveClass("custom-class");
	});

	it("should render horizontal ScrollBar", () => {
		render(<AISuggestions>Content</AISuggestions>);

		const scrollBar = screen.getByTestId("scroll-bar");
		expect(scrollBar).toBeInTheDocument();
		expect(scrollBar).toHaveClass("hidden");
		expect(scrollBar).toHaveAttribute("data-orientation", "horizontal");
	});

	it("should pass through additional props", () => {
		render(
			<AISuggestions aria-label="AI suggestions" data-testid="ai-suggestions">
				Content
			</AISuggestions>,
		);

		expect(screen.getByTestId("ai-suggestions")).toBeInTheDocument();
		expect(screen.getByTestId("ai-suggestions")).toHaveAttribute(
			"aria-label",
			"AI suggestions",
		);
	});
});

describe("AISuggestion", () => {
	it("should render suggestion text by default", () => {
		render(<AISuggestion suggestion="Click me!" />);

		expect(screen.getByText("Click me!")).toBeInTheDocument();
	});

	it("should render custom children over suggestion text", () => {
		render(
			<AISuggestion suggestion="Default text">
				<span>Custom content</span>
			</AISuggestion>,
		);

		expect(screen.getByText("Custom content")).toBeInTheDocument();
		expect(screen.queryByText("Default text")).not.toBeInTheDocument();
	});

	it("should call onClick with suggestion when clicked", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(<AISuggestion onClick={handleClick} suggestion="Test suggestion" />);

		await user.click(screen.getByText("Test suggestion"));

		expect(handleClick).toHaveBeenCalledTimes(1);
		expect(handleClick).toHaveBeenCalledWith("Test suggestion");
	});

	it("should apply default button props", () => {
		render(<AISuggestion suggestion="Test" />);

		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveClass("cursor-pointer", "rounded-full", "px-4");
	});

	it("should apply custom variant and size", () => {
		render(<AISuggestion size="lg" suggestion="Test" variant="ghost" />);

		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("variant", "ghost");
		expect(button).toHaveAttribute("size", "lg");
	});

	it("should apply custom className", () => {
		render(<AISuggestion className="custom-button" suggestion="Test" />);

		const button = screen.getByRole("button");
		expect(button).toHaveClass("custom-button");
	});

	it("should pass through additional button props", () => {
		render(
			<AISuggestion
				data-testid="suggestion-button"
				disabled
				suggestion="Test"
			/>,
		);

		const button = screen.getByTestId("suggestion-button");
		expect(button).toBeDisabled();
	});

	it("should handle missing onClick gracefully", async () => {
		const user = userEvent.setup();

		render(<AISuggestion suggestion="Test" />);

		// Should not throw when clicked without onClick handler
		await expect(user.click(screen.getByRole("button"))).resolves.not.toThrow();
	});
});
