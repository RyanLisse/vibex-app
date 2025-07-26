import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import ClientPage from "./client-page";

// Mock the imported components
// Bun doesn't support vi.mock yet
// vi.mock("@/components/navigation/navbar", () => ({
// 	default: () => <div data-testid="navbar">Mock Navbar</div>,
// }));

// vi.mock("@/components/task-list", () => ({
// 	default: () => <div data-testid="task-list">Mock Task List</div>,
// }));

// vi.mock("@/components/forms/new-task-form", () => ({
// 	default: () => <div data-testid="new-task-form">Mock New Task Form</div>,
// }));

describe.skip("ClientPage", () => {
	it("should render all main components", () => {
		render(<ClientPage />);

		expect(screen.getByTestId("navbar")).toBeTruthy();
		expect(screen.getByTestId("new-task-form")).toBeTruthy();
		expect(screen.getByTestId("task-list")).toBeTruthy();
	});

	it("should render components in correct order", () => {
		const { container } = render(<ClientPage />);

		const children = container.firstChild?.childNodes;
		expect(children).toHaveLength(3);

		// Check the order of components
		expect((children?.[0] as HTMLElement)?.getAttribute("data-testid")).toBe("navbar");
		expect((children?.[1] as HTMLElement)?.getAttribute("data-testid")).toBe("new-task-form");
		expect((children?.[2] as HTMLElement)?.getAttribute("data-testid")).toBe("task-list");
	});

	it("should have correct layout structure", () => {
		const { container } = render(<ClientPage />);

		const mainContainer = container.firstChild as HTMLElement;
		expect(mainContainer?.classList.contains("flex")).toBe(true);
		expect(mainContainer?.classList.contains("flex-col")).toBe(true);
		expect(mainContainer?.classList.contains("px-4")).toBe(true);
		expect(mainContainer?.classList.contains("py-2")).toBe(true);
		expect(mainContainer?.classList.contains("h-screen")).toBe(true);
		expect(mainContainer?.classList.contains("gap-y-4")).toBe(true);
	});

	it("should render navbar component", () => {
		render(<ClientPage />);

		const navbar = screen.getByTestId("navbar");
		expect(navbar).toBeTruthy();
		expect(navbar.textContent).toContain("Mock Navbar");
	});

	it("should render new task form component", () => {
		render(<ClientPage />);

		const newTaskForm = screen.getByTestId("new-task-form");
		expect(newTaskForm).toBeTruthy();
		expect(newTaskForm.textContent).toContain("Mock New Task Form");
	});

	it("should render task list component", () => {
		render(<ClientPage />);

		const taskList = screen.getByTestId("task-list");
		expect(taskList).toBeTruthy();
		expect(taskList.textContent).toContain("Mock Task List");
	});

	it("should render without any console errors", () => {
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		render(<ClientPage />);

		expect(consoleSpy).not.toHaveBeenCalled();
		consoleSpy.mockRestore();
	});

	it("should have full height layout", () => {
		const { container } = render(<ClientPage />);

		const mainContainer = container.firstChild as HTMLElement;
		expect(mainContainer?.classList.contains("h-screen")).toBe(true);
	});

	it("should have proper spacing", () => {
		const { container } = render(<ClientPage />);

		const mainContainer = container.firstChild as HTMLElement;
		expect(mainContainer?.classList.contains("gap-y-4")).toBe(true);
		expect(mainContainer?.classList.contains("px-4")).toBe(true);
		expect(mainContainer?.classList.contains("py-2")).toBe(true);
	});

	it("should be a default export", () => {
		expect(ClientPage).toBeDefined();
		expect(typeof ClientPage).toBe("function");
	});

	it("should render as a flex column layout", () => {
		const { container } = render(<ClientPage />);

		const mainContainer = container.firstChild as HTMLElement;
		expect(mainContainer?.classList.contains("flex")).toBe(true);
		expect(mainContainer?.classList.contains("flex-col")).toBe(true);
	});

	it("should maintain consistent structure across re-renders", () => {
		const { rerender } = render(<ClientPage />);

		expect(screen.getByTestId("navbar")).toBeTruthy();
		expect(screen.getByTestId("new-task-form")).toBeTruthy();
		expect(screen.getByTestId("task-list")).toBeTruthy();

		rerender(<ClientPage />);

		expect(screen.getByTestId("navbar")).toBeTruthy();
		expect(screen.getByTestId("new-task-form")).toBeTruthy();
		expect(screen.getByTestId("task-list")).toBeTruthy();
	});

	it("should not render any other content", () => {
		const { container } = render(<ClientPage />);

		const mainContainer = container.firstChild;
		expect(mainContainer?.childNodes).toHaveLength(3);
	});

	it("should handle component mounting and unmounting", () => {
		const { unmount } = render(<ClientPage />);

		expect(screen.getByTestId("navbar")).toBeTruthy();
		expect(screen.getByTestId("new-task-form")).toBeTruthy();
		expect(screen.getByTestId("task-list")).toBeTruthy();

		unmount();

		expect(screen.queryByTestId("navbar")).toBeFalsy();
		expect(screen.queryByTestId("new-task-form")).toBeFalsy();
		expect(screen.queryByTestId("task-list")).toBeFalsy();
	});
});
