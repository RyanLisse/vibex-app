/**
 * @vitest-environment jsdom
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

// Components to be implemented
import { KanbanBoard } from "../../../components/features/kanban/kanban-board";
import { KanbanColumn } from "../../../components/features/kanban/kanban-column";
import { KanbanCard } from "../../../components/features/kanban/kanban-card";
import { TaskFilters } from "../../../components/features/kanban/task-filters";

// Types
import type {
	KanbanTask,
	KanbanColumn as KanbanColumnType,
} from "../../../src/schemas/enhanced-task-schemas";

// Mock data
const mockTasks: KanbanTask[] = [
	{
		id: "task-1",
		name: "Fix login bug",
		column: "todo",
		priority: "high",
		assignee: "John Doe",
		tags: ["bug", "frontend"],
		dueDate: new Date("2024-01-15"),
	},
	{
		id: "task-2",
		name: "Add user profile page",
		column: "in-progress",
		priority: "medium",
		assignee: "Jane Smith",
		tags: ["feature", "frontend"],
	},
	{
		id: "task-3",
		name: "Update documentation",
		column: "done",
		priority: "low",
		assignee: "Bob Wilson",
		tags: ["docs"],
	},
	{
		id: "task-4",
		name: "Database optimization",
		column: "todo",
		priority: "urgent",
		assignee: "Alice Brown",
		tags: ["backend", "performance"],
		dueDate: new Date("2024-01-10"),
	},
];

const mockColumns: KanbanColumnType[] = [
	{ id: "todo", name: "To Do", color: "#f3f4f6" },
	{ id: "in-progress", name: "In Progress", maxItems: 3, color: "#fef3c7" },
	{ id: "review", name: "Review", color: "#dbeafe" },
	{ id: "done", name: "Done", color: "#d1fae5" },
];

// Wrapper component for DnD
const DnDWrapper = ({ children }: { children: React.ReactNode }) => (
	<DndProvider backend={HTML5Backend}>{children}</DndProvider>
);

describe("Kanban Board Feature", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("KanbanBoard", () => {
		it("should render kanban board with columns", () => {
			render(
				<DnDWrapper>
					<KanbanBoard
						tasks={mockTasks}
						columns={mockColumns}
						onTaskMove={vi.fn()}
					/>
				</DnDWrapper>,
			);

			expect(screen.getByText("To Do")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
			expect(screen.getByText("Review")).toBeInTheDocument();
			expect(screen.getByText("Done")).toBeInTheDocument();
		});

		it("should organize tasks by column", () => {
			render(
				<DnDWrapper>
					<KanbanBoard
						tasks={mockTasks}
						columns={mockColumns}
						onTaskMove={vi.fn()}
					/>
				</DnDWrapper>,
			);

			// Check tasks are in correct columns
			const todoColumn = screen.getByTestId("column-todo");
			const inProgressColumn = screen.getByTestId("column-in-progress");
			const doneColumn = screen.getByTestId("column-done");

			expect(todoColumn).toContainElement(screen.getByText("Fix login bug"));
			expect(todoColumn).toContainElement(
				screen.getByText("Database optimization"),
			);
			expect(inProgressColumn).toContainElement(
				screen.getByText("Add user profile page"),
			);
			expect(doneColumn).toContainElement(
				screen.getByText("Update documentation"),
			);
		});

		it("should show task count for each column", () => {
			render(
				<DnDWrapper>
					<KanbanBoard
						tasks={mockTasks}
						columns={mockColumns}
						onTaskMove={vi.fn()}
					/>
				</DnDWrapper>,
			);

			expect(screen.getByText("To Do (2)")).toBeInTheDocument();
			expect(screen.getByText("In Progress (1)")).toBeInTheDocument();
			expect(screen.getByText("Done (1)")).toBeInTheDocument();
		});

		it("should handle task movement between columns", async () => {
			const mockOnTaskMove = vi.fn();

			render(
				<DnDWrapper>
					<KanbanBoard
						tasks={mockTasks}
						columns={mockColumns}
						onTaskMove={mockOnTaskMove}
					/>
				</DnDWrapper>,
			);

			// Simulate drag and drop (simplified - real implementation would use react-dnd testing utils)
			const taskCard = screen.getByTestId("task-card-task-1");
			const reviewColumn = screen.getByTestId("column-review");

			// Simulate DnD events
			fireEvent.dragStart(taskCard);
			fireEvent.dragEnter(reviewColumn);
			fireEvent.dragOver(reviewColumn);
			fireEvent.drop(reviewColumn);

			expect(mockOnTaskMove).toHaveBeenCalledWith({
				taskId: "task-1",
				fromColumn: "todo",
				toColumn: "review",
				newOrder: expect.any(Number),
			});
		});

		it("should prevent dropping in full columns", async () => {
			const tasksWithFullColumn = [
				...mockTasks,
				{
					id: "task-5",
					name: "Task 5",
					column: "in-progress",
					priority: "medium" as const,
					assignee: "User 5",
					tags: [],
				},
				{
					id: "task-6",
					name: "Task 6",
					column: "in-progress",
					priority: "medium" as const,
					assignee: "User 6",
					tags: [],
				},
				{
					id: "task-7",
					name: "Task 7",
					column: "in-progress",
					priority: "medium" as const,
					assignee: "User 7",
					tags: [],
				},
			];

			const mockOnTaskMove = vi.fn();

			render(
				<DnDWrapper>
					<KanbanBoard
						tasks={tasksWithFullColumn}
						columns={mockColumns}
						onTaskMove={mockOnTaskMove}
					/>
				</DnDWrapper>,
			);

			// Try to move task to full column (In Progress has maxItems: 3)
			const taskCard = screen.getByTestId("task-card-task-1");
			const inProgressColumn = screen.getByTestId("column-in-progress");

			fireEvent.dragStart(taskCard);
			fireEvent.dragEnter(inProgressColumn);
			fireEvent.drop(inProgressColumn);

			expect(mockOnTaskMove).not.toHaveBeenCalled();
			expect(screen.getByText(/column is full/i)).toBeInTheDocument();
		});
	});

	describe("KanbanColumn", () => {
		const todoTasks = mockTasks.filter((task) => task.column === "todo");
		const todoColumn = mockColumns.find((col) => col.id === "todo")!;

		it("should render column with tasks", () => {
			render(
				<DnDWrapper>
					<KanbanColumn
						column={todoColumn}
						tasks={todoTasks}
						onTaskMove={vi.fn()}
					/>
				</DnDWrapper>,
			);

			expect(screen.getByText("To Do")).toBeInTheDocument();
			expect(screen.getByText("Fix login bug")).toBeInTheDocument();
			expect(screen.getByText("Database optimization")).toBeInTheDocument();
		});

		it("should show overload indicator when column is full", () => {
			const inProgressColumn = mockColumns.find(
				(col) => col.id === "in-progress",
			)!;
			const tooManyTasks = Array.from({ length: 5 }, (_, i) => ({
				id: `task-${i}`,
				name: `Task ${i}`,
				column: "in-progress",
				priority: "medium" as const,
				assignee: `User ${i}`,
				tags: [],
			}));

			render(
				<DnDWrapper>
					<KanbanColumn
						column={inProgressColumn}
						tasks={tooManyTasks}
						onTaskMove={vi.fn()}
					/>
				</DnDWrapper>,
			);

			expect(screen.getByTestId("overload-indicator")).toBeInTheDocument();
			expect(screen.getByText(/5\/3 tasks/i)).toBeInTheDocument();
		});

		it("should accept dropped tasks", () => {
			const mockOnTaskMove = vi.fn();

			render(
				<DnDWrapper>
					<KanbanColumn
						column={todoColumn}
						tasks={todoTasks}
						onTaskMove={mockOnTaskMove}
						onDrop={mockOnTaskMove}
					/>
				</DnDWrapper>,
			);

			const column = screen.getByTestId("column-todo");
			expect(column).toHaveAttribute("data-droppable", "true");
		});
	});

	describe("KanbanCard", () => {
		const task = mockTasks[0];

		it("should render task card with all information", () => {
			render(
				<DnDWrapper>
					<KanbanCard task={task} onEdit={vi.fn()} />
				</DnDWrapper>,
			);

			expect(screen.getByText("Fix login bug")).toBeInTheDocument();
			expect(screen.getByText("John Doe")).toBeInTheDocument();
			expect(screen.getByText("HIGH")).toBeInTheDocument();
			expect(screen.getByText("bug")).toBeInTheDocument();
			expect(screen.getByText("frontend")).toBeInTheDocument();
		});

		it("should show due date when present", () => {
			render(
				<DnDWrapper>
					<KanbanCard task={task} onEdit={vi.fn()} />
				</DnDWrapper>,
			);

			expect(screen.getByText(/jan 15/i)).toBeInTheDocument();
		});

		it("should indicate overdue tasks", () => {
			const overdueTask = {
				...task,
				dueDate: new Date("2023-12-01"), // Past date
			};

			render(
				<DnDWrapper>
					<KanbanCard task={overdueTask} onEdit={vi.fn()} />
				</DnDWrapper>,
			);

			expect(screen.getByTestId("overdue-indicator")).toBeInTheDocument();
		});

		it("should be draggable", () => {
			render(
				<DnDWrapper>
					<KanbanCard task={task} onEdit={vi.fn()} />
				</DnDWrapper>,
			);

			const card = screen.getByTestId("task-card-task-1");
			expect(card).toHaveAttribute("draggable", "true");
		});

		it("should open edit modal when clicked", async () => {
			const mockOnEdit = vi.fn();

			render(
				<DnDWrapper>
					<KanbanCard task={task} onEdit={mockOnEdit} />
				</DnDWrapper>,
			);

			const card = screen.getByTestId("task-card-task-1");
			await userEvent.click(card);

			expect(mockOnEdit).toHaveBeenCalledWith(task);
		});

		it("should show priority color coding", () => {
			const urgentTask = { ...task, priority: "urgent" as const };

			render(
				<DnDWrapper>
					<KanbanCard task={urgentTask} onEdit={vi.fn()} />
				</DnDWrapper>,
			);

			const priorityBadge = screen.getByText("URGENT");
			expect(priorityBadge).toHaveClass("bg-red-500"); // Assuming urgent = red
		});
	});

	describe("TaskFilters", () => {
		it("should render filter controls", () => {
			render(
				<TaskFilters
					onFilterChange={vi.fn()}
					assignees={["John Doe", "Jane Smith", "Bob Wilson"]}
					tags={["bug", "feature", "docs"]}
				/>,
			);

			expect(screen.getByLabelText(/assignee/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/tags/i)).toBeInTheDocument();
			expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument();
		});

		it("should call onFilterChange when filters are updated", async () => {
			const mockOnFilterChange = vi.fn();

			render(
				<TaskFilters
					onFilterChange={mockOnFilterChange}
					assignees={["John Doe", "Jane Smith"]}
					tags={["bug", "feature"]}
				/>,
			);

			// Filter by assignee
			await userEvent.selectOptions(
				screen.getByLabelText(/assignee/i),
				"John Doe",
			);

			expect(mockOnFilterChange).toHaveBeenCalledWith({
				assignee: "John Doe",
				priority: undefined,
				tags: [],
				search: "",
			});
		});

		it("should filter by multiple tags", async () => {
			const mockOnFilterChange = vi.fn();

			render(
				<TaskFilters
					onFilterChange={mockOnFilterChange}
					assignees={[]}
					tags={["bug", "feature", "docs"]}
				/>,
			);

			// Select multiple tags
			const bugTag = screen.getByLabelText("bug");
			const featureTag = screen.getByLabelText("feature");

			await userEvent.click(bugTag);
			await userEvent.click(featureTag);

			expect(mockOnFilterChange).toHaveBeenLastCalledWith({
				assignee: undefined,
				priority: undefined,
				tags: ["bug", "feature"],
				search: "",
			});
		});

		it("should filter by search text", async () => {
			const mockOnFilterChange = vi.fn();

			render(
				<TaskFilters
					onFilterChange={mockOnFilterChange}
					assignees={[]}
					tags={[]}
				/>,
			);

			const searchInput = screen.getByPlaceholderText(/search tasks/i);
			await userEvent.type(searchInput, "login");

			expect(mockOnFilterChange).toHaveBeenLastCalledWith({
				assignee: undefined,
				priority: undefined,
				tags: [],
				search: "login",
			});
		});

		it("should clear all filters", async () => {
			const mockOnFilterChange = vi.fn();

			render(
				<TaskFilters
					onFilterChange={mockOnFilterChange}
					assignees={["John Doe"]}
					tags={["bug"]}
				/>,
			);

			const clearButton = screen.getByText(/clear filters/i);
			await userEvent.click(clearButton);

			expect(mockOnFilterChange).toHaveBeenCalledWith({
				assignee: undefined,
				priority: undefined,
				tags: [],
				search: "",
			});
		});
	});

	describe("Real-time Updates", () => {
		it("should reflect task changes in real-time across users", async () => {
			const mockOnTaskMove = vi.fn();

			const { rerender } = render(
				<DnDWrapper>
					<KanbanBoard
						tasks={mockTasks}
						columns={mockColumns}
						onTaskMove={mockOnTaskMove}
					/>
				</DnDWrapper>,
			);

			// Simulate real-time update (task moved by another user)
			const updatedTasks = mockTasks.map((task) =>
				task.id === "task-1" ? { ...task, column: "in-progress" } : task,
			);

			rerender(
				<DnDWrapper>
					<KanbanBoard
						tasks={updatedTasks}
						columns={mockColumns}
						onTaskMove={mockOnTaskMove}
					/>
				</DnDWrapper>,
			);

			// Task should now be in In Progress column
			const inProgressColumn = screen.getByTestId("column-in-progress");
			expect(inProgressColumn).toContainElement(
				screen.getByText("Fix login bug"),
			);
		});
	});

	describe("Integration Tests", () => {
		it("should handle complete kanban workflow", async () => {
			const mockOnTaskMove = vi.fn();
			const mockOnTaskEdit = vi.fn();

			render(
				<DnDWrapper>
					<div>
						<TaskFilters
							onFilterChange={vi.fn()}
							assignees={["John Doe", "Jane Smith"]}
							tags={["bug", "feature"]}
						/>
						<KanbanBoard
							tasks={mockTasks}
							columns={mockColumns}
							onTaskMove={mockOnTaskMove}
						/>
					</div>
				</DnDWrapper>,
			);

			// Filter tasks
			await userEvent.selectOptions(
				screen.getByLabelText(/assignee/i),
				"John Doe",
			);

			// Move task
			const taskCard = screen.getByTestId("task-card-task-1");
			const reviewColumn = screen.getByTestId("column-review");

			fireEvent.dragStart(taskCard);
			fireEvent.drop(reviewColumn);

			expect(mockOnTaskMove).toHaveBeenCalled();
		});
	});
});
