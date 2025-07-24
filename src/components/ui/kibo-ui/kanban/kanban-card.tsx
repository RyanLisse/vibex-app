"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Clock,
	MessageSquare,
	Paperclip,
	User,
	XCircle,
} from "lucide-react";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { KanbanItem } from "./kanban-board";

interface KanbanCardProps {
	item: KanbanItem;
	readOnly?: boolean;
	onClick?: (item: KanbanItem) => void;
}

export function KanbanCard({ item, readOnly = false, onClick }: KanbanCardProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: item.id,
		disabled: readOnly,
	});

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const getPriorityColor = (priority?: string) => {
		switch (priority) {
			case "critical":
				return "destructive";
			case "high":
				return "default";
			case "medium":
				return "secondary";
			case "low":
				return "outline";
			default:
				return "secondary";
		}
	};

	const getPriorityIcon = (priority?: string) => {
		switch (priority) {
			case "critical":
				return <AlertCircle className="h-3 w-3" />;
			case "high":
				return <XCircle className="h-3 w-3" />;
			case "medium":
				return <CheckCircle className="h-3 w-3" />;
			default:
				return null;
		}
	};

	const isOverdue = item.dueDate && new Date(item.dueDate) < new Date();

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className={cn(
				"kanban-card cursor-pointer transition-all hover:shadow-md",
				isDragging && "opacity-50 rotate-3",
				isOverdue && "border-red-500"
			)}
			onClick={() => onClick?.(item)}
			{...attributes}
			{...listeners}
		>
			<CardContent className="p-3 space-y-2">
				{/* Title and Priority */}
				<div className="flex items-start justify-between gap-2">
					<h4 className="text-sm font-medium line-clamp-2">{item.title}</h4>
					{item.priority && (
						<Badge variant={getPriorityColor(item.priority)} className="shrink-0">
							<span className="flex items-center gap-1">
								{getPriorityIcon(item.priority)}
								{item.priority}
							</span>
						</Badge>
					)}
				</div>

				{/* Description */}
				{item.description && (
					<p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
				)}

				{/* Labels */}
				{item.labels && item.labels.length > 0 && (
					<div className="flex flex-wrap gap-1">
						{item.labels.map((label) => (
							<span
								key={label.id}
								className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
								style={{
									backgroundColor: `${label.color}20`,
									color: label.color,
								}}
							>
								{label.name}
							</span>
						))}
					</div>
				)}

				{/* Footer */}
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						{/* Due Date */}
						{item.dueDate && (
							<div
								className={cn("flex items-center gap-1", isOverdue && "text-red-600 font-medium")}
							>
								<Calendar className="h-3 w-3" />
								{new Date(item.dueDate).toLocaleDateString()}
							</div>
						)}

						{/* Attachments */}
						{item.attachments && item.attachments > 0 && (
							<div className="flex items-center gap-1">
								<Paperclip className="h-3 w-3" />
								{item.attachments}
							</div>
						)}

						{/* Comments */}
						{item.comments && item.comments > 0 && (
							<div className="flex items-center gap-1">
								<MessageSquare className="h-3 w-3" />
								{item.comments}
							</div>
						)}
					</div>

					{/* Assignee */}
					{item.assignee && (
						<Avatar className="h-6 w-6">
							<AvatarImage src={item.assignee.avatar} alt={item.assignee.name} />
							<AvatarFallback>
								{item.assignee.name
									.split(" ")
									.map((n) => n[0])
									.join("")}
							</AvatarFallback>
						</Avatar>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
