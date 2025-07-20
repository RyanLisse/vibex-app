/**
 * Comprehensive Database Observability Integration Test
 *
 * Validates the complete database monitoring and observability stack:
 * - Query performance tracking
 * - Connection pool monitoring
 * - Transaction tracking
 * - Error rate monitoring
 * - Slow query detection
 * - Database health checks
 * - Metrics export to Prometheus/Grafana
 */

	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	test,
} from "bun:test";
import type { Database } from "@/db";
import { AlertRuleBuilder } from "@/lib/metrics/alert-rules";
import { GrafanaDashboardBuilder } from "@/lib/metrics/grafana-dashboards";
import { PrometheusMetricsCollector } from "@/lib/metrics/prometheus-client";
import { observability } from "@/lib/observability";

// Mock database operations for testing
class MockDatabase {
	private connectionCount = 0;
	private maxConnections = 100;
	private queryLog: Array<{ query: string; duration: number; error?: string }> =
		[];

	async connect() {
		if (this.connectionCount >= this.maxConnections) {
			throw new Error("Connection pool exhausted");
		}
		this.connectionCount++;
		return { id: this.connectionCount };
	}

	async disconnect(connection: { id: number }) {
		this.connectionCount--;
	}

	async query(sql: string, params?: any[]): Promise<any> {
		const start = Date.now();

		// Simulate different query patterns
		let duration = 10; // Default fast query
		let error: string | undefined;

		if (sql.includes("slow_table")) {
			duration = 2000; // Slow query
		} else if (sql.includes("complex_join")) {
			duration = 500; // Medium query
		} else if (sql.includes("error_table")) {
			error = "Table does not exist";
			duration = 5;
		}

		// Simulate query execution
		await new Promise((resolve) => setTimeout(resolve, duration));

		const queryInfo = { query: sql, duration, error };
		this.queryLog.push(queryInfo);

		if (error) {
			throw new Error(error);
		}

		// Return mock results
		return {
			rows: sql.includes("SELECT") ? [{ id: 1, data: "mock" }] : [],
			rowCount: 1,
		};
	}

	getStats() {
		return {
			activeConnections: this.connectionCount,
			maxConnections: this.maxConnections,
			totalQueries: this.queryLog.length,
			avgQueryTime:
				this.queryLog.reduce((sum, q) => sum + q.duration, 0) /
					this.queryLog.length || 0,
			errorCount: this.queryLog.filter((q) => q.error).length,
		};
	}

	getQueryLog() {
		return [...this.queryLog];
	}

	reset() {
		this.connectionCount = 0;
		this.queryLog = [];
	}
}

// Performance monitor for test validation
class DatabaseMonitor {
	private metrics = new Map<string, number[]>();
	private errors = new Map<string, number>();

	recordQuery(type: string, duration: number) {
		const key = `query_${type}`;
		if (!this.metrics.has(key)) {
			this.metrics.set(key, []);
		}
		this.metrics.get(key)!.push(duration);
	}

	recordError(type: string) {
		this.errors.set(type, (this.errors.get(type) || 0) + 1);
	}

	getMetrics() {
		const report: any = {};

		for (const [key, durations] of this.metrics) {
			const sorted = [...durations].sort((a, b) => a - b);
			report[key] = {
				count: durations.length,
				min: Math.min(...durations),
				max: Math.max(...durations),
				avg: durations.reduce((a, b) => a + b, 0) / durations.length,
				p50: sorted[Math.floor(sorted.length * 0.5)],
				p95: sorted[Math.floor(sorted.length * 0.95)],
				p99: sorted[Math.floor(sorted.length * 0.99)],
			};
		}

		report.errors = Object.fromEntries(this.errors);
		return report;
	}
}

