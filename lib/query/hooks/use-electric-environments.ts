/**
 * Simplified Environment Hooks
 *
 * Basic TanStack Query hooks for environment management without complex Electric services
 */

import { UpdateEnvironmentSchema } from "@/src/schemas/api-routes";

// Types
export type ElectricEnvironment = z.infer<typeof EnvironmentSchema>;
export type CreateElectricEnvironmentInput = z.infer<
	typeof CreateEnvironmentSchema
>;
export type UpdateElectricEnvironmentInput = z.infer<
	typeof UpdateEnvironmentSchema
>;

// Query keys for cache management
export const electricEnvironmentKeys = {
	all: ["electric-environments"] as const,
	lists: () => [...electricEnvironmentKeys.all, "list"] as const,
	list: (userId?: string) =>
		[...electricEnvironmentKeys.lists(), { userId }] as const,
	details: () => [...electricEnvironmentKeys.all, "detail"] as const,
	detail: (id: string) => [...electricEnvironmentKeys.details(), id] as const,
};

// Fetch functions
async function fetchEnvironments(
	userId?: string,
): Promise<ElectricEnvironment[]> {
	const url = new URL("/api/environments", window.location.origin);
	if (userId) {
		url.searchParams.set("userId", userId);
	}

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error("Failed to fetch environments");
	}

	const { data } = await response.json();
	return data;
}

async function fetchEnvironment(id: string): Promise<ElectricEnvironment> {
	const response = await fetch(`/api/environments/${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch environment");
	}

	const { data } = await response.json();
	return data;
}

async function createEnvironment(
	data: CreateElectricEnvironmentInput,
): Promise<ElectricEnvironment> {
	const response = await fetch("/api/environments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to create environment");
	}

	const result = await response.json();
	return result.data;
}

async function updateEnvironment(
	id: string,
	data: UpdateElectricEnvironmentInput,
): Promise<ElectricEnvironment> {
	const response = await fetch(`/api/environments/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to update environment");
	}

	const result = await response.json();
	return result.data;
}

async function deleteEnvironment(id: string): Promise<void> {
	const response = await fetch(`/api/environments/${id}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error("Failed to delete environment");
	}
}

// Hooks
export function useElectricEnvironments(userId?: string) {
	return useQuery({
		queryKey: electricEnvironmentKeys.list(userId),
		queryFn: () => fetchEnvironments(userId),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

export function useElectricEnvironment(id: string) {
	return useQuery({
		queryKey: electricEnvironmentKeys.detail(id),
		queryFn: () => fetchEnvironment(id),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

export function useCreateElectricEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createEnvironment,
		onSuccess: (newEnvironment) => {
			// Update the environments list
			queryClient.invalidateQueries({
				queryKey: electricEnvironmentKeys.lists(),
			});

			// Add the new environment to cache
			queryClient.setQueryData(
				electricEnvironmentKeys.detail(newEnvironment.id),
				newEnvironment,
			);
		},
	});
}

export function useUpdateElectricEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateElectricEnvironmentInput;
		}) => updateEnvironment(id, data),
		onSuccess: (updatedEnvironment) => {
			// Update the specific environment in cache
			queryClient.setQueryData(
				electricEnvironmentKeys.detail(updatedEnvironment.id),
				updatedEnvironment,
			);

			// Invalidate and refetch environments list
			queryClient.invalidateQueries({
				queryKey: electricEnvironmentKeys.lists(),
			});
		},
	});
}

export function useDeleteElectricEnvironment() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteEnvironment,
		onSuccess: (_, deletedId) => {
			// Remove from cache
			queryClient.removeQueries({
				queryKey: electricEnvironmentKeys.detail(deletedId),
			});

			// Invalidate lists
			queryClient.invalidateQueries({
				queryKey: electricEnvironmentKeys.lists(),
			});
		},
	});
}
