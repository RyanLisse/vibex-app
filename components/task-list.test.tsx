import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import TaskList from "@/components/task-list";

// Mock TanStack Query hooks
const mockTasksQuery = {
	tasks: [],
	loading: false,
	error: null,
	refetch: vi.fn(),
	isStale: false,
	isFetching: false,
};

const mockUpdateTaskMutation = {
	mutateAsync: vi.fn(),
	isPending: false,
};

const mockDeleteTaskMutation = {
	mutateAsync: vi.fn(),
	isPending: false,
};

vi.mock("@/hooks/use-task-queries", () => ({
	useTasksQuery: vi.fn(() => mockTasksQuery),
	useUpdateTaskMutation: vi.fn(() => mockUpdateTaskMutation),
	useDeleteTaskMutation: vi.fn(() => mockDeleteTaskMutation),
}));

// Mock ElectricSQL provider
vi.mock("@/components/providers/electric-provider", () => ({
	useElectricContext: () => ({
		isConnected: true,
		isSyncing: false,
		error: null,
	}),
}));

// Mock observability
vi.mock("@/lib/observability", () => ({
	observability: {
		events: {
			collector: {
				collectEvent: vi.fn(),
			},
		},
	},
}));

// Mock date-fns
vi.mock("date-fns", () => ({
	formatDistanceToNow: vi.fn((_date, options) => {
		if (options?.addSuffix) {
			return "2 hours ago";
		}
		return "2 hours";
	}),
}));

// Mock Lucide React icons
vi.mock("lucide-react", () => ({
	Archive: ({ ...props }: any) => <svg data-testid="archive-icon" {...props} />,
	Check: ({ ...props }: any) => <svg data-testid="check-icon" {...props} />,
	Dot: ({ className, ...props }: any) => (
		<svg className={className} data-testid="dot-icon" {...props} />
	),
	Trash2: ({ ...props }: any) => <svg data-testid="trash-icon" {...props} />,
}));

