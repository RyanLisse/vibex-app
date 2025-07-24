"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { MoreHorizontal, Plus } from "lucide-react";
import type React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { KanbanColumn as KanbanColumnType, KanbanItem } from "./kanban-board";
import { KanbanCard } from "./kanban-card";

interface KanbanColumnProps {
	column: KanbanColumnType;
	showLimit?: boolean;
	isOver?: boolean;
	readOnly?: boolean;
	onItemAdd?: (columnId: string, item: Omit<KanbanItem, "id" | "position">) => void;
	customCardRenderer?: (item: KanbanItem) => React.ReactNode;
}

export function KanbanColumn({
	column,
	showLimit = true,
	isOver = false,
	readOnly = false,
	onItemAdd,
	customCardRenderer,
}: KanbanColumnProps) {
	const { setNodeRef, isOver: isDropOver } = useDroppable({
		id: column.id,
	});

	const handleAddItem = () => {
		const title = prompt("Enter task title:");
		if (title && onItemAdd) {
			onItemAdd(column.id, {
				title,
				columnId: column.id,
			});
		}
	};

	const isAtLimit = showLimit && column.limit && column.items.length >= column.limit;

	return (
		<Card
			ref={setNodeRef}
			className={cn(
				"kanban-column min-w-[300px] transition-colors",
				(isOver || isDropOver) && "border-primary",
				isAtLimit && "border-orange-500"
			)}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<CardTitle className="text-base font-medium">{column.title}</CardTitle>
						<Badge variant="secondary" className="text-xs">
							{column.items.length}
							{showLimit && column.limit && ` / ${column.limit}`}
						</Badge>
					</div>
					{!readOnly && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild={true}>
								<Button variant="ghost" size="icon" className="h-8 w-8">
									<MoreHorizontal className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>Set WIP Limit</DropdownMenuItem>
								<DropdownMenuItem>Clear Column</DropdownMenuItem>
								<DropdownMenuItem className="text-destructive">Delete Column</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			</CardHeader>
			<CardContent className="p-2">
				<SortableContext
					items={column.items.map((item) => item.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="space-y-2 min-h-[100px]">
						{column.items.map((item) => (
							<div key={item.id}>
								{customCardRenderer ? (
									customCardRenderer(item)
								) : (
									<KanbanCard item={item} readOnly={readOnly} />
								)}
							</div>
						))}
					</div>
				</SortableContext>

				{!readOnly && onItemAdd && !isAtLimit && (
					<Button
						onClick={handleAddItem}
						variant="ghost"
						size="sm"
						className="w-full mt-2 justify-start"
					>
						<Plus className="h-4 w-4 mr-2" />
						Add Item
					</Button>
				)}

				{isAtLimit && (
					<div className="text-xs text-orange-600 text-center mt-2">WIP limit reached</div>
				)}
			</CardContent>
		</Card>
	);
}
