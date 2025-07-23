/**
 * Agent Memory Demo Page
 *
 * Demonstrates the agent memory and context system functionality
 */

"use client";

import { BarChart3, Brain, Plus, Search, Settings } from "lucide-react";
import { useState } from "react";
import { AgentMemoryDashboard } from "@/components/agent-memory/AgentMemoryDashboard";
import { MemoryContextViewer } from "@/components/agent-memory/MemoryContextViewer";
import { MemorySearchInterface } from "@/components/agent-memory/MemorySearchInterface";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStoreMemory } from "@/hooks/use-agent-memory";

const SAMPLE_AGENT_TYPES = [
	"code-assistant",
	"code-reviewer",
	"debugger",
	"architect",
	"tester",
	"documentation",
];

const SAMPLE_CONTEXTS = [
	"code-review",
	"debugging",
	"best-practices",
	"architecture",
	"testing",
	"performance",
	"security",
	"documentation",
];

const SAMPLE_MEMORIES = [
	{
		agentType: "code-assistant",
		contextKey: "best-practices",
		content:
			"Always use TypeScript strict mode for better type safety. Enable strictNullChecks and noImplicitAny to catch potential runtime errors at compile time.",
		importance: 8,
	},
	{
		agentType: "code-reviewer",
		contextKey: "code-review",
		content:
			"When reviewing React components, check for proper key props in lists, avoid inline object creation in render methods, and ensure proper cleanup in useEffect hooks.",
		importance: 7,
	},
	{
		agentType: "debugger",
		contextKey: "debugging",
		content:
			"For Next.js API route debugging, always check the request method first, validate input data with Zod, and use proper error handling with try-catch blocks.",
		importance: 6,
	},
	{
		agentType: "architect",
		contextKey: "architecture",
		content:
			"When designing database schemas, consider using UUID primary keys for distributed systems, add proper indexes for query performance, and implement soft deletes for audit trails.",
		importance: 9,
	},
	{
		agentType: "tester",
		contextKey: "testing",
		content:
			"Write integration tests for API routes using supertest, mock external dependencies, and test both success and error scenarios. Use factories for test data generation.",
		importance: 7,
	},
];

