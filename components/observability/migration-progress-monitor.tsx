"use client";

/**
 * Migration Progress Monitor Component
 *
 * Real-time monitoring of database migration progress with detailed tracking,
 * performance metrics, and comprehensive status reporting.
 */

import {
	Activity,
	AlertTriangle,
	BarChart3,
	CheckCircle,
	Clock,
	Database,
	Pause,
	Play,
	RefreshCw,
	TrendingUp,
	XCircle,
	Zap,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { observability } from "@/lib/observability";

interface MigrationStep {
	id: string;
	name: string;
	description: string;
	status: "pending" | "running" | "completed" | "failed" | "skipped";
	progress: number;
	startTime?: Date;
	endTime?: Date;
	duration?: number;
	error?: string;
	metrics: {
		recordsProcessed: number;
		totalRecords: number;
		throughput: number;
		errorCount: number;
	};
}

interface MigrationStatus {
	id: string;
	name: string;
	overallProgress: number;
	status: "pending" | "running" | "completed" | "failed" | "paused";
	startTime: Date;
	endTime?: Date;
	estimatedCompletion?: Date;
	steps: MigrationStep[];
	metrics: {
		totalRecords: number;
		processedRecords: number;
		errorCount: number;
		averageThroughput: number;
		peakThroughput: number;
	};
}

interface MigrationProgressMonitorProps {
	migrationId?: string;
	autoRefresh?: boolean;
	refreshInterval?: number;
	className?: string;
}

export function MigrationProgressMonitor({
	migrationId,
	autoRefresh = true,
	refreshInterval = 5000,
	className = "",
}: MigrationProgressMonitorProps) {
	const [migrations, setMigrations] = useState<MigrationStatus[]>([]);
	const [selectedMigration, setSelectedMigration] =
		useState<MigrationStatus | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isPaused, setIsPaused] = useState(false);
	const [showMetrics, setShowMetrics] = useState(false);

	// Fetch migration status
	const fetchMigrationStatus = useCallback(async () => {
		if (isPaused) return;

		try {
			setError(null);

			// Simulate fetching migration data
			// In real implementation, this would call your migration service
			const mockMigrations: MigrationStatus[] = [
				{
					id: "migration_001",
					name: "User Data Migration",
					overallProgress: 75,
					status: "running",
					startTime: new Date(Date.now() - 1_800_000), // 30 minutes ago
					estimatedCompletion: new Date(Date.now() + 600_000), // 10 minutes from now
					steps: [
						{
							id: "step_001",
							name: "Schema Updates",
							description: "Updating database schema for new structure",
							status: "completed",
							progress: 100,
							startTime: new Date(Date.now() - 1_800_000),
							endTime: new Date(Date.now() - 1_680_000),
							duration: 120_000,
							metrics: {
								recordsProcessed: 15,
								totalRecords: 15,
								throughput: 0.125,
								errorCount: 0,
							},
						},
						{
							id: "step_002",
							name: "Data Migration",
							description: "Migrating user data to new format",
							status: "running",
							progress: 73,
							startTime: new Date(Date.now() - 1_680_000),
							metrics: {
								recordsProcessed: 36_500,
								totalRecords: 50_000,
								throughput: 21.7,
								errorCount: 3,
							},
						},
						{
							id: "step_003",
							name: "Index Creation",
							description: "Creating optimized indexes",
							status: "pending",
							progress: 0,
							metrics: {
								recordsProcessed: 0,
								totalRecords: 8,
								throughput: 0,
								errorCount: 0,
							},
						},
						{
							id: "step_004",
							name: "Data Validation",
							description: "Validating migrated data integrity",
							status: "pending",
							progress: 0,
							metrics: {
								recordsProcessed: 0,
								totalRecords: 50_000,
								throughput: 0,
								errorCount: 0,
							},
						},
					],
					metrics: {
						totalRecords: 100_023,
						processedRecords: 72_515,
						errorCount: 3,
						averageThroughput: 18.4,
						peakThroughput: 34.2,
					},
				},
			];

			setMigrations(mockMigrations);

			if (migrationId) {
				const specific = mockMigrations.find((m) => m.id === migrationId);
				setSelectedMigration(specific || null);
			} else if (!selectedMigration && mockMigrations.length > 0) {
				setSelectedMigration(mockMigrations[0]);
			}

			// Record observability event
			await observability.recordEvent("migration_status_fetched", {
				migrationCount: mockMigrations.length,
				activeMigrations: mockMigrations.filter((m) => m.status === "running")
					.length,
			});
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to fetch migration status",
			);
			console.error("Failed to fetch migration status:", err);
		} finally {
			setLoading(false);
		}
	}, [migrationId, selectedMigration, isPaused]);

	// Auto refresh effect
	useEffect(() => {
		fetchMigrationStatus();

		if (autoRefresh && !isPaused) {
			const interval = setInterval(fetchMigrationStatus, refreshInterval);
			return () => clearInterval(interval);
		}
	}, [fetchMigrationStatus, autoRefresh, refreshInterval, isPaused]);

	// Calculate ETA
	const calculateETA = useCallback((migration: MigrationStatus): string => {
		if (migration.status !== "running" || migration.overallProgress === 0) {
			return "Unknown";
		}

		const elapsed = Date.now() - migration.startTime.getTime();
		const remaining =
			(elapsed / migration.overallProgress) * (100 - migration.overallProgress);
		const eta = new Date(Date.now() + remaining);

		return eta.toLocaleTimeString();
	}, []);

	// Format duration
	const formatDuration = useCallback((milliseconds: number): string => {
		const seconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		}
		if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		}
		return `${seconds}s`;
	}, []);

	// Get status icon
	const getStatusIcon = useCallback((status: string) => {
		switch (status) {
			case "running":
				return <Activity className="h-4 w-4 animate-spin text-blue-600" />;
			case "completed":
				return <CheckCircle className="h-4 w-4 text-green-600" />;
			case "failed":
				return <XCircle className="h-4 w-4 text-red-600" />;
			case "paused":
				return <Pause className="h-4 w-4 text-yellow-600" />;
			default:
				return <Clock className="h-4 w-4 text-gray-400" />;
		}
	}, []);

	// Get status color
	const getStatusColor = useCallback((status: string) => {
		switch (status) {
			case "running":
				return "bg-blue-500";
			case "completed":
				return "bg-green-500";
			case "failed":
				return "bg-red-500";
			case "paused":
				return "bg-yellow-500";
			default:
				return "bg-gray-400";
		}
	}, []);

	if (loading) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center justify-center">
						<Activity className="mr-2 h-5 w-5 animate-spin" />
						Loading migration status...
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="p-6">
					<div className="flex items-center text-red-600">
						<AlertTriangle className="mr-2 h-5 w-5" />
						{error}
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Migration Overview */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="flex items-center">
							<Database className="mr-2 h-5 w-5" />
							Migration Progress Monitor
						</CardTitle>
						<div className="flex items-center space-x-2">
							<Button
								onClick={() => setIsPaused(!isPaused)}
								size="sm"
								variant="outline"
							>
								{isPaused ? (
									<Play className="h-4 w-4" />
								) : (
									<Pause className="h-4 w-4" />
								)}
							</Button>
							<Button
								disabled={loading}
								onClick={fetchMigrationStatus}
								size="sm"
								variant="outline"
							>
								<RefreshCw
									className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
								/>
							</Button>
							<Button
								onClick={() => setShowMetrics(!showMetrics)}
								size="sm"
								variant="outline"
							>
								<BarChart3 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-4">
					{migrations.map((migration) => (
						<div
							className={`cursor-pointer rounded-lg border p-4 transition-colors ${
								selectedMigration?.id === migration.id
									? "border-blue-500 bg-blue-50"
									: "border-gray-200 hover:border-gray-300"
							}`}
							key={migration.id}
							onClick={() => setSelectedMigration(migration)}
						>
							<div className="mb-3 flex items-center justify-between">
								<div className="flex items-center space-x-3">
									{getStatusIcon(migration.status)}
									<div>
										<h3 className="font-medium">{migration.name}</h3>
										<p className="text-gray-600 text-sm">ID: {migration.id}</p>
									</div>
								</div>
								<div className="text-right">
									<Badge
										variant={
											migration.status === "running" ? "default" : "secondary"
										}
									>
										{migration.status}
									</Badge>
									<p className="mt-1 text-gray-600 text-sm">
										{migration.overallProgress}% complete
									</p>
								</div>
							</div>

							<Progress className="mb-3" value={migration.overallProgress} />

							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<span className="text-gray-600">Started:</span>
									<span className="ml-1">
										{migration.startTime.toLocaleTimeString()}
									</span>
								</div>
								<div>
									<span className="text-gray-600">ETA:</span>
									<span className="ml-1">{calculateETA(migration)}</span>
								</div>
								<div>
									<span className="text-gray-600">Records:</span>
									<span className="ml-1">
										{migration.metrics.processedRecords.toLocaleString()} /{" "}
										{migration.metrics.totalRecords.toLocaleString()}
									</span>
								</div>
								<div>
									<span className="text-gray-600">Throughput:</span>
									<span className="ml-1">
										{migration.metrics.averageThroughput} rec/s
									</span>
								</div>
							</div>

							{migration.metrics.errorCount > 0 && (
								<div className="mt-2 rounded bg-red-50 p-2 text-red-700 text-sm">
									<AlertTriangle className="mr-1 inline h-4 w-4" />
									{migration.metrics.errorCount} errors encountered
								</div>
							)}
						</div>
					))}
				</CardContent>
			</Card>

			{/* Detailed Migration Steps */}
			{selectedMigration && (
				<Card>
					<CardHeader>
						<CardTitle>Migration Steps - {selectedMigration.name}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{selectedMigration.steps.map((step, index) => (
								<div className="rounded-lg border p-4" key={step.id}>
									<div className="mb-3 flex items-center justify-between">
										<div className="flex items-center space-x-3">
											<div
												className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-white ${getStatusColor(step.status)}`}
											>
												{index + 1}
											</div>
											<div>
												<h4 className="font-medium">{step.name}</h4>
												<p className="text-gray-600 text-sm">
													{step.description}
												</p>
											</div>
										</div>
										<div className="text-right">
											{getStatusIcon(step.status)}
											<p className="mt-1 text-gray-600 text-sm">
												{step.progress}%
											</p>
										</div>
									</div>

									<Progress className="mb-3" value={step.progress} />

									<div className="grid grid-cols-2 gap-4 text-sm">
										<div>
											<span className="text-gray-600">Records:</span>
											<span className="ml-1">
												{step.metrics.recordsProcessed.toLocaleString()} /{" "}
												{step.metrics.totalRecords.toLocaleString()}
											</span>
										</div>
										<div>
											<span className="text-gray-600">Throughput:</span>
											<span className="ml-1">
												{step.metrics.throughput} rec/s
											</span>
										</div>
										{step.duration && (
											<div>
												<span className="text-gray-600">Duration:</span>
												<span className="ml-1">
													{formatDuration(step.duration)}
												</span>
											</div>
										)}
										{step.metrics.errorCount > 0 && (
											<div className="text-red-600">
												<span>Errors:</span>
												<span className="ml-1">{step.metrics.errorCount}</span>
											</div>
										)}
									</div>

									{step.error && (
										<div className="mt-3 rounded bg-red-50 p-2 text-red-700 text-sm">
											<strong>Error:</strong> {step.error}
										</div>
									)}
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Performance Metrics */}
			{showMetrics && selectedMigration && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center">
							<TrendingUp className="mr-2 h-5 w-5" />
							Performance Metrics
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 gap-6">
							<div className="space-y-4">
								<div>
									<label className="font-medium text-gray-600 text-sm">
										Average Throughput
									</label>
									<div className="font-bold text-2xl">
										{selectedMigration.metrics.averageThroughput} rec/s
									</div>
								</div>
								<div>
									<label className="font-medium text-gray-600 text-sm">
										Peak Throughput
									</label>
									<div className="font-bold text-2xl text-green-600">
										{selectedMigration.metrics.peakThroughput} rec/s
									</div>
								</div>
							</div>

							<div className="space-y-4">
								<div>
									<label className="font-medium text-gray-600 text-sm">
										Total Records
									</label>
									<div className="font-bold text-2xl">
										{selectedMigration.metrics.totalRecords.toLocaleString()}
									</div>
								</div>
								<div>
									<label className="font-medium text-gray-600 text-sm">
										Error Rate
									</label>
									<div
										className={`font-bold text-2xl ${selectedMigration.metrics.errorCount > 0 ? "text-red-600" : "text-green-600"}`}
									>
										{(
											(selectedMigration.metrics.errorCount /
												selectedMigration.metrics.processedRecords) *
											100
										).toFixed(2)}
										%
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
