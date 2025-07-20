/**
 * Environment Query Hooks
 *
 * Enhanced TanStack Query hooks for environment management with WASM optimization,
 * optimistic updates, and real-time sync integration.
 */

import { useMemo } from "react";
import { useElectricEnvironments } from "@/hooks/use-electric-environments";
	useEnhancedMutation,
	useEnhancedQuery,
} from "@/hooks/use-enhanced-query";
import { observability } from "@/lib/observability";

// Types
export interface Environment {
	id: string;
	name: string;
	description?: string;
	config: {
		githubOrganization?: string;
		githubRepository?: string;
		githubToken?: string;
		[key: string]: any;
	};
	isActive: boolean;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	schemaVersion?: number;
}

export interface EnvironmentFilters {
	userId?: string;
	isActive?: boolean;
	search?: string;
}

export interface CreateEnvironmentData {
	name: string;
	description?: string;
	config: Environment["config"];
	isActive?: boolean;
	userId: string;
}

export interface UpdateEnvironmentData {
	name?: string;
	description?: string;
	config?: Partial<Environment["config"]>;
	isActive?: boolean;
}

// Query keys factory
export const environmentQueryKeys = {
	all: ["environments"] as const,
	lists: () => [...environmentQueryKeys.all, "list"] as const,
	list: (filters: EnvironmentFilters) =>
		[...environmentQueryKeys.lists(), filters] as const,
	details: () => [...environmentQueryKeys.all, "detail"] as const,
	detail: (id: string) => [...environmentQueryKeys.details(), id] as const,
};

/**
 * Hook for querying environments with enhanced caching and WASM optimization
 */
