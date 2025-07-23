/**
 * Enhanced Environment Query Hooks
 *
 * Complete TanStack Query implementation for environment management
 * with database integration, optimistic updates, and real-time sync.
 */

import {
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { Environment, NewEnvironment } from "@/db/schema";
import { observability } from "@/lib/observability";

// Query keys
export const environmentKeys = {
	all: ["environments"] as const,
	lists: () => [...environmentKeys.all, "list"] as const,
	list: (filters: Record<string, any>) => [...environmentKeys.lists(), filters] as const,
	details: () => [...environmentKeys.all, "detail"] as const,
	detail: (id: string) => [...environmentKeys.details(), id] as const,
	active: () => [...environmentKeys.all, "active"] as const,
};

// API functions
async function getEnvironments(filters?: {
	isActive?: boolean;
	userId?: string;
}): Promise<Environment[]> {
	const params = new URLSearchParams();
	if (filters?.isActive !== undefined) {
		params.append("isActive", filters.isActive.toString());
	}
	if (filters?.userId) {
		params.append("userId", filters.userId);
	}

	const response = await fetch(`/api/environments?${params}`);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to fetch environments");
	}

	const result = await response.json();
	return result.data || result;
}

async function getEnvironment(id: string): Promise<Environment> {
	const response = await fetch(`/api/environments/${id}`);
	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to fetch environment");
	}

	const result = await response.json();
	return result.data || result;
}

async function createEnvironment(data: NewEnvironment): Promise<Environment> {
	const response = await fetch("/api/environments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to create environment");
	}

	const result = await response.json();
	return result.data || result;
}

async function updateEnvironment(id: string, data: Partial<Environment>): Promise<Environment> {
	const response = await fetch(`/api/environments/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to update environment");
	}

	const result = await response.json();
	return result.data || result;
}

async function deleteEnvironment(id: string): Promise<void> {
	const response = await fetch(`/api/environments/${id}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to delete environment");
	}
}

async function activateEnvironment(id: string): Promise<Environment> {
	const response = await fetch(`/api/environments/${id}/activate`, {
		method: "POST",
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to activate environment");
	}

	const result = await response.json();
	return result.data || result;
}

// Hooks
export function useEnvironments(
	filters?: { isActive?: boolean; userId?: string },
	options?: UseQueryOptions<Environment[], Error>
) {
	return useQuery({
		queryKey: environmentKeys.list(filters || {}),
		queryFn: () =>
			observability.trackOperation("environments.list", () => getEnvironments(filters)),
		staleTime: 30000, // 30 seconds
		...options,
	});
}

export function useEnvironment(id: string, options?: UseQueryOptions<Environment, Error>) {
	return useQuery({
		queryKey: environmentKeys.detail(id),
		queryFn: () => observability.trackOperation("environments.get", () => getEnvironment(id)),
		enabled: !!id,
		staleTime: 60000, // 1 minute
		...options,
	});
}

export function useActiveEnvironment(options?: UseQueryOptions<Environment | null, Error>) {
	return useQuery({
		queryKey: environmentKeys.active(),
		queryFn: async () => {
			const environments = await getEnvironments({ isActive: true });
			return environments.find((env) => env.isActive) || null;
		},
		staleTime: 30000,
		...options,
	});
}

export function useCreateEnvironment(
	options?: UseMutationOptions<Environment, Error, NewEnvironment>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: NewEnvironment) =>
			observability.trackOperation("environments.create", () => createEnvironment(data)),
		onMutate: async (newEnvironment) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: environmentKeys.all });

			// Snapshot previous value
			const previousEnvironments = queryClient.getQueryData(environmentKeys.lists());

			// Optimistic update
			const tempId = `temp-${Date.now()}`;
			const optimisticEnvironment: Environment = {
				id: tempId,
				name: newEnvironment.name,
				config: newEnvironment.config,
				isActive: newEnvironment.isActive || false,
				createdAt: new Date(),
				updatedAt: new Date(),
				userId: newEnvironment.userId || null,
				schemaVersion: newEnvironment.schemaVersion || 1,
			};

			queryClient.setQueriesData(
				{ queryKey: environmentKeys.lists() },
				(old: Environment[] = []) => [optimisticEnvironment, ...old]
			);

			return { previousEnvironments, tempId };
		},
		onSuccess: (newEnvironment, variables, context) => {
			// Replace optimistic update with real data
			queryClient.setQueriesData({ queryKey: environmentKeys.lists() }, (old: Environment[] = []) =>
				old.map((env) => (env.id === context?.tempId ? newEnvironment : env))
			);

			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: environmentKeys.all });
		},
		onError: (error, variables, context) => {
			// Rollback optimistic update
			if (context?.previousEnvironments) {
				queryClient.setQueriesData(
					{ queryKey: environmentKeys.lists() },
					context.previousEnvironments
				);
			}
		},
		...options,
	});
}

