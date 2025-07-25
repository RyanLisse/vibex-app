"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { KanbanColumn as KanbanColumnType, KanbanTask } from "./kanban-board";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
	column: KanbanColumnType;
	onTaskCreate?: () => void;
	onTaskUpdate?: (taskId: string, updates: Partial<KanbanTask>) => void;
	onTaskDelete?: (taskId: string) => void;
	isActive?: boolean;
}

export function KanbanColumn({
	column,
	onTaskCreate,
	onTaskUpdate,
	onTaskDelete,
	isActive = false,
}: KanbanColumnProps) {
	const {
		attributes,
		listeners,
		setNodeRef: setSortableRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: column.id,
		data: {
			type: "column",
			column,
		},
	});

	const { setNodeRef: setDroppableRef, isOver } = useDroppable({
		id: column.id,
		data: {
			type: "column",
			column,
		},
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const isOverLimit = column.limit && column.tasks.length >= column.limit;

	return (
		<div
			ref={setSortableRef}
			style={style}
			className={`flex-shrink-0 w-80 ${isDragging ? "opacity-50" : ""}`}
		>
			<Card
				className={`h-full ${isOver ? "ring-2 ring-blue-500" : ""} ${
					isActive ? "ring-2 ring-gray-400" : ""
				}`}
			>
				<CardHeader
					className="pb-3 cursor-grab active:cursor-grabbing"
					{...attributes}
					{...listeners}
				>
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							{column.color && (
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: column.color }} />
							)}
							<CardTitle className="text-lg">{column.title}</CardTitle>
							<span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
								{column.tasks.length}
								{column.limit && `/${column.limit}`}
							</span>
						</div>

						<div className="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								onClick={onTaskCreate}
								disabled={isOverLimit}
								className="h-8 w-8 p-0"
							>
								<Plus className="h-4 w-4" />
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild={true}>
									<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
										<MoreVertical className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={onTaskCreate}>Add Task</DropdownMenuItem>
									<DropdownMenuItem>Edit Column</DropdownMenuItem>
									<DropdownMenuItem className="text-red-600">Delete Column</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					</div>

					{isOverLimit && (
						<div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
							Column limit reached ({column.limit})
						</div>
					)}
				</CardHeader>

				<CardContent
					ref={setDroppableRef}
					className="flex-1 space-y-3 min-h-[200px] max-h-[600px] overflow-y-auto"
				>
					<SortableContext
						items={column.tasks.map((task) => task.id)}
						strategy={verticalListSortingStrategy}
					>
						{column.tasks.map((task) => (
							<KanbanCard
								key={task.id}
								task={task}
								onUpdate={onTaskUpdate}
								onDelete={onTaskDelete}
							/>
						))}
					</SortableContext>

					{column.tasks.length === 0 && (
						<div className="flex items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
							<div className="text-center">
								<p className="text-sm font-medium">No tasks</p>
								<p className="text-xs">Drop tasks here or click + to add</p>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

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
