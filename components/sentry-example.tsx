"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { getLogger } from "@/lib/logging";
import { trackButtonClick } from "@/lib/sentry/instrumentation";
import { FeedbackButton } from "./sentry-feedback";

// Get the Winston logger for this component
const logger = getLogger("sentry-example");

/**
 * Example component demonstrating Sentry integration features
 */
export function SentryExample() {
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState<string>("");

	// Example: Exception handling
	const handleTestException = () => {
		trackButtonClick("Test Exception");

		try {
			// This will throw an error
			throw new Error("This is a test error for Sentry");
		} catch (error) {
			// Capture the exception
			Sentry.captureException(error, {
				tags: {
					component: "SentryExample",
					action: "test_exception",
				},
				level: "error",
			});

			setResult("Error captured and sent to Sentry!");
		}
	};

	// Example: Performance monitoring
	const handleTestPerformance = async () => {
		trackButtonClick("Test Performance");
		setIsLoading(true);

		await Sentry.startSpan(
			{
				op: "test.performance",
				name: "Performance Test Operation",
			},
			async (span) => {
				// Add custom attributes
				span.setAttribute("test.type", "performance");
				span.setAttribute("user.action", "button_click");

				// Simulate some work
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Log the operation through Winston
				logger.info("Performance test completed", {
					duration: 1000,
					operation: "test.performance",
				});

				setResult("Performance span recorded!");
			},
		);

		setIsLoading(false);
	};

	// Example: Logging at different levels
	const handleTestLogging = () => {
		trackButtonClick("Test Logging");

		// Use Winston logger for logging
		logger.debug("Debug: Testing logging functionality", { userId: 123 });
		logger.info("Info level log", { action: "test_logging" });
		logger.warn("Warning level log", {
			reason: "This is just a test",
			isTest: true,
		});
		logger.error("Error level log", new Error("Test error"), {
			errorCode: "TEST_ERROR",
			severity: "low",
		});

		// Add breadcrumb
		Sentry.addBreadcrumb({
			message: "User tested logging functionality",
			category: "test",
			level: "info",
			data: {
				timestamp: new Date().toISOString(),
			},
		});

		setResult("Logs sent to Sentry!");
	};

	// Example: Custom spans for UI interactions
	const handleComplexOperation = async () => {
		trackButtonClick("Complex Operation");
		setIsLoading(true);

		await Sentry.startSpan(
			{
				op: "ui.complex_operation",
				name: "Complex Multi-Step Operation",
			},
			async (parentSpan) => {
				// Step 1: Data fetching
				await Sentry.startSpan(
					{
						op: "http.client",
						name: "Fetch User Data",
					},
					async (fetchSpan) => {
						fetchSpan.setAttribute("api.endpoint", "/api/users");
						await new Promise((resolve) => setTimeout(resolve, 500));
						logger.debug("User data fetched", { userId: 123 });
					},
				);

				// Step 2: Data processing
				await Sentry.startSpan(
					{
						op: "data.process",
						name: "Process User Data",
					},
					async (processSpan) => {
						processSpan.setAttribute("records.count", 100);
						await new Promise((resolve) => setTimeout(resolve, 300));
						logger.debug("Data processed", { recordsProcessed: 100 });
					},
				);

				// Step 3: UI update
				await Sentry.startSpan(
					{
						op: "ui.render",
						name: "Update UI Components",
					},
					async (renderSpan) => {
						renderSpan.setAttribute("components.updated", 5);
						await new Promise((resolve) => setTimeout(resolve, 200));
						logger.info("UI updated successfully");
					},
				);

				setResult("Complex operation completed with nested spans!");
			},
		);

		setIsLoading(false);
	};

	// Example: User context
	const handleSetUserContext = () => {
		trackButtonClick("Set User Context");

		// Set user context
		Sentry.setUser({
			id: "user_123",
			email: "test@example.com",
			username: "testuser",
			ip_address: "127.0.0.1",
		});

		// Add custom user data
		Sentry.setContext("user_preferences", {
			theme: "dark",
			language: "en",
			timezone: "UTC",
		});

		logger.info("User context set", {
			userId: "user_123",
			action: "context_update",
		});

		setResult("User context set in Sentry!");
	};

	// Example: Custom tags and context
	const handleCustomContext = () => {
		trackButtonClick("Custom Context");

		// Set tags
		Sentry.setTag("feature", "sentry_example");
		Sentry.setTag("environment", "development");
		Sentry.setTag("version", "1.0.0");

		// Set custom context
		Sentry.setContext("feature_flags", {
			newUI: true,
			betaFeatures: false,
			experimentalAPI: true,
		});

		// Log with context
		logger.info("Custom context and tags set", {
			feature: "sentry_example",
			tags: ["feature", "environment", "version"],
		});

		setResult("Custom context and tags set!");
	};

	return (
		<div className="space-y-6 p-6">
			<div>
				<h2 className="text-2xl font-bold mb-4">Sentry Integration Examples</h2>
				<p className="text-gray-600 mb-6">
					Test various Sentry features including error tracking, performance
					monitoring, and logging.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{/* Exception Handling */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Exception Handling</h3>
					<p className="text-sm text-gray-600 mb-3">
						Trigger a test exception to see error tracking in action.
					</p>
					<button
						onClick={handleTestException}
						className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
					>
						Trigger Exception
					</button>
				</div>

				{/* Performance Monitoring */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Performance Monitoring</h3>
					<p className="text-sm text-gray-600 mb-3">
						Create a performance span to track operation timing.
					</p>
					<button
						onClick={handleTestPerformance}
						disabled={isLoading}
						className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
					>
						{isLoading ? "Running..." : "Test Performance"}
					</button>
				</div>

				{/* Logging */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Logging Levels</h3>
					<p className="text-sm text-gray-600 mb-3">
						Send logs at different severity levels to Sentry.
					</p>
					<button
						onClick={handleTestLogging}
						className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
					>
						Test Logging
					</button>
				</div>

				{/* Complex Operation */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Complex Operation</h3>
					<p className="text-sm text-gray-600 mb-3">
						Demonstrate nested spans for multi-step operations.
					</p>
					<button
						onClick={handleComplexOperation}
						disabled={isLoading}
						className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
					>
						{isLoading ? "Processing..." : "Run Complex Operation"}
					</button>
				</div>

				{/* User Context */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">User Context</h3>
					<p className="text-sm text-gray-600 mb-3">
						Set user information for better error tracking.
					</p>
					<button
						onClick={handleSetUserContext}
						className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
					>
						Set User Context
					</button>
				</div>

				{/* Custom Context */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Custom Context & Tags</h3>
					<p className="text-sm text-gray-600 mb-3">
						Add custom tags and context for filtering.
					</p>
					<button
						onClick={handleCustomContext}
						className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
					>
						Set Custom Context
					</button>
				</div>

				{/* Feedback Widget */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">User Feedback</h3>
					<p className="text-sm text-gray-600 mb-3">
						Let users report issues directly from the app.
					</p>
					<FeedbackButton />
				</div>

				{/* Clear User */}
				<div className="border rounded-lg p-4">
					<h3 className="font-semibold mb-2">Clear User Context</h3>
					<p className="text-sm text-gray-600 mb-3">
						Remove user information from Sentry.
					</p>
					<button
						onClick={() => {
							Sentry.setUser(null);
							setResult("User context cleared!");
						}}
						className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
					>
						Clear User
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
				<h3 className="font-semibold mb-2">ℹ️ About This Demo</h3>
				<ul className="text-sm space-y-1 list-disc list-inside">
					<li>All events are sent to your configured Sentry project</li>
					<li>Check your Sentry dashboard to see the captured data</li>
					<li>Performance spans help identify slow operations</li>
					<li>Logs provide detailed debugging information</li>
					<li>User feedback widget is available in the bottom-right corner</li>
				</ul>
			</div>
		</div>
	);
}