export function useUpdateEnvironment(
	options?: UseMutationOptions<Environment, Error, { id: string; data: Partial<Environment> }>
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }) =>
			observability.trackOperation("environments.update", () => updateEnvironment(id, data)),
		onMutate: async ({ id, data }) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: environmentKeys.detail(id) });

			// Snapshot previous values
			const previousEnvironment = queryClient.getQueryData(environmentKeys.detail(id));
			const previousEnvironments = queryClient.getQueryData(environmentKeys.lists());

			// Optimistically update
			const updatedEnvironment = {
				...previousEnvironment,
				...data,
				updatedAt: new Date(),
			} as Environment;

			queryClient.setQueryData(environmentKeys.detail(id), updatedEnvironment);
			queryClient.setQueriesData({ queryKey: environmentKeys.lists() }, (old: Environment[] = []) =>
				old.map((env) => (env.id === id ? updatedEnvironment : env))
			);

			return { previousEnvironment, previousEnvironments };
		},
		onError: (error, { id }, context) => {
			// Rollback optimistic updates
			if (context?.previousEnvironment) {
				queryClient.setQueryData(environmentKeys.detail(id), context.previousEnvironment);
			}
			if (context?.previousEnvironments) {
				queryClient.setQueriesData(
					{ queryKey: environmentKeys.lists() },
					context.previousEnvironments
				);
			}
		},
		onSettled: (data, error, { id }) => {
			// Always refetch after error or success
			queryClient.invalidateQueries({ queryKey: environmentKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: environmentKeys.all });
		},
		...options,
	});
}

export function useDeleteEnvironment(options?: UseMutationOptions<void, Error, string>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			observability.trackOperation("environments.delete", () => deleteEnvironment(id)),
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: environmentKeys.all });

			// Snapshot previous values
			const previousEnvironment = queryClient.getQueryData(environmentKeys.detail(id));
			const previousEnvironments = queryClient.getQueryData(environmentKeys.lists());

			// Optimistically remove
			queryClient.removeQueries({ queryKey: environmentKeys.detail(id) });
			queryClient.setQueriesData({ queryKey: environmentKeys.lists() }, (old: Environment[] = []) =>
				old.filter((env) => env.id !== id)
			);

			return { previousEnvironment, previousEnvironments };
		},
		onError: (error, id, context) => {
			// Rollback optimistic updates
			if (context?.previousEnvironment) {
				queryClient.setQueryData(environmentKeys.detail(id), context.previousEnvironment);
			}
			if (context?.previousEnvironments) {
				queryClient.setQueriesData(
					{ queryKey: environmentKeys.lists() },
					context.previousEnvironments
				);
			}
		},
		onSettled: () => {
			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: environmentKeys.all });
		},
		...options,
	});
}

export function useActivateEnvironment(options?: UseMutationOptions<Environment, Error, string>) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			observability.trackOperation("environments.activate", () => activateEnvironment(id)),
		onMutate: async (id) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: environmentKeys.all });

			// Snapshot previous values
			const previousEnvironments = queryClient.getQueryData(environmentKeys.lists());

			// Optimistically update - deactivate all others and activate this one
			queryClient.setQueriesData({ queryKey: environmentKeys.lists() }, (old: Environment[] = []) =>
				old.map((env) => ({
					...env,
					isActive: env.id === id,
					updatedAt: env.id === id ? new Date() : env.updatedAt,
				}))
			);

			// Update active environment query
			const targetEnvironment = ((previousEnvironments as Environment[]) || []).find(
				(env) => env.id === id
			);
			if (targetEnvironment) {
				queryClient.setQueryData(environmentKeys.active(), {
					...targetEnvironment,
					isActive: true,
					updatedAt: new Date(),
				});
			}

			return { previousEnvironments };
		},
		onError: (error, id, context) => {
			// Rollback optimistic updates
			if (context?.previousEnvironments) {
				queryClient.setQueriesData(
					{ queryKey: environmentKeys.lists() },
					context.previousEnvironments
				);
			}
		},
		onSettled: () => {
			// Invalidate to ensure consistency
			queryClient.invalidateQueries({ queryKey: environmentKeys.all });
		},
		...options,
	});
}

// Utility hooks
export function useEnvironmentStats() {
	const { data: environments = [] } = useEnvironments();

	return {
		total: environments.length,
		active: environments.filter((env) => env.isActive).length,
		inactive: environments.filter((env) => !env.isActive).length,
	};
}

export function usePrefetchEnvironment() {
	const queryClient = useQueryClient();

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: environmentKeys.detail(id),
			queryFn: () => getEnvironment(id),
			staleTime: 60000,
		});
	};
}
