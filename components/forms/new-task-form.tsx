"use client";
import {
	AlertCircle,
	HardDrive,
	RefreshCw,
	Split,
	Wifi,
	WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createTaskAction } from "@/app/actions/inngest";
import { useElectricContext } from "@/components/providers/electric-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEnvironmentsQuery } from "@/hooks/use-environment-queries";
import { useGitHubAuth } from "@/hooks/use-github-auth";
import { useCreateTaskMutation } from "@/hooks/use-task-queries";
import { observability } from "@/lib/observability";

// Helper functions for form logic
const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
	textarea.style.height = "100px";
	textarea.style.height = `${Math.max(100, textarea.scrollHeight)}px`;
};

const getDefaultBranch = (
	branches: Array<{ name: string; isDefault?: boolean }>,
) => {
	return branches.find((branch) => branch.isDefault)?.name || "";
};

const getRepositoryFromEnvironment = (
	environments: Array<{ id: string; config?: { githubRepository?: string } }>,
	envId: string,
) => {
	return (
		environments.find((env) => env.id === envId)?.config?.githubRepository || ""
	);
};

const createTaskData = (
	value: string,
	mode: "code" | "ask",
	selectedBranch: string,
	environments: Array<{ id: string; config?: { githubRepository?: string } }>,
	selectedEnvironment: string,
	userId: string,
) => ({
	title: value,
	hasChanges: false,
	description: "",
	messages: [],
	status: "pending" as const,
	priority: "medium" as const,
	branch: selectedBranch,
	sessionId: "",
	repository: getRepositoryFromEnvironment(environments, selectedEnvironment),
	mode,
	userId,
	assignee: userId,
});

interface NewTaskFormProps {
	userId?: string;
}

