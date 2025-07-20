import {
	Download,
	Eye,
	EyeOff,
	Filter,
	GitBranch,
	LayoutGrid,
	Maximize2,
	Network,
	RotateCcw,
	Search,
	Settings,
	Share2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export interface VisualizationControlsProps {
	viewMode:
		| "agent-centric"
		| "task-centric"
		| "event-centric"
		| "memory-centric";
	layoutAlgorithm:
		| "hierarchical"
		| "force-directed"
		| "circular"
		| "grid"
		| "clustered";
	onViewModeChange: (mode: string) => void;
	onLayoutChange: (layout: string) => void;
	onFilterChange: (filters: any) => void;
	onZoomIn?: () => void;
	onZoomOut?: () => void;
	onFitView?: () => void;
	onReset?: () => void;
	onExport?: () => void;
	onShare?: () => void;
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
	viewMode,
	layoutAlgorithm,
	onViewModeChange,
	onLayoutChange,
	onFilterChange,
	onZoomIn,
	onZoomOut,
	onFitView,
	onReset,
	onExport,
	onShare,
}) => {
	const [searchTerm, setSearchTerm] = React.useState("");
	const [showInactive, setShowInactive] = React.useState(true);
	const [showMetrics, setShowMetrics] = React.useState(true);
	const [selectedStatuses, setSelectedStatuses] = React.useState<string[]>([]);
	const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);

	const handleFilterChange = React.useCallback(() => {
		onFilterChange({
			searchTerm,
			showInactive,
			showMetrics,
			statusFilters: selectedStatuses,
			nodeTypes: selectedTypes,
		});
	}, [
		searchTerm,
		showInactive,
		showMetrics,
		selectedStatuses,
		selectedTypes,
		onFilterChange,
	]);

	React.useEffect(() => {
		handleFilterChange();
	}, [handleFilterChange]);

	const statusOptions = [
		{ value: "active", label: "Active", color: "bg-green-100 text-green-800" },
		{ value: "idle", label: "Idle", color: "bg-yellow-100 text-yellow-800" },
		{ value: "busy", label: "Busy", color: "bg-blue-100 text-blue-800" },
		{ value: "error", label: "Error", color: "bg-red-100 text-red-800" },
		{
			value: "completed",
			label: "Completed",
			color: "bg-green-100 text-green-800",
		},
		{ value: "failed", label: "Failed", color: "bg-red-100 text-red-800" },
	];

	const nodeTypeOptions = [
		{ value: "agent", label: "Agents", icon: Network },
		{ value: "task", label: "Tasks", icon: GitBranch },
		{ value: "event", label: "Events", icon: LayoutGrid },
		{ value: "memory", label: "Memory", icon: LayoutGrid },
	];

	return (
		<Card className="w-80 bg-white/95 shadow-lg backdrop-blur-sm">
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center space-x-2 text-sm">
					<Settings className="h-4 w-4" />
					<span>Visualization Controls</span>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* View Mode Selection */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">View Mode</Label>
					<Select onValueChange={onViewModeChange} value={viewMode}>
						<SelectTrigger className="h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="agent-centric">
								<div className="flex items-center space-x-2">
									<Network className="h-3 w-3" />
									<span>Agent Network</span>
								</div>
							</SelectItem>
							<SelectItem value="task-centric">
								<div className="flex items-center space-x-2">
									<GitBranch className="h-3 w-3" />
									<span>Task Flow</span>
								</div>
							</SelectItem>
							<SelectItem value="event-centric">
								<div className="flex items-center space-x-2">
									<LayoutGrid className="h-3 w-3" />
									<span>Event Stream</span>
								</div>
							</SelectItem>
							<SelectItem value="memory-centric">
								<div className="flex items-center space-x-2">
									<LayoutGrid className="h-3 w-3" />
									<span>Memory Graph</span>
								</div>
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Layout Algorithm Selection */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Layout Algorithm</Label>
					<Select onValueChange={onLayoutChange} value={layoutAlgorithm}>
						<SelectTrigger className="h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="hierarchical">Hierarchical</SelectItem>
							<SelectItem value="force-directed">Force Directed</SelectItem>
							<SelectItem value="circular">Circular</SelectItem>
							<SelectItem value="grid">Grid</SelectItem>
							<SelectItem value="clustered">Clustered</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<Separator />

				{/* Search and Filter */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Search</Label>
					<div className="relative">
						<Search className="absolute top-2 left-2 h-3 w-3 text-gray-400" />
						<Input
							className="h-8 pl-7 text-xs"
							onChange={(e) => setSearchTerm(e.target.value)}
							placeholder="Search agents, tasks..."
							value={searchTerm}
						/>
					</div>
				</div>

				{/* Status Filters */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Filter by Status</Label>
					<div className="flex flex-wrap gap-1">
						{statusOptions.map((status) => (
							<Badge
								className={`cursor-pointer text-xs ${
									selectedStatuses.includes(status.value) ? status.color : ""
								}`}
								key={status.value}
								onClick={() => {
									setSelectedStatuses((prev) =>
										prev.includes(status.value)
											? prev.filter((s) => s !== status.value)
											: [...prev, status.value],
									);
								}}
								variant={
									selectedStatuses.includes(status.value)
										? "default"
										: "outline"
								}
							>
								{status.label}
							</Badge>
						))}
					</div>
				</div>

				{/* Node Type Filters */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Show Node Types</Label>
					<div className="grid grid-cols-2 gap-1">
						{nodeTypeOptions.map((type) => {
							const Icon = type.icon;
							return (
								<div
									className={`flex cursor-pointer items-center space-x-2 rounded border p-2 text-xs transition-colors ${
										selectedTypes.includes(type.value) ||
										selectedTypes.length === 0
											? "border-blue-200 bg-blue-50"
											: "border-gray-200 bg-gray-50"
									}`}
									key={type.value}
									onClick={() => {
										setSelectedTypes((prev) =>
											prev.includes(type.value)
												? prev.filter((t) => t !== type.value)
												: [...prev, type.value],
										);
									}}
								>
									<Icon className="h-3 w-3" />
									<span>{type.label}</span>
									{(selectedTypes.includes(type.value) ||
										selectedTypes.length === 0) && (
										<Eye className="ml-auto h-3 w-3" />
									)}
									{selectedTypes.length > 0 &&
										!selectedTypes.includes(type.value) && (
											<EyeOff className="ml-auto h-3 w-3 text-gray-400" />
										)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Display Options */}
				<div className="space-y-3">
					<Label className="font-medium text-xs">Display Options</Label>

					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							{showInactive ? (
								<Eye className="h-3 w-3" />
							) : (
								<EyeOff className="h-3 w-3" />
							)}
							<span className="text-xs">Show Inactive</span>
						</div>
						<Button
							className="h-6"
							onClick={() => setShowInactive(!showInactive)}
							size="sm"
							variant="ghost"
						>
							{showInactive ? "Hide" : "Show"}
						</Button>
					</div>

					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2">
							<LayoutGrid className="h-3 w-3" />
							<span className="text-xs">Show Metrics</span>
						</div>
						<Button
							className="h-6"
							onClick={() => setShowMetrics(!showMetrics)}
							size="sm"
							variant="ghost"
						>
							{showMetrics ? "Hide" : "Show"}
						</Button>
					</div>
				</div>

				<Separator />

				{/* Navigation Controls */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Navigation</Label>
					<div className="grid grid-cols-2 gap-1">
						<Button
							className="h-8 text-xs"
							onClick={onZoomIn}
							size="sm"
							variant="outline"
						>
							<ZoomIn className="mr-1 h-3 w-3" />
							Zoom In
						</Button>
						<Button
							className="h-8 text-xs"
							onClick={onZoomOut}
							size="sm"
							variant="outline"
						>
							<ZoomOut className="mr-1 h-3 w-3" />
							Zoom Out
						</Button>
						<Button
							className="h-8 text-xs"
							onClick={onFitView}
							size="sm"
							variant="outline"
						>
							<Maximize2 className="mr-1 h-3 w-3" />
							Fit View
						</Button>
						<Button
							className="h-8 text-xs"
							onClick={onReset}
							size="sm"
							variant="outline"
						>
							<RotateCcw className="mr-1 h-3 w-3" />
							Reset
						</Button>
					</div>
				</div>

				{/* Export and Share */}
				<div className="space-y-2">
					<Label className="font-medium text-xs">Export & Share</Label>
					<div className="flex space-x-1">
						<Button
							className="h-8 flex-1 text-xs"
							onClick={onExport}
							size="sm"
							variant="outline"
						>
							<Download className="mr-1 h-3 w-3" />
							Export
						</Button>
						<Button
							className="h-8 flex-1 text-xs"
							onClick={onShare}
							size="sm"
							variant="outline"
						>
							<Share2 className="mr-1 h-3 w-3" />
							Share
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
