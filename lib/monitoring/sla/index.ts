/**
 * SLA Monitoring and Reporting System
 *
 * Tracks service level agreements and generates compliance reports
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/config";
import { observability } from "@/lib/observability";
import { notificationManager } from "../notifications";
import {
	metrics as prometheusMetrics,
	prometheusRegistry,
} from "../prometheus";

export interface SLATarget {
	name: string;
	metric: string;
	target: number;
	window: "hour" | "day" | "week" | "month";
	calculation: "average" | "percentile" | "count";
	description?: string;
}

export interface SLAResult {
	target: SLATarget;
	actual: number;
	achieved: boolean;
	percentage: number;
	timeRange: {
		start: Date;
		end: Date;
	};
	samples: number;
}

export interface SLAReport {
	period: string;
	generatedAt: Date;
	overallCompliance: number;
	results: SLAResult[];
	violations: SLAViolation[];
	errorBudget: {
		total: number;
		used: number;
		remaining: number;
		percentage: number;
	};
}

export interface SLAViolation {
	target: string;
	timestamp: Date;
	duration: number;
	severity: "minor" | "major" | "critical";
	impact: string;
}

// Default SLA targets
const defaultSLATargets: SLATarget[] = [
	{
		name: "Service Availability",
		metric: "availability",
		target: 99.9, // 99.9%
		window: "month",
		calculation: "average",
		description: "Service must be available 99.9% of the time",
	},
	{
		name: "API Response Time (p95)",
		metric: "response_time_p95",
		target: 1000, // 1 second
		window: "day",
		calculation: "percentile",
		description: "95% of API requests must complete within 1 second",
	},
	{
		name: "API Response Time (p99)",
		metric: "response_time_p99",
		target: 2000, // 2 seconds
		window: "day",
		calculation: "percentile",
		description: "99% of API requests must complete within 2 seconds",
	},
	{
		name: "Error Rate",
		metric: "error_rate",
		target: 1, // 1%
		window: "hour",
		calculation: "average",
		description: "Error rate must be below 1%",
	},
	{
		name: "Database Query Time (p95)",
		metric: "db_query_time_p95",
		target: 100, // 100ms
		window: "hour",
		calculation: "percentile",
		description: "95% of database queries must complete within 100ms",
	},
	{
		name: "Concurrent Users",
		metric: "concurrent_users",
		target: 1000, // Support 1000 concurrent users
		window: "hour",
		calculation: "average",
		description: "System must support at least 1000 concurrent users",
	},
];

// SLA Monitor class
export class SLAMonitor {
	private targets: SLATarget[] = [];
	private violations: SLAViolation[] = [];
	private monitoringInterval: NodeJS.Timeout | null = null;
	private reportingInterval: NodeJS.Timeout | null = null;
	private config: any;

	async initialize(config: any): Promise<void> {
		this.config = config;
		this.targets = [...defaultSLATargets, ...(config.targets || [])];

		// Start monitoring
		this.startMonitoring();

		// Start reporting
		this.startReporting(config.reportingInterval || 3_600_000); // Default 1 hour

		console.log(
			`📊 SLA monitoring initialized with ${this.targets.length} targets`,
		);
	}

	private startMonitoring(): void {
		// Check SLAs every minute
		this.monitoringInterval = setInterval(() => {
			this.checkSLAs();
		}, 60_000);

		// Initial check
		this.checkSLAs();
	}

	private startReporting(interval: number): void {
		this.reportingInterval = setInterval(() => {
			this.generateReport("day");
		}, interval);
	}

	private async checkSLAs(): Promise<void> {
		for (const target of this.targets) {
			try {
				const result = await this.evaluateSLA(target);

				if (!result.achieved) {
					// SLA violation
					const violation: SLAViolation = {
						target: target.name,
						timestamp: new Date(),
						duration: 0, // Will be updated when resolved
						severity: this.calculateSeverity(target, result),
						impact: `${target.name} is at ${result.actual.toFixed(2)} (target: ${target.target})`,
					};

					this.violations.push(violation);

					// Send alert
					await notificationManager.sendNotification({
						title: `SLA Violation: ${target.name}`,
						message: violation.impact,
						severity: violation.severity === "critical" ? "critical" : "high",
						data: {
							target: target.name,
							actual: result.actual,
							target_value: target.target,
							compliance: result.percentage,
						},
					});

					// Record in observability
					observability.recordEvent("sla.violation", {
						target: target.name,
						actual: result.actual,
						target_value: target.target,
						severity: violation.severity,
					});
				}
			} catch (error) {
				console.error(`Failed to evaluate SLA ${target.name}:`, error);
			}
		}
	}

	private async evaluateSLA(target: SLATarget): Promise<SLAResult> {
		const now = new Date();
		const windowMs = this.getWindowMs(target.window);
		const start = new Date(now.getTime() - windowMs);

		let actual: number;
		let samples = 0;

		switch (target.metric) {
			case "availability": {
				const { availabilityResult, availabilitySamples } =
					await this.calculateAvailability(start, now);
				actual = availabilityResult;
				samples = availabilitySamples;
				break;
			}

			case "response_time_p95": {
				const { p95Result, p95Samples } =
					await this.calculateResponseTimePercentile(start, now, 0.95);
				actual = p95Result;
				samples = p95Samples;
				break;
			}

			case "response_time_p99": {
				const { p99Result, p99Samples } =
					await this.calculateResponseTimePercentile(start, now, 0.99);
				actual = p99Result;
				samples = p99Samples;
				break;
			}

			case "error_rate": {
				const { errorRateResult, errorRateSamples } =
					await this.calculateErrorRate(start, now);
				actual = errorRateResult;
				samples = errorRateSamples;
				break;
			}

			case "db_query_time_p95": {
				const { dbP95Result, dbP95Samples } =
					await this.calculateDatabasePercentile(start, now, 0.95);
				actual = dbP95Result;
				samples = dbP95Samples;
				break;
			}

			case "concurrent_users":
				actual = await this.getConcurrentUsers();
				samples = 1;
				break;

			default:
				actual = 0;
				samples = 0;
		}

		// Determine if SLA is achieved
		const achieved =
			target.metric === "error_rate" || target.metric.includes("time")
				? actual <= target.target // Lower is better for error rate and response times
				: actual >= target.target; // Higher is better for availability and concurrent users

		const percentage =
			target.metric === "error_rate" || target.metric.includes("time")
				? Math.max(0, (target.target / actual) * 100)
				: Math.min(100, (actual / target.target) * 100);

		return {
			target,
			actual,
			achieved,
			percentage,
			timeRange: { start, end: now },
			samples,
		};
	}

	private async calculateAvailability(
		start: Date,
		end: Date,
	): Promise<{ availabilityResult: number; availabilitySamples: number }> {
		// In a real implementation, query actual metrics
		// For demo, we'll use mock data
		const totalRequests = 10_000;
		const successfulRequests = 9990;

		return {
			availabilityResult: (successfulRequests / totalRequests) * 100,
			availabilitySamples: totalRequests,
		};
	}

	private async calculateResponseTimePercentile(
		start: Date,
		end: Date,
		percentile: number,
	): Promise<
		| { p95Result: number; p95Samples: number }
		| { p99Result: number; p99Samples: number }
	> {
		// Mock implementation
		const baseTime = 500; // 500ms base
		const variance = Math.random() * 1000; // Up to 1s variance
		const result = baseTime + variance * percentile;

		return percentile === 0.95
			? { p95Result: result, p95Samples: 1000 }
			: { p99Result: result * 1.5, p99Samples: 1000 };
	}

	private async calculateErrorRate(
		start: Date,
		end: Date,
	): Promise<{ errorRateResult: number; errorRateSamples: number }> {
		// Mock implementation
		const errorRate = Math.random() * 2; // 0-2% error rate

		return {
			errorRateResult: errorRate,
			errorRateSamples: 10_000,
		};
	}

	private async calculateDatabasePercentile(
		start: Date,
		end: Date,
		percentile: number,
	): Promise<{ dbP95Result: number; dbP95Samples: number }> {
		// Mock implementation
		const baseTime = 50; // 50ms base
		const variance = Math.random() * 100; // Up to 100ms variance

		return {
			dbP95Result: baseTime + variance * percentile,
			dbP95Samples: 5000,
		};
	}

	private async getConcurrentUsers(): Promise<number> {
		// Mock implementation
		return 500 + Math.floor(Math.random() * 1000); // 500-1500 users
	}

	private getWindowMs(window: SLATarget["window"]): number {
		const windows = {
			hour: 3_600_000,
			day: 86_400_000,
			week: 604_800_000,
			month: 2_592_000_000,
		};
		return windows[window];
	}

	private calculateSeverity(
		target: SLATarget,
		result: SLAResult,
	): SLAViolation["severity"] {
		const deviationPercent = Math.abs(100 - result.percentage);

		if (deviationPercent < 5) return "minor";
		if (deviationPercent < 10) return "major";
		return "critical";
	}

	async generateReport(
		period: "hour" | "day" | "week" | "month",
	): Promise<SLAReport> {
		const now = new Date();
		const windowMs = this.getWindowMs(period);
		const start = new Date(now.getTime() - windowMs);

		const results: SLAResult[] = [];
		let totalCompliance = 0;

		for (const target of this.targets) {
			const result = await this.evaluateSLA(target);
			results.push(result);
			totalCompliance += result.percentage;
		}

		const overallCompliance = totalCompliance / this.targets.length;

		// Calculate error budget
		const errorBudgetTotal = 100 - 99.9; // 0.1% error budget for 99.9% SLA
		const errorBudgetUsed = 100 - overallCompliance;
		const errorBudgetRemaining = Math.max(
			0,
			errorBudgetTotal - errorBudgetUsed,
		);

		// Get violations for the period
		const periodViolations = this.violations.filter(
			(v) => v.timestamp.getTime() > start.getTime(),
		);

		const report: SLAReport = {
			period,
			generatedAt: now,
			overallCompliance,
			results,
			violations: periodViolations,
			errorBudget: {
				total: errorBudgetTotal,
				used: errorBudgetUsed,
				remaining: errorBudgetRemaining,
				percentage: (errorBudgetRemaining / errorBudgetTotal) * 100,
			},
		};

		// Store report
		await this.storeReport(report);

		// Send report notification if compliance is low
		if (overallCompliance < 99) {
			await notificationManager.sendNotification({
				title: `SLA Report: ${period}`,
				message: `Overall compliance: ${overallCompliance.toFixed(2)}% - Below target!`,
				severity: overallCompliance < 95 ? "critical" : "high",
				data: {
					period,
					compliance: overallCompliance,
					violations: periodViolations.length,
					errorBudgetRemaining: errorBudgetRemaining.toFixed(3),
				},
			});
		}

		return report;
	}

	private async storeReport(report: SLAReport): Promise<void> {
		// Store in observability events
		observability.recordEvent("sla.report", {
			period: report.period,
			compliance: report.overallCompliance,
			violations: report.violations.length,
			errorBudget: report.errorBudget,
		});
	}

	getTargets(): SLATarget[] {
		return [...this.targets];
	}

	getViolations(limit = 100): SLAViolation[] {
		return this.violations
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
			.slice(0, limit);
	}

	async getHistoricalCompliance(
		period: "day" | "week" | "month",
	): Promise<{ date: Date; compliance: number }[]> {
		// Mock historical data
		const data: { date: Date; compliance: number }[] = [];
		const days = period === "day" ? 24 : period === "week" ? 7 : 30;

		for (let i = 0; i < days; i++) {
			const date = new Date();
			date.setDate(date.getDate() - i);
			data.push({
				date,
				compliance: 99 + Math.random() * 1, // 99-100% compliance
			});
		}

		return data.reverse();
	}

	stop(): void {
		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}

		if (this.reportingInterval) {
			clearInterval(this.reportingInterval);
			this.reportingInterval = null;
		}
	}
}

// Export singleton instance
export const slaMonitor = new SLAMonitor();

// Initialize SLA monitoring
export async function initializeSLAMonitoring(config: any): Promise<void> {
	await slaMonitor.initialize(config);
}

// Convenience functions
export async function getSLAReport(
	period: "hour" | "day" | "week" | "month",
): Promise<SLAReport> {
	return slaMonitor.generateReport(period);
}

export function getSLATargets(): SLATarget[] {
	return slaMonitor.getTargets();
}

export function getSLAViolations(limit?: number): SLAViolation[] {
	return slaMonitor.getViolations(limit);
}

export async function getHistoricalSLACompliance(
	period: "day" | "week" | "month",
): Promise<{ date: Date; compliance: number }[]> {
	return slaMonitor.getHistoricalCompliance(period);
}
