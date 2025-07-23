/**
 * Enhanced Error Boundary Component
 *
 * Provides comprehensive error handling with recovery options,
 * error reporting, and graceful degradation.
 */

"use client";

import {
	AlertTriangle,
	Bug,
	ChevronDown,
	ChevronRight,
	Clock,
	RefreshCw,
	User,
	Zap,
} from "lucide-react";
import React, { Component, type ReactNode } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { observability } from "@/lib/observability";
import { type AppError, ErrorFactory, ErrorSeverity } from "./error-classes";
import { ErrorRecoveryCoordinator } from "./recovery-strategies";

interface ErrorBoundaryState {
	hasError: boolean;
	error: AppError | null;
	errorId: string | null;
	retryCount: number;
	isRecovering: boolean;
	showDetails: boolean;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: (error: AppError, retry: () => void) => ReactNode;
	onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
	enableRecovery?: boolean;
	maxRetries?: number;
	resetOnPropsChange?: boolean;
	resetKeys?: Array<string | number>;
	isolate?: boolean;
	level?: "page" | "section" | "component";
}

/**
 * Enhanced Error Boundary with recovery strategies
 */
export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	private resetTimeoutId: number | null = null;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorId: null,
			retryCount: 0,
			isRecovering: false,
			showDetails: false,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		const appError = ErrorFactory.fromError(error, {
			component: "ErrorBoundary",
			timestamp: new Date(),
		});

		const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		return {
			hasError: true,
			error: appError,
			errorId,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const appError = this.state.error || ErrorFactory.fromError(error);

		// Record error in observability system
		observability.recordError("error_boundary.caught", error, {
			errorId: this.state.errorId,
			componentStack: errorInfo.componentStack,
			errorBoundaryLevel: this.props.level || "component",
			retryCount: this.state.retryCount,
		});

		// Call custom error handler
		if (this.props.onError) {
			this.props.onError(appError, errorInfo);
		}

		// Report to external error tracking service
		this.reportError(appError, errorInfo);
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps) {
		const { resetOnPropsChange, resetKeys } = this.props;
		const { hasError } = this.state;

		if (hasError && prevProps.resetKeys !== resetKeys) {
			if (resetOnPropsChange) {
				this.resetErrorBoundary();
			} else if (resetKeys) {
				const hasResetKeyChanged = resetKeys.some(
					(key, index) => prevProps.resetKeys?.[index] !== key
				);
				if (hasResetKeyChanged) {
					this.resetErrorBoundary();
				}
			}
		}
	}

	componentWillUnmount() {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}
	}

	private reportError = (error: AppError, errorInfo: React.ErrorInfo) => {
		// Report to external services (Sentry, etc.)
		if (typeof window !== "undefined" && (window as any).Sentry) {
			(window as any).Sentry.captureException(error, {
				contexts: {
					react: {
						componentStack: errorInfo.componentStack,
					},
					errorBoundary: {
						level: this.props.level,
						retryCount: this.state.retryCount,
						errorId: this.state.errorId,
					},
				},
				tags: {
					errorCategory: error.category,
					errorSeverity: error.severity,
					errorCode: error.code,
				},
			});
		}
	};

	private resetErrorBoundary = () => {
		if (this.resetTimeoutId) {
			clearTimeout(this.resetTimeoutId);
		}

		this.setState({
			hasError: false,
			error: null,
			errorId: null,
			retryCount: 0,
			isRecovering: false,
			showDetails: false,
		});
	};

	private handleRetry = async () => {
		const { maxRetries = 3, enableRecovery = true } = this.props;
		const { retryCount, error, errorId } = this.state;

		if (retryCount >= maxRetries) {
			return;
		}

		this.setState({ isRecovering: true, retryCount: retryCount + 1 });

		try {
			if (enableRecovery && error && errorId) {
				// Attempt recovery using the error recovery coordinator
				await ErrorRecoveryCoordinator.recover(
					errorId,
					async () => {
						// Simulate recovery by resetting the error boundary
						return Promise.resolve();
					},
					error
				);
			}

			// Reset after successful recovery
			this.resetErrorBoundary();

			observability.recordEvent("error_boundary.recovery_success", {
				errorId,
				retryCount: retryCount + 1,
			});
		} catch (recoveryError) {
			observability.recordError("error_boundary.recovery_failed", recoveryError as Error, {
				errorId,
				retryCount: retryCount + 1,
			});

			this.setState({ isRecovering: false });

			// Auto-retry after delay if we haven't exceeded max retries
			if (retryCount + 1 < maxRetries) {
				this.resetTimeoutId = window.setTimeout(
					() => {
						this.handleRetry();
					},
					Math.min(1000 * 2 ** retryCount, 10000)
				); // Exponential backoff, max 10s
			}
		}
	};

	private getSeverityColor = (severity: ErrorSeverity): string => {
		switch (severity) {
			case ErrorSeverity.LOW:
				return "text-yellow-700 bg-yellow-50 border-yellow-200";
			case ErrorSeverity.MEDIUM:
				return "text-orange-700 bg-orange-50 border-orange-200";
			case ErrorSeverity.HIGH:
				return "text-red-700 bg-red-50 border-red-200";
			case ErrorSeverity.CRITICAL:
				return "text-red-900 bg-red-100 border-red-300";
			default:
				return "text-gray-700 bg-gray-50 border-gray-200";
		}
	};

	private renderErrorDetails = (error: AppError) => {
		return (
			<Collapsible
				open={this.state.showDetails}
				onOpenChange={(open) => this.setState({ showDetails: open })}
			>
				<CollapsibleTrigger asChild={true}>
					<Button variant="ghost" size="sm" className="w-full justify-start">
						{this.state.showDetails ? (
							<ChevronDown className="h-4 w-4 mr-2" />
						) : (
							<ChevronRight className="h-4 w-4 mr-2" />
						)}
						Error Details
					</Button>
				</CollapsibleTrigger>
				<CollapsibleContent>
					<div className="mt-4 space-y-3 text-sm">
						<div className="grid grid-cols-2 gap-4">
							<div>
								<strong>Error ID:</strong>
								<div className="font-mono text-xs bg-gray-100 p-1 rounded">
									{this.state.errorId}
								</div>
							</div>
							<div>
								<strong>Category:</strong>
								<Badge variant="outline" className="ml-2">
									{error.category}
								</Badge>
							</div>
							<div>
								<strong>Code:</strong>
								<code className="bg-gray-100 px-1 rounded">{error.code}</code>
							</div>
							<div>
								<strong>Retryable:</strong>
								<Badge variant={error.isRetryable ? "default" : "secondary"} className="ml-2">
									{error.isRetryable ? "Yes" : "No"}
								</Badge>
							</div>
						</div>

						{error.context && Object.keys(error.context).length > 0 && (
							<div>
								<strong>Context:</strong>
								<pre className="bg-gray-100 p-2 rounded text-xs overflow-auto">
									{JSON.stringify(error.context, null, 2)}
								</pre>
							</div>
						)}

						{error.stack && (
							<div>
								<strong>Stack Trace:</strong>
								<pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
									{error.stack}
								</pre>
							</div>
						)}
					</div>
				</CollapsibleContent>
			</Collapsible>
		);
	};

	private renderDefaultFallback = (error: AppError) => {
		const { maxRetries = 3 } = this.props;
		const { retryCount, isRecovering } = this.state;
		const canRetry = retryCount < maxRetries && error.isRetryable;

		return (
			<Card className={`border-2 ${this.getSeverityColor(error.severity)}`}>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<AlertTriangle className="h-5 w-5" />
						<span>Something went wrong</span>
						<Badge variant="outline" className={this.getSeverityColor(error.severity)}>
							{error.severity}
						</Badge>
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4 text-sm text-gray-600">
							<div className="flex items-center space-x-1">
								<Clock className="h-4 w-4" />
								<span>{error.timestamp.toLocaleTimeString()}</span>
							</div>
							<div className="flex items-center space-x-1">
								<Bug className="h-4 w-4" />
								<span>{error.category}</span>
							</div>
							{retryCount > 0 && (
								<div className="flex items-center space-x-1">
									<RefreshCw className="h-4 w-4" />
									<span>
										Retry {retryCount}/{maxRetries}
									</span>
								</div>
							)}
						</div>
					</div>

					{canRetry && (
						<Alert>
							<Zap className="h-4 w-4" />
							<AlertDescription>This error might be temporary. You can try again.</AlertDescription>
						</Alert>
					)}

					<div className="flex items-center space-x-2">
						{canRetry && (
							<Button onClick={this.handleRetry} disabled={isRecovering} size="sm">
								{isRecovering ? (
									<>
										<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
										Recovering...
									</>
								) : (
									<>
										<RefreshCw className="h-4 w-4 mr-2" />
										Try Again
									</>
								)}
							</Button>
						)}
						<Button variant="outline" onClick={this.resetErrorBoundary} size="sm">
							Reset
						</Button>
					</div>

					{this.renderErrorDetails(error)}
				</CardContent>
			</Card>
		);
	};

	render() {
		const { hasError, error } = this.state;
		const { children, fallback } = this.props;

		if (hasError && error) {
			if (fallback) {
				return fallback(error, this.handleRetry);
			}
			return this.renderDefaultFallback(error);
		}

		return children;
	}
}

/**
 * Hook for using error boundary functionality
 */
export function useErrorHandler() {
	const handleError = React.useCallback((error: Error, context: any = {}) => {
		const appError = ErrorFactory.fromError(error, context);

		observability.recordError("error_handler.manual", error, {
			...context,
			handledManually: true,
		});

		// In development, log to console
		if (process.env.NODE_ENV === "development") {
			console.error("Manual error handling:", appError);
		}

		// Re-throw to trigger error boundary
		throw appError;
	}, []);

	return { handleError };
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
	Component: React.ComponentType<P>,
	errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
	const WrappedComponent = (props: P) => (
		<EnhancedErrorBoundary {...errorBoundaryProps}>
			<Component {...props} />
		</EnhancedErrorBoundary>
	);

	WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

	return WrappedComponent;
}
