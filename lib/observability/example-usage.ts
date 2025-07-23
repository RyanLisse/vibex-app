/**
 * Enhanced Observability System Usage Examples
 *
 * Demonstrates how to use the enhanced observability system for
 * comprehensive agent execution tracking and monitoring.
 */

import { agentTracking, enhancedObservability } from "./enhanced-events-system";
import { performanceAggregation } from "./performance-aggregation";
import { eventStream } from "./streaming";

// Example 1: Simple Agent Execution Tracking
export async function exampleSimpleTracking() {
	console.log("=== Simple Agent Execution Tracking ===");

	const result = await agentTracking.trackExecution(
		"code-generator",
		"generate-component",
		async () => {
			// Simulate agent work
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Simulate some processing
			const component = {
				name: "Button",
				props: ["onClick", "children", "variant"],
				code: "export function Button({ onClick, children, variant = 'primary' }) { ... }",
			};

			return component;
		},
		{
			prompt: "Create a reusable Button component",
			framework: "React",
			typescript: true,
		},
		"task-123", // taskId
		"user-456", // userId
		"session-789" // sessionId
	);

	console.log("Generated component:", result);
}

// Example 2: Manual Execution Tracking with Steps
export async function exampleManualTracking() {
	console.log("=== Manual Agent Execution Tracking ===");

	const executionId = await enhancedObservability.startAgentExecution(
		"code-reviewer",
		"review-pull-request",
		{
			repository: "my-app",
			pullRequestId: "pr-123",
			files: ["src/components/Button.tsx", "src/utils/helpers.ts"],
		},
		"task-456",
		"user-789"
	);

	try {
		// Step 1: Analyze code structure
		await enhancedObservability.recordExecutionStep(
			executionId,
			"analyze-structure",
			{
				filesAnalyzed: 2,
				linesOfCode: 150,
				complexity: "medium",
			},
			500 // duration in ms
		);

		// Step 2: Check for issues
		await enhancedObservability.recordExecutionStep(
			executionId,
			"check-issues",
			{
				issuesFound: 3,
				severity: ["minor", "minor", "major"],
				categories: ["style", "performance", "security"],
			},
			750
		);

		// Step 3: Generate suggestions
		await enhancedObservability.recordExecutionStep(
			executionId,
			"generate-suggestions",
			{
				suggestionsCount: 5,
				autoFixable: 2,
			},
			300
		);

		// Complete successfully
		const reviewResult = {
			status: "completed",
			issues: [
				{ type: "style", message: "Consider using consistent indentation" },
				{ type: "performance", message: "Optimize re-renders with useMemo" },
				{ type: "security", message: "Sanitize user input" },
			],
			suggestions: [
				"Add PropTypes validation",
				"Extract reusable logic to custom hook",
				"Add error boundaries",
				"Improve accessibility",
				"Add unit tests",
			],
		};

		await enhancedObservability.completeAgentExecution(executionId, reviewResult, {
			executionTime: 1550,
			memoryUsage: 2 * 1024 * 1024, // 2MB
			tokenCount: 1200,
			apiCalls: 3,
		});

		console.log("Code review completed:", reviewResult);
	} catch (error) {
		// Handle failure
		await enhancedObservability.failAgentExecution(executionId, error as Error, {
			executionTime: 800,
			memoryUsage: 1 * 1024 * 1024,
		});
		throw error;
	}
}

// Example 3: Real-time Event Streaming
export function exampleEventStreaming() {
	console.log("=== Real-time Event Streaming ===");

	// Subscribe to all agent execution events
	const allEventsSubscription = eventStream.subscribeToAll((event) => {
		console.log(`[${event.timestamp.toISOString()}] ${event.type}: ${event.message}`);
	});

	// Subscribe to errors only
	const errorSubscription = eventStream.subscribeToErrors((event) => {
		console.error(`🚨 Error: ${event.message}`, event.metadata);
	});

	// Subscribe to specific agent type
	const codeGenSubscription = eventStream.manager.subscribe(
		{
			sources: ["agent"],
			tags: ["code-generator"],
		},
		(event) => {
			console.log(`🤖 Code Generator: ${event.message}`);
		}
	);

	// Advanced subscription with rate limiting and aggregation
	const aggregatedSubscription = eventStream.manager.subscribeWithAdvancedFilter(
		{
			types: ["execution_start", "execution_end"],
			severities: ["info"],
			rateLimit: {
				maxEventsPerSecond: 5,
				burstSize: 10,
			},
			aggregation: {
				enabled: true,
				windowMs: 10000, // 10 seconds
				groupBy: ["agentType"],
			},
		},
		(events) => {
			if (Array.isArray(events)) {
				console.log(`📊 Aggregated ${events.length} events in 10s window`);
				const byAgent = events.reduce(
					(acc, event) => {
						const agentType = event.metadata.agentType || "unknown";
						acc[agentType] = (acc[agentType] || 0) + 1;
						return acc;
					},
					{} as Record<string, number>
				);
				console.log("By agent type:", byAgent);
			}
		}
	);

	// Cleanup function
	return () => {
		eventStream.unsubscribe(allEventsSubscription);
		eventStream.unsubscribe(errorSubscription);
		eventStream.unsubscribe(codeGenSubscription);
		eventStream.unsubscribe(aggregatedSubscription);
	};
}

