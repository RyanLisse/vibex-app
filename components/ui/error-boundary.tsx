"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import type React from "react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { observability } from "@/lib/observability";

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void) => ReactNode;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	showDetails?: boolean;
}

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorInfo: null,
		};
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return {
			hasError: true,
			error,
			errorInfo: null,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Log to observability
		observability.events.collector.collectEvent(
			"error",
			"error",
			`React Error Boundary: ${error.message}`,
			{
				error: error.message,
				stack: error.stack,
				componentStack: errorInfo.componentStack,
			},
			"frontend",
			["error", "error_boundary"]
		);

		// Call custom error handler if provided
		this.props.onError?.(error, errorInfo);

		// Update state with error info
		this.setState({
			errorInfo,
		});

		// Log to console in development
		if (process.env.NODE_ENV === "development") {
			console.error("Error caught by boundary:", error, errorInfo);
		}
	}

	reset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError && this.state.error) {
			// Use custom fallback if provided
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.reset);
			}

			// Default error UI
			return (
				<div className="min-h-[400px] flex items-center justify-center p-4">
					<Card className="max-w-md w-full">
						<CardHeader>
							<div className="flex items-center space-x-2">
								<AlertCircle className="h-5 w-5 text-red-500" />
								<CardTitle>Something went wrong</CardTitle>
							</div>
							<CardDescription>
								An unexpected error occurred. Please try refreshing the page or contact support if
								the problem persists.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							{this.props.showDetails && process.env.NODE_ENV === "development" && (
								<div className="space-y-2">
									<details className="text-sm">
										<summary className="cursor-pointer font-medium">Error Details</summary>
										<div className="mt-2 space-y-2">
											<div className="p-2 bg-red-50 rounded text-red-800">
												<p className="font-mono text-xs">{this.state.error.message}</p>
											</div>
											{this.state.error.stack && (
												<div className="p-2 bg-gray-50 rounded">
													<pre className="text-xs overflow-x-auto">{this.state.error.stack}</pre>
												</div>
											)}
										</div>
									</details>
								</div>
							)}
							<div className="flex space-x-2">
								<Button onClick={this.reset} className="flex-1">
									<RefreshCw className="h-4 w-4 mr-2" />
									Try Again
								</Button>
								<Button
									variant="outline"
									onClick={() => window.location.reload()}
									className="flex-1"
								>
									Reload Page
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Hook to create error boundary wrapper
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
	const WrappedComponent = (props: P) => (
		<ErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</ErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

/**
 * Task-specific error boundary with custom handling
 */
export function TaskErrorBoundary({ children }: { children: ReactNode }) {
	return (
		<ErrorBoundary
			fallback={(error, reset) => (
				<Card className="border-yellow-200 bg-yellow-50">
					<CardHeader>
						<CardTitle className="text-yellow-800 flex items-center space-x-2">
							<AlertCircle className="h-5 w-5" />
							<span>Task Component Error</span>
						</CardTitle>
						<CardDescription className="text-yellow-700">
							There was an issue loading this task component. The error has been logged and our team
							will investigate.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Button onClick={reset} variant="outline" className="w-full">
							<RefreshCw className="h-4 w-4 mr-2" />
							Retry Loading Task
						</Button>
					</CardContent>
				</Card>
			)}
			onError={(error, errorInfo) => {
				// Additional task-specific error handling
				console.error("Task component error:", {
					error: error.message,
					component: errorInfo.componentStack,
				});
			}}
		>
			{children}
		</ErrorBoundary>
	);
}
