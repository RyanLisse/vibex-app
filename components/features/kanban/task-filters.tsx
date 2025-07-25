"use client";

import { Filter, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface TaskFiltersProps {
	filters: {
		search: string;
		priority: string;
		assignee: string;
		labels: string[];
	};
	onFiltersChange: (filters: {
		search: string;
		priority: string;
		assignee: string;
		labels: string[];
	}) => void;
	availableAssignees: string[];
	availableLabels: string[];
	className?: string;
}

export function TaskFilters({
	filters,
	onFiltersChange,
	availableAssignees,
	availableLabels,
	className = "",
}: TaskFiltersProps) {
	const updateFilter = (key: string, value: any) => {
		onFiltersChange({
			...filters,
			[key]: value,
		});
	};

	const addLabel = (label: string) => {
		if (!filters.labels.includes(label)) {
			updateFilter("labels", [...filters.labels, label]);
		}
	};

	const removeLabel = (label: string) => {
		updateFilter(
			"labels",
			filters.labels.filter((l) => l !== label)
		);
	};

	const clearAllFilters = () => {
		onFiltersChange({
			search: "",
			priority: "",
			assignee: "",
			labels: [],
		});
	};

	const hasActiveFilters =
		filters.search || filters.priority || filters.assignee || filters.labels.length > 0;

	return (
		<Card className={className}>
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						<Filter className="h-5 w-5" />
						Filters
					</CardTitle>
					{hasActiveFilters && (
						<Button
							variant="outline"
							size="sm"
							onClick={clearAllFilters}
							className="flex items-center gap-1"
						>
							<X className="h-4 w-4" />
							Clear All
						</Button>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
					{/* Search */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Search</label>
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Search tasks..."
								value={filters.search}
								onChange={(e) => updateFilter("search", e.target.value)}
								className="pl-10"
							/>
						</div>
					</div>

					{/* Priority */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Priority</label>
						<Select
							value={filters.priority}
							onValueChange={(value) => updateFilter("priority", value === "all" ? "" : value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All priorities" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All priorities</SelectItem>
								<SelectItem value="critical">Critical</SelectItem>
								<SelectItem value="high">High</SelectItem>
								<SelectItem value="medium">Medium</SelectItem>
								<SelectItem value="low">Low</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Assignee */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Assignee</label>
						<Select
							value={filters.assignee}
							onValueChange={(value) => updateFilter("assignee", value === "all" ? "" : value)}
						>
							<SelectTrigger>
								<SelectValue placeholder="All assignees" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All assignees</SelectItem>
								<SelectItem value="unassigned">Unassigned</SelectItem>
								{availableAssignees.map((assignee) => (
									<SelectItem key={assignee} value={assignee}>
										{assignee}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Labels */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Labels</label>
						<Select
							value=""
							onValueChange={(value) => {
								if (value && value !== "none") {
									addLabel(value);
								}
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Add label filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none" disabled={true}>
									Select a label
								</SelectItem>
								{availableLabels
									.filter((label) => !filters.labels.includes(label))
									.map((label) => (
										<SelectItem key={label} value={label}>
											{label}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Active Label Filters */}
				{filters.labels.length > 0 && (
					<div className="mt-4 space-y-2">
						<label className="text-sm font-medium">Active Label Filters:</label>
						<div className="flex flex-wrap gap-2">
							{filters.labels.map((label) => (
								<Badge key={label} variant="secondary" className="flex items-center gap-1">
									{label}
									<button
										onClick={() => removeLabel(label)}
										className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* Filter Summary */}
				{hasActiveFilters && (
					<div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
						<div className="flex items-center gap-2 text-sm text-blue-700">
							<Filter className="h-4 w-4" />
							<span>
								{[
									filters.search && `Search: "${filters.search}"`,
									filters.priority && `Priority: ${filters.priority}`,
									filters.assignee && `Assignee: ${filters.assignee}`,
									filters.labels.length > 0 && `Labels: ${filters.labels.join(", ")}`,
								]
									.filter(Boolean)
									.join(" • ")}
							</span>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

import { Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

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

export function TaskFilters({ onFilterChange, assignees, tags, className = "" }: TaskFiltersProps) {
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
		const newTags = checked ? [...filters.tags, tag] : filters.tags.filter((t) => t !== tag);

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
				<Label className="whitespace-nowrap font-medium text-sm" htmlFor="assignee">
					Assignee:
				</Label>
				<Select
					onValueChange={(value) => updateFilters({ assignee: value || undefined })}
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
				<Label className="whitespace-nowrap font-medium text-sm" htmlFor="priority">
					Priority:
				</Label>
				<Select
					onValueChange={(value) => updateFilters({ priority: value || undefined })}
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
				<PopoverTrigger asChild={true}>
					<Button className="relative gap-2" variant="outline">
						<Filter className="h-4 w-4" />
						Tags
						{activeFilterCount > 0 && (
							<Badge className="ml-1 h-5 w-5 rounded-full p-0 text-xs" variant="secondary">
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
							<Label className="font-medium text-sm" htmlFor="tags">
								Tags:
							</Label>
							<div className="max-h-40 space-y-2 overflow-y-auto">
								{tags.length === 0 ? (
									<p className="text-muted-foreground text-sm">No tags available</p>
								) : (
									tags.map((tag) => (
										<div className="flex items-center space-x-2" key={tag}>
											<Checkbox
												checked={filters.tags.includes(tag)}
												id={`tag-${tag}`}
												onCheckedChange={(checked) => handleTagToggle(tag, checked as boolean)}
											/>
											<Label className="flex-1 cursor-pointer text-sm" htmlFor={`tag-${tag}`}>
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
							<Badge className="gap-1" variant="secondary">
								Assignee: {filters.assignee}
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
							<Badge className="gap-1" variant="secondary">
								Priority: {filters.priority}
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
							<Badge className="gap-1" key={tag} variant="secondary">
								Tag: {tag}
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
						<X className="h-3 w-3" />
						Clear Filters
					</Button>
				</div>
			)}
		</div>
	);
}
