/**
 * Workflow Monitoring and Metrics
 *
 * Real-time monitoring, metrics collection, and performance tracking
 */

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { EventEmitter } from "events";
import { db } from "@/db/config";
import { observabilityEvents, workflowExecutions } from "@/db/schema";
import { observability } from "@/lib/observability";
	PerformanceMetrics,
	ResourceUsage,
	StepMetrics,
	WorkflowEvent,
	WorkflowExecutionState,
	WorkflowMetrics,
} from "./types";

// Monitoring configuration
export interface MonitoringConfig {
	metricsInterval: number; // milliseconds
	alertThresholds: AlertThresholds;
	retention: RetentionPolicy;
}

export interface AlertThresholds {
	executionTime: number; // milliseconds
	errorRate: number; // percentage
	resourceUsage: {
		cpu: number; // percentage
		memory: number; // MB
		apiCalls: number;
	};
	stuckWorkflowTime: number; // milliseconds
}

export interface RetentionPolicy {
	metrics: number; // days
	events: number; // days
	snapshots: number; // days
}

// Default configuration
const DEFAULT_CONFIG: MonitoringConfig = {
	metricsInterval: 60_000, // 1 minute
	alertThresholds: {
		executionTime: 300_000, // 5 minutes
		errorRate: 10, // 10%
		resourceUsage: {
			cpu: 80,
			memory: 1024,
			apiCalls: 1000,
		},
		stuckWorkflowTime: 3_600_000, // 1 hour
	},
	retention: {
		metrics: 30,
		events: 7,
		snapshots: 14,
	},
};

// Workflow monitor
export class WorkflowMonitor extends EventEmitter {
	private metricsCollector: MetricsCollector;
	private alertManager: AlertManager;
	private performanceAnalyzer: PerformanceAnalyzer;
	private intervalId?: NodeJS.Timeout;

	constructor(private config: MonitoringConfig = DEFAULT_CONFIG) {
		super();
		this.metricsCollector = new MetricsCollector();
		this.alertManager = new AlertManager(config.alertThresholds);
		this.performanceAnalyzer = new PerformanceAnalyzer();
	}

	/**
	 * Start monitoring
	 */
	start(): void {
		if (this.intervalId) {
			return;
		}

		this.intervalId = setInterval(() => {
			this.collectMetrics().catch((error) => {
				console.error("Metrics collection failed:", error);
			});
		}, this.config.metricsInterval);

		observability.trackEvent("workflow.monitoring.started", {
			interval: this.config.metricsInterval,
		});
	}

	/**
	 * Stop monitoring
	 */
	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = undefined;
		}

		observability.trackEvent("workflow.monitoring.stopped", {});
	}

	/**
	 * Collect metrics
	 */
	private async collectMetrics(): Promise<void> {
		const timestamp = new Date();

		// Collect workflow metrics
		const workflowMetrics =
			await this.metricsCollector.collectWorkflowMetrics();

		// Analyze performance
		const performanceReport = this.performanceAnalyzer.analyze(workflowMetrics);

		// Check for alerts
		const alerts = this.alertManager.checkAlerts(
			workflowMetrics,
			performanceReport,
		);

		// Emit metrics event
		this.emit("metrics", {
			timestamp,
			workflows: workflowMetrics,
			performance: performanceReport,
			alerts,
		});

		// Store metrics
		await this.storeMetrics({
			timestamp,
			metrics: workflowMetrics,
			performance: performanceReport,
		});

		// Process alerts
		for (const alert of alerts) {
			this.emit("alert", alert);
			await this.processAlert(alert);
		}
	}

	/**
	 * Store metrics in database
	 */
	private async storeMetrics(data: any): Promise<void> {
		await db.insert(observabilityEvents).values({
			type: "metrics.collected",
			timestamp: data.timestamp,
			data: data as any,
			severity: "info",
			category: "metrics",
		});
	}

	/**
	 * Process alert
	 */
	private async processAlert(alert: Alert): Promise<void> {
		observability.trackEvent("workflow.alert.triggered", {
			type: alert.type,
			severity: alert.severity,
			details: alert.details,
		});

		// Could send notifications, trigger remediation, etc.
	}

	/**
	 * Get real-time metrics
	 */
	async getRealTimeMetrics(): Promise<RealTimeMetrics> {
		const active = await this.getActiveWorkflows();
		const recent = await this.getRecentMetrics();
		const health = await this.getSystemHealth();

		return {
			activeWorkflows: active,
			recentMetrics: recent,
			systemHealth: health,
			timestamp: new Date(),
		};
	}

	private async getActiveWorkflows(): Promise<ActiveWorkflowMetrics> {
		const [result] = await db
			.select({
				total: sql`count(*)`,
				running: sql`count(*) filter (where status = 'running')`,
				paused: sql`count(*) filter (where status = 'paused')`,
				avgRunTime: sql`avg(extract(epoch from (now() - started_at))) filter (where status = 'running')`,
			})
			.from(workflowExecutions)
			.where(
				and(
					gte(
						workflowExecutions.startedAt,
						new Date(Date.now() - 24 * 60 * 60 * 1000),
					),
					sql`status in ('running', 'paused')`,
				),
			);

		return {
			total: Number(result.total),
			running: Number(result.running),
			paused: Number(result.paused),
			averageRunTime: Number(result.avgRunTime) || 0,
		};
	}

	private async getRecentMetrics(): Promise<RecentMetrics> {
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

		const [metrics] = await db
			.select({
				completed: sql`count(*) filter (where status = 'completed')`,
				failed: sql`count(*) filter (where status = 'failed')`,
				avgDuration: sql`avg(extract(epoch from (completed_at - started_at))) filter (where status = 'completed')`,
			})
			.from(workflowExecutions)
			.where(gte(workflowExecutions.completedAt, oneHourAgo));

		const total = Number(metrics.completed) + Number(metrics.failed);
		const successRate =
			total > 0 ? (Number(metrics.completed) / total) * 100 : 100;

		return {
			completedLastHour: Number(metrics.completed),
			failedLastHour: Number(metrics.failed),
			successRate,
			averageDuration: Number(metrics.avgDuration) || 0,
		};
	}

	private async getSystemHealth(): Promise<SystemHealth> {
		// This would integrate with actual system metrics
		return {
			status: "healthy",
			cpu: Math.random() * 100,
			memory: Math.random() * 2048,
			diskSpace: Math.random() * 100,
			queueDepth: Math.floor(Math.random() * 100),
		};
	}
}

