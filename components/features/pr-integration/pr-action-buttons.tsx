"use client";

import { ExternalLink, GitMerge, MessageSquare, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PRData } from "./pr-status-card";

interface PRActionButtonsProps {
	pr: PRData;
	onAction?: (action: string, prId: string) => void;
	taskId?: string;
	className?: string;
}

export function PRActionButtons({ pr, onAction, taskId, className = "" }: PRActionButtonsProps) {
	const handleAction = (action: string) => {
		onAction?.(action, pr.id);
	};

	const canMerge =
		pr.status === "open" &&
		pr.mergeable &&
		!pr.conflicted &&
		pr.checks.failed === 0 &&
		pr.reviews.approved > 0 &&
		pr.reviews.changesRequested === 0;

	const canClose = pr.status === "open" || pr.status === "draft";
	const canReopen = pr.status === "closed";

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			{/* Primary Actions */}
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={() => window.open(pr.url, "_blank")}
					className="flex items-center gap-1"
				>
					<ExternalLink className="h-3 w-3" />
					View PR
				</Button>

				{pr.status === "open" && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleAction("refresh")}
						className="flex items-center gap-1"
					>
						<RefreshCw className="h-3 w-3" />
						Refresh
					</Button>
				)}

				{canMerge && (
					<Button
						size="sm"
						onClick={() => handleAction("merge")}
						className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
					>
						<GitMerge className="h-3 w-3" />
						Merge
					</Button>
				)}
			</div>

			{/* More Actions Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild={true}>
					<Button variant="outline" size="sm">
						More
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem onClick={() => handleAction("add-comment")}>
						<MessageSquare className="h-4 w-4 mr-2" />
						Add Comment
					</DropdownMenuItem>

					{pr.status === "draft" && (
						<DropdownMenuItem onClick={() => handleAction("ready-for-review")}>
							Ready for Review
						</DropdownMenuItem>
					)}

					{pr.status === "open" && (
						<DropdownMenuItem onClick={() => handleAction("convert-to-draft")}>
							Convert to Draft
						</DropdownMenuItem>
					)}

					{canClose && (
						<DropdownMenuItem onClick={() => handleAction("close")} className="text-red-600">
							<X className="h-4 w-4 mr-2" />
							Close PR
						</DropdownMenuItem>
					)}

					{canReopen && (
						<DropdownMenuItem onClick={() => handleAction("reopen")}>Reopen PR</DropdownMenuItem>
					)}

					{pr.status === "open" && pr.conflicted && (
						<DropdownMenuItem onClick={() => handleAction("resolve-conflicts")}>
							Resolve Conflicts
						</DropdownMenuItem>
					)}

					{taskId && (
						<>
							<DropdownMenuItem onClick={() => handleAction("link-to-task")}>
								Link to Task
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => handleAction("unlink-from-task")}>
								Unlink from Task
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

import { Button } from "@/components/ui/button";
import type { TaskPRLink } from "@/src/schemas/enhanced-task-schemas";

interface PRActionButtonsProps {
	prLink: TaskPRLink;
	onRefresh?: () => void;
	onUnlink?: () => void;
}

export function PRActionButtons({ prLink, onRefresh, onUnlink }: PRActionButtonsProps) {
	const handleOpenPR = () => {
		window.open(prLink.prUrl, "_blank");
	};

	return (
		<div className="flex gap-2">
			<Button variant="outline" size="sm" onClick={handleOpenPR}>
				View PR
			</Button>
			{onRefresh && (
				<Button variant="outline" size="sm" onClick={onRefresh}>
					Refresh
				</Button>
			)}
			{onUnlink && (
				<Button variant="destructive" size="sm" onClick={onUnlink}>
					Unlink
				</Button>
			)}
		</div>
	);
}
