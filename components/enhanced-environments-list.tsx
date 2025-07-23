/**
 * Enhanced Environments List Component
 *
 * Uses TanStack Query for data fetching with real-time updates,
 * optimistic updates, and comprehensive error handling.
 */

"use client";

import { formatDistanceToNow } from "date-fns";
import {
	AlertCircle,
	CheckCircle,
	Globe,
	Loader2,
	MoreVertical,
	Play,
	Plus,
	RefreshCw,
	Server,
	Settings,
	Square,
	Trash2,
} from "lucide-react";
import React, { useState } from "react";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Environment, NewEnvironment } from "@/db/schema";
import {
	useActivateEnvironment,
	useCreateEnvironment,
	useDeleteEnvironment,
	useEnvironmentStats,
	useEnvironments,
	useUpdateEnvironment,
} from "@/hooks/use-environment-queries-enhanced";
import { cn } from "@/lib/utils";

interface EnhancedEnvironmentsListProps {
	className?: string;
	onEnvironmentClick?: (environment: Environment) => void;
	showCreateButton?: boolean;
	filters?: {
		isActive?: boolean;
		userId?: string;
	};
}

export function EnhancedEnvironmentsList({
	className,
	onEnvironmentClick,
	showCreateButton = true,
	filters: initialFilters,
}: EnhancedEnvironmentsListProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newEnvironment, setNewEnvironment] = useState<Partial<NewEnvironment>>({
		name: "",
		config: {},
		isActive: false,
	});

	// Query hooks
	const { data: environments = [], isLoading, error, refetch } = useEnvironments(initialFilters);

	const stats = useEnvironmentStats();
	const createEnvironmentMutation = useCreateEnvironment();
	const updateEnvironmentMutation = useUpdateEnvironment();
	const deleteEnvironmentMutation = useDeleteEnvironment();
	const activateEnvironmentMutation = useActivateEnvironment();

	// Filter environments by search query
	const filteredEnvironments = environments.filter((env) =>
		env.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const handleCreateEnvironment = async () => {
		if (!newEnvironment.name?.trim()) return;

		try {
			await createEnvironmentMutation.mutateAsync({
				name: newEnvironment.name,
				config: newEnvironment.config || {},
				isActive: newEnvironment.isActive || false,
			});
			setShowCreateForm(false);
			setNewEnvironment({ name: "", config: {}, isActive: false });
		} catch (error) {
			console.error("Failed to create environment:", error);
		}
	};

	const handleActivateEnvironment = async (id: string) => {
		try {
			await activateEnvironmentMutation.mutateAsync(id);
		} catch (error) {
			console.error("Failed to activate environment:", error);
		}
	};

	const handleDeleteEnvironment = async (id: string) => {
		try {
			await deleteEnvironmentMutation.mutateAsync(id);
		} catch (error) {
			console.error("Failed to delete environment:", error);
		}
	};

	if (error) {
		return (
			<Card className={className}>
				<CardContent className="pt-6">
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>
							Failed to load environments: {error.message}
							<Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
								<RefreshCw className="h-4 w-4 mr-2" />
								Retry
							</Button>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center space-x-2">
							<Server className="h-5 w-5" />
							<span>Environments</span>
							{isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
						</CardTitle>
						<CardDescription>
							{filteredEnvironments.length} of {environments.length} environments
							{stats.active > 0 && ` • ${stats.active} active`}
						</CardDescription>
					</div>
					<div className="flex items-center space-x-2">
						<Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
							<RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
						</Button>
						{showCreateButton && (
							<Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
								<DialogTrigger asChild={true}>
									<Button size="sm">
										<Plus className="h-4 w-4 mr-2" />
										New Environment
									</Button>
								</DialogTrigger>
								<DialogContent>
									<DialogHeader>
										<DialogTitle>Create Environment</DialogTitle>
										<DialogDescription>Create a new environment configuration.</DialogDescription>
									</DialogHeader>
									<div className="space-y-4">
										<div>
											<Label htmlFor="name">Name</Label>
											<Input
												id="name"
												value={newEnvironment.name || ""}
												onChange={(e) =>
													setNewEnvironment({ ...newEnvironment, name: e.target.value })
												}
												placeholder="Environment name"
											/>
										</div>
										<div>
											<Label htmlFor="config">Configuration (JSON)</Label>
											<Textarea
												id="config"
												value={JSON.stringify(newEnvironment.config || {}, null, 2)}
												onChange={(e) => {
													try {
														const config = JSON.parse(e.target.value);
														setNewEnvironment({ ...newEnvironment, config });
													} catch {
														// Invalid JSON, ignore
													}
												}}
												placeholder='{"key": "value"}'
												rows={4}
											/>
										</div>
										<div className="flex items-center space-x-2">
											<input
												type="checkbox"
												id="isActive"
												checked={newEnvironment.isActive || false}
												onChange={(e) =>
													setNewEnvironment({ ...newEnvironment, isActive: e.target.checked })
												}
											/>
											<Label htmlFor="isActive">Set as active environment</Label>
										</div>
										<div className="flex justify-end space-x-2">
											<Button variant="outline" onClick={() => setShowCreateForm(false)}>
												Cancel
											</Button>
											<Button
												onClick={handleCreateEnvironment}
												disabled={
													!newEnvironment.name?.trim() || createEnvironmentMutation.isPending
												}
											>
												{createEnvironmentMutation.isPending ? "Creating..." : "Create"}
											</Button>
										</div>
									</div>
								</DialogContent>
							</Dialog>
						)}
					</div>
				</div>

				{/* Search */}
				<div className="relative">
					<Input
						placeholder="Search environments..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
			</CardHeader>

			<CardContent>
				{isLoading && environments.length === 0 ? (
					<div className="flex items-center justify-center h-32">
						<Loader2 className="h-8 w-8 animate-spin text-gray-400" />
					</div>
				) : filteredEnvironments.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						{searchQuery ? "No environments match your search" : "No environments found"}
					</div>
				) : (
					<ScrollArea className="h-96">
						<div className="space-y-3">
							{filteredEnvironments.map((environment) => (
								<div
									key={environment.id}
									className={cn(
										"p-4 border rounded-lg transition-all duration-200",
										"hover:shadow-md hover:border-gray-300",
										onEnvironmentClick && "cursor-pointer",
										environment.isActive
											? "border-green-200 bg-green-50"
											: "border-gray-200 bg-white"
									)}
									onClick={() => onEnvironmentClick?.(environment)}
								>
									<div className="flex items-start justify-between">
										<div className="flex-1 min-w-0">
											<div className="flex items-center space-x-2 mb-2">
												<Globe className="h-4 w-4 text-gray-600" />
												<h3 className="font-medium text-gray-900 truncate">{environment.name}</h3>
												{environment.isActive && (
													<Badge variant="default" className="bg-green-600">
														<CheckCircle className="h-3 w-3 mr-1" />
														Active
													</Badge>
												)}
											</div>

											<div className="text-sm text-gray-600 mb-2">
												Schema Version: {environment.schemaVersion}
											</div>

											<div className="flex items-center space-x-4 text-xs text-gray-500">
												<span>Created {formatDistanceToNow(environment.createdAt)} ago</span>
												<span>Updated {formatDistanceToNow(environment.updatedAt)} ago</span>
											</div>
										</div>

										<DropdownMenu>
											<DropdownMenuTrigger asChild={true}>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0"
													onClick={(e) => e.stopPropagation()}
												>
													<MoreVertical className="h-4 w-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{!environment.isActive && (
													<DropdownMenuItem
														onClick={(e) => {
															e.stopPropagation();
															handleActivateEnvironment(environment.id);
														}}
														disabled={activateEnvironmentMutation.isPending}
													>
														<Play className="h-4 w-4 mr-2" />
														Activate
													</DropdownMenuItem>
												)}
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														// Handle edit - would open edit dialog
													}}
												>
													<Settings className="h-4 w-4 mr-2" />
													Edit
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteEnvironment(environment.id);
													}}
													className="text-red-600"
													disabled={environment.isActive || deleteEnvironmentMutation.isPending}
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								</div>
							))}
						</div>
					</ScrollArea>
				)}
			</CardContent>

			{/* Loading states for mutations */}
			{(activateEnvironmentMutation.isPending ||
				deleteEnvironmentMutation.isPending ||
				updateEnvironmentMutation.isPending) && (
				<div className="absolute inset-0 bg-white/50 flex items-center justify-center">
					<Loader2 className="h-6 w-6 animate-spin" />
				</div>
			)}
		</Card>
	);
}
