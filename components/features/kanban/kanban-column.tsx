"use client";

import { useDrop } from "react-dnd";
import type {
	KanbanColumn as KanbanColumnType,
	KanbanTask,
} from "@/src/schemas/enhanced-task-schemas";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
	column: KanbanColumnType;
	tasks: KanbanTask[];
	onTaskMove: (
		taskId: string,
		fromColumn: string,
		toColumn: string,
		newOrder: number,
	) => void;
	onTaskEdit?: (task: KanbanTask) => void;
	isOverloaded?: boolean;
	className?: string;
}

export function KanbanColumn({
	column,
	tasks,
	onTaskMove,
	onTaskEdit,
	isOverloaded = false,
	className = "",
}: KanbanColumnProps) {
	const [{ isOver, canDrop }, drop] = useDrop({
		accept: "KANBAN_TASK",
		drop: (item: { task: KanbanTask; index: number }) => {
			// Don't allow drop if column is full
			if (
				column.maxItems &&
				tasks.length >= column.maxItems &&
				item.task.column !== column.id
			) {
				return;
			}

			// Calculate new order (append to end)
			const newOrder = tasks.length;

			onTaskMove(item.task.id, item.task.column, column.id, newOrder);
		},
		canDrop: (item: { task: KanbanTask }) => {
			// Don't allow drop if it's the same column
			if (item.task.column === column.id) return false;

			// Don't allow drop if column is full
			if (column.maxItems && tasks.length >= column.maxItems) return false;

			return true;
		},
		collect: (monitor) => ({
			isOver: monitor.isOver(),
			canDrop: monitor.canDrop(),
		}),
	});

	const dropZoneClassName = `
    min-h-[200px] p-4 rounded-lg border-2 border-dashed transition-colors
    ${isOver && canDrop ? "border-blue-500 bg-blue-50" : "border-muted-foreground/25"}
    ${isOver && !canDrop ? "border-red-500 bg-red-50" : ""}
    ${isOverloaded ? "bg-red-50/50" : "bg-muted/25"}
  `;

	return (
		<div
			className={`${dropZoneClassName} ${className}`}
			data-droppable="true"
			data-testid={`column-${column.id}`}
			ref={drop}
		>
			{/* Drop indicator */}
			{isOver && (
				<div className="mb-4 rounded-lg bg-blue-100 p-2 text-center text-blue-700 text-sm">
					{canDrop ? "Drop task here" : "Column is full"}
				</div>
			)}

			{/* Column full warning */}
			{isOverloaded && (
				<div className="mb-4 rounded-lg bg-red-100 p-2 text-center text-red-700 text-sm">
					Column is over capacity
				</div>
			)}

			{/* Tasks */}
			<div className="space-y-3">
				{tasks.length === 0 && !isOver ? (
					<div className="py-8 text-center text-muted-foreground">
						<p className="text-sm">No tasks in this column</p>
						<p className="mt-1 text-xs">Drag tasks here to move them</p>
					</div>
				) : (
					tasks.map((task, index) => (
						<KanbanCard
							index={index}
							key={task.id}
							onEdit={onTaskEdit}
							task={task}
						/>
					))
				)}
			</div>

			{/* Column capacity indicator */}
			{column.maxItems && (
				<div className="mt-4 border-muted-foreground/20 border-t pt-3">
					<div className="flex items-center justify-between text-muted-foreground text-xs">
						<span>Capacity</span>
						<span
							className={
								tasks.length > column.maxItems ? "font-medium text-red-500" : ""
							}
						>
							{tasks.length} / {column.maxItems}
						</span>
					</div>
					<div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
						<div
							className={`h-full transition-all duration-300 ${
								tasks.length > column.maxItems ? "bg-red-500" : "bg-blue-500"
							}`}
							style={{
								width: `${Math.min((tasks.length / column.maxItems) * 100, 100)}%`,
							}}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