describe("Database Observability Comprehensive Integration", () => {
	let metricsCollector: PrometheusMetricsCollector;
	let mockDb: MockDatabase;
	let monitor: DatabaseMonitor;

	beforeAll(() => {
		metricsCollector = PrometheusMetricsCollector.getInstance();
		mockDb = new MockDatabase();
		monitor = new DatabaseMonitor();
	});

	beforeEach(() => {
		metricsCollector.clearMetrics();
		mockDb.reset();
	});

	afterAll(() => {
		console.log("\n=== Database Observability Performance Report ===");
		console.log(JSON.stringify(monitor.getMetrics(), null, 2));
	});

	describe("1. Query Performance Tracking", () => {
		test("should track query execution times by type", async () => {
			// Execute various query types
			const queries = [
				{ sql: "SELECT * FROM users WHERE id = ?", type: "simple_select" },
				{
					sql: "SELECT u.*, p.* FROM users u JOIN profiles p ON u.id = p.user_id",
					type: "join",
				},
				{
					sql: "INSERT INTO users (name, email) VALUES (?, ?)",
					type: "insert",
				},
				{
					sql: "UPDATE users SET last_login = NOW() WHERE id = ?",
					type: "update",
				},
				{ sql: "DELETE FROM sessions WHERE expired < NOW()", type: "delete" },
			];

			for (const query of queries) {
				const start = Date.now();
				try {
					await mockDb.query(query.sql, [1]);
					const duration = Date.now() - start;

					// Record in observability
					observability.database.recordQuery(query.type, query.sql, duration);
					metricsCollector.recordDatabaseQuery(
						query.type.split("_")[0].toUpperCase(),
						"users",
						duration / 1000,
					);

					monitor.recordQuery(query.type, duration);
				} catch (error) {
					monitor.recordError(query.type);
				}
			}

			// Verify metrics collection
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds");
			expect(metrics).toContain('operation="SELECT"');
			expect(metrics).toContain('operation="INSERT"');
			expect(metrics).toContain('operation="UPDATE"');
			expect(metrics).toContain('operation="DELETE"');

			// Verify observability tracking
			const queryMetrics = observability.database.getMetrics();
			expect(queryMetrics.totalQueries).toBeGreaterThan(0);
			expect(queryMetrics.avgDuration).toBeGreaterThan(0);
		});

		test("should detect and track slow queries", async () => {
			const slowQueries = [];

			// Set up slow query tracking
			observability.database.onSlowQuery((query) => {
				slowQueries.push(query);
			});

			// Execute mix of fast and slow queries
			const queries = [
				{ sql: "SELECT * FROM fast_table", expectSlow: false },
				{
					sql: "SELECT * FROM slow_table WITH COMPLEX CONDITIONS",
					expectSlow: true,
				},
				{ sql: "SELECT * FROM users", expectSlow: false },
				{
					sql: "SELECT * FROM slow_table JOIN other_slow_table",
					expectSlow: true,
				},
			];

			for (const query of queries) {
				const start = Date.now();
				await mockDb.query(query.sql).catch(() => {});
				const duration = Date.now() - start;

				observability.database.recordQuery("select", query.sql, duration);

				if (duration > 1000) {
					metricsCollector.recordDatabaseQuery(
						"SLOW_QUERY",
						"various",
						duration / 1000,
					);
				}
			}

			// Verify slow query detection
			expect(slowQueries.length).toBeGreaterThanOrEqual(2);
			slowQueries.forEach((sq) => {
				expect(sq.duration).toBeGreaterThan(1000);
				expect(sq.query).toContain("slow_table");
			});

			// Check Grafana dashboard would show slow queries
			const dashboard = GrafanaDashboardBuilder.createSystemHealthDashboard();
			const slowQueryPanel = dashboard.panels.find((p) =>
				p.title.includes("Database"),
			);
			expect(slowQueryPanel).toBeDefined();
		});

		test("should track query patterns and statistics", async () => {
			// Execute pattern of queries
			for (let i = 0; i < 100; i++) {
				const queryType = ["SELECT", "INSERT", "UPDATE"][i % 3];
				const table = ["users", "posts", "comments"][i % 3];
				const query = `${queryType} ${queryType === "SELECT" ? "*" : "data"} FROM ${table}`;

				const start = Date.now();
				await mockDb.query(query).catch(() => {});
				const duration = Date.now() - start;

				observability.database.recordQuery(
					queryType.toLowerCase(),
					query,
					duration,
				);
				metricsCollector.recordDatabaseQuery(queryType, table, duration / 1000);
			}

			// Get query statistics
			const stats = observability.database.getQueryStats();
			expect(stats.select).toBeDefined();
			expect(stats.insert).toBeDefined();
			expect(stats.update).toBeDefined();

			// Verify percentiles
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds_bucket");
		});
	});

	describe("2. Connection Pool Monitoring", () => {
		test("should monitor connection pool usage", async () => {
			const connections = [];

			// Simulate connection pool usage
			for (let i = 0; i < 20; i++) {
				const conn = await mockDb.connect();
				connections.push(conn);

				const stats = mockDb.getStats();
				metricsCollector.setDatabaseConnections(
					"postgres",
					"main",
					stats.activeConnections,
				);
				observability.database.updateConnectionPool({
					active: stats.activeConnections,
					idle: stats.maxConnections - stats.activeConnections,
					total: stats.maxConnections,
				});
			}

			// Check metrics
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_connections_active");
			expect(metrics).toContain("20"); // Current connections

			// Release some connections
			for (let i = 0; i < 10; i++) {
				await mockDb.disconnect(connections[i]);
			}

			const finalStats = mockDb.getStats();
			metricsCollector.setDatabaseConnections(
				"postgres",
				"main",
				finalStats.activeConnections,
			);

			const updatedMetrics = await metricsCollector.getMetrics();
			expect(updatedMetrics).toContain("10"); // Reduced connections
		});

		test("should alert on connection pool exhaustion", async () => {
			const connections = [];
			const alerts = [];

			// Set up alert monitoring
			const alertRules = AlertRuleBuilder.createSystemAlerts();
			const connectionAlert = alertRules.find(
				(a) => a.alert === "DatabaseConnectionsHigh",
			);
			expect(connectionAlert).toBeDefined();

			// Fill connection pool
			try {
				for (let i = 0; i < 110; i++) {
					const conn = await mockDb.connect();
					connections.push(conn);

					const stats = mockDb.getStats();
					const usage = (stats.activeConnections / stats.maxConnections) * 100;

					metricsCollector.setDatabaseConnections(
						"postgres",
						"main",
						stats.activeConnections,
					);

					if (usage > 80) {
						alerts.push({
							level: "warning",
							message: `Connection pool usage high: ${usage.toFixed(1)}%`,
						});
					}
				}
			} catch (error: any) {
				expect(error.message).toContain("Connection pool exhausted");
				alerts.push({
					level: "critical",
					message: "Connection pool exhausted",
				});
			}

			// Verify alerts triggered
			expect(alerts.length).toBeGreaterThan(0);
			expect(alerts.some((a) => a.level === "critical")).toBe(true);

			// Clean up
			for (const conn of connections) {
				await mockDb.disconnect(conn).catch(() => {});
			}
		});
	});

	describe("3. Transaction Monitoring", () => {
		test("should track transaction lifecycle", async () => {
			// Simulate transaction
			const transactionId = `tx_${Date.now()}`;
			const transactionStart = Date.now();

			observability.database.startTransaction(transactionId);

			// Execute queries within transaction
			const queries = [
				"BEGIN",
				"SELECT * FROM accounts WHERE id = 1 FOR UPDATE",
				"UPDATE accounts SET balance = balance - 100 WHERE id = 1",
				"UPDATE accounts SET balance = balance + 100 WHERE id = 2",
				"INSERT INTO transactions (from_id, to_id, amount) VALUES (1, 2, 100)",
				"COMMIT",
			];

			for (const query of queries) {
				const start = Date.now();
				await mockDb.query(query).catch(() => {});
				const duration = Date.now() - start;

				observability.database.recordQuery(
					"transaction",
					query,
					duration,
					transactionId,
				);
			}

			const transactionDuration = Date.now() - transactionStart;
			observability.database.endTransaction(transactionId, true);

			metricsCollector.recordDatabaseQuery(
				"TRANSACTION",
				"multi_table",
				transactionDuration / 1000,
			);

			// Verify transaction metrics
			const txStats = observability.database.getTransactionStats();
			expect(txStats.total).toBeGreaterThan(0);
			expect(txStats.successful).toBeGreaterThan(0);
			expect(txStats.avgDuration).toBeGreaterThan(0);
		});

		test("should handle transaction rollbacks", async () => {
			const transactionId = `tx_rollback_${Date.now()}`;

			observability.database.startTransaction(transactionId);

			// Simulate failed transaction
			try {
				await mockDb.query("BEGIN");
				await mockDb.query(
					"UPDATE accounts SET balance = balance - 100 WHERE id = 1",
				);
				await mockDb.query("SELECT * FROM error_table"); // This will fail
				await mockDb.query("COMMIT");
			} catch (error) {
				await mockDb.query("ROLLBACK").catch(() => {});
				observability.database.endTransaction(
					transactionId,
					false,
					error as Error,
				);
				metricsCollector.recordDatabaseQuery("ROLLBACK", "accounts", 0.001);
			}

			// Verify rollback tracking
			const txStats = observability.database.getTransactionStats();
			expect(txStats.failed).toBeGreaterThan(0);
		});
	});

	describe("4. Error Rate Monitoring", () => {
		test("should track database errors by type", async () => {
			const errorQueries = [
				{
					sql: "SELECT * FROM non_existent_table",
					errorType: "table_not_found",
				},
				{
					sql: "INSERT INTO users (id) VALUES (1), (1)",
					errorType: "duplicate_key",
				},
				{ sql: "SELECT * FROM error_table", errorType: "general_error" },
				{ sql: "UPDATE locked_table SET data = 1", errorType: "lock_timeout" },
			];

			for (const { sql, errorType } of errorQueries) {
				try {
					await mockDb.query(sql);
				} catch (error: any) {
					observability.database.recordError(errorType, error);
					metricsCollector.recordHttpRequest("DATABASE", "/query", 500, 0.001);
					monitor.recordError(errorType);
				}
			}

			// Verify error tracking
			const errorStats = observability.database.getErrorStats();
			expect(errorStats.total).toBeGreaterThan(0);
			expect(errorStats.byType).toBeDefined();

			// Check error rate alerts
			const alerts = AlertRuleBuilder.createSystemAlerts();
			const dbErrorAlert = alerts.find((a) => a.alert.includes("Database"));
			expect(dbErrorAlert).toBeDefined();
		});

		test("should calculate error rates over time windows", async () => {
			// Generate errors over time
			for (let minute = 0; minute < 5; minute++) {
				const errorCount = minute === 2 ? 10 : 1; // Spike in minute 2

				for (let i = 0; i < errorCount; i++) {
					try {
						await mockDb.query("SELECT * FROM error_table");
					} catch (error: any) {
						observability.database.recordError("query_error", error);
						metricsCollector.recordDatabaseQuery("ERROR", "error_table", 0.001);
					}
				}

				// Simulate time passing
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Check error rate metrics
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds");

			// Verify spike detection
			const errorStats = observability.database.getErrorStats();
			expect(errorStats.total).toBeGreaterThan(10);
		});
	});

	describe("5. Database Health Checks", () => {
		test("should perform comprehensive health checks", async () => {
			const healthChecks = {
				connectivity: async () => {
					try {
						await mockDb.query("SELECT 1");
						return { status: "healthy", latency: 5 };
					} catch {
						return { status: "unhealthy", error: "Connection failed" };
					}
				},
				replication: async () => {
					// Simulate replication lag check
					const lag = Math.random() * 1000; // Random lag in ms
					return {
						status: lag < 500 ? "healthy" : "degraded",
						lag,
					};
				},
				diskSpace: async () => {
					// Simulate disk space check
					const used = Math.random() * 100;
					return {
						status: used < 80 ? "healthy" : "warning",
						usedPercent: used,
					};
				},
			};

			const results: any = {};
			for (const [check, fn] of Object.entries(healthChecks)) {
				results[check] = await fn();

				// Record health metrics
				metricsCollector.gauge(
					`database_health_${check}`,
					results[check].status === "healthy" ? 1 : 0,
				);
			}

			// Overall health status
			const overallHealth = Object.values(results).every(
				(r: any) => r.status === "healthy",
			)
				? "healthy"
				: "degraded";

			observability.database.updateHealth({
				status: overallHealth,
				checks: results,
				timestamp: Date.now(),
			});

			expect(results.connectivity.status).toBe("healthy");
			expect(results.replication).toBeDefined();
			expect(results.diskSpace).toBeDefined();
		});

		test("should integrate with monitoring dashboards", async () => {
			// Record various database metrics
			const operations = [
				{ type: "query", count: 1000 },
				{ type: "connection", count: 50 },
				{ type: "transaction", count: 100 },
				{ type: "error", count: 5 },
			];

			for (const op of operations) {
				for (let i = 0; i < op.count; i++) {
					if (op.type === "query") {
						metricsCollector.recordDatabaseQuery(
							"SELECT",
							"various",
							Math.random() * 0.1,
						);
					} else if (op.type === "connection") {
						metricsCollector.setDatabaseConnections("postgres", "main", i);
					} else if (op.type === "transaction") {
						metricsCollector.recordDatabaseQuery(
							"TRANSACTION",
							"various",
							Math.random() * 0.5,
						);
					} else if (op.type === "error") {
						metricsCollector.recordDatabaseQuery("ERROR", "various", 0.001);
					}
				}
			}

			// Verify dashboard compatibility
			const systemDashboard =
				GrafanaDashboardBuilder.createSystemHealthDashboard();
			const dbPanels = systemDashboard.panels.filter(
				(p) =>
					p.title.toLowerCase().includes("database") ||
					p.targets.some((t) => t.expr.includes("database")),
			);

			expect(dbPanels.length).toBeGreaterThan(0);

			// Verify all database metrics are represented
			const metrics = await metricsCollector.getMetrics();
			expect(metrics).toContain("database_query_duration_seconds");
			expect(metrics).toContain("database_connections_active");
		});
	});

	describe("6. Query Optimization Insights", () => {
		test("should identify optimization opportunities", async () => {
			const queryPatterns = [
				{
					query: "SELECT * FROM users WHERE email = ?",
					optimization: "Add index on email column",
					currentTime: 100,
					optimizedTime: 5,
				},
				{
					query: "SELECT COUNT(*) FROM large_table",
					optimization: "Use materialized view or cache",
					currentTime: 2000,
					optimizedTime: 10,
				},
				{
					query:
						"SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.status = ?",
					optimization: "Add composite index on (status, user_id)",
					currentTime: 500,
					optimizedTime: 50,
				},
			];

			const optimizationInsights = [];

			for (const pattern of queryPatterns) {
				// Execute query and measure
				const start = Date.now();
				await mockDb.query(pattern.query, ["test"]);
				const duration = Date.now() - start;

				if (duration > 100) {
					optimizationInsights.push({
						query: pattern.query,
						currentDuration: duration,
						suggestion: pattern.optimization,
						potentialImprovement: `${((1 - pattern.optimizedTime / pattern.currentTime) * 100).toFixed(0)}%`,
					});
				}

				observability.database.recordQuery("select", pattern.query, duration);
			}

			// Verify optimization insights
			expect(optimizationInsights.length).toBeGreaterThan(0);
			optimizationInsights.forEach((insight) => {
				expect(insight.suggestion).toBeDefined();
				expect(insight.potentialImprovement).toContain("%");
			});
		});
	});

	describe("7. Real-time Monitoring Integration", () => {
		test("should stream metrics in real-time format", async () => {
			const metricsStream = [];

			// Simulate real-time operations
			const operations = async () => {
				for (let i = 0; i < 10; i++) {
					// Random operations
					const ops = [
						() => mockDb.query("SELECT * FROM users"),
						() => mockDb.query("INSERT INTO logs (data) VALUES (?)", ["test"]),
						() => mockDb.query("UPDATE sessions SET last_active = NOW()"),
						() => mockDb.connect(),
					];

					const op = ops[Math.floor(Math.random() * ops.length)];
					const start = Date.now();

					try {
						await op();
						const duration = Date.now() - start;

						const metric = {
							timestamp: Date.now(),
							type: "database_operation",
							duration,
							success: true,
						};

						metricsStream.push(metric);

						// Update Prometheus metrics
						metricsCollector.recordDatabaseQuery(
							"REALTIME",
							"various",
							duration / 1000,
						);
					} catch (error) {
						metricsStream.push({
							timestamp: Date.now(),
							type: "database_error",
							duration: Date.now() - start,
							success: false,
							error,
						});
					}

					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			};

			await operations();

			// Verify real-time metrics
			expect(metricsStream.length).toBeGreaterThan(0);
			expect(metricsStream.some((m) => m.type === "database_operation")).toBe(
				true,
			);

			// Check Prometheus format
			const prometheusMetrics = await metricsCollector.getMetrics();
			expect(prometheusMetrics).toContain("database_query_duration_seconds");
			expect(prometheusMetrics).toContain("# HELP");
			expect(prometheusMetrics).toContain("# TYPE");
		});
	});
});
