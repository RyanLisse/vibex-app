"use client";

import type { KanbanTask } from "@/src/schemas/enhanced-task-schemas";

interface KanbanColumnProps {
	id: string;
	title: string;
	tasks: KanbanTask[];
	color?: string;
	limit?: number;
}

export function KanbanColumn({ id, title, tasks, color, limit }: KanbanColumnProps) {
	const isOverLimit = limit && tasks.length > limit;

	return (
		<div className="min-w-80 bg-gray-50 rounded-lg p-4">
			<div className="flex justify-between items-center mb-4">
				<h3 className="font-semibold">{title}</h3>
				<div className="flex items-center gap-2">
					<span className={`text-sm ${isOverLimit ? "text-red-600" : "text-gray-500"}`}>
						{tasks.length}
						{limit && `/${limit}`}
					</span>
					{color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />}
				</div>
			</div>
			<div className="space-y-2">
				{tasks.map((task) => (
					<div
						key={task.id}
						className="bg-white p-3 rounded shadow-sm border hover:shadow-md transition-shadow"
					>
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
					</div>
				))}
			</div>
		</div>
	);
}
