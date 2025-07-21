"use client";

import { invalidateQueries, mutationKeys, queryKeys } from "@/lib/query/config";
import {
	useEnhancedMutation,
	useEnhancedQuery,
} from "./use-enhanced-query-new";

/**
 * Enhanced environment queries with comprehensive database integration, WASM optimization, and real-time sync
 */

export interface EnvironmentFilters {
	userId?: string;
	isActive?: boolean;
	search?: string;
	schemaVersion?: number;
	tags?: string[];
}

export interface EnvironmentWithStats extends Environment {
	taskCount?: number;
	lastUsed?: Date;
	executionCount?: number;
	isValid?: boolean;
	validationErrors?: string[];
}

/**
 * Hook for querying a single environment by ID with statistics
 */
export function useEnvironmentQuery(environmentId: string) {
	return useEnhancedQuery(
		queryKeys.environments.detail(environmentId),
		async (): Promise<EnvironmentWithStats> => {
			const response = await fetch(
				`/api/environments/${environmentId}?include=stats`,
			);
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
			staleTime: 2 * 60 * 1000, // 2 minutes
			enableWASMOptimization: false, // Single record doesn't need WASM optimization
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for querying all environments with enhanced filtering and real-time sync
 */
export function useEnvironmentsQuery(filters: EnvironmentFilters = {}) {
	const { userId, isActive, search, schemaVersion, tags } = filters;

	return useEnhancedQuery(
		queryKeys.environments.list(filters),
		async (): Promise<EnvironmentWithStats[]> => {
			const searchParams = new URLSearchParams();

			if (userId) searchParams.append("userId", userId);
			if (isActive !== undefined)
				searchParams.append("isActive", isActive.toString());
			if (search) searchParams.append("search", search);
			if (schemaVersion)
				searchParams.append("schemaVersion", schemaVersion.toString());
			if (tags?.length) searchParams.append("tags", tags.join(","));

			const response = await fetch(
				`/api/environments?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(`Failed to fetch environments: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enableWASMOptimization: true,
			staleWhileRevalidate: true,
			enableRealTimeSync: true,
			syncTable: "environments",
			wasmFallback: async () => {
				// Fallback to simpler query without complex filtering
				const response = await fetch("/api/environments");
				if (!response.ok) {
					throw new Error(
						`Failed to fetch environments: ${response.statusText}`,
					);
				}
				const result = await response.json();

				// Apply client-side filtering as fallback
				let filteredEnvironments = result.data;

				if (isActive !== undefined) {
					filteredEnvironments = filteredEnvironments.filter(
						(env: Environment) => env.isActive === isActive,
					);
				}

				if (search) {
					const searchLower = search.toLowerCase();
					filteredEnvironments = filteredEnvironments.filter(
						(env: Environment) => env.name.toLowerCase().includes(searchLower),
					);
				}

				return filteredEnvironments;
			},
		},
	);
}

/**
 * Hook for querying active environment
 */
export function useActiveEnvironmentQuery(userId?: string) {
	return useEnhancedQuery(
		queryKeys.environments.active(),
		async (): Promise<EnvironmentWithStats | null> => {
			const searchParams = new URLSearchParams();
			if (userId) searchParams.append("userId", userId);

			const response = await fetch(
				`/api/environments/active?${searchParams.toString()}`,
			);
			if (!response.ok) {
				if (response.status === 404) {
					return null; // No active environment
				}
				throw new Error(
					`Failed to fetch active environment: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			staleTime: 30 * 1000, // 30 seconds for active environment
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for creating environments with optimistic updates and validation
 */
export function useCreateEnvironmentMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (
			newEnvironment: Omit<NewEnvironment, "id" | "createdAt" | "updatedAt">,
		) => {
			// Validate configuration before sending
			const validationResponse = await fetch("/api/environments/validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ config: newEnvironment.config }),
			});

			if (!validationResponse.ok) {
				const error = await validationResponse.json();
				throw new Error(`Environment validation failed: ${error.message}`);
			}

			const response = await fetch("/api/environments", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newEnvironment),
			});

			if (!response.ok) {
				throw new Error(`Failed to create environment: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (variables) => {
				// Create optimistic environment
				const optimisticEnvironment: EnvironmentWithStats = {
					id: `temp-${Date.now()}`,
					...variables,
					createdAt: new Date(),
					updatedAt: new Date(),
					taskCount: 0,
					executionCount: 0,
					isValid: true,
				} as EnvironmentWithStats;

				// Add to all relevant caches
				queryClient.setQueryData(
					queryKeys.environments.lists(),
					(old: EnvironmentWithStats[] = []) => [optimisticEnvironment, ...old],
				);

				return { optimisticEnvironment };
			},
			rollbackUpdate: (context) => {
				if (context?.optimisticEnvironment) {
					// Remove optimistic environment from cache
					queryClient.setQueryData(
						queryKeys.environments.lists(),
						(old: EnvironmentWithStats[] = []) =>
							old.filter((env) => env.id !== context.optimisticEnvironment.id),
					);
				}
			},
			invalidateQueries: [queryKeys.environments.all],
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for updating environments with optimistic updates and validation
 */
export function useUpdateEnvironmentMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async ({
			environmentId,
			updates,
		}: {
			environmentId: string;
			updates: Partial<Environment>;
		}) => {
			// Validate configuration if it's being updated
			if (updates.config) {
				const validationResponse = await fetch("/api/environments/validate", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ config: updates.config }),
				});

				if (!validationResponse.ok) {
					const error = await validationResponse.json();
					throw new Error(`Environment validation failed: ${error.message}`);
				}
			}

			const response = await fetch(`/api/environments/${environmentId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(updates),
			});

			if (!response.ok) {
				throw new Error(`Failed to update environment: ${response.statusText}`);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: ({ environmentId, updates }) => {
				const previousEnvironment = queryClient.getQueryData(
					queryKeys.environments.detail(environmentId),
				) as EnvironmentWithStats;

				// Update environment in all relevant caches
				queryClient.setQueryData(
					queryKeys.environments.detail(environmentId),
					(old: EnvironmentWithStats) =>
						old ? { ...old, ...updates, updatedAt: new Date() } : old,
				);

				queryClient.setQueryData(
					queryKeys.environments.lists(),
					(old: EnvironmentWithStats[] = []) =>
						old.map((env) =>
							env.id === environmentId
								? { ...env, ...updates, updatedAt: new Date() }
								: env,
						),
				);

				// Update active environment cache if this environment is being activated
				if (updates.isActive) {
					queryClient.setQueryData(
						queryKeys.environments.active(),
						(old: EnvironmentWithStats) =>
							old?.id === environmentId
								? { ...old, ...updates, updatedAt: new Date() }
								: old,
					);
				}

				return { previousEnvironment, environmentId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousEnvironment && context?.environmentId) {
					// Restore previous environment data
					queryClient.setQueryData(
						queryKeys.environments.detail(context.environmentId),
						context.previousEnvironment,
					);

					queryClient.setQueryData(
						queryKeys.environments.lists(),
						(old: EnvironmentWithStats[] = []) =>
							old.map((env) =>
								env.id === context.environmentId
									? context.previousEnvironment
									: env,
							),
					);
				}
			},
			invalidateQueries: [queryKeys.environments.all],
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for activating an environment (deactivates others)
 */
export function useActivateEnvironmentMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (environmentId: string) => {
			const response = await fetch(
				`/api/environments/${environmentId}/activate`,
				{
					method: "POST",
				},
			);

			if (!response.ok) {
				throw new Error(
					`Failed to activate environment: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			optimisticUpdate: (environmentId) => {
				const previousEnvironments = queryClient.getQueryData(
					queryKeys.environments.lists(),
				) as EnvironmentWithStats[];

				// Deactivate all environments and activate the selected one
				queryClient.setQueryData(
					queryKeys.environments.lists(),
					(old: EnvironmentWithStats[] = []) =>
						old.map((env) => ({
							...env,
							isActive: env.id === environmentId,
							updatedAt: new Date(),
						})),
				);

				// Update active environment cache
				const newActiveEnvironment = previousEnvironments?.find(
					(env) => env.id === environmentId,
				);
				if (newActiveEnvironment) {
					queryClient.setQueryData(queryKeys.environments.active(), {
						...newActiveEnvironment,
						isActive: true,
						updatedAt: new Date(),
					});
				}

				return { previousEnvironments, environmentId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousEnvironments) {
					// Restore previous environment states
					queryClient.setQueryData(
						queryKeys.environments.lists(),
						context.previousEnvironments,
					);

					// Restore active environment
					const previousActive = context.previousEnvironments.find(
						(env) => env.isActive,
					);
					queryClient.setQueryData(
						queryKeys.environments.active(),
						previousActive || null,
					);
				}
			},
			invalidateQueries: [queryKeys.environments.all],
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for deleting environments with optimistic updates
 */
export function useDeleteEnvironmentMutation() {
	const queryClient = useQueryClient();

	return useEnhancedMutation(
		async (environmentId: string) => {
			const response = await fetch(`/api/environments/${environmentId}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				throw new Error(`Failed to delete environment: ${response.statusText}`);
			}

			return { id: environmentId };
		},
		{
			optimisticUpdate: (environmentId) => {
				const previousEnvironment = queryClient.getQueryData(
					queryKeys.environments.detail(environmentId),
				) as EnvironmentWithStats;

				// Remove environment from all caches
				queryClient.removeQueries({
					queryKey: queryKeys.environments.detail(environmentId),
				});

				queryClient.setQueryData(
					queryKeys.environments.lists(),
					(old: EnvironmentWithStats[] = []) =>
						old.filter((env) => env.id !== environmentId),
				);

				// Clear active environment if it was the deleted one
				const activeEnvironment = queryClient.getQueryData(
					queryKeys.environments.active(),
				) as EnvironmentWithStats;
				if (activeEnvironment?.id === environmentId) {
					queryClient.setQueryData(queryKeys.environments.active(), null);
				}

				return { previousEnvironment, environmentId };
			},
			rollbackUpdate: (context) => {
				if (context?.previousEnvironment && context?.environmentId) {
					// Restore deleted environment
					queryClient.setQueryData(
						queryKeys.environments.detail(context.environmentId),
						context.previousEnvironment,
					);

					queryClient.setQueryData(
						queryKeys.environments.lists(),
						(old: EnvironmentWithStats[] = []) => [
							context.previousEnvironment,
							...old,
						],
					);

					// Restore active environment if it was the deleted one
					if (context.previousEnvironment.isActive) {
						queryClient.setQueryData(
							queryKeys.environments.active(),
							context.previousEnvironment,
						);
					}
				}
			},
			invalidateQueries: [queryKeys.environments.all],
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for environment validation
 */
export function useValidateEnvironmentMutation() {
	return useEnhancedMutation(
		async (config: Record<string, any>) => {
			const response = await fetch("/api/environments/validate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ config }),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Validation failed");
			}

			const result = await response.json();
			return result.data;
		},
		{
			enableWASMOptimization: false, // Validation doesn't need WASM
		},
	);
}

/**
 * Hook for environment usage statistics
 */
export function useEnvironmentStatsQuery(
	environmentId: string,
	timeRange?: { start: Date; end: Date },
) {
	return useEnhancedQuery(
		[...queryKeys.environments.detail(environmentId), "stats", timeRange],
		async () => {
			const searchParams = new URLSearchParams();
			if (timeRange) {
				searchParams.append("startDate", timeRange.start.toISOString());
				searchParams.append("endDate", timeRange.end.toISOString());
			}

			const response = await fetch(
				`/api/environments/${environmentId}/stats?${searchParams.toString()}`,
			);
			if (!response.ok) {
				throw new Error(
					`Failed to fetch environment stats: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			enabled: !!environmentId,
			staleTime: 5 * 60 * 1000, // 5 minutes for stats
			enableRealTimeSync: true,
			syncTable: "environments",
		},
	);
}

/**
 * Hook for environment configuration templates
 */
export function useEnvironmentTemplatesQuery() {
	return useEnhancedQuery(
		[...queryKeys.environments.all, "templates"],
		async () => {
			const response = await fetch("/api/environments/templates");
			if (!response.ok) {
				throw new Error(
					`Failed to fetch environment templates: ${response.statusText}`,
				);
			}

			const result = await response.json();
			return result.data;
		},
		{
			staleTime: 10 * 60 * 1000, // 10 minutes for templates
			enableWASMOptimization: false, // Templates don't need WASM
		},
	);
}
