"use client";

import { AlertTriangle, Bell, Info, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AlertItem {
	id: string;
	type: "warning" | "error" | "info";
	title: string;
	message: string;
	taskId?: string;
	createdAt: Date;
}

interface AlertSystemProps {
	alerts: AlertItem[];
	onDismiss: (alertId: string) => void;
	maxVisible?: number;
	autoHideDelay?: number; // in milliseconds, 0 to disable
	className?: string;
}

export function AlertSystem({
	alerts,
	onDismiss,
	maxVisible = 5,
	autoHideDelay = 0,
	className = "",
}: AlertSystemProps) {
	const [visibleAlerts, setVisibleAlerts] = useState<AlertItem[]>([]);
	const [isExpanded, setIsExpanded] = useState(false);

	// Update visible alerts when alerts change
	useEffect(() => {
		const sortedAlerts = [...alerts].sort((a, b) => {
			// Sort by priority: error > warning > info
			const priorityOrder = { error: 3, warning: 2, info: 1 };
			if (priorityOrder[a.type] !== priorityOrder[b.type]) {
				return priorityOrder[b.type] - priorityOrder[a.type];
			}
			// Then by creation time (newest first)
			return b.createdAt.getTime() - a.createdAt.getTime();
		});

		setVisibleAlerts(isExpanded ? sortedAlerts : sortedAlerts.slice(0, maxVisible));
	}, [alerts, maxVisible, isExpanded]);

	// Auto-hide alerts if delay is set
	useEffect(() => {
		if (autoHideDelay > 0) {
			const timers = alerts.map((alert) => {
				return setTimeout(() => {
					onDismiss(alert.id);
				}, autoHideDelay);
			});

			return () => {
				timers.forEach((timer) => clearTimeout(timer));
			};
		}
	}, [alerts, autoHideDelay, onDismiss]);

	const getAlertIcon = (type: string) => {
		switch (type) {
			case "error":
				return <AlertTriangle className="h-4 w-4" />;
			case "warning":
				return <AlertTriangle className="h-4 w-4" />;
			case "info":
				return <Info className="h-4 w-4" />;
			default:
				return <Bell className="h-4 w-4" />;
		}
	};

	const getAlertVariant = (type: string) => {
		switch (type) {
			case "error":
				return "destructive";
			case "warning":
				return "default"; // Will be styled as warning
			case "info":
				return "default";
			default:
				return "default";
		}
	};

	const getAlertClasses = (type: string) => {
		switch (type) {
			case "error":
				return "border-red-200 bg-red-50 text-red-800";
			case "warning":
				return "border-yellow-200 bg-yellow-50 text-yellow-800";
			case "info":
				return "border-blue-200 bg-blue-50 text-blue-800";
			default:
				return "";
		}
	};

	const formatTimeAgo = (date: Date) => {
		const now = new Date();
		const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

		if (diffInMinutes < 1) return "Just now";
		if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

		const diffInHours = Math.floor(diffInMinutes / 60);
		if (diffInHours < 24) return `${diffInHours}h ago`;

		const diffInDays = Math.floor(diffInHours / 24);
		return `${diffInDays}d ago`;
	};

	if (alerts.length === 0) {
		return null;
	}

	const errorCount = alerts.filter((a) => a.type === "error").length;
	const warningCount = alerts.filter((a) => a.type === "warning").length;
	const infoCount = alerts.filter((a) => a.type === "info").length;

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						<Bell className="h-5 w-5" />
						Alerts ({alerts.length})
					</CardTitle>
					<div className="flex items-center gap-2">
						{/* Alert counts */}
						<div className="flex items-center gap-2 text-sm">
							{errorCount > 0 && (
								<span className="flex items-center gap-1 text-red-600">
									<AlertTriangle className="h-3 w-3" />
									{errorCount}
								</span>
							)}
							{warningCount > 0 && (
								<span className="flex items-center gap-1 text-yellow-600">
									<AlertTriangle className="h-3 w-3" />
									{warningCount}
								</span>
							)}
							{infoCount > 0 && (
								<span className="flex items-center gap-1 text-blue-600">
									<Info className="h-3 w-3" />
									{infoCount}
								</span>
							)}
						</div>

						{/* Expand/Collapse button */}
						{alerts.length > maxVisible && (
							<Button variant="outline" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
								{isExpanded ? "Show Less" : `Show All (${alerts.length})`}
							</Button>
						)}

						{/* Dismiss all button */}
						<Button
							variant="outline"
							size="sm"
							onClick={() => alerts.forEach((alert) => onDismiss(alert.id))}
							className="text-red-600 hover:text-red-700"
						>
							Dismiss All
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					{visibleAlerts.map((alert) => (
						<Alert
							key={alert.id}
							variant={getAlertVariant(alert.type) as any}
							className={`relative ${getAlertClasses(alert.type)}`}
						>
							<div className="flex items-start justify-between">
								<div className="flex items-start gap-3 flex-1 min-w-0">
									{getAlertIcon(alert.type)}
									<div className="flex-1 min-w-0">
										<AlertTitle className="text-sm font-medium">{alert.title}</AlertTitle>
										<AlertDescription className="text-sm mt-1">{alert.message}</AlertDescription>
										<div className="flex items-center justify-between mt-2">
											<span className="text-xs opacity-75">{formatTimeAgo(alert.createdAt)}</span>
											{alert.taskId && (
												<span className="text-xs opacity-75">
													Task ID: {alert.taskId.slice(0, 8)}...
												</span>
											)}
										</div>
									</div>
								</div>

								<Button
									variant="ghost"
									size="sm"
									onClick={() => onDismiss(alert.id)}
									className="h-6 w-6 p-0 opacity-70 hover:opacity-100"
								>
									<X className="h-3 w-3" />
								</Button>
							</div>
						</Alert>
					))}
				</div>

				{/* Show more indicator */}
				{!isExpanded && alerts.length > maxVisible && (
					<div className="text-center mt-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsExpanded(true)}
							className="text-sm text-gray-600 hover:text-gray-800"
						>
							+{alerts.length - maxVisible} more alerts
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
