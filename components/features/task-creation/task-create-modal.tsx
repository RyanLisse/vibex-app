"use client";

/**
 * Task Create Modal - Multi-method Task Creation
 * Unified task creation interface supporting multiple input methods:
 * - Manual text input
 * - Voice dictation
 * - Screenshot-based bug reports
 * - Template-based creation
 */

import { Camera, FileText, Mic, Plus, Wand2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { ScreenshotCapture } from "@/components/features/bug-reporting/screenshot-capture";
// Import sub-components
import { VoiceRecorder } from "@/components/features/voice-tasks/voice-recorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface TaskCreateModalProps {
	onTaskCreate?: (task: TaskData) => Promise<void> | void;
	onCancel?: () => void;
	initialData?: Partial<TaskData>;
	className?: string;
}

interface TaskData {
	title: string;
	description: string;
	priority: "low" | "medium" | "high" | "urgent";
	assignee?: string;
	labels: string[];
	dueDate?: Date;
	metadata?: {
		creationMethod: "manual" | "voice" | "screenshot" | "template";
		templateId?: string;
		voiceTranscription?: string;
		screenshot?: {
			url: string;
			annotations: any[];
		};
	};
}

const TASK_TEMPLATES = [
	{
		id: "bug-report",
		name: "Bug Report",
		title: "Bug: [Title]",
		description:
			"**Steps to reproduce:**\n1. \n2. \n3. \n\n**Expected behavior:**\n\n**Actual behavior:**\n\n**Environment:**\n- Browser: \n- OS: \n- Version: ",
		priority: "medium" as const,
		labels: ["bug"],
	},
	{
		id: "feature-request",
		name: "Feature Request",
		title: "Feature: [Title]",
		description:
			"**Problem:**\n\n**Proposed solution:**\n\n**Acceptance criteria:**\n- [ ] \n- [ ] \n- [ ] ",
		priority: "medium" as const,
		labels: ["feature", "enhancement"],
	},
	{
		id: "task",
		name: "General Task",
		title: "Task: [Title]",
		description:
			"**Description:**\n\n**Requirements:**\n- \n- \n\n**Definition of done:**\n- [ ] \n- [ ] ",
		priority: "medium" as const,
		labels: ["task"],
	},
];

