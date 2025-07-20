import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
	AITool,
	AIToolContent,
	AIToolHeader,
	AIToolInput,
	AIToolOutput,
	type AIToolStatus,
} from "./tool";

// Mock dependencies
vi.mock("@/components/ui/badge", () => ({
	Badge: ({ children, className, variant }: any) => (
		<span className={className} data-variant={variant}>
			{children}
		</span>
	),
}));

vi.mock("@/components/ui/collapsible", () => ({
	Collapsible: ({ children, className, ...props }: any) => (
		<div className={className} {...props}>
			{children}
		</div>
	),
	CollapsibleTrigger: ({ children, onClick, className, ...props }: any) => (
		<button className={className} onClick={onClick} type="button" {...props}>
			{children}
		</button>
	),
	CollapsibleContent: ({ children, className }: any) => (
		<div className={className}>{children}</div>
	),
}));

vi.mock("@/lib/utils", () => ({
	cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
	CheckCircleIcon: ({ className }: any) => (
		<span className={className} data-testid="check-circle-icon" />
	),
	ChevronDownIcon: ({ className }: any) => (
		<span className={className} data-testid="chevron-down-icon" />
	),
	CircleIcon: ({ className }: any) => (
		<span className={className} data-testid="circle-icon" />
	),
	ClockIcon: ({ className }: any) => (
		<span className={className} data-testid="clock-icon" />
	),
	WrenchIcon: ({ className }: any) => (
		<span className={className} data-testid="wrench-icon" />
	),
	XCircleIcon: ({ className }: any) => (
		<span className={className} data-testid="x-circle-icon" />
	),
}));

describe("AITool", () => {
	it("should render with default props", () => {
		render(
			<AITool>
				<div>Tool content</div>
			</AITool>,
		);

		expect(screen.getByText("Tool content")).toBeInTheDocument();
	});

	it("should apply custom className", () => {
		render(
			<AITool className="custom-class">
				<div>Tool content</div>
			</AITool>,
		);

		const container = screen.getByText("Tool content").parentElement;
		expect(container).toHaveClass("custom-class");
		expect(container).toHaveClass("not-prose");
		expect(container).toHaveClass("mb-4");
		expect(container).toHaveClass("w-full");
		expect(container).toHaveClass("rounded-md");
		expect(container).toHaveClass("border");
	});

	it("should pass through additional props", () => {
		render(
			<AITool data-testid="ai-tool" defaultOpen={true}>
				<div>Tool content</div>
			</AITool>,
		);

		expect(screen.getByTestId("ai-tool")).toBeInTheDocument();
	});
});

