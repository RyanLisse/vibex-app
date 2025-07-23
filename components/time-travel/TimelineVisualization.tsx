/**
 * Timeline Visualization Component
 *
 * Provides a visual timeline of execution steps and events for time-travel debugging.
 */

"use client";

import { format } from "date-fns";
import {
	AlertCircle,
	ArrowRight,
	Bookmark,
	CheckCircle,
	Clock,
	Info,
	Pause,
	Play,
} from "lucide-react";
import React, { useMemo } from "react";
import type { TimelineEntry } from "@/lib/time-travel/debug-service";
import { cn } from "@/lib/utils";

interface TimelineVisualizationProps {
	timeline: TimelineEntry[];
	currentStep?: number;
	onStepClick?: (stepNumber: number) => void;
	className?: string;
}

const severityIcons = {
	info: Info,
	warn: AlertCircle,
	error: AlertCircle,
	debug: Info,
};

const severityColors = {
	info: "text-blue-500",
	warn: "text-yellow-500",
	error: "text-red-500",
	debug: "text-gray-500",
};

const typeColors = {
	snapshot: "bg-blue-100 border-blue-300",
	event: "bg-gray-100 border-gray-300",
};

export function TimelineVisualization({
	timeline,
	currentStep = 0,
	onStepClick,
	className,
}: TimelineVisualizationProps) {
	const sortedTimeline = useMemo(() => {
		return [...timeline].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	}, [timeline]);

	const handleStepClick = (stepNumber: number) => {
		onStepClick?.(stepNumber);
	};

	if (timeline.length === 0) {
		return (
			<div className={cn("flex items-center justify-center p-8 text-gray-500", className)}>
				<div className="text-center">
					<Clock className="mx-auto h-12 w-12 mb-4 opacity-50" />
					<p>No timeline data available</p>
				</div>
			</div>
		);
	}

	return (
		<div className={cn("space-y-4", className)}>
			<div className="flex items-center justify-between mb-6">
				<h3 className="text-lg font-semibold">Execution Timeline</h3>
				<div className="text-sm text-gray-500">{timeline.length} entries</div>
			</div>

			<div className="relative">
				{/* Timeline line */}
				<div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

				{/* Timeline entries */}
				<div className="space-y-4">
					{sortedTimeline.map((entry, index) => {
						const isActive = entry.stepNumber === currentStep;
						const isPast = entry.stepNumber < currentStep;
						const isFuture = entry.stepNumber > currentStep;
						const SeverityIcon = entry.severity ? severityIcons[entry.severity] : Info;

						return (
							<div
								key={entry.id}
								className={cn(
									"relative flex items-start space-x-4 p-4 rounded-lg border transition-all duration-200",
									typeColors[entry.type],
									isActive && "ring-2 ring-blue-500 bg-blue-50",
									isPast && "opacity-75",
									isFuture && "opacity-50",
									onStepClick && "cursor-pointer hover:shadow-md"
								)}
								onClick={() => handleStepClick(entry.stepNumber)}
							>
								{/* Timeline dot */}
								<div
									className={cn(
										"absolute -left-2 w-4 h-4 rounded-full border-2 bg-white",
										isActive && "border-blue-500 bg-blue-500",
										isPast && "border-green-500 bg-green-500",
										isFuture && "border-gray-300",
										entry.checkpoint && "border-yellow-500 bg-yellow-500"
									)}
								>
									{entry.checkpoint && (
										<Bookmark className="w-2 h-2 text-white absolute top-0.5 left-0.5" />
									)}
								</div>

								{/* Entry content */}
								<div className="flex-1 min-w-0">
									<div className="flex items-center justify-between mb-2">
										<div className="flex items-center space-x-2">
											<SeverityIcon
												className={cn(
													"w-4 h-4",
													entry.severity ? severityColors[entry.severity] : "text-gray-500"
												)}
											/>
											<h4 className="font-medium text-gray-900">{entry.title}</h4>
											{entry.checkpoint && (
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
													Checkpoint
												</span>
											)}
										</div>
										<div className="flex items-center space-x-2 text-sm text-gray-500">
											<span>Step {entry.stepNumber}</span>
											<span>•</span>
											<span>{format(entry.timestamp, "HH:mm:ss.SSS")}</span>
										</div>
									</div>

									{entry.description && (
										<p className="text-sm text-gray-600 mb-2">{entry.description}</p>
									)}

									{/* Data preview */}
									{Object.keys(entry.data).length > 0 && (
										<details className="text-xs">
											<summary className="cursor-pointer text-gray-500 hover:text-gray-700">
												View data ({Object.keys(entry.data).length} fields)
											</summary>
											<pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
												{JSON.stringify(entry.data, null, 2)}
											</pre>
										</details>
									)}
								</div>

								{/* Navigation arrow */}
								{isActive && (
									<div className="flex items-center">
										<ArrowRight className="w-4 h-4 text-blue-500" />
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>

			{/* Timeline summary */}
			<div className="mt-6 p-4 bg-gray-50 rounded-lg">
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
					<div>
						<span className="font-medium">Total Steps:</span>
						<span className="ml-2">{timeline.length}</span>
					</div>
					<div>
						<span className="font-medium">Checkpoints:</span>
						<span className="ml-2">{timeline.filter((e) => e.checkpoint).length}</span>
					</div>
					<div>
						<span className="font-medium">Events:</span>
						<span className="ml-2">{timeline.filter((e) => e.type === "event").length}</span>
					</div>
					<div>
						<span className="font-medium">Snapshots:</span>
						<span className="ml-2">{timeline.filter((e) => e.type === "snapshot").length}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
