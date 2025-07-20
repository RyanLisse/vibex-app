"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
	Brain,
	ChevronDown,
	ChevronRight,
	Copy,
	Database,
	Download,
	Eye,
	EyeOff,
	FileText,
	Filter,
	Layers,
	Package,
	RefreshCw,
	Search,
	Settings,
	Terminal,
	Variable,
	Zap,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ExecutionSnapshot, ExecutionState } from "@/lib/time-travel";
import { cn } from "@/lib/utils";

interface StateReplayViewerProps {
	snapshot: ExecutionSnapshot | null;
	watchedVariables: string[];
	onAddWatch: (variable: string) => void;
	onRemoveWatch: (variable: string) => void;
	className?: string;
}

// Tree node for state visualization
interface TreeNode {
	key: string;
	value: any;
	path: string;
	type: string;
	children?: TreeNode[];
	isExpanded?: boolean;
}

// Value type badge
function ValueTypeBadge({ type }: { type: string }) {
	const variants: Record<string, { variant: any; color: string }> = {
		string: { variant: "secondary", color: "text-green-600" },
		number: { variant: "secondary", color: "text-blue-600" },
		boolean: { variant: "secondary", color: "text-purple-600" },
		object: { variant: "outline", color: "text-orange-600" },
		array: { variant: "outline", color: "text-yellow-600" },
		null: { variant: "outline", color: "text-gray-600" },
		undefined: { variant: "outline", color: "text-gray-600" },
	};

	const style = variants[type] || variants.object;

	return (
		<Badge className={cn("text-xs", style.color)} variant={style.variant}>
			{type}
		</Badge>
	);
}