export default function NewTaskForm({ userId }: NewTaskFormProps) {
	// ElectricSQL connection status
	const { isConnected, isSyncing, error: electricError } = useElectricContext();

	// Query for environments
	const {
		environments,
		loading: environmentsLoading,
		error: environmentsError,
		refetch: refetchEnvironments,
		isStale: environmentsStale,
	} = useEnvironmentsQuery({ userId });

	// GitHub auth and branches
	const { branches, fetchBranches } = useGitHubAuth();

	// Task creation mutation
	const createTaskMutation = useCreateTaskMutation();

	// Form state
	const [selectedBranch, setSelectedBranch] = useState<string>(
		getDefaultBranch(branches),
	);
	const [selectedEnvironment, setSelectedEnvironment] = useState<string>("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [value, setValue] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const adjustHeight = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			adjustTextareaHeight(textarea);
		}
	}, []);

	const handleAddTask = async (mode: "code" | "ask") => {
		if (!(value.trim() && userId)) {
			return;
		}

		setIsSubmitting(true);

		try {
			const taskData = createTaskData(
				value,
				mode,
				selectedBranch,
				environments || [],
				selectedEnvironment,
				userId,
			);

			// Create task with optimistic updates
			const newTask = await createTaskMutation.mutateAsync(taskData);

			// Trigger Inngest workflow
			await createTaskAction({ task: newTask });

			// Clear form
			setValue("");

			// Record user action
			await observability.events.collector.collectEvent(
				"user_action",
				"info",
				`Task created: ${newTask.title}`,
				{ taskId: newTask.id, userId, mode, repository: taskData.repository },
				"ui",
				["task", "create"],
			);
		} catch (error) {
			console.error("Failed to create task:", error);
			// Error handling is managed by the mutation hook's error boundary
		} finally {
			setIsSubmitting(false);
		}
	};

	// Effects for initialization and state management
	useEffect(() => {
		adjustHeight();
	}, [adjustHeight]);

	useEffect(() => {
		if (environments && environments.length > 0 && !selectedEnvironment) {
			setSelectedEnvironment(environments[0].id);
		}
	}, [environments, selectedEnvironment]);

	useEffect(() => {
		if (selectedEnvironment && environments) {
			const environment = environments.find(
				(env) => env.id === selectedEnvironment,
			);
			if (environment?.config?.githubRepository) {
				fetchBranches(environment.config.githubRepository);
			}
		}
	}, [selectedEnvironment, environments, fetchBranches]);

	useEffect(() => {
		if (branches.length > 0) {
			setSelectedBranch(getDefaultBranch(branches));
		}
	}, [branches]);

	// Connection status indicator
	const ConnectionStatus = () => (
		<div className="mb-4 flex items-center gap-2 text-muted-foreground text-sm">
			{isConnected ? (
				<>
					<Wifi className="h-4 w-4 text-green-500" />
					<span>Online</span>
					{isSyncing && <RefreshCw className="h-4 w-4 animate-spin" />}
				</>
			) : (
				<>
					<WifiOff className="h-4 w-4 text-red-500" />
					<span>Offline</span>
				</>
			)}
			{environmentsStale && (
				<Badge className="ml-2 text-xs" variant="outline">
					Stale Data
				</Badge>
			)}
		</div>
	);

	// Loading skeleton for environments
	const EnvironmentsLoadingSkeleton = () => (
		<div className="flex items-center gap-x-2">
			<Skeleton className="h-9 w-32" />
			<Skeleton className="h-9 w-24" />
		</div>
	);

	if (environmentsLoading) {
		return (
			<div className="mx-auto mt-14 flex w-full max-w-3xl flex-col gap-y-10">
				<h1 className="text-center font-bold text-4xl">
					Ready to ship something new?
				</h1>
				<div className="rounded-lg bg-muted p-0.5">
					<div className="flex flex-col gap-y-2 rounded-lg border bg-background p-4">
						<Skeleton className="min-h-[100px] w-full" />
						<EnvironmentsLoadingSkeleton />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto mt-14 flex w-full max-w-3xl flex-col gap-y-10">
			<h1 className="text-center font-bold text-4xl">
				Ready to ship something new?
			</h1>
			<div className="rounded-lg bg-muted p-0.5">
				<div className="flex flex-col gap-y-2 rounded-lg border bg-background p-4">
					<textarea
						className="min-h-[100px] w-full resize-none overflow-hidden border-none p-0 focus:border-transparent focus:outline-none"
						disabled={isSubmitting}
						onChange={(e) => setValue(e.target.value)}
						placeholder="Describe a task you want to ship..."
						ref={textareaRef}
						value={value}
					/>
					{/* Connection and error status */}
					<ConnectionStatus />

					{electricError && (
						<Alert className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>
								Real-time sync unavailable. Working in offline mode.
							</AlertDescription>
						</Alert>
					)}

					{environmentsError && (
						<Alert className="mb-4" variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription className="flex items-center justify-between">
								<span>
									Failed to load environments: {environmentsError.message}
								</span>
								<Button
									onClick={refetchEnvironments}
									size="sm"
									variant="outline"
								>
									Retry
								</Button>
							</AlertDescription>
						</Alert>
					)}

					<div className="flex items-center justify-between">
						<div className="flex items-center gap-x-2">
							{environments && environments.length > 0 ? (
								<Select
									disabled={isSubmitting}
									onValueChange={(value) => setSelectedEnvironment(value)}
									value={selectedEnvironment || ""}
								>
									<SelectTrigger>
										<HardDrive className="h-4 w-4" />
										<SelectValue placeholder="Choose a repository" />
									</SelectTrigger>
									<SelectContent>
										{environments.map((environment) => (
											<SelectItem key={environment.id} value={environment.id}>
												<div className="flex w-full">
													<span className="max-w-[150px] truncate">
														{environment.config?.githubRepository ||
															environment.name}
													</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							) : (
								<Link href="/environments" passHref>
									<Button className="rounded-lg" variant="outline">
										<HardDrive className="h-4 w-4" />
										Create an environment
									</Button>
								</Link>
							)}
							{selectedEnvironment && (
								<Select
									disabled={isSubmitting}
									onValueChange={(value) => setSelectedBranch(value)}
									value={selectedBranch}
								>
									<SelectTrigger>
										<Split className="h-4 w-4" />
										<SelectValue placeholder="Branch..." />
									</SelectTrigger>
									<SelectContent>
										{branches.map((branch) => (
											<SelectItem key={branch.name} value={branch.name}>
												<div className="flex w-full">
													<span>{branch.name}</span>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							)}
						</div>
						{value && (
							<div className="flex items-center gap-x-2">
								<Button
									disabled={isSubmitting || createTaskMutation.isPending}
									onClick={() => handleAddTask("ask")}
									variant="outline"
								>
									{isSubmitting ? (
										<RefreshCw className="h-4 w-4 animate-spin" />
									) : (
										"Ask"
									)}
								</Button>
								<Button
									disabled={isSubmitting || createTaskMutation.isPending}
									onClick={() => handleAddTask("code")}
								>
									{isSubmitting ? (
										<RefreshCw className="h-4 w-4 animate-spin" />
									) : (
										"Code"
									)}
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
