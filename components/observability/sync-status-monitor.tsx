"use client";

import {
	Activity,
	AlertCircle,
	CheckCircle,
	Clock,
	Cloud,
	CloudOff,
	Database,
	RefreshCw,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import { enhancedSyncService } from "@/lib/electric/enhanced-sync-service";
import { cn } from "@/lib/utils";

interface SyncStatusMonitorProps {
	className?: string;
	refreshInterval?: number;
}

export function SyncStatusMonitor({
	className,
	refreshInterval = 5000,
}: SyncStatusMonitorProps) {
	const [syncStatus, setSyncStatus] = useState<any>(null);
	const [isManualSyncing, setIsManualSyncing] = useState(false);
	const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
	const [syncHistory, setSyncHistory] = useState<
		Array<{ timestamp: Date; status: "success" | "failure" }>
	>([]);

	// Fetch sync status
	const fetchSyncStatus = async () => {
		try {
			const status = enhancedSyncService.getSyncStatus();
			setSyncStatus(status);
			setLastUpdate(new Date());

			// Add to history
			if (status.metrics.lastSyncTime) {
				setSyncHistory((prev) => [
					...prev.slice(-9),
					{
						timestamp: status.metrics.lastSyncTime,
						status: status.metrics.failedSyncs > 0 ? "failure" : "success",
					},
				]);
			}
		} catch (error) {
			console.error("Failed to fetch sync status:", error);
		}
	};

	// Manual sync trigger
	const triggerManualSync = async () => {
		setIsManualSyncing(true);
		try {
			await enhancedSyncService.performFullSync();
			await fetchSyncStatus();
		} catch (error) {
			console.error("Manual sync failed:", error);
		} finally {
			setIsManualSyncing(false);
		}
	};

	// Update config
	const updateSyncConfig = (updates: any) => {
		enhancedSyncService.updateConfig(updates);
		fetchSyncStatus();
	};

	// Setup polling
	useEffect(() => {
		fetchSyncStatus();
		const interval = setInterval(fetchSyncStatus, refreshInterval);
		return () => clearInterval(interval);
	}, [refreshInterval]);

	if (!syncStatus) {
		return (
			<Card className={cn("animate-pulse", className)}>
				<CardHeader>
					<CardTitle>Sync Status Loading...</CardTitle>
				</CardHeader>
			</Card>
		);
	}

	const {
		isInitialized,
		isSyncing,
		config,
		metrics,
		connectionStatus,
		offlineQueueStatus,
	} = syncStatus;
	const isConnected = connectionStatus.isConnected;
	const syncSuccessRate =
		metrics.totalSyncs > 0
			? Math.round((metrics.successfulSyncs / metrics.totalSyncs) * 100)
			: 100;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Main Status Card */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{isConnected ? (
								<Cloud className="h-5 w-5 text-green-500" />
							) : (
								<CloudOff className="h-5 w-5 text-red-500" />
							)}
							ElectricSQL Sync Status
						</CardTitle>
						<CardDescription>
							Real-time synchronization monitoring
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Badge variant={isConnected ? "default" : "destructive"}>
							{isConnected ? "Connected" : "Disconnected"}
						</Badge>
						{isSyncing && (
							<Badge className="animate-pulse" variant="secondary">
								<RefreshCw className="mr-1 h-3 w-3 animate-spin" />
								Syncing
							</Badge>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Connection Info */}
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Sync Status</p>
							<p className="font-medium text-lg">
								{connectionStatus.syncStatus}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Last Sync</p>
							<p className="font-medium text-lg">
								{metrics.lastSyncTime
									? new Date(metrics.lastSyncTime).toLocaleTimeString()
									: "Never"}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Offline Queue</p>
							<p className="font-medium text-lg">
								{connectionStatus.offlineQueueSize || 0}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Conflicts</p>
							<p className="font-medium text-lg">
								{connectionStatus.conflictCount || 0}
							</p>
						</div>
					</div>

					{/* Sync Metrics */}
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span>Sync Success Rate</span>
							<span className="font-medium">{syncSuccessRate}%</span>
						</div>
						<Progress className="h-2" value={syncSuccessRate} />
					</div>

					{/* Actions */}
					<div className="flex gap-2">
						<Button
							disabled={isManualSyncing || isSyncing}
							onClick={triggerManualSync}
							size="sm"
						>
							{isManualSyncing ? (
								<>
									<RefreshCw className="mr-1 h-4 w-4 animate-spin" />
									Syncing...
								</>
							) : (
								<>
									<RefreshCw className="mr-1 h-4 w-4" />
									Manual Sync
								</>
							)}
						</Button>
						<Button
							onClick={() => updateSyncConfig({ autoSync: !config.autoSync })}
							size="sm"
							variant={config.autoSync ? "secondary" : "outline"}
						>
							{config.autoSync ? (
								<>
									<Activity className="mr-1 h-4 w-4" />
									Auto-Sync ON
								</>
							) : (
								<>
									<Activity className="mr-1 h-4 w-4" />
									Auto-Sync OFF
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Performance Metrics */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TrendingUp className="h-5 w-5" />
						Performance Metrics
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Total Syncs</p>
							<p className="font-bold text-2xl">{metrics.totalSyncs}</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Successful</p>
							<p className="font-bold text-2xl text-green-600">
								{metrics.successfulSyncs}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Failed</p>
							<p className="font-bold text-2xl text-red-600">
								{metrics.failedSyncs}
							</p>
						</div>
						<div className="space-y-1">
							<p className="text-muted-foreground text-sm">Avg Time</p>
							<p className="font-bold text-2xl">{metrics.averageSyncTime}ms</p>
						</div>
					</div>

					{/* Sync History */}
					<div className="mt-4">
						<p className="mb-2 text-muted-foreground text-sm">
							Recent Sync History
						</p>
						<div className="flex gap-1">
							{syncHistory.map((sync, i) => (
								<div
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded",
										sync.status === "success" ? "bg-green-100" : "bg-red-100",
									)}
									key={i}
									title={sync.timestamp.toLocaleString()}
								>
									{sync.status === "success" ? (
										<CheckCircle className="h-4 w-4 text-green-600" />
									) : (
										<AlertCircle className="h-4 w-4 text-red-600" />
									)}
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Offline Queue Status */}
			{offlineQueueStatus && offlineQueueStatus.totalOperations > 0 && (
				<Alert>
					<Database className="h-4 w-4" />
					<AlertDescription>
						<strong>Offline Queue:</strong>{" "}
						{offlineQueueStatus.pendingOperations} pending,{" "}
						{offlineQueueStatus.failedOperations} failed operations out of{" "}
						{offlineQueueStatus.totalOperations} total.
					</AlertDescription>
				</Alert>
			)}

			{/* Configuration */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5" />
						Sync Configuration
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm">Sync Interval</span>
							<Badge variant="outline">{config.syncInterval / 1000}s</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">Conflict Strategy</span>
							<Badge variant="outline">{config.conflictStrategy}</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">Cache Enabled</span>
							<Badge variant={config.cacheEnabled ? "default" : "secondary"}>
								{config.cacheEnabled ? "Yes" : "No"}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">Performance Monitoring</span>
							<Badge
								variant={config.performanceMonitoring ? "default" : "secondary"}
							>
								{config.performanceMonitoring ? "Yes" : "No"}
							</Badge>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Last Update */}
			<div className="flex items-center justify-end gap-2 text-muted-foreground text-sm">
				<Clock className="h-4 w-4" />
				Last updated: {lastUpdate.toLocaleTimeString()}
			</div>
		</div>
	);
}
