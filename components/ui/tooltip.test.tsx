import { TooltipTrigger } from "@/components/ui/tooltip";

// Mock Radix UI Tooltip components
vi.mock("@radix-ui/react-tooltip", () => ({
	Provider: ({ children, delayDuration, ...props }: any) => (
		<div
			data-delay={delayDuration}
			data-testid="tooltip-provider-primitive"
			{...props}
		>
			{children}
		</div>
	),
	Root: ({ children, ...props }: any) => (
		<div data-testid="tooltip-root-primitive" {...props}>
			{children}
		</div>
	),
	Trigger: ({ children, ...props }: any) => (
		<button data-testid="tooltip-trigger-primitive" {...props}>
			{children}
		</button>
	),
	Portal: ({ children }: any) => (
		<div data-testid="tooltip-portal">{children}</div>
	),
	Content: ({ children, className, sideOffset, ...props }: any) => (
		<div
			className={className}
			data-side-offset={sideOffset}
			data-testid="tooltip-content-primitive"
			{...props}
		>
			{children}
		</div>
	),
	Arrow: ({ className }: any) => (
		<div className={className} data-testid="tooltip-arrow" />
	),
}));

describe("Tooltip Components", () => {
	describe("TooltipProvider", () => {
		it("should render provider with default delay", () => {
			render(
				<TooltipProvider>
					<div>Content</div>
				</TooltipProvider>,
			);

			const provider = screen.getByTestId("tooltip-provider-primitive");
			expect(provider).toBeInTheDocument();
			expect(provider).toHaveAttribute("data-slot", "tooltip-provider");
			expect(provider).toHaveAttribute("data-delay", "0");
		});

		it("should render provider with custom delay", () => {
			render(
				<TooltipProvider delayDuration={500}>
					<div>Content</div>
				</TooltipProvider>,
			);

			const provider = screen.getByTestId("tooltip-provider-primitive");
			expect(provider).toHaveAttribute("data-delay", "500");
		});

		it("should pass through other props", () => {
			render(
				<TooltipProvider disableHoverableContent skipDelayDuration={100}>
					<div>Content</div>
				</TooltipProvider>,
			);

			const provider = screen.getByTestId("tooltip-provider-primitive");
			expect(provider).toHaveAttribute("skipDelayDuration", "100");
			expect(provider).toHaveAttribute("disableHoverableContent");
		});
	});

	describe("Tooltip", () => {
		it("should render tooltip with automatic provider", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Hover me</TooltipTrigger>
					<TooltipContent>Tooltip text</TooltipContent>
				</Tooltip>,
			);

			expect(
				screen.getByTestId("tooltip-provider-primitive"),
			).toBeInTheDocument();
			expect(screen.getByTestId("tooltip-root-primitive")).toBeInTheDocument();
			expect(screen.getByTestId("tooltip-root-primitive")).toHaveAttribute(
				"data-slot",
				"tooltip",
			);
		});

		it("should pass through props to root", () => {
			render(
				<Tooltip defaultOpen delayDuration={200}>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Content</TooltipContent>
				</Tooltip>,
			);

			const root = screen.getByTestId("tooltip-root-primitive");
			expect(root).toHaveAttribute("defaultOpen");
			expect(root).toHaveAttribute("delayDuration", "200");
		});
	});

	describe("TooltipTrigger", () => {
		it("should render trigger button", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Hover me</TooltipTrigger>
					<TooltipContent>Tooltip</TooltipContent>
				</Tooltip>,
			);

			const trigger = screen.getByTestId("tooltip-trigger-primitive");
			expect(trigger).toBeInTheDocument();
			expect(trigger).toHaveAttribute("data-slot", "tooltip-trigger");
			expect(trigger).toHaveTextContent("Hover me");
		});

		it("should pass through props", () => {
			render(
				<Tooltip>
					<TooltipTrigger className="custom-trigger" disabled>
						Button
					</TooltipTrigger>
					<TooltipContent>Info</TooltipContent>
				</Tooltip>,
			);

			const trigger = screen.getByTestId("tooltip-trigger-primitive");
			expect(trigger).toHaveAttribute("disabled");
			expect(trigger).toHaveClass("custom-trigger");
		});

		it("should render with complex children", () => {
			render(
				<Tooltip>
					<TooltipTrigger>
						<span>Icon</span>
						<span>Text</span>
					</TooltipTrigger>
					<TooltipContent>Tooltip</TooltipContent>
				</Tooltip>,
			);

			const trigger = screen.getByTestId("tooltip-trigger-primitive");
			expect(trigger).toContainHTML("<span>Icon</span>");
			expect(trigger).toContainHTML("<span>Text</span>");
		});
	});

	describe("TooltipContent", () => {
		it("should render content with default styles", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Tooltip content</TooltipContent>
				</Tooltip>,
			);

			const content = screen.getByTestId("tooltip-content-primitive");
			expect(content).toBeInTheDocument();
			expect(content).toHaveAttribute("data-slot", "tooltip-content");
			expect(content).toHaveAttribute("data-side-offset", "0");
			expect(content).toHaveTextContent("Tooltip content");
			expect(content).toHaveClass(
				"bg-primary",
				"text-primary-foreground",
				"rounded-md",
			);
		});

		it("should render with custom sideOffset", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent sideOffset={10}>Content</TooltipContent>
				</Tooltip>,
			);

			const content = screen.getByTestId("tooltip-content-primitive");
			expect(content).toHaveAttribute("data-side-offset", "10");
		});

		it("should merge custom className", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent className="custom-tooltip">Content</TooltipContent>
				</Tooltip>,
			);

			const content = screen.getByTestId("tooltip-content-primitive");
			expect(content).toHaveClass("custom-tooltip");
			expect(content).toHaveClass("bg-primary"); // Still has default classes
		});

		it("should render arrow", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Content</TooltipContent>
				</Tooltip>,
			);

			const arrow = screen.getByTestId("tooltip-arrow");
			expect(arrow).toBeInTheDocument();
			expect(arrow).toHaveClass("bg-primary", "fill-primary", "size-2.5");
		});

		it("should render in portal", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent>Content</TooltipContent>
				</Tooltip>,
			);

			expect(screen.getByTestId("tooltip-portal")).toBeInTheDocument();
		});

		it("should pass through other props", () => {
			render(
				<Tooltip>
					<TooltipTrigger>Trigger</TooltipTrigger>
					<TooltipContent align="center" avoidCollisions side="bottom">
						Content
					</TooltipContent>
				</Tooltip>,
			);

			const content = screen.getByTestId("tooltip-content-primitive");
			expect(content).toHaveAttribute("side", "bottom");
			expect(content).toHaveAttribute("align", "center");
			expect(content).toHaveAttribute("avoidCollisions");
		});
	});

	describe("Tooltip composition", () => {
		it("should render complete tooltip", () => {
			render(
				<Tooltip>
					<TooltipTrigger>
						<button>Hover for info</button>
					</TooltipTrigger>
					<TooltipContent>
						<p>This is helpful information</p>
					</TooltipContent>
				</Tooltip>,
			);

			expect(screen.getByText("Hover for info")).toBeInTheDocument();
			expect(
				screen.getByText("This is helpful information"),
			).toBeInTheDocument();
		});

		it("should work with custom provider", () => {
			render(
				<TooltipProvider delayDuration={1000}>
					<Tooltip>
						<TooltipTrigger>Delayed tooltip</TooltipTrigger>
						<TooltipContent>Shows after 1 second</TooltipContent>
					</Tooltip>
				</TooltipProvider>,
			);

			// Should only have one provider (the custom one)
			const providers = screen.getAllByTestId("tooltip-provider-primitive");
			expect(providers).toHaveLength(1);
			expect(providers[0]).toHaveAttribute("data-delay", "1000");
		});

		it("should handle multiple tooltips", () => {
			render(
				<div>
					<Tooltip>
						<TooltipTrigger>First</TooltipTrigger>
						<TooltipContent>First tooltip</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger>Second</TooltipTrigger>
						<TooltipContent>Second tooltip</TooltipContent>
					</Tooltip>
				</div>,
			);

			expect(screen.getByText("First")).toBeInTheDocument();
			expect(screen.getByText("Second")).toBeInTheDocument();
			expect(screen.getByText("First tooltip")).toBeInTheDocument();
			expect(screen.getByText("Second tooltip")).toBeInTheDocument();
		});

		it("should render with icon and text", () => {
			render(
				<Tooltip>
					<TooltipTrigger>
						<svg height="16" width="16">
							<circle cx="8" cy="8" r="8" />
						</svg>
					</TooltipTrigger>
					<TooltipContent>
						<span className="font-bold">Tip:</span> Click to continue
					</TooltipContent>
				</Tooltip>,
			);

			expect(
				screen.getByTestId("tooltip-trigger-primitive").querySelector("svg"),
			).toBeInTheDocument();
			expect(screen.getByText("Tip:")).toHaveClass("font-bold");
			expect(screen.getByText("Click to continue")).toBeInTheDocument();
		});

		it("should handle asChild pattern", () => {
			render(
				<Tooltip>
					<TooltipTrigger asChild>
						<span>Custom element</span>
					</TooltipTrigger>
					<TooltipContent>Info</TooltipContent>
				</Tooltip>,
			);

			const trigger = screen.getByTestId("tooltip-trigger-primitive");
			expect(trigger).toHaveAttribute("asChild");
		});
	});
});
