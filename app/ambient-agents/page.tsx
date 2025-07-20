"use client";

import React from "react";
import { VisualizationEngineWithProvider } from "../../components/ambient-agents/visualization-engine";

export default function AmbientAgentsPage() {
	return (
		<div className="h-screen w-full bg-gray-50">
			{/* Header */}
			<div className="flex h-16 items-center border-gray-200 border-b bg-white px-6">
				<div className="flex items-center space-x-4">
					<h1 className="font-bold text-2xl text-gray-900">
						Ambient Agent Visualization
					</h1>
					<div className="text-gray-600 text-sm">
						Real-time monitoring and management of AI agent workflows
					</div>
				</div>
			</div>

			{/* Main visualization area */}
			<div className="h-[calc(100vh-4rem)]">
				<VisualizationEngineWithProvider
					className="h-full w-full"
					enableCollaboration={false}
					layoutAlgorithm="force-directed"
					showPerformanceMetrics={true}
					viewMode="agent-centric"
				/>
			</div>
		</div>
	);
}
