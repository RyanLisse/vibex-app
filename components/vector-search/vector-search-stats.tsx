"use client";

import {
	AlertCircle,
	Brain,
	CheckCircle,
	Clock,
	Database,
	RefreshCw,
	Star,
	TrendingUp,
	Zap,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	useMemoryVectorStats,
	useTaskVectorStats,
	useUpdateMemoryEmbeddings,
	useUpdateTaskEmbeddings,
} from "@/hooks/use-vector-search";

interface VectorSearchStatsProps {
	userId?: string;
	agentType?: string;
}

export function VectorSearchStats({ userId, agentType }: VectorSearchStatsProps) {
	const [activeTab, setActiveTab] = useState("tasks");

	const taskStats = useTaskVectorStats(userId);
	const memoryStats = useMemoryVectorStats(agentType);

	const updateTaskEmbeddings = useUpdateTaskEmbeddings();
	const updateMemoryEmbeddings = useUpdateMemoryEmbeddings();

	const handleUpdateTaskEmbeddings = () => {
		updateTaskEmbeddings.mutate({ batchSize: 20 });
	};

	const handleUpdateMemoryEmbeddings = () => {
		updateMemoryEmbeddings.mutate({ agentType, batchSize: 20 });
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold tracking-tight">Vector Search Analytics</h2>
					<p className="text-muted-foreground">
						Monitor embedding coverage and search capabilities
					</p>
				</div>

				{/* WASM Status */}
				<div className="flex items-center gap-2">
					<Badge
						variant={taskStats.data?.wasm.available ? "default" : "secondary"}
						className="flex items-center gap-1"
					>
						<Zap className="h-3 w-3" />
						WASM {taskStats.data?.wasm.available ? "Enabled" : "Disabled"}
					</Badge>
				</div>
			</div>

			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="tasks" className="flex items-center gap-2">
						<Database className="h-4 w-4" />
						Tasks
					</TabsTrigger>
					<TabsTrigger value="memory" className="flex items-center gap-2">
						<Brain className="h-4 w-4" />
						Agent Memory
					</TabsTrigger>
				</TabsList>

				<TabsContent value="tasks" className="space-y-4">
					<TaskStatsContent
						stats={taskStats.data}
						isLoading={taskStats.isLoading}
						error={taskStats.error}
						onUpdateEmbeddings={handleUpdateTaskEmbeddings}
						isUpdating={updateTaskEmbeddings.isPending}
						updateResult={updateTaskEmbeddings.data}
					/>
				</TabsContent>

				<TabsContent value="memory" className="space-y-4">
					<MemoryStatsContent
						stats={memoryStats.data}
						isLoading={memoryStats.isLoading}
						error={memoryStats.error}
						onUpdateEmbeddings={handleUpdateMemoryEmbeddings}
						isUpdating={updateMemoryEmbeddings.isPending}
						updateResult={updateMemoryEmbeddings.data}
					/>
				</TabsContent>
			</Tabs>
		</div>
	);
}

interface TaskStatsContentProps {
	stats: any;
	isLoading: boolean;
	error: Error | null;
	onUpdateEmbeddings: () => void;
	isUpdating: boolean;
	updateResult: any;
}

