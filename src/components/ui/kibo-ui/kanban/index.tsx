"use client";

import {
	Announcements,
	closestCenter,
	DndContext,
	DragStartEvent,
	TouchSensor,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
	createContext,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useState,
} from "react";
import { cn } from "@/lib/utils";

const t = tunnel();

export type { DragEndEvent } from "@dnd-kit/core";

type KanbanItemProps = {
	id: string;
	name: string;
	column: string;
} & Record<string, unknown>;

type KanbanColumnProps = {
	id: string;
	name: string;
} & Record<string, unknown>;

type KanbanContextProps<T extends KanbanItemProps = KanbanItemProps> = {
	items: T[];
	onItemMove?: (item: T, newColumnId: string) => void;
};

// TODO: Complete Kanban implementation
export function KanbanBoard<T extends KanbanItemProps = KanbanItemProps>({
	items,
	onItemMove,
}: KanbanContextProps<T>) {
	return (
		<div className="kanban-board">
			<div className="text-sm text-muted-foreground">
				Kanban Board - {items.length} items
			</div>
		</div>
	);
}
