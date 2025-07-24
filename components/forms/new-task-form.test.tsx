import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { mocked, vi } from "vitest";
import NewTaskForm from "./new-task-form";

// Mock functions at the top level
// vi.mock("@/app/actions/inngest", () => ({
// 	createTaskAction: vi.fn(),
// }));

// Mock the dependencies
const mockAddTask = vi.fn();
const mockFetchBranches = vi.fn();
const mockCreateTaskAction = vi.fn();

const mockEnvironments = [
	{ id: "env1", githubRepository: "owner/repo1" },
	{ id: "env2", githubRepository: "owner/repo2" },
];

const mockBranches = [
	{ name: "main", isDefault: true },
	{ name: "develop", isDefault: false },
	{ name: "feature/test", isDefault: false },
];

// Mock TanStack Query hooks
const mockEnvironmentsQuery = {
	environments: mockEnvironments,
	loading: false,
	error: null,
	refetch: vi.fn(),
	isStale: false,
};

const mockCreateTaskMutation = {
	mutateAsync: mockAddTask,
	isPending: false,
};

// vi.mock("@/hooks/use-environment-queries", () => ({
// 	useEnvironmentsQuery: vi.fn(() => mockEnvironmentsQuery),
// }));

// vi.mock("@/hooks/use-task-queries", () => ({
// 	useCreateTaskMutation: vi.fn(() => mockCreateTaskMutation),
// }));

// vi.mock("@/hooks/use-github-auth", () => ({
// 	useGitHubAuth: () => ({
// 		branches: mockBranches,
// 		fetchBranches: mockFetchBranches,
// 	}),
// }));

// Mock Lucide React icons
// vi.mock("lucide-react", () => ({
// 	HardDrive: ({ ...props }: any) => <svg data-testid="hard-drive-icon" {...props} />,
// 	Split: ({ ...props }: any) => <svg data-testid="split-icon" {...props} />,
// }));

// Mock UI components
// vi.mock("@/components/ui/button", () => ({
// 	Button: ({ children, onClick, variant, className, ...props }: any) => (
// <button
// className={className}
// data-testid="button"
// data-variant={variant}
// onClick={onClick}
// {...props}
// >
// {children}
// </button>
// ),
// }));

// vi.mock("@/components/ui/select", () => ({
// 	Select: ({ children, onValueChange, value, ...props }: any) => (
// <div data-testid="select" data-value={value} {...props}>
// <button data-testid="select-trigger" onClick={() => onValueChange?.("test-value")}>
// Select Trigger
// </button>
// {children}
// </div>
// ),
// 	SelectContent: ({ children, ...props }: any) => (
// <div data-testid="select-content" {...props}>
// {children}
// </div>
// ),
// 	SelectItem: ({ children, value, ...props }: any) => (
// <div data-testid="select-item" data-value={value} {...props}>
// {children}
// </div>
// ),
// 	SelectTrigger: ({ children, ...props }: any) => (
// <div data-testid="select-trigger" {...props}>
// {children}
// </div>
// ),
// 	SelectValue: ({ placeholder, ...props }: any) => (
// <div data-testid="select-value" {...props}>
// {placeholder}
// </div>
// ),
// }));

// vi.mock("next/link", () => ({
// 	default: ({ children, href, passHref, ...props }: any) => (
// <a data-testid="link" href={href} {...props}>
// {children}
// </a>
// ),
// }));