describe("AIToolHeader", () => {
	const defaultProps = {
		name: "Test Tool",
		description: "This is a test tool",
	};

	describe("rendering", () => {
		it("should render tool name and description", () => {
			render(<AIToolHeader {...defaultProps} />);

			expect(screen.getByText("Test Tool")).toBeInTheDocument();
			expect(screen.getByText("This is a test tool")).toBeInTheDocument();
		});

		it("should render tool icon", () => {
			render(<AIToolHeader {...defaultProps} />);

			expect(screen.getByTestId("wrench-icon")).toBeInTheDocument();
		});

		it("should render chevron icon", () => {
			render(<AIToolHeader {...defaultProps} />);

			expect(screen.getByTestId("chevron-down-icon")).toBeInTheDocument();
		});

		it("should render without description", () => {
			render(<AIToolHeader name="Test Tool" />);

			expect(screen.getByText("Test Tool")).toBeInTheDocument();
			expect(screen.queryByText("This is a test tool")).not.toBeInTheDocument();
		});
	});

	describe("status badges", () => {
		const statuses: AIToolStatus[] = [
			"pending",
			"running",
			"completed",
			"error",
		];

		it.each(statuses)(
			"should render %s status with correct icon and label",
			(status) => {
				render(<AIToolHeader {...defaultProps} status={status} />);

				// Check status label
				const expectedLabels = {
					pending: "Pending",
					running: "Running",
					completed: "Completed",
					error: "Error",
				};
				expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();

				// Check status icon
				const expectedIcons = {
					pending: "circle-icon",
					running: "clock-icon",
					completed: "check-circle-icon",
					error: "x-circle-icon",
				};
				expect(screen.getByTestId(expectedIcons[status])).toBeInTheDocument();
			},
		);

		it("should apply animation to running status", () => {
			render(<AIToolHeader {...defaultProps} status="running" />);

			const clockIcon = screen.getByTestId("clock-icon");
			expect(clockIcon).toHaveClass("animate-pulse");
		});

		it("should apply correct color to completed status", () => {
			render(<AIToolHeader {...defaultProps} status="completed" />);

			const checkIcon = screen.getByTestId("check-circle-icon");
			expect(checkIcon).toHaveClass("text-green-600");
		});

		it("should apply correct color to error status", () => {
			render(<AIToolHeader {...defaultProps} status="error" />);

			const errorIcon = screen.getByTestId("x-circle-icon");
			expect(errorIcon).toHaveClass("text-red-600");
		});
	});

	describe("interactions", () => {
		it("should handle click events", async () => {
			const onClick = vi.fn();
			const user = userEvent.setup();

			render(<AIToolHeader {...defaultProps} onClick={onClick} />);

			await user.click(screen.getByRole("button"));

			expect(onClick).toHaveBeenCalledTimes(1);
		});

		it("should apply custom className", () => {
			render(
				<AIToolHeader {...defaultProps} className="custom-header-class" />,
			);

			expect(screen.getByRole("button")).toHaveClass("custom-header-class");
		});
	});
});

describe("AIToolContent", () => {
	it("should render children", () => {
		render(
			<AIToolContent>
				<div>Tool content details</div>
			</AIToolContent>,
		);

		expect(screen.getByText("Tool content details")).toBeInTheDocument();
	});

	it("should apply default classes", () => {
		render(
			<AIToolContent>
				<div>Content</div>
			</AIToolContent>,
		);

		const container = screen.getByText("Content").parentElement;
		expect(container).toHaveClass("text-sm");
	});

	it("should apply custom className", () => {
		render(
			<AIToolContent className="custom-content-class">
				<div>Content</div>
			</AIToolContent>,
		);

		const container = screen.getByText("Content").parentElement;
		expect(container).toHaveClass("custom-content-class");
	});
});

describe("AIToolInput", () => {
	it("should render label and children", () => {
		render(
			<AIToolInput label="Input Parameters">
				<div>Input data</div>
			</AIToolInput>,
		);

		expect(screen.getByText("Input")).toBeInTheDocument();
		expect(screen.getByText("Input data")).toBeInTheDocument();
	});

	it("should render with custom label", () => {
		render(
			<AIToolInput label="Custom Label">
				<div>Content</div>
			</AIToolInput>,
		);

		expect(screen.getByText("Custom Label")).toBeInTheDocument();
	});

	it("should apply correct classes", () => {
		render(
			<AIToolInput label="Input">
				<div>Content</div>
			</AIToolInput>,
		);

		const container = screen.getByText("Content").parentElement?.parentElement;
		expect(container).toHaveClass("p-4");

		const labelContainer = screen.getByText("Input").parentElement;
		expect(labelContainer).toHaveClass("mb-2");
		expect(labelContainer).toHaveClass("flex");
		expect(labelContainer).toHaveClass("items-center");
		expect(labelContainer).toHaveClass("gap-2");

		const label = screen.getByText("Input");
		expect(label).toHaveClass("text-xs");
		expect(label).toHaveClass("font-medium");
		expect(label).toHaveClass("text-muted-foreground");
	});

	it("should apply custom className", () => {
		render(
			<AIToolInput className="custom-input-class" label="Input">
				<div>Content</div>
			</AIToolInput>,
		);

		const container = screen.getByText("Content").parentElement?.parentElement;
		expect(container).toHaveClass("custom-input-class");
	});
});

