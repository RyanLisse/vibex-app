/**
 * TanStack Query hooks for Environments
 *
 * Replaces Zustand environment store with TanStack Query + Redis caching
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
	CreateEnvironmentSchema,
	EnvironmentSchema,
	UpdateEnvironmentSchema,
} from "@/src/schemas/api-routes";

// Types
export type Environment = z.infer<typeof EnvironmentSchema>;
export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;
export type UpdateEnvironmentInput = z.infer<typeof UpdateEnvironmentSchema>;

// Query keys
export const environmentKeys = {
	all: ["environments"] as const,
	lists: () => [...environmentKeys.all, "list"] as const,
	list: (filters: Record<string, any>) =>
		[...environmentKeys.lists(), { filters }] as const,
	details: () => [...environmentKeys.all, "detail"] as const,
	detail: (id: string) => [...environmentKeys.details(), id] as const,
};

// API functions
async function fetchEnvironments(
	params: { page?: number; limit?: number; search?: string } = {},
): Promise<{ environments: Environment[]; total: number; hasMore: boolean }> {
	const searchParams = new URLSearchParams();

	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			searchParams.append(key, String(value));
		}
	});

	const response = await fetch(`/api/environments?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch environments");
	}

	const result = await response.json();
	return result;
}

async function fetchEnvironment(id: string): Promise<Environment> {
	const response = await fetch(`/api/environments/${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch environment");
	}

	const environment = await response.json();
	return environment;
}

async function createEnvironment(
	data: CreateEnvironmentInput,
): Promise<Environment> {
	const response = await fetch("/api/environments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to create environment");
	}

	const environment = await response.json();
	return environment;
}

async function updateEnvironment(
	id: string,
	data: UpdateEnvironmentInput,
): Promise<Environment> {
	const response = await fetch(`/api/environments/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		const error = await response.json();
		throw new Error(error.message || "Failed to update environment");
	}

	const environment = await response.json();
	return environment;
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

// Hooks
export function useEnvironments(filters: { search?: string } = {}) {
	return useQuery({
		queryKey: environmentKeys.list(filters),
		queryFn: () => fetchEnvironments({ ...filters, limit: 100 }),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

export function useEnvironment(id: string) {
	return useQuery({
		queryKey: environmentKeys.detail(id),
		queryFn: () => fetchEnvironment(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 60, // 1 hour
	});
}

export function useCreateEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createEnvironment,
		onSuccess: (newEnvironment) => {
			// Update the environments list cache
			queryClient.setQueryData(environmentKeys.lists(), (old: any) => {
				if (!old)
					return { environments: [newEnvironment], total: 1, hasMore: false };
				return {
					...old,
					environments: [newEnvironment, ...old.environments],
					total: old.total + 1,
				};
			});

			// Set the individual environment cache
			queryClient.setQueryData(
				environmentKeys.detail(newEnvironment.id),
				newEnvironment,
			);

			// Invalidate and refetch environments lists
			queryClient.invalidateQueries({ queryKey: environmentKeys.lists() });
		},
		onError: (error) => {
			console.error("Failed to create environment:", error);
		},
	});
}

export function useUpdateEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateEnvironmentInput }) =>
			updateEnvironment(id, data),
		onSuccess: (updatedEnvironment) => {
			// Update the individual environment cache
			queryClient.setQueryData(
				environmentKeys.detail(updatedEnvironment.id),
				updatedEnvironment,
			);

			// Update environments in lists
			queryClient.setQueriesData(
				{ queryKey: environmentKeys.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						environments: old.environments.map((env: Environment) =>
							env.id === updatedEnvironment.id ? updatedEnvironment : env,
						),
					};
				},
			);
		},
		onError: (error) => {
			console.error("Failed to update environment:", error);
		},
	});
}

export function useDeleteEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteEnvironment,
		onSuccess: (_, deletedId) => {
			// Remove from individual environment cache
			queryClient.removeQueries({
				queryKey: environmentKeys.detail(deletedId),
			});

			// Update environments in lists
			queryClient.setQueriesData(
				{ queryKey: environmentKeys.lists() },
				(old: any) => {
					if (!old) return old;
					return {
						...old,
						environments: old.environments.filter(
							(env: Environment) => env.id !== deletedId,
						),
						total: old.total - 1,
					};
				},
			);
		},
		onError: (error) => {
			console.error("Failed to delete environment:", error);
		},
	});
}

// Utility hooks
export function useEnvironmentByName(name: string) {
	const { data: environments } = useEnvironments();

	return environments?.environments.find((env) => env.name === name);
}

export function useEnvironmentsByOrganization(organization: string) {
	return useEnvironments({
		search: organization, // Assuming the API supports searching by organization
	});
}

// Validation hooks
export function useValidateEnvironmentName() {
	const { data: environments } = useEnvironments();

	return (name: string, excludeId?: string) => {
		if (!environments) return true;

		return !environments.environments.some(
			(env) =>
				env.name.toLowerCase() === name.toLowerCase() && env.id !== excludeId,
		);
	};
}

// Prefetch utilities
export function usePrefetchEnvironment() {
	const queryClient = useQueryClient();

	return (id: string) => {
		queryClient.prefetchQuery({
			queryKey: environmentKeys.detail(id),
			queryFn: () => fetchEnvironment(id),
			staleTime: 1000 * 60 * 10, // 10 minutes
		});
	};
}
