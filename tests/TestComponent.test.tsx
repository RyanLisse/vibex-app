import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { TestComponent } from "./TestComponent";

describe.skip("TestComponent", () => {
	it("should render without crashing", () => {
		render(<TestComponent />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("should handle props correctly", () => {
		const props = { title: "Test Title" };
		render(<TestComponent {...props} />);
		expect(screen.getByText("Test Title")).toBeInTheDocument();
	});
});