export default function AgentMemoryPage() {
	const [selectedAgentType, setSelectedAgentType] = useState("code-assistant");
	const [taskDescription, setTaskDescription] = useState(
		"Implement a new React component with TypeScript"
	);
	const [selectedTab, setSelectedTab] = useState("dashboard");

	// Demo memory creation
	const [newMemory, setNewMemory] = useState({
		agentType: "code-assistant",
		contextKey: "best-practices",
		content: "",
		importance: 5,
	});

	const storeMemoryMutation = useStoreMemory();

	const handleStoreMemory = async () => {
		if (!newMemory.content.trim()) return;

		try {
			await storeMemoryMutation.mutateAsync(newMemory);
			setNewMemory({ ...newMemory, content: "" });
		} catch (error) {
			console.error("Failed to store memory:", error);
		}
	};

	const loadSampleMemories = async () => {
		for (const memory of SAMPLE_MEMORIES) {
			try {
				await storeMemoryMutation.mutateAsync(memory);
			} catch (error) {
				console.error("Failed to load sample memory:", error);
			}
		}
	};

	return (
		<div className="container mx-auto py-8 space-y-8">
			{/* Header */}
			<div className="text-center space-y-4">
				<div className="flex items-center justify-center space-x-2">
					<Brain className="h-8 w-8 text-blue-600" />
					<h1 className="text-3xl font-bold">Agent Memory System</h1>
				</div>
				<p className="text-gray-600 max-w-2xl mx-auto">
					Persistent agent memory with vector embeddings, semantic search, knowledge sharing, and
					automatic context summarization for AI agents.
				</p>
			</div>

			{/* Quick Setup */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Settings className="h-5 w-5" />
						<span>Quick Setup</span>
					</CardTitle>
					<CardDescription>
						Configure agent type and load sample data to get started
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Agent Type</Label>
							<Select value={selectedAgentType} onValueChange={setSelectedAgentType}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SAMPLE_AGENT_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Sample Data</Label>
							<Button
								onClick={loadSampleMemories}
								disabled={storeMemoryMutation.isPending}
								className="w-full"
							>
								{storeMemoryMutation.isPending ? "Loading..." : "Load Sample Memories"}
							</Button>
						</div>
					</div>

					{storeMemoryMutation.isSuccess && (
						<Alert>
							<AlertDescription>
								Sample memories loaded successfully! You can now explore the memory system.
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>

			{/* Quick Memory Creation */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center space-x-2">
						<Plus className="h-5 w-5" />
						<span>Add Memory</span>
					</CardTitle>
					<CardDescription>Quickly add a new memory entry for testing</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Agent Type</Label>
							<Select
								value={newMemory.agentType}
								onValueChange={(value) => setNewMemory({ ...newMemory, agentType: value })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SAMPLE_AGENT_TYPES.map((type) => (
										<SelectItem key={type} value={type}>
											{type.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Context Key</Label>
							<Select
								value={newMemory.contextKey}
								onValueChange={(value) => setNewMemory({ ...newMemory, contextKey: value })}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SAMPLE_CONTEXTS.map((context) => (
										<SelectItem key={context} value={context}>
											{context.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Content</Label>
						<Textarea
							value={newMemory.content}
							onChange={(e) => setNewMemory({ ...newMemory, content: e.target.value })}
							placeholder="Enter memory content..."
							rows={3}
						/>
					</div>
					<div className="space-y-2">
						<Label>Importance (1-10): {newMemory.importance}</Label>
						<input
							type="range"
							min="1"
							max="10"
							value={newMemory.importance}
							onChange={(e) =>
								setNewMemory({ ...newMemory, importance: Number.parseInt(e.target.value) })
							}
							className="w-full"
						/>
					</div>
					<Button
						onClick={handleStoreMemory}
						disabled={!newMemory.content.trim() || storeMemoryMutation.isPending}
						className="w-full"
					>
						{storeMemoryMutation.isPending ? "Storing..." : "Store Memory"}
					</Button>
				</CardContent>
			</Card>

			{/* Main Interface */}
			<Tabs value={selectedTab} onValueChange={setSelectedTab}>
				<TabsList className="grid w-full grid-cols-4">
					<TabsTrigger value="dashboard">
						<BarChart3 className="h-4 w-4 mr-2" />
						Dashboard
					</TabsTrigger>
					<TabsTrigger value="search">
						<Search className="h-4 w-4 mr-2" />
						Search
					</TabsTrigger>
					<TabsTrigger value="context">
						<Brain className="h-4 w-4 mr-2" />
						Context
					</TabsTrigger>
					<TabsTrigger value="demo">
						<Settings className="h-4 w-4 mr-2" />
						Demo
					</TabsTrigger>
				</TabsList>

				<TabsContent value="dashboard" className="mt-6">
					<AgentMemoryDashboard agentType={selectedAgentType} />
				</TabsContent>

				<TabsContent value="search" className="mt-6">
					<MemorySearchInterface agentType={selectedAgentType} />
				</TabsContent>

				<TabsContent value="context" className="mt-6">
					<div className="space-y-4">
						<Card>
							<CardHeader>
								<CardTitle>Task Context Demo</CardTitle>
								<CardDescription>
									See how the agent memory system provides relevant context for new tasks
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<Label>Task Description</Label>
									<Textarea
										value={taskDescription}
										onChange={(e) => setTaskDescription(e.target.value)}
										placeholder="Describe the task the agent will work on..."
										rows={3}
									/>
								</div>
								<div className="flex items-center space-x-2">
									<Badge variant="outline">Agent: {selectedAgentType}</Badge>
									<Badge variant="secondary">Max Memories: 15</Badge>
								</div>
							</CardContent>
						</Card>

						{taskDescription.trim() && (
							<MemoryContextViewer
								agentType={selectedAgentType}
								taskDescription={taskDescription}
								maxMemories={15}
								includePatterns={true}
								includeSummary={true}
							/>
						)}
					</div>
				</TabsContent>

				<TabsContent value="demo" className="mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>System Features</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex items-start space-x-2">
										<div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
										<div>
											<p className="font-medium">Vector Embeddings</p>
											<p className="text-sm text-gray-600">
												Semantic search using vector similarity
											</p>
										</div>
									</div>
									<div className="flex items-start space-x-2">
										<div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
										<div>
											<p className="font-medium">Context Retrieval</p>
											<p className="text-sm text-gray-600">Relevant memories for new tasks</p>
										</div>
									</div>
									<div className="flex items-start space-x-2">
										<div className="w-2 h-2 bg-purple-500 rounded-full mt-2" />
										<div>
											<p className="font-medium">Knowledge Sharing</p>
											<p className="text-sm text-gray-600">Share memories between agent sessions</p>
										</div>
									</div>
									<div className="flex items-start space-x-2">
										<div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
										<div>
											<p className="font-medium">Auto Archival</p>
											<p className="text-sm text-gray-600">Automatic cleanup of old memories</p>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Usage Statistics</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									<div className="flex justify-between">
										<span className="text-sm">Agent Types</span>
										<Badge variant="outline">{SAMPLE_AGENT_TYPES.length}</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm">Context Categories</span>
										<Badge variant="outline">{SAMPLE_CONTEXTS.length}</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm">Sample Memories</span>
										<Badge variant="outline">{SAMPLE_MEMORIES.length}</Badge>
									</div>
									<div className="flex justify-between">
										<span className="text-sm">Vector Dimensions</span>
										<Badge variant="outline">384</Badge>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
