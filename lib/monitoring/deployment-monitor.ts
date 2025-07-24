/**
 * Deployment Monitoring Service
 *
 * Monitors deployment health and provides alerting
 */

import { observability } from "@/lib/observability";
import { getElectricConfig } from "../../deployment/electric-config";
import { getNeonConfig } from "../../deployment/neon-config";
import { getObservabilityConfig } from "../../deployment/observability-config";

export interface HealthCheck {
	name: string;
	status: "healthy" | "degraded" | "unhealthy";
	message: string;
	timestamp: Date;
	responseTime?: number;
	metadata?: Record<string, unknown>;
}

export interface DeploymentMetrics {
	database: {
		connectionCount: number;
		activeQueries: number;
		avgQueryTime: number;
		errorRate: number;
	};
	electric: {
		syncLatency: number;
		connectionCount: number;
		errorRate: number;
		lastSyncTime: Date;
	};
	application: {
		uptime: number;
		memoryUsage: number;
		cpuUsage: number;
		requestRate: number;
		errorRate: number;
	};
}

export class DeploymentMonitor {
	private neonConfig = getNeonConfig();
	private electricConfig = getElectricConfig();
	private observabilityConfig = getObservabilityConfig();
	private healthChecks: Map<string, HealthCheck> = new Map();
	private metrics: DeploymentMetrics | null = null;
	private alertThresholds = {
		database: {
			connectionCount: this.neonConfig.monitoring.alertThresholds.connectionCount,
			queryDuration: this.neonConfig.monitoring.alertThresholds.queryDuration,
			errorRate: this.neonConfig.monitoring.alertThresholds.errorRate,
		},
		electric: {
			syncLatency: this.electricConfig.monitoring.alerting.syncLatencyThreshold,
			errorRate: this.electricConfig.monitoring.alerting.errorRateThreshold,
			connectionCount: this.electricConfig.monitoring.alerting.connectionCountThreshold,
		},
	};

	/**
	 * Start monitoring services
	 */
	async startMonitoring(): Promise<void> {
		console.log("🔍 Starting deployment monitoring...");

		// Start health check intervals
		this.startHealthChecks();

		// Start metrics collection
		this.startMetricsCollection();

		// Setup alerting
		this.setupAlerting();

		console.log("✅ Deployment monitoring started");
	}

	/**
	 * Stop monitoring services
	 */
	async stopMonitoring(): Promise<void> {
		console.log("🛑 Stopping deployment monitoring...");
		// Cleanup intervals and connections
		console.log("✅ Deployment monitoring stopped");
	}

	/**
	 * Get current health status
	 */
	getHealthStatus(): { overall: "healthy" | "degraded" | "unhealthy"; checks: HealthCheck[] } {
		const checks = Array.from(this.healthChecks.values());

		const unhealthyCount = checks.filter((check) => check.status === "unhealthy").length;
		const degradedCount = checks.filter((check) => check.status === "degraded").length;

		let overall: "healthy" | "degraded" | "unhealthy" = "healthy";

		if (unhealthyCount > 0) {
			overall = "unhealthy";
		} else if (degradedCount > 0) {
			overall = "degraded";
		}

		return { overall, checks };
	}

	/**
	 * Get current metrics
	 */
	getMetrics(): DeploymentMetrics | null {
		return this.metrics;
	}

	private startHealthChecks(): void {
		// Database health check
		setInterval(async () => {
			await this.checkDatabaseHealth();
		}, this.neonConfig.monitoring.metricsInterval);

		// ElectricSQL health check
		setInterval(async () => {
			await this.checkElectricHealth();
		}, this.electricConfig.monitoring.healthCheckInterval);

		// Application health check
		setInterval(async () => {
			await this.checkApplicationHealth();
		}, 30000); // 30 seconds

		// Run initial checks
		this.checkDatabaseHealth();
		this.checkElectricHealth();
		this.checkApplicationHealth();
	}

