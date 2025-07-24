"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, MoreHorizontal, User } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { KanbanTask } from "./kanban-board";

interface KanbanCardProps {
	task: KanbanTask;
	onUpdate?: (taskId: string, updates: Partial<KanbanTask>) => void;
	onDelete?: (taskId: string) => void;
}

export function KanbanCard({ task, onUpdate, onDelete }: KanbanCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedTask, setEditedTask] = useState(task);

	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: task.id,
		data: {
			type: "task",
			task,
		},
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "critical":
				return "bg-red-500 text-white";
			case "high":
				return "bg-orange-500 text-white";
			case "medium":
				return "bg-yellow-500 text-white";
			case "low":
				return "bg-green-500 text-white";
			default:
				return "bg-gray-500 text-white";
		}
	};

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("en-US", {
			month: "short",
			day: "numeric",
		}).format(date);
	};

	const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

	const handleSave = () => {
		onUpdate?.(task.id, {
			...editedTask,
			updatedAt: new Date(),
		});
		setIsEditing(false);
	};

	const handleCancel = () => {
		setEditedTask(task);
		setIsEditing(false);
	};

	const handleDelete = () => {
		onDelete?.(task.id);
	};

	if (isEditing) {
		return (
			<Card className="w-full">
				<CardHeader className="pb-3">
					<Input
						value={editedTask.title}
						onChange={(e) => setEditedTask((prev) => ({ ...prev, title: e.target.value }))}
						placeholder="Task title"
						className="font-medium"
					/>
				</CardHeader>
				<CardContent className="space-y-3">
					<Textarea
						value={editedTask.description || ""}
						onChange={(e) => setEditedTask((prev) => ({ ...prev, description: e.target.value }))}
						placeholder="Task description"
						rows={3}
						className="resize-none"
					/>

					<div className="flex gap-2">
						<Button size="sm" onClick={handleSave}>
							Save
						</Button>
						<Button size="sm" variant="outline" onClick={handleCancel}>
							Cancel
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div ref={setNodeRef} style={style} className={`${isDragging ? "opacity-50" : ""}`}>
			<Card
				className="w-full cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
				{...attributes}
				{...listeners}
			>
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<h4 className="font-medium text-sm leading-tight pr-2">{task.title}</h4>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="sm"
									className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
									onClick={(e) => e.stopPropagation()}
								>
									<MoreHorizontal className="h-3 w-3" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => setIsEditing(true)}>Edit Task</DropdownMenuItem>
								<DropdownMenuItem onClick={handleDelete} className="text-red-600">
									Delete Task
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</CardHeader>

				<CardContent className="space-y-3">
					{task.description && (
						<p className="text-xs text-gray-600 line-clamp-2">{task.description}</p>
					)}

					{/* Labels */}
					{task.labels && task.labels.length > 0 && (
						<div className="flex flex-wrap gap-1">
							{task.labels.slice(0, 3).map((label) => (
								<Badge key={label} variant="secondary" className="text-xs px-2 py-0">
									{label}
								</Badge>
							))}
							{task.labels.length > 3 && (
								<Badge variant="secondary" className="text-xs px-2 py-0">
									+{task.labels.length - 3}
								</Badge>
							)}
						</div>
					)}

					{/* Footer */}
					<div className="flex items-center justify-between text-xs">
						<div className="flex items-center gap-2">
							{/* Priority */}
							<Badge className={`text-xs px-2 py-0 ${getPriorityColor(task.priority)}`}>
								{task.priority}
							</Badge>

							{/* Assignee */}
							{task.assignee && (
								<div className="flex items-center gap-1 text-gray-500">
									<User className="h-3 w-3" />
									<span className="truncate max-w-[60px]">{task.assignee}</span>
								</div>
							)}
						</div>

						{/* Due Date */}
						{task.dueDate && (
							<div
								className={`flex items-center gap-1 ${
									isOverdue ? "text-red-500" : "text-gray-500"
								}`}
							>
								<Calendar className="h-3 w-3" />
								<span>{formatDate(task.dueDate)}</span>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

import type { KanbanTask } from "@/src/schemas/enhanced-task-schemas";

interface KanbanCardProps {
	task: KanbanTask;
	onEdit?: (task: KanbanTask) => void;
	onDelete?: (taskId: string) => void;
}

export function KanbanCard({ task, onEdit, onDelete }: KanbanCardProps) {
	return (
		<div className="bg-white p-3 rounded shadow-sm border hover:shadow-md transition-shadow cursor-pointer">
			<h4 className="font-medium">{task.title}</h4>
			{task.description && <p className="text-sm text-gray-600 mt-1">{task.description}</p>}
			<div className="flex justify-between items-center mt-2">
				<span
					className={`text-xs px-2 py-1 rounded ${
						task.priority === "high"
							? "bg-red-100 text-red-800"
							: task.priority === "medium"
								? "bg-yellow-100 text-yellow-800"
								: "bg-green-100 text-green-800"
					}`}
				>
					{task.priority}
				</span>
				{task.assignee && <span className="text-xs text-gray-500">{task.assignee}</span>}
			</div>
			{task.tags && task.tags.length > 0 && (
				<div className="flex flex-wrap gap-1 mt-2">
					{task.tags.map((tag, index) => (
						<span key={index} className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
							{tag}
						</span>
					))}
				</div>
			)}
		</div>
	);
}
