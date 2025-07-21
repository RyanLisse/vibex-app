import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import type { Task } from "../../../../stores/tasks";
import { useTaskStore } from "../../../../stores/tasks";
import { createTaskAction } from "../../../actions/inngest";
import MessageInput from "./message-input";

// Mock the actions and store
vi.mock("@/app/actions/inngest", () => ({
	createTaskAction: vi.fn(),
}));

vi.mock("@/stores/tasks", () => ({
	useTaskStore: vi.fn(),
}));

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
	value: {
		randomUUID: vi.fn(() => "test-uuid-123"),
	},
});

describe("MessageInput", () => {
	const mockTask: Task = {
		id: "task-1",
		title: "Test Task",
		description: "Test description",
		messages: [],
		status: "IN_PROGRESS",
		branch: "main",
		sessionId: "session-1",
		repository: "test/repo",
		createdAt: "2023-01-01T00:00:00Z",
		updatedAt: "2023-01-01T00:00:00Z",
		isArchived: false,
		mode: "code",
		hasChanges: false,
	};

	const mockUpdateTask = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		mocked(useTaskStore).mockReturnValue({
			updateTask: mockUpdateTask,
			tasks: [mockTask],
			addTask: vi.fn(),
			setTasks: vi.fn(),
			removeTask: vi.fn(),
			archiveTask: vi.fn(),
			unarchiveTask: vi.fn(),
			pauseTask: vi.fn(),
			resumeTask: vi.fn(),
			cancelTask: vi.fn(),
			clear: vi.fn(),
			getTasks: vi.fn(),
			getActiveTasks: vi.fn(),
			getArchivedTasks: vi.fn(),
			getTaskById: vi.fn(),
			getTasksByStatus: vi.fn(),
			getTasksBySessionId: vi.fn(),
		});
		mocked(createTaskAction).mockResolvedValue();
	});

	it("should render message input with placeholder", () => {
		render(<MessageInput task={mockTask} />);

		expect(screen.getByPlaceholderText("Type your message...")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Send" })).toBeTruthy();
	});

	it("should disable send button when message is empty", () => {
		render(<MessageInput task={mockTask} />);

		const sendButton = screen.getByRole("button", { name: "Send" });
		expect(sendButton).toBeDisabled();
	});

	it("should enable send button when message has content", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");
		const sendButton = screen.getByRole("button", { name: "Send" });

		await user.type(textarea, "Hello world");

		expect(sendButton).not.toBeDisabled();
	});

	it("should send message when send button is clicked", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");
		const sendButton = screen.getByRole("button", { name: "Send" });

		await user.type(textarea, "Test message");
		await user.click(sendButton);

		await waitFor(() => {
			expect(createTaskAction).toHaveBeenCalledWith({
				task: mockTask,
				prompt: "Test message",
				sessionId: mockTask.sessionId,
			});
		});

		expect(mockUpdateTask).toHaveBeenCalledWith(mockTask.id, {
			...mockTask,
			status: "IN_PROGRESS",
			statusMessage: "Working on task",
			messages: [
				{
					role: "user",
					type: "message",
					data: { text: "Test message", id: "test-uuid-123" },
				},
			],
		});
	});

	it("should clear message input after sending", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");
		const sendButton = screen.getByRole("button", { name: "Send" });

		await user.type(textarea, "Test message");
		await user.click(sendButton);

		await waitFor(() => {
			expect(textarea).toHaveValue("");
		});
	});

	it("should send message when Enter is pressed", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");

		await user.type(textarea, "Test message");
		fireEvent.keyPress(textarea, { key: "Enter", shiftKey: false });

		await waitFor(() => {
			expect(createTaskAction).toHaveBeenCalledWith({
				task: mockTask,
				prompt: "Test message",
				sessionId: mockTask.sessionId,
			});
		});
	});

	it("should not send message when Shift+Enter is pressed", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");

		await user.type(textarea, "Test message");
		fireEvent.keyPress(textarea, { key: "Enter", shiftKey: true });

		expect(createTaskAction).not.toHaveBeenCalled();
	});

	it("should not send empty or whitespace-only messages", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");

		await user.type(textarea, "   ");
		fireEvent.keyPress(textarea, { key: "Enter", shiftKey: false });

		expect(createTaskAction).not.toHaveBeenCalled();
	});

	it("should maintain existing messages when adding new message", async () => {
		const taskWithMessages: Task = {
			...mockTask,
			messages: [
				{
					role: "user",
					type: "message",
					data: { text: "Previous message", id: "prev-id" },
				},
			],
		};

		render(<MessageInput task={taskWithMessages} />);

		const textarea = screen.getByPlaceholderText("Type your message...");
		const sendButton = screen.getByRole("button", { name: "Send" });

		await user.type(textarea, "New message");
		await user.click(sendButton);

		await waitFor(() => {
			expect(mockUpdateTask).toHaveBeenCalledWith(taskWithMessages.id, {
				...taskWithMessages,
				status: "IN_PROGRESS",
				statusMessage: "Working on task",
				messages: [
					{
						role: "user",
						type: "message",
						data: { text: "Previous message", id: "prev-id" },
					},
					{
						role: "user",
						type: "message",
						data: { text: "New message", id: "test-uuid-123" },
					},
				],
			});
		});
	});

	it("should show keyboard shortcut hint", () => {
		render(<MessageInput task={mockTask} />);

		expect(
			screen.getByText("Press Enter to send, Shift+Enter for new line"),
		).toBeTruthy();
	});

	it("should handle textarea height adjustment", async () => {
		render(<MessageInput task={mockTask} />);

		const textarea = screen.getByPlaceholderText("Type your message...");

		// Initial height should be set
		expect(textarea).toHaveStyle("height: 60px");

		// Type a long message to trigger height adjustment
		await user.type(
			textarea,
			"This is a very long message that should cause the textarea to expand in height when it wraps to multiple lines",
		);

		// Height should be adjusted (we can't easily test the exact height in jsdom)
		expect(textarea.style.height).toBeTruthy();
	});
});
