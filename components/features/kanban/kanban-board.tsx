"use client";

import {
	DndContext,
	DragEndEvent,
	DragOverEvent,
	DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KanbanColumn } from "./kanban-column";
import { TaskFilters } from "./task-filters";

export interface KanbanTask {
	id: string;
	title: string;
	description?: string;
	priority: "low" | "medium" | "high" | "critical";
	assignee?: string;
	labels?: string[];
	dueDate?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface KanbanColumn {
	id: string;
	title: string;
	tasks: KanbanTask[];
	color?: string;
	limit?: number;
}

interface KanbanBoardProps {
	columns: KanbanColumn[];
	onTaskMove?: (taskId: string, fromColumnId: string, toColumnId: string, newIndex: number) => void;
	onColumnReorder?: (columnIds: string[]) => void;
	onTaskCreate?: (columnId: string, task: Partial<KanbanTask>) => void;
	onTaskUpdate?: (taskId: string, updates: Partial<KanbanTask>) => void;
	onTaskDelete?: (taskId: string) => void;
	className?: string;
}

export function KanbanBoard({
	columns,
	onTaskMove,
	onColumnReorder,
	onTaskCreate,
	onTaskUpdate,
	onTaskDelete,
	className = "",
}: KanbanBoardProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [filteredColumns, setFilteredColumns] = useState(columns);
	const [filters, setFilters] = useState({
		search: "",
		priority: "",
		assignee: "",
		labels: [] as string[],
	});

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	// Apply filters to columns
	const applyFilters = useCallback(() => {
		const filtered = columns.map((column) => ({
			...column,
			tasks: column.tasks.filter((task) => {
				// Search filter
				if (
					filters.search &&
					!task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
					!task.description?.toLowerCase().includes(filters.search.toLowerCase())
				) {
					return false;
				}

				// Priority filter
				if (filters.priority && task.priority !== filters.priority) {
					return false;
				}

				// Assignee filter
				if (filters.assignee && task.assignee !== filters.assignee) {
					return false;
				}

				// Labels filter
				if (
					filters.labels.length > 0 &&
					!filters.labels.some((label) => task.labels?.includes(label))
				) {
					return false;
				}

				return true;
			}),
		}));

		setFilteredColumns(filtered);
	}, [columns, filters]);

	// Update filtered columns when columns or filters change
	useState(() => {
		applyFilters();
	});

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragOver = (event: DragOverEvent) => {
		const { active, over } = event;

		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// Find the columns
		const activeColumn = filteredColumns.find((col) =>
			col.tasks.some((task) => task.id === activeId)
		);
		const overColumn = filteredColumns.find(
			(col) => col.id === overId || col.tasks.some((task) => task.id === overId)
		);

		if (!activeColumn || !overColumn) return;

		// If moving to a different column
		if (activeColumn.id !== overColumn.id) {
			const activeTask = activeColumn.tasks.find((task) => task.id === activeId);
			if (!activeTask) return;

			// Calculate new index
			let newIndex = overColumn.tasks.length;
			if (overColumn.tasks.some((task) => task.id === overId)) {
				newIndex = overColumn.tasks.findIndex((task) => task.id === overId);
			}

			onTaskMove?.(activeId, activeColumn.id, overColumn.id, newIndex);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		setActiveId(null);

		if (!over) return;

		const activeId = active.id as string;
		const overId = over.id as string;

		// Handle column reordering
		if (
			filteredColumns.some((col) => col.id === activeId) &&
			filteredColumns.some((col) => col.id === overId)
		) {
			const oldIndex = filteredColumns.findIndex((col) => col.id === activeId);
			const newIndex = filteredColumns.findIndex((col) => col.id === overId);

			if (oldIndex !== newIndex) {
				const newColumnOrder = [...filteredColumns];
				const [reorderedColumn] = newColumnOrder.splice(oldIndex, 1);
				newColumnOrder.splice(newIndex, 0, reorderedColumn);

				onColumnReorder?.(newColumnOrder.map((col) => col.id));
			}
		}
	};

	const handleFiltersChange = (newFilters: typeof filters) => {
		setFilters(newFilters);
	};

	const handleTaskCreate = (columnId: string) => {
		const newTask: Partial<KanbanTask> = {
			title: "New Task",
			description: "",
			priority: "medium",
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		onTaskCreate?.(columnId, newTask);
	};

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-xl">Kanban Board</CardTitle>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleTaskCreate(filteredColumns[0]?.id)}
						className="flex items-center gap-2"
						disabled={filteredColumns.length === 0}
					>
						<Plus className="h-4 w-4" />
						Add Task
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-6">
					{/* Filters */}
					<TaskFilters
						filters={filters}
						onFiltersChange={handleFiltersChange}
						availableAssignees={
							[
								...new Set(
									columns.flatMap((col) => col.tasks.map((task) => task.assignee).filter(Boolean))
								),
							] as string[]
						}
						availableLabels={[
							...new Set(columns.flatMap((col) => col.tasks.flatMap((task) => task.labels || []))),
						]}
					/>

					{/* Kanban Board */}
					<DndContext
						sensors={sensors}
						onDragStart={handleDragStart}
						onDragOver={handleDragOver}
						onDragEnd={handleDragEnd}
					>
						<div className="flex gap-6 overflow-x-auto pb-4">
							<SortableContext
								items={filteredColumns.map((col) => col.id)}
								strategy={horizontalListSortingStrategy}
							>
								{filteredColumns.map((column) => (
									<KanbanColumn
										key={column.id}
										column={column}
										onTaskCreate={() => handleTaskCreate(column.id)}
										onTaskUpdate={onTaskUpdate}
										onTaskDelete={onTaskDelete}
										isActive={activeId === column.id}
									/>
								))}
							</SortableContext>
						</div>
					</DndContext>

					{filteredColumns.length === 0 && (
						<div className="text-center py-12 text-gray-500">
							<p className="text-lg font-medium">No columns available</p>
							<p className="text-sm">Create columns to start organizing tasks</p>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

import type { KanbanColumn, KanbanTask } from "@/src/schemas/enhanced-task-schemas";

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
								<div key={task.id} className="bg-white p-3 rounded shadow-sm border">
									<h4 className="font-medium">{task.title}</h4>
									{task.description && (
										<p className="text-sm text-gray-600 mt-1">{task.description}</p>
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
											<span className="text-xs text-gray-500">{task.assignee}</span>
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