export function useEnvironmentsQuery(filters: EnvironmentFilters = {}) {
	const { userId, isActive, search } = filters;

	// Use ElectricSQL for real-time data
	const {
		environments: electricEnvironments,
		loading: electricLoading,
		error: electricError,
	} = useElectricEnvironments(userId);

	// Enhanced query with fallback to API
	const {
		data: apiEnvironments,
		loading: apiLoading,
		error: apiError,
		refetch,
		isStale,
		isFetching,
	} = useEnhancedQuery(
		environmentQueryKeys.list(filters),
		async () => {
			const params = new URLSearchParams();
			if (userId) params.append("userId", userId);
			if (isActive !== undefined)
				params.append("isActive", isActive.toString());
			if (search) params.append("search", search);

			const response = await fetch(`/api/environments?${params}`);
			if (!response.ok) {
				throw new Error(`Failed to fetch environments: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data || [];
		},
		{
			enabled: true,
			staleTime: 2 * 60 * 1000, // 2 minutes
			cacheTime: 10 * 60 * 1000, // 10 minutes
			enableWASMOptimization: true,
			refetchOnWindowFocus: true,
			refetchOnReconnect: true,
		},
	);

	// Combine and prioritize ElectricSQL data when available
	const environments = useMemo(() => {
		if (electricEnvironments && electricEnvironments.length > 0) {
			return electricEnvironments;
		}
		return apiEnvironments || [];
	}, [electricEnvironments, apiEnvironments]);

	// Determine loading and error states
	const loading = electricLoading || (apiLoading && !environments.length);
	const error = electricError || apiError;

	// Record query metrics
	useMemo(() => {
		if (!loading && environments) {
			observability.metrics.queryDuration(
				Date.now() - performance.now(),
				"select_environments",
				!error,
			);
		}
	}, [loading, environments, error]);

	return {
		environments,
		loading,
		error,
		refetch,
		isStale,
		isFetching,
	};
}

/**
 * Hook for querying a single environment
 */
export function useEnvironmentQuery(environmentId: string) {
	return useEnhancedQuery(
		environmentQueryKeys.detail(environmentId),
		async () => {
			const response = await fetch(`/api/environments/${environmentId}`);
			if (!response.ok) {
				if (response.status === 404) {
					throw new Error(`Environment with id ${environmentId} not found`);
				}
				throw new Error(`Failed to fetch environment: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!environmentId,
			staleTime: 5 * 60 * 1000, // 5 minutes
			enableWASMOptimization: false, // Single record doesn't need WASM optimization
		},
	);
}

/**
 * Hook for creating environments with optimistic updates
 */
export function useCreateEnvironmentMutation() {
	return useEnhancedMutation(
		async (environmentData: CreateEnvironmentData) => {
			const response = await fetch("/api/environments", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(environmentData),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to create environment");
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				// Create optimistic environment
				const optimisticEnvironment: Environment = {
					id: `temp-${Date.now()}`,
					...variables,
					createdAt: new Date(),
					updatedAt: new Date(),
				};

				// Add to environments cache
				const queryClient = (window as any).__queryClient;
				if (queryClient) {
					queryClient.setQueryData(
						environmentQueryKeys.lists(),
						(old: Environment[] = []) => [optimisticEnvironment, ...old],
					);
				}

				return { optimisticEnvironment };
			},
			rollbackUpdate: (context) => {
				if (context?.optimisticEnvironment) {
					// Remove optimistic environment from cache
					const queryClient = (window as any).__queryClient;
					if (queryClient) {
						queryClient.setQueryData(
							environmentQueryKeys.lists(),
							(old: Environment[] = []) =>
								old.filter(
									(env) => env.id !== context.optimisticEnvironment.id,
								),
						);
					}
				}
			},
			invalidateQueries: [environmentQueryKeys.all],
			enableWASMOptimization: false,
		},
	);
}

/**
 * Hook for updating environments with optimistic updates
 */
export function useUpdateEnvironmentMutation() {
	return useEnhancedMutation(
		async ({ id, ...updates }: { id: string } & UpdateEnvironmentData) => {
			const response = await fetch(`/api/environments/${id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to update environment");
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				const { id, ...updates } = variables;

				// Update environment in cache
				const queryClient = (window as any).__queryClient;
				if (queryClient) {
					queryClient.setQueryData(
						environmentQueryKeys.lists(),
						(old: Environment[] = []) =>
							old.map((env) =>
								env.id === id
									? { ...env, ...updates, updatedAt: new Date() }
									: env,
							),
					);

					// Also update detail cache if it exists
					queryClient.setQueryData(
						environmentQueryKeys.detail(id),
						(old: Environment | undefined) =>
							old ? { ...old, ...updates, updatedAt: new Date() } : undefined,
					);
				}

				return { environmentId: id, updates };
			},
			rollbackUpdate: (context, error, variables) => {
				if (context?.environmentId) {
					// Invalidate to refetch fresh data
					const queryClient = (window as any).__queryClient;
					if (queryClient) {
						queryClient.invalidateQueries(environmentQueryKeys.all);
					}
				}
			},
			invalidateQueries: [environmentQueryKeys.all],
			enableWASMOptimization: false,
		},
	);
}

/**
 * Hook for activating environments (special update case)
 */
export function useActivateEnvironmentMutation() {
	return useEnhancedMutation(
		async ({
			environmentId,
			userId,
		}: {
			environmentId: string;
			userId: string;
		}) => {
			const response = await fetch("/api/environments/activate", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ environmentId, userId }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to activate environment");
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				const { environmentId, userId } = variables;

				// Update environments in cache - deactivate all, activate target
				const queryClient = (window as any).__queryClient;
				if (queryClient) {
					queryClient.setQueryData(
						environmentQueryKeys.lists(),
						(old: Environment[] = []) =>
							old.map((env) => ({
								...env,
								isActive: env.id === environmentId && env.userId === userId,
								updatedAt: new Date(),
							})),
					);
				}

				return { environmentId, userId };
			},
			rollbackUpdate: (context) => {
				// Invalidate to refetch fresh data
				const queryClient = (window as any).__queryClient;
				if (queryClient) {
					queryClient.invalidateQueries(environmentQueryKeys.all);
				}
			},
			invalidateQueries: [environmentQueryKeys.all],
			enableWASMOptimization: false,
		},
	);
}

/**
 * Hook for deleting environments with optimistic updates
 */
export function useDeleteEnvironmentMutation() {
	return useEnhancedMutation(
		async (environmentId: string) => {
			const response = await fetch(`/api/environments/${environmentId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete environment");
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (environmentId) => {
				// Remove environment from cache
				const queryClient = (window as any).__queryClient;
				if (queryClient) {
					const previousEnvironments =
						(queryClient.getQueryData(
							environmentQueryKeys.lists(),
						) as Environment[]) || [];
					const environmentToDelete = previousEnvironments.find(
						(env) => env.id === environmentId,
					);

					queryClient.setQueryData(
						environmentQueryKeys.lists(),
						(old: Environment[] = []) =>
							old.filter((env) => env.id !== environmentId),
					);

					return { environmentId, deletedEnvironment: environmentToDelete };
				}
				return { environmentId };
			},
			rollbackUpdate: (context) => {
				if (context?.deletedEnvironment) {
					// Re-add environment to cache
					const queryClient = (window as any).__queryClient;
					if (queryClient) {
						queryClient.setQueryData(
							environmentQueryKeys.lists(),
							(old: Environment[] = []) => [...old, context.deletedEnvironment],
						);
					}
				}
			},
			invalidateQueries: [environmentQueryKeys.all],
			enableWASMOptimization: false,
		},
	);
}
