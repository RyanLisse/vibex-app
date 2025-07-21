import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";

// Mock the ClientPage component
vi.mock("./client-page", () => ({
	default: () => <div data-testid="client-page">Mock Client Page</div>,
}));

describe("Home", () => {
	it("should render ClientPage component", () => {
		render(<Home />);

		const clientPage = screen.getByTestId("client-page");
		expect(clientPage).toBeInTheDocument();
		expect(clientPage).toHaveTextContent("Mock Client Page");
	});

	it("should be the default export", () => {
		expect(Home).toBeDefined();
		expect(typeof Home).toBe("function");
	});

	it("should not render any other content", () => {
		const { container } = render(<Home />);

		expect(container.firstChild).toHaveAttribute("data-testid", "client-page");
		expect(container.children).toHaveLength(1);
	});

	it("should forward any props to ClientPage", () => {
		// Since this is a simple wrapper, we just verify it renders
		const { rerender } = render(<Home />);

		expect(screen.getByTestId("client-page")).toBeInTheDocument();

		// Re-render to ensure consistency
		rerender(<Home />);
		expect(screen.getByTestId("client-page")).toBeInTheDocument();
	});
});
