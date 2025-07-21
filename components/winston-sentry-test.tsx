"use client";

import { useState } from "react";
import { getLogger } from "@/lib/logging";

/**
 * Test component for Winston-Sentry integration
 */
export function WinstonSentryTest() {
	const [result, setResult] = useState<string>("");
	const logger = getLogger("winston-sentry-test");

	const testWinstonLogging = () => {
		// Test different log levels
		logger.debug("Debug level message from Winston", { 
			testType: "winston-sentry",
			timestamp: new Date().toISOString()
		});
		
		logger.info("Info level message from Winston", {
			userId: "test-user-123",
			action: "test_logging",
			component: "WinstonSentryTest"
		});
		
		logger.warn("Warning level message from Winston", {
			reason: "This is a test warning",
			severity: "medium",
			metadata: { source: "winston" }
		});
		
		logger.error("Error level message from Winston", new Error("Test error from Winston"), {
			errorCode: "WINSTON_TEST_ERROR",
			context: "Testing Winston-Sentry integration"
		});
		
		setResult("Logs sent through Winston to Sentry!");
	};

	const testWinstonException = () => {
		try {
			throw new Error("Test exception for Winston-Sentry integration");
		} catch (error) {
			logger.error("Exception caught by Winston", error, {
				handler: "testWinstonException",
				severity: "high"
			});
			setResult("Exception logged through Winston to Sentry!");
		}
	};

	const testComplexLogging = () => {
		// Create a child logger with additional context
		const childLogger = logger.child("complex-operation");
		
		// Log operation start
		childLogger.info("Starting complex operation", {
			operationId: "op-" + Date.now(),
			steps: 3
		});
		
		// Simulate steps
		childLogger.debug("Step 1: Data validation", { status: "success" });
		childLogger.debug("Step 2: Processing", { status: "success" });
		childLogger.warn("Step 3: Minor issue encountered", { 
			issue: "Rate limit approaching",
			remaining: 100
		});
		
		// Log operation completion
		childLogger.info("Complex operation completed", {
			duration: 1500,
			result: "success_with_warnings"
		});
		
		setResult("Complex operation logged through Winston!");
	};

	const testPerformanceLogging = () => {
		const timer = logger.startTimer();
		
		// Simulate some work
		setTimeout(() => {
			timer.done({
				message: "Performance test completed",
				operation: "data_processing",
				recordsProcessed: 1000
			});
			
			setResult("Performance metrics logged through Winston!");
		}, 500);
	};

	return (
		<div className="space-y-6 p-6">
			<div>
				<h2 className="text-2xl font-bold mb-4">Winston-Sentry Integration Test</h2>
				<p className="text-gray-600 mb-6">
					Test the Winston logger integration with Sentry. Logs are sent through Winston and forwarded to Sentry.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Basic Logging */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Winston Logging Levels</h3>
					<p className="text-sm text-gray-600 mb-3">
						Test different Winston log levels that get sent to Sentry.
					</p>
					<button
						onClick={testWinstonLogging}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
					>
						Test Winston Logs
					</button>
				</div>

				{/* Exception Handling */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Winston Exception Logging</h3>
					<p className="text-sm text-gray-600 mb-3">
						Log exceptions through Winston to Sentry.
					</p>
					<button
						onClick={testWinstonException}
						className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					>
						Test Exception
					</button>
				</div>

				{/* Complex Logging */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Complex Winston Operations</h3>
					<p className="text-sm text-gray-600 mb-3">
						Test child loggers and multi-step operations.
					</p>
					<button
						onClick={testComplexLogging}
						className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
					>
						Test Complex Logging
					</button>
				</div>

				{/* Performance Logging */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Performance Metrics</h3>
					<p className="text-sm text-gray-600 mb-3">
						Log performance metrics through Winston.
					</p>
					<button
						onClick={testPerformanceLogging}
						className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
					>
						Test Performance
					</button>
				</div>
			</div>

			{/* Result Display */}
			{result && (
				<div className="mt-6 p-4 bg-gray-100 rounded-lg">
					<p className="text-sm font-mono">{result}</p>
				</div>
			)}

			{/* Information */}
			<div className="mt-8 p-4 bg-blue-50 rounded-lg">
				<h3 className="font-semibold mb-2">ℹ️ Winston-Sentry Integration</h3>
				<ul className="text-sm space-y-1 list-disc list-inside">
					<li>Winston logger is configured to send logs to Sentry</li>
					<li>Error and warning levels are sent as Sentry events</li>
					<li>All log levels are added as breadcrumbs for context</li>
					<li>Check your Sentry dashboard to see the integrated logs</li>
					<li>Winston provides structured logging with metadata</li>
				</ul>
			</div>
		</div>
	);
}