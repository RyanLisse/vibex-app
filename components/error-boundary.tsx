"use client";

import { AlertTriangle, Bug, Home, RefreshCw } from "lucide-react";
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { observability } from "@/lib/observability";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: React.ErrorInfo | null;
	errorId: string | null;
}

interface ErrorBoundaryProps {
	children: React.ReactNode;
	fallback?: React.ComponentType<ErrorFallbackProps>;
	onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
	resetOnPropsChange?: boolean;
	resetKeys?: Array<string | number>;
}

interface ErrorFallbackProps {
	error: Error;
	errorInfo: React.ErrorInfo;
	resetError: () => void;
	errorId: string;
}

export class ErrorBoundary extends React.Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		// Update state so the next render will show the fallback UI
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, _errorInfo: React.ErrorInfo) {
		// Log the error to console, but don't crash the app for stream errors
		if (
			error.message.includes("ReadableStream") ||
			error.message.includes("cancel")
		) {
		} else {
		}
	}

	resetError = () => {
		this.setState({ hasError: false, error: undefined });
	};

	render() {
		if (this.state.hasError) {
			const FallbackComponent = this.props.fallback;

			if (FallbackComponent && this.state.error) {
				return (
					<FallbackComponent
						error={this.state.error}
						resetError={this.resetError}
					/>
				);
			}

			// Default fallback UI
			return (
				<div className="flex flex-col items-center justify-center p-8 text-center">
					<h2 className="mb-2 font-semibold text-lg text-red-600">
						Something went wrong
					</h2>
					<p className="mb-4 text-gray-600 text-sm">
						{this.state.error?.message || "An unexpected error occurred"}
					</p>
					<button
						className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
						onClick={this.resetError}
					>
						Try again
					</button>
				</div>
			);
		}

		return this.props.children;
	}
}

// Hook version for functional components
export function useErrorBoundary() {
	const [error, setError] = React.useState<Error | null>(null);

	const resetError = React.useCallback(() => {
		setError(null);
	}, []);

	const captureError = React.useCallback((error: Error) => {
		// Don't capture stream errors as they're handled gracefully
		if (
			error.message.includes("ReadableStream") ||
			error.message.includes("cancel")
		) {
			return;
		}
		setError(error);
	}, []);

	React.useEffect(() => {
		if (error) {
			throw error;
		}
	}, [error]);

	return { captureError, resetError };
}
