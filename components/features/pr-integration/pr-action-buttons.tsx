"use client";

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
