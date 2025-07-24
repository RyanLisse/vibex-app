"use client";

/**
 * Task Management Hub - Main Interface
 * Integrated task management interface with all enhanced features:
 * - Voice task creation
 * - Screenshot bug reporting
 * - Kanban board visualization
 * - PR status integration
 * - Real-time progress monitoring
 */

import { BarChart3, Camera, Columns, List, Mic, Plus, RefreshCw, Settings } from "lucide-react";
import { useCallback, useState } from "react";
// Import enhanced components
import { EnhancedTaskList } from "@/components/enhanced-task-list";
import { ScreenshotCapture } from "@/components/features/bug-reporting/screenshot-capture";
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import { ProgressDashboard } from "@/components/features/progress/progress-dashboard";
import { TaskCreateModal } from "@/components/features/task-creation/task-create-modal";
import { VoiceRecorder } from "@/components/features/voice-tasks/voice-recorder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TaskManagementHubProps {
	className?: string;
	defaultView?: "list" | "kanban" | "progress";
	showCreateButtons?: boolean;
}

export function TaskManagementHub({
	className = "",
	defaultView = "list",
	showCreateButtons = true,
}: TaskManagementHubProps) {
	const [activeView, setActiveView] = useState(defaultView);
	const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
	const [showScreenshotCapture, setShowScreenshotCapture] = useState(false);
	const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
	const [taskStats, setTaskStats] = useState({
		total: 0,
		pending: 0,
		inProgress: 0,
		completed: 0,
		overdue: 0,
	});

	// Mock data for kanban board
	const [kanbanColumns] = useState([
		{ id: "pending", title: "To Do", color: "#f3f4f6" },
		{ id: "in-progress", title: "In Progress", color: "#dbeafe" },
		{ id: "review", title: "Review", color: "#fef3c7" },
		{ id: "completed", title: "Done", color: "#d1fae5" },
	]);

	const [kanbanTasks] = useState([
		{
			id: "1",
			title: "Fix login bug",
			description: "Users can't log in with social auth",
			status: "pending",
			priority: "high" as const,
			assignee: "John Doe",
			labels: ["bug", "urgent"],
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		{
			id: "2",
			title: "Add dark mode",
			description: "Implement dark mode toggle",
			status: "in-progress",
			priority: "medium" as const,
			assignee: "Jane Smith",
			labels: ["feature"],
			createdAt: new Date(),
			updatedAt: new Date(),
		},
	]);

	const handleVoiceRecording = useCallback(async (audioBlob: Blob) => {
		console.log("Voice recording completed:", audioBlob);
		// Here you would send the audio to the voice API
		setShowVoiceRecorder(false);
	}, []);

	const handleScreenshotCapture = useCallback(async (screenshot: File, annotations: any[]) => {
		console.log("Screenshot captured:", screenshot, annotations);
		// Here you would send the screenshot to the screenshot API
		setShowScreenshotCapture(false);
	}, []);

	const handleTaskMove = useCallback((taskId: string, fromColumn: string, toColumn: string) => {
		console.log("Task moved:", taskId, fromColumn, "->", toColumn);
		// Here you would update the task status via API
	}, []);

	const QuickActions = () => (
		<div className="flex items-center space-x-2">
			<Button
				variant="outline"
				size="sm"
				onClick={() => setShowTaskCreateModal(true)}
				className="flex items-center space-x-2"
			>
				<Plus className="h-4 w-4" />
				<span>New Task</span>
			</Button>

			{showCreateButtons && (
				<>
					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowVoiceRecorder(true)}
						className="flex items-center space-x-2"
					>
						<Mic className="h-4 w-4" />
						<span>Voice Task</span>
					</Button>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setShowScreenshotCapture(true)}
						className="flex items-center space-x-2"
					>
						<Camera className="h-4 w-4" />
						<span>Bug Report</span>
					</Button>
				</>
			)}

			<Button variant="outline" size="sm">
				<RefreshCw className="h-4 w-4" />
			</Button>
		</div>
	);

	const TaskStatsBar = () => (
		<div className="flex items-center space-x-6 p-4 bg-gray-50 rounded-lg">
			<div className="flex items-center space-x-2">
				<span className="text-sm font-medium">Total:</span>
				<Badge variant="outline">{taskStats.total}</Badge>
			</div>
			<div className="flex items-center space-x-2">
				<span className="text-sm font-medium">Pending:</span>
				<Badge variant="secondary">{taskStats.pending}</Badge>
			</div>
			<div className="flex items-center space-x-2">
				<span className="text-sm font-medium">In Progress:</span>
				<Badge className="bg-blue-100 text-blue-800">{taskStats.inProgress}</Badge>
			</div>
			<div className="flex items-center space-x-2">
				<span className="text-sm font-medium">Completed:</span>
				<Badge className="bg-green-100 text-green-800">{taskStats.completed}</Badge>
			</div>
			{taskStats.overdue > 0 && (
				<div className="flex items-center space-x-2">
					<span className="text-sm font-medium">Overdue:</span>
					<Badge variant="destructive">{taskStats.overdue}</Badge>
				</div>
			)}
		</div>
	);

	return (
		<div className={`space-y-6 ${className}`}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Task Management</h1>
					<p className="text-muted-foreground">
						Manage tasks with voice input, screenshots, and real-time collaboration
					</p>
				</div>
				<QuickActions />
			</div>

			{/* Stats Bar */}
			<TaskStatsBar />

			{/* Main Content */}
			<Tabs value={activeView} onValueChange={setActiveView} className="w-full">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="list" className="flex items-center space-x-2">
						<List className="h-4 w-4" />
						<span>List View</span>
					</TabsTrigger>
					<TabsTrigger value="kanban" className="flex items-center space-x-2">
						<Columns className="h-4 w-4" />
						<span>Kanban Board</span>
					</TabsTrigger>
					<TabsTrigger value="progress" className="flex items-center space-x-2">
						<BarChart3 className="h-4 w-4" />
						<span>Progress</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="list" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Task List</CardTitle>
						</CardHeader>
						<CardContent>
							<EnhancedTaskList
								showCreateButton={false}
								onTaskClick={(task) => console.log("Task clicked:", task)}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="kanban" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Kanban Board</CardTitle>
						</CardHeader>
						<CardContent>
							<KanbanBoard
								columns={kanbanColumns}
								tasks={kanbanTasks}
								onTaskMove={handleTaskMove}
							/>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="progress" className="space-y-4">
					<ProgressDashboard />
				</TabsContent>
			</Tabs>

			{/* Modals */}
			<Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Create Task with Voice</DialogTitle>
					</DialogHeader>
					<VoiceRecorder
						onRecordingComplete={handleVoiceRecording}
						onError={(error) => console.error("Voice recording error:", error)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={showScreenshotCapture} onOpenChange={setShowScreenshotCapture}>
				<DialogContent className="max-w-6xl">
					<ScreenshotCapture
						onScreenshotCapture={handleScreenshotCapture}
						onClose={() => setShowScreenshotCapture(false)}
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={showTaskCreateModal} onOpenChange={setShowTaskCreateModal}>
				<DialogContent className="max-w-2xl">
					<DialogHeader>
						<DialogTitle>Create New Task</DialogTitle>
					</DialogHeader>
					<TaskCreateModal
						onTaskCreate={(task) => {
							console.log("Task created:", task);
							setShowTaskCreateModal(false);
						}}
						onCancel={() => setShowTaskCreateModal(false)}
					/>
				</DialogContent>
			</Dialog>
		</div>
	);
}

export default TaskManagementHub;
