import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { describe, expect, it, mock, vi } from "vitest";
import { AIReasoning, AIReasoningContent, AIReasoningTrigger } from "./reasoning";

// Mock dependencies
vi.mock("@radix-ui/react-use-controllable-state", () => ({
	useControllableState: ({ prop, defaultProp, onChange }: any) => {
		const React = require("react");
		const [state, setState] = React.useState(prop ?? defaultProp);
		React.useEffect(() => {
			if (prop !== undefined) {
				setState(prop);
			}
		}, [prop]);

		const setValue = (newValue: any) => {
			setState(newValue);
			onChange?.(newValue);
		};

		return [state, setValue];
	},
}));

vi.mock("@/components/ui/collapsible", () => ({
	Collapsible: ({ children, className, open, onOpenChange, ...props }: any) => {
		const handleToggle = () => onOpenChange?.(!open);
		return (
			<div
				className={className}
				data-open={open}
				data-testid="collapsible"
				onClick={handleToggle}
				{...props}
			>
				{children}
			</div>
		);
	},
	CollapsibleContent: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="collapsible-content" {...props}>
			{children}
		</div>
	),
	CollapsibleTrigger: ({ children, className, ...props }: any) => (
		<button className={className} data-testid="collapsible-trigger" {...props}>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	ChevronDownIcon: ({ className }: any) => (
		<span className={className} data-testid="chevron-icon">
			⌄
		</span>
	),
}));

vi.mock("@/lib/utils", () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/src/components/ui/kibo-ui/ai/response", () => ({
	AIResponse: ({ children, className }: any) => (
		<div className={className} data-testid="ai-response">
			{children}
		</div>
	),
}));

