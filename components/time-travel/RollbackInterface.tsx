/**
 * Rollback Interface Component
 *
 * Provides interface for rolling back executions to previous consistent states.
 */

"use client";

import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Bookmark, CheckCircle, Clock, RotateCcw } from "lucide-react";
import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { RollbackPoint } from "@/lib/time-travel/debug-service";
import { cn } from "@/lib/utils";

interface RollbackInterfaceProps {
	rollbackPoints: RollbackPoint[];
	onRollback?: (checkpointId: string, reason: string) => void;
	isRollingBack?: boolean;
	className?: string;
}

export function RollbackInterface({
	rollbackPoints,
	onRollback,
	isRollingBack = false,
	className,
}: RollbackInterfaceProps) {
	const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(null);
	const [rollbackReason, setRollbackReason] = useState("");
	const [showConfirmation, setShowConfirmation] = useState(false);

	const handleSelectCheckpoint = (checkpointId: string) => {
		setSelectedCheckpoint(checkpointId);
		setShowConfirmation(false);
	};

	const handleConfirmRollback = () => {
		if (selectedCheckpoint && rollbackReason.trim()) {
			onRollback?.(selectedCheckpoint, rollbackReason.trim());
			setShowConfirmation(false);
			setSelectedCheckpoint(null);
			setRollbackReason("");
		}
	};

	const handleCancelRollback = () => {
		setShowConfirmation(false);
		setRollbackReason("");
	};

	const selectedPoint = rollbackPoints.find((p) => p.id === selectedCheckpoint);

	if (rollbackPoints.length === 0) {
		return (
			<div className={cn("text-center p-8 text-gray-500", className)}>
				<RotateCcw className="mx-auto h-12 w-12 mb-4 opacity-50" />
				<p className="text-lg font-medium">No rollback points available</p>
				<p className="text-sm">Create checkpoints during execution to enable rollback</p>
			</div>
		);
	}

	return (
		<div className={cn("space-y-6", className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<h3 className="text-lg font-semibold flex items-center">
					<RotateCcw className="w-5 h-5 mr-2" />
					Rollback Points
				</h3>
				<div className="text-sm text-gray-500">
					{rollbackPoints.length} checkpoint{rollbackPoints.length !== 1 ? "s" : ""} available
				</div>
			</div>

			{/* Warning */}
			<Alert>
				<AlertTriangle className="h-4 w-4" />
				<AlertDescription>
					Rolling back will restore the execution state to the selected checkpoint. This action
					cannot be undone.
				</AlertDescription>
			</Alert>

			{/* Rollback points list */}
			<div className="space-y-3">
				{rollbackPoints.map((point) => (
					<div
						key={point.id}
						className={cn(
							"p-4 border rounded-lg cursor-pointer transition-all duration-200",
							selectedCheckpoint === point.id
								? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
								: "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
							!point.canRollback && "opacity-50 cursor-not-allowed"
						)}
						onClick={() => point.canRollback && handleSelectCheckpoint(point.id)}
					>
						<div className="flex items-start justify-between">
							<div className="flex items-start space-x-3">
								<div className="flex-shrink-0 mt-1">
									<Bookmark className="w-4 h-4 text-yellow-500" />
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center space-x-2 mb-1">
										<h4 className="font-medium text-gray-900">Step {point.stepNumber}</h4>
										<Badge variant="outline" className="text-xs">
											Checkpoint
										</Badge>
										{!point.canRollback && (
											<Badge variant="destructive" className="text-xs">
												Unavailable
											</Badge>
										)}
									</div>
									<p className="text-sm text-gray-600 mb-2">{point.description}</p>
									<div className="flex items-center space-x-4 text-xs text-gray-500">
										<div className="flex items-center">
											<Clock className="w-3 h-3 mr-1" />
											{format(point.timestamp, "MMM d, HH:mm:ss")}
										</div>
									</div>
								</div>
							</div>

							{selectedCheckpoint === point.id && (
								<CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
							)}
						</div>

						{/* State preview */}
						{selectedCheckpoint === point.id && (
							<div className="mt-4 pt-4 border-t border-blue-200">
								<details className="text-xs">
									<summary className="cursor-pointer text-gray-600 hover:text-gray-800 mb-2">
										View checkpoint state ({Object.keys(point.state).length} fields)
									</summary>
									<pre className="p-2 bg-white rounded border text-xs overflow-x-auto">
										{JSON.stringify(point.state, null, 2)}
									</pre>
								</details>
							</div>
						)}
					</div>
				))}
			</div>

			{/* Rollback form */}
			{selectedCheckpoint && !showConfirmation && (
				<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
					<h4 className="font-medium mb-3">Rollback to Step {selectedPoint?.stepNumber}</h4>
					<div className="space-y-3">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-1">
								Reason for rollback (required)
							</label>
							<Textarea
								value={rollbackReason}
								onChange={(e) => setRollbackReason(e.target.value)}
								placeholder="Explain why you're rolling back to this checkpoint..."
								rows={3}
								className="w-full"
							/>
						</div>
						<div className="flex space-x-3">
							<Button
								onClick={() => setShowConfirmation(true)}
								disabled={!rollbackReason.trim()}
								className="flex-1"
							>
								Proceed with Rollback
							</Button>
							<Button
								variant="outline"
								onClick={() => setSelectedCheckpoint(null)}
								className="flex-1"
							>
								Cancel
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Confirmation dialog */}
			{showConfirmation && selectedPoint && (
				<div className="p-4 bg-red-50 border border-red-200 rounded-lg">
					<div className="flex items-start space-x-3">
						<AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
						<div className="flex-1">
							<h4 className="font-medium text-red-900 mb-2">Confirm Rollback</h4>
							<p className="text-sm text-red-700 mb-4">
								You are about to rollback to <strong>Step {selectedPoint.stepNumber}</strong>
								created on {format(selectedPoint.timestamp, "MMM d, yyyy 'at' HH:mm:ss")}.
							</p>
							<div className="bg-white p-3 rounded border mb-4">
								<p className="text-sm font-medium text-gray-900 mb-1">Reason:</p>
								<p className="text-sm text-gray-700">{rollbackReason}</p>
							</div>
							<div className="flex space-x-3">
								<Button
									variant="destructive"
									onClick={handleConfirmRollback}
									disabled={isRollingBack}
									className="flex items-center"
								>
									{isRollingBack ? (
										<>
											<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
											Rolling back...
										</>
									) : (
										<>
											<RotateCcw className="w-4 h-4 mr-2" />
											Confirm Rollback
										</>
									)}
								</Button>
								<Button variant="outline" onClick={handleCancelRollback} disabled={isRollingBack}>
									<ArrowLeft className="w-4 h-4 mr-2" />
									Go Back
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
