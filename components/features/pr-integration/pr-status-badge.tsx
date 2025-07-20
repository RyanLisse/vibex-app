"use client";

import { Badge } from "@/components/ui/badge";
import type { PRStatus } from "@/src/schemas/enhanced-task-schemas";

interface PRStatusBadgeProps {
	status: PRStatus["status"];
	reviewStatus: PRStatus["reviewStatus"];
	className?: string;
}

export function PRStatusBadge({
	status,
	reviewStatus,
	className = "",
}: PRStatusBadgeProps) {
	const getStatusConfig = () => {
		switch (status) {
			case "draft":
				return {
					label: "Draft",
					variant: "secondary" as const,
					className: "status-draft bg-gray-100 text-gray-800",
				};
			case "open":
				return {
					label: "Open",
					variant: "default" as const,
					className: "status-open bg-green-100 text-green-800",
				};
			case "merged":
				return {
					label: "Merged",
					variant: "default" as const,
					className: "status-merged bg-purple-100 text-purple-800",
				};
			case "closed":
				return {
					label: "Closed",
					variant: "destructive" as const,
					className: "status-closed bg-red-100 text-red-800",
				};
			default:
				return {
					label: status,
					variant: "secondary" as const,
					className: "bg-gray-100 text-gray-800",
				};
		}
	};

	const getReviewConfig = () => {
		switch (reviewStatus) {
			case "approved":
				return {
					label: "Approved",
					className: "review-approved bg-green-100 text-green-800",
				};
			case "changes_requested":
				return {
					label: "Changes Requested",
					className: "review-changes-requested bg-yellow-100 text-yellow-800",
				};
			case "pending":
				return {
					label: "Review Pending",
					className: "review-pending bg-blue-100 text-blue-800",
				};
			default:
				return {
					label: reviewStatus,
					className: "bg-gray-100 text-gray-800",
				};
		}
	};

	const statusConfig = getStatusConfig();
	const reviewConfig = getReviewConfig();

	return (
		<div className={`flex items-center gap-2 ${className}`}>
			<Badge
				className={statusConfig.className}
				data-testid="pr-status-badge"
				variant={statusConfig.variant}
			>
				{statusConfig.label}
			</Badge>

			{status === "open" && (
				<Badge
					className={reviewConfig.className}
					data-testid="review-status"
					variant="outline"
				>
					{reviewConfig.label}
				</Badge>
			)}
		</div>
	);
}