describe.skip("NewTaskForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockAddTask.mockReturnValue({ id: "task-123" });
		mockCreateTaskAction.mockResolvedValue({ success: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should render the form title", () => {
		render(<NewTaskForm />);

		expect(screen.getByText("Ready to ship something new?")).toBeInTheDocument();
	});

	it("should render the textarea", () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		expect(textarea).toBeInTheDocument();
		expect(textarea).toHaveClass("w-full", "min-h-[100px]", "resize-none");
	});

	it("should render environment select when environments exist", () => {
		render(<NewTaskForm />);

		expect(screen.getByTestId("select")).toBeInTheDocument();
		expect(screen.getByTestId("hard-drive-icon")).toBeInTheDocument();
		expect(screen.getByText("Choose a repository")).toBeInTheDocument();
	});

	it("should render create environment link when no environments exist", () => {
		mocked(require("@/stores/environments").useEnvironmentStore).mockReturnValue({
			environments: [],
		});

		render(<NewTaskForm />);

		const link = screen.getByTestId("link");
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/environments");
		expect(screen.getByText("Create an environment")).toBeInTheDocument();
	});

	it("should render branch select when environment is selected", () => {
		render(<NewTaskForm />);

		// Should render branch select by default since environment is available
		expect(screen.getAllByTestId("select")).toHaveLength(2); // Environment + Branch
		expect(screen.getByTestId("split-icon")).toBeInTheDocument();
	});

	it("should handle textarea input", () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test task description" } });

		expect(textarea).toHaveValue("Test task description");
	});

	it("should show action buttons when textarea has value", () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test task" } });

		const buttons = screen.getAllByTestId("button");
		const askButton = buttons.find((button) => button.textContent === "Ask");
		const codeButton = buttons.find((button) => button.textContent === "Code");

		expect(askButton).toBeInTheDocument();
		expect(codeButton).toBeInTheDocument();
	});

	it("should not show action buttons when textarea is empty", () => {
		render(<NewTaskForm />);

		const askButton = screen.queryByText("Ask");
		const codeButton = screen.queryByText("Code");

		expect(askButton).not.toBeInTheDocument();
		expect(codeButton).not.toBeInTheDocument();
	});

	it("should handle ask button click", async () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test ask task" } });

		const buttons = screen.getAllByTestId("button");
		const askButton = buttons.find((button) => button.textContent === "Ask");

		fireEvent.click(askButton!);

		await waitFor(() => {
			expect(mockAddTask).toHaveBeenCalledWith({
				title: "Test ask task",
				hasChanges: false,
				description: "",
				messages: [],
				status: "IN_PROGRESS",
				branch: "main",
				sessionId: "",
				repository: "owner/repo1",
				mode: "ask",
			});
		});

		expect(mockCreateTaskAction).toHaveBeenCalledWith({
			task: { id: "task-123" },
		});
	});

	it("should handle code button click", async () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test code task" } });

		const buttons = screen.getAllByTestId("button");
		const codeButton = buttons.find((button) => button.textContent === "Code");

		fireEvent.click(codeButton!);

		await waitFor(() => {
			expect(mockAddTask).toHaveBeenCalledWith({
				title: "Test code task",
				hasChanges: false,
				description: "",
				messages: [],
				status: "IN_PROGRESS",
				branch: "main",
				sessionId: "",
				repository: "owner/repo1",
				mode: "code",
			});
		});
	});

	it("should clear textarea after task submission", async () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test task" } });

		const buttons = screen.getAllByTestId("button");
		const codeButton = buttons.find((button) => button.textContent === "Code");

		fireEvent.click(codeButton!);

		await waitFor(() => {
			expect(textarea).toHaveValue("");
		});
	});

	it("should not submit empty task", async () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "" } });

		// Try to click code button (should not exist)
		const codeButton = screen.queryByText("Code");
		expect(codeButton).not.toBeInTheDocument();

		expect(mockAddTask).not.toHaveBeenCalled();
	});

	it("should call fetchBranches when environment changes", () => {
		render(<NewTaskForm />);

		expect(mockFetchBranches).toHaveBeenCalledWith("owner/repo1");
	});

	it("should handle environment without repository", () => {
		mocked(require("@/stores/environments").useEnvironmentStore).mockReturnValue({
			environments: [{ id: "env1" }],
		});

		render(<NewTaskForm />);

		expect(mockFetchBranches).not.toHaveBeenCalled();
	});

	it("should handle branches without default", () => {
		mocked(require("@/hooks/use-github-auth").useGitHubAuth).mockReturnValue({
			branches: [{ name: "develop", isDefault: false }],
			fetchBranches: mockFetchBranches,
		});

		render(<NewTaskForm />);

		// Should handle case where no default branch is found
		expect(screen.getByTestId("select")).toBeInTheDocument();
	});

	it("should handle textarea height adjustment", () => {
		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");

		// Simulate typing to trigger height adjustment
		fireEvent.change(textarea, { target: { value: "A".repeat(200) } });

		// The height adjustment is handled by the component
		expect(textarea).toHaveValue("A".repeat(200));
	});

	it("should render proper form structure", () => {
		render(<NewTaskForm />);

		const formContainer = screen.getByText("Ready to ship something new?").closest("div");
		expect(formContainer).toHaveClass("max-w-3xl", "mx-auto", "w-full");

		const innerContainer = screen
			.getByPlaceholderText("Describe a task you want to ship...")
			.closest("div");
		expect(innerContainer).toHaveClass("border", "bg-background", "rounded-lg", "p-4");
	});

	it("should handle component initialization", () => {
		render(<NewTaskForm />);

		expect(screen.getByText("Ready to ship something new?")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("Describe a task you want to ship...")).toBeInTheDocument();
		expect(mockFetchBranches).toHaveBeenCalled();
	});

	it("should handle error in task creation", async () => {
		mockCreateTaskAction.mockRejectedValue(new Error("Task creation failed"));

		render(<NewTaskForm />);

		const textarea = screen.getByPlaceholderText("Describe a task you want to ship...");
		fireEvent.change(textarea, { target: { value: "Test task" } });

		const buttons = screen.getAllByTestId("button");
		const codeButton = buttons.find((button) => button.textContent === "Code");

		fireEvent.click(codeButton!);

		await waitFor(() => {
			expect(mockAddTask).toHaveBeenCalled();
			expect(mockCreateTaskAction).toHaveBeenCalled();
		});
	});

	it("should handle multiple environments", () => {
		render(<NewTaskForm />);

		const selectItems = screen.getAllByTestId("select-item");
		expect(selectItems.length).toBeGreaterThan(0);
	});

	it("should handle multiple branches", () => {
		render(<NewTaskForm />);

		// Branch select should be rendered
		const selects = screen.getAllByTestId("select");
		expect(selects.length).toBeGreaterThanOrEqual(2);
	});
});
