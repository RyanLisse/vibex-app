"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import type { CreateEnhancedTask, TaskPriority } from "@/src/schemas/enhanced-task-schemas";

interface NewTaskFormProps {
	onSubmit: (task: Partial<CreateEnhancedTask>) => void;
	onCancel?: () => void;
	isLoading?: boolean;
}

export default function NewTaskForm({ onSubmit, onCancel, isLoading }: NewTaskFormProps) {
	const [formData, setFormData] = useState<Partial<CreateEnhancedTask>>({
		title: "",
		description: "",
		priority: "medium" as TaskPriority,
		tags: [],
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (formData.title?.trim()) {
			onSubmit(formData);
		}
	};

	const handleInputChange = (field: keyof CreateEnhancedTask, value: string | TaskPriority) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4 p-4">
			<div>
				<Label htmlFor="title">Title *</Label>
				<Input
					id="title"
					value={formData.title || ""}
					onChange={(e) => handleInputChange("title", e.target.value)}
					placeholder="Enter task title"
					required={true}
				/>
			</div>

			<div>
				<Label htmlFor="description">Description</Label>
				<Textarea
					id="description"
					value={formData.description || ""}
					onChange={(e) => handleInputChange("description", e.target.value)}
					placeholder="Enter task description"
					rows={3}
				/>
			</div>

			<div>
				<Label htmlFor="priority">Priority</Label>
				<Select
					value={formData.priority}
					onValueChange={(value) => handleInputChange("priority", value as TaskPriority)}
				>
					<SelectTrigger>
						<SelectValue placeholder="Select priority" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="low">Low</SelectItem>
						<SelectItem value="medium">Medium</SelectItem>
						<SelectItem value="high">High</SelectItem>
						<SelectItem value="urgent">Urgent</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="flex gap-2 justify-end">
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Cancel
					</Button>
				)}
				<Button type="submit" disabled={isLoading || !formData.title?.trim()}>
					{isLoading ? "Creating..." : "Create Task"}
				</Button>
			</div>
		</form>
	);
}
