"use client";
import { Announcements,
import { DragStartEvent
} from "@dnd-kit/core";
	import { closestCenter,
import { DndContext,
import { TouchSensor,
	useDroppable,
	useSensor,
	useSensors
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
	createContext,
	type HTMLAttributes,
	type ReactNode,
	useContext,
	useState
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

type KanbanContextProps<
T extends KanbanItemProps = KanbanItemProps,