import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import RootLayout, { metadata } from "./layout";

// Mock next/font/google
vi.mock("next/font/google", () => ({
	Inter: vi.fn(() => ({
		className: "font-inter",
		subsets: ["latin"],
	})),
}));

// Mock CSS imports
vi.mock("./globals.css", () => ({}));

describe("RootLayout", () => {
	it("should render html structure with correct attributes", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>
		);

		const htmlElement = container.querySelector("html");
		expect(htmlElement).toBeInTheDocument();
		expect(htmlElement).toHaveAttribute("lang", "en");
	});

	it("should apply Inter font class to body", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>
		);

		const bodyElement = container.querySelector("body");
		expect(bodyElement).toBeInTheDocument();
		expect(bodyElement).toHaveClass("font-inter");
	});

	it("should render main container with correct styling", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>
		);

		const mainDiv = container.querySelector(".min-h-screen.bg-gray-50");
		expect(mainDiv).toBeInTheDocument();
		expect(mainDiv).toHaveTextContent("Test Content");
	});

	it("should render children inside main container", () => {
		render(
			<RootLayout>
				<div data-testid="test-child">Test Content</div>
			</RootLayout>
		);

		const testChild = screen.getByTestId("test-child");
		expect(testChild).toBeInTheDocument();
		expect(testChild).toHaveTextContent("Test Content");
	});

	it("should handle multiple children", () => {
		render(
			<RootLayout>
				<div data-testid="child-1">Child 1</div>
				<div data-testid="child-2">Child 2</div>
				<div data-testid="child-3">Child 3</div>
			</RootLayout>
		);

		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
		expect(screen.getByTestId("child-3")).toBeInTheDocument();
	});

	it("should have correct component nesting", () => {
		const { container } = render(
			<RootLayout>
				<div data-testid="content">Content</div>
			</RootLayout>
		);

		const body = container.querySelector("body");
		const mainDiv = container.querySelector(".min-h-screen.bg-gray-50");
		const content = screen.getByTestId("content");

		expect(body).toContainElement(mainDiv);
		expect(mainDiv).toContainElement(content);
	});

	it("should handle empty children", () => {
		const { container } = render(<RootLayout>{null}</RootLayout>);

		const mainDiv = container.querySelector(".min-h-screen.bg-gray-50");
		expect(mainDiv).toBeInTheDocument();
	});

	it("should handle undefined children", () => {
		const { container } = render(<RootLayout>{undefined}</RootLayout>);

		const mainDiv = container.querySelector(".min-h-screen.bg-gray-50");
		expect(mainDiv).toBeInTheDocument();
	});

	it("should preserve component structure with complex children", () => {
		render(
			<RootLayout>
				<header>Header</header>
				<main>
					<section>Section 1</section>
					<section>Section 2</section>
				</main>
				<footer>Footer</footer>
			</RootLayout>
		);

		expect(screen.getByText("Header")).toBeInTheDocument();
		expect(screen.getByText("Section 1")).toBeInTheDocument();
		expect(screen.getByText("Section 2")).toBeInTheDocument();
		expect(screen.getByText("Footer")).toBeInTheDocument();
	});
});

describe("metadata", () => {
	it("should have correct metadata values", () => {
		expect(metadata.title).toBe("Vibex App");
		expect(metadata.description).toBe("Modern web application with AI capabilities");
	});

	it("should be a valid Metadata object", () => {
		expect(metadata).toHaveProperty("title");
		expect(metadata).toHaveProperty("description");
		expect(typeof metadata.title).toBe("string");
		expect(typeof metadata.description).toBe("string");
	});
});
