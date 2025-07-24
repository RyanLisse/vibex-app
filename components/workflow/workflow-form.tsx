/**
 * Workflow Creation Form Component
 */

"use client";

import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import {
	type CreateWorkflowData,
	useCreateWorkflow,
	type WorkflowStep,
} from "@/hooks/use-workflow-queries";

interface WorkflowFormProps {
	onSuccess?: (workflowId: string) => void;
	onCancel?: () => void;
}

export function WorkflowForm({ onSuccess, onCancel }: WorkflowFormProps) {
	const [formData, setFormData] = useState<Partial<CreateWorkflowData>>({
		name: "",
		description: "",
		version: 1,
		steps: [],
		variables: {},
		tags: [],
	});

	const [currentStep, setCurrentStep] = useState<Partial<WorkflowStep>>({
		id: "",
		name: "",
		type: "action",
		config: {},
	});

	const [newTag, setNewTag] = useState("");
	const [newVariable, setNewVariable] = useState({ key: "", value: "" });

	const createWorkflow = useCreateWorkflow();

	const handleAddStep = () => {
		if (!currentStep.id || !currentStep.name) {
			toast.error("Step ID and name are required");
			return;
		}

		const step: WorkflowStep = {
			id: currentStep.id,
			name: currentStep.name,
			type: currentStep.type || "action",
			config: currentStep.config || {},
			dependencies: currentStep.dependencies,
			timeout: currentStep.timeout,
			retryPolicy: currentStep.retryPolicy,
		};

		setFormData((prev) => ({
			...prev,
			steps: [...(prev.steps || []), step],
		}));

		setCurrentStep({
			id: "",
			name: "",
			type: "action",
			config: {},
		});
	};

	const handleRemoveStep = (index: number) => {
		setFormData((prev) => ({
			...prev,
			steps: prev.steps?.filter((_, i) => i !== index) || [],
		}));
	};

	const handleAddTag = () => {
		if (!newTag.trim()) return;

		setFormData((prev) => ({
			...prev,
			tags: [...(prev.tags || []), newTag.trim()],
		}));
		setNewTag("");
	};

	const handleRemoveTag = (index: number) => {
		setFormData((prev) => ({
			...prev,
			tags: prev.tags?.filter((_, i) => i !== index) || [],
		}));
	};

	const handleAddVariable = () => {
		if (!newVariable.key.trim()) return;

		setFormData((prev) => ({
			...prev,
			variables: {
				...prev.variables,
				[newVariable.key]: newVariable.value,
			},
		}));
		setNewVariable({ key: "", value: "" });
	};

	const handleRemoveVariable = (key: string) => {
		setFormData((prev) => {
			const variables = { ...prev.variables };
			delete variables[key];
			return { ...prev, variables };
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.name || !formData.steps?.length) {
			toast.error("Workflow name and at least one step are required");
			return;
		}

		try {
			const workflow = await createWorkflow.mutateAsync(formData as CreateWorkflowData);
			toast.success("Workflow created successfully");
			onSuccess?.(workflow.id);
		} catch (error) {
			toast.error("Failed to create workflow");
			console.error("Failed to create workflow:", error);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Create New Workflow</CardTitle>
					<CardDescription>
						Define a workflow with steps, variables, and configuration
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Basic Information */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="name">Workflow Name</Label>
								<Input
									id="name"
									value={formData.name || ""}
									onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Enter workflow name"
									required={true}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="version">Version</Label>
								<Input
									id="version"
									type="number"
									value={formData.version || 1}
									onChange={(e) =>
										setFormData((prev) => ({ ...prev, version: Number.parseInt(e.target.value) }))
									}
									min="1"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description || ""}
								onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
								placeholder="Describe what this workflow does"
								rows={3}
							/>
						</div>

						{/* Tags */}
						<div className="space-y-2">
							<Label>Tags</Label>
							<div className="flex items-center space-x-2">
								<Input
									value={newTag}
									onChange={(e) => setNewTag(e.target.value)}
									placeholder="Add a tag"
									onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
								/>
								<Button type="button" onClick={handleAddTag} size="sm">
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							{formData.tags && formData.tags.length > 0 && (
								<div className="flex flex-wrap gap-2">
									{formData.tags.map((tag, index) => (
										<Badge key={index} variant="secondary" className="flex items-center space-x-1">
											<span>{tag}</span>
											<button
												type="button"
												onClick={() => handleRemoveTag(index)}
												className="ml-1 hover:text-red-500"
											>
												<Trash2 className="h-3 w-3" />
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>

						{/* Variables */}
						<div className="space-y-2">
							<Label>Variables</Label>
							<div className="grid grid-cols-3 gap-2">
								<Input
									value={newVariable.key}
									onChange={(e) => setNewVariable((prev) => ({ ...prev, key: e.target.value }))}
									placeholder="Variable name"
								/>
								<Input
									value={newVariable.value}
									onChange={(e) => setNewVariable((prev) => ({ ...prev, value: e.target.value }))}
									placeholder="Variable value"
								/>
								<Button type="button" onClick={handleAddVariable} size="sm">
									<Plus className="h-4 w-4" />
								</Button>
							</div>
							{formData.variables && Object.keys(formData.variables).length > 0 && (
								<div className="space-y-2">
									{Object.entries(formData.variables).map(([key, value]) => (
										<div
											key={key}
											className="flex items-center justify-between p-2 bg-gray-50 rounded"
										>
											<span className="text-sm">
												<strong>{key}:</strong> {String(value)}
											</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveVariable(key)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Steps */}
						<div className="space-y-4">
							<Label>Workflow Steps</Label>

							{/* Add Step Form */}
							<Card>
								<CardHeader>
									<CardTitle className="text-base">Add Step</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-2">
											<Label htmlFor="step-id">Step ID</Label>
											<Input
												id="step-id"
												value={currentStep.id || ""}
												onChange={(e) =>
													setCurrentStep((prev) => ({ ...prev, id: e.target.value }))
												}
												placeholder="unique-step-id"
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="step-name">Step Name</Label>
											<Input
												id="step-name"
												value={currentStep.name || ""}
												onChange={(e) =>
													setCurrentStep((prev) => ({ ...prev, name: e.target.value }))
												}
												placeholder="Step Name"
											/>
										</div>
									</div>

									<div className="space-y-2">
										<Label htmlFor="step-type">Step Type</Label>
										<Select
											value={currentStep.type}
											onValueChange={(value) =>
												setCurrentStep((prev) => ({ ...prev, type: value as any }))
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="action">Action</SelectItem>
												<SelectItem value="condition">Condition</SelectItem>
												<SelectItem value="parallel">Parallel</SelectItem>
												<SelectItem value="sequential">Sequential</SelectItem>
											</SelectContent>
										</Select>
									</div>

									<div className="space-y-2">
										<Label htmlFor="step-config">Configuration (JSON)</Label>
										<Textarea
											id="step-config"
											value={JSON.stringify(currentStep.config || {}, null, 2)}
											onChange={(e) => {
												try {
													const config = JSON.parse(e.target.value);
													setCurrentStep((prev) => ({ ...prev, config }));
												} catch {
													// Invalid JSON, ignore
												}
											}}
											placeholder='{"type": "http_request", "url": "https://example.com"}'
											rows={3}
										/>
									</div>

									<Button type="button" onClick={handleAddStep}>
										<Plus className="h-4 w-4 mr-2" />
										Add Step
									</Button>
								</CardContent>
							</Card>

							{/* Steps List */}
							{formData.steps && formData.steps.length > 0 && (
								<div className="space-y-2">
									<Label>Current Steps ({formData.steps.length})</Label>
									{formData.steps.map((step, index) => (
										<div
											key={index}
											className="flex items-center justify-between p-3 border rounded"
										>
											<div>
												<div className="font-medium">{step.name}</div>
												<div className="text-sm text-muted-foreground">
													{step.id} • {step.type}
												</div>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onClick={() => handleRemoveStep(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						{/* Actions */}
						<div className="flex items-center justify-end space-x-2">
							{onCancel && (
								<Button type="button" variant="outline" onClick={onCancel}>
									Cancel
								</Button>
							)}
							<Button type="submit" disabled={createWorkflow.isPending}>
								{createWorkflow.isPending ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										Creating...
									</>
								) : (
									<>
										<Save className="h-4 w-4 mr-2" />
										Create Workflow
									</>
								)}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
