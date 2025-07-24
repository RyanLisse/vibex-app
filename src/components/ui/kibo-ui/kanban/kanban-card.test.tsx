import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KanbanCard } from "./kanban-card";

// Mock task data
const mockTask = {
	id: "task-1",
	title: "Test Task",
	description: "This is a test task description",
	status: "in_progress",
	priority: "high",
	labels: ["frontend", "urgent"],
	assignee: "john.doe",
	dueDate: new Date("2024-12-31"),
	completedAt: null,
	metadata: {
		voiceRecording: {
			originalText: "Create a test task",
			confidence: 0.95,
		},
		screenshot: {
			url: "https://example.com/screenshot.png",
			annotations: [{ type: "arrow", x: 100, y: 100 }],
		},
	},
};

describe("KanbanCard", () => {
	const mockOnClick = vi.fn();
	const mockOnEdit = vi.fn();
	const mockOnDelete = vi.fn();

	const renderCard = (props = {}) => {
		return render(
			<KanbanCard
				task={mockTask}
				onClick={mockOnClick}
				onEdit={mockOnEdit}
				onDelete={mockOnDelete}
				{...props}
			/>
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders task title and description", () => {
			renderCard();

			expect(screen.getByText("Test Task")).toBeInTheDocument();
			expect(screen.getByText("This is a test task description")).toBeInTheDocument();
		});

		it("renders priority indicator with correct color", () => {
			renderCard();

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveClass("border-l-4", "border-red-500"); // high priority
		});

		it("renders different priority colors correctly", () => {
			const priorities = [
				{ priority: "urgent", color: "border-red-600" },
				{ priority: "high", color: "border-red-500" },
				{ priority: "medium", color: "border-yellow-500" },
				{ priority: "low", color: "border-green-500" },
			];

			priorities.forEach(({ priority, color }) => {
				const { container } = renderCard({ task: { ...mockTask, priority } });
				const card = container.querySelector(`[data-testid="kanban-card-${mockTask.id}"]`);
				expect(card).toHaveClass(color);
			});
		});

		it("renders task labels", () => {
			renderCard();

			expect(screen.getByText("frontend")).toBeInTheDocument();
			expect(screen.getByText("urgent")).toBeInTheDocument();
		});

		it("renders assignee avatar with initials", () => {
			renderCard();

			const avatar = screen.getByTestId("assignee-avatar");
			expect(avatar).toHaveTextContent("JD"); // john.doe initials
		});

		it("renders due date", () => {
			renderCard();

			expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
		});

		it("shows overdue indicator for past due dates", () => {
			const pastDate = new Date();
			pastDate.setDate(pastDate.getDate() - 1);

			renderCard({ task: { ...mockTask, dueDate: pastDate } });

			expect(screen.getByText(/Overdue/i)).toBeInTheDocument();
			expect(screen.getByTestId("due-date")).toHaveClass("text-red-600");
		});

		it("renders metadata indicators", () => {
			renderCard();

			expect(screen.getByTestId("voice-indicator")).toBeInTheDocument();
			expect(screen.getByTestId("screenshot-indicator")).toBeInTheDocument();
		});
	});

	describe("Interactions", () => {
		it("handles click event", async () => {
			const user = userEvent.setup();
			renderCard();

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			await user.click(card);

			expect(mockOnClick).toHaveBeenCalledWith(mockTask);
		});

		it("handles edit action", async () => {
			const user = userEvent.setup();
			renderCard({ showActions: true });

			const editButton = screen.getByLabelText("Edit task");
			await user.click(editButton);

			expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
			expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
		});

		it("handles delete action", async () => {
			const user = userEvent.setup();
			renderCard({ showActions: true });

			const deleteButton = screen.getByLabelText("Delete task");
			await user.click(deleteButton);

			expect(mockOnDelete).toHaveBeenCalledWith(mockTask);
			expect(mockOnClick).not.toHaveBeenCalled(); // Should not trigger card click
		});

		it("prevents event bubbling on action buttons", async () => {
			const user = userEvent.setup();
			renderCard({ showActions: true });

			const editButton = screen.getByLabelText("Edit task");
			await user.click(editButton);

			expect(mockOnEdit).toHaveBeenCalled();
			expect(mockOnClick).not.toHaveBeenCalled();
		});
	});

	describe("Conditional Rendering", () => {
		it("hides actions when showActions is false", () => {
			renderCard({ showActions: false });

			expect(screen.queryByLabelText("Edit task")).not.toBeInTheDocument();
			expect(screen.queryByLabelText("Delete task")).not.toBeInTheDocument();
		});

		it("shows compact view when specified", () => {
			renderCard({ compact: true });

			// In compact mode, description should be hidden
			expect(screen.queryByText("This is a test task description")).not.toBeInTheDocument();
			expect(screen.getByText("Test Task")).toBeInTheDocument();
		});

		it("hides metadata in compact mode", () => {
			renderCard({ compact: true });

			expect(screen.queryByTestId("voice-indicator")).not.toBeInTheDocument();
			expect(screen.queryByTestId("screenshot-indicator")).not.toBeInTheDocument();
		});

		it("shows completion indicator for done tasks", () => {
			renderCard({
				task: {
					...mockTask,
					status: "done",
					completedAt: new Date(),
				},
			});

			expect(screen.getByTestId("completion-indicator")).toBeInTheDocument();
			expect(screen.getByText("Test Task")).toHaveClass("line-through");
		});
	});

	describe("Drag and Drop", () => {
		it("renders as draggable when enabled", () => {
			renderCard({ isDraggable: true });

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveAttribute("draggable", "true");
		});

		it("shows drag handle when enabled", () => {
			renderCard({ isDraggable: true, showDragHandle: true });

			expect(screen.getByTestId("drag-handle")).toBeInTheDocument();
		});

		it("applies dragging styles when being dragged", () => {
			renderCard({ isDragging: true });

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveClass("opacity-50");
		});

		it("applies overlay styles when drag is over", () => {
			renderCard({ isDragOverlay: true });

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveClass("shadow-2xl", "rotate-3");
		});
	});

	describe("Loading States", () => {
		it("shows skeleton loader when loading", () => {
			renderCard({ isLoading: true });

			expect(screen.getByTestId("card-skeleton")).toBeInTheDocument();
			expect(screen.queryByText("Test Task")).not.toBeInTheDocument();
		});

		it("shows optimistic update indicator", () => {
			renderCard({ isOptimistic: true });

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveClass("opacity-70");
			expect(screen.getByTestId("optimistic-indicator")).toBeInTheDocument();
		});
	});

	describe("Error States", () => {
		it("shows error indicator on failed operations", () => {
			renderCard({ hasError: true, errorMessage: "Failed to update task" });

			expect(screen.getByTestId("error-indicator")).toBeInTheDocument();
			expect(screen.getByText("Failed to update task")).toBeInTheDocument();
		});

		it("allows retry on error", async () => {
			const user = userEvent.setup();
			const mockOnRetry = vi.fn();

			renderCard({
				hasError: true,
				errorMessage: "Failed to update task",
				onRetry: mockOnRetry,
			});

			const retryButton = screen.getByLabelText("Retry");
			await user.click(retryButton);

			expect(mockOnRetry).toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("has proper ARIA attributes", () => {
			renderCard();

			const card = screen.getByTestId(`kanban-card-${mockTask.id}`);
			expect(card).toHaveAttribute("role", "article");
			expect(card).toHaveAttribute("aria-label", `Task: ${mockTask.title}`);
		});

		it("supports keyboard navigation", async () => {
			const user = userEvent.setup();
			renderCard({ showActions: true });

			// Tab through interactive elements
			await user.tab();
			expect(screen.getByTestId(`kanban-card-${mockTask.id}`)).toHaveFocus();

			await user.keyboard("{Enter}");
			expect(mockOnClick).toHaveBeenCalled();
		});

		it("announces priority to screen readers", () => {
			renderCard();

			expect(screen.getByTestId("priority-indicator")).toHaveAttribute(
				"aria-label",
				"Priority: high"
			);
		});

		it("provides descriptive labels for metadata", () => {
			renderCard();

			expect(screen.getByTestId("voice-indicator")).toHaveAttribute(
				"aria-label",
				"Created by voice with 95% confidence"
			);
			expect(screen.getByTestId("screenshot-indicator")).toHaveAttribute(
				"aria-label",
				"Has screenshot attachment"
			);
		});
	});

	describe("Performance", () => {
		it("memoizes expensive computations", () => {
			const { rerender } = renderCard();

			// Track render count
			let renderCount = 0;
			vi.spyOn(console, "log").mockImplementation((msg) => {
				if (msg === "KanbanCard render") renderCount++;
			});

			// Rerender with same props
			rerender(
				<KanbanCard
					task={mockTask}
					onClick={mockOnClick}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>
			);

			// Should not re-render if props haven't changed
			expect(renderCount).toBe(0);
		});

		it("only updates when necessary props change", () => {
			const { rerender } = renderCard();

			const updatedTask = { ...mockTask, title: "Updated Title" };
			rerender(
				<KanbanCard
					task={updatedTask}
					onClick={mockOnClick}
					onEdit={mockOnEdit}
					onDelete={mockOnDelete}
				/>
			);

			expect(screen.getByText("Updated Title")).toBeInTheDocument();
		});
	});
});