// Example 4: Performance Monitoring
export async function examplePerformanceMonitoring() {
	console.log("=== Performance Monitoring ===");

	// Get system health metrics
	const healthMetrics = await performanceAggregation.getSystemHealthMetrics();

	console.log("System Health Overview:");
	console.log(`- Status: ${healthMetrics.overall.status} (${healthMetrics.overall.score}/100)`);
	console.log(`- Success Rate: ${healthMetrics.executions.successRate.toFixed(1)}%`);
	console.log(`- Average Response Time: ${healthMetrics.executions.averageDuration}ms`);
	console.log(`- Error Rate: ${healthMetrics.errors.rate.toFixed(2)}%`);
	console.log(`- Active Agents: ${healthMetrics.agents.active}`);

	// Get detailed performance metrics
	const performanceMetrics = await performanceAggregation.collectPerformanceMetrics(60);

	console.log("\nDetailed Performance Metrics:");
	performanceMetrics.forEach((metric) => {
		console.log(`- ${metric.name}:`);
		console.log(`  Average: ${metric.average.toFixed(2)}`);
		console.log(`  P95: ${metric.p95.toFixed(2)}`);
		console.log(`  Trend: ${metric.trend}`);
		if (Object.keys(metric.labels).length > 0) {
			console.log(`  Labels: ${JSON.stringify(metric.labels)}`);
		}
	});

	// Monitor agent performance by type
	console.log("\nAgent Performance by Type:");
	Object.entries(healthMetrics.agents.averageExecutionTime).forEach(([agentType, avgTime]) => {
		const errorRate = healthMetrics.agents.errorRates[agentType] || 0;
		console.log(`- ${agentType}: ${avgTime}ms avg, ${errorRate.toFixed(1)}% errors`);
	});
}

// Example 5: Health Monitoring and Alerting
export async function exampleHealthMonitoring() {
	console.log("=== Health Monitoring ===");

	const healthMetrics = await agentTracking.getHealthMetrics();

	// Check if system is healthy
	if (healthMetrics.errorRate > 10) {
		console.warn(`⚠️  High error rate detected: ${healthMetrics.errorRate.toFixed(2)}%`);
	}

	if (healthMetrics.averageExecutionTime > 5000) {
		console.warn(`⚠️  Slow response times detected: ${healthMetrics.averageExecutionTime}ms`);
	}

	if (healthMetrics.memoryUsage > 500 * 1024 * 1024) {
		// 500MB
		console.warn(`⚠️  High memory usage: ${Math.round(healthMetrics.memoryUsage / 1024 / 1024)}MB`);
	}

	// Get active executions
	const activeExecutions = enhancedObservability.getActiveExecutions();
	if (activeExecutions.length > 10) {
		console.warn(`⚠️  Many active executions: ${activeExecutions.length}`);
	}

	console.log("Health Check Summary:");
	console.log(`- Active Executions: ${healthMetrics.activeExecutions}`);
	console.log(`- Total Executions: ${healthMetrics.totalExecutions}`);
	console.log(`- Error Rate: ${healthMetrics.errorRate.toFixed(2)}%`);
	console.log(`- Average Execution Time: ${healthMetrics.averageExecutionTime}ms`);
	console.log(`- Memory Usage: ${Math.round(healthMetrics.memoryUsage / 1024 / 1024)}MB`);
	console.log(`- Event Buffer Size: ${healthMetrics.eventBufferSize}`);
}

// Example 6: Complete Workflow Monitoring
export async function exampleWorkflowMonitoring() {
	console.log("=== Complete Workflow Monitoring ===");

	// Start event streaming
	const cleanup = exampleEventStreaming();

	try {
		// Run multiple agent operations
		await Promise.all([exampleSimpleTracking(), exampleManualTracking()]);

		// Wait a bit for events to be processed
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Check performance
		await examplePerformanceMonitoring();

		// Check health
		await exampleHealthMonitoring();
	} finally {
		// Cleanup subscriptions
		cleanup();
	}
}

// Run examples if this file is executed directly
if (require.main === module) {
	exampleWorkflowMonitoring().catch(console.error);
}
