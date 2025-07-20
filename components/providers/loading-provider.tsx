"use client";

import type React from "react";
import { ErrorBoundary } from "@/components/error-boundary";
	ErrorDisplay,
	LoadingSpinner,
	OfflineIndicator,
} from "@/components/ui/loading-states";
import { useOfflineSync } from "@/hooks/use-offline-sync";

interface LoadingState {
	isLoading: boolean;
	error: Error | string | null;
	message?: string;
}

interface LoadingContextValue {
	// Global loading state
	globalLoading: LoadingState;
	setGlobalLoading: (state: Partial<LoadingState>) => void;

	// Component-specific loading states
	componentStates: Record<string, LoadingState>;
	setComponentLoading: (
		componentId: string,
		state: Partial<LoadingState>,
	) => void;
	clearComponentLoading: (componentId: string) => void;

	// Utility functions
	withLoading: <T extends unknown[]>(
		componentId: string,
		asyncFn: (...args: T) => Promise<void>,
		message?: string,
	) => (...args: T) => Promise<void>;

	// Offline state
	isOffline: boolean;
	offlineStats: {
		queueSize: number;
		pendingOperations: number;
		failedOperations: number;
	};
}

const LoadingContext = createContext<LoadingContextValue | null>(null);

/**
 * Provider for managing loading states across the application
 */
export function LoadingProvider({ children }: { children: React.ReactNode }) {
	const [globalLoading, setGlobalLoadingState] = useState<LoadingState>({
		isLoading: false,
		error: null,
	});

	const [componentStates, setComponentStates] = useState<
		Record<string, LoadingState>
	>({});

	// Offline sync integration
	const { isOffline, getStats, syncErrors } = useOfflineSync();

	const offlineStats = getStats();

	const setGlobalLoading = useCallback((state: Partial<LoadingState>) => {
		setGlobalLoadingState((prev) => ({ ...prev, ...state }));
	}, []);

	const setComponentLoading = useCallback(
		(componentId: string, state: Partial<LoadingState>) => {
			setComponentStates((prev) => ({
				...prev,
				[componentId]: { ...prev[componentId], ...state },
			}));
		},
		[],
	);

	const clearComponentLoading = useCallback((componentId: string) => {
		setComponentStates((prev) => {
			const { [componentId]: _, ...rest } = prev;
			return rest;
		});
	}, []);

	const withLoading = useCallback(
		<T extends unknown[]>(
			componentId: string,
			asyncFn: (...args: T) => Promise<void>,
			message?: string,
		) => {
			return async (...args: T) => {
				setComponentLoading(componentId, {
					isLoading: true,
					error: null,
					message,
				});
				try {
					await asyncFn(...args);
					setComponentLoading(componentId, { isLoading: false, error: null });
				} catch (error) {
					setComponentLoading(componentId, {
						isLoading: false,
						error: error instanceof Error ? error : new Error(String(error)),
					});
					throw error;
				}
			};
		},
		[setComponentLoading],
	);

	const contextValue: LoadingContextValue = {
		globalLoading,
		setGlobalLoading,
		componentStates,
		setComponentLoading,
		clearComponentLoading,
		withLoading,
		isOffline,
		offlineStats,
	};

	return (
		<LoadingContext.Provider value={contextValue}>
			<ErrorBoundary>
				{/* Global Offline Indicator */}
				<OfflineIndicator
					isOffline={isOffline}
					queuedOperations={offlineStats.queueSize}
				/>

				{/* Global Loading Overlay */}
				{globalLoading.isLoading && (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
						<LoadingSpinner message={globalLoading.message} size="lg" />
					</div>
				)}

				{/* Global Error Display */}
				{globalLoading.error && (
					<div className="fixed top-4 right-4 z-50 max-w-md">
						<ErrorDisplay
							error={globalLoading.error}
							onRetry={() => setGlobalLoading({ error: null })}
							title="Application Error"
						/>
					</div>
				)}

				{/* Sync Errors */}
				{syncErrors.length > 0 && (
					<div className="fixed top-4 left-4 z-50 max-w-md">
						<ErrorDisplay error={syncErrors.join("; ")} title="Sync Errors" />
					</div>
				)}

				{children}
			</ErrorBoundary>
		</LoadingContext.Provider>
	);
}

/**
 * Hook to access loading context
 */
export function useLoading() {
	const context = useContext(LoadingContext);
	if (!context) {
		throw new Error("useLoading must be used within a LoadingProvider");
	}
	return context;
}

/**
 * Hook for component-specific loading state
 */
