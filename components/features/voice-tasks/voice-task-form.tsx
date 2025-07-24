"use client";

import { Send, Volume2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { VoiceTaskCreationSchema } from "@/src/schemas/enhanced-task-schemas";

type VoiceTaskFormData = z.infer<typeof VoiceTaskCreationSchema>;

interface VoiceTaskFormProps {
	transcription?: string;
	audioBlob?: Blob | null;
	onSubmit?: (data: VoiceTaskFormData) => void;
	onCancel?: () => void;
	isSubmitting?: boolean;
	className?: string;
}

export function VoiceTaskForm({
	transcription = "",
	audioBlob,
	onSubmit,
	onCancel,
	isSubmitting = false,
	className = "",
}: VoiceTaskFormProps) {
	const [formData, setFormData] = useState({
		title: "",
		description: transcription,
		priority: "medium" as "low" | "medium" | "high" | "critical",
		assignee: "",
		dueDate: "",
		tags: "",
	});

	const [errors, setErrors] = useState<Record<string, string>>({});
	const { toast } = useToast();

	// Update description when transcription changes
	useState(() => {
		if (transcription && !formData.description) {
			setFormData((prev) => ({ ...prev, description: transcription }));
		}
	});

	const validateForm = () => {
		const newErrors: Record<string, string> = {};

		if (!formData.title.trim()) {
			newErrors.title = "Title is required";
		} else if (formData.title.length > 200) {
			newErrors.title = "Title too long";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Description is required";
		} else if (formData.description.length > 1000) {
			newErrors.description = "Description too long";
		}

		if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
			newErrors.dueDate = "Due date cannot be in the past";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			return;
		}

		try {
			// Convert form data to voice task format
			const voiceTaskData: VoiceTaskFormData = {
				taskId: crypto.randomUUID(),
				voiceRecording: {
					url: audioBlob ? URL.createObjectURL(audioBlob) : undefined,
					transcription,
					duration: 0, // Would be calculated from audio
				},
				title: formData.title,
				description: formData.description,
				priority: formData.priority,
				userId: crypto.randomUUID(), // Would come from auth context
				assignee: formData.assignee || undefined,
				dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
				tags: formData.tags
					? formData.tags
							.split(",")
							.map((tag) => tag.trim())
							.filter(Boolean)
					: undefined,
				labels: ["voice-created"], // Auto-tag as voice-created
			};

			onSubmit?.(voiceTaskData);

			toast({
				title: "Voice Task Created",
				description: "Your voice task has been created successfully.",
			});
		} catch (error) {
			console.error("Failed to create voice task:", error);
			toast({
				title: "Creation Failed",
				description: "Failed to create voice task. Please try again.",
				variant: "destructive",
			});
		}
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: "" }));
		}
	};

	// Auto-generate title from description if empty
	const handleDescriptionChange = (value: string) => {
		handleInputChange("description", value);

		if (!formData.title && value.trim()) {
			// Extract first sentence or first 50 characters as title
			const firstSentence = value.split(".")[0].trim();
			const autoTitle =
				firstSentence.length > 50 ? firstSentence.substring(0, 50) + "..." : firstSentence;

			if (autoTitle) {
				handleInputChange("title", autoTitle);
			}
		}
	};

	return (
		<Card className={className}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Volume2 className="h-5 w-5" />
					Create Voice Task
				</CardTitle>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Title */}
					<FormField label="Title" required error={errors.title}>
						<Input
							placeholder="Task title (auto-generated from voice)"
							value={formData.title}
							onChange={(e) => handleInputChange("title", e.target.value)}
						/>
					</FormField>

					{/* Description */}
					<FormField label="Description" required error={errors.description}>
						<Textarea
							placeholder="Task description from voice transcription"
							rows={4}
							value={formData.description}
							onChange={(e) => handleDescriptionChange(e.target.value)}
						/>
					</FormField>

					{/* Priority and Assignee */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="Priority">
							<Select
								value={formData.priority}
								onValueChange={(value) => handleInputChange("priority", value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select priority" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="low">Low</SelectItem>
									<SelectItem value="medium">Medium</SelectItem>
									<SelectItem value="high">High</SelectItem>
									<SelectItem value="critical">Critical</SelectItem>
								</SelectContent>
							</Select>
						</FormField>

						<FormField label="Assignee">
							<Input
								placeholder="Assign to team member (optional)"
								value={formData.assignee}
								onChange={(e) => handleInputChange("assignee", e.target.value)}
							/>
						</FormField>
					</div>

					{/* Due Date and Tags */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<FormField label="Due Date" error={errors.dueDate}>
							<Input
								type="date"
								value={formData.dueDate}
								onChange={(e) => handleInputChange("dueDate", e.target.value)}
							/>
						</FormField>

						<FormField label="Tags">
							<Input
								placeholder="Enter tags separated by commas"
								value={formData.tags}
								onChange={(e) => handleInputChange("tags", e.target.value)}
							/>
						</FormField>
					</div>

					{/* Voice Recording Info */}
					{audioBlob && (
						<div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
							<div className="flex items-center gap-2 text-sm text-blue-700">
								<Volume2 className="h-4 w-4" />
								<span>Voice recording attached</span>
							</div>
							{transcription && (
								<p className="text-xs text-blue-600 mt-1">
									Transcription: "{transcription.substring(0, 100)}..."
								</p>
							)}
						</div>
					)}

					{/* Form Actions */}
					<div className="flex gap-3 pt-4">
						<Button type="submit" disabled={isSubmitting} className="flex items-center gap-2">
							{isSubmitting ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
									Creating...
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									Create Voice Task
								</>
							)}
						</Button>
						{onCancel && (
							<Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
								Cancel
							</Button>
						)}
					</div>
				</form>
			</CardContent>
		</Card>
	);
}

import type React from "react";
import { useState } from "react";
import { SelectValue } from "@/components/ui/select";

interface VoiceTaskFormProps {
	onSubmit?: (taskData: {
		title: string;
		description: string;
		priority: "low" | "medium" | "high" | "urgent";
	}) => void;
	initialData?: {
		title?: string;
		description?: string;
		priority?: "low" | "medium" | "high" | "urgent";
	};
}

export const VoiceTaskForm: React.FC<VoiceTaskFormProps> = ({ onSubmit, initialData }) => {
	const [title, setTitle] = useState(initialData?.title || "");
	const [description, setDescription] = useState(initialData?.description || "");
	const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">(
		initialData?.priority || "medium"
	);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (title.trim()) {
			onSubmit?.({
				title: title.trim(),
				description: description.trim(),
				priority,
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div>
				<label htmlFor="title" className="block text-sm font-medium mb-1">
					Task Title
				</label>
				<input
					id="title"
					type="text"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
					placeholder="Enter task title..."
					required={true}
				/>
			</div>

			<div>
				<label htmlFor="description" className="block text-sm font-medium mb-1">
					Description
				</label>
				<textarea
					id="description"
					value={description}
					onChange={(e) => setDescription(e.target.value)}
					className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
					rows={3}
					placeholder="Enter task description..."
				/>
			</div>

			<div>
				<label htmlFor="priority" className="block text-sm font-medium mb-1">
					Priority
				</label>
				<select
					id="priority"
					value={priority}
					onChange={(e) => setPriority(e.target.value as any)}
					className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
				>
					<option value="low">Low</option>
					<option value="medium">Medium</option>
					<option value="high">High</option>
					<option value="urgent">Urgent</option>
				</select>
			</div>

			<button
				type="submit"
				className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
			>
				Create Task
			</button>
		</form>
	);
};

export default VoiceTaskForm;
