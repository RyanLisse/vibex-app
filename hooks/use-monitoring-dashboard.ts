/**
 * Custom hook for monitoring dashboard data
 * Extracted to reduce complexity in main dashboard component
 */

import { useEffect, useState } from "react";
import { performanceMonitor } from "@/lib/monitoring/performance-monitor";

interface MetricCard {
	title: string;
	value: string | number;
	change?: number;
	status: "good" | "warning" | "error";
	description: string;
}

interface PerformanceSummary {
	totalMetrics: number;
	averages: Record<string, number>;
	recent: Array<{
		name: string;
		value: number;
		unit: string;
		timestamp: string;
	}>;
}

export function useMonitoringDashboard() {
	const [metrics, setMetrics] = useState<MetricCard[]>([]);
	const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const loadDashboardData = async () => {
			try {
				setLoading(true);
				setError(null);

				// Fetch performance summary
				const summary = performanceMonitor.getSummary();
				setPerformanceSummary(summary);

				// Mock metrics - replace with real data from your monitoring system
				const mockMetrics: MetricCard[] = [
					{
						title: "Error Rate",
						value: "0.1%",
						change: -50,
						status: "good",
						description: "24h error rate (target: <0.5%)",
					},
					{
						title: "Response Time",
						value: "120ms",
						change: -15,
						status: "good",
						description: "Average API response time",
					},
					{
						title: "Test Coverage",
						value: "94%",
						change: 5,
						status: "good",
						description: "Overall test coverage",
					},
					{
						title: "Bundle Size",
						value: "245KB",
						change: 2,
						status: "warning",
						description: "Gzipped bundle size",
					},
					{
						title: "Core Web Vitals",
						value: "Good",
						status: "good",
						description: "LCP, FID, CLS scores",
					},
					{
						title: "Uptime",
						value: "99.98%",
						status: "good",
						description: "30-day uptime",
					},
				];

				setMetrics(mockMetrics);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load dashboard data");
			} finally {
				setLoading(false);
			}
		};

		loadDashboardData();
	}, []);

	const refreshData = () => {
		// Trigger a data refresh
		const summary = performanceMonitor.getSummary();
		setPerformanceSummary(summary);
	};

	return {
		metrics,
		performanceSummary,
		loading,
		error,
		refreshData,
	};
}
