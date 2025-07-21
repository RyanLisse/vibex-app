"use client";

import * as Sentry from "@sentry/nextjs";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
	children: ReactNode;
	fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		// Log error to Sentry with additional context
Sentry.withScope((scope) => {
			scope.setContext("errorBoundary", {
				componentStack: errorInfo.componentStack,
			});
Sentry.captureException(error);
		});
	}

	reset = () => {
		this.setState({ hasError: false, error: null });
	};

	render() {
		if (this.state.hasError && this.state.error) {
			if (this.props.fallback) {
				return this.props.fallback(this.state.error, this.reset);
			}

			return (
				<div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
					<h2 className="mb-4 font-bold text-2xl">Oops! Something went wrong
					</h2>
					<p className="mb-6 text-gray-600">We apologize for the inconvenience. Please try refreshing the page
						or contact support if the problem persists.
					</p>
					<div className="space-x-4">
						<button
							className="rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
							onClick={this.reset}
Try again
						</button>
						<button
							className="rounded bg-gray-200 px-4 py-2 text-gray-800 transition-colors hover:bg-gray-300"
							onClick={() => window.location.reload()}
Refresh page
						</button>
					</div>
					{process.env.NODE_ENV === "development" && (
						<details className="mt-8 max-w-2xl text-left">
							<summary className="cursor-pointer text-gray-500 text-sm">Error details
							</summary>
							<pre className="mt-2 overflow-auto rounded bg-gray-100 p-4 text-xs">
								{this.state.error.message}
								{"\n\n"}
								{this.state.error.stack}
							</pre>
						</details>
					)}
				</div>
			);
		}

		return this.props.children;
	}
}
