import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { Progress } from "./progress";

describe("Progress", () => {
	it("renders progress bar with default value", () => {
		render(<Progress />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toBeInTheDocument();
		expect(progressBar).toHaveAttribute("aria-valuenow", "0");
		expect(progressBar).toHaveAttribute("aria-valuemin", "0");
		expect(progressBar).toHaveAttribute("aria-valuemax", "100");
	});

	it("renders progress bar with custom value", () => {
		render(<Progress value={50} />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "50");
	});

	it("renders progress bar with custom max value", () => {
		render(<Progress value={25} max={50} />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "25");
		expect(progressBar).toHaveAttribute("aria-valuemax", "50");
	});

	it("handles 100% completion correctly", () => {
		render(<Progress value={100} />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveAttribute("aria-valuenow", "100");
	});

	it("applies custom className", () => {
		render(<Progress className="custom-progress" />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toHaveClass("custom-progress");
	});

	it("handles edge case values correctly", () => {
		render(<Progress value={-10} />);

		const progressBar = screen.getByRole("progressbar");
		// Should handle negative values gracefully
		expect(progressBar).toBeInTheDocument();
	});

	it("handles undefined value correctly", () => {
		render(<Progress value={undefined} />);

		const progressBar = screen.getByRole("progressbar");
		expect(progressBar).toBeInTheDocument();
	});
});
