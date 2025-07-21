import {
	Background,
	Controls,
	type EdgeTypes,
	MiniMap,
	type NodeTypes,
	Panel,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import type React from "react";

interface VisualizationEngineProps {
	viewMode?: string;
	layoutAlgorithm?: string;
	showPerformanceMetrics?: boolean;
	enableCollaboration?: boolean;
	className?: string;
}

export function VisualizationEngine({
	viewMode = "graph",
	layoutAlgorithm = "hierarchical",
	showPerformanceMetrics = false,
	enableCollaboration = false,
	className = "",
}: VisualizationEngineProps) {
	return (
		<div className={`w-full h-full ${className}`}>
			<ReactFlow nodes={[]} edges={[]} className="bg-gray-50" fitView>
				<Controls />
				<MiniMap />
				<Background variant="dots" gap={12} size={1} />
				<Panel position="top-left">
					<div className="bg-white p-2 rounded shadow">
						<p className="text-sm font-medium">View Mode: {viewMode}</p>
						<p className="text-sm text-gray-600">
							Algorithm: {layoutAlgorithm}
						</p>
						{showPerformanceMetrics && (
							<p className="text-xs text-green-600">Performance: Active</p>
						)}
						{enableCollaboration && (
							<p className="text-xs text-blue-600">Collaboration: Enabled</p>
						)}
					</div>
				</Panel>
			</ReactFlow>
		</div>
	);
}

export function VisualizationEngineWithProvider(
	props: VisualizationEngineProps,
) {
	return (
		<ReactFlowProvider>
			<VisualizationEngine {...props} />
		</ReactFlowProvider>
	);
}

export default VisualizationEngine;
