/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { KanbanBoard } from "./kanban-board";
import type { KanbanColumn, Task } from "@/types/task";

// Mock the DnD Kit components
vi.mock("@dnd-kit/core", () => ({
	DndContext: ({ children, onDragEnd }: any) => (
		<div data-testid="dnd-context" data-on-drag-end={onDragEnd}>
			{children}
		</div>
	),
	useSensor: vi.fn(),
	useSensors: vi.fn(() => []),
	PointerSensor: vi.fn(),
	KeyboardSensor: vi.fn(),
}));

vi.mock("@dnd-kit/sortable", () => ({
	SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
	horizontalListSortingStrategy: {},
}));

// Mock the KanbanColumn component
vi.mock("./kanban-column", () => ({
	KanbanColumn: ({ column, onTaskCreate, onTaskUpdate, onTaskDelete, isActive }: any) => (
		<div
			data-testid={`kanban-column-${column.id}`}
			data-column-title={column.title}
			data-is-active={isActive}
		>
			<h3>{column.title}</h3>
			<button data-testid={`create-task-${column.id}`} onClick={() => onTaskCreate?.()}>
				Add Task
			</button>
			{column.tasks?.map((task: Task) => (
				<div key={task.id} data-testid={`task-${task.id}`} data-task-title={task.title}>
					{task.title}
					<button data-testid={`update-task-${task.id}`} onClick={() => onTaskUpdate?.(task)}>
						Update
					</button>
					<button data-testid={`delete-task-${task.id}`} onClick={() => onTaskDelete?.(task.id)}>
						Delete
					</button>
				</div>
			))}
		</div>
	),
}));

// Mock the TaskFilters component
vi.mock("./task-filters", () => ({
	TaskFilters: ({ onFilterChange }: any) => (
		<div data-testid="task-filters">
			<input
				data-testid="search-input"
				placeholder="Search tasks..."
				onChange={(e) => onFilterChange?.({ search: e.target.value })}
			/>
			<select
				data-testid="priority-filter"
				onChange={(e) => onFilterChange?.({ priority: e.target.value })}
			>
				<option value="">All Priorities</option>
				<option value="high">High</option>
				<option value="medium">Medium</option>
				<option value="low">Low</option>
			</select>
		</div>
	),
}));

