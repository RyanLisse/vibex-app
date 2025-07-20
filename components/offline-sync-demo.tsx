"use client";

import {
	AlertCircle,
	CheckCircle,
	Clock,
	Database,
	Loader2,
	RefreshCw,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useOfflineSync } from "@/hooks/use-offline-sync";

/**
 * Demo component showcasing offline-first functionality
 */
export function OfflineSyncDemo() {
	const {
		isOnline,
		isOffline,
		syncInProgress,
		lastSyncTime,
		syncErrors,
		queueOperation,
		manualSync,
		clearQueue,
		getStats,
		testOfflineMode,
	} = useOfflineSync();

	const [testData, setTestData] = useState({
		taskTitle: "Sample Offline Task",
		taskStatus: "pending",
	});

	const stats = getStats();

	const handleCreateTask = () => {
		queueOperation("insert", "tasks", {
			title: testData.taskTitle,
			status: testData.taskStatus,
			description: "Created while offline",
			priority: "medium",
			userId: "demo-user",
		});

		// Update task title for next operation
		setTestData((prev) => ({
			...prev,
			taskTitle: `Task ${Date.now()}`,
		}));
	};

	const handleUpdateTask = () => {
		queueOperation("update", "tasks", {
			id: "demo-task-id",
			title: "Updated Offline Task",
			status: "in_progress",
			updatedAt: new Date().toISOString(),
		});
	};

	const handleDeleteTask = () => {
		queueOperation("delete", "tasks", {
			id: "demo-task-to-delete",
		});
	};

	const getConnectionStatus = () => {
		if (isOnline) {
			return {
				icon: <Wifi className="h-4 w-4" />,
				label: "Online",
				variant: "default" as const,
				description: "Connected to server",
			};
		}
		return {
			icon: <WifiOff className="h-4 w-4" />,
			label: "Offline",
			variant: "destructive" as const,
			description: "Working offline - changes will sync when reconnected",
		};
	};

	const connectionStatus = getConnectionStatus();

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Database className="h-5 w-5" />
						Offline-First Sync Demo
					</CardTitle>
					<CardDescription>
						Test ElectricSQL offline functionality, queue management, and sync
						resume
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Connection Status */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Badge
								className="flex items-center gap-1"
								variant={connectionStatus.variant}
							>
								{connectionStatus.icon}
								{connectionStatus.label}
							</Badge>
							<span className="text-muted-foreground text-sm">
								{connectionStatus.description}
							</span>
						</div>

						{syncInProgress && (
							<div className="flex items-center gap-2 text-muted-foreground text-sm">
								<Loader2 className="h-4 w-4 animate-spin" />
								Syncing...
							</div>
						)}
					</div>

					{/* Sync Statistics */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="text-center">
							<div className="font-bold text-2xl">{stats.queueSize}</div>
							<div className="text-muted-foreground text-sm">
								Queued Operations
							</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl">
								{stats.pendingOperations}
							</div>
							<div className="text-muted-foreground text-sm">Pending</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl">{stats.failedOperations}</div>
							<div className="text-muted-foreground text-sm">Failed</div>
						</div>
						<div className="text-center">
							<div className="font-bold text-2xl">
								{lastSyncTime ? "✓" : "—"}
							</div>
							<div className="text-muted-foreground text-sm">Last Sync</div>
						</div>
					</div>

					{/* Last Sync Time */}
					{lastSyncTime && (
						<div className="flex items-center gap-2 text-muted-foreground text-sm">
							<Clock className="h-4 w-4" />
							Last synced: {lastSyncTime.toLocaleTimeString()}
						</div>
					)}

					{/* Sync Errors */}
					{syncErrors.length > 0 && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								<div className="space-y-1">
									<div className="font-medium">Sync Errors:</div>
									{syncErrors.map((error, index) => (
										<div className="text-sm" key={index}>
											{error}
										</div>
									))}
								</div>
							</AlertDescription>
						</Alert>
					)}

					{/* Test Operations */}
					<div className="space-y-3">
						<h4 className="font-medium">Test Operations</h4>

						<div className="grid grid-cols-1 gap-2 md:grid-cols-3">
							<Button
								className="flex items-center gap-2"
								onClick={handleCreateTask}
								size="sm"
								variant="outline"
							>
								<CheckCircle className="h-4 w-4" />
								Create Task
							</Button>

							<Button
								className="flex items-center gap-2"
								onClick={handleUpdateTask}
								size="sm"
								variant="outline"
							>
								<RefreshCw className="h-4 w-4" />
								Update Task
							</Button>

							<Button
								className="flex items-center gap-2"
								onClick={handleDeleteTask}
								size="sm"
								variant="outline"
							>
								<Trash2 className="h-4 w-4" />
								Delete Task
							</Button>
						</div>
					</div>

					{/* Manual Controls */}
					<div className="flex gap-2 border-t pt-4">
						<Button
							className="flex items-center gap-2"
							disabled={isOffline || syncInProgress}
							onClick={manualSync}
							size="sm"
							variant="default"
						>
							{syncInProgress ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<RefreshCw className="h-4 w-4" />
							)}
							Manual Sync
						</Button>

						<Button onClick={testOfflineMode} size="sm" variant="outline">
							Test Offline Mode
						</Button>

						<Button
							disabled={stats.queueSize === 0}
							onClick={clearQueue}
							size="sm"
							variant="destructive"
						>
							Clear Queue
						</Button>
					</div>

					{/* Instructions */}
					<Alert>
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							<div className="space-y-2">
								<div className="font-medium">How to test:</div>
								<ol className="list-inside list-decimal space-y-1 text-sm">
									<li>Click "Create Task" to queue operations</li>
									<li>
										Open DevTools → Network → Go offline to simulate connection
										loss
									</li>
									<li>Continue creating tasks (they'll be queued locally)</li>
									<li>Go back online to see automatic sync resume</li>
									<li>Use "Manual Sync" to force synchronization</li>
								</ol>
							</div>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		</div>
	);
}