// Tree view component
function TreeView({
	nodes,
	watchedPaths,
	onToggle,
	onWatch,
	onUnwatch,
	searchQuery,
	level = 0,
}: {
	nodes: TreeNode[];
	watchedPaths: Set<string>;
	onToggle: (path: string) => void;
	onWatch: (path: string) => void;
	onUnwatch: (path: string) => void;
	searchQuery: string;
	level?: number;
}) {
	const filteredNodes = useMemo(() => {
		if (!searchQuery) return nodes;

		const query = searchQuery.toLowerCase();
		return nodes.filter((node) => {
			const keyMatch = node.key.toLowerCase().includes(query);
			const valueMatch = String(node.value).toLowerCase().includes(query);
			const childMatch = node.children?.some(
				(child) =>
					child.key.toLowerCase().includes(query) ||
					String(child.value).toLowerCase().includes(query),
			);
			return keyMatch || valueMatch || childMatch;
		});
	}, [nodes, searchQuery]);

	return (
		<div className="space-y-1">
			{filteredNodes.map((node) => {
				const isWatched = watchedPaths.has(node.path);
				const hasChildren = node.children && node.children.length > 0;
				const isExpanded = node.isExpanded || searchQuery !== "";

				return (
					<div className="relative" key={node.path}>
						<div
							className={cn(
								"group flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted",
								isWatched && "bg-primary/10",
							)}
							style={{ paddingLeft: `${level * 16 + 8}px` }}
						>
							{/* Expand/collapse button */}
							{hasChildren && (
								<Button
									className="h-4 w-4 p-0"
									onClick={() => onToggle(node.path)}
									size="icon"
									variant="ghost"
								>
									{isExpanded ? (
										<ChevronDown className="h-3 w-3" />
									) : (
										<ChevronRight className="h-3 w-3" />
									)}
								</Button>
							)}
							{!hasChildren && <div className="w-4" />}

							{/* Key */}
							<span className="font-medium text-muted-foreground">
								{node.key}:
							</span>

							{/* Value */}
							<div className="flex flex-1 items-center gap-2">
								<ValueTypeBadge type={node.type} />
								{node.type === "object" || node.type === "array" ? (
									<span className="text-muted-foreground">
										{node.type === "array"
											? `[${node.children?.length || 0}]`
											: "{...}"}
									</span>
								) : (
									<span
										className={cn(
											"truncate",
											node.type === "string" && "text-green-600",
											node.type === "number" && "text-blue-600",
											node.type === "boolean" && "text-purple-600",
										)}
									>
										{node.type === "string"
											? `"${node.value}"`
											: String(node.value)}
									</span>
								)}
							</div>

							{/* Actions */}
							<div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100">
								<Button
									className="h-6 w-6"
									onClick={() =>
										isWatched ? onUnwatch(node.path) : onWatch(node.path)
									}
									size="icon"
									variant="ghost"
								>
									{isWatched ? (
										<EyeOff className="h-3 w-3" />
									) : (
										<Eye className="h-3 w-3" />
									)}
								</Button>
								<Button
									className="h-6 w-6"
									onClick={() =>
										navigator.clipboard.writeText(
											JSON.stringify(node.value, null, 2),
										)
									}
									size="icon"
									variant="ghost"
								>
									<Copy className="h-3 w-3" />
								</Button>
							</div>
						</div>

						{/* Children */}
						{hasChildren && isExpanded && (
							<TreeView
								level={level + 1}
								nodes={node.children!}
								onToggle={onToggle}
								onUnwatch={onUnwatch}
								onWatch={onWatch}
								searchQuery={searchQuery}
								watchedPaths={watchedPaths}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
}

// Convert state to tree nodes
function stateToTree(obj: any, path = "", key = "root"): TreeNode {
	const type = Array.isArray(obj)
		? "array"
		: obj === null
			? "null"
			: typeof obj;
	const node: TreeNode = { key, value: obj, path: path || key, type };

	if (type === "object" && obj !== null) {
		node.children = Object.entries(obj).map(([k, v]) =>
			stateToTree(v, path ? `${path}.${k}` : k, k),
		);
	} else if (type === "array") {
		node.children = obj.map((v: any, i: number) =>
			stateToTree(v, `${path}[${i}]`, `[${i}]`),
		);
	}

	return node;
}

// State section component
function StateSection({
	title,
	icon: Icon,
	data,
	watchedPaths,
	onWatch,
	onUnwatch,
	expandedPaths,
	onToggle,
	searchQuery,
}: {
	title: string;
	icon: any;
	data: any;
	watchedPaths: Set<string>;
	onWatch: (path: string) => void;
	onUnwatch: (path: string) => void;
	expandedPaths: Set<string>;
	onToggle: (path: string) => void;
	searchQuery: string;
}) {
	const tree = useMemo(() => {
		const root = stateToTree(data, title.toLowerCase());

		// Apply expanded state
		const applyExpanded = (node: TreeNode) => {
			node.isExpanded = expandedPaths.has(node.path);
			if (node.children) {
				node.children.forEach(applyExpanded);
			}
		};

		if (root.children) {
			root.children.forEach(applyExpanded);
		}

		return root.children || [];
	}, [data, title, expandedPaths]);

	return (
		<Card>
			<CardHeader className="pb-3">
				<CardTitle className="flex items-center gap-2 text-base">
					<Icon className="h-4 w-4" />
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ScrollArea className="h-[300px]">
					<TreeView
						nodes={tree}
						onToggle={onToggle}
						onUnwatch={onUnwatch}
						onWatch={onWatch}
						searchQuery={searchQuery}
						watchedPaths={watchedPaths}
					/>
				</ScrollArea>
			</CardContent>
		</Card>
	);
}

export function StateReplayViewer({
	snapshot,
	watchedVariables,
	onAddWatch,
	onRemoveWatch,
	className,
}: StateReplayViewerProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState("state");
	const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
	const [newWatchPath, setNewWatchPath] = useState("");

	const watchedPaths = useMemo(
		() => new Set(watchedVariables),
		[watchedVariables],
	);

	const handleToggle = useCallback((path: string) => {
		setExpandedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	}, []);

	const handleAddWatch = useCallback(() => {
		if (newWatchPath.trim()) {
			onAddWatch(newWatchPath.trim());
			setNewWatchPath("");
		}
	}, [newWatchPath, onAddWatch]);

	if (!snapshot) {
		return (
			<Card className={className}>
				<CardContent className="flex h-[400px] items-center justify-center">
					<p className="text-muted-foreground">No snapshot selected</p>
				</CardContent>
			</Card>
		);
	}

	const state = snapshot.state;

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							<Layers className="h-5 w-5" />
							State Viewer
						</CardTitle>
						<CardDescription>
							Step {snapshot.stepNumber} - {snapshot.type}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button
							onClick={() => {
								const data = JSON.stringify(state, null, 2);
								const blob = new Blob([data], { type: "application/json" });
								const url = URL.createObjectURL(blob);
								const a = document.createElement("a");
								a.href = url;
								a.download = `state-step-${snapshot.stepNumber}.json`;
								a.click();
								URL.revokeObjectURL(url);
							}}
							size="sm"
							variant="outline"
						>
							<Download className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Search bar */}
				<div className="flex items-center gap-2">
					<div className="relative flex-1">
						<Search className="absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
						<Input
							className="pl-8"
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Search state..."
							value={searchQuery}
						/>
					</div>
					<Button
						onClick={() => setExpandedPaths(new Set())}
						size="icon"
						variant="outline"
					>
						<RefreshCw className="h-4 w-4" />
					</Button>
				</div>

				{/* Tabs */}
				<Tabs onValueChange={setActiveTab} value={activeTab}>
					<TabsList className="grid w-full grid-cols-4">
						<TabsTrigger value="state">State</TabsTrigger>
						<TabsTrigger value="memory">Memory</TabsTrigger>
						<TabsTrigger value="context">Context</TabsTrigger>
						<TabsTrigger value="watch">Watch</TabsTrigger>
					</TabsList>

					<TabsContent className="space-y-4" value="state">
						<div className="grid gap-4 lg:grid-cols-2">
							<StateSection
								data={{
									agentId: state.agentId,
									sessionId: state.sessionId,
									currentStep: state.currentStep,
									totalSteps: state.totalSteps,
								}}
								expandedPaths={expandedPaths}
								icon={Brain}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Agent"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.currentOperation || {}}
								expandedPaths={expandedPaths}
								icon={Terminal}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Current Operation"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.outputs}
								expandedPaths={expandedPaths}
								icon={Package}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Outputs"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.performance}
								expandedPaths={expandedPaths}
								icon={Zap}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Performance"
								watchedPaths={watchedPaths}
							/>
						</div>
					</TabsContent>

					<TabsContent className="space-y-4" value="memory">
						<div className="grid gap-4">
							<StateSection
								data={state.memory.shortTerm}
								expandedPaths={expandedPaths}
								icon={Brain}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Short Term Memory"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.memory.longTerm}
								expandedPaths={expandedPaths}
								icon={Database}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Long Term Memory"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.memory.context}
								expandedPaths={expandedPaths}
								icon={FileText}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Context Memory"
								watchedPaths={watchedPaths}
							/>
							<StateSection
								data={state.memory.variables}
								expandedPaths={expandedPaths}
								icon={Variable}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Variables"
								watchedPaths={watchedPaths}
							/>
						</div>
					</TabsContent>

					<TabsContent className="space-y-4" value="context">
						<StateSection
							data={state.context}
							expandedPaths={expandedPaths}
							icon={Settings}
							onToggle={handleToggle}
							onUnwatch={onRemoveWatch}
							onWatch={onAddWatch}
							searchQuery={searchQuery}
							title="Execution Context"
							watchedPaths={watchedPaths}
						/>
						{state.error && (
							<StateSection
								data={state.error}
								expandedPaths={expandedPaths}
								icon={Terminal}
								onToggle={handleToggle}
								onUnwatch={onRemoveWatch}
								onWatch={onAddWatch}
								searchQuery={searchQuery}
								title="Error Details"
								watchedPaths={watchedPaths}
							/>
						)}
					</TabsContent>

					<TabsContent className="space-y-4" value="watch">
						<div className="space-y-4">
							<div className="flex gap-2">
								<Input
									onChange={(e) => setNewWatchPath(e.target.value)}
									onKeyPress={(e) => e.key === "Enter" && handleAddWatch()}
									placeholder="Enter variable path (e.g., memory.shortTerm.userId)"
									value={newWatchPath}
								/>
								<Button onClick={handleAddWatch}>Add Watch</Button>
							</div>

							<Separator />

							<div className="space-y-2">
								<h4 className="font-medium text-sm">Watched Variables</h4>
								{watchedVariables.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										No variables being watched
									</p>
								) : (
									<div className="space-y-2">
										{watchedVariables.map((variable) => {
											const value = variable
												.split(".")
												.reduce((obj, key) => obj?.[key], state as any);
											const type = Array.isArray(value)
												? "array"
												: value === null
													? "null"
													: typeof value;

											return (
												<div
													className="flex items-center justify-between rounded-md border p-2"
													key={variable}
												>
													<div className="flex-1 space-y-1">
														<div className="flex items-center gap-2">
															<span className="font-medium text-sm">
																{variable}
															</span>
															<ValueTypeBadge type={type} />
														</div>
														<div className="text-muted-foreground text-sm">
															{type === "object" || type === "array"
																? JSON.stringify(value, null, 2).substring(
																		0,
																		100,
																	) + "..."
																: String(value)}
														</div>
													</div>
													<Button
														onClick={() => onRemoveWatch(variable)}
														size="icon"
														variant="ghost"
													>
														<EyeOff className="h-4 w-4" />
													</Button>
												</div>
											);
										})}
									</div>
								)}
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
