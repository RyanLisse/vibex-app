"use client";

import type {
	KanbanColumn,
	KanbanTask,
} from "@/src/schemas/enhanced-task-schemas";

interface KanbanBoardProps {
	columns: KanbanColumn[];
	tasks: KanbanTask[];
	onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void;
}

export function KanbanBoard({ columns, tasks, onTaskMove }: KanbanBoardProps) {
	return (
		<div className="flex gap-4 p-4 overflow-x-auto">
			{columns.map((column) => (
				<div key={column.id} className="min-w-80 bg-gray-50 rounded-lg p-4">
					<h3 className="font-semibold mb-4">{column.title}</h3>
					<div className="space-y-2">
						{tasks
							.filter((task) => task.status === column.id)
							.map((task) => (
								<div
									key={task.id}
									className="bg-white p-3 rounded shadow-sm border"
								>
									<h4 className="font-medium">{task.title}</h4>
									{task.description && (
										<p className="text-sm text-gray-600 mt-1">
											{task.description}
										</p>
									)}
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
										{task.assignee && (
											<span className="text-xs text-gray-500">
												{task.assignee}
											</span>
										)}
									</div>
								</div>
							))}
					</div>
				</div>
			))}
		</div>
	);
}
