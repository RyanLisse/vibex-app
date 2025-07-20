import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import RootLayout, { metadata } from "./layout";

// Mock next/font/google
vi.mock("next/font/google", () => ({
	Geist: vi.fn(() => ({
		variable: "--font-geist-sans",
		subsets: ["latin"],
	})),
	Geist_Mono: vi.fn(() => ({
		variable: "--font-geist-mono",
		subsets: ["latin"],
	})),
}));

// Mock next-themes
vi.mock("next-themes", () => ({
	ThemeProvider: ({ children, ...props }: any) => (
		<div data-testid="theme-provider" {...props}>
			{children}
		</div>
	),
}));

// Mock error boundary
vi.mock("@/components/error-boundary", () => ({
	ErrorBoundary: ({ children }: any) => (
		<div data-testid="error-boundary">{children}</div>
	),
}));

// Mock container
vi.mock("./container", () => ({
	default: ({ children }: any) => <div data-testid="container">{children}</div>,
}));

// Mock CSS imports
vi.mock("./globals.css", () => ({}));
vi.mock("./streaming.css", () => ({}));

describe("RootLayout", () => {
	it("should render html structure with correct attributes", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const htmlElement = container.querySelector("html");
		expect(htmlElement).toBeInTheDocument();
		expect(htmlElement).toHaveAttribute("lang", "en");
		expect(htmlElement).toHaveAttribute("suppressHydrationWarning");
	});

	it("should apply font variables to body", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const bodyElement = container.querySelector("body");
		expect(bodyElement).toBeInTheDocument();
		expect(bodyElement).toHaveClass(
			"--font-geist-sans",
			"--font-geist-mono",
			"antialiased",
		);
	});

	it("should include global error handling script", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const scriptElement = container.querySelector("script");
		expect(scriptElement).toBeInTheDocument();
		expect(scriptElement?.innerHTML).toContain("unhandledrejection");
		expect(scriptElement?.innerHTML).toContain("ReadableStream");
		expect(scriptElement?.innerHTML).toContain("WebSocket");
		expect(scriptElement?.innerHTML).toContain("Authentication failed");
	});

	it("should render ThemeProvider with correct props", () => {
		render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const themeProvider = screen.getByTestId("theme-provider");
		expect(themeProvider).toBeInTheDocument();
		expect(themeProvider).toHaveAttribute("attribute", "class");
		expect(themeProvider).toHaveAttribute("defaultTheme", "system");
		expect(themeProvider).toHaveAttribute("enableSystem");
		expect(themeProvider).toHaveAttribute("disableTransitionOnChange");
	});

	it("should render ErrorBoundary wrapper", () => {
		render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const errorBoundary = screen.getByTestId("error-boundary");
		expect(errorBoundary).toBeInTheDocument();
	});

	it("should render Container component", () => {
		render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const container = screen.getByTestId("container");
		expect(container).toBeInTheDocument();
	});

	it("should render children inside container", () => {
		render(
			<RootLayout>
				<div data-testid="test-child">Test Content</div>
			</RootLayout>,
		);

		const container = screen.getByTestId("container");
		const testChild = screen.getByTestId("test-child");

		expect(container).toContainElement(testChild);
		expect(testChild).toHaveTextContent("Test Content");
	});

	it("should handle multiple children", () => {
		render(
			<RootLayout>
				<div data-testid="child-1">Child 1</div>
				<div data-testid="child-2">Child 2</div>
				<div data-testid="child-3">Child 3</div>
			</RootLayout>,
		);

		expect(screen.getByTestId("child-1")).toBeInTheDocument();
		expect(screen.getByTestId("child-2")).toBeInTheDocument();
		expect(screen.getByTestId("child-3")).toBeInTheDocument();
	});

	it("should include stream error handling in script", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const scriptElement = container.querySelector("script");
		expect(scriptElement?.innerHTML).toContain("locked stream");
		expect(scriptElement?.innerHTML).toContain("cancel");
		expect(scriptElement?.innerHTML).toContain("console.warn");
		expect(scriptElement?.innerHTML).toContain("event.preventDefault");
	});

	it("should handle both unhandledrejection and error events", () => {
		const { container } = render(
			<RootLayout>
				<div>Test Content</div>
			</RootLayout>,
		);

		const scriptElement = container.querySelector("script");
		expect(scriptElement?.innerHTML).toContain(
			"addEventListener('unhandledrejection'",
		);
		expect(scriptElement?.innerHTML).toContain("addEventListener('error'");
	});

	it("should nest components in correct order", () => {
		const { container } = render(
			<RootLayout>
				<div data-testid="content">Content</div>
			</RootLayout>,
		);

		const body = container.querySelector("body");
		const themeProvider = screen.getByTestId("theme-provider");
		const errorBoundary = screen.getByTestId("error-boundary");
		const containerElement = screen.getByTestId("container");

		expect(body).toContainElement(themeProvider);
		expect(themeProvider).toContainElement(errorBoundary);
		expect(errorBoundary).toContainElement(containerElement);
	});

	it("should handle empty children", () => {
		render(<RootLayout>{null}</RootLayout>);

		const container = screen.getByTestId("container");
		expect(container).toBeInTheDocument();
		expect(container).toBeEmptyDOMElement();
	});

	it("should handle undefined children", () => {
		render(<RootLayout>{undefined}</RootLayout>);

		const container = screen.getByTestId("container");
		expect(container).toBeInTheDocument();
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
			</RootLayout>,
		);

		expect(screen.getByText("Header")).toBeInTheDocument();
		expect(screen.getByText("Section 1")).toBeInTheDocument();
		expect(screen.getByText("Section 2")).toBeInTheDocument();
		expect(screen.getByText("Footer")).toBeInTheDocument();
	});
});

describe("metadata", () => {
	it("should have correct metadata values", () => {
		expect(metadata.title).toBe("VibeX | An open-source OpenAI Codex clone");
		expect(metadata.description).toBe(
			"Codex UI is a modern, open-source, and fully customizable UI for OpenAI Codex.",
		);
	});

	it("should be a valid Metadata object", () => {
		expect(metadata).toHaveProperty("title");
		expect(metadata).toHaveProperty("description");
		expect(typeof metadata.title).toBe("string");
		expect(typeof metadata.description).toBe("string");
	});
});