// Metrics collector
class MetricsCollector {
	async collectWorkflowMetrics(): Promise<WorkflowMetricsCollection> {
		const executions = await this.getRecentExecutions();
		const aggregated = await this.aggregateMetrics(executions);

		return {
			executions: executions.length,
			byStatus: aggregated.byStatus,
			byWorkflow: aggregated.byWorkflow,
			performance: aggregated.performance,
			errors: aggregated.errors,
		};
	}

	private async getRecentExecutions(): Promise<any[]> {
		const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

		return await db
			.select()
			.from(workflowExecutions)
			.where(and(gte(workflowExecutions.updatedAt, fiveMinutesAgo)))
			.limit(1000);
	}

	private async aggregateMetrics(executions: any[]): Promise<any> {
		const byStatus: Record<string, number> = {};
		const byWorkflow: Record<string, WorkflowTypeMetrics> = {};
		const errors: any[] = [];

		executions.forEach((exec) => {
			// By status
			byStatus[exec.status] = (byStatus[exec.status] || 0) + 1;

			// By workflow
			if (!byWorkflow[exec.workflowId]) {
				byWorkflow[exec.workflowId] = {
					total: 0,
					completed: 0,
					failed: 0,
					avgDuration: 0,
					durations: [],
				};
			}

			const wfMetrics = byWorkflow[exec.workflowId];
			wfMetrics.total++;

			if (exec.status === "completed") {
				wfMetrics.completed++;
				if (exec.completedAt && exec.startedAt) {
					const duration =
						exec.completedAt.getTime() - exec.startedAt.getTime();
					wfMetrics.durations.push(duration);
				}
			} else if (exec.status === "failed") {
				wfMetrics.failed++;
				if (exec.error) {
					errors.push({
						workflowId: exec.workflowId,
						executionId: exec.id,
						error: exec.error,
						timestamp: exec.completedAt || exec.updatedAt,
					});
				}
			}
		});

		// Calculate averages
		Object.values(byWorkflow).forEach((metrics) => {
			if (metrics.durations.length > 0) {
				metrics.avgDuration =
					metrics.durations.reduce((a, b) => a + b, 0) /
					metrics.durations.length;
			}
			delete (metrics as any).durations;
		});

		// Overall performance
		const totalCompleted = Object.values(byWorkflow).reduce(
			(sum, m) => sum + m.completed,
			0,
		);
		const totalFailed = Object.values(byWorkflow).reduce(
			(sum, m) => sum + m.failed,
			0,
		);
		const total = totalCompleted + totalFailed;

		const performance: PerformanceMetrics = {
			throughput: total / 5, // per minute (5 minute window)
			latency: this.calculateP95(executions),
			errorRate: total > 0 ? (totalFailed / total) * 100 : 0,
			successRate: total > 0 ? (totalCompleted / total) * 100 : 100,
		};

		return {
			byStatus,
			byWorkflow,
			performance,
			errors,
		};
	}