describe("AIReasoning", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("should render children", () => {
		render(
			<AIReasoning>
				<div>Reasoning content</div>
			</AIReasoning>
		);

		expect(screen.getByText("Reasoning content")).toBeInTheDocument();
	});

	it("should apply default classes", () => {
		render(<AIReasoning />);

		const collapsible = screen.getByTestId("collapsible");
		expect(collapsible).toHaveClass("not-prose", "mb-4");
	});

	it("should apply custom className", () => {
		render(<AIReasoning className="custom-reasoning" />);

		const collapsible = screen.getByTestId("collapsible");
		expect(collapsible).toHaveClass("custom-reasoning");
	});

	it("should handle controlled open state", async () => {
		const handleOpenChange = vi.fn();
		const user = userEvent.setup({ delay: null });

		const { rerender } = render(
			<AIReasoning onOpenChange={handleOpenChange} open={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "false");

		await user.click(screen.getByTestId("collapsible"));
		expect(handleOpenChange).toHaveBeenCalledWith(true);

		rerender(
			<AIReasoning onOpenChange={handleOpenChange} open={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "true");
	});

	it("should auto-open when streaming starts", () => {
		const { rerender } = render(
			<AIReasoning isStreaming={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "false");

		rerender(
			<AIReasoning isStreaming={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "true");
	});

	it("should auto-close after streaming ends with delay", async () => {
		const { rerender } = render(
			<AIReasoning isStreaming={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "true");

		rerender(
			<AIReasoning isStreaming={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		// Should still be open immediately
		expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "true");

		// Advance timer to trigger auto-close
		vi.advanceTimersByTime(1000);

		await waitFor(() => {
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "false");
		});
	});

	it("should not auto-close if defaultOpen is true", async () => {
		const { rerender } = render(
			<AIReasoning defaultOpen={true} isStreaming={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		rerender(
			<AIReasoning defaultOpen={true} isStreaming={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		vi.advanceTimersByTime(2000);

		await waitFor(() => {
			expect(screen.getByTestId("collapsible")).toHaveAttribute("data-open", "true");
		});
	});

	it("should track duration while streaming", () => {
		const { rerender } = render(
			<AIReasoning isStreaming={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByText("Thought for 0 seconds")).toBeInTheDocument();

		// Start streaming
		rerender(
			<AIReasoning isStreaming={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByText("Thinking...")).toBeInTheDocument();

		// Advance time by 3 seconds
		vi.advanceTimersByTime(3000);

		// Stop streaming
		rerender(
			<AIReasoning isStreaming={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByText("Thought for 3 seconds")).toBeInTheDocument();
	});

	it("should pass through additional props", () => {
		render(
			<AIReasoning aria-label="AI reasoning" data-testid="ai-reasoning">
				Content
			</AIReasoning>
		);

		const reasoning = screen.getByTestId("ai-reasoning");
		expect(reasoning).toHaveAttribute("aria-label", "AI reasoning");
	});
});

describe("AIReasoningTrigger", () => {
	it("should throw error when used outside AIReasoning", () => {
		// Suppress console.error for this test
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => {
			render(<AIReasoningTrigger />);
		}).toThrow("AIReasoning components must be used within AIReasoning");

		spy.mockRestore();
	});

	it("should render default content when not streaming", () => {
		render(
			<AIReasoning duration={5}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByText("Thought for 5 seconds")).toBeInTheDocument();
		expect(screen.getByTestId("chevron-icon")).toBeInTheDocument();
	});

	it("should render streaming content when streaming", () => {
		render(
			<AIReasoning isStreaming={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(screen.getByText("Thinking...")).toBeInTheDocument();
	});

	it("should render custom children over default content", () => {
		render(
			<AIReasoning>
				<AIReasoningTrigger>
					<span>Custom trigger</span>
				</AIReasoningTrigger>
			</AIReasoning>
		);

		expect(screen.getByText("Custom trigger")).toBeInTheDocument();
		expect(screen.queryByText("Thought for")).not.toBeInTheDocument();
	});

	it("should apply chevron rotation based on open state", () => {
		const { rerender } = render(
			<AIReasoning open={false}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		const chevron = screen.getByTestId("chevron-icon");
		expect(chevron).toHaveClass("rotate-0");
		expect(chevron).not.toHaveClass("rotate-180");

		rerender(
			<AIReasoning open={true}>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		expect(chevron).toHaveClass("rotate-180");
		expect(chevron).not.toHaveClass("rotate-0");
	});

	it("should apply default classes", () => {
		render(
			<AIReasoning>
				<AIReasoningTrigger />
			</AIReasoning>
		);

		const trigger = screen.getByTestId("collapsible-trigger");
		expect(trigger).toHaveClass(
			"flex",
			"items-center",
			"gap-2",
			"text-muted-foreground",
			"text-sm"
		);
	});

	it("should apply custom className", () => {
		render(
			<AIReasoning>
				<AIReasoningTrigger className="custom-trigger" />
			</AIReasoning>
		);

		const trigger = screen.getByTestId("collapsible-trigger");
		expect(trigger).toHaveClass("custom-trigger");
	});
});

describe("AIReasoningContent", () => {
	it("should throw error when used outside AIReasoning", () => {
		// Suppress console.error for this test
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => {
			render(<AIReasoningContent>Content</AIReasoningContent>);
		}).toThrow("AIReasoning components must be used within AIReasoning");

		spy.mockRestore();
	});

	it("should render children in AIResponse", () => {
		render(
			<AIReasoning>
				<AIReasoningContent>## Reasoning content</AIReasoningContent>
			</AIReasoning>
		);

		expect(screen.getByTestId("ai-response")).toBeInTheDocument();
		expect(screen.getByTestId("ai-response")).toHaveTextContent("## Reasoning content");
	});

	it("should apply default classes", () => {
		render(
			<AIReasoning>
				<AIReasoningContent>Content</AIReasoningContent>
			</AIReasoning>
		);

		const content = screen.getByTestId("collapsible-content");
		expect(content).toHaveClass("mt-4", "text-muted-foreground", "text-sm");
	});

	it("should apply custom className", () => {
		render(
			<AIReasoning>
				<AIReasoningContent className="custom-content">Content</AIReasoningContent>
			</AIReasoning>
		);

		const content = screen.getByTestId("collapsible-content");
		expect(content).toHaveClass("custom-content");
	});

	it("should pass grid gap class to AIResponse", () => {
		render(
			<AIReasoning>
				<AIReasoningContent>Content</AIReasoningContent>
			</AIReasoning>
		);

		const response = screen.getByTestId("ai-response");
		expect(response).toHaveClass("grid", "gap-2");
	});
});
