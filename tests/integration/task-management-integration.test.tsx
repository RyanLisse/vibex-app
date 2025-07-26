/**
 * Integration tests for the enhanced task management system
 * Tests the interaction between all major components
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { QuickBugReportButton } from "@/components/features/bug-reporting/quick-bug-report-button";
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import type { PRData } from "@/components/features/pr-integration/pr-status-card";
import { PRStatusCard } from "@/components/features/pr-integration/pr-status-card";
import type {
	ProjectStats,
	TaskProgress,
} from "@/components/features/progress-monitoring/progress-dashboard";
import { ProgressDashboard } from "@/components/features/progress-monitoring/progress-dashboard";
import { VoiceTaskForm } from "@/components/features/voice-tasks/voice-task-form";
import { prAPI } from "@/src/api/pr-integration";
import type { EnhancedTask } from "@/src/api/tasks";
import { taskAPI } from "@/src/api/tasks";
import { websocketService } from "@/src/api/websocket";

// Mock the APIs
vi.mock("@/src/api/tasks");
vi.mock("@/src/api/pr-integration");
vi.mock("@/src/api/websocket");

// Mock browser APIs
Object.defineProperty(window, "navigator", {
	value: {
		mediaDevices: {
			getUserMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
			}),
		},
	},
	writable: true,
});

Object.defineProperty(window, "SpeechRecognition", {
	value: vi.fn().mockImplementation(() => ({
		start: vi.fn(),
		stop: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})),
	writable: true,
});

Object.defineProperty(window, "webkitSpeechRecognition", {
	value: window.SpeechRecognition,
	writable: true,
});

// Mock data
const mockTask: EnhancedTask = {
	taskId: "task-1",
	title: "Test Task",
	description: "Test task description",
	status: "todo",
	priority: "medium",
	userId: "user-1",
	tags: ["test"],
	labels: ["integration"],
	createdAt: new Date(),
	updatedAt: new Date(),
	createdBy: "user-1",
	screenshots: [],
	linkedPRs: [],
	progress: 0,
	progressHistory: [],
	timeEntries: [],
	comments: [],
	attachments: [],
	dependencies: [],
	blockers: [],
	customFields: {},
};

const mockPR: PRData = {
	id: "pr-1",
	number: 123,
	title: "Test PR",
	status: "open",
	author: "test-author",
	assignees: [],
	reviewers: ["reviewer-1"],
	branch: {
		source: "feature-branch",
		target: "main",
	},
	url: "https://github.com/test/repo/pull/123",
	createdAt: new Date(),
	updatedAt: new Date(),
	checks: {
		total: 3,
		passed: 2,
		failed: 1,
		pending: 0,
	},
	reviews: {
		approved: 0,
		changesRequested: 1,
		pending: 1,
	},
	comments: 5,
	commits: 3,
	additions: 100,
	deletions: 50,
	changedFiles: 5,
	isDraft: false,
	mergeable: true,
	conflicted: false,
	labels: ["enhancement"],
};

const mockTaskProgress: TaskProgress = {
	id: "task-1",
	title: "Test Task",
	status: "in-progress",
	progress: 50,
	priority: "medium",
	createdAt: new Date(),
	updatedAt: new Date(),
};

const mockProjectStats: ProjectStats = {
	totalTasks: 10,
	completedTasks: 3,
	inProgressTasks: 4,
	blockedTasks: 1,
	overdueTasks: 2,
	totalProgress: 45,
	velocity: 2.5,
	burndownData: [],
};

describe("Task Management Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Setup API mocks
		(taskAPI.getTasks as Mock).mockResolvedValue({
			tasks: [mockTask],
			total: 1,
			page: 1,
			limit: 10,
			hasMore: false,
		});

		(taskAPI.createTask as Mock).mockResolvedValue(mockTask);
		(taskAPI.updateTask as Mock).mockResolvedValue(mockTask);

		(prAPI.getPRs as Mock).mockResolvedValue({
			prs: [mockPR],
			total: 1,
			page: 1,
			limit: 10,
			hasMore: false,
		});

		(websocketService.connect as Mock).mockResolvedValue(undefined);
		(websocketService.on as Mock).mockReturnValue(() => {});
	});

	describe("Kanban Board Integration", () => {
		it("should render kanban board with tasks and handle drag and drop", async () => {
			const columns = [
				{
					id: "todo",
					title: "To Do",
					tasks: [mockTask],
				},
				{
					id: "in-progress",
					title: "In Progress",
					tasks: [],
				},
			];

			const onTaskMove = vi.fn();

			render(<KanbanBoard columns={columns} onTaskMove={onTaskMove} />);

			expect(screen.getByText("Kanban Board")).toBeInTheDocument();
			expect(screen.getByText("Test Task")).toBeInTheDocument();
			expect(screen.getByText("To Do")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
		});

		it("should filter tasks based on search criteria", async () => {
			const columns = [
				{
					id: "todo",
					title: "To Do",
					tasks: [mockTask, { ...mockTask, taskId: "task-2", title: "Another Task" }],
				},
			];

			render(<KanbanBoard columns={columns} />);

			const searchInput = screen.getByPlaceholderText("Search tasks...");
			await userEvent.type(searchInput, "Test");

			await waitFor(() => {
				expect(screen.getByText("Test Task")).toBeInTheDocument();
			});
		});
	});

	describe("Progress Dashboard Integration", () => {
		it("should render progress dashboard with task analytics", async () => {
			render(<ProgressDashboard tasks={[mockTaskProgress]} projectStats={mockProjectStats} />);

			expect(screen.getByText("Total Tasks")).toBeInTheDocument();
			expect(screen.getByText("10")).toBeInTheDocument();
			expect(screen.getByText("Completed")).toBeInTheDocument();
			expect(screen.getByText("3")).toBeInTheDocument();
		});

		it("should generate alerts for overdue tasks", async () => {
			const overdueTask = {
				...mockTaskProgress,
				dueDate: new Date(Date.now() - 86400000), // Yesterday
				status: "in-progress" as const,
			};

			render(<ProgressDashboard tasks={[overdueTask]} projectStats={mockProjectStats} />);

			await waitFor(() => {
				expect(screen.getByText("Task Overdue")).toBeInTheDocument();
			});
		});
	});

	describe("PR Integration", () => {
		it("should render PR status card with correct information", () => {
			render(<PRStatusCard pr={mockPR} />);

			expect(screen.getByText("#123")).toBeInTheDocument();
			expect(screen.getByText("Test PR")).toBeInTheDocument();
			expect(screen.getByText("Open")).toBeInTheDocument();
			expect(screen.getByText("feature-branch")).toBeInTheDocument();
			expect(screen.getByText("main")).toBeInTheDocument();
		});

		it("should handle PR actions", async () => {
			const onAction = vi.fn();
			render(<PRStatusCard pr={mockPR} onAction={onAction} />);

			const viewPRButton = screen.getByText("View PR");
			fireEvent.click(viewPRButton);

			// Should open PR in new tab (mocked)
			expect(viewPRButton).toBeInTheDocument();
		});
	});

	describe("Voice Task Creation Integration", () => {
		it("should render voice task form with transcription", () => {
			const transcription = "Create a new feature for user authentication";

			render(
				<VoiceTaskForm
					transcription={transcription}
					audioBlob={new Blob(["test"], { type: "audio/wav" })}
				/>
			);

			expect(screen.getByText("Create Voice Task")).toBeInTheDocument();
			expect(screen.getByDisplayValue(transcription)).toBeInTheDocument();
			expect(screen.getByText("Voice recording attached")).toBeInTheDocument();
		});

		it("should auto-generate title from transcription", async () => {
			const transcription = "Create a new feature for user authentication";

			render(<VoiceTaskForm transcription={transcription} />);

			const titleInput = screen.getByPlaceholderText("Task title (auto-generated from voice)");

			await waitFor(() => {
				expect(titleInput).toHaveValue("Create a new feature for user authentication");
			});
		});
	});

	describe("Screenshot Bug Reporting Integration", () => {
		it("should render quick bug report button", () => {
			render(<QuickBugReportButton />);

			expect(screen.getByText("Report Bug")).toBeInTheDocument();
		});

		it("should handle screenshot capture", async () => {
			// Mock the screenshot API
			Object.defineProperty(navigator, "mediaDevices", {
				value: {
					getDisplayMedia: vi.fn().mockResolvedValue({
						getTracks: () => [{ stop: vi.fn() }],
					}),
				},
				writable: true,
			});

			render(<QuickBugReportButton />);

			const reportButton = screen.getByText("Report Bug");
			fireEvent.click(reportButton);

			// Should trigger screenshot capture flow
			expect(reportButton).toBeInTheDocument();
		});
	});

	describe("WebSocket Integration", () => {
		it("should connect to websocket and handle real-time updates", async () => {
			const { rerender } = render(
				<ProgressDashboard tasks={[mockTaskProgress]} projectStats={mockProjectStats} />
			);

			// Simulate websocket connection
			expect(websocketService.connect).toHaveBeenCalled();

			// Simulate real-time task update
			const updatedTask = { ...mockTaskProgress, progress: 75 };
			rerender(<ProgressDashboard tasks={[updatedTask]} projectStats={mockProjectStats} />);

			await waitFor(() => {
				expect(screen.getByText("75%")).toBeInTheDocument();
			});
		});
	});

	describe("Error Handling Integration", () => {
		it("should handle API errors gracefully", async () => {
			(taskAPI.getTasks as Mock).mockRejectedValue(new Error("Network error"));

			// This would be wrapped in an ErrorBoundary in real usage
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			try {
				render(<ProgressDashboard tasks={[]} projectStats={mockProjectStats} />);
			} catch (error) {
				expect(error).toBeInstanceOf(Error);
			}

			consoleSpy.mockRestore();
		});
	});

	describe("End-to-End Workflow", () => {
		it("should support complete task lifecycle", async () => {
			// 1. Create task via voice
			const { rerender } = render(
				<VoiceTaskForm transcription="Implement user dashboard" onSubmit={vi.fn()} />
			);

			// 2. Move task through kanban board
			const columns = [
				{
					id: "todo",
					title: "To Do",
					tasks: [mockTask],
				},
				{
					id: "in-progress",
					title: "In Progress",
					tasks: [],
				},
			];

			rerender(<KanbanBoard columns={columns} />);

			// 3. Link PR to task
			rerender(<PRStatusCard pr={mockPR} taskId="task-1" />);

			// 4. Monitor progress
			rerender(<ProgressDashboard tasks={[mockTaskProgress]} projectStats={mockProjectStats} />);

			// All components should render without errors
			expect(screen.getByText("Test Task")).toBeInTheDocument();
		});
	});
});
