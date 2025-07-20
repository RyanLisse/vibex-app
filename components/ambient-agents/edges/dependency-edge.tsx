import {
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
} from "@xyflow/react";
import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";

export interface DependencyEdgeData {
	dependency: {
		type: "task" | "data" | "resource" | "temporal";
		status: "active" | "completed" | "failed" | "blocked";
		strength: "weak" | "medium" | "strong" | "critical";
		condition?: string;
		isOptional?: boolean;
	};
	label?: string;
}

export const DependencyEdge = memo<EdgeProps<DependencyEdgeData>>(
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
	}) => {
		const [edgePath, labelX, labelY] = getBezierPath({
			sourceX,
			sourceY,
			sourcePosition,
			targetX,
			targetY,
			targetPosition,
		});

		const getStatusColor = () => {
			if (!data?.dependency) return "#6b7280";

			switch (data.dependency.status) {
				case "active":
					return "#3b82f6"; // blue
				case "completed":
					return "#10b981"; // green
				case "failed":
					return "#ef4444"; // red
				case "blocked":
					return "#f59e0b"; // amber
				default:
					return "#6b7280"; // gray
			}
		};

		const getStrengthWidth = () => {
			if (!data?.dependency) return 2;

			switch (data.dependency.strength) {
				case "weak":
					return 1;
				case "medium":
					return 2;
				case "strong":
					return 3;
				case "critical":
					return 4;
				default:
					return 2;
			}
		};

		const getEdgePattern = () => {
			if (!data?.dependency) return "none";

			if (data.dependency.isOptional) {
				return "5,5"; // dashed for optional dependencies
			}

			switch (data.dependency.type) {
				case "task":
					return "none"; // solid
				case "data":
					return "3,3"; // small dashes
				case "resource":
					return "8,4"; // long dashes
				case "temporal":
					return "2,2,6,2"; // dot-dash pattern
				default:
					return "none";
			}
		};

		const getTypeIcon = () => {
			if (!data?.dependency) return "→";

			switch (data.dependency.type) {
				case "task":
					return "⟶";
				case "data":
					return "⟹";
				case "resource":
					return "⟼";
				case "temporal":
					return "⟿";
				default:
					return "→";
			}
		};

		const isBlocked = data?.dependency.status === "blocked";
		const isFailed = data?.dependency.status === "failed";

		return (
			<>
				<defs>
					{/* Arrow marker for dependency direction */}
					<marker
						id={`dependency-arrow-${id}`}
						markerHeight="12"
						markerUnits="strokeWidth"
						markerWidth="12"
						orient="auto"
						refX="10"
						refY="6"
					>
						<polygon
							fill={getStatusColor()}
							opacity={isBlocked || isFailed ? 0.6 : 1}
							points="0,0 0,12 12,6"
						/>
					</marker>

					{/* Blocked dependency pattern */}
					{isBlocked && (
						<pattern
							height="8"
							id={`blocked-pattern-${id}`}
							patternUnits="userSpaceOnUse"
							width="8"
						>
							<rect
								fill={getStatusColor()}
								height="8"
								opacity="0.3"
								width="8"
							/>
							<line
								stroke="#f59e0b"
								strokeWidth="2"
								x1="0"
								x2="8"
								y1="0"
								y2="8"
							/>
							<line
								stroke="#f59e0b"
								strokeWidth="2"
								x1="8"
								x2="0"
								y1="0"
								y2="8"
							/>
						</pattern>
					)}
				</defs>

				{/* Main dependency path */}
				<path
					className={`react-flow__edge-path ${selected ? "selected" : ""}`}
					d={edgePath}
					fill="none"
					id={id}
					markerEnd={`url(#dependency-arrow-${id})`}
					opacity={isFailed ? 0.5 : 1}
					stroke={isBlocked ? `url(#blocked-pattern-${id})` : getStatusColor()}
					strokeDasharray={getEdgePattern()}
					strokeWidth={getStrengthWidth()}
					style={{
						animation: isBlocked
							? "dependency-blink 1s ease-in-out infinite"
							: "none",
						filter:
							data?.dependency.strength === "critical"
								? "drop-shadow(0 0 4px rgba(239, 68, 68, 0.5))"
								: "none",
					}}
				/>

				{/* Dependency strength indicator */}
				{data?.dependency.strength === "critical" && (
					<circle
						className="animate-ping"
						cx={labelX}
						cy={labelY}
						fill="none"
						r="6"
						stroke="#ef4444"
						strokeWidth="2"
					/>
				)}

				{/* Edge label with dependency details */}
				{data?.dependency && (
					<EdgeLabelRenderer>
						<div
							className="nodrag nopan"
							style={{
								position: "absolute",
								transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
								pointerEvents: "all",
							}}
						>
							<div className="space-y-1 rounded-md border bg-white p-2 text-xs shadow-md">
								<div className="flex items-center space-x-2">
									<span className="text-lg">{getTypeIcon()}</span>
									<Badge
										className="text-xs"
										style={{
											backgroundColor: getStatusColor(),
											color: "white",
										}}
										variant={
											data.dependency.status === "completed"
												? "default"
												: "secondary"
										}
									>
										{data.dependency.type}
									</Badge>
								</div>

								<div className="space-y-1">
									<div className="flex justify-between">
										<span className="text-gray-600">Status:</span>
										<span className="font-medium capitalize">
											{data.dependency.status}
										</span>
									</div>

									<div className="flex justify-between">
										<span className="text-gray-600">Strength:</span>
										<span className="font-medium capitalize">
											{data.dependency.strength}
										</span>
									</div>

									{data.dependency.isOptional && (
										<div className="flex justify-between">
											<span className="text-gray-600">Optional:</span>
											<span className="font-medium text-yellow-600">Yes</span>
										</div>
									)}

									{data.dependency.condition && (
										<div className="space-y-1">
											<span className="text-gray-600">Condition:</span>
											<div className="rounded bg-gray-50 p-1 text-gray-800 text-xs">
												{data.dependency.condition}
											</div>
										</div>
									)}
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
								transform: `translate(-50%, -50%) translate(${labelX}px,${labelY - 40}px)`,
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
        @keyframes dependency-blink {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
			</>
		);
	},
);

DependencyEdge.displayName = "DependencyEdge";
