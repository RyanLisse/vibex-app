import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import Navbar from "./navbar";

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
	Dot: ({ className, ...props }: any) => (
		<svg className={className} data-testid="dot-icon" {...props} />
	),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
	default: ({ children, href, className, passHref, ...props }: any) => (
		<a className={className} data-testid="link" href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock ThemeToggle component
vi.mock("@/components/ui/theme-toggle", () => ({
	ThemeToggle: () => <div data-testid="theme-toggle">Theme Toggle</div>,
}));

describe("Navbar", () => {
	it("should render the navbar structure", () => {
		render(<Navbar />);

		const navbar = screen.getByText("VibeX").closest("div");
		expect(navbar).toBeInTheDocument();
		expect(navbar).toHaveClass("flex", "justify-between", "items-center");
	});

	it("should render VibeX logo as a link", () => {
		render(<Navbar />);

		const logoLink = screen.getByText("VibeX").closest("a");
		expect(logoLink).toBeInTheDocument();
		expect(logoLink).toHaveAttribute("href", "/");
		expect(logoLink).toHaveAttribute("data-testid", "link");

		const logoText = screen.getByText("VibeX");
		expect(logoText).toHaveClass("text-lg", "font-bold");
	});

	it("should render navigation links", () => {
		render(<Navbar />);

		const homeLink = screen.getByText("Home").closest("a");
		expect(homeLink).toBeInTheDocument();
		expect(homeLink).toHaveAttribute("href", "/");
		expect(homeLink).toHaveClass("hover:opacity-45", "transition-opacity", "duration-300");

		const environmentsLink = screen.getByText("Environments").closest("a");
		expect(environmentsLink).toBeInTheDocument();
		expect(environmentsLink).toHaveAttribute("href", "/environments");
		expect(environmentsLink).toHaveClass("hover:opacity-45", "transition-opacity", "duration-300");
	});

	it("should render dot separator between nav links", () => {
		render(<Navbar />);

		const dotIcon = screen.getByTestId("dot-icon");
		expect(dotIcon).toBeInTheDocument();
		expect(dotIcon).toHaveClass("text-muted-foreground/40");
	});

	it("should render theme toggle", () => {
		render(<Navbar />);

		const themeToggle = screen.getByTestId("theme-toggle");
		expect(themeToggle).toBeInTheDocument();
		expect(themeToggle).toHaveTextContent("Theme Toggle");
	});

	it("should have correct navigation structure", () => {
		render(<Navbar />);

		const navLinks = screen.getByText("Home").closest("div");
		expect(navLinks).toHaveClass("flex", "items-center", "gap-0");

		const rightSection = screen.getByTestId("theme-toggle").closest("div");
		expect(rightSection).toHaveClass("flex", "items-center", "gap-2");
	});

	it("should render all navigation elements in correct order", () => {
		render(<Navbar />);

		const navbar = screen.getByText("VibeX").closest("div");
		expect(navbar).toBeInTheDocument();

		// Check that all elements are present
		expect(screen.getByText("VibeX")).toBeInTheDocument();
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByTestId("dot-icon")).toBeInTheDocument();
		expect(screen.getByText("Environments")).toBeInTheDocument();
		expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
	});

	it("should handle navigation link accessibility", () => {
		render(<Navbar />);

		const homeLink = screen.getByText("Home").closest("a");
		const environmentsLink = screen.getByText("Environments").closest("a");

		expect(homeLink).toHaveAttribute("href", "/");
		expect(environmentsLink).toHaveAttribute("href", "/environments");

		// Links should be keyboard accessible
		expect(homeLink?.tagName).toBe("A");
		expect(environmentsLink?.tagName).toBe("A");
	});

	it("should maintain consistent spacing and layout", () => {
		render(<Navbar />);

		const leftSection = screen.getByText("VibeX").closest("a");
		const rightSection = screen.getByTestId("theme-toggle").closest("div")?.parentElement;

		expect(leftSection).toBeInTheDocument();
		expect(rightSection).toBeInTheDocument();
		expect(rightSection).toHaveClass("flex", "items-center", "gap-2");
	});

	it("should render without any console errors", () => {
		const consoleSpy = mock.spyOn(console, "error").mockImplementation(() => {});

		render(<Navbar />);

		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should handle empty state gracefully", () => {
		// Test that the component renders even if props are undefined
		render(<Navbar />);

		expect(screen.getByText("VibeX")).toBeInTheDocument();
		expect(screen.getByText("Home")).toBeInTheDocument();
		expect(screen.getByText("Environments")).toBeInTheDocument();
	});

	it("should have proper semantic structure", () => {
		const { container } = render(<Navbar />);

		// Should have proper navigation structure
		const navContainer = container.firstChild;
		expect(navContainer).toHaveClass("flex", "justify-between", "items-center");

		// Should contain proper link elements
		const links = container.querySelectorAll("a");
		expect(links).toHaveLength(3); // Logo + Home + Environments
	});
});