	private calculateP95(executions: any[]): number {
		const durations = executions
			.filter((e) => e.completedAt && e.startedAt)
			.map((e) => e.completedAt.getTime() - e.startedAt.getTime())
			.sort((a, b) => a - b);

		if (durations.length === 0) return 0;

		const p95Index = Math.floor(durations.length * 0.95);
		return durations[p95Index];
	}
}

// Alert manager
class AlertManager {
	constructor(private thresholds: AlertThresholds) {}

	checkAlerts(
		metrics: WorkflowMetricsCollection,
		performance: PerformanceReport,
	): Alert[] {
		const alerts: Alert[] = [];

		// Check error rate
		if (metrics.performance.errorRate > this.thresholds.errorRate) {
			alerts.push({
				type: "high_error_rate",
				severity: "high",
				message: `Error rate ${metrics.performance.errorRate.toFixed(2)}% exceeds threshold ${this.thresholds.errorRate}%`,
				details: {
					currentRate: metrics.performance.errorRate,
					threshold: this.thresholds.errorRate,
					errors: metrics.errors,
				},
				timestamp: new Date(),
			});
		}

		// Check execution time
		if (performance.slowExecutions.length > 0) {
			alerts.push({
				type: "slow_executions",
				severity: "medium",
				message: `${performance.slowExecutions.length} workflows exceed execution time threshold`,
				details: {
					slowExecutions: performance.slowExecutions,
					threshold: this.thresholds.executionTime,
				},
				timestamp: new Date(),
			});
		}

		// Check stuck workflows
		if (performance.stuckWorkflows.length > 0) {
			alerts.push({
				type: "stuck_workflows",
				severity: "high",
				message: `${performance.stuckWorkflows.length} workflows appear to be stuck`,
				details: {
					stuckWorkflows: performance.stuckWorkflows,
					threshold: this.thresholds.stuckWorkflowTime,
				},
				timestamp: new Date(),
			});
		}

		return alerts;
	}
}

// Performance analyzer
class PerformanceAnalyzer {
	analyze(metrics: WorkflowMetricsCollection): PerformanceReport {
		const bottlenecks = this.identifyBottlenecks(metrics);
		const trends = this.analyzeTrends(metrics);
		const recommendations = this.generateRecommendations(metrics, bottlenecks);

		return {
			bottlenecks,
			trends,
			recommendations,
			slowExecutions: this.findSlowExecutions(metrics),
			stuckWorkflows: this.findStuckWorkflows(metrics),
		};
	}

	private identifyBottlenecks(
		metrics: WorkflowMetricsCollection,
	): Bottleneck[] {
		const bottlenecks: Bottleneck[] = [];

		// Find workflows with high failure rates
		Object.entries(metrics.byWorkflow).forEach(([workflowId, wfMetrics]) => {
			const failureRate =
				wfMetrics.total > 0 ? (wfMetrics.failed / wfMetrics.total) * 100 : 0;
			if (failureRate > 20) {
				bottlenecks.push({
					type: "high_failure_rate",
					workflowId,
					impact: "high",
					details: {
						failureRate,
						failed: wfMetrics.failed,
						total: wfMetrics.total,
					},
				});
			}
		});

		return bottlenecks;
	}

	private analyzeTrends(metrics: WorkflowMetricsCollection): Trend[] {
		// This would analyze historical data for trends
		return [];
	}

	private generateRecommendations(
		metrics: WorkflowMetricsCollection,
		bottlenecks: Bottleneck[],
	): Recommendation[] {
		const recommendations: Recommendation[] = [];

		// High error rate recommendation
		if (metrics.performance.errorRate > 10) {
			recommendations.push({
				type: "error_rate",
				priority: "high",
				message: "Consider implementing retry logic or circuit breakers",
				details: {
					currentErrorRate: metrics.performance.errorRate,
					affectedWorkflows: Object.entries(metrics.byWorkflow)
						.filter(([_, m]) => m.failed > 0)
						.map(([id]) => id),
				},
			});
		}

		// Performance optimization
		const slowWorkflows = Object.entries(metrics.byWorkflow)
			.filter(([_, m]) => m.avgDuration > 60_000) // 1 minute
			.map(([id]) => id);

		if (slowWorkflows.length > 0) {
			recommendations.push({
				type: "performance",
				priority: "medium",
				message:
					"Optimize slow workflows by parallelizing steps or caching results",
				details: {
					slowWorkflows,
				},
			});
		}

		return recommendations;
	}

