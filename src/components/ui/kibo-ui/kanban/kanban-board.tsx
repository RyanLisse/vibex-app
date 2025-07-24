"use client";

/**
 * Kibo-UI Kanban Board Component
 * Advanced kanban board with drag-and-drop, real-time sync, and customization
 */

import {
	closestCorners,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertCircle, Plus } from "lucide-react";
import type React from "react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import { KanbanColumn } from "./kanban-column";

export interface KanbanItem {
	id: string;
	title: string;
	description?: string;
	columnId: string;
	position: number;
	priority?: "low" | "medium" | "high" | "critical";
	assignee?: {
		id: string;
		name: string;
		avatar?: string;
	};
	dueDate?: Date;
	labels?: Array<{ id: string; name: string; color: string }>;
	attachments?: number;
	comments?: number;
	metadata?: Record<string, any>;
}

export interface KanbanColumn {
	id: string;
	title: string;
	color?: string;
	limit?: number;
	items: KanbanItem[];
}

interface KanbanBoardProps {
	columns: KanbanColumn[];
	onItemMove?: (itemId: string, fromColumn: string, toColumn: string, newPosition: number) => void;
	onItemUpdate?: (itemId: string, updates: Partial<KanbanItem>) => void;
	onColumnAdd?: (title: string) => void;
	onItemAdd?: (columnId: string, item: Omit<KanbanItem, "id" | "position">) => void;
	className?: string;
	readOnly?: boolean;
	showColumnLimits?: boolean;
	customCardRenderer?: (item: KanbanItem) => React.ReactNode;
}

export function KanbanBoard({
	columns,
	onItemMove,
	onItemUpdate,
	onColumnAdd,
	onItemAdd,
	className,
	readOnly = false,
	showColumnLimits = true,
	customCardRenderer,
}: KanbanBoardProps) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		})
	);

	const handleDragStart = (event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	};

	const handleDragOver = (event: DragOverEvent) => {
		setOverId(event.over?.id as string | null);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || !onItemMove || readOnly) {
			setActiveId(null);
			setOverId(null);
			return;
		}

		const activeId = active.id as string;
		const overId = over.id as string;

		// Find the item and its current column
		let fromColumn: KanbanColumn | undefined;
		let activeItem: KanbanItem | undefined;

		for (const column of columns) {
			const item = column.items.find((i) => i.id === activeId);
			if (item) {
				fromColumn = column;
				activeItem = item;
				break;
			}
		}

		if (!fromColumn || !activeItem) {
			setActiveId(null);
			setOverId(null);
			return;
		}

		// Determine target column and position
		let toColumn: KanbanColumn | undefined;
		let newPosition = 0;

		// Check if dropped on a column
		const targetColumn = columns.find((col) => col.id === overId);
		if (targetColumn) {
			toColumn = targetColumn;
			newPosition = targetColumn.items.length;
		} else {
			// Dropped on an item - find its column
			for (const column of columns) {
				const itemIndex = column.items.findIndex((i) => i.id === overId);
				if (itemIndex !== -1) {
					toColumn = column;
					newPosition = itemIndex;
					break;
				}
			}
		}

		if (toColumn) {
			// Check column limit
			if (
				showColumnLimits &&
				toColumn.limit &&
				toColumn.id !== fromColumn.id &&
				toColumn.items.length >= toColumn.limit
			) {
				// Column is full
				setActiveId(null);
				setOverId(null);
				return;
			}

			onItemMove(activeId, fromColumn.id, toColumn.id, newPosition);
		}

		setActiveId(null);
		setOverId(null);
	};

	const getActiveItem = (): KanbanItem | null => {
		if (!activeId) return null;

		for (const column of columns) {
			const item = column.items.find((i) => i.id === activeId);
			if (item) return item;
		}
		return null;
	};

	const activeItem = getActiveItem();

	return (
		<div className={cn("kanban-board", className)}>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCorners}
				onDragStart={handleDragStart}
				onDragOver={handleDragOver}
				onDragEnd={handleDragEnd}
			>
				<div className="flex gap-4 overflow-x-auto pb-4">
					{columns.map((column) => (
						<KanbanColumn
							key={column.id}
							column={column}
							showLimit={showColumnLimits}
							isOver={overId === column.id}
							readOnly={readOnly}
							onItemAdd={onItemAdd}
							customCardRenderer={customCardRenderer}
						/>
					))}

					{onColumnAdd && !readOnly && (
						<Card className="min-w-[300px] p-4 border-dashed">
							<Button
								onClick={() => {
									const title = prompt("Enter column title:");
									if (title) onColumnAdd(title);
								}}
								variant="ghost"
								className="w-full justify-start"
							>
								<Plus className="h-4 w-4 mr-2" />
								Add Column
							</Button>
						</Card>
					)}
				</div>

				<DragOverlay>
					{activeItem && (
						<div className="opacity-80">
							{customCardRenderer ? (
								customCardRenderer(activeItem)
							) : (
								<KanbanCard item={activeItem} />
							)}
						</div>
					)}
				</DragOverlay>
			</DndContext>

			{showColumnLimits && columns.some((col) => col.limit && col.items.length >= col.limit) && (
				<Alert className="mt-4">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						Some columns have reached their WIP limit. Consider moving items to other columns.
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
