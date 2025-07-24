import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
