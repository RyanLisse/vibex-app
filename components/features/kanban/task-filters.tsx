"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterState {
	assignee?: string;
	priority?: string;
	tags: string[];
	search: string;
}

interface TaskFiltersProps {
	onFilterChange: (filters: FilterState) => void;
	assignees: string[];
	tags: string[];
	className?: string;
}

export function TaskFilters({
	onFilterChange,
	assignees,
	tags,
	className = "",
}: TaskFiltersProps) {
	const [filters, setFilters] = useState<FilterState>({
		tags: [],
		search: "",
	});
	const [isOpen, setIsOpen] = useState(false);

	const updateFilters = (updates: Partial<FilterState>) => {
		const newFilters = { ...filters, ...updates };
		setFilters(newFilters);
		onFilterChange(newFilters);
	};

	const clearFilters = () => {
		const clearedFilters: FilterState = {
			tags: [],
			search: "",
		};
		setFilters(clearedFilters);
		onFilterChange(clearedFilters);
	};

	const handleTagToggle = (tag: string, checked: boolean) => {
		const newTags = checked
			? [...filters.tags, tag]
			: filters.tags.filter((t) => t !== tag);

		updateFilters({ tags: newTags });
	};

	const hasActiveFilters = !!(
		filters.assignee ||
		filters.priority ||
		filters.tags.length > 0 ||
		filters.search
	);

	const activeFilterCount = [
		filters.assignee,
		filters.priority,
		filters.tags.length > 0 ? "tags" : null,
		filters.search,
	].filter(Boolean).length;

	return (
		<div className={`flex items-center gap-4 ${className}`}>
			{/* Search Input */}
			<div className="relative max-w-md flex-1">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
				<Input
					className="pl-9"
					onChange={(e) => updateFilters({ search: e.target.value })}
					placeholder="Search tasks..."
					value={filters.search}
				/>
			</div>

			{/* Quick Assignee Filter */}
			<div className="flex items-center gap-2">
				<Label
					className="whitespace-nowrap font-medium text-sm"
					htmlFor="assignee"
				>
					Assignee:
				</Label>
				<Select
					onValueChange={(value) =>
						updateFilters({ assignee: value || undefined })
					}
					value={filters.assignee || ""}
				>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="All assignees" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">All assignees</SelectItem>
						{assignees.map((assignee) => (
							<SelectItem key={assignee} value={assignee}>
								{assignee}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Quick Priority Filter */}
			<div className="flex items-center gap-2">
				<Label
					className="whitespace-nowrap font-medium text-sm"
					htmlFor="priority"
				>
					Priority:
				</Label>
				<Select
					onValueChange={(value) =>
						updateFilters({ priority: value || undefined })
					}
					value={filters.priority || ""}
				>
					<SelectTrigger className="w-32">
						<SelectValue placeholder="All priorities" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="">All priorities</SelectItem>
						<SelectItem value="low">Low</SelectItem>
						<SelectItem value="medium">Medium</SelectItem>
						<SelectItem value="high">High</SelectItem>
						<SelectItem value="urgent">Urgent</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Advanced Filters */}
			<Popover onOpenChange={setIsOpen} open={isOpen}>
				<PopoverTrigger asChild>
					<Button className="relative gap-2" variant="outline">
						<Filter className="h-4 w-4" />
						Tags
						{activeFilterCount > 0 && (
							<Badge
								className="ml-1 h-5 w-5 rounded-full p-0 text-xs"
								variant="secondary"
							>
								{activeFilterCount}
							</Badge>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-80">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<h4 className="font-medium">Filter by Tags</h4>
							{hasActiveFilters && (
								<Button
									className="h-6 px-2 text-xs"
									onClick={clearFilters}
									size="sm"
									variant="ghost"
								>
									Clear All
								</Button>
							)}
						</div>

						{/* Tags Filter */}
						<div className="space-y-2">
							<Label className="font-medium text-sm" htmlFor="tags">Tags:
							</Label>
							<div className="max-h-40 space-y-2 overflow-y-auto">
								{tags.length === 0 ? (
									<p className="text-muted-foreground text-sm">No tags available
									</p>
								) : (
									tags.map((tag) => (
										<div className="flex items-center space-x-2" key={tag}>
											<Checkbox
												checked={filters.tags.includes(tag)}
												id={`tag-${tag}`}
												onCheckedChange={(checked) =>
													handleTagToggle(tag, checked as boolean)
												}
											/>
											<Label
												className="flex-1 cursor-pointer text-sm"
												htmlFor={`tag-${tag}`}
											>
												{tag}
											</Label>
										</div>
									))
								)}
							</div>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{/* Active Filters Display */}
			{hasActiveFilters && (
				<div className="flex items-center gap-2">
					<div className="flex flex-wrap gap-1">
						{filters.assignee && (
							<Badge className="gap-1" variant="secondary">Assignee: {filters.assignee}
								<Button
									className="h-4 w-4 p-0 hover:bg-transparent"
									onClick={() => updateFilters({ assignee: undefined })}
									size="sm"
									variant="ghost"
								>
									<X className="h-3 w-3" />
								</Button>
							</Badge>
						)}

						{filters.priority && (
							<Badge className="gap-1" variant="secondary">Priority: {filters.priority}
								<Button
									className="h-4 w-4 p-0 hover:bg-transparent"
									onClick={() => updateFilters({ priority: undefined })}
									size="sm"
									variant="ghost"
								>
									<X className="h-3 w-3" />
								</Button>
							</Badge>
						)}

						{filters.tags.map((tag) => (
							<Badge className="gap-1" key={tag} variant="secondary">Tag: {tag}
								<Button
									className="h-4 w-4 p-0 hover:bg-transparent"
									onClick={() => handleTagToggle(tag, false)}
									size="sm"
									variant="ghost"
								>
									<X className="h-3 w-3" />
								</Button>
							</Badge>
						))}
					</div>

					<Button
						className="h-6 gap-1 px-2 text-xs"
						onClick={clearFilters}
						size="sm"
						variant="ghost"
					>
						<X className="h-3 w-3" />Clear Filters
					</Button>
				</div>
			)}
		</div>
	);
}
