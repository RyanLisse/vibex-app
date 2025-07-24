/**
 * Workflows Page
 *
 * Mock page for E2E testing workflow functionality.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Clock, Play, Plus, Settings } from "lucide-react";

interface WorkflowStep {
	id: string;
	name: string;
	type: "action" | "condition" | "delay";
	status: "pending" | "running" | "completed" | "failed";
}

interface Workflow {
	id: string;
	name: string;
	description: string;
	steps: WorkflowStep[];
	status: "draft" | "running" | "completed" | "failed";
}

export default function WorkflowsPage() {
	const [workflows, setWorkflows] = useState<Workflow[]>([
		{
			id: "1",
			name: "Sample Workflow",
			description: "A sample workflow for demonstration",
			steps: [
				{ id: "1", name: "Initialize", type: "action", status: "completed" },
				{ id: "2", name: "Check Status", type: "condition", status: "completed" },
			],
			status: "completed",
		},
	]);

	const [showCreateForm, setShowCreateForm] = useState(false);
	const [showStepForm, setShowStepForm] = useState(false);
	const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);
	const [executingWorkflow, setExecutingWorkflow] = useState<string | null>(null);

	const [newWorkflow, setNewWorkflow] = useState({
		name: "",
		description: "",
	});

	const [newStep, setNewStep] = useState({
		name: "",
		type: "action" as const,
	});

	const createWorkflow = () => {
		if (!newWorkflow.name.trim()) return;

		const workflow: Workflow = {
			id: Date.now().toString(),
			name: newWorkflow.name,
			description: newWorkflow.description,
			steps: [],
			status: "draft",
		};

		setWorkflows((prev) => [...prev, workflow]);
		setCurrentWorkflow(workflow);
		setNewWorkflow({ name: "", description: "" });
		setShowCreateForm(false);
	};

	const addStep = () => {
		if (!currentWorkflow || !newStep.name.trim()) return;

		const step: WorkflowStep = {
			id: Date.now().toString(),
			name: newStep.name,
			type: newStep.type,
			status: "pending",
		};

		const updatedWorkflow = {
			...currentWorkflow,
			steps: [...currentWorkflow.steps, step],
		};

		setWorkflows((prev) => prev.map((w) => (w.id === currentWorkflow.id ? updatedWorkflow : w)));
		setCurrentWorkflow(updatedWorkflow);
		setNewStep({ name: "", type: "action" });
		setShowStepForm(false);
	};

	const saveWorkflow = () => {
		// In a real app, this would save to backend
		setCurrentWorkflow(null);
		// Show success message (simulated)
		setTimeout(() => {
			const successDiv = document.querySelector('[data-testid="success-message"]');
			if (successDiv) successDiv.textContent = "Workflow saved successfully";
		}, 100);
	};

	const executeWorkflow = async (workflowId: string) => {
		setExecutingWorkflow(workflowId);

		const workflow = workflows.find((w) => w.id === workflowId);
		if (!workflow) return;

		// Update workflow status to running
		setWorkflows((prev) =>
			prev.map((w) => (w.id === workflowId ? { ...w, status: "running" } : w))
		);

		// Simulate step execution
		for (let i = 0; i < workflow.steps.length; i++) {
			const step = workflow.steps[i];

			// Update current step
			setWorkflows((prev) =>
				prev.map((w) =>
					w.id === workflowId
						? {
								...w,
								steps: w.steps.map((s, index) => (index === i ? { ...s, status: "running" } : s)),
							}
						: w
				)
			);

			// Wait to simulate processing
			await new Promise((resolve) => setTimeout(resolve, 2000));

			// Complete step
			setWorkflows((prev) =>
				prev.map((w) =>
					w.id === workflowId
						? {
								...w,
								steps: w.steps.map((s, index) => (index === i ? { ...s, status: "completed" } : s)),
							}
						: w
				)
			);
		}

		// Complete workflow
		setWorkflows((prev) =>
			prev.map((w) => (w.id === workflowId ? { ...w, status: "completed" } : w))
		);

		setExecutingWorkflow(null);
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Workflows</h1>
					<p className="text-gray-600 mt-2">Manage and execute your automated workflows</p>
				</div>
				<Button data-testid="create-workflow-button" onClick={() => setShowCreateForm(true)}>
					<Plus className="w-4 h-4 mr-2" />
					Create Workflow
				</Button>
			</div>

			{/* Create Workflow Form */}
			{showCreateForm && (
				<Card>
					<CardHeader>
						<CardTitle>Create New Workflow</CardTitle>
						<CardDescription>Define a new automated workflow</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<Label htmlFor="workflow-name">Name</Label>
							<Input
								id="workflow-name"
								data-testid="workflow-name-input"
								value={newWorkflow.name}
								onChange={(e) => setNewWorkflow((prev) => ({ ...prev, name: e.target.value }))}
								placeholder="Enter workflow name"
							/>
						</div>
						<div>
							<Label htmlFor="workflow-description">Description</Label>
							<Textarea
								id="workflow-description"
								data-testid="workflow-description-input"
								value={newWorkflow.description}
								onChange={(e) =>
									setNewWorkflow((prev) => ({ ...prev, description: e.target.value }))
								}
								placeholder="Enter workflow description"
							/>
						</div>
						<div className="flex space-x-2">
							<Button onClick={createWorkflow}>Create</Button>
							<Button variant="outline" onClick={() => setShowCreateForm(false)}>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Edit Workflow */}
			{currentWorkflow && (
				<Card>
					<CardHeader>
						<CardTitle>Edit Workflow: {currentWorkflow.name}</CardTitle>
						<CardDescription>{currentWorkflow.description}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Steps */}
						<div>
							<div className="flex items-center justify-between mb-4">
								<h3 className="text-lg font-medium">Workflow Steps</h3>
								<Button
									data-testid="add-step-button"
									variant="outline"
									size="sm"
									onClick={() => setShowStepForm(true)}
								>
									<Plus className="w-4 h-4 mr-2" />
									Add Step
								</Button>
							</div>

							<div className="space-y-2">
								{currentWorkflow.steps.map((step, index) => (
									<div key={step.id} className="flex items-center p-3 border rounded-lg">
										<div className="flex-1">
											<div className="font-medium">{step.name}</div>
											<div className="text-sm text-gray-500 capitalize">{step.type}</div>
										</div>
										<div className="text-sm text-gray-500">Step {index + 1}</div>
									</div>
								))}
							</div>
						</div>

						{/* Add Step Form */}
						{showStepForm && (
							<div className="p-4 border rounded-lg bg-gray-50 space-y-4">
								<h4 className="font-medium">Add New Step</h4>
								<div>
									<Label htmlFor="step-name">Step Name</Label>
									<Input
										id="step-name"
										data-testid="step-name-input"
										value={newStep.name}
										onChange={(e) => setNewStep((prev) => ({ ...prev, name: e.target.value }))}
										placeholder="Enter step name"
									/>
								</div>
								<div>
									<Label htmlFor="step-type">Step Type</Label>
									<Select
										value={newStep.type}
										onValueChange={(value: "action" | "condition" | "delay") =>
											setNewStep((prev) => ({ ...prev, type: value }))
										}
									>
										<SelectTrigger data-testid="step-type-select">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="action">Action</SelectItem>
											<SelectItem value="condition">Condition</SelectItem>
											<SelectItem value="delay">Delay</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="flex space-x-2">
									<Button data-testid="save-step-button" onClick={addStep}>
										Save Step
									</Button>
									<Button variant="outline" onClick={() => setShowStepForm(false)}>
										Cancel
									</Button>
								</div>
							</div>
						)}

						<div className="flex space-x-2">
							<Button data-testid="save-workflow-button" onClick={saveWorkflow}>
								Save Workflow
							</Button>
							<Button variant="outline" onClick={() => setCurrentWorkflow(null)}>
								Cancel
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Success Message */}
			<div data-testid="success-message" className="hidden"></div>

			{/* Workflows List */}
			<div className="grid gap-6">
				{workflows.map((workflow) => (
					<Card key={workflow.id}>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center space-x-2">
										<span>{workflow.name}</span>
										<span
											data-testid="workflow-status"
											className={`text-sm px-2 py-1 rounded ${
												workflow.status === "running"
													? "bg-blue-100 text-blue-800"
													: workflow.status === "completed"
														? "bg-green-100 text-green-800"
														: workflow.status === "failed"
															? "bg-red-100 text-red-800"
															: "bg-gray-100 text-gray-800"
											}`}
										>
											{workflow.status}
										</span>
									</CardTitle>
									<CardDescription>{workflow.description}</CardDescription>
								</div>
								<div className="flex space-x-2">
									<Button variant="outline" size="sm" onClick={() => setCurrentWorkflow(workflow)}>
										<Settings className="w-4 h-4 mr-2" />
										Edit
									</Button>
									<Button
										data-testid="execute-workflow-button"
										size="sm"
										onClick={() => executeWorkflow(workflow.id)}
										disabled={executingWorkflow === workflow.id || workflow.status === "running"}
									>
										{workflow.status === "running" ? (
											<>
												<Clock className="w-4 h-4 mr-2 animate-spin" />
												Running
											</>
										) : (
											<>
												<Play className="w-4 h-4 mr-2" />
												Execute
											</>
										)}
									</Button>
								</div>
							</div>
						</CardHeader>
						<CardContent>
							{/* Workflow Progress */}
							{workflow.status === "running" && (
								<div data-testid="workflow-progress" className="mb-4">
									<div className="flex items-center space-x-4">
										<div className="flex-1">
											<div className="flex space-x-2">
												{workflow.steps.map((step, index) => (
													<div
														key={step.id}
														className={`flex items-center space-x-1 text-sm px-2 py-1 rounded ${
															step.status === "running"
																? "bg-blue-100 text-blue-800"
																: step.status === "completed"
																	? "bg-green-100 text-green-800"
																	: step.status === "failed"
																		? "bg-red-100 text-red-800"
																		: "bg-gray-100 text-gray-800"
														}`}
													>
														{step.status === "running" && (
															<div data-testid="current-step">{step.name}</div>
														)}
														{step.status === "completed" && <CheckCircle className="w-3 h-3" />}
														{step.status === "running" && (
															<Clock className="w-3 h-3 animate-spin" />
														)}
														<span>{step.name}</span>
													</div>
												))}
											</div>
										</div>
									</div>
								</div>
							)}

							<div className="text-sm text-gray-600">
								{workflow.steps.length} steps • Last modified: Just now
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
