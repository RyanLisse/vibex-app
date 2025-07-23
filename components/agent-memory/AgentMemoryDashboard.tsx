/**
 * Agent Memory Dashboard Component
 *
 * Provides a comprehensive interface for viewing and managing agent memories
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	Archive,
	BarChart3,
	Brain,
	CheckCircle,
	Clock,
	Eye,
	Filter,
	Lightbulb,
	Plus,
	Search,
	Share2,
	Star,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	useArchiveMemories,
	useMemoryInsights,
	useMemoryStats,
	useSearchMemories,
	useShareKnowledge,
	useStoreMemory,
} from "@/hooks/use-agent-memory";

interface AgentMemoryDashboardProps {
	agentType: string;
	className?: string;
}

export function AgentMemoryDashboard({ agentType, className }: AgentMemoryDashboardProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTab, setSelectedTab] = useState("overview");
	const [showAddMemory, setShowAddMemory] = useState(false);
	const [newMemory, setNewMemory] = useState({
		contextKey: "",
		content: "",
		importance: 5,
		metadata: {},
	});

	// Hooks
	const { data: insights, isLoading: insightsLoading } = useMemoryInsights(agentType);
	const { data: searchResults, isLoading: searchLoading } = useSearchMemories(
		searchQuery,
		{ agentType, maxResults: 20 },
		{ enabled: searchQuery.length > 2 }
	);
	const memoryStats = useMemoryStats(agentType);
	const storeMemoryMutation = useStoreMemory();
	const archiveMemoriesMutation = useArchiveMemories();
	const shareKnowledgeMutation = useShareKnowledge();

	const handleStoreMemory = async () => {
		try {
			await storeMemoryMutation.mutateAsync({
				agentType,
				...newMemory,
			});
			setShowAddMemory(false);
			setNewMemory({
				contextKey: "",
				content: "",
				importance: 5,
				metadata: {},
			});
		} catch (error) {
			console.error("Failed to store memory:", error);
		}
	};

	const handleArchiveMemories = async () => {
		try {
			await archiveMemoriesMutation.mutateAsync({
				olderThanDays: 90,
				maxImportance: 3,
				maxAccessCount: 2,
			});
		} catch (error) {
			console.error("Failed to archive memories:", error);
		}
	};

	const getImportanceColor = (importance: number) => {
		if (importance >= 8) return "bg-red-500";
		if (importance >= 6) return "bg-orange-500";
		if (importance >= 4) return "bg-yellow-500";
		return "bg-green-500";
	};

	const getImportanceLabel = (importance: number) => {
		if (importance >= 8) return "Critical";
		if (importance >= 6) return "High";
		if (importance >= 4) return "Medium";
		return "Low";
	};

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center space-x-2">
					<Brain className="h-6 w-6 text-blue-600" />
					<h2 className="text-2xl font-bold">Agent Memory</h2>
					<Badge variant="outline">{agentType}</Badge>
				</div>
				<div className="flex items-center space-x-2">
					<Dialog open={showAddMemory} onOpenChange={setShowAddMemory}>
						<DialogTrigger asChild={true}>
							<Button>
								<Plus className="h-4 w-4 mr-2" />
								Add Memory
							</Button>
						</DialogTrigger>
						<DialogContent className="max-w-2xl">
							<DialogHeader>
								<DialogTitle>Add New Memory</DialogTitle>
								<DialogDescription>
									Store a new memory entry for the agent to reference later.
								</DialogDescription>
							</DialogHeader>
							<div className="space-y-4">
								<div>
									<Label htmlFor="contextKey">Context Key</Label>
									<Input
										id="contextKey"
										value={newMemory.contextKey}
										onChange={(e) => setNewMemory({ ...newMemory, contextKey: e.target.value })}
										placeholder="e.g., code-review, debugging, best-practices"
									/>
								</div>
								<div>
									<Label htmlFor="content">Content</Label>
									<Textarea
										id="content"
										value={newMemory.content}
										onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
										placeholder="Enter the memory content..."
										rows={4}
									/>
								</div>
								<div>
									<Label htmlFor="importance">Importance (1-10)</Label>
									<Select
										value={newMemory.importance.toString()}
										onValueChange={(value) =>
											setNewMemory({ ...newMemory, importance: Number.parseInt(value) })
										}
									>
										<SelectTrigger>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
												<SelectItem key={num} value={num.toString()}>
													{num} - {getImportanceLabel(num)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="flex justify-end space-x-2">
									<Button variant="outline" onClick={() => setShowAddMemory(false)}>
										Cancel
									</Button>
									<Button
										onClick={handleStoreMemory}
										disabled={
											!newMemory.contextKey || !newMemory.content || storeMemoryMutation.isPending
										}
									>
										{storeMemoryMutation.isPending ? "Storing..." : "Store Memory"}
									</Button>
								</div>
							</div>
						</DialogContent>
					</Dialog>
					<Button
						variant="outline"
						onClick={handleArchiveMemories}
						disabled={archiveMemoriesMutation.isPending}
					>
						<Archive className="h-4 w-4 mr-2" />
						{archiveMemoriesMutation.isPending ? "Archiving..." : "Archive Old"}
					</Button>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
				<Input
					placeholder="Search memories..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			{/* Tabs */}
			<Tabs value={selectedTab} onValueChange={setSelectedTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="overview">Overview</TabsTrigger>
					<TabsTrigger value="search">Search</TabsTrigger>
					<TabsTrigger value="insights">Insights</TabsTrigger>
					<TabsTrigger value="management">Management</TabsTrigger>
				</TabsList>

				{/* Overview Tab */}
				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Total Memories</CardTitle>
								<Brain className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{memoryStats.totalMemories}</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Top Contexts</CardTitle>
								<BarChart3 className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{memoryStats.topContexts.length}</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
								<CardTitle className="text-sm font-medium">Recommendations</CardTitle>
								<Lightbulb className="h-4 w-4 text-muted-foreground" />
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{memoryStats.recommendations.length}</div>
							</CardContent>
						</Card>
					</div>

					{/* Top Contexts */}
					<Card>
						<CardHeader>
							<CardTitle>Most Frequent Contexts</CardTitle>
							<CardDescription>Contexts that appear most often in agent memories</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{memoryStats.topContexts.map((context, index) => (
									<div key={context.key} className="flex items-center justify-between">
										<div className="flex items-center space-x-2">
											<Badge variant="outline">{context.key}</Badge>
											<span className="text-sm text-gray-600">{context.count} memories</span>
										</div>
										<Progress
											value={(context.count / memoryStats.totalMemories) * 100}
											className="w-24"
										/>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					{/* Importance Distribution */}
					<Card>
						<CardHeader>
							<CardTitle>Importance Distribution</CardTitle>
							<CardDescription>Distribution of memory importance levels</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{Object.entries(memoryStats.importanceDistribution)
									.sort(([a], [b]) => Number.parseInt(b) - Number.parseInt(a))
									.map(([importance, count]) => (
										<div key={importance} className="flex items-center justify-between">
											<div className="flex items-center space-x-2">
												<div
													className={`w-3 h-3 rounded-full ${getImportanceColor(Number.parseInt(importance))}`}
												/>
												<span className="text-sm">
													Level {importance} ({getImportanceLabel(Number.parseInt(importance))})
												</span>
											</div>
											<div className="flex items-center space-x-2">
												<span className="text-sm text-gray-600">{count}</span>
												<Progress
													value={(count / memoryStats.totalMemories) * 100}
													className="w-20"
												/>
											</div>
										</div>
									))}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Search Tab */}
				<TabsContent value="search" className="space-y-4">
					{searchQuery.length > 2 && (
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Search className="h-5 w-5" />
									<span>Search Results</span>
									{searchLoading && (
										<div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
									)}
								</CardTitle>
								<CardDescription>
									Found {searchResults?.length || 0} memories matching "{searchQuery}"
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ScrollArea className="h-96">
									<div className="space-y-4">
										{searchResults?.map((result) => (
											<div key={result.document.id} className="border rounded-lg p-4">
												<div className="flex items-start justify-between mb-2">
													<div className="flex items-center space-x-2">
														<Badge variant="outline">{result.metadata?.contextKey}</Badge>
														<div
															className={`w-2 h-2 rounded-full ${getImportanceColor(result.metadata?.importance || 1)}`}
														/>
														<span className="text-sm text-gray-600">
															{(result.similarity * 100).toFixed(1)}% match
														</span>
													</div>
													<div className="flex items-center space-x-1 text-xs text-gray-500">
														<Eye className="h-3 w-3" />
														<span>{result.metadata?.accessCount || 0}</span>
													</div>
												</div>
												<p className="text-sm mb-2">{result.document.content}</p>
												<div className="flex items-center justify-between text-xs text-gray-500">
													<span>
														Created{" "}
														{formatDistanceToNow(
															new Date(result.metadata?.createdAt || Date.now())
														)}{" "}
														ago
													</span>
													<span>
														Last accessed{" "}
														{formatDistanceToNow(
															new Date(result.metadata?.lastAccessedAt || Date.now())
														)}{" "}
														ago
													</span>
												</div>
											</div>
										))}
									</div>
								</ScrollArea>
							</CardContent>
						</Card>
					)}
				</TabsContent>

				{/* Insights Tab */}
				<TabsContent value="insights" className="space-y-4">
					{insightsLoading ? (
						<div className="flex items-center justify-center h-32">
							<div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
						</div>
					) : (
						<>
							{/* Patterns */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center space-x-2">
										<TrendingUp className="h-5 w-5" />
										<span>Patterns</span>
									</CardTitle>
									<CardDescription>Identified patterns in agent memory usage</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{memoryStats.patterns.map((pattern, index) => (
											<div key={index} className="flex items-start space-x-2">
												<CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
												<span className="text-sm">{pattern}</span>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Recommendations */}
							<Card>
								<CardHeader>
									<CardTitle className="flex items-center space-x-2">
										<Lightbulb className="h-5 w-5" />
										<span>Recommendations</span>
									</CardTitle>
									<CardDescription>Suggestions for optimizing agent memory</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="space-y-2">
										{memoryStats.recommendations.map((recommendation, index) => (
											<Alert key={index}>
												<AlertCircle className="h-4 w-4" />
												<AlertDescription>{recommendation}</AlertDescription>
											</Alert>
										))}
									</div>
								</CardContent>
							</Card>

							{/* Memory Growth */}
							{insights?.memoryGrowthTrend && insights.memoryGrowthTrend.length > 0 && (
								<Card>
									<CardHeader>
										<CardTitle className="flex items-center space-x-2">
											<BarChart3 className="h-5 w-5" />
											<span>Memory Growth Trend</span>
										</CardTitle>
										<CardDescription>Memory creation over the last 30 days</CardDescription>
									</CardHeader>
									<CardContent>
										<div className="space-y-2">
											{insights.memoryGrowthTrend.slice(-7).map((day) => (
												<div key={day.date} className="flex items-center justify-between">
													<span className="text-sm">{day.date}</span>
													<div className="flex items-center space-x-2">
														<span className="text-sm text-gray-600">{day.count} memories</span>
														<Progress value={(day.count / 10) * 100} className="w-16" />
													</div>
												</div>
											))}
										</div>
									</CardContent>
								</Card>
							)}
						</>
					)}
				</TabsContent>

				{/* Management Tab */}
				<TabsContent value="management" className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{/* Archive Memories */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Archive className="h-5 w-5" />
									<span>Archive Memories</span>
								</CardTitle>
								<CardDescription>
									Archive old or low-importance memories to improve performance
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="text-sm text-gray-600">
									This will archive memories that are:
									<ul className="list-disc list-inside mt-2 space-y-1">
										<li>Older than 90 days</li>
										<li>Importance level 3 or lower</li>
										<li>Accessed 2 times or fewer</li>
									</ul>
								</div>
								<Button
									onClick={handleArchiveMemories}
									disabled={archiveMemoriesMutation.isPending}
									className="w-full"
								>
									{archiveMemoriesMutation.isPending ? "Archiving..." : "Archive Memories"}
								</Button>
							</CardContent>
						</Card>

						{/* Share Knowledge */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Share2 className="h-5 w-5" />
									<span>Share Knowledge</span>
								</CardTitle>
								<CardDescription>Share memories with other agent types</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="text-sm text-gray-600">
									Share high-importance memories with other agents to enable knowledge transfer.
								</div>
								<Button disabled={shareKnowledgeMutation.isPending} className="w-full">
									{shareKnowledgeMutation.isPending ? "Sharing..." : "Configure Sharing"}
								</Button>
							</CardContent>
						</Card>
					</div>

					{/* Status Messages */}
					{archiveMemoriesMutation.isSuccess && (
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>
								Successfully archived {archiveMemoriesMutation.data?.archived || 0} memories
								{archiveMemoriesMutation.data?.errors
									? ` with ${archiveMemoriesMutation.data.errors} errors`
									: ""}
							</AlertDescription>
						</Alert>
					)}

					{shareKnowledgeMutation.isSuccess && (
						<Alert>
							<CheckCircle className="h-4 w-4" />
							<AlertDescription>
								Successfully shared {shareKnowledgeMutation.data?.shared || 0} memories
								{shareKnowledgeMutation.data?.errors
									? ` with ${shareKnowledgeMutation.data.errors} errors`
									: ""}
							</AlertDescription>
						</Alert>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
