/**
 * Memory Search Interface Component
 *
 * Provides semantic search capabilities for agent memories
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	ChevronDown,
	ChevronRight,
	Clock,
	Eye,
	Filter,
	Search,
	Star,
	TrendingUp,
	X,
	Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { useSearchMemories } from "@/hooks/use-agent-memory";
import { cn } from "@/lib/utils";

interface MemorySearchInterfaceProps {
	agentType?: string;
	className?: string;
	onResultSelect?: (result: any) => void;
}

export function MemorySearchInterface({
	agentType,
	className,
	onResultSelect,
}: MemorySearchInterfaceProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [showFilters, setShowFilters] = useState(false);
	const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

	// Search filters
	const [filters, setFilters] = useState({
		agentType: agentType || "",
		contextKeys: [] as string[],
		minImportance: 1,
		maxAge: 365, // days
		includeExpired: false,
		semanticThreshold: 0.7,
		maxResults: 20,
	});

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	const {
		data: searchResults,
		isLoading,
		error,
	} = useSearchMemories(
		debouncedQuery,
		{
			...filters,
			agentType: filters.agentType || undefined,
			contextKeys: filters.contextKeys.length > 0 ? filters.contextKeys : undefined,
		},
		{ enabled: debouncedQuery.length > 2 }
	);

	const toggleResultExpansion = (resultId: string) => {
		const newExpanded = new Set(expandedResults);
		if (newExpanded.has(resultId)) {
			newExpanded.delete(resultId);
		} else {
			newExpanded.add(resultId);
		}
		setExpandedResults(newExpanded);
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

	const getSimilarityColor = (similarity: number) => {
		if (similarity >= 0.9) return "text-green-600 bg-green-50";
		if (similarity >= 0.8) return "text-blue-600 bg-blue-50";
		if (similarity >= 0.7) return "text-yellow-600 bg-yellow-50";
		return "text-gray-600 bg-gray-50";
	};

	const clearFilters = () => {
		setFilters({
			agentType: agentType || "",
			contextKeys: [],
			minImportance: 1,
			maxAge: 365,
			includeExpired: false,
			semanticThreshold: 0.7,
			maxResults: 20,
		});
	};

	const addContextKeyFilter = (contextKey: string) => {
		if (!filters.contextKeys.includes(contextKey)) {
			setFilters({
				...filters,
				contextKeys: [...filters.contextKeys, contextKey],
			});
		}
	};

	const removeContextKeyFilter = (contextKey: string) => {
		setFilters({
			...filters,
			contextKeys: filters.contextKeys.filter((key) => key !== contextKey),
		});
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Search Input */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Search className="h-5 w-5" />
						<span>Memory Search</span>
					</CardTitle>
					<CardDescription>Search agent memories using semantic similarity</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
						<Input
							placeholder="Search memories..."
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							className="pl-10"
						/>
						{isLoading && (
							<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
								<div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
							</div>
						)}
					</div>

					{/* Filter Toggle */}
					<div className="flex items-center justify-between">
						<Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
							<Filter className="h-4 w-4 mr-2" />
							Filters
							{showFilters ? (
								<ChevronDown className="h-4 w-4 ml-2" />
							) : (
								<ChevronRight className="h-4 w-4 ml-2" />
							)}
						</Button>
						{(filters.contextKeys.length > 0 ||
							filters.minImportance > 1 ||
							filters.maxAge < 365 ||
							filters.semanticThreshold !== 0.7) && (
							<Button variant="ghost" size="sm" onClick={clearFilters}>
								<X className="h-4 w-4 mr-2" />
								Clear Filters
							</Button>
						)}
					</div>

					{/* Filters */}
					<Collapsible open={showFilters} onOpenChange={setShowFilters}>
						<CollapsibleContent>
							<div className="space-y-4 pt-4 border-t">
								{/* Agent Type */}
								<div className="space-y-2">
									<Label>Agent Type</Label>
									<Select
										value={filters.agentType}
										onValueChange={(value) => setFilters({ ...filters, agentType: value })}
									>
										<SelectTrigger>
											<SelectValue placeholder="All agent types" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">All agent types</SelectItem>
											<SelectItem value="code-assistant">Code Assistant</SelectItem>
											<SelectItem value="reviewer">Code Reviewer</SelectItem>
											<SelectItem value="debugger">Debugger</SelectItem>
											<SelectItem value="architect">Architect</SelectItem>
											<SelectItem value="tester">Tester</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* Context Keys */}
								<div className="space-y-2">
									<Label>Context Keys</Label>
									<div className="flex flex-wrap gap-2">
										{filters.contextKeys.map((key) => (
											<Badge
												key={key}
												variant="secondary"
												className="cursor-pointer"
												onClick={() => removeContextKeyFilter(key)}
											>
												{key}
												<X className="h-3 w-3 ml-1" />
											</Badge>
										))}
									</div>
								</div>

								{/* Minimum Importance */}
								<div className="space-y-2">
									<Label>Minimum Importance: {filters.minImportance}</Label>
									<Slider
										value={[filters.minImportance]}
										onValueChange={([value]) => setFilters({ ...filters, minImportance: value })}
										min={1}
										max={10}
										step={1}
										className="w-full"
									/>
								</div>

								{/* Max Age */}
								<div className="space-y-2">
									<Label>Max Age: {filters.maxAge} days</Label>
									<Slider
										value={[filters.maxAge]}
										onValueChange={([value]) => setFilters({ ...filters, maxAge: value })}
										min={1}
										max={365}
										step={1}
										className="w-full"
									/>
								</div>

								{/* Semantic Threshold */}
								<div className="space-y-2">
									<Label>
										Similarity Threshold: {(filters.semanticThreshold * 100).toFixed(0)}%
									</Label>
									<Slider
										value={[filters.semanticThreshold]}
										onValueChange={([value]) =>
											setFilters({ ...filters, semanticThreshold: value })
										}
										min={0.5}
										max={1.0}
										step={0.05}
										className="w-full"
									/>
								</div>

								{/* Max Results */}
								<div className="space-y-2">
									<Label>Max Results: {filters.maxResults}</Label>
									<Slider
										value={[filters.maxResults]}
										onValueChange={([value]) => setFilters({ ...filters, maxResults: value })}
										min={5}
										max={50}
										step={5}
										className="w-full"
									/>
								</div>
							</div>
						</CollapsibleContent>
					</Collapsible>
				</CardContent>
			</Card>

			{/* Search Results */}
			{debouncedQuery.length > 2 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center justify-between">
							<div className="flex items-center space-x-2">
								<Zap className="h-5 w-5" />
								<span>Search Results</span>
								<Badge variant="secondary">{searchResults?.length || 0} found</Badge>
							</div>
							{error && <Badge variant="destructive">Error</Badge>}
						</CardTitle>
						<CardDescription>
							Results for "{debouncedQuery}"{filters.agentType && ` in ${filters.agentType}`}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{error ? (
							<div className="text-center py-8 text-red-600">
								<p>Error searching memories: {error.message}</p>
							</div>
						) : searchResults && searchResults.length > 0 ? (
							<ScrollArea className="h-96">
								<div className="space-y-3">
									{searchResults.map((result) => (
										<Collapsible
											key={result.document.id}
											open={expandedResults.has(result.document.id)}
											onOpenChange={() => toggleResultExpansion(result.document.id)}
										>
											<div className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
												<CollapsibleTrigger className="w-full">
													<div className="flex items-start justify-between">
														<div className="flex items-start space-x-3">
															{expandedResults.has(result.document.id) ? (
																<ChevronDown className="h-4 w-4 mt-1 text-gray-400" />
															) : (
																<ChevronRight className="h-4 w-4 mt-1 text-gray-400" />
															)}
															<div className="text-left flex-1">
																<div className="flex items-center space-x-2 mb-2">
																	<Badge variant="outline" className="text-xs">
																		{result.metadata?.contextKey}
																	</Badge>
																	<Badge
																		variant="secondary"
																		className={cn(
																			"text-xs",
																			getImportanceColor(result.metadata?.importance || 1)
																		)}
																	>
																		{getImportanceLabel(result.metadata?.importance || 1)}
																	</Badge>
																	<Badge
																		variant="secondary"
																		className={cn("text-xs", getSimilarityColor(result.similarity))}
																	>
																		{(result.similarity * 100).toFixed(1)}% match
																	</Badge>
																	{result.metadata?.agentType && (
																		<Badge variant="outline" className="text-xs">
																			{result.metadata.agentType}
																		</Badge>
																	)}
																</div>
																<p className="text-sm text-left line-clamp-2">
																	{result.document.content}
																</p>
															</div>
														</div>
														<div className="flex items-center space-x-2 text-xs text-gray-500">
															<div className="flex items-center space-x-1">
																<Star className="h-3 w-3" />
																<span>{result.metadata?.importance || 1}</span>
															</div>
															<div className="flex items-center space-x-1">
																<Eye className="h-3 w-3" />
																<span>{result.metadata?.accessCount || 0}</span>
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
																<p className="text-sm whitespace-pre-wrap">
																	{result.document.content}
																</p>
															</div>
														</div>

														<div className="grid grid-cols-2 gap-4 text-xs">
															<div>
																<Label className="text-gray-600">Similarity Score</Label>
																<div className="font-mono">
																	{(result.similarity * 100).toFixed(2)}%
																</div>
															</div>
															<div>
																<Label className="text-gray-600">Distance</Label>
																<div className="font-mono">
																	{result.distance?.toFixed(4) || "N/A"}
																</div>
															</div>
														</div>

														{result.metadata && Object.keys(result.metadata).length > 0 && (
															<div>
																<Label className="text-xs text-gray-600">Metadata</Label>
																<div className="bg-gray-50 rounded p-2 mt-1">
																	<pre className="text-xs">
																		{JSON.stringify(result.metadata, null, 2)}
																	</pre>
																</div>
															</div>
														)}

														<div className="flex items-center justify-between text-xs text-gray-500">
															<div className="flex items-center space-x-4">
																<div className="flex items-center space-x-1">
																	<Clock className="h-3 w-3" />
																	<span>
																		Created{" "}
																		{formatDistanceToNow(
																			new Date(result.metadata?.createdAt || Date.now())
																		)}{" "}
																		ago
																	</span>
																</div>
																<div className="flex items-center space-x-1">
																	<TrendingUp className="h-3 w-3" />
																	<span>
																		Last accessed{" "}
																		{formatDistanceToNow(
																			new Date(result.metadata?.lastAccessedAt || Date.now())
																		)}{" "}
																		ago
																	</span>
																</div>
															</div>
															{onResultSelect && (
																<Button
																	size="sm"
																	variant="outline"
																	onClick={(e) => {
																		e.stopPropagation();
																		onResultSelect(result);
																	}}
																>
																	Select
																</Button>
															)}
														</div>

														{/* Quick Actions */}
														<div className="flex items-center space-x-2">
															<Button
																size="sm"
																variant="ghost"
																onClick={(e) => {
																	e.stopPropagation();
																	addContextKeyFilter(result.metadata?.contextKey || "");
																}}
															>
																Filter by context
															</Button>
														</div>
													</div>
												</CollapsibleContent>
											</div>
										</Collapsible>
									))}
								</div>
							</ScrollArea>
						) : debouncedQuery.length > 2 && !isLoading ? (
							<div className="text-center py-8 text-gray-500">
								<Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
								<p>No memories found matching your search.</p>
								<p className="text-sm">Try adjusting your search terms or filters.</p>
							</div>
						) : null}
					</CardContent>
				</Card>
			)}

			{/* Search Tips */}
			{debouncedQuery.length <= 2 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center space-x-2">
							<Search className="h-5 w-5" />
							<span>Search Tips</span>
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2 text-sm text-gray-600">
							<p>• Enter at least 3 characters to start searching</p>
							<p>• Use natural language to describe what you're looking for</p>
							<p>• Search is semantic - it finds conceptually similar content</p>
							<p>• Use filters to narrow down results by agent type, importance, or age</p>
							<p>• Click on results to expand and see full details</p>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