	private async checkDatabaseHealth(): Promise<void> {
		const startTime = Date.now();

		try {
			// This would be replaced with actual database health check
			const isHealthy = await this.performDatabaseHealthCheck();
			const responseTime = Date.now() - startTime;

			this.healthChecks.set("database", {
				name: "Database",
				status: isHealthy ? "healthy" : "unhealthy",
				message: isHealthy ? "Database is responding normally" : "Database is not responding",
				timestamp: new Date(),
				responseTime,
			});

			observability.recordEvent("health-check.database", {
				status: isHealthy ? "healthy" : "unhealthy",
				responseTime,
			});
		} catch (error) {
			this.healthChecks.set("database", {
				name: "Database",
				status: "unhealthy",
				message: `Database health check failed: ${error}`,
				timestamp: new Date(),
				responseTime: Date.now() - startTime,
			});

			observability.recordError("health-check.database.failed", error as Error);
		}
	}

	private async checkElectricHealth(): Promise<void> {
		const startTime = Date.now();

		try {
			// This would be replaced with actual ElectricSQL health check
			const isHealthy = await this.performElectricHealthCheck();
			const responseTime = Date.now() - startTime;

			this.healthChecks.set("electric", {
				name: "ElectricSQL",
				status: isHealthy ? "healthy" : "unhealthy",
				message: isHealthy ? "ElectricSQL is syncing normally" : "ElectricSQL sync issues detected",
				timestamp: new Date(),
				responseTime,
			});

			observability.recordEvent("health-check.electric", {
				status: isHealthy ? "healthy" : "unhealthy",
				responseTime,
			});
		} catch (error) {
			this.healthChecks.set("electric", {
				name: "ElectricSQL",
				status: "unhealthy",
				message: `ElectricSQL health check failed: ${error}`,
				timestamp: new Date(),
				responseTime: Date.now() - startTime,
			});

			observability.recordError("health-check.electric.failed", error as Error);
		}
	}

	private async checkApplicationHealth(): Promise<void> {
		const startTime = Date.now();

		try {
			const memoryUsage = process.memoryUsage();
			const uptime = process.uptime();

			// Simple health check based on memory usage
			const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
			const isHealthy = memoryUsagePercent < 90; // Consider unhealthy if using >90% heap

			this.healthChecks.set("application", {
				name: "Application",
				status: isHealthy ? "healthy" : "degraded",
				message: isHealthy
					? "Application is running normally"
					: `High memory usage: ${memoryUsagePercent.toFixed(1)}%`,
				timestamp: new Date(),
				responseTime: Date.now() - startTime,
				metadata: {
					memoryUsage: memoryUsagePercent,
					uptime,
					heapUsed: memoryUsage.heapUsed,
					heapTotal: memoryUsage.heapTotal,
				},
			});

			observability.recordEvent("health-check.application", {
				status: isHealthy ? "healthy" : "degraded",
				memoryUsage: memoryUsagePercent,
				uptime,
			});
		} catch (error) {
			this.healthChecks.set("application", {
				name: "Application",
				status: "unhealthy",
				message: `Application health check failed: ${error}`,
				timestamp: new Date(),
				responseTime: Date.now() - startTime,
			});

			observability.recordError("health-check.application.failed", error as Error);
		}
	}

	private startMetricsCollection(): void {
		setInterval(async () => {
			await this.collectMetrics();
		}, this.observabilityConfig.metrics.collectInterval);

		// Collect initial metrics
		this.collectMetrics();
	}

	private async collectMetrics(): Promise<void> {
		try {
			const memoryUsage = process.memoryUsage();
			const uptime = process.uptime();

			// This would be replaced with actual metrics collection
			this.metrics = {
				database: {
					connectionCount: await this.getDatabaseConnectionCount(),
					activeQueries: await this.getActiveQueryCount(),
					avgQueryTime: await this.getAverageQueryTime(),
					errorRate: await this.getDatabaseErrorRate(),
				},
				electric: {
					syncLatency: await this.getElectricSyncLatency(),
					connectionCount: await this.getElectricConnectionCount(),
					errorRate: await this.getElectricErrorRate(),
					lastSyncTime: await this.getLastSyncTime(),
				},
				application: {
					uptime,
					memoryUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
					cpuUsage: await this.getCPUUsage(),
					requestRate: await this.getRequestRate(),
					errorRate: await this.getApplicationErrorRate(),
				},
			};

			// Check for alert conditions
			this.checkAlertConditions();

			observability.recordEvent("metrics.collected", {
				timestamp: new Date(),
				metrics: this.metrics,
			});
		} catch (error) {
			observability.recordError("metrics.collection.failed", error as Error);
		}
	}

