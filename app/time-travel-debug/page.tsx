/**
 * Time-Travel Debug Test Page
 *
 * Test page for demonstrating time-travel debugging functionality.
 */

"use client";

import React, { useState } from "react";
import { TimeTravelDebugDashboard } from "@/components/time-travel/TimeTravelDebugDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAutoSnapshot, useCreateSnapshot } from "@/hooks/use-time-travel-debug";
import { enhancedObservability } from "@/lib/observability/enhanced-events-system";

export default function TimeTravelDebugPage() {
	const [executionId, setExecutionId] = useState<string | null>(null);
	const [isRunning, setIsRunning] = useState(false);

	const createSnapshot = useCreateSnapshot();
	const autoSnapshot = useAutoSnapshot(executionId || "", !!executionId);

	// Simulate an agent execution with snapshots
	const simulateExecution = async () => {
		setIsRunning(true);

		try {
			// Start a mock agent execution
			const mockExecutionId = await enhancedObservability.startAgentExecution(
				"test-agent",
				"simulate-execution",
				{ simulation: true }
			);

			setExecutionId(mockExecutionId);

			// Simulate execution steps with snapshots
			const steps = [
				{ description: "Initialize agent", state: { status: "initializing", step: 1 } },
				{
					description: "Load configuration",
					state: { status: "loading", config: { model: "gpt-4" }, step: 2 },
				},
				{
					description: "Process input",
					state: { status: "processing", input: "test input", step: 3 },
					checkpoint: true,
				},
				{ description: "Generate response", state: { status: "generating", tokens: 150, step: 4 } },
				{
					description: "Validate output",
					state: { status: "validating", output: "test output", step: 5 },
				},
				{
					description: "Complete execution",
					state: { status: "completed", result: "success", step: 6 },
					checkpoint: true,
				},
			];

			for (let i = 0; i < steps.length; i++) {
				const step = steps[i];

				// Wait a bit to simulate processing time
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Create snapshot
				if (step.checkpoint) {
					autoSnapshot.checkpoint(step.state, step.description);
				} else {
					autoSnapshot.snapshot(step.state, step.description);
				}

				// Record step event
				await enhancedObservability.recordExecutionStep(
					mockExecutionId,
					`step_${i + 1}`,
					step.state,
					1000
				);
			}

			// Complete the execution
			await enhancedObservability.completeAgentExecution(
				mockExecutionId,
				{ result: "success", totalSteps: steps.length },
				{ executionTime: steps.length * 1000, tokenCount: 150 }
			);
		} catch (error) {
			console.error("Simulation failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	// Simulate a failed execution for comparison
	const simulateFailedExecution = async () => {
		setIsRunning(true);

		try {
			const mockExecutionId = await enhancedObservability.startAgentExecution(
				"test-agent",
				"simulate-failed-execution",
				{ simulation: true, shouldFail: true }
			);

			const steps = [
				{ description: "Initialize agent", state: { status: "initializing", step: 1 } },
				{
					description: "Load configuration",
					state: { status: "loading", config: { model: "gpt-4" }, step: 2 },
				},
				{
					description: "Process input",
					state: { status: "processing", input: "test input", step: 3 },
					checkpoint: true,
				},
				{ description: "Generate response", state: { status: "generating", tokens: 50, step: 4 } },
				{
					description: "Validation failed",
					state: { status: "error", error: "Validation failed", step: 5 },
				},
			];

			for (let i = 0; i < steps.length; i++) {
				const step = steps[i];

				await new Promise((resolve) => setTimeout(resolve, 800));

				if (step.checkpoint) {
					autoSnapshot.checkpoint(step.state, step.description);
				} else {
					autoSnapshot.snapshot(step.state, step.description);
				}

				await enhancedObservability.recordExecutionStep(
					mockExecutionId,
					`step_${i + 1}`,
					step.state,
					800
				);

				// Simulate failure at step 5
				if (i === 4) {
					await enhancedObservability.failAgentExecution(
						mockExecutionId,
						new Error("Validation failed"),
						{ executionTime: (i + 1) * 800, tokenCount: 50 }
					);
					break;
				}
			}
		} catch (error) {
			console.error("Failed simulation failed:", error);
		} finally {
			setIsRunning(false);
		}
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="text-center">
				<h1 className="text-3xl font-bold mb-4">Time-Travel Debugging Demo</h1>
				<p className="text-gray-600 mb-8">
					Demonstrate time-travel debugging capabilities with simulated agent executions
				</p>
			</div>

			{/* Controls */}
			<Card>
				<CardHeader>
					<CardTitle>Simulation Controls</CardTitle>
					<CardDescription>
						Create mock executions to test time-travel debugging features
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center space-x-4">
						<Button onClick={simulateExecution} disabled={isRunning}>
							{isRunning ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
									Simulating...
								</>
							) : (
								"Simulate Successful Execution"
							)}
						</Button>

						<Button variant="outline" onClick={simulateFailedExecution} disabled={isRunning}>
							{isRunning ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
									Simulating...
								</>
							) : (
								"Simulate Failed Execution"
							)}
						</Button>

						{executionId && (
							<div className="text-sm text-gray-500">
								Current execution: {executionId.slice(-8)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Debug Dashboard */}
			{executionId && <TimeTravelDebugDashboard executionId={executionId} />}

			{/* Instructions */}
			{!executionId && (
				<Card>
					<CardHeader>
						<CardTitle>Getting Started</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4 text-sm">
							<p>
								<strong>1. Simulate an execution:</strong> Click one of the simulation buttons above
								to create a mock agent execution with snapshots.
							</p>
							<p>
								<strong>2. Explore the timeline:</strong> View the execution timeline with all steps
								and events.
							</p>
							<p>
								<strong>3. Start replay:</strong> Use the replay controls to step through the
								execution.
							</p>
							<p>
								<strong>4. Compare executions:</strong> Run both successful and failed simulations,
								then compare them.
							</p>
							<p>
								<strong>5. Test rollback:</strong> Use checkpoints to rollback to previous states.
							</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
