"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import type React from "react";
import { Component, type ReactNode, useCallback, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AppError, ErrorHandler, ErrorSeverity, ErrorType } from "@/src/lib/error-handling";

interface ErrorBoundaryState {
	hasError: boolean;
	error: AppError | null;
	errorId: string | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: React.ComponentType<ErrorFallbackProps>;
	onError?: (error: AppError, errorId: string) => void;
	isolate?: boolean;
}

interface ErrorFallbackProps {
	error: AppError;
	errorId: string;
	retry: () => void;
}

// Default fallback component
const DefaultFallback: React.FC<ErrorFallbackProps> = ({ error, errorId, retry }) => {
	const getSeverityColor = (severity: ErrorSeverity) => {
		switch (severity) {
			case ErrorSeverity.CRITICAL:
				return "border-red-500 bg-red-50";
			case ErrorSeverity.HIGH:
				return "border-orange-500 bg-orange-50";
			case ErrorSeverity.MEDIUM:
				return "border-yellow-500 bg-yellow-50";
			default:
				return "border-gray-500 bg-gray-50";
		}
	};

	return (
		<Card className={`max-w-2xl mx-auto mt-8 ${getSeverityColor(error.severity)}`}>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-red-700">
					<AlertTriangle className="h-5 w-5" />
					Something went wrong
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<Alert>
					<AlertTriangle className="h-4 w-4" />
					<AlertTitle>Error Details</AlertTitle>
					<AlertDescription>{error.userMessage || error.message}</AlertDescription>
				</Alert>

				<div className="flex gap-2">
					{error.retryable && (
						<Button onClick={retry} className="flex items-center gap-2">
							<RefreshCw className="h-4 w-4" />
							Try Again
						</Button>
					)}
					<Button variant="outline" onClick={() => window.location.reload()}>
						Reload Page
					</Button>
				</div>

				<div className="text-xs text-gray-500">
					Error ID: {errorId} • {error.timestamp.toLocaleString()}
				</div>
			</CardContent>
		</Card>
	);
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	private retryCount = 0;
	private maxRetries = 3;

	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = {
			hasError: false,
			error: null,
			errorId: null,
		};
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		const appError = ErrorHandler.handle(error);
		const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

		ErrorHandler.trackError(appError);

		return {
			hasError: true,
			error: appError,
			errorId,
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		const appError = this.state.error;
		if (appError && this.state.errorId) {
			this.props.onError?.(appError, this.state.errorId);

			// Log error details for debugging
			if (process.env.NODE_ENV === "development") {
				// eslint-disable-next-line no-console
				console.error("Error Boundary caught an error:", {
					error: appError.toJSON(),
					errorInfo,
					componentStack: errorInfo.componentStack,
				});
			}
		}
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps) {
		// If children changed and we're in error state, try to reset
		if (this.state.hasError && prevProps.children !== this.props.children) {
			this.setState({ hasError: false, error: null, resetKey: this.state.resetKey + 1 });
		}
	}

	handleRetry = () => {
		if (this.retryCount < this.maxRetries) {
			this.retryCount++;
			this.setState({
				hasError: false,
				error: null,
				errorId: null,
			});
		}
	};

	render() {
		if (this.state.hasError && this.state.error && this.state.errorId) {
			const FallbackComponent = this.props.fallback || DefaultFallback;

			return (
				<FallbackComponent
					error={this.state.error}
					errorId={this.state.errorId}
					retry={this.handleRetry}
				/>
			);
		}

		return this.props.children;
	}
}

// Hook for programmatic error handling
export function useErrorBoundary() {
	const [, setError] = useState<Error | null>(null);

	const captureError = useCallback((error: Error) => {
		// Handle stream errors specially - don't throw them
		if (error.message.includes("ReadableStream") || error.message.includes("cancel operation")) {
			console.warn("Stream error captured but not thrown:", error.message);
			return;
		}

		// For normal errors, throw them to be caught by ErrorBoundary
		setError(() => {
			throw error;
		});
	}, []);

	const resetError = useCallback(() => {
		setError(null);
	}, []);

	return {
		captureError,
		resetError,
	};
}
