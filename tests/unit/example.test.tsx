import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button Component", () => {
	it("renders button with text", () => {
		const { container } = render(<Button>Click me</Button>);

		// Use querySelector since the button is rendering correctly
		const button = container.querySelector("button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Click me");
	});

	it("applies variant styles correctly", () => {
		const { container } = render(<Button variant="destructive">Delete</Button>);
		const button = container.querySelector("button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Delete");
		expect(button).toHaveClass("bg-destructive");
	});

	it("handles click events", async () => {
		const user = userEvent.setup();
		const handleClick = vi.fn();
		const { container } = render(<Button onClick={handleClick}>Click me</Button>);

		const button = container.querySelector("button");
		expect(button).toBeInTheDocument();
		await user.click(button);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});
});
