"use client";

import { Brain, Loader2, Search, X, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	useMemoryVectorSearch,
	useTaskVectorSearch,
	type VectorSearchResult,
} from "@/hooks/use-vector-search";
import { cn } from "@/lib/utils";

interface VectorSearchInputProps {
	placeholder?: string;
	searchType?: "tasks" | "memory" | "both";
	onResultSelect?: (result: VectorSearchResult, type: "tasks" | "memory") => void;
	className?: string;
	threshold?: number;
	limit?: number;
	userId?: string;
	agentType?: string;
}

export function VectorSearchInput({
	placeholder = "Search with AI...",
	searchType = "both",
	onResultSelect,
	className,
	threshold = 0.7,
	limit = 5,
	userId,
	agentType,
}: VectorSearchInputProps) {
	const [query, setQuery] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	// Debounce the search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(query);
		}, 300);

		return () => clearTimeout(timer);
	}, [query]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const taskSearch = useTaskVectorSearch(
		searchType === "tasks" || searchType === "both" ? debouncedQuery : "",
		{ threshold, limit, userId }
	);

	const memorySearch = useMemoryVectorSearch(
		searchType === "memory" || searchType === "both" ? debouncedQuery : "",
		{ threshold, limit, agentType }
	);

	const isLoading = taskSearch.isLoading || memorySearch.isLoading;
	const hasResults =
		(taskSearch.data?.results.length || 0) > 0 || (memorySearch.data?.results.length || 0) > 0;

	const handleInputChange = (value: string) => {
		setQuery(value);
		setIsOpen(value.trim().length > 0);
	};

	const handleResultClick = (result: VectorSearchResult, type: "tasks" | "memory") => {
		onResultSelect?.(result, type);
		setQuery("");
		setIsOpen(false);
		inputRef.current?.blur();
	};

	const handleClear = () => {
		setQuery("");
		setDebouncedQuery("");
		setIsOpen(false);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape") {
			setIsOpen(false);
			inputRef.current?.blur();
		}
	};

	return (
		<div ref={containerRef} className={cn("relative", className)}>
			<div className="relative">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					ref={inputRef}
					value={query}
					onChange={(e) => handleInputChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => query.trim().length > 0 && setIsOpen(true)}
					placeholder={placeholder}
					className="pl-10 pr-10"
				/>
				{query && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClear}
						className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
					>
						<X className="h-3 w-3" />
					</Button>
				)}
			</div>

			{isOpen && (
				<Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-hidden shadow-lg">
					<CardContent className="p-0">
						{isLoading && (
							<div className="flex items-center justify-center py-4">
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								<span className="text-sm text-muted-foreground">Searching...</span>
							</div>
						)}

						{!isLoading && !hasResults && debouncedQuery && (
							<div className="flex items-center justify-center py-4">
								<div className="text-center">
									<Search className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
									<p className="text-sm text-muted-foreground">No results found</p>
								</div>
							</div>
						)}

						{!isLoading && hasResults && (
							<div className="max-h-96 overflow-y-auto">
								{/* Task Results */}
								{taskSearch.data?.results && taskSearch.data.results.length > 0 && (
									<div className="border-b border-border">
										<div className="px-3 py-2 bg-muted/50">
											<div className="flex items-center gap-2">
												<Zap className="h-3 w-3" />
												<span className="text-xs font-medium">Tasks</span>
												<Badge variant="secondary" className="text-xs">
													{taskSearch.data.results.length}
												</Badge>
												{taskSearch.data.method === "wasm" && (
													<Badge variant="default" className="text-xs">
														WASM
													</Badge>
												)}
											</div>
										</div>
										<div className="divide-y divide-border">
											{taskSearch.data.results.map((result) => (
												<div
													key={result.id}
													className="px-3 py-2 hover:bg-accent cursor-pointer"
													onClick={() => handleResultClick(result, "tasks")}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1 min-w-0">
															<p className="text-sm font-medium truncate">{result.title}</p>
															{result.description && (
																<p className="text-xs text-muted-foreground line-clamp-1 mt-1">
																	{result.description}
																</p>
															)}
															<div className="flex items-center gap-1 mt-1">
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
														</div>
														<Badge
															variant="secondary"
															className={cn(
																"text-xs ml-2",
																result.similarity > 0.9 && "bg-green-100 text-green-800",
																result.similarity > 0.8 &&
																	result.similarity <= 0.9 &&
																	"bg-blue-100 text-blue-800"
															)}
														>
															{(result.similarity * 100).toFixed(0)}%
														</Badge>
													</div>
												</div>
											))}
										</div>
									</div>
								)}

								{/* Memory Results */}
								{memorySearch.data?.results && memorySearch.data.results.length > 0 && (
									<div>
										<div className="px-3 py-2 bg-muted/50">
											<div className="flex items-center gap-2">
												<Brain className="h-3 w-3" />
												<span className="text-xs font-medium">Agent Memory</span>
												<Badge variant="secondary" className="text-xs">
													{memorySearch.data.results.length}
												</Badge>
												{memorySearch.data.method === "wasm" && (
													<Badge variant="default" className="text-xs">
														WASM
													</Badge>
												)}
											</div>
										</div>
										<div className="divide-y divide-border">
											{memorySearch.data.results.map((result) => (
												<div
													key={result.id}
													className="px-3 py-2 hover:bg-accent cursor-pointer"
													onClick={() => handleResultClick(result, "memory")}
												>
													<div className="flex items-start justify-between">
														<div className="flex-1 min-w-0">
															<div className="flex items-center gap-2 mb-1">
																<p className="text-sm font-medium truncate">{result.contextKey}</p>
																{result.agentType && (
																	<Badge variant="outline" className="text-xs">
																		{result.agentType}
																	</Badge>
																)}
															</div>
															<p className="text-xs text-muted-foreground line-clamp-1">
																{result.content}
															</p>
															{result.importance && (
																<div className="flex items-center gap-1 mt-1">
																	<span className="text-xs text-muted-foreground">
																		Importance: {result.importance}/10
																	</span>
																</div>
															)}
														</div>
														<Badge
															variant="secondary"
															className={cn(
																"text-xs ml-2",
																result.similarity > 0.9 && "bg-green-100 text-green-800",
																result.similarity > 0.8 &&
																	result.similarity <= 0.9 &&
																	"bg-blue-100 text-blue-800"
															)}
														>
															{(result.similarity * 100).toFixed(0)}%
														</Badge>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
