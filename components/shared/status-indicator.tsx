"use client";

import {
	AlertCircle,
	CheckCircle,
	Clock,
	Pause,
	Play,
	RefreshCw,
	XCircle,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StatusIndicatorProps {
	status: string;
	variant?: "default" | "compact" | "detailed";
	showIcon?: boolean;
	className?: string;
}

export function StatusIndicator({
	status,
	variant = "default",
	showIcon = true,
	className = "",
}: StatusIndicatorProps) {
	const getStatusConfig = (status: string) => {
		const lowerStatus = status.toLowerCase();

		const configs: Record<
			string,
			{
				color: "default" | "secondary" | "destructive" | "outline";
				icon: React.ReactNode;
				label: string;
				bgColor?: string;
			}
		> = {
			// Execution statuses
			running: {
				color: "default",
				icon: <Play className="h-3 w-3" />,
				label: "Running",
				bgColor:
					"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
			},
			completed: {
				color: "default",
				icon: <CheckCircle className="h-3 w-3" />,
				label: "Completed",
				bgColor:
					"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
			},
			failed: {
				color: "destructive",
				icon: <XCircle className="h-3 w-3" />,
				label: "Failed",
				bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
			},
			paused: {
				color: "secondary",
				icon: <Pause className="h-3 w-3" />,
				label: "Paused",
				bgColor:
					"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
			},
			pending: {
				color: "outline",
				icon: <Clock className="h-3 w-3" />,
				label: "Pending",
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			},
			cancelled: {
				color: "secondary",
				icon: <XCircle className="h-3 w-3" />,
				label: "Cancelled",
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			},
			error: {
				color: "destructive",
				icon: <AlertCircle className="h-3 w-3" />,
				label: "Error",
				bgColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
			},

			// Workflow statuses
			draft: {
				color: "outline",
				icon: <Clock className="h-3 w-3" />,
				label: "Draft",
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			},
			active: {
				color: "default",
				icon: <Zap className="h-3 w-3" />,
				label: "Active",
				bgColor:
					"bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
			},
			archived: {
				color: "secondary",
				icon: <Clock className="h-3 w-3" />,
				label: "Archived",
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			},

			// Processing statuses
			processing: {
				color: "default",
				icon: <RefreshCw className="h-3 w-3 animate-spin" />,
				label: "Processing",
				bgColor:
					"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
			},
			in_progress: {
				color: "default",
				icon: <RefreshCw className="h-3 w-3 animate-spin" />,
				label: "In Progress",
				bgColor:
					"bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
			},
			warning: {
				color: "secondary",
				icon: <AlertCircle className="h-3 w-3" />,
				label: "Warning",
				bgColor:
					"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
			},
			stopped: {
				color: "secondary",
				icon: <XCircle className="h-3 w-3" />,
				label: "Stopped",
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			},
		};

		return (
			configs[lowerStatus] || {
				color: "outline" as const,
				icon: <AlertCircle className="h-3 w-3" />,
				label: status,
				bgColor:
					"bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
			}
		);
	};

	const config = getStatusConfig(status);

	if (variant === "compact") {
		return (
			<div className={`inline-flex items-center ${className}`}>
				{showIcon && config.icon}
			</div>
		);
	}

	if (variant === "detailed") {
		return (
			<div
				className={`inline-flex items-center space-x-2 rounded-md px-2 py-1 ${config.bgColor} ${className}`}
			>
				{showIcon && config.icon}
				<span className="font-medium text-xs">{config.label}</span>
			</div>
		);
	}

	return (
		<Badge className={`${className}`} variant={config.color}>
			{showIcon && <span className="mr-1">{config.icon}</span>}
			{config.label}
		</Badge>
	);
}

export function MultiStatusIndicator({
	statuses,
	className = "",
}: {
	statuses: Array<{ status: string; count?: number }>;
	className?: string;
}) {
	return (
		<div className={`flex items-center space-x-1 ${className}`}>
			{statuses.map(({ status, count }, index) => (
				<div className="flex items-center space-x-1" key={index}>
					<StatusIndicator status={status} variant="compact" />
					{count && (
						<span className="text-muted-foreground text-xs">{count}</span>
					)}
				</div>
			))}
		</div>
	);
}
