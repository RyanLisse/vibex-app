import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import NewTaskForm from "../../../components/forms/new-task-form";

// Mock the hooks
vi.mock("@/hooks/use-github-auth", () => ({
	useGitHubAuth: () => ({
		branches: [
			{ name: "main", isDefault: true },
			{ name: "feature/test", isDefault: false },
		],
		fetchBranches: vi.fn(),
		isLoading: false,
		error: null,
	}),
}));

vi.mock("@/stores/tasks", () => ({
	useTaskStore: () => ({
		addTask: vi.fn(),
		tasks: [],
	}),
}));

vi.mock("@/stores/environments", () => ({
	useEnvironmentStore: () => ({
		environments: [
			{
				id: "env-1",
				name: "Test Environment",
				githubRepository: "test/repo",
			},
		],
	}),
}));

vi.mock("@/app/actions/inngest", () => ({
	createTaskAction: vi.fn(),
}));

vi.mock("next/link", () => {
	const MockLink = ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => {
		return <a href={href}>{children}</a>;
	};
	return { default: MockLink };
});

describe("NewTaskForm", () => {
	it("renders form elements correctly", () => {
		const { container } = render(<NewTaskForm />);

		// Use querySelector since the form is rendering correctly
		const textarea = container.querySelector("textarea");
		expect(textarea).toBeInTheDocument();
		expect(textarea).toHaveAttribute(
			"placeholder",
			"Describe a task you want to ship...",
		);

		// Check for the heading text
		const heading = container.querySelector("h1");
		expect(heading).toBeInTheDocument();
		expect(heading).toHaveTextContent("Ready to ship something new?");

		// Initially no action buttons are shown
		const buttons = container.querySelectorAll("button");
		const actionButtons = Array.from(buttons).filter(
			(btn) =>
				btn.textContent?.includes("Code") || btn.textContent?.includes("Ask"),
		);
		expect(actionButtons).toHaveLength(0);
	});

	it("shows action buttons when text is entered", async () => {
		const { container } = render(<NewTaskForm />);

		const textarea = container.querySelector("textarea");
		expect(textarea).toBeInTheDocument();

		// Set the value and fire the change event using fireEvent
		fireEvent.change(textarea, { target: { value: "Test task description" } });

		// Wait for the buttons to appear
		await waitFor(
			() => {
				const buttons = container.querySelectorAll("button");
				const codeButton = Array.from(buttons).find((btn) =>
					btn.textContent?.includes("Code"),
				);
				const askButton = Array.from(buttons).find((btn) =>
					btn.textContent?.includes("Ask"),
				);

				expect(codeButton).toBeDefined();
				expect(askButton).toBeDefined();
			},
			{ timeout: 3000 },
		);
	});

	it("handles task submission with Code button", async () => {
		const { container } = render(<NewTaskForm />);

		const textarea = container.querySelector("textarea");

		// Set the value and fire the change event using fireEvent
		fireEvent.change(textarea, { target: { value: "Test task description" } });

		// Wait for the buttons to appear and click
		await waitFor(() => {
			const buttons = container.querySelectorAll("button");
			const codeButton = Array.from(buttons).find((btn) =>
				btn.textContent?.includes("Code"),
			);
			expect(codeButton).toBeDefined();
			return codeButton;
		});

		const buttons = container.querySelectorAll("button");
		const codeButton = Array.from(buttons).find((btn) =>
			btn.textContent?.includes("Code"),
		);
		fireEvent.click(codeButton);

		await waitFor(() => {
			expect(textarea).toHaveValue("");
		});
	});

	it("handles task submission with Ask button", async () => {
		const { container } = render(<NewTaskForm />);

		const textarea = container.querySelector("textarea");

		// Set the value and fire the change event using fireEvent
		fireEvent.change(textarea, { target: { value: "Test task description" } });

		// Wait for the buttons to appear and click
		await waitFor(() => {
			const buttons = container.querySelectorAll("button");
			const askButton = Array.from(buttons).find((btn) =>
				btn.textContent?.includes("Ask"),
			);
			expect(askButton).toBeDefined();
			return askButton;
		});

		const buttons = container.querySelectorAll("button");
		const askButton = Array.from(buttons).find((btn) =>
			btn.textContent?.includes("Ask"),
		);
		fireEvent.click(askButton);

		await waitFor(() => {
			expect(textarea).toHaveValue("");
		});
	});
});
