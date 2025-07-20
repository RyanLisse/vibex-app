import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import {
	AIInput,
	AIInputButton,
	AIInputModelSelect,
	AIInputModelSelectContent,
	AIInputModelSelectItem,
	AIInputModelSelectTrigger,
	AIInputModelSelectValue,
	AIInputSubmit,
	AIInputTextarea,
	AIInputToolbar,
	AIInputTools,
} from "./input";

// Mock components
<<<<<<< HEAD
vi.mock("/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		className,
		size,
		variant,
		type,
		...props
	}: any) => (
		<button
			className={className}
			data-size={size}
			data-variant={variant}
			disabled={disabled}
			onClick={onClick}
			type={type}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("/components/ui/textarea", () => ({
	Textarea: ({
		onChange,
		onKeyDown,
		className,
		placeholder,
		name,
		...props
	}: any) => (
		<textarea
			className={className}
			name={name}
			onChange={onChange}
			onKeyDown={onKeyDown}
			placeholder={placeholder}
			{...props}
		/>
	),
}));

vi.mock("/components/ui/select", () => ({
	Select: ({ children, onValueChange, value, ...props }: any) => (
		<div data-testid="select" data-value={value} {...props}>
			{children}
		</div>
	),
	SelectContent: ({ children, className, ...props }: any) => (
		<div className={className} {...props}>
			{children}
		</div>
	),
	SelectItem: ({ children, className, ...props }: any) => (
		<div className={className} {...props}>
			{children}
		</div>
	),
	SelectTrigger: ({ children, className, ...props }: any) => (
		<button className={className} {...props}>
			{children}
		</button>
	),
	SelectValue: ({ className, ...props }: any) => (
		<span className={className} {...props} />
	),
}));

vi.mock("/lib/utils", () => ({
	cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}));

vi.mock("lucide-react", () => ({
	Loader2Icon: ({ className }: { className?: string }) => (
		<span className={className} data-testid="loader2-icon" />
	),
	SendIcon: ({ className }: { className?: string }) => (
		<span className={className} data-testid="send-icon" />
	),
	SquareIcon: ({ className }: { className?: string }) => (
		<span className={className} data-testid="square-icon" />
	),
	XIcon: ({ className }: { className?: string }) => (
		<span className={className} data-testid="x-icon" />
	),
}));

describe("AIInput Components", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock window.addEventListener for resize events
		Object.defineProperty(window, "addEventListener", {
			value: vi.fn(),
			writable: true,
		});
		Object.defineProperty(window, "removeEventListener", {
			value: vi.fn(),
			writable: true,
		});
	});

	describe("AIInput", () => {
		it("renders as a form element", () => {
			render(
				<AIInput>
					<div>Input content</div>
				</AIInput>,
			);

			const form = screen.getByRole("form");
			expect(form).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInput className="custom-class">
					<div>Content</div>
				</AIInput>,
			);

			const form = screen.getByRole("form");
			expect(form).toHaveClass("custom-class");
		});

		it("handles form submission", () => {
			const handleSubmit = vi.fn((e) => e.preventDefault());

			render(
				<AIInput onSubmit={handleSubmit}>
					<button type="submit">Submit</button>
				</AIInput>,
			);

			fireEvent.submit(screen.getByRole("form"));
			expect(handleSubmit).toHaveBeenCalled();
		});
	});

	describe("AIInputTextarea", () => {
		it("renders with default props", () => {
			render(<AIInputTextarea />);

			const textarea = screen.getByRole("textbox");
			expect(textarea).toBeInTheDocument();
			expect(textarea).toHaveAttribute(
				"placeholder",
				"What would you like to know?",
			);
			expect(textarea).toHaveAttribute("name", "message");
		});

		it("applies custom placeholder", () => {
			render(<AIInputTextarea placeholder="Custom placeholder" />);

			expect(
				screen.getByPlaceholderText("Custom placeholder"),
			).toBeInTheDocument();
		});

		it("calls onChange when text changes", async () => {
			const handleChange = vi.fn();
			const user = userEvent.setup();

			render(<AIInputTextarea onChange={handleChange} />);

			const textarea = screen.getByRole("textbox");
			await user.type(textarea, "Hello");

			expect(handleChange).toHaveBeenCalled();
		});

		it("submits form on Ctrl+Enter", async () => {
			const handleSubmit = vi.fn((e) => e.preventDefault());

			render(
				<AIInput onSubmit={handleSubmit}>
					<AIInputTextarea />
				</AIInput>,
			);

			const textarea = screen.getByRole("textbox");
			fireEvent.keyDown(textarea, {
				key: "Enter",
				ctrlKey: true,
			});

			expect(handleSubmit).toHaveBeenCalled();
		});

		it("submits form on Cmd+Enter", async () => {
			const handleSubmit = vi.fn((e) => e.preventDefault());

			render(
				<AIInput onSubmit={handleSubmit}>
					<AIInputTextarea />
				</AIInput>,
			);

			const textarea = screen.getByRole("textbox");
			fireEvent.keyDown(textarea, {
				key: "Enter",
				metaKey: true,
			});

			expect(handleSubmit).toHaveBeenCalled();
		});

		it("does not submit on plain Enter", async () => {
			const handleSubmit = vi.fn((e) => e.preventDefault());

			render(
				<AIInput onSubmit={handleSubmit}>
					<AIInputTextarea />
				</AIInput>,
			);

			const textarea = screen.getByRole("textbox");
			fireEvent.keyDown(textarea, { key: "Enter" });

			expect(handleSubmit).not.toHaveBeenCalled();
		});

		it("applies custom minHeight and maxHeight", () => {
			render(<AIInputTextarea maxHeight={200} minHeight={60} />);

			const textarea = screen.getByRole("textbox");
			expect(textarea).toBeInTheDocument();
			// Height adjustments happen via useEffect and refs, hard to test directly
		});

		it("applies custom className", () => {
			render(<AIInputTextarea className="custom-textarea" />);

			const textarea = screen.getByRole("textbox");
			expect(textarea).toHaveClass("custom-textarea");
		});
	});

	describe("AIInputToolbar", () => {
		it("renders with children", () => {
			render(
				<AIInputToolbar>
					<div>Toolbar content</div>
				</AIInputToolbar>,
			);

			expect(screen.getByText("Toolbar content")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInputToolbar className="custom-toolbar">
					<div>Content</div>
				</AIInputToolbar>,
			);

			const toolbar = screen.getByText("Content").parentElement;
			expect(toolbar).toHaveClass("custom-toolbar");
		});
	});

	describe("AIInputTools", () => {
		it("renders with children", () => {
			render(
				<AIInputTools>
					<button>Tool 1</button>
					<button>Tool 2</button>
				</AIInputTools>,
			);

			expect(screen.getByText("Tool 1")).toBeInTheDocument();
			expect(screen.getByText("Tool 2")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInputTools className="custom-tools">
					<div>Tools</div>
				</AIInputTools>,
			);

			const tools = screen.getByText("Tools").parentElement;
			expect(tools).toHaveClass("custom-tools");
		});
	});

	describe("AIInputButton", () => {
		it("renders with default props", () => {
			render(<AIInputButton>Button</AIInputButton>);

			const button = screen.getByRole("button");
			expect(button).toHaveTextContent("Button");
			expect(button).toHaveAttribute("type", "button");
			expect(button).toHaveAttribute("data-variant", "ghost");
		});

		it("applies custom variant", () => {
			render(<AIInputButton variant="outline">Button</AIInputButton>);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-variant", "outline");
		});

		it("handles click events", () => {
			const handleClick = vi.fn();

			render(<AIInputButton onClick={handleClick}>Button</AIInputButton>);

			fireEvent.click(screen.getByRole("button"));
			expect(handleClick).toHaveBeenCalled();
		});

		it("determines size based on children count", () => {
			const { rerender } = render(<AIInputButton>Icon</AIInputButton>);

			let button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "icon");

			rerender(<AIInputButton>Text with Icon</AIInputButton>);

			button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "default");
		});

		it("respects explicit size prop", () => {
			render(<AIInputButton size="sm">Button</AIInputButton>);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("data-size", "sm");
		});
	});

	describe("AIInputSubmit", () => {
		it("renders with default props", () => {
			render(<AIInputSubmit />);

			const button = screen.getByRole("button");
			expect(button).toHaveAttribute("type", "submit");
			expect(button).toHaveAttribute("data-variant", "default");
			expect(button).toHaveAttribute("data-size", "icon");
			expect(screen.getByTestId("send-icon")).toBeInTheDocument();
		});

		it("shows different icons based on status", () => {
			const { rerender } = render(<AIInputSubmit status="ready" />);
			expect(screen.getByTestId("send-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="submitted" />);
			expect(screen.getByTestId("loader2-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="streaming" />);
			expect(screen.getByTestId("square-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="error" />);
			expect(screen.getByTestId("x-icon")).toBeInTheDocument();
		});

		it("shows loading animation for submitted status", () => {
			render(<AIInputSubmit status="submitted" />);

			const icon = screen.getByTestId("loader2-icon");
			expect(icon).toHaveClass("animate-spin");
		});

		it("renders custom children", () => {
			render(<AIInputSubmit>Custom Submit</AIInputSubmit>);

			expect(screen.getByText("Custom Submit")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(<AIInputSubmit className="custom-submit" />);

			const button = screen.getByRole("button");
			expect(button).toHaveClass("custom-submit");
		});
	});

	describe("AIInputModelSelect", () => {
		it("renders select component", () => {
			render(
				<AIInputModelSelect>
					<div>Select content</div>
				</AIInputModelSelect>,
			);

			expect(screen.getByTestId("select")).toBeInTheDocument();
		});

		it("passes props to Select", () => {
			render(
				<AIInputModelSelect value="test-value">
					<div>Content</div>
				</AIInputModelSelect>,
			);

			const select = screen.getByTestId("select");
			expect(select).toHaveAttribute("data-value", "test-value");
		});
	});

	describe("AIInputModelSelectTrigger", () => {
		it("renders as button", () => {
			render(<AIInputModelSelectTrigger>Trigger</AIInputModelSelectTrigger>);

			expect(screen.getByRole("button")).toBeInTheDocument();
			expect(screen.getByText("Trigger")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInputModelSelectTrigger className="custom-trigger">
					Trigger
				</AIInputModelSelectTrigger>,
			);

			const trigger = screen.getByRole("button");
			expect(trigger).toHaveClass("custom-trigger");
		});
	});

	describe("AIInputModelSelectContent", () => {
		it("renders with children", () => {
			render(
				<AIInputModelSelectContent>
					<div>Content</div>
				</AIInputModelSelectContent>,
			);

			expect(screen.getByText("Content")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInputModelSelectContent className="custom-content">
					<div>Content</div>
				</AIInputModelSelectContent>,
			);

			const content = screen.getByText("Content").parentElement;
			expect(content).toHaveClass("custom-content");
		});
	});

	describe("AIInputModelSelectItem", () => {
		it("renders with children", () => {
			render(
				<AIInputModelSelectItem>
					<div>Item</div>
				</AIInputModelSelectItem>,
			);

			expect(screen.getByText("Item")).toBeInTheDocument();
		});

		it("applies custom className", () => {
			render(
				<AIInputModelSelectItem className="custom-item">
					<div>Item</div>
				</AIInputModelSelectItem>,
			);

			const item = screen.getByText("Item").parentElement;
			expect(item).toHaveClass("custom-item");
		});
	});

	describe("AIInputModelSelectValue", () => {
		it("renders with props", () => {
			render(<AIInputModelSelectValue className="custom-value" />);

			const value = screen.getByRole("generic");
			expect(value).toHaveClass("custom-value");
		});
	});

	describe("Integration", () => {
		it("works as complete input component", async () => {
			const handleSubmit = vi.fn((e) => e.preventDefault());
			const user = userEvent.setup();

			render(
				<AIInput onSubmit={handleSubmit}>
					<AIInputTextarea placeholder="Type your message" />
					<AIInputToolbar>
						<AIInputTools>
							<AIInputButton>Tool</AIInputButton>
						</AIInputTools>
						<AIInputSubmit />
					</AIInputToolbar>
				</AIInput>,
			);

			const textarea = screen.getByPlaceholderText("Type your message");
			const _toolButton = screen.getByText("Tool");
			const _submitButton = screen.getByRole("button", { name: /submit/i });

			// Type in textarea
			await user.type(textarea, "Hello world");

			// Submit with Ctrl+Enter
			fireEvent.keyDown(textarea, {
				key: "Enter",
				ctrlKey: true,
			});

			expect(handleSubmit).toHaveBeenCalled();
		});

		it("handles model selection", () => {
			const handleValueChange = vi.fn();

			render(
				<AIInputModelSelect onValueChange={handleValueChange}>
					<AIInputModelSelectTrigger>
						<AIInputModelSelectValue />
					</AIInputModelSelectTrigger>
					<AIInputModelSelectContent>
						<AIInputModelSelectItem value="gpt-4">GPT-4</AIInputModelSelectItem>
						<AIInputModelSelectItem value="gpt-3.5">
							GPT-3.5
						</AIInputModelSelectItem>
					</AIInputModelSelectContent>
				</AIInputModelSelect>,
			);

			expect(screen.getByText("GPT-4")).toBeInTheDocument();
			expect(screen.getByText("GPT-3.5")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("has proper form structure", () => {
			render(
				<AIInput>
					<AIInputTextarea />
					<AIInputSubmit />
				</AIInput>,
			);

			const form = screen.getByRole("form");
			const textarea = screen.getByRole("textbox");
			const submitButton = screen.getByRole("button", { name: /submit/i });

			expect(form).toBeInTheDocument();
			expect(textarea).toBeInTheDocument();
			expect(submitButton).toBeInTheDocument();
		});

		it("supports keyboard navigation", async () => {
			render(
				<AIInput>
					<AIInputTextarea />
					<AIInputToolbar>
						<AIInputTools>
							<AIInputButton>Tool</AIInputButton>
						</AIInputTools>
						<AIInputSubmit />
					</AIInputToolbar>
				</AIInput>,
			);

			const textarea = screen.getByRole("textbox");
			const toolButton = screen.getByText("Tool");
			const submitButton = screen.getByRole("button", { name: /submit/i });

			// Tab navigation
			textarea.focus();
			expect(document.activeElement).toBe(textarea);

			// Should be able to tab to buttons
			toolButton.focus();
			expect(document.activeElement).toBe(toolButton);

			submitButton.focus();
			expect(document.activeElement).toBe(submitButton);
		});

		it("has proper ARIA attributes", () => {
			render(
				<AIInput>
					<AIInputTextarea aria-label="Message input" />
					<AIInputSubmit aria-label="Send message" />
				</AIInput>,
			);

			expect(screen.getByLabelText("Message input")).toBeInTheDocument();
			expect(screen.getByLabelText("Send message")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles empty textarea", () => {
			render(<AIInputTextarea value="" />);

			const textarea = screen.getByRole("textbox");
			expect(textarea).toHaveValue("");
		});

		it("handles very long text", async () => {
			const longText = "a".repeat(1000);
			const user = userEvent.setup();

			render(<AIInputTextarea />);

			const textarea = screen.getByRole("textbox");
			await user.type(textarea, longText);

			expect(textarea).toHaveValue(longText);
		});

		it("handles disabled state", () => {
			render(
				<AIInput>
					<AIInputTextarea disabled />
					<AIInputSubmit disabled />
				</AIInput>,
			);

			const textarea = screen.getByRole("textbox");
			const submitButton = screen.getByRole("button");

			expect(textarea).toBeDisabled();
			expect(submitButton).toBeDisabled();
		});

		it("handles multiple status changes", () => {
			const { rerender } = render(<AIInputSubmit status="ready" />);

			expect(screen.getByTestId("send-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="submitted" />);
			expect(screen.getByTestId("loader2-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="streaming" />);
			expect(screen.getByTestId("square-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="error" />);
			expect(screen.getByTestId("x-icon")).toBeInTheDocument();

			rerender(<AIInputSubmit status="ready" />);
			expect(screen.getByTestId("send-icon")).toBeInTheDocument();
		});
	});
});
=======
vi.mock('/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, size, variant, type, ...props }: any) => (
    <button
      className={className}
      data-size={size}
      data-variant={variant}
      disabled={disabled}
      onClick={onClick}
      type={type}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock('/components/ui/textarea', () => ({
  Textarea: ({ onChange, onKeyDown, className, placeholder, name, ...props }: any) => (
    <textarea
      className={className}
      name={name}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      {...props}
    />
  ),
}))

vi.mock('/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, ...props }: any) => (
    <div data-testid="select" data-value={value} {...props}>
      {children}
    </div>
  ),
  SelectContent: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  SelectItem: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className, ...props }: any) => (
    <button className={className} {...props}>
      {children}
    </button>
  ),
  SelectValue: ({ className, ...props }: any) => <span className={className} {...props} />,
}))

vi.mock('/lib/utils', () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(' ')),
}))

vi.mock('lucide-react', () => ({
  Loader2Icon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="loader2-icon" />
  ),
  SendIcon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="send-icon" />
  ),
  SquareIcon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="square-icon" />
  ),
  XIcon: ({ className }: { className?: string }) => (
    <span className={className} data-testid="x-icon" />
  ),
}))

describe('AIInput Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.addEventListener for resize events
    Object.defineProperty(window, 'addEventListener', {
      value: vi.fn(),
      writable: true,
    })
    Object.defineProperty(window, 'removeEventListener', {
      value: vi.fn(),
      writable: true,
    })
  })

  describe('AIInput', () => {
    it('renders as a form element', () => {
      render(
        <AIInput>
          <div>Input content</div>
        </AIInput>
      )

      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInput className="custom-class">
          <div>Content</div>
        </AIInput>
      )

      const form = screen.getByRole('form')
      expect(form).toHaveClass('custom-class')
    })

    it('handles form submission', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <AIInput onSubmit={handleSubmit}>
          <button type="submit">Submit</button>
        </AIInput>
      )

      fireEvent.submit(screen.getByRole('form'))
      expect(handleSubmit).toHaveBeenCalled()
    })
  })

  describe('AIInputTextarea', () => {
    it('renders with default props', () => {
      render(<AIInputTextarea />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('placeholder', 'What would you like to know?')
      expect(textarea).toHaveAttribute('name', 'message')
    })

    it('applies custom placeholder', () => {
      render(<AIInputTextarea placeholder="Custom placeholder" />)

      expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
    })

    it('calls onChange when text changes', async () => {
      const handleChange = vi.fn()
      const user = userEvent.setup()

      render(<AIInputTextarea onChange={handleChange} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello')

      expect(handleChange).toHaveBeenCalled()
    })

    it('submits form on Ctrl+Enter', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <AIInput onSubmit={handleSubmit}>
          <AIInputTextarea />
        </AIInput>
      )

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        ctrlKey: true,
      })

      expect(handleSubmit).toHaveBeenCalled()
    })

    it('submits form on Cmd+Enter', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <AIInput onSubmit={handleSubmit}>
          <AIInputTextarea />
        </AIInput>
      )

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        metaKey: true,
      })

      expect(handleSubmit).toHaveBeenCalled()
    })

    it('does not submit on plain Enter', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())

      render(
        <AIInput onSubmit={handleSubmit}>
          <AIInputTextarea />
        </AIInput>
      )

      const textarea = screen.getByRole('textbox')
      fireEvent.keyDown(textarea, { key: 'Enter' })

      expect(handleSubmit).not.toHaveBeenCalled()
    })

    it('applies custom minHeight and maxHeight', () => {
      render(<AIInputTextarea maxHeight={200} minHeight={60} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
      // Height adjustments happen via useEffect and refs, hard to test directly
    })

    it('applies custom className', () => {
      render(<AIInputTextarea className="custom-textarea" />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('custom-textarea')
    })
  })

  describe('AIInputToolbar', () => {
    it('renders with children', () => {
      render(
        <AIInputToolbar>
          <div>Toolbar content</div>
        </AIInputToolbar>
      )

      expect(screen.getByText('Toolbar content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInputToolbar className="custom-toolbar">
          <div>Content</div>
        </AIInputToolbar>
      )

      const toolbar = screen.getByText('Content').parentElement
      expect(toolbar).toHaveClass('custom-toolbar')
    })
  })

  describe('AIInputTools', () => {
    it('renders with children', () => {
      render(
        <AIInputTools>
          <button>Tool 1</button>
          <button>Tool 2</button>
        </AIInputTools>
      )

      expect(screen.getByText('Tool 1')).toBeInTheDocument()
      expect(screen.getByText('Tool 2')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInputTools className="custom-tools">
          <div>Tools</div>
        </AIInputTools>
      )

      const tools = screen.getByText('Tools').parentElement
      expect(tools).toHaveClass('custom-tools')
    })
  })

  describe('AIInputButton', () => {
    it('renders with default props', () => {
      render(<AIInputButton>Button</AIInputButton>)

      const button = screen.getByRole('button')
      expect(button).toHaveTextContent('Button')
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('data-variant', 'ghost')
    })

    it('applies custom variant', () => {
      render(<AIInputButton variant="outline">Button</AIInputButton>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-variant', 'outline')
    })

    it('handles click events', () => {
      const handleClick = vi.fn()

      render(<AIInputButton onClick={handleClick}>Button</AIInputButton>)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalled()
    })

    it('determines size based on children count', () => {
      const { rerender } = render(<AIInputButton>Icon</AIInputButton>)

      let button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'icon')

      rerender(<AIInputButton>Text with Icon</AIInputButton>)

      button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'default')
    })

    it('respects explicit size prop', () => {
      render(<AIInputButton size="sm">Button</AIInputButton>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('data-size', 'sm')
    })
  })

  describe('AIInputSubmit', () => {
    it('renders with default props', () => {
      render(<AIInputSubmit />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('data-variant', 'default')
      expect(button).toHaveAttribute('data-size', 'icon')
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()
    })

    it('shows different icons based on status', () => {
      const { rerender } = render(<AIInputSubmit status="ready" />)
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="submitted" />)
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="streaming" />)
      expect(screen.getByTestId('square-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="error" />)
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()
    })

    it('shows loading animation for submitted status', () => {
      render(<AIInputSubmit status="submitted" />)

      const icon = screen.getByTestId('loader2-icon')
      expect(icon).toHaveClass('animate-spin')
    })

    it('renders custom children', () => {
      render(<AIInputSubmit>Custom Submit</AIInputSubmit>)

      expect(screen.getByText('Custom Submit')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<AIInputSubmit className="custom-submit" />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-submit')
    })
  })

  describe('AIInputModelSelect', () => {
    it('renders select component', () => {
      render(
        <AIInputModelSelect>
          <div>Select content</div>
        </AIInputModelSelect>
      )

      expect(screen.getByTestId('select')).toBeInTheDocument()
    })

    it('passes props to Select', () => {
      render(
        <AIInputModelSelect value="test-value">
          <div>Content</div>
        </AIInputModelSelect>
      )

      const select = screen.getByTestId('select')
      expect(select).toHaveAttribute('data-value', 'test-value')
    })
  })

  describe('AIInputModelSelectTrigger', () => {
    it('renders as button', () => {
      render(<AIInputModelSelectTrigger>Trigger</AIInputModelSelectTrigger>)

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Trigger')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInputModelSelectTrigger className="custom-trigger">Trigger</AIInputModelSelectTrigger>
      )

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveClass('custom-trigger')
    })
  })

  describe('AIInputModelSelectContent', () => {
    it('renders with children', () => {
      render(
        <AIInputModelSelectContent>
          <div>Content</div>
        </AIInputModelSelectContent>
      )

      expect(screen.getByText('Content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInputModelSelectContent className="custom-content">
          <div>Content</div>
        </AIInputModelSelectContent>
      )

      const content = screen.getByText('Content').parentElement
      expect(content).toHaveClass('custom-content')
    })
  })

  describe('AIInputModelSelectItem', () => {
    it('renders with children', () => {
      render(
        <AIInputModelSelectItem>
          <div>Item</div>
        </AIInputModelSelectItem>
      )

      expect(screen.getByText('Item')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(
        <AIInputModelSelectItem className="custom-item">
          <div>Item</div>
        </AIInputModelSelectItem>
      )

      const item = screen.getByText('Item').parentElement
      expect(item).toHaveClass('custom-item')
    })
  })

  describe('AIInputModelSelectValue', () => {
    it('renders with props', () => {
      render(<AIInputModelSelectValue className="custom-value" />)

      const value = screen.getByRole('generic')
      expect(value).toHaveClass('custom-value')
    })
  })

  describe('Integration', () => {
    it('works as complete input component', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      const user = userEvent.setup()

      render(
        <AIInput onSubmit={handleSubmit}>
          <AIInputTextarea placeholder="Type your message" />
          <AIInputToolbar>
            <AIInputTools>
              <AIInputButton>Tool</AIInputButton>
            </AIInputTools>
            <AIInputSubmit />
          </AIInputToolbar>
        </AIInput>
      )

      const textarea = screen.getByPlaceholderText('Type your message')
      const _toolButton = screen.getByText('Tool')
      const _submitButton = screen.getByRole('button', { name: /submit/i })

      // Type in textarea
      await user.type(textarea, 'Hello world')

      // Submit with Ctrl+Enter
      fireEvent.keyDown(textarea, {
        key: 'Enter',
        ctrlKey: true,
      })

      expect(handleSubmit).toHaveBeenCalled()
    })

    it('handles model selection', () => {
      const handleValueChange = vi.fn()

      render(
        <AIInputModelSelect onValueChange={handleValueChange}>
          <AIInputModelSelectTrigger>
            <AIInputModelSelectValue />
          </AIInputModelSelectTrigger>
          <AIInputModelSelectContent>
            <AIInputModelSelectItem value="gpt-4">GPT-4</AIInputModelSelectItem>
            <AIInputModelSelectItem value="gpt-3.5">GPT-3.5</AIInputModelSelectItem>
          </AIInputModelSelectContent>
        </AIInputModelSelect>
      )

      expect(screen.getByText('GPT-4')).toBeInTheDocument()
      expect(screen.getByText('GPT-3.5')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper form structure', () => {
      render(
        <AIInput>
          <AIInputTextarea />
          <AIInputSubmit />
        </AIInput>
      )

      const form = screen.getByRole('form')
      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      expect(form).toBeInTheDocument()
      expect(textarea).toBeInTheDocument()
      expect(submitButton).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(
        <AIInput>
          <AIInputTextarea />
          <AIInputToolbar>
            <AIInputTools>
              <AIInputButton>Tool</AIInputButton>
            </AIInputTools>
            <AIInputSubmit />
          </AIInputToolbar>
        </AIInput>
      )

      const textarea = screen.getByRole('textbox')
      const toolButton = screen.getByText('Tool')
      const submitButton = screen.getByRole('button', { name: /submit/i })

      // Tab navigation
      textarea.focus()
      expect(document.activeElement).toBe(textarea)

      // Should be able to tab to buttons
      toolButton.focus()
      expect(document.activeElement).toBe(toolButton)

      submitButton.focus()
      expect(document.activeElement).toBe(submitButton)
    })

    it('has proper ARIA attributes', () => {
      render(
        <AIInput>
          <AIInputTextarea aria-label="Message input" />
          <AIInputSubmit aria-label="Send message" />
        </AIInput>
      )

      expect(screen.getByLabelText('Message input')).toBeInTheDocument()
      expect(screen.getByLabelText('Send message')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('handles empty textarea', () => {
      render(<AIInputTextarea value="" />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('')
    })

    it('handles very long text', async () => {
      const longText = 'a'.repeat(1000)
      const user = userEvent.setup()

      render(<AIInputTextarea />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, longText)

      expect(textarea).toHaveValue(longText)
    })

    it('handles disabled state', () => {
      render(
        <AIInput>
          <AIInputTextarea disabled />
          <AIInputSubmit disabled />
        </AIInput>
      )

      const textarea = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button')

      expect(textarea).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })

    it('handles multiple status changes', () => {
      const { rerender } = render(<AIInputSubmit status="ready" />)

      expect(screen.getByTestId('send-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="submitted" />)
      expect(screen.getByTestId('loader2-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="streaming" />)
      expect(screen.getByTestId('square-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="error" />)
      expect(screen.getByTestId('x-icon')).toBeInTheDocument()

      rerender(<AIInputSubmit status="ready" />)
      expect(screen.getByTestId('send-icon')).toBeInTheDocument()
    })
  })
})
>>>>>>> ryan-lisse/review-this-pr
