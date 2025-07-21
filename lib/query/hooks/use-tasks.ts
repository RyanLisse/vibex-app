/**
 * TanStack Query hooks for Tasks
 *
 * Replaces Zustand task store with TanStack Query + Redis caching
 */

	import { useInfiniteQuery,
	import { useMutation,
	import { useQuery,
	import { useQueryClient
} from "@tanstack/react-query";
import { UpdateTaskSchema
} from "@/src/schemas/api-routes";

// Types
export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// Query keys
export const taskKeys = {
	all: ["tasks"] as const,
	lists: () => [...taskKeys.all, "list"] as const,
	list: (filters: Record<string, any>) =>
		[...taskKeys.lists(), { filters }] as const,
	details: () => [...taskKeys.all, "detail"] as const,
	detail: (id: string) => [...taskKeys.details(), id] as const,
	infinite: (filters: Record<string, any>) =>
		[...taskKeys.all, "infinite", { filters }] as const,
};

// API functions
async function fetchTasks(params: {
	page?: number;
	limit?: number;
	status?: string;
	sessionId?: string;
	archived?: boolean;
	search?: string;
}): Promise<{ tasks: Task[]; total: number; hasMore: boolean }> {
	const searchParams = new URLSearchParams();
Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			searchParams.append(key, String(value));
		}
	});

	const response = await fetch(`/api/tasks?${searchParams}`);
	if (!response.ok) {
		throw new Error("Failed to fetch tasks");
	}

	return response.json();
}

async function fetchTask(id: string): Promise<Task> {
	const response = await fetch(`/api/tasks/${id}`);
	if (!response.ok) {
		throw new Error("Failed to fetch task");
	}

	const task = await response.json();

	return task;
}

async function createTask(data: CreateTaskInput): Promise<Task> {
	const response = await fetch("/api/tasks", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to create task");
	}

	const task = await response.json();

	return task;
}

async function updateTask(id: string, data: UpdateTaskInput): Promise<Task> {
	const response = await fetch(`/api/tasks/${id}`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(data),
	});

	if (!response.ok) {
		throw new Error("Failed to update task");
	}

	const task = await response.json();

	return task;
}

async function deleteTask(id: string): Promise<void> {
	const response = await fetch(`/api/tasks/${id}`, {
		method: "DELETE",
	});

	if (!response.ok) {
		throw new Error("Failed to delete task");
	}
}

// Hooks
export function useTasks(
	filters: {
		status?: string;
		sessionId?: string;
		archived?: boolean;
		search?: string;
	} = {},
) {
	return useQuery({
		queryKey: taskKeys.list(filters),
		queryFn: () => fetchTasks({ ...filters, limit: 100 }),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
	});
}

export function useTask(id: string) {
	return useQuery({
		queryKey: taskKeys.detail(id),
		queryFn: () => fetchTask(id),
		enabled: !!id,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
	});
}

export function useInfiniteTasks(
	filters: {
		status?: string;
		sessionId?: string;
		archived?: boolean;
		search?: string;
	} = {},
) {
	return useInfiniteQuery({
		queryKey: taskKeys.infinite(filters),
		queryFn: ({ pageParam = 1 }) =>
			fetchTasks({ ...filters, page: pageParam, limit: 20 }),
		initialPageParam: 1,
		getNextPageParam: (lastPage, allPages) =>
			lastPage.hasMore ? allPages.length + 1 : undefined,
		staleTime: 1000 * 60 * 2, // 2 minutes
	});
}

export function useCreateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createTask,
		onSuccess: (newTask) => {
			// Update the tasks list cache
			queryClient.setQueryData(taskKeys.lists(), (old: any) => {
				if (!old) return { tasks: [newTask], total: 1, hasMore: false };
				return {
					...old,
					tasks: [newTask, ...old.tasks],
					total: old.total + 1,
				};
			});

			// Set the individual task cache
			queryClient.setQueryData(taskKeys.detail(newTask.id), newTask);

			// Invalidate and refetch tasks lists
			queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
			queryClient.invalidateQueries({ queryKey: taskKeys.infinite({}) });
		},
	});
}

export function useUpdateTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
			updateTask(id, data),
		onSuccess: (updatedTask) => {
			// Update the individual task cache
			queryClient.setQueryData(taskKeys.detail(updatedTask.id), updatedTask);

			// Update tasks in lists
			queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: any) => {
				if (!old) return old;
				return {
					...old,
					tasks: old.tasks.map((task: Task) =>
						task.id === updatedTask.id ? updatedTask : task,
					),
				};
			});

			// Invalidate infinite queries
			queryClient.invalidateQueries({ queryKey: taskKeys.infinite({}) });
		},
	});
}

export function useDeleteTask() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: deleteTask,
		onSuccess: (_, deletedId) => {
			// Remove from individual task cache
			queryClient.removeQueries({ queryKey: taskKeys.detail(deletedId) });

			// Update tasks in lists
			queryClient.setQueriesData({ queryKey: taskKeys.lists() }, (old: any) => {
				if (!old) return old;
				return {
					...old,
					tasks: old.tasks.filter((task: Task) => task.id !== deletedId),
					total: old.total - 1,
				};
			});

			// Invalidate infinite queries
			queryClient.invalidateQueries({ queryKey: taskKeys.infinite({}) });
		},
	});
}

// Convenience hooks for common operations
export function useActiveTasks() {
	return useTasks({ archived: false });
}

export function useArchivedTasks() {
	return useTasks({ archived: true });
}

export function useTasksByStatus(status: string) {
	return useTasks({ status });
}

export function useTasksBySession(sessionId: string) {
	return useTasks({ sessionId });
}

// Optimistic update hooks
export function useArchiveTask() {
	const updateTask = useUpdateTask();

	return useMutation({
		mutationFn: (id: string) =>
			updateTask.mutateAsync({
				id,
				data: { isArchived: true },
			}),
	});
}

export function useUnarchiveTask() {
	const updateTask = useUpdateTask();

	return useMutation({
		mutationFn: (id: string) =>
			updateTask.mutateAsync({
				id,
				data: { isArchived: false },
			}),
	});
}

export function usePauseTask() {
	const updateTask = useUpdateTask();

	return useMutation({
		mutationFn: (id: string) =>
			updateTask.mutateAsync({
				id,
				data: { status: "PAUSED" },
			}),
	});
}

export function useResumeTask() {
	const updateTask = useUpdateTask();

	return useMutation({
		mutationFn: (id: string) =>
			updateTask.mutateAsync({
				id,
				data: { status: "IN_PROGRESS" },
			}),
	});
}

export function useCancelTask() {
	const updateTask = useUpdateTask();

	return useMutation({
		mutationFn: (id: string) =>
			updateTask.mutateAsync({
				id,
				data: { status: "CANCELLED" },
			}),
	});
}
