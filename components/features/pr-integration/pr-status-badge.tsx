"use client";

import type { PRStatus } from "@/src/schemas/enhanced-task-schemas";

interface PRStatusBadgeProps {
	status: PRStatus;
	className?: string;
}

export function PRStatusBadge({ status, className = "" }: PRStatusBadgeProps) {
	const getStatusStyles = (status: PRStatus) => {
		switch (status) {
			case "open":
				return "bg-green-100 text-green-800 border-green-200";
			case "closed":
				return "bg-red-100 text-red-800 border-red-200";
			case "merged":
				return "bg-purple-100 text-purple-800 border-purple-200";
			case "draft":
				return "bg-gray-100 text-gray-800 border-gray-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	return (
		<span
			className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-md border ${getStatusStyles(status)} ${className}`}
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
}
