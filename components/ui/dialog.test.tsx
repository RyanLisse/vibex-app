import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
} from "./dialog";

// Mock Radix UI components
vi.mock("@radix-ui/react-dialog", () => ({
	Root: ({ children, ...props }: any) => (
		<div data-testid="dialog-root" {...props}>
			{children}
		</div>
	),
	Trigger: ({ children, ...props }: any) => (
		<button data-testid="dialog-trigger" {...props}>
			{children}
		</button>
	),
	Portal: ({ children, ...props }: any) => (
		<div data-testid="dialog-portal" {...props}>
			{children}
		</div>
	),
	Close: ({ children, ...props }: any) => (
		<button data-testid="dialog-close" {...props}>
			{children}
		</button>
	),
	Overlay: ({ className, ...props }: any) => (
		<div className={className} data-testid="dialog-overlay" {...props} />
	),
	Content: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="dialog-content" {...props}>
			{children}
		</div>
	),
	Title: ({ children, className, ...props }: any) => (
		<h2 className={className} data-testid="dialog-title" {...props}>
			{children}
		</h2>
	),
	Description: ({ children, className, ...props }: any) => (
		<p className={className} data-testid="dialog-description" {...props}>
			{children}
		</p>
	),
}));

describe("Dialog Components", () => {
	describe("Dialog", () => {
		it("should render Dialog root", () => {
			render(
				<Dialog>
					<div>Dialog content</div>
				</Dialog>
			);

			expect(screen.getByTestId("dialog-root")).toBeInTheDocument();
		});

		it("should pass through props", () => {
			render(
				<Dialog data-custom="test">
					<div>Content</div>
				</Dialog>
			);

			expect(screen.getByTestId("dialog-root")).toHaveAttribute("data-custom", "test");
		});
	});

	describe("DialogTrigger", () => {
		it("should render trigger button", () => {
			render(<DialogTrigger>Open Dialog</DialogTrigger>);

			const trigger = screen.getByTestId("dialog-trigger");
			expect(trigger).toBeInTheDocument();
			expect(trigger).toHaveTextContent("Open Dialog");
		});

		it("should pass through props", () => {
			render(<DialogTrigger disabled={true}>Open</DialogTrigger>);

			expect(screen.getByTestId("dialog-trigger")).toHaveAttribute("disabled");
		});
	});

	describe("DialogPortal", () => {
		it("should render portal", () => {
			render(
				<DialogPortal>
					<div>Portal content</div>
				</DialogPortal>
			);

			expect(screen.getByTestId("dialog-portal")).toBeInTheDocument();
		});
	});

	describe("DialogClose", () => {
		it("should render close button", () => {
			render(<DialogClose>Close</DialogClose>);

			const close = screen.getByTestId("dialog-close");
			expect(close).toBeInTheDocument();
			expect(close).toHaveTextContent("Close");
		});
	});

	describe("DialogOverlay", () => {
		it("should render overlay with default classes", () => {
			render(<DialogOverlay />);

			const overlay = screen.getByTestId("dialog-overlay");
			expect(overlay).toBeInTheDocument();
			expect(overlay).toHaveClass("fixed", "inset-0", "z-50", "bg-black/50");
		});

		it("should merge custom className", () => {
			render(<DialogOverlay className="custom-overlay" />);

			const overlay = screen.getByTestId("dialog-overlay");
			expect(overlay).toHaveClass("custom-overlay");
			expect(overlay).toHaveClass("fixed");
		});
	});

	describe("DialogContent", () => {
		it("should render content with overlay and close button by default", () => {
			render(
				<DialogContent>
					<div>Dialog body</div>
				</DialogContent>
			);

			expect(screen.getByTestId("dialog-overlay")).toBeInTheDocument();
			expect(screen.getByTestId("dialog-content")).toBeInTheDocument();
			expect(screen.getAllByTestId("dialog-close")).toHaveLength(1);
			expect(screen.getByText("Close")).toHaveClass("sr-only");
		});

		it("should render without close button when showCloseButton is false", () => {
			render(
				<DialogContent showCloseButton={false}>
					<div>Dialog body</div>
				</DialogContent>
			);

			expect(screen.queryByText("Close")).not.toBeInTheDocument();
		});

		it("should apply default content classes", () => {
			render(
				<DialogContent>
					<div>Content</div>
				</DialogContent>
			);

			const content = screen.getByTestId("dialog-content");
			expect(content).toHaveClass("fixed", "top-[50%]", "left-[50%]", "z-50", "grid");
		});

		it("should merge custom className", () => {
			render(
				<DialogContent className="custom-content">
					<div>Content</div>
				</DialogContent>
			);

			const content = screen.getByTestId("dialog-content");
			expect(content).toHaveClass("custom-content");
			expect(content).toHaveClass("fixed");
		});
	});

	describe("DialogHeader", () => {
		it("should render header with default classes", () => {
			render(
				<DialogHeader data-testid="header">
					<div>Header content</div>
				</DialogHeader>
			);

			const header = screen.getByTestId("header");
			expect(header).toBeInTheDocument();
			expect(header).toHaveClass("flex", "flex-col", "gap-2");
		});

		it("should merge custom className", () => {
			render(
				<DialogHeader className="custom-header" data-testid="header">
					Header
				</DialogHeader>
			);

			const header = screen.getByTestId("header");
			expect(header).toHaveClass("custom-header");
		});
	});

	describe("DialogFooter", () => {
		it("should render footer with default classes", () => {
			render(
				<DialogFooter data-testid="footer">
					<button>Cancel</button>
					<button>Save</button>
				</DialogFooter>
			);

			const footer = screen.getByTestId("footer");
			expect(footer).toBeInTheDocument();
			expect(footer).toHaveClass(
				"flex",
				"flex-col-reverse",
				"gap-2",
				"sm:flex-row",
				"sm:justify-end"
			);
		});

		it("should merge custom className", () => {
			render(
				<DialogFooter className="justify-center" data-testid="footer">
					Footer
				</DialogFooter>
			);

			const footer = screen.getByTestId("footer");
			expect(footer).toHaveClass("justify-center");
		});
	});

	describe("DialogTitle", () => {
		it("should render title with default classes", () => {
			render(<DialogTitle>Dialog Title</DialogTitle>);

			const title = screen.getByTestId("dialog-title");
			expect(title).toBeInTheDocument();
			expect(title).toHaveTextContent("Dialog Title");
			expect(title).toHaveClass("text-lg", "leading-none", "font-semibold");
		});

		it("should merge custom className", () => {
			render(<DialogTitle className="text-xl">Title</DialogTitle>);

			const title = screen.getByTestId("dialog-title");
			expect(title).toHaveClass("text-xl");
		});
	});

	describe("DialogDescription", () => {
		it("should render description with default classes", () => {
			render(<DialogDescription>Dialog description text</DialogDescription>);

			const description = screen.getByTestId("dialog-description");
			expect(description).toBeInTheDocument();
			expect(description).toHaveTextContent("Dialog description text");
			expect(description).toHaveClass("text-muted-foreground", "text-sm");
		});

		it("should merge custom className", () => {
			render(<DialogDescription className="italic">Description</DialogDescription>);

			const description = screen.getByTestId("dialog-description");
			expect(description).toHaveClass("italic");
		});
	});

	describe("Dialog composition", () => {
		it("should render a complete dialog", () => {
			render(
				<Dialog>
					<DialogTrigger>Open Dialog</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Confirm Action</DialogTitle>
							<DialogDescription>Are you sure you want to perform this action?</DialogDescription>
						</DialogHeader>
						<div>
							<p>This action cannot be undone.</p>
						</div>
						<DialogFooter>
							<DialogClose>Cancel</DialogClose>
							<button>Confirm</button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			);

			expect(screen.getByText("Open Dialog")).toBeInTheDocument();
			expect(screen.getByText("Confirm Action")).toBeInTheDocument();
			expect(screen.getByText("Are you sure you want to perform this action?")).toBeInTheDocument();
			expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
			expect(screen.getByText("Cancel")).toBeInTheDocument();
			expect(screen.getByText("Confirm")).toBeInTheDocument();
		});

		it("should work without optional components", () => {
			render(
				<Dialog>
					<DialogContent showCloseButton={false}>
						<DialogTitle>Simple Dialog</DialogTitle>
						<div>Content only</div>
					</DialogContent>
				</Dialog>
			);

			expect(screen.getByText("Simple Dialog")).toBeInTheDocument();
			expect(screen.getByText("Content only")).toBeInTheDocument();
			expect(screen.queryByText("Close")).not.toBeInTheDocument();
		});
	});
});
