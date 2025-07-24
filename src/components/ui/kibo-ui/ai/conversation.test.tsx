import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { AIConversation, AIConversationContent, AIConversationScrollButton } from "./conversation";

// Mock the Button component
vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, className, ...props }: any) => (
		<button className={className} onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

// Mock the StickToBottom component
const mockScrollToBottom = vi.fn();
const mockStickToBottomContext = {
	isAtBottom: false,
	scrollToBottom: mockScrollToBottom,
};

vi.mock("use-stick-to-bottom", () => ({
	StickToBottom: ({ children, className, ...props }: any) => (
		<div className={className} role="log" {...props}>
			{children}
		</div>
	),
	useStickToBottomContext: () => mockStickToBottomContext,
}));

// Mock the cn utility
vi.mock("/lib/utils", () => ({
	cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

// Mock Lucide icons
vi.mock("lucide-react", () => ({
	ArrowDownIcon: ({ className }: { className: string }) => (
		<span className={className} data-testid="arrow-down-icon" />
	),
}));

describe("AIConversation Components", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStickToBottomContext.isAtBottom = false;
	});

	describe("AIConversation", () => {
		it("renders with default props", () => {
			render(
				<AIConversation>
					<div>Conversation content</div>
				</AIConversation>
			);

			expect(screen.getByText("Conversation content")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIConversation className="custom-class">
					<div>Content</div>
				</AIConversation>
			);

			const conversation = screen.getByRole("log");
			expect(conversation).toHaveClass("custom-class");
		});

		it("has proper semantic role", () => {
			render(
				<AIConversation>
					<div>Content</div>
				</AIConversation>
			);

			expect(screen.getByRole("log")).toBeInTheDocument();
		});

		it("passes through all props to StickToBottom", () => {
			render(
				<AIConversation aria-label="Chat conversation" data-testid="conversation">
					<div>Content</div>
				</AIConversation>
			);

			const conversation = screen.getByTestId("conversation");
			expect(conversation).toHaveAttribute("aria-label", "Chat conversation");
		});
	});

	describe("AIConversationContent", () => {
		it("renders with default props", () => {
			render(
				<AIConversationContent>
					<div>Content</div>
				</AIConversationContent>
			);

			expect(screen.getByText("Content")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIConversationContent className="custom-content">
					<div>Content</div>
				</AIConversationContent>
			);

			const content = screen.getByText("Content").parentElement;
			expect(content).toHaveClass("custom-content");
		});

		it("passes through all props", () => {
			render(
				<AIConversationContent data-testid="content" id="conversation-content">
					<div>Content</div>
				</AIConversationContent>
			);

			const content = screen.getByTestId("content");
			expect(content).toHaveAttribute("id", "conversation-content");
		});

		it("renders multiple children", () => {
			render(
				<AIConversationContent>
					<div>Message 1</div>
					<div>Message 2</div>
					<div>Message 3</div>
				</AIConversationContent>
			);

			expect(screen.getByText("Message 1")).toBeInTheDocument();
			expect(screen.getByText("Message 2")).toBeInTheDocument();
			expect(screen.getByText("Message 3")).toBeInTheDocument();
		});
	});

	describe("AIConversationScrollButton", () => {
		it("renders when not at bottom", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(<AIConversationScrollButton />);

			expect(screen.getByRole("button")).toBeInTheDocument();
			expect(screen.getByTestId("arrow-down-icon")).toBeInTheDocument();
		});

		it("does not render when at bottom", () => {
			mockStickToBottomContext.isAtBottom = true;

			render(<AIConversationScrollButton />);

			expect(screen.queryByRole("button")).not.toBeInTheDocument();
		});

		it("calls scrollToBottom when clicked", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(<AIConversationScrollButton />);

			const button = screen.getByRole("button");
			fireEvent.click(button);

			expect(mockScrollToBottom).toHaveBeenCalledTimes(1);
		});

		it("has proper button attributes", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(<AIConversationScrollButton />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("type", "button");
		});

		it("applies proper styling classes", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(<AIConversationScrollButton />);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("absolute");
			expect(button).toHaveClass("bottom-4");
			expect(button).toHaveClass("left-[50%]");
			expect(button).toHaveClass("translate-x-[-50%]");
			expect(button).toHaveClass("rounded-full");
		});

		it("toggles visibility based on scroll position", () => {
			mockStickToBottomContext.isAtBottom = false;

			const { rerender } = render(<AIConversationScrollButton />);

			expect(screen.getByRole("button")).toBeInTheDocument();

			// Simulate scrolling to bottom
			mockStickToBottomContext.isAtBottom = true;
			rerender(<AIConversationScrollButton />);

			expect(screen.queryByRole("button")).not.toBeInTheDocument();

			// Simulate scrolling away from bottom
			mockStickToBottomContext.isAtBottom = false;
			rerender(<AIConversationScrollButton />);

			expect(screen.getByRole("button")).toBeInTheDocument();
		});
	});

	describe("Integration", () => {
		it("works together as a complete conversation component", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(
				<AIConversation>
					<AIConversationContent>
						<div>Message 1</div>
						<div>Message 2</div>
					</AIConversationContent>
					<AIConversationScrollButton />
				</AIConversation>
			);

			// All components should be present
			expect(screen.getByRole("log")).toBeInTheDocument();
			expect(screen.getByText("Message 1")).toBeInTheDocument();
			expect(screen.getByText("Message 2")).toBeInTheDocument();
			expect(screen.getByRole("button")).toBeInTheDocument();

			// Scroll button should work
			fireEvent.click(screen.getByRole("button"));
			expect(mockScrollToBottom).toHaveBeenCalled();
		});

		it("handles empty conversation", () => {
			render(
				<AIConversation>
					<AIConversationContent>{/* Empty conversation */}</AIConversationContent>
				</AIConversation>
			);

			expect(screen.getByRole("log")).toBeInTheDocument();
		});

		it("handles dynamic content updates", () => {
			const { rerender } = render(
				<AIConversation>
					<AIConversationContent>
						<div>Initial message</div>
					</AIConversationContent>
				</AIConversation>
			);

			expect(screen.getByText("Initial message")).toBeInTheDocument();

			rerender(
				<AIConversation>
					<AIConversationContent>
						<div>Initial message</div>
						<div>New message</div>
					</AIConversationContent>
				</AIConversation>
			);

			expect(screen.getByText("Initial message")).toBeInTheDocument();
			expect(screen.getByText("New message")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has proper semantic structure", () => {
			render(
				<AIConversation>
					<AIConversationContent>
						<div>Message content</div>
					</AIConversationContent>
				</AIConversation>
			);

			const conversation = screen.getByRole("log");
			expect(conversation).toBeInTheDocument();
		});

		it("maintains focus management", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(
				<AIConversation>
					<AIConversationContent>
						<div>Content</div>
					</AIConversationContent>
					<AIConversationScrollButton />
				</AIConversation>
			);

			const button = screen.getByRole("button");
			button.focus();

			expect(document.activeElement).toBe(button);
		});

		it("supports keyboard navigation", () => {
			mockStickToBottomContext.isAtBottom = false;

			render(<AIConversationScrollButton />);

			const button = screen.getByRole("button");

			// Test Enter key
			fireEvent.keyDown(button, { key: "Enter" });
			expect(mockScrollToBottom).toHaveBeenCalledTimes(1);

			// Test Space key
			fireEvent.keyDown(button, { key: " " });
			expect(mockScrollToBottom).toHaveBeenCalledTimes(2);
		});
	});

	describe("Edge Cases", () => {
		it("handles rapid scroll position changes", () => {
			mockStickToBottomContext.isAtBottom = false;

			const { rerender } = render(<AIConversationScrollButton />);

			// Rapid changes
			for (let i = 0; i < 10; i++) {
				mockStickToBottomContext.isAtBottom = i % 2 === 0;
				rerender(<AIConversationScrollButton />);
			}

			// Should still work correctly
			if (mockStickToBottomContext.isAtBottom) {
				expect(screen.queryByRole("button")).not.toBeInTheDocument();
			} else {
				expect(screen.getByRole("button")).toBeInTheDocument();
			}
		});

		it("handles missing scroll context gracefully", () => {
			// Mock missing context
			const originalError = console.error;
			console.error = vi.fn();

			vi.doMock("use-stick-to-bottom", () => ({
				StickToBottom: ({ children, ...props }: any) => <div {...props}>{children}</div>,
				useStickToBottomContext: () => {
					throw new Error("Context not found");
				},
			}));

			expect(() => {
				render(<AIConversationScrollButton />);
			}).toThrow();

			console.error = originalError;
		});
	});
});
