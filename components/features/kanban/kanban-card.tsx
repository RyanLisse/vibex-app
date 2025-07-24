"use client";

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
