"use client";

import * as Sentry from "@sentry/nextjs";
import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void, errorId: string) => ReactNode;
	level?: "page" | "component" | "critical";
	onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
	hasError: boolean;
	error: Error | null;
	errorId: string | null;
	retryCount: number;
	lastErrorTime: number;
}

/**
 * Enhanced Error Boundary with comprehensive error handling,
 * user-friendly recovery options, and detailed error reporting.
 */
export class EnhancedErrorBoundary extends Component<Props, State> {
	private retryTimeoutId: NodeJS.Timeout | null = null;
	private maxRetries = 3;
	private retryDelay = 1000;

	constructor(props: Props) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorId: null,
			retryCount: 0,
			lastErrorTime: 0,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<State> {
		const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
		return {
			hasError: true,
			error,
			errorId,
			lastErrorTime: Date.now(),
		};
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		const { level = "component", onError } = this.props;
		const { errorId } = this.state;

		// Enhanced error context
		const errorContext = {
			errorId,
			level,
			componentStack: errorInfo.componentStack,
			errorBoundary: this.constructor.name,
			retryCount: this.state.retryCount,
			userAgent: typeof window !== "undefined" ? window.navigator.userAgent : "unknown",
			url: typeof window !== "undefined" ? window.location.href : "unknown",
			timestamp: new Date().toISOString(),
			props: this.props,
		};

		// Log to Sentry with enhanced context
		Sentry.withScope((scope) => {
			scope.setTag("errorBoundary", true);
			scope.setTag("errorLevel", level);
			scope.setTag("errorId", errorId);
			scope.setLevel(level === "critical" ? "fatal" : "error");
			scope.setContext("errorBoundary", errorContext);
			scope.setContext("componentStack", {
				componentStack: errorInfo.componentStack,
			});
			Sentry.captureException(error);
		});

		// Call custom error handler if provided
		if (onError) {
			try {
				onError(error, errorInfo);
			} catch (handlerError) {
				console.error("Error in custom error handler:", handlerError);
			}
		}

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.group(`🚨 Error Boundary (${level})`);
			console.error("Error:", error);
			console.error("Error Info:", errorInfo);
			console.error("Context:", errorContext);
			console.groupEnd();
		}
	}

	handleRetry = () => {
		const { retryCount } = this.state;

		if (retryCount < this.maxRetries) {
			this.setState((prevState) => ({
				hasError: false,
				error: null,
				errorId: null,
				retryCount: prevState.retryCount + 1,
			}));

			// Track retry attempt
			Sentry.addBreadcrumb({
				message: "Error boundary retry attempted",
				level: "info",
				data: {
					retryCount: retryCount + 1,
					maxRetries: this.maxRetries,
				},
			});
		}
	};

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorId: null,
			retryCount: 0,
			lastErrorTime: 0,
		});
	};

	handleReportBug = () => {
		const { error, errorId } = this.state;

		if (error && errorId) {
			// Create bug report URL with error details
			const bugReportUrl = new URL("https://github.com/your-repo/issues/new");
			bugReportUrl.searchParams.set("template", "bug_report.md");
			bugReportUrl.searchParams.set("title", `Error: ${error.message}`);
			bugReportUrl.searchParams.set("labels", "bug,error-boundary");

			const body = `
**Error ID:** ${errorId}
**Error Message:** ${error.message}
**Stack Trace:**
\`\`\`
${error.stack}
\`\`\`

**Browser:** ${navigator.userAgent}
**URL:** ${window.location.href}
**Timestamp:** ${new Date().toISOString()}
      `.trim();

			bugReportUrl.searchParams.set("body", body);
			window.open(bugReportUrl.toString(), "_blank");
		}
	};

	render() {
		const { hasError, error, errorId, retryCount } = this.state;
		const { children, fallback, level = "component" } = this.props;

		if (hasError && error) {
			// Use custom fallback if provided
			if (fallback) {
				return fallback(error, this.handleReset, errorId || "unknown");
			}

			// Default error UI based on error level
			return (
				<div className="flex min-h-[400px] items-center justify-center p-4">
					<Card className="w-full max-w-md">
						<CardHeader className="text-center">
							<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
								<AlertTriangle className="h-6 w-6 text-red-600" />
							</div>
							<CardTitle className="text-xl">
								{level === "critical" ? "Critical Error" : "Something went wrong"}
							</CardTitle>
							<CardDescription>
								{level === "critical"
									? "A critical error occurred that requires immediate attention."
									: "We encountered an unexpected error. Don't worry, we're working on it."}
							</CardDescription>
						</CardHeader>

						<CardContent className="space-y-4">
							{/* Error details for development */}
							{process.env.NODE_ENV === "development" && (
								<details className="rounded border p-3 text-sm">
									<summary className="cursor-pointer font-medium">
										Error Details (Development)
									</summary>
									<div className="mt-2 space-y-2">
										<div>
											<strong>Error ID:</strong> {errorId}
										</div>
										<div>
											<strong>Message:</strong> {error.message}
										</div>
										<div>
											<strong>Retry Count:</strong> {retryCount}/{this.maxRetries}
										</div>
										<pre className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
											{error.stack}
										</pre>
									</div>
								</details>
							)}

							{/* Action buttons */}
							<div className="flex flex-col gap-2 sm:flex-row">
								{retryCount < this.maxRetries && (
									<Button onClick={this.handleRetry} variant="default" className="flex-1">
										<RefreshCw className="mr-2 h-4 w-4" />
										Try Again ({this.maxRetries - retryCount} left)
									</Button>
								)}

								<Button
									onClick={() => window.location.reload()}
									variant="outline"
									className="flex-1"
								>
									<RefreshCw className="mr-2 h-4 w-4" />
									Refresh Page
								</Button>
							</div>

							<div className="flex flex-col gap-2 sm:flex-row">
								<Button
									onClick={() => (window.location.href = "/")}
									variant="outline"
									className="flex-1"
								>
									<Home className="mr-2 h-4 w-4" />
									Go Home
								</Button>

								<Button onClick={this.handleReportBug} variant="outline" className="flex-1">
									<Bug className="mr-2 h-4 w-4" />
									Report Bug
								</Button>
							</div>

							{/* Error ID for support */}
							{errorId && (
								<div className="rounded bg-gray-50 p-3 text-center text-sm text-gray-600">
									<strong>Error ID:</strong> {errorId}
									<br />
									<span className="text-xs">Please include this ID when reporting the issue.</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			);
		}

		return children;
	}
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Omit<Props, "children">
) {
	const WrappedComponent = (props: P) => (
		<EnhancedErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</EnhancedErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

/**
 * Hook for programmatically triggering error boundary
 */
export function useErrorHandler() {
	return (error: Error, errorInfo?: { componentStack?: string }) => {
		// Log error details
		console.error("Programmatic error:", error);

		// Report to Sentry
		Sentry.withScope((scope) => {
			scope.setTag("errorSource", "programmatic");
			if (errorInfo?.componentStack) {
				scope.setContext("componentStack", errorInfo);
			}
			Sentry.captureException(error);
		});

		// Re-throw to trigger error boundary
		throw error;
	};
}