describe("AIToolOutput", () => {
	it("should render label and children", () => {
		render(
			<AIToolOutput label="Output Results">
				<div>Output data</div>
			</AIToolOutput>,
		);

		expect(screen.getByText("Output")).toBeInTheDocument();
		expect(screen.getByText("Output data")).toBeInTheDocument();
	});

	it("should render with custom label", () => {
		render(
			<AIToolOutput label="Custom Output">
				<div>Content</div>
			</AIToolOutput>,
		);

		expect(screen.getByText("Custom Output")).toBeInTheDocument();
	});

	it("should apply correct classes", () => {
		render(
			<AIToolOutput label="Output">
				<div>Content</div>
			</AIToolOutput>,
		);

		const container = screen.getByText("Content").parentElement?.parentElement;
		expect(container).toHaveClass("border-t");
		expect(container).toHaveClass("p-4");

		const labelContainer = screen.getByText("Output").parentElement;
		expect(labelContainer).toHaveClass("mb-2");
		expect(labelContainer).toHaveClass("flex");
		expect(labelContainer).toHaveClass("items-center");
		expect(labelContainer).toHaveClass("gap-2");

		const label = screen.getByText("Output");
		expect(label).toHaveClass("text-xs");
		expect(label).toHaveClass("font-medium");
		expect(label).toHaveClass("text-muted-foreground");
	});

	it("should apply custom className", () => {
		render(
			<AIToolOutput className="custom-output-class" label="Output">
				<div>Content</div>
			</AIToolOutput>,
		);

		const container = screen.getByText("Content").parentElement?.parentElement;
		expect(container).toHaveClass("custom-output-class");
	});
});

describe("Integration", () => {
	it("should render complete tool with all components", async () => {
		const user = userEvent.setup();

		render(
			<AITool>
				<AIToolHeader
					description="Processes input data"
					name="Data Processor"
					status="running"
				/>
				<AIToolContent>
					<AIToolInput label="Parameters">
						<pre>{"{ type: 'json', format: 'pretty' }"}</pre>
					</AIToolInput>
					<AIToolOutput label="Results">
						<pre>{"{ processed: true, count: 42 }"}</pre>
					</AIToolOutput>
				</AIToolContent>
			</AITool>,
		);

		// Check header
		expect(screen.getByText("Data Processor")).toBeInTheDocument();
		expect(screen.getByText("Processes input data")).toBeInTheDocument();
		expect(screen.getByText("Running")).toBeInTheDocument();
		expect(screen.getByTestId("clock-icon")).toBeInTheDocument();

		// Check content
		expect(screen.getByText("Parameters")).toBeInTheDocument();
		expect(
			screen.getByText("{ type: 'json', format: 'pretty' }"),
		).toBeInTheDocument();
		expect(screen.getByText("Results")).toBeInTheDocument();
		expect(
			screen.getByText("{ processed: true, count: 42 }"),
		).toBeInTheDocument();
	});

	it("should handle state transitions", () => {
		const { rerender } = render(
			<AITool>
				<AIToolHeader name="Test Tool" status="pending" />
			</AITool>,
		);

		expect(screen.getByText("Pending")).toBeInTheDocument();
		expect(screen.getByTestId("circle-icon")).toBeInTheDocument();

		// Update to running
		rerender(
			<AITool>
				<AIToolHeader name="Test Tool" status="running" />
			</AITool>,
		);

		expect(screen.getByText("Running")).toBeInTheDocument();
		expect(screen.getByTestId("clock-icon")).toBeInTheDocument();

		// Update to completed
		rerender(
			<AITool>
				<AIToolHeader name="Test Tool" status="completed" />
			</AITool>,
		);

		expect(screen.getByText("Completed")).toBeInTheDocument();
		expect(screen.getByTestId("check-circle-icon")).toBeInTheDocument();
	});
});
