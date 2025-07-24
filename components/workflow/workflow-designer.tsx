"use client";

import {
	addEdge,
	Background,
	BackgroundVariant,
	type Connection,
	Controls,
	Edge,
	Handle,
	MiniMap,
	type Node,
	type NodeProps,
	Panel,
	Position,
	ReactFlow,
	useEdgesState,
	useNodesState,
} from "@xyflow/react";
import { useCallback, useEffect, useState } from "react";
import "@xyflow/react/dist/style.css";
import {
	AlertCircle,
	CheckCircle,
	Clock,
	Code,
	Copy,
	Database,
	Download,
	GitBranch,
	Globe,
	MessageSquare,
	Pause,
	Play,
	Plus,
	RefreshCw,
	RotateCcw,
	Save,
	Settings,
	Square,
	Trash2,
	Upload,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface WorkflowStep {
	id: string;
	name: string;
	type: "action" | "condition" | "loop" | "parallel" | "wait" | "api" | "code" | "notification";
	config: Record<string, any>;
	position: { x: number; y: number };
}

interface Workflow {
	id?: string;
	name: string;
	description: string;
	version: string;
	definition: {
		steps: WorkflowStep[];
		variables: Record<string, any>;
		config: Record<string, any>;
	};
	status: "draft" | "active" | "archived";
	tags: string[];
}

// Custom Node Components
function ActionNode({ data, selected }: NodeProps) {
	const getIcon = () => {
		switch (data.type) {
			case "api":
				return <Globe className="h-4 w-4" />;
			case "code":
				return <Code className="h-4 w-4" />;
			case "database":
				return <Database className="h-4 w-4" />;
			case "notification":
				return <MessageSquare className="h-4 w-4" />;
			default:
				return <Zap className="h-4 w-4" />;
		}
	};

	const getColor = () => {
		switch (data.type) {
			case "api":
				return "bg-blue-500";
			case "code":
				return "bg-green-500";
			case "database":
				return "bg-purple-500";
			case "notification":
				return "bg-orange-500";
			default:
				return "bg-gray-500";
		}
	};

	return (
		<div
			className={`min-w-32 rounded-md border-2 bg-white px-4 py-2 shadow-md ${
				selected ? "border-blue-500" : "border-gray-200"
			}`}
		>
			<Handle className="!bg-teal-500 w-16" position={Position.Top} type="target" />
			<div className="flex items-center space-x-2">
				<div className={`rounded p-1 ${getColor()} text-white`}>{getIcon()}</div>
				<div className="font-medium text-sm">{data.label}</div>
			</div>
			<Handle className="!bg-teal-500 w-16" position={Position.Bottom} type="source" />
		</div>
	);
}

function ConditionNode({ data, selected }: NodeProps) {
	return (
		<div
			className={`min-w-32 rounded-md border-2 bg-white px-4 py-2 shadow-md ${
				selected ? "border-blue-500" : "border-gray-200"
			}`}
		>
			<Handle className="!bg-teal-500 w-16" position={Position.Top} type="target" />
			<div className="flex items-center space-x-2">
				<div className="rounded bg-yellow-500 p-1 text-white">
					<GitBranch className="h-4 w-4" />
				</div>
				<div className="font-medium text-sm">{data.label}</div>
			</div>
			<Handle className="!bg-green-500 w-16" id="true" position={Position.Bottom} type="source" />
			<Handle
				className="!bg-red-500 w-16"
				id="false"
				position={Position.Bottom}
				style={{ left: "70%" }}
				type="source"
			/>
		</div>
	);
}

function WaitNode({ data, selected }: NodeProps) {
	return (
		<div
			className={`min-w-32 rounded-md border-2 bg-white px-4 py-2 shadow-md ${
				selected ? "border-blue-500" : "border-gray-200"
			}`}
		>
			<Handle className="!bg-teal-500 w-16" position={Position.Top} type="target" />
			<div className="flex items-center space-x-2">
				<div className="rounded bg-blue-500 p-1 text-white">
					<Clock className="h-4 w-4" />
				</div>
				<div className="font-medium text-sm">{data.label}</div>
			</div>
			<Handle className="!bg-teal-500 w-16" position={Position.Bottom} type="source" />
		</div>
	);
}

const nodeTypes = {
	action: ActionNode,
	condition: ConditionNode,
	wait: WaitNode,
};

export function WorkflowDesigner() {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [workflow, setWorkflow] = useState<Workflow>({
		name: "New Workflow",
		description: "",
		version: "1.0.0",
		definition: {
			steps: [],
			variables: {},
			config: {},
		},
		status: "draft",
		tags: [],
	});
	const [isExecuting, setIsExecuting] = useState(false);
	const [executionStatus, setExecutionStatus] = useState<any>(null);

	// Node creation
	const addNode = useCallback(
		(type: string, subType?: string) => {
			const id = `${type}-${Date.now()}`;
			const position = { x: Math.random() * 400, y: Math.random() * 400 };

			const newNode: Node = {
				id,
				type,
				position,
				data: {
					label: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
					type: subType || type,
					config: {},
				},
			};

			setNodes((nds) => [...nds, newNode]);
		},
		[setNodes]
	);

	// Connection handling
	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges]
	);

	// Node selection
	const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
		setSelectedNode(node);
	}, []);

	// Save workflow
	const saveWorkflow = async () => {
		try {
			const workflowData = {
				...workflow,
				definition: {
					...workflow.definition,
					steps: nodes.map((node) => ({
						id: node.id,
						name: node.data.label,
						type: node.data.type,
						config: node.data.config,
						position: node.position,
					})),
				},
			};

			const response = await fetch("/api/workflows", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(workflowData),
			});

			if (response.ok) {
				const savedWorkflow = await response.json();
				setWorkflow(savedWorkflow);
				console.log("Workflow saved successfully");
			}
		} catch (error) {
			console.error("Failed to save workflow:", error);
		}
	};

	// Execute workflow
	const executeWorkflow = async () => {
		if (!workflow.id) {
			await saveWorkflow();
			return;
		}

		try {
			setIsExecuting(true);
			const response = await fetch(`/api/workflows/${workflow.id}/execute`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					input: {},
					config: {},
				}),
			});

			if (response.ok) {
				const execution = await response.json();
				setExecutionStatus(execution);
				console.log("Workflow execution started:", execution);
			}
		} catch (error) {
			console.error("Failed to execute workflow:", error);
		} finally {
			setIsExecuting(false);
		}
	};

	// Update selected node
	const updateSelectedNode = (updates: Partial<Node["data"]>) => {
		if (!selectedNode) return;

		setNodes((nds) =>
			nds.map((node) =>
				node.id === selectedNode.id ? { ...node, data: { ...node.data, ...updates } } : node
			)
		);

		setSelectedNode((prev) => (prev ? { ...prev, data: { ...prev.data, ...updates } } : null));
	};

	// Delete selected node
	const deleteSelectedNode = () => {
		if (!selectedNode) return;

		setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
		setEdges((eds) =>
			eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
		);
		setSelectedNode(null);
	};

	return (
		<div className="flex h-screen">
			{/* Sidebar */}
			<div className="w-80 border-r bg-background">
				<Tabs className="h-full" defaultValue="design">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="design">Design</TabsTrigger>
						<TabsTrigger value="config">Config</TabsTrigger>
						<TabsTrigger value="execute">Execute</TabsTrigger>
					</TabsList>

					{/* Design Tab */}
					<TabsContent className="h-full space-y-4 p-4" value="design">
						<div>
							<h3 className="mb-3 font-semibold">Workflow Information</h3>
							<div className="space-y-3">
								<Input
									onChange={(e) => setWorkflow((prev) => ({ ...prev, name: e.target.value }))}
									placeholder="Workflow name"
									value={workflow.name}
								/>
								<Textarea
									onChange={(e) =>
										setWorkflow((prev) => ({
											...prev,
											description: e.target.value,
										}))
									}
									placeholder="Description"
									rows={2}
									value={workflow.description}
								/>
								<div className="flex space-x-2">
									<Input
										className="w-24"
										onChange={(e) =>
											setWorkflow((prev) => ({
												...prev,
												version: e.target.value,
											}))
										}
										placeholder="Version"
										value={workflow.version}
									/>
									<Select
										onValueChange={(value: any) =>
											setWorkflow((prev) => ({ ...prev, status: value }))
										}
										value={workflow.status}
									>
										<SelectTrigger className="flex-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="draft">Draft</SelectItem>
											<SelectItem value="active">Active</SelectItem>
											<SelectItem value="archived">Archived</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<div>
							<h3 className="mb-3 font-semibold">Add Steps</h3>
							<div className="grid grid-cols-2 gap-2">
								<Button onClick={() => addNode("action", "api")} size="sm" variant="outline">
									<Globe className="mr-1 h-4 w-4" />
									API Call
								</Button>
								<Button onClick={() => addNode("action", "code")} size="sm" variant="outline">
									<Code className="mr-1 h-4 w-4" />
									Code Block
								</Button>
								<Button onClick={() => addNode("condition")} size="sm" variant="outline">
									<GitBranch className="mr-1 h-4 w-4" />
									Condition
								</Button>
								<Button onClick={() => addNode("wait")} size="sm" variant="outline">
									<Clock className="mr-1 h-4 w-4" />
									Wait/Delay
								</Button>
								<Button onClick={() => addNode("action", "database")} size="sm" variant="outline">
									<Database className="mr-1 h-4 w-4" />
									Database
								</Button>
								<Button
									onClick={() => addNode("action", "notification")}
									size="sm"
									variant="outline"
								>
									<MessageSquare className="mr-1 h-4 w-4" />
									Notification
								</Button>
							</div>
						</div>

						{/* Selected Node Properties */}
						{selectedNode && (
							<Card className="p-4">
								<div className="mb-3 flex items-center justify-between">
									<h3 className="font-semibold">Step Properties</h3>
									<div className="flex space-x-1">
										<Button onClick={() => {}} size="sm" variant="outline">
											<Copy className="h-3 w-3" />
										</Button>
										<Button onClick={deleteSelectedNode} size="sm" variant="destructive">
											<Trash2 className="h-3 w-3" />
										</Button>
									</div>
								</div>

								<div className="space-y-3">
									<div>
										<label htmlFor="node-name" className="mb-1 block font-medium text-sm">
											Name
										</label>
										<Input
											id="node-name"
											onChange={(e) => updateSelectedNode({ label: e.target.value })}
											value={selectedNode.data.label}
										/>
									</div>

									<div>
										<label className="mb-1 block font-medium text-sm">Type</label>
										<Badge variant="outline">{selectedNode.data.type}</Badge>
									</div>

									{selectedNode.type === "action" && (
										<div className="space-y-3">
											{selectedNode.data.type === "api" && (
												<>
													<div>
														<label htmlFor="api-url" className="mb-1 block font-medium text-sm">
															URL
														</label>
														<Input
															id="api-url"
															onChange={(e) =>
																updateSelectedNode({
																	config: {
																		...selectedNode.data.config,
																		url: e.target.value,
																	},
																})
															}
															placeholder="https://api.example.com/endpoint"
															value={selectedNode.data.config?.url || ""}
														/>
													</div>
													<div>
														<label className="mb-1 block font-medium text-sm">Method</label>
														<Select
															onValueChange={(value) =>
																updateSelectedNode({
																	config: {
																		...selectedNode.data.config,
																		method: value,
																	},
																})
															}
															value={selectedNode.data.config?.method || "GET"}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="GET">GET</SelectItem>
																<SelectItem value="POST">POST</SelectItem>
																<SelectItem value="PUT">PUT</SelectItem>
																<SelectItem value="DELETE">DELETE</SelectItem>
															</SelectContent>
														</Select>
													</div>
												</>
											)}

											{selectedNode.data.type === "code" && (
												<div>
													<label htmlFor="code-textarea" className="mb-1 block font-medium text-sm">
														Code
													</label>
													<Textarea
														id="code-textarea"
														onChange={(e) =>
															updateSelectedNode({
																config: {
																	...selectedNode.data.config,
																	code: e.target.value,
																},
															})
														}
														placeholder="// Your code here"
														rows={4}
														value={selectedNode.data.config?.code || ""}
													/>
												</div>
											)}

											{selectedNode.data.type === "notification" && (
												<>
													<div>
														<label
															htmlFor="message-textarea"
															className="mb-1 block font-medium text-sm"
														>
															Message
														</label>
														<Textarea
															id="message-textarea"
															onChange={(e) =>
																updateSelectedNode({
																	config: {
																		...selectedNode.data.config,
																		message: e.target.value,
																	},
																})
															}
															placeholder="Notification message"
															rows={2}
															value={selectedNode.data.config?.message || ""}
														/>
													</div>
													<div>
														<label className="mb-1 block font-medium text-sm">Channel</label>
														<Select
															onValueChange={(value) =>
																updateSelectedNode({
																	config: {
																		...selectedNode.data.config,
																		channel: value,
																	},
																})
															}
															value={selectedNode.data.config?.channel || "email"}
														>
															<SelectTrigger>
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																<SelectItem value="email">Email</SelectItem>
																<SelectItem value="slack">Slack</SelectItem>
																<SelectItem value="webhook">Webhook</SelectItem>
															</SelectContent>
														</Select>
													</div>
												</>
											)}
										</div>
									)}

									{selectedNode.type === "condition" && (
										<div>
											<label className="mb-1 block font-medium text-sm">Condition</label>
											<Input
												onChange={(e) =>
													updateSelectedNode({
														config: {
															...selectedNode.data.config,
															condition: e.target.value,
														},
													})
												}
												placeholder="e.g., $status == 'success'"
												value={selectedNode.data.config?.condition || ""}
											/>
										</div>
									)}

									{selectedNode.type === "wait" && (
										<div>
											<label className="mb-1 block font-medium text-sm">Duration (ms)</label>
											<Input
												onChange={(e) =>
													updateSelectedNode({
														config: {
															...selectedNode.data.config,
															duration: Number.parseInt(e.target.value),
														},
													})
												}
												placeholder="5000"
												type="number"
												value={selectedNode.data.config?.duration || ""}
											/>
										</div>
									)}
								</div>
							</Card>
						)}
					</TabsContent>

					{/* Config Tab */}
					<TabsContent className="h-full space-y-4 p-4" value="config">
						<div>
							<h3 className="mb-3 font-semibold">Workflow Variables</h3>
							<div className="space-y-2">
								<Input placeholder="Variable name" />
								<Input placeholder="Default value" />
								<Button size="sm" variant="outline">
									<Plus className="mr-1 h-4 w-4" />
									Add Variable
								</Button>
							</div>
						</div>

						<div>
							<h3 className="mb-3 font-semibold">Execution Settings</h3>
							<div className="space-y-3">
								<div>
									<label className="mb-1 block font-medium text-sm">Timeout (seconds)</label>
									<Input placeholder="300" type="number" />
								</div>
								<div>
									<label className="mb-1 block font-medium text-sm">Max Parallel Steps</label>
									<Input placeholder="5" type="number" />
								</div>
								<div>
									<label className="mb-1 block font-medium text-sm">Retry Policy</label>
									<Select>
										<SelectTrigger>
											<SelectValue placeholder="Select policy" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="none">No Retry</SelectItem>
											<SelectItem value="linear">Linear Backoff</SelectItem>
											<SelectItem value="exponential">Exponential Backoff</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>

						<div>
							<h3 className="mb-3 font-semibold">Tags</h3>
							<Input
								onChange={(e) =>
									setWorkflow((prev) => ({
										...prev,
										tags: e.target.value
											.split(",")
											.map((tag) => tag.trim())
											.filter(Boolean),
									}))
								}
								placeholder="Add tags (comma-separated)"
								value={workflow.tags.join(", ")}
							/>
							<div className="mt-2 flex flex-wrap gap-1">
								{workflow.tags.map((tag) => (
									<Badge key={tag} variant="outline">
										{tag}
									</Badge>
								))}
							</div>
						</div>
					</TabsContent>

					{/* Execute Tab */}
					<TabsContent className="h-full space-y-4 p-4" value="execute">
						<div className="flex space-x-2">
							<Button className="flex-1" disabled={isExecuting} onClick={executeWorkflow}>
								{isExecuting ? (
									<RefreshCw className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Play className="mr-2 h-4 w-4" />
								)}
								Execute
							</Button>
							<Button variant="outline">
								<Square className="h-4 w-4" />
							</Button>
						</div>

						{executionStatus && (
							<Card className="p-4">
								<div className="mb-2 flex items-center justify-between">
									<span className="font-medium">Execution Status</span>
									<Badge
										variant={
											executionStatus.status === "completed"
												? "default"
												: executionStatus.status === "failed"
													? "destructive"
													: "secondary"
										}
									>
										{executionStatus.status}
									</Badge>
								</div>
								<div className="text-muted-foreground text-sm">
									<div>ID: {executionStatus.executionId}</div>
									<div>Started: {new Date(executionStatus.startedAt).toLocaleString()}</div>
									{executionStatus.progress && (
										<div>Progress: {Math.round(executionStatus.progress * 100)}%</div>
									)}
								</div>
							</Card>
						)}

						<div>
							<h3 className="mb-3 font-semibold">Recent Executions</h3>
							<div className="space-y-2">
								<div className="rounded-lg border p-3">
									<div className="flex items-center justify-between">
										<span className="font-medium text-sm">Execution #123</span>
										<Badge variant="default">Completed</Badge>
									</div>
									<div className="mt-1 text-muted-foreground text-xs">
										2 minutes ago • Duration: 45s
									</div>
								</div>
							</div>
						</div>
					</TabsContent>
				</Tabs>
			</div>

			{/* Main Canvas */}
			<div className="relative flex-1">
				<ReactFlow
					attributionPosition="top-right"
					edges={edges}
					fitView
					nodes={nodes}
					nodeTypes={nodeTypes}
					onConnect={onConnect}
					onEdgesChange={onEdgesChange}
					onNodeClick={onNodeClick}
					onNodesChange={onNodesChange}
				>
					<Controls />
					<MiniMap />
					<Background gap={12} size={1} variant={BackgroundVariant.Dots} />

					{/* Top Panel */}
					<Panel position="top-left">
						<div className="flex items-center space-x-2 rounded-lg border bg-white p-2 shadow">
							<Button onClick={saveWorkflow} size="sm" variant="outline">
								<Save className="mr-1 h-4 w-4" />
								Save
							</Button>
							<Button size="sm" variant="outline">
								<Download className="mr-1 h-4 w-4" />
								Export
							</Button>
							<Button size="sm" variant="outline">
								<Upload className="mr-1 h-4 w-4" />
								Import
							</Button>
						</div>
					</Panel>

					{/* Workflow Info Panel */}
					<Panel position="top-right">
						<Card className="min-w-64 p-3">
							<div className="mb-2 flex items-center space-x-2">
								<Settings className="h-4 w-4" />
								<span className="font-medium">{workflow.name}</span>
							</div>
							<div className="space-y-1 text-muted-foreground text-sm">
								<div>Steps: {nodes.length}</div>
								<div>Connections: {edges.length}</div>
								<div>
									Status:{" "}
									<Badge className="ml-1" variant="outline">
										{workflow.status}
									</Badge>
								</div>
							</div>
						</Card>
					</Panel>
				</ReactFlow>
			</div>
		</div>
	);
}
