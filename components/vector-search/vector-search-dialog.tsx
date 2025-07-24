"use client";

import { Brain, Clock, Search, Star, Zap } from "lucide-react";
import { useState } from "react";
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
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVectorSearch, type VectorSearchResult } from "@/hooks/use-vector-search";
import { cn } from "@/lib/utils";

interface VectorSearchDialogProps {
	trigger?: React.ReactNode;
	defaultOpen?: boolean;
	onResultSelect?: (result: VectorSearchResult) => void;
}

export function VectorSearchDialog({
	trigger,
	defaultOpen = false,
	onResultSelect,
}: VectorSearchDialogProps) {
	const [open, setOpen] = useState(defaultOpen);
	const [threshold, setThreshold] = useState([0.7]);
	const [limit, setLimit] = useState([10]);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const {
		query,
		setQuery,
		searchType,
		setSearchType,
		options,
		setOptions,
		results,
		isLoading,
		error,
		method,
		count,
	} = useVectorSearch();

	const handleSearch = (value: string) => {
		setQuery(value);
		setOptions({
			...options,
			threshold: threshold[0],
			limit: limit[0],
		});
	};

	const handleResultClick = (result: VectorSearchResult) => {
		onResultSelect?.(result);
		setOpen(false);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild={true}>
				{trigger || (
					<Button variant="outline" size="sm">
						<Search className="h-4 w-4 mr-2" />
						Vector Search
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Brain className="h-5 w-5" />
						Semantic Vector Search
					</DialogTitle>
					<DialogDescription>
						Search tasks and agent memory using AI-powered semantic similarity
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 overflow-hidden flex flex-col space-y-4">
					{/* Search Input */}
					<div className="space-y-2">
						<Label htmlFor="search-query">Search Query</Label>
						<div className="relative">
							<Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
							<Input
								id="search-query"
								placeholder="Describe what you're looking for..."
								value={query}
								onChange={(e) => handleSearch(e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Search Type Tabs */}
					<Tabs
						value={searchType}
						onValueChange={(value) => setSearchType(value as "tasks" | "memory")}
					>
						<TabsList className="grid w-full grid-cols-2">
							<TabsTrigger value="tasks" className="flex items-center gap-2">
								<Zap className="h-4 w-4" />
								Tasks
							</TabsTrigger>
							<TabsTrigger value="memory" className="flex items-center gap-2">
								<Brain className="h-4 w-4" />
								Agent Memory
							</TabsTrigger>
						</TabsList>

						{/* Advanced Options */}
						<div className="flex items-center justify-between mt-4">
							<div className="flex items-center space-x-2">
								<Switch
									id="advanced-options"
									checked={showAdvanced}
									onCheckedChange={setShowAdvanced}
								/>
								<Label htmlFor="advanced-options">Advanced Options</Label>
							</div>

							{method && (
								<Badge variant={method === "wasm" ? "default" : "secondary"}>
									{method === "wasm" ? "WASM Optimized" : "Database"}
								</Badge>
							)}
						</div>

						{showAdvanced && (
							<Card className="mt-4">
								<CardHeader className="pb-3">
									<CardTitle className="text-sm">Search Parameters</CardTitle>
								</CardHeader>
								<CardContent className="space-y-4">
									<div className="space-y-2">
										<Label>Similarity Threshold: {threshold[0].toFixed(2)}</Label>
										<Slider
											value={threshold}
											onValueChange={setThreshold}
											max={1}
											min={0}
											step={0.05}
											className="w-full"
										/>
									</div>

									<div className="space-y-2">
										<Label>Max Results: {limit[0]}</Label>
										<Slider
											value={limit}
											onValueChange={setLimit}
											max={50}
											min={1}
											step={1}
											className="w-full"
										/>
									</div>

									{searchType === "memory" && (
										<div className="space-y-2">
											<Label htmlFor="agent-type">Agent Type (optional)</Label>
											<Input
												id="agent-type"
												placeholder="e.g., code-assistant, brainstorm"
												value={options.agentType || ""}
												onChange={(e) =>
													setOptions({ ...options, agentType: e.target.value || undefined })
												}
											/>
										</div>
									)}
								</CardContent>
							</Card>
						)}

						{/* Results */}
						<TabsContent value="tasks" className="mt-4 flex-1 overflow-hidden">
							<SearchResults
								results={results}
								isLoading={isLoading}
								error={error}
								count={count}
								type="tasks"
								onResultClick={handleResultClick}
							/>
						</TabsContent>

						<TabsContent value="memory" className="mt-4 flex-1 overflow-hidden">
							<SearchResults
								results={results}
								isLoading={isLoading}
								error={error}
								count={count}
								type="memory"
								onResultClick={handleResultClick}
							/>
						</TabsContent>
					</Tabs>
				</div>
			</DialogContent>
		</Dialog>
	);
}

interface SearchResultsProps {
	results: VectorSearchResult[];
	isLoading: boolean;
	error: Error | null;
	count: number;
	type: "tasks" | "memory";
	onResultClick: (result: VectorSearchResult) => void;
}

function SearchResults({
	results,
	isLoading,
	error,
	count,
	type,
	onResultClick,
}: SearchResultsProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="flex items-center space-x-2">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
					<span className="text-sm text-muted-foreground">Searching...</span>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-center">
					<p className="text-sm text-destructive">Search failed</p>
					<p className="text-xs text-muted-foreground mt-1">{error.message}</p>
				</div>
			</div>
		);
	}

	if (results.length === 0) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="text-center">
					<Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
					<p className="text-sm text-muted-foreground">No results found</p>
					<p className="text-xs text-muted-foreground mt-1">
						Try adjusting your search query or lowering the similarity threshold
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-2 overflow-y-auto max-h-96">
			<div className="flex items-center justify-between mb-3">
				<p className="text-sm text-muted-foreground">
					Found {count} {type === "tasks" ? "tasks" : "memories"}
				</p>
			</div>

			{results.map((result) => (
				<Card
					key={result.id}
					className="cursor-pointer hover:bg-accent/50 transition-colors"
					onClick={() => onResultClick(result)}
				>
					<CardContent className="p-4">
						<div className="flex items-start justify-between">
							<div className="flex-1 min-w-0">
								{type === "tasks" ? (
									<>
										<h4 className="font-medium text-sm truncate">{result.title}</h4>
										{result.description && (
											<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
												{result.description}
											</p>
										)}
										<div className="flex items-center gap-2 mt-2">
											{result.status && (
												<Badge variant="outline" className="text-xs">
													{result.status}
												</Badge>
											)}
											{result.priority && (
												<Badge variant="secondary" className="text-xs">
													{result.priority}
												</Badge>
											)}
										</div>
									</>
								) : (
									<>
										<div className="flex items-center gap-2 mb-1">
											<h4 className="font-medium text-sm truncate">{result.contextKey}</h4>
											{result.agentType && (
												<Badge variant="outline" className="text-xs">
													{result.agentType}
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground line-clamp-2">{result.content}</p>
										<div className="flex items-center gap-2 mt-2">
											{result.importance && (
												<div className="flex items-center gap-1">
													<Star className="h-3 w-3 text-yellow-500" />
													<span className="text-xs">{result.importance}/10</span>
												</div>
											)}
											{result.lastAccessedAt && (
												<div className="flex items-center gap-1">
													<Clock className="h-3 w-3 text-muted-foreground" />
													<span className="text-xs text-muted-foreground">
														{new Date(result.lastAccessedAt).toLocaleDateString()}
													</span>
												</div>
											)}
										</div>
									</>
								)}
							</div>

							<div className="ml-3 flex-shrink-0">
								<Badge
									variant="secondary"
									className={cn(
										"text-xs",
										result.similarity > 0.9 && "bg-green-100 text-green-800",
										result.similarity > 0.8 &&
											result.similarity <= 0.9 &&
											"bg-blue-100 text-blue-800",
										result.similarity <= 0.8 && "bg-gray-100 text-gray-800"
									)}
								>
									{(result.similarity * 100).toFixed(0)}%
								</Badge>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}
