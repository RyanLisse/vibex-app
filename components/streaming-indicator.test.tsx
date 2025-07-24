import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { StreamingIndicator } from "./streaming-indicator";

// Mock the cn utility
vi.mock("@/lib/utils", () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("StreamingIndicator", () => {
	it("should render dots variant by default", () => {
		render(<StreamingIndicator data-testid="streaming-indicator" />);

		const container = screen.getByTestId("streaming-indicator");
		expect(container).toHaveClass("flex", "items-center", "gap-1");

		const dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);

		dots.forEach((dot, index) => {
			expect(dot).toHaveClass("bg-primary/60", "rounded-full", "animate-pulse", "w-1.5", "h-1.5");
			expect(dot).toHaveStyle({
				animationDelay: `${index * 0.2}s`,
				animationDuration: "1.4s",
			});
		});
	});

	it("should render cursor variant", () => {
		render(<StreamingIndicator variant="cursor" data-testid="streaming-cursor" />);

		const cursor = screen.getByTestId("streaming-cursor");
		expect(cursor).toHaveClass("inline-block", "w-0.5", "h-4", "bg-primary", "animate-pulse");
	});

	it("should render wave variant", () => {
		render(<StreamingIndicator variant="wave" data-testid="streaming-wave" />);

		const container = screen.getByTestId("streaming-wave");
		expect(container).toHaveClass("flex", "items-center", "gap-1");

		const dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);

		dots.forEach((dot, index) => {
			expect(dot).toHaveClass("bg-primary/70", "rounded-full", "animate-bounce", "w-1.5", "h-1.5");
			expect(dot).toHaveStyle({
				animationDelay: `${index * 0.15}s`,
				animationDuration: "1s",
			});
		});
	});

	it("should apply small size classes", () => {
		render(<StreamingIndicator size="sm" data-testid="streaming-small" />);

		const container = screen.getByTestId("streaming-small");
		expect(container).toHaveClass("gap-0.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-1", "h-1");
		});
	});

	it("should apply medium size classes", () => {
		render(<StreamingIndicator size="md" data-testid="streaming-medium" />);

		const container = screen.getByTestId("streaming-medium");
		expect(container).toHaveClass("gap-1");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-1.5", "h-1.5");
		});
	});

	it("should apply large size classes", () => {
		render(<StreamingIndicator size="lg" data-testid="streaming-large" />);

		const container = screen.getByTestId("streaming-large");
		expect(container).toHaveClass("gap-1.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-2", "h-2");
		});
	});

	it("should apply custom className", () => {
		render(<StreamingIndicator className="custom-class" data-testid="streaming-custom" />);

		const container = screen.getByTestId("streaming-custom");
		expect(container).toHaveClass("custom-class");
	});

	it("should apply custom className to cursor variant", () => {
		render(
			<StreamingIndicator
				className="custom-cursor"
				variant="cursor"
				data-testid="streaming-cursor-custom"
			/>
		);

		const cursor = screen.getByTestId("streaming-cursor-custom");
		expect(cursor).toHaveClass("custom-cursor");
	});

	it("should render small wave variant", () => {
		render(<StreamingIndicator size="sm" variant="wave" data-testid="streaming-wave-small" />);

		const container = screen.getByTestId("streaming-wave-small");
		expect(container).toHaveClass("flex", "items-center", "gap-0.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-1", "h-1");
		});
	});

	it("should render large wave variant", () => {
		render(<StreamingIndicator size="lg" variant="wave" data-testid="streaming-wave-large" />);

		const container = screen.getByTestId("streaming-wave-large");
		expect(container).toHaveClass("flex", "items-center", "gap-1.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-2", "h-2");
		});
	});

	it("should render small dots variant", () => {
		render(<StreamingIndicator size="sm" variant="dots" data-testid="streaming-dots-small" />);

		const container = screen.getByTestId("streaming-dots-small");
		expect(container).toHaveClass("flex", "items-center", "gap-0.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-1", "h-1");
		});
	});

	it("should render large dots variant", () => {
		render(<StreamingIndicator size="lg" variant="dots" data-testid="streaming-dots-large" />);

		const container = screen.getByTestId("streaming-dots-large");
		expect(container).toHaveClass("flex", "items-center", "gap-1.5");

		const dots = container.querySelectorAll("div");
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-2", "h-2");
		});
	});

	it("should handle all prop combinations", () => {
		render(
			<StreamingIndicator
				className="test-class"
				size="lg"
				variant="wave"
				data-testid="streaming-all-props"
			/>
		);

		const container = screen.getByTestId("streaming-all-props");
		expect(container).toHaveClass("flex", "items-center", "gap-1.5", "test-class");

		const dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);

		dots.forEach((dot, index) => {
			expect(dot).toHaveClass("bg-primary/70", "rounded-full", "animate-bounce", "w-2", "h-2");
			expect(dot).toHaveStyle({
				animationDelay: `${index * 0.15}s`,
				animationDuration: "1s",
			});
		});
	});

	it("should render correct number of dots for each variant", () => {
		const { rerender } = render(
			<StreamingIndicator variant="dots" data-testid="streaming-variant-test" />
		);

		let container = screen.getByTestId("streaming-variant-test");
		let dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);

		rerender(<StreamingIndicator variant="wave" data-testid="streaming-variant-test" />);
		container = screen.getByTestId("streaming-variant-test");
		dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);

		rerender(<StreamingIndicator variant="cursor" data-testid="streaming-variant-test" />);
		container = screen.getByTestId("streaming-variant-test");
		expect(container.tagName).toBe("SPAN");
	});

	it("should apply correct animation properties for dots", () => {
		render(<StreamingIndicator variant="dots" data-testid="streaming-dots-animation" />);

		const container = screen.getByTestId("streaming-dots-animation");
		const dots = container.querySelectorAll("div");

		expect(dots[0]).toHaveStyle({
			animationDelay: "0s",
			animationDuration: "1.4s",
		});
		expect(dots[1]).toHaveStyle({
			animationDelay: "0.2s",
			animationDuration: "1.4s",
		});
		expect(dots[2]).toHaveStyle({
			animationDelay: "0.4s",
			animationDuration: "1.4s",
		});
	});

	it("should apply correct animation properties for wave", () => {
		render(<StreamingIndicator variant="wave" data-testid="streaming-wave-animation" />);

		const container = screen.getByTestId("streaming-wave-animation");
		const dots = container.querySelectorAll("div");

		expect(dots[0]).toHaveStyle({
			animationDelay: "0s",
			animationDuration: "1s",
		});
		expect(dots[1]).toHaveStyle({
			animationDelay: "0.15s",
			animationDuration: "1s",
		});
		expect(dots[2]).toHaveStyle({
			animationDelay: "0.3s",
			animationDuration: "1s",
		});
	});

	it("should handle undefined props gracefully", () => {
		render(
			<StreamingIndicator size={undefined} variant={undefined} data-testid="streaming-undefined" />
		);

		const container = screen.getByTestId("streaming-undefined");
		expect(container).toHaveClass("flex", "items-center", "gap-1");

		const dots = container.querySelectorAll("div");
		expect(dots).toHaveLength(3);
		dots.forEach((dot) => {
			expect(dot).toHaveClass("w-1.5", "h-1.5");
		});
	});
});
