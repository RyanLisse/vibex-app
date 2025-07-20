import {
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
	MarkerType,
} from "@xyflow/react";
import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";

export interface DataFlowEdgeData {
	dataFlow: {
		type: "bidirectional" | "unidirectional";
		volume: number;
		bandwidth: number;
		latency: number;
		isActive: boolean;
		protocol?: "http" | "websocket" | "grpc" | "tcp";
	};
	label?: string;
}

export const DataFlowEdge = memo<EdgeProps<DataFlowEdgeData>>(
	({
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		data,
		selected,
		markerEnd,
	}) => {
		const [edgePath, labelX, labelY] = getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
		});

		const getProtocolColor = () => {
			if (!data?.dataFlow.protocol) return "#6b7280";

			switch (data.dataFlow.protocol) {
				case "http":
					return "#3b82f6"; // blue
				case "websocket":
					return "#10b981"; // green
				case "grpc":
					return "#8b5cf6"; // purple
				case "tcp":
					return "#f59e0b"; // amber
				default:
					return "#6b7280"; // gray
			}
		};

		const getEdgeWidth = () => {
			if (!data?.dataFlow) return 2;

			// Scale width based on bandwidth
			const baseWidth = 2;
			const bandwidthScale = Math.min(data.dataFlow.bandwidth / 1000, 5);
			return baseWidth + bandwidthScale;
		};

		const getLatencyColor = () => {
			if (!data?.dataFlow) return "#10b981";

			const latency = data.dataFlow.latency;
			if (latency > 1000) return "#ef4444"; // red for high latency
			if (latency > 500) return "#f59e0b"; // amber for medium latency
			return "#10b981"; // green for low latency
		};

		const formatBytes = (bytes: number) => {
			if (bytes === 0) return "0 B";
			const k = 1024;
			const sizes = ["B", "KB", "MB", "GB"];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return Number.parseFloat((bytes / k ** i).toFixed(1)) + " " + sizes[i];
		};

		const isBidirectional = data?.dataFlow.type === "bidirectional";
		const isActive = data?.dataFlow.isActive;

		return (
			<>
				<defs>
					<linearGradient
						gradientUnits="userSpaceOnUse"
						id={`dataflow-gradient-${id}`}
					>
						<stop
							offset="0%"
							stopColor={getProtocolColor()}
							stopOpacity={0.8}
						/>
						<stop
							offset="50%"
							stopColor={getProtocolColor()}
							stopOpacity={0.5}
						/>
						<stop
							offset="100%"
							stopColor={getProtocolColor()}
							stopOpacity={0.8}
						/>
					</linearGradient>

					{/* Arrow marker for data flow direction */}
					<marker
						id={`dataflow-arrow-${id}`}
						markerHeight="10"
						markerUnits="strokeWidth"
						markerWidth="10"
						orient="auto"
						refX="8"
						refY="3"
					>
						<polygon fill={getProtocolColor()} points="0,0 0,6 9,3" />
					</marker>

					{/* Bidirectional arrow marker */}
					{isBidirectional && (
						<marker
							id={`dataflow-arrow-reverse-${id}`}
							markerHeight="10"
							markerUnits="strokeWidth"
							markerWidth="10"
							orient="auto"
							refX="2"
							refY="3"
						>
							<polygon fill={getProtocolColor()} points="9,0 9,6 0,3" />
						</marker>
					)}
				</defs>

				{/* Main edge path */}
				<path
					className={`react-flow__edge-path ${selected ? "selected" : ""}`}
					d={edgePath}
					fill="none"
					id={id}
					markerEnd={`url(#dataflow-arrow-${id})`}
					markerStart={
						isBidirectional ? `url(#dataflow-arrow-reverse-${id})` : undefined
					}
					stroke={
						isActive ? `url(#dataflow-gradient-${id})` : getProtocolColor()
					}
					strokeWidth={getEdgeWidth()}
					style={{
						animation: isActive
							? "dataflow-pulse 2s ease-in-out infinite"
							: "none",
						filter: isActive
							? "drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))"
							: "none",
					}}
				/>

				{/* Data flow visualization particles */}
				{isActive && data?.dataFlow.volume > 0 && (
					<>
						{/* Forward flow */}
						<circle fill={getProtocolColor()} opacity="0.8" r="2">
							<animateMotion
								dur="3s"
								path={edgePath}
								repeatCount="indefinite"
							/>
						</circle>

						{/* Reverse flow for bidirectional */}
						{isBidirectional && (
							<circle fill={getProtocolColor()} opacity="0.6" r="2">
								<animateMotion
									begin="1.5s"
									dur="3s"
									keyPoints="1;0"
									keyTimes="0;1"
									path={edgePath}
									repeatCount="indefinite"
								/>
							</circle>
						)}
					</>
				)}

				{/* Edge label with data flow metrics */}
				{data?.dataFlow && (
					<EdgeLabelRenderer>
						<div
							className="nodrag nopan"
							style={{
								position: "absolute",
								transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
								pointerEvents: "all",
							}}
						>
							<div className="space-y-1 rounded-md border bg-white p-2 text-xs shadow-lg">
								<div className="flex items-center space-x-2">
									<Badge className={"text-xs"} variant="outline">
										{data.dataFlow.protocol?.toUpperCase() || "DATA"}
									</Badge>
									{isBidirectional && (
										<Badge className="text-xs" variant="outline">
											⟷
										</Badge>
									)}
								</div>

								<div className="space-y-1">
									<div className="flex justify-between">
										<span className="text-gray-600">Volume:</span>
										<span className="font-medium">
											{formatBytes(data.dataFlow.volume)}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-gray-600">Bandwidth:</span>
										<span className="font-medium">
											{formatBytes(data.dataFlow.bandwidth)}/s
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-gray-600">Latency:</span>
										<span
											className="font-medium"
											style={{ color: getLatencyColor() }}
										>
											{data.dataFlow.latency}ms
										</span>
									</div>
								</div>
							</div>
						</div>
					</EdgeLabelRenderer>
				)}

				{/* Custom label */}
				{data?.label && (
					<EdgeLabelRenderer>
						<div
							className="nodrag nopan"
							style={{
								position: "absolute",
								transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 30}px)`,
								pointerEvents: "all",
							}}
						>
							<Badge className="text-xs" variant="outline">
								{data.label}
							</Badge>
						</div>
					</EdgeLabelRenderer>
				)}

				<style jsx>{`
        @keyframes dataflow-pulse {
          0%, 100% {
            opacity: 1;
            stroke-width: ${getEdgeWidth()};
          }
          50% {
            opacity: 0.7;
            stroke-width: ${getEdgeWidth() + 1};
          }
        }
      `}</style>
			</>
		);
	},
);

DataFlowEdge.displayName = "DataFlowEdge";