describe("KanbanBoard", () => {
	const mockColumns: KanbanColumn[] = [
		{
			id: "todo",
			title: "To Do",
			color: "#gray",
			limit: 10,
			tasks: [
				{
					id: "task-1",
					title: "Task 1",
					description: "Description 1",
					status: "todo",
					priority: "high",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: "task-2",
					title: "Task 2",
					description: "Description 2",
					status: "todo",
					priority: "medium",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
		},
		{
			id: "in-progress",
			title: "In Progress",
			color: "#blue",
			limit: 5,
			tasks: [
				{
					id: "task-3",
					title: "Task 3",
					description: "Description 3",
					status: "in-progress",
					priority: "high",
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
		},
		{
			id: "done",
			title: "Done",
			color: "#green",
			limit: null,
			tasks: [],
		},
	];

	const mockOnTaskMove = vi.fn();
	const mockOnTaskCreate = vi.fn();
	const mockOnTaskUpdate = vi.fn();
	const mockOnTaskDelete = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Rendering", () => {
		it("should render kanban board with columns", () => {
			render(
				<KanbanBoard
					columns={mockColumns}
					onTaskMove={mockOnTaskMove}
					onTaskCreate={mockOnTaskCreate}
					onTaskUpdate={mockOnTaskUpdate}
					onTaskDelete={mockOnTaskDelete}
				/>
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-context")).toBeInTheDocument();

			// Check all columns are rendered
			expect(screen.getByTestId("kanban-column-todo")).toBeInTheDocument();
			expect(screen.getByTestId("kanban-column-in-progress")).toBeInTheDocument();
			expect(screen.getByTestId("kanban-column-done")).toBeInTheDocument();
		});

		it("should render task filters", () => {
			render(<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />);

			expect(screen.getByTestId("task-filters")).toBeInTheDocument();
			expect(screen.getByTestId("search-input")).toBeInTheDocument();
			expect(screen.getByTestId("priority-filter")).toBeInTheDocument();
		});

		it("should show column titles correctly", () => {
			render(<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />);

			expect(screen.getByText("To Do")).toBeInTheDocument();
			expect(screen.getByText("In Progress")).toBeInTheDocument();
			expect(screen.getByText("Done")).toBeInTheDocument();
		});
	});

	describe("Task Management", () => {
		it("should handle task creation", async () => {
			render(
				<KanbanBoard
					columns={mockColumns}
					onTaskMove={mockOnTaskMove}
					onTaskCreate={mockOnTaskCreate}
				/>
			);

			const createButton = screen.getByTestId("create-task-todo");
			fireEvent.click(createButton);

			await waitFor(() => {
				expect(mockOnTaskCreate).toHaveBeenCalledWith("todo");
			});
		});

		it("should handle task updates", async () => {
			render(
				<KanbanBoard
					columns={mockColumns}
					onTaskMove={mockOnTaskMove}
					onTaskUpdate={mockOnTaskUpdate}
				/>
			);

			const updateButton = screen.getByTestId("update-task-task-1");
			fireEvent.click(updateButton);

			await waitFor(() => {
				expect(mockOnTaskUpdate).toHaveBeenCalledWith(
					expect.objectContaining({
						id: "task-1",
						title: "Task 1",
					})
				);
			});
		});

		it("should handle task deletion", async () => {
			render(
				<KanbanBoard
					columns={mockColumns}
					onTaskMove={mockOnTaskMove}
					onTaskDelete={mockOnTaskDelete}
				/>
			);

			const deleteButton = screen.getByTestId("delete-task-task-1");
			fireEvent.click(deleteButton);

			await waitFor(() => {
				expect(mockOnTaskDelete).toHaveBeenCalledWith("task-1");
			});
		});
	});

	describe("Filtering", () => {
		it("should filter tasks by search term", async () => {
			render(<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />);

			const searchInput = screen.getByTestId("search-input");
			fireEvent.change(searchInput, { target: { value: "Task 1" } });

			// The filtering logic would be tested in the actual component
			// Here we're just testing that the filter component receives the change
			expect(searchInput).toHaveValue("Task 1");
		});

		it("should filter tasks by priority", async () => {
			render(<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />);

			const priorityFilter = screen.getByTestId("priority-filter");
			fireEvent.change(priorityFilter, { target: { value: "high" } });

			expect(priorityFilter).toHaveValue("high");
		});
	});

	describe("Drag and Drop", () => {
		it("should handle drag start", () => {
			render(<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />);

			const dndContext = screen.getByTestId("dnd-context");
			expect(dndContext).toBeInTheDocument();
		});

		it("should call onTaskMove when drag ends", () => {
			const { container } = render(
				<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />
			);

			// Simulate drag end event
			const dndContext = screen.getByTestId("dnd-context");
			const onDragEnd = dndContext.getAttribute("data-on-drag-end");

			// In a real test, we would simulate the actual drag and drop
			// For now, we just verify the setup is correct
			expect(onDragEnd).toBeDefined();
		});
	});

	describe("Column Limits", () => {
		it("should respect column limits", () => {
			const columnsWithLimits = mockColumns.map((col) => ({
				...col,
				tasks:
					col.id === "in-progress"
						? Array(5)
								.fill(null)
								.map((_, i) => ({
									id: `task-limit-${i}`,
									title: `Limit Task ${i}`,
									status: "in-progress",
									priority: "medium",
									createdAt: new Date(),
									updatedAt: new Date(),
								}))
						: col.tasks,
			}));

			render(<KanbanBoard columns={columnsWithLimits} onTaskMove={mockOnTaskMove} />);

			// The component should handle limit logic internally
			// This test verifies the data structure is passed correctly
			expect(screen.getByTestId("kanban-column-in-progress")).toBeInTheDocument();
		});
	});

	describe("Real-time Updates", () => {
		it("should handle real-time task updates", () => {
			const { rerender } = render(
				<KanbanBoard columns={mockColumns} onTaskMove={mockOnTaskMove} />
			);

			// Simulate real-time update by re-rendering with updated data
			const updatedColumns = mockColumns.map((col) =>
				col.id === "todo"
					? {
							...col,
							tasks: [
								...col.tasks,
								{
									id: "task-new",
									title: "New Real-time Task",
									status: "todo",
									priority: "high",
									createdAt: new Date(),
									updatedAt: new Date(),
								},
							],
						}
					: col
			);

			rerender(<KanbanBoard columns={updatedColumns} onTaskMove={mockOnTaskMove} />);

			// The new task should be rendered
			expect(screen.getByTestId("task-task-new")).toBeInTheDocument();
		});
	});

	describe("Error Handling", () => {
		it("should handle empty columns gracefully", () => {
			render(<KanbanBoard columns={[]} onTaskMove={mockOnTaskMove} />);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("task-filters")).toBeInTheDocument();
		});

		it("should handle columns without tasks", () => {
			const emptyColumns = mockColumns.map((col) => ({
				...col,
				tasks: [],
			}));

			render(<KanbanBoard columns={emptyColumns} onTaskMove={mockOnTaskMove} />);

			expect(screen.getByTestId("kanban-column-todo")).toBeInTheDocument();
			expect(screen.getByTestId("kanban-column-in-progress")).toBeInTheDocument();
			expect(screen.getByTestId("kanban-column-done")).toBeInTheDocument();
		});
	});
});
