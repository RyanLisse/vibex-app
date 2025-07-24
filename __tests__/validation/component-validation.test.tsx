/**
 * Component validation tests
 * Ensures all components can be imported and rendered without errors
 */

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
// Error Handling
import { ErrorBoundary } from "@/components/error-boundary";
import { BugReportForm } from "@/components/features/bug-reporting/bug-report-form";
import { ImageAnnotationTools } from "@/components/features/bug-reporting/image-annotation-tools";
// Screenshot Bug Reporting Components
import { QuickBugReportButton } from "@/components/features/bug-reporting/quick-bug-report-button";
import { ScreenshotCapture } from "@/components/features/bug-reporting/screenshot-capture";
// Kanban Components
import { KanbanBoard } from "@/components/features/kanban/kanban-board";
import { KanbanCard } from "@/components/features/kanban/kanban-card";
import { KanbanColumn } from "@/components/features/kanban/kanban-column";
import { TaskFilters } from "@/components/features/kanban/task-filters";
import { PRActionButtons } from "@/components/features/pr-integration/pr-action-buttons";
import { PRLinkingModal } from "@/components/features/pr-integration/pr-linking-modal";
import { PRReviewSummary } from "@/components/features/pr-integration/pr-review-summary";
import { PRStatusBadge } from "@/components/features/pr-integration/pr-status-badge";
// PR Integration Components
import { PRStatusCard } from "@/components/features/pr-integration/pr-status-card";
import { AlertSystem } from "@/components/features/progress-monitoring/alert-system";
// Progress Monitoring Components
import { ProgressDashboard } from "@/components/features/progress-monitoring/progress-dashboard";
import { ProgressIndicator } from "@/components/features/progress-monitoring/progress-indicator";
import { TaskProgressCard } from "@/components/features/progress-monitoring/task-progress-card";
import { TranscriptionProcessor } from "@/components/features/voice-tasks/transcription-processor";
// Voice Task Components
import { VoiceInputButton } from "@/components/features/voice-tasks/voice-input-button";
import { VoiceRecorder } from "@/components/features/voice-tasks/voice-recorder";
import { VoiceTaskForm } from "@/components/features/voice-tasks/voice-task-form";
// Enhanced UI Components
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { FileUpload, FileUploadButton } from "@/components/ui/file-upload";
import { MultiSelect, SimpleMultiSelect } from "@/components/ui/multi-select";
import { prAPI } from "@/src/api/pr-integration";
// API Services
import { taskAPI } from "@/src/api/tasks";
import { websocketService } from "@/src/api/websocket";
import { AppError, ErrorHandler } from "@/src/lib/error-handling";