export function useComponentLoading(componentId: string) {
	const {
		componentStates,
		setComponentLoading,
		clearComponentLoading,
		withLoading,
	} = useLoading();

	const state = componentStates[componentId] || {
		isLoading: false,
		error: null,
	};

	const setLoading = useCallback(
		(loadingState: Partial<LoadingState>) => {
			setComponentLoading(componentId, loadingState);
		},
		[componentId, setComponentLoading],
	);

	const clearLoading = useCallback(() => {
		clearComponentLoading(componentId);
	}, [componentId, clearComponentLoading]);

	const withComponentLoading = useCallback(
		<T extends unknown[]>(
			asyncFn: (...args: T) => Promise<void>,
			message?: string,
		) => {
			return withLoading(componentId, asyncFn, message);
		},
		[componentId, withLoading],
	);

	return {
		...state,
		setLoading,
		clearLoading,
		withLoading: withComponentLoading,
	};
}

/**
 * Higher-order component to add loading states to any component
 */
interface WithLoadingStatesOptions {
	componentId?: string;
	showGlobalLoading?: boolean;
	showOfflineIndicator?: boolean;
	errorBoundary?: boolean;
}

export function withLoadingStates<P extends object>(
	Component: React.ComponentType<P>,
	options: WithLoadingStatesOptions = {},
) {
	const {
		componentId,
		showGlobalLoading = false,
		showOfflineIndicator = true,
		errorBoundary = true,
	} = options;

	const WrappedComponent = (props: P) => {
		const { globalLoading, isOffline, offlineStats } = useLoading();
		const componentLoading = useComponentLoading(componentId || "");

		const content = (
			<div className="relative">
				{/* Offline Indicator */}
				{showOfflineIndicator && (
					<OfflineIndicator
						isOffline={isOffline}
						queuedOperations={offlineStats.queueSize}
					/>
				)}

				{/* Component Loading Overlay */}
				{componentLoading?.isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
						<LoadingSpinner message={componentLoading.message} />
					</div>
				)}

				{/* Global Loading Overlay */}
				{showGlobalLoading && globalLoading.isLoading && (
					<div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
						<LoadingSpinner message={globalLoading.message} size="lg" />
					</div>
				)}

				{/* Component Error Display */}
				{componentLoading?.error && (
					<div className="mb-4">
						<ErrorDisplay
							error={componentLoading.error}
							onRetry={() => componentLoading.setLoading({ error: null })}
						/>
					</div>
				)}

				<Component {...props} />
			</div>
		);

		if (errorBoundary) {
			return (
				<ErrorBoundary
					onError={(error, errorInfo) => {
						console.error(
							`Error in component ${componentId || "unknown"}:`,
							error,
							errorInfo,
						);
						if (componentLoading) {
							componentLoading.setLoading({ error });
						}
					}}
					resetKeys={componentId ? [componentId] : undefined}
				>
					{content}
				</ErrorBoundary>
			);
		}

		return content;
	};

	WrappedComponent.displayName = `withLoadingStates(${Component.displayName || Component.name})`;

	return WrappedComponent;
}

/**
 * Component wrapper for declarative loading states
 */
interface LoadingWrapperProps {
	componentId: string;
	children: React.ReactNode;
	showOfflineIndicator?: boolean;
	errorBoundary?: boolean;
}

export function LoadingWrapper({
	componentId,
	children,
	showOfflineIndicator = true,
	errorBoundary = true,
}: LoadingWrapperProps) {
	const { isOffline, offlineStats } = useLoading();
	const { isLoading, error, message, setLoading } =
		useComponentLoading(componentId);

	const content = (
		<div className="relative">
			{/* Offline Indicator */}
			{showOfflineIndicator && (
				<OfflineIndicator
					isOffline={isOffline}
					queuedOperations={offlineStats.queueSize}
				/>
			)}

			{/* Loading Overlay */}
			{isLoading && (
				<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
					<LoadingSpinner message={message} />
				</div>
			)}

			{/* Error Display */}
			{error && (
				<div className="mb-4">
					<ErrorDisplay
						error={error}
						onRetry={() => setLoading({ error: null })}
					/>
				</div>
			)}

			{children}
		</div>
	);

	if (errorBoundary) {
		return (
			<ErrorBoundary
				onError={(error, errorInfo) => {
					console.error(
						`Error in LoadingWrapper ${componentId}:`,
						error,
						errorInfo,
					);
					setLoading({ error });
				}}
				resetKeys={[componentId]}
			>
				{content}
			</ErrorBoundary>
		);
	}

	return content;
}
