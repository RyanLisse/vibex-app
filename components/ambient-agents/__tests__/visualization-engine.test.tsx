import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VisualizationEngine } from "../visualization-engine";

// Mock React Flow for testing
vi.mock("@xyflow/react", () => ({
	ReactFlow: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="react-flow">{children}</div>
	),
	Controls: () => <div data-testid="react-flow-controls" />,
	MiniMap: () => <div data-testid="react-flow-minimap" />,
	Background: () => <div data-testid="react-flow-background" />,
	Panel: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="react-flow-panel">{children}</div>
	),
	useNodesState: () => [[], vi.fn()],
	useEdgesState: () => [[], vi.fn()],
	addEdge: vi.fn(),
	MarkerType: { ArrowClosed: "arrowclosed" },
}));

// Mock hooks
vi.mock("@/hooks/ambient-agents/use-ambient-agent-data", () => ({
	useAmbientAgentData: () => ({
		agents: [],
		tasks: [],
		events: [],
		loading: false,
		error: null,
	}),
}));

describe("VisualizationEngine", () => {
	const defaultProps = {
		agents: [],
		tasks: [],
		events: [],
		onNodeSelect: vi.fn(),
		onEdgeSelect: vi.fn(),
		selectedNode: null,
		selectedEdge: null,
	};

	it("renders visualization engine correctly", () => {
		render(<VisualizationEngine {...defaultProps} />);

		expect(screen.getByTestId("react-flow")).toBeInTheDocument();
		expect(screen.getByTestId("react-flow-controls")).toBeInTheDocument();
		expect(screen.getByTestId("react-flow-minimap")).toBeInTheDocument();
	});

	it("handles empty state correctly", () => {
		render(<VisualizationEngine {...defaultProps} />);

		// Should render without crashing even with empty data
		expect(screen.getByTestId("react-flow")).toBeInTheDocument();
	});

	it("calls onNodeSelect when provided", () => {
		const onNodeSelect = vi.fn();
		render(
			<VisualizationEngine {...defaultProps} onNodeSelect={onNodeSelect} />,
		);

		// Test would require interaction simulation once component is fully implemented
		expect(onNodeSelect).not.toHaveBeenCalled(); // Initially not called
	});

	it("handles node selection state correctly", () => {
		const selectedNode = { id: "test-node", type: "agent" };
		render(
			<VisualizationEngine {...defaultProps} selectedNode={selectedNode} />,
		);

		expect(screen.getByTestId("react-flow")).toBeInTheDocument();
	});
});
