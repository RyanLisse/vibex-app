import { AlertCircle, RefreshCw } from "lucide-react";
import type React from "react";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ErrorBoundaryState {
	hasError: boolean;
	error: Error | null;
	errorInfo: string | null;
}

interface ErrorBoundaryProps {
	children: ReactNode;
	fallback?: ReactNode;
	onError?: (error: Error, errorInfo: string) => void;
}

export class ErrorBoundary extends Component<
	ErrorBoundaryProps,
	ErrorBoundaryState
> {
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
			errorInfo: error.stack || "No stack trace available",
		};
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		this.props.onError?.(error, errorInfo.componentStack);
	}

	handleReset = () => {
		this.setState({
			hasError: false,
			error: null,
			errorInfo: null,
		});
	};

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) {
				return this.props.fallback;
			}

			return (
				<Card className="flex h-[600px] w-full max-w-2xl flex-col items-center justify-center p-8">
					<div className="text-center">
						<AlertCircle className="mx-auto mb-4 h-16 w-16 text-destructive" />
						<h2 className="mb-2 font-bold text-2xl">Something went wrong</h2>
						<p className="mb-4 text-muted-foreground">
							An error occurred in the chat component. Please try refreshing or
							contact support if the problem persists.
						</p>

						<div className="flex justify-center gap-2">
							<Button onClick={this.handleReset} variant="outline">
								<RefreshCw className="mr-2 h-4 w-4" />
								Try Again
							</Button>
							<Button
								onClick={() => window.location.reload()}
								variant="default"
							>
								Refresh Page
							</Button>
						</div>

						{process.env.NODE_ENV === "development" && (
							<details className="mt-4 text-left">
								<summary className="cursor-pointer font-medium text-sm">
									Error Details (Development)
								</summary>
								<pre className="mt-2 max-h-32 overflow-auto rounded bg-muted p-2 text-xs">
									{this.state.error?.message}
									{"\n\n"}
									{this.state.errorInfo}
								</pre>
							</details>
						)}
					</div>
				</Card>
			);
		}

		return this.props.children;
	}
}
