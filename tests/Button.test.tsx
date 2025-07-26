import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./Button";

describe.skip("Button", () => {
	it("should render without crashing", () => {
		render(<Button />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("should handle props correctly", () => {
		const props = { title: "Test Title" };
		render(<Button {...props} />);
		expect(screen.getByText("Test Title")).toBeInTheDocument();
	});
});