	private setupAlerting(): void {
		if (!this.observabilityConfig.alerting.enabled) {
			return;
		}

		console.log("🚨 Setting up alerting...");
		// Alerting setup would be implemented here
	}

	private checkAlertConditions(): void {
		if (!this.metrics || !this.observabilityConfig.alerting.enabled) {
			return;
		}

		const alerts: string[] = [];

		// Database alerts
		if (this.metrics.database.connectionCount > this.alertThresholds.database.connectionCount) {
			alerts.push(`High database connection count: ${this.metrics.database.connectionCount}`);
		}

		if (this.metrics.database.avgQueryTime > this.alertThresholds.database.queryDuration) {
			alerts.push(`High average query time: ${this.metrics.database.avgQueryTime}ms`);
		}

		if (this.metrics.database.errorRate > this.alertThresholds.database.errorRate) {
			alerts.push(
				`High database error rate: ${(this.metrics.database.errorRate * 100).toFixed(2)}%`
			);
		}

		// ElectricSQL alerts
		if (this.metrics.electric.syncLatency > this.alertThresholds.electric.syncLatency) {
			alerts.push(`High ElectricSQL sync latency: ${this.metrics.electric.syncLatency}ms`);
		}

		if (this.metrics.electric.errorRate > this.alertThresholds.electric.errorRate) {
			alerts.push(
				`High ElectricSQL error rate: ${(this.metrics.electric.errorRate * 100).toFixed(2)}%`
			);
		}

		// Send alerts if any
		if (alerts.length > 0) {
			this.sendAlerts(alerts);
		}
	}

	private async sendAlerts(alerts: string[]): Promise<void> {
		for (const alert of alerts) {
			observability.recordEvent("alert.triggered", {
				message: alert,
				timestamp: new Date(),
			});

			console.warn(`🚨 ALERT: ${alert}`);

			// Here you would implement actual alert sending (Slack, email, etc.)
		}
	}

	// Mock implementations - these would be replaced with actual monitoring logic
	private async performDatabaseHealthCheck(): Promise<boolean> {
		// Mock implementation
		return Math.random() > 0.1; // 90% success rate
	}

	private async performElectricHealthCheck(): Promise<boolean> {
		// Mock implementation
		return Math.random() > 0.05; // 95% success rate
	}

	private async getDatabaseConnectionCount(): Promise<number> {
		return Math.floor(Math.random() * 10) + 1;
	}

	private async getActiveQueryCount(): Promise<number> {
		return Math.floor(Math.random() * 5);
	}

	private async getAverageQueryTime(): Promise<number> {
		return Math.floor(Math.random() * 1000) + 100;
	}

	private async getDatabaseErrorRate(): Promise<number> {
		return Math.random() * 0.05; // 0-5% error rate
	}

	private async getElectricSyncLatency(): Promise<number> {
		return Math.floor(Math.random() * 5000) + 100;
	}

	private async getElectricConnectionCount(): Promise<number> {
		return Math.floor(Math.random() * 100) + 10;
	}

	private async getElectricErrorRate(): Promise<number> {
		return Math.random() * 0.02; // 0-2% error rate
	}

	private async getLastSyncTime(): Promise<Date> {
		return new Date(Date.now() - Math.random() * 60000); // Within last minute
	}

	private async getCPUUsage(): Promise<number> {
		return Math.random() * 100;
	}

	private async getRequestRate(): Promise<number> {
		return Math.floor(Math.random() * 1000) + 100;
	}

	private async getApplicationErrorRate(): Promise<number> {
		return Math.random() * 0.03; // 0-3% error rate
	}
}

// Singleton instance
export const deploymentMonitor = new DeploymentMonitor();
