/**
 * Execution Comparison Component
 *
 * Provides side-by-side comparison of two executions for debugging failed runs.
 */

"use client";

import { format } from "date-fns";
import {
	AlertTriangle,
	ArrowRight,
	CheckCircle,
	ChevronDown,
	ChevronRight,
	Clock,
	GitCompare,
} from "lucide-react";
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExecutionComparison, ExecutionDifference } from "@/lib/time-travel/debug-service";
import { cn } from "@/lib/utils";

interface ExecutionComparisonProps {
	comparison: ExecutionComparison;
	onViewExecution?: (executionId: string) => void;
	className?: string;
}

const statusColors = {
	completed: "bg-green-100 text-green-800",
	failed: "bg-red-100 text-red-800",
	running: "bg-blue-100 text-blue-800",
	pending: "bg-gray-100 text-gray-800",
};

const differenceTypeColors = {
	missing: "bg-red-50 border-red-200",
	different: "bg-yellow-50 border-yellow-200",
	extra: "bg-blue-50 border-blue-200",
};

const differenceTypeIcons = {
	missing: AlertTriangle,
	different: GitCompare,
	extra: CheckCircle,
};

export function ExecutionComparison({
	comparison,
	onViewExecution,
	className,
}: ExecutionComparisonProps) {
	const [expandedDifferences, setExpandedDifferences] = useState<Set<number>>(new Set());
	const [showAllDifferences, setShowAllDifferences] = useState(false);

	const toggleDifference = (index: number) => {
		const newExpanded = new Set(expandedDifferences);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedDifferences(newExpanded);
	};

	const visibleDifferences = showAllDifferences
		? comparison.differences
		: comparison.differences.slice(0, 10);

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold flex items-center">
					<GitCompare className="w-5 h-5 mr-2" />
					Execution Comparison
				</h3>
				<div className="text-sm text-gray-500">
					{comparison.differences.length} differences found
				</div>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Execution A */}
				<div className="p-4 border rounded-lg">
					<div className="flex items-center justify-between mb-3">
						<h4 className="font-medium">Execution A</h4>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onViewExecution?.(comparison.executionA.id)}
						>
							View Details
						</Button>
					</div>

					<div className="space-y-2 text-sm">
						<div className="flex items-center justify-between">
							<span>Status:</span>
							<Badge
								className={statusColors[comparison.executionA.status as keyof typeof statusColors]}
							>
								{comparison.executionA.status}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span>Agent Type:</span>
							<span className="font-mono">{comparison.executionA.agentType}</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Duration:</span>
							<span>{comparison.summary.executionTime.a}ms</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Steps:</span>
							<span>{comparison.summary.totalSteps.a}</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Started:</span>
							<span>{format(comparison.executionA.startedAt, "MMM d, HH:mm:ss")}</span>
						</div>
					</div>
				</div>

				{/* Execution B */}
				<div className="p-4 border rounded-lg">
					<div className="flex items-center justify-between mb-3">
						<h4 className="font-medium">Execution B</h4>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onViewExecution?.(comparison.executionB.id)}
						>
							View Details
						</Button>
					</div>

					<div className="space-y-2 text-sm">
						<div className="flex items-center justify-between">
							<span>Status:</span>
							<Badge
								className={statusColors[comparison.executionB.status as keyof typeof statusColors]}
							>
								{comparison.executionB.status}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span>Agent Type:</span>
							<span className="font-mono">{comparison.executionB.agentType}</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Duration:</span>
							<span>{comparison.summary.executionTime.b}ms</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Steps:</span>
							<span>{comparison.summary.totalSteps.b}</span>
						</div>
						<div className="flex items-center justify-between">
							<span>Started:</span>
							<span>{format(comparison.executionB.startedAt, "MMM d, HH:mm:ss")}</span>
						</div>
					</div>
				</div>
			</div>

			{/* Comparison Summary */}
			<div className="p-4 bg-gray-50 rounded-lg">
				<h4 className="font-medium mb-3">Comparison Summary</h4>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
					<div>
						<span className="font-medium">Common Steps:</span>
						<span className="ml-2">{comparison.summary.commonSteps}</span>
					</div>
					<div>
						<span className="font-medium">Differences:</span>
						<span className="ml-2">{comparison.summary.differences}</span>
					</div>
					<div>
						<span className="font-medium">Divergence Point:</span>
						<span className="ml-2">
							{comparison.summary.divergencePoint !== undefined
								? `Step ${comparison.summary.divergencePoint}`
								: "None"}
						</span>
					</div>
					<div>
						<span className="font-medium">Time Difference:</span>
						<span className="ml-2">
							{Math.abs(comparison.summary.executionTime.a - comparison.summary.executionTime.b)}ms
						</span>
					</div>
				</div>
			</div>

			{/* Differences */}
			{comparison.differences.length > 0 && (
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<h4 className="font-medium">Differences</h4>
						{comparison.differences.length > 10 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => setShowAllDifferences(!showAllDifferences)}
							>
								{showAllDifferences ? "Show Less" : `Show All (${comparison.differences.length})`}
							</Button>
						)}
					</div>

					<div className="space-y-2">
						{visibleDifferences.map((difference, index) => {
							const isExpanded = expandedDifferences.has(index);
							const DifferenceIcon = differenceTypeIcons[difference.type];

							return (
								<div
									key={index}
									className={cn("border rounded-lg p-4", differenceTypeColors[difference.type])}
								>
									<div
										className="flex items-center justify-between cursor-pointer"
										onClick={() => toggleDifference(index)}
									>
										<div className="flex items-center space-x-3">
											<DifferenceIcon className="w-4 h-4" />
											<div>
												<span className="font-medium">
													Step {difference.stepNumber}: {difference.field}
												</span>
												<p className="text-sm text-gray-600">{difference.description}</p>
											</div>
										</div>
										<div className="flex items-center space-x-2">
											<Badge variant="outline" className="text-xs">
												{difference.type}
											</Badge>
											{isExpanded ? (
												<ChevronDown className="w-4 h-4" />
											) : (
												<ChevronRight className="w-4 h-4" />
											)}
										</div>
									</div>

									{isExpanded && (
										<div className="mt-4 pt-4 border-t border-gray-200">
											<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
												{difference.valueA !== undefined && (
													<div>
														<h5 className="font-medium text-sm mb-2">Execution A:</h5>
														<pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
															{JSON.stringify(difference.valueA, null, 2)}
														</pre>
													</div>
												)}
												{difference.valueB !== undefined && (
													<div>
														<h5 className="font-medium text-sm mb-2">Execution B:</h5>
														<pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
															{JSON.stringify(difference.valueB, null, 2)}
														</pre>
													</div>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* No differences */}
			{comparison.differences.length === 0 && (
				<div className="text-center p-8 text-gray-500">
					<CheckCircle className="mx-auto h-12 w-12 mb-4 text-green-500" />
					<p className="text-lg font-medium">No differences found</p>
					<p className="text-sm">Both executions followed the same path</p>
				</div>
			)}
		</div>
	);
}