	private findSlowExecutions(metrics: WorkflowMetricsCollection): string[] {
		// Would identify specific slow executions
		return [];
	}

	private findStuckWorkflows(metrics: WorkflowMetricsCollection): string[] {
		// Would identify stuck workflows
		return [];
	}
}

// Types
export interface WorkflowMetricsCollection {
	executions: number;
	byStatus: Record<string, number>;
	byWorkflow: Record<string, WorkflowTypeMetrics>;
	performance: PerformanceMetrics;
	errors: any[];
}

export interface WorkflowTypeMetrics {
	total: number;
	completed: number;
	failed: number;
	avgDuration: number;
}

export interface PerformanceReport {
	bottlenecks: Bottleneck[];
	trends: Trend[];
	recommendations: Recommendation[];
	slowExecutions: string[];
	stuckWorkflows: string[];
}

export interface Bottleneck {
	type: string;
	workflowId: string;
	impact: "low" | "medium" | "high";
	details: any;
}

export interface Trend {
	type: string;
	direction: "up" | "down" | "stable";
	change: number;
	period: string;
}

export interface Recommendation {
	type: string;
	priority: "low" | "medium" | "high";
	message: string;
	details: any;
}

export interface Alert {
	type: string;
	severity: "low" | "medium" | "high" | "critical";
	message: string;
	details: any;
	timestamp: Date;
}

export interface RealTimeMetrics {
	activeWorkflows: ActiveWorkflowMetrics;
	recentMetrics: RecentMetrics;
	systemHealth: SystemHealth;
	timestamp: Date;
}

export interface ActiveWorkflowMetrics {
	total: number;
	running: number;
	paused: number;
	averageRunTime: number;
}

export interface RecentMetrics {
	completedLastHour: number;
	failedLastHour: number;
	successRate: number;
	averageDuration: number;
}

export interface SystemHealth {
	status: "healthy" | "degraded" | "unhealthy";
	cpu: number;
	memory: number;
	diskSpace: number;
	queueDepth: number;
}

// Export monitor singleton
export const workflowMonitor = new WorkflowMonitor();

// Dashboard data provider
export class WorkflowDashboard {
	async getOverviewData(): Promise<DashboardOverview> {
		const realTime = await workflowMonitor.getRealTimeMetrics();
		const daily = await this.getDailyStats();
		const topWorkflows = await this.getTopWorkflows();

		return {
			realTime,
			daily,
			topWorkflows,
			lastUpdated: new Date(),
		};
	}

	private async getDailyStats(): Promise<DailyStats> {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const [stats] = await db
			.select({
				total: sql`count(*)`,
				completed: sql`count(*) filter (where status = 'completed')`,
				failed: sql`count(*) filter (where status = 'failed')`,
				avgDuration: sql`avg(extract(epoch from (completed_at - started_at))) filter (where status = 'completed')`,
			})
			.from(workflowExecutions)
			.where(gte(workflowExecutions.startedAt, today));

		return {
			total: Number(stats.total),
			completed: Number(stats.completed),
			failed: Number(stats.failed),
			averageDuration: Number(stats.avgDuration) || 0,
		};
	}

	private async getTopWorkflows(): Promise<TopWorkflow[]> {
		const results = await db
			.select({
				workflowId: workflowExecutions.workflowId,
				executions: sql`count(*)`,
				avgDuration: sql`avg(extract(epoch from (completed_at - started_at))) filter (where status = 'completed')`,
				successRate: sql`(count(*) filter (where status = 'completed') * 100.0 / count(*))`,
			})
			.from(workflowExecutions)
			.where(
				gte(
					workflowExecutions.startedAt,
					new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
				),
			)
			.groupBy(workflowExecutions.workflowId)
			.orderBy(sql`count(*) desc`)
			.limit(10);

		return results.map((r) => ({
			workflowId: r.workflowId,
			executions: Number(r.executions),
			averageDuration: Number(r.avgDuration) || 0,
			successRate: Number(r.successRate) || 0,
		}));
	}
}

export interface DashboardOverview {
	realTime: RealTimeMetrics;
	daily: DailyStats;
	topWorkflows: TopWorkflow[];
	lastUpdated: Date;
}

export interface DailyStats {
	total: number;
	completed: number;
	failed: number;
	averageDuration: number;
}

export interface TopWorkflow {
	workflowId: string;
	executions: number;
	averageDuration: number;
	successRate: number;
}

// Export dashboard
export const workflowDashboard = new WorkflowDashboard();
