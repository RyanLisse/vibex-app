/**
 * Memory Context Viewer Component
 *
 * Displays relevant context for agents starting new tasks
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	Brain,
	Check,
	ChevronDown,
	ChevronRight,
	Clock,
	Copy,
	Eye,
	FileText,
	Lightbulb,
	RefreshCw,
	Star,
	TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useRelevantContext } from "@/hooks/use-agent-memory";
import { cn } from "@/lib/utils";

interface MemoryContextViewerProps {
	agentType: string;
	taskDescription: string;
	maxMemories?: number;
	includePatterns?: boolean;
	includeSummary?: boolean;
	className?: string;
	onContextReady?: (context: any) => void;
}

export function MemoryContextViewer({
	agentType,
	taskDescription,
	maxMemories = 15,
	includePatterns = true,
	includeSummary = true,
	className,
	onContextReady,
}: MemoryContextViewerProps) {
	const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set());
	const [copiedSummary, setCopiedSummary] = useState(false);

	const {
		data: context,
		isLoading,
		error,
		refetch,
	} = useRelevantContext(
		agentType,
		taskDescription,
		{ maxMemories, includePatterns, includeSummary },
		{
			onSuccess: (data) => {
				onContextReady?.(data);
			},
		}
	);

	const toggleMemoryExpansion = (memoryId: string) => {
		const newExpanded = new Set(expandedMemories);
		if (newExpanded.has(memoryId)) {
			newExpanded.delete(memoryId);
		} else {
			newExpanded.add(memoryId);
		}
		setExpandedMemories(newExpanded);
	};

	const getImportanceColor = (importance: number) => {
		if (importance >= 8) return "text-red-600 bg-red-50";
		if (importance >= 6) return "text-orange-600 bg-orange-50";
		if (importance >= 4) return "text-yellow-600 bg-yellow-50";
		return "text-green-600 bg-green-50";
	};

	const getImportanceLabel = (importance: number) => {
		if (importance >= 8) return "Critical";
		if (importance >= 6) return "High";
		if (importance >= 4) return "Medium";
		return "Low";
	};

	const copySummaryToClipboard = async () => {
		if (context?.contextSummary) {
			await navigator.clipboard.writeText(context.contextSummary);
			setCopiedSummary(true);
			setTimeout(() => setCopiedSummary(false), 2000);
		}
	};

	if (isLoading) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Brain className="h-5 w-5" />
						<span>Loading Context...</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-center h-32">
						<div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (error) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Brain className="h-5 w-5" />
						<span>Context Error</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Alert variant="destructive">
						<AlertDescription>Failed to load context: {error.message}</AlertDescription>
					</Alert>
					<Button onClick={() => refetch()} className="mt-4">
						<RefreshCw className="h-4 w-4 mr-2" />
						Retry
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (!context) {
		return null;
	}

	return (
		<div className={cn("space-y-4", className)}>
			{/* Context Summary */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<Brain className="h-5 w-5 text-blue-600" />
							<span>Agent Context</span>
							<Badge variant="outline">{agentType}</Badge>
						</div>
						<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
							<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
						</Button>
					</CardTitle>
					<CardDescription>Relevant memories and context for the current task</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Stats */}
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{context.relevantMemories.length}
							</div>
							<div className="text-sm text-gray-600">Relevant</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">{context.totalMemories}</div>
							<div className="text-sm text-gray-600">Total</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{context.averageImportance.toFixed(1)}
							</div>
							<div className="text-sm text-gray-600">Avg Importance</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{context.oldestMemory
									? formatDistanceToNow(context.oldestMemory, { addSuffix: true })
									: "N/A"}
							</div>
							<div className="text-sm text-gray-600">Oldest</div>
						</div>
					</div>

					{/* Context Summary */}
					{context.contextSummary && (
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label className="text-sm font-medium">Context Summary</Label>
								<Button
									variant="ghost"
									size="sm"
									onClick={copySummaryToClipboard}
									className="h-8 px-2"
								>
									{copiedSummary ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
								</Button>
							</div>
							<div className="bg-gray-50 rounded-lg p-3">
								<pre className="text-sm whitespace-pre-wrap font-sans">
									{context.contextSummary}
								</pre>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Relevant Memories */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<FileText className="h-5 w-5" />
						<span>Relevant Memories</span>
						<Badge variant="secondary">{context.relevantMemories.length}</Badge>
					</CardTitle>
					<CardDescription>Memories that are most relevant to the current task</CardDescription>
				</CardHeader>
				<CardContent>
					<ScrollArea className="h-96">
						<div className="space-y-3">
							{context.relevantMemories.map((memory) => (
								<Collapsible
									key={memory.id}
									open={expandedMemories.has(memory.id)}
									onOpenChange={() => toggleMemoryExpansion(memory.id)}
								>
									<div className="border rounded-lg p-3">
										<CollapsibleTrigger className="w-full">
											<div className="flex items-start justify-between">
												<div className="flex items-start space-x-3">
													{expandedMemories.has(memory.id) ? (
														<ChevronDown className="h-4 w-4 mt-1 text-gray-400" />
													) : (
														<ChevronRight className="h-4 w-4 mt-1 text-gray-400" />
													)}
													<div className="text-left">
														<div className="flex items-center space-x-2 mb-1">
															<Badge variant="outline" className="text-xs">
																{memory.contextKey}
															</Badge>
															<Badge
																variant="secondary"
																className={cn("text-xs", getImportanceColor(memory.importance))}
															>
																{getImportanceLabel(memory.importance)}
															</Badge>
														</div>
														<p className="text-sm text-left line-clamp-2">{memory.content}</p>
													</div>
												</div>
												<div className="flex items-center space-x-2 text-xs text-gray-500">
													<div className="flex items-center space-x-1">
														<Star className="h-3 w-3" />
														<span>{memory.importance}</span>
													</div>
													<div className="flex items-center space-x-1">
														<Eye className="h-3 w-3" />
														<span>{memory.accessCount}</span>
													</div>
												</div>
											</div>
										</CollapsibleTrigger>
										<CollapsibleContent>
											<Separator className="my-3" />
											<div className="space-y-3">
												<div>
													<Label className="text-xs text-gray-600">Full Content</Label>
													<div className="bg-gray-50 rounded p-2 mt-1">
														<p className="text-sm whitespace-pre-wrap">{memory.content}</p>
													</div>
												</div>

												{memory.metadata && Object.keys(memory.metadata).length > 0 && (
													<div>
														<Label className="text-xs text-gray-600">Metadata</Label>
														<div className="bg-gray-50 rounded p-2 mt-1">
															<pre className="text-xs">
																{JSON.stringify(memory.metadata, null, 2)}
															</pre>
														</div>
													</div>
												)}

												<div className="flex items-center justify-between text-xs text-gray-500">
													<div className="flex items-center space-x-4">
														<div className="flex items-center space-x-1">
															<Clock className="h-3 w-3" />
															<span>Created {formatDistanceToNow(memory.createdAt)} ago</span>
														</div>
														<div className="flex items-center space-x-1">
															<TrendingUp className="h-3 w-3" />
															<span>
																Last accessed {formatDistanceToNow(memory.lastAccessedAt)} ago
															</span>
														</div>
													</div>
													{memory.expiresAt && (
														<div className="flex items-center space-x-1 text-orange-600">
															<Clock className="h-3 w-3" />
															<span>Expires {formatDistanceToNow(memory.expiresAt)} from now</span>
														</div>
													)}
												</div>
											</div>
										</CollapsibleContent>
									</div>
								</Collapsible>
							))}

							{context.relevantMemories.length === 0 && (
								<div className="text-center py-8 text-gray-500">
									<Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
									<p>No relevant memories found for this task.</p>
									<p className="text-sm">The agent will start with a fresh context.</p>
								</div>
							)}
						</div>
					</ScrollArea>
				</CardContent>
			</Card>

			{/* Task Description */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Lightbulb className="h-5 w-5" />
						<span>Task Description</span>
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="bg-blue-50 rounded-lg p-3">
						<p className="text-sm">{taskDescription}</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