function TaskStatsContent({
	stats,
	isLoading,
	error,
	onUpdateEmbeddings,
	isUpdating,
	updateResult,
}: TaskStatsContentProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<div className="animate-pulse">
								<div className="h-4 bg-muted rounded w-3/4 mb-2" />
								<div className="h-8 bg-muted rounded w-1/2" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span>Failed to load task statistics</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	const taskStats = stats?.stats;
	const embeddingCoverage =
		taskStats?.total_tasks > 0
			? (taskStats.tasks_with_embeddings / taskStats.total_tasks) * 100
			: 0;

	return (
		<div className="space-y-4">
			{/* Overview Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
						<Database className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{taskStats?.total_tasks || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">With Embeddings</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{taskStats?.tasks_with_embeddings || 0}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Missing Embeddings</CardTitle>
						<AlertCircle className="h-4 w-4 text-orange-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-orange-600">
							{taskStats?.tasks_without_embeddings || 0}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Coverage</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{embeddingCoverage.toFixed(1)}%</div>
						<Progress value={embeddingCoverage} className="mt-2" />
					</CardContent>
				</Card>
			</div>

			{/* Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RefreshCw className="h-4 w-4" />
						Embedding Management
					</CardTitle>
					<CardDescription>Generate embeddings for tasks that don't have them yet</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Update Task Embeddings</p>
							<p className="text-xs text-muted-foreground">
								Process up to 20 tasks without embeddings
							</p>
						</div>
						<Button
							onClick={onUpdateEmbeddings}
							disabled={isUpdating || (taskStats?.tasks_without_embeddings || 0) === 0}
							size="sm"
						>
							{isUpdating ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Processing...
								</>
							) : (
								<>
									<RefreshCw className="h-4 w-4 mr-2" />
									Update Embeddings
								</>
							)}
						</Button>
					</div>

					{updateResult && (
						<div className="p-3 bg-muted rounded-lg">
							<p className="text-sm">
								<span className="font-medium">Result:</span> {updateResult.message}
							</p>
							{updateResult.errors && updateResult.errors.length > 0 && (
								<details className="mt-2">
									<summary className="text-xs text-muted-foreground cursor-pointer">
										View errors ({updateResult.errors.length})
									</summary>
									<div className="mt-1 space-y-1">
										{updateResult.errors.map((error: any, index: number) => (
											<p key={index} className="text-xs text-destructive">
												Task {error.taskId}: {error.error}
											</p>
										))}
									</div>
								</details>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* WASM Capabilities */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-4 w-4" />
						WASM Capabilities
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3 md:grid-cols-2">
						<div className="flex items-center justify-between">
							<span className="text-sm">WebAssembly</span>
							<Badge variant={stats?.wasm.capabilities.webAssembly ? "default" : "secondary"}>
								{stats?.wasm.capabilities.webAssembly ? "Supported" : "Not Available"}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">SharedArrayBuffer</span>
							<Badge variant={stats?.wasm.capabilities.sharedArrayBuffer ? "default" : "secondary"}>
								{stats?.wasm.capabilities.sharedArrayBuffer ? "Available" : "Not Available"}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">Cross-Origin Isolated</span>
							<Badge
								variant={stats?.wasm.capabilities.crossOriginIsolated ? "default" : "secondary"}
							>
								{stats?.wasm.capabilities.crossOriginIsolated ? "Enabled" : "Disabled"}
							</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm">Memory Limit</span>
							<span className="text-sm text-muted-foreground">
								{stats?.wasm.capabilities.memoryInfo.jsHeapSizeLimit
									? `${Math.round(stats.wasm.capabilities.memoryInfo.jsHeapSizeLimit / 1024 / 1024)}MB`
									: "Unknown"}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

interface MemoryStatsContentProps {
	stats: any;
	isLoading: boolean;
	error: Error | null;
	onUpdateEmbeddings: () => void;
	isUpdating: boolean;
	updateResult: any;
}

function MemoryStatsContent({
	stats,
	isLoading,
	error,
	onUpdateEmbeddings,
	isUpdating,
	updateResult,
}: MemoryStatsContentProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<Card key={i}>
						<CardContent className="p-6">
							<div className="animate-pulse">
								<div className="h-4 bg-muted rounded w-3/4 mb-2" />
								<div className="h-8 bg-muted rounded w-1/2" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	if (error) {
		return (
			<Card>
				<CardContent className="p-6">
					<div className="flex items-center gap-2 text-destructive">
						<AlertCircle className="h-4 w-4" />
						<span>Failed to load memory statistics</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	const memoryStats = stats?.stats;
	const embeddingCoverage =
		memoryStats?.total_memories > 0
			? (memoryStats.memories_with_embeddings / memoryStats.total_memories) * 100
			: 0;

	return (
		<div className="space-y-4">
			{/* Overview Cards */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Memories</CardTitle>
						<Brain className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{memoryStats?.total_memories || 0}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">With Embeddings</CardTitle>
						<CheckCircle className="h-4 w-4 text-green-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">
							{memoryStats?.memories_with_embeddings || 0}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Avg Importance</CardTitle>
						<Star className="h-4 w-4 text-yellow-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-yellow-600">
							{memoryStats?.avg_importance ? Number(memoryStats.avg_importance).toFixed(1) : "0.0"}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Expired</CardTitle>
						<Clock className="h-4 w-4 text-red-600" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">
							{memoryStats?.expired_memories || 0}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Agent Types */}
			{stats?.agentTypes && stats.agentTypes.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Agent Types</CardTitle>
						<CardDescription>Memory distribution by agent type</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{stats.agentTypes.map((agentType: any) => (
								<div key={agentType.agent_type} className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Badge variant="outline">{agentType.agent_type}</Badge>
										<span className="text-sm text-muted-foreground">
											{agentType.count} memories
										</span>
									</div>
									<div className="flex items-center gap-2">
										<Star className="h-3 w-3 text-yellow-500" />
										<span className="text-sm">{Number(agentType.avg_importance).toFixed(1)}</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}

			{/* Actions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<RefreshCw className="h-4 w-4" />
						Memory Management
					</CardTitle>
					<CardDescription>
						Generate embeddings for memories that don't have them yet
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium">Update Memory Embeddings</p>
							<p className="text-xs text-muted-foreground">
								Process up to 20 memories without embeddings
							</p>
						</div>
						<Button
							onClick={onUpdateEmbeddings}
							disabled={isUpdating || (memoryStats?.memories_without_embeddings || 0) === 0}
							size="sm"
						>
							{isUpdating ? (
								<>
									<RefreshCw className="h-4 w-4 mr-2 animate-spin" />
									Processing...
								</>
							) : (
								<>
									<RefreshCw className="h-4 w-4 mr-2" />
									Update Embeddings
								</>
							)}
						</Button>
					</div>

					{updateResult && (
						<div className="p-3 bg-muted rounded-lg">
							<p className="text-sm">
								<span className="font-medium">Result:</span> {updateResult.message}
							</p>
							{updateResult.errors && updateResult.errors.length > 0 && (
								<details className="mt-2">
									<summary className="text-xs text-muted-foreground cursor-pointer">
										View errors ({updateResult.errors.length})
									</summary>
									<div className="mt-1 space-y-1">
										{updateResult.errors.map((error: any, index: number) => (
											<p key={index} className="text-xs text-destructive">
												Memory {error.memoryId}: {error.error}
											</p>
										))}
									</div>
								</details>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
