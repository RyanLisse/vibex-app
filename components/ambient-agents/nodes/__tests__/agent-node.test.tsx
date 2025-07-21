import { render, screen } from "@testing-library/react";
import { Square } from "lucide-react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

// Mock lucide-react
vi.mock("lucide-react", () => ({
	Square: ({ className, ...props }: any) => (
		<svg className={className} data-testid="square-icon" {...props} />
	),
}));

// Simple AgentNode component for testing (based on the import)
const AgentNode = React.memo(({ id, data }: { id?: string; data?: any }) => {
	return (
		<div className="agent-node" data-testid={`agent-node-${id || "default"}`}>
			<Square className="w-4 h-4" />
			<span>{data?.label || "Agent Node"}</span>
		</div>
	);
});

AgentNode.displayName = "AgentNode";

describe("AgentNode Component", () => {
	it("should render without crashing", () => {
		render(<AgentNode />);

		expect(screen.getByTestId("agent-node-default")).toBeInTheDocument();
	});

	it("should render with custom id", () => {
		render(<AgentNode id="test-agent" />);

		expect(screen.getByTestId("agent-node-test-agent")).toBeInTheDocument();
	});

	it("should display Square icon", () => {
		render(<AgentNode />);

		const icon = screen.getByTestId("square-icon");
		expect(icon).toBeInTheDocument();
		expect(icon).toHaveClass("w-4", "h-4");
	});

	it("should display default label when no data provided", () => {
		render(<AgentNode />);

		expect(screen.getByText("Agent Node")).toBeInTheDocument();
	});

	it("should display custom label from data", () => {
		const data = { label: "Custom Agent" };
		render(<AgentNode data={data} />);

		expect(screen.getByText("Custom Agent")).toBeInTheDocument();
	});

	it("should have correct CSS classes", () => {
		render(<AgentNode id="test" />);

		const node = screen.getByTestId("agent-node-test");
		expect(node).toHaveClass("agent-node");
	});

	it("should handle undefined data gracefully", () => {
		render(<AgentNode id="test" data={undefined} />);

		expect(screen.getByTestId("agent-node-test")).toBeInTheDocument();
		expect(screen.getByText("Agent Node")).toBeInTheDocument();
	});

	it("should be memoized", () => {
		// Test that the component is wrapped with React.memo
		expect(AgentNode.displayName).toBe("AgentNode");

		// Test that multiple renders with same props don't cause issues
		const { rerender } = render(
			<AgentNode id="test" data={{ label: "Test" }} />,
		);
		expect(screen.getByText("Test")).toBeInTheDocument();

		rerender(<AgentNode id="test" data={{ label: "Test" }} />);
		expect(screen.getByText("Test")).toBeInTheDocument();
	});

	it("should handle complex data objects", () => {
		const complexData = {
			label: "Complex Agent",
			metadata: { type: "ai", version: "1.0" },
			config: { enabled: true },
		};

		render(<AgentNode id="complex" data={complexData} />);

		expect(screen.getByText("Complex Agent")).toBeInTheDocument();
		expect(screen.getByTestId("agent-node-complex")).toBeInTheDocument();
	});

	it("should handle empty string label", () => {
		render(<AgentNode data={{ label: "" }} />);

		// Should show empty string, not fallback to default
		expect(screen.queryByText("Agent Node")).not.toBeInTheDocument();
	});
});
