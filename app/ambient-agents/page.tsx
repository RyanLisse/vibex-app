"use client";

import dynamic from "next/dynamic";
import React, { Suspense } from "react";

// Loading component with skeleton
const LoadingSkeleton = () => (
	<div className="flex h-full w-full items-center justify-center bg-gray-50">
		<div className="space-y-4 text-center">
			<div className="mx-auto h-12 w-12 animate-spin rounded-full border-gray-900 border-b-2" />
			<p className="text-gray-600">Loading visualization engine...</p>
		</div>
	</div>
);

// Dynamic import with loading state and SSR disabled for better performance
const VisualizationEngineWithProvider = dynamic(
	() =>
		import("../../components/ambient-agents/visualization-engine").then(
			(mod) => ({
				default: mod.VisualizationEngineWithProvider,
			}),
		),
	{
		loading: () => <LoadingSkeleton />,
		ssr: false, // Disable SSR for heavy visualization component
	},
);

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
				<Suspense fallback={<LoadingSkeleton />}>
					<VisualizationEngineWithProvider
						viewMode="agent-centric"
						layoutAlgorithm="force-directed"
						showPerformanceMetrics={true}
						enableCollaboration={false}
						className="h-full w-full"
					/>
				</Suspense>
			</div>
		</div>
	);
}