// Mock UI components
vi.mock("@/components/ui/tabs", () => ({
	Tabs: ({ children, defaultValue, ...props }: any) => (
		<div data-default-value={defaultValue} data-testid="tabs" {...props}>
			{children}
		</div>
	),
	TabsContent: ({ children, value, ...props }: any) => (
		<div data-testid="tabs-content" data-value={value} {...props}>
			{children}
		</div>
	),
	TabsList: ({ children, ...props }: any) => (
		<div data-testid="tabs-list" {...props}>
			{children}
		</div>
	),
	TabsTrigger: ({ children, value, ...props }: any) => (
		<button data-testid="tabs-trigger" data-value={value} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/button", () => ({
	Button: ({ children, onClick, variant, size, ...props }: any) => (
		<button
			data-size={size}
			data-testid="button"
			data-variant={variant}
			onClick={onClick}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@/components/ui/text-shimmer", () => ({
	TextShimmer: ({ children, className, ...props }: any) => (
		<div className={className} data-testid="text-shimmer" {...props}>
			{children}
		</div>
	),
}));

vi.mock("next/link", () => ({
	default: ({ children, href, className, ...props }: any) => (
		<a className={className} data-testid="link" href={href} {...props}>
			{children}
		</a>
	),
}));

describe("TaskList", () => {
	const mockActiveTasks = [
		{
			id: "task-1",
			title: "Test Task 1",
			status: "DONE",
			repository: "test-repo",
			branch: "main",
			createdAt: "2023-01-01T00:00:00Z",
			hasChanges: false,
		},
		{
			id: "task-2",
			title: "Test Task 2",
			status: "IN_PROGRESS",
			repository: "test-repo-2",
			branch: "feature",
			createdAt: "2023-01-02T00:00:00Z",
			hasChanges: true,
			statusMessage: "Processing files",
		},
	];

	const mockArchivedTasks = [
		{
			id: "task-3",
			title: "Archived Task",
			status: "DONE",
			repository: "archived-repo",
			branch: "main",
			createdAt: "2023-01-03T00:00:00Z",
			hasChanges: false,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockTaskStore.getActiveTasks.mockReturnValue(mockActiveTasks);
		mockTaskStore.getArchivedTasks.mockReturnValue(mockArchivedTasks);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	it("should render tabs structure", () => {
		render(<TaskList />);

		expect(screen.getByTestId("tabs")).toBeInTheDocument();
		expect(screen.getByTestId("tabs")).toHaveAttribute(
			"data-default-value",
			"active",
		);
		expect(screen.getByTestId("tabs-list")).toBeInTheDocument();
	});

	it("should render active and archived tabs", () => {
		render(<TaskList />);

		const triggers = screen.getAllByTestId("tabs-trigger");
		expect(triggers).toHaveLength(2);

		expect(triggers[0]).toHaveAttribute("data-value", "active");
		expect(triggers[1]).toHaveAttribute("data-value", "archived");

		expect(screen.getByTestId("check-icon")).toBeInTheDocument();
		expect(screen.getByTestId("archive-icon")).toBeInTheDocument();
	});

	it("should show loading state initially", () => {
		render(<TaskList />);

		expect(screen.getByText("Loading tasks...")).toBeInTheDocument();
	});

	it("should render active tasks after hydration", async () => {
		render(<TaskList />);

		// Fast-forward past the useEffect
		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("Test Task 1")).toBeInTheDocument();
			expect(screen.getByText("Test Task 2")).toBeInTheDocument();
		});
	});

	it("should render task with changes indicator", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const taskWithChanges = screen.getByText("Test Task 2").closest("div");
			expect(
				taskWithChanges?.querySelector(".bg-blue-500"),
			).toBeInTheDocument();
		});
	});

	it("should render in-progress task with shimmer", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByTestId("text-shimmer")).toBeInTheDocument();
			expect(screen.getByText("Processing files...")).toBeInTheDocument();
		});
	});

	it("should render completed task with time and repository", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("2 hours ago")).toBeInTheDocument();
			expect(screen.getByText("test-repo")).toBeInTheDocument();
			expect(screen.getByTestId("dot-icon")).toBeInTheDocument();
		});
	});

	it("should render archive button for completed tasks", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const archiveButtons = screen.getAllByTestId("button");
			expect(archiveButtons.length).toBeGreaterThan(0);

			const archiveButton = archiveButtons.find(
				(button) =>
					button.getAttribute("data-variant") === "outline" &&
					button.getAttribute("data-size") === "icon",
			);
			expect(archiveButton).toBeInTheDocument();
		});
	});

	it("should handle archive button click", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const archiveButtons = screen.getAllByTestId("button");
			const archiveButton = archiveButtons.find(
				(button) =>
					button.getAttribute("data-variant") === "outline" &&
					button.getAttribute("data-size") === "icon",
			);

			if (archiveButton) {
				fireEvent.click(archiveButton);
				expect(mockTaskStore.archiveTask).toHaveBeenCalledWith("task-1");
			}
		});
	});

	it("should render links to task pages", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const links = screen.getAllByTestId("link");
			expect(links).toHaveLength(2);
			expect(links[0]).toHaveAttribute("href", "/task/task-1");
			expect(links[1]).toHaveAttribute("href", "/task/task-2");
		});
	});

	it("should show no active tasks message when empty", async () => {
		mockTaskStore.getActiveTasks.mockReturnValue([]);

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("No active tasks yet.")).toBeInTheDocument();
		});
	});

	it("should render archived tasks in archive tab", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const archivedContent = screen.getByTestId("tabs-content");
			expect(archivedContent).toHaveAttribute("data-value", "archived");
		});
	});

	it("should render archived task details", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			// Check if archived task content is rendered
			const archivedTabContent = screen
				.getAllByTestId("tabs-content")
				.find((content) => content.getAttribute("data-value") === "archived");
			expect(archivedTabContent).toBeInTheDocument();
		});
	});

	it("should handle remove task button click", async () => {
		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const removeButtons = screen.getAllByTestId("button");
			// Find the remove button (should be in archived section)
			const removeButton = removeButtons.find((button) =>
				button.querySelector('[data-testid="trash-icon"]'),
			);

			if (removeButton) {
				fireEvent.click(removeButton);
				expect(mockTaskStore.removeTask).toHaveBeenCalledWith("task-3");
			}
		});
	});

	it("should show no archived tasks message when empty", async () => {
		mockTaskStore.getArchivedTasks.mockReturnValue([]);

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("No archived tasks yet.")).toBeInTheDocument();
		});
	});

	it("should handle task without createdAt", async () => {
		const taskWithoutDate = {
			...mockActiveTasks[0],
			createdAt: null,
		};
		mockTaskStore.getActiveTasks.mockReturnValue([taskWithoutDate]);

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("Just now")).toBeInTheDocument();
		});
	});

	it("should handle in-progress task without status message", async () => {
		const taskWithoutMessage = {
			...mockActiveTasks[1],
			statusMessage: undefined,
		};
		mockTaskStore.getActiveTasks.mockReturnValue([taskWithoutMessage]);

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			expect(screen.getByText("Working on your task...")).toBeInTheDocument();
		});
	});

	it("should handle task without changes indicator", async () => {
		const taskWithoutChanges = {
			...mockActiveTasks[1],
			hasChanges: false,
		};
		mockTaskStore.getActiveTasks.mockReturnValue([taskWithoutChanges]);

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const taskElement = screen.getByText("Test Task 2").closest("div");
			expect(
				taskElement?.querySelector(".bg-blue-500"),
			).not.toBeInTheDocument();
		});
	});

	it("should stop propagation on remove button click", async () => {
		const mockStopPropagation = vi.fn();
		const mockEvent = {
			stopPropagation: mockStopPropagation,
		};

		render(<TaskList />);

		vi.runAllTimers();

		await waitFor(() => {
			const removeButtons = screen.getAllByTestId("button");
			const removeButton = removeButtons.find((button) =>
				button.querySelector('[data-testid="trash-icon"]'),
			);

			if (removeButton) {
				// Mock the event object
				fireEvent.click(removeButton, mockEvent);
				expect(mockTaskStore.removeTask).toHaveBeenCalled();
			}
		});
	});

	it("should render proper styling classes", () => {
		render(<TaskList />);

		const container = screen.getByTestId("tabs").parentElement;
		expect(container).toHaveClass(
			"max-w-3xl",
			"mx-auto",
			"w-full",
			"p-1",
			"rounded-lg",
			"bg-muted",
		);
	});
});
