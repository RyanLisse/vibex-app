"use client";

import type React from "react";
import { Component, type ReactNode, useCallback, useState } from "react";
import { CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	resetKey: number;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface FallbackProps {
	error: Error;
	resetError: () => void;
}

// Default fallback component
const DefaultFallback: React.FC<FallbackProps> = ({ error, resetError }) => (
	<div className="flex flex-col items-center justify-center p-8 text-center">
		<CardTitle className="mb-4">Something went wrong</CardTitle>
		<p className="mb-4 text-gray-600">{error.message || "An unexpected error occurred"}</p>
		<button
			onClick={resetError}
			className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
		>
			Try again
		</button>
	</div>
);

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	constructor(props: ErrorBoundaryProps) {
		super(props);
		this.state = { hasError: false, error: null, resetKey: 0 };
	}

	static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		// Handle stream errors specially
		if (error.message.includes("ReadableStream") || error.message.includes("cancel operation")) {
			console.warn("Stream error caught by ErrorBoundary:", error.message);
		} else {
			console.error("ErrorBoundary caught an error:", error, errorInfo);
		}
	}

	componentDidUpdate(prevProps: ErrorBoundaryProps) {
		// If children changed and we're in error state, try to reset
		if (this.state.hasError && prevProps.children !== this.props.children) {
			this.setState({ hasError: false, error: null, resetKey: this.state.resetKey + 1 });
		}
	}

	resetError = () => {
		this.setState((prevState) => ({
			hasError: false,
			error: null,
			resetKey: prevState.resetKey + 1,
		}));
	};

	render() {
		if (this.state.hasError && this.state.error) {
			const FallbackComponent = this.props.fallback || DefaultFallback;
			return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
		}

		return <div key={this.state.resetKey}>{this.props.children}</div>;
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