// Mock browser APIs
Object.defineProperty(window, "navigator", {
	value: {
		mediaDevices: {
			getUserMedia: vi.fn().mockResolvedValue({
				getTracks: () => [{ stop: vi.fn() }],
			}),
			getDisplayMedia: vi.fn().mockResolvedValue({
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

// Mock data for components that require props
const mockTask = {
	taskId: "test-task",
	title: "Test Task",
	description: "Test description",
	status: "todo" as const,
	priority: "medium" as const,
	userId: "user-1",
	tags: [],
	labels: [],
	createdAt: new Date(),
	updatedAt: new Date(),
	createdBy: "user-1",
	screenshots: [],
	linkedPRs: [],
	progress: 50,
	progressHistory: [],
	timeEntries: [],
	comments: [],
	attachments: [],
	dependencies: [],
	blockers: [],
	customFields: {},
};

const mockPR = {
	id: "pr-1",
	number: 123,
	title: "Test PR",
	status: "open" as const,
	author: "test-author",
	assignees: [],
	reviewers: [],
	branch: { source: "feature", target: "main" },
	url: "https://github.com/test/repo/pull/123",
	createdAt: new Date(),
	updatedAt: new Date(),
	checks: { total: 0, passed: 0, failed: 0, pending: 0 },
	reviews: { approved: 0, changesRequested: 0, pending: 0 },
	comments: 0,
	commits: 1,
	additions: 10,
	deletions: 5,
	changedFiles: 2,
	isDraft: false,
	mergeable: true,
	conflicted: false,
	labels: [],
};

describe("Component Validation Tests", () => {
	describe("Screenshot Bug Reporting Components", () => {
		it("should render QuickBugReportButton", () => {
			const { container } = render(<QuickBugReportButton />);
			expect(container).toBeTruthy();
		});

		it("should render ScreenshotCapture", () => {
			const { container } = render(<ScreenshotCapture onCapture={vi.fn()} onCancel={vi.fn()} />);
			expect(container).toBeTruthy();
		});

		it("should render ImageAnnotationTools", () => {
			const { container } = render(
				<ImageAnnotationTools imageUrl="data:image/png;base64,test" onAnnotationsChange={vi.fn()} />
			);
			expect(container).toBeTruthy();
		});

		it("should render BugReportForm", () => {
			const { container } = render(
				<BugReportForm
					screenshot="data:image/png;base64,test"
					onSubmit={vi.fn()}
					onCancel={vi.fn()}
				/>
			);
			expect(container).toBeTruthy();
		});
	});

	describe("Voice Task Components", () => {
		it("should render VoiceInputButton", () => {
			const { container } = render(<VoiceInputButton onVoiceInput={vi.fn()} />);
			expect(container).toBeTruthy();
		});

		it("should render VoiceRecorder", () => {
			const { container } = render(
				<VoiceRecorder onRecordingComplete={vi.fn()} onError={vi.fn()} />
			);
			expect(container).toBeTruthy();
		});

		it("should render TranscriptionProcessor", () => {
			const { container } = render(
				<TranscriptionProcessor
					audioBlob={new Blob(["test"], { type: "audio/wav" })}
					onTranscriptionComplete={vi.fn()}
					onError={vi.fn()}
				/>
			);
			expect(container).toBeTruthy();
		});

		it("should render VoiceTaskForm", () => {
			const { container } = render(
				<VoiceTaskForm transcription="Test transcription" onSubmit={vi.fn()} />
			);
			expect(container).toBeTruthy();
		});
	});

	describe("Kanban Components", () => {
		it("should render KanbanBoard", () => {
			const { container } = render(<KanbanBoard columns={[]} />);
			expect(container).toBeTruthy();
		});

		it("should render KanbanColumn", () => {
			const column = { id: "test", title: "Test", tasks: [] };
			const { container } = render(<KanbanColumn column={column} />);
			expect(container).toBeTruthy();
		});

		it("should render KanbanCard", () => {
			const { container } = render(<KanbanCard task={mockTask} />);
			expect(container).toBeTruthy();
		});

		it("should render TaskFilters", () => {
			const filters = { search: "", priority: "", assignee: "", labels: [] };
			const { container } = render(
				<TaskFilters
					filters={filters}
					onFiltersChange={vi.fn()}
					availableAssignees={[]}
					availableLabels={[]}
				/>
			);
			expect(container).toBeTruthy();
		});
	});

	describe("Progress Monitoring Components", () => {
		it("should render ProgressDashboard", () => {
			const stats = {
				totalTasks: 0,
				completedTasks: 0,
				inProgressTasks: 0,
				blockedTasks: 0,
				overdueTasks: 0,
				totalProgress: 0,
				velocity: 0,
				burndownData: [],
			};
			const { container } = render(<ProgressDashboard tasks={[]} projectStats={stats} />);
			expect(container).toBeTruthy();
		});

		it("should render TaskProgressCard", () => {
			const taskProgress = {
				...mockTask,
				id: mockTask.taskId,
			};
			const { container } = render(<TaskProgressCard task={taskProgress} />);
			expect(container).toBeTruthy();
		});

		it("should render ProgressIndicator", () => {
			const { container } = render(<ProgressIndicator progress={50} />);
			expect(container).toBeTruthy();
		});

		it("should render AlertSystem", () => {
			const { container } = render(<AlertSystem alerts={[]} onDismiss={vi.fn()} />);
			expect(container).toBeTruthy();
		});
	});

	describe("PR Integration Components", () => {
		it("should render PRStatusCard", () => {
			const { container } = render(<PRStatusCard pr={mockPR} />);
			expect(container).toBeTruthy();
		});

		it("should render PRStatusBadge", () => {
			const { container } = render(<PRStatusBadge status="open" />);
			expect(container).toBeTruthy();
		});

		it("should render PRReviewSummary", () => {
			const reviews = { approved: 0, changesRequested: 0, pending: 0 };
			const { container } = render(<PRReviewSummary reviews={reviews} reviewers={[]} />);
			expect(container).toBeTruthy();
		});

		it("should render PRActionButtons", () => {
			const { container } = render(<PRActionButtons pr={mockPR} />);
			expect(container).toBeTruthy();
		});

		it("should render PRLinkingModal", () => {
			const { container } = render(
				<PRLinkingModal
					isOpen={false}
					onClose={vi.fn()}
					onLink={vi.fn()}
					taskId="test-task"
					taskTitle="Test Task"
					availablePRs={[]}
					linkedPRs={[]}
				/>
			);
			expect(container).toBeTruthy();
		});
	});

	describe("Enhanced UI Components", () => {
		it("should render DatePicker", () => {
			const { container } = render(<DatePicker />);
			expect(container).toBeTruthy();
		});

		it("should render DateRangePicker", () => {
			const { container } = render(<DateRangePicker />);
			expect(container).toBeTruthy();
		});

		it("should render MultiSelect", () => {
			const { container } = render(<MultiSelect options={[]} selected={[]} onChange={vi.fn()} />);
			expect(container).toBeTruthy();
		});

		it("should render SimpleMultiSelect", () => {
			const { container } = render(
				<SimpleMultiSelect options={[]} selected={[]} onChange={vi.fn()} />
			);
			expect(container).toBeTruthy();
		});

		it("should render FileUpload", () => {
			const { container } = render(<FileUpload onFilesChange={vi.fn()} />);
			expect(container).toBeTruthy();
		});

		it("should render FileUploadButton", () => {
			const { container } = render(<FileUploadButton onFileChange={vi.fn()} />);
			expect(container).toBeTruthy();
		});
	});

	describe("API Services", () => {
		it("should have taskAPI with all required methods", () => {
			expect(taskAPI).toBeDefined();
			expect(typeof taskAPI.getTasks).toBe("function");
			expect(typeof taskAPI.getTask).toBe("function");
			expect(typeof taskAPI.createTask).toBe("function");
			expect(typeof taskAPI.updateTask).toBe("function");
			expect(typeof taskAPI.deleteTask).toBe("function");
		});

		it("should have prAPI with all required methods", () => {
			expect(prAPI).toBeDefined();
			expect(typeof prAPI.getPRs).toBe("function");
			expect(typeof prAPI.getPR).toBe("function");
			expect(typeof prAPI.linkPRToTask).toBe("function");
			expect(typeof prAPI.unlinkPRFromTask).toBe("function");
		});

		it("should have websocketService with all required methods", () => {
			expect(websocketService).toBeDefined();
			expect(typeof websocketService.connect).toBe("function");
			expect(typeof websocketService.disconnect).toBe("function");
			expect(typeof websocketService.on).toBe("function");
			expect(typeof websocketService.send).toBe("function");
		});
	});

	describe("Error Handling", () => {
		it("should render ErrorBoundary", () => {
			const { container } = render(
				<ErrorBoundary>
					<div>Test content</div>
				</ErrorBoundary>
			);
			expect(container).toBeTruthy();
		});

		it("should create AppError instances", () => {
			const error = new AppError({
				message: "Test error",
				code: "TEST_ERROR",
			});
			expect(error).toBeInstanceOf(AppError);
			expect(error.message).toBe("Test error");
			expect(error.code).toBe("TEST_ERROR");
		});

		it("should handle errors with ErrorHandler", () => {
			const error = new Error("Test error");
			const appError = ErrorHandler.handle(error);
			expect(appError).toBeInstanceOf(AppError);
		});
	});
});
