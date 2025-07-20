"use client";

import { format, isAfter } from "date-fns";
import { AlertTriangle, Calendar, Tag, User } from "lucide-react";
import { useDrag } from "react-dnd";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KanbanTask } from "@/src/schemas/enhanced-task-schemas";

interface KanbanCardProps {
	task: KanbanTask;
	index: number;
	onEdit?: (task: KanbanTask) => void;
	className?: string;
}

export function KanbanCard({
	task,
	index,
	onEdit,
	className = "",
}: KanbanCardProps) {
	const [{ isDragging }, drag] = useDrag({
		type: "KANBAN_TASK",
		item: { task, index },
		collect: (monitor) => ({
			isDragging: monitor.isDragging(),
		}),
	});

	// Check if task is overdue
	const isOverdue = task.dueDate && isAfter(new Date(), task.dueDate);

	// Priority colors
	const priorityColors = {
		low: "bg-green-100 text-green-800 border-green-200",
		medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
		high: "bg-orange-100 text-orange-800 border-orange-200",
		urgent: "bg-red-100 text-red-800 border-red-200",
	};

	const cardClassName = `
    p-4 bg-white rounded-lg border shadow-sm cursor-move transition-all duration-200
    hover:shadow-md hover:border-blue-300
    ${isDragging ? "opacity-50 rotate-3 scale-105" : ""}
    ${isOverdue ? "border-red-300 bg-red-50" : ""}
    ${className}
  `;

	return (
		<div
			className={cardClassName}
			data-testid={`task-card-${task.id}`}
			draggable
			onClick={() => onEdit?.(task)}
			ref={drag}
		>
			{/* Task Header */}
			<div className="mb-3 flex items-start justify-between">
				<h3 className="flex-1 pr-2 font-medium text-sm leading-tight">
					{task.name}
				</h3>

				<div className="flex items-center gap-1">
					{/* Priority Badge */}
					<Badge
						className={`px-2 py-0.5 text-xs ${priorityColors[task.priority]}`}
						variant="outline"
					>
						{task.priority.toUpperCase()}
					</Badge>

					{/* Overdue Indicator */}
					{isOverdue && (
						<div
							className="text-red-500"
							data-testid="overdue-indicator"
							title="Task is overdue"
						>
							<AlertTriangle className="h-4 w-4" />
						</div>
					)}
				</div>
			</div>

			{/* Task Details */}
			<div className="space-y-2">
				{/* Assignee */}
				{task.assignee && (
					<div className="flex items-center gap-2 text-muted-foreground text-xs">
						<User className="h-3 w-3" />
						<span>{task.assignee}</span>
					</div>
				)}

				{/* Due Date */}
				{task.dueDate && (
					<div
						className={`flex items-center gap-2 text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}
					>
						<Calendar className="h-3 w-3" />
						<span>
							{format(task.dueDate, "MMM d, yyyy")}
							{isOverdue && " (Overdue)"}
						</span>
					</div>
				)}

				{/* Tags */}
				{task.tags.length > 0 && (
					<div className="flex items-center gap-2">
						<Tag className="h-3 w-3 text-muted-foreground" />
						<div className="flex flex-wrap gap-1">
							{task.tags.slice(0, 3).map((tag) => (
								<Badge
									className="px-1.5 py-0.5 text-xs"
									key={tag}
									variant="secondary"
								>
									{tag}
								</Badge>
							))}
							{task.tags.length > 3 && (
								<Badge className="px-1.5 py-0.5 text-xs" variant="secondary">
									+{task.tags.length - 3}
								</Badge>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Quick Actions */}
			<div className="mt-3 border-muted/30 border-t pt-3">
				<div className="flex items-center justify-between">
					<span className="text-muted-foreground text-xs">
						ID: {task.id.slice(-6)}
					</span>

					{onEdit && (
						<Button
							className="h-6 px-2 text-xs"
							onClick={(e) => {
								e.stopPropagation();
								onEdit(task);
							}}
							size="sm"
							variant="ghost"
						>
							Edit
						</Button>
					)}
				</div>
			</div>

			{/* Drag Handle Indicator */}
			<div className="absolute top-2 right-2 opacity-30 transition-opacity hover:opacity-60">
				<div className="grid h-4 w-4 grid-cols-2 gap-0.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<div className="h-1 w-1 rounded-full bg-muted-foreground" key={i} />
					))}
				</div>
			</div>
		</div>
	);
}