export function TaskCreateModal({
	onTaskCreate,
	onCancel,
	initialData,
	className = "",
}: TaskCreateModalProps) {
	const [activeTab, setActiveTab] = useState<"manual" | "voice" | "screenshot" | "template">(
		"manual"
	);
	const [isLoading, setIsLoading] = useState(false);

	// Form data
	const [taskData, setTaskData] = useState<TaskData>({
		title: initialData?.title || "",
		description: initialData?.description || "",
		priority: initialData?.priority || "medium",
		assignee: initialData?.assignee || "",
		labels: initialData?.labels || [],
		dueDate: initialData?.dueDate,
		metadata: initialData?.metadata || { creationMethod: "manual" },
	});

	// Voice recording state
	const [isRecording, setIsRecording] = useState(false);

	// Label input state
	const [labelInput, setLabelInput] = useState("");

	const updateTaskData = useCallback((updates: Partial<TaskData>) => {
		setTaskData((prev) => ({
			...prev,
			...updates,
			metadata: {
				...prev.metadata,
				...updates.metadata,
			},
		}));
	}, []);

	const handleVoiceRecording = useCallback(
		async (audioBlob: Blob) => {
			setIsLoading(true);
			try {
				// Mock voice processing - would integrate with actual API
				await new Promise((resolve) => setTimeout(resolve, 2000));

				const mockTranscription =
					"Create a task to fix the login issue on the dashboard page. It should be high priority.";
				const parsedTask = {
					title: "Fix login issue on dashboard",
					description: "Users are experiencing login problems on the dashboard page.",
					priority: "high" as const,
				};

				updateTaskData({
					...parsedTask,
					metadata: {
						creationMethod: "voice",
						voiceTranscription: mockTranscription,
					},
				});

				setActiveTab("manual"); // Switch to manual tab to review/edit
			} catch (error) {
				console.error("Voice processing failed:", error);
			} finally {
				setIsLoading(false);
				setIsRecording(false);
			}
		},
		[updateTaskData]
	);

	const handleScreenshotCapture = useCallback(
		async (screenshot: File, annotations: any[]) => {
			setIsLoading(true);
			try {
				// Mock screenshot processing - would upload to cloud storage
				await new Promise((resolve) => setTimeout(resolve, 1000));

				const mockScreenshotUrl = URL.createObjectURL(screenshot);

				updateTaskData({
					title: taskData.title || "Bug report with screenshot",
					description: taskData.description || "Bug identified through screenshot analysis.",
					priority: "medium",
					labels: [...taskData.labels, "bug", "screenshot"],
					metadata: {
						creationMethod: "screenshot",
						screenshot: {
							url: mockScreenshotUrl,
							annotations,
						},
					},
				});

				setActiveTab("manual"); // Switch to manual tab to review/edit
			} catch (error) {
				console.error("Screenshot processing failed:", error);
			} finally {
				setIsLoading(false);
			}
		},
		[updateTaskData, taskData]
	);

	const handleTemplateSelect = useCallback(
		(templateId: string) => {
			const template = TASK_TEMPLATES.find((t) => t.id === templateId);
			if (!template) return;

			updateTaskData({
				title: template.title,
				description: template.description,
				priority: template.priority,
				labels: [
					...taskData.labels,
					...template.labels.filter((l) => !taskData.labels.includes(l)),
				],
				metadata: {
					creationMethod: "template",
					templateId: template.id,
				},
			});

			setActiveTab("manual");
		},
		[updateTaskData, taskData.labels]
	);

	const handleAddLabel = useCallback(() => {
		if (!labelInput.trim() || taskData.labels.includes(labelInput.trim())) return;

		updateTaskData({
			labels: [...taskData.labels, labelInput.trim()],
		});
		setLabelInput("");
	}, [labelInput, taskData.labels, updateTaskData]);

	const handleRemoveLabel = useCallback(
		(label: string) => {
			updateTaskData({
				labels: taskData.labels.filter((l) => l !== label),
			});
		},
		[taskData.labels, updateTaskData]
	);

	const handleSubmit = useCallback(async () => {
		if (!taskData.title.trim()) return;

		setIsLoading(true);
		try {
			await onTaskCreate?.(taskData);
		} catch (error) {
			console.error("Failed to create task:", error);
		} finally {
			setIsLoading(false);
		}
	}, [taskData, onTaskCreate]);

	const isFormValid = taskData.title.trim().length > 0;

	return (
		<div className={`w-full max-w-2xl mx-auto ${className}`}>
			<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="manual" className="flex items-center space-x-2">
						<FileText className="h-4 w-4" />
						<span>Manual</span>
					</TabsTrigger>
					<TabsTrigger value="voice" className="flex items-center space-x-2">
						<Mic className="h-4 w-4" />
						<span>Voice</span>
					</TabsTrigger>
					<TabsTrigger value="screenshot" className="flex items-center space-x-2">
						<Camera className="h-4 w-4" />
						<span>Screenshot</span>
					</TabsTrigger>
					<TabsTrigger value="template" className="flex items-center space-x-2">
						<Wand2 className="h-4 w-4" />
						<span>Template</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="manual" className="space-y-4 mt-6">
					<div className="space-y-4">
						<div>
							<Label htmlFor="title">Title *</Label>
							<Input
								id="title"
								value={taskData.title}
								onChange={(e) => updateTaskData({ title: e.target.value })}
								placeholder="Enter task title..."
								className="mt-1"
							/>
						</div>

						<div>
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={taskData.description}
								onChange={(e) => updateTaskData({ description: e.target.value })}
								placeholder="Enter task description..."
								rows={4}
								className="mt-1"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label htmlFor="priority">Priority</Label>
								<Select
									value={taskData.priority}
									onValueChange={(value) => updateTaskData({ priority: value as any })}
								>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">Low</SelectItem>
										<SelectItem value="medium">Medium</SelectItem>
										<SelectItem value="high">High</SelectItem>
										<SelectItem value="urgent">Urgent</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div>
								<Label htmlFor="assignee">Assignee</Label>
								<Input
									id="assignee"
									value={taskData.assignee || ""}
									onChange={(e) => updateTaskData({ assignee: e.target.value })}
									placeholder="Enter assignee..."
									className="mt-1"
								/>
							</div>
						</div>

						<div>
							<Label>Labels</Label>
							<div className="flex items-center space-x-2 mt-1">
								<Input
									value={labelInput}
									onChange={(e) => setLabelInput(e.target.value)}
									placeholder="Add label..."
									onKeyDown={(e) => e.key === "Enter" && handleAddLabel()}
									className="flex-1"
								/>
								<Button type="button" onClick={handleAddLabel} size="sm">
									Add
								</Button>
							</div>
							{taskData.labels.length > 0 && (
								<div className="flex flex-wrap gap-2 mt-2">
									{taskData.labels.map((label) => (
										<Badge key={label} variant="secondary" className="flex items-center space-x-1">
											<span>{label}</span>
											<button
												onClick={() => handleRemoveLabel(label)}
												className="ml-1 hover:text-red-600"
											>
												<X className="h-3 w-3" />
											</button>
										</Badge>
									))}
								</div>
							)}
						</div>

						{taskData.metadata?.creationMethod !== "manual" && (
							<Card className="bg-blue-50 border-blue-200">
								<CardContent className="pt-4">
									<div className="flex items-center space-x-2 text-sm text-blue-800">
										{taskData.metadata?.creationMethod === "voice" && <Mic className="h-4 w-4" />}
										{taskData.metadata?.creationMethod === "screenshot" && (
											<Camera className="h-4 w-4" />
										)}
										{taskData.metadata?.creationMethod === "template" && (
											<Wand2 className="h-4 w-4" />
										)}
										<span>
											Created via {taskData.metadata?.creationMethod} - you can edit above
										</span>
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</TabsContent>

				<TabsContent value="voice" className="space-y-4 mt-6">
					<Card>
						<CardHeader>
							<CardTitle>Voice Task Creation</CardTitle>
						</CardHeader>
						<CardContent className="text-center">
							<VoiceRecorder
								onRecordingComplete={handleVoiceRecording}
								onError={(error) => console.error("Voice error:", error)}
							/>
							<p className="text-sm text-gray-600 mt-4">
								Describe your task using voice and we'll automatically parse the details
							</p>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="screenshot" className="mt-6">
					<ScreenshotCapture onScreenshotCapture={handleScreenshotCapture} className="w-full" />
				</TabsContent>

				<TabsContent value="template" className="space-y-4 mt-6">
					<div className="grid gap-4">
						{TASK_TEMPLATES.map((template) => (
							<Card
								key={template.id}
								className="cursor-pointer hover:shadow-md transition-shadow"
								onClick={() => handleTemplateSelect(template.id)}
							>
								<CardContent className="pt-4">
									<div className="flex items-center justify-between">
										<div>
											<h3 className="font-medium">{template.name}</h3>
											<p className="text-sm text-gray-600 mt-1">
												Pre-configured template with common fields
											</p>
										</div>
										<div className="flex items-center space-x-2">
											<Badge variant="outline">{template.priority}</Badge>
											{template.labels.map((label) => (
												<Badge key={label} variant="secondary" className="text-xs">
													{label}
												</Badge>
											))}
										</div>
									</div>
								</CardContent>
							</Card>
						))}
					</div>
				</TabsContent>
			</Tabs>

			<Separator className="my-6" />

			{/* Action Buttons */}
			<div className="flex items-center justify-end space-x-3">
				<Button variant="outline" onClick={onCancel} disabled={isLoading}>
					Cancel
				</Button>
				<Button
					onClick={handleSubmit}
					disabled={!isFormValid || isLoading}
					className="flex items-center space-x-2"
				>
					<Plus className="h-4 w-4" />
					<span>{isLoading ? "Creating..." : "Create Task"}</span>
				</Button>
			</div>
		</div>
	);
}

export default TaskCreateModal;
