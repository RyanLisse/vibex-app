"use client";

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
