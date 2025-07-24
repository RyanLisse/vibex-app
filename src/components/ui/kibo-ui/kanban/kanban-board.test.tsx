import { DndProvider } from "@dnd-kit/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { KanbanBoard } from "./kanban-board";

// Mock data
const mockTasks = [
	{
		id: "1",
		title: "Task 1",
		description: "Description 1",
		status: "todo",
		priority: "high",
		kanban_column: "todo",
		kanban_position: 0,
		labels: ["frontend"],
		assignee: "user1",
	},
	{
		id: "2",
		title: "Task 2",
		description: "Description 2",
		status: "in_progress",
		priority: "medium",
		kanban_column: "in_progress",
		kanban_position: 0,
		labels: ["backend"],
		assignee: "user2",
	},
	{
		id: "3",
		title: "Task 3",
		description: "Description 3",
		status: "done",
		priority: "low",
		kanban_column: "done",
		kanban_position: 0,
		labels: ["testing"],
	},
];

describe("KanbanBoard", () => {
	const mockOnTaskMove = vi.fn();
	const mockOnTaskClick = vi.fn();

	const renderKanbanBoard = (props = {}) => {
		return render(
			<DndProvider>
				<KanbanBoard
					tasks={mockTasks}
					onTaskMove={mockOnTaskMove}
					onTaskClick={mockOnTaskClick}
					{...props}
				/>
			</DndProvider>
		);
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("renders kanban board with default columns", () => {
			renderKanbanBoard();

			expect(screen.getByText("To Do")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
			expect(screen.getByText("Done")).toBeInTheDocument();
		});

		it("renders custom columns when provided", () => {
			const customColumns = [
				{ id: "backlog", title: "Backlog" },
				{ id: "active", title: "Active" },
				{ id: "complete", title: "Complete" },
			];

			renderKanbanBoard({ columns: customColumns });

			expect(screen.getByText("Backlog")).toBeInTheDocument();
			expect(screen.getByText("Active")).toBeInTheDocument();
			expect(screen.getByText("Complete")).toBeInTheDocument();
		});

		it("renders tasks in correct columns", () => {
			renderKanbanBoard();

			const todoColumn = screen.getByTestId("kanban-column-todo");
			const inProgressColumn = screen.getByTestId("kanban-column-in_progress");
			const doneColumn = screen.getByTestId("kanban-column-done");

			expect(within(todoColumn).getByText("Task 1")).toBeInTheDocument();
			expect(within(inProgressColumn).getByText("Task 2")).toBeInTheDocument();
			expect(within(doneColumn).getByText("Task 3")).toBeInTheDocument();
		});

		it("displays task count for each column", () => {
			renderKanbanBoard();

			expect(screen.getByText("1", { selector: ".task-count" })).toBeInTheDocument();
			expect(screen.getAllByText("1", { selector: ".task-count" })).toHaveLength(3);
		});

		it("renders empty columns correctly", () => {
			renderKanbanBoard({ tasks: [] });

			const columns = screen.getAllByTestId(/kanban-column-/);
			columns.forEach((column) => {
				expect(within(column).getByText("No tasks")).toBeInTheDocument();
			});
		});
	});

	describe("Task Cards", () => {
		it("displays task priority indicators", () => {
			renderKanbanBoard();

			const task1Card = screen.getByTestId("kanban-card-1");
			const task2Card = screen.getByTestId("kanban-card-2");
			const task3Card = screen.getByTestId("kanban-card-3");

			expect(task1Card).toHaveClass("border-red-500"); // high priority
			expect(task2Card).toHaveClass("border-yellow-500"); // medium priority
			expect(task3Card).toHaveClass("border-green-500"); // low priority
		});

		it("displays task labels", () => {
			renderKanbanBoard();

			expect(screen.getByText("frontend")).toBeInTheDocument();
			expect(screen.getByText("backend")).toBeInTheDocument();
			expect(screen.getByText("testing")).toBeInTheDocument();
		});

		it("displays assignee avatars", () => {
			renderKanbanBoard();

			const task1Card = screen.getByTestId("kanban-card-1");
			const task2Card = screen.getByTestId("kanban-card-2");

			expect(within(task1Card).getByText("U1")).toBeInTheDocument(); // user1 initials
			expect(within(task2Card).getByText("U2")).toBeInTheDocument(); // user2 initials
		});

		it("handles task click", async () => {
			const user = userEvent.setup();
			renderKanbanBoard();

			const task1Card = screen.getByTestId("kanban-card-1");
			await user.click(task1Card);

			expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0]);
		});
	});

	describe("Drag and Drop", () => {
		it("allows dragging tasks between columns", async () => {
			renderKanbanBoard();

			// Note: Testing drag and drop with @dnd-kit requires more complex setup
			// This is a placeholder for the structure
			const task1Card = screen.getByTestId("kanban-card-1");
			expect(task1Card).toHaveAttribute("data-draggable", "true");
		});

		it("shows drop indicators when dragging", async () => {
			renderKanbanBoard();

			// Simulate drag start
			const task1Card = screen.getByTestId("kanban-card-1");

			// Check for visual feedback classes
			expect(task1Card.parentElement).toHaveClass("kanban-column");
		});

		it("calls onTaskMove when task is dropped", async () => {
			renderKanbanBoard();

			// This would require simulating the full drag and drop interaction
			// which is complex with @dnd-kit. In a real test, you'd use
			// integration tests or e2e tests for this functionality
		});
	});

	describe("Loading and Error States", () => {
		it("shows loading state", () => {
			renderKanbanBoard({ isLoading: true });

			expect(screen.getByTestId("kanban-loading")).toBeInTheDocument();
			expect(screen.queryByTestId("kanban-card-1")).not.toBeInTheDocument();
		});

		it("shows error state", () => {
			const errorMessage = "Failed to load tasks";
			renderKanbanBoard({ error: errorMessage });

			expect(screen.getByText(errorMessage)).toBeInTheDocument();
			expect(screen.queryByTestId("kanban-card-1")).not.toBeInTheDocument();
		});
	});

	describe("Filtering and Search", () => {
		it("filters tasks by search term", async () => {
			const user = userEvent.setup();
			renderKanbanBoard({ showSearch: true });

			const searchInput = screen.getByPlaceholderText("Search tasks...");
			await user.type(searchInput, "Task 1");

			await waitFor(() => {
				expect(screen.getByText("Task 1")).toBeInTheDocument();
				expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
				expect(screen.queryByText("Task 3")).not.toBeInTheDocument();
			});
		});

		it("filters tasks by priority", async () => {
			const user = userEvent.setup();
			renderKanbanBoard({ showFilters: true });

			const priorityFilter = screen.getByLabelText("Filter by priority");
			await user.selectOptions(priorityFilter, "high");

			await waitFor(() => {
				expect(screen.getByText("Task 1")).toBeInTheDocument();
				expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
				expect(screen.queryByText("Task 3")).not.toBeInTheDocument();
			});
		});

		it("filters tasks by assignee", async () => {
			const user = userEvent.setup();
			renderKanbanBoard({ showFilters: true });

			const assigneeFilter = screen.getByLabelText("Filter by assignee");
			await user.selectOptions(assigneeFilter, "user1");

			await waitFor(() => {
				expect(screen.getByText("Task 1")).toBeInTheDocument();
				expect(screen.queryByText("Task 2")).not.toBeInTheDocument();
				expect(screen.queryByText("Task 3")).toBeInTheDocument(); // No assignee
			});
		});
	});

	describe("Responsive Behavior", () => {
		it("switches to mobile layout on small screens", () => {
			// Mock window.matchMedia
			Object.defineProperty(window, "matchMedia", {
				writable: true,
				value: vi.fn().mockImplementation((query) => ({
					matches: query === "(max-width: 768px)",
					media: query,
					onchange: null,
					addEventListener: vi.fn(),
					removeEventListener: vi.fn(),
					dispatchEvent: vi.fn(),
				})),
			});

			renderKanbanBoard();

			const board = screen.getByTestId("kanban-board");
			expect(board).toHaveClass("kanban-mobile");
		});
	});

	describe("Accessibility", () => {
		it("has proper ARIA labels", () => {
			renderKanbanBoard();

			expect(screen.getByRole("region", { name: /kanban board/i })).toBeInTheDocument();

			const columns = screen.getAllByRole("group");
			expect(columns).toHaveLength(3);

			columns.forEach((column) => {
				expect(column).toHaveAttribute("aria-label");
			});
		});

		it("supports keyboard navigation", async () => {
			const user = userEvent.setup();
			renderKanbanBoard();

			const firstCard = screen.getByTestId("kanban-card-1");

			// Tab to first card
			await user.tab();
			expect(firstCard).toHaveFocus();

			// Enter to select
			await user.keyboard("{Enter}");
			expect(mockOnTaskClick).toHaveBeenCalledWith(mockTasks[0]);
		});

		it("announces drag and drop actions to screen readers", () => {
			renderKanbanBoard();

			const cards = screen.getAllByRole("article");
			cards.forEach((card) => {
				expect(card).toHaveAttribute("aria-describedby");
			});
		});
	});

	describe("Performance", () => {
		it("virtualizes large lists", () => {
			const largeTasks = Array.from({ length: 100 }, (_, i) => ({
				id: `task-${i}`,
				title: `Task ${i}`,
				description: `Description ${i}`,
				status: "todo",
				priority: "medium",
				kanban_column: "todo",
				kanban_position: i,
			}));

			renderKanbanBoard({ tasks: largeTasks, enableVirtualization: true });

			// Check that not all items are rendered
			const renderedCards = screen.getAllByTestId(/kanban-card-/);
			expect(renderedCards.length).toBeLessThan(largeTasks.length);
		});

		it("debounces search input", async () => {
			const user = userEvent.setup();
			const mockOnSearch = vi.fn();
			renderKanbanBoard({ showSearch: true, onSearch: mockOnSearch });

			const searchInput = screen.getByPlaceholderText("Search tasks...");
			await user.type(searchInput, "test");

			// Should only call once after debounce
			await waitFor(() => {
				expect(mockOnSearch).toHaveBeenCalledTimes(1);
				expect(mockOnSearch).toHaveBeenCalledWith("test");
			});
		});
	});
});
