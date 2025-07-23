"use client";

import { DashboardMetricsGrid } from "@/components/monitoring/dashboard-metrics-grid";
import { ErrorPreventionChecklist } from "@/components/monitoring/error-prevention-checklist";
import { PerformanceSummary } from "@/components/monitoring/performance-summary";
import { Badge } from "@/components/ui/badge";
import { useMonitoringDashboard } from "@/hooks/use-monitoring-dashboard";

export default function MonitoringDashboard() {
	const { metrics, performanceSummary, loading, error } =
		useMonitoringDashboard();

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex h-64 items-center justify-center">
					<div className="h-8 w-8 animate-spin rounded-full border-gray-900 border-b-2" />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center text-red-600">
					Error loading dashboard: {error}
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Error Prevention Dashboard</h1>
					<p className="text-gray-600">
						Monitor your application's health and performance
					</p>
				</div>
				<Badge variant="outline" className="text-sm">
					Last updated: {new Date().toLocaleTimeString()}
				</Badge>
			</div>

			{/* Key Metrics Grid */}
			<DashboardMetricsGrid metrics={metrics} />

			{/* Performance Summary */}
			{performanceSummary && (
				<PerformanceSummary performanceSummary={performanceSummary} />
			)}

			{/* Error Prevention Checklist */}
			<ErrorPreventionChecklist />
		</div>
	);
}
